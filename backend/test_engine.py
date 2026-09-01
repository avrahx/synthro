import sys
from pathlib import Path
sys.path.append(str(Path("C:/Users/micha/.gemini/antigravity-ide/scratch/synthro/backend")))

import asyncio
from app.models.schemas import BacktestRequest
from app.engine.hl_client import HyperliquidClient
from app.engine.basis_engine import BasisBacktestEngine
from app.engine.vault_model import HyperliquidVaultSimulator
from app.engine.metrics import MetricsCalculator

async def run_test():
    req = BacktestRequest(
        assets=["BTC", "ETH", "SOL", "AVAX", "ARB"],
        start_date="2024-06-01",
        end_date="2024-07-01",
        initial_capital=100000,
        strategy_mode="CROSS_VENUE_DISLOCATION",
        vault_mode=True
    )
    
    print("Generating mock data...")
    client = HyperliquidClient()
    raw_data = client.generate_historical_series(
        assets=req.assets,
        start_date=req.start_date,
        end_date=req.end_date,
        interval_hours=1
    )
    
    print(f"Generated {len(raw_data)} rows. Running engine...")
    engine = BasisBacktestEngine(req)
    equity_curve, trades, attribution = engine.run(raw_data)
    print(f"Generated {len(equity_curve)} snapshots and {len(trades)} trades.")
    
    if req.vault_mode and equity_curve:
        print("Applying Vault mechanics...")
        vault = HyperliquidVaultSimulator(req)
        for snap in equity_curve:
            vault.apply_epoch_pnl(snap.timestamp, snap.nav)
        
        equity_curve[-1].nav -= vault.accrued_fees
        stats = vault.get_stats(equity_curve)
        print(f"Vault NAV: {stats.total_nav_usd}, Fee Drag BPS: {stats.fee_drag_bps}")

    print("Computing metrics...")
    summary = MetricsCalculator.compute(req, equity_curve, trades)
    print(summary.model_dump_json(indent=2))
    print("Test passed successfully.")

if __name__ == "__main__":
    asyncio.run(run_test())
