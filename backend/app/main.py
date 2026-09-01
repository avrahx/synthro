"""
HyperVault Alpha — FastAPI Application Entry Point

Configures CORS, lifespan events, and mounts all API route modules.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.routes_market import router as market_router
from app.api.routes_backtest import router as backtest_router
from app.api.routes_vault import router as vault_router
from app.engine.hl_client import HyperliquidClient

hl_client = HyperliquidClient()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle for async resources."""
    yield
    await hl_client.close()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Institutional-grade quantitative framework for Hyperliquid L1: "
        "intra-L1 basis arbitrage, 1-hour funding harvesting, and "
        "native User Vault simulation."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Route Modules ────────────────────────────────────────────────────────────
app.include_router(market_router)
app.include_router(backtest_router)
app.include_router(vault_router)


# ── Health Check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "network": settings.HL_NETWORK,
        "api_url": settings.hl_api_url,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG,
    )
