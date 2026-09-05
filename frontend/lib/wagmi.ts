import { http, createConfig } from 'wagmi';
import { arbitrum, arbitrumSepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

export const hyperliquidTestnet = {
  id: 1337,
  name: 'Hyperliquid Phantom',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://api.hyperliquid-testnet.xyz/evm'] },
  },
} as const;

export const config = createConfig({
  chains: [arbitrum, arbitrumSepolia, hyperliquidTestnet],
  connectors: [injected()],
  transports: {
    [arbitrum.id]: http(),
    [arbitrumSepolia.id]: http(),
    [hyperliquidTestnet.id]: http(),
  },
});
