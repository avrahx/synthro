"""
HyperVault Alpha — Polars-Based Vectorized Basis & Funding Engine

Performs delta-neutral basis arbitrage simulation with 1-hour funding
settlement (Hyperliquid-native cadence) using Polars for sub-millisecond
vectorized computation.
"""

from __future__ import annotations

import uuid
from typing import Any

import numpy as np
import polars as pl

from app.models.schemas import (
    BacktestRequest,
    TradeRecord,
    EquitySnapshot,
    AssetAttribution,
)


class BasisEngine:
    """
    Vectorized backtest engine for intra-L1 basis arbitrage.

    Strategy:
        1. Hourly: evaluate basis spread + funding rate per asset
        2. Enter delta-neutral position when basis > entry_threshold
        3. Accrue 1h funding settlements (HL-native hourly cadence)
        4. Exit when basis compresses below exit_threshold or max epochs reached
        5. Rebalance delta every `rebalance_epochs` hours
    """

    def __init__(self, request: BacktestRequest) -> None:
        self.req = request
        self.taker_fee = request.taker_fee_bps / 10_000
        self.maker_fee = request.maker_fee_bps / 10_000
        self.slippage = request.slippage_bps / 10_000
        self.entry_bps = request.entry_threshold_bps
        self.exit_bps = request.exit_threshold_bps
        self.rebalance_epochs = request.rebalance_epochs

    def run(
        self, raw_data: list[dict[str, Any]],
    ) -> tuple[list[EquitySnapshot], list[TradeRecord], list[AssetAttribution]]:
        """Execute the full vectorized backtest pipeline."""

        df = pl.DataFrame(raw_data)
        n_assets = len(self.req.assets)
        alloc_per_asset = (
            self.req.initial_capital * self.req.max_leverage
        ) / max(n_assets, 1)

        # ── Per-asset position state ─────────────────────────────────────
        positions: dict[str, dict[str, Any]] = {}
        for asset in self.req.assets:
            positions[asset] = {
                "active": False,
                "entry_epoch": 0,
                "entry_basis": 0.0,
                "entry_price": 0.0,
                "notional": 0.0,
                "cum_funding": 0.0,
                "cum_basis_pnl": 0.0,
                "cum_fees": 0.0,
                "trade_count": 0,
            }

        # ── Portfolio-level state ────────────────────────────────────────
        cash = self.req.initial_capital
        nav = self.req.initial_capital
        hwm = self.req.initial_capital
        cum_funding = 0.0
        cum_fees = 0.0
        cum_slippage = 0.0

        trades: list[TradeRecord] = []
        equity_curve: list[EquitySnapshot] = []

        # Sort by epoch, then asset for deterministic walk
        timestamps = sorted(df["timestamp"].unique().to_list())

        prev_nav = nav

        for ts in timestamps:
            ts_slice = df.filter(pl.col("timestamp") == ts)
            epoch_row = ts_slice.row(0, named=True)
            epoch = int(epoch_row["epoch"])

            step_funding = 0.0
            step_fees = 0.0
            step_slippage = 0.0

            for asset in self.req.assets:
                asset_rows = ts_slice.filter(pl.col("asset") == asset)
                if asset_rows.height == 0:
                    continue

                row = asset_rows.row(0, named=True)
                mark = float(row["mark_price"])
                basis = float(row["basis_bps"])
                funding_1h = float(row["funding_rate_1h"])
                pos = positions[asset]

                # ── ENTRY LOGIC ──────────────────────────────────────────
                if not pos["active"]:
                    if basis >= self.entry_bps and funding_1h > 0:
                        entry_cost = alloc_per_asset * (self.taker_fee * 2 + self.slippage)
                        pos["active"] = True
                        pos["entry_epoch"] = epoch
                        pos["entry_basis"] = basis
                        pos["entry_price"] = mark
                        pos["notional"] = alloc_per_asset
                        pos["cum_fees"] += entry_cost
                        pos["trade_count"] += 1
                        step_fees += entry_cost * (self.taker_fee * 2 / (self.taker_fee * 2 + self.slippage))
                        step_slippage += entry_cost * (self.slippage / (self.taker_fee * 2 + self.slippage))

                        trades.append(TradeRecord(
                            id=uuid.uuid4().hex[:8],
                            epoch=epoch,
                            timestamp=ts,
                            asset=asset,
                            action="OPEN_BASIS",
                            side="LONG_SPOT_SHORT_PERP",
                            notional_usd=round(alloc_per_asset, 2),
                            mark_price=mark,
                            basis_bps=basis,
                            funding_rate_1h=funding_1h,
                            fee_paid=round(entry_cost, 2),
                        ))

                # ── ACTIVE POSITION MANAGEMENT ───────────────────────────
                elif pos["active"]:
                    epochs_held = epoch - pos["entry_epoch"]

                    # Exit condition
                    should_exit = (
                        basis <= self.exit_bps
                        or funding_1h < -0.0002
                        or epochs_held > 168  # max 1 week hold
                    )

                    if should_exit:
                        # Basis convergence PnL
                        basis_pnl = pos["notional"] * (
                            (pos["entry_basis"] - basis) / 10_000
                        )
                        exit_cost = pos["notional"] * (self.taker_fee * 2 + self.slippage)
                        pos["cum_basis_pnl"] += basis_pnl
                        pos["cum_fees"] += exit_cost
                        pos["trade_count"] += 1
                        step_fees += exit_cost * (self.taker_fee * 2 / (self.taker_fee * 2 + self.slippage))
                        step_slippage += exit_cost * (self.slippage / (self.taker_fee * 2 + self.slippage))
                        cash += basis_pnl

                        trades.append(TradeRecord(
                            id=uuid.uuid4().hex[:8],
                            epoch=epoch,
                            timestamp=ts,
                            asset=asset,
                            action="CLOSE_BASIS",
                            side="FLAT",
                            notional_usd=round(pos["notional"], 2),
                            mark_price=mark,
                            basis_bps=basis,
                            funding_rate_1h=funding_1h,
                            fee_paid=round(exit_cost, 2),
                            pnl_realized=round(basis_pnl, 2),
                        ))

                        pos["active"] = False
                        pos["notional"] = 0.0
                    else:
                        # Accrue 1h funding (short perp receives when rate > 0)
                        funding_pnl = pos["notional"] * funding_1h
                        pos["cum_funding"] += funding_pnl
                        step_funding += funding_pnl

                        # Rebalance delta every N epochs
                        if epochs_held > 0 and epochs_held % self.rebalance_epochs == 0:
                            reb_cost = pos["notional"] * 0.05 * (self.maker_fee * 2)
                            pos["cum_fees"] += reb_cost
                            step_fees += reb_cost
                            pos["trade_count"] += 1

                            trades.append(TradeRecord(
                                id=uuid.uuid4().hex[:8],
                                epoch=epoch,
                                timestamp=ts,
                                asset=asset,
                                action="REBALANCE",
                                side="LONG_SPOT_SHORT_PERP",
                                notional_usd=round(pos["notional"] * 0.05, 2),
                                mark_price=mark,
                                basis_bps=basis,
                                funding_rate_1h=funding_1h,
                                fee_paid=round(reb_cost, 2),
                            ))

            # ── Portfolio mark-to-market ──────────────────────────────────
            cum_funding += step_funding
            cum_fees += step_fees
            cum_slippage += step_slippage

            # Unrealized position value (delta-neutral → ~0 directional P&L)
            gross_exp = sum(
                p["notional"] for p in positions.values() if p["active"]
            ) * 2  # spot + perp legs
            net_exp = 0.0  # delta-neutral

            nav = (
                self.req.initial_capital
                + cum_funding
                + sum(p["cum_basis_pnl"] for p in positions.values())
                - cum_fees
                - cum_slippage
            )

            if nav > hwm:
                hwm = nav
            dd_usd = max(0.0, hwm - nav)
            dd_pct = (dd_usd / hwm) * 100 if hwm > 0 else 0.0
            period_pnl = nav - prev_nav
            period_ret = (period_pnl / prev_nav) * 100 if prev_nav > 0 else 0.0
            prev_nav = nav

            equity_curve.append(EquitySnapshot(
                epoch=epoch,
                timestamp=ts,
                nav=round(nav, 2),
                gross_exposure=round(gross_exp, 2),
                net_exposure=round(net_exp, 2),
                cash=round(cash, 2),
                cumulative_funding=round(cum_funding, 2),
                cumulative_fees=round(cum_fees, 2),
                cumulative_slippage=round(cum_slippage, 2),
                drawdown_usd=round(dd_usd, 2),
                drawdown_pct=round(dd_pct, 2),
                period_pnl=round(period_pnl, 2),
                period_return_pct=round(period_ret, 4),
            ))

        # ── Asset attribution ────────────────────────────────────────────
        attribution: list[AssetAttribution] = []
        for asset in self.req.assets:
            p = positions[asset]
            attribution.append(AssetAttribution(
                asset=asset,
                allocated_notional=round(alloc_per_asset, 2),
                funding_earned=round(p["cum_funding"], 2),
                basis_pnl=round(p["cum_basis_pnl"], 2),
                fees_paid=round(p["cum_fees"], 2),
                net_pnl=round(
                    p["cum_funding"] + p["cum_basis_pnl"] - p["cum_fees"], 2,
                ),
                trade_count=p["trade_count"],
            ))

        return equity_curve, trades, attribution
