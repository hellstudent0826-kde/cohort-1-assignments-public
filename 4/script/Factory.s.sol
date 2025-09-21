// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {MiniAMMFactory} from "../src/MiniAMMFactory.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {MiniAMM} from "../src/MiniAMM.sol";

contract FactoryScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("C2FLR_WL_PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy MiniAMMFactory
        MiniAMMFactory factory = new MiniAMMFactory();
        console.log("MiniAMMFactory deployed at:", address(factory));

        // Deploy two MockERC20 tokens
        MockERC20 tokenA = new MockERC20("Token A", "TKA");
        MockERC20 tokenB = new MockERC20("Token B", "TKB");
        
        console.log("Token A deployed at:", address(tokenA));
        console.log("Token B deployed at:", address(tokenB));

        // Create a pair using the factory
        address pair = factory.createPair(address(tokenA), address(tokenB));
        console.log("Pair created at:", pair);

        // Verify the pair was created correctly
        address retrievedPair = factory.getPair(address(tokenA), address(tokenB));
        require(retrievedPair == pair, "Pair retrieval failed");
        console.log("Pair verification successful");

        // Get pair info
        MiniAMM pairContract = MiniAMM(pair);
        console.log("Pair tokenX:", pairContract.tokenX());
        console.log("Pair tokenY:", pairContract.tokenY());
        console.log("Pair LP token:", pairContract.getLPTokenAddress());

        vm.stopBroadcast();
    }
}
