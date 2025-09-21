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
    "inputs": [{"name": "lpAmount", "type": "uint256"}],
    "name": "removeLiquidity",
    "outputs": [{"name": "xAmount", "type": "uint256"}, {"name": "yAmount", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getReserves",
    "outputs": [{"name": "xReserve", "type": "uint256"}, {"name": "yReserve", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getLPTokenAddress",
    "outputs": [{"name": "", "type": "address"}],
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
  const [removeAmount, setRemoveAmount] = useState('');
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

  // Get LP token address
  const { data: lpTokenAddress } = useReadContract({
    address: miniAMMAddress as `0x${string}`,
    abi: MINI_AMM_ABI,
    functionName: 'getLPTokenAddress',
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

  // Get LP token balance
  const { data: lpBalance } = useReadContract({
    address: lpTokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address!],
    enabled: !!address && !!lpTokenAddress,
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
        // Check ratio with more tolerance
        const xReserve = reserves[0];
        const yReserve = reserves[1];
        const expectedB = (amountAWei * yReserve) / xReserve;
        const tolerance = expectedB / 10n; // 10% tolerance (더 관대하게)
        const diff = expectedB > amountBWei ? expectedB - amountBWei : amountBWei - expectedB;
        
        console.log('🔍 비율 검증:', {
          amountA: Number(amountAWei) / 1e18,
          amountB: Number(amountBWei) / 1e18,
          xReserve: Number(xReserve) / 1e18,
          yReserve: Number(yReserve) / 1e18,
          expectedB: Number(expectedB) / 1e18,
          tolerance: Number(tolerance) / 1e18,
          diff: Number(diff) / 1e18
        });
        
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

  const handleRemoveLiquidity = async () => {
    if (!isConnected || !address) {
      alert('지갑을 연결해주세요');
      return;
    }

    if (!removeAmount || parseFloat(removeAmount) <= 0) {
      alert('올바른 LP 토큰 양을 입력해주세요');
      return;
    }

    if (!lpTokenAddress) {
      alert('LP 토큰 주소를 찾을 수 없습니다');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔥 Removing liquidity...');
      
      // Convert to Wei
      const removeAmountWei = BigInt(Math.floor(parseFloat(removeAmount) * 1e18));

      // Check if user has enough LP tokens
      if (!lpBalance || lpBalance < removeAmountWei) {
        alert('LP 토큰 잔액이 부족합니다');
        return;
      }

      // Step 1: Approve LP tokens
      console.log('🔐 Approving LP tokens...');
      writeContract({
        address: lpTokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [miniAMMAddress as `0x${string}`, removeAmountWei]
      });

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 2: Remove liquidity
      console.log('🔥 Removing liquidity...');
      writeContract({
        address: miniAMMAddress as `0x${string}`,
        abi: MINI_AMM_ABI,
        functionName: 'removeLiquidity',
        args: [removeAmountWei]
      });

      // Clear input
      setRemoveAmount('');
      
      alert('유동성 제거 트랜잭션이 전송되었습니다!');

    } catch (error) {
      console.error('❌ Remove liquidity failed:', error);
      alert(`유동성 제거 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
          <div className="flex justify-between">
            <span className="text-gray-700">LP Token:</span>
            <span className="font-mono text-gray-900">{formatBalance(lpBalance)}</span>
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
          {/* 비율 제안 */}
          {amountA && parseFloat(amountA) > 0 && reserves && reserves.length >= 2 && reserves[0] !== 0n && reserves[1] !== 0n && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
              <p className="text-blue-800">
                💡 권장 비율: Token A {amountA}개 → Token B {((parseFloat(amountA) * Number(reserves[1]) / Number(reserves[0]))).toFixed(6)}개
              </p>
              <button
                type="button"
                onClick={() => setAmountB(((parseFloat(amountA) * Number(reserves[1]) / Number(reserves[0]))).toFixed(6))}
                className="mt-1 text-blue-600 hover:text-blue-800 underline text-xs"
              >
                권장 비율로 설정
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleAddLiquidity}
          disabled={isLoading || !isMounted || !isConnected}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? '처리 중...' : '유동성 추가'}
        </button>
      </div>

      {/* Remove Liquidity Form */}
      <div className="space-y-4 border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-800">🔥 유동성 제거</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            LP Token 양 (제거할 양)
          </label>
          <input
            type="number"
            step="0.000001"
            value={removeAmount}
            onChange={(e) => setRemoveAmount(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
            placeholder="0.0"
          />
          <p className="text-xs text-gray-500 mt-1">
            💡 보유한 LP 토큰: {formatBalance(lpBalance)} 개
          </p>
        </div>

        <button
          onClick={handleRemoveLiquidity}
          disabled={isLoading || !isMounted || !isConnected || !removeAmount || parseFloat(removeAmount) <= 0}
          className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? '처리 중...' : '유동성 제거'}
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
