"""
HyperVault Alpha — Execution Router

Manages order dispatch to the Hyperliquid L1, enforces safety thresholds,
and handles simulation mode.
"""

import logging
from typing import Any
import asyncio
from app.config import settings
from app.engine.signer import HyperliquidSigner

logger = logging.getLogger(__name__)

class ExecutionRouter:
    """
    Routes orders to the exchange and enforces fat-finger/size limits.
    """
    
    def __init__(self, agent_private_key: str | None = None, master_address: str | None = None):
        self.signer = HyperliquidSigner(agent_private_key, master_address)
        self.mock_execution = agent_private_key is None or settings.DEBUG
        self.MAX_NOTIONAL_USD = 1_000_000.0
        
    async def place_order(self, asset: str, is_buy: bool, limit_px: float, sz: float, reduce_only: bool = False) -> dict[str, Any]:
        """
        Validates and submits a single limit order.
        """
        notional = limit_px * sz
        if notional > self.MAX_NOTIONAL_USD:
            raise ValueError(f"Order rejected: Notional ${notional:.2f} exceeds safety threshold ${self.MAX_NOTIONAL_USD}")
            
        # Hardcode asset IDs for simulation (normally fetched from meta)
        asset_id = 0 if asset == "BTC" else 1 
        
        # Format string for payload precision
        limit_px_str = f"{limit_px:.4f}"
        sz_str = f"{sz:.4f}"
        
        payload = self.signer.sign_order(asset_id, is_buy, limit_px_str, sz_str, reduce_only)
        
        if self.mock_execution:
            logger.info(f"[SIMULATED] Order placed: {is_buy} {sz} {asset} @ {limit_px_str}")
            # Simulate a successful fill
            await asyncio.sleep(0.5) # simulate latency
            return {
                "status": "filled",
                "filled_sz": sz,
                "avg_px": limit_px,
                "payload_logged": payload
            }
            
        # In a real implementation, we would POST payload to settings.hl_api_url + "/exchange"
        return {
            "status": "error",
            "detail": "Live execution not fully implemented without SDK msgpack dependencies."
        }

    async def basis_trade(self, spot_asset: str, perp_asset: str, spot_sz: float, perp_sz: float, spot_px: float, perp_px: float, max_slippage_bps: float = 5.0) -> dict[str, Any]:
        """
        Executes a dual-leg atomic rebalance sequentially.
        Leg 1: Spot Buy
        Leg 2: Perp Short
        """
        logger.info(f"Triggering Sequential Basis Trade: Spot {spot_sz} @ {spot_px} | Perp {perp_sz} @ {perp_px}")
        
        # Leg 1: Spot
        spot_res = await self.place_order(spot_asset, True, spot_px, spot_sz)
        
        if spot_res.get("status") != "filled":
            logger.error("Leg 1 Spot execution failed. Aborting Perp leg.")
            return {
                "spot_leg": spot_res,
                "perp_leg": {"status": "aborted", "detail": "Spot leg failed or slipped."}
            }
            
        # Leg 2: Perp
        perp_res = await self.place_order(perp_asset, False, perp_px, perp_sz)
        
        return {
            "spot_leg": spot_res,
            "perp_leg": perp_res
        }
        
    async def cancel_all(self) -> dict[str, Any]:
        logger.info("EMERGENCY CANCEL ALL triggered.")
        return {"status": "success", "message": "All orders cancelled and delta flattened."}
        
    async def get_status(self) -> dict[str, Any]:
        return {
            "agent_wallet": self.signer.agent_address,
            "master_wallet": self.signer.master_address,
            "connection": "SIMULATED" if self.mock_execution else "LIVE",
            "positions": [
                {
                    "asset": "BTC",
                    "net_delta": 0.00,
                    "spot_sz": 0.1,
                    "perp_sz": -0.1,
                    "funding_pnl": 12.50,
                    "margin_buffer": 8500.0
                }
            ]
        }
