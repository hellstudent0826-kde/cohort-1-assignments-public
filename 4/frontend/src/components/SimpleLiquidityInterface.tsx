'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';

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
  const [txHash, setTxHash] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const { writeContract, isPending, error } = useWriteContract();

  // 트랜잭션 상태 확인
  const { data: receipt, isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}`,
    enabled: !!txHash,
  });

  // Hydration mismatch 방지
  useEffect(() => {
    setIsMounted(true);
  }, []);


  // Get reserves
  const { data: reserves, refetch: refetchReserves } = useReadContract({
    address: miniAMMAddress as `0x${string}`,
    abi: MINI_AMM_ABI,
    functionName: 'getReserves',
  });

  // Get LP token address from environment variable
  const lpTokenAddress = process.env.NEXT_PUBLIC_LP_TOKEN_ADDRESS;

  // Get token balances
  const { data: balanceA, refetch: refetchBalanceA } = useReadContract({
    address: tokenXAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address!],
    enabled: !!address,
  });

  const { data: balanceB, refetch: refetchBalanceB } = useReadContract({
    address: tokenYAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address!],
    enabled: !!address,
  });

  // Get LP token balance
  const { data: lpBalance, refetch: refetchLpBalance } = useReadContract({
    address: lpTokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address!],
    enabled: !!address && !!lpTokenAddress,
  });

  // 자동 갱신 (3초마다)
  useEffect(() => {
    const interval = setInterval(() => {
      refetchBalanceA();
      refetchBalanceB();
      refetchLpBalance();
      refetchReserves();
    }, 3000); // 3초마다 자동 갱신

    return () => clearInterval(interval);
  }, [refetchBalanceA, refetchBalanceB, refetchLpBalance, refetchReserves]);

  // 트랜잭션 상태 추적
  useEffect(() => {
    if (isSuccess && receipt) {
      // 잔액 갱신
      setTimeout(() => {
        refetchBalanceA();
        refetchBalanceB();
        refetchLpBalance();
        refetchReserves();
      }, 1000); // 1초 후 갱신
      
      setTxHash(null); // 리셋
    }
  }, [isSuccess, receipt, refetchBalanceA, refetchBalanceB, refetchLpBalance, refetchReserves]);

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
      
      // Convert to Wei
      const amountAWei = BigInt(Math.floor(parseFloat(amountA) * 1e18));
      const amountBWei = BigInt(Math.floor(parseFloat(amountB) * 1e18));

      // Check if first time adding liquidity
      const isFirstTime = !reserves || reserves.length < 2 || (reserves[0] === 0n && reserves[1] === 0n);

      if (!isFirstTime && reserves && reserves.length >= 2) {
        // Check ratio with very strict tolerance (컨트랙트는 1 wei만 허용)
        const xReserve = reserves[0];
        const yReserve = reserves[1];
        const expectedB = (amountAWei * yReserve) / xReserve;
        const tolerance = 1n; // 1 wei tolerance (컨트랙트와 동일)
        const diff = expectedB > amountBWei ? expectedB - amountBWei : amountBWei - expectedB;
        
        
        if (diff > tolerance) {
          const expectedBFormatted = Number(expectedB) / 1e18;
          const actualBFormatted = Number(amountBWei) / 1e18;
            alert(`정확한 비율이 필요합니다! Token B는 정확히 ${expectedBFormatted.toFixed(6)}개가 필요합니다. (입력: ${actualBFormatted.toFixed(6)})`);
          return;
        }
      }

      // Step 1: Approve Token A
      writeContract({
        address: tokenXAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [miniAMMAddress as `0x${string}`, amountAWei]
      }, {
        onSuccess: (hash) => {
          setTxHash(hash);
        },
        onError: (error) => {
          alert(`Token A 승인 실패: ${error.message}`);
        }
      });

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Step 2: Approve Token B
      writeContract({
        address: tokenYAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [miniAMMAddress as `0x${string}`, amountBWei]
      }, {
        onError: (error) => {
          alert(`Token B 승인 실패: ${error.message}`);
        }
      });

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Step 3: Add liquidity
      writeContract({
        address: miniAMMAddress as `0x${string}`,
        abi: MINI_AMM_ABI,
        functionName: 'addLiquidity',
        args: [amountAWei, amountBWei]
      }, {
        onSuccess: (hash) => {
          setTxHash(hash);
        },
        onError: (error) => {
          alert(`유동성 추가 실패: ${error.message}`);
        }
      });

      // Clear inputs
      setAmountA('');
      setAmountB('');
      

    } catch (error) {
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
      
      // 입력값이 Wei인지 일반 단위인지 판단
      const removeAmountWei = removeAmount.includes('.') 
        ? BigInt(Math.floor(parseFloat(removeAmount) * 1e18)) // 일반 단위 (소수점 있음)
        : BigInt(removeAmount); // Wei 단위 (소수점 없음)

      // Check if user has enough LP tokens
      if (!lpBalance || lpBalance < removeAmountWei) {
        alert('LP 토큰 잔액이 부족합니다');
        return;
      }

      // Step 1: Approve LP tokens
      writeContract({
        address: lpTokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [miniAMMAddress as `0x${string}`, removeAmountWei]
      });

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Step 2: Remove liquidity
      writeContract({
        address: miniAMMAddress as `0x${string}`,
        abi: MINI_AMM_ABI,
        functionName: 'removeLiquidity',
        args: [removeAmountWei]
      });

      // Clear input
      setRemoveAmount('');

    } catch (error) {
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
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-gray-800">💰 토큰 잔액</h3>
          <button
            onClick={() => {
              refetchBalanceA();
              refetchBalanceB();
              refetchLpBalance();
              refetchReserves();
            }}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            🔄 갱신
          </button>
        </div>
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
                💡 정확한 비율: Token A {amountA}개 → Token B {(() => {
                  // BigInt를 사용하여 정밀한 계산
                  const amountAWei = BigInt(Math.floor(parseFloat(amountA) * 1e18));
                  const expectedBWei = (amountAWei * reserves[1]) / reserves[0];
                  const expectedB = Number(expectedBWei) / 1e18;
                  return expectedB.toFixed(6); // 6자리로 제한
                })()}개
              </p>
              <button
                type="button"
                onClick={() => {
                  // BigInt를 사용하여 정밀한 계산
                  const amountAWei = BigInt(Math.floor(parseFloat(amountA) * 1e18));
                  const expectedBWei = (amountAWei * reserves[1]) / reserves[0];
                  const expectedB = Number(expectedBWei) / 1e18;
                  setAmountB(expectedB.toFixed(6)); // 6자리로 제한
                }}
                className="mt-1 text-blue-600 hover:text-blue-800 underline text-xs"
              >
                정확한 비율로 설정
              </button>
            </div>
          )}
          
        </div>

        <button
          onClick={handleAddLiquidity}
          disabled={isLoading || !isMounted || !isConnected || isConfirming || isPending}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? '처리 중...' : isPending ? '트랜잭션 전송 중...' : isConfirming ? '트랜잭션 확인 중...' : '유동성 추가'}
        </button>
        
        {txHash && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
            <p className="text-yellow-800">
              🔄 트랜잭션 처리 중... 
              <br />
              <span className="font-mono text-xs break-all">{txHash}</span>
            </p>
          </div>
        )}
        
        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
            <p className="text-red-800">
              ❌ 에러: {error.message}
            </p>
          </div>
        )}
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
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-gray-500">
              💡 보유한 LP 토큰: {formatBalance(lpBalance)} 개
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  // RPC 조회값을 그대로 사용 (Wei 단위)
                  if (lpBalance) {
                    setRemoveAmount(lpBalance.toString());
                  }
                }}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                전체 잔액 사용 (Wei)
              </button>
              <button
                type="button"
                onClick={() => {
                  // 일반 단위로 변환하여 사용
                  if (lpBalance) {
                    const normalAmount = (Number(lpBalance) / 1e18).toString();
                    setRemoveAmount(normalAmount);
                  }
                }}
                className="text-xs text-green-600 hover:text-green-800 underline"
              >
                전체 잔액 사용 (일반)
              </button>
            </div>
          </div>
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
