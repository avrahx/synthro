"""
Synthro — API Integration Tests: FastAPI TestClient

Tests that /api/v1/live-funding, /api/v1/backtest, and /api/v1/stress-test
return HTTP 200 with valid Pydantic-schema responses, even when the
Hyperliquid upstream is offline (engine falls back to mock data).
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app

# Use a single TestClient for the whole module (no async needed here)
client = TestClient(app, raise_server_exceptions=True)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _minimal_backtest_payload(**overrides) -> dict:
    payload = {
        "initial_capital": 5_000.0,
        "assets": ["BTC", "ETH"],
        "start_date": "2026-01-01",
        "end_date": "2026-03-01",
        "taker_fee_bps": 2.0,
        "maker_fee_bps": 0.0,         # schema ge=0
        "slippage_bps": 1.0,
        "margin_borrow_apr": 0.05,
        "rebalance_freq_hours": 24,
        "max_leverage": 1.0,
        "strategy_mode": "INTRA_HL_CASH_AND_CARRY",
        "vault_mode": False,
        "leader_stake_pct": 5.0,      # schema ge=5
        "hwm_fee_pct": 0.2,
        "unwind_negative_funding": False,
    }
    payload.update(overrides)
    return payload


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------


def test_health_returns_200():
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "healthy"
    assert "version" in body


# ---------------------------------------------------------------------------
# GET /api/v1/live-funding
# ---------------------------------------------------------------------------


class TestLiveFundingEndpoint:

    def test_returns_200(self):
        resp = client.get("/api/v1/live-funding")
        assert resp.status_code == 200

    def test_response_has_required_fields(self):
        body = client.get("/api/v1/live-funding").json()
        for field in ("timestamp", "network", "rates", "avg_hl_annualized_pct",
                      "avg_cex_annualized_pct", "avg_spread_pct"):
            assert field in body, f"Missing top-level field: {field}"

    def test_rates_is_list(self):
        body = client.get("/api/v1/live-funding").json()
        assert isinstance(body["rates"], list)

    def test_rate_row_schema(self):
        """Each rate row must contain the required FundingRateRow fields."""
        body = client.get("/api/v1/live-funding").json()
        if not body["rates"]:
            pytest.skip("No rate rows returned")
        row = body["rates"][0]
        for field in ("symbol", "hl_funding_1h", "hl_funding_annualized_pct",
                      "cex_funding_8h", "cex_funding_annualized_pct",
                      "spread_annualized_pct", "signal"):
            assert field in row, f"Missing FundingRateRow field: {field}"

    def test_signal_is_valid_enum(self):
        """signal must be one of the 5 recognised values."""
        valid = {"STRONG_LONG", "LONG", "NEUTRAL", "SHORT", "STRONG_SHORT"}
        body = client.get("/api/v1/live-funding").json()
        for row in body["rates"]:
            assert row["signal"] in valid, f"Unexpected signal: {row['signal']}"

    def test_asset_filter(self):
        """?assets=BTC should return at most BTC in the response."""
        body = client.get("/api/v1/live-funding?assets=BTC").json()
        for row in body["rates"]:
            assert row["symbol"] == "BTC"

    def test_no_slippage_flag(self):
        """include_slippage=false must not hang and still return 200."""
        resp = client.get("/api/v1/live-funding?include_slippage=false")
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# POST /api/v1/backtest
# ---------------------------------------------------------------------------


class TestBacktestEndpoint:

    def test_returns_200(self):
        resp = client.post("/api/v1/backtest", json=_minimal_backtest_payload())
        assert resp.status_code == 200, resp.text

    def test_response_has_required_top_level_keys(self):
        body = client.post("/api/v1/backtest", json=_minimal_backtest_payload()).json()
        for key in ("request", "summary", "equity_curve", "trades", "attribution"):
            assert key in body, f"Missing key: {key}"

    def test_summary_metrics_schema(self):
        body = client.post("/api/v1/backtest", json=_minimal_backtest_payload()).json()
        s = body["summary"]
        for field in ("sharpe_ratio", "sortino_ratio", "max_drawdown_pct",
                      "total_return_pct", "cagr", "win_rate_pct", "net_profit_usd"):
            assert field in s, f"Missing SummaryMetrics field: {field}"

    def test_equity_curve_non_empty(self):
        body = client.post("/api/v1/backtest", json=_minimal_backtest_payload()).json()
        assert len(body["equity_curve"]) > 0

    def test_equity_curve_snapshot_schema(self):
        body = client.post("/api/v1/backtest", json=_minimal_backtest_payload()).json()
        snap = body["equity_curve"][0]
        for field in ("epoch", "timestamp", "nav", "drawdown_pct",
                      "cumulative_funding_received", "period_return_pct"):
            assert field in snap, f"Missing EquitySnapshot field: {field}"

    def test_sharpe_is_finite_number(self):
        body = client.post("/api/v1/backtest", json=_minimal_backtest_payload()).json()
        import math
        sharpe = body["summary"]["sharpe_ratio"]
        assert math.isfinite(sharpe), f"Sharpe={sharpe} is not finite"

    def test_invalid_request_returns_422(self):
        """Out-of-bounds parameters (e.g. initial_capital < 1000) must return 422."""
        resp = client.post("/api/v1/backtest", json={"initial_capital": -100.0})
        assert resp.status_code == 422

    def test_circuit_breaker_mode(self):
        """unwind_negative_funding=true must return 200 and valid body."""
        payload = _minimal_backtest_payload(unwind_negative_funding=True)
        resp = client.post("/api/v1/backtest", json=payload)
        assert resp.status_code == 200
        body = resp.json()
        assert "equity_curve" in body

    def test_cross_venue_mode(self):
        """CROSS_VENUE_DISLOCATION strategy must return 200."""
        payload = _minimal_backtest_payload(strategy_mode="CROSS_VENUE_DISLOCATION")
        resp = client.post("/api/v1/backtest", json=payload)
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# POST /api/v1/stress-test
# ---------------------------------------------------------------------------


class TestStressTestEndpoint:

    def _payload(self, **overrides) -> dict:
        base = {
            "assets": ["BTC", "ETH"],
            "initial_capital": 10_000.0,
            "max_leverage": 2.0,
            "scenarios": ["FLASH_CRASH", "FUNDING_SPIKE"],
            "taker_fee_bps": 3.0,
            "slippage_bps": 5.0,
        }
        base.update(overrides)
        return base

    def test_returns_200(self):
        resp = client.post("/api/v1/stress-test", json=self._payload())
        assert resp.status_code == 200, resp.text

    def test_response_has_scenarios(self):
        body = client.post("/api/v1/stress-test", json=self._payload()).json()
        # Stress-test returns primary_scenario + sweep arrays
        has_primary = "primary_scenario" in body
        has_sweep = "price_shock_sweep" in body or "basis_sweep" in body
        has_legacy = "scenarios" in body or "results" in body
        assert has_primary or has_sweep or has_legacy, (
            f"Unexpected stress-test schema keys: {list(body.keys())}"
        )

    def test_invalid_request_returns_4xx(self):
        """Out-of-bounds parameters (e.g. portfolio_capital < 1000) should return 422."""
        resp = client.post("/api/v1/stress-test", json={"portfolio_capital": -50.0})
        assert resp.status_code in (400, 422), f"Got {resp.status_code}"
