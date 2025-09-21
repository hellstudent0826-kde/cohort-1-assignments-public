// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

import {Test, console} from "forge-std/Test.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockERC20Test is Test {
    MockERC20 public token;
    
    address public alice = address(0x1);
    address public bob = address(0x2);

    function setUp() public {
        token = new MockERC20("Test Token", "TEST");
    }

    function testInitialState() public {
        assertEq(token.name(), "Test Token");
        assertEq(token.symbol(), "TEST");
        assertEq(token.decimals(), 18);
        assertEq(token.totalSupply(), 0);
    }

    function testFreeMintTo() public {
        uint256 amount = 1000 * 10**18;
        
        token.freeMintTo(amount, alice);
        
        assertEq(token.balanceOf(alice), amount);
        assertEq(token.totalSupply(), amount);
    }

    function testFreeMintToSender() public {
        uint256 amount = 1000 * 10**18;
        
        vm.prank(alice);
        token.freeMintToSender(amount);
        
        assertEq(token.balanceOf(alice), amount);
        assertEq(token.totalSupply(), amount);
    }

    function testMultipleMints() public {
        uint256 amount1 = 1000 * 10**18;
        uint256 amount2 = 500 * 10**18;
        
        token.freeMintTo(amount1, alice);
        token.freeMintTo(amount2, bob);
        
        assertEq(token.balanceOf(alice), amount1);
        assertEq(token.balanceOf(bob), amount2);
        assertEq(token.totalSupply(), amount1 + amount2);
    }

    function testTransfer() public {
        uint256 amount = 1000 * 10**18;
        
        token.freeMintTo(amount, alice);
        
        vm.prank(alice);
        token.transfer(bob, 300 * 10**18);
        
        assertEq(token.balanceOf(alice), 700 * 10**18);
        assertEq(token.balanceOf(bob), 300 * 10**18);
    }

    function testApproveAndTransferFrom() public {
        uint256 amount = 1000 * 10**18;
        uint256 transferAmount = 300 * 10**18;
        
        token.freeMintTo(amount, alice);
        
        vm.prank(alice);
        token.approve(bob, transferAmount);
        
        vm.prank(bob);
        token.transferFrom(alice, bob, transferAmount);
        
        assertEq(token.balanceOf(alice), amount - transferAmount);
        assertEq(token.balanceOf(bob), transferAmount);
        assertEq(token.allowance(alice, bob), 0);
    }
}
