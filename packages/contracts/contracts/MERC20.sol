//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "openzeppelin-solidity/contracts/token/ERC1155/ERC1155.sol";

// contract MTRToken is ERC20 {
//     constructor(uint256 initialSupply) ERC20("GOLD", "MTR") {
//         _mint(msg.sender, initialSupply);
//         decimals();
//     }
// }

contract MTRToken is ERC1155 {
    uint256 public constant GOLD = 0;
    uint256 public constant SILVER = 1;

    constructor() ERC1155("") {
        _mint(msg.sender, GOLD, 10**18, "");
        _mint(msg.sender, SILVER, 10**27, "");
    }
}
