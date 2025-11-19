// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Simple Community Voting Contract for Hedera
 * Optimized to fit within Hedera's contract size limits
 */
contract SimpleVoting {
    struct Proposal {
        string parkName;
        string parkId;
        string description;
        uint256 endDate;
        uint256 yesVotes;
        uint256 noVotes;
        bool exists;
        bool active;
        address creator;
    }

    mapping(uint64 => Proposal) public proposals;
    mapping(uint64 => mapping(address => bool)) public hasVoted;

    uint64 public proposalCount;

    event ProposalCreated(uint64 indexed proposalId, string parkName, address creator);
    event VoteCast(uint64 indexed proposalId, address voter, bool vote);

    function createProposal(
        string memory parkName,
        string memory parkId,
        string memory description,
        uint256 endDate
    ) public returns (uint64) {
        proposalCount++;
        uint64 newProposalId = proposalCount;

        proposals[newProposalId] = Proposal({
            parkName: parkName,
            parkId: parkId,
            description: description,
            endDate: endDate,
            yesVotes: 0,
            noVotes: 0,
            exists: true,
            active: true,
            creator: msg.sender
        });

        emit ProposalCreated(newProposalId, parkName, msg.sender);
        return newProposalId;
    }

    function vote(uint64 proposalId, bool voteValue) public {
        require(proposals[proposalId].exists, "Proposal does not exist");
        require(proposals[proposalId].active, "Proposal is not active");
        require(block.timestamp <= proposals[proposalId].endDate, "Voting period has ended");
        require(!hasVoted[proposalId][msg.sender], "Already voted");

        hasVoted[proposalId][msg.sender] = true;

        if (voteValue) {
            proposals[proposalId].yesVotes++;
        } else {
            proposals[proposalId].noVotes++;
        }

        emit VoteCast(proposalId, msg.sender, voteValue);
    }

    function getProposal(uint64 proposalId) public view returns (
        string memory parkName,
        string memory parkId,
        string memory description,
        uint256 endDate,
        uint256 yesVotes,
        uint256 noVotes,
        bool active,
        address creator
    ) {
        Proposal memory p = proposals[proposalId];
        return (
            p.parkName,
            p.parkId,
            p.description,
            p.endDate,
            p.yesVotes,
            p.noVotes,
            p.active,
            p.creator
        );
    }

    function userHasVoted(uint64 proposalId, address user) public view returns (bool) {
        return hasVoted[proposalId][user];
    }

    function closeProposal(uint64 proposalId) public {
        require(proposals[proposalId].exists, "Proposal does not exist");
        require(msg.sender == proposals[proposalId].creator, "Only creator can close");

        proposals[proposalId].active = false;
    }
}
