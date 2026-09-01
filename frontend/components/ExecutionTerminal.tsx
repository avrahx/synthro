"use client";

import React, { useState } from "react";
import { executeRebalance, submitOrder } from "../lib/api";
import { Terminal, ShieldAlert, Activity, ChevronDown, ChevronRight, Zap } from "lucide-react";

export const ExecutionTerminal = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);

  const handleTestRebalance = async () => {
    setIsSimulating(true);
    try {
      const start = performance.now();
      const res = await executeRebalance({
        spot_asset: "BTC",
        perp_asset: "BTC",
        spot_sz: 0.1,
        perp_sz: 0.1,
        spot_px: 68000,
        perp_px: 68050
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

  const handleEmergencyFlatten = () => {
    if (confirm("Are you sure you want to cancel all orders and flatten delta?")) {
      alert("Emergency Flatten triggered (Mock).");
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
              <span className="text-hl-cyan">0x0000...0000</span>
              <span className="px-2 py-0.5 rounded bg-bg-raised text-[10px] text-gray-400 border border-border-subtle">
                SIMULATED (No PK)
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
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
