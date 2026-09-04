export interface RegimeInput {
  volatility_annualized: number; // e.g., 0.85 for 85%
  funding_rate_hourly: number;   // e.g., 0.0002 for 2 bps/hr
}

export interface RegimeOutput {
  pBull: number;
  pChop: number;
  pShock: number;
  activeRegime: "BULL_CARRY" | "CHOP_NEUTRAL" | "VOLATILITY_SHOCK";
  sizingMultiplier: number;
}

// Helper to compute Gaussian PDF
function gaussianPdf(x: number, mean: number, std: number): number {
  if (std <= 0) return 0;
  const variance = std * std;
  const exponent = -Math.pow(x - mean, 2) / (2 * variance);
  return (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
}

export function classifyRegime(input: RegimeInput): RegimeOutput {
  const { volatility_annualized, funding_rate_hourly } = input;

  // State 0: BULL CARRY (Low-Medium Vol, High Positive Funding)
  const bullVolProb = gaussianPdf(volatility_annualized, 0.40, 0.20);
  const bullFundProb = gaussianPdf(funding_rate_hourly, 0.0003, 0.00015);
  const pBullRaw = bullVolProb * bullFundProb;

  // State 1: CHOP NEUTRAL (Medium Vol, Flat/Slightly Positive Funding)
  const chopVolProb = gaussianPdf(volatility_annualized, 0.60, 0.25);
  const chopFundProb = gaussianPdf(funding_rate_hourly, 0.00005, 0.0001);
  const pChopRaw = chopVolProb * chopFundProb;

  // State 2: VOLATILITY SHOCK (High Vol, Negative or Highly Variant Funding)
  const shockVolProb = gaussianPdf(volatility_annualized, 1.20, 0.40);
  const shockFundProb = gaussianPdf(funding_rate_hourly, -0.0002, 0.0005);
  const pShockRaw = shockVolProb * shockFundProb;

  // Normalize probabilities
  const sumRaw = pBullRaw + pChopRaw + pShockRaw;
  
  let pBull = 0, pChop = 0, pShock = 0;
  if (sumRaw > 0) {
    pBull = pBullRaw / sumRaw;
    pChop = pChopRaw / sumRaw;
    pShock = pShockRaw / sumRaw;
  } else {
    // Fallback to neutral if out of typical bounds
    pChop = 1.0;
  }

  // Determine active regime
  let activeRegime: "BULL_CARRY" | "CHOP_NEUTRAL" | "VOLATILITY_SHOCK" = "CHOP_NEUTRAL";
  let maxP = pChop;
  
  if (pBull > maxP) {
    activeRegime = "BULL_CARRY";
    maxP = pBull;
  }
  if (pShock > maxP) {
    activeRegime = "VOLATILITY_SHOCK";
  }

  // Calculate dynamic sizing multiplier based on Kelly/Vol targets
  // Cap between 0.0x and 1.5x
  let sizingMultiplier = pBull * 1.25 + pChop * 0.85 + pShock * 0.0;
  sizingMultiplier = Math.max(0, Math.min(1.5, sizingMultiplier));

  return {
    pBull,
    pChop,
    pShock,
    activeRegime,
    sizingMultiplier
  };
}
