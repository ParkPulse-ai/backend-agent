import {
  Client,
  AccountId,
  PrivateKey,
  TokenAssociateTransaction,
  TokenId,
  Hbar
} from '@hashgraph/sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function associateParkToken() {
  const network = process.env.HEDERA_NETWORK || 'testnet';

  // Get user account details from command line or environment
  const userAccountId = process.argv[2] || process.env.USER_ACCOUNT_ID;
  const userPrivateKey = process.argv[3] || process.env.USER_PRIVATE_KEY;
  const parkTokenId = process.env.PARK_TOKEN_ID;

  if (!userAccountId || !userPrivateKey) {
    console.error('❌ Usage: node associateParkToken.js <ACCOUNT_ID> <PRIVATE_KEY>');
    console.error('   Or set USER_ACCOUNT_ID and USER_PRIVATE_KEY in .env');
    process.exit(1);
  }

  if (!parkTokenId) {
    console.error('❌ PARK_TOKEN_ID not found in .env file');
    process.exit(1);
  }

  try {
    const accountId = AccountId.fromString(userAccountId);
    const privateKey = PrivateKey.fromStringECDSA(userPrivateKey);
    const tokenId = TokenId.fromString(parkTokenId);

    // Create client
    const client = network === 'testnet' ? Client.forTestnet() : Client.forMainnet();
    client.setOperator(accountId, privateKey);

    console.log('\n=== Associating PARK Token ===');
    console.log(`Network: ${network}`);
    console.log(`Account: ${accountId.toString()}`);
    console.log(`Token ID: ${parkTokenId}`);
    console.log('');

    // Associate the token with the user account
    const associateTx = await new TokenAssociateTransaction()
      .setAccountId(accountId)
      .setTokenIds([tokenId])
      .setMaxTransactionFee(new Hbar(1))
      .freezeWith(client);

    const associateSign = await associateTx.sign(privateKey);
    const associateSubmit = await associateSign.execute(client);
    const associateReceipt = await associateSubmit.getReceipt(client);

    console.log(`✅ Successfully associated PARK token with account ${accountId.toString()}`);
    console.log(`Transaction ID: ${associateSubmit.transactionId.toString()}`);
    console.log(`Status: ${associateReceipt.status.toString()}`);
    console.log('');
    console.log('You can now receive PARK token rewards when voting!');
    console.log('');

    client.close();
    process.exit(0);
  } catch (error) {
    if (error.message && error.message.includes('TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT')) {
      console.log('✅ Token is already associated with this account!');
      console.log('You can receive PARK tokens.');
      process.exit(0);
    } else {
      console.error('❌ Error associating PARK token:', error.message);
      process.exit(1);
    }
  }
}

associateParkToken();
