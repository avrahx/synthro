"use client";

import React, { useState, useEffect } from "react";
import { executeBasisTrade, cancelAllOrders, fetchSystemStatus } from "../lib/api";
import { Terminal, ShieldAlert, Activity, ChevronDown, ChevronRight, Zap, RefreshCw } from "lucide-react";
import { SystemStatusResponse } from "../lib/types";

export const ExecutionTerminal = () => {
  const [status, setStatus] = useState<SystemStatusResponse | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);

  const loadStatus = async () => {
    try {
      const res = await fetchSystemStatus();
      setStatus(res);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadStatus();
    const int = setInterval(loadStatus, 5000);
    return () => clearInterval(int);
  }, []);

  const handleTestRebalance = async () => {
    setIsSimulating(true);
    try {
      const start = performance.now();
      const res = await executeBasisTrade({
        spot_asset: "BTC",
        perp_asset: "BTC",
        spot_sz: 0.1,
        perp_sz: 0.1,
        spot_px: 68000,
        perp_px: 68050,
        max_slippage_bps: 5.0
      });
      const ms = (performance.now() - start).toFixed(0);
      
      setLogs(prev => [{
        id: Date.now(),
        type: "REBALANCE",
        time: new Date().toLocaleTimeString(),
        latency: ms,
        details: res
      }, ...prev]);
    } catch (e: any) {
      setLogs(prev => [{
        id: Date.now(),
        type: "ERROR",
        time: new Date().toLocaleTimeString(),
        details: e.message
      }, ...prev]);
    }
    setIsSimulating(false);
  };

  const handleEmergencyFlatten = async () => {
    if (confirm("Are you sure you want to cancel all orders and flatten delta?")) {
      try {
        const res = await cancelAllOrders();
        setLogs(prev => [{
          id: Date.now(),
          type: "EMERGENCY",
          time: new Date().toLocaleTimeString(),
          details: { raw_payloads: [{ action: { type: "cancelAll" }, response: res }] }
        }, ...prev]);
        loadStatus();
      } catch (e: any) {
        alert("Failed to cancel: " + e.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Status Bar */}
      <div className="glass rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 border-l-4 border-l-hl-cyan">
        <div className="flex items-center gap-4">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-hl-cyan opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-hl-cyan"></span>
          </div>
          <div>
            <div className="text-[10px] text-gray-500 font-mono uppercase">Agent Wallet Status</div>
            <div className="font-mono text-sm font-bold text-white flex items-center gap-2">
              <span className="text-hl-cyan">{status ? status.agent_wallet.slice(0, 8) + "..." : "Loading..."}</span>
              <span className="px-2 py-0.5 rounded bg-bg-raised text-[10px] text-gray-400 border border-border-subtle">
                {status ? status.connection : "..."}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={loadStatus}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-bg-raised hover:bg-bg-elevated text-gray-400 border border-border-subtle rounded-lg transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button 
            onClick={handleTestRebalance}
            disabled={isSimulating}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-hl-cyan/10 hover:bg-hl-cyan/20 text-hl-cyan border border-hl-cyan/30 rounded-lg font-mono text-xs font-bold transition-all"
          >
            <Zap className="w-4 h-4" />
            {isSimulating ? "EXECUTING..." : "TEST REBALANCE"}
          </button>
          <button 
            onClick={handleEmergencyFlatten}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-hl-rose/10 hover:bg-hl-rose/20 text-hl-rose border border-hl-rose/30 rounded-lg font-mono text-xs font-bold transition-all"
          >
            <ShieldAlert className="w-4 h-4" />
            FLATTEN
          </button>
        </div>
      </div>

      {/* Positions Table */}
      <div className="glass rounded-xl overflow-hidden border border-border-subtle flex flex-col">
        <div className="p-4 border-b border-border-subtle bg-bg-elevated/50 flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-400" />
          <h2 className="font-mono text-sm font-bold text-white">Active Positions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#0a0d14] text-gray-500 border-b border-border-subtle">
              <tr>
                <th className="px-4 py-3 font-normal">Asset</th>
                <th className="px-4 py-3 font-normal text-right">Net Delta</th>
                <th className="px-4 py-3 font-normal text-right">Spot Leg</th>
                <th className="px-4 py-3 font-normal text-right">Perp Leg</th>
                <th className="px-4 py-3 font-normal text-right">1h Funding PnL</th>
                <th className="px-4 py-3 font-normal text-right">Margin Buffer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {status?.positions.map((p, i) => (
                <tr key={i} className="hover:bg-bg-raised/50 transition-colors">
                  <td className="px-4 py-3 font-bold text-white">{p.asset}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={Math.abs(p.net_delta) < 0.01 ? "text-gray-400" : "text-hl-rose"}>
                      {p.net_delta.toFixed(4)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-hl-green">{p.spot_sz}</td>
                  <td className="px-4 py-3 text-right text-hl-rose">{p.perp_sz}</td>
                  <td className="px-4 py-3 text-right text-hl-cyan">+${p.funding_pnl.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-white">${p.margin_buffer.toFixed(2)}</td>
                </tr>
              ))}
              {(!status || status.positions.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No active positions found on this Agent Wallet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Execution Stream */}
      <div className="glass rounded-xl overflow-hidden border border-border-subtle flex flex-col">
        <div className="p-4 border-b border-border-subtle bg-bg-elevated/50 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-gray-400" />
          <h2 className="font-mono text-sm font-bold text-white">Live Execution Stream</h2>
        </div>
        
        <div className="min-h-[400px] max-h-[600px] overflow-y-auto p-4 space-y-3 bg-[#0a0d14]">
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 font-mono text-xs space-y-2 py-20">
              <Activity className="w-8 h-8 opacity-20" />
              <p>Waiting for execution events...</p>
            </div>
          ) : (
            logs.map((log, i) => (
              <div key={log.id} className="border border-border-subtle rounded-lg bg-bg overflow-hidden">
                {/* Log Header */}
                <div 
                  className="p-3 flex items-center justify-between cursor-pointer hover:bg-bg-raised transition-colors"
                  onClick={() => setExpandedLog(expandedLog === i ? null : i)}
                >
                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span className="text-gray-500 w-20">{log.time}</span>
                    <span className={`font-bold px-2 py-0.5 rounded ${log.type === 'ERROR' ? 'bg-hl-rose/20 text-hl-rose' : 'bg-hl-cyan/20 text-hl-cyan'}`}>
                      {log.type}
                    </span>
                    <span className="text-gray-300">Atomic Spot/Perp Rebalance</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {log.latency && (
                      <span className="font-mono text-[10px] text-gray-500 border border-border-subtle px-1.5 py-0.5 rounded">
                        {log.latency}ms
                      </span>
                    )}
                    {expandedLog === i ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                  </div>
                </div>
                
                {/* Log Details (EIP-712 Drawer) */}
                {expandedLog === i && log.details?.raw_payloads && (
                  <div className="p-4 border-t border-border-subtle bg-[#0c1017]">
                    <div className="flex items-center gap-2 mb-3">
                      <ShieldAlert className="w-3.5 h-3.5 text-hl-violet" />
                      <span className="font-mono text-xs text-hl-violet font-bold uppercase tracking-widest">EIP-712 Signature Payload Inspector</span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {log.details.raw_payloads.map((payload: any, pIdx: number) => (
                        <div key={pIdx} className="space-y-2">
                          <div className="font-mono text-[10px] text-gray-500">LEG {pIdx + 1}: {payload.action?.orders?.[0]?.a === 0 ? "BTC Perp" : "BTC Spot"}</div>
                          <pre className="p-3 rounded-lg bg-[#050608] border border-[#1e293b] overflow-x-auto text-[10px] text-gray-300 font-mono">
                            {JSON.stringify(payload, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};
