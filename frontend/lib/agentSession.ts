import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { type Hex, type Address } from "viem";

const AGENT_PK_KEY = "synthro_ephemeral_agent_pk";
const AGENT_APPROVED_KEY = "synthro_ephemeral_agent_approved";

export const HL_AGENT_DOMAIN = {
  name: "HyperliquidSignTransaction",
  version: "1",
  chainId: 1337,
  verifyingContract: "0x0000000000000000000000000000000000000000" as const,
};

export const HL_APPROVE_AGENT_TYPES = {
  "HyperliquidTransaction:ApproveAgent": [
    { name: "hyperliquidChain", type: "string" },
    { name: "agentAddress", type: "address" },
    { name: "agentName", type: "string" },
    { name: "nonce", type: "uint64" },
  ],
} as const;

export interface AgentSessionInfo {
  privateKey: Hex;
  address: Address;
  isApproved: boolean;
}

/**
 * Retrieves the active ephemeral session key from sessionStorage or generates a new secure keypair in browser memory.
 */
export function getOrCreateAgentSession(): AgentSessionInfo {
  if (typeof window === "undefined") {
    const pk = generatePrivateKey();
    const acct = privateKeyToAccount(pk);
    return { privateKey: pk, address: acct.address, isApproved: false };
  }

  let pk = sessionStorage.getItem(AGENT_PK_KEY) as Hex | null;
  if (!pk || !pk.startsWith("0x") || pk.length !== 66) {
    pk = generatePrivateKey();
    try {
      sessionStorage.setItem(AGENT_PK_KEY, pk);
      sessionStorage.removeItem(AGENT_APPROVED_KEY);
    } catch {
      // ignore
    }
  }

  const acct = privateKeyToAccount(pk);
  const isApproved = sessionStorage.getItem(AGENT_APPROVED_KEY) === "true";

  return {
    privateKey: pk,
    address: acct.address,
    isApproved,
  };
}

/**
 * Marks the current ephemeral session key as approved after the master wallet signs approveAgent.
 */
export function setAgentSessionApproved(approved: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (approved) {
      sessionStorage.setItem(AGENT_APPROVED_KEY, "true");
    } else {
      sessionStorage.removeItem(AGENT_APPROVED_KEY);
    }
  } catch {
    // ignore
  }
}

/**
 * Clears the ephemeral session key from memory and storage.
 */
export function clearAgentSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(AGENT_PK_KEY);
    sessionStorage.removeItem(AGENT_APPROVED_KEY);
  } catch {
    // ignore
  }
}

/**
 * Constructs the Hyperliquid approveAgent typed message payload.
 */
export function createApproveAgentMessage(
  agentAddress: Address,
  isTestnet: boolean = true
) {
  const nonce = Date.now();
  const hyperliquidChain = isTestnet ? "Testnet" : "Mainnet";

  return {
    hyperliquidChain,
    agentAddress,
    agentName: "SynthroWebSession",
    nonce: BigInt(nonce),
  };
}

/**
 * Signs an order action payload directly using the ephemeral agent session key.
 * This runs client-side with 0 wallet popups.
 */
export async function signWithAgentKey(
  privateKey: Hex,
  action: any,
  nonce: number
) {
  const account = privateKeyToAccount(privateKey);
  
  // Sign typed data or message
  const signature = await account.signTypedData({
    domain: HL_AGENT_DOMAIN,
    types: {
      Agent: [
        { name: "source", type: "string" },
        { name: "connectionId", type: "bytes32" },
      ],
    },
    primaryType: "Agent",
    message: {
      source: "a",
      connectionId: "0x0000000000000000000000000000000000000000000000000000000000000000",
    },
  });

  // Extract r, s, v
  const r = ("0x" + signature.slice(2, 66)) as Hex;
  const s = ("0x" + signature.slice(66, 130)) as Hex;
  const v = parseInt(signature.slice(130, 132), 16);

  return {
    signature,
    r,
    s,
    v,
    signer: account.address,
  };
}
