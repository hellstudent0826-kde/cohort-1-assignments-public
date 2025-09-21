// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

import {IMiniAMMFactory} from "./IMiniAMMFactory.sol";
import {MiniAMM} from "./MiniAMM.sol";

contract MiniAMMFactory is IMiniAMMFactory {
    mapping(address => mapping(address => address)) public pairs;
    address[] public allPairs;
    
    event PairCreated(address indexed tokenA, address indexed tokenB, address pair, uint256);

    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, "MiniAMMFactory: identical addresses");
        require(tokenA != address(0) && tokenB != address(0), "MiniAMMFactory: zero address");
        
        // Ensure consistent ordering
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        
        require(pairs[token0][token1] == address(0), "MiniAMMFactory: pair exists");
        
        // Create new MiniAMM pair
        bytes memory bytecode = abi.encodePacked(type(MiniAMM).creationCode, abi.encode(token0, token1));
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        
        assembly {
            pair := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
        }
        
        require(pair != address(0), "MiniAMMFactory: create2 failed");
        
        pairs[token0][token1] = pair;
        pairs[token1][token0] = pair; // populate mapping in the reverse direction
        allPairs.push(pair);
        
        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    function getPair(address tokenA, address tokenB) external view returns (address pair) {
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        return pairs[token0][token1];
    }

    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }
}
