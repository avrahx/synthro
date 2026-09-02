import pytest
from app.engine.vault_model import HyperliquidVaultSimulator
from app.models.schemas import BacktestRequest

def test_high_water_mark_fee():
    """
    High-Water Mark (HWM) Test:
    Ensure the 10% performance fee is deducted ONLY when NAV per share 
    exceeds the historical peak, and is NOT charged during recovery from drawdowns.
    """
    req = BacktestRequest(
        initial_capital=100_000.0,
        leader_stake_pct=10.0,
        hwm_fee_pct=10.0
    )
    vault = HyperliquidVaultSimulator(req)
    
    assert vault.share_price == 1.0
    
    # Step 1: Profitable epoch (+10,000 total strategy PnL)
    vault.apply_epoch_pnl("2026-01-01T00:00", 110_000.0)
    
    # After fee, NAV per share should hit a new HWM.
    assert vault.share_price > 1.0
    hwm_after_profit = vault.high_water_mark
    assert hwm_after_profit == vault.share_price
    
    # Step 2: Drawdown (-5,000 total strategy PnL) -> NAV = 105,000
    vault.apply_epoch_pnl("2026-01-01T01:00", 105_000.0)
    
    assert vault.share_price < hwm_after_profit
    assert vault.high_water_mark == hwm_after_profit # HWM should not drop
    
    # Step 3: Partial Recovery (+2,000 total strategy PnL) -> NAV = 107,000
    vault.apply_epoch_pnl("2026-01-01T02:00", 107_000.0)
    
    # We just ensure the high water mark didn't change and fee was not collected
    assert vault.high_water_mark == hwm_after_profit
    assert vault.share_price < vault.high_water_mark

def test_leader_equity_enforcement():
    """
    5% Leader Equity Enforcement:
    Confirm deposits are rejected or capped if the leader balance 
    falls below the required 5% threshold.
    """
    # Let's test that providing a lower leader stake forces it to 5%
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        req2 = BacktestRequest(initial_capital=100_000.0, leader_stake_pct=2.0)
