# PrivatePulse

PrivatePulse is a private messaging dapp that uses Fully Homomorphic Encryption (FHE) to protect the message key on-chain.
Each message is encrypted client-side with a freshly generated six-digit key, while the key itself is encrypted using Zama
FHE and stored on-chain. Recipients decrypt the key via the FHE relayer and then unlock the message locally.

## What it does

- Generates a random six-digit key A for every message.
- Encrypts the message body in the browser using key A.
- Encrypts key A with Zama FHE and stores it on-chain alongside the ciphertext.
- Grants decryption access to sender and recipient through FHE ACL.
- Lets the recipient decrypt key A and recover the message locally.

## The problem it solves

Traditional on-chain messaging exposes either plaintext content or plaintext encryption keys. PrivatePulse keeps both
pieces separated: the message is only stored as ciphertext, and the key is never stored in plaintext. This reduces the
risk of on-chain leaks while keeping the system verifiable and composable on a public chain.

## Key advantages

- On-chain privacy for message keys using FHE.
- Off-chain encryption keeps message content private from the chain and indexers.
- Minimal on-chain footprint: only ciphertext and metadata are stored.
- Simple, repeatable flow: new key per message with explicit recipient access.
- Works with standard wallets and Sepolia without any custom node requirements for users.

## End-to-end flow

1. Sender types a message in the frontend.
2. The frontend generates a six-digit key A.
3. The message is encrypted locally with key A and converted to a base64 ciphertext string.
4. The frontend asks the Zama relayer to encrypt key A into an FHE ciphertext (euint32 handle).
5. The contract stores the encrypted message body and the encrypted key.
6. The recipient requests decryption of key A through the relayer.
7. The recipient decrypts the message locally using the recovered key.

## Architecture overview

### Smart contract

- `contracts/PrivatePulse.sol` stores encrypted messages and encrypted keys.
- Each message includes sender, recipient, timestamp, encrypted body, and FHE encrypted key.
- Access control (FHE ACL) is granted to the sender and recipient for the encrypted key.

### Frontend

- React + Vite UI with RainbowKit wallet connection.
- Uses `viem` for reads and `ethers` for writes.
- Encryption and decryption happen in the browser.
- No local storage and no frontend environment variables; configuration is committed in TypeScript.

### Zama relayer

- Relayer service encrypts numeric key input for on-chain storage.
- Relayer also decrypts the FHE key for recipients with permission.
- The relayer is required for any encryption or decryption of the FHE key.

## Data model

Each stored message is:

- `sender`: message sender address.
- `recipient`: message recipient address.
- `timestamp`: block timestamp of message creation.
- `encryptedBody`: base64 string produced by the local cipher.
- `encryptedKey`: FHE-encrypted euint32 handle.

## Technology stack

- Solidity + Hardhat + hardhat-deploy
- Zama FHEVM (`@fhevm/solidity`) and relayer SDK (`@zama-fhe/relayer-sdk`)
- React + Vite
- RainbowKit + Wagmi
- `viem` for contract reads, `ethers` for contract writes
- TypeScript

## Getting started

### Prerequisites

- Node.js 20+
- npm
- A wallet funded with Sepolia ETH for deployment and use

### Install dependencies

```bash
npm install
cd frontend
npm install
```

### Configure environment

Create a `.env` file in the repo root:

```bash
INFURA_API_KEY=your_infura_key
PRIVATE_KEY=your_private_key
ETHERSCAN_API_KEY=optional_for_verification
```

Notes:

- Deployment uses a private key only. Do not use a mnemonic.
- Frontend configuration does not use environment variables.

### Compile and test

```bash
npm run compile
npm run test
```

### Deploy locally (optional)

```bash
npm run chain
npm run deploy:localhost
```

The frontend is configured for Sepolia and should not connect to localhost.

### Deploy to Sepolia

```bash
npm run deploy:sepolia
```

To verify:

```bash
npm run verify:sepolia -- <CONTRACT_ADDRESS>
```

### Update frontend contract config

After deployment, update:

- `frontend/src/config/contracts.ts` with the deployed address.
- `frontend/src/config/contracts.ts` with the ABI copied from `deployments/sepolia/PrivatePulse.json`.

Do not import JSON in the frontend; copy the ABI into the TypeScript file.

### Run the frontend

```bash
cd frontend
npm run dev
```

## Security and privacy notes

- The current message cipher is a simple XOR with a six-digit key and is not suitable for production use.
- The six-digit key has limited entropy; treat this as a demo security model.
- Sender and recipient addresses are public on-chain.
- The contract and frontend are not audited.

## Project structure

```
contracts/    Solidity contracts
deploy/       Deployment scripts
tasks/        Hardhat tasks
test/         Contract tests
frontend/     React app (no Tailwind)
docs/         Zama and relayer references
```

## Future roadmap

- Replace the demo cipher with authenticated encryption (AES-GCM or XChaCha20-Poly1305).
- Support attachments with client-side chunking and encryption.
- Add message threading and pagination based on indexed events.
- Improve key management for multi-recipient messages.
- Add optional message expiry and client-side redaction.
- Add a notification layer using off-chain indexing.

## License

BSD-3-Clause-Clear. See `LICENSE`.
