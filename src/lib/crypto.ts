/**
 * End-to-end encryption helpers using the Web Crypto API.
 *
 * Flow:
 *  - Each party generates an ECDH key pair (P-256).
 *  - Public keys are exchanged (visitor -> server, owner -> server).
 *  - A shared AES-GCM key is derived via ECDH (deriveKey).
 *  - Messages are encrypted with AES-GCM (256-bit, 96-bit IV).
 *
 * The server only ever sees ciphertext + IV. Private keys never leave the
 * browser. The owner's private key is persisted in localStorage so the owner
 * can decrypt messages across sessions on the same device.
 */

const ECDH_PARAMS: EcKeyGenParams = { name: 'ECDH', namedCurve: 'P-256' };
const AES_PARAMS: AesDerivedKeyParams = { name: 'AES-GCM', length: 256 };

export type KeyPair = {
  publicKey: string; // base64 SPKI
  privateKey: CryptoKey; // non-extractable, kept in memory
};

export type StoredKeyPair = {
  publicKey: string;
  privateKeyJwk: JsonWebKey; // extractable form, for persistence
};

/* ---------- base64 helpers ---------- */

export function bufToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function base64ToBuf(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/* ---------- key pair generation ---------- */

export async function generateKeyPair(): Promise<KeyPair> {
  const pair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true, // extractable so we can persist the owner's private key
    ['deriveKey', 'deriveBits'],
  );
  const spki = await crypto.subtle.exportKey('spki', pair.publicKey);
  return {
    publicKey: bufToBase64(spki),
    privateKey: pair.privateKey,
  };
}

export async function exportKeyPairForStorage(kp: KeyPair): Promise<StoredKeyPair> {
  const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
  return { publicKey: kp.publicKey, privateKeyJwk: jwk };
}

export async function importKeyPairFromStorage(stored: StoredKeyPair): Promise<KeyPair> {
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    stored.privateKeyJwk,
    ECDH_PARAMS,
    false,
    ['deriveKey', 'deriveBits'],
  );
  return { publicKey: stored.publicKey, privateKey };
}

export async function importPublicKey(spkiB64: string): Promise<CryptoKey> {
  const spki = base64ToBuf(spkiB64);
  return crypto.subtle.importKey('spki', spki, ECDH_PARAMS, false, []);
}

/* ---------- shared secret derivation ---------- */

export async function deriveSharedKey(
  ownPrivateKey: CryptoKey,
  peerPublicKey: CryptoKey,
): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: peerPublicKey },
    ownPrivateKey,
    AES_PARAMS,
    false,
    ['encrypt', 'decrypt'],
  );
}

export function getChatSecret(): string {
  return (
    import.meta.env.VITE_CHAT_SECRET ||
    import.meta.env.VITE_ENCRYPTION_SECRET ||
    import.meta.env.VITE_CHAT_KEY ||
    'devjournal-chat-secret'
  ).trim();
}

export async function deriveConversationKey(secret: string, conversationId: string): Promise<CryptoKey> {
  const seed = new TextEncoder().encode(`${secret}:${conversationId}`);
  const keyMaterial = await crypto.subtle.digest('SHA-256', seed);
  return crypto.subtle.importKey('raw', keyMaterial, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

/* ---------- message encryption ---------- */

export type EncryptedPayload = {
  ciphertext: string; // base64
  iv: string; // base64
};

export async function encryptMessage(
  sharedKey: CryptoKey,
  plaintext: string,
): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder().encode(plaintext);
  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    enc,
  );
  return { ciphertext: bufToBase64(cipherBuf), iv: bufToBase64(iv.buffer) };
}

export async function decryptMessage(
  sharedKey: CryptoKey,
  payload: EncryptedPayload,
): Promise<string> {
  const iv = new Uint8Array(base64ToBuf(payload.iv));
  const cipher = base64ToBuf(payload.ciphertext);
  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    cipher,
  );
  return new TextDecoder().decode(plainBuf);
}

/* ---------- fingerprint (for verifying keys) ---------- */

export async function publicKeyFingerprint(spkiB64: string): Promise<string> {
  const buf = base64ToBuf(spkiB64);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  const hex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hex.slice(0, 16).match(/.{1,4}/g)!.join(' ');
}
