"""
HyperVault Alpha — Native Hyperliquid User Vault Model

Implements HL's vault semantics:
  • Leader must stake ≥5% of total deposits as first-loss capital
  • 10% performance fee above high-water mark (HWM)
  • Share-price accounting for depositor PnL attribution
  • Epoch-level HWM tracking and fee accrual
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from app.models.schemas import (
    BacktestRequest,
    EquitySnapshot,
    VaultStats,
    VaultDepositor,
    SharePriceHistory,
)


class HyperliquidVaultSimulator:
    """
    Simulates a Hyperliquid User Vault with HWM-based performance fees
    and share-price accounting.
    """

    def __init__(self, request: BacktestRequest) -> None:
        self.req = request
        self.leader_stake_pct = max(request.leader_stake_pct, 5.0) / 100.0
        self.hwm_fee_pct = request.hwm_fee_pct / 100.0

        # Initial state
        total_capital = request.initial_capital
        self.leader_deposit = total_capital * self.leader_stake_pct
        self.lp_deposits = total_capital - self.leader_deposit

        # Share accounting
        self.total_shares = total_capital  # 1 share = $1 initially
        self.share_price = 1.0
        self.high_water_mark = 1.0
        
        self.accrued_fees = 0.0
        self.share_history: list[SharePriceHistory] = []

        # Simulated depositors
        self.leader_shares = self.leader_deposit / self.share_price
        
        # Simulate LP depositors
        self.lp_depositors = []
        lp_allocations = [0.35, 0.28, 0.22, 0.15]
        lp_addrs = ["0x7a3F...d4e2", "0x1bC9...8f3a", "0xd52E...1c7b", "0x4eA1...9d0f"]
        for addr, pct in zip(lp_addrs, lp_allocations):
            dep = self.lp_deposits * pct
            shares = dep / self.share_price
            self.lp_depositors.append({
                "address": addr,
                "deposit_usd": dep,
                "shares": shares,
            })

    def apply_epoch_pnl(self, timestamp: str, epoch_nav: float) -> None:
        """
        Update vault state after each epoch's mark-to-market.
        Accrue HWM performance fee if share price exceeds the high water mark.
        """
        gross_share_price = epoch_nav / self.total_shares

        # HWM fee accrual
        if gross_share_price > self.high_water_mark:
            profit_per_share = gross_share_price - self.high_water_mark
            fee_per_share = profit_per_share * self.hwm_fee_pct
            
            # The fee is conceptually minted as shares to the leader
            total_fee_usd = fee_per_share * self.total_shares
            self.accrued_fees += total_fee_usd
            
            # Net share price
            self.share_price = gross_share_price - fee_per_share
            self.high_water_mark = self.share_price
            
            # Mint shares to leader for the fee
            minted_shares = total_fee_usd / self.share_price
            self.leader_shares += minted_shares
            self.total_shares += minted_shares
            
        else:
            self.share_price = gross_share_price

        self.share_history.append(SharePriceHistory(
            timestamp=timestamp,
            share_price=round(self.share_price, 6),
            hwm=round(self.high_water_mark, 6)
        ))

    def get_stats(self, equity_curve: list[EquitySnapshot]) -> VaultStats:
        """Produce the current vault state snapshot."""
        last = equity_curve[-1] if equity_curve else None
        nav = last.nav if last else self.req.initial_capital

        depositor_models: list[VaultDepositor] = []
        
        # Leader
        leader_val = self.leader_shares * self.share_price
        leader_pnl = leader_val - self.leader_deposit
        leader_pnl_pct = (leader_pnl / self.leader_deposit) * 100 if self.leader_deposit > 0 else 0.0
        
        depositor_models.append(VaultDepositor(
            address="0xLeader...vault",
            deposit_usd=round(self.leader_deposit, 2),
            shares=round(self.leader_shares, 4),
            current_value_usd=round(leader_val, 2),
            pnl_usd=round(leader_pnl, 2),
            pnl_pct=round(leader_pnl_pct, 2),
        ))
        
        # LPs
        total_lp_pnl = 0.0
        for d in self.lp_depositors:
            current_val = d["shares"] * self.share_price
            pnl = current_val - d["deposit_usd"]
            pnl_pct = (pnl / d["deposit_usd"]) * 100 if d["deposit_usd"] > 0 else 0.0
            total_lp_pnl += pnl
            
            depositor_models.append(VaultDepositor(
                address=d["address"],
                deposit_usd=round(d["deposit_usd"], 2),
                shares=round(d["shares"], 4),
                current_value_usd=round(current_val, 2),
                pnl_usd=round(pnl, 2),
                pnl_pct=round(pnl_pct, 2),
            ))

        # Fee drag calculation (annualized bps)
        epochs = len(equity_curve)
        years = max(epochs / 8760.0, 0.0001)
        fee_drag_bps = ((self.accrued_fees / self.req.initial_capital) / years) * 10000

        return VaultStats(
            vault_name="HyperVault Alpha",
            leader_address="0xLeader...vault",
            total_deposits_usd=round(self.req.initial_capital, 2),
            total_nav_usd=round(nav, 2),
            share_price=round(self.share_price, 6),
            high_water_mark=round(self.high_water_mark, 6),
            leader_stake_usd=round(self.leader_deposit, 2),
            leader_stake_pct=round(self.leader_stake_pct * 100, 1),
            hwm_fee_pct=round(self.hwm_fee_pct * 100, 1),
            accrued_performance_fee_usd=round(self.accrued_fees, 2),
            fee_drag_bps=round(fee_drag_bps, 2),
            leader_pnl=round(leader_pnl, 2),
            depositor_net_pnl=round(total_lp_pnl, 2),
            total_depositors=len(depositor_models),
            depositors=depositor_models,
            share_price_history=self.share_history,
            inception_date=self.req.start_date,
            last_epoch=last.epoch if last else 0,
            last_updated=last.timestamp if last else datetime.utcnow().isoformat(),
        )
