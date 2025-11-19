require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "../../hedera-service/.env" });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000 // Higher runs = smaller bytecode, more gas per execution
      },
      viaIR: true // Enable IR-based optimizer for better optimization
    }
  },
  networks: {
    hedera_testnet: {
      url: "https://testnet.hashio.io/api",
      accounts: [process.env.HEDERA_PRIVATE_KEY],
      chainId: 296
    },
    hedera_mainnet: {
      url: "https://mainnet.hashio.io/api",
      accounts: [process.env.HEDERA_PRIVATE_KEY],
      chainId: 295
    }
  }
};
