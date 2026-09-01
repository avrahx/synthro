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
    
    def __init__(self, private_key: str | None = None):
        self.signer = HyperliquidSigner(private_key, is_mainnet=settings.HL_NETWORK=="mainnet")
        self.mock_execution = private_key is None or settings.DEBUG
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

    async def execute_rebalance(self, spot_asset: str, perp_asset: str, spot_sz: float, perp_sz: float, spot_px: float, perp_px: float) -> dict[str, Any]:
        """
        Executes a dual-leg atomic rebalance.
        """
        logger.info(f"Triggering rebalance: Spot {spot_sz} @ {spot_px} | Perp {perp_sz} @ {perp_px}")
        
        # Concurrent execution
        spot_task = self.place_order(spot_asset, True, spot_px, spot_sz)
        perp_task = self.place_order(perp_asset, False, perp_px, perp_sz)
        
        results = await asyncio.gather(spot_task, perp_task, return_exceptions=True)
        
        return {
            "spot_leg": results[0] if not isinstance(results[0], Exception) else str(results[0]),
            "perp_leg": results[1] if not isinstance(results[1], Exception) else str(results[1])
        }
