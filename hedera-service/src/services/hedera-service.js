import {
  Client,
  AccountId,
  PrivateKey,
  ContractExecuteTransaction,
  ContractCallQuery,
  ContractFunctionParameters,
  TopicId,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TopicInfoQuery,
  Hbar,
  AccountBalanceQuery,
  ContractCreateFlow,
  FileCreateTransaction,
  FileAppendTransaction
} from '@hashgraph/sdk';
import { ethers } from 'ethers';
import fs from 'fs';

export class HederaService {
  constructor() {
    this.network = process.env.HEDERA_NETWORK || 'testnet';
    this.accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
    this.privateKey = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY);

    if (this.network === 'testnet') {
      this.client = Client.forTestnet();
    } else if (this.network === 'mainnet') {
      this.client = Client.forMainnet();
    } else {
      throw new Error(`Unsupported network: ${this.network}`);
    }

    this.client.setOperator(this.accountId, this.privateKey);

    const contractIdEnv = process.env.HEDERA_CONTRACT_ID;
    if (contractIdEnv) {
      if (contractIdEnv.startsWith('0x')) {
        this.contractId = contractIdEnv;
      } else {
        this.contractId = contractIdEnv;
      }
    } else {
      this.contractId = null;
    }
    const topicIdEnv = process.env.HEDERA_HCS_TOPIC_ID;
    if (topicIdEnv) {
      try {
        TopicId.fromString(topicIdEnv);
        this.votingTopicId = topicIdEnv;
      } catch (error) {
        console.warn(`Invalid HEDERA_HCS_TOPIC_ID format: ${topicIdEnv}`);
        this.votingTopicId = null;
      }
    } else {
      this.votingTopicId = null;
    }

    console.log('Hedera Service initialized');
    console.log(`Network: ${this.network}`);
    console.log(`Account: ${this.accountId.toString()}`);
    console.log(`Contract: ${this.contractId || 'Not deployed'}`);
    console.log(`HCS Topic: ${this.votingTopicId || 'Not created'}`);
  }

  accountIdToEvmAddress(accountIdString) {
    try {
      const accountId = AccountId.fromString(accountIdString);
      return accountId.toSolidityAddress();
    } catch (error) {
      console.error('Failed to convert account ID to EVM address:', error);
      throw new Error(`Invalid Hedera account ID format: ${accountIdString}`);
    }
  }
  async getAccountBalance() {
    const balance = await new AccountBalanceQuery()
      .setAccountId(this.accountId)
      .execute(this.client);
    return balance.hbars;
  }

  async deployContract(contractBytecode) {
    try {
      const fileCreateTx = await new FileCreateTransaction()
        .setContents(contractBytecode)
        .setKeys([this.privateKey.publicKey])
        .setMaxTransactionFee(new Hbar(2))
        .execute(this.client);

      const fileCreateRx = await fileCreateTx.getReceipt(this.client);
      const bytecodeFileId = fileCreateRx.fileId;

      console.log(`Contract bytecode file: ${bytecodeFileId}`);

      const contractCreateTx = await new ContractCreateFlow()
        .setBytecodeFileId(bytecodeFileId)
        .setGas(100000)
        .setConstructorParameters(new ContractFunctionParameters())
        .execute(this.client);

      const contractCreateRx = await contractCreateTx.getReceipt(this.client);
      const contractId = contractCreateRx.contractId;

      console.log(`Contract deployed: ${contractId}`);
      this.contractId = contractId;

      return {
        success: true,
        contractId: contractId.toString(),
        fileId: bytecodeFileId.toString()
      };
    } catch (error) {
      console.error('Contract deployment failed:', error);
      throw error;
    }
  }

  async createProposal(proposalData) {
    if (!this.contractId) {
      throw new Error('Contract not deployed');
    }

    try {
      const {
        parkName,
        parkId,
        description,
        endDate,
        environmentalData,
        demographics,
        creator,
        fundraisingEnabled,
        fundingGoal
      } = proposalData;

      const iface = new ethers.Interface([
        'function createProposal(string parkName, string parkId, string description, uint256 endDate, tuple(uint256 ndviBefore, uint256 ndviAfter, uint256 pm25Before, uint256 pm25After, uint256 pm25IncreasePercent, uint256 vegetationLossPercent) environmentalData, tuple(uint64 children, uint64 adults, uint64 seniors, uint64 totalAffectedPopulation) demographics, string creatorAccountId, bool fundraisingEnabled, uint256 fundingGoal) returns (uint64)'
      ]);

      console.log(`Creating proposal with fundraising: enabled=${fundraisingEnabled}, goal=${fundingGoal} tinybars`);

      const encodedData = iface.encodeFunctionData('createProposal', [
        parkName,
        parkId,
        description,
        endDate,
        [
          environmentalData.ndviBefore,
          environmentalData.ndviAfter,
          environmentalData.pm25Before,
          environmentalData.pm25After,
          environmentalData.pm25IncreasePercent,
          environmentalData.vegetationLossPercent
        ],
        [
          demographics.children,
          demographics.adults,
          demographics.seniors,
          demographics.totalAffectedPopulation
        ],
        creator,
        fundraisingEnabled || false,
        fundingGoal || 0
      ]);

      const tx = await new ContractExecuteTransaction()
        .setContractId(this.contractId)
        .setGas(1000000)
        .setFunctionParameters(Buffer.from(encodedData.slice(2), 'hex'))
        .setMaxTransactionFee(new Hbar(2))
        .execute(this.client);

      const receipt = await tx.getReceipt(this.client);
      const transactionId = tx.transactionId.toString();

      if (this.votingTopicId) {
        try {
          console.log(`Logging proposal creation to HCS topic: ${this.votingTopicId}`);
          const hcsResult = await this.submitToHCS({
            type: 'PROPOSAL_CREATED',
            proposalData: {
              parkName: proposalData.parkName,
              parkId: proposalData.parkId,
              description: proposalData.description,
              endDate: proposalData.endDate,
              creator: proposalData.creator,
              fundraisingEnabled: proposalData.fundraisingEnabled,
              fundingGoal: proposalData.fundingGoal
            },
            transactionId,
            timestamp: Date.now()
          });
          console.log(`HCS logging successful! Transaction: ${hcsResult.transactionId}, Sequence: ${hcsResult.sequenceNumber}`);
        } catch (hcsError) {
          console.error('HCS logging failed (non-critical):', hcsError.message);
          console.error('Full HCS error:', hcsError);
        }
      } else {
        console.log('HCS topic not configured (votingTopicId is null/undefined), skipping proposal logging');
      }

      return {
        success: true,
        transactionId,
        status: receipt.status.toString()
      };
    } catch (error) {
      console.error('Create proposal failed:', error);
      throw error;
    }
  }

  async submitVote(proposalId, vote, voter) {
    if (!this.contractId) {
      throw new Error('Contract not deployed');
    }

    try {
      let voterEvmAddress = voter;
      if (voter.startsWith('0.0.')) {
        voterEvmAddress = this.accountIdToEvmAddress(voter);
        console.log(`Converted voter ${voter} to EVM address: ${voterEvmAddress}`);
      }

      const iface = new ethers.Interface([
        'function vote(uint64 proposalId, bool voteValue, address voter)'
      ]);

      const encodedData = iface.encodeFunctionData('vote', [
        proposalId,
        vote,
        voterEvmAddress
      ]);

      const tx = await new ContractExecuteTransaction()
        .setContractId(this.contractId)
        .setGas(150000)
        .setFunctionParameters(Buffer.from(encodedData.slice(2), 'hex'))
        .setMaxTransactionFee(new Hbar(1))
        .execute(this.client);

      const receipt = await tx.getReceipt(this.client);
      const transactionId = tx.transactionId.toString();

      if (this.votingTopicId) {
        await this.submitToHCS({
          type: 'VOTE_CAST',
          proposalId,
          vote,
          voter,
          transactionId,
          timestamp: Date.now()
        });
      }

      return {
        success: true,
        transactionId,
        status: receipt.status.toString()
      };
    } catch (error) {
      console.error('Submit vote failed:', error);
      throw error;
    }
  }

  async getProposal(proposalId) {
    if (!this.contractId) {
      throw new Error('Contract not deployed');
    }

    try {
      const iface = new ethers.Interface([
        'function getProposal(uint64 proposalId) view returns (tuple(uint64 id, string parkName, string parkId, string description, uint256 endDate, uint8 status, uint64 yesVotes, uint64 noVotes, tuple(uint256 ndviBefore, uint256 ndviAfter, uint256 pm25Before, uint256 pm25After, uint256 pm25IncreasePercent, uint256 vegetationLossPercent) environmentalData, tuple(uint64 children, uint64 adults, uint64 seniors, uint64 totalAffectedPopulation) demographics, string creatorAccountId, uint256 fundingGoal, uint256 totalFundsRaised, bool fundingEnabled))'
      ]);

      const encodedData = iface.encodeFunctionData('getProposal', [proposalId]);

      const query = await new ContractCallQuery()
        .setContractId(this.contractId)
        .setGas(300000)
        .setFunctionParameters(Buffer.from(encodedData.slice(2), 'hex'))
        .setMaxQueryPayment(new Hbar(1))
        .execute(this.client);

      const result = query.bytes;
      const decoded = iface.decodeFunctionResult('getProposal', result);

      const proposal = decoded[0];

      return {
        success: true,
        proposal: {
          id: Number(proposal.id),
          parkName: proposal.parkName,
          parkId: proposal.parkId,
          description: proposal.description,
          endDate: Number(proposal.endDate),
          status: Number(proposal.status),
          yesVotes: Number(proposal.yesVotes),
          noVotes: Number(proposal.noVotes),
          environmentalData: {
            ndviBefore: Number(proposal.environmentalData.ndviBefore),
            ndviAfter: Number(proposal.environmentalData.ndviAfter),
            pm25Before: Number(proposal.environmentalData.pm25Before),
            pm25After: Number(proposal.environmentalData.pm25After),
            pm25IncreasePercent: Number(proposal.environmentalData.pm25IncreasePercent),
            vegetationLossPercent: Number(proposal.environmentalData.vegetationLossPercent)
          },
          demographics: {
            children: Number(proposal.demographics.children),
            adults: Number(proposal.demographics.adults),
            seniors: Number(proposal.demographics.seniors),
            totalAffectedPopulation: Number(proposal.demographics.totalAffectedPopulation)
          },
          creator: proposal.creatorAccountId,
          fundingGoal: Number(proposal.fundingGoal),
          totalFundsRaised: Number(proposal.totalFundsRaised),
          fundingEnabled: Boolean(proposal.fundingEnabled)
        }
      };
    } catch (error) {
      const errorMessage = error?.contractFunctionResult?.errorMessage;
      if (errorMessage && errorMessage.includes('50726f706f73616c20646f6573206e6f74206578697374')) {
        return null;
      }

      console.error('Get proposal failed:', error);
      throw error;
    }
  }

  async getAllActiveProposals() {
    if (!this.contractId) {
      throw new Error('Contract not deployed');
    }

    try {
      const iface = new ethers.Interface([
        'function getAllActiveProposals() view returns (uint64[])'
      ]);

      const encodedData = iface.encodeFunctionData('getAllActiveProposals', []);

      const query = await new ContractCallQuery()
        .setContractId(this.contractId)
        .setGas(300000)
        .setFunctionParameters(Buffer.from(encodedData.slice(2), 'hex'))
        .setMaxQueryPayment(new Hbar(1))
        .execute(this.client);

      let proposalIds = [];
      try {
        const result = query.bytes;
        const decoded = iface.decodeFunctionResult('getAllActiveProposals', result);
        proposalIds = decoded[0].map(id => Number(id));
      } catch (parseError) {
        console.log('No active proposals or empty result:', parseError.message);
        proposalIds = [];
      }

      return {
        success: true,
        proposalIds
      };
    } catch (error) {
      console.error('Get active proposals failed:', error);
      return {
        success: true,
        proposalIds: []
      };
    }
  }

  async getAllAcceptedProposals() {
    if (!this.contractId) {
      throw new Error('Contract not deployed');
    }

    try {
      const iface = new ethers.Interface([
        'function getAllAcceptedProposals() view returns (uint64[])'
      ]);

      const encodedData = iface.encodeFunctionData('getAllAcceptedProposals', []);

      const query = await new ContractCallQuery()
        .setContractId(this.contractId)
        .setGas(300000)
        .setFunctionParameters(Buffer.from(encodedData.slice(2), 'hex'))
        .setMaxQueryPayment(new Hbar(1))
        .execute(this.client);

      let proposalIds = [];
      try {
        const result = query.bytes;
        const decoded = iface.decodeFunctionResult('getAllAcceptedProposals', result);
        proposalIds = decoded[0].map(id => Number(id));
      } catch (parseError) {
        console.log('No accepted proposals or empty result:', parseError.message);
        proposalIds = [];
      }

      return {
        success: true,
        proposalIds
      };
    } catch (error) {
      console.error('Get accepted proposals failed:', error);
      return {
        success: true,
        proposalIds: []
      };
    }
  }

  async getAllRejectedProposals() {
    if (!this.contractId) {
      throw new Error('Contract not deployed');
    }

    try {
      const iface = new ethers.Interface([
        'function getAllRejectedProposals() view returns (uint64[])'
      ]);

      const encodedData = iface.encodeFunctionData('getAllRejectedProposals', []);

      const query = await new ContractCallQuery()
        .setContractId(this.contractId)
        .setGas(300000)
        .setFunctionParameters(Buffer.from(encodedData.slice(2), 'hex'))
        .setMaxQueryPayment(new Hbar(1))
        .execute(this.client);

      let proposalIds = [];
      try {
        const result = query.bytes;
        const decoded = iface.decodeFunctionResult('getAllRejectedProposals', result);
        proposalIds = decoded[0].map(id => Number(id));
      } catch (parseError) {
        console.log('No rejected proposals or empty result:', parseError.message);
        proposalIds = [];
      }

      return {
        success: true,
        proposalIds
      };
    } catch (error) {
      console.error('Get rejected proposals failed:', error);
      return {
        success: true,
        proposalIds: []
      };
    }
  }

  async hasUserVoted(proposalId, userAddress) {
    if (!this.contractId) {
      throw new Error('Contract not deployed');
    }

    try {
      let userEvmAddress = userAddress;
      if (userAddress.startsWith('0.0.')) {
        userEvmAddress = this.accountIdToEvmAddress(userAddress);
        console.log(`Converted user ${userAddress} to EVM address: ${userEvmAddress}`);
      }

      const iface = new ethers.Interface([
        'function hasUserVoted(uint64 proposalId, address user) view returns (bool)'
      ]);

      const encodedData = iface.encodeFunctionData('hasUserVoted', [
        proposalId,
        userEvmAddress
      ]);

      const query = await new ContractCallQuery()
        .setContractId(this.contractId)
        .setGas(100000) // Increased gas for larger contract
        .setFunctionParameters(Buffer.from(encodedData.slice(2), 'hex'))
        .setMaxQueryPayment(new Hbar(0.5))
        .execute(this.client);

      const result = query.bytes;
      const decoded = iface.decodeFunctionResult('hasUserVoted', result);

      return {
        success: true,
        hasVoted: decoded[0]
      };
    } catch (error) {
      console.error('Check user voted failed:', error);
      throw error;
    }
  }

  async createHCSTopic(memo = 'ParkPulse Voting Logs') {
    try {
      const tx = await new TopicCreateTransaction()
        .setTopicMemo(memo)
        .setMaxTransactionFee(new Hbar(2))
        .execute(this.client);

      const receipt = await tx.getReceipt(this.client);
      const topicId = receipt.topicId;

      console.log(`HCS Topic created: ${topicId}`);

      return {
        success: true,
        topicId: topicId.toString()
      };
    } catch (error) {
      console.error('Create HCS topic failed:', error);
      throw error;
    }
  }

  async submitToHCS(message) {
    const topicIdString = message.topicId || this.votingTopicId;

    if (!topicIdString) {
      console.warn('HCS topic not specified, skipping message submission');
      return null;
    }

    try {
      const messageJson = JSON.stringify(message);
      console.log(`Submitting message to HCS topic ${topicIdString}: ${messageJson.substring(0, 100)}...`);
      const topicId = TopicId.fromString(topicIdString);

      const tx = await new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage(messageJson)
        .setMaxTransactionFee(new Hbar(1))
        .execute(this.client);

      const receipt = await tx.getReceipt(this.client);
      const transactionId = tx.transactionId.toString();

      console.log(`HCS message submitted successfully. Sequence: ${receipt.topicSequenceNumber}`);

      return {
        success: true,
        transactionId,
        sequenceNumber: receipt.topicSequenceNumber.toString()
      };
    } catch (error) {
      console.error('Submit to HCS failed:', error);
      throw error;
    }
  }

  async getHCSTopicInfo() {
    if (!this.votingTopicId) {
      throw new Error('HCS topic not created');
    }

    try {
      const info = await new TopicInfoQuery()
        .setTopicId(this.votingTopicId)
        .execute(this.client);

      return {
        success: true,
        topicId: info.topicId.toString(),
        memo: info.topicMemo,
        sequenceNumber: info.sequenceNumber.toString()
      };
    } catch (error) {
      console.error('Get HCS topic info failed:', error);
      throw error;
    }
  }

  async closeProposal(proposalId) {
    try {
      const proposalResult = await this.getProposal(proposalId);

      if (!proposalResult || !proposalResult.proposal) {
        throw new Error('Proposal not found');
      }

      const proposal = proposalResult.proposal;
      const newStatus = proposal.yesVotes > proposal.noVotes ? 1 : 2;
      console.log(`Proposal ${proposalId} votes: Yes=${proposal.yesVotes}, No=${proposal.noVotes}, Determined status: ${newStatus === 1 ? 'Accepted' : 'Declined'}`);
      const votingEnded = Date.now() > proposal.endDate * 1000;

      let encodedData;
      let functionName;

      if (votingEnded) {
        const iface = new ethers.Interface([
          'function updateProposalStatus(uint64 proposalId)'
        ]);
        encodedData = iface.encodeFunctionData('updateProposalStatus', [proposalId]);
        functionName = 'updateProposalStatus';
      } else {
        const iface = new ethers.Interface([
          'function forceCloseProposal(uint64 proposalId, uint8 newStatus)'
        ]);
        encodedData = iface.encodeFunctionData('forceCloseProposal', [proposalId, newStatus]);
        functionName = 'forceCloseProposal';
      }

      console.log(`Closing proposal ${proposalId} using ${functionName} (status: ${newStatus === 1 ? 'Accepted' : 'Declined'})`);

      const tx = await new ContractExecuteTransaction()
        .setContractId(this.contractId)
        .setGas(300000)
        .setFunctionParameters(Buffer.from(encodedData.slice(2), 'hex'))
        .setMaxTransactionFee(new Hbar(2))
        .execute(this.client);

      const receipt = await tx.getReceipt(this.client);

      console.log(`Proposal ${proposalId} closed successfully`);

      return {
        success: true,
        transactionId: tx.transactionId.toString(),
        status: receipt.status.toString()
      };
    } catch (error) {
      console.error('Close proposal failed:', error);
      throw error;
    }
  }

  async setFundingGoal(proposalId, goalInHbar) {
    try {
      const goalInTinybars = ethers.parseUnits(goalInHbar.toString(), 8);

      const iface = new ethers.Interface([
        'function setFundingGoal(uint64 proposalId, uint256 goalInTinybars)'
      ]);
      const encodedData = iface.encodeFunctionData('setFundingGoal', [proposalId, goalInTinybars]);

      const tx = await new ContractExecuteTransaction()
        .setContractId(this.contractId)
        .setGas(200000)
        .setFunctionParameters(Buffer.from(encodedData.slice(2), 'hex'))
        .setMaxTransactionFee(new Hbar(2))
        .execute(this.client);

      const receipt = await tx.getReceipt(this.client);

      console.log(`Funding goal set for proposal ${proposalId}: ${goalInHbar} HBAR`);

      return {
        success: true,
        transactionId: tx.transactionId.toString(),
        goal: goalInHbar
      };
    } catch (error) {
      console.error('Set funding goal failed:', error);
      throw error;
    }
  }

  async donateToProposal(proposalId, amountInHbar) {
    try {
      const iface = new ethers.Interface([
        'function donateToProposal(uint64 proposalId) payable'
      ]);
      const encodedData = iface.encodeFunctionData('donateToProposal', [proposalId]);

      const tx = await new ContractExecuteTransaction()
        .setContractId(this.contractId)
        .setGas(250000)
        .setPayableAmount(new Hbar(amountInHbar))
        .setFunctionParameters(Buffer.from(encodedData.slice(2), 'hex'))
        .setMaxTransactionFee(new Hbar(2))
        .execute(this.client);

      const receipt = await tx.getReceipt(this.client);

      console.log(`Donated ${amountInHbar} HBAR to proposal ${proposalId}`);

      return {
        success: true,
        transactionId: tx.transactionId.toString(),
        donationAmount: amountInHbar
      };
    } catch (error) {
      console.error('Donation failed:', error);
      throw error;
    }
  }

  async getDonationProgress(proposalId) {
    try {
      const iface = new ethers.Interface([
        'function getDonationProgress(uint64 proposalId) view returns (uint256 raised, uint256 goal, uint256 percentage)'
      ]);
      const encodedData = iface.encodeFunctionData('getDonationProgress', [proposalId]);

      const query = await new ContractCallQuery()
        .setContractId(this.contractId)
        .setGas(200000)
        .setFunctionParameters(Buffer.from(encodedData.slice(2), 'hex'))
        .setMaxQueryPayment(new Hbar(0.5))
        .execute(this.client);

      const result = query.bytes;
      const decoded = iface.decodeFunctionResult('getDonationProgress', result);

      const raised = parseFloat(ethers.formatUnits(decoded[0], 8));
      const goal = parseFloat(ethers.formatUnits(decoded[1], 8));
      const percentage = parseInt(decoded[2].toString());

      return {
        success: true,
        raised,
        goal,
        percentage
      };
    } catch (error) {
      console.error('Get donation progress failed:', error);
      throw error;
    }
  }

  async withdrawFunds(proposalId, recipientAddress) {
    try {
      const iface = new ethers.Interface([
        'function withdrawFunds(uint64 proposalId, address recipientAddress)'
      ]);
      const encodedData = iface.encodeFunctionData('withdrawFunds', [proposalId, recipientAddress]);

      const tx = await new ContractExecuteTransaction()
        .setContractId(this.contractId)
        .setGas(300000)
        .setFunctionParameters(Buffer.from(encodedData.slice(2), 'hex'))
        .setMaxTransactionFee(new Hbar(2))
        .execute(this.client);
      
      const receipt = await tx.getReceipt(this.client);
      console.log(`Withdrew funds from proposal ${proposalId} to ${recipientAddress}`);

      return {
        success: true,
        transactionId: tx.transactionId.toString()
      };
    } catch (error) {
      console.error('Withdraw funds failed:', error);
      throw error;
    }
  }
}
