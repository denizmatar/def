//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract MTRToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("GOLD", "MTR") {
        _mint(msg.sender, initialSupply);
        decimals();
    }
}
