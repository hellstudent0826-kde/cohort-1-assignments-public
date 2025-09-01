// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// DO NOT change the interface
interface IMiniAMM {
    function addLiquidity(uint256 xAmountIn, uint256 yAmountIn) external;
    function swap(uint256 xAmountIn, uint256 yAmountIn) external;
}

// DO NOT change the interface
interface IMiniAMMEvents {
    event AddLiquidity(uint256 xAmountIn, uint256 yAmountIn);
    event Swap(uint256 xAmountIn, uint256 yAmountIn);
}
