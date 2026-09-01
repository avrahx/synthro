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
)


class VaultModel:
    """
    Simulates a Hyperliquid User Vault with HWM-based performance fees
    and share-price accounting.
    """

    def __init__(self, request: BacktestRequest) -> None:
        self.req = request
        self.leader_stake_pct = request.leader_stake_pct / 100.0
        self.hwm_fee_pct = request.hwm_fee_pct / 100.0

        # Initial state
        total_capital = request.initial_capital
        self.leader_deposit = total_capital * self.leader_stake_pct
        self.lp_deposits = total_capital - self.leader_deposit

        # Share accounting
        self.total_shares = 1000.0  # initial share supply
        self.share_price = total_capital / self.total_shares
        self.high_water_mark = self.share_price
        self.accrued_fees = 0.0

        # Simulated depositors
        self.depositors = self._init_depositors(total_capital)

    def _init_depositors(self, total_capital: float) -> list[dict[str, Any]]:
        """Create a realistic depositor table."""
        leader_shares = self.leader_deposit / self.share_price
        lp_share_price = self.share_price

        depositors = [
            {
                "address": "0xLeader...vault",
                "deposit_usd": round(self.leader_deposit, 2),
                "shares": round(leader_shares, 4),
                "is_leader": True,
            },
        ]

        # Simulate 4 LP depositors with varying allocations
        lp_allocations = [0.35, 0.28, 0.22, 0.15]
        lp_addrs = [
            "0x7a3F...d4e2",
            "0x1bC9...8f3a",
            "0xd52E...1c7b",
            "0x4eA1...9d0f",
        ]
        for addr, pct in zip(lp_addrs, lp_allocations):
            dep = self.lp_deposits * pct
            shares = dep / lp_share_price
            depositors.append({
                "address": addr,
                "deposit_usd": round(dep, 2),
                "shares": round(shares, 4),
                "is_leader": False,
            })

        self.total_shares = sum(d["shares"] for d in depositors)
        return depositors

    def apply_epoch_pnl(self, epoch_nav: float) -> None:
        """
        Update vault state after each epoch's mark-to-market.
        Accrue HWM performance fee if share price exceeds the high water mark.
        """
        gross_share_price = epoch_nav / self.total_shares

        # HWM fee accrual
        if gross_share_price > self.high_water_mark:
            profit_per_share = gross_share_price - self.high_water_mark
            fee_per_share = profit_per_share * self.hwm_fee_pct
            self.accrued_fees += fee_per_share * self.total_shares
            self.share_price = gross_share_price - fee_per_share
            self.high_water_mark = gross_share_price
        else:
            self.share_price = gross_share_price

    def get_stats(
        self, equity_curve: list[EquitySnapshot],
    ) -> VaultStats:
        """Produce the current vault state snapshot."""
        last = equity_curve[-1] if equity_curve else None
        nav = last.nav if last else self.req.initial_capital

        # Final share price update
        self.apply_epoch_pnl(nav)

        depositor_models: list[VaultDepositor] = []
        for d in self.depositors:
            current_val = d["shares"] * self.share_price
            pnl = current_val - d["deposit_usd"]
            pnl_pct = (pnl / d["deposit_usd"]) * 100 if d["deposit_usd"] > 0 else 0.0
            depositor_models.append(VaultDepositor(
                address=d["address"],
                deposit_usd=d["deposit_usd"],
                shares=d["shares"],
                current_value_usd=round(current_val, 2),
                pnl_usd=round(pnl, 2),
                pnl_pct=round(pnl_pct, 2),
            ))

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
            total_depositors=len(self.depositors),
            depositors=depositor_models,
            inception_date=self.req.start_date,
            last_epoch=last.epoch if last else 0,
            last_updated=last.timestamp if last else datetime.utcnow().isoformat(),
        )
