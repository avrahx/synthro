"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useSignTypedData } from "wagmi";
import {
  SUPPORTED_BASIS_ASSETS,
  buildBasisOrderPlan,
  executeBasisTrade,
  ExecutionReceipt,
  BasisTradePlan,
} from "../lib/orderRouter";
import {
  getOrCreateAgentSession,
  setAgentSessionApproved,
  createApproveAgentMessage,
  HL_AGENT_DOMAIN,
  HL_APPROVE_AGENT_TYPES,
  AgentSessionInfo,
} from "../lib/agentSession";
import {
  X,
  Zap,
  ShieldCheck,
  ArrowRightLeft,
  Key,
  ChevronDown,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Lock,
  Layers,
} from "lucide-react";

interface BasisExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSymbol?: string;
  initialSizeUsdc?: number;
  onTradeSuccess?: (receipt: ExecutionReceipt) => void;
}

export const BasisExecutionModal: React.FC<BasisExecutionModalProps> = ({
  isOpen,
  onClose,
  initialSymbol = "SOL",
  initialSizeUsdc = 500,
  onTradeSuccess,
}) => {
  const { isConnected, address } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();

  const [selectedSymbol, setSelectedSymbol] = useState<string>(initialSymbol);
  const [notionalUsdc, setNotionalUsdc] = useState<number>(initialSizeUsdc);
  const [executionMode, setExecutionMode] = useState<"SIMULATION" | "TESTNET">("SIMULATION");
  const [agentSession, setAgentSession] = useState<AgentSessionInfo | null>(null);
  const [authorizingAgent, setAuthorizingAgent] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [receipt, setReceipt] = useState<ExecutionReceipt | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [copiedSig, setCopiedSig] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAgentSession(getOrCreateAgentSession());
      setReceipt(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  let plan: BasisTradePlan | null = null;
  try {
    plan = buildBasisOrderPlan(selectedSymbol, Math.max(20, notionalUsdc));
  } catch (err: any) {
    // handled below
  }

  // Authorize Ephemeral Session via approveAgent typed signature
  const handleAuthorizeSession = async () => {
    if (!agentSession) return;
    setAuthorizingAgent(true);
    setErrorMessage(null);

    try {
      const message = createApproveAgentMessage(
        agentSession.address,
        executionMode === "TESTNET"
      );

      // Master wallet prompts user once to sign approveAgent
      await signTypedDataAsync({
        domain: HL_AGENT_DOMAIN,
        types: HL_APPROVE_AGENT_TYPES,
        primaryType: "HyperliquidTransaction:ApproveAgent",
        message: message as any,
      });

      setAgentSessionApproved(true);
      setAgentSession({
        ...agentSession,
        isApproved: true,
      });
    } catch (err: any) {
      console.warn("User rejected or failed approveAgent:", err);
      setErrorMessage(err?.message || "Session authorization cancelled.");
    } finally {
      setAuthorizingAgent(false);
    }
  };

  // Execute atomic basis trade with ephemeral agent key
  const handleExecuteTrade = async () => {
    if (!plan || !agentSession) return;
    setExecuting(true);
    setErrorMessage(null);

    try {
      const result = await executeBasisTrade(
        plan,
        agentSession.privateKey,
        executionMode
      );
      setReceipt(result);
      if (onTradeSuccess) {
        onTradeSuccess(result);
      }
    } catch (err: any) {
      console.error("Trade dispatch failed:", err);
      setErrorMessage(err?.message || "Execution dispatch error.");
    } finally {
      setExecuting(false);
    }
  };

  const copySignaturePayload = () => {
    if (receipt?.rawPayload) {
      navigator.clipboard.writeText(JSON.stringify(receipt.rawPayload, null, 2));
      setCopiedSig(true);
      setTimeout(() => setCopiedSig(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 font-mono">
      <div className="glass rounded-2xl max-w-2xl w-full p-6 border border-synthro-cyan/50 space-y-6 bg-bg-raised shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-synthro-cyan/15 border border-synthro-cyan/40 text-synthro-cyan text-[10px] font-bold">
                Zero-Gas L1 Execution | Non-Custodial
              </span>
              <span className="px-2 py-0.5 rounded bg-synthro-mint/15 border border-synthro-mint/40 text-synthro-mint text-[10px] font-bold">
                EIP-712 Powered
              </span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight mt-1.5 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-synthro-cyan" />
              <span>1-Click Delta-Neutral Basis Dispatcher</span>
            </h2>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-bg p-1 rounded-lg border border-border-strong text-[11px] self-start sm:self-auto">
            <button
              onClick={() => setExecutionMode("SIMULATION")}
              className={`px-2.5 py-1 rounded transition-all ${
                executionMode === "SIMULATION"
                  ? "bg-synthro-cyan text-black font-bold shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Dry Run
            </button>
            <button
              onClick={() => setExecutionMode("TESTNET")}
              className={`px-2.5 py-1 rounded transition-all ${
                executionMode === "TESTNET"
                  ? "bg-synthro-mint text-black font-bold shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              HL Testnet
            </button>
          </div>
        </div>

        {/* Post-Trade Confirmation Receipt View */}
        {receipt ? (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
            <div className="p-5 rounded-xl bg-synthro-mint/10 border border-synthro-mint/40 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-synthro-mint font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>[MATCHED & FILLED] Atomic Basis Trade</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-synthro-mint/20 text-synthro-mint font-bold">
                  {receipt.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-bg/70 p-3.5 rounded-lg border border-border-subtle">
                <div>
                  <div className="text-[10px] text-gray-500 uppercase">Spot Leg (Long)</div>
                  <div className="text-white font-bold mt-0.5">{receipt.spotLeg.size}</div>
                  <div className="text-[11px] text-gray-400">@ {receipt.spotLeg.fillPrice} (${receipt.spotLeg.notional} USDC)</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase">Perp Leg (Short)</div>
                  <div className="text-synthro-mint font-bold mt-0.5">{receipt.perpLeg.size}</div>
                  <div className="text-[11px] text-gray-400">@ {receipt.perpLeg.fillPrice} (${receipt.perpLeg.notional} USDC)</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-gray-400">Net Portfolio Delta:</span>
                <span className="text-synthro-mint font-black">{receipt.netDelta} (100% Hedged)</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Est. Funding Income:</span>
                <span className="text-white font-bold">+${receipt.annualYieldEstUsdc.toFixed(2)} USDC / year</span>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-border-subtle/60">
                <span className="text-gray-500">Sequencer Tx Hash:</span>
                <a
                  href={receipt.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-synthro-cyan hover:underline flex items-center gap-1 font-mono text-[11px]"
                >
                  <span className="truncate max-w-[180px]">{receipt.txHash}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Collapsible EIP-712 Inspector */}
            <div className="border border-border-strong rounded-xl bg-bg overflow-hidden">
              <button
                onClick={() => setInspectorOpen((prev) => !prev)}
                className="w-full p-3 flex items-center justify-between text-xs text-gray-300 hover:text-white bg-bg-elevated"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-synthro-cyan" />
                  <span>EIP-712 Cryptographic Payload & Signatures</span>
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${inspectorOpen ? "rotate-180" : ""}`} />
              </button>

              {inspectorOpen && (
                <div className="p-4 space-y-3 border-t border-border-subtle text-[11px] bg-bg">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Signed by Ephemeral Agent:</span>
                    <code className="text-synthro-cyan bg-bg-raised px-2 py-0.5 rounded text-[10px]">
                      {receipt.signature.signer}
                    </code>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-bg-raised p-2 rounded border border-border-subtle">
                      <div className="text-[9px] text-gray-500 uppercase">r</div>
                      <div className="truncate text-white text-[10px]">{receipt.signature.r}</div>
                    </div>
                    <div className="bg-bg-raised p-2 rounded border border-border-subtle">
                      <div className="text-[9px] text-gray-500 uppercase">s</div>
                      <div className="truncate text-white text-[10px]">{receipt.signature.s}</div>
                    </div>
                    <div className="bg-bg-raised p-2 rounded border border-border-subtle">
                      <div className="text-[9px] text-gray-500 uppercase">v</div>
                      <div className="text-white text-[10px]">{receipt.signature.v}</div>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="text-[10px] text-gray-500 uppercase mb-1">Hyperliquid L1 Wire Action</div>
                    <pre className="p-2.5 rounded bg-black text-[10px] text-gray-300 overflow-x-auto max-h-36">
                      {JSON.stringify(receipt.rawPayload, null, 2)}
                    </pre>
                    <button
                      onClick={copySignaturePayload}
                      className="absolute top-7 right-2 p-1.5 rounded bg-bg-raised text-gray-400 hover:text-white"
                      title="Copy Wire Payload"
                    >
                      {copiedSig ? <Check className="w-3.5 h-3.5 text-hl-mint" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setReceipt(null)}
                className="px-4 py-2 rounded-lg text-xs font-mono text-gray-400 hover:text-white"
              >
                Configure Another Trade
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-lg text-xs font-bold font-mono bg-synthro-cyan text-black hover:bg-synthro-cyan/90 transition-all shadow-[0_0_15px_rgba(0,216,246,0.3)]"
              >
                Close & View Portfolio
              </button>
            </div>
          </div>
        ) : (
          /* Order Configuration View */
          <div className="space-y-5">
            {/* Asset Selector */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400 uppercase font-semibold">Select Target Market</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {Object.values(SUPPORTED_BASIS_ASSETS).map((asset) => {
                  const isSelected = selectedSymbol === asset.symbol;
                  return (
                    <button
                      key={asset.symbol}
                      onClick={() => setSelectedSymbol(asset.symbol)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "bg-synthro-cyan/15 border-synthro-cyan text-white shadow-[0_0_15px_rgba(0,216,246,0.2)]"
                          : "bg-bg border-border-strong text-gray-400 hover:text-white hover:border-border-subtle"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-white">{asset.symbol}</span>
                        <span className="text-[10px] text-synthro-mint font-bold font-mono">
                          +{asset.estFundingApr}%
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-1">
                        ${asset.defaultPrice.toLocaleString()}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Allocation Input & Slider */}
            <div className="space-y-2.5 bg-bg p-4 rounded-xl border border-border-strong">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 uppercase font-semibold">Total Allocation (USDC)</span>
                <span className="text-white font-bold text-sm">${notionalUsdc.toLocaleString()} USDC</span>
              </div>

              <input
                type="range"
                min="10"
                max="10000"
                step="10"
                value={notionalUsdc}
                onChange={(e) => setNotionalUsdc(Number(e.target.value))}
                className="w-full h-1.5 bg-bg-raised rounded-lg appearance-none cursor-pointer accent-synthro-cyan"
              />

              <div className="flex items-center justify-between gap-2 pt-1">
                {[50, 250, 1000, 5000, 10000].map((val) => (
                  <button
                    key={val}
                    onClick={() => setNotionalUsdc(val)}
                    className={`px-2.5 py-1 rounded text-[10px] transition-all ${
                      notionalUsdc === val
                        ? "bg-synthro-cyan/20 border border-synthro-cyan/50 text-synthro-cyan font-bold"
                        : "bg-bg-elevated border border-border-subtle text-gray-400 hover:text-white"
                    }`}
                  >
                    ${val >= 1000 ? `${val / 1000}k` : val}
                  </button>
                ))}
              </div>
            </div>

            {/* Two-Leg Summary Card */}
            {plan && (
              <div className="p-4 rounded-xl bg-bg-elevated/70 border border-border-subtle space-y-3 text-xs">
                <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center justify-between">
                  <span>Atomic Execution Specification</span>
                  <span className="text-synthro-mint flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Delta-Neutral Guaranteed
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-lg bg-bg border border-border-strong">
                    <div className="text-[10px] text-synthro-cyan uppercase font-bold">Leg 1: Spot Buy</div>
                    <div className="text-white font-bold mt-1">
                      {plan.spotSize} {plan.asset.symbol}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      ${plan.spotNotionalUsdc.toFixed(2)} USDC @ ~${plan.spotLimitPrice}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-bg border border-border-strong">
                    <div className="text-[10px] text-synthro-mint uppercase font-bold">Leg 2: Perp Short</div>
                    <div className="text-white font-bold mt-1">
                      -{plan.perpSize} {plan.asset.symbol}-PERP
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      ${plan.perpNotionalUsdc.toFixed(2)} USDC @ ~${plan.perpLimitPrice}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border-subtle/50 text-[11px]">
                  <div>
                    <span className="text-gray-500">Net Delta:</span>
                    <span className="text-synthro-mint font-bold ml-1.5">{plan.netDelta}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Est. Carry:</span>
                    <span className="text-white font-bold ml-1.5">+${plan.estAnnualIncomeUsdc.toFixed(2)}/yr</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Fee Drag:</span>
                    <span className="text-gray-300 ml-1.5">~{plan.feeAndSlippageBps} bps</span>
                  </div>
                </div>
              </div>
            )}

            {/* Agent Session Status & Action */}
            {agentSession && (
              <div className="p-4 rounded-xl border border-border-strong bg-bg space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 font-semibold flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-synthro-cyan" />
                    <span>Agent Session Key Status:</span>
                  </span>
                  {agentSession.isApproved ? (
                    <span className="text-synthro-mint font-bold flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Active & Authorized</span>
                    </span>
                  ) : (
                    <span className="text-hl-amber font-bold text-[11px]">
                      Pending User Authorization
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-500">
                  <span>Ephemeral Signer:</span>
                  <code className="text-gray-300 font-mono text-[10px]">
                    {agentSession.address.slice(0, 10)}...{agentSession.address.slice(-6)}
                  </code>
                </div>

                {!agentSession.isApproved && (
                  <div className="pt-2 border-t border-border-subtle/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Authorize this ephemeral session key once to enable 1-click execution without repetitive wallet signature popups.
                    </p>
                    <button
                      onClick={handleAuthorizeSession}
                      disabled={authorizingAgent || !isConnected}
                      className="shrink-0 px-4 py-2 rounded-lg text-xs font-bold font-mono uppercase bg-hl-amber text-black hover:bg-hl-amber/90 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {authorizingAgent ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Awaiting Sig...</span>
                        </>
                      ) : (
                        <span>Authorize Session</span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-lg bg-hl-rose/10 border border-hl-rose/40 text-hl-rose text-xs">
                {errorMessage}
              </div>
            )}

            {/* Execute Button */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg text-xs font-mono text-gray-400 hover:text-white"
              >
                Cancel
              </button>

              <button
                onClick={handleExecuteTrade}
                disabled={executing || !plan || (!agentSession?.isApproved && executionMode === "TESTNET")}
                className="px-6 py-3 rounded-xl text-xs font-bold font-mono uppercase bg-synthro-cyan text-black hover:bg-synthro-cyan/90 transition-all shadow-[0_0_20px_rgba(0,216,246,0.3)] disabled:opacity-50 flex items-center gap-2 hover:scale-[1.01]"
              >
                {executing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Signing & Dispatching L1 Legs...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Sign & Execute Basis Trade</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
