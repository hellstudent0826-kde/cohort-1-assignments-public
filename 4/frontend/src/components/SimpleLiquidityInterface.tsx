'use client';

import { useState, useEffect, useCallback } from 'react';
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
  // 모드 상태 관리 - 유동성 존재 여부에 따라 자동 선택
  const [liquidityMode, setLiquidityMode] = useState<'initial' | 'additional'>('initial');
  
  // 최초 유동성 공급용 상태
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  
  // 기존 유동성 추가용 상태
  const [liquidityPercentage, setLiquidityPercentage] = useState(0); // 0-100%
  
  // 공통 상태
  const [removalPercentage, setRemovalPercentage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  
  // 승인 상태 관리
  const [approveAHash, setApproveAHash] = useState<string | null>(null);
  const [approveBHash, setApproveBHash] = useState<string | null>(null);
  const [pendingLiquidityAmounts, setPendingLiquidityAmounts] = useState<{amountA: bigint, amountB: bigint} | null>(null);

  const { address, isConnected } = useAccount();
  const { writeContract, isPending, error } = useWriteContract();

  // 트랜잭션 상태 확인
  const { data: receipt, isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}`,
  });

  // 승인 트랜잭션 완료 확인
  const { data: receiptA, isLoading: isApprovingA } = useWaitForTransactionReceipt({
    hash: approveAHash as `0x${string}`,
  });

  const { data: receiptB, isLoading: isApprovingB } = useWaitForTransactionReceipt({
    hash: approveBHash as `0x${string}`,
  });

  // Get reserves
  const { data: reserves, refetch: refetchReserves } = useReadContract({
    address: miniAMMAddress as `0x${string}`,
    abi: MINI_AMM_ABI,
    functionName: 'getReserves',
  });

  // 유동성 존재 여부 판단
  const hasLiquidity = reserves && reserves.length >= 2 && reserves[0] > BigInt(0) && reserves[1] > BigInt(0);

  // Hydration mismatch 방지
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 유동성 상태에 따라 모드 자동 설정
  useEffect(() => {
    if (hasLiquidity && liquidityMode === 'initial') {
      // 유동성이 있는데 최초 모드로 되어있으면 기존 모드로 변경
      setLiquidityMode('additional');
    } else if (!hasLiquidity && liquidityMode === 'additional') {
      // 유동성이 없는데 기존 모드로 되어있으면 최초 모드로 변경
      setLiquidityMode('initial');
    }
  }, [hasLiquidity, liquidityMode]);

  // 승인 완료 후 유동성 추가 실행
  const addLiquidityAfterApproval = useCallback(async () => {
    if (!pendingLiquidityAmounts) return;

    // 유동성 추가 시작 시 로딩 상태 설정
    setIsLoading(true);

    try {
      console.log('유동성 추가 시작:', {
        amountA: pendingLiquidityAmounts.amountA.toString(),
        amountB: pendingLiquidityAmounts.amountB.toString()
      });

      writeContract({
        address: miniAMMAddress as `0x${string}`,
        abi: MINI_AMM_ABI,
        functionName: 'addLiquidity',
        args: [pendingLiquidityAmounts.amountA, pendingLiquidityAmounts.amountB]
      }, {
        onSuccess: (hash) => {
          setTxHash(hash);
          console.log('유동성 추가 트랜잭션 전송됨:', hash);
        },
        onError: (error) => {
          alert(`유동성 추가 실패: ${error.message}`);
          console.error('유동성 추가 실패:', error);
        }
      });

      // 상태 초기화
      setPendingLiquidityAmounts(null);
      setApproveAHash(null);
      setApproveBHash(null);

      // 입력값 초기화
      if (liquidityMode === 'initial') {
        setAmountA('');
        setAmountB('');
      } else {
        setLiquidityPercentage(0);
      }

    } catch (error) {
      console.error('유동성 추가 중 오류:', error);
      alert(`유동성 추가 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [pendingLiquidityAmounts, miniAMMAddress, writeContract, liquidityMode]);

  // 승인 완료 후 자동으로 유동성 추가 실행
  useEffect(() => {
    if (receiptA && receiptB && pendingLiquidityAmounts && !isLoading) {
      console.log('두 승인이 모두 완료되었습니다. 유동성 추가를 시작합니다...');
      addLiquidityAfterApproval();
    }
  }, [receiptA, receiptB, pendingLiquidityAmounts, isLoading, addLiquidityAfterApproval]);

  // Get LP token address from environment variable
  const lpTokenAddress = process.env.NEXT_PUBLIC_LP_TOKEN_ADDRESS;

  // Get token balances
  const { data: balanceA, refetch: refetchBalanceA } = useReadContract({
    address: tokenXAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address!],
  });

  const { data: balanceB, refetch: refetchBalanceB } = useReadContract({
    address: tokenYAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address!],
  });

  // Get LP token balance
  const { data: lpBalance, refetch: refetchLpBalance } = useReadContract({
    address: lpTokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address!],
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
      if (liquidityMode === 'initial') {
        setAmountA('');
        setAmountB('');
      } else {
        setLiquidityPercentage(0);
      }
      setRemovalPercentage(0);
      
      setTxHash(null); // 리셋
    }
  }, [isSuccess, receipt, refetchBalanceA, refetchBalanceB, refetchLpBalance, refetchReserves, liquidityMode]);

  const handleAddLiquidity = async () => {
    if (!isConnected || !address) {
      alert('지갑을 연결해주세요');
      return;
    }

    setIsLoading(true);

    try {
      let addAmountAWei: bigint;
      let addAmountBWei: bigint;

      if (liquidityMode === 'initial') {
        // 최초 유동성 공급 모드: 사용자가 직접 입력한 값 사용
        if (!amountA || !amountB || parseFloat(amountA) <= 0 || parseFloat(amountB) <= 0) {
          alert('토큰 양을 입력해주세요');
          setIsLoading(false);
          return;
        }

        addAmountAWei = BigInt(Math.round(parseFloat(amountA) * 1e18));
        addAmountBWei = BigInt(Math.round(parseFloat(amountB) * 1e18));

        // 잔액 확인
        if (addAmountAWei > balanceA! || addAmountBWei > balanceB!) {
          alert('잔액이 부족합니다');
          setIsLoading(false);
          return;
        }
      } else {
        // 기존 유동성 추가 모드: 슬라이드 기반으로 계산
        if (liquidityPercentage <= 0 || !balanceA || !balanceB) {
          alert('유동성 추가 비율을 설정해주세요');
          setIsLoading(false);
          return;
        }

        const maxAmountA = Number(balanceA) / 1e18;
        const addAmountA = (maxAmountA * liquidityPercentage) / 100;
        addAmountAWei = BigInt(Math.round(addAmountA * 1e18));
        
        // Token B 양은 현재 풀 비율에 따라 계산
        if (reserves && reserves.length >= 2 && reserves[0] > BigInt(0) && reserves[1] > BigInt(0)) {
          addAmountBWei = (addAmountAWei * reserves[1]) / reserves[0];
        } else {
          // 첫 번째 유동성 추가인 경우 1:1 비율로 가정
          addAmountBWei = addAmountAWei;
        }
      }

      // Step 1: Approve Token A
      await new Promise<string>((resolve, reject) => {
        writeContract({
          address: tokenXAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [miniAMMAddress as `0x${string}`, addAmountAWei]
        }, {
          onSuccess: (hash) => {
            setApproveAHash(hash);
            setTxHash(hash);
            resolve(hash);
          },
          onError: (error) => {
            alert(`Token A 승인 실패: ${error.message}`);
            reject(error);
          }
        });
      });

      // Step 2: Approve Token B
      await new Promise<string>((resolve, reject) => {
        writeContract({
          address: tokenYAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [miniAMMAddress as `0x${string}`, addAmountBWei]
        }, {
          onSuccess: (hash) => {
            setApproveBHash(hash);
            setTxHash(hash);
            resolve(hash);
          },
          onError: (error) => {
            alert(`Token B 승인 실패: ${error.message}`);
            reject(error);
          }
        });
      });

      // Step 3: 승인 완료를 기다리기 위해 유동성 추가 정보 저장
      setPendingLiquidityAmounts({
        amountA: addAmountAWei,
        amountB: addAmountBWei
      });

      console.log('승인 트랜잭션 전송 완료. 승인 완료를 기다리는 중...');
      
      // 승인 트랜잭션 전송 완료 후 로딩 상태 해제
      setIsLoading(false);

    } catch (error) {
      alert(`승인 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      if (!lpBalance || lpBalance === BigInt(0)) {
        alert('제거할 LP 토큰이 없습니다');
        return;
      }
      
      if (removalPercentage <= 0) {
        alert('제거 비율을 설정해주세요');
        return;
      }
      
      // 퍼센트에 따른 제거할 양 계산
      const removeAmountWei = (lpBalance * BigInt(removalPercentage)) / BigInt(100);

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

        {/* Add Liquidity Form - Dual Mode */}
        <div className="space-y-4">
          {/* 유동성 상태 표시 */}
          <div className={`p-4 rounded-lg border-2 ${
            hasLiquidity 
              ? 'bg-green-50 border-green-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className={`text-2xl mr-3 ${hasLiquidity ? 'text-green-600' : 'text-yellow-600'}`}>
                  {hasLiquidity ? '✅' : '⚠️'}
                </span>
                <div>
                  <div className={`font-semibold ${hasLiquidity ? 'text-green-800' : 'text-yellow-800'}`}>
                    {hasLiquidity ? '유동성이 존재합니다' : '유동성이 없습니다'}
                  </div>
                  <div className={`text-sm ${hasLiquidity ? 'text-green-600' : 'text-yellow-600'}`}>
                    {hasLiquidity 
                      ? '기존 유동성 추가 모드를 사용하세요' 
                      : '최초 유동성 공급 모드를 사용하세요'
                    }
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-xs ${hasLiquidity ? 'text-green-600' : 'text-yellow-600'}`}>
                  {hasLiquidity ? '추천 모드' : '필수 모드'}
                </div>
                <div className={`text-sm font-medium ${hasLiquidity ? 'text-green-800' : 'text-yellow-800'}`}>
                  {hasLiquidity ? '기존 유동성 추가' : '최초 유동성 공급'}
                </div>
              </div>
            </div>
          </div>

          {/* 모드 선택 - 탭 형태 */}
          <div className="bg-white border border-gray-200 rounded-lg p-1 mb-6 shadow-sm">
            <nav className="flex space-x-1">
              <button
                onClick={() => setLiquidityMode('initial')}
                disabled={false}
                className={`flex-1 py-3 px-4 rounded-md font-medium text-sm transition-all duration-200 ${
                  liquidityMode === 'initial'
                    ? 'bg-gray-700 text-white shadow-md'
                    : 'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                } ${!hasLiquidity ? 'ring-2 ring-yellow-400' : ''}`}
              >
                <div className="flex items-center justify-center">
                  <span className="mr-2">🆕</span>
                  <span>최초 유동성 공급</span>
                  {!hasLiquidity && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                      권장
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setLiquidityMode('additional')}
                disabled={!hasLiquidity}
                className={`flex-1 py-3 px-4 rounded-md font-medium text-sm transition-all duration-200 ${
                  liquidityMode === 'additional'
                    ? 'bg-gray-700 text-white shadow-md'
                    : hasLiquidity
                      ? 'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                } ${hasLiquidity ? 'ring-2 ring-green-400' : ''}`}
              >
                <div className="flex items-center justify-center">
                  <span className="mr-2">➕</span>
                  <span>기존 유동성 추가</span>
                  {hasLiquidity && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                      권장
                    </span>
                  )}
                  {!hasLiquidity && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">
                      불가능
                    </span>
                  )}
                </div>
              </button>
            </nav>
          </div>

          {/* 탭 콘텐츠 영역 */}
          <div className="mt-6">
            {liquidityMode === 'initial' ? (
              /* 최초 유동성 공급 모드 - 직접 입력 */
              <div className="space-y-4">
                <div className={`rounded-lg p-4 ${
                  !hasLiquidity 
                    ? 'bg-yellow-50 border border-yellow-200' 
                    : 'bg-blue-50 border border-blue-200'
                }`}>
                  <div className="flex items-center">
                    <span className={`mr-2 ${!hasLiquidity ? 'text-yellow-600' : 'text-blue-600'}`}>
                      {!hasLiquidity ? '⚠️' : 'ℹ️'}
                    </span>
                    <span className={`text-sm ${!hasLiquidity ? 'text-yellow-800' : 'text-blue-800'}`}>
                      {!hasLiquidity 
                        ? '최초 유동성 공급: 원하는 비율로 토큰을 직접 입력하세요'
                        : '최초 유동성 공급 모드: 원하는 비율로 토큰을 직접 입력하세요 (기존 유동성이 있어도 가능)'
                      }
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Token A 양
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.000001"
                        min="0"
                        value={amountA}
                        onChange={(e) => setAmountA(e.target.value)}
                        placeholder="0.0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="absolute right-3 top-2 text-sm text-gray-500">
                        보유: {formatBalance(balanceA)}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Token B 양
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.000001"
                        min="0"
                        value={amountB}
                        onChange={(e) => setAmountB(e.target.value)}
                        placeholder="0.0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="absolute right-3 top-2 text-sm text-gray-500">
                        보유: {formatBalance(balanceB)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 미리보기 */}
                {amountA && amountB && parseFloat(amountA) > 0 && parseFloat(amountB) > 0 && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-sm text-green-800">
                      <div className="font-semibold mb-2">💧 추가될 유동성:</div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Token A:</span>
                          <span className="font-mono">{amountA}개</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Token B:</span>
                          <span className="font-mono">{amountB}개</span>
                        </div>
                        <div className="flex justify-between text-xs text-green-600">
                          <span>비율:</span>
                          <span className="font-mono">
                            1 : {(parseFloat(amountB) / parseFloat(amountA)).toFixed(6)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* 기존 유동성 추가 모드 - 슬라이드 */
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <span className="text-blue-600 mr-2">ℹ️</span>
                    <span className="text-sm text-blue-800">
                      기존 유동성 추가: 현재 풀 비율에 맞춰 자동 계산됩니다
                    </span>
                  </div>
                </div>

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
                {liquidityPercentage > 0 && balanceA && balanceB && reserves && reserves.length >= 2 && reserves[0] > BigInt(0) && reserves[1] > BigInt(0) && (
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
            )}
          </div>

          <button
            onClick={handleAddLiquidity}
            disabled={isLoading || !isMounted || !isConnected || isConfirming || isPending || isApprovingA || isApprovingB}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? '처리 중...' : 
             isApprovingA ? 'Token A 승인 중...' :
             isApprovingB ? 'Token B 승인 중...' :
             isPending ? '트랜잭션 전송 중...' : 
             isConfirming ? '트랜잭션 확인 중...' : 
             liquidityMode === 'initial' ? '최초 유동성 공급' : '유동성 추가'}
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
                    {lpBalance ? formatBalance((lpBalance * BigInt(removalPercentage)) / BigInt(100)) : '0'} LP
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
    </div>
  );
}