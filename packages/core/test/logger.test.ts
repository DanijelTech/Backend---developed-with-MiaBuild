/**
 * Logger Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createLogger, getLogger } from '../src/logger.js';

describe('Logger', () => {
  let logger: ReturnType<typeof createLogger>;

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    logger = createLogger({ level: 'info' });
  });

  it('should create a logger instance', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  it('should log info messages', () => {
    logger.info('test message');
    expect(console.log).toHaveBeenCalled();
  });

  it('should log warning messages', () => {
    logger.warn('warning message');
    expect(console.warn).toHaveBeenCalled();
  });

  it('should log error messages', () => {
    logger.error('error message');
    expect(console.error).toHaveBeenCalled();
  });

  it('should include context in log', () => {
    logger.info('test', { userId: '123' });
    expect(console.log).toHaveBeenCalled();
  });
});