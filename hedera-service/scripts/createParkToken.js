import {
  Client,
  AccountId,
  PrivateKey,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  Hbar,
  TokenAssociateTransaction,
  AccountBalanceQuery
} from '@hashgraph/sdk';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function createParkToken() {
  const network = process.env.HEDERA_NETWORK || 'testnet';
  const accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
  const privateKey = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY);

  const client = network === 'testnet' ? Client.forTestnet() : Client.forMainnet();
  client.setOperator(accountId, privateKey);
  console.log(`Network: ${network}`);
  console.log(`Treasury Account: ${accountId.toString()}`);
  console.log('');

  try {
    const tokenCreateTx = await new TokenCreateTransaction()
      .setTokenName('ParkPulse Reward Token')
      .setTokenSymbol('PARK')
      .setDecimals(0)
      .setInitialSupply(10000000)
      .setTreasuryAccountId(accountId)
      .setAdminKey(privateKey.publicKey)
      .setSupplyKey(privateKey.publicKey)
      .setTokenType(TokenType.FungibleCommon)
      .setSupplyType(TokenSupplyType.Infinite)
      .setMaxTransactionFee(new Hbar(20))
      .freezeWith(client);

    const tokenCreateSign = await tokenCreateTx.sign(privateKey);
    const tokenCreateSubmit = await tokenCreateSign.execute(client);
    const tokenCreateReceipt = await tokenCreateSubmit.getReceipt(client);
    const tokenId = tokenCreateReceipt.tokenId;

    console.log(`PARK Token created successfully!`);
    console.log(`Token ID: ${tokenId.toString()}`);
    console.log(`Token Name: ParkPulse Reward Token`);
    console.log(`Token Symbol: PARK`);
    console.log(`Decimals: 0`);
    console.log(`Initial Supply: 10,000,000 PARK`);
    console.log('');

    const balanceQuery = await new AccountBalanceQuery()
      .setAccountId(accountId)
      .execute(client);

    const tokenBalance = balanceQuery.tokens.get(tokenId);
    console.log(`Treasury Balance: ${tokenBalance.toNumber()} PARK`);
    console.log('');

    const deploymentsPath = path.join(__dirname, '../../deployments-hedera.json');
    let deployments = {};

    if (fs.existsSync(deploymentsPath)) {
      deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }

    deployments.parkTokenId = tokenId.toString();
    deployments.parkTokenCreatedAt = new Date().toISOString();

    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
    console.log(`Token ID saved to deployments-hedera.json`);
    console.log('');

    console.log('=== Next Steps ===');
    console.log('Add this to your .env file:');
    console.log(`PARK_TOKEN_ID=${tokenId.toString()}`);
    console.log('');
    console.log('Users will need to associate this token with their account before receiving rewards.');
    console.log('');

    return tokenId.toString();
  } catch (error) {
    console.error('Error creating PARK token:', error);
    throw error;
  } finally {
    client.close();
  }
}

createParkToken()
  .then((tokenId) => {
    console.log('Token creation completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Token creation failed:', error);
    process.exit(1);
  });
