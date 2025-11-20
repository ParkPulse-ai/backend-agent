import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { HederaService } from './services/hedera-service.js';
import { contractRoutes } from './routes/contract-routes.js';
import { hcsRoutes } from './routes/hcs-routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

const hederaService = new HederaService();
app.locals.hederaService = hederaService;

app.get('/', (req, res) => {
  res.json({
    name: 'ParkPulse Hedera Service',
    version: '1.0.0',
    description: 'Hedera Hashgraph microservice for ParkPulse.ai',
    endpoints: {
      contract: '/api/contract - Smart contract operations',
      hcs: '/api/hcs - Hedera Consensus Service operations',
      health: '/health - Health check'
    }
  });
});

app.get('/health', async (req, res) => {
  try {
    const balance = await hederaService.getAccountBalance();
    res.json({
      status: 'ok',
      network: process.env.HEDERA_NETWORK || 'testnet',
      accountId: process.env.HEDERA_ACCOUNT_ID,
      balance: balance.toString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

app.use('/api/contract', contractRoutes);
app.use('/api/hcs', hcsRoutes);

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`Hedera Service running on port ${PORT}`);
  console.log(`Network: ${process.env.HEDERA_NETWORK || 'testnet'}`);
  console.log(`Account: ${process.env.HEDERA_ACCOUNT_ID}`);
});
