# MiniAMM DApp

A decentralized application for token swapping and liquidity management on Flare Coston2 testnet.

## Features

- 💰 **Token Minting**: Mint test tokens (TKA, TKB)
- 🔄 **Token Swapping**: Swap between tokens with real-time exchange rates
- 💧 **Liquidity Management**: Add/remove liquidity with percentage-based sliders
- 📊 **Real-time Updates**: Automatic balance and pool data refreshing

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Blockchain**: Flare Coston2 Testnet
- **Web3**: wagmi, viem, RainbowKit
- **Styling**: Tailwind CSS

## Environment Variables

Required environment variables for deployment:

```bash
NEXT_PUBLIC_TOKEN_A_ADDRESS=0x...
NEXT_PUBLIC_TOKEN_B_ADDRESS=0x...
NEXT_PUBLIC_MINI_AMM_ADDRESS=0x...
NEXT_PUBLIC_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_LP_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_CHAIN_ID=114
NEXT_PUBLIC_RPC_URL=https://coston2-api.flare.network/ext/bc/C/rpc
```

## Local Development

```bash
npm install
npm run dev
```

## Deployment

This app is configured for Vercel deployment. The environment variables should be set in the Vercel dashboard.

## Network

- **Network**: Flare Coston2 Testnet
- **Chain ID**: 114
- **RPC**: https://coston2-api.flare.network/ext/bc/C/rpc

## Usage

1. Connect your wallet (MetaMask recommended)
2. Mint test tokens
3. Add liquidity to the pool
4. Swap tokens or manage liquidity