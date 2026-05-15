/**
 * @file Metrics collection modul za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 * 
 * @requirement ZAH-ZALEDNI-OBS-002 Metrics collection za zaledne sisteme
 * @design DSN-ZALEDNI-OBS-002 Backend metrics arhitektura
 * @test TEST-ZALEDNI-OBS-002 Preverjanje metrics zbiranja
 * 
 * Backend Metrics - prilagojen za zaledne sisteme:
 * - Database latence in connection pool metrike
 * - Message queue depth, lag, throughput
 * - Background job metrike (trajanje, uspešnost, čakalna vrsta)
 * - Service-to-service latence
 * - Cache hit/miss ratio
 * - Event loop lag in memory saturation
 * 
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom OBS_002 - Metrics Collection
 */

import { getClock, Clock } from '@mia/core/clock';
const clock: Clock = getClock();

// ============================================================================
// TIPI
// ============================================================================

export type MetricType = 'counter' | 'gauge' | 'histogram';

export interface Metric {
    readonly name: string;
    readonly type: MetricType;
    readonly value: number;
    readonly labels: Readonly<Record<string, string>>;
    readonly timestamp: string;
    readonly service: string;
    readonly environment: string;
}

export interface MetricsConfig {
    readonly service: string;
    readonly environment: string;
    readonly endpoint: string;
    readonly interval: number;
    readonly enabled: boolean;
}

export interface DatabaseMetrics {
    readonly queryLatencyMs: number;
    readonly connectionPoolSize: number;
    readonly activeConnections: number;
    readonly waitingQueries: number;
    readonly queryErrorCount: number;
}

export interface QueueMetrics {
    readonly queueName: string;
    readonly depth: number;
    readonly lag: number;
    readonly publishRate: number;
    readonly consumeRate: number;
    readonly deadLetterCount: number;
}

export interface JobMetrics {
    readonly jobName: string;
    readonly executionTimeMs: number;
    readonly successCount: number;
    readonly failureCount: number;
    readonly retryCount: number;
    readonly queuedCount: number;
}

export interface CacheMetrics {
    readonly cacheName: string;
    readonly hitCount: number;
    readonly missCount: number;
    readonly hitRatio: number;
    readonly evictionCount: number;
    readonly memoryUsageBytes: number;
}

// ============================================================================
// KONSTANTE
// ============================================================================

const DEFAULT_CONFIG: MetricsConfig = {
    service: 'NexGen',
    environment: process.env.NODE_ENV || 'development',
    endpoint: '/metrics',
    interval: 15000,
    enabled: true,
};

// ============================================================================
// STANJE
// ============================================================================

let currentConfig: MetricsConfig = DEFAULT_CONFIG;
const metricsBuffer: Metric[] = [];
const counters: Map<string, number> = new Map();
const gauges: Map<string, number> = new Map();
const histograms: Map<string, number[]> = new Map();

// ============================================================================
// FUNKCIJE
// ============================================================================

export function configureMetrics(config: Partial<MetricsConfig>): void {
    currentConfig = { ...currentConfig, ...config };
}

function createMetric(name: string, type: MetricType, value: number, labels: Record<string, string> = {}): Metric {
    return {
        name,
        type,
        value,
        labels,
        timestamp: new Date(clock.nowMs()).toISOString(),
        service: currentConfig.service,
        environment: currentConfig.environment,
    };
}

export function recordMetric(name: string, type: MetricType, value: number, labels: Record<string, string> = {}): void {
    if (!currentConfig.enabled) return;
    const metric = createMetric(name, type, value, labels);
    metricsBuffer.push(metric);
}

export function incrementCounter(name: string, labels: Record<string, string> = {}, delta: number = 1): void {
    const key = `${name}:${JSON.stringify(labels)}`;
    const current = counters.get(key) || 0;
    counters.set(key, current + delta);
    recordMetric(name, 'counter', current + delta, labels);
}

export function setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = `${name}:${JSON.stringify(labels)}`;
    gauges.set(key, value);
    recordMetric(name, 'gauge', value, labels);
}

export function recordHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = `${name}:${JSON.stringify(labels)}`;
    const values = histograms.get(key) || [];
    values.push(value);
    histograms.set(key, values);
    recordMetric(name, 'histogram', value, labels);
}

// Backend-specific metrics functions

export function recordDatabaseMetrics(metrics: DatabaseMetrics): void {
    recordHistogram('db_query_latency_ms', metrics.queryLatencyMs, { type: 'query' });
    setGauge('db_connection_pool_size', metrics.connectionPoolSize);
    setGauge('db_active_connections', metrics.activeConnections);
    setGauge('db_waiting_queries', metrics.waitingQueries);
    incrementCounter('db_query_errors_total', {}, metrics.queryErrorCount);
}

export function recordQueueMetrics(metrics: QueueMetrics): void {
    setGauge('queue_depth', metrics.depth, { queue: metrics.queueName });
    setGauge('queue_lag', metrics.lag, { queue: metrics.queueName });
    setGauge('queue_publish_rate', metrics.publishRate, { queue: metrics.queueName });
    setGauge('queue_consume_rate', metrics.consumeRate, { queue: metrics.queueName });
    setGauge('queue_dead_letter_count', metrics.deadLetterCount, { queue: metrics.queueName });
}

export function recordJobMetrics(metrics: JobMetrics): void {
    recordHistogram('job_execution_time_ms', metrics.executionTimeMs, { job: metrics.jobName });
    incrementCounter('job_success_total', { job: metrics.jobName }, metrics.successCount);
    incrementCounter('job_failure_total', { job: metrics.jobName }, metrics.failureCount);
    incrementCounter('job_retry_total', { job: metrics.jobName }, metrics.retryCount);
    setGauge('job_queued_count', metrics.queuedCount, { job: metrics.jobName });
}

export function recordCacheMetrics(metrics: CacheMetrics): void {
    incrementCounter('cache_hits_total', { cache: metrics.cacheName }, metrics.hitCount);
    incrementCounter('cache_misses_total', { cache: metrics.cacheName }, metrics.missCount);
    setGauge('cache_hit_ratio', metrics.hitRatio, { cache: metrics.cacheName });
    incrementCounter('cache_evictions_total', { cache: metrics.cacheName }, metrics.evictionCount);
    setGauge('cache_memory_bytes', metrics.memoryUsageBytes, { cache: metrics.cacheName });
}

export function recordServiceCallLatency(targetService: string, method: string, latencyMs: number, success: boolean): void {
    recordHistogram('service_call_latency_ms', latencyMs, { target: targetService, method });
    incrementCounter(success ? 'service_call_success_total' : 'service_call_failure_total', { target: targetService, method });
}

export function recordEventLoopLag(lagMs: number): void {
    setGauge('event_loop_lag_ms', lagMs);
}

export function recordMemoryUsage(): void {
    const usage = process.memoryUsage();
    setGauge('memory_heap_used_bytes', usage.heapUsed);
    setGauge('memory_heap_total_bytes', usage.heapTotal);
    setGauge('memory_rss_bytes', usage.rss);
    setGauge('memory_external_bytes', usage.external);
}

export function collectMetrics(): readonly Metric[] {
    return [...metricsBuffer];
}

export function flushMetrics(): readonly Metric[] {
    const metrics = [...metricsBuffer];
    metricsBuffer.length = 0;
    return metrics;
}

// ============================================================================
// IZVOZ
// ============================================================================

export const Metrics = {
    configure: configureMetrics,
    record: recordMetric,
    counter: incrementCounter,
    gauge: setGauge,
    histogram: recordHistogram,
    db: recordDatabaseMetrics,
    queue: recordQueueMetrics,
    job: recordJobMetrics,
    cache: recordCacheMetrics,
    serviceCall: recordServiceCallLatency,
    eventLoopLag: recordEventLoopLag,
    memory: recordMemoryUsage,
    collect: collectMetrics,
    flush: flushMetrics,
};
