// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Staking is Ownable, ReentrancyGuard {
    IERC20 public stakingToken;

    mapping(address => uint256) public stakedBalance;
    mapping(address => uint256) public stakingTime;

    uint256 public rewardRate = 1; // taxa simples (ajustável)

    constructor(address _token) Ownable(msg.sender) {
        stakingToken = IERC20(_token);
    }

    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Valor invalido");

        stakingToken.transferFrom(msg.sender, address(this), amount);

        stakedBalance[msg.sender] += amount;
        stakingTime[msg.sender] = block.timestamp;
    }

    function unstake() external nonReentrant {
        uint256 balance = stakedBalance[msg.sender];
        require(balance > 0, "Nada para retirar");

        uint256 reward = calculateReward(msg.sender);

        stakedBalance[msg.sender] = 0;
        stakingTime[msg.sender] = 0;

        stakingToken.transfer(msg.sender, balance + reward);
    }

    function calculateReward(address user) public view returns (uint256) {
        uint256 timeStaked = block.timestamp - stakingTime[user];
        return (stakedBalance[user] * timeStaked * rewardRate) / 1e18;
    }

    function setRewardRate(uint256 _rate) external onlyOwner {
        rewardRate = _rate;
    }
}