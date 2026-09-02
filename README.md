# HyperVault Alpha (Synthro)

An institutional-grade quantitative framework designed for Hyperliquid L1. Synthro implements delta-neutral basis arbitrage, continuous 1-hour funding harvesting, and native User Vault simulation using a sub-millisecond vectorized backtesting engine and a secure, non-custodial execution layer.

> **Live Demonstration:** [https://avrahx.github.io/synthro/](https://avrahx.github.io/synthro/)
> *The frontend terminal is deployed as a static export on GitHub Pages, utilizing client-side fallbacks to seamlessly showcase the quantitative data without a live Python backend.*

---

##  Architecture Overview

HyperVault Alpha is divided into three core subsystems:

### 1. The Quantitative Engine (`backend/app/engine/`)
Built with Polars for high-performance vectorized calculations, the engine simulates multi-asset basis and funding strategies.
- **Delta-Neutrality & Spread Z-Scoring:** Tracks the divergence between Hyperliquid perpetual 1-hour funding rates and simulated CEX 8-hour rates.
- **Cost Bridge & Execution Drag:** Accounts for turnover-based taker fees (e.g., 3.5 bps), execution slippage (e.g., 2.0 bps), and margin borrowing costs.
- **High-Water Mark (HWM):** Accurately models native Hyperliquid User Vault semantics, including the mandatory 5% leader stake and HWM-based 10% performance fees.

### 2. Live Market Data & Execution Layer (`backend/app/api/`)
A high-throughput FastAPI backend managing both ingestion and authenticated L1 execution.
- **Live Ingestion:** Streams L1 metadata to track 1-hour funding rates, Open Interest, and Mark Prices.
- **Sequential Execution Router:** Safely legs into basis trades (Spot Leg first, Perpetual Leg second) to prevent naked exposure. Uses explicit L1 circuit breakers and slippage thresholds.
- **EIP-712 Phantom Agent Signer:** Implements Hyperliquid’s Phantom Agent standard (Chain ID 1337). The execution layer never requires the master wallet's private key, utilizing scoped `Agent Wallets` to securely sign and dispatch msgpack-encoded action payloads gaslessly to the L1 sequencer.

### 3. Execution Terminal (`frontend/`)
A React (Next.js) + Tailwind dashboard providing institutional oversight over the autonomous systems.
- **Live Funding Matrix:** Visualizes the annualized yield differentials across perpetual assets.
- **Equity Curve Analytics:** Interactive Recharts plotting the strategy NAV against benchmark yield.
- **Live Position Management:** Polling architecture surfacing real-time positions with a global emergency kill switch.

---

##  Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js (v20+) & Python (3.12+)

### Development

**1. Boot the Backend (FastAPI)**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**2. Boot the Frontend (Next.js)**
```bash
cd frontend
npm install
npm run dev
```

### Production via Docker

A complete `docker-compose.yml` orchestrates the system.

```bash
docker-compose up --build -d
```
- **Backend API:** http://localhost:8000
- **Frontend UI:** http://localhost:3000

---

##  Testing and Verification

The system includes a comprehensive `pytest` suite ensuring quantitative accuracy and infrastructure stability.

```bash
cd backend
pytest tests/ -v
```

### Key Invariants Tested
- **Delta-Neutrality Invariant:** Ensures that spot price shocks do not result in mark-to-market PnL drag.
- **HWM Performance Fee:** Asserts that leader performance fees are only minted when the NAV per share exceeds the historical peak.
- **Phantom Agent Construction:** Validates Keccak256 action hashing and msgpack structure matching the official SDK.

---

##  Security Posture & Non-Custodial Architecture

Synthro is designed with institutional fund safety in mind:
1. **Agent Delegation:** The master private key should only be used once (externally) to authorize a session Agent Wallet. The backend `HYPERLIQUID_AGENT_PRIVATE_KEY` only possesses the right to sign L1 order actions.
2. **No Withdrawal Authority:** The execution system strictly lacks withdrawal or transfer signatures.
3. **Sequential Legging:** Spot purchases are aggressively verified via fill polling before short perpetuals are executed.

---
*Developed by the Synthro Quantitative Team.*
