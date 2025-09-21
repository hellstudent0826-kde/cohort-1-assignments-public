// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "../src/MiniAMM.sol";
import "../src/MiniAMMLP.sol";
import "../src/MockERC20.sol";

contract PrecisionTest is Test {
    MiniAMM public miniAMM;
    MiniAMMLP public lpToken;
    MockERC20 public tokenA;
    MockERC20 public tokenB;
    
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    
    function setUp() public {
        // Deploy tokens
        tokenA = new MockERC20("Token A", "TKA");
        tokenB = new MockERC20("Token B", "TKB");
        
        // Deploy LP token
        lpToken = new MiniAMMLP();
        
        // Deploy MiniAMM
        miniAMM = new MiniAMM(address(tokenA), address(tokenB));
        
        // Set minter
        lpToken.setMinter(address(miniAMM));
        
        // Mint tokens to users
        tokenA.freeMintToSender(1000000 * 1e18); // 1M tokens
        tokenB.freeMintToSender(1000000 * 1e18); // 1M tokens
        
        // Transfer tokens to users
        tokenA.transfer(user1, 100000 * 1e18); // 100K tokens
        tokenB.transfer(user1, 100000 * 1e18); // 100K tokens
        tokenA.transfer(user2, 100000 * 1e18); // 100K tokens
        tokenB.transfer(user2, 100000 * 1e18); // 100K tokens
    }
    
    function testInitialLiquidityPrecision() public {
        // User1 provides initial liquidity: 50000 Token A, 5000 Token B (10:1 ratio)
        vm.startPrank(user1);
        
        tokenA.approve(address(miniAMM), 50000 * 1e18);
        tokenB.approve(address(miniAMM), 5000 * 1e18);
        
        miniAMM.addLiquidity(50000 * 1e18, 5000 * 1e18);
        
        // Check reserves
        (uint256 xReserve, uint256 yReserve) = miniAMM.getReserves();
        
        // Reserves should be exactly what was provided
        assertEq(xReserve, 50000 * 1e18, "xReserve should be exactly 50000 tokens");
        assertEq(yReserve, 5000 * 1e18, "yReserve should be exactly 5000 tokens");
        
        // Check ratio
        uint256 ratio = (yReserve * 1e18) / xReserve;
        assertEq(ratio, 0.1 * 1e18, "Ratio should be exactly 0.1 (10:1)");
        
        vm.stopPrank();
    }
    
    function testGetRequiredAmountPrecision() public {
        // First provide initial liquidity
        vm.startPrank(user1);
        tokenA.approve(address(miniAMM), 50000 * 1e18);
        tokenB.approve(address(miniAMM), 5000 * 1e18);
        miniAMM.addLiquidity(50000 * 1e18, 5000 * 1e18);
        vm.stopPrank();
        
        // Test getRequiredYAmount with various amounts
        uint256[] memory testAmounts = new uint256[](5);
        testAmounts[0] = 1000 * 1e18;   // 1000 Token A
        testAmounts[1] = 5000 * 1e18;   // 5000 Token A
        testAmounts[2] = 10000 * 1e18;  // 10000 Token A
        testAmounts[3] = 25000 * 1e18;  // 25000 Token A
        testAmounts[4] = 50000 * 1e18;  // 50000 Token A
        
        for (uint256 i = 0; i < testAmounts.length; i++) {
            uint256 xAmount = testAmounts[i];
            uint256 requiredY = miniAMM.getRequiredYAmount(xAmount);
            
            // Calculate expected amount (10:1 ratio)
            uint256 expectedY = xAmount / 10;
            
            // Check precision: difference should be at most 1 wei
            uint256 difference = requiredY > expectedY ? requiredY - expectedY : expectedY - requiredY;
            assertLe(difference, 1, "Precision loss should be at most 1 wei");
            
            // Log precision results
            emit log_named_uint("xAmount", xAmount / 1e18);
            emit log_named_uint("requiredY", requiredY / 1e18);
            emit log_named_uint("expectedY", expectedY / 1e18);
            emit log_named_uint("diff", difference);
        }
    }
    
    function testGetRequiredXAmountPrecision() public {
        // First provide initial liquidity
        vm.startPrank(user1);
        tokenA.approve(address(miniAMM), 50000 * 1e18);
        tokenB.approve(address(miniAMM), 5000 * 1e18);
        miniAMM.addLiquidity(50000 * 1e18, 5000 * 1e18);
        vm.stopPrank();
        
        // Test getRequiredXAmount with various amounts
        uint256[] memory testAmounts = new uint256[](5);
        testAmounts[0] = 100 * 1e18;    // 100 Token B
        testAmounts[1] = 500 * 1e18;    // 500 Token B
        testAmounts[2] = 1000 * 1e18;   // 1000 Token B
        testAmounts[3] = 2500 * 1e18;   // 2500 Token B
        testAmounts[4] = 5000 * 1e18;   // 5000 Token B
        
        for (uint256 i = 0; i < testAmounts.length; i++) {
            uint256 yAmount = testAmounts[i];
            uint256 requiredX = miniAMM.getRequiredXAmount(yAmount);
            
            // Calculate expected amount (10:1 ratio)
            uint256 expectedX = yAmount * 10;
            
            // Check precision: difference should be at most 1 wei
            uint256 difference = requiredX > expectedX ? requiredX - expectedX : expectedX - requiredX;
            assertLe(difference, 1, "Precision loss should be at most 1 wei");
            
            // Log precision results
            emit log_named_uint("yAmount", yAmount / 1e18);
            emit log_named_uint("requiredX", requiredX / 1e18);
            emit log_named_uint("expectedX", expectedX / 1e18);
            emit log_named_uint("diff", difference);
        }
    }
    
    function testAddLiquidityPrecision() public {
        // First provide initial liquidity
        vm.startPrank(user1);
        tokenA.approve(address(miniAMM), 50000 * 1e18);
        tokenB.approve(address(miniAMM), 5000 * 1e18);
        miniAMM.addLiquidity(50000 * 1e18, 5000 * 1e18);
        vm.stopPrank();
        
        // User2 adds more liquidity with exact ratio
        vm.startPrank(user2);
        
        // Calculate required amounts
        uint256 xAmount = 2000 * 1e18; // 2000 Token A
        uint256 requiredY = miniAMM.getRequiredYAmount(xAmount);
        
        emit log_named_uint("Adding liquidity xAmount", xAmount / 1e18);
        emit log_named_uint("Adding liquidity requiredY", requiredY / 1e18);
        
        // Approve and add liquidity
        tokenA.approve(address(miniAMM), xAmount);
        tokenB.approve(address(miniAMM), requiredY);
        
        // This should succeed without precision errors
        miniAMM.addLiquidity(xAmount, requiredY);
        
        // Check that reserves increased correctly
        (uint256 xReserve, uint256 yReserve) = miniAMM.getReserves();
        emit log_named_uint("Final xReserve", xReserve / 1e18);
        emit log_named_uint("Final yReserve", yReserve / 1e18);
        
        // Check that ratio is maintained (within 1 wei tolerance)
        uint256 expectedYReserve = (5000 + 200) * 1e18; // 5000 + 200 = 5200
        uint256 difference = yReserve > expectedYReserve ? yReserve - expectedYReserve : expectedYReserve - yReserve;
        assertLe(difference, 1, "Reserve ratio should be maintained within 1 wei");
        
        vm.stopPrank();
    }
    
    function testSwapPrecision() public {
        // First provide initial liquidity
        vm.startPrank(user1);
        tokenA.approve(address(miniAMM), 50000 * 1e18);
        tokenB.approve(address(miniAMM), 5000 * 1e18);
        miniAMM.addLiquidity(50000 * 1e18, 5000 * 1e18);
        vm.stopPrank();
        
        // User2 performs a swap
        vm.startPrank(user2);
        
        uint256 swapAmount = 1000 * 1e18; // 1000 Token A
        tokenA.approve(address(miniAMM), swapAmount);
        
        // Get initial reserves
        (uint256 xReserveBefore, uint256 yReserveBefore) = miniAMM.getReserves();
        
        // Perform swap
        miniAMM.swap(swapAmount, 0);
        
        // Get final reserves
        (uint256 xReserveAfter, uint256 yReserveAfter) = miniAMM.getReserves();
        
        // Check that reserves changed correctly
        assertEq(xReserveAfter, xReserveBefore + swapAmount, "xReserve should increase by swap amount");
        assertTrue(yReserveAfter < yReserveBefore, "yReserve should decrease");
        
        // Check that K is maintained (within small tolerance due to fees)
        uint256 kBefore = xReserveBefore * yReserveBefore;
        uint256 kAfter = xReserveAfter * yReserveAfter;
        
        // K should increase due to fees (0.3% fee)
        assertTrue(kAfter > kBefore, "K should increase due to swap fees");
        
        emit log_named_uint("Swap xReserve before", xReserveBefore / 1e18);
        emit log_named_uint("Swap xReserve after", xReserveAfter / 1e18);
        emit log_named_uint("Swap yReserve before", yReserveBefore / 1e18);
        emit log_named_uint("Swap yReserve after", yReserveAfter / 1e18);
        emit log_named_uint("K before", kBefore);
        emit log_named_uint("K after", kAfter);
        
        vm.stopPrank();
    }
}
