/**
 * Hash - Cryptographic hashing module
 * Provides hashing utilities with multiple algorithms
 */

import { createHash as nodeCreateHash, createHmac, timingSafeEqual } from 'crypto';

export type HashAlgorithm = 'sha256' | 'sha512' | 'blake3';

export interface Hasher {
  hash(data: string | Buffer): string;
  verify(data: string | Buffer, hash: string): boolean;
  hmac(data: string | Buffer): string;
  verifyHmac(data: string | Buffer, hmac: string): boolean;
}

export interface HashModule {
  createHash(algorithm?: HashAlgorithm): Hasher;
  generateIdempotencyKey(data: string): string;
  generateKey(): string;
}

/**
 * Create a new Hasher instance
 */
export function createHasher(algorithm: HashAlgorithm = 'sha256'): Hasher {
  const algo = algorithm === 'blake3' ? 'sha256' : algorithm;

  return {
    hash(data: string | Buffer): string {
      const hash = nodeCreateHash(algo);
      hash.update(data);
      return hash.digest('hex');
    },

    verify(data: string | Buffer, hash: string): boolean {
      const computed = this.hash(data);
      try {
        const a = Buffer.from(computed, 'hex');
        const b = Buffer.from(hash, 'hex');
        return timingSafeEqual(a, b);
      } catch {
        return false;
      }
    },

    hmac(data: string | Buffer): string {
      // Use a secret key - in production this should be from config
      const secret = process.env.HMAC_SECRET || 'default-secret-key';
      const hmac = createHmac(algo, secret);
      hmac.update(data);
      return hmac.digest('hex');
    },

    verifyHmac(data: string | Buffer, hmac: string): boolean {
      const computed = this.hmac(data);
      try {
        const a = Buffer.from(computed, 'hex');
        const b = Buffer.from(hmac, 'hex');
        return timingSafeEqual(a, b);
      } catch {
        return false;
      }
    }
  };
}

/**
 * Generate an idempotency key from data
 */
export function generateIdempotencyKey(data: string): string {
  const hash = nodeCreateHash('sha256');
  hash.update(data + ':' + Date.now());
  return hash.digest('hex').substring(0, 32);
}

/**
 * Generate a random key
 */
export function generateKey(): string {
  return nodeCreateHash('sha256')
    .update(String(Math.random()) + String(Date.now()))
    .digest('hex');
}

/**
 * Create a Hash module instance
 */
export function createHash(algorithm?: HashAlgorithm): Hasher {
  return createHasher(algorithm);
}

export default { createHash, createHasher, generateIdempotencyKey, generateKey };