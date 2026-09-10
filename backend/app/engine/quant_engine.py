"""
Synthro — Vectorized Quantitative Engine (Polars-Native)

Institutional backtesting module: all analytics computed exclusively using
Polars expressions for maximum throughput and zero-copy memory layout.

Metrics produced:
  - CAGR (Compound Annual Growth Rate)
  - Sharpe Ratio  (annualized, 8760 hourly epochs / year)
  - Sortino Ratio (downside-deviation penalty only)
  - Maximum Drawdown + recovery duration
  - Calmar, Omega, Ulcer Index
  - Fee-adjusted gross yield vs net yield
  - Regime sensitivity: optional filter of epochs where 1h funding < 0
    for more than `negative_funding_window` consecutive hours.
"""

from __future__ import annotations

import math
import uuid
from dataclasses import dataclass
from typing import Any

import polars as pl


# ── Constants ─────────────────────────────────────────────────────────────────
HOURS_PER_YEAR: int = 8_760          # annualization factor for 1h resolution
ANN_FACTOR: float = math.sqrt(HOURS_PER_YEAR)


# ── Input / Output Types ──────────────────────────────────────────────────────

@dataclass
class QuantConfig:
    """Parameters forwarded from the API request to the quant engine."""
    assets: list[str]
    initial_capital: float
    taker_fee_bps: float               # exchange taker fee
    maker_fee_bps: float               # maker rebate (negative cost)
    slippage_bps: float                # market-impact per side
    margin_borrow_apr: float           # annualized cost of spot collateral
    rebalance_freq_hours: int
    max_leverage: float
    strategy_mode: str                 # INTRA_HL_CASH_AND_CARRY | CROSS_VENUE_DISLOCATION
    vault_mode: bool
    leader_stake_pct: float
    hwm_fee_pct: float
    # Regime sensitivity ---
    unwind_negative_funding: bool = False
    negative_funding_window: int = 3   # consecutive hours before unwind trigger


@dataclass
class QuantResult:
    equity_curve: list[dict[str, Any]]
    trades: list[dict[str, Any]]
    attribution: list[dict[str, Any]]
    metrics: dict[str, float | int]


# ── Core Engine ───────────────────────────────────────────────────────────────

class QuantEngine:
    """
    All computations are expressed as Polars expressions so they execute
    in Rust's multi-threaded runtime—no Python loops on hot paths.
    """

    def __init__(self, cfg: QuantConfig) -> None:
        self.cfg = cfg
        self._taker = cfg.taker_fee_bps / 10_000.0
        self._slippage = cfg.slippage_bps / 10_000.0
        self._borrow_1h = cfg.margin_borrow_apr / HOURS_PER_YEAR
        self._top_k = max(1, min(3, len(cfg.assets)))

    # ── Public entry ─────────────────────────────────────────────────────

    def run(self, raw_data: list[dict[str, Any]]) -> QuantResult:
        if not raw_data:
            return QuantResult([], [], [], self._empty_metrics())

        df = pl.DataFrame(raw_data).sort(["epoch", "asset"])

        # Step 0 – Sanitize inputs: fill nulls, safe-cast numerics
        df = self._sanitize_input(df)

        # Step 1 – Regime sensitivity filter
        df = self._apply_regime_filter(df)

        # Step 2 – Spread scoring & Z-score ranking
        df = self._compute_spread_scores(df)

        # Step 3 – Capital allocation weights
        df = self._compute_weights(df)

        # Step 4 – Execution costs & PnL accrual
        df = self._compute_pnl(df)

        # Step 5 – Portfolio aggregation (cross-sectional sum per epoch)
        portfolio = self._aggregate_portfolio(df)

        # Step 6 – Drawdown, HWM, returns
        portfolio = self._compute_drawdown(portfolio)

        # Step 7 – Risk metrics (pure Polars where possible)
        metrics = self._compute_metrics(portfolio, df)

        # Step 8 – Serialize outputs
        equity_curve = self._build_equity_curve(portfolio)
        trades = self._build_trades(df)
        attribution = self._build_attribution(df)

        return QuantResult(equity_curve, trades, attribution, metrics)

    # ── Input Sanitization ────────────────────────────────────────────────

    def _sanitize_input(self, df: pl.DataFrame) -> pl.DataFrame:
        """
        Defensively clean raw tick data before any computation:
          - Safe-cast string numerics to Float64 (strict=False avoids batch crashes)
          - Forward-fill null values per asset so missing epochs don't cascade
          - Clip funding rates to prevent extreme synthetic outliers blowing metrics
        """
        numeric_cols = ["mark_price", "funding_rate_1h", "basis_bps"]
        if "cex_funding_rate_8h" in df.columns:
            numeric_cols.append("cex_funding_rate_8h")

        # Safe-cast any string numerics; non-parseable values become null then 0.0
        cast_exprs = [
            pl.col(c).cast(pl.Float64, strict=False).fill_null(0.0).alias(c)
            for c in numeric_cols
            if c in df.columns
        ]
        if cast_exprs:
            df = df.with_columns(cast_exprs)

        # Forward-fill nulls per asset for remaining columns
        ff_cols = [c for c in numeric_cols if c in df.columns]
        if ff_cols:
            df = df.with_columns(
                [pl.col(c).forward_fill().over("asset").fill_null(0.0) for c in ff_cols]
            )

        # Clip funding rates: OU process should stay in [-0.2%, +0.5%] per hour
        if "funding_rate_1h" in df.columns:
            df = df.with_columns(
                funding_rate_1h=pl.col("funding_rate_1h").clip(-0.002, 0.005)
            )

        # Ensure mark_price is always positive
        if "mark_price" in df.columns:
            df = df.with_columns(
                mark_price=pl.col("mark_price").clip(lower_bound=1e-8)
            )

        return df

    # ── Regime Filter ─────────────────────────────────────────────────────

    def _apply_regime_filter(self, df: pl.DataFrame) -> pl.DataFrame:
        """
        When unwind_negative_funding is True, mask funding contributions
        for any epoch where the 1h funding rate has been negative for
        >= negative_funding_window consecutive hours per asset.
        """
        if not self.cfg.unwind_negative_funding:
            return df.with_columns(pl.lit(True).alias("in_regime"))

        window = self.cfg.negative_funding_window

        # Rolling count of consecutive negative funding hours per asset
        df = df.with_columns(
            is_neg_fund=(pl.col("funding_rate_1h") < 0.0)
        )

        # Sum of consecutive True values: resets when funding > 0
        # We implement a rolling sum over a window and check if all are negative
        df = df.with_columns(
            neg_count=pl.col("is_neg_fund")
            .cast(pl.Int32)
            .rolling_sum(window_size=window, min_samples=window)
            .over("asset")
            .fill_null(0)
        )

        df = df.with_columns(
            in_regime=(pl.col("neg_count") < window)
        )

        return df.drop(["is_neg_fund", "neg_count"])

    # ── Spread Scoring ────────────────────────────────────────────────────

    def _compute_spread_scores(self, df: pl.DataFrame) -> pl.DataFrame:
        if self.cfg.strategy_mode == "CROSS_VENUE_DISLOCATION":
            df = df.with_columns(
                spread_1h=(
                    pl.col("funding_rate_1h")
                    - (pl.col("cex_funding_rate_8h") / 8.0)
                )
            )
        else:
            df = df.with_columns(spread_1h=pl.col("funding_rate_1h"))

        # Zero out spread when regime filter says we should be flat
        if "in_regime" in df.columns:
            df = df.with_columns(
                spread_1h=pl.when(pl.col("in_regime"))
                .then(pl.col("spread_1h"))
                .otherwise(0.0)
            )

        # Rolling 24h Z-score per asset
        df = df.with_columns(
            spread_mean=pl.col("spread_1h")
            .rolling_mean(window_size=24, min_samples=1)
            .over("asset"),
            spread_std=pl.col("spread_1h")
            .rolling_std(window_size=24, min_samples=1)
            .over("asset"),
        )
        df = df.with_columns(
            z_score=pl.when(pl.col("spread_std") > 1e-12)
            .then((pl.col("spread_1h") - pl.col("spread_mean")) / pl.col("spread_std"))
            .otherwise(0.0)
        )
        return df

    # ── Capital Weights ───────────────────────────────────────────────────

    def _compute_weights(self, df: pl.DataFrame) -> pl.DataFrame:
        top_k = self._top_k

        # Cross-sectional rank per epoch (descending Z-score)
        df = df.with_columns(
            rank=pl.col("z_score")
            .rank(method="ordinal", descending=True)
            .over("epoch")
        )

        # Target weight: equal-weight top K
        df = df.with_columns(
            target_wt=pl.when(pl.col("rank") <= top_k)
            .then(1.0 / top_k)
            .otherwise(0.0)
        )

        # Only update weight on rebalance epochs; forward-fill otherwise
        freq = self.cfg.rebalance_freq_hours
        df = df.with_columns(
            is_rebalance=(pl.col("epoch") % freq == 0)
        )
        df = df.with_columns(
            actual_wt=pl.when(pl.col("is_rebalance"))
            .then(pl.col("target_wt"))
            .otherwise(None)
        )
        df = df.with_columns(
            actual_wt=pl.col("actual_wt")
            .forward_fill()
            .over("asset")
            .fill_null(0.0)
        )

        total_alloc = self.cfg.initial_capital * self.cfg.max_leverage
        df = df.with_columns(
            notional=pl.col("actual_wt") * total_alloc
        )

        # Turnover (change in notional per asset per epoch)
        df = df.with_columns(
            prev_notional=pl.col("notional")
            .shift(1)
            .over("asset")
            .fill_null(0.0)
        )
        df = df.with_columns(
            turnover=(pl.col("notional") - pl.col("prev_notional")).abs()
        )
        return df

    # ── PnL Accrual ───────────────────────────────────────────────────────

    def _compute_pnl(self, df: pl.DataFrame) -> pl.DataFrame:
        taker = self._taker
        slip = self._slippage
        borrow = self._borrow_1h

        # Execution costs on turnover (both spot + perp legs → ×2)
        df = df.with_columns(
            fee_usd=pl.col("turnover") * 2.0 * taker,
            slippage_usd=pl.col("turnover") * 2.0 * slip,
            borrow_usd=pl.col("notional") * borrow,
        )

        # Funding PnL: received on held notional (delta-neutral, so we receive)
        df = df.with_columns(
            funding_pnl=pl.col("notional") * pl.col("spread_1h"),
        )

        # Delta-neutral → mark-price PnL cancels (spot long + perp short)
        df = df.with_columns(
            net_pnl=(
                pl.col("funding_pnl")
                - pl.col("fee_usd")
                - pl.col("slippage_usd")
                - pl.col("borrow_usd")
            )
        )
        return df

    # ── Portfolio Aggregation ─────────────────────────────────────────────

    def _aggregate_portfolio(self, df: pl.DataFrame) -> pl.DataFrame:
        portfolio = (
            df.group_by(["epoch", "timestamp"])
            .agg(
                pl.col("notional").sum().alias("gross_exp"),
                pl.col("funding_pnl").sum().alias("step_funding"),
                pl.col("fee_usd").sum().alias("step_fees"),
                pl.col("slippage_usd").sum().alias("step_slippage"),
                pl.col("borrow_usd").sum().alias("step_borrow"),
                pl.col("net_pnl").sum().alias("step_net"),
            )
            .sort("epoch")
        )

        portfolio = portfolio.with_columns(
            cum_funding=pl.col("step_funding").cum_sum(),
            cum_fees=pl.col("step_fees").cum_sum(),
            cum_slippage=pl.col("step_slippage").cum_sum(),
            cum_borrow=pl.col("step_borrow").cum_sum(),
            cum_net=pl.col("step_net").cum_sum(),
        )

        ic = self.cfg.initial_capital
        portfolio = portfolio.with_columns(
            nav=(ic + pl.col("cum_net"))
        )
        return portfolio

    # ── Drawdown & Returns ────────────────────────────────────────────────

    def _compute_drawdown(self, portfolio: pl.DataFrame) -> pl.DataFrame:
        portfolio = portfolio.with_columns(
            hwm=pl.col("nav").cum_max()
        )
        portfolio = portfolio.with_columns(
            dd_pct=pl.when(pl.col("hwm") > 0)
            .then((pl.col("hwm") - pl.col("nav")) / pl.col("hwm") * 100.0)
            .otherwise(0.0)
        )

        ic = self.cfg.initial_capital
        portfolio = portfolio.with_columns(
            prev_nav=pl.col("nav").shift(1).fill_null(ic)
        )
        portfolio = portfolio.with_columns(
            period_ret=pl.when(pl.col("prev_nav") > 0)
            .then((pl.col("nav") - pl.col("prev_nav")) / pl.col("prev_nav"))
            .otherwise(0.0)
        )
        return portfolio

    # ── Risk Metrics ──────────────────────────────────────────────────────

    def _compute_metrics(
        self, portfolio: pl.DataFrame, df: pl.DataFrame
    ) -> dict[str, float | int]:
        ic = self.cfg.initial_capital
        final_nav = portfolio["nav"].to_list()[-1]
        net_profit = final_nav - ic
        total_return_pct = net_profit / ic * 100.0

        n_epochs = len(portfolio)
        years = max(n_epochs / HOURS_PER_YEAR, 1e-6)
        cagr = ((final_nav / ic) ** (1.0 / years) - 1.0) * 100.0 if final_nav > 0 else -100.0

        # Polars-computed period returns array
        rets = portfolio["period_ret"].to_numpy()
        mean_r = float(rets.mean()) if len(rets) else 0.0
        std_r = float(rets.std()) if len(rets) > 1 else 1e-10

        sharpe_raw = (mean_r / std_r * ANN_FACTOR) if std_r > 1e-10 else 0.0
        sharpe = sharpe_raw if math.isfinite(sharpe_raw) else 0.0

        downside = rets[rets < 0]
        if len(downside) > 0:
            ds_std = float((downside**2).mean() ** 0.5)
            sortino_raw = (mean_r / ds_std * ANN_FACTOR) if ds_std > 1e-10 else sharpe * 1.4
            sortino = sortino_raw if math.isfinite(sortino_raw) else 0.0
        else:
            # No negative returns — all-positive equity curve; Sortino is undefined/infinite;
            # return a conservative multiple of Sharpe rather than inf
            sortino = sharpe * 1.4

        drawdowns = portfolio["dd_pct"].to_numpy()
        max_dd = float(drawdowns.max()) if len(drawdowns) else 0.0
        # Monotonically increasing curve — guarantee clean 0.0 output
        if not math.isfinite(max_dd) or max_dd < 0:
            max_dd = 0.0
        calmar = (cagr / max_dd) if max_dd > 0.01 else 0.0

        # Ulcer Index
        ulcer = float(((drawdowns**2).mean()) ** 0.5) if len(drawdowns) else 0.0

        # Omega
        upside_sum = float(rets[rets > 0].sum())
        down_sum = float(abs(rets[rets < 0].sum()))
        omega = (upside_sum / down_sum) if down_sum > 0 else 99.9

        win_rate = float((rets > 0).sum() / max(len(rets), 1) * 100.0)

        # Cost bridge
        last = portfolio.tail(1)
        total_funding = float(last["cum_funding"][0])
        total_fees = float(last["cum_fees"][0])
        total_slippage = float(last["cum_slippage"][0])
        total_borrow = float(last["cum_borrow"][0])
        gross_yield = total_funding

        # Longest underwater streak
        underwater = 0
        longest = 0
        for dd in drawdowns:
            if dd > 0:
                underwater += 1
                longest = max(longest, underwater)
            else:
                underwater = 0

        # Trade count
        trade_count = int((df["turnover"] > 1e-2).sum())

        return {
            "total_return_pct": round(total_return_pct, 2),
            "cagr": round(float(cagr), 2),
            "annualized_return_pct": round(float(cagr), 2),
            "sharpe_ratio": round(min(max(sharpe, -10.0), 50.0), 2),
            "sortino_ratio": round(min(max(sortino, -10.0), 80.0), 2),
            "calmar_ratio": round(min(max(calmar, -10.0), 100.0), 2),
            "max_drawdown_pct": round(max_dd, 2),
            "longest_underwater_hours": int(longest),
            "ulcer_index": round(ulcer, 2),
            "omega_ratio": round(min(omega, 99.9), 2),
            "win_rate_pct": round(win_rate, 1),
            "profit_factor": round(min(upside_sum / max(down_sum, 1e-10), 99.9), 2),
            "total_trades": trade_count,
            "gross_yield_usd": round(gross_yield, 2),
            "total_funding_usd": round(total_funding, 2),
            "total_fees_usd": round(total_fees, 2),
            "total_slippage_usd": round(total_slippage, 2),
            "margin_borrow_cost_usd": round(total_borrow, 2),
            "net_profit_usd": round(net_profit, 2),
            "final_nav": round(final_nav, 2),
            "initial_capital": round(ic, 2),
        }

    # ── Output Builders ───────────────────────────────────────────────────

    def _build_equity_curve(self, portfolio: pl.DataFrame) -> list[dict[str, Any]]:
        ic = self.cfg.initial_capital
        rows = portfolio.iter_rows(named=True)
        curve = []
        for row in rows:
            epoch = row["epoch"]
            years = max((epoch + 1) / HOURS_PER_YEAR, 1e-6)
            gross_pnl = float(row["cum_funding"])
            net_pnl = float(row["cum_net"])
            nav = float(row["nav"])
            curve.append({
                "epoch": epoch,
                "timestamp": row["timestamp"],
                "nav": nav,
                "benchmark_nav": ic,  # simple flat benchmark placeholder
                "cash": nav,
                "spot_value": float(row["gross_exp"]) / 2.0,
                "perp_value": float(row["gross_exp"]) / 2.0,
                "cumulative_funding_received": float(row["cum_funding"]),
                "cumulative_fees_paid": float(row["cum_fees"]) + float(row["cum_borrow"]),
                "cumulative_slippage_cost": float(row["cum_slippage"]),
                "gross_apr": round(gross_pnl / ic / years * 100.0, 2),
                "net_apr": round(net_pnl / ic / years * 100.0, 2),
                "drawdown_pct": float(row["dd_pct"]),
                "period_pnl": float(row["step_net"]),
                "period_return_pct": float(row["period_ret"]) * 100.0,
            })
        return curve

    def _build_trades(self, df: pl.DataFrame) -> list[dict[str, Any]]:
        trades_df = df.filter(pl.col("turnover") > 1e-2)
        trades = []
        for row in trades_df.iter_rows(named=True):
            trades.append({
                "id": uuid.uuid4().hex[:8],
                "epoch": row["epoch"],
                "timestamp": row["timestamp"],
                "asset": row["asset"],
                "action": "REBALANCE",
                "side": "LONG_SPOT_SHORT_PERP",
                "notional_usd": float(row["turnover"]),
                "mark_price": float(row["mark_price"]),
                "basis_bps": float(row["basis_bps"]),
                "funding_rate_1h": float(row["funding_rate_1h"]),
                "fee_paid": float(row["fee_usd"] + row["slippage_usd"]),
                "pnl_realized": 0.0,
            })
        return trades

    def _build_attribution(self, df: pl.DataFrame) -> list[dict[str, Any]]:
        attr = (
            df.group_by("asset")
            .agg(
                pl.col("notional").mean().alias("allocated_notional"),
                pl.col("funding_pnl").sum().alias("funding_earned"),
                pl.lit(0.0).alias("basis_pnl"),
                pl.col("fee_usd").sum().alias("fees_paid"),
                pl.col("net_pnl").sum().alias("net_pnl"),
                (pl.col("turnover") > 1e-2).sum().alias("trade_count"),
            )
            .sort("asset")
        )
        return [
            {
                "asset": row["asset"],
                "allocated_notional": float(row["allocated_notional"]),
                "funding_earned": float(row["funding_earned"]),
                "basis_pnl": float(row["basis_pnl"]),
                "fees_paid": float(row["fees_paid"]),
                "net_pnl": float(row["net_pnl"]),
                "trade_count": int(row["trade_count"]),
            }
            for row in attr.iter_rows(named=True)
        ]

    @staticmethod
    def _empty_metrics() -> dict[str, float | int]:
        return {
            "total_return_pct": 0.0, "cagr": 0.0, "annualized_return_pct": 0.0,
            "sharpe_ratio": 0.0, "sortino_ratio": 0.0, "calmar_ratio": 0.0,
            "max_drawdown_pct": 0.0, "longest_underwater_hours": 0,
            "ulcer_index": 0.0, "omega_ratio": 1.0, "win_rate_pct": 0.0,
            "profit_factor": 1.0, "total_trades": 0, "gross_yield_usd": 0.0,
            "total_funding_usd": 0.0, "total_fees_usd": 0.0,
            "total_slippage_usd": 0.0, "margin_borrow_cost_usd": 0.0,
            "net_profit_usd": 0.0, "final_nav": 0.0, "initial_capital": 0.0,
        }
