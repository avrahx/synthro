from __future__ import annotations

import math

import pytest

from app.engine.basis_engine import BasisBacktestEngine
from app.engine.quant_engine import QuantConfig, QuantEngine
from app.models.schemas import BacktestRequest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _req(**kw) -> BacktestRequest:
    """Minimal valid BacktestRequest; override any field via keyword args."""
    d = dict(
        initial_capital=10_000.0,
        assets=["BTC"],
        rebalance_freq_hours=1,
        taker_fee_bps=0.0,
        slippage_bps=0.0,
        margin_borrow_apr=0.0,
        strategy_mode="INTRA_HL_CASH_AND_CARRY",
    )
    d.update(kw)
    return BacktestRequest(**d)


def _cfg(**kw) -> QuantConfig:
    d = dict(
        assets=["BTC"],
        initial_capital=10_000.0,
        taker_fee_bps=0.0,
        maker_fee_bps=0.0,
        slippage_bps=0.0,
        margin_borrow_apr=0.0,
        rebalance_freq_hours=1,
        max_leverage=1.0,
        strategy_mode="INTRA_HL_CASH_AND_CARRY",
        vault_mode=False,
        leader_stake_pct=0.1,
        hwm_fee_pct=0.0,
    )
    d.update(kw)
    return QuantConfig(**d)


# ---------------------------------------------------------------------------
# Synthetic data generators
# ---------------------------------------------------------------------------


def _flat(n: int = 720) -> list[dict]:
    """n hourly rows, constant mark price, constant positive funding."""
    rows = []
    for i in range(n):
        day = 1 + i // 24
        hr = i % 24
        rows.append({
            "epoch": i,
            "timestamp": f"2026-01-{day:02d} {hr:02d}:00:00",
            "asset": "BTC",
            "mark_price": 50_000.0,
            "funding_rate_1h": 0.0001,
            "cex_funding_rate_8h": 0.0008,
            "basis_bps": 5.0,
        })
    return rows


def _neg_fund(n: int = 200) -> list[dict]:
    """All funding strongly negative — triggers circuit breaker."""
    rows = []
    for i in range(n):
        hr = i % 24
        rows.append({
            "epoch": i,
            "timestamp": f"2026-01-01 {hr:02d}:00:00",
            "asset": "BTC",
            "mark_price": 50_000.0,
            "funding_rate_1h": -0.001,
            "cex_funding_rate_8h": -0.008,
            "basis_bps": -10.0,
        })
    return rows


def _monotone(n: int = 500) -> list[dict]:
    """Perfectly constant positive funding — equity only goes up."""
    rows = []
    for i in range(n):
        hr = i % 24
        rows.append({
            "epoch": i,
            "timestamp": f"2026-01-01 {hr:02d}:00:00",
            "asset": "BTC",
            "mark_price": 50_000.0,
            "funding_rate_1h": 0.00015,
            "cex_funding_rate_8h": 0.0005,
            "basis_bps": 3.0,
        })
    return rows


# ===========================================================================
# BasisBacktestEngine tests
# ===========================================================================


class TestBasisEngine:

    def test_delta_neutrality_no_mark_pnl(self):
        """
        Delta-Neutrality Invariant:
        Flat mark price + zero fees → all PnL comes from funding.
        Terminal drawdown must be exactly 0.0 (no directional PnL to cause it).
        """
        curve, _, _ = BasisBacktestEngine(_req()).run(_flat())
        assert len(curve) > 0
        assert curve[-1].cumulative_funding_received > 0
        assert abs(curve[-1].drawdown_pct) < 1e-6

    def test_spot_equals_perp_notional(self):
        """
        Delta-neutral construction stores spot_value == perp_value
        at every equity snapshot (Spot Long notional = Perp Short notional).
        """
        curve, _, _ = BasisBacktestEngine(_req()).run(_flat())
        for snap in curve:
            assert abs(snap.spot_value - snap.perp_value) < 1e-6, (
                f"Epoch {snap.epoch}: spot={snap.spot_value} != perp={snap.perp_value}"
            )

    def test_funding_accrual_positive(self):
        """Positive funding rates produce strictly positive cumulative cash flow."""
        curve, _, _ = BasisBacktestEngine(_req()).run(_flat())
        assert curve[-1].cumulative_funding_received > 0

    def test_fee_drag_reduces_nav(self):
        """Heavy taker + slippage fees must strictly lower terminal NAV."""
        data = _flat()
        nav_zero = BasisBacktestEngine(_req(taker_fee_bps=0.0, slippage_bps=0.0)).run(data)[0][-1].nav
        nav_fees = BasisBacktestEngine(_req(taker_fee_bps=10.0, slippage_bps=10.0)).run(data)[0][-1].nav
        assert nav_fees < nav_zero, f"Expected nav_fees({nav_fees:.2f}) < nav_zero({nav_zero:.2f})"

    def test_empty_data_returns_empty(self):
        """run([]) must return empty lists without raising."""
        curve, trades, attr = BasisBacktestEngine(_req()).run([])
        assert curve == []
        assert trades == []
        assert attr == []


# ===========================================================================
# QuantEngine tests
# ===========================================================================


class TestQuantEngine:

    # -- Negative funding circuit breaker ----------------------------------

    def test_circuit_breaker_preserves_equity(self):
        """
        Negative Funding Circuit Breaker:
        With unwind_negative_funding=True and all rates negative,
        terminal NAV >= 90 % of initial capital.
        """
        cfg = _cfg(unwind_negative_funding=True, negative_funding_window=3)
        result = QuantEngine(cfg).run(_neg_fund())
        assert len(result.equity_curve) > 0
        nav = result.equity_curve[-1]["nav"]
        assert nav >= cfg.initial_capital * 0.90, f"NAV={nav:.2f} too low"

    def test_circuit_breaker_on_vs_off(self):
        """
        Circuit-breaker ON must produce >= terminal NAV vs OFF when
        funding is consistently negative.
        """
        data = _neg_fund()
        cfg_on = _cfg(unwind_negative_funding=True, negative_funding_window=3)
        cfg_off = _cfg(unwind_negative_funding=False)
        nav_on = QuantEngine(cfg_on).run(data).equity_curve[-1]["nav"]
        nav_off = QuantEngine(cfg_off).run(data).equity_curve[-1]["nav"]
        assert nav_on >= nav_off, f"CB on={nav_on:.2f} should be >= off={nav_off:.2f}"

    # -- High-water mark accounting ----------------------------------------

    def test_hwm_never_decreases(self):
        """
        High-Water Mark Accounting:
        Implied HWM (reconstructed from drawdown %) must be non-decreasing.
        """
        result = QuantEngine(_cfg()).run(_flat())
        prev_hwm = 0.0
        for snap in result.equity_curve:
            dd = snap["drawdown_pct"]
            nav = snap["nav"]
            if dd < 100 and nav > 0:
                hwm = nav / (1 - dd / 100) if dd > 0 else nav
                assert hwm >= prev_hwm - 1e-6, (
                    f"HWM decreased at epoch {snap['epoch']}: {hwm:.4f} < {prev_hwm:.4f}"
                )
                prev_hwm = max(prev_hwm, hwm)

    # -- Cost attribution identity -----------------------------------------

    def test_cost_attribution_identity(self):
        """
        Cost Attribution Identity:
        total_funding - fees - slippage - borrow == net_profit  (within $0.02)
        """
        cfg = _cfg(taker_fee_bps=2.0, slippage_bps=1.0, margin_borrow_apr=0.05)
        m = QuantEngine(cfg).run(_flat()).metrics
        lhs = (
            m["total_funding_usd"]
            - m["total_fees_usd"]
            - m["total_slippage_usd"]
            - m["margin_borrow_cost_usd"]
        )
        assert abs(lhs - m["net_profit_usd"]) < 0.02, (
            f"Identity broken: {lhs:.4f} != {m['net_profit_usd']:.4f}"
        )

    # -- Sharpe / Sortino NaN guards ---------------------------------------

    def test_sharpe_is_finite(self):
        """Sharpe ratio must always be a finite float — never NaN or inf."""
        m = QuantEngine(_cfg()).run(_flat()).metrics
        assert math.isfinite(m["sharpe_ratio"]), f"Sharpe={m['sharpe_ratio']}"

    def test_sortino_is_finite(self):
        """Sortino ratio must be finite even when all returns are positive."""
        m = QuantEngine(_cfg()).run(_flat()).metrics
        assert math.isfinite(m["sortino_ratio"]), f"Sortino={m['sortino_ratio']}"

    # -- Monotone curve => zero MDD ----------------------------------------

    def test_monotone_equity_max_drawdown_zero(self):
        """
        Max Drawdown on a monotonically increasing equity curve must be 0.0
        (proves the HWM guard handles the all-win case cleanly).
        """
        cfg = _cfg(taker_fee_bps=0.0, slippage_bps=0.0, margin_borrow_apr=0.0)
        m = QuantEngine(cfg).run(_monotone()).metrics
        assert m["max_drawdown_pct"] == pytest.approx(0.0, abs=1e-4), (
            f"Monotone curve MDD={m['max_drawdown_pct']:.6f} (expected 0.0)"
        )

    # -- Data sanitization -------------------------------------------------

    def test_null_funding_sanitized_no_crash(self):
        """None funding_rate_1h in first row must forward-fill without crashing."""
        data = [
            {
                "epoch": i,
                "timestamp": f"2026-01-01 0{i}:00:00",
                "asset": "BTC",
                "mark_price": 50_000.0,
                "funding_rate_1h": None if i == 0 else 0.0001,
                "cex_funding_rate_8h": 0.0008,
                "basis_bps": 0.0,
            }
            for i in range(3)
        ]
        result = QuantEngine(_cfg()).run(data)
        assert len(result.equity_curve) > 0

    def test_extreme_funding_clipped_to_realistic_apr(self):
        """
        funding_rate_1h=0.05 (5% / hr = 438,000% APR) must be clipped to
        <= 0.5%/hr.  After clipping to 0.005/hr, gross_apr = ~4380% which
        is correct.  Without clipping it would be ~438,000%.  Assert < 10,000%.
        """
        data = [
            {
                "epoch": i,
                "timestamp": f"2026-01-01 {i % 24:02d}:00:00",
                "asset": "BTC",
                "mark_price": 50_000.0,
                "funding_rate_1h": 0.05,          # extreme spike
                "cex_funding_rate_8h": 0.0008,
                "basis_bps": 0.0,
            }
            for i in range(50)
        ]
        result = QuantEngine(_cfg()).run(data)
        apr = result.equity_curve[-1]["gross_apr"]
        # Unclipped 0.05/hr * 8760h * 100 = 438,000%.  Clipped 0.005/hr → 4,380%.
        assert apr < 10_000.0, (
            f"Extreme funding not clipped correctly: APR={apr:.1f}% (expected < 10,000%)"
        )
