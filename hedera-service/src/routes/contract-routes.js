import express from 'express';

export const contractRoutes = express.Router();

/**
 * GET /api/contract/info
 * Get contract information
 */
contractRoutes.get('/info', async (req, res, next) => {
  try {
    const hederaService = req.app.locals.hederaService;

    res.json({
      success: true,
      network: hederaService.network,
      accountId: hederaService.accountId.toString(),
      contractId: hederaService.contractId?.toString() || null,
      explorerUrl: hederaService.network === 'testnet'
        ? 'https://hashscan.io/testnet'
        : 'https://hashscan.io/mainnet'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/contract/deploy
 * Deploy the ParkPulseCommunity contract
 */
contractRoutes.post('/deploy', async (req, res, next) => {
  try {
    const hederaService = req.app.locals.hederaService;
    const { contractBytecode } = req.body;

    if (!contractBytecode) {
      return res.status(400).json({
        success: false,
        error: 'Contract bytecode required'
      });
    }

    const result = await hederaService.deployContract(contractBytecode);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/contract/create-proposal
 * Create a new proposal
 */
contractRoutes.post('/create-proposal', async (req, res, next) => {
  try {
    const hederaService = req.app.locals.hederaService;
    const proposalData = req.body;
    const required = ['parkName', 'parkId', 'description', 'endDate', 'environmentalData', 'demographics'];
    for (const field of required) {
      if (!proposalData[field]) {
        return res.status(400).json({
          success: false,
          error: `Missing required field: ${field}`
        });
      }
    }

    if (!proposalData.creator) {
      proposalData.creator = hederaService.accountId.toString();
      console.log(`Using operator account ID as creator: ${proposalData.creator}`);
    }

    const result = await hederaService.createProposal(proposalData);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/contract/vote
 * Submit a vote
 */
contractRoutes.post('/vote', async (req, res, next) => {
  try {
    const hederaService = req.app.locals.hederaService;
    const { proposalId, vote, voter } = req.body;

    if (proposalId === undefined || vote === undefined || !voter) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: proposalId, vote, voter'
      });
    }

    const result = await hederaService.submitVote(
      parseInt(proposalId),
      vote === true || vote === 'true' || vote === 'yes',
      voter
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/contract/proposal/:id
 * Get proposal details
 */
contractRoutes.get('/proposal/:id', async (req, res, next) => {
  try {
    const hederaService = req.app.locals.hederaService;
    const proposalId = parseInt(req.params.id);

    if (isNaN(proposalId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid proposal ID'
      });
    }

    const result = await hederaService.getProposal(proposalId);

    if (result === null) {
      return res.status(404).json({
        success: false,
        error: 'Proposal does not exist'
      });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/contract/proposals/active
 * Get all active proposals
 */
contractRoutes.get('/proposals/active', async (req, res, next) => {
  try {
    const hederaService = req.app.locals.hederaService;
    const result = await hederaService.getAllActiveProposals();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/contract/proposals/accepted
 * Get all accepted proposals
 */
contractRoutes.get('/proposals/accepted', async (req, res, next) => {
  try {
    const hederaService = req.app.locals.hederaService;
    const result = await hederaService.getAllAcceptedProposals();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/contract/proposals/rejected
 * Get all rejected proposals
 */
contractRoutes.get('/proposals/rejected', async (req, res, next) => {
  try {
    const hederaService = req.app.locals.hederaService;
    const result = await hederaService.getAllRejectedProposals();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/contract/has-voted/:proposalId/:address
 * Check if user has voted
 */
contractRoutes.get('/has-voted/:proposalId/:address', async (req, res, next) => {
  try {
    const hederaService = req.app.locals.hederaService;
    const proposalId = parseInt(req.params.proposalId);
    const address = req.params.address;

    if (isNaN(proposalId) || !address) {
      return res.status(400).json({
        success: false,
        error: 'Invalid proposal ID or address'
      });
    }

    const result = await hederaService.hasUserVoted(proposalId, address);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/contract/close-proposal
 * Close a proposal and finalize voting results
 */
contractRoutes.post('/close-proposal', async (req, res, next) => {
  try {
    const hederaService = req.app.locals.hederaService;
    const { proposalId } = req.body;

    if (proposalId === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: proposalId'
      });
    }

    const result = await hederaService.closeProposal(parseInt(proposalId));
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/contract/set-funding-goal
 * Set funding goal for an accepted proposal
 */
contractRoutes.post('/set-funding-goal', async (req, res, next) => {
  try {
    const hederaService = req.app.locals.hederaService;
    const { proposalId, goal } = req.body;

    if (proposalId === undefined || goal === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: proposalId, goal'
      });
    }

    const result = await hederaService.setFundingGoal(
      parseInt(proposalId),
      parseFloat(goal)
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/contract/donate
 * Donate HBAR to an accepted proposal
 */
contractRoutes.post('/donate', async (req, res, next) => {
  try {
    const hederaService = req.app.locals.hederaService;
    const { proposalId, amount } = req.body;

    if (proposalId === undefined || amount === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: proposalId, amount'
      });
    }

    const result = await hederaService.donateToProposal(
      parseInt(proposalId),
      parseFloat(amount)
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/contract/send-park-tokens
 * Send PARK tokens to a user
 */
contractRoutes.post('/send-park-tokens', async (req, res, next) => {
  try {
    const hederaService = req.app.locals.hederaService;
    const { recipientAccountId } = req.body;

    if (!recipientAccountId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: recipientAccountId'
      });
    }
    const amount = 5; 
    const result = await hederaService.transferParkTokens(recipientAccountId, amount);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/contract/donation-progress/:proposalId
 * Get donation progress for a proposal
 */
contractRoutes.get('/donation-progress/:proposalId', async (req, res, next) => {
  try {
    const hederaService = req.app.locals.hederaService;
    const proposalId = parseInt(req.params.proposalId);

    if (isNaN(proposalId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid proposal ID'
      });
    }

    const result = await hederaService.getDonationProgress(proposalId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/contract/withdraw-funds
 * Withdraw funds from a proposal (owner only)
 */
contractRoutes.post('/withdraw-funds', async (req, res, next) => {
  try {
    const hederaService = req.app.locals.hederaService;
    const { proposalId, recipient } = req.body;

    if (proposalId === undefined || !recipient) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: proposalId, recipient'
      });
    }

    const result = await hederaService.withdrawFunds(
      parseInt(proposalId),
      recipient
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});
