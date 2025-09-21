// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

import {IMiniAMMFactory} from "./IMiniAMMFactory.sol";
import {MiniAMM} from "./MiniAMM.sol";

// Add as many variables or functions as you would like
// for the implementation. The goal is to pass `forge test`.
contract MiniAMMFactory is IMiniAMMFactory {
    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;
    
    event PairCreated(address indexed token0, address indexed token1, address pair, uint256 pairNumber);
    
    constructor() {}
    
    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }
    
    function createPair(address tokenA, address tokenB) external returns (address pair) {
        // Check for zero addresses
        require(tokenA != address(0), "Zero address");
        require(tokenB != address(0), "Zero address");
        
        // Check for identical addresses
        require(tokenA != tokenB, "Identical addresses");
        
        // Order tokens by address (token0 < token1)
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        
        // Check if pair already exists
        require(getPair[token0][token1] == address(0), "Pair exists");
        
        // Create new MiniAMM pair
        MiniAMM newPair = new MiniAMM(token0, token1);
        pair = address(newPair);
        
        // Store pair in mapping (both directions)
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair;
        
        // Add to allPairs array
        allPairs.push(pair);
        
        // Emit event
        emit PairCreated(token0, token1, pair, allPairs.length);
        
        return pair;
    }
}
