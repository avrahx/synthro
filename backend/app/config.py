"""
HyperVault Alpha — Application Configuration

Pydantic BaseSettings for Hyperliquid testnet/mainnet endpoints,
RPC URLs, API ports, and vault simulation parameters.
"""

from pydantic_settings import BaseSettings
from typing import Literal


class Settings(BaseSettings):
    # ── Application ──────────────────────────────────────────────────────
    APP_NAME: str = "HyperVault Alpha"
    APP_VERSION: str = "0.1.0"
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = True

    # ── Hyperliquid Network ──────────────────────────────────────────────
    HL_NETWORK: Literal["testnet", "mainnet"] = "testnet"
    HL_MAINNET_API: str = "https://api.hyperliquid.xyz"
    HL_TESTNET_API: str = "https://api.hyperliquid-testnet.xyz"
    
    # ── Agent Wallet Execution ───────────────────────────────────────────
    HYPERLIQUID_AGENT_PRIVATE_KEY: str | None = None
    HYPERLIQUID_MASTER_ADDRESS: str | None = None

    # ── CORS ─────────────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "*",
    ]

    # ── Vault Simulation Defaults ────────────────────────────────────────
    DEFAULT_VAULT_LEADER_STAKE_PCT: float = 5.0      # 5% leader contribution
    DEFAULT_VAULT_HWM_FEE_PCT: float = 10.0          # 10% HWM profit share
    DEFAULT_INITIAL_CAPITAL: float = 100_000.0
    DEFAULT_TAKER_FEE_BPS: float = 2.5               # Hyperliquid taker
    DEFAULT_MAKER_FEE_BPS: float = 0.2               # Hyperliquid maker (rebate-adjusted)

    # ── Strategy Parameters ──────────────────────────────────────────────
    DEFAULT_ENTRY_THRESHOLD_BPS: float = 6.0
    DEFAULT_EXIT_THRESHOLD_BPS: float = -1.0
    DEFAULT_REBALANCE_EPOCHS: int = 3                 # epochs before forced rebalance
    DEFAULT_MAX_LEVERAGE: float = 3.0

    @property
    def hl_api_url(self) -> str:
        return self.HL_MAINNET_API if self.HL_NETWORK == "mainnet" else self.HL_TESTNET_API

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
