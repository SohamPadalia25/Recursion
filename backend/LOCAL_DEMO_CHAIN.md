# Free Local Blockchain Demo (No Faucet Needed)

If Sepolia faucet fails, run a local blockchain for free.

## 1) Start local chain

```bash
npm run chain:local
```

Keep this terminal open.

## 2) Deploy contract on local chain

Open new terminal:

```bash
npm run hardhat:compile
npm run deploy:local
```

Copy the printed `Contract address`.

## 3) Update backend .env

Set:

```env
BLOCKCHAIN_REQUIRED=true
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
BLOCKCHAIN_CHAIN_ID=31337
BLOCKCHAIN_CONTRACT_ADDRESS=<contract-address-from-deploy>
BLOCKCHAIN_EXPLORER_BASE_URL=
```

## 4) Restart backend

```bash
npm run dev
```

## 5) Use frontend normally

Issue certificates and verify. It will use a real local blockchain with tx hashes.

---

Notes:
- This is fully free.
- It is a real EVM blockchain instance, but local (not public testnet).
- For judge proof on public explorer, Sepolia deployment is still preferred.
