"use client";

import React, { useState, useEffect } from "react";
import { classifyRegime, RegimeInput, RegimeOutput } from "../lib/mlRegime";
import { BrainCircuit, Activity, Zap, BarChart2 } from "lucide-react";

export const RegimeInspector: React.FC = () => {
  const [input, setInput] = useState<RegimeInput>({
    volatility_annualized: 0.50,
    funding_rate_hourly: 0.0001,
  });
  
  const [isAuto, setIsAuto] = useState(false);

  // Auto live stream simulation (random walks the inputs)
  useEffect(() => {
    if (!isAuto) return;
    const interval = setInterval(() => {
      setInput(prev => ({
        volatility_annualized: Math.max(0.1, prev.volatility_annualized + (Math.random() - 0.5) * 0.1),
        funding_rate_hourly: prev.funding_rate_hourly + (Math.random() - 0.5) * 0.0001,
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, [isAuto]);

  const output: RegimeOutput = classifyRegime(input);

  const applyPreset = (vol: number, fund: number) => {
    setIsAuto(false);
    setInput({ volatility_annualized: vol, funding_rate_hourly: fund });
  };

  const activeColor = 
    output.activeRegime === "BULL_CARRY" ? "text-[#0df2a4]" :
    output.activeRegime === "CHOP_NEUTRAL" ? "text-[#00d8f6]" :
    "text-[#f43f5e]";

  const activeBg = 
    output.activeRegime === "BULL_CARRY" ? "bg-[#0df2a4]" :
    output.activeRegime === "CHOP_NEUTRAL" ? "bg-[#00d8f6]" :
    "bg-[#f43f5e]";

  return (
    <div className="space-y-6">
      {/* Header & Presets */}
      <div className="glass rounded-xl p-6 border border-border-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-[#00d8f6]" />
            Gaussian HMM Regime Classifier
          </h3>
          <p className="text-xs text-gray-400 font-mono mt-1 max-w-xl">
            Real-time inference engine evaluating rolling realized volatility and funding momentum to dynamically scale portfolio exposure via Kelly fractions.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => applyPreset(0.35, 0.0003)} 
            className="px-3 py-1.5 rounded bg-[#0df2a4]/10 text-[#0df2a4] border border-[#0df2a4]/30 font-mono text-xs font-bold hover:bg-[#0df2a4]/20 transition-colors"
          >
            Simulate Bull Expansion
          </button>
          <button 
            onClick={() => applyPreset(1.30, -0.0003)} 
            className="px-3 py-1.5 rounded bg-[#f43f5e]/10 text-[#f43f5e] border border-[#f43f5e]/30 font-mono text-xs font-bold hover:bg-[#f43f5e]/20 transition-colors"
          >
            Simulate Flash Shock
          </button>
          <button 
            onClick={() => setIsAuto(!isAuto)} 
            className={`px-3 py-1.5 rounded border font-mono text-xs font-bold transition-colors flex items-center gap-1 ${
              isAuto ? "bg-amber-400/20 text-amber-400 border-amber-400/50" : "bg-bg-elevated text-gray-400 border-border-subtle hover:text-white"
            }`}
          >
            <Zap className={`w-3 h-3 ${isAuto ? "animate-pulse" : ""}`} />
            Auto Live Stream
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* State Card */}
        <div className="lg:col-span-1 glass rounded-xl p-6 border border-border-subtle flex flex-col justify-between">
          <div>
            <div className="text-[10px] text-gray-500 font-mono font-bold uppercase tracking-wider mb-2">Active Market Regime</div>
            <div className={`text-2xl font-black tracking-tight font-mono ${activeColor}`}>
              {output.activeRegime.replace("_", " ")}
            </div>
          </div>
          
          <div className="mt-8">
            <div className="text-[10px] text-gray-500 font-mono font-bold uppercase tracking-wider mb-2">Model Confidence</div>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-mono font-bold ${activeColor}`}>
                {Math.max(output.pBull, output.pChop, output.pShock).toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 1 })}
              </span>
            </div>
          </div>
        </div>

        {/* Probability Distributions */}
        <div className="lg:col-span-1 glass rounded-xl p-6 border border-border-subtle">
          <div className="text-[10px] text-gray-500 font-mono font-bold uppercase tracking-wider mb-6 flex items-center gap-1">
            <BarChart2 className="w-3 h-3" /> State Probability Distribution
          </div>
          
          <div className="space-y-6 font-mono text-xs">
            <div className="space-y-2">
              <div className="flex justify-between text-gray-400">
                <span>State 0: BULL CARRY</span>
                <span className="text-white">{(output.pBull * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full h-1.5 bg-bg-elevated rounded overflow-hidden">
                <div className="h-full bg-[#0df2a4] transition-all duration-300" style={{ width: `${output.pBull * 100}%` }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-gray-400">
                <span>State 1: CHOP NEUTRAL</span>
                <span className="text-white">{(output.pChop * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full h-1.5 bg-bg-elevated rounded overflow-hidden">
                <div className="h-full bg-[#00d8f6] transition-all duration-300" style={{ width: `${output.pChop * 100}%` }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-gray-400">
                <span>State 2: VOLATILITY SHOCK</span>
                <span className="text-white">{(output.pShock * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full h-1.5 bg-bg-elevated rounded overflow-hidden">
                <div className="h-full bg-[#f43f5e] transition-all duration-300" style={{ width: `${output.pShock * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Sizing Gauge */}
        <div className="lg:col-span-1 glass rounded-xl p-6 border border-border-subtle flex flex-col justify-between">
          <div>
            <div className="text-[10px] text-gray-500 font-mono font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
              <Activity className="w-3 h-3" /> Target Volatility Sizing
            </div>
            
            <div className="mt-6 flex flex-col items-center justify-center">
              <div className="relative w-32 h-32 flex items-center justify-center">
                {/* Circular Gauge Background */}
                <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="56" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-bg-elevated" />
                  <circle 
                    cx="64" cy="64" r="56" fill="transparent" stroke="currentColor" strokeWidth="8" 
                    strokeDasharray={351.8} 
                    strokeDashoffset={351.8 - (351.8 * (output.sizingMultiplier / 1.5))} 
                    className={`${activeColor} transition-all duration-500`}
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className={`text-3xl font-black font-mono ${activeColor}`}>{output.sizingMultiplier.toFixed(2)}x</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-[10px] text-gray-400 font-mono text-center leading-relaxed">
            Effective Capital Exposure. <br/>
            Scaled dynamically via Kelly fraction based on HMM state posteriors. Bound: [0.0x, 1.5x].
          </div>
        </div>

      </div>

      {/* Manual Input Overrides (Only visible if not auto) */}
      {!isAuto && (
        <div className="glass rounded-xl p-4 border border-border-subtle flex items-center gap-8 font-mono text-xs">
          <div className="flex-1 space-y-1">
            <div className="flex justify-between text-gray-400 uppercase font-bold text-[10px]">
              <span>Realized Volatility (Annualized)</span>
              <span>{(input.volatility_annualized * 100).toFixed(1)}%</span>
            </div>
            <input type="range" min="0.1" max="2.0" step="0.05" value={input.volatility_annualized}
              onChange={(e) => setInput({ ...input, volatility_annualized: parseFloat(e.target.value) })}
              className="w-full h-1 bg-border-strong rounded-lg appearance-none cursor-pointer accent-[#00d8f6]"
            />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex justify-between text-gray-400 uppercase font-bold text-[10px]">
              <span>Funding Momentum (Hourly)</span>
              <span>{(input.funding_rate_hourly * 10000).toFixed(1)} bps/hr</span>
            </div>
            <input type="range" min="-0.0005" max="0.0005" step="0.00005" value={input.funding_rate_hourly}
              onChange={(e) => setInput({ ...input, funding_rate_hourly: parseFloat(e.target.value) })}
              className="w-full h-1 bg-border-strong rounded-lg appearance-none cursor-pointer accent-[#0df2a4]"
            />
          </div>
        </div>
      )}
    </div>
  );
};
