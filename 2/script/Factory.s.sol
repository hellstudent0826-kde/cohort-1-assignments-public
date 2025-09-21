// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {MiniAMMFactory} from "../src/MiniAMMFactory.sol";
import {MiniAMM} from "../src/MiniAMM.sol";
import {MockERC20} from "../src/MockERC20.sol";

contract FactoryScript is Script {
    MiniAMMFactory public miniAMMFactory;
    MockERC20 public token0;
    MockERC20 public token1;
    address public pair;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        // Step 1: Deploy MiniAMMFactory
        console.log("Deploying MiniAMMFactory...");
        miniAMMFactory = new MiniAMMFactory();
        console.log("MiniAMMFactory deployed at:", address(miniAMMFactory));

        // Step 2: Deploy two MockERC20 tokens
        console.log("Deploying Token0 (TKA)...");
        token0 = new MockERC20("Token Alpha", "TKA");
        console.log("Token0 deployed at:", address(token0));

        console.log("Deploying Token1 (TKB)...");
        token1 = new MockERC20("Token Beta", "TKB");
        console.log("Token1 deployed at:", address(token1));

        // Step 3: Create a MiniAMM pair using the factory
        console.log("Creating MiniAMM pair...");
        pair = miniAMMFactory.createPair(address(token0), address(token1));
        console.log("MiniAMM pair created at:", pair);

        vm.stopBroadcast();

        // Log deployment addresses
        console.log("=== MiniAMM Factory Deployment Complete ===");
        console.log("MiniAMMFactory:", address(miniAMMFactory));
        console.log("Token0 (TKA):", address(token0));
        console.log("Token1 (TKB):", address(token1));
        console.log("MiniAMM Pair:", pair);
        console.log("===========================================");
    }
}
