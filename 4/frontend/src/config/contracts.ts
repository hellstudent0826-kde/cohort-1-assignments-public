// Contract addresses configuration
export const CONTRACT_ADDRESSES = {
  // Main contracts
  TOKEN_A: process.env.NEXT_PUBLIC_TOKEN_A_ADDRESS || '0xB4D54a32d327475E10Ea4409340E1Cf1C009BDC6', // Token Y (TKA)
  TOKEN_B: process.env.NEXT_PUBLIC_TOKEN_B_ADDRESS || '0x92443E7cbe95E275f82C1199BA4ba6a30f8C5739', // Token X (TKB)
  MINI_AMM: process.env.NEXT_PUBLIC_MINI_AMM_ADDRESS || '0x7B972d87316BcbdCF1C4859B5cF275453D12a5D6',
  FACTORY: process.env.NEXT_PUBLIC_FACTORY_ADDRESS || '0x4d1e39C8dC3111763c5DA08FC215Bcaf21b28e94',
  LP_TOKEN: process.env.NEXT_PUBLIC_LP_TOKEN_ADDRESS || '0x2ad8635424F33Ce84264425821766811B3e288AC',
} as const;

// Network configuration
export const NETWORK_CONFIG = {
  CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID || '114',
  RPC_URL: process.env.NEXT_PUBLIC_RPC_URL || 'https://coston2-api.flare.network/ext/bc/C/rpc',
} as const;

// Contract info
export const CONTRACT_INFO = {
  TOKEN_A: {
    address: CONTRACT_ADDRESSES.TOKEN_A,
    symbol: 'TKA',
    name: 'Token A',
    decimals: 18,
  },
  TOKEN_B: {
    address: CONTRACT_ADDRESSES.TOKEN_B,
    symbol: 'TKB', 
    name: 'Token B',
    decimals: 18,
  },
  MINI_AMM: {
    address: CONTRACT_ADDRESSES.MINI_AMM,
    name: 'MiniAMM Pair',
  },
} as const;
