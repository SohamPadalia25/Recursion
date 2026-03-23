import "dotenv/config";
import hre from "hardhat";
import { ContractFactory, JsonRpcProvider, Wallet } from "ethers";

async function main() {
  const networkName = process.env.HARDHAT_NETWORK || "sepolia";

  if (!process.env.SEPOLIA_RPC_URL || !process.env.PRIVATE_KEY) {
    throw new Error("Missing SEPOLIA_RPC_URL or PRIVATE_KEY in .env");
  }

  console.log(`Deploying CertificateRegistry to network: ${networkName}`);

  const provider = new JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const wallet = new Wallet(process.env.PRIVATE_KEY, provider);

  const balance = await provider.getBalance(wallet.address);
  if (balance === 0n) {
    throw new Error(
      `Deployer wallet ${wallet.address} has 0 Sepolia ETH. Fund it from a faucet before deploying.`
    );
  }

  const artifact = await hre.artifacts.readArtifact("CertificateRegistry");
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, wallet);

  const contract = await factory.deploy();

  await contract.waitForDeployment();

  const deployedAddress = await contract.getAddress();
  const deployTx = contract.deploymentTransaction();

  console.log("Contract deployed successfully.");
  console.log(`Contract address: ${deployedAddress}`);
  if (deployTx?.hash) {
    console.log(`Deployment tx hash: ${deployTx.hash}`);
  }

  if (networkName === "sepolia") {
    console.log("\nEtherscan verification instructions:");
    console.log("1. Wait 20-60 seconds for explorer indexing.");
    console.log("2. Run:");
    console.log(`   npx hardhat verify --network sepolia ${deployedAddress}`);
    console.log(`3. Open: https://sepolia.etherscan.io/address/${deployedAddress}#code`);
  }
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
