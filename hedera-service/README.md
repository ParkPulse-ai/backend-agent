# ParkPulse Hedera Service

**Hedera Hashgraph microservice for ParkPulse.ai - Smart Contract & Consensus Service Integration**

---

## 🔗 Deployed Contract Information

| Property | Value |
|----------|-------|
| **Contract Name** | ParkPulseCommunity |
| **Contract ID** | `0.0.7298075` |
| **HCS Topic ID** | `0.0.7284567` |
| **Network** | Hedera Testnet |
| **Explorer** | [View on HashScan](https://hashscan.io/testnet/contract/0.0.7298075) |
| **Deployer Account** | `0.0.5523459` |

---

## 📖 Overview

This service provides a Node.js/Express microservice that interfaces with Hedera Hashgraph, handling:
- **Smart Contract Interactions**: Deploy and interact with the ParkPulseCommunity Solidity contract
- **Hedera Consensus Service (HCS)**: Immutable, timestamped proposal and voting logs
- **REST API**: Python backend-friendly HTTP interface for blockchain operations

---

## 🏗️ Architecture

```
parkpulsebe/hedera-service/
├── contracts/                 # Solidity smart contracts
│   └── ParkPulseCommunity.sol # Main voting contract
├── scripts/
│   ├── compile.js            # Custom Solidity compiler
│   └── deploy-contract.js    # Hedera deployment script
├── src/
│   ├── index.js              # Express server entry point
│   ├── routes/               # API route handlers
│   └── services/             # Hedera SDK services
├── artifacts/                # Compiled contract artifacts (generated)
├── hardhat.config.cjs        # Hardhat configuration
├── package.json
├── .env                      # Environment variables
└── deployments-hedera.json   # Deployment records
```

---

## ⚙️ Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher
- **Hedera Testnet Account**: With HBAR for gas fees
- **Hedera Private Key**: ECDSA format

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd parkpulsebe/hedera-service
npm install
```

### 2. Configure Environment

Create `.env` file (or copy from `.env.example`):

```env
PORT=5000

# Hedera Network Configuration
HEDERA_NETWORK=testnet
HEDERA_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID
HEDERA_PRIVATE_KEY=your_private_key_here

# Deployed Contract & Topic
HEDERA_CONTRACT_ID=0.0.7298075
HEDERA_HCS_TOPIC_ID=0.0.7284567
```

**⚠️ Important**: Never commit your `.env` file with real private keys!

### 3. Start the Service

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The service will be available at: `http://localhost:5000`

---

## 🔨 Smart Contract Development

### Compile Contract

```bash
npm run compile
```

This uses Hardhat with the following settings:
- **Solidity Version**: 0.8.20
- **Optimizer**: Enabled (1000 runs)
- **Via IR**: true (for complex contracts)

**Output**: Artifacts are generated in `artifacts/contracts/ParkPulseCommunity.sol/`

### Deploy Contract

```bash
npm run deploy
```

This will:
1. Compile the contract (if needed)
2. Deploy to Hedera Testnet
3. Save deployment info to `deployments-hedera.json`
4. Display new contract ID and explorer link

**After Deployment**:
- Update `HEDERA_CONTRACT_ID` in `.env`
- Update frontend `.env.local` with new contract ID
- Restart the service

---

## 📡 API Endpoints

### Health Check

```bash
GET /health
```

Returns service status and configuration.

### Contract Information

```bash
GET /api/contract/info
```

Response:
```json
{
  "success": true,
  "network": "testnet",
  "accountId": "0.0.5523459",
  "contractId": "0.0.7298075",
  "explorerUrl": "https://hashscan.io/testnet"
}
```

### Create Proposal

```bash
POST /api/contract/create-proposal
Content-Type: application/json

{
  "parkName": "Central Park",
  "parkId": "park_001",
  "description": "Protect from commercial development",
  "endDate": 1735689600000,
  "environmentalData": {
    "ndviBefore": 850,
    "ndviAfter": 400,
    "pm25Before": 15,
    "pm25After": 45,
    "pm25IncreasePercent": 200,
    "vegetationLossPercent": 53
  },
  "demographics": {
    "children": 1200,
    "adults": 3500,
    "seniors": 800,
    "totalAffectedPopulation": 5500
  },
  "creator": "0.0.5523459",
  "fundraisingEnabled": false,
  "fundingGoal": 0
}
```

### Submit Vote

```bash
POST /api/contract/vote
Content-Type: application/json

{
  "proposalId": 1,
  "vote": true,
  "voter": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8"
}
```

### Get Proposal

```bash
GET /api/contract/proposal/:id
```

### Get Active Proposals

```bash
GET /api/contract/proposals/active
```

### Get Accepted Proposals

```bash
GET /api/contract/proposals/accepted
```

### Get Rejected Proposals

```bash
GET /api/contract/proposals/rejected
```

---

## 🔐 Security Best Practices

1. **Never commit private keys**: Always use environment variables
2. **Testnet first**: Test thoroughly on testnet before mainnet
3. **Rate limiting**: Implement in production environments
4. **CORS configuration**: Configure allowed origins in production
5. **Input validation**: All inputs are validated server-side

---

## 🧪 Testing

```bash
# Run tests
npm test

# Test contract interaction
curl http://localhost:5000/api/contract/info
```

---

## 📦 Dependencies

### Production
- `@hashgraph/sdk`: Hedera JavaScript SDK
- `express`: Web framework
- `cors`: Cross-origin resource sharing
- `dotenv`: Environment variable management
- `ethers`: Ethereum utilities (for address handling)

### Development
- `hardhat`: Smart contract development framework
- `@nomicfoundation/hardhat-toolbox`: Hardhat plugins
- `solc`: Solidity compiler
- `nodemon`: Auto-reload during development

---

## 🔄 Deployment Workflow

1. **Develop Contract**: Edit `contracts/ParkPulseCommunity.sol`
2. **Compile**: `npm run compile`
3. **Test Locally**: Run integration tests
4. **Deploy to Testnet**: `npm run deploy`
5. **Verify on HashScan**: Check contract at explorer URL
6. **Update Environment**: Update contract ID in all `.env` files
7. **Deploy to Mainnet**: Change `HEDERA_NETWORK=mainnet` and redeploy

---

## 🐛 Troubleshooting

### Contract Not Found
- Ensure `HEDERA_CONTRACT_ID` in `.env` matches deployed contract
- Check network matches (testnet vs mainnet)

### Compilation Errors
- Stack too deep? `viaIR: true` is enabled in hardhat.config.cjs
- Check Solidity version matches (0.8.20)

### Deployment Fails
- Verify HBAR balance in deployer account
- Check private key format (ECDSA, no `0x` prefix)
- Ensure network connectivity to Hedera nodes

### HashScan Verification
- Partial match? Ensure optimizer runs = 1000
- Full match achieved with current configuration

---

## 📚 Additional Resources

- **Hedera Documentation**: https://docs.hedera.com/
- **Hedera SDK (JS)**: https://github.com/hashgraph/hedera-sdk-js
- **HashScan Explorer**: https://hashscan.io/
- **Hardhat Documentation**: https://hardhat.org/

---

Made with ❤️ for ParkPulse.ai
