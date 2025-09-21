'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract } from 'wagmi';

interface SimpleLiquidityInterfaceProps {
  miniAMMAddress: string;
  tokenXAddress: string;
  tokenYAddress: string;
}

// ERC20 ABI (simplified)
const ERC20_ABI = [
  {
    "inputs": [{"name": "spender", "type": "address"}, {"name": "amount", "type": "uint256"}],
    "name": "approve",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// MiniAMM ABI (simplified)
const MINI_AMM_ABI = [
  {
    "inputs": [{"name": "xAmountIn", "type": "uint256"}, {"name": "yAmountIn", "type": "uint256"}],
    "name": "addLiquidity",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getReserves",
    "outputs": [{"name": "xReserve", "type": "uint256"}, {"name": "yReserve", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export function SimpleLiquidityInterface({ 
  miniAMMAddress, 
  tokenXAddress, 
  tokenYAddress 
}: SimpleLiquidityInterfaceProps) {
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const { address, isConnected } = useAccount();
  const { writeContract } = useWriteContract();

  // Hydration mismatch 방지
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get reserves
  const { data: reserves } = useReadContract({
    address: miniAMMAddress as `0x${string}`,
    abi: MINI_AMM_ABI,
    functionName: 'getReserves',
  });

  // Get token balances
  const { data: balanceA } = useReadContract({
    address: tokenXAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address!],
    enabled: !!address,
  });

  const { data: balanceB } = useReadContract({
    address: tokenYAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address!],
    enabled: !!address,
  });

  const handleAddLiquidity = async () => {
    if (!isConnected || !address) {
      alert('지갑을 연결해주세요');
      return;
    }

    if (!amountA || !amountB || parseFloat(amountA) <= 0 || parseFloat(amountB) <= 0) {
      alert('올바른 토큰 양을 입력해주세요');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🚀 Adding liquidity...');
      
      // Convert to Wei
      const amountAWei = BigInt(Math.floor(parseFloat(amountA) * 1e18));
      const amountBWei = BigInt(Math.floor(parseFloat(amountB) * 1e18));

      // Check if first time adding liquidity
      const isFirstTime = !reserves || reserves.length < 2 || (reserves[0] === 0n && reserves[1] === 0n);

      if (!isFirstTime && reserves && reserves.length >= 2) {
        // Check ratio
        const xReserve = reserves[0];
        const yReserve = reserves[1];
        const expectedB = (amountAWei * yReserve) / xReserve;
        const tolerance = expectedB / 100n; // 1% tolerance
        const diff = expectedB > amountBWei ? expectedB - amountBWei : amountBWei - expectedB;
        
        if (diff > tolerance) {
          const expectedBFormatted = Number(expectedB) / 1e18;
          const actualBFormatted = Number(amountBWei) / 1e18;
          alert(`비율이 맞지 않습니다. Token B는 약 ${expectedBFormatted.toFixed(6)}개가 필요합니다. (입력: ${actualBFormatted.toFixed(6)})`);
          return;
        }
      }

      // Step 1: Approve Token A
      console.log('🔐 Approving Token A...');
      writeContract({
        address: tokenXAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [miniAMMAddress as `0x${string}`, amountAWei]
      });

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 2: Approve Token B
      console.log('🔐 Approving Token B...');
      writeContract({
        address: tokenYAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [miniAMMAddress as `0x${string}`, amountBWei]
      });

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 3: Add liquidity
      console.log('💧 Adding liquidity...');
      writeContract({
        address: miniAMMAddress as `0x${string}`,
        abi: MINI_AMM_ABI,
        functionName: 'addLiquidity',
        args: [amountAWei, amountBWei]
      });

      // Clear inputs
      setAmountA('');
      setAmountB('');
      
      alert('유동성 추가 트랜잭션이 전송되었습니다!');

    } catch (error) {
      console.error('❌ Add liquidity failed:', error);
      alert(`유동성 추가 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatBalance = (balance: bigint | undefined) => {
    if (!isMounted || !balance) return '0';
    return (Number(balance) / 1e18).toFixed(6);
  };

  return (
    <div className="space-y-6">
      {/* Token Balances */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2 text-gray-800">💰 토큰 잔액</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-700">Token A (TKA):</span>
            <span className="font-mono text-gray-900">{formatBalance(balanceA)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">Token B (TKB):</span>
            <span className="font-mono text-gray-900">{formatBalance(balanceB)}</span>
          </div>
        </div>
      </div>

      {/* Add Liquidity Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Token A (TKA) 양
          </label>
          <input
            type="number"
            step="0.000001"
            value={amountA}
            onChange={(e) => setAmountA(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            placeholder="0.0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Token B (TKB) 양
          </label>
          <input
            type="number"
            step="0.000001"
            value={amountB}
            onChange={(e) => setAmountB(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            placeholder="0.0"
          />
        </div>

        <button
          onClick={handleAddLiquidity}
          disabled={isLoading || !isMounted || !isConnected}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? '처리 중...' : '유동성 추가'}
        </button>
      </div>

      {/* Current Reserves */}
      {reserves && reserves.length >= 2 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-gray-800">📊 현재 유동성</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-700">Token A Reserve:</span>
              <span className="font-mono text-gray-900">{formatBalance(reserves[0])}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Token B Reserve:</span>
              <span className="font-mono text-gray-900">{formatBalance(reserves[1])}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
