'use client';

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useState, useEffect } from 'react';

// MockERC20 ABI (simplified)
const ERC20_ABI = [
  {
    "inputs": [{"name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "amount", "type": "uint256"}],
    "name": "freeMintToSender",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

interface TokenBalanceProps {
  tokenXAddress: string;
  tokenYAddress: string;
}

export function TokenBalance({ tokenXAddress, tokenYAddress }: TokenBalanceProps) {
  const { address, isConnected } = useAccount();
  const [tokenASymbol, setTokenASymbol] = useState<string>('');
  const [tokenBSymbol, setTokenBSymbol] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [mintTxHash, setMintTxHash] = useState<string | null>(null);
  const [mintAmountA, setMintAmountA] = useState<string>('1000');
  const [mintAmountB, setMintAmountB] = useState<string>('1000');

  const { writeContract: writeMint } = useWriteContract();
  
  // 트랜잭션 확인 대기
  const { data: receipt, isSuccess: isConfirmed, error: receiptError } = useWaitForTransactionReceipt({
    hash: mintTxHash as `0x${string}` | undefined,
    query: {
      enabled: !!mintTxHash,
    }
  });
  
  // 상세한 디버그 로깅
  useEffect(() => {
    console.log('🔍 Transaction Status:', { 
      isMinting, 
      mintTxHash: mintTxHash ? `${mintTxHash.slice(0, 10)}...` : 'None',
      isConfirmed, 
      receiptError: receiptError ? 'Yes' : 'No',
      hasReceipt: !!receipt
    });
    
    if (mintTxHash) {
      console.log('📡 Checking transaction on blockchain...');
    }
    
    if (isConfirmed) {
      console.log('✅ Transaction confirmed on blockchain!');
      console.log('📋 Receipt:', receipt);
    }
    
    if (receiptError) {
      console.log('❌ Transaction failed:', receiptError);
    }
  }, [isMinting, mintTxHash, isConfirmed, receiptError, receipt]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get token A balance with refetch on transaction confirmation
  const { data: tokenABalance, refetch: refetchTokenA } = useReadContract({
    address: tokenXAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address || '0x0000000000000000000000000000000000000000'],
    query: {
      enabled: isConnected && !!tokenXAddress && tokenXAddress !== "0x0000000000000000000000000000000000000000",
      refetchInterval: 5000, // 5초마다 자동 갱신
      refetchOnWindowFocus: true, // 창 포커스 시 갱신
    }
  });

  // Get token B balance with refetch on transaction confirmation
  const { data: tokenBBalance, refetch: refetchTokenB } = useReadContract({
    address: tokenYAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address || '0x0000000000000000000000000000000000000000'],
    query: {
      enabled: isConnected && !!tokenYAddress && tokenYAddress !== "0x0000000000000000000000000000000000000000",
      refetchInterval: 5000, // 5초마다 자동 갱신
      refetchOnWindowFocus: true, // 창 포커스 시 갱신
    }
  });

  // Get token symbols
  const { data: tokenASymbolData } = useReadContract({
    address: tokenXAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'symbol',
    query: {
      enabled: !!tokenXAddress && tokenXAddress !== "0x0000000000000000000000000000000000000000"
    }
  });

  const { data: tokenBSymbolData } = useReadContract({
    address: tokenYAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'symbol',
    query: {
      enabled: !!tokenYAddress && tokenYAddress !== "0x0000000000000000000000000000000000000000"
    }
  });

  useEffect(() => {
    if (tokenASymbolData) setTokenASymbol(tokenASymbolData);
    if (tokenBSymbolData) setTokenBSymbol(tokenBSymbolData);
  }, [tokenASymbolData, tokenBSymbolData]);

  // 트랜잭션 확인 후 갱신
  useEffect(() => {
    if (isConfirmed && receipt) {
      console.log('Transaction confirmed, refetching balances...');
      refetchTokenA();
      refetchTokenB();
      setIsMinting(false);
      setMintTxHash(null);
      alert('✅ Minting successful! Balance updated.');
    }
  }, [isConfirmed, receipt, refetchTokenA, refetchTokenB]);

  // 에러 처리
  useEffect(() => {
    if (receiptError) {
      console.error('Transaction error:', receiptError);
      setIsMinting(false);
      setMintTxHash(null);
      alert(`❌ Transaction failed: ${receiptError.message || 'Unknown error'}`);
    }
  }, [receiptError]);

  const handleMint = async (tokenAddress: string, amount: string) => {
    console.log('Minting started:', { tokenAddress, amount, isConnected });
    
    if (!isConnected) {
      console.log('Wallet not connected');
      alert('Please connect your wallet first');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid amount (positive number)');
      return;
    }

    setIsMinting(true);
    try {
      // 정수 입력을 18자리 소수점으로 변환
      const amountWei = BigInt(Math.floor(amountNum * 1e18));
      console.log('Minting with amountWei:', amountWei.toString());
      console.log('Input amount:', amountNum, '→ Wei:', amountWei.toString());
      
      const result = await writeMint({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'freeMintToSender',
        args: [amountWei]
      });
      
      console.log('Minting transaction sent:', result);
      
      // 트랜잭션 해시 저장 (useWaitForTransactionReceipt가 처리)
      if (typeof result === 'string') {
        setMintTxHash(result);
      } else {
        // 트랜잭션 해시를 받지 못한 경우 즉시 리셋
        setIsMinting(false);
        alert('⚠️ Transaction sent but no hash received');
      }
      
    } catch (error: unknown) {
      console.error('Minting failed:', error);
      alert(`Minting failed: ${error instanceof Error ? error.message : String(error)}`);
      setIsMinting(false);
      setMintTxHash(null);
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
        Please connect your wallet to view token balances
      </div>
    );
  }

  const formatBalance = (balance: bigint | undefined) => {
    if (!balance) return '0';
    return (Number(balance) / 1e18).toFixed(6);
  };

  const resetMintingState = () => {
    setIsMinting(false);
    setMintTxHash(null);
  };

  const checkTransactionManually = async () => {
    if (!mintTxHash) return;
    
    try {
      // 수동으로 트랜잭션 상태 확인
      const response = await fetch('https://coston2-api.flare.network/ext/bc/C/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionReceipt',
          params: [mintTxHash],
          id: 1
        })
      });
      
      const data = await response.json();
      console.log('🔍 Manual check result:', data);
      
      if (data.result) {
        console.log('✅ Transaction found on blockchain!');
        refetchTokenA();
        refetchTokenB();
        setIsMinting(false);
        setMintTxHash(null);
        alert('✅ Transaction confirmed! Balance updated.');
      } else {
        console.log('⏳ Transaction still pending...');
      }
    } catch (error) {
      console.error('❌ Manual check failed:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Debug Info */}
      {(isMinting || mintTxHash) && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-sm text-yellow-800">
            <strong>🔍 Transaction Debug:</strong>
            <br />• Status: {isMinting ? 'Minting...' : 'Waiting...'}
            <br />• TX Hash: {mintTxHash ? `${mintTxHash.slice(0, 10)}...` : 'None'}
            <br />• Confirmed: {isConfirmed ? '✅ Yes' : '⏳ No'}
            <br />• Error: {receiptError ? '❌ Yes' : '✅ No'}
          </div>
          <div className="mt-2 space-x-2">
            <button
              onClick={resetMintingState}
              className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded text-sm hover:bg-yellow-300"
            >
              Reset State
            </button>
            {mintTxHash && (
              <button
                onClick={checkTransactionManually}
                className="px-3 py-1 bg-blue-200 text-blue-800 rounded text-sm hover:bg-blue-300"
              >
                Check Manually
              </button>
            )}
          </div>
        </div>
      )}

      {/* Token A */}
      <div className="p-4 bg-white border-2 border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-center mb-3">
          <span className="font-semibold text-gray-800 text-lg">{tokenASymbol || 'Token A'}</span>
          <span className="text-xl font-mono font-bold text-blue-600">{formatBalance(tokenABalance)}</span>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mint Amount (정수 입력)
            </label>
            <input
              type="number"
              value={mintAmountA}
              onChange={(e) => setMintAmountA(e.target.value)}
              placeholder="1000"
              min="1"
              step="1"
              className="w-full p-2 text-sm text-gray-900 font-semibold border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 정수로 입력하면 자동으로 18자리 소수점이 추가됩니다
            </p>
          </div>
          
          <button
            onClick={() => handleMint(tokenXAddress, mintAmountA)}
            disabled={!isConnected || isMinting || !mintAmountA || parseFloat(mintAmountA) <= 0}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isMinting ? (mintTxHash ? 'Confirming...' : 'Minting...') : `Mint ${mintAmountA} Token A`}
          </button>
        </div>
      </div>

      {/* Token B */}
      <div className="p-4 bg-white border-2 border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-center mb-3">
          <span className="font-semibold text-gray-800 text-lg">{tokenBSymbol || 'Token B'}</span>
          <span className="text-xl font-mono font-bold text-green-600">{formatBalance(tokenBBalance)}</span>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mint Amount (정수 입력)
            </label>
            <input
              type="number"
              value={mintAmountB}
              onChange={(e) => setMintAmountB(e.target.value)}
              placeholder="1000"
              min="1"
              step="1"
              className="w-full p-2 text-sm text-gray-900 font-semibold border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 정수로 입력하면 자동으로 18자리 소수점이 추가됩니다
            </p>
          </div>
          
          <button
            onClick={() => handleMint(tokenYAddress, mintAmountB)}
            disabled={!isConnected || isMinting || !mintAmountB || parseFloat(mintAmountB) <= 0}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isMinting ? (mintTxHash ? 'Confirming...' : 'Minting...') : `Mint ${mintAmountB} Token B`}
          </button>
        </div>
      </div>
    </div>
  );
}
