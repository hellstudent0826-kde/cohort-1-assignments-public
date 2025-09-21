'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract } from 'wagmi';

interface SwapInterfaceProps {
  miniAMMAddress: string;
  tokenXAddress: string;
  tokenYAddress: string;
}

// MiniAMM ABI (simplified)
const MINI_AMM_ABI = [
  {
    "inputs": [{"name": "xAmountIn", "type": "uint256"}, {"name": "yAmountIn", "type": "uint256"}],
    "name": "swap",
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

export function SwapInterface({ miniAMMAddress, tokenXAddress, tokenYAddress }: SwapInterfaceProps) {
  const { isConnected } = useAccount();
  const [swapDirection, setSwapDirection] = useState<'AtoB' | 'BtoA'>('AtoB');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [estimatedOutput, setEstimatedOutput] = useState<string>('');
  const [feeAmount, setFeeAmount] = useState<string>('');
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 풀 데이터 조회 (실시간 갱신)
  const { data: reserves } = useReadContract({
    address: miniAMMAddress as `0x${string}`,
    abi: MINI_AMM_ABI,
    functionName: 'getReserves',
  });

  const { writeContract: writeSwap, isPending: isSwapPending, isSuccess: isSwapSuccess } = useWriteContract();
  const { writeContract: writeApprove, isPending: isApprovePending } = useWriteContract();

  // 갱신 확인을 위한 로그
  useEffect(() => {
    if (reserves) {
      const now = new Date().toLocaleTimeString();
      setLastUpdate(now);
    }
  }, [reserves]);

  // 수수료 계산 및 예상 출력량 계산
  useEffect(() => {
    if (amount && parseFloat(amount) > 0) {
      const inputAmount = parseFloat(amount);
      const fee = inputAmount * 0.003; // 0.3% 수수료
      const effectiveInput = inputAmount - fee; // 수수료 차감 후 실제 스왑량
      
      setFeeAmount(fee.toFixed(6));
      
      // 실제 풀의 비율에 따른 정확한 계산
      if (reserves && reserves.length >= 2 && reserves[0] > BigInt(0) && reserves[1] > BigInt(0)) {
        const inputAmountWei = BigInt(Math.floor(effectiveInput * 1e18));
        
        if (swapDirection === 'AtoB') {
          // Token A → Token B: xReserve, yReserve
          const xReserve = reserves[0];
          const yReserve = reserves[1];
          const expectedOutput = (inputAmountWei * yReserve) / xReserve;
          setEstimatedOutput((Number(expectedOutput) / 1e18).toFixed(6));
        } else {
          // Token B → Token A: yReserve, xReserve
          const yReserve = reserves[1];
          const xReserve = reserves[0];
          const expectedOutput = (inputAmountWei * xReserve) / yReserve;
          setEstimatedOutput((Number(expectedOutput) / 1e18).toFixed(6));
        }
      } else {
        // 풀에 유동성이 없거나 데이터가 없는 경우 1:1 비율로 가정
        setEstimatedOutput(effectiveInput.toFixed(6));
      }
    } else {
      setEstimatedOutput('');
      setFeeAmount('');
    }
  }, [amount, swapDirection, reserves]);

  // 성공 시 입력값 초기화
  useEffect(() => {
    if (isSwapSuccess) {
      setAmount('');
      setEstimatedOutput('');
      setFeeAmount('');
    }
  }, [isSwapSuccess]);

  const handleSwap = async () => {
    if (!isConnected || !amount) return;

    setIsLoading(true);
    try {
      const amountWei = BigInt(parseFloat(amount) * 1e18);
      
      // Determine which token to approve
      const tokenAddress = swapDirection === 'AtoB' ? tokenXAddress : tokenYAddress;
      const tokenContract = tokenAddress as `0x${string}`;
      const ammContract = miniAMMAddress as `0x${string}`;

      // First approve the AMM to spend tokens
      await writeApprove({
        address: tokenContract,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [ammContract, amountWei]
      });

      // Then execute the swap
      if (swapDirection === 'AtoB') {
        await writeSwap({
          address: ammContract,
          abi: MINI_AMM_ABI,
          functionName: 'swap',
          args: [amountWei, BigInt(0)]
        });
      } else {
        await writeSwap({
          address: ammContract,
          abi: MINI_AMM_ABI,
          functionName: 'swap',
          args: [BigInt(0), amountWei]
        });
      }
    } catch (error) {
      console.error('Swap failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="text-center text-gray-500">
        Loading...
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="text-center text-gray-500">
        Please connect your wallet to swap tokens
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-lg font-bold text-gray-800 mb-3">
          Swap Direction
        </label>
        <select
          value={swapDirection}
          onChange={(e) => setSwapDirection(e.target.value as 'AtoB' | 'BtoA')}
          className="w-full p-3 text-lg text-gray-900 font-semibold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
        >
          <option value="AtoB">Token A → Token B</option>
          <option value="BtoA">Token B → Token A</option>
        </select>
      </div>

      <div>
        <label className="block text-lg font-bold text-gray-800 mb-3">
          Amount to Swap
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.0"
          step="0.000001"
          className="w-full p-3 text-lg text-gray-900 font-semibold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
        />
        
        {/* 현재 교환비 정보 */}
        {reserves && reserves.length >= 2 && reserves[0] > BigInt(0) && reserves[1] > BigInt(0) && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-sm text-green-800">
              <div className="flex justify-between items-center">
                <span className="font-semibold">💱 Current Exchange Rate:</span>
                <span className="font-mono text-lg">
                  {swapDirection === 'AtoB' 
                    ? `1 A = ${(Number(reserves[1]) / Number(reserves[0])).toFixed(4)} B`
                    : `1 B = ${(Number(reserves[0]) / Number(reserves[1])).toFixed(4)} A`
                  }
                </span>
              </div>
              {lastUpdate && (
                <div className="text-xs text-gray-500 mt-1">
                  🕐 Updated: {lastUpdate}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 수수료 및 예상 출력량 정보 */}
        {amount && parseFloat(amount) > 0 && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-800">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">💱 Swap Details:</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Input Amount:</span>
                  <span className="font-mono">{amount} {swapDirection === 'AtoB' ? 'Token A' : 'Token B'}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Fee (0.3%):</span>
                  <span className="font-mono">-{feeAmount} {swapDirection === 'AtoB' ? 'Token A' : 'Token B'}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Estimated Output:</span>
                  <span className="font-mono">~{estimatedOutput} {swapDirection === 'AtoB' ? 'Token B' : 'Token A'}</span>
                </div>
                <div className="pt-2 border-t border-blue-300">
                  <div className="flex justify-between text-xs text-blue-600">
                    <span>💡 Note:</span>
                    <span>{reserves && reserves.length >= 2 && reserves[0] > BigInt(0) && reserves[1] > BigInt(0) ? 'Using actual pool ratio' : '1:1 ratio assumed (no liquidity)'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleSwap}
        disabled={!amount || isLoading || isSwapPending || isApprovePending}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-lg text-lg font-bold hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200"
      >
        {isLoading || isSwapPending || isApprovePending ? 'Swapping...' : 'Swap Tokens'}
      </button>

      {miniAMMAddress === "0x0000000000000000000000000000000000000000" && (
        <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
          ⚠️ Contract addresses need to be updated after deployment
        </div>
      )}
    </div>
  );
}
