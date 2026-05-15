/**
 * @file Health Checker za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-MON-003 Health checking za zaledne sisteme
 * @design DSN-ZALEDNI-MON-003 Backend health checker arhitektura
 * @test TEST-ZALEDNI-MON-003 Preverjanje health checker
 *
 * Health Checker - prilagojen za zaledne sisteme:
 * - Liveness probes
 * - Readiness probes
 * - Startup probes
 * - Dependency health checks
 * - Custom health indicators
 * - Health aggregation
 * - Health history
 * - Alerting integration
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom MON_003 - Health Checker
 */
/**
 * Health status
 */
export type HealthStatus = 'healthy' | 'unhealthy' | 'degraded' | 'unknown';
/**
 * Probe type
 */
export type ProbeType = 'liveness' | 'readiness' | 'startup';
/**
 * Health check result
 */
export interface HealthCheckResult {
    readonly checkId: string;
    readonly name: string;
    readonly status: HealthStatus;
    readonly message: string;
    readonly duration: number;
    readonly timestamp: number;
    readonly details: Readonly<Record<string, unknown>>;
    readonly error: string | null;
}
/**
 * Health indicator
 */
export interface HealthIndicator {
    readonly indicatorId: string;
    readonly name: string;
    readonly description: string;
    readonly type: HealthIndicatorType;
    readonly check: HealthCheckFunction;
    readonly timeout: number;
    readonly critical: boolean;
    readonly tags: readonly string[];
    readonly metadata: Readonly<Record<string, unknown>>;
}
/**
 * Health indicator type
 */
export type HealthIndicatorType = 'database' | 'cache' | 'queue' | 'external_service' | 'disk' | 'memory' | 'cpu' | 'custom';
/**
 * Health check function
 */
export type HealthCheckFunction = () => Promise<HealthCheckResult>;
/**
 * Probe configuration
 */
export interface ProbeConfig {
    readonly probeId: string;
    readonly type: ProbeType;
    readonly path: string;
    readonly initialDelay: number;
    readonly period: number;
    readonly timeout: number;
    readonly successThreshold: number;
    readonly failureThreshold: number;
    readonly indicators: readonly string[];
}
/**
 * Probe state
 */
export interface ProbeState {
    readonly probeId: string;
    readonly type: ProbeType;
    readonly status: HealthStatus;
    readonly consecutiveSuccesses: number;
    readonly consecutiveFailures: number;
    readonly lastCheck: number | null;
    readonly lastSuccess: number | null;
    readonly lastFailure: number | null;
    readonly history: readonly ProbeHistoryEntry[];
}
/**
 * Probe history entry
 */
export interface ProbeHistoryEntry {
    readonly timestamp: number;
    readonly status: HealthStatus;
    readonly duration: number;
    readonly message: string;
}
/**
 * Aggregated health
 */
export interface AggregatedHealth {
    readonly status: HealthStatus;
    readonly timestamp: number;
    readonly checks: readonly HealthCheckResult[];
    readonly summary: HealthSummary;
}
/**
 * Health summary
 */
export interface HealthSummary {
    readonly total: number;
    readonly healthy: number;
    readonly unhealthy: number;
    readonly degraded: number;
    readonly unknown: number;
    readonly criticalUnhealthy: number;
}
/**
 * Health event
 */
export interface HealthEvent {
    readonly eventId: string;
    readonly type: HealthEventType;
    readonly indicatorName: string | null;
    readonly probeType: ProbeType | null;
    readonly oldStatus: HealthStatus | null;
    readonly newStatus: HealthStatus;
    readonly timestamp: number;
    readonly data: Readonly<Record<string, unknown>>;
}
/**
 * Health event type
 */
export type HealthEventType = 'indicator_registered' | 'indicator_removed' | 'probe_configured' | 'probe_removed' | 'status_changed' | 'check_completed' | 'check_failed' | 'check_timeout';
/**
 * Health event listener
 */
export type HealthEventListener = (event: HealthEvent) => void | Promise<void>;
/**
 * Health checker configuration
 */
export interface HealthCheckerConfig {
    readonly checkerId: string;
    readonly defaultTimeout: number;
    readonly historySize: number;
    readonly aggregationStrategy: AggregationStrategy;
    readonly enableDetailedErrors: boolean;
    readonly cacheDuration: number;
}
/**
 * Aggregation strategy
 */
export type AggregationStrategy = 'worst' | 'majority' | 'critical_only';
/**
 * Health checker statistics
 */
export interface HealthCheckerStatistics {
    readonly totalChecks: number;
    readonly successfulChecks: number;
    readonly failedChecks: number;
    readonly timeoutChecks: number;
    readonly avgCheckDuration: number;
    readonly lastFullCheck: number | null;
    readonly uptime: number;
    readonly statusChanges: number;
}
/**
 * Dependency health
 */
export interface DependencyHealth {
    readonly name: string;
    readonly type: string;
    readonly status: HealthStatus;
    readonly latency: number;
    readonly lastChecked: number;
    readonly metadata: Readonly<Record<string, unknown>>;
}
/**
 * Register health indicator
 */
export declare function registerIndicator(name: string, check: HealthCheckFunction, options?: {
    description?: string;
    type?: HealthIndicatorType;
    timeout?: number;
    critical?: boolean;
    tags?: readonly string[];
    metadata?: Record<string, unknown>;
}): HealthIndicator;
/**
 * Remove health indicator
 */
export declare function removeIndicator(name: string): boolean;
/**
 * Get indicator
 */
export declare function getIndicator(name: string): HealthIndicator | null;
/**
 * Get all indicators
 */
export declare function getAllIndicators(): readonly HealthIndicator[];
/**
 * Get indicators by type
 */
export declare function getIndicatorsByType(type: HealthIndicatorType): readonly HealthIndicator[];
/**
 * Get indicators by tag
 */
export declare function getIndicatorsByTag(tag: string): readonly HealthIndicator[];
/**
 * Configure probe
 */
export declare function configureProbe(type: ProbeType, options?: {
    path?: string;
    initialDelay?: number;
    period?: number;
    timeout?: number;
    successThreshold?: number;
    failureThreshold?: number;
    indicators?: readonly string[];
}): ProbeConfig;
/**
 * Remove probe
 */
export declare function removeProbe(type: ProbeType): boolean;
/**
 * Get probe configuration
 */
export declare function getProbeConfig(type: ProbeType): ProbeConfig | null;
/**
 * Get probe state
 */
export declare function getProbeState(type: ProbeType): ProbeState | null;
/**
 * Get all probe states
 */
export declare function getAllProbeStates(): readonly ProbeState[];
/**
 * Check single indicator
 */
export declare function checkIndicator(name: string): Promise<HealthCheckResult>;
/**
 * Check all indicators
 */
export declare function checkAll(): Promise<AggregatedHealth>;
/**
 * Check probe
 */
export declare function checkProbe(type: ProbeType): Promise<HealthStatus>;
/**
 * Get last check result
 */
export declare function getLastCheckResult(name: string): HealthCheckResult | null;
/**
 * Get check history
 */
export declare function getCheckHistory(name: string): readonly HealthCheckResult[];
/**
 * Create database health indicator
 */
export declare function createDatabaseIndicator(name: string, checkConnection: () => Promise<boolean>, options?: {
    critical?: boolean;
    timeout?: number;
}): HealthIndicator;
/**
 * Create cache health indicator
 */
export declare function createCacheIndicator(name: string, checkCache: () => Promise<{
    connected: boolean;
    latency: number;
}>, options?: {
    critical?: boolean;
    timeout?: number;
    maxLatency?: number;
}): HealthIndicator;
/**
 * Create memory health indicator
 */
export declare function createMemoryIndicator(name: string, options?: {
    critical?: boolean;
    warningThreshold?: number;
    criticalThreshold?: number;
}): HealthIndicator;
/**
 * Create disk health indicator
 */
export declare function createDiskIndicator(name: string, options?: {
    path?: string;
    critical?: boolean;
    warningThreshold?: number;
    criticalThreshold?: number;
}): HealthIndicator;
/**
 * Create external service health indicator
 */
export declare function createExternalServiceIndicator(name: string, checkService: () => Promise<{
    available: boolean;
    latency: number;
}>, options?: {
    critical?: boolean;
    timeout?: number;
    maxLatency?: number;
}): HealthIndicator;
/**
 * Configure health checker
 */
export declare function configure(newConfig: Partial<HealthCheckerConfig>): void;
/**
 * Get configuration
 */
export declare function getConfig(): Readonly<HealthCheckerConfig>;
/**
 * Start health checker
 */
export declare function start(): void;
/**
 * Get uptime
 */
export declare function getUptime(): number;
/**
 * Get statistics
 */
export declare function getStatistics(): Readonly<HealthCheckerStatistics>;
/**
 * Reset statistics
 */
export declare function resetStatistics(): void;
/**
 * Add event listener
 */
export declare function addEventListener(listener: HealthEventListener): void;
/**
 * Remove event listener
 */
export declare function removeEventListener(listener: HealthEventListener): void;
/**
 * Clear event listeners
 */
export declare function clearEventListeners(): void;
/**
 * Clear cache
 */
export declare function clearCache(): void;
/**
 * Clear all state
 */
export declare function clearAll(): void;
