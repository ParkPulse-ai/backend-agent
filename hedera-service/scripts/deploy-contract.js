import {
  Client,
  AccountId,
  PrivateKey,
  ContractCreateFlow
} from '@hashgraph/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('Deploying ParkPulseCommunity contract to Hedera...\n');

  const network = process.env.HEDERA_NETWORK || 'testnet';
  const accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
  const privateKey = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY);

  const client = network === 'testnet'
    ? Client.forTestnet()
    : Client.forMainnet();

  client.setOperator(accountId, privateKey);

  console.log(`Network: ${network}`);
  console.log(`Account: ${accountId.toString()}\n`);
  const contractPath = path.join(__dirname, '../artifacts/contracts/ParkPulseCommunity.sol/ParkPulseCommunity.json');

  if (!fs.existsSync(contractPath)) {
    throw new Error(`Contract artifact not found at ${contractPath}\nRun 'npm run compile' first in hedera-service/`);
  }

  const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  const bytecode = contractJson.bytecode;

  if (!bytecode || bytecode === '0x') {
    throw new Error('Contract bytecode is empty. Make sure the contract compiled successfully.');
  }

  console.log(`Contract bytecode loaded (${bytecode.length} bytes)`);
  console.log('Deploying contract to Hedera...\n');

  const contractCreateTx = await new ContractCreateFlow()
    .setBytecode(bytecode)
    .setGas(4000000)
    .execute(client);

  const contractCreateRx = await contractCreateTx.getReceipt(client);
  const contractId = contractCreateRx.contractId;

  console.log('\nContract deployed successfully!');
  console.log(`Contract ID: ${contractId.toString()}`);
  console.log(`Network: ${network}`);
  console.log(`Explorer: https://hashscan.io/${network}/contract/${contractId.toString()}`);

  const deploymentInfo = {
    contractId: contractId.toString(),
    network,
    deployedAt: new Date().toISOString(),
    explorerUrl: `https://hashscan.io/${network}/contract/${contractId.toString()}`,
    accountId: accountId.toString()
  };

  const deploymentPath = path.join(__dirname, '../deployments-hedera.json');
  let deployments = {};

  if (fs.existsSync(deploymentPath)) {
    deployments = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  }

  deployments[network] = deploymentInfo;
  fs.writeFileSync(deploymentPath, JSON.stringify(deployments, null, 2));

  console.log('Deployment info saved to hedera-service/deployments-hedera.json\n');
  console.log('Next steps:');
  console.log('1. Update hedera-service/.env:');
  console.log(`   HEDERA_CONTRACT_ID=${contractId.toString()}`);
  console.log('\n2. Update parkpulsefe/.env.local:');
  console.log(`   NEXT_PUBLIC_HEDERA_CONTRACT_ID=${contractId.toString()}`);
  console.log('\n3. Restart hedera-service');

  client.close();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Deployment failed:', error);
    process.exit(1);
  });
