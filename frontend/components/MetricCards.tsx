import React from "react";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  delta?: string;
  deltaType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  badge?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label, value, sub, delta, deltaType = "positive", icon: Icon, badge,
}) => (
  <div className="glass rounded-xl p-5 relative overflow-hidden group hover:border-hl-cyan/30 transition-all duration-300">
    <div className="absolute top-0 right-0 -mt-6 -mr-6 w-28 h-28 bg-hl-cyan/[0.03] rounded-full blur-2xl group-hover:bg-hl-cyan/[0.07] transition-all" />

    <div className="flex items-center justify-between mb-3">
      <span className="text-[10px] font-mono font-semibold text-gray-500 uppercase tracking-wider">
        {label}
      </span>
      <div className="p-2 rounded-lg bg-bg-elevated border border-border-subtle text-hl-cyan group-hover:scale-110 transition-transform">
        <Icon className="w-4 h-4" />
      </div>
    </div>

    <div className="flex items-baseline gap-2">
      <span className="text-2xl font-mono font-black text-white tracking-tight">
        {value}
      </span>
      {sub && <span className="text-xs font-mono text-gray-500">{sub}</span>}
    </div>

    <div className="mt-3 flex items-center justify-between text-xs font-mono">
      {delta && (
        <span
          className={`font-semibold ${
            deltaType === "positive" ? "text-hl-green" :
            deltaType === "negative" ? "text-hl-rose" : "text-gray-400"
          }`}
        >
          {delta}
        </span>
      )}
      {badge && (
        <span className="px-2 py-0.5 rounded bg-bg-elevated border border-border-strong text-[10px] font-mono text-gray-400">
          {badge}
        </span>
      )}
    </div>
  </div>
);

export const MetricCards: React.FC<{
  metrics: {
    label: string; value: string; sub?: string; delta?: string;
    deltaType?: "positive" | "negative" | "neutral";
    icon: LucideIcon; badge?: string;
  }[];
}> = ({ metrics }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {metrics.map((m) => (
      <MetricCard key={m.label} {...m} />
    ))}
  </div>
);
