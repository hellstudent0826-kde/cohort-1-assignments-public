// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

// DO NOT change the interface
interface IMiniAMM {
    function addLiquidity(uint256 xAmountIn, uint256 yAmountIn) external;
    function swap(uint256 xAmountIn, uint256 yAmountIn) external;
    function removeLiquidity(uint256 lpTokenAmount) external;
    function getReserves() external view returns (uint256 xReserve, uint256 yReserve);
    function getK() external view returns (uint256);
    function getLPTokenAddress() external view returns (address);
    function getRequiredYAmount(uint256 xAmount) external view returns (uint256);
    function getRequiredXAmount(uint256 yAmount) external view returns (uint256);
    function getExactRatio() external view returns (uint256);
}

// DO NOT change the interface
interface IMiniAMMEvents {
    event AddLiquidity(uint256 xAmountIn, uint256 yAmountIn, uint256 lpTokenMinted);
    event Swap(uint256 xAmountIn, uint256 yAmountIn, uint256 xAmountOut, uint256 yAmountOut);
    event RemoveLiquidity(uint256 lpTokenAmount, uint256 xAmountOut, uint256 yAmountOut);
}
