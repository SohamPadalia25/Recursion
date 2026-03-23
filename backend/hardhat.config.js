import "dotenv/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";

const with0x = (value) => {
  if (!value) return "";
  return value.startsWith("0x") ? value : `0x${value}`;
};

const sepoliaUrl = process.env.SEPOLIA_RPC_URL || "";
const privateKey = with0x(process.env.PRIVATE_KEY || "");
const etherscanApiKey = process.env.ETHERSCAN_API_KEY || "";

const networks = {};

if (sepoliaUrl) {
  networks.sepolia = {
    type: "http",
    chainType: "l1",
    url: sepoliaUrl,
    accounts: privateKey ? [privateKey] : [],
  };
}

/** @type {import('hardhat/config').HardhatUserConfig} */
const config = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks,
  etherscan: {
    apiKey: etherscanApiKey,
  },
};

export default config;
