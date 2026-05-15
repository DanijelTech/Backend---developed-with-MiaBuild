/**
 * Metrics Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createMetrics } from '../src/metrics.js';

describe('Metrics', () => {
  let metrics: ReturnType<typeof createMetrics>;

  beforeEach(() => {
    metrics = createMetrics('test');
  });

  it('should create a metrics instance', () => {
    expect(metrics).toBeDefined();
  });

  it('should increment counter', () => {
    metrics.increment('requests');
    expect(metrics.get('requests')).toBe(1);
  });

  it('should decrement counter', () => {
    metrics.increment('requests', 10);
    metrics.decrement('requests', 5);
    expect(metrics.get('requests')).toBe(5);
  });

  it('should set gauge value', () => {
    metrics.gauge('memory', 1024);
    expect(metrics.get('memory')).toBe(1024);
  });

  it('should record timing', () => {
    metrics.timing('duration', 100);
    const samples = metrics.collect();
    expect(samples.length).toBeGreaterThan(0);
  });

  it('should reset metrics', () => {
    metrics.increment('test');
    metrics.reset();
    expect(metrics.get('test')).toBe(0);
  });
});