import pytest
from httpx import AsyncClient, ASGITransport
from app.engine.signer import HyperliquidSigner
from app.main import app

def test_eip712_serialization():
    """
    EIP-712 Serialization Test:
    Assert that generated typed data payloads for L1 orders match 
    Hyperliquid's Phantom Agent specification (Chain ID 1337).
    """
    # Fake private key and master address for testing
    signer = HyperliquidSigner(
        agent_private_key="0x0000000000000000000000000000000000000000000000000000000000000001",
        master_address="0xMasterAddress12345678901234567890123456"
    )
    
    assert signer.domain["chainId"] == 1337
    assert signer.domain["name"] == "Exchange"
    assert signer.domain["version"] == "1"
    
    # Generate an order payload
    payload = signer.sign_order(
        asset=4,
        is_buy=True,
        limit_px="65000.0",
        sz="0.1",
        reduce_only=False
    )
    
    # Assert standard Phantom Agent payload outer structure
    assert "action" in payload
    assert "nonce" in payload
    assert "signature" in payload
    assert payload["agent"] == signer.agent_address
    assert payload["master"] == "0xMasterAddress12345678901234567890123456"
    
    # Assert inner action structure matches Hyperliquid wire spec
    action = payload["action"]
    assert action["type"] == "order"
    assert len(action["orders"]) == 1
    
    order = action["orders"][0]
    assert order["a"] == 4
    assert order["b"] is True
    assert order["p"] == "65000.0"
    assert order["s"] == "0.1"
    assert order["r"] is False
    
@pytest.mark.asyncio
async def test_fastapi_endpoints():
    """
    FastAPI Endpoints Test:
    Test GET /api/market/funding, POST /api/backtest/run, and GET /api/execution/status 
    for 200 responses and valid Pydantic schema compliance.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Test Market Funding
        res_market = await client.get("/api/market/funding")
        assert res_market.status_code == 200
        data_market = res_market.json()
        assert "rates" in data_market
        assert isinstance(data_market["rates"], list)
        
        # Test Execution Status
        res_status = await client.get("/api/execution/status")
        assert res_status.status_code == 200
        data_status = res_status.json()
        assert "agent_wallet" in data_status
        assert "connection" in data_status
        assert isinstance(data_status["positions"], list)
        
        # Test Backtest Run
        payload = {
            "initial_capital": 10000.0,
            "assets": ["BTC", "ETH"],
            "rebalance_freq_hours": 1,
            "taker_fee_bps": 2.5,
            "slippage_bps": 2.0,
            "margin_borrow_apr": 0.05,
            "strategy_mode": "INTRA_HL_CASH_AND_CARRY"
        }
        res_backtest = await client.post("/api/backtest/run", json=payload)
        assert res_backtest.status_code == 200
        data_backtest = res_backtest.json()
        assert "summary" in data_backtest
        assert "equity_curve" in data_backtest
        assert len(data_backtest["equity_curve"]) > 0
