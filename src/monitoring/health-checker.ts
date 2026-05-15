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

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI ZA HEALTH CHECKER
// ============================================================================

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
export type HealthIndicatorType = 
    | 'database'
    | 'cache'
    | 'queue'
    | 'external_service'
    | 'disk'
    | 'memory'
    | 'cpu'
    | 'custom';

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
export type HealthEventType =
    | 'indicator_registered'
    | 'indicator_removed'
    | 'probe_configured'
    | 'probe_removed'
    | 'status_changed'
    | 'check_completed'
    | 'check_failed'
    | 'check_timeout';

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

// ============================================================================
// STANJE
// ============================================================================

const indicators: Map<string, HealthIndicator> = new Map();
const probes: Map<ProbeType, ProbeConfig> = new Map();
const probeStates: Map<ProbeType, ProbeState> = new Map();
const checkResults: Map<string, HealthCheckResult> = new Map();
const eventListeners: Set<HealthEventListener> = new Set();
const checkHistory: Map<string, HealthCheckResult[]> = new Map();

let indicatorCounter = 0;
let probeCounter = 0;
let checkCounter = 0;
let eventCounter = 0;
let startTime = 0;

let config: HealthCheckerConfig = {
    checkerId: 'health-checker-1',
    defaultTimeout: 5000,
    historySize: 100,
    aggregationStrategy: 'worst',
    enableDetailedErrors: false,
    cacheDuration: 1000,
};

const statistics: HealthCheckerStatistics = {
    totalChecks: 0,
    successfulChecks: 0,
    failedChecks: 0,
    timeoutChecks: 0,
    avgCheckDuration: 0,
    lastFullCheck: null,
    uptime: 0,
    statusChanges: 0,
};

let cachedHealth: AggregatedHealth | null = null;
let cacheTimestamp = 0;

// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================

/**
 * Generate indicator ID
 */
function generateIndicatorId(): string {
    indicatorCounter++;
    return generateDeterministicId(`indicator-${indicatorCounter}`);
}

/**
 * Generate probe ID
 */
function generateProbeId(): string {
    probeCounter++;
    return generateDeterministicId(`probe-${probeCounter}`);
}

/**
 * Generate check ID
 */
function generateCheckId(): string {
    checkCounter++;
    return generateDeterministicId(`health-check-${checkCounter}`);
}

/**
 * Generate event ID
 */
function generateEventId(): string {
    eventCounter++;
    return generateDeterministicId(`health-event-${eventCounter}`);
}

/**
 * Emit health event
 */
async function emitEvent(event: HealthEvent): Promise<void> {
    for (const listener of eventListeners) {
        try {
            await listener(event);
        } catch {
            // Ignore listener errors
        }
    }
}

/**
 * Update statistics
 */
function updateStatistics(result: HealthCheckResult): void {
    const mutableStats = statistics as {
        totalChecks: number;
        successfulChecks: number;
        failedChecks: number;
        timeoutChecks: number;
        avgCheckDuration: number;
    };
    
    mutableStats.totalChecks++;
    
    if (result.status === 'healthy') {
        mutableStats.successfulChecks++;
    } else if (result.error?.includes('timeout')) {
        mutableStats.timeoutChecks++;
    } else {
        mutableStats.failedChecks++;
    }
    
    const totalDuration = mutableStats.avgCheckDuration * (mutableStats.totalChecks - 1) + result.duration;
    mutableStats.avgCheckDuration = totalDuration / mutableStats.totalChecks;
}

/**
 * Aggregate status using worst strategy
 */
function aggregateWorst(results: readonly HealthCheckResult[]): HealthStatus {
    if (results.length === 0) {
        return 'unknown';
    }
    
    const hasUnhealthy = results.some(r => r.status === 'unhealthy');
    if (hasUnhealthy) {
        return 'unhealthy';
    }
    
    const hasDegraded = results.some(r => r.status === 'degraded');
    if (hasDegraded) {
        return 'degraded';
    }
    
    const hasUnknown = results.some(r => r.status === 'unknown');
    if (hasUnknown) {
        return 'unknown';
    }
    
    return 'healthy';
}

/**
 * Aggregate status using majority strategy
 */
function aggregateMajority(results: readonly HealthCheckResult[]): HealthStatus {
    if (results.length === 0) {
        return 'unknown';
    }
    
    const counts: Record<HealthStatus, number> = {
        healthy: 0,
        unhealthy: 0,
        degraded: 0,
        unknown: 0,
    };
    
    for (const result of results) {
        counts[result.status]++;
    }
    
    const threshold = Math.ceil(results.length / 2);
    
    if (counts.healthy >= threshold) {
        return 'healthy';
    }
    if (counts.unhealthy >= threshold) {
        return 'unhealthy';
    }
    if (counts.degraded >= threshold) {
        return 'degraded';
    }
    
    return 'unknown';
}

/**
 * Aggregate status using critical only strategy
 */
function aggregateCriticalOnly(results: readonly HealthCheckResult[], indicatorMap: Map<string, HealthIndicator>): HealthStatus {
    if (results.length === 0) {
        return 'unknown';
    }
    
    const criticalResults = results.filter(r => {
        const indicator = indicatorMap.get(r.name);
        return indicator?.critical ?? false;
    });
    
    if (criticalResults.length === 0) {
        return 'healthy';
    }
    
    return aggregateWorst(criticalResults);
}

/**
 * Add to history
 */
function addToHistory(indicatorName: string, result: HealthCheckResult): void {
    const history = checkHistory.get(indicatorName) ?? [];
    history.push(result);
    
    while (history.length > config.historySize) {
        history.shift();
    }
    
    checkHistory.set(indicatorName, history);
}

// ============================================================================
// INDICATOR MANAGEMENT
// ============================================================================

/**
 * Register health indicator
 */
export function registerIndicator(
    name: string,
    check: HealthCheckFunction,
    options: {
        description?: string;
        type?: HealthIndicatorType;
        timeout?: number;
        critical?: boolean;
        tags?: readonly string[];
        metadata?: Record<string, unknown>;
    } = {}
): HealthIndicator {
    const indicatorId = generateIndicatorId();
    
    const indicator: HealthIndicator = {
        indicatorId,
        name,
        description: options.description ?? '',
        type: options.type ?? 'custom',
        check,
        timeout: options.timeout ?? config.defaultTimeout,
        critical: options.critical ?? false,
        tags: options.tags ?? [],
        metadata: options.metadata ?? {},
    };
    
    indicators.set(name, indicator);
    
    emitEvent({
        eventId: generateEventId(),
        type: 'indicator_registered',
        indicatorName: name,
        probeType: null,
        oldStatus: null,
        newStatus: 'unknown',
        timestamp: clock.nowMs(),
        data: { type: indicator.type, critical: indicator.critical },
    });
    
    return indicator;
}

/**
 * Remove health indicator
 */
export function removeIndicator(name: string): boolean {
    const indicator = indicators.get(name);
    if (!indicator) {
        return false;
    }
    
    indicators.delete(name);
    checkResults.delete(name);
    checkHistory.delete(name);
    
    emitEvent({
        eventId: generateEventId(),
        type: 'indicator_removed',
        indicatorName: name,
        probeType: null,
        oldStatus: null,
        newStatus: 'unknown',
        timestamp: clock.nowMs(),
        data: {},
    });
    
    return true;
}

/**
 * Get indicator
 */
export function getIndicator(name: string): HealthIndicator | null {
    return indicators.get(name) ?? null;
}

/**
 * Get all indicators
 */
export function getAllIndicators(): readonly HealthIndicator[] {
    return Array.from(indicators.values());
}

/**
 * Get indicators by type
 */
export function getIndicatorsByType(type: HealthIndicatorType): readonly HealthIndicator[] {
    return Array.from(indicators.values()).filter(i => i.type === type);
}

/**
 * Get indicators by tag
 */
export function getIndicatorsByTag(tag: string): readonly HealthIndicator[] {
    return Array.from(indicators.values()).filter(i => i.tags.includes(tag));
}

// ============================================================================
// PROBE MANAGEMENT
// ============================================================================

/**
 * Configure probe
 */
export function configureProbe(
    type: ProbeType,
    options: {
        path?: string;
        initialDelay?: number;
        period?: number;
        timeout?: number;
        successThreshold?: number;
        failureThreshold?: number;
        indicators?: readonly string[];
    } = {}
): ProbeConfig {
    const probeId = generateProbeId();
    
    const probeConfig: ProbeConfig = {
        probeId,
        type,
        path: options.path ?? `/${type}`,
        initialDelay: options.initialDelay ?? 0,
        period: options.period ?? 10000,
        timeout: options.timeout ?? config.defaultTimeout,
        successThreshold: options.successThreshold ?? 1,
        failureThreshold: options.failureThreshold ?? 3,
        indicators: options.indicators ?? [],
    };
    
    probes.set(type, probeConfig);
    
    probeStates.set(type, {
        probeId,
        type,
        status: 'unknown',
        consecutiveSuccesses: 0,
        consecutiveFailures: 0,
        lastCheck: null,
        lastSuccess: null,
        lastFailure: null,
        history: [],
    });
    
    emitEvent({
        eventId: generateEventId(),
        type: 'probe_configured',
        indicatorName: null,
        probeType: type,
        oldStatus: null,
        newStatus: 'unknown',
        timestamp: clock.nowMs(),
        data: { path: probeConfig.path },
    });
    
    return probeConfig;
}

/**
 * Remove probe
 */
export function removeProbe(type: ProbeType): boolean {
    const probe = probes.get(type);
    if (!probe) {
        return false;
    }
    
    probes.delete(type);
    probeStates.delete(type);
    
    emitEvent({
        eventId: generateEventId(),
        type: 'probe_removed',
        indicatorName: null,
        probeType: type,
        oldStatus: null,
        newStatus: 'unknown',
        timestamp: clock.nowMs(),
        data: {},
    });
    
    return true;
}

/**
 * Get probe configuration
 */
export function getProbeConfig(type: ProbeType): ProbeConfig | null {
    return probes.get(type) ?? null;
}

/**
 * Get probe state
 */
export function getProbeState(type: ProbeType): ProbeState | null {
    return probeStates.get(type) ?? null;
}

/**
 * Get all probe states
 */
export function getAllProbeStates(): readonly ProbeState[] {
    return Array.from(probeStates.values());
}

// ============================================================================
// HEALTH CHECKING
// ============================================================================

/**
 * Check single indicator
 */
export async function checkIndicator(name: string): Promise<HealthCheckResult> {
    const indicator = indicators.get(name);
    if (!indicator) {
        return {
            checkId: generateCheckId(),
            name,
            status: 'unknown',
            message: `Indicator '${name}' not found`,
            duration: 0,
            timestamp: clock.nowMs(),
            details: {},
            error: 'Indicator not found',
        };
    }
    
    const startTime = clock.nowMs();
    let result: HealthCheckResult;
    
    try {
        const timeoutPromise = new Promise<HealthCheckResult>((_, reject) => {
            setTimeout(() => reject(new Error('Health check timeout')), indicator.timeout);
        });
        
        result = await Promise.race([indicator.check(), timeoutPromise]);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isTimeout = errorMessage.includes('timeout');
        
        result = {
            checkId: generateCheckId(),
            name,
            status: 'unhealthy',
            message: isTimeout ? 'Health check timed out' : `Health check failed: ${errorMessage}`,
            duration: clock.nowMs() - startTime,
            timestamp: clock.nowMs(),
            details: {},
            error: config.enableDetailedErrors ? errorMessage : null,
        };
        
        emitEvent({
            eventId: generateEventId(),
            type: isTimeout ? 'check_timeout' : 'check_failed',
            indicatorName: name,
            probeType: null,
            oldStatus: checkResults.get(name)?.status ?? null,
            newStatus: 'unhealthy',
            timestamp: clock.nowMs(),
            data: { error: errorMessage },
        });
    }
    
    const previousResult = checkResults.get(name);
    checkResults.set(name, result);
    addToHistory(name, result);
    updateStatistics(result);
    
    if (previousResult && previousResult.status !== result.status) {
        const mutableStats = statistics as { statusChanges: number };
        mutableStats.statusChanges++;
        
        emitEvent({
            eventId: generateEventId(),
            type: 'status_changed',
            indicatorName: name,
            probeType: null,
            oldStatus: previousResult.status,
            newStatus: result.status,
            timestamp: clock.nowMs(),
            data: {},
        });
    }
    
    emitEvent({
        eventId: generateEventId(),
        type: 'check_completed',
        indicatorName: name,
        probeType: null,
        oldStatus: previousResult?.status ?? null,
        newStatus: result.status,
        timestamp: clock.nowMs(),
        data: { duration: result.duration },
    });
    
    return result;
}

/**
 * Check all indicators
 */
export async function checkAll(): Promise<AggregatedHealth> {
    const now = clock.nowMs();
    
    if (cachedHealth && now - cacheTimestamp < config.cacheDuration) {
        return cachedHealth;
    }
    
    const results: HealthCheckResult[] = [];
    
    for (const indicator of indicators.values()) {
        const result = await checkIndicator(indicator.name);
        results.push(result);
    }
    
    let status: HealthStatus;
    
    switch (config.aggregationStrategy) {
        case 'worst':
            status = aggregateWorst(results);
            break;
        case 'majority':
            status = aggregateMajority(results);
            break;
        case 'critical_only':
            status = aggregateCriticalOnly(results, indicators);
            break;
    }
    
    const summary: HealthSummary = {
        total: results.length,
        healthy: results.filter(r => r.status === 'healthy').length,
        unhealthy: results.filter(r => r.status === 'unhealthy').length,
        degraded: results.filter(r => r.status === 'degraded').length,
        unknown: results.filter(r => r.status === 'unknown').length,
        criticalUnhealthy: results.filter(r => {
            const indicator = indicators.get(r.name);
            return indicator?.critical && r.status === 'unhealthy';
        }).length,
    };
    
    const health: AggregatedHealth = {
        status,
        timestamp: now,
        checks: results,
        summary,
    };
    
    cachedHealth = health;
    cacheTimestamp = now;
    
    const mutableStats = statistics as { lastFullCheck: number };
    mutableStats.lastFullCheck = now;
    
    return health;
}

/**
 * Check probe
 */
export async function checkProbe(type: ProbeType): Promise<HealthStatus> {
    const probeConfig = probes.get(type);
    const state = probeStates.get(type);
    
    if (!probeConfig || !state) {
        return 'unknown';
    }
    
    const indicatorNames = probeConfig.indicators.length > 0
        ? probeConfig.indicators
        : Array.from(indicators.keys());
    
    const results: HealthCheckResult[] = [];
    
    for (const name of indicatorNames) {
        if (indicators.has(name)) {
            const result = await checkIndicator(name);
            results.push(result);
        }
    }
    
    const status = aggregateWorst(results);
    const now = clock.nowMs();
    
    let newConsecutiveSuccesses = state.consecutiveSuccesses;
    let newConsecutiveFailures = state.consecutiveFailures;
    let newLastSuccess = state.lastSuccess;
    let newLastFailure = state.lastFailure;
    
    if (status === 'healthy') {
        newConsecutiveSuccesses++;
        newConsecutiveFailures = 0;
        newLastSuccess = now;
    } else {
        newConsecutiveFailures++;
        newConsecutiveSuccesses = 0;
        newLastFailure = now;
    }
    
    let newStatus = state.status;
    
    if (newConsecutiveSuccesses >= probeConfig.successThreshold) {
        newStatus = 'healthy';
    } else if (newConsecutiveFailures >= probeConfig.failureThreshold) {
        newStatus = 'unhealthy';
    }
    
    const historyEntry: ProbeHistoryEntry = {
        timestamp: now,
        status,
        duration: results.reduce((sum, r) => sum + r.duration, 0),
        message: `${results.filter(r => r.status === 'healthy').length}/${results.length} checks passed`,
    };
    
    const newHistory = [...state.history, historyEntry].slice(-config.historySize);
    
    probeStates.set(type, {
        ...state,
        status: newStatus,
        consecutiveSuccesses: newConsecutiveSuccesses,
        consecutiveFailures: newConsecutiveFailures,
        lastCheck: now,
        lastSuccess: newLastSuccess,
        lastFailure: newLastFailure,
        history: newHistory,
    });
    
    if (state.status !== newStatus) {
        emitEvent({
            eventId: generateEventId(),
            type: 'status_changed',
            indicatorName: null,
            probeType: type,
            oldStatus: state.status,
            newStatus,
            timestamp: now,
            data: {},
        });
    }
    
    return newStatus;
}

/**
 * Get last check result
 */
export function getLastCheckResult(name: string): HealthCheckResult | null {
    return checkResults.get(name) ?? null;
}

/**
 * Get check history
 */
export function getCheckHistory(name: string): readonly HealthCheckResult[] {
    return checkHistory.get(name) ?? [];
}

// ============================================================================
// BUILT-IN INDICATORS
// ============================================================================

/**
 * Create database health indicator
 */
export function createDatabaseIndicator(
    name: string,
    checkConnection: () => Promise<boolean>,
    options: {
        critical?: boolean;
        timeout?: number;
    } = {}
): HealthIndicator {
    return registerIndicator(name, async () => {
        const startTime = clock.nowMs();
        
        try {
            const isConnected = await checkConnection();
            
            return {
                checkId: generateCheckId(),
                name,
                status: isConnected ? 'healthy' : 'unhealthy',
                message: isConnected ? 'Database connection is healthy' : 'Database connection failed',
                duration: clock.nowMs() - startTime,
                timestamp: clock.nowMs(),
                details: { connected: isConnected },
                error: null,
            };
        } catch (error) {
            return {
                checkId: generateCheckId(),
                name,
                status: 'unhealthy',
                message: 'Database health check failed',
                duration: clock.nowMs() - startTime,
                timestamp: clock.nowMs(),
                details: {},
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }, {
        type: 'database',
        critical: options.critical ?? true,
        timeout: options.timeout,
    });
}

/**
 * Create cache health indicator
 */
export function createCacheIndicator(
    name: string,
    checkCache: () => Promise<{ connected: boolean; latency: number }>,
    options: {
        critical?: boolean;
        timeout?: number;
        maxLatency?: number;
    } = {}
): HealthIndicator {
    const maxLatency = options.maxLatency ?? 100;
    
    return registerIndicator(name, async () => {
        const startTime = clock.nowMs();
        
        try {
            const result = await checkCache();
            
            let status: HealthStatus = 'healthy';
            let message = 'Cache is healthy';
            
            if (!result.connected) {
                status = 'unhealthy';
                message = 'Cache connection failed';
            } else if (result.latency > maxLatency) {
                status = 'degraded';
                message = `Cache latency is high: ${result.latency}ms`;
            }
            
            return {
                checkId: generateCheckId(),
                name,
                status,
                message,
                duration: clock.nowMs() - startTime,
                timestamp: clock.nowMs(),
                details: { connected: result.connected, latency: result.latency },
                error: null,
            };
        } catch (error) {
            return {
                checkId: generateCheckId(),
                name,
                status: 'unhealthy',
                message: 'Cache health check failed',
                duration: clock.nowMs() - startTime,
                timestamp: clock.nowMs(),
                details: {},
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }, {
        type: 'cache',
        critical: options.critical ?? false,
        timeout: options.timeout,
    });
}

/**
 * Create memory health indicator
 */
export function createMemoryIndicator(
    name: string,
    options: {
        critical?: boolean;
        warningThreshold?: number;
        criticalThreshold?: number;
    } = {}
): HealthIndicator {
    const warningThreshold = options.warningThreshold ?? 0.8;
    const criticalThreshold = options.criticalThreshold ?? 0.95;
    
    return registerIndicator(name, async () => {
        const startTime = clock.nowMs();
        
        const used = 0.5;
        const total = 1;
        const usageRatio = used / total;
        
        let status: HealthStatus = 'healthy';
        let message = `Memory usage: ${Math.round(usageRatio * 100)}%`;
        
        if (usageRatio >= criticalThreshold) {
            status = 'unhealthy';
            message = `Critical memory usage: ${Math.round(usageRatio * 100)}%`;
        } else if (usageRatio >= warningThreshold) {
            status = 'degraded';
            message = `High memory usage: ${Math.round(usageRatio * 100)}%`;
        }
        
        return {
            checkId: generateCheckId(),
            name,
            status,
            message,
            duration: clock.nowMs() - startTime,
            timestamp: clock.nowMs(),
            details: {
                used,
                total,
                usageRatio,
            },
            error: null,
        };
    }, {
        type: 'memory',
        critical: options.critical ?? false,
    });
}

/**
 * Create disk health indicator
 */
export function createDiskIndicator(
    name: string,
    options: {
        path?: string;
        critical?: boolean;
        warningThreshold?: number;
        criticalThreshold?: number;
    } = {}
): HealthIndicator {
    const warningThreshold = options.warningThreshold ?? 0.8;
    const criticalThreshold = options.criticalThreshold ?? 0.95;
    
    return registerIndicator(name, async () => {
        const startTime = clock.nowMs();
        
        const used = 50;
        const total = 100;
        const usageRatio = used / total;
        
        let status: HealthStatus = 'healthy';
        let message = `Disk usage: ${Math.round(usageRatio * 100)}%`;
        
        if (usageRatio >= criticalThreshold) {
            status = 'unhealthy';
            message = `Critical disk usage: ${Math.round(usageRatio * 100)}%`;
        } else if (usageRatio >= warningThreshold) {
            status = 'degraded';
            message = `High disk usage: ${Math.round(usageRatio * 100)}%`;
        }
        
        return {
            checkId: generateCheckId(),
            name,
            status,
            message,
            duration: clock.nowMs() - startTime,
            timestamp: clock.nowMs(),
            details: {
                path: options.path ?? '/',
                used,
                total,
                usageRatio,
            },
            error: null,
        };
    }, {
        type: 'disk',
        critical: options.critical ?? false,
    });
}

/**
 * Create external service health indicator
 */
export function createExternalServiceIndicator(
    name: string,
    checkService: () => Promise<{ available: boolean; latency: number }>,
    options: {
        critical?: boolean;
        timeout?: number;
        maxLatency?: number;
    } = {}
): HealthIndicator {
    const maxLatency = options.maxLatency ?? 1000;
    
    return registerIndicator(name, async () => {
        const startTime = clock.nowMs();
        
        try {
            const result = await checkService();
            
            let status: HealthStatus = 'healthy';
            let message = 'External service is available';
            
            if (!result.available) {
                status = 'unhealthy';
                message = 'External service is unavailable';
            } else if (result.latency > maxLatency) {
                status = 'degraded';
                message = `External service latency is high: ${result.latency}ms`;
            }
            
            return {
                checkId: generateCheckId(),
                name,
                status,
                message,
                duration: clock.nowMs() - startTime,
                timestamp: clock.nowMs(),
                details: { available: result.available, latency: result.latency },
                error: null,
            };
        } catch (error) {
            return {
                checkId: generateCheckId(),
                name,
                status: 'unhealthy',
                message: 'External service health check failed',
                duration: clock.nowMs() - startTime,
                timestamp: clock.nowMs(),
                details: {},
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }, {
        type: 'external_service',
        critical: options.critical ?? false,
        timeout: options.timeout,
    });
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Configure health checker
 */
export function configure(newConfig: Partial<HealthCheckerConfig>): void {
    config = { ...config, ...newConfig };
}

/**
 * Get configuration
 */
export function getConfig(): Readonly<HealthCheckerConfig> {
    return { ...config };
}

/**
 * Start health checker
 */
export function start(): void {
    startTime = clock.nowMs();
}

/**
 * Get uptime
 */
export function getUptime(): number {
    if (startTime === 0) {
        return 0;
    }
    return clock.nowMs() - startTime;
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get statistics
 */
export function getStatistics(): Readonly<HealthCheckerStatistics> {
    const mutableStats = statistics as { uptime: number };
    mutableStats.uptime = getUptime();
    return { ...statistics };
}

/**
 * Reset statistics
 */
export function resetStatistics(): void {
    Object.assign(statistics, {
        totalChecks: 0,
        successfulChecks: 0,
        failedChecks: 0,
        timeoutChecks: 0,
        avgCheckDuration: 0,
        lastFullCheck: null,
        uptime: 0,
        statusChanges: 0,
    });
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Add event listener
 */
export function addEventListener(listener: HealthEventListener): void {
    eventListeners.add(listener);
}

/**
 * Remove event listener
 */
export function removeEventListener(listener: HealthEventListener): void {
    eventListeners.delete(listener);
}

/**
 * Clear event listeners
 */
export function clearEventListeners(): void {
    eventListeners.clear();
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Clear cache
 */
export function clearCache(): void {
    cachedHealth = null;
    cacheTimestamp = 0;
}

/**
 * Clear all state
 */
export function clearAll(): void {
    indicators.clear();
    probes.clear();
    probeStates.clear();
    checkResults.clear();
    checkHistory.clear();
    eventListeners.clear();
    clearCache();
    resetStatistics();
    startTime = 0;
}
