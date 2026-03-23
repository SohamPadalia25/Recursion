# Real Blockchain Setup (Judge Demo Ready)

This project supports real on-chain certificate anchoring using EVM networks (Sepolia/Amoy/local node).

## 1) Deploy the Contract

Contract source:
- blockchain/contracts/CertificateRegistry.sol

Recommended quick path:
1. Open Remix IDE
2. Paste `CertificateRegistry.sol`
3. Compile with Solidity `0.8.24`
4. Deploy using MetaMask on Sepolia (or any EVM testnet)
5. Copy deployed contract address

## 2) Configure Backend Env

Add these keys to backend `.env`:

```env
BLOCKCHAIN_REQUIRED=true
BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/<your-key>
BLOCKCHAIN_PRIVATE_KEY=<issuer-wallet-private-key>
BLOCKCHAIN_CONTRACT_ADDRESS=0x...
BLOCKCHAIN_CHAIN_ID=11155111
BLOCKCHAIN_EXPLORER_BASE_URL=https://sepolia.etherscan.io
```

If `BLOCKCHAIN_REQUIRED=false`, backend falls back to off-chain mode.

## 3) Run Backend

```bash
npm run dev
```

## 4) Verify It Is Real On-Chain

Issue a certificate from frontend.

Then verify API response includes:
- `certificate.onChainTxHash`
- `certificate.onChainContractAddress`
- `certificate.onChainChainId`
- `certificate.onChainExplorerUrl`

Open explorer URL and show transaction confirmation to judges.

## 5) What Is Stored On Chain

The contract stores:
- `certHash` (SHA256 hash)
- `previousHash` (chain-link)
- `recipientIdHash` (hashed user ID, not raw PII)
- `issuedAt`
- `issuer`
- `revoked`

This gives real blockchain immutability + privacy-aware anchoring.
