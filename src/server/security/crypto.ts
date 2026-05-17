import 'server-only';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { isProductionApp } from '@/lib/runtime';

export function id(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

export function sha256Hex(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

export function hashSecret(value: string): string {
  const salt = randomBytes(16).toString('base64url');
  const key = scryptSync(value, salt, 32).toString('base64url');
  return `scrypt$${salt}$${key}`;
}

export function verifySecret(value: string, stored: string | null): boolean {
  if (!stored) return false;
  const [scheme, salt, key] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !key) return false;
  const candidate = scryptSync(value, salt, 32);
  const expected = Buffer.from(key, 'base64url');
  return expected.length === candidate.length && timingSafeEqual(candidate, expected);
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}


export function hmacSha256Hex(secret: string, value: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}

export function timingSafeHexEqual(expectedHex: string, actualHex: string): boolean {
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = Buffer.from(actualHex, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function masterKey(): Buffer {
  const configured = process.env.ENVELOPE_MASTER_KEY_BASE64;
  if (configured) {
    const key = Buffer.from(configured, 'base64');
    if (key.byteLength !== 32) throw new Error('envelope_master_key_invalid');
    return key;
  }
  if (isProductionApp()) throw new Error('envelope_master_key_missing');
  const material = process.env.SESSION_SECRET || 'safeplan-local-dev-master-key-change-me';
  return createHash('sha256').update(material).digest();
}

export function encryptBuffer(plain: Buffer): { cipher: Buffer; encryptedDek: string; checksumSha256: string } {
  const dek = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', dek, iv);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const wrapIv = randomBytes(12);
  const wrapCipher = createCipheriv('aes-256-gcm', masterKey(), wrapIv);
  const wrappedDekCipher = Buffer.concat([wrapCipher.update(dek), wrapCipher.final()]);
  const wrappedDekTag = wrapCipher.getAuthTag();

  return {
    cipher: Buffer.concat([iv, authTag, ciphertext]),
    encryptedDek: Buffer.concat([wrapIv, wrappedDekTag, wrappedDekCipher]).toString('base64url'),
    checksumSha256: sha256Hex(plain)
  };
}

export function decryptBuffer(cipherPayload: Buffer, encryptedDek: string): Buffer {
  const wrapped = Buffer.from(encryptedDek, 'base64url');
  const wrapIv = wrapped.subarray(0, 12);
  const wrapTag = wrapped.subarray(12, 28);
  const wrappedCipher = wrapped.subarray(28);
  const unwrap = createDecipheriv('aes-256-gcm', masterKey(), wrapIv);
  unwrap.setAuthTag(wrapTag);
  const dek = Buffer.concat([unwrap.update(wrappedCipher), unwrap.final()]);

  const iv = cipherPayload.subarray(0, 12);
  const authTag = cipherPayload.subarray(12, 28);
  const ciphertext = cipherPayload.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', dek, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function safeMetadataHash(value: string | null): string | null {
  if (!value) return null;
  return createHmac('sha256', process.env.SESSION_SECRET || 'safeplan-local-session-secret').update(value).digest('hex');
}

export function signValue(value: string): string {
  return createHmac('sha256', process.env.SESSION_SECRET || 'safeplan-local-session-secret').update(value).digest('base64url');
}

export function verifySignedValue(value: string, signature: string): boolean {
  const expected = Buffer.from(signValue(value), 'base64url');
  const actual = Buffer.from(signature, 'base64url');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
