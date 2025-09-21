'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { config } from '@/lib/wagmi';
import { SwapInterface } from '@/components/SwapInterface';
import { SimpleLiquidityInterface } from '@/components/SimpleLiquidityInterface';
import { TokenBalance } from '@/components/TokenBalance';
import { CONTRACT_ADDRESSES } from '@/config/contracts';

const queryClient = new QueryClient();

export default function Home() {
  // Contract addresses from configuration
  const tokenXAddress = CONTRACT_ADDRESSES.TOKEN_A;
  const tokenYAddress = CONTRACT_ADDRESSES.TOKEN_B;
  const miniAMMAddress = CONTRACT_ADDRESSES.MINI_AMM;

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
          <header className="bg-white shadow-lg border-b-2 border-blue-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-20">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">MiniAMM DApp</h1>
                <ConnectButton />
              </div>
            </div>
          </header>

        <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
          <div className="px-4 py-8 sm:px-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Token Balances */}
              <div className="bg-white overflow-hidden shadow-xl rounded-xl border-2 border-blue-100 hover:shadow-2xl transition-shadow duration-300">
                <div className="px-6 py-8 sm:p-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">💰 Token Balances</h2>
                  <TokenBalance 
                    tokenXAddress={tokenXAddress}
                    tokenYAddress={tokenYAddress}
                  />
                </div>
              </div>

              {/* Swap Interface */}
              <div className="bg-white overflow-hidden shadow-xl rounded-xl border-2 border-green-100 hover:shadow-2xl transition-shadow duration-300">
                <div className="px-6 py-8 sm:p-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">🔄 Swap Tokens</h2>
                  <SwapInterface 
                    miniAMMAddress={miniAMMAddress}
                    tokenXAddress={tokenXAddress}
                    tokenYAddress={tokenYAddress}
                  />
                </div>
              </div>

              {/* Liquidity Interface */}
              <div className="bg-white overflow-hidden shadow-xl rounded-xl border-2 border-purple-100 hover:shadow-2xl transition-shadow duration-300 lg:col-span-2">
                <div className="px-6 py-8 sm:p-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">💧 Liquidity Management</h2>
                  <SimpleLiquidityInterface 
                    miniAMMAddress={miniAMMAddress}
                    tokenXAddress={tokenXAddress}
                    tokenYAddress={tokenYAddress}
                  />
                </div>
              </div>
            </div>
          </div>
        </main>
          </div>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}