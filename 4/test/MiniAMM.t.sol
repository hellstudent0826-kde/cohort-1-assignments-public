// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

import {Test, console} from "forge-std/Test.sol";
import {MiniAMM} from "../src/MiniAMM.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MiniAMMTest is Test {
    MiniAMM public amm;
    MockERC20 public tokenA;
    MockERC20 public tokenB;
    
    address public alice = address(0x1);
    address public bob = address(0x2);

    function setUp() public {
        tokenA = new MockERC20("Token A", "TKA");
        tokenB = new MockERC20("Token B", "TKB");
        amm = new MiniAMM(address(tokenA), address(tokenB));
        
        // Mint tokens to test addresses
        tokenA.freeMintTo(1000000 * 10**18, alice);
        tokenB.freeMintTo(1000000 * 10**18, alice);
        tokenA.freeMintTo(1000000 * 10**18, bob);
        tokenB.freeMintTo(1000000 * 10**18, bob);
        
        // Approve AMM to spend tokens
        vm.prank(alice);
        tokenA.approve(address(amm), type(uint256).max);
        vm.prank(alice);
        tokenB.approve(address(amm), type(uint256).max);
        vm.prank(bob);
        tokenA.approve(address(amm), type(uint256).max);
        vm.prank(bob);
        tokenB.approve(address(amm), type(uint256).max);
    }

    function testAddLiquidityFirstTime() public {
        uint256 amountA = 1000 * 10**18;
        uint256 amountB = 2000 * 10**18;
        
        vm.prank(alice);
        amm.addLiquidity(amountA, amountB);
        
        (uint256 xReserve, uint256 yReserve) = amm.getReserves();
        assertEq(xReserve, amountA);
        assertEq(yReserve, amountB);
        assertEq(amm.getK(), amountA * amountB);
        
        // Check LP token minting (geometric mean)
        uint256 expectedLPTokens = sqrt(amountA * amountB);
        assertEq(IERC20(amm.getLPTokenAddress()).balanceOf(alice), expectedLPTokens);
    }

    function testAddLiquidityNotFirstTime() public {
        // First liquidity provision
        uint256 amountA1 = 1000 * 10**18;
        uint256 amountB1 = 2000 * 10**18;
        
        vm.prank(alice);
        amm.addLiquidity(amountA1, amountB1);
        
        uint256 aliceLPTokens = IERC20(amm.getLPTokenAddress()).balanceOf(alice);
        
        // Second liquidity provision
        uint256 amountA2 = 500 * 10**18;
        uint256 amountB2 = 1000 * 10**18;
        
        vm.prank(bob);
        amm.addLiquidity(amountA2, amountB2);
        
        uint256 bobLPTokens = IERC20(amm.getLPTokenAddress()).balanceOf(bob);
        
        // Bob should get half the LP tokens since he provided half the liquidity
        assertEq(bobLPTokens, aliceLPTokens / 2);
        
        (uint256 xReserve, uint256 yReserve) = amm.getReserves();
        assertEq(xReserve, amountA1 + amountA2);
        assertEq(yReserve, amountB1 + amountB2);
    }

    function testSwapXForY() public {
        // Add initial liquidity
        uint256 amountA = 1000 * 10**18;
        uint256 amountB = 2000 * 10**18;
        
        vm.prank(alice);
        amm.addLiquidity(amountA, amountB);
        
        uint256 initialXReserve = amm.xReserve();
        uint256 initialYReserve = amm.yReserve();
        
        // Swap 100 tokenA for tokenB
        uint256 swapAmount = 100 * 10**18;
        
        vm.prank(bob);
        amm.swap(swapAmount, 0);
        
        (uint256 xReserve, uint256 yReserve) = amm.getReserves();
        
        // X reserve should increase by swap amount
        assertEq(xReserve, initialXReserve + swapAmount);
        // Y reserve should decrease (but less than expected due to fee)
        assertLt(yReserve, initialYReserve);
        
        // Check that k is maintained (approximately, due to fees)
        uint256 newK = xReserve * yReserve;
        assertGt(newK, initialXReserve * initialYReserve);
    }

    function testSwapYForX() public {
        // Add initial liquidity
        uint256 amountA = 1000 * 10**18;
        uint256 amountB = 2000 * 10**18;
        
        vm.prank(alice);
        amm.addLiquidity(amountA, amountB);
        
        uint256 initialXReserve = amm.xReserve();
        uint256 initialYReserve = amm.yReserve();
        
        // Swap 200 tokenB for tokenA
        uint256 swapAmount = 200 * 10**18;
        
        vm.prank(bob);
        amm.swap(0, swapAmount);
        
        (uint256 xReserve, uint256 yReserve) = amm.getReserves();
        
        // Y reserve should increase by swap amount
        assertEq(yReserve, initialYReserve + swapAmount);
        // X reserve should decrease (but less than expected due to fee)
        assertLt(xReserve, initialXReserve);
    }

    function testRemoveLiquidity() public {
        // Add initial liquidity
        uint256 amountA = 1000 * 10**18;
        uint256 amountB = 2000 * 10**18;
        
        vm.prank(alice);
        amm.addLiquidity(amountA, amountB);
        
        uint256 aliceLPTokens = IERC20(amm.getLPTokenAddress()).balanceOf(alice);
        uint256 initialXReserve = amm.xReserve();
        uint256 initialYReserve = amm.yReserve();
        
        // Remove half of liquidity
        uint256 removeAmount = aliceLPTokens / 2;
        
        vm.prank(alice);
        amm.removeLiquidity(removeAmount);
        
        // Check LP token balance
        assertEq(IERC20(amm.getLPTokenAddress()).balanceOf(alice), aliceLPTokens - removeAmount);
        
        // Check reserves decreased proportionally (allow for 1 wei precision error)
        (uint256 xReserve, uint256 yReserve) = amm.getReserves();
        assertApproxEqAbs(xReserve, initialXReserve / 2, 1);
        assertApproxEqAbs(yReserve, initialYReserve / 2, 1);
    }

    function testRemoveAllLiquidity() public {
        // Add initial liquidity
        uint256 amountA = 1000 * 10**18;
        uint256 amountB = 2000 * 10**18;
        
        vm.prank(alice);
        amm.addLiquidity(amountA, amountB);
        
        uint256 aliceLPTokens = IERC20(amm.getLPTokenAddress()).balanceOf(alice);
        
        // Remove all liquidity
        vm.prank(alice);
        amm.removeLiquidity(aliceLPTokens);
        
        // Check LP token balance is zero
        assertEq(IERC20(amm.getLPTokenAddress()).balanceOf(alice), 0);
        
        // Check reserves are zero
        (uint256 xReserve, uint256 yReserve) = amm.getReserves();
        assertEq(xReserve, 0);
        assertEq(yReserve, 0);
        assertEq(amm.getK(), 0);
    }

    function testSwapFee() public {
        // Add initial liquidity
        uint256 amountA = 1000 * 10**18;
        uint256 amountB = 2000 * 10**18;
        
        vm.prank(alice);
        amm.addLiquidity(amountA, amountB);
        
        uint256 initialK = amm.getK();
        
        // Perform a swap
        uint256 swapAmount = 100 * 10**18;
        
        vm.prank(bob);
        amm.swap(swapAmount, 0);
        
        // K should increase due to fees (allow for small precision errors)
        uint256 newK = amm.getK();
        assertGe(newK, initialK);
        
        // Verify that reserves changed
        (uint256 xReserve, uint256 yReserve) = amm.getReserves();
        assertGt(xReserve, amountA);
        assertLt(yReserve, amountB);
    }

    function testRevertSwapWithoutLiquidity() public {
        uint256 swapAmount = 100 * 10**18;
        
        vm.prank(bob);
        vm.expectRevert("MiniAMM: no liquidity");
        amm.swap(swapAmount, 0);
    }

    function testRevertRemoveLiquidityWithoutBalance() public {
        vm.prank(bob);
        vm.expectRevert("MiniAMM: insufficient LP token balance");
        amm.removeLiquidity(1000);
    }

    function testRevertInvalidSwapAmounts() public {
        // Add initial liquidity
        uint256 amountA = 1000 * 10**18;
        uint256 amountB = 2000 * 10**18;
        
        vm.prank(alice);
        amm.addLiquidity(amountA, amountB);
        
        vm.prank(bob);
        vm.expectRevert("MiniAMM: invalid swap amounts");
        amm.swap(100 * 10**18, 100 * 10**18);
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
