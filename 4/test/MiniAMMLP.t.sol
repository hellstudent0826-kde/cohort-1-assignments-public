// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

import {Test, console} from "forge-std/Test.sol";
import {MiniAMMLP} from "../src/MiniAMMLP.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MiniAMMLPTest is Test {
    MiniAMMLP public lpToken;
    
    address public alice = address(0x1);
    address public bob = address(0x2);

    function setUp() public {
        lpToken = new MiniAMMLP();
    }

    function testInitialState() public {
        assertEq(lpToken.name(), "MiniAMM LP Token");
        assertEq(lpToken.symbol(), "MLP");
        assertEq(lpToken.decimals(), 18);
        assertEq(lpToken.totalSupply(), 0);
        assertEq(lpToken.minter(), address(this));
    }

    function testMint() public {
        uint256 amount = 1000 * 10**18;
        
        lpToken.mint(alice, amount);
        
        assertEq(lpToken.balanceOf(alice), amount);
        assertEq(lpToken.totalSupply(), amount);
    }

    function testBurn() public {
        uint256 amount = 1000 * 10**18;
        
        // First mint some tokens
        lpToken.mint(alice, amount);
        assertEq(lpToken.balanceOf(alice), amount);
        
        // Then burn half
        lpToken.burn(alice, amount / 2);
        
        assertEq(lpToken.balanceOf(alice), amount / 2);
        assertEq(lpToken.totalSupply(), amount / 2);
    }

    function testSetMinter() public {
        lpToken.setMinter(alice);
        assertEq(lpToken.minter(), alice);
    }

    function testRevertMintNotMinter() public {
        vm.prank(alice);
        vm.expectRevert("MiniAMMLP: caller is not the minter");
        lpToken.mint(bob, 1000);
    }

    function testRevertBurnNotMinter() public {
        lpToken.mint(alice, 1000);
        
        vm.prank(alice);
        vm.expectRevert("MiniAMMLP: caller is not the minter");
        lpToken.burn(alice, 500);
    }

    function testRevertSetMinterNotCurrentMinter() public {
        vm.prank(alice);
        vm.expectRevert("MiniAMMLP: caller is not the current minter");
        lpToken.setMinter(bob);
    }

    function testRevertBurnInsufficientBalance() public {
        lpToken.mint(alice, 1000);
        
        vm.expectRevert();
        lpToken.burn(alice, 2000);
    }
}
