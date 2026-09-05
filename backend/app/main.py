"""
Synthro — FastAPI Application Entry Point

Configures CORS, lifespan events, and mounts all API route modules.
OpenAPI docs available at /docs (Swagger) and /redoc.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.routes_market import router as market_router
from app.api.routes_backtest import router as backtest_router
from app.api.routes_vault import router as vault_router
from app.api.routes_execution import router as execution_router
# ── v1 production routes ──────────────────────────────────────────────────────
from app.api.routes_v1_market import router as v1_market_router
from app.api.routes_v1_backtest import router as v1_backtest_router
from app.api.routes_v1_stress import router as v1_stress_router
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
        "**Synthro HyperVault Alpha** — Institutional quantitative framework for Hyperliquid L1.\n\n"
        "- `GET  /api/v1/live-funding` — Real-time funding rates + L2 slippage matrix\n"
        "- `POST /api/v1/backtest`     — Polars-native vectorized basis + funding backtest\n"
        "- `POST /api/v1/stress-test`  — Black Swan margin & liquidation simulator\n\n"
        "Legacy v0 routes (`/api/market`, `/api/backtest`, `/api/vault`) remain active."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── v1 Routes (production) ────────────────────────────────────────────────────
app.include_router(v1_market_router)
app.include_router(v1_backtest_router)
app.include_router(v1_stress_router)

# ── Legacy Routes ─────────────────────────────────────────────────────────────
app.include_router(market_router)
app.include_router(backtest_router)
app.include_router(vault_router)
app.include_router(execution_router)


# ── Health Check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "network": settings.HL_NETWORK,
        "api_url": settings.hl_api_url,
        "endpoints": {
            "live_funding": "/api/v1/live-funding",
            "backtest": "/api/v1/backtest",
            "stress_test": "/api/v1/stress-test",
            "docs": "/docs",
        },
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG,
    )
