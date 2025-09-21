import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, sepolia } from 'wagmi/chains';

// Flare Coston2 testnet configuration
const flareCoston2 = {
  id: 114,
  name: 'Flare Coston2',
  network: 'flare-coston2',
  nativeCurrency: {
    decimals: 18,
    name: 'Flare',
    symbol: 'FLR',
  },
  rpcUrls: {
    default: {
      http: ['https://coston2-api.flare.network/ext/bc/C/rpc', 'https://coston2-api.flare.network/ext/bc/C/rpc'],
    },
    public: {
      http: ['https://coston2-api.flare.network/ext/bc/C/rpc', 'https://coston2-api.flare.network/ext/bc/C/rpc'],
    },
  },
  blockExplorers: {
    default: { name: 'Flare Coston2 Explorer', url: 'https://coston2-explorer.flare.network' },
  },
  testnet: true,
} as const;

export const config = getDefaultConfig({
  appName: 'MiniAMM DApp',
  projectId: 'YOUR_PROJECT_ID', // WalletConnect Project ID (optional)
  chains: [flareCoston2, mainnet, sepolia], // Flare Coston2를 첫 번째로 설정
  ssr: false, // If your dApp uses server side rendering (SSR)
});
