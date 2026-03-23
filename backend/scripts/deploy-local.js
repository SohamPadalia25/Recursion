import hre from "hardhat";
import { ContractFactory, JsonRpcProvider } from "ethers";

async function main() {
  console.log("Deploying CertificateRegistry to local Hardhat node...");

  const provider = new JsonRpcProvider("http://127.0.0.1:8545");
  const signer = await provider.getSigner(0);
  const signerAddress = await signer.getAddress();

  const artifact = await hre.artifacts.readArtifact("CertificateRegistry");
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, signer);

  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const deployedAddress = await contract.getAddress();
  const deployTx = contract.deploymentTransaction();

  console.log("Local deployment successful.");
  console.log(`Signer: ${signerAddress}`);
  console.log(`Contract address: ${deployedAddress}`);
  console.log(`Chain ID: 31337`);
  if (deployTx?.hash) {
    console.log(`Deployment tx hash: ${deployTx.hash}`);
  }

  console.log("\nUpdate backend .env for free local mode:");
  console.log("BLOCKCHAIN_REQUIRED=true");
  console.log("BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545");
  console.log("BLOCKCHAIN_CHAIN_ID=31337");
  console.log(`BLOCKCHAIN_CONTRACT_ADDRESS=${deployedAddress}`);
  console.log("BLOCKCHAIN_EXPLORER_BASE_URL=");
}

main().catch((error) => {
  console.error("Local deployment failed:", error?.message || error);
  process.exitCode = 1;
});
