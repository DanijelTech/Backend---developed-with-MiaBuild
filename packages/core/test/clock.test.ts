/**
 * Clock Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getClock, createClock } from '../src/clock.js';

describe('Clock', () => {
  let clock: ReturnType<typeof getClock>;

  beforeEach(() => {
    clock = getClock();
  });

  it('should return current timestamp in milliseconds', () => {
    const now = clock.nowMs();
    expect(typeof now).toBe('number');
    expect(now).toBeGreaterThan(0);
  });

  it('should return current timestamp in microseconds', () => {
    const now = clock.nowUs();
    expect(typeof now).toBe('number');
    expect(now).toBeGreaterThan(0);
  });

  it('should return current date', () => {
    const now = clock.now();
    expect(now).toBeInstanceOf(Date);
  });

  it('should sleep for specified milliseconds', async () => {
    const start = Date.now();
    await clock.sleep(10);
    const end = Date.now();
    expect(end - start).toBeGreaterThanOrEqual(9);
  });

  it('should measure elapsed time', () => {
    const start = clock.start();
    const elapsed = clock.stop(start);
    expect(typeof elapsed).toBe('number');
    expect(elapsed).toBeGreaterThanOrEqual(0);
  });
});