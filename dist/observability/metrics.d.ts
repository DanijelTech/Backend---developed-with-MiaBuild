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
export declare function configureMetrics(config: Partial<MetricsConfig>): void;
export declare function recordMetric(name: string, type: MetricType, value: number, labels?: Record<string, string>): void;
export declare function incrementCounter(name: string, labels?: Record<string, string>, delta?: number): void;
export declare function setGauge(name: string, value: number, labels?: Record<string, string>): void;
export declare function recordHistogram(name: string, value: number, labels?: Record<string, string>): void;
export declare function recordDatabaseMetrics(metrics: DatabaseMetrics): void;
export declare function recordQueueMetrics(metrics: QueueMetrics): void;
export declare function recordJobMetrics(metrics: JobMetrics): void;
export declare function recordCacheMetrics(metrics: CacheMetrics): void;
export declare function recordServiceCallLatency(targetService: string, method: string, latencyMs: number, success: boolean): void;
export declare function recordEventLoopLag(lagMs: number): void;
export declare function recordMemoryUsage(): void;
export declare function collectMetrics(): readonly Metric[];
export declare function flushMetrics(): readonly Metric[];
export declare const Metrics: {
    configure: typeof configureMetrics;
    record: typeof recordMetric;
    counter: typeof incrementCounter;
    gauge: typeof setGauge;
    histogram: typeof recordHistogram;
    db: typeof recordDatabaseMetrics;
    queue: typeof recordQueueMetrics;
    job: typeof recordJobMetrics;
    cache: typeof recordCacheMetrics;
    serviceCall: typeof recordServiceCallLatency;
    eventLoopLag: typeof recordEventLoopLag;
    memory: typeof recordMemoryUsage;
    collect: typeof collectMetrics;
    flush: typeof flushMetrics;
};
