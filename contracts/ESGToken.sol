// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract ESGToken is ERC20, ERC20Permit {

    constructor()
        ERC20("ESGToken", "ESG")
        ERC20Permit("ESGToken")
    {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }
}