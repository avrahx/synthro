import React from "react";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

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
  <motion.div 
    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
    whileHover={{ scale: 1.02 }}
    transition={{ duration: 0.3, ease: "easeOut" }}
    className="glass rounded-xl p-5 relative overflow-hidden group hover:border-synthro-cyan/40 transition-colors duration-300 shadow-[0_0_15px_rgba(0,0,0,0.2)] hover:shadow-glow"
  >
    <div className="absolute top-0 right-0 -mt-6 -mr-6 w-28 h-28 bg-synthro-cyan/[0.03] rounded-full blur-2xl group-hover:bg-synthro-cyan/[0.1] transition-all" />

    <div className="flex items-center justify-between mb-3">
      <span className="text-[10px] font-mono font-semibold text-gray-500 uppercase tracking-wider">
        {label}
      </span>
      <div className="p-2 rounded-lg bg-synthro-bg border border-synthro-border text-synthro-cyan group-hover:bg-synthro-cyan/10 transition-colors">
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
            deltaType === "positive" ? "text-synthro-mint" :
            deltaType === "negative" ? "text-red-500" : "text-synthro-muted"
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
  </motion.div>
);

export const MetricCards: React.FC<{
  metrics: {
    label: string; value: string; sub?: string; delta?: string;
    deltaType?: "positive" | "negative" | "neutral";
    icon: LucideIcon; badge?: string;
  }[];
}> = ({ metrics }) => (
  <motion.div 
    initial="hidden"
    animate="visible"
    variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 gap-4"
  >
    {metrics.map((m) => (
      <MetricCard key={m.label} {...m} />
    ))}
  </motion.div>
);
