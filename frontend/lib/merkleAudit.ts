import { encodeAbiParameters, keccak256, type Hex, parseUnits } from 'viem';

export interface EpochLeaf {
  epochId: number;
  timestamp: number;
  navPerShare: string;
  highWaterMark: string;
  leaderEquity: string;
  netDelta: string;
}

/**
 * Serializes and hashes a single epoch leaf to match Solidity keccak256(abi.encode(...))
 */
export function hashEpochState(leaf: EpochLeaf): Hex {
  const data = encodeAbiParameters(
    [
      { name: 'epochId', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'navPerShare', type: 'uint256' },
      { name: 'highWaterMark', type: 'uint256' },
      { name: 'leaderEquity', type: 'uint256' },
      { name: 'netDelta', type: 'int256' }
    ],
    [
      BigInt(leaf.epochId),
      BigInt(leaf.timestamp),
      parseUnits(leaf.navPerShare, 18),
      parseUnits(leaf.highWaterMark, 18),
      parseUnits(leaf.leaderEquity, 18),
      parseUnits(leaf.netDelta, 18)
    ]
  );
  return keccak256(data);
}

/**
 * Combines two hashes, sorting them first exactly like OpenZeppelin's MerkleProof.sol
 */
export function hashPair(a: Hex, b: Hex): Hex {
  const aBig = BigInt(a);
  const bBig = BigInt(b);
  const [first, second] = aBig < bBig ? [a, b] : [b, a];
  return keccak256(encodeAbiParameters(
    [{ type: 'bytes32' }, { type: 'bytes32' }],
    [first, second]
  ));
}

/**
 * Builds a full Merkle Tree from a list of leaves
 * Returns the layers of the tree, where layers[0] are the leaves, and layers[layers.length-1][0] is the root.
 */
export function buildEpochMerkleTree(leaves: EpochLeaf[]): Hex[][] {
  if (leaves.length === 0) return [[]];
  
  let currentLayer = leaves.map(hashEpochState);
  const layers = [currentLayer];

  while (currentLayer.length > 1) {
    const nextLayer: Hex[] = [];
    for (let i = 0; i < currentLayer.length; i += 2) {
      if (i + 1 < currentLayer.length) {
        nextLayer.push(hashPair(currentLayer[i], currentLayer[i + 1]));
      } else {
        nextLayer.push(currentLayer[i]);
      }
    }
    layers.push(nextLayer);
    currentLayer = nextLayer;
  }
  
  return layers;
}

/**
 * Generates a Merkle Proof for a specific index in the leaves array
 */
export function generateProof(layers: Hex[][], index: number): Hex[] {
  const proof: Hex[] = [];
  let currentIndex = index;
  
  for (let i = 0; i < layers.length - 1; i++) {
    const layer = layers[i];
    const isRightNode = currentIndex % 2 === 1;
    const pairIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;
    
    if (pairIndex < layer.length) {
      proof.push(layer[pairIndex]);
    }
    currentIndex = Math.floor(currentIndex / 2);
  }
  
  return proof;
}

/**
 * Verifies a Merkle Proof in TypeScript exactly as it would be verified in Solidity
 */
export function verifyMerkleProof(leafHash: Hex, proof: Hex[], root: Hex): boolean {
  let computedHash = leafHash;
  for (const proofElement of proof) {
    computedHash = hashPair(computedHash, proofElement);
  }
  return computedHash === root;
}
