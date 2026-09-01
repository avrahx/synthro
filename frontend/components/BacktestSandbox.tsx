"use client";

import React, { useState } from "react";
import { BacktestRequest } from "../lib/types";
import { Play, RefreshCw, Settings2 } from "lucide-react";

const ASSETS = ["BTC", "ETH", "SOL", "AVAX", "ARB", "DOGE"];

interface Props {
  onRun: (req: BacktestRequest) => Promise<void>;
  isRunning: boolean;
}

export const BacktestSandbox: React.FC<Props> = ({ onRun, isRunning }) => {
  const [params, setParams] = useState<BacktestRequest>({
    assets: ["BTC", "ETH", "SOL", "AVAX"],
    start_date: "2024-06-01",
    end_date: "2025-01-01",
    initial_capital: 100000,
    taker_fee_bps: 2.5,
    maker_fee_bps: 0.2,
    slippage_bps: 1.0,
    entry_threshold_bps: 6.0,
    exit_threshold_bps: -1.0,
    max_leverage: 3.0,
    rebalance_epochs: 3,
    vault_mode: true,
    leader_stake_pct: 5.0,
    hwm_fee_pct: 10.0,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const toggle = (a: string) => {
    const cur = params.assets;
    setParams({
      ...params,
      assets: cur.includes(a) ? (cur.length > 1 ? cur.filter((x) => x !== a) : cur) : [...cur, a],
    });
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onRun(params); }} className="glass rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between border-b border-border-subtle pb-3">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-hl-cyan" />
          <h2 className="font-mono text-sm font-bold text-white uppercase tracking-wide">
            Backtest Parameters
          </h2>
        </div>
        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs font-mono text-gray-400 hover:text-hl-cyan transition-colors">
          {showAdvanced ? "[− Hide Advanced]" : "[+ Advanced]"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
        <div className="space-y-1.5">
          <label className="text-gray-500 uppercase text-[10px]">HL Perp Universe</label>
          <div className="flex flex-wrap gap-1.5">
            {ASSETS.map((a) => (
              <button key={a} type="button" onClick={() => toggle(a)}
                className={`px-3 py-1.5 rounded-lg border text-xs transition-all ${
                  params.assets.includes(a) ? "bg-hl-cyan/15 text-hl-cyan border-hl-cyan/40 font-bold" : "bg-bg-elevated text-gray-500 border-border-subtle hover:border-gray-600"
                }`}
              >{a}</button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-gray-500 uppercase text-[10px]">Historical Window</label>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={params.start_date} onChange={(e) => setParams({ ...params, start_date: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg bg-bg-elevated border border-border-subtle text-gray-200 text-xs font-mono focus:outline-none focus:border-hl-cyan" />
            <input type="date" value={params.end_date} onChange={(e) => setParams({ ...params, end_date: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg bg-bg-elevated border border-border-subtle text-gray-200 text-xs font-mono focus:outline-none focus:border-hl-cyan" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-gray-500 uppercase text-[10px]">Initial Capital (USD)</label>
          <input type="number" value={params.initial_capital}
            onChange={(e) => setParams({ ...params, initial_capital: +e.target.value || 0 })}
            className="w-full px-3 py-1.5 rounded-lg bg-bg-elevated border border-border-subtle text-white font-bold font-mono text-xs focus:outline-none focus:border-hl-cyan" />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-gray-500 uppercase">
            <span>Max Leverage</span>
            <span className="text-hl-cyan font-bold">{params.max_leverage}x</span>
          </div>
          <input type="range" min="1" max="10" step="0.5" value={params.max_leverage}
            onChange={(e) => setParams({ ...params, max_leverage: +e.target.value })}
            className="w-full accent-[#22D3EE] cursor-pointer" />
        </div>
      </div>

      {showAdvanced && (
        <div className="p-4 rounded-lg bg-bg-elevated/50 border border-border-subtle grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
          {([
            ["Taker Fee (BPS)", "taker_fee_bps", 0.5],
            ["Maker Fee (BPS)", "maker_fee_bps", 0.1],
            ["Slippage (BPS)", "slippage_bps", 0.5],
            ["Entry Thresh (BPS)", "entry_threshold_bps", 1],
            ["Exit Thresh (BPS)", "exit_threshold_bps", 1],
            ["Rebalance Epochs", "rebalance_epochs", 1],
          ] as [string, keyof BacktestRequest, number][]).map(([lbl, key, step]) => (
            <div key={key}>
              <label className="text-[10px] text-gray-500 uppercase block mb-1">{lbl}</label>
              <input type="number" step={step} value={params[key] as number}
                onChange={(e) => setParams({ ...params, [key]: +e.target.value || 0 })}
                className="w-full px-2 py-1 rounded bg-bg border border-border-subtle text-gray-200 font-mono text-xs" />
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={params.vault_mode}
            onChange={(e) => setParams({ ...params, vault_mode: e.target.checked })}
            className="accent-[#22D3EE] w-4 h-4 rounded" />
          <span className="text-xs font-mono text-gray-300">Simulate as HL User Vault (5% leader / 10% HWM)</span>
        </label>

        <button type="submit" disabled={isRunning}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-hl-cyan via-hl-blue to-hl-violet text-white font-mono font-bold text-xs uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all shadow-glow disabled:opacity-50 cursor-pointer">
          {isRunning ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /><span>Simulating...</span></>
          ) : (
            <><Play className="w-4 h-4 fill-white" /><span>Run Backtest</span></>
          )}
        </button>
      </div>
    </form>
  );
};
