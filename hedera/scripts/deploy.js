const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying CommunityVoting contract to Hedera...\n");

  // Get the contract factory
  const CommunityVoting = await hre.ethers.getContractFactory("CommunityVoting");

  console.log("📝 Deploying contract...");

  // Deploy the contract
  const contract = await CommunityVoting.deploy();

  // Wait for deployment
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();

  console.log("\n✅ Contract deployed successfully!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📍 Contract Address: ${contractAddress}`);
  console.log(`🔗 Network: ${hre.network.name}`);
  console.log(`🌐 Explorer: https://hashscan.io/${hre.network.name === 'hedera_testnet' ? 'testnet' : 'mainnet'}/contract/${contractAddress}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Save deployment info
  const deploymentInfo = {
    contractAddress,
    network: hre.network.name,
    deployedAt: new Date().toISOString(),
    explorerUrl: `https://hashscan.io/${hre.network.name === 'hedera_testnet' ? 'testnet' : 'mainnet'}/contract/${contractAddress}`
  };

  const deploymentPath = path.join(__dirname, '../deployments.json');
  let deployments = {};

  if (fs.existsSync(deploymentPath)) {
    deployments = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  }

  deployments[hre.network.name] = deploymentInfo;
  fs.writeFileSync(deploymentPath, JSON.stringify(deployments, null, 2));

  console.log("📁 Deployment info saved to deployments.json\n");
  console.log("⚙️  Next steps:");
  console.log("1. Update hedera-service/.env:");
  console.log(`   HEDERA_CONTRACT_ID=${contractAddress}`);
  console.log("\n2. Restart hedera-service");
  console.log("\n3. Update parkpulsefe/.env.local:");
  console.log(`   NEXT_PUBLIC_HEDERA_CONTRACT_ID=${contractAddress}`);
  console.log(`   NEXT_PUBLIC_HEDERA_CONTRACT_ADDRESS=${contractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
