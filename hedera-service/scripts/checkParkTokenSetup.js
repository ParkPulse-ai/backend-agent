import {
  Client,
  AccountId,
  PrivateKey,
  TokenId,
  AccountBalanceQuery
} from '@hashgraph/sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkSetup() {
  console.log('\n=== PARK Token Setup Check ===\n');

  // Check environment variables
  const network = process.env.HEDERA_NETWORK;
  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.HEDERA_PRIVATE_KEY;
  const parkTokenId = process.env.PARK_TOKEN_ID;

  console.log('📋 Configuration:');
  console.log(`   Network: ${network || '❌ NOT SET'}`);
  console.log(`   Treasury Account: ${accountId || '❌ NOT SET'}`);
  console.log(`   Private Key: ${privateKey ? '✅ SET' : '❌ NOT SET'}`);
  console.log(`   PARK Token ID: ${parkTokenId || '❌ NOT SET'}`);
  console.log('');

  if (!network || !accountId || !privateKey || !parkTokenId) {
    console.error('❌ Configuration incomplete! Check your .env file.');
    process.exit(1);
  }

  try {
    const account = AccountId.fromString(accountId);
    const key = PrivateKey.fromStringECDSA(privateKey);
    const tokenId = TokenId.fromString(parkTokenId);

    const client = network === 'testnet' ? Client.forTestnet() : Client.forMainnet();
    client.setOperator(account, key);

    console.log('🔍 Checking Treasury Balance...');

    const balance = await new AccountBalanceQuery()
      .setAccountId(account)
      .execute(client);

    const parkBalance = balance.tokens.get(tokenId);
    const parkAmount = parkBalance ? parkBalance.toNumber() : 0;

    console.log(`   HBAR Balance: ${balance.hbars.toString()}`);
    console.log(`   PARK Balance: ${parkAmount} tokens`);
    console.log('');

    if (parkAmount === 0) {
      console.warn('⚠️  WARNING: Treasury has 0 PARK tokens!');
      console.warn('   Run createParkToken.js to create tokens.');
    } else if (parkAmount < 100) {
      console.warn(`⚠️  WARNING: Low PARK balance (${parkAmount} tokens)`);
      console.warn(`   You can reward ${Math.floor(parkAmount / 5)} voters (5 tokens each)`);
    } else {
      console.log(`✅ Treasury has sufficient PARK tokens (${parkAmount})`);
      console.log(`   Can reward ${Math.floor(parkAmount / 5)} voters`);
    }

    console.log('');
    console.log('✅ All checks passed! PARK token rewards are ready.');
    console.log('');

    client.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSetup();
