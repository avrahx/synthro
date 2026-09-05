export const HL_L1_DOMAIN = {
  name: "Exchange",
  version: "1",
  chainId: 1337,
  verifyingContract: "0x0000000000000000000000000000000000000000" as const,
};

export const HL_L1_TYPES = {
  Agent: [
    { name: "source", type: "string" },
    { name: "connectionId", type: "bytes32" }
  ]
};

// Types for EIP-712 Action
export interface L1Action {
  type: string;
  signatureChainId: string;
  hyperliquidChain: string;
  action: any;
  nonce: number;
}
