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
  const [liquidityPercentage, setLiquidityPercentage] = useState(0); // 0-100%
  const [removalPercentage, setRemovalPercentage] = useState(0);
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
      
      // 입력값 초기화
      setAmountA('');
      setAmountB('');
      setRemovalPercentage(0);
      
      setTxHash(null); // 리셋
    }
  }, [isSuccess, receipt, refetchBalanceA, refetchBalanceB, refetchLpBalance, refetchReserves]);

  const handleAddLiquidity = async () => {
    if (!isConnected || !address) {
      alert('지갑을 연결해주세요');
      return;
    }

    if (liquidityPercentage <= 0 || !balanceA || !balanceB) {
      alert('유동성 추가 비율을 설정해주세요');
      return;
    }

    setIsLoading(true);

    try {
      // 슬라이드 기반으로 실제 토큰 양 계산
      const maxAmountA = Number(balanceA) / 1e18;
      const addAmountA = (maxAmountA * liquidityPercentage) / 100;
      const addAmountAWei = BigInt(Math.round(addAmountA * 1e18));
      
      // Token B 양은 현재 풀 비율에 따라 계산
      let addAmountBWei: bigint;
      if (reserves && reserves.length >= 2 && reserves[0] > 0n && reserves[1] > 0n) {
        addAmountBWei = (addAmountAWei * reserves[1]) / reserves[0];
      } else {
        // 첫 번째 유동성 추가인 경우 1:1 비율로 가정
        addAmountBWei = addAmountAWei;
      }

      // 슬라이드 기반이므로 비율 검증 불필요 (자동으로 정확한 비율 계산됨)

      // Step 1: Approve Token A
      writeContract({
        address: tokenXAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [miniAMMAddress as `0x${string}`, addAmountAWei]
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
        args: [miniAMMAddress as `0x${string}`, addAmountBWei]
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
        args: [addAmountAWei, addAmountBWei]
      }, {
        onSuccess: (hash) => {
          setTxHash(hash);
        },
        onError: (error) => {
          alert(`유동성 추가 실패: ${error.message}`);
        }
      });

      // Clear inputs
      setLiquidityPercentage(0);
      

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
    if (!lpTokenAddress) {
      alert('LP 토큰 주소를 찾을 수 없습니다');
      return;
    }

    setIsLoading(true);

    try {
      // 퍼센트 기반으로 제거할 양 계산
      if (!lpBalance || lpBalance === 0n) {
        alert('제거할 LP 토큰이 없습니다');
        return;
      }
      
      if (removalPercentage <= 0) {
        alert('제거 비율을 설정해주세요');
        return;
      }
      
      // 퍼센트에 따른 제거할 양 계산
      const removeAmountWei = (lpBalance * BigInt(removalPercentage)) / 100n;

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

      // Reset percentage to 0%
      setRemovalPercentage(0);

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

      <div className="space-y-4">
        {/* Current Liquidity Info */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-end items-center mb-2">
            <button
              onClick={() => {
                refetchReserves();
                refetchLpBalance();
              }}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              🔄 갱신
            </button>
          </div>
          <div className="space-y-2">
            {reserves && reserves.length >= 2 ? (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-700">Token A Reserve:</span>
                  <span className="font-mono text-gray-900">{formatBalance(reserves[0])}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Token B Reserve:</span>
                  <span className="font-mono text-gray-900">{formatBalance(reserves[1])}</span>
                </div>
              </>
            ) : (
              <div className="text-gray-500 text-sm">유동성이 없습니다</div>
            )}
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-700">LP Token:</span>
              <span className="font-mono text-gray-900">{formatBalance(lpBalance)}</span>
            </div>
          </div>
        </div>

        {/* Add Liquidity Form - Slider Based */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              유동성 추가 비율
            </label>
            <div className="space-y-3">
              <input
                type="range"
                min="0"
                max={balanceA ? Math.min(100, Math.floor((Number(balanceA) / 1e18) * 100)) : 100}
                value={liquidityPercentage}
                onChange={(e) => setLiquidityPercentage(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${liquidityPercentage}%, #e5e7eb ${liquidityPercentage}%, #e5e7eb 100%)`
                }}
              />
              <div className="flex justify-between items-center">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={liquidityPercentage}
                  onChange={(e) => setLiquidityPercentage(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded text-center text-gray-900"
                />
                <span className="text-sm text-gray-600">%</span>
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setLiquidityPercentage(25)}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  25%
                </button>
                <button
                  type="button"
                  onClick={() => setLiquidityPercentage(50)}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => setLiquidityPercentage(75)}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  75%
                </button>
                <button
                  type="button"
                  onClick={() => setLiquidityPercentage(100)}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  100%
                </button>
              </div>
            </div>
          </div>

          {/* 계산된 토큰 양 표시 */}
          {liquidityPercentage > 0 && balanceA && balanceB && reserves && reserves.length >= 2 && reserves[0] > 0n && reserves[1] > 0n && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-800">
                <div className="font-semibold mb-2">💧 추가될 유동성:</div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Token A:</span>
                    <span className="font-mono">
                      {(() => {
                        const maxAmountA = Number(balanceA) / 1e18;
                        const addAmountA = (maxAmountA * liquidityPercentage) / 100;
                        return addAmountA.toFixed(6);
                      })()}개
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Token B:</span>
                    <span className="font-mono">
                      {(() => {
                        const maxAmountA = Number(balanceA) / 1e18;
                        const addAmountA = (maxAmountA * liquidityPercentage) / 100;
                        const addAmountAWei = BigInt(Math.round(addAmountA * 1e18));
                        const expectedBWei = (addAmountAWei * reserves[1]) / reserves[0];
                        return (Number(expectedBWei) / 1e18).toFixed(6);
                      })()}개
                    </span>
                  </div>
                </div>
              </div>
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            유동성 제거 비율
          </label>
          
          {/* 퍼센트 슬라이더 */}
          <div className="space-y-3">
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="0"
                max="100"
                value={removalPercentage}
                onChange={(e) => setRemovalPercentage(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${removalPercentage}%, #e5e7eb ${removalPercentage}%, #e5e7eb 100%)`
                }}
              />
              <div className="w-16 text-center">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={removalPercentage}
                  onChange={(e) => setRemovalPercentage(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-center text-gray-900"
                />
                <span className="text-xs text-gray-500">%</span>
              </div>
            </div>
            
            {/* 미리보기 */}
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">제거할 LP 토큰</span>
                <span className="font-mono text-sm text-gray-900">
                  {lpBalance ? formatBalance((lpBalance * BigInt(removalPercentage)) / 100n) : '0'} LP
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>보유량: {formatBalance(lpBalance)} LP</span>
                <span>{removalPercentage}% 제거</span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-gray-500">
              💡 슬라이더를 조절하여 제거 비율을 설정하세요
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRemovalPercentage(25)}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                25%
              </button>
              <button
                type="button"
                onClick={() => setRemovalPercentage(50)}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                50%
              </button>
              <button
                type="button"
                onClick={() => setRemovalPercentage(100)}
                className="text-xs text-green-600 hover:text-green-800 underline"
              >
                100%
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={handleRemoveLiquidity}
          disabled={isLoading || !isMounted || !isConnected || removalPercentage <= 0}
          className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? '처리 중...' : `${removalPercentage}% 유동성 제거`}
        </button>

      </div>
    </div>
  );
}
