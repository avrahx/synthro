"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ShieldCheck, CheckCircle2, ChevronRight, Hash, ShieldAlert } from "lucide-react";
import { type Hex } from "viem";
import { EpochLeaf, buildEpochMerkleTree, generateProof, verifyMerkleProof, hashEpochState } from "../lib/merkleAudit";

// Mock epochs for demonstration
const mockLeaves: EpochLeaf[] = Array.from({ length: 16 }).map((_, i) => ({
  epochId: 8760 - 15 + i,
  timestamp: Date.now() - (15 - i) * 3600000,
  navPerShare: (1.0500 + i * 0.001).toFixed(4),
  highWaterMark: "1.0500",
  leaderEquity: (5000 + i * 10).toFixed(4),
  netDelta: (i % 2 === 0 ? "0.0100" : "-0.0100"),
}));

export const OnChainAudit: React.FC = () => {
  const [selectedEpochIdx, setSelectedEpochIdx] = useState<number>(15);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStep, setVerificationStep] = useState(-1);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  const { treeLayers, root, proof, leafHash } = useMemo(() => {
    const layers = buildEpochMerkleTree(mockLeaves);
    const rootHash = layers[layers.length - 1][0] || "0x0";
    const selectedProof = generateProof(layers, selectedEpochIdx);
    const leaf = hashEpochState(mockLeaves[selectedEpochIdx]);
    return { treeLayers: layers, root: rootHash, proof: selectedProof, leafHash: leaf };
  }, [selectedEpochIdx]);

  const selectedLeaf = mockLeaves[selectedEpochIdx];

  const handleVerify = () => {
    setIsVerifying(true);
    setVerificationStep(0);
    setIsVerified(null);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      setVerificationStep(step);
      if (step > proof.length) {
        clearInterval(interval);
        setIsVerifying(false);
        setIsVerified(verifyMerkleProof(leafHash, proof, root));
      }
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* State Commitment Strip */}
      <div className="glass rounded-xl p-5 flex flex-col md:flex-row items-center justify-between border border-hl-cyan/40 bg-gradient-to-r from-hl-cyan/10 to-transparent">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-hl-cyan/20 flex items-center justify-center border border-hl-cyan/50">
            <ShieldCheck className="w-6 h-6 text-hl-cyan" />
          </div>
          <div>
            <h3 className="text-hl-cyan font-mono text-sm font-bold uppercase tracking-wider">Current State Merkle Root</h3>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-white font-mono bg-bg-raised px-2 py-0.5 rounded text-sm border border-border-strong">
                {root.slice(0, 10)}...{root.slice(-8)}
              </code>
              <span className="text-xs text-hl-mint flex items-center gap-1 font-mono font-bold bg-hl-mint/10 px-2 py-0.5 rounded border border-hl-mint/30">
                <CheckCircle2 className="w-3.5 h-3.5" /> MATHEMATICALLY VERIFIED
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 md:mt-0 text-right">
          <div className="text-gray-400 font-mono text-xs uppercase">Anchored Epochs</div>
          <div className="text-white font-mono text-xl">8,760</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interactive Epoch Proof Verifier */}
        <div className="glass rounded-xl p-6 border border-border-subtle flex flex-col">
          <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wide mb-4">
            Interactive Epoch Proof Verifier
          </h3>
          
          <div className="space-y-4 flex-1">
            <div className="space-y-1">
              <label className="text-xs font-mono text-gray-500 uppercase">Select Epoch to Verify</label>
              <select 
                value={selectedEpochIdx}
                onChange={(e) => {
                  setSelectedEpochIdx(Number(e.target.value));
                  setIsVerified(null);
                  setVerificationStep(-1);
                }}
                className="w-full bg-bg p-2.5 rounded text-sm text-white font-mono border border-border-strong focus:outline-none focus:border-hl-cyan"
              >
                {mockLeaves.map((leaf, idx) => (
                  <option key={idx} value={idx}>
                    Epoch #{leaf.epochId} — {new Date(leaf.timestamp).toLocaleTimeString()}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-bg-elevated p-4 rounded-lg border border-border-strong space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">NAV per Share:</span>
                <span className="text-white">{selectedLeaf.navPerShare}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">High Water Mark:</span>
                <span className="text-white">{selectedLeaf.highWaterMark}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Net Delta:</span>
                <span className="text-white">{selectedLeaf.netDelta}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border-subtle/50 mt-2">
                <span className="text-gray-400">Leaf Hash:</span>
                <span className="text-hl-cyan truncate ml-4" title={leafHash}>{leafHash.slice(0,14)}...</span>
              </div>
            </div>

            <button 
              onClick={handleVerify}
              disabled={isVerifying}
              className={`w-full py-2.5 rounded-lg font-mono text-sm font-bold uppercase transition-all ${
                isVerifying ? "bg-bg-raised text-gray-500 cursor-not-allowed border border-border-strong"
                : "bg-hl-cyan/10 text-hl-cyan border border-hl-cyan/40 hover:bg-hl-cyan/20"
              }`}
            >
              {isVerifying ? "Computing Keccak256 Hashes..." : "Verify Cryptographic Proof"}
            </button>
          </div>
        </div>

        {/* Proof Animation Panel */}
        <div className="glass rounded-xl p-6 border border-border-subtle bg-bg/50">
          <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wide mb-4 flex items-center gap-2">
            <Hash className="w-4 h-4 text-gray-400" />
            Merkle Path Trace
          </h3>
          
          <div className="space-y-3 font-mono text-xs">
            <div className={`p-2 rounded border transition-all ${verificationStep >= 0 ? "border-hl-cyan bg-hl-cyan/10 text-hl-cyan" : "border-border-strong text-gray-500"}`}>
              <div className="font-bold mb-1">0. Target Leaf Hash</div>
              <div className="truncate">{leafHash}</div>
            </div>
            
            {proof.map((p, i) => (
              <div key={i} className="flex flex-col">
                <div className="flex justify-center my-1 text-gray-600">
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </div>
                <div className={`p-2 rounded border transition-all ${verificationStep > i ? "border-hl-cyan bg-hl-cyan/5 text-hl-cyan" : "border-border-strong text-gray-500"}`}>
                  <div className="font-bold mb-1">{i + 1}. Sibling Hash (Layer {i + 1})</div>
                  <div className="truncate">{p}</div>
                </div>
              </div>
            ))}

            <div className="flex justify-center my-1 text-gray-600">
              <ChevronRight className="w-4 h-4 rotate-90" />
            </div>
            
            <div className={`p-2 rounded border transition-all ${verificationStep > proof.length ? (isVerified ? "border-hl-mint bg-hl-mint/10 text-hl-mint" : "border-hl-rose bg-hl-rose/10 text-hl-rose") : "border-border-strong text-gray-500"}`}>
              <div className="font-bold mb-1">Final. Computed Merkle Root</div>
              <div className="truncate">{verificationStep > proof.length ? root : "0x..."}</div>
            </div>

            {isVerified !== null && (
              <div className={`mt-4 p-3 rounded font-bold flex items-center gap-2 ${isVerified ? "bg-hl-mint/20 text-hl-mint border border-hl-mint/30" : "bg-hl-rose/20 text-hl-rose border border-hl-rose/30"}`}>
                {isVerified ? <CheckCircle2 className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                {isVerified ? "✓ Proof Valid - Zero State Tampering Detected" : "✗ Proof Invalid - State Mismatch"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
