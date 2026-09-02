"use client";

import React, { useState, useMemo } from "react";
import { Shield, TrendingUp, DollarSign, Activity, ChevronRight, Calculator } from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const VaultTearSheet: React.FC = () => {
  const [leaderStake, setLeaderStake] = useState<number>(50000);
  const [depositorInflow, setDepositorInflow] = useState<number>(250000);
  const [performanceFee, setPerformanceFee] = useState<number>(10.0);
  const [holdingDays, setHoldingDays] = useState<number>(180);
  const [myInvestment, setMyInvestment] = useState<number>(10000);

  const { data, finalNetNav, finalGrossNav, totalCarry, currentHwm } = useMemo(() => {
    let hwm = 1.0;
    let totalCarryAcc = 0;
    const simData = [];

    for (let i = 0; i <= holdingDays; i++) {
      const t = i / 365;
      // Simulated trajectory: 40% annualized drift + a sine wave drawdown
      const grossNav = 1.0 + (t * 0.40) + (Math.sin(t * Math.PI * 4) * 0.08);
      
      let netNav = grossNav;
      if (grossNav > hwm) {
        const profit = grossNav - hwm;
        const fee = profit * (performanceFee / 100);
        netNav = grossNav - fee;
        totalCarryAcc += fee * depositorInflow; 
        hwm = grossNav; 
      }

      simData.push({
        day: i,
        grossNav,
        netNav,
        hwmLine: hwm,
        feeRange: [netNav, grossNav],
      });
    }

    const last = simData[simData.length - 1];
    return {
      data: simData,
      finalNetNav: last.netNav,
      finalGrossNav: last.grossNav,
      totalCarry: totalCarryAcc,
      currentHwm: last.hwmLine,
    };
  }, [leaderStake, depositorInflow, performanceFee, holdingDays]);

  const totalPool = leaderStake + depositorInflow;
  const leaderPct = (leaderStake / totalPool) * 100;
  const isValidLeaderStake = leaderPct >= 5.0;

  // Sandbox calculations
  const myGrossYield = myInvestment * (finalGrossNav - 1.0);
  const myNetYield = myInvestment * (finalNetNav - 1.0);
  const myFeePaid = myGrossYield - myNetYield;
  const myNetPayout = myInvestment + myNetYield;
  const myApy = ((myNetPayout / myInvestment) ** (365 / holdingDays) - 1) * 100;

  return (
    <div className="space-y-6">
      {/* 1. Interactive Controls */}
      <div className="glass rounded-xl p-5 border border-synthro-border bg-synthro-card">
        <div className="flex items-center gap-2 mb-6 border-b border-synthro-border pb-4">
          <Calculator className="w-5 h-5 text-synthro-cyan" />
          <h2 className="font-mono text-sm font-bold text-white uppercase tracking-wide">
            Vault Mechanics Simulator
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 font-mono text-xs">
          <div className="space-y-2">
            <label className="text-synthro-muted uppercase font-semibold">Leader Stake (USDC)</label>
            <input 
              type="number" 
              value={leaderStake} 
              onChange={(e) => setLeaderStake(Number(e.target.value))}
              className="w-full bg-synthro-bg border border-synthro-border rounded p-2 text-white focus:outline-none focus:border-synthro-cyan"
            />
          </div>
          <div className="space-y-2">
            <label className="text-synthro-muted uppercase font-semibold">Depositor Inflow (USDC)</label>
            <input 
              type="number" 
              value={depositorInflow} 
              onChange={(e) => setDepositorInflow(Number(e.target.value))}
              className="w-full bg-synthro-bg border border-synthro-border rounded p-2 text-white focus:outline-none focus:border-synthro-cyan"
            />
          </div>
          <div className="space-y-2">
            <label className="text-synthro-muted uppercase font-semibold">Performance Fee (%)</label>
            <input 
              type="number" 
              min="0" max="50" step="0.1"
              value={performanceFee} 
              onChange={(e) => setPerformanceFee(Number(e.target.value))}
              className="w-full bg-synthro-bg border border-synthro-border rounded p-2 text-white focus:outline-none focus:border-synthro-cyan"
            />
          </div>
          <div className="space-y-2">
            <label className="text-synthro-muted uppercase font-semibold">Holding Period (Days)</label>
            <input 
              type="range" 
              min="30" max="365" 
              value={holdingDays} 
              onChange={(e) => setHoldingDays(Number(e.target.value))}
              className="w-full accent-synthro-cyan mt-2"
            />
            <div className="text-right text-synthro-cyan">{holdingDays} Days</div>
          </div>
        </div>
      </div>

      {/* 2. Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-5 border border-synthro-border bg-synthro-card space-y-2">
          <div className="flex items-center justify-between text-synthro-muted text-[10px] uppercase font-bold">
            <span>Current NAV / Share</span>
            <TrendingUp className="w-4 h-4 text-synthro-mint" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            ${finalNetNav.toFixed(4)}
          </div>
          <div className="text-xs font-mono text-synthro-mint">
            +{((finalNetNav - 1) * 100).toFixed(2)}% Net Return
          </div>
        </div>

        <div className="glass rounded-xl p-5 border border-synthro-border bg-synthro-card space-y-2">
          <div className="flex items-center justify-between text-synthro-muted text-[10px] uppercase font-bold">
            <span>Vault TVL & Capacity</span>
            <Shield className={`w-4 h-4 ${isValidLeaderStake ? "text-synthro-cyan" : "text-red-500"}`} />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            ${totalPool.toLocaleString()}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-synthro-muted">
              <span>Leader: {leaderPct.toFixed(1)}%</span>
              <span>Min: 5%</span>
            </div>
            <div className="w-full h-1.5 bg-synthro-bg rounded-full overflow-hidden">
              <div 
                className={`h-full ${isValidLeaderStake ? "bg-synthro-cyan" : "bg-red-500"}`}
                style={{ width: `${Math.min(leaderPct, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-5 border border-synthro-border bg-synthro-card space-y-2">
          <div className="flex items-center justify-between text-synthro-muted text-[10px] uppercase font-bold">
            <span>High-Water Mark (HWM)</span>
            <Activity className="w-4 h-4 text-synthro-mint" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            ${currentHwm.toFixed(4)}
          </div>
          <div className={`text-[10px] font-mono px-2 py-1 inline-block rounded-md ${finalGrossNav >= currentHwm ? "bg-synthro-mint/10 text-synthro-mint border border-synthro-mint/30" : "bg-slate-400/10 text-slate-400 border border-slate-400/30"}`}>
            {finalGrossNav >= currentHwm ? "Above HWM - Fee Accruing" : "In Drawdown - Zero Fee"}
          </div>
        </div>

        <div className="glass rounded-xl p-5 border border-synthro-border bg-synthro-card space-y-2">
          <div className="flex items-center justify-between text-synthro-muted text-[10px] uppercase font-bold">
            <span>Leader Carry Earned</span>
            <DollarSign className="w-4 h-4 text-hl-amber" />
          </div>
          <div className="text-2xl font-black text-hl-amber font-mono">
            ${totalCarry.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs font-mono text-synthro-muted">
            100% Client-Side Simulation
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3. Dual-Series Vault Chart */}
        <div className="lg:col-span-2 glass rounded-xl p-5 border border-synthro-border bg-synthro-card">
          <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wide mb-6 border-b border-synthro-border pb-4">
            Vault Performance Trajectory
          </h3>
          <div className="h-[300px] w-full font-mono text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c283d" vertical={false} />
                <XAxis dataKey="day" stroke="#64748b" tickFormatter={(d) => `Day ${d}`} />
                <YAxis domain={['dataMin - 0.05', 'dataMax + 0.05']} stroke="#64748b" tickFormatter={(v) => `$${v.toFixed(2)}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0d131f', borderColor: '#1c283d', color: '#fff' }}
                  itemStyle={{ color: '#0df2a4' }}
                  labelFormatter={(v) => `Day ${v}`}
                  formatter={(value: any, name: string) => {
                    if (name === "feeRange") return null;
                    return [`$${Number(value).toFixed(4)}`, name === 'grossNav' ? 'Gross Index' : name === 'netNav' ? 'Net Share Price' : 'HWM Ceiling'];
                  }}
                />
                
                {/* Fee Shaded Area */}
                <Area 
                  type="monotone" 
                  dataKey="feeRange" 
                  stroke="none" 
                  fill="#0df2a4" 
                  fillOpacity={0.15} 
                  activeDot={false}
                />
                
                {/* HWM Line (Dotted Slate) */}
                <Line type="stepAfter" dataKey="hwmLine" stroke="#64748b" strokeWidth={2} strokeDasharray="2 4" dot={false} activeDot={false} />
                
                {/* Gross Line (Dashed Cyan) */}
                <Line type="monotone" dataKey="grossNav" stroke="#00d8f6" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                
                {/* Net Line (Solid Mint) */}
                <Line type="monotone" dataKey="netNav" stroke="#0df2a4" strokeWidth={3} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-6 mt-4 justify-center font-mono text-[10px] uppercase">
             <div className="flex items-center gap-2"><div className="w-3 h-1 bg-synthro-mint rounded" /> Net Share Price</div>
             <div className="flex items-center gap-2"><div className="w-3 h-0 border-t-2 border-dashed border-synthro-cyan" /> Gross Index</div>
             <div className="flex items-center gap-2"><div className="w-3 h-0 border-t-2 border-dotted border-synthro-muted" /> High-Water Mark</div>
             <div className="flex items-center gap-2"><div className="w-3 h-3 bg-synthro-mint/20 rounded" /> Performance Fees</div>
          </div>
        </div>

        {/* 4. Interactive Depositor Sandbox */}
        <div className="glass rounded-xl p-5 border border-synthro-border bg-synthro-card flex flex-col">
          <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wide mb-6 border-b border-synthro-border pb-4">
            Simulate My Investment
          </h3>
          
          <div className="space-y-4 font-mono text-xs flex-grow">
            <div className="space-y-2">
              <label className="text-synthro-muted uppercase font-semibold">Your Deposit (USDC)</label>
              <input 
                type="number" 
                value={myInvestment} 
                onChange={(e) => setMyInvestment(Number(e.target.value))}
                className="w-full bg-synthro-bg border border-synthro-cyan/40 shadow-[0_0_10px_rgba(0,216,246,0.1)] rounded p-3 text-lg font-bold text-synthro-cyan focus:outline-none focus:border-synthro-cyan"
              />
            </div>

            <div className="space-y-3 mt-6 p-4 rounded-lg bg-synthro-bg border border-synthro-border">
              <div className="flex justify-between items-center text-gray-300">
                <span>Gross Yield Earned</span>
                <span className="text-white">${myGrossYield.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between items-center text-hl-amber">
                <span>Performance Fee Paid</span>
                <span>-${myFeePaid.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
              <div className="w-full h-px bg-synthro-border" />
              <div className="flex justify-between items-center text-synthro-mint font-bold text-sm">
                <span>Net USDC Payout</span>
                <span>${myNetPayout.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-synthro-glow bg-synthro-mint/5 mt-4 flex items-center justify-between">
               <span className="uppercase text-synthro-mint font-bold">Realized Net APY</span>
               <span className="text-xl font-black text-synthro-mint text-synthro-gradient">{myApy.toFixed(1)}%</span>
            </div>
          </div>
          
          <button className="w-full py-3 mt-6 rounded bg-synthro-cyan text-black font-mono font-bold uppercase hover:bg-synthro-mint transition-colors flex items-center justify-center gap-2">
            Deposit Simulation <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
