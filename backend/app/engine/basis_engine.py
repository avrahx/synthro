"""
HyperVault Alpha — Polars-Based Vectorized Basis & Funding Engine

Performs delta-neutral basis arbitrage simulation with 1-hour funding
settlement using Polars for sub-millisecond vectorized computation.
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


class BasisBacktestEngine:
    """
    Vectorized backtest engine for intra-L1 and cross-venue basis arbitrage.

    Strategy:
        1. Hourly: evaluate funding rate per asset.
        2. Calculate rolling Z-score of funding spreads.
        3. Rank assets and allocate capital to top K assets every N epochs.
        4. Accrue 1h funding settlements.
        5. Apply taker fees and slippage on rebalancing turnover.
    """

    def __init__(self, request: BacktestRequest) -> None:
        self.req = request
        self.taker_fee = request.taker_fee_bps / 10_000.0
        self.slippage = request.slippage_bps / 10_000.0
        self.rebalance_epochs = request.rebalance_freq_hours
        self.margin_borrow_apr = request.margin_borrow_apr
        self.strategy_mode = request.strategy_mode
        self.top_k = min(3, len(request.assets)) if request.assets else 1

    def run(
        self, raw_data: list[dict[str, Any]],
    ) -> tuple[list[EquitySnapshot], list[TradeRecord], list[AssetAttribution]]:
        """Execute the full vectorized backtest pipeline."""
        if not raw_data:
            return [], [], []

        # 1. Load Data
        df = pl.DataFrame(raw_data)
        
        # Sort chronologically and by asset
        df = df.sort(["epoch", "asset"])

        # 2. Strategy Logic & Scoring
        # Depending on mode, calculate the annualized spread we are targeting
        if self.strategy_mode == "CROSS_VENUE_DISLOCATION":
            # Long CEX (pays 8h, scaled to 1h for comparison) short HL (receives 1h)
            # We want HL funding > CEX funding
            df = df.with_columns(
                spread_1h=pl.col("funding_rate_1h") - (pl.col("cex_funding_rate_8h") / 8.0)
            )
        elif self.strategy_mode == "INTRA_HL_CASH_AND_CARRY":
            # Spot long, perp short. Receives HL 1h.
            df = df.with_columns(
                spread_1h=pl.col("funding_rate_1h")
            )
        else:
            # Default fallback
            df = df.with_columns(
                spread_1h=pl.col("funding_rate_1h")
            )

        # Calculate Z-score of spread over a 24h rolling window (approx 24 epochs per asset)
        # Using a simple moving average and std for the Z-score
        df = df.with_columns(
            spread_mean_24h=pl.col("spread_1h").rolling_mean(window_size=24, min_periods=1).over("asset"),
            spread_std_24h=pl.col("spread_1h").rolling_std(window_size=24, min_periods=1).over("asset")
        )
        
        df = df.with_columns(
            z_score=pl.when(pl.col("spread_std_24h") > 1e-9)
            .then((pl.col("spread_1h") - pl.col("spread_mean_24h")) / pl.col("spread_std_24h"))
            .otherwise(0.0)
        )

        # 3. Target Weights (Rebalance Epochs)
        # Rank assets cross-sectionally per epoch by z_score
        df = df.with_columns(
            rank=pl.col("z_score").rank(method="ordinal", descending=True).over("epoch")
        )
        
        # Determine if epoch is a rebalance epoch
        df = df.with_columns(
            is_rebalance=(pl.col("epoch") % self.rebalance_epochs == 0)
        )

        # Allocate weight 1.0 / K to top K assets, 0 to others
        # ONLY update on rebalance epochs, otherwise carry forward
        df = df.with_columns(
            target_weight=pl.when(pl.col("rank") <= self.top_k)
            .then(1.0 / self.top_k)
            .otherwise(0.0)
        )
        
        # Forward fill weights from rebalance epochs
        df = df.with_columns(
            actual_weight=pl.when(pl.col("is_rebalance"))
            .then(pl.col("target_weight"))
            .otherwise(None)
        )
        df = df.with_columns(
            actual_weight=pl.col("actual_weight").forward_fill().over("asset").fill_null(0.0)
        )

        # 4. Position & Turnover
        total_alloc = self.req.initial_capital * self.req.max_leverage
        
        df = df.with_columns(
            target_notional=pl.col("actual_weight") * total_alloc
        )
        
        # Calculate change in notional (turnover)
        df = df.with_columns(
            prev_notional=pl.col("target_notional").shift(1).over("asset").fill_null(0.0)
        )
        df = df.with_columns(
            turnover_notional=(pl.col("target_notional") - pl.col("prev_notional")).abs()
        )

        # 5. Execution Costs (Taker + Slippage applied on turnover on both legs: spot and perp)
        # Assuming we trade spot and perp simultaneously, total turnover is 2x directional turnover
        df = df.with_columns(
            exec_fees_usd=pl.col("turnover_notional") * 2.0 * self.taker_fee,
            exec_slippage_usd=pl.col("turnover_notional") * 2.0 * self.slippage
        )

        # 6. PnL Accrual
        # Funding PnL is based on the held notional during the epoch
        # (Assuming we receive spread_1h * notional)
        df = df.with_columns(
            funding_pnl=pl.col("target_notional") * pl.col("spread_1h")
        )
        
        # Margin borrow cost for spot collateral (hourly)
        borrow_cost_1h = self.margin_borrow_apr / 8760.0
        df = df.with_columns(
            margin_cost_usd=pl.col("target_notional") * borrow_cost_1h
        )
        
        # Basis convergence PnL is simplified here since we focus on funding in these modes,
        # but if we tracked precise entry/exit basis it would go here. We'll use mark price diffs.
        df = df.with_columns(
            prev_mark=pl.col("mark_price").shift(1).over("asset").fill_null(pl.col("mark_price"))
        )
        
        # Calculate individual asset return for this epoch
        df = df.with_columns(
            asset_return=pl.when(pl.col("prev_mark") > 0)
            .then(pl.col("mark_price") / pl.col("prev_mark") - 1.0)
            .otherwise(0.0)
        )
        
        # Delta neutral means mark price movements cancel out (spot vs perp), 
        # so mark PnL is effectively 0, minus any slight basis drift we might model.
        # We will assume pure delta neutral for now.
        df = df.with_columns(
            mark_pnl=pl.lit(0.0)
        )
        
        df = df.with_columns(
            net_pnl=pl.col("funding_pnl") + pl.col("mark_pnl") - pl.col("exec_fees_usd") - pl.col("exec_slippage_usd") - pl.col("margin_cost_usd")
        )

        # 7. Portfolio Aggregation (Group by epoch/timestamp)
        portfolio = df.group_by(["epoch", "timestamp"]).agg(
            pl.col("target_notional").sum().alias("gross_exposure"),
            pl.col("funding_pnl").sum().alias("step_funding"),
            pl.col("exec_fees_usd").sum().alias("step_fees"),
            pl.col("exec_slippage_usd").sum().alias("step_slippage"),
            pl.col("margin_cost_usd").sum().alias("step_margin"),
            pl.col("net_pnl").sum().alias("step_net_pnl"),
            pl.col("asset_return").mean().alias("avg_asset_return"),
        ).sort("epoch")

        # Cumulative sums for portfolio
        portfolio = portfolio.with_columns(
            cum_funding=pl.col("step_funding").cum_sum(),
            cum_fees=pl.col("step_fees").cum_sum(),
            cum_slippage=pl.col("step_slippage").cum_sum(),
            cum_margin=pl.col("step_margin").cum_sum(),
            cum_net_pnl=pl.col("step_net_pnl").cum_sum(),
        )

        # NAV calculations
        portfolio = portfolio.with_columns(
            nav=self.req.initial_capital + pl.col("cum_net_pnl")
        )
        
        # Buy & Hold Benchmark NAV
        portfolio = portfolio.with_columns(
            benchmark_multiplier=(1.0 + pl.col("avg_asset_return")).cum_prod()
        )
        portfolio = portfolio.with_columns(
            benchmark_nav=self.req.initial_capital * pl.col("benchmark_multiplier")
        )
        
        # High Water Mark and Drawdown
        portfolio = portfolio.with_columns(
            hwm=pl.col("nav").cum_max()
        )
        portfolio = portfolio.with_columns(
            dd_pct=pl.when(pl.col("hwm") > 0)
            .then((pl.col("hwm") - pl.col("nav")) / pl.col("hwm") * 100.0)
            .otherwise(0.0)
        )
        
        # Returns
        portfolio = portfolio.with_columns(
            prev_nav=pl.col("nav").shift(1).fill_null(self.req.initial_capital)
        )
        portfolio = portfolio.with_columns(
            period_return_pct=pl.when(pl.col("prev_nav") > 0)
            .then((pl.col("nav") - pl.col("prev_nav")) / pl.col("prev_nav") * 100.0)
            .otherwise(0.0)
        )

        # Generate output structures
        equity_curve: list[EquitySnapshot] = []
        for row in portfolio.iter_rows(named=True):
            nav = float(row["nav"])
            # Annualized gross/net approximations based on cumulative values
            epochs = row["epoch"] + 1
            years = max(epochs / 8760.0, 0.0001)
            
            gross_pnl = float(row["cum_funding"])
            net_pnl = float(row["cum_net_pnl"])
            
            gross_apr = (gross_pnl / self.req.initial_capital) / years * 100.0
            net_apr = (net_pnl / self.req.initial_capital) / years * 100.0

            equity_curve.append(EquitySnapshot(
                epoch=row["epoch"],
                timestamp=row["timestamp"],
                nav=nav,
                benchmark_nav=float(row["benchmark_nav"]),
                cash=nav,  # Simplify cash=nav for this model
                spot_value=float(row["gross_exposure"] / 2.0),
                perp_value=float(row["gross_exposure"] / 2.0),
                cumulative_funding_received=float(row["cum_funding"]),
                cumulative_fees_paid=float(row["cum_fees"]) + float(row["cum_margin"]), # aggregate costs
                cumulative_slippage_cost=float(row["cum_slippage"]),
                gross_apr=gross_apr,
                net_apr=net_apr,
                drawdown_pct=float(row["dd_pct"]),
                period_pnl=float(row["step_net_pnl"]),
                period_return_pct=float(row["period_return_pct"]),
            ))

        # 8. Trades Generation
        # For performance, only output trades where turnover > 0
        trades_df = df.filter(pl.col("turnover_notional") > 1e-2)
        trades: list[TradeRecord] = []
        for row in trades_df.iter_rows(named=True):
            trades.append(TradeRecord(
                id=uuid.uuid4().hex[:8],
                epoch=row["epoch"],
                timestamp=row["timestamp"],
                asset=row["asset"],
                action="REBALANCE",
                side="LONG_SPOT_SHORT_PERP",
                notional_usd=float(row["turnover_notional"]),
                mark_price=float(row["mark_price"]),
                basis_bps=float(row["basis_bps"]),
                funding_rate_1h=float(row["funding_rate_1h"]),
                fee_paid=float(row["exec_fees_usd"] + row["exec_slippage_usd"])
            ))

        # 9. Asset Attribution
        attr_df = df.group_by("asset").agg(
            pl.col("target_notional").mean().alias("allocated_notional"),
            pl.col("funding_pnl").sum().alias("funding_earned"),
            pl.col("mark_pnl").sum().alias("basis_pnl"),
            pl.col("exec_fees_usd").sum().alias("fees_paid"),
            pl.col("net_pnl").sum().alias("net_pnl"),
            (pl.col("turnover_notional") > 1e-2).sum().alias("trade_count")
        )
        
        attribution: list[AssetAttribution] = []
        for row in attr_df.iter_rows(named=True):
            attribution.append(AssetAttribution(
                asset=row["asset"],
                allocated_notional=float(row["allocated_notional"]),
                funding_earned=float(row["funding_earned"]),
                basis_pnl=float(row["basis_pnl"]),
                fees_paid=float(row["fees_paid"]),
                net_pnl=float(row["net_pnl"]),
                trade_count=row["trade_count"],
            ))

        return equity_curve, trades, attribution
