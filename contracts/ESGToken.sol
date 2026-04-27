// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ESGToken is ERC20, Ownable {

    uint256 public faucetAmount = 100 * 10 ** 18;

    mapping(address => bool) public hasClaimed;

    constructor() ERC20("ESGToken", "ESG") Ownable(msg.sender) {}

    function claimFaucet() external {
        require(!hasClaimed[msg.sender], "Ja recebeu tokens");

        hasClaimed[msg.sender] = true;
        _mint(msg.sender, faucetAmount);
    }

    function setFaucetAmount(uint256 amount) external onlyOwner {
        faucetAmount = amount;
    }
}