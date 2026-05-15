"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Metrics = void 0;
exports.configureMetrics = configureMetrics;
exports.recordMetric = recordMetric;
exports.incrementCounter = incrementCounter;
exports.setGauge = setGauge;
exports.recordHistogram = recordHistogram;
exports.recordDatabaseMetrics = recordDatabaseMetrics;
exports.recordQueueMetrics = recordQueueMetrics;
exports.recordJobMetrics = recordJobMetrics;
exports.recordCacheMetrics = recordCacheMetrics;
exports.recordServiceCallLatency = recordServiceCallLatency;
exports.recordEventLoopLag = recordEventLoopLag;
exports.recordMemoryUsage = recordMemoryUsage;
exports.collectMetrics = collectMetrics;
exports.flushMetrics = flushMetrics;
const clock_1 = require("@mia/core/clock");
const clock = (0, clock_1.getClock)();
// ============================================================================
// KONSTANTE
// ============================================================================
const DEFAULT_CONFIG = {
    service: 'NexGen',
    environment: process.env.NODE_ENV || 'development',
    endpoint: '/metrics',
    interval: 15000,
    enabled: true,
};
// ============================================================================
// STANJE
// ============================================================================
let currentConfig = DEFAULT_CONFIG;
const metricsBuffer = [];
const counters = new Map();
const gauges = new Map();
const histograms = new Map();
// ============================================================================
// FUNKCIJE
// ============================================================================
function configureMetrics(config) {
    currentConfig = { ...currentConfig, ...config };
}
function createMetric(name, type, value, labels = {}) {
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
function recordMetric(name, type, value, labels = {}) {
    if (!currentConfig.enabled)
        return;
    const metric = createMetric(name, type, value, labels);
    metricsBuffer.push(metric);
}
function incrementCounter(name, labels = {}, delta = 1) {
    const key = `${name}:${JSON.stringify(labels)}`;
    const current = counters.get(key) || 0;
    counters.set(key, current + delta);
    recordMetric(name, 'counter', current + delta, labels);
}
function setGauge(name, value, labels = {}) {
    const key = `${name}:${JSON.stringify(labels)}`;
    gauges.set(key, value);
    recordMetric(name, 'gauge', value, labels);
}
function recordHistogram(name, value, labels = {}) {
    const key = `${name}:${JSON.stringify(labels)}`;
    const values = histograms.get(key) || [];
    values.push(value);
    histograms.set(key, values);
    recordMetric(name, 'histogram', value, labels);
}
// Backend-specific metrics functions
function recordDatabaseMetrics(metrics) {
    recordHistogram('db_query_latency_ms', metrics.queryLatencyMs, { type: 'query' });
    setGauge('db_connection_pool_size', metrics.connectionPoolSize);
    setGauge('db_active_connections', metrics.activeConnections);
    setGauge('db_waiting_queries', metrics.waitingQueries);
    incrementCounter('db_query_errors_total', {}, metrics.queryErrorCount);
}
function recordQueueMetrics(metrics) {
    setGauge('queue_depth', metrics.depth, { queue: metrics.queueName });
    setGauge('queue_lag', metrics.lag, { queue: metrics.queueName });
    setGauge('queue_publish_rate', metrics.publishRate, { queue: metrics.queueName });
    setGauge('queue_consume_rate', metrics.consumeRate, { queue: metrics.queueName });
    setGauge('queue_dead_letter_count', metrics.deadLetterCount, { queue: metrics.queueName });
}
function recordJobMetrics(metrics) {
    recordHistogram('job_execution_time_ms', metrics.executionTimeMs, { job: metrics.jobName });
    incrementCounter('job_success_total', { job: metrics.jobName }, metrics.successCount);
    incrementCounter('job_failure_total', { job: metrics.jobName }, metrics.failureCount);
    incrementCounter('job_retry_total', { job: metrics.jobName }, metrics.retryCount);
    setGauge('job_queued_count', metrics.queuedCount, { job: metrics.jobName });
}
function recordCacheMetrics(metrics) {
    incrementCounter('cache_hits_total', { cache: metrics.cacheName }, metrics.hitCount);
    incrementCounter('cache_misses_total', { cache: metrics.cacheName }, metrics.missCount);
    setGauge('cache_hit_ratio', metrics.hitRatio, { cache: metrics.cacheName });
    incrementCounter('cache_evictions_total', { cache: metrics.cacheName }, metrics.evictionCount);
    setGauge('cache_memory_bytes', metrics.memoryUsageBytes, { cache: metrics.cacheName });
}
function recordServiceCallLatency(targetService, method, latencyMs, success) {
    recordHistogram('service_call_latency_ms', latencyMs, { target: targetService, method });
    incrementCounter(success ? 'service_call_success_total' : 'service_call_failure_total', { target: targetService, method });
}
function recordEventLoopLag(lagMs) {
    setGauge('event_loop_lag_ms', lagMs);
}
function recordMemoryUsage() {
    const usage = process.memoryUsage();
    setGauge('memory_heap_used_bytes', usage.heapUsed);
    setGauge('memory_heap_total_bytes', usage.heapTotal);
    setGauge('memory_rss_bytes', usage.rss);
    setGauge('memory_external_bytes', usage.external);
}
function collectMetrics() {
    return [...metricsBuffer];
}
function flushMetrics() {
    const metrics = [...metricsBuffer];
    metricsBuffer.length = 0;
    return metrics;
}
// ============================================================================
// IZVOZ
// ============================================================================
exports.Metrics = {
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
