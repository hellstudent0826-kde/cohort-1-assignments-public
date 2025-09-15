// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

import {IMiniAMM, IMiniAMMEvents} from "./IMiniAMM.sol";
import {MiniAMMLP} from "./MiniAMMLP.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Add as many variables or functions as you would like
// for the implementation. The goal is to pass `forge test`.
contract MiniAMM is IMiniAMM, IMiniAMMEvents, MiniAMMLP {
    uint256 public k = 0;
    uint256 public xReserve = 0;
    uint256 public yReserve = 0;

    address public tokenX;
    address public tokenY;

    // implement constructor
    constructor(address _tokenX, address _tokenY) MiniAMMLP(_tokenX, _tokenY) {
        require(_tokenX != address(0), "tokenX cannot be zero address");
        require(_tokenY != address(0), "tokenY cannot be zero address");
        require(_tokenX != _tokenY, "Tokens must be different");
        
        // Order tokens by address (tokenX < tokenY)
        if (_tokenX < _tokenY) {
            tokenX = _tokenX;
            tokenY = _tokenY;
        } else {
            tokenX = _tokenY;
            tokenY = _tokenX;
        }
    }

    // Helper function to calculate square root
    function sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }

    // add parameters and implement function.
    // this function will determine the 'k'.
    function _addLiquidityFirstTime(uint256 xAmountIn, uint256 yAmountIn) internal returns (uint256 lpMinted) {
        // Transfer tokens from user to this contract
        IERC20(tokenX).transferFrom(msg.sender, address(this), xAmountIn);
        IERC20(tokenY).transferFrom(msg.sender, address(this), yAmountIn);
        
        // Update reserves
        xReserve = xAmountIn;
        yReserve = yAmountIn;
        
        // Calculate k (constant product)
        k = xAmountIn * yAmountIn;
        
        // Calculate LP tokens to mint (sqrt of k)
        lpMinted = sqrt(k);
        
        // Mint LP tokens to user
        _mintLP(msg.sender, lpMinted);
    }

    // add parameters and implement function.
    // this function will increase the 'k'
    // because it is transferring liquidity from users to this contract.
    function _addLiquidityNotFirstTime(uint256 xAmountIn, uint256 yAmountIn) internal returns (uint256 lpMinted) {
        // Transfer tokens from user to this contract
        IERC20(tokenX).transferFrom(msg.sender, address(this), xAmountIn);
        IERC20(tokenY).transferFrom(msg.sender, address(this), yAmountIn);
        
        // Calculate LP tokens based on existing supply and new liquidity ratio
        uint256 totalSupply = totalSupply();
        uint256 lpFromX = (xAmountIn * totalSupply) / xReserve;
        uint256 lpFromY = (yAmountIn * totalSupply) / yReserve;
        
        // Use the smaller amount to maintain ratio
        lpMinted = lpFromX < lpFromY ? lpFromX : lpFromY;
        
        // Update reserves
        xReserve += xAmountIn;
        yReserve += yAmountIn;
        
        // Update k
        k = xReserve * yReserve;
        
        // Mint LP tokens to user
        _mintLP(msg.sender, lpMinted);
    }

    // complete the function. Should transfer LP token to the user.
    function addLiquidity(uint256 xAmountIn, uint256 yAmountIn) external returns (uint256 lpMinted) {
        require(xAmountIn > 0 && yAmountIn > 0, "Amounts must be greater than 0");
        
        if (totalSupply() == 0) {
            // First time adding liquidity
            lpMinted = _addLiquidityFirstTime(xAmountIn, yAmountIn);
        } else {
            // Not first time - maintain ratio
            lpMinted = _addLiquidityNotFirstTime(xAmountIn, yAmountIn);
        }
        
        // Emit event
        emit AddLiquidity(xAmountIn, yAmountIn);
        
        return lpMinted;
    }

    // Remove liquidity by burning LP tokens
    function removeLiquidity(uint256 lpAmount) external returns (uint256 xAmount, uint256 yAmount) {
        require(lpAmount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= lpAmount, "Insufficient LP tokens");
        
        uint256 totalSupply = totalSupply();
        
        // Calculate proportional amounts to return
        xAmount = (lpAmount * xReserve) / totalSupply;
        yAmount = (lpAmount * yReserve) / totalSupply;
        
        // Burn LP tokens
        _burnLP(msg.sender, lpAmount);
        
        // Update reserves
        xReserve -= xAmount;
        yReserve -= yAmount;
        
        // Update k
        k = xReserve * yReserve;
        
        // Transfer tokens back to user
        IERC20(tokenX).transfer(msg.sender, xAmount);
        IERC20(tokenY).transfer(msg.sender, yAmount);
    }

    // complete the function
    function swap(uint256 xAmountIn, uint256 yAmountIn) external {
        require(xReserve > 0 && yReserve > 0, "No liquidity in pool");
        require(xAmountIn > 0 || yAmountIn > 0, "Must swap at least one token");
        require(xAmountIn == 0 || yAmountIn == 0, "Can only swap one direction at a time");
        
        uint256 xAmountOut;
        uint256 yAmountOut;
        
        if (xAmountIn > 0) {
            // Swapping X for Y
            require(xAmountIn <= xReserve, "Insufficient liquidity");
            
            // Calculate output with 0.3% fee (997/1000)
            uint256 xAmountInWithFee = (xAmountIn * 997) / 1000;
            yAmountOut = (xAmountInWithFee * yReserve) / (xReserve + xAmountInWithFee);
            
            // Transfer input tokens from user
            IERC20(tokenX).transferFrom(msg.sender, address(this), xAmountIn);
            
            // Update reserves
            xReserve += xAmountIn;
            yReserve -= yAmountOut;
            
            // Transfer output tokens to user
            IERC20(tokenY).transfer(msg.sender, yAmountOut);
            
        } else {
            // Swapping Y for X
            require(yAmountIn <= yReserve, "Insufficient liquidity");
            
            // Calculate output with 0.3% fee (997/1000)
            uint256 yAmountInWithFee = (yAmountIn * 997) / 1000;
            xAmountOut = (yAmountInWithFee * xReserve) / (yReserve + yAmountInWithFee);
            
            // Transfer input tokens from user
            IERC20(tokenY).transferFrom(msg.sender, address(this), yAmountIn);
            
            // Update reserves
            yReserve += yAmountIn;
            xReserve -= xAmountOut;
            
            // Transfer output tokens to user
            IERC20(tokenX).transfer(msg.sender, xAmountOut);
        }
        
        // Emit event
        emit Swap(xAmountIn, yAmountIn, xAmountOut, yAmountOut);
    }
}
