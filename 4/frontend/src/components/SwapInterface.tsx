'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

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
  const { address, isConnected } = useAccount();
  const [swapDirection, setSwapDirection] = useState<'AtoB' | 'BtoA'>('AtoB');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [estimatedOutput, setEstimatedOutput] = useState<string>('');
  const [feeAmount, setFeeAmount] = useState<string>('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 수수료 계산 및 예상 출력량 계산
  useEffect(() => {
    if (amount && parseFloat(amount) > 0) {
      const inputAmount = parseFloat(amount);
      const fee = inputAmount * 0.003; // 0.3% 수수료
      const effectiveInput = inputAmount - fee; // 수수료 차감 후 실제 스왑량
      
      setFeeAmount(fee.toFixed(6));
      
      // 간단한 1:1 비율 가정 (실제로는 풀의 현재 비율에 따라 달라짐)
      // 실제 구현에서는 풀의 reserves를 확인해서 정확한 계산을 해야 함
      setEstimatedOutput(effectiveInput.toFixed(6));
    } else {
      setEstimatedOutput('');
      setFeeAmount('');
    }
  }, [amount, swapDirection]);

  const { writeContract: writeSwap } = useWriteContract();
  const { writeContract: writeApprove } = useWriteContract();

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
          args: [amountWei, 0n]
        });
      } else {
        await writeSwap({
          address: ammContract,
          abi: MINI_AMM_ABI,
          functionName: 'swap',
          args: [0n, amountWei]
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
                    <span>💡 Why not 1:1?</span>
                    <span>0.3% swap fee applied</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleSwap}
        disabled={!amount || isLoading}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-lg text-lg font-bold hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200"
      >
        {isLoading ? 'Swapping...' : 'Swap Tokens'}
      </button>

      {miniAMMAddress === "0x0000000000000000000000000000000000000000" && (
        <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
          ⚠️ Contract addresses need to be updated after deployment
        </div>
      )}
    </div>
  );
}
