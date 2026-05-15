"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerIndicator = registerIndicator;
exports.removeIndicator = removeIndicator;
exports.getIndicator = getIndicator;
exports.getAllIndicators = getAllIndicators;
exports.getIndicatorsByType = getIndicatorsByType;
exports.getIndicatorsByTag = getIndicatorsByTag;
exports.configureProbe = configureProbe;
exports.removeProbe = removeProbe;
exports.getProbeConfig = getProbeConfig;
exports.getProbeState = getProbeState;
exports.getAllProbeStates = getAllProbeStates;
exports.checkIndicator = checkIndicator;
exports.checkAll = checkAll;
exports.checkProbe = checkProbe;
exports.getLastCheckResult = getLastCheckResult;
exports.getCheckHistory = getCheckHistory;
exports.createDatabaseIndicator = createDatabaseIndicator;
exports.createCacheIndicator = createCacheIndicator;
exports.createMemoryIndicator = createMemoryIndicator;
exports.createDiskIndicator = createDiskIndicator;
exports.createExternalServiceIndicator = createExternalServiceIndicator;
exports.configure = configure;
exports.getConfig = getConfig;
exports.start = start;
exports.getUptime = getUptime;
exports.getStatistics = getStatistics;
exports.resetStatistics = resetStatistics;
exports.addEventListener = addEventListener;
exports.removeEventListener = removeEventListener;
exports.clearEventListeners = clearEventListeners;
exports.clearCache = clearCache;
exports.clearAll = clearAll;
const clock_1 = require("@mia/core/clock");
const deterministic_1 = require("@mia/core/deterministic");
const clock = (0, clock_1.getClock)();
// ============================================================================
// STANJE
// ============================================================================
const indicators = new Map();
const probes = new Map();
const probeStates = new Map();
const checkResults = new Map();
const eventListeners = new Set();
const checkHistory = new Map();
let indicatorCounter = 0;
let probeCounter = 0;
let checkCounter = 0;
let eventCounter = 0;
let startTime = 0;
let config = {
    checkerId: 'health-checker-1',
    defaultTimeout: 5000,
    historySize: 100,
    aggregationStrategy: 'worst',
    enableDetailedErrors: false,
    cacheDuration: 1000,
};
const statistics = {
    totalChecks: 0,
    successfulChecks: 0,
    failedChecks: 0,
    timeoutChecks: 0,
    avgCheckDuration: 0,
    lastFullCheck: null,
    uptime: 0,
    statusChanges: 0,
};
let cachedHealth = null;
let cacheTimestamp = 0;
// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================
/**
 * Generate indicator ID
 */
function generateIndicatorId() {
    indicatorCounter++;
    return (0, deterministic_1.generateDeterministicId)(`indicator-${indicatorCounter}`);
}
/**
 * Generate probe ID
 */
function generateProbeId() {
    probeCounter++;
    return (0, deterministic_1.generateDeterministicId)(`probe-${probeCounter}`);
}
/**
 * Generate check ID
 */
function generateCheckId() {
    checkCounter++;
    return (0, deterministic_1.generateDeterministicId)(`health-check-${checkCounter}`);
}
/**
 * Generate event ID
 */
function generateEventId() {
    eventCounter++;
    return (0, deterministic_1.generateDeterministicId)(`health-event-${eventCounter}`);
}
/**
 * Emit health event
 */
async function emitEvent(event) {
    for (const listener of eventListeners) {
        try {
            await listener(event);
        }
        catch {
            // Ignore listener errors
        }
    }
}
/**
 * Update statistics
 */
function updateStatistics(result) {
    const mutableStats = statistics;
    mutableStats.totalChecks++;
    if (result.status === 'healthy') {
        mutableStats.successfulChecks++;
    }
    else if (result.error?.includes('timeout')) {
        mutableStats.timeoutChecks++;
    }
    else {
        mutableStats.failedChecks++;
    }
    const totalDuration = mutableStats.avgCheckDuration * (mutableStats.totalChecks - 1) + result.duration;
    mutableStats.avgCheckDuration = totalDuration / mutableStats.totalChecks;
}
/**
 * Aggregate status using worst strategy
 */
function aggregateWorst(results) {
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
function aggregateMajority(results) {
    if (results.length === 0) {
        return 'unknown';
    }
    const counts = {
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
function aggregateCriticalOnly(results, indicatorMap) {
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
function addToHistory(indicatorName, result) {
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
function registerIndicator(name, check, options = {}) {
    const indicatorId = generateIndicatorId();
    const indicator = {
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
function removeIndicator(name) {
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
function getIndicator(name) {
    return indicators.get(name) ?? null;
}
/**
 * Get all indicators
 */
function getAllIndicators() {
    return Array.from(indicators.values());
}
/**
 * Get indicators by type
 */
function getIndicatorsByType(type) {
    return Array.from(indicators.values()).filter(i => i.type === type);
}
/**
 * Get indicators by tag
 */
function getIndicatorsByTag(tag) {
    return Array.from(indicators.values()).filter(i => i.tags.includes(tag));
}
// ============================================================================
// PROBE MANAGEMENT
// ============================================================================
/**
 * Configure probe
 */
function configureProbe(type, options = {}) {
    const probeId = generateProbeId();
    const probeConfig = {
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
function removeProbe(type) {
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
function getProbeConfig(type) {
    return probes.get(type) ?? null;
}
/**
 * Get probe state
 */
function getProbeState(type) {
    return probeStates.get(type) ?? null;
}
/**
 * Get all probe states
 */
function getAllProbeStates() {
    return Array.from(probeStates.values());
}
// ============================================================================
// HEALTH CHECKING
// ============================================================================
/**
 * Check single indicator
 */
async function checkIndicator(name) {
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
    let result;
    try {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Health check timeout')), indicator.timeout);
        });
        result = await Promise.race([indicator.check(), timeoutPromise]);
    }
    catch (error) {
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
        const mutableStats = statistics;
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
async function checkAll() {
    const now = clock.nowMs();
    if (cachedHealth && now - cacheTimestamp < config.cacheDuration) {
        return cachedHealth;
    }
    const results = [];
    for (const indicator of indicators.values()) {
        const result = await checkIndicator(indicator.name);
        results.push(result);
    }
    let status;
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
    const summary = {
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
    const health = {
        status,
        timestamp: now,
        checks: results,
        summary,
    };
    cachedHealth = health;
    cacheTimestamp = now;
    const mutableStats = statistics;
    mutableStats.lastFullCheck = now;
    return health;
}
/**
 * Check probe
 */
async function checkProbe(type) {
    const probeConfig = probes.get(type);
    const state = probeStates.get(type);
    if (!probeConfig || !state) {
        return 'unknown';
    }
    const indicatorNames = probeConfig.indicators.length > 0
        ? probeConfig.indicators
        : Array.from(indicators.keys());
    const results = [];
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
    }
    else {
        newConsecutiveFailures++;
        newConsecutiveSuccesses = 0;
        newLastFailure = now;
    }
    let newStatus = state.status;
    if (newConsecutiveSuccesses >= probeConfig.successThreshold) {
        newStatus = 'healthy';
    }
    else if (newConsecutiveFailures >= probeConfig.failureThreshold) {
        newStatus = 'unhealthy';
    }
    const historyEntry = {
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
function getLastCheckResult(name) {
    return checkResults.get(name) ?? null;
}
/**
 * Get check history
 */
function getCheckHistory(name) {
    return checkHistory.get(name) ?? [];
}
// ============================================================================
// BUILT-IN INDICATORS
// ============================================================================
/**
 * Create database health indicator
 */
function createDatabaseIndicator(name, checkConnection, options = {}) {
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
        }
        catch (error) {
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
function createCacheIndicator(name, checkCache, options = {}) {
    const maxLatency = options.maxLatency ?? 100;
    return registerIndicator(name, async () => {
        const startTime = clock.nowMs();
        try {
            const result = await checkCache();
            let status = 'healthy';
            let message = 'Cache is healthy';
            if (!result.connected) {
                status = 'unhealthy';
                message = 'Cache connection failed';
            }
            else if (result.latency > maxLatency) {
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
        }
        catch (error) {
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
function createMemoryIndicator(name, options = {}) {
    const warningThreshold = options.warningThreshold ?? 0.8;
    const criticalThreshold = options.criticalThreshold ?? 0.95;
    return registerIndicator(name, async () => {
        const startTime = clock.nowMs();
        const used = 0.5;
        const total = 1;
        const usageRatio = used / total;
        let status = 'healthy';
        let message = `Memory usage: ${Math.round(usageRatio * 100)}%`;
        if (usageRatio >= criticalThreshold) {
            status = 'unhealthy';
            message = `Critical memory usage: ${Math.round(usageRatio * 100)}%`;
        }
        else if (usageRatio >= warningThreshold) {
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
function createDiskIndicator(name, options = {}) {
    const warningThreshold = options.warningThreshold ?? 0.8;
    const criticalThreshold = options.criticalThreshold ?? 0.95;
    return registerIndicator(name, async () => {
        const startTime = clock.nowMs();
        const used = 50;
        const total = 100;
        const usageRatio = used / total;
        let status = 'healthy';
        let message = `Disk usage: ${Math.round(usageRatio * 100)}%`;
        if (usageRatio >= criticalThreshold) {
            status = 'unhealthy';
            message = `Critical disk usage: ${Math.round(usageRatio * 100)}%`;
        }
        else if (usageRatio >= warningThreshold) {
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
function createExternalServiceIndicator(name, checkService, options = {}) {
    const maxLatency = options.maxLatency ?? 1000;
    return registerIndicator(name, async () => {
        const startTime = clock.nowMs();
        try {
            const result = await checkService();
            let status = 'healthy';
            let message = 'External service is available';
            if (!result.available) {
                status = 'unhealthy';
                message = 'External service is unavailable';
            }
            else if (result.latency > maxLatency) {
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
        }
        catch (error) {
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
function configure(newConfig) {
    config = { ...config, ...newConfig };
}
/**
 * Get configuration
 */
function getConfig() {
    return { ...config };
}
/**
 * Start health checker
 */
function start() {
    startTime = clock.nowMs();
}
/**
 * Get uptime
 */
function getUptime() {
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
function getStatistics() {
    const mutableStats = statistics;
    mutableStats.uptime = getUptime();
    return { ...statistics };
}
/**
 * Reset statistics
 */
function resetStatistics() {
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
function addEventListener(listener) {
    eventListeners.add(listener);
}
/**
 * Remove event listener
 */
function removeEventListener(listener) {
    eventListeners.delete(listener);
}
/**
 * Clear event listeners
 */
function clearEventListeners() {
    eventListeners.clear();
}
// ============================================================================
// CLEANUP
// ============================================================================
/**
 * Clear cache
 */
function clearCache() {
    cachedHealth = null;
    cacheTimestamp = 0;
}
/**
 * Clear all state
 */
function clearAll() {
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
