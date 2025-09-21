// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {MiniAMM} from "../src/MiniAMM.sol";
import {MockERC20} from "../src/MockERC20.sol";

contract DirectDeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("C2FLR_WL_PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy MockERC20 tokens
        MockERC20 tokenA = new MockERC20("Token A", "TKA");
        MockERC20 tokenB = new MockERC20("Token B", "TKB");
        
        console.log("Token A deployed at:", address(tokenA));
        console.log("Token B deployed at:", address(tokenB));

        // Deploy MiniAMM directly
        MiniAMM miniAMM = new MiniAMM(address(tokenA), address(tokenB));
        console.log("MiniAMM deployed at:", address(miniAMM));
        console.log("MiniAMM tokenX:", miniAMM.tokenX());
        console.log("MiniAMM tokenY:", miniAMM.tokenY());
        console.log("MiniAMM LP token:", miniAMM.getLPTokenAddress());

        vm.stopBroadcast();
    }
}
