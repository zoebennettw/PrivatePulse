import { useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { Contract, isAddress } from 'ethers';

import { Header } from './Header';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../config/contracts';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import {
  decryptMessage,
  encryptMessage,
  formatKey,
  generateSixDigitKey,
} from '../utils/messageCipher';
import '../styles/PrivatePulse.css';

type InboxMessage = {
  inboxIndex: number;
  sender: string;
  recipient: string;
  timestamp: bigint;
  encryptedBody: string;
  encryptedKey: `0x${string}`;
};

type DecryptedMessage = {
  key: number;
  plaintext: string;
};

type SendStage = 'idle' | 'encrypting' | 'confirming' | 'sent' | 'error';

function shortAddress(address: string) {
  if (address.length <= 10) {
    return address;
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTimestamp(value: bigint) {
  const asNumber = Number(value);
  if (!Number.isFinite(asNumber)) {
    return 'Unknown time';
  }
  return new Date(asNumber * 1000).toLocaleString();
}

export function PrivatePulseApp() {
  const { address } = useAccount();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();
  const recipientAddress = address!;
  const inboxEnabled = !!address;
  const isContractConfigured =true

  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [sendStage, setSendStage] = useState<SendStage>('idle');
  const [sendError, setSendError] = useState('');
  const [lastKey, setLastKey] = useState<number | null>(null);
  const [lastTxHash, setLastTxHash] = useState('');

  const [decryptedMessages, setDecryptedMessages] = useState<Record<number, DecryptedMessage>>({});
  const [decrypting, setDecrypting] = useState<Record<number, boolean>>({});
  const [decryptErrors, setDecryptErrors] = useState<Record<number, string>>({});

  const { data: totalMessages } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'totalMessages',
    query: {
      enabled: isContractConfigured,
    },
  });

  const {
    data: inboxCount,
    isLoading: inboxCountLoading,
    refetch: refetchInboxCount,
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getInboxCount',
    args: [recipientAddress],
    query: {
      enabled: inboxEnabled && isContractConfigured,
    },
  });

  const inboxSize = inboxCount ? Number(inboxCount) : 0;

  const inboxContracts = useMemo(() => {
    if (!address || inboxSize === 0) {
      return [];
    }
    if (!isContractConfigured) {
      return [];
    }
    return Array.from({ length: inboxSize }, (_, index) => ({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'getInboxMessage',
      args: [address, BigInt(index)],
    }));
  }, [address, inboxSize, isContractConfigured]);

  const {
    data: inboxResults,
    isLoading: inboxLoading,
    refetch: refetchInbox,
  } = useReadContracts({
    contracts: inboxContracts,
    query: {
      enabled: inboxContracts.length > 0 && isContractConfigured,
    },
  });

  const inboxMessages = useMemo(() => {
    if (!inboxResults) {
      return [] as InboxMessage[];
    }
    const parsed = inboxResults
      .map((entry, index) => {
        if (!entry || !entry.result) {
          return null;
        }
        const result = entry.result as unknown;
        if (!Array.isArray(result)) {
          return null;
        }
        const [sender, recipientAddress, timestamp, encryptedBody, encryptedKey] = result as [
          string,
          string,
          bigint,
          string,
          `0x${string}`,
        ];
        return {
          inboxIndex: index,
          sender,
          recipient: recipientAddress,
          timestamp,
          encryptedBody,
          encryptedKey,
        } satisfies InboxMessage;
      })
      .filter((item): item is InboxMessage => item !== null);

    return parsed.reverse();
  }, [inboxResults]);

  const isRecipientValid = recipient.trim().length > 0 && isAddress(recipient.trim());
  const canSend =
    !!address &&
    !!signerPromise &&
    !!instance &&
    !zamaLoading &&
    isContractConfigured &&
    isRecipientValid &&
    message.trim().length > 0 &&
    sendStage !== 'encrypting' &&
    sendStage !== 'confirming';

  const sendLabel =
    sendStage === 'encrypting'
      ? 'Encrypting...'
      : sendStage === 'confirming'
        ? 'Waiting for confirmation...'
        : 'Encrypt & Send';

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSendError('');
    setLastKey(null);
    setLastTxHash('');

    if (!address) {
      setSendError('Connect your wallet to send a message.');
      return;
    }
    if (!isContractConfigured) {
      setSendError('Contract address is not configured.');
      return;
    }
    if (!instance) {
      setSendError('Encryption service is still loading.');
      return;
    }
    if (!signerPromise) {
      setSendError('Signer is not available yet.');
      return;
    }
    if (!isRecipientValid) {
      setSendError('Recipient address is invalid.');
      return;
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setSendError('Message cannot be empty.');
      return;
    }

    try {
      setSendStage('encrypting');
      const keyValue = generateSixDigitKey();
      const encryptedBody = encryptMessage(trimmedMessage, keyValue);

      const input = instance.createEncryptedInput(CONTRACT_ADDRESS, address);
      input.add32(keyValue);
      const encryptedInput = await input.encrypt();

      const signer = await signerPromise;
      if (!signer) {
        throw new Error('Signer not available.');
      }

      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.sendMessage(
        recipient.trim(),
        encryptedBody,
        encryptedInput.handles[0],
        encryptedInput.inputProof,
      );

      setSendStage('confirming');
      const receipt = await tx.wait();

      setLastKey(keyValue);
      setLastTxHash(receipt?.hash ?? tx.hash);
      setMessage('');
      setSendStage('sent');

      if (refetchInboxCount) {
        await refetchInboxCount();
      }
      if (refetchInbox) {
        await refetchInbox();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setSendError(error instanceof Error ? error.message : 'Failed to send message.');
      setSendStage('error');
    }
  };

  const handleDecrypt = async (messageData: InboxMessage) => {
    const messageIndex = messageData.inboxIndex;
    setDecryptErrors((prev) => ({ ...prev, [messageIndex]: '' }));

    if (!address) {
      setDecryptErrors((prev) => ({ ...prev, [messageIndex]: 'Connect your wallet to decrypt.' }));
      return;
    }
    if (!isContractConfigured) {
      setDecryptErrors((prev) => ({
        ...prev,
        [messageIndex]: 'Contract address is not configured.',
      }));
      return;
    }
    if (!instance) {
      setDecryptErrors((prev) => ({ ...prev, [messageIndex]: 'Encryption service is not ready.' }));
      return;
    }
    if (!signerPromise) {
      setDecryptErrors((prev) => ({ ...prev, [messageIndex]: 'Signer is not available.' }));
      return;
    }

    setDecrypting((prev) => ({ ...prev, [messageIndex]: true }));

    try {
      const keypair = instance.generateKeypair();
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '7';
      const contractAddresses = [CONTRACT_ADDRESS];

      const eip712 = instance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimeStamp,
        durationDays,
      );

      const signer = await signerPromise;
      if (!signer) {
        throw new Error('Signer not available.');
      }

      const signature = await signer.signTypedData(
        eip712.domain,
        {
          UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        eip712.message,
      );

      const result = await instance.userDecrypt(
        [
          {
            handle: messageData.encryptedKey,
            contractAddress: CONTRACT_ADDRESS,
          },
        ],
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays,
      );

      const decryptedValue = result[messageData.encryptedKey as string];
      const keyValue = Number(decryptedValue);
      if (!Number.isFinite(keyValue)) {
        throw new Error('Decrypted key is invalid.');
      }

      const plaintext = decryptMessage(messageData.encryptedBody, keyValue);

      setDecryptedMessages((prev) => ({
        ...prev,
        [messageIndex]: {
          key: keyValue,
          plaintext,
        },
      }));
    } catch (error) {
      console.error('Failed to decrypt message:', error);
      setDecryptErrors((prev) => ({
        ...prev,
        [messageIndex]: error instanceof Error ? error.message : 'Failed to decrypt message.',
      }));
    } finally {
      setDecrypting((prev) => ({ ...prev, [messageIndex]: false }));
    }
  };

  return (
    <div className="pp-shell">
      <Header />
      <main className="pp-main">
        <section className="pp-hero">
          <div className="pp-hero-copy">
            <p className="pp-kicker">FHE messaging on Sepolia</p>
            <h2>Send a pulse. Keep the key private.</h2>
            <p className="pp-lede">
              PrivatePulse generates a fresh six-digit key for every message. The message is encrypted
              locally, while the key is protected on-chain using Zama FHE. Only the recipient can
              decrypt and unlock the message.
            </p>
            <div className="pp-badge-row">
              <span className="pp-badge">Zama FHE</span>
              <span className="pp-badge">One-time key</span>
              <span className="pp-badge">No local storage</span>
            </div>
          </div>
          <div className="pp-hero-panel">
            <div className="pp-stat">
              <span>Total pulses</span>
              <strong>{totalMessages !== undefined ? totalMessages.toString() : 'N/A'}</strong>
            </div>
            <div className="pp-stat">
              <span>Your inbox</span>
              <strong>{address ? (inboxCountLoading ? 'Loading...' : inboxSize) : 'Connect'}</strong>
            </div>
            <div className="pp-flow">
              <div className="pp-flow-step">
                <span>01</span>
                <div>Write a message and we generate key A.</div>
              </div>
              <div className="pp-flow-step">
                <span>02</span>
                <div>Message is encrypted locally with key A.</div>
              </div>
              <div className="pp-flow-step">
                <span>03</span>
                <div>Recipient decrypts key A to reveal the message.</div>
              </div>
            </div>
          </div>
        </section>

        <section className="pp-grid">
          <div className="pp-card" style={{ '--delay': '80ms' } as CSSProperties}>
          <div className="pp-card-header">
            <div>
              <p className="pp-card-eyebrow">Compose</p>
              <h3>Encrypt a new message</h3>
            </div>
            <p className="pp-card-subtitle">Your message never leaves the browser in plaintext.</p>
          </div>

          {!isContractConfigured ? (
            <div className="pp-alert pp-alert-error">
              Set the deployed contract address in `frontend/src/config/contracts.ts` to enable sending.
            </div>
          ) : null}

          <form className="pp-form" onSubmit={handleSend}>
              <label className="pp-label" htmlFor="recipient">
                Recipient address
              </label>
              <input
                id="recipient"
                className="pp-input"
                placeholder="0x..."
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
              />
              {!isRecipientValid && recipient.trim().length > 0 ? (
                <p className="pp-hint pp-hint-error">Enter a valid Ethereum address.</p>
              ) : null}

              <label className="pp-label" htmlFor="message">
                Message
              </label>
              <textarea
                id="message"
                className="pp-textarea"
                placeholder="Write something you only want the recipient to read..."
                rows={5}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />

              <div className="pp-form-footer">
                <button className="pp-button" type="submit" disabled={!canSend}>
                  {sendLabel}
                </button>
                <div className="pp-status">
                  {zamaLoading ? 'Loading encryption service...' : 'Key stays encrypted on-chain.'}
                </div>
              </div>
            </form>

            {sendError ? <div className="pp-alert pp-alert-error">{sendError}</div> : null}
            {zamaError ? <div className="pp-alert pp-alert-error">{zamaError}</div> : null}

            {sendStage === 'sent' && lastKey !== null ? (
              <div className="pp-alert pp-alert-success">
                <div>
                  <strong>Pulse sent.</strong> Key A: {formatKey(lastKey)}
                </div>
                {lastTxHash ? (
                  <div className="pp-mono">Tx: {shortAddress(lastTxHash)}</div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="pp-card" style={{ '--delay': '160ms' } as CSSProperties}>
            <div className="pp-card-header">
              <div>
                <p className="pp-card-eyebrow">Inbox</p>
                <h3>Messages addressed to you</h3>
              </div>
              <p className="pp-card-subtitle">Decrypt key A to unlock each message.</p>
            </div>

            {!isContractConfigured ? (
              <div className="pp-empty">
                <p>Set the deployed contract address to load your inbox.</p>
              </div>
            ) : !address ? (
              <div className="pp-empty">
                <p>Connect your wallet to view your inbox.</p>
              </div>
            ) : inboxLoading ? (
              <div className="pp-empty">
                <p>Loading messages...</p>
              </div>
            ) : inboxMessages.length === 0 ? (
              <div className="pp-empty">
                <p>No messages yet. Ask someone to send you a pulse.</p>
              </div>
            ) : (
              <div className="pp-message-list">
                {inboxMessages.map((entry, index) => {
                  const decrypted = decryptedMessages[entry.inboxIndex];
                  const isDecrypting = decrypting[entry.inboxIndex];
                  const errorMessage = decryptErrors[entry.inboxIndex];

                  return (
                    <article
                      key={`${entry.sender}-${entry.timestamp}-${entry.inboxIndex}`}
                      className="pp-message-card"
                      style={{ '--index': index } as CSSProperties}
                    >
                      <div className="pp-message-header">
                        <div>
                          <span className="pp-label">From</span>
                          <div className="pp-mono">{shortAddress(entry.sender)}</div>
                        </div>
                        <div className="pp-time">{formatTimestamp(entry.timestamp)}</div>
                      </div>
                      <div className="pp-message-body">
                        <span className="pp-label">Encrypted payload</span>
                        <p className="pp-cipher">{entry.encryptedBody}</p>
                      </div>

                      {decrypted ? (
                        <div className="pp-decrypted">
                          <div className="pp-decrypted-row">
                            <span className="pp-label">Key A</span>
                            <span className="pp-key">{formatKey(decrypted.key)}</span>
                          </div>
                          <div>
                            <span className="pp-label">Message</span>
                            <p className="pp-plaintext">{decrypted.plaintext}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="pp-decrypt-row">
                          <button
                            className="pp-button pp-button-secondary"
                            type="button"
                            onClick={() => handleDecrypt(entry)}
                            disabled={!!isDecrypting || !instance || !signerPromise}
                          >
                            {isDecrypting ? 'Decrypting...' : 'Decrypt & Reveal'}
                          </button>
                          <span className="pp-note">Requires wallet signature</span>
                        </div>
                      )}

                      {errorMessage ? (
                        <div className="pp-alert pp-alert-error">{errorMessage}</div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
