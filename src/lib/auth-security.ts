import crypto from 'crypto';

/**
 * Cryptographically secure password hashing using Node.js scrypt with per-user salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Timing-safe password verification against stored salt:scryptHash
 */
export function verifyPassword(password: string, storedHash?: string | null): boolean {
  if (!password || !storedHash) {
    return false;
  }

  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) {
      return false;
    }
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const keyBuffer = Buffer.from(key, 'hex');
    if (derivedKey.length !== keyBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(derivedKey, keyBuffer);
  } catch (err) {
    console.error('Password verification error:', err);
    return false;
  }
}

/**
 * Generate cryptographically secure session ID
 */
export function generateSessionId(): string {
  return `sess_${crypto.randomBytes(24).toString('hex')}`;
}
