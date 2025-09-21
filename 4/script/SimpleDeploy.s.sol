// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {MiniAMM} from "../src/MiniAMM.sol";
import {MockERC20} from "../src/MockERC20.sol";

contract SimpleDeployScript is Script {
    function run() external {
        // Use default account (first account from anvil)
        vm.startBroadcast();

        // Deploy two MockERC20 tokens
        MockERC20 tokenA = new MockERC20("Token A", "TKA");
        MockERC20 tokenB = new MockERC20("Token B", "TKB");
        
        console.log("Token A deployed at:", address(tokenA));
        console.log("Token B deployed at:", address(tokenB));

        // Deploy MiniAMM
        MiniAMM amm = new MiniAMM(address(tokenA), address(tokenB));
        console.log("MiniAMM deployed at:", address(amm));
        console.log("MiniAMM tokenX:", amm.tokenX());
        console.log("MiniAMM tokenY:", amm.tokenY());
        console.log("MiniAMM LP token:", amm.getLPTokenAddress());

        vm.stopBroadcast();
    }
}

