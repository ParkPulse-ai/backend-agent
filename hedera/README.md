# ParkPulse Hedera Smart Contracts

Solidity smart contracts for ParkPulse.ai voting system on Hedera Hashgraph.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment

Make sure `hedera-service/.env` has your credentials:
```env
HEDERA_ACCOUNT_ID=0.0.XXXXXXX
HEDERA_PRIVATE_KEY=302e020100...
HEDERA_NETWORK=testnet
```

### 3. Compile Contract

```bash
npm run compile
```

This creates compiled artifacts in `artifacts/` directory.

### 4. Deploy to Testnet

```bash
npm run deploy:testnet
```

### 5. Deploy to Mainnet

```bash
npm run deploy:mainnet
```

## Contract Details

### CommunityVoting.sol

Main voting contract with:
- Proposal creation with environmental data
- Voting mechanism (yes/no)
- Demographic tracking
- Status management (Active/Accepted/Declined)
- View functions for querying data

### Functions

**Write Functions:**
- `createProposal()` - Create new proposal
- `vote()` - Submit vote on proposal
- `updateProposalStatus()` - Update status after voting ends
- `forceCloseProposal()` - Admin function to close proposal

**View Functions:**
- `getProposal()` - Get proposal details
- `getVoteCounts()` - Get vote counts
- `getUserVote()` - Get user's vote
- `hasUserVoted()` - Check if user voted
- `isProposalActive()` - Check if proposal is active
- `getAllActiveProposals()` - Get all active proposal IDs
- `getAllClosedProposals()` - Get all closed proposal IDs
- `getTotalProposals()` - Get total proposal count

## Deployment Info

After deployment, contract info is saved to `deployments.json`:

```json
{
  "hedera_testnet": {
    "contractAddress": "0xABC123...",
    "network": "hedera_testnet",
    "deployedAt": "2025-01-18T...",
    "explorerUrl": "https://hashscan.io/testnet/contract/0xABC123..."
  }
}
```

## Update .env Files

After deployment, update:

**hedera-service/.env:**
```env
HEDERA_CONTRACT_ID=0xABC123...
```

**parkpulsefe/.env.local:**
```env
NEXT_PUBLIC_HEDERA_CONTRACT_ID=0xABC123...
NEXT_PUBLIC_HEDERA_CONTRACT_ADDRESS=0xABC123...
```

## Verify on HashScan

Visit: https://hashscan.io/testnet/contract/YOUR_CONTRACT_ADDRESS

## Troubleshooting

### "Insufficient funds"
Get more test HBAR from https://portal.hedera.com/

### "Private key not found"
Make sure `HEDERA_PRIVATE_KEY` is set in `hedera-service/.env`

### "Compilation failed"
Make sure you have Node.js 18+ installed

## Scripts

- `npm run compile` - Compile contracts
- `npm run deploy:testnet` - Deploy to Hedera testnet
- `npm run deploy:mainnet` - Deploy to Hedera mainnet

## Tech Stack

- **Hardhat** - Ethereum development environment
- **Solidity 0.8.20** - Smart contract language
- **Hedera Hashgraph** - EVM-compatible blockchain
- **Ethers.js** - Library for contract interaction
