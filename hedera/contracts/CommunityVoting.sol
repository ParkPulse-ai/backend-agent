// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CommunityVoting {

    // Events
    event ProposalCreated(
        uint64 indexed proposalId,
        string parkName,
        string parkId,
        uint256 endDate,
        string creatorAccountId
    );

    event VoteCast(
        uint64 indexed proposalId,
        address indexed voter,
        bool vote
    );

    event ProposalStatusUpdated(
        uint64 indexed proposalId,
        ProposalStatus newStatus
    );

    event ContractInitialized(address indexed deployer);

    enum ProposalStatus {
        Active,
        Accepted,
        Declined
    }

    struct EnvironmentalData {
        uint256 ndviBefore;
        uint256 ndviAfter;
        uint256 pm25Before;
        uint256 pm25After;
        uint256 pm25IncreasePercent;
        uint256 vegetationLossPercent;
    }

    struct Demographics {
        uint64 children;
        uint64 adults;
        uint64 seniors;
        uint64 totalAffectedPopulation;
    }

    struct Proposal {
        uint64 id;
        string parkName;
        string parkId;
        string description;
        uint256 endDate;
        ProposalStatus status;
        uint64 yesVotes;
        uint64 noVotes;
        EnvironmentalData environmentalData;
        Demographics demographics;
        string creatorAccountId;  // Hedera account ID in 0.0.XXXXX format
    }

    // State variables
    mapping(uint64 => Proposal) public proposals;
    mapping(uint64 => mapping(address => bool)) public userVotes;
    mapping(uint64 => mapping(address => bool)) public hasVoted;
    uint64 public proposalCounter;
    address public owner;

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier proposalExists(uint64 proposalId) {
        require(proposals[proposalId].id != 0, "Proposal does not exist");
        _;
    }

    modifier proposalActive(uint64 proposalId) {
        require(proposals[proposalId].status == ProposalStatus.Active, "Proposal is not active");
        _;
    }

    modifier hasNotVoted(uint64 proposalId, address voter) {
        require(!hasVoted[proposalId][voter], "User has already voted");
        _;
    }

    modifier votingPeriodActive(uint64 proposalId) {
        require(block.timestamp <= proposals[proposalId].endDate, "Voting period has ended");
        _;
    }

    constructor() {
        owner = msg.sender;
        proposalCounter = 0;
        emit ContractInitialized(msg.sender);
    }

    function createProposal(
        string memory parkName,
        string memory parkId,
        string memory description,
        uint256 endDate,
        EnvironmentalData memory environmentalData,
        Demographics memory demographics,
        string memory creatorAccountId
    ) public returns (uint64) {
        require(bytes(parkName).length > 0, "Park name cannot be empty");
        require(bytes(parkId).length > 0, "Park ID cannot be empty");
        require(bytes(creatorAccountId).length > 0, "Creator account ID cannot be empty");
        require(endDate > block.timestamp, "End date must be in the future");

        proposalCounter++;
        uint64 proposalId = proposalCounter;

        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.parkName = parkName;
        proposal.parkId = parkId;
        proposal.description = description;
        proposal.endDate = endDate;
        proposal.status = ProposalStatus.Active;
        proposal.yesVotes = 0;
        proposal.noVotes = 0;
        proposal.environmentalData = environmentalData;
        proposal.demographics = demographics;
        proposal.creatorAccountId = creatorAccountId;

        emit ProposalCreated(
            proposalId,
            parkName,
            parkId,
            endDate,
            creatorAccountId
        );

        return proposalId;
    }

    function vote(
        uint64 proposalId,
        bool voteValue,
        address voter
    )
        public
        proposalExists(proposalId)
        proposalActive(proposalId)
        hasNotVoted(proposalId, voter)
        votingPeriodActive(proposalId)
    {
        // Record the vote
        userVotes[proposalId][voter] = voteValue;
        hasVoted[proposalId][voter] = true;

        // Update vote count
        if (voteValue) {
            proposals[proposalId].yesVotes++;
        } else {
            proposals[proposalId].noVotes++;
        }

        emit VoteCast(proposalId, voter, voteValue);
    }

    function updateProposalStatus(uint64 proposalId)
        public
        onlyOwner
        proposalExists(proposalId)
        proposalActive(proposalId)
    {
        require(block.timestamp > proposals[proposalId].endDate, "Voting period has not ended");

        ProposalStatus newStatus = ProposalStatus.Declined;
        if (proposals[proposalId].yesVotes > proposals[proposalId].noVotes) {
            newStatus = ProposalStatus.Accepted;
        }

        proposals[proposalId].status = newStatus;

        emit ProposalStatusUpdated(proposalId, newStatus);
    }

    function forceCloseProposal(uint64 proposalId, ProposalStatus newStatus)
        public
        onlyOwner
        proposalExists(proposalId)
        proposalActive(proposalId)
    {
        proposals[proposalId].status = newStatus;
        emit ProposalStatusUpdated(proposalId, newStatus);
    }

    function getProposal(uint64 proposalId)
        public
        view
        proposalExists(proposalId)
        returns (Proposal memory)
    {
        return proposals[proposalId];
    }

    function getVoteCounts(uint64 proposalId)
        public
        view
        proposalExists(proposalId)
        returns (uint64 yesVotes, uint64 noVotes)
    {
        return (proposals[proposalId].yesVotes, proposals[proposalId].noVotes);
    }

    function getUserVote(uint64 proposalId, address user)
        public
        view
        proposalExists(proposalId)
        returns (bool voteValue, bool voted)
    {
        return (userVotes[proposalId][user], hasVoted[proposalId][user]);
    }

    function hasUserVoted(uint64 proposalId, address user)
        public
        view
        proposalExists(proposalId)
        returns (bool)
    {
        return hasVoted[proposalId][user];
    }

    function isProposalActive(uint64 proposalId)
        public
        view
        proposalExists(proposalId)
        returns (bool)
    {
        return proposals[proposalId].status == ProposalStatus.Active &&
               block.timestamp <= proposals[proposalId].endDate;
    }

    function getAllActiveProposals() public view returns (uint64[] memory) {
        uint64 activeCount = 0;

        // Count active proposals
        for (uint64 i = 1; i <= proposalCounter; i++) {
            if (proposals[i].status == ProposalStatus.Active) {
                activeCount++;
            }
        }

        // Create array and populate
        uint64[] memory activeProposals = new uint64[](activeCount);
        uint64 index = 0;

        for (uint64 i = 1; i <= proposalCounter; i++) {
            if (proposals[i].status == ProposalStatus.Active) {
                activeProposals[index] = i;
                index++;
            }
        }

        return activeProposals;
    }

    function getAllClosedProposals() public view returns (uint64[] memory) {
        uint64 closedCount = 0;

        // Count closed proposals
        for (uint64 i = 1; i <= proposalCounter; i++) {
            if (proposals[i].status == ProposalStatus.Accepted ||
                proposals[i].status == ProposalStatus.Declined) {
                closedCount++;
            }
        }

        // Create array and populate
        uint64[] memory closedProposals = new uint64[](closedCount);
        uint64 index = 0;

        for (uint64 i = 1; i <= proposalCounter; i++) {
            if (proposals[i].status == ProposalStatus.Accepted ||
                proposals[i].status == ProposalStatus.Declined) {
                closedProposals[index] = i;
                index++;
            }
        }

        return closedProposals;
    }

    function getTotalProposals() public view returns (uint64) {
        return proposalCounter;
    }
}
