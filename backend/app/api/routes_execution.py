"""
HyperVault Alpha — Execution Routes

POST /api/execution/order -> Single L1 order
POST /api/execution/rebalance -> Atomic dual-leg rebalance
GET /api/execution/open-orders -> Fetch open orders
"""

from fastapi import APIRouter
from app.models.schemas import OrderRequest, OrderResponse, BasisTradeRequest, ExecutionStatus, CancelAllResponse, SystemStatusResponse
from app.engine.execution import ExecutionRouter
import os

router = APIRouter(prefix="/api/execution", tags=["Execution"])

router_engine = ExecutionRouter(
    agent_private_key=os.getenv("HYPERLIQUID_AGENT_PRIVATE_KEY"),
    master_address=os.getenv("HYPERLIQUID_MASTER_ADDRESS")
)

@router.post("/order", response_model=OrderResponse)
async def submit_order(req: OrderRequest):
    """
    Submits a signed order to Hyperliquid L1.
    """
    res = await router_engine.place_order(
        asset=req.asset,
        is_buy=req.is_buy,
        limit_px=req.limit_px,
        sz=req.sz,
        reduce_only=req.reduce_only
    )
    
    # Extract payload if in mock mode for frontend auditing
    payload = res.get("payload_logged", {})
    
    return OrderResponse(
        status="success" if res.get("status") == "filled" else "error",
        filled_sz=res.get("filled_sz", 0.0),
        avg_px=res.get("avg_px", 0.0),
        message="Order executed" if res.get("status") == "filled" else res.get("detail", "Error"),
        raw_payload=payload
    )

@router.post("/basis-trade", response_model=ExecutionStatus)
async def submit_basis_trade(req: BasisTradeRequest):
    """
    Triggers a sequential dual-leg spot/perp delta-neutral execution.
    """
    res = await router_engine.basis_trade(
        spot_asset=req.spot_asset,
        perp_asset=req.perp_asset,
        spot_sz=req.spot_sz,
        perp_sz=req.perp_sz,
        spot_px=req.spot_px,
        perp_px=req.perp_px,
        max_slippage_bps=req.max_slippage_bps
    )
    
    spot_res = res.get("spot_leg", {})
    perp_res = res.get("perp_leg", {})
    
    return ExecutionStatus(
        spot_status="filled" if isinstance(spot_res, dict) and spot_res.get("status") == "filled" else str(spot_res.get("status", "error")),
        perp_status="filled" if isinstance(perp_res, dict) and perp_res.get("status") == "filled" else str(perp_res.get("status", "error")),
        details=str(res),
        raw_payloads=[
            spot_res.get("payload_logged", {}) if isinstance(spot_res, dict) else {},
            perp_res.get("payload_logged", {}) if isinstance(perp_res, dict) else {}
        ]
    )

@router.post("/cancel-all", response_model=CancelAllResponse)
async def cancel_all():
    """Emergency kill switch canceling all active orders."""
    res = await router_engine.cancel_all()
    return CancelAllResponse(**res)

@router.get("/status", response_model=SystemStatusResponse)
async def get_system_status():
    """Return connection state, Agent Wallet, and active positions."""
    res = await router_engine.get_status()
    return SystemStatusResponse(**res)
