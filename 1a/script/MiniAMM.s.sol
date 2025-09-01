// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {MiniAMM} from "../src/MiniAMM.sol";
import {MockERC20} from "../src/MockERC20.sol";

contract MiniAMMScript is Script {
    MiniAMM public miniAMM;
    MockERC20 public token0;
    MockERC20 public token1;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        // Deploy mock ERC20 tokens one by one
        console.log("Deploying Token0 (TKA)...");
        token0 = new MockERC20("Token Alpha", "TKA");
        console.log("Token0 deployed at:", address(token0));

        console.log("Deploying Token1 (TKB)...");
        token1 = new MockERC20("Token Beta", "TKB");
        console.log("Token1 deployed at:", address(token1));

        // Deploy MiniAMM with the tokens
        console.log("Deploying MiniAMM...");
        miniAMM = new MiniAMM(address(token0), address(token1));
        console.log("MiniAMM deployed at:", address(miniAMM));

        vm.stopBroadcast();

        // Log deployment addresses
        console.log("=== MiniAMM Deployment Complete ===");
        console.log("Token0 (TKA):", address(token0));
        console.log("Token1 (TKB):", address(token1));
        console.log("MiniAMM:", address(miniAMM));
        console.log("===================================");
    }
}
