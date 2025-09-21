'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { readContract } from '@wagmi/core';
import { config } from '../lib/wagmi';

interface LiquidityInterfaceProps {
  miniAMMAddress: string;
  tokenXAddress: string;
  tokenYAddress: string;
}

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
    "name": "getK",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getLPTokenAddress",
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "xAmount", "type": "uint256"}],
    "name": "getRequiredYAmount",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "yAmount", "type": "uint256"}],
    "name": "getRequiredXAmount",
    "outputs": [{"name": "", "type": "uint256"}],
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
  }
] as const;

export function LiquidityInterface({ miniAMMAddress, tokenXAddress, tokenYAddress }: LiquidityInterfaceProps) {
  const { address, isConnected } = useAccount();
  const [action, setAction] = useState<'add' | 'remove'>('add');
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [lpAmount, setLpAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [currentRatio, setCurrentRatio] = useState<number | null>(null);
  // const [lpTokenBalance, setLpTokenBalance] = useState<bigint>(BigInt(0)); // 사용하지 않음
  const [addLiquidityTxHash, setAddLiquidityTxHash] = useState<string | null>(null);
  const [removeLiquidityTxHash, setRemoveLiquidityTxHash] = useState<string | null>(null);
  const [initialLiquidity, setInitialLiquidity] = useState<{tokenA: number, tokenB: number} | null>(null);

  // 풀 상태 확인
  const { data: reserves, refetch: refetchReserves } = useReadContract({
    address: miniAMMAddress as `0x${string}`,
    abi: MINI_AMM_ABI,
    functionName: 'getReserves',
    query: {
      enabled: isConnected && !!miniAMMAddress,
      refetchInterval: 5000,
    }
  });

  const { data: k, refetch: refetchK } = useReadContract({
    address: miniAMMAddress as `0x${string}`,
    abi: MINI_AMM_ABI,
    functionName: 'getK',
    query: {
      enabled: isConnected && !!miniAMMAddress,
      refetchInterval: 5000,
    }
  });

  // LP 토큰 잔액 확인
  const { data: lpTokenAddress, refetch: refetchLpTokenAddress } = useReadContract({
    address: miniAMMAddress as `0x${string}`,
    abi: MINI_AMM_ABI,
    functionName: 'getLPTokenAddress',
    query: {
      enabled: isConnected && !!miniAMMAddress,
    }
  });

  const { data: lpBalance, refetch: refetchLpBalance } = useReadContract({
    address: lpTokenAddress as `0x${string}`,
    abi: [
      {
        "inputs": [{"name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "totalSupply",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      }
    ],
    functionName: 'balanceOf',
    args: [address || '0x0000000000000000000000000000000000000000'],
    query: {
      enabled: isConnected && !!lpTokenAddress && !!address,
      refetchInterval: 5000,
    }
  });

  const { data: lpTotalSupply, refetch: refetchLpTotalSupply } = useReadContract({
    address: lpTokenAddress as `0x${string}`,
    abi: [
      {
        "inputs": [],
        "name": "totalSupply",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      }
    ],
    functionName: 'totalSupply',
    query: {
      enabled: isConnected && !!lpTokenAddress,
      refetchInterval: 5000,
    }
  });

  const { writeContract: writeAddLiquidity } = useWriteContract();
  const { writeContract: writeRemoveLiquidity } = useWriteContract();
  const { writeContract: writeApprove, isPending: isApprovePending } = useWriteContract();

  // 트랜잭션 확인 대기
  const { data: addLiquidityReceipt, isSuccess: addLiquidityConfirmed } = useWaitForTransactionReceipt({
    hash: addLiquidityTxHash as `0x${string}` | undefined,
    query: {
      enabled: !!addLiquidityTxHash,
    }
  });

  const { data: removeLiquidityReceipt, isSuccess: removeLiquidityConfirmed } = useWaitForTransactionReceipt({
    hash: removeLiquidityTxHash as `0x${string}` | undefined,
    query: {
      enabled: !!removeLiquidityTxHash,
    }
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 풀 상태에 따른 비율 계산
  useEffect(() => {
    if (reserves && reserves.length >= 2) {
      const [xReserve, yReserve] = reserves;
              const hasLiquidity = k && k > BigInt(0);
      
      setIsFirstTime(!hasLiquidity);
      
      if (hasLiquidity && xReserve > BigInt(0)) {
        const ratio = Number(yReserve) / Number(xReserve);
        setCurrentRatio(ratio);
        
        // 초기 유동성 공급량이 설정되지 않은 경우
        // 실제 수수료 수익을 계산하기 위해서는 정확한 초기값이 필요
        // 현재는 수수료 수익 계산을 비활성화
                if (!initialLiquidity && lpBalance && lpTotalSupply && lpTotalSupply > BigInt(0)) {
          // 임시로 현재 값을 설정하되, 수수료 수익 계산은 하지 않음
          setInitialLiquidity({
            tokenA: 0, // 실제 초기값을 모르므로 0으로 설정
            tokenB: 0  // 수수료 수익 계산 비활성화
          });
        }
      } else {
        setCurrentRatio(null);
      }
    }
  }, [reserves, k, lpBalance, lpTotalSupply, initialLiquidity]);

  // 트랜잭션 확인 후 자동 갱신
  useEffect(() => {
    if (addLiquidityConfirmed && addLiquidityReceipt) {
      console.log('Add liquidity transaction confirmed, refreshing data...');
      setAddLiquidityTxHash(null);
      setIsLoading(false);
      alert('✅ Liquidity added successfully! Pool updated.');
      refetchReserves();
      refetchK();
      refetchLpBalance();
      refetchLpTotalSupply();
    }
  }, [addLiquidityConfirmed, addLiquidityReceipt, refetchReserves, refetchK, refetchLpBalance, refetchLpTotalSupply]);

  useEffect(() => {
    if (removeLiquidityConfirmed && removeLiquidityReceipt) {
      console.log('Remove liquidity transaction confirmed, refreshing data...');
      setRemoveLiquidityTxHash(null);
      setIsLoading(false);
      alert('✅ Liquidity removed successfully! Pool updated.');
      refetchReserves();
      refetchK();
      refetchLpBalance();
      refetchLpTotalSupply();
    }
  }, [removeLiquidityConfirmed, removeLiquidityReceipt, refetchReserves, refetchK, refetchLpBalance, refetchLpTotalSupply]);


  // BigInt 기반 정확한 비율 계산 (풀 reserves 직접 사용)
  const calculateRequiredAmount = (inputAmount: number, isTokenA: boolean) => {
    if (!reserves || reserves.length < 2 || isFirstTime) return null;
    
    // 입력값이 너무 작거나 유효하지 않은 경우 처리
    if (inputAmount <= 0 || !isFinite(inputAmount) || inputAmount < 1e-18) {
      return '0.000000000000000000';
    }
    
    // 입력값을 Wei로 변환 (더 정확한 방법)
    const inputAmountStr = inputAmount.toString();
    const [integerPartCalc, decimalPartCalc = ''] = inputAmountStr.split('.');
    
    // 정수 부분이 비어있거나 0인 경우 처리
    if (!integerPartCalc || integerPartCalc === '0') {
      return '0.000000000000000000';
    }
    
    const paddedDecimal = decimalPartCalc.padEnd(18, '0').slice(0, 18);
    const inputAmountWei = BigInt(integerPartCalc + paddedDecimal);
    
    if (isTokenA) {
      // Token A 입력 → Token B 필요량 계산
      const xReserveWei = reserves[0];
      const yReserveWei = reserves[1];
      const requiredBWei = (inputAmountWei * yReserveWei) / xReserveWei;
      
      // BigInt를 정확한 decimal로 변환
      const requiredBStr = requiredBWei.toString();
      const paddedRequiredB = requiredBStr.padStart(19, '0');
      const integerPartB = paddedRequiredB.slice(0, -18) || '0';
      const decimalPartB = paddedRequiredB.slice(-18);
      return integerPartB + '.' + decimalPartB;
    } else {
      // Token B 입력 → Token A 필요량 계산
      const xReserveWei = reserves[0];
      const yReserveWei = reserves[1];
      const requiredAWei = (inputAmountWei * xReserveWei) / yReserveWei;
      
      // BigInt를 정확한 decimal로 변환
      const requiredAStr = requiredAWei.toString();
      const paddedRequiredA = requiredAStr.padStart(19, '0');
      const integerPartA = paddedRequiredA.slice(0, -18) || '0';
      const decimalPartA = paddedRequiredA.slice(-18);
      return integerPartA + '.' + decimalPartA;
    }
  };

  // Wagmi를 사용한 정확한 비율 계산
  const getRequiredAmountFromContract = async (inputAmount: number, isTokenA: boolean) => {
    if (isFirstTime) return null;
    
    // 입력값이 너무 작거나 유효하지 않은 경우 처리
    if (inputAmount <= 0 || !isFinite(inputAmount) || inputAmount < 1e-18) {
      return '0.000000000000000000';
    }
    
    try {
      // 입력값을 Wei로 변환
      const inputAmountStr = inputAmount.toString();
      const [integerPartContract, decimalPartContract = ''] = inputAmountStr.split('.');
      
      // 정수 부분이 비어있거나 0인 경우 처리
      if (!integerPartContract || integerPartContract === '0') {
        return '0.000000000000000000';
      }
      
      const paddedDecimal = decimalPartContract.padEnd(18, '0').slice(0, 18);
      const inputAmountWei = BigInt(integerPartContract + paddedDecimal);
      
      // Wagmi의 readContract 사용
      const requiredWei = await readContract(config, {
        address: miniAMMAddress as `0x${string}`,
        abi: MINI_AMM_ABI,
        functionName: isTokenA ? 'getRequiredYAmount' : 'getRequiredXAmount',
        args: [inputAmountWei]
      });
      
      if (!requiredWei) return null;
      
      console.log('컨트랙트에서 반환된 Wei:', requiredWei.toString());
      
      // BigInt를 정확한 decimal로 변환
      const requiredStr = requiredWei.toString();
      const paddedRequired = requiredStr.padStart(19, '0');
      const integerPartResult = paddedRequired.slice(0, -18) || '0';
      const decimalPartResult = paddedRequired.slice(-18);
      return integerPartResult + '.' + decimalPartResult;
    } catch (error) {
      console.error('컨트랙트 비율 계산 실패:', error);
      return null;
    }
  };

  // 컨트랙트에서 직접 정확한 비율로 자동 설정
  const setExactRatio = async (inputAmount: number, isTokenA: boolean) => {
    if (isFirstTime) return;
    
    try {
      // 컨트랙트에서 직접 정확한 값 가져오기
      const requiredAmount = await getRequiredAmountFromContract(inputAmount, isTokenA);
      if (requiredAmount) {
        console.log('🔧 컨트랙트에서 가져온 값:', requiredAmount);
        if (isTokenA) {
          setAmountB(requiredAmount);
          console.log('✅ Token B 설정:', requiredAmount);
        } else {
          setAmountA(requiredAmount);
          console.log('✅ Token A 설정:', requiredAmount);
        }
      }
    } catch (error) {
      console.error('비율 설정 실패:', error);
    }
  };

  // 수수료 수익 계산
  const calculateFeeEarnings = () => {
    if (!reserves || !lpBalance || !lpTotalSupply || !initialLiquidity) {
      return { tokenAEarnings: 0, tokenBEarnings: 0, totalEarnings: 0, earningsPercentage: 0 };
    }

    // 초기값이 0이면 수수료 수익 계산 불가 (정확한 초기값이 없음)
    if (initialLiquidity.tokenA === 0 && initialLiquidity.tokenB === 0) {
      return { tokenAEarnings: 0, tokenBEarnings: 0, totalEarnings: 0, earningsPercentage: 0 };
    }

    const [currentTokenA, currentTokenB] = reserves;
    const currentTokenAAmount = Number(currentTokenA) / 1e18;
    const currentTokenBAmount = Number(currentTokenB) / 1e18;
    
    // 내가 보유한 LP 토큰 비율
    const myShare = Number(lpBalance) / Number(lpTotalSupply);
    
    // 현재 내가 받을 수 있는 토큰 양
    const myCurrentTokenA = currentTokenAAmount * myShare;
    const myCurrentTokenB = currentTokenBAmount * myShare;
    
    // 초기 공급량 (이미 내 비율이 반영된 값)
    const myInitialTokenA = initialLiquidity.tokenA;
    const myInitialTokenB = initialLiquidity.tokenB;
    
    // 수수료 수익 (현재 - 초기)
    const tokenAEarnings = myCurrentTokenA - myInitialTokenA;
    const tokenBEarnings = myCurrentTokenB - myInitialTokenB;
    const totalEarnings = tokenAEarnings + tokenBEarnings;
    
    // 수익률 계산
    const initialValue = myInitialTokenA + myInitialTokenB;
    const earningsPercentage = initialValue > 0 ? (totalEarnings / initialValue) * 100 : 0;
    
    console.log('💰 Fee Earnings Calculation:', {
      myShare: (myShare * 100).toFixed(2) + '%',
      myCurrentTokenA: myCurrentTokenA.toFixed(6),
      myCurrentTokenB: myCurrentTokenB.toFixed(6),
      myInitialTokenA: myInitialTokenA.toFixed(6),
      myInitialTokenB: myInitialTokenB.toFixed(6),
      tokenAEarnings: tokenAEarnings.toFixed(6),
      tokenBEarnings: tokenBEarnings.toFixed(6),
      totalEarnings: totalEarnings.toFixed(6),
      earningsPercentage: earningsPercentage.toFixed(2) + '%'
    });
    
    return {
      tokenAEarnings,
      tokenBEarnings,
      totalEarnings,
      earningsPercentage
    };
  };

  const handleAmountAChange = (value: string) => {
    setAmountA(value);
    if (!isFirstTime && currentRatio && value) {
      const requiredB = calculateRequiredAmount(parseFloat(value), true);
      if (requiredB) setAmountB(requiredB);
    }
  };

  const handleAmountBChange = (value: string) => {
    setAmountB(value);
    if (!isFirstTime && currentRatio && value) {
      const requiredA = calculateRequiredAmount(parseFloat(value), false);
      if (requiredA) setAmountA(requiredA);
    }
  };

  const handleAddLiquidity = async () => {
    console.log('🚀 handleAddLiquidity 시작');
    console.log('📊 입력값:', { amountA, amountB });
    console.log('🔗 지갑 연결 상태:', isConnected);
    console.log('👤 계정:', address);
    
    if (!isConnected || !amountA || !amountB) {
      console.log('❌ 조건 불만족:', { isConnected, amountA, amountB });
      alert('Please connect your wallet and enter amounts for both tokens.');
      return;
    }

    // BigInt 기반 정확한 비율 검증 (첫 번째가 아닌 경우)
    if (!isFirstTime && reserves && reserves.length >= 2) {
      const amountAWei = BigInt(Math.floor(parseFloat(amountA) * 1e18));
      const amountBWei = BigInt(Math.floor(parseFloat(amountB) * 1e18));
      
      // reserves를 직접 사용하여 정확한 비율 계산
      const xReserveWei = reserves[0];
      const yReserveWei = reserves[1];
      const expectedBWei = (amountAWei * yReserveWei) / xReserveWei;
      const actualBWei = amountBWei;
      
      // 디버깅 로그
      console.log('🔍 비율 검증 디버깅:');
      console.log('amountA:', amountA, 'amountB:', amountB);
      console.log('amountAWei:', amountAWei.toString());
      console.log('amountBWei:', amountBWei.toString());
      console.log('xReserveWei:', xReserveWei.toString());
      console.log('yReserveWei:', yReserveWei.toString());
      console.log('expectedBWei:', expectedBWei.toString());
      console.log('actualBWei:', actualBWei.toString());
      
      // 1 Wei 이내의 오차 허용 (컨트랙트 개선으로 정확도 향상)
      const tolerance = BigInt(1);
      const difference = expectedBWei > actualBWei ? expectedBWei - actualBWei : actualBWei - expectedBWei;
      
      console.log('difference:', difference.toString());
      console.log('tolerance:', tolerance.toString());
      console.log('difference > tolerance:', difference > tolerance);
      
      if (difference > tolerance) {
        const inputRatio = parseFloat(amountB) / parseFloat(amountA);
        const expectedRatio = Number(yReserveWei) / Number(xReserveWei);
        alert(`❌ 비율이 맞지 않습니다!\n필요한 비율: 1:${expectedRatio.toFixed(18)}\n입력한 비율: 1:${inputRatio.toFixed(18)}\n차이: ${Number(difference)} Wei\n\n자동 계산을 사용하거나 정확한 비율로 입력해주세요.`);
        return;
      }
    } else if (isFirstTime) {
      console.log('🆕 첫 번째 유동성 공급 - 비율 검증 건너뛰기');
    }

    setIsLoading(true);
    try {
      console.log('🔄 try 블록 시작');
      // BigInt 기반 정확한 Wei 변환
      const amountAWei = BigInt(Math.floor(parseFloat(amountA) * 1e18));
      const amountBWei = BigInt(Math.floor(parseFloat(amountB) * 1e18));
      console.log('💰 Wei 변환 완료:', { amountAWei: amountAWei.toString(), amountBWei: amountBWei.toString() });
      
      const tokenAContract = tokenXAddress as `0x${string}`;
      const tokenBContract = tokenYAddress as `0x${string}`;
      const ammContract = miniAMMAddress as `0x${string}`;

      console.log('🔄 Starting liquidity addition process...');
      console.log('📊 Amounts:', { amountA: amountA, amountB: amountB });
      console.log('📊 Wei amounts:', { amountAWei: amountAWei.toString(), amountBWei: amountBWei.toString() });
      console.log('📊 Is first time:', isFirstTime);
      console.log('📊 Current ratio:', currentRatio);
      
      if (!isFirstTime && currentRatio) {
        const inputRatio = parseFloat(amountB) / parseFloat(amountA);
        const ratioWei = BigInt(Math.floor(currentRatio * 1e18));
        const expectedBWei = (amountAWei * ratioWei) / BigInt(1e18);
        const difference = expectedBWei > amountBWei ? expectedBWei - amountBWei : amountBWei - expectedBWei;
        
        console.log('📊 Input ratio:', inputRatio);
        console.log('📊 Expected ratio:', currentRatio);
        console.log('📊 Expected B Wei:', expectedBWei.toString());
        console.log('📊 Actual B Wei:', amountBWei.toString());
        console.log('📊 Wei difference:', difference.toString());
      }

      // Approve Token A (정확한 양으로 승인)
      console.log('🔐 Approving Token A...');
      const approveAmountA = amountAWei; // 정확한 양으로 승인
      console.log('🔐 Token A 승인 파라미터:', {
        address: tokenAContract,
        functionName: 'approve',
        args: [ammContract, approveAmountA.toString()]
      });
      
      console.log('🔐 writeApprove 함수 확인:', {
        exists: !!writeApprove,
        type: typeof writeApprove
      });
      
      if (!writeApprove) {
        throw new Error('writeApprove 함수가 정의되지 않았습니다');
      }
      
      try {
        const approveA = writeApprove({
          address: tokenAContract,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [ammContract, approveAmountA]
        });
        console.log('✅ Token A approval sent:', approveA);
        
        // 승인 트랜잭션 완료 대기
        if (typeof approveA === 'string') {
          console.log('⏳ Waiting for Token A approval confirmation...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (error) {
        console.error('❌ Token A approval failed:', error);
        throw error;
      }

      // Approve Token B (정확한 양으로 승인)
      console.log('🔐 Approving Token B...');
      const approveAmountB = amountBWei; // 정확한 양으로 승인
      console.log('🔐 Token B 승인 파라미터:', {
        address: tokenBContract,
        functionName: 'approve',
        args: [ammContract, approveAmountB.toString()]
      });
      
      try {
        const approveB = writeApprove({
          address: tokenBContract,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [ammContract, approveAmountB]
        });
        console.log('✅ Token B approval sent:', approveB);
        
        // 승인 트랜잭션 완료 대기
        if (typeof approveB === 'string') {
          console.log('⏳ Waiting for Token B approval confirmation...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (error) {
        console.error('❌ Token B approval failed:', error);
        throw error;
      }

      // 잠시 대기 (approve 트랜잭션이 처리될 시간을 줌)
      console.log('⏳ Waiting for approvals to be processed...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Add liquidity
      console.log('💧 Adding liquidity...');
      console.log('💧 유동성 공급 파라미터:', {
        address: ammContract,
        functionName: 'addLiquidity',
        args: [amountAWei.toString(), amountBWei.toString()]
      });
      
      let result;
      try {
        result = await writeAddLiquidity({
          address: ammContract,
          abi: MINI_AMM_ABI,
          functionName: 'addLiquidity',
          args: [amountAWei, amountBWei]
        });
        console.log('✅ Add liquidity transaction sent:', result);
      } catch (error) {
        console.error('❌ Add liquidity failed:', error);
        throw error;
      }
      
      if (typeof result === 'string') {
        setAddLiquidityTxHash(result);
        // 초기 유동성 공급량 저장 (첫 번째 공급인 경우)
        if (isFirstTime) {
          setInitialLiquidity({
            tokenA: parseFloat(amountA),
            tokenB: parseFloat(amountB)
          });
        }
      } else {
        setIsLoading(false);
        alert('⚠️ Transaction sent but no hash received');
      }
    } catch (error) {
      console.error('❌ Add liquidity failed:', error);
      setIsLoading(false);
      
      // 더 자세한 에러 메시지
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // 일반적인 에러 메시지 개선
        if (errorMessage.includes('insufficient allowance')) {
          errorMessage = '토큰 승인이 부족합니다. 다시 시도해주세요.';
        } else if (errorMessage.includes('insufficient balance')) {
          errorMessage = '토큰 잔액이 부족합니다.';
        } else if (errorMessage.includes('ratio')) {
          errorMessage = '토큰 비율이 맞지 않습니다. 자동 계산을 사용해주세요.';
        } else if (errorMessage.includes('gas')) {
          errorMessage = '가스 부족 또는 가스 가격 문제입니다.';
        }
      }
      
      alert(`❌ 유동성 공급 실패: ${errorMessage}`);
    }
  };

  const handleRemoveLiquidity = async () => {
    if (!isConnected || !lpAmount) {
      alert('Please connect your wallet and enter LP token amount.');
      return;
    }

    const lpAmountNum = parseFloat(lpAmount);
    if (isNaN(lpAmountNum) || lpAmountNum <= 0) {
      alert('Please enter a valid LP token amount (positive number).');
      return;
    }

    setIsLoading(true);
    try {
      // LP 토큰을 Wei 단위로 변환
      const lpAmountWei = BigInt(Math.floor(lpAmountNum * 1e18));
      const ammContract = miniAMMAddress as `0x${string}`;

      console.log('🔄 Removing liquidity...');
      console.log('📊 LP Amount:', lpAmountNum);
      console.log('📊 LP Amount Wei:', lpAmountWei.toString());

      const result = await writeRemoveLiquidity({
        address: ammContract,
        abi: MINI_AMM_ABI,
        functionName: 'removeLiquidity',
        args: [lpAmountWei]
      });
      
      console.log('✅ Remove liquidity transaction sent:', result);
      if (typeof result === 'string') {
        setRemoveLiquidityTxHash(result);
      } else {
        setIsLoading(false);
        alert('⚠️ Transaction sent but no hash received');
      }
    } catch (error) {
      console.error('❌ Remove liquidity failed:', error);
      setIsLoading(false);
      
      // 더 자세한 에러 메시지
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
        
        if (errorMessage.includes('insufficient LP token balance')) {
          errorMessage = 'LP 토큰 잔액이 부족합니다. Max 버튼을 사용하세요.';
        } else if (errorMessage.includes('insufficient balance')) {
          errorMessage = '잔액이 부족합니다.';
        }
      }
      
      alert(`❌ 유동성 제거 실패: ${errorMessage}`);
    }
  };

  const handleRemoveAllLiquidity = async () => {
    if (!isConnected || !address) {
      alert('Please connect your wallet first');
      return;
    }

    if (!lpTokenBalance || Number(lpTokenBalance) <= 0) {
      alert('No LP tokens to remove');
      return;
    }

    setIsLoading(true);
    try {
      // 모든 LP 토큰을 제거 (정확한 잔액 사용)
      const lpTokenAmountWei = BigInt(Math.floor(Number(lpTokenBalance) * 1e18));
      
      console.log('🔄 Removing all liquidity...');
      console.log('📊 LP Balance:', lpTokenBalance);
      console.log('📊 LP Amount Wei:', lpTokenAmountWei.toString());

      const removeLiquidityTx = await writeRemoveLiquidity({
        address: miniAMMAddress as `0x${string}`,
        abi: MINI_AMM_ABI,
        functionName: 'removeLiquidity',
        args: [lpTokenAmountWei]
      });

      if (removeLiquidityTx) {
        setRemoveLiquidityTxHash(removeLiquidityTx);
        console.log('Remove all liquidity transaction sent:', removeLiquidityTx);
      }
    } catch (error) {
      console.error('Error removing all liquidity:', error);
      alert('Failed to remove all liquidity: ' + (error as Error).message);
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
        Please connect your wallet to manage liquidity
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pool Information */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border-2 border-blue-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-gray-800">🏊‍♂️ Liquidity Pool Status</h3>
          <button
            onClick={() => {
              refetchReserves();
              refetchK();
              refetchLpBalance();
              refetchLpTotalSupply();
              refetchLpTokenAddress();
            }}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-semibold"
          >
            🔄 새로고침
          </button>
        </div>
        
        {reserves && reserves.length >= 2 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pool Reserves */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h4 className="font-semibold text-gray-700 mb-3">Pool Reserves</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Token A:</span>
                  <span className="font-mono font-bold text-blue-600">
                    {(Number(reserves[0]) / 1e18).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Token B:</span>
                  <span className="font-mono font-bold text-green-600">
                    {(Number(reserves[1]) / 1e18).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-gray-600">Ratio:</span>
                  <span className="font-mono font-bold text-purple-600">
                    1:{currentRatio?.toFixed(2) || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Your LP Tokens */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h4 className="font-semibold text-gray-700 mb-3">Your LP Tokens</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Balance:</span>
                  <span className="font-mono font-bold text-orange-600">
                    {lpBalance ? (Number(lpBalance) / 1e18).toFixed(6) : '0.000000'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Supply:</span>
                  <span className="font-mono font-bold text-gray-600">
                    {lpTotalSupply ? (Number(lpTotalSupply) / 1e18).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-gray-600">Your Share:</span>
                  <span className="font-mono font-bold text-purple-600">
                    {lpBalance && lpTotalSupply && lpTotalSupply > BigInt(0) 
                      ? ((Number(lpBalance) / Number(lpTotalSupply)) * 100).toFixed(2) + '%'
                      : '0.00%'
                    }
                  </span>
                </div>
                
                {/* 수수료 수익 정보 */}
                {initialLiquidity && (() => {
                  const earnings = calculateFeeEarnings();
                  return earnings.totalEarnings > 0 ? (
                    <div className="pt-2 border-t border-green-200 bg-green-50 -mx-2 -mb-2 p-2 rounded-b-lg">
                      <div className="text-xs font-semibold text-green-800 mb-1">💰 Fee Earnings:</div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-green-700">Token A:</span>
                          <span className="font-mono text-green-800">
                            +{earnings.tokenAEarnings.toFixed(6)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-green-700">Token B:</span>
                          <span className="font-mono text-green-800">
                            +{earnings.tokenBEarnings.toFixed(6)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs font-bold pt-1 border-t border-green-300">
                          <span className="text-green-800">Total:</span>
                          <span className="font-mono text-green-900">
                            +{earnings.totalEarnings.toFixed(6)} ({earnings.earningsPercentage.toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>

            {/* Pool Statistics */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h4 className="font-semibold text-gray-700 mb-3">Pool Statistics</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">K Value:</span>
                  <span className="font-mono text-xs text-gray-500">
                    {k ? (Number(k) / 1e36).toFixed(2) + 'e36' : '0.00e36'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    isFirstTime 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {isFirstTime ? 'Empty' : 'Active'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Your Wallet:</span>
                  <span className="font-mono text-xs text-gray-500">
                    {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">LP Address:</span>
                  <span className="font-mono text-xs text-gray-500">
                    {lpTokenAddress ? `${lpTokenAddress.slice(0, 6)}...${lpTokenAddress.slice(-4)}` : 'N/A'}
                  </span>
                </div>
                {!isFirstTime && lpTokenBalance && Number(lpTokenBalance) > 0 && (
                  <div className="pt-2">
                    <button
                      onClick={handleRemoveAllLiquidity}
                      disabled={isLoading}
                      className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      {isLoading ? 'Processing...' : 'Remove All Liquidity'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">🏊‍♂️</div>
            <p>No liquidity in pool yet</p>
            <p className="text-sm">Add liquidity to get started!</p>
          </div>
        )}
      </div>

      {/* Transaction Status */}
      {(addLiquidityTxHash || removeLiquidityTxHash) && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-sm text-yellow-800">
            <strong>🔄 Transaction Status:</strong>
            <br />• Add Liquidity: {addLiquidityTxHash ? `${addLiquidityTxHash.slice(0, 10)}...` : 'None'}
            <br />• Remove Liquidity: {removeLiquidityTxHash ? `${removeLiquidityTxHash.slice(0, 10)}...` : 'None'}
            <br />• Add Confirmed: {addLiquidityConfirmed ? '✅ Yes' : '⏳ No'}
            <br />• Remove Confirmed: {removeLiquidityConfirmed ? '✅ Yes' : '⏳ No'}
          </div>
        </div>
      )}

      {/* Action Toggle */}
      <div className="flex space-x-4">
        <button
          onClick={() => setAction('add')}
          className={`px-6 py-3 rounded-lg text-lg font-bold transition-all duration-200 ${
            action === 'add'
              ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-300 shadow-sm hover:shadow-md'
          }`}
        >
          Add Liquidity
        </button>
        <button
          onClick={() => setAction('remove')}
          className={`px-6 py-3 rounded-lg text-lg font-bold transition-all duration-200 ${
            action === 'remove'
              ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-300 shadow-sm hover:shadow-md'
          }`}
        >
          Remove Liquidity
        </button>
      </div>

      {action === 'add' ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold text-gray-800">Add Liquidity</h3>
            <div className="text-sm text-gray-600">
              {isFirstTime ? (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
                  🆕 First Time - Free Ratio
                </span>
              ) : (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                  ⚖️ Required Ratio: 1:{currentRatio?.toFixed(2) || 'N/A'}
                </span>
              )}
            </div>
          </div>
          
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-lg font-bold text-gray-800 mb-3">
                Token A Amount
              </label>
              <input
                type="number"
                value={amountA}
                onChange={(e) => handleAmountAChange(e.target.value)}
                placeholder="0.0"
                step="0.000001"
                className="w-full p-3 text-lg text-gray-900 font-semibold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white shadow-sm"
              />
              {!isFirstTime && currentRatio && amountA && (
                <div className="mt-1 space-y-1">
                  <p className="text-xs text-blue-600">
                    💡 Auto-calculated Token B: {calculateRequiredAmount(parseFloat(amountA), true)}
                  </p>
                          <button
                            type="button"
                            onClick={() => setExactRatio(parseFloat(amountA), true)}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                          >
                            컨트랙트로 정확한 비율 설정
                          </button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-lg font-bold text-gray-800 mb-3">
                Token B Amount
              </label>
              <input
                type="number"
                value={amountB}
                onChange={(e) => handleAmountBChange(e.target.value)}
                placeholder="0.0"
                step="0.000001"
                className="w-full p-3 text-lg text-gray-900 font-semibold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white shadow-sm"
              />
              {!isFirstTime && currentRatio && amountB && (
                <div className="mt-1 space-y-1">
                  <p className="text-xs text-blue-600">
                    💡 Auto-calculated Token A: {calculateRequiredAmount(parseFloat(amountB), false)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setExactRatio(parseFloat(amountB), false)}
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                  >
                    컨트랙트로 정확한 비율 설정
                  </button>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              console.log('🔘 버튼 클릭됨!');
              console.log('🔘 버튼 상태:', { amountA, amountB, isLoading, isConnected });
              handleAddLiquidity();
            }}
            disabled={!amountA || !amountB || isLoading}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-6 rounded-lg text-lg font-bold hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {isLoading ? 'Adding Liquidity...' : 'Add Liquidity'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <h3 className="text-2xl font-bold text-gray-800">Remove Liquidity</h3>
          <div>
            <label className="block text-lg font-bold text-gray-800 mb-3">
              LP Token Amount
            </label>
            <div className="relative">
              <input
                type="number"
                value={lpAmount}
                onChange={(e) => setLpAmount(e.target.value)}
                placeholder="0.0"
                step="0.000001"
                className="w-full p-3 pr-20 text-lg text-gray-900 font-semibold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white shadow-sm"
              />
              <button
                type="button"
                onClick={() => setLpAmount(lpBalance ? (Number(lpBalance) / 1e18).toFixed(6) : '0')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded hover:bg-red-200 transition-colors"
              >
                Max
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              💡 Max 버튼으로 전체 LP 토큰을 제거할 수 있습니다
            </p>
          </div>
          <button
            onClick={handleRemoveLiquidity}
            disabled={!lpAmount || isLoading}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 px-6 rounded-lg text-lg font-bold hover:from-red-700 hover:to-red-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {isLoading ? 'Removing Liquidity...' : 'Remove Liquidity'}
          </button>
        </div>
      )}

      {miniAMMAddress === "0x0000000000000000000000000000000000000000" && (
        <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
          ⚠️ Contract addresses need to be updated after deployment
        </div>
      )}
    </div>
  );
}
