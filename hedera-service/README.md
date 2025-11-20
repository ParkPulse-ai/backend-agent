# ParkPulse Hedera Service

Node.js microservice that provides a REST API for interacting with Hedera Hashgraph blockchain.

**Location**: `parkpulsebe/hedera-service/` - Integrated within the Python backend directory

## Features

- **Smart Contract Service**: Deploy and interact with ParkPulseCommunity Solidity contract
- **Hedera Consensus Service (HCS)**: Immutable, timestamped voting logs
- **Solidity Contracts**: Smart contracts located in `contracts/` directory
- **REST API**: Python backend-friendly HTTP interface
- **Multi-network**: Support for testnet and mainnet

## Directory Structure

```
parkpulsebe/hedera-service/
├── contracts/           # Solidity smart contracts
│   ├── ParkPulseCommunity.sol
│   └── SimpleVoting.sol
├── src/                # Node.js service code
│   ├── index.js       # Main entry point
│   ├── routes/        # API routes
│   └── services/      # Hedera service logic
├── scripts/           # Deployment scripts
├── artifacts/         # Compiled contracts
├── hardhat.config.js  # Hardhat configuration
├── .env              # Environment variables
└── package.json      # Node.js dependencies
```

## Prerequisites

- Node.js 18+
- Hedera testnet account (get from https://portal.hedera.com/)

## Installation

```bash
cd parkpulsebe/hedera-service
npm install
```

## Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Fill in your Hedera credentials:
```env
HEDERA_NETWORK=testnet
HEDERA_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID
HEDERA_PRIVATE_KEY=YOUR_PRIVATE_KEY
```

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

The service will run on `http://localhost:5000`

## Deploy Smart Contract

1. Compile the Solidity contract to bytecode
2. Deploy using the API:

```bash
curl -X POST http://localhost:5000/api/contract/deploy \
  -H "Content-Type: application/json" \
  -d '{"contractBytecode": "0x..."}'
```

3. Update `.env` with the returned contract ID

## Create HCS Topic

```bash
curl -X POST http://localhost:5000/api/hcs/create-topic \
  -H "Content-Type: application/json" \
  -d '{"memo": "ParkPulse Voting Logs"}'
```

Update `.env` with the returned topic ID.

## API Endpoints

### Contract Operations

- `GET /api/contract/info` - Get contract information
- `POST /api/contract/deploy` - Deploy contract
- `POST /api/contract/create-proposal` - Create proposal
- `POST /api/contract/vote` - Submit vote
- `GET /api/contract/proposal/:id` - Get proposal details
- `GET /api/contract/proposals/active` - Get active proposals
- `GET /api/contract/has-voted/:proposalId/:address` - Check if user voted

### HCS Operations

- `POST /api/hcs/create-topic` - Create HCS topic
- `POST /api/hcs/submit` - Submit message to HCS
- `GET /api/hcs/topic-info` - Get topic information

## Example: Create Proposal

```bash
curl -X POST http://localhost:5000/api/contract/create-proposal \
  -H "Content-Type: application/json" \
  -d '{
    "parkName": "Central Park",
    "parkId": "park_001",
    "description": "Protect Central Park from development",
    "endDate": 1735689600,
    "environmentalData": {
      "ndviBefore": 75000000,
      "ndviAfter": 15000000,
      "pm25Before": 1200000000,
      "pm25After": 3500000000,
      "pm25IncreasePercent": 19166666667,
      "vegetationLossPercent": 60000000000
    },
    "demographics": {
      "children": 5000,
      "adults": 15000,
      "seniors": 3000,
      "totalAffectedPopulation": 23000
    },
    "creator": "0x0000000000000000000000000000000000000000"
  }'
```

## Example: Submit Vote

```bash
curl -X POST http://localhost:5000/api/contract/vote \
  -H "Content-Type: application/json" \
  -d '{
    "proposalId": 1,
    "vote": true,
    "voter": "0xYOUR_WALLET_ADDRESS"
  }'
```

## Integration with Python Backend

From your Python backend, call the Hedera service:

```python
import httpx

HEDERA_SERVICE_URL = "http://localhost:5000"

async def create_proposal_on_hedera(proposal_data):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{HEDERA_SERVICE_URL}/api/contract/create-proposal",
            json=proposal_data
        )
        return response.json()
```

## Network Costs

### Testnet
- Free for testing
- Get test HBAR from https://portal.hedera.com/

### Mainnet
- Contract deployment: ~$1-2 USD
- Create proposal: ~$0.01 USD
- Submit vote: ~$0.005 USD
- HCS message: $0.0008 USD

Much cheaper than Ethereum!

## Troubleshooting

### Error: "Insufficient balance"
Get test HBAR from the Hedera portal or fund your account.

### Error: "Contract not deployed"
Deploy the contract first using `/api/contract/deploy`.

### Error: "HCS topic not created"
Create a topic first using `/api/hcs/create-topic`.

## License

MIT
