<div align="center">

# SYNTHRO

### HyperVault Alpha Engine

**Institutional quantitative framework for Hyperliquid L1**
*Intra-L1 basis arbitrage · 1-hour funding harvesting · Native User Vault simulation*

[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![Hyperliquid](https://img.shields.io/badge/Hyperliquid-L1-6366F1)](https://hyperliquid.xyz)

</div>

---

## Architecture

```
synthro/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI entry, CORS, lifespan
│   │   ├── config.py                # Pydantic BaseSettings (HL testnet/mainnet)
│   │   ├── models/
│   │   │   └── schemas.py           # Pydantic v2 domain schemas
│   │   ├── engine/
│   │   │   ├── hl_client.py         # Hyperliquid Info API + mock generator
│   │   │   ├── basis_engine.py      # Polars vectorized basis & 1h funding engine
│   │   │   ├── vault_model.py       # HL User Vault (5% leader / 10% HWM fee)
│   │   │   └── metrics.py           # Sharpe, Sortino, Calmar, Max DD
│   │   └── api/
│   │       ├── routes_market.py     # GET  /api/market/funding
│   │       ├── routes_backtest.py   # POST /api/backtest/run
│   │       └── routes_vault.py      # GET  /api/vault/stats
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── app/
│   │   ├── layout.tsx               # Dark-themed root layout
│   │   ├── page.tsx                 # Dashboard: Live / Backtest / Vault tabs
│   │   └── globals.css              # Tailwind dark financial styling
│   ├── components/
│   │   ├── Navbar.tsx               # HL network badge + API status
│   │   ├── MetricCards.tsx          # KPI cards (Yield, Sharpe, DD, NAV)
│   │   ├── LiveFundingMatrix.tsx    # HL 1h vs CEX 8h real-time heatmap
│   │   ├── BacktestSandbox.tsx      # Interactive strategy parameters
│   │   ├── EquityChart.tsx          # NAV / Drawdown / Funding area charts
│   │   └── VaultTearSheet.tsx       # HWM tracker + depositor breakdown
│   ├── lib/
│   │   ├── api.ts                   # Typed backend client
│   │   └── types.ts                 # TypeScript ↔ Pydantic mirror types
│   ├── package.json
│   └── Dockerfile
└── docker-compose.yml
```

---

## Quantitative Methodology

### Hyperliquid-Native Advantages

| Feature | Hyperliquid L1 | Traditional CEXes |
|---|---|---|
| **Funding cadence** | **1-hour** settlement | 8-hour settlement |
| **Taker fee** | ~2.5 bps | ~4–6 bps |
| **Maker rebate** | ~0.2 bps | 0–2 bps |
| **Settlement** | On-chain atomic | Off-chain custodial |
| **Vault primitive** | Native L1 User Vaults | Third-party smart contracts |

### Strategy: Delta-Neutral Basis + Funding Harvest

1. **Hourly Basis Scan**: Evaluate intra-L1 basis spreads and predicted 1h funding rates per asset
2. **Entry**: Open delta-neutral position (long spot exposure + short perp) when basis exceeds entry threshold AND funding rate is positive
3. **Funding Accrual**: Settle 1-hour funding payments (short perp receives when rate > 0)
4. **Rebalance**: Correct delta drift every N epochs via maker-fee rebalance orders
5. **Exit**: Unwind when basis compresses below exit threshold, funding inverts, or max hold period reached

### User Vault Simulation

- **Leader Stake**: 5% minimum first-loss capital contribution
- **Performance Fee**: 10% of profits above High-Water Mark (HWM)
- **Share-Price Accounting**: Depositor PnL tracked via minted share tokens
- **HWM Reset**: Performance fee only accrues on new all-time-high NAV

---

## Quick Start

### Option 1: Docker Compose

```bash
docker compose up --build
```

- **Dashboard**: [http://localhost:3000](http://localhost:3000)
- **API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health**: [http://localhost:8000/health](http://localhost:8000/health)

### Option 2: Local Development

**Backend:**
```bash
cd backend
python -m venv .venv && .venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Service health + HL network status |
| `GET` | `/api/market/funding` | Live HL 1h vs CEX 8h funding comparison |
| `POST` | `/api/backtest/run` | Execute vectorized basis + funding backtest |
| `GET` | `/api/vault/stats` | Simulated vault NAV, share price, depositor PnL |

---

## License

MIT
