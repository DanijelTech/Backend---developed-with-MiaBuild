/**
 * Hash Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { createHash, generateIdempotencyKey, generateKey } from '../src/hash.js';

describe('Hash', () => {
  it('should create a hasher instance', () => {
    const hasher = createHash('sha256');
    expect(hasher).toBeDefined();
    expect(typeof hasher.hash).toBe('function');
  });

  it('should hash data with sha256', () => {
    const hasher = createHash('sha256');
    const hash = hasher.hash('test data');
    expect(typeof hash).toBe('string');
    expect(hash.length).toBe(64);
  });

  it('should verify correct hash', () => {
    const hasher = createHash('sha256');
    const hash = hasher.hash('test data');
    const isValid = hasher.verify('test data', hash);
    expect(isValid).toBe(true);
  });

  it('should reject invalid hash', () => {
    const hasher = createHash('sha256');
    const isValid = hasher.verify('test data', 'invalid-hash');
    expect(isValid).toBe(false);
  });

  it('should generate hmac', () => {
    const hasher = createHash('sha256');
    const hmac = hasher.hmac('test data');
    expect(typeof hmac).toBe('string');
  });

  it('should generate idempotency key', () => {
    const key = generateIdempotencyKey('test');
    expect(typeof key).toBe('string');
    expect(key.length).toBe(32);
  });

  it('should generate random key', () => {
    const key = generateKey();
    expect(typeof key).toBe('string');
  });
});