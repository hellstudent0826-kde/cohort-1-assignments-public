// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

import {IMiniAMM, IMiniAMMEvents} from "./IMiniAMM.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Add as many variables or functions as you would like
// for the implementation. The goal is to pass `forge test`.
contract MiniAMM is IMiniAMM, IMiniAMMEvents {
    uint256 public k = 0;
    uint256 public xReserve = 0;
    uint256 public yReserve = 0;

    address public tokenX;
    address public tokenY;

    // implement constructor
    constructor(address _tokenX, address _tokenY) {
        // Check for zero addresses
        if (_tokenX == address(0)) revert("tokenX cannot be zero address");
        if (_tokenY == address(0)) revert("tokenY cannot be zero address");
        
        // Check for same tokens
        if (_tokenX == _tokenY) revert("Tokens must be different");
        
        // Order tokens by address (smaller address becomes tokenX)
        if (_tokenX < _tokenY) {
            tokenX = _tokenX;
            tokenY = _tokenY;
        } else {
            tokenX = _tokenY;
            tokenY = _tokenX;
        }
    }

    // add parameters and implement function.
    // this function will determine the initial 'k'.
    function _addLiquidityFirstTime(uint256 xAmountIn, uint256 yAmountIn) internal {
        // Transfer tokens from user to contract
        IERC20(tokenX).transferFrom(msg.sender, address(this), xAmountIn);
        IERC20(tokenY).transferFrom(msg.sender, address(this), yAmountIn);
        
        // Update reserves
        xReserve = xAmountIn;
        yReserve = yAmountIn;
        
        // Calculate initial k
        k = xAmountIn * yAmountIn;
        
        // Emit event
        emit AddLiquidity(xAmountIn, yAmountIn);
    }

    // add parameters and implement function.
    // this function will increase the 'k'
    // because it is transferring liquidity from users to this contract.
    function _addLiquidityNotFirstTime(uint256 xAmountIn, uint256 yAmountIn) internal {
        // Calculate required y amount based on current ratio
        uint256 yRequired = (xAmountIn * yReserve) / xReserve;
        
        // Check if provided y amount matches required amount
        require(yAmountIn >= yRequired, "Insufficient y amount");
        
        // Transfer tokens from user to contract
        IERC20(tokenX).transferFrom(msg.sender, address(this), xAmountIn);
        IERC20(tokenY).transferFrom(msg.sender, address(this), yRequired);
        
        // Update reserves
        xReserve += xAmountIn;
        yReserve += yRequired;
        
        // Update k (k increases)
        k = xReserve * yReserve;
        
        // Emit event
        emit AddLiquidity(xAmountIn, yRequired);
    }

    // complete the function
    function addLiquidity(uint256 xAmountIn, uint256 yAmountIn) external {
        // Check for zero amounts
        require(xAmountIn > 0 && yAmountIn > 0, "Amounts must be greater than 0");
        
        if (k == 0) {
            // add params
            _addLiquidityFirstTime(xAmountIn, yAmountIn);
        } else {
            // add params
            _addLiquidityNotFirstTime(xAmountIn, yAmountIn);
        }
    }

    // complete the function
    function swap(uint256 xAmountIn, uint256 yAmountIn) external {
        // Check for liquidity
        require(k > 0, "No liquidity in pool");
        
        // Check for zero amounts
        require(xAmountIn > 0 || yAmountIn > 0, "Must swap at least one token");
        
        // Check for both directions
        require(xAmountIn == 0 || yAmountIn == 0, "Can only swap one direction at a time");
        
        if (xAmountIn > 0) {
            // Swap tokenX for tokenY
            require(xAmountIn < xReserve, "Insufficient liquidity");
            
            // Calculate yAmountOut using correct AMM formula
            uint256 yAmountOut = yReserve - (k / (xReserve + xAmountIn));
            
            // Transfer tokens
            IERC20(tokenX).transferFrom(msg.sender, address(this), xAmountIn);
            IERC20(tokenY).transfer(msg.sender, yAmountOut);
            
            // Update reserves
            xReserve += xAmountIn;
            yReserve -= yAmountOut;
            
            // Emit event
            emit Swap(xAmountIn, yAmountOut);
        } else {
            // Swap tokenY for tokenX
            require(yAmountIn < yReserve, "Insufficient liquidity");
            
            // Calculate xAmountOut using correct AMM formula
            uint256 xAmountOut = xReserve - (k / (yReserve + yAmountIn));
            
            // Transfer tokens
            IERC20(tokenY).transferFrom(msg.sender, address(this), yAmountIn);
            IERC20(tokenX).transfer(msg.sender, xAmountOut);
            
            // Update reserves
            yReserve += yAmountIn;
            xReserve -= xAmountOut;
            
            // Emit event
            emit Swap(xAmountOut, yAmountIn);
        }
    }
}
