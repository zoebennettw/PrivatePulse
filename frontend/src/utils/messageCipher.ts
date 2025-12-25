const encoder = new TextEncoder();
const decoder = new TextDecoder();
const KEY_LENGTH = 6;

export function generateSixDigitKey(): number {
  const values = new Uint32Array(1);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(values);
    return values[0] % 1_000_000;
  }
  return Math.floor(Math.random() * 1_000_000);
}

export function formatKey(key: number): string {
  return Math.max(0, Math.trunc(key)).toString().padStart(KEY_LENGTH, '0');
}

function xorBytes(data: Uint8Array, keyBytes: Uint8Array): Uint8Array {
  const output = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i += 1) {
    output[i] = data[i] ^ keyBytes[i % keyBytes.length];
  }
  return output;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function encryptMessage(plaintext: string, key: number): string {
  const keyBytes = encoder.encode(formatKey(key));
  const data = encoder.encode(plaintext);
  const encrypted = xorBytes(data, keyBytes);
  return bytesToBase64(encrypted);
}

export function decryptMessage(ciphertext: string, key: number): string {
  const keyBytes = encoder.encode(formatKey(key));
  const encrypted = base64ToBytes(ciphertext);
  const decrypted = xorBytes(encrypted, keyBytes);
  return decoder.decode(decrypted);
}
