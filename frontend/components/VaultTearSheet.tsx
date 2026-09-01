"use client";

import React, { useEffect, useState } from "react";
import { VaultStats } from "../lib/types";
import { fetchVaultStats } from "../lib/api";
import { Shield, TrendingUp, Users, DollarSign, RefreshCw } from "lucide-react";

export const VaultTearSheet: React.FC = () => {
  const [vault, setVault] = useState<VaultStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setVault(await fetchVaultStats()); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading && !vault) {
    return (
      <div className="glass rounded-xl p-8 flex items-center justify-center">
        <RefreshCw className="w-5 h-5 text-hl-cyan animate-spin mr-2" />
        <span className="font-mono text-sm text-gray-400">Loading vault state...</span>
      </div>
    );
  }

  if (!vault) return null;

  const navDelta = vault.total_nav_usd - vault.total_deposits_usd;
  const navDeltaPct = (navDelta / vault.total_deposits_usd) * 100;

  return (
    <div className="space-y-4">
      {/* Vault Header Card */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between border-b border-border-subtle pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-hl-violet" />
            <h2 className="font-mono text-sm font-bold text-white uppercase tracking-wide">
              {vault.vault_name} — Tear Sheet
            </h2>
          </div>
          <button onClick={load} className="p-1.5 rounded-lg bg-bg-elevated border border-border-subtle text-gray-400 hover:text-white">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-hl-cyan" : ""}`} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-3 rounded-lg bg-bg-elevated border border-border-subtle">
            <div className="text-[10px] text-gray-500 uppercase">Total NAV</div>
            <div className="text-lg font-black text-white mt-1">
              ${vault.total_nav_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className={`text-xs font-semibold mt-1 ${navDelta >= 0 ? "text-hl-green" : "text-hl-rose"}`}>
              {navDelta >= 0 ? "+" : ""}{navDeltaPct.toFixed(2)}%
            </div>
          </div>
          <div className="p-3 rounded-lg bg-bg-elevated border border-border-subtle">
            <div className="text-[10px] text-gray-500 uppercase">Share Price</div>
            <div className="text-lg font-black text-hl-cyan mt-1">
              ${vault.share_price.toFixed(4)}
            </div>
            <div className="text-[10px] text-gray-500 mt-1">HWM: ${vault.high_water_mark.toFixed(4)}</div>
          </div>
          <div className="p-3 rounded-lg bg-bg-elevated border border-border-subtle">
            <div className="text-[10px] text-gray-500 uppercase">Performance Fee</div>
            <div className="text-lg font-black text-hl-amber mt-1">
              ${vault.accrued_performance_fee_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-gray-500 mt-1">{vault.hwm_fee_pct}% above HWM</div>
          </div>
          <div className="p-3 rounded-lg bg-bg-elevated border border-border-subtle">
            <div className="text-[10px] text-gray-500 uppercase">Leader Stake</div>
            <div className="text-lg font-black text-hl-violet mt-1">
              ${vault.leader_stake_usd.toLocaleString()}
            </div>
            <div className="text-[10px] text-gray-500 mt-1">{vault.leader_stake_pct}% first-loss</div>
          </div>
        </div>
      </div>

      {/* Depositor Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border-subtle flex items-center gap-2">
          <Users className="w-4 h-4 text-hl-cyan" />
          <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wide">
            Depositor Breakdown ({vault.total_depositors})
          </h3>
        </div>
        <table className="w-full text-left font-mono text-xs">
          <thead className="bg-bg-elevated/60 border-b border-border-subtle text-[10px] text-gray-500 uppercase">
            <tr>
              <th className="py-2.5 px-4">Address</th>
              <th className="py-2.5 px-4">Deposit</th>
              <th className="py-2.5 px-4">Shares</th>
              <th className="py-2.5 px-4">Current Value</th>
              <th className="py-2.5 px-4 text-right">PnL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/40">
            {vault.depositors.map((d) => (
              <tr key={d.address} className="hover:bg-bg-elevated/40 transition-colors">
                <td className="py-2.5 px-4 text-gray-300">{d.address}</td>
                <td className="py-2.5 px-4 text-gray-400">${d.deposit_usd.toLocaleString()}</td>
                <td className="py-2.5 px-4 text-gray-400">{d.shares.toFixed(2)}</td>
                <td className="py-2.5 px-4 text-white font-semibold">${d.current_value_usd.toLocaleString()}</td>
                <td className={`py-2.5 px-4 text-right font-bold ${d.pnl_usd >= 0 ? "text-hl-green" : "text-hl-rose"}`}>
                  {d.pnl_usd >= 0 ? "+" : ""}${d.pnl_usd.toLocaleString()} ({d.pnl_pct.toFixed(2)}%)
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
