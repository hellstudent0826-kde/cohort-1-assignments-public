// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IMiniAMMLP} from "./IMiniAMMLP.sol";

contract MiniAMMLP is ERC20, IMiniAMMLP {
    address public minter;

    modifier onlyMinter() {
        require(msg.sender == minter, "MiniAMMLP: caller is not the minter");
        _;
    }

    constructor() ERC20("MiniAMM LP Token", "MLP") {
        minter = msg.sender;
    }

    function mint(address to, uint256 amount) external onlyMinter {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyMinter {
        _burn(from, amount);
    }

    function setMinter(address _minter) external {
        require(msg.sender == minter, "MiniAMMLP: caller is not the current minter");
        minter = _minter;
    }
}
