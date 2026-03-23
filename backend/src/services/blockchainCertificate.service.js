import { ethers } from "ethers";

const CERTIFICATE_REGISTRY_ABI = [
  "function issueCertificate(bytes32 certHash, bytes32 previousHash, bytes32 recipientIdHash, uint256 issuedAt) external",
  "function getCertificate(bytes32 certHash) external view returns (bytes32 _certHash, bytes32 _previousHash, bytes32 _recipientIdHash, uint256 _issuedAt, address _issuer, bool _exists, bool _revoked)",
  "function revokeCertificate(bytes32 certHash) external",
];

const BLOCKCHAIN_REQUIRED = String(process.env.BLOCKCHAIN_REQUIRED || "false").toLowerCase() === "true";

const toBytes32 = (hash) => {
  if (!hash) return ethers.ZeroHash;
  return hash.startsWith("0x") ? hash : `0x${hash}`;
};

const remove0xPrefix = (hex) => (hex?.startsWith("0x") ? hex.slice(2) : hex);

const getConfig = () => {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
  const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
  const contractAddress = process.env.BLOCKCHAIN_CONTRACT_ADDRESS;
  const chainId = process.env.BLOCKCHAIN_CHAIN_ID ? Number(process.env.BLOCKCHAIN_CHAIN_ID) : null;
  const explorerBaseUrl = process.env.BLOCKCHAIN_EXPLORER_BASE_URL || "";

  const enabled = Boolean(rpcUrl && privateKey && contractAddress);

  return {
    enabled,
    rpcUrl,
    privateKey,
    contractAddress,
    chainId,
    explorerBaseUrl,
  };
};

const getClient = () => {
  const config = getConfig();

  if (!config.enabled) {
    if (BLOCKCHAIN_REQUIRED) {
      throw new Error("Blockchain is required but BLOCKCHAIN_RPC_URL / BLOCKCHAIN_PRIVATE_KEY / BLOCKCHAIN_CONTRACT_ADDRESS are not fully configured");
    }

    return { config, contract: null, wallet: null };
  }

  const provider = new ethers.JsonRpcProvider(config.rpcUrl, config.chainId || undefined);
  const wallet = new ethers.Wallet(config.privateKey, provider);
  const contract = new ethers.Contract(config.contractAddress, CERTIFICATE_REGISTRY_ABI, wallet);

  return { config, contract, wallet };
};

export const issueCertificateOnChain = async ({ hash, previousHash, recipientId }) => {
  const { config, contract, wallet } = getClient();

  if (!contract || !wallet) {
    return {
      enabled: false,
      txHash: null,
      blockNumber: null,
      contractAddress: null,
      chainId: null,
      issuerAddress: null,
      explorerUrl: null,
    };
  }

  const certHashBytes32 = toBytes32(hash);
  const previousHashBytes32 = previousHash === "GENESIS" ? ethers.ZeroHash : toBytes32(previousHash);
  const recipientIdHash = ethers.keccak256(ethers.toUtf8Bytes(String(recipientId)));

  const issuedAtUnix = Math.floor(Date.now() / 1000);

  const tx = await contract.issueCertificate(
    certHashBytes32,
    previousHashBytes32,
    recipientIdHash,
    issuedAtUnix
  );

  const receipt = await tx.wait(1);
  const network = await wallet.provider.getNetwork();
  const chainId = Number(network.chainId);
  const explorerUrl = config.explorerBaseUrl ? `${config.explorerBaseUrl.replace(/\/$/, "")}/tx/${tx.hash}` : null;

  return {
    enabled: true,
    txHash: tx.hash,
    blockNumber: receipt?.blockNumber || null,
    contractAddress: config.contractAddress,
    chainId,
    issuerAddress: wallet.address,
    explorerUrl,
    recipientIdHash: remove0xPrefix(recipientIdHash),
    onChainPreviousHash: previousHashBytes32 === ethers.ZeroHash ? "GENESIS" : remove0xPrefix(previousHashBytes32),
  };
};

export const verifyCertificateOnChain = async ({ hash }) => {
  const { config, contract } = getClient();

  if (!contract) {
    return {
      enabled: false,
      exists: false,
      revoked: false,
      chainId: null,
      contractAddress: null,
      issuer: null,
      issuedAtUnix: null,
      previousHash: null,
    };
  }

  const certHashBytes32 = toBytes32(hash);
  const data = await contract.getCertificate(certHashBytes32);

  const exists = Boolean(data._exists);
  const revoked = Boolean(data._revoked);
  const previousHash = data._previousHash === ethers.ZeroHash ? "GENESIS" : remove0xPrefix(data._previousHash);
  const issuedAtUnix = Number(data._issuedAt || 0) || null;

  return {
    enabled: true,
    exists,
    revoked,
    chainId: config.chainId || null,
    contractAddress: config.contractAddress,
    issuer: data._issuer || null,
    issuedAtUnix,
    previousHash,
  };
};
