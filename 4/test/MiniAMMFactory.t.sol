// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

import {Test, console} from "forge-std/Test.sol";
import {MiniAMMFactory} from "../src/MiniAMMFactory.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {MiniAMM} from "../src/MiniAMM.sol";

contract MiniAMMFactoryTest is Test {
    MiniAMMFactory public factory;
    MockERC20 public tokenA;
    MockERC20 public tokenB;
    MockERC20 public tokenC;

    function setUp() public {
        factory = new MiniAMMFactory();
        tokenA = new MockERC20("Token A", "TKA");
        tokenB = new MockERC20("Token B", "TKB");
        tokenC = new MockERC20("Token C", "TKC");
    }

    function testCreatePair() public {
        address pair = factory.createPair(address(tokenA), address(tokenB));
        
        assertTrue(pair != address(0), "Pair should be created");
        assertEq(factory.getPair(address(tokenA), address(tokenB)), pair);
        assertEq(factory.getPair(address(tokenB), address(tokenA)), pair);
        assertEq(factory.allPairsLength(), 1);
        assertEq(factory.allPairs(0), pair);
        
        // Verify pair contract properties
        MiniAMM pairContract = MiniAMM(pair);
        assertEq(pairContract.tokenX(), address(tokenA));
        assertEq(pairContract.tokenY(), address(tokenB));
    }

    function testCreatePairReverseOrder() public {
        address pair1 = factory.createPair(address(tokenA), address(tokenB));
        
        // Try to create the same pair in reverse order - should revert
        vm.expectRevert("MiniAMMFactory: pair exists");
        factory.createPair(address(tokenB), address(tokenA));
    }

    function testCreateMultiplePairs() public {
        address pair1 = factory.createPair(address(tokenA), address(tokenB));
        address pair2 = factory.createPair(address(tokenA), address(tokenC));
        address pair3 = factory.createPair(address(tokenB), address(tokenC));
        
        assertTrue(pair1 != address(0));
        assertTrue(pair2 != address(0));
        assertTrue(pair3 != address(0));
        assertTrue(pair1 != pair2);
        assertTrue(pair1 != pair3);
        assertTrue(pair2 != pair3);
        
        assertEq(factory.allPairsLength(), 3);
    }

    function testRevertCreatePairWithSameToken() public {
        vm.expectRevert("MiniAMMFactory: identical addresses");
        factory.createPair(address(tokenA), address(tokenA));
    }

    function testRevertCreatePairWithZeroAddress() public {
        vm.expectRevert("MiniAMMFactory: zero address");
        factory.createPair(address(0), address(tokenA));
        
        vm.expectRevert("MiniAMMFactory: zero address");
        factory.createPair(address(tokenA), address(0));
    }

    function testRevertCreateExistingPair() public {
        factory.createPair(address(tokenA), address(tokenB));
        
        vm.expectRevert("MiniAMMFactory: pair exists");
        factory.createPair(address(tokenA), address(tokenB));
    }

    function testGetPairNonExistent() public {
        address pair = factory.getPair(address(tokenA), address(tokenB));
        assertEq(pair, address(0));
    }

    function testAllPairsLength() public {
        assertEq(factory.allPairsLength(), 0);
        
        factory.createPair(address(tokenA), address(tokenB));
        assertEq(factory.allPairsLength(), 1);
        
        factory.createPair(address(tokenA), address(tokenC));
        assertEq(factory.allPairsLength(), 2);
    }
}
