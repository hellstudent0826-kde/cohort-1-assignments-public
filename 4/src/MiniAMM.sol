// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

import {IMiniAMM, IMiniAMMEvents} from "./IMiniAMM.sol";
import {IMiniAMMLP} from "./IMiniAMMLP.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MiniAMMLP} from "./MiniAMMLP.sol";

contract MiniAMM is IMiniAMM, IMiniAMMEvents {
    uint256 public k = 0;
    uint256 public xReserve = 0;
    uint256 public yReserve = 0;

    address public tokenX;
    address public tokenY;
    address public lpToken;
    
    uint256 public constant SWAP_FEE = 3; // 0.3% = 3/1000
    uint256 public constant FEE_DENOMINATOR = 1000;

    constructor(address _tokenX, address _tokenY) {
        tokenX = _tokenX;
        tokenY = _tokenY;
        
        // Deploy LP token
        MiniAMMLP lpTokenContract = new MiniAMMLP();
        lpToken = address(lpTokenContract);
        
        // Set this contract as the minter for LP tokens
        IMiniAMMLP(lpToken).setMinter(address(this));
    }

    function _addLiquidityFirstTime(uint256 xAmountIn, uint256 yAmountIn) internal {
        require(xAmountIn > 0 && yAmountIn > 0, "MiniAMM: amounts must be greater than 0");
        
        // Transfer tokens from user to this contract
        IERC20(tokenX).transferFrom(msg.sender, address(this), xAmountIn);
        IERC20(tokenY).transferFrom(msg.sender, address(this), yAmountIn);
        
        // Update reserves
        xReserve = xAmountIn;
        yReserve = yAmountIn;
        k = xAmountIn * yAmountIn;
        
        // Mint LP tokens using geometric mean: sqrt(x * y)
        uint256 lpTokenAmount = sqrt(xAmountIn * yAmountIn);
        IMiniAMMLP(lpToken).mint(msg.sender, lpTokenAmount);
        
        emit AddLiquidity(xAmountIn, yAmountIn, lpTokenAmount);
    }

    function _addLiquidityNotFirstTime(uint256 xAmountIn, uint256 yAmountIn) internal {
        require(xAmountIn > 0 && yAmountIn > 0, "MiniAMM: amounts must be greater than 0");
        
        // 더 정확한 비율 검증: 오차 허용 범위 내에서 검증
        uint256 expectedYAmount = (xAmountIn * yReserve) / xReserve;
        uint256 tolerance = 1; // 1 wei 허용 오차
        require(yAmountIn >= expectedYAmount - tolerance, "MiniAMM: insufficient y amount");
        
        // Transfer tokens from user to this contract
        IERC20(tokenX).transferFrom(msg.sender, address(this), xAmountIn);
        IERC20(tokenY).transferFrom(msg.sender, address(this), yAmountIn);
        
        // Update reserves
        xReserve += xAmountIn;
        yReserve += yAmountIn;
        k = xReserve * yReserve;
        
        // 더 정확한 LP 토큰 계산: 정밀도 손실 최소화
        uint256 totalLPTokens = IERC20(lpToken).totalSupply();
        uint256 oldXReserve = xReserve - xAmountIn;
        
        // 두 가지 방법으로 계산하여 더 정확한 값 선택
        uint256 lpTokenAmount1 = (xAmountIn * totalLPTokens) / oldXReserve;
        uint256 lpTokenAmount2 = (yAmountIn * totalLPTokens) / (yReserve - yAmountIn);
        
        // 더 작은 값을 선택하여 오버플로우 방지
        uint256 lpTokenAmount = lpTokenAmount1 < lpTokenAmount2 ? lpTokenAmount1 : lpTokenAmount2;
        
        IMiniAMMLP(lpToken).mint(msg.sender, lpTokenAmount);
        
        emit AddLiquidity(xAmountIn, yAmountIn, lpTokenAmount);
    }

    function addLiquidity(uint256 xAmountIn, uint256 yAmountIn) external {
        if (k == 0) {
            _addLiquidityFirstTime(xAmountIn, yAmountIn);
        } else {
            _addLiquidityNotFirstTime(xAmountIn, yAmountIn);
        }
    }

    function swap(uint256 xAmountIn, uint256 yAmountIn) external {
        require((xAmountIn > 0 && yAmountIn == 0) || (xAmountIn == 0 && yAmountIn > 0), "MiniAMM: invalid swap amounts");
        require(k > 0, "MiniAMM: no liquidity");
        
        if (xAmountIn > 0) {
            // Swap X for Y
            _swapXForY(xAmountIn);
        } else {
            // Swap Y for X
            _swapYForX(yAmountIn);
        }
    }

    function _swapXForY(uint256 xAmountIn) internal {
        // Apply swap fee: 0.3% - 더 정확한 수수료 계산
        uint256 xAmountInWithFee = (xAmountIn * (FEE_DENOMINATOR - SWAP_FEE)) / FEE_DENOMINATOR;
        
        // 더 정확한 출력량 계산: 정밀도 손실 최소화
        uint256 numerator = yReserve * xAmountInWithFee;
        uint256 denominator = xReserve + xAmountInWithFee;
        uint256 yAmountOut = numerator / denominator;
        
        // 나머지가 있는 경우 1 wei 추가 (사용자에게 유리하게)
        if (numerator % denominator > 0) {
            yAmountOut += 1;
        }
        
        require(yAmountOut > 0, "MiniAMM: insufficient output amount");
        
        // Transfer input token from user
        IERC20(tokenX).transferFrom(msg.sender, address(this), xAmountIn);
        
        // Transfer output token to user
        IERC20(tokenY).transfer(msg.sender, yAmountOut);
        
        // Update reserves
        xReserve += xAmountIn;
        yReserve -= yAmountOut;
        
        emit Swap(xAmountIn, 0, 0, yAmountOut);
    }

    function _swapYForX(uint256 yAmountIn) internal {
        // Apply swap fee: 0.3% - 더 정확한 수수료 계산
        uint256 yAmountInWithFee = (yAmountIn * (FEE_DENOMINATOR - SWAP_FEE)) / FEE_DENOMINATOR;
        
        // 더 정확한 출력량 계산: 정밀도 손실 최소화
        uint256 numerator = xReserve * yAmountInWithFee;
        uint256 denominator = yReserve + yAmountInWithFee;
        uint256 xAmountOut = numerator / denominator;
        
        // 나머지가 있는 경우 1 wei 추가 (사용자에게 유리하게)
        if (numerator % denominator > 0) {
            xAmountOut += 1;
        }
        
        require(xAmountOut > 0, "MiniAMM: insufficient output amount");
        
        // Transfer input token from user
        IERC20(tokenY).transferFrom(msg.sender, address(this), yAmountIn);
        
        // Transfer output token to user
        IERC20(tokenX).transfer(msg.sender, xAmountOut);
        
        // Update reserves
        yReserve += yAmountIn;
        xReserve -= xAmountOut;
        
        emit Swap(0, yAmountIn, xAmountOut, 0);
    }

    function removeLiquidity(uint256 lpTokenAmount) external {
        require(lpTokenAmount > 0, "MiniAMM: amount must be greater than 0");
        require(IERC20(lpToken).balanceOf(msg.sender) >= lpTokenAmount, "MiniAMM: insufficient LP token balance");
        
        uint256 totalLPTokens = IERC20(lpToken).totalSupply();
        
        // 더 정확한 출금량 계산: 정밀도 손실 최소화
        uint256 xAmountOut = (lpTokenAmount * xReserve) / totalLPTokens;
        uint256 yAmountOut = (lpTokenAmount * yReserve) / totalLPTokens;
        
        // 나머지가 있는 경우 1 wei 추가 (사용자에게 유리하게)
        if ((lpTokenAmount * xReserve) % totalLPTokens > 0) {
            xAmountOut += 1;
        }
        if ((lpTokenAmount * yReserve) % totalLPTokens > 0) {
            yAmountOut += 1;
        }
        
        require(xAmountOut > 0 && yAmountOut > 0, "MiniAMM: insufficient liquidity");
        
        // Burn LP tokens
        IMiniAMMLP(lpToken).burn(msg.sender, lpTokenAmount);
        
        // Transfer tokens to user
        IERC20(tokenX).transfer(msg.sender, xAmountOut);
        IERC20(tokenY).transfer(msg.sender, yAmountOut);
        
        // Update reserves
        xReserve -= xAmountOut;
        yReserve -= yAmountOut;
        k = xReserve * yReserve;
        
        emit RemoveLiquidity(lpTokenAmount, xAmountOut, yAmountOut);
    }

    function getReserves() external view returns (uint256, uint256) {
        return (xReserve, yReserve);
    }

    function getK() external view returns (uint256) {
        return k;
    }

    function getLPTokenAddress() external view returns (address) {
        return lpToken;
    }

    // 정확한 비율 계산 함수들 (정밀도 손실 최소화)
    function getRequiredYAmount(uint256 xAmount) external view returns (uint256) {
        require(k > 0, "MiniAMM: no liquidity");
        uint256 numerator = xAmount * yReserve;
        uint256 result = numerator / xReserve;
        
        // 나머지가 있는 경우 1 wei 추가 (사용자에게 유리하게)
        if (numerator % xReserve > 0) {
            result += 1;
        }
        
        return result;
    }

    function getRequiredXAmount(uint256 yAmount) external view returns (uint256) {
        require(k > 0, "MiniAMM: no liquidity");
        uint256 numerator = yAmount * xReserve;
        uint256 result = numerator / yReserve;
        
        // 나머지가 있는 경우 1 wei 추가 (사용자에게 유리하게)
        if (numerator % yReserve > 0) {
            result += 1;
        }
        
        return result;
    }

    function getExactRatio() external view returns (uint256) {
        require(k > 0, "MiniAMM: no liquidity");
        return (yReserve * 1e18) / xReserve;
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
}
