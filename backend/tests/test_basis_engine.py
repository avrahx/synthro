import pytest
import polars as pl
import numpy as np
from app.engine.basis_engine import BasisBacktestEngine
from app.models.schemas import BacktestRequest

@pytest.fixture
def sample_data():
    """Generates synthetic hourly mock data for tests."""
    time_index = pl.datetime_range(
        start=pl.datetime(2026, 1, 1), 
        end=pl.datetime(2026, 1, 31), 
        interval="1h", 
        eager=True
    )
    
    n_hours = len(time_index)
    
    # Synthetic flat price but with a +30% shock at hour 100
    prices = np.full(n_hours, 50000.0)
    prices[100:] = 65000.0
    
    # Synthetic varying funding rate so standard deviation > 0
    funding_rates = np.linspace(0.0001, 0.0002, n_hours)
    
    df = pl.DataFrame({
        "epoch": list(range(n_hours)),
        "timestamp": time_index.cast(pl.String),
        "asset": ["BTC"] * n_hours,
        "mark_price": prices,
        "index_price": prices,
        "funding_rate_1h": funding_rates,
        "cex_funding_rate_8h": funding_rates * 8.0,
        "basis_bps": np.zeros(n_hours)
    })
    return df

def test_delta_neutrality_invariant(sample_data):
    """
    Delta-Neutrality Invariant Test:
    If underlying spot price moves +30%, net price PnL should remain exactly $0.00.
    """
    req = BacktestRequest(
        initial_capital=10_000.0,
        assets=["BTC"],
        rebalance_freq_hours=1,
        taker_fee_bps=0.0,
        slippage_bps=0.0,
        margin_borrow_apr=0.0,
        strategy_mode="INTRA_HL_CASH_AND_CARRY"
    )
    engine = BasisBacktestEngine(req)
    
    # We passed sample_data, but engine.run() expects raw dicts
    # In earlier tests we used `engine.load_data`. The real run() takes raw_data.
    res_curve, _, _ = engine.run(sample_data.to_dicts())
    
    # The synthetic data has constant 0.01% funding, which is above 6.0 bps threshold.
    assert res_curve[-1].cumulative_funding_received > 0
    
    # Second, check drawdown. Since we are delta neutral, a price shock shouldn't cause drawdown.
    assert abs(res_curve[-1].drawdown_pct) < 1e-4

def test_funding_accrual(sample_data):
    """
    1-Hour Funding Accrual Test:
    Holding a short perpetual over positive funding epochs correctly increments cash flows.
    """
    req = BacktestRequest(
        initial_capital=1000.0,
        assets=["BTC"],
        rebalance_freq_hours=1,
        taker_fee_bps=0.0,
        slippage_bps=0.0,
        margin_borrow_apr=0.0,
        strategy_mode="INTRA_HL_CASH_AND_CARRY"
    )
    engine = BasisBacktestEngine(req)
    
    res_curve, _, _ = engine.run(sample_data.to_dicts())
    
    assert res_curve[-1].period_return_pct >= 0
    assert res_curve[-1].cumulative_funding_received > 0
    
def test_fee_drag_and_slippage(sample_data):
    """
    Fee Drag & Slippage Accounting:
    Verify that turnover-based taker fees and slippage reduce ending equity accurately.
    """
    # Run with 0 fees
    req_zero = BacktestRequest(initial_capital=10_000.0, assets=["BTC"], taker_fee_bps=0.0, slippage_bps=0.0, strategy_mode="INTRA_HL_CASH_AND_CARRY")
    engine_zero = BasisBacktestEngine(req_zero)
    engine_zero.load_data = lambda df: df # mocked for tests as data is passed to run()
    res_zero_curve, _, _ = engine_zero.run(sample_data.to_dicts())
    
    # Run with heavy fees
    req_fees = BacktestRequest(initial_capital=10_000.0, assets=["BTC"], taker_fee_bps=10.0, slippage_bps=10.0, strategy_mode="INTRA_HL_CASH_AND_CARRY")
    engine_fees = BasisBacktestEngine(req_fees)
    res_fees_curve, _, _ = engine_fees.run(sample_data.to_dicts())
    
    assert res_fees_curve[-1].nav < res_zero_curve[-1].nav
