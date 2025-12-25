// Update this address after deploying PrivatePulse to Sepolia.
export const CONTRACT_ADDRESS = '0x599235071A6fc1DA3b4E914f95bCF4E1B225f21C' as const;

// Copy the ABI from deployments/sepolia/PrivatePulse.json after deployment.
export const CONTRACT_ABI = [
  {
    inputs: [],
    name: 'ZamaProtocolUnsupported',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'messageId',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'recipient',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'encryptedBody',
        type: 'string',
      },
    ],
    name: 'MessageSent',
    type: 'event',
  },
  {
    inputs: [],
    name: 'confidentialProtocolId',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'recipient',
        type: 'address',
      },
    ],
    name: 'getInboxCount',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'recipient',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'index',
        type: 'uint256',
      },
    ],
    name: 'getInboxMessage',
    outputs: [
      {
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'recipientAddress',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
      {
        internalType: 'string',
        name: 'encryptedBody',
        type: 'string',
      },
      {
        internalType: 'euint32',
        name: 'encryptedKey',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'messageId',
        type: 'uint256',
      },
    ],
    name: 'getMessage',
    outputs: [
      {
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'recipient',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
      {
        internalType: 'string',
        name: 'encryptedBody',
        type: 'string',
      },
      {
        internalType: 'euint32',
        name: 'encryptedKey',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'recipient',
        type: 'address',
      },
      {
        internalType: 'string',
        name: 'encryptedBody',
        type: 'string',
      },
      {
        internalType: 'externalEuint32',
        name: 'encryptedKeyInput',
        type: 'bytes32',
      },
      {
        internalType: 'bytes',
        name: 'inputProof',
        type: 'bytes',
      },
    ],
    name: 'sendMessage',
    outputs: [
      {
        internalType: 'uint256',
        name: 'messageId',
        type: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalMessages',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
