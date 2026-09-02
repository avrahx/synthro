import React from "react";
import { Download, Printer } from "lucide-react";
import { exportBacktestJSON } from "../lib/export";
import { BacktestResponse } from "../lib/types";

interface Props {
  data: BacktestResponse | null;
}

export const ExportActions: React.FC<Props> = ({ data }) => {
  if (!data) return null;

  return (
    <div className="flex items-center gap-2 no-print">
      <button
        onClick={() => exportBacktestJSON(data)}
        title="Download raw simulation data"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-elevated border border-border-subtle text-xs font-mono text-gray-400 hover:text-synthro-cyan hover:border-synthro-cyan/50 transition-colors group"
      >
        <Download className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
        <span>Export JSON</span>
      </button>

      <button
        onClick={() => window.print()}
        title="Print institutional tear sheet"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-elevated border border-border-subtle text-xs font-mono text-gray-400 hover:text-white hover:border-border-strong transition-colors group"
      >
        <Printer className="w-3.5 h-3.5 group-hover:scale-105 transition-transform" />
        <span>Export PDF</span>
      </button>
    </div>
  );
};
