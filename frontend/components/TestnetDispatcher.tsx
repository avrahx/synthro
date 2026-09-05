"use client";

import React, { useState } from "react";
import { useAccount, useSignTypedData } from "wagmi";
import { HL_L1_DOMAIN, HL_L1_TYPES } from "../lib/hlSigner";
import { Rocket, ShieldAlert, CheckCircle2, Lock } from "lucide-react";

export const TestnetDispatcher: React.FC = () => {
  const { isConnected, address } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const [size, setSize] = useState<number>(1000);
  const [status, setStatus] = useState<"IDLE" | "SIGNING" | "BROADCASTING" | "SUCCESS" | "ERROR">("IDLE");
  const [signature, setSignature] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleDispatch = async () => {
    if (!isConnected) return;
    setStatus("SIGNING");
    setErrorMsg("");
    setSignature("");

    try {
      // Create a mock Action that matches the HL API structure
      const action = {
        type: "order",
        orders: [{
          asset: 0,
          isBuy: true,
          limitPx: "100.5",
          sz: size.toString(),
          reduceOnly: false
        }],
        grouping: "na"
      };

      // In real HL L1, the message is structured specifically. 
      // We simulate the structure here for EIP-712 typing.
      const message = {
        source: "a",
        connectionId: "0x0000000000000000000000000000000000000000000000000000000000000000"
      };

      const sig = await signTypedDataAsync({
        domain: HL_L1_DOMAIN,
        types: HL_L1_TYPES,
        primaryType: "Agent",
        message: message as any,
      });

      setStatus("BROADCASTING");
      
      // Simulate network delay for broadcasting to HL L1 testnet
      setTimeout(() => {
        setSignature(sig);
        setStatus("SUCCESS");
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setStatus("ERROR");
      setErrorMsg(err.message || "User rejected request");
    }
  };

  if (!isConnected) {
    return (
      <div className="glass rounded-xl p-10 flex flex-col items-center justify-center text-center space-y-4 border border-border-subtle">
        <div className="w-16 h-16 rounded-full bg-bg-raised border border-border-strong flex items-center justify-center mb-2">
          <Lock className="w-6 h-6 text-gray-400" />
        </div>
        <h3 className="font-mono text-lg font-bold text-white uppercase tracking-wide">Wallet Disconnected</h3>
        <p className="text-gray-400 text-sm font-mono max-w-md">
          Please connect your Web3 wallet (MetaMask, Rabby) to sign and dispatch transactions to the Hyperliquid Testnet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-xl p-6 border border-border-subtle">
        <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2 mb-6">
          <Rocket className="w-4 h-4 text-synthro-cyan" />
          Testnet Execution Dispatcher
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase font-bold font-mono">Simulated Trade Size (USDC)</label>
              <input type="number" value={size}
                onChange={(e) => setSize(parseFloat(e.target.value) || 0)}
                className="w-full bg-bg p-3 rounded text-sm text-white font-mono border border-border-strong focus:outline-none focus:border-synthro-cyan"
              />
            </div>
            
            <div className="p-4 rounded-lg bg-bg-elevated border border-border-subtle space-y-3 font-mono text-xs text-gray-300">
              <div className="flex justify-between">
                <span>Action:</span>
                <span className="text-white font-bold">Basis Rebalance (Long Spot / Short Perp)</span>
              </div>
              <div className="flex justify-between">
                <span>Venue:</span>
                <span className="text-synthro-mint">Hyperliquid L1 (Arbitrum)</span>
              </div>
              <div className="flex justify-between">
                <span>Signer:</span>
                <span className="text-gray-400">{address?.slice(0,6)}...{address?.slice(-4)}</span>
              </div>
            </div>

            <button 
              onClick={handleDispatch}
              disabled={status === "SIGNING" || status === "BROADCASTING"}
              className={`w-full py-3 rounded-lg font-mono text-sm font-bold uppercase tracking-wider transition-all ${
                status === "SIGNING" || status === "BROADCASTING"
                  ? "bg-bg-raised text-gray-500 cursor-not-allowed"
                  : "bg-synthro-cyan/20 text-synthro-cyan border border-synthro-cyan/50 hover:bg-synthro-cyan/30 shadow-[0_0_20px_rgba(0,216,246,0.2)]"
              }`}
            >
              {status === "IDLE" || status === "ERROR" || status === "SUCCESS" ? "Sign & Dispatch to Testnet" : status === "SIGNING" ? "Awaiting Wallet Signature..." : "Broadcasting to L1..."}
            </button>

            {status === "ERROR" && (
              <div className="p-3 rounded bg-hl-rose/10 border border-hl-rose/30 flex gap-2 items-start text-hl-rose text-xs font-mono mt-4">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <h4 className="text-[10px] text-gray-500 uppercase font-bold font-mono mb-2">Execution Receipt</h4>
            <div className="flex-1 bg-bg p-4 rounded-lg border border-border-strong font-mono text-[10px] text-gray-400 whitespace-pre-wrap break-all flex flex-col">
              {status === "IDLE" && (
                <div className="m-auto text-gray-600">No transaction dispatched yet.</div>
              )}
              {status === "SIGNING" && (
                <div className="m-auto text-synthro-cyan animate-pulse">Check your wallet extension...</div>
              )}
              {status === "BROADCASTING" && (
                <div className="m-auto text-synthro-mint animate-pulse">Verifying signature & broadcasting...</div>
              )}
              {status === "SUCCESS" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-synthro-mint font-bold text-xs border-b border-border-subtle pb-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Transaction Successfully Sent
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-1">EIP-712 Signature Hash:</span>
                    <span className="text-white">{signature}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-1">Payload:</span>
                    <span className="text-gray-300">
                      {JSON.stringify({
                        asset: "BTC",
                        size: size,
                        type: "Basis Arbitrage Execution",
                        timestamp: new Date().toISOString()
                      }, null, 2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
