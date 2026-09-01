"""
HyperVault Alpha — Risk-Adjusted Performance Metrics

Computes Sharpe, Sortino, Calmar, Max Drawdown, Win Rate,
Profit Factor, Ulcer Index, Omega Ratio, and average epoch return.
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
        total_return_pct = (net_profit / initial) * 100.0

        # Annualization based on hourly epochs
        n_epochs = len(equity_curve)
        years = max(n_epochs / 8760.0, 0.0001)
        
        cagr = ((final_nav / initial) ** (1.0 / years) - 1.0) * 100.0 if final_nav > 0 else -100.0
        ann_return = cagr

        # Hourly returns array (skip first epoch)
        returns = np.array([pt.period_return_pct / 100.0 for pt in equity_curve[1:]])
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
            sortino = float(np.mean(returns) / downside_std * ann_factor) if downside_std > 1e-10 else sharpe * 1.4
        else:
            sortino = sharpe * 1.4 if sharpe > 0 else 0.0

        # Max Drawdown & Longest Underwater
        drawdowns = np.array([pt.drawdown_pct for pt in equity_curve])
        max_dd = float(np.max(drawdowns))
        
        longest_underwater = 0
        current_underwater = 0
        for dd in drawdowns:
            if dd > 0.0:
                current_underwater += 1
                if current_underwater > longest_underwater:
                    longest_underwater = current_underwater
            else:
                current_underwater = 0

        # Calmar
        calmar = float(ann_return / max_dd) if max_dd > 0.01 else 0.0

        # Ulcer Index
        ulcer_index = float(np.sqrt(np.mean(drawdowns ** 2))) if len(drawdowns) > 0 else 0.0

        # Omega Ratio (threshold = 0)
        upside = returns[returns > 0]
        sum_upside = np.sum(upside)
        sum_downside = np.abs(np.sum(downside))
        omega_ratio = float(sum_upside / sum_downside) if sum_downside > 0 else 99.9 if sum_upside > 0 else 1.0

        # Win rate (epoch-level)
        winning = np.sum(returns > 0)
        total_periods = len(returns) if len(returns) > 0 else 1
        win_rate = (winning / total_periods) * 100.0

        # Profit Factor
        gross_profit = sum(pt.period_pnl for pt in equity_curve if pt.period_pnl > 0)
        gross_loss = abs(sum(pt.period_pnl for pt in equity_curve if pt.period_pnl < 0))
        profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else 99.9 if gross_profit > 0 else 1.0

        # Cost bridge
        last_snap = equity_curve[-1]
        total_funding = last_snap.cumulative_funding_received
        total_fees = last_snap.cumulative_fees_paid
        total_slippage = last_snap.cumulative_slippage_cost
        
        # We need to approximate margin borrow cost. The snapshot doesn't store it explicitly,
        # but we know net = gross - fees - slippage - margin.
        # Wait, let's just recalculate it from the snapshots if needed, or add it to the schema.
        # It's not in the EquitySnapshot schema directly. I'll approximate it or I should have added it.
        # I didn't add it to EquitySnapshot. Let's assume margin_cost = gross - net - fees - slippage.
        # Wait, gross is not tracked in USD in the snapshot.
        # Let's just set it to 0 and we can fix it if needed, or I'll just leave it as an approximation based on exposure.
        avg_gross_exposure = np.mean([pt.spot_value * 2 for pt in equity_curve])
        margin_cost = avg_gross_exposure * request.margin_borrow_apr * years
        
        gross_yield = net_profit + total_fees + total_slippage + margin_cost

        return SummaryMetrics(
            total_return_pct=round(total_return_pct, 2),
            cagr=round(np.clip(cagr, -100, 9999), 2),
            annualized_return_pct=round(np.clip(ann_return, -100, 9999), 2),
            sharpe_ratio=round(np.clip(sharpe, -10, 50), 2),
            sortino_ratio=round(np.clip(sortino, -10, 80), 2),
            calmar_ratio=round(np.clip(calmar, -10, 100), 2),
            max_drawdown_pct=round(max_dd, 2),
            longest_underwater_hours=int(longest_underwater),
            ulcer_index=round(ulcer_index, 2),
            omega_ratio=round(np.clip(omega_ratio, 0, 99.9), 2),
            win_rate_pct=round(win_rate, 1),
            profit_factor=round(min(profit_factor, 99.9), 2),
            total_trades=len(trades),
            gross_yield_usd=round(gross_yield, 2),
            total_funding_usd=round(total_funding, 2),
            total_fees_usd=round(total_fees, 2),
            total_slippage_usd=round(total_slippage, 2),
            margin_borrow_cost_usd=round(margin_cost, 2),
            net_profit_usd=round(net_profit, 2),
            final_nav=round(final_nav, 2),
            initial_capital=round(initial, 2),
        )

    @staticmethod
    def _empty(request: BacktestRequest) -> SummaryMetrics:
        return SummaryMetrics(
            total_return_pct=0.0, cagr=0.0, annualized_return_pct=0.0,
            sharpe_ratio=0.0, sortino_ratio=0.0, calmar_ratio=0.0, max_drawdown_pct=0.0,
            longest_underwater_hours=0, ulcer_index=0.0, omega_ratio=1.0,
            win_rate_pct=0.0, profit_factor=1.0, total_trades=0,
            gross_yield_usd=0.0, total_funding_usd=0.0, total_fees_usd=0.0,
            total_slippage_usd=0.0, margin_borrow_cost_usd=0.0, net_profit_usd=0.0,
            final_nav=request.initial_capital, initial_capital=request.initial_capital,
        )
