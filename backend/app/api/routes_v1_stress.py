"""
Synthro — /api/v1/stress-test

POST /api/v1/stress-test
  Computes liquidation thresholds, margin health factor, and required
  spot-unwind amounts under user-defined price shock scenarios.

  Also returns sweep arrays across price shocks and basis divergences
  for charting liquidation frontiers in the UI.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter

from app.models.schemas import (
    StressTestRequest,
    StressTestResponse,
    StressTestScenario,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["v1 — Risk Engine"])


# ── Core Stress Calculator ────────────────────────────────────────────────────

def _compute_scenario(
    capital: float,
    leverage: float,
    spot_shock: float,
    basis_bps: float,
    mm_req: float,
    funding_shock_pct: float,
    label: str,
) -> StressTestScenario:
    """
    Delta-neutral position: long spot + short perp.

    Notation:
      V₀ = initial capital
      L  = leverage ratio
      N  = notional per leg = V₀ × L

    After shock:
      V_spot   = N × (1 + spot_shock)
      PnL_perp = −N × (spot_shock + basis_bps / 10_000)
      Portfolio_NAV = V₀ + (V_spot − N) + PnL_perp
                    = V₀ − N × basis_bps / 10_000
      (delta cancels in the carry leg)

    Margin ratio = Portfolio_NAV / (2 × N)   (both legs combined)
    Liquidation  → margin_ratio < mm_req
    Margin call  → margin_ratio < mm_req × 1.5

    Required unwind = max(0, amount of spot to sell to restore margin_ratio = mm_req × 1.2)
    """
    notional = capital * leverage

    # New spot value (long leg)
    new_spot_notional = notional * (1.0 + spot_shock)

    # Perp PnL (short leg, gains when spot drops, loses when rises)
    perp_pnl = -notional * (spot_shock + basis_bps / 10_000.0)

    # Portfolio NAV after shock (spot gain/loss cancels perp loss/gain at delta=0)
    portfolio_nav = capital + (new_spot_notional - notional) + perp_pnl

    # Gross exposure after shock (both legs)
    gross_exposure = new_spot_notional + notional  # spot + perp notional unchanged

    # Margin ratio
    margin_ratio = portfolio_nav / gross_exposure if gross_exposure > 0 else 0.0

    # Health as % of maintenance margin
    margin_health_pct = (margin_ratio / mm_req * 100.0) if mm_req > 0 else 0.0

    # Distance to liquidation
    liq_nav = mm_req * gross_exposure
    dist_pct = ((portfolio_nav - liq_nav) / capital * 100.0) if capital > 0 else 0.0

    is_liquidated = margin_ratio < mm_req
    is_margin_call = (not is_liquidated) and (margin_ratio < mm_req * 1.5)

    # Required unwind: how much spot to sell to restore margin to safe level (mm_req × 1.2)
    target_margin = mm_req * 1.2
    required_unwind = 0.0
    if is_liquidated or is_margin_call:
        # If we reduce spot notional by X, portfolio_nav ≈ unchanged (instant),
        # gross_exposure reduces by X → we need:
        #   portfolio_nav / (gross_exposure − X) >= target_margin
        #   X = gross_exposure − portfolio_nav / target_margin
        required_unwind = max(
            0.0,
            gross_exposure - portfolio_nav / target_margin,
        )

    # 24h funding impact at shocked funding
    # funding_shock_pct is annualized change in %; convert to 24h
    daily_funding_change = funding_shock_pct / 100.0 / 365.0
    funding_impact_24h = notional * daily_funding_change

    return StressTestScenario(
        scenario_label=label,
        spot_price_shock_pct=round(spot_shock * 100.0, 2),
        basis_divergence_bps=round(basis_bps, 2),
        new_spot_notional=round(new_spot_notional, 2),
        perp_pnl=round(perp_pnl, 2),
        portfolio_nav=round(portfolio_nav, 2),
        margin_ratio=round(margin_ratio, 6),
        margin_health_pct=round(margin_health_pct, 2),
        distance_to_liquidation_pct=round(dist_pct, 2),
        required_unwind_usd=round(required_unwind, 2),
        is_liquidated=is_liquidated,
        is_margin_call=is_margin_call,
        funding_impact_24h_usd=round(funding_impact_24h, 2),
    )


# ── Route ─────────────────────────────────────────────────────────────────────

@router.post("/stress-test", response_model=StressTestResponse, summary="Black Swan Stress Test")
async def run_stress_test(request: StressTestRequest):
    """
    Simulates delta-neutral portfolio performance under extreme market shocks.

    Returns:
    - **primary_scenario**: exact result for the provided shock parameters
    - **price_shock_sweep**: 35 scenarios from -70% to +100% at fixed basis
    - **basis_sweep**: 21 scenarios from -500bps to +500bps at fixed price shock
    - **liquidation_threshold_pct**: spot shock % at which liquidation triggers
    - **max_safe_leverage**: maximum leverage where portfolio survives the shock

    Use the sweep arrays to render liquidation frontier charts in the UI.
    """
    cap = request.portfolio_capital
    lev = request.leverage_ratio
    basis = request.basis_divergence_bps
    shock = request.spot_price_shock_pct
    mm = request.maintenance_margin_req
    fund_shock = request.funding_rate_shock_pct

    # Primary scenario
    primary = _compute_scenario(cap, lev, shock, basis, mm, fund_shock, request.scenario_label)

    # Price shock sweep: -70% to +100% in 5% steps
    price_steps = [x / 100.0 for x in range(-70, 101, 5)]
    price_sweep = [
        _compute_scenario(cap, lev, s, basis, mm, fund_shock, f"{s*100:+.0f}% shock")
        for s in price_steps
    ]

    # Basis sweep: -500 to +500 bps in 50 bps steps
    basis_steps = list(range(-500, 501, 50))
    basis_sweep_list = [
        _compute_scenario(cap, lev, shock, b, mm, fund_shock, f"{b:+d}bps basis")
        for b in basis_steps
    ]

    # Compute liquidation threshold: the largest (most negative) shock still
    # above mm_req
    liq_threshold_pct = -70.0  # pessimistic default
    for scenario in price_sweep:
        if not scenario.is_liquidated:
            liq_threshold_pct = scenario.spot_price_shock_pct

    # Max safe leverage at the primary shock
    max_safe_lev = 1.0
    for test_lev in [x / 10.0 for x in range(10, 201)]:
        s = _compute_scenario(cap, test_lev, shock, basis, mm, 0.0, "lev_probe")
        if s.is_liquidated:
            break
        max_safe_lev = test_lev

    return StressTestResponse(
        request=request,
        primary_scenario=primary,
        price_shock_sweep=price_sweep,
        basis_sweep=basis_sweep_list,
        liquidation_threshold_pct=liq_threshold_pct,
        margin_call_threshold_pct=round(liq_threshold_pct + 5.0, 2),
        max_safe_leverage=round(max_safe_lev, 1),
    )
