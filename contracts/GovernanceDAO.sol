// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract GovernanceDAO {
    IERC20 public governanceToken;
    address public owner;

    struct Proposal {
        string description;
        uint256 voteCount;
        uint256 deadline;
        bool executed;
    }

    Proposal[] public proposals;

    mapping(uint256 => mapping(address => bool)) public hasVoted;

    modifier onlyOwner() {
        require(msg.sender == owner, "Apenas o owner pode executar");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // 🔧 Define o token depois do deploy (resolve seu erro)
    function setToken(address _token) external onlyOwner {
        require(address(governanceToken) == address(0), "Token ja definido");
        require(_token != address(0), "Endereco invalido");
        governanceToken = IERC20(_token);
    }

    function createProposal(string memory _description, uint256 duration) external {
        require(address(governanceToken) != address(0), "Token nao configurado");
        require(
            governanceToken.balanceOf(msg.sender) > 0,
            "Sem token para propor"
        );

        proposals.push(
            Proposal({
                description: _description,
                voteCount: 0,
                deadline: block.timestamp + duration,
                executed: false
            })
        );
    }

    function vote(uint256 proposalId) external {
        require(address(governanceToken) != address(0), "Token nao configurado");
        require(proposalId < proposals.length, "Proposta invalida");

        Proposal storage proposal = proposals[proposalId];

        require(block.timestamp < proposal.deadline, "Votacao encerrada");
        require(!hasVoted[proposalId][msg.sender], "Ja votou");

        uint256 votingPower = governanceToken.balanceOf(msg.sender);
        require(votingPower > 0, "Sem poder de voto");

        proposal.voteCount += votingPower;
        hasVoted[proposalId][msg.sender] = true;
    }

    function executeProposal(uint256 proposalId) external {
        require(proposalId < proposals.length, "Proposta invalida");

        Proposal storage proposal = proposals[proposalId];

        require(block.timestamp >= proposal.deadline, "Votacao ainda ativa");
        require(!proposal.executed, "Ja executada");

        proposal.executed = true;
    }

    function getProposalsCount() external view returns (uint256) {
        return proposals.length;
    }

    function getProposal(uint256 proposalId)
        external
        view
        returns (
            string memory description,
            uint256 voteCount,
            uint256 deadline,
            bool executed
        )
    {
        Proposal storage p = proposals[proposalId];
        return (p.description, p.voteCount, p.deadline, p.executed);
    }
}