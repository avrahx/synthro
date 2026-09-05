/**
 * Hyperliquid User State Fetcher & Portfolio Diagnostics Engine
 */

export interface PortfolioPosition {
  asset: string;
  type: "SPOT" | "PERP_LONG" | "PERP_SHORT";
  size: number;
  entryPrice: number;
  markPrice: number;
  notionalUsd: number;
  unrealizedPnl: number;
  accruedFundingCash: number;
  liquidationPrice: number | null;
  funding1hRate: number;
  fundingAprPct: number;
  rebalanceStatus: "HEDGED" | "UNHEDGED_EXPOSURE" | "HIGH_CARRY_OPP";
}

export interface PortfolioDiagnostics {
  userAddress: string;
  isMockOrSimulated: boolean;
  totalAccountValue: number;
  totalMarginUsed: number;
  marginHealthFactor: number;
  netDirectionalDeltaUsd: number;
  totalLongExposureUsd: number;
  totalShortExposureUsd: number;
  grossNotionalUsd: number;
  leverageMultiplier: number;
  hourlyFundingCashFlowUsd: number;
  annualizedFundingAprPct: number;
  nearestLiquidationDistancePct: number | null;
  positions: PortfolioPosition[];
  recommendations: string[];
}

interface RawAssetCtx {
  funding: string;
  markPx: string;
  midPx: string;
  openInterest: string;
  dayNtlVlm: string;
}

interface RawUniverseItem {
  name: string;
  szDecimals: number;
  maxLeverage: number;
}

interface RawPosition {
  coin: string;
  szi: string;
  entryPx: string;
  positionValue: string;
  unrealizedPnl: string;
  liquidationPx: string | null;
  cumFunding: {
    sinceOpen: string;
    sinceChange: string;
    allTime: string;
  };
  marginUsed: string;
  maxLeverage: number;
}

interface RawSpotBalance {
  coin: string;
  token: number;
  hold: string;
  total: string;
  entryNtl: string;
}

const HL_INFO_URL = "https://api.hyperliquid.xyz/info";

/**
 * Generates an institutional fallback demo portfolio demonstrating basis arbitrage
 */
export function getSimulatedPortfolio(address: string): PortfolioDiagnostics {
  const btcPx = 67420;
  const ethPx = 2840;
  const solPx = 148;
  const purrPx = 0.24;

  const positions: PortfolioPosition[] = [
    // BTC Basis Pair
    {
      asset: "BTC",
      type: "SPOT",
      size: 1.5,
      entryPrice: 66800,
      markPrice: btcPx,
      notionalUsd: 1.5 * btcPx,
      unrealizedPnl: 1.5 * (btcPx - 66800),
      accruedFundingCash: 0,
      liquidationPrice: null,
      funding1hRate: 0,
      fundingAprPct: 0,
      rebalanceStatus: "HEDGED",
    },
    {
      asset: "BTC-PERP",
      type: "PERP_SHORT",
      size: -1.5,
      entryPrice: 67100,
      markPrice: btcPx,
      notionalUsd: 1.5 * btcPx,
      unrealizedPnl: -1.5 * (btcPx - 67100),
      accruedFundingCash: 312.45,
      liquidationPrice: 98500,
      funding1hRate: 0.000185,
      fundingAprPct: 0.000185 * 24 * 365 * 100,
      rebalanceStatus: "HEDGED",
    },
    // ETH Basis Pair
    {
      asset: "ETH",
      type: "SPOT",
      size: 25.0,
      entryPrice: 2810,
      markPrice: ethPx,
      notionalUsd: 25.0 * ethPx,
      unrealizedPnl: 25.0 * (ethPx - 2810),
      accruedFundingCash: 0,
      liquidationPrice: null,
      funding1hRate: 0,
      fundingAprPct: 0,
      rebalanceStatus: "HEDGED",
    },
    {
      asset: "ETH-PERP",
      type: "PERP_SHORT",
      size: -25.0,
      entryPrice: 2825,
      markPrice: ethPx,
      notionalUsd: 25.0 * ethPx,
      unrealizedPnl: -25.0 * (ethPx - 2825),
      accruedFundingCash: 198.8,
      liquidationPrice: 4200,
      funding1hRate: 0.000142,
      fundingAprPct: 0.000142 * 24 * 365 * 100,
      rebalanceStatus: "HEDGED",
    },
    // SOL Basis Pair with mild basis divergence
    {
      asset: "SOL",
      type: "SPOT",
      size: 150.0,
      entryPrice: 142,
      markPrice: solPx,
      notionalUsd: 150.0 * solPx,
      unrealizedPnl: 150.0 * (solPx - 142),
      accruedFundingCash: 0,
      liquidationPrice: null,
      funding1hRate: 0,
      fundingAprPct: 0,
      rebalanceStatus: "HEDGED",
    },
    {
      asset: "SOL-PERP",
      type: "PERP_SHORT",
      size: -140.0,
      entryPrice: 145,
      markPrice: solPx,
      notionalUsd: 140.0 * solPx,
      unrealizedPnl: -140.0 * (solPx - 145),
      accruedFundingCash: 84.15,
      liquidationPrice: 215,
      funding1hRate: 0.00021,
      fundingAprPct: 0.00021 * 24 * 365 * 100,
      rebalanceStatus: "UNHEDGED_EXPOSURE",
    },
    // Native Hyperliquid Spot holding PURR
    {
      asset: "PURR",
      type: "SPOT",
      size: 45000,
      entryPrice: 0.22,
      markPrice: purrPx,
      notionalUsd: 45000 * purrPx,
      unrealizedPnl: 45000 * (purrPx - 0.22),
      accruedFundingCash: 0,
      liquidationPrice: null,
      funding1hRate: 0,
      fundingAprPct: 0,
      rebalanceStatus: "HIGH_CARRY_OPP",
    },
  ];

  const totalAccountValue = 245800;
  const totalMarginUsed = 38400;
  const marginHealthFactor = totalAccountValue / totalMarginUsed;

  // Hourly cash flow from shorts collecting positive funding:
  // BTC short: 1.5 * 67420 * 0.000185 = $18.71 / hr
  // ETH short: 25 * 2840 * 0.000142 = $10.08 / hr
  // SOL short: 140 * 148 * 0.00021 = $4.35 / hr
  const hourlyFundingCashFlowUsd = 18.71 + 10.08 + 4.35;
  const annualizedFundingAprPct = (hourlyFundingCashFlowUsd * 24 * 365) / totalAccountValue * 100;

  // Total Spot = $101,130 + $71,000 + $22,200 + $10,800 = $205,130
  // Total Short = $101,130 + $71,000 + $20,720 = $192,850
  // Net Delta = +$12,280 (from 10 SOL unhedged + 45,000 PURR)
  const totalLongExposureUsd = 205130;
  const totalShortExposureUsd = 192850;
  const netDirectionalDeltaUsd = totalLongExposureUsd - totalShortExposureUsd;
  const grossNotionalUsd = totalLongExposureUsd + totalShortExposureUsd;
  const leverageMultiplier = grossNotionalUsd / totalAccountValue;

  return {
    userAddress: address,
    isMockOrSimulated: true,
    totalAccountValue,
    totalMarginUsed,
    marginHealthFactor,
    netDirectionalDeltaUsd,
    totalLongExposureUsd,
    totalShortExposureUsd,
    grossNotionalUsd,
    leverageMultiplier,
    hourlyFundingCashFlowUsd,
    annualizedFundingAprPct,
    nearestLiquidationDistancePct: 45.2,
    positions,
    recommendations: [
      "10 SOL spot is currently unhedged ($1,480 net long). Short 10 SOL-PERP to neutralize delta.",
      "PURR spot ($10,800) has no active perp hedge. PURR funding is +18.4% APR — lock in delta-neutral yield.",
      "Overall basis carry is generating +$33.14/hr (11.8% Net APR) with 45.2% liquidation buffer.",
    ],
  };
}

/**
 * Fetches user state directly from Hyperliquid public info API and computes diagnostics
 */
export async function fetchUserAuditDiagnostics(userAddress: string): Promise<PortfolioDiagnostics> {
  if (!userAddress || !userAddress.startsWith("0x")) {
    return getSimulatedPortfolio(userAddress || "0x0000000000000000000000000000000000000000");
  }

  try {
    // Parallel requests to Hyperliquid L1 clearinghouse API
    const [clearinghouseRes, spotRes, metaRes] = await Promise.all([
      fetch(HL_INFO_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "clearinghouseState", user: userAddress }),
      }),
      fetch(HL_INFO_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "spotClearinghouseState", user: userAddress }),
      }),
      fetch(HL_INFO_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "metaAndAssetCtxs" }),
      }),
    ]);

    if (!clearinghouseRes.ok || !spotRes.ok || !metaRes.ok) {
      console.warn("Hyperliquid L1 query returned non-200. Falling back to simulated audit.");
      return getSimulatedPortfolio(userAddress);
    }

    const clearinghouseData = await clearinghouseRes.json();
    const spotData = await spotRes.json();
    const [meta, assetContexts] = await metaRes.json();

    // Map universe metadata and asset contexts by coin name
    const assetMap: Record<string, { funding: number; markPx: number }> = {};
    if (meta?.universe && assetContexts) {
      for (let i = 0; i < meta.universe.length; i++) {
        const u: RawUniverseItem = meta.universe[i];
        const ctx: RawAssetCtx = assetContexts[i];
        assetMap[u.name] = {
          funding: parseFloat(ctx?.funding || "0"),
          markPx: parseFloat(ctx?.markPx || "0"),
        };
      }
    }

    const marginSummary = clearinghouseData?.marginSummary || {};
    const accountValue = parseFloat(marginSummary.accountValue || "0");
    const totalMarginUsed = parseFloat(marginSummary.totalMarginUsed || "0");
    const assetPositions: { position: RawPosition }[] = clearinghouseData?.assetPositions || [];
    const spotBalances: RawSpotBalance[] = spotData?.balances || [];

    // If the account has zero active positions or zero value on Hyperliquid, fallback to simulated
    const hasPerpPositions = assetPositions.some(
      (p) => parseFloat(p?.position?.szi || "0") !== 0
    );
    const hasSpotBalances = spotBalances.some(
      (b) => parseFloat(b?.total || "0") > 0 && b?.coin !== "USDC"
    );

    if (accountValue <= 10 && !hasPerpPositions && !hasSpotBalances) {
      // User is connected but has empty HL account — return informative simulated audit
      const sim = getSimulatedPortfolio(userAddress);
      sim.recommendations.unshift(
        "Notice: No active Hyperliquid L1 positions found for this address. Displaying reference basis arbitrage audit."
      );
      return sim;
    }

    // Process real positions
    const positions: PortfolioPosition[] = [];
    let totalLongUsd = 0;
    let totalShortUsd = 0;
    let hourlyCashFlow = 0;
    let nearestLiqDist: number | null = null;

    // 1. Process Spot Balances
    for (const b of spotBalances) {
      const size = parseFloat(b.total || "0");
      if (size <= 0 || b.coin === "USDC") continue;

      const markPx = assetMap[b.coin]?.markPx || 1;
      const notional = size * markPx;
      totalLongUsd += notional;

      positions.push({
        asset: b.coin,
        type: "SPOT",
        size,
        entryPrice: parseFloat(b.entryNtl || "0") > 0 ? parseFloat(b.entryNtl) / size : markPx,
        markPrice: markPx,
        notionalUsd: notional,
        unrealizedPnl: 0,
        accruedFundingCash: 0,
        liquidationPrice: null,
        funding1hRate: 0,
        fundingAprPct: 0,
        rebalanceStatus: "UNHEDGED_EXPOSURE",
      });
    }

    // 2. Process Perp Positions
    for (const item of assetPositions) {
      const p = item.position;
      const szi = parseFloat(p.szi || "0");
      if (szi === 0) continue;

      const coin = p.coin;
      const markPx = assetMap[coin]?.markPx || parseFloat(p.entryPx || "1");
      const funding1h = assetMap[coin]?.funding || 0;
      const notional = Math.abs(szi) * markPx;
      const isLong = szi > 0;
      const entryPx = parseFloat(p.entryPx || "0");
      const liqPx = p.liquidationPx ? parseFloat(p.liquidationPx) : null;
      const unPnl = parseFloat(p.unrealizedPnl || "0");
      const cumFunding = parseFloat(p.cumFunding?.sinceOpen || "0");

      if (isLong) {
        totalLongUsd += notional;
      } else {
        totalShortUsd += notional;
      }

      // Cash flow formula: -1 * szi * markPx * funding1h
      const legHourlyCashFlow = -1 * (szi * markPx * funding1h);
      hourlyCashFlow += legHourlyCashFlow;

      if (liqPx && markPx > 0) {
        const dist = (Math.abs(markPx - liqPx) / markPx) * 100;
        if (nearestLiqDist === null || dist < nearestLiqDist) {
          nearestLiqDist = dist;
        }
      }

      // Check if matched by a spot balance
      const hasSpotCounterpart = positions.some(
        (sp) => sp.type === "SPOT" && sp.asset === coin
      );

      positions.push({
        asset: `${coin}-PERP`,
        type: isLong ? "PERP_LONG" : "PERP_SHORT",
        size: szi,
        entryPrice: entryPx,
        markPrice: markPx,
        notionalUsd: notional,
        unrealizedPnl: unPnl,
        accruedFundingCash: cumFunding,
        liquidationPrice: liqPx,
        funding1hRate: funding1h,
        fundingAprPct: funding1h * 24 * 365 * 100,
        rebalanceStatus: hasSpotCounterpart && !isLong ? "HEDGED" : "UNHEDGED_EXPOSURE",
      });
    }

    // Mark spot positions that are hedged
    for (const sp of positions) {
      if (sp.type === "SPOT") {
        const perp = positions.find(
          (pp) => pp.asset === `${sp.asset}-PERP` && pp.type === "PERP_SHORT"
        );
        if (perp) {
          sp.rebalanceStatus = "HEDGED";
        }
      }
    }

    const netDirectionalDeltaUsd = totalLongUsd - totalShortUsd;
    const grossNotionalUsd = totalLongUsd + totalShortUsd;
    const leverageMultiplier = accountValue > 0 ? grossNotionalUsd / accountValue : 0;
    const marginHealthFactor = totalMarginUsed > 0 ? accountValue / totalMarginUsed : 99.9;
    const annualizedFundingAprPct =
      accountValue > 0 ? (hourlyCashFlow * 24 * 365) / accountValue * 100 : 0;

    // Generate smart recommendations
    const recommendations: string[] = [];
    if (Math.abs(netDirectionalDeltaUsd) < accountValue * 0.05) {
      recommendations.push(
        "High Delta Neutrality: Portfolio is balanced within 5% tolerance, isolating funding spread yield."
      );
    } else if (netDirectionalDeltaUsd > 0) {
      recommendations.push(
        `Net Long Exposure detected ($${netDirectionalDeltaUsd.toLocaleString(undefined, {
          maximumFractionDigits: 0,
        })}). Consider shorting equivalent perps to eliminate directional risk.`
      );
    } else {
      recommendations.push(
        `Net Short Exposure detected ($${Math.abs(netDirectionalDeltaUsd).toLocaleString(undefined, {
          maximumFractionDigits: 0,
        })}). Accumulate spot or close short perps to prevent upside squeeze.`
      );
    }

    if (hourlyCashFlow > 0) {
      recommendations.push(
        `Positive Carry: Generating +$${hourlyCashFlow.toFixed(2)}/hr (${annualizedFundingAprPct.toFixed(
          1
        )}% APR) from short perp funding capture.`
      );
    } else if (hourlyCashFlow < 0) {
      recommendations.push(
        `Negative Funding Drag: Portfolio is paying $${Math.abs(hourlyCashFlow).toFixed(
          2
        )}/hr in funding fees. Rotate into positive basis pairs.`
      );
    }

    return {
      userAddress,
      isMockOrSimulated: false,
      totalAccountValue: accountValue,
      totalMarginUsed,
      marginHealthFactor,
      netDirectionalDeltaUsd,
      totalLongExposureUsd: totalLongUsd,
      totalShortExposureUsd: totalShortUsd,
      grossNotionalUsd,
      leverageMultiplier,
      hourlyFundingCashFlowUsd: hourlyCashFlow,
      annualizedFundingAprPct,
      nearestLiquidationDistancePct: nearestLiqDist,
      positions,
      recommendations,
    };
  } catch (err) {
    console.error("Error in fetchUserAuditDiagnostics:", err);
    return getSimulatedPortfolio(userAddress);
  }
}
