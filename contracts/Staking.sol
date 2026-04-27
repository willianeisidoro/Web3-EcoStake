// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract Staking is Ownable, ReentrancyGuard {
    IERC20 public stakingToken;
    AggregatorV3Interface public priceFeed;

    mapping(address => uint256) public stakedBalance;
    mapping(address => uint256) public stakingTime;

    uint256 public rewardRate = 1;
    bool public configured;

    constructor() Ownable(msg.sender) {}

    function setConfig(address _token, address _priceFeed) external onlyOwner {
        require(!configured, "Ja configurado");
        require(_token != address(0), "Token invalido");
        require(_priceFeed != address(0), "PriceFeed invalido");

        stakingToken = IERC20(_token);
        priceFeed = AggregatorV3Interface(_priceFeed);
        configured = true;
    }

    function getLatestPrice() public view returns (int256) {
        require(configured, "Nao configurado");
        (, int256 price,,,) = priceFeed.latestRoundData();
        return price;
    }

    function stake(uint256 amount) external nonReentrant {
        require(configured, "Nao configurado");
        require(amount > 0, "Valor invalido");

        require(
            stakingToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );

        stakedBalance[msg.sender] += amount;
        stakingTime[msg.sender] = block.timestamp;
    }

    function unstake() external nonReentrant {
        require(configured, "Nao configurado");

        uint256 balance = stakedBalance[msg.sender];
        require(balance > 0, "Nada para retirar");

        uint256 reward = calculateReward(msg.sender);

        stakedBalance[msg.sender] = 0;
        stakingTime[msg.sender] = 0;

        require(
            stakingToken.transfer(msg.sender, balance + reward),
            "Transfer failed"
        );
    }

    function calculateReward(address user) public view returns (uint256) {
        if (!configured || stakingTime[user] == 0) return 0;

        uint256 timeStaked = block.timestamp - stakingTime[user];
        int256 ethPrice = getLatestPrice();

        uint256 priceMultiplier = uint256(ethPrice) / 1e8;
        if (priceMultiplier == 0) priceMultiplier = 1;

        return (stakedBalance[user] * timeStaked * rewardRate * priceMultiplier) / 1e18;
    }

    function setRewardRate(uint256 _rate) external onlyOwner {
        rewardRate = _rate;
    }
}