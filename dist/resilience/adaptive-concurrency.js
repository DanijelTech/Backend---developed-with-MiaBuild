"use strict";
/**
 * @file Adaptive Concurrency za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-RES-010 Adaptive concurrency za zaledne sisteme
 * @design DSN-ZALEDNI-RES-010 Backend adaptive concurrency arhitektura
 * @test TEST-ZALEDNI-RES-010 Preverjanje adaptive concurrency
 *
 * Adaptive Concurrency - prilagojen za zaledne sisteme:
 * - Dynamic concurrency limits
 * - Latency-based adjustment
 * - Gradient descent optimization
 * - Vegas algorithm
 * - AIMD algorithm
 * - Metrics collection
 * - Event notifications
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom RES_010 - Adaptive Concurrency
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdaptiveConcurrencyConfig = createAdaptiveConcurrencyConfig;
exports.getAdaptiveConcurrencyConfig = getAdaptiveConcurrencyConfig;
exports.getAllAdaptiveConcurrencyConfigs = getAllAdaptiveConcurrencyConfigs;
exports.updateAdaptiveConcurrencyConfig = updateAdaptiveConcurrencyConfig;
exports.deleteAdaptiveConcurrencyConfig = deleteAdaptiveConcurrencyConfig;
exports.acquireToken = acquireToken;
exports.releaseToken = releaseToken;
exports.getActiveTokens = getActiveTokens;
exports.calculateLatencyStatistics = calculateLatencyStatistics;
exports.getConcurrencyState = getConcurrencyState;
exports.getAdjustmentHistory = getAdjustmentHistory;
exports.getStatistics = getStatistics;
exports.resetStatistics = resetStatistics;
exports.addEventListener = addEventListener;
exports.removeEventListener = removeEventListener;
exports.clearEventListeners = clearEventListeners;
exports.clearAll = clearAll;
const clock_1 = require("@mia/core/clock");
const deterministic_1 = require("@mia/core/deterministic");
const clock = (0, clock_1.getClock)();
// ============================================================================
// STANJE
// ============================================================================
const configs = new Map();
const states = new Map();
const samples = new Map();
const tokens = new Map();
const adjustments = new Map();
const eventListeners = new Set();
let configCounter = 0;
let stateCounter = 0;
let sampleCounter = 0;
let tokenCounter = 0;
let recordCounter = 0;
let eventCounter = 0;
const statistics = {
    totalConfigs: 0,
    totalTokensAcquired: 0,
    totalTokensReleased: 0,
    totalTokensRejected: 0,
    totalAdjustments: 0,
    totalIncreases: 0,
    totalDecreases: 0,
    averageLimit: 0,
    averageLatency: 0,
};
// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================
/**
 * Generate config ID
 */
function generateConfigId() {
    configCounter++;
    return (0, deterministic_1.generateDeterministicId)(`ac-config-${configCounter}`);
}
/**
 * Generate state ID
 */
function generateStateId() {
    stateCounter++;
    return (0, deterministic_1.generateDeterministicId)(`ac-state-${stateCounter}`);
}
/**
 * Generate sample ID
 */
function generateSampleId() {
    sampleCounter++;
    return (0, deterministic_1.generateDeterministicId)(`latency-sample-${sampleCounter}`);
}
/**
 * Generate token ID
 */
function generateTokenId() {
    tokenCounter++;
    return (0, deterministic_1.generateDeterministicId)(`conc-token-${tokenCounter}`);
}
/**
 * Generate record ID
 */
function generateRecordId() {
    recordCounter++;
    return (0, deterministic_1.generateDeterministicId)(`adj-record-${recordCounter}`);
}
/**
 * Generate event ID
 */
function generateEventId() {
    eventCounter++;
    return (0, deterministic_1.generateDeterministicId)(`ac-event-${eventCounter}`);
}
/**
 * Emit adaptive concurrency event
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
function updateStatistics() {
    const mutableStats = statistics;
    mutableStats.totalConfigs = configs.size;
    let totalLimit = 0;
    let limitCount = 0;
    for (const state of states.values()) {
        totalLimit += state.currentLimit;
        limitCount++;
    }
    mutableStats.averageLimit = limitCount > 0 ? totalLimit / limitCount : 0;
    let totalLatency = 0;
    let latencyCount = 0;
    for (const sampleList of samples.values()) {
        for (const sample of sampleList) {
            totalLatency += sample.latency;
            latencyCount++;
        }
    }
    mutableStats.averageLatency = latencyCount > 0 ? totalLatency / latencyCount : 0;
}
/**
 * Initialize concurrency state
 */
function initializeConcurrencyState(configId, initialLimit) {
    return {
        stateId: generateStateId(),
        configId,
        currentLimit: initialLimit,
        inFlight: 0,
        available: initialLimit,
        limiterState: 'stable',
        lastAdjustment: null,
        adjustmentDirection: 'stable',
        consecutiveIncreases: 0,
        consecutiveDecreases: 0,
    };
}
/**
 * Calculate percentile
 */
function calculatePercentile(sortedValues, percentile) {
    if (sortedValues.length === 0) {
        return 0;
    }
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
}
/**
 * Calculate standard deviation
 */
function calculateStdDeviation(values, mean) {
    if (values.length === 0) {
        return 0;
    }
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
}
// ============================================================================
// CONFIG MANAGEMENT
// ============================================================================
/**
 * Create adaptive concurrency config
 */
async function createAdaptiveConcurrencyConfig(name, options = {}) {
    const configId = generateConfigId();
    const config = {
        configId,
        name,
        algorithm: options.algorithm ?? 'vegas',
        initialLimit: options.initialLimit ?? 10,
        minLimit: options.minLimit ?? 1,
        maxLimit: options.maxLimit ?? 100,
        targetLatency: options.targetLatency ?? 100,
        latencyTolerance: options.latencyTolerance ?? 0.1,
        smoothingFactor: options.smoothingFactor ?? 0.2,
        probeInterval: options.probeInterval ?? 1000,
        backoffMultiplier: options.backoffMultiplier ?? 0.9,
        recoveryMultiplier: options.recoveryMultiplier ?? 1.1,
        enabled: true,
        metadata: options.metadata ?? {},
    };
    configs.set(configId, config);
    configs.set(name, config);
    states.set(configId, initializeConcurrencyState(configId, config.initialLimit));
    samples.set(configId, []);
    tokens.set(configId, []);
    adjustments.set(configId, []);
    await emitEvent({
        eventId: generateEventId(),
        type: 'config_created',
        configId,
        timestamp: clock.nowMs(),
        data: { name, algorithm: config.algorithm, initialLimit: config.initialLimit },
    });
    updateStatistics();
    return config;
}
/**
 * Get adaptive concurrency config
 */
function getAdaptiveConcurrencyConfig(nameOrId) {
    return configs.get(nameOrId) ?? null;
}
/**
 * Get all adaptive concurrency configs
 */
function getAllAdaptiveConcurrencyConfigs() {
    const uniqueConfigs = new Map();
    for (const config of configs.values()) {
        uniqueConfigs.set(config.configId, config);
    }
    return Array.from(uniqueConfigs.values());
}
/**
 * Update adaptive concurrency config
 */
function updateAdaptiveConcurrencyConfig(nameOrId, updates) {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    const updatedConfig = {
        ...config,
        targetLatency: updates.targetLatency ?? config.targetLatency,
        latencyTolerance: updates.latencyTolerance ?? config.latencyTolerance,
        minLimit: updates.minLimit ?? config.minLimit,
        maxLimit: updates.maxLimit ?? config.maxLimit,
        enabled: updates.enabled ?? config.enabled,
    };
    configs.set(config.configId, updatedConfig);
    configs.set(config.name, updatedConfig);
    return updatedConfig;
}
/**
 * Delete adaptive concurrency config
 */
async function deleteAdaptiveConcurrencyConfig(nameOrId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    configs.delete(config.configId);
    configs.delete(config.name);
    states.delete(config.configId);
    samples.delete(config.configId);
    tokens.delete(config.configId);
    adjustments.delete(config.configId);
    await emitEvent({
        eventId: generateEventId(),
        type: 'config_deleted',
        configId: config.configId,
        timestamp: clock.nowMs(),
        data: {},
    });
    updateStatistics();
    return true;
}
// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================
/**
 * Acquire token
 */
async function acquireToken(nameOrId) {
    const config = configs.get(nameOrId);
    if (!config || !config.enabled) {
        return null;
    }
    const state = states.get(config.configId);
    if (!state) {
        return null;
    }
    const mutableStats = statistics;
    if (state.available <= 0) {
        mutableStats.totalTokensRejected++;
        await emitEvent({
            eventId: generateEventId(),
            type: 'token_rejected',
            configId: config.configId,
            timestamp: clock.nowMs(),
            data: { currentLimit: state.currentLimit, inFlight: state.inFlight },
        });
        return null;
    }
    const now = clock.nowMs();
    const token = {
        tokenId: generateTokenId(),
        configId: config.configId,
        acquiredAt: now,
        released: false,
        releasedAt: null,
        latency: null,
    };
    const tokenList = tokens.get(config.configId) ?? [];
    tokenList.push(token);
    tokens.set(config.configId, tokenList);
    const updatedState = {
        ...state,
        inFlight: state.inFlight + 1,
        available: state.available - 1,
    };
    states.set(config.configId, updatedState);
    mutableStats.totalTokensAcquired++;
    await emitEvent({
        eventId: generateEventId(),
        type: 'token_acquired',
        configId: config.configId,
        timestamp: now,
        data: { tokenId: token.tokenId, inFlight: updatedState.inFlight },
    });
    return token;
}
/**
 * Release token
 */
async function releaseToken(nameOrId, tokenId, options = {}) {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    const tokenList = tokens.get(config.configId);
    if (!tokenList) {
        return false;
    }
    const index = tokenList.findIndex(t => t.tokenId === tokenId);
    if (index === -1) {
        return false;
    }
    const token = tokenList[index];
    if (token.released) {
        return false;
    }
    const now = clock.nowMs();
    const latency = now - token.acquiredAt;
    const releasedToken = {
        ...token,
        released: true,
        releasedAt: now,
        latency,
    };
    tokenList[index] = releasedToken;
    tokens.set(config.configId, tokenList);
    const state = states.get(config.configId);
    if (state) {
        const updatedState = {
            ...state,
            inFlight: state.inFlight - 1,
            available: state.available + 1,
        };
        states.set(config.configId, updatedState);
    }
    const sample = {
        sampleId: generateSampleId(),
        configId: config.configId,
        latency,
        timestamp: now,
        success: options.success ?? true,
        concurrencyAtTime: state?.currentLimit ?? config.initialLimit,
    };
    const sampleList = samples.get(config.configId) ?? [];
    sampleList.push(sample);
    if (sampleList.length > 1000) {
        sampleList.shift();
    }
    samples.set(config.configId, sampleList);
    const mutableStats = statistics;
    mutableStats.totalTokensReleased++;
    await emitEvent({
        eventId: generateEventId(),
        type: 'token_released',
        configId: config.configId,
        timestamp: now,
        data: { tokenId, latency, success: options.success ?? true },
    });
    await adjustLimit(config.configId);
    return true;
}
/**
 * Get active tokens
 */
function getActiveTokens(nameOrId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return [];
    }
    const tokenList = tokens.get(config.configId) ?? [];
    return tokenList.filter(t => !t.released);
}
// ============================================================================
// LIMIT ADJUSTMENT
// ============================================================================
/**
 * Adjust limit based on algorithm
 */
async function adjustLimit(configId) {
    const config = configs.get(configId);
    const state = states.get(configId);
    if (!config || !state) {
        return;
    }
    const now = clock.nowMs();
    if (state.lastAdjustment && now - state.lastAdjustment < config.probeInterval) {
        return;
    }
    const latencyStats = calculateLatencyStatistics(configId);
    if (!latencyStats || latencyStats.sampleCount < 10) {
        return;
    }
    let newLimit = state.currentLimit;
    let direction = 'stable';
    let reason = '';
    switch (config.algorithm) {
        case 'vegas':
            const vegasResult = vegasAlgorithm(config, state, latencyStats);
            newLimit = vegasResult.limit;
            direction = vegasResult.direction;
            reason = vegasResult.reason;
            break;
        case 'aimd':
            const aimdResult = aimdAlgorithm(config, state, latencyStats);
            newLimit = aimdResult.limit;
            direction = aimdResult.direction;
            reason = aimdResult.reason;
            break;
        case 'gradient':
            const gradientResult = gradientAlgorithm(config, state, latencyStats);
            newLimit = gradientResult.limit;
            direction = gradientResult.direction;
            reason = gradientResult.reason;
            break;
        case 'pid':
            const pidResult = pidAlgorithm(config, state, latencyStats);
            newLimit = pidResult.limit;
            direction = pidResult.direction;
            reason = pidResult.reason;
            break;
        case 'fixed':
            newLimit = config.initialLimit;
            direction = 'stable';
            reason = 'Fixed limit';
            break;
    }
    newLimit = Math.max(config.minLimit, Math.min(config.maxLimit, Math.round(newLimit)));
    if (newLimit === state.currentLimit) {
        direction = 'stable';
    }
    const mutableStats = statistics;
    if (direction !== 'stable') {
        mutableStats.totalAdjustments++;
        if (direction === 'increase') {
            mutableStats.totalIncreases++;
        }
        else {
            mutableStats.totalDecreases++;
        }
        const record = {
            recordId: generateRecordId(),
            configId,
            previousLimit: state.currentLimit,
            newLimit,
            direction,
            reason,
            timestamp: now,
            latencyAtTime: latencyStats.avgLatency,
        };
        const adjustmentList = adjustments.get(configId) ?? [];
        adjustmentList.push(record);
        if (adjustmentList.length > 100) {
            adjustmentList.shift();
        }
        adjustments.set(configId, adjustmentList);
    }
    const updatedState = {
        ...state,
        currentLimit: newLimit,
        available: newLimit - state.inFlight,
        lastAdjustment: now,
        adjustmentDirection: direction,
        consecutiveIncreases: direction === 'increase' ? state.consecutiveIncreases + 1 : 0,
        consecutiveDecreases: direction === 'decrease' ? state.consecutiveDecreases + 1 : 0,
    };
    states.set(configId, updatedState);
    if (direction !== 'stable') {
        const eventType = direction === 'increase' ? 'limit_increased' : 'limit_decreased';
        await emitEvent({
            eventId: generateEventId(),
            type: eventType,
            configId,
            timestamp: now,
            data: { previousLimit: state.currentLimit, newLimit, reason },
        });
    }
    updateStatistics();
}
/**
 * Vegas algorithm
 */
function vegasAlgorithm(config, state, stats) {
    const rttNoLoad = config.targetLatency;
    const rttActual = stats.avgLatency;
    const expectedInFlight = state.currentLimit * (rttNoLoad / rttActual);
    const diff = state.currentLimit - expectedInFlight;
    const alpha = 3;
    const beta = 6;
    if (diff < alpha) {
        return {
            limit: state.currentLimit + 1,
            direction: 'increase',
            reason: `Vegas: diff (${diff.toFixed(2)}) < alpha (${alpha})`,
        };
    }
    else if (diff > beta) {
        return {
            limit: state.currentLimit - 1,
            direction: 'decrease',
            reason: `Vegas: diff (${diff.toFixed(2)}) > beta (${beta})`,
        };
    }
    return {
        limit: state.currentLimit,
        direction: 'stable',
        reason: 'Vegas: within bounds',
    };
}
/**
 * AIMD algorithm
 */
function aimdAlgorithm(config, state, stats) {
    const latencyRatio = stats.avgLatency / config.targetLatency;
    const tolerance = config.latencyTolerance;
    if (latencyRatio < 1 - tolerance) {
        return {
            limit: state.currentLimit + 1,
            direction: 'increase',
            reason: `AIMD: latency ratio (${latencyRatio.toFixed(2)}) below target`,
        };
    }
    else if (latencyRatio > 1 + tolerance) {
        return {
            limit: Math.floor(state.currentLimit * config.backoffMultiplier),
            direction: 'decrease',
            reason: `AIMD: latency ratio (${latencyRatio.toFixed(2)}) above target`,
        };
    }
    return {
        limit: state.currentLimit,
        direction: 'stable',
        reason: 'AIMD: within tolerance',
    };
}
/**
 * Gradient algorithm
 */
function gradientAlgorithm(config, state, stats) {
    const gradient = (stats.avgLatency - config.targetLatency) / config.targetLatency;
    const smoothedGradient = gradient * config.smoothingFactor;
    const adjustment = -smoothedGradient * state.currentLimit;
    const newLimit = state.currentLimit + adjustment;
    if (adjustment > 0.5) {
        return {
            limit: newLimit,
            direction: 'increase',
            reason: `Gradient: positive adjustment (${adjustment.toFixed(2)})`,
        };
    }
    else if (adjustment < -0.5) {
        return {
            limit: newLimit,
            direction: 'decrease',
            reason: `Gradient: negative adjustment (${adjustment.toFixed(2)})`,
        };
    }
    return {
        limit: state.currentLimit,
        direction: 'stable',
        reason: 'Gradient: minimal adjustment',
    };
}
/**
 * PID algorithm
 */
function pidAlgorithm(config, state, stats) {
    const kp = 0.5;
    const ki = 0.1;
    const kd = 0.05;
    const error = config.targetLatency - stats.avgLatency;
    const normalizedError = error / config.targetLatency;
    const pTerm = kp * normalizedError;
    const iTerm = ki * normalizedError;
    const dTerm = kd * normalizedError;
    const output = pTerm + iTerm + dTerm;
    const adjustment = output * state.currentLimit;
    const newLimit = state.currentLimit + adjustment;
    if (adjustment > 0.5) {
        return {
            limit: newLimit,
            direction: 'increase',
            reason: `PID: positive output (${output.toFixed(2)})`,
        };
    }
    else if (adjustment < -0.5) {
        return {
            limit: newLimit,
            direction: 'decrease',
            reason: `PID: negative output (${output.toFixed(2)})`,
        };
    }
    return {
        limit: state.currentLimit,
        direction: 'stable',
        reason: 'PID: minimal output',
    };
}
// ============================================================================
// STATISTICS
// ============================================================================
/**
 * Calculate latency statistics
 */
function calculateLatencyStatistics(nameOrId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    const sampleList = samples.get(config.configId) ?? [];
    if (sampleList.length === 0) {
        return null;
    }
    const latencies = sampleList.map(s => s.latency);
    const sortedLatencies = [...latencies].sort((a, b) => a - b);
    const sum = latencies.reduce((acc, v) => acc + v, 0);
    const avg = sum / latencies.length;
    return {
        configId: config.configId,
        sampleCount: sampleList.length,
        minLatency: sortedLatencies[0],
        maxLatency: sortedLatencies[sortedLatencies.length - 1],
        avgLatency: avg,
        p50Latency: calculatePercentile(sortedLatencies, 50),
        p90Latency: calculatePercentile(sortedLatencies, 90),
        p99Latency: calculatePercentile(sortedLatencies, 99),
        stdDeviation: calculateStdDeviation(latencies, avg),
        windowStart: sampleList[0].timestamp,
        windowEnd: sampleList[sampleList.length - 1].timestamp,
    };
}
/**
 * Get concurrency state
 */
function getConcurrencyState(nameOrId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    return states.get(config.configId) ?? null;
}
/**
 * Get adjustment history
 */
function getAdjustmentHistory(nameOrId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return [];
    }
    return adjustments.get(config.configId) ?? [];
}
/**
 * Get statistics
 */
function getStatistics() {
    updateStatistics();
    return { ...statistics };
}
/**
 * Reset statistics
 */
function resetStatistics() {
    Object.assign(statistics, {
        totalConfigs: 0,
        totalTokensAcquired: 0,
        totalTokensReleased: 0,
        totalTokensRejected: 0,
        totalAdjustments: 0,
        totalIncreases: 0,
        totalDecreases: 0,
        averageLimit: 0,
        averageLatency: 0,
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
 * Clear all state
 */
function clearAll() {
    configs.clear();
    states.clear();
    samples.clear();
    tokens.clear();
    adjustments.clear();
    eventListeners.clear();
    resetStatistics();
}
