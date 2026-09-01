"""
HyperVault Alpha — Risk-Adjusted Performance Metrics

Computes Sharpe, Sortino, Calmar, Max Drawdown, Win Rate,
Profit Factor, and average epoch return from equity curve data.
"""

from __future__ import annotations

import numpy as np

from app.models.schemas import (
    BacktestRequest,
    EquitySnapshot,
    TradeRecord,
    SummaryMetrics,
)


class MetricsCalculator:
    """Stateless calculator for aggregate risk and return statistics."""

    @staticmethod
    def compute(
        request: BacktestRequest,
        equity_curve: list[EquitySnapshot],
        trades: list[TradeRecord],
    ) -> SummaryMetrics:
        if not equity_curve:
            return MetricsCalculator._empty(request)

        initial = request.initial_capital
        final_nav = equity_curve[-1].nav
        net_profit = final_nav - initial
        total_return_pct = (net_profit / initial) * 100

        # Annualize based on number of hourly epochs
        n_epochs = len(equity_curve)
        hours = max(n_epochs, 1)
        years = hours / 8760.0
        ann_return = (
            ((1.0 + total_return_pct / 100.0) ** (1.0 / max(years, 0.01)) - 1.0) * 100
            if total_return_pct > -100
            else -100.0
        )

        # Hourly returns array (skip first epoch)
        returns = np.array([
            pt.period_return_pct / 100.0 for pt in equity_curve[1:]
        ])

        # Annualization factor for hourly data
        ann_factor = np.sqrt(8760.0)

        # Sharpe
        if len(returns) > 1 and np.std(returns) > 1e-10:
            sharpe = float(np.mean(returns) / np.std(returns) * ann_factor)
        else:
            sharpe = 0.0

        # Sortino (downside deviation)
        downside = returns[returns < 0]
        if len(downside) > 0:
            downside_std = np.sqrt(np.mean(downside ** 2))
            sortino = (
                float(np.mean(returns) / downside_std * ann_factor)
                if downside_std > 1e-10
                else sharpe * 1.4
            )
        else:
            sortino = sharpe * 1.4 if sharpe > 0 else 0.0

        # Max Drawdown
        max_dd = float(max(pt.drawdown_pct for pt in equity_curve))

        # Calmar
        calmar = float(ann_return / max_dd) if max_dd > 0.01 else 0.0

        # Win rate (epoch-level)
        winning = sum(1 for pt in equity_curve[1:] if pt.period_pnl > 0)
        total_periods = max(len(equity_curve) - 1, 1)
        win_rate = (winning / total_periods) * 100

        # Profit Factor
        gross_profit = sum(pt.period_pnl for pt in equity_curve if pt.period_pnl > 0)
        gross_loss = abs(sum(pt.period_pnl for pt in equity_curve if pt.period_pnl < 0))
        profit_factor = (
            gross_profit / gross_loss if gross_loss > 0 else 99.9 if gross_profit > 0 else 1.0
        )

        # Average epoch return in bps
        avg_epoch_bps = float(np.mean(returns) * 10_000) if len(returns) > 0 else 0.0

        # Totals
        total_funding = equity_curve[-1].cumulative_funding
        total_fees = equity_curve[-1].cumulative_fees + equity_curve[-1].cumulative_slippage

        return SummaryMetrics(
            total_return_pct=round(total_return_pct, 2),
            annualized_return_pct=round(min(max(ann_return, -100), 9999), 2),
            sharpe_ratio=round(np.clip(sharpe, -10, 50), 2),
            sortino_ratio=round(np.clip(sortino, -10, 80), 2),
            max_drawdown_pct=round(max_dd, 2),
            calmar_ratio=round(np.clip(calmar, -10, 100), 2),
            win_rate_pct=round(win_rate, 1),
            profit_factor=round(min(profit_factor, 99.9), 2),
            total_trades=len(trades),
            total_funding_usd=round(total_funding, 2),
            total_fees_usd=round(total_fees, 2),
            net_profit_usd=round(net_profit, 2),
            final_nav=round(final_nav, 2),
            initial_capital=round(initial, 2),
            avg_epoch_return_bps=round(avg_epoch_bps, 2),
        )

    @staticmethod
    def _empty(request: BacktestRequest) -> SummaryMetrics:
        return SummaryMetrics(
            total_return_pct=0.0, annualized_return_pct=0.0,
            sharpe_ratio=0.0, sortino_ratio=0.0, max_drawdown_pct=0.0,
            calmar_ratio=0.0, win_rate_pct=0.0, profit_factor=1.0,
            total_trades=0, total_funding_usd=0.0, total_fees_usd=0.0,
            net_profit_usd=0.0, final_nav=request.initial_capital,
            initial_capital=request.initial_capital, avg_epoch_return_bps=0.0,
        )
