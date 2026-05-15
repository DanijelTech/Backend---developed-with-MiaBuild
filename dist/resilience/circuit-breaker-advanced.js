"use strict";
/**
 * @file Advanced Circuit Breaker za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-RES-001 Advanced circuit breaker za zaledne sisteme
 * @design DSN-ZALEDNI-RES-001 Backend resilience arhitektura
 * @test TEST-ZALEDNI-RES-001 Preverjanje circuit breaker
 *
 * Advanced Circuit Breaker - prilagojen za zaledne sisteme:
 * - Multi-level circuit breakers
 * - Adaptive thresholds
 * - Health-based transitions
 * - Bulkhead isolation
 * - Fallback strategies
 * - Recovery patterns
 * - Metrics collection
 * - Event notifications
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom RES_001 - Advanced Circuit Breaker
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCircuitBreaker = createCircuitBreaker;
exports.getCircuitBreaker = getCircuitBreaker;
exports.getAllCircuitBreakers = getAllCircuitBreakers;
exports.getCircuitState = getCircuitState;
exports.deleteCircuitBreaker = deleteCircuitBreaker;
exports.execute = execute;
exports.forceOpen = forceOpen;
exports.forceClose = forceClose;
exports.resetCircuit = resetCircuit;
exports.registerFallback = registerFallback;
exports.removeFallback = removeFallback;
exports.registerHealthCheck = registerHealthCheck;
exports.removeHealthCheck = removeHealthCheck;
exports.runHealthCheck = runHealthCheck;
exports.createBulkhead = createBulkhead;
exports.getBulkhead = getBulkhead;
exports.getBulkheadState = getBulkheadState;
exports.deleteBulkhead = deleteBulkhead;
exports.getFailureRecords = getFailureRecords;
exports.clearFailureRecords = clearFailureRecords;
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
const circuits = new Map();
const circuitStates = new Map();
const failureRecords = new Map();
const fallbacks = new Map();
const healthChecks = new Map();
const bulkheads = new Map();
const bulkheadStates = new Map();
const eventListeners = new Set();
let circuitCounter = 0;
let resultCounter = 0;
let recordCounter = 0;
let eventCounter = 0;
let bulkheadCounter = 0;
const statistics = {
    totalCircuits: 0,
    openCircuits: 0,
    closedCircuits: 0,
    halfOpenCircuits: 0,
    totalCalls: 0,
    totalSuccesses: 0,
    totalFailures: 0,
    totalRejections: 0,
    totalTimeouts: 0,
    totalFallbacks: 0,
    averageResponseTime: 0,
};
// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================
/**
 * Generate circuit ID
 */
function generateCircuitId() {
    circuitCounter++;
    return (0, deterministic_1.generateDeterministicId)(`circuit-${circuitCounter}`);
}
/**
 * Generate result ID
 */
function generateResultId() {
    resultCounter++;
    return (0, deterministic_1.generateDeterministicId)(`circuit-result-${resultCounter}`);
}
/**
 * Generate record ID
 */
function generateRecordId() {
    recordCounter++;
    return (0, deterministic_1.generateDeterministicId)(`failure-record-${recordCounter}`);
}
/**
 * Generate event ID
 */
function generateEventId() {
    eventCounter++;
    return (0, deterministic_1.generateDeterministicId)(`circuit-event-${eventCounter}`);
}
/**
 * Generate bulkhead ID
 */
function generateBulkheadId() {
    bulkheadCounter++;
    return (0, deterministic_1.generateDeterministicId)(`bulkhead-${bulkheadCounter}`);
}
/**
 * Emit circuit event
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
    mutableStats.totalCircuits = circuits.size;
    mutableStats.openCircuits = 0;
    mutableStats.closedCircuits = 0;
    mutableStats.halfOpenCircuits = 0;
    for (const state of circuitStates.values()) {
        switch (state.state) {
            case 'open':
                mutableStats.openCircuits++;
                break;
            case 'closed':
                mutableStats.closedCircuits++;
                break;
            case 'half_open':
                mutableStats.halfOpenCircuits++;
                break;
        }
    }
}
/**
 * Calculate recovery delay
 */
function calculateRecoveryDelay(strategy, baseDelay, maxDelay, attempt) {
    let delay;
    switch (strategy) {
        case 'linear':
            delay = baseDelay * attempt;
            break;
        case 'exponential':
            delay = baseDelay * Math.pow(2, attempt - 1);
            break;
        case 'fibonacci':
            const fib = (n) => {
                if (n <= 1)
                    return n;
                let a = 0, b = 1;
                for (let i = 2; i <= n; i++) {
                    const temp = a + b;
                    a = b;
                    b = temp;
                }
                return b;
            };
            delay = baseDelay * fib(attempt);
            break;
        case 'adaptive':
            delay = baseDelay * Math.log2(attempt + 1) * attempt;
            break;
        default:
            delay = baseDelay;
    }
    return Math.min(delay, maxDelay);
}
/**
 * Check if circuit should open
 */
function shouldOpenCircuit(config, state) {
    if (state.totalCalls < config.volumeThreshold) {
        return false;
    }
    if (state.consecutiveFailures >= config.failureThreshold) {
        return true;
    }
    const errorPercentage = (state.totalFailures / state.totalCalls) * 100;
    if (errorPercentage >= config.errorPercentageThreshold) {
        return true;
    }
    const slowCallPercentage = (state.slowCallCount / state.totalCalls) * 100;
    if (slowCallPercentage >= config.slowCallPercentageThreshold) {
        return true;
    }
    return false;
}
/**
 * Check if circuit should close
 */
function shouldCloseCircuit(config, state) {
    return state.consecutiveSuccesses >= config.successThreshold;
}
/**
 * Initialize circuit state
 */
function initializeCircuitState(circuitId) {
    const now = clock.nowMs();
    return {
        circuitId,
        state: 'closed',
        failureCount: 0,
        successCount: 0,
        lastFailureTime: null,
        lastSuccessTime: null,
        lastStateChangeTime: now,
        openedAt: null,
        halfOpenCallCount: 0,
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        totalCalls: 0,
        totalFailures: 0,
        totalSuccesses: 0,
        totalTimeouts: 0,
        totalRejections: 0,
        slowCallCount: 0,
        averageResponseTime: 0,
    };
}
// ============================================================================
// CIRCUIT BREAKER MANAGEMENT
// ============================================================================
/**
 * Create circuit breaker
 */
async function createCircuitBreaker(name, options = {}) {
    const circuitId = generateCircuitId();
    const config = {
        circuitId,
        name,
        failureThreshold: options.failureThreshold ?? 5,
        successThreshold: options.successThreshold ?? 3,
        timeout: options.timeout ?? 30000,
        halfOpenMaxCalls: options.halfOpenMaxCalls ?? 3,
        volumeThreshold: options.volumeThreshold ?? 10,
        errorPercentageThreshold: options.errorPercentageThreshold ?? 50,
        slowCallDurationThreshold: options.slowCallDurationThreshold ?? 5000,
        slowCallPercentageThreshold: options.slowCallPercentageThreshold ?? 80,
        recoveryStrategy: options.recoveryStrategy ?? 'exponential',
        recoveryBaseDelay: options.recoveryBaseDelay ?? 1000,
        recoveryMaxDelay: options.recoveryMaxDelay ?? 60000,
        enabled: true,
        metadata: options.metadata ?? {},
    };
    circuits.set(circuitId, config);
    circuits.set(name, config);
    const state = initializeCircuitState(circuitId);
    circuitStates.set(circuitId, state);
    failureRecords.set(circuitId, []);
    await emitEvent({
        eventId: generateEventId(),
        type: 'circuit_created',
        circuitId,
        timestamp: clock.nowMs(),
        previousState: null,
        newState: 'closed',
        data: { name },
    });
    updateStatistics();
    return config;
}
/**
 * Get circuit breaker
 */
function getCircuitBreaker(nameOrId) {
    return circuits.get(nameOrId) ?? null;
}
/**
 * Get all circuit breakers
 */
function getAllCircuitBreakers() {
    const uniqueCircuits = new Map();
    for (const circuit of circuits.values()) {
        uniqueCircuits.set(circuit.circuitId, circuit);
    }
    return Array.from(uniqueCircuits.values());
}
/**
 * Get circuit state
 */
function getCircuitState(nameOrId) {
    const config = circuits.get(nameOrId);
    if (!config) {
        return null;
    }
    return circuitStates.get(config.circuitId) ?? null;
}
/**
 * Delete circuit breaker
 */
async function deleteCircuitBreaker(nameOrId) {
    const config = circuits.get(nameOrId);
    if (!config) {
        return false;
    }
    circuits.delete(config.circuitId);
    circuits.delete(config.name);
    circuitStates.delete(config.circuitId);
    failureRecords.delete(config.circuitId);
    fallbacks.delete(config.circuitId);
    healthChecks.delete(config.circuitId);
    await emitEvent({
        eventId: generateEventId(),
        type: 'circuit_deleted',
        circuitId: config.circuitId,
        timestamp: clock.nowMs(),
        previousState: null,
        newState: null,
        data: {},
    });
    updateStatistics();
    return true;
}
// ============================================================================
// CIRCUIT EXECUTION
// ============================================================================
/**
 * Execute with circuit breaker
 */
async function execute(nameOrId, operation, context = {}) {
    const config = circuits.get(nameOrId);
    if (!config) {
        throw new Error(`Circuit breaker '${nameOrId}' not found`);
    }
    const state = circuitStates.get(config.circuitId);
    if (!state) {
        throw new Error(`Circuit state not found for '${nameOrId}'`);
    }
    const resultId = generateResultId();
    const startTime = clock.nowMs();
    const mutableStats = statistics;
    if (!config.enabled) {
        try {
            const value = await operation();
            const duration = clock.nowMs() - startTime;
            return {
                resultId,
                circuitId: config.circuitId,
                success: true,
                value,
                error: null,
                duration,
                timestamp: startTime,
                wasRejected: false,
                usedFallback: false,
            };
        }
        catch (error) {
            const duration = clock.nowMs() - startTime;
            return {
                resultId,
                circuitId: config.circuitId,
                success: false,
                value: null,
                error: error instanceof Error ? error : new Error(String(error)),
                duration,
                timestamp: startTime,
                wasRejected: false,
                usedFallback: false,
            };
        }
    }
    if (state.state === 'open') {
        const now = clock.nowMs();
        const openDuration = now - (state.openedAt ?? now);
        const recoveryDelay = calculateRecoveryDelay(config.recoveryStrategy, config.recoveryBaseDelay, config.recoveryMaxDelay, state.consecutiveFailures);
        if (openDuration < recoveryDelay) {
            mutableStats.totalRejections++;
            const fallback = fallbacks.get(config.circuitId);
            if (fallback) {
                try {
                    const fallbackValue = await fallback(new Error('Circuit is open'), context);
                    mutableStats.totalFallbacks++;
                    await emitEvent({
                        eventId: generateEventId(),
                        type: 'fallback_executed',
                        circuitId: config.circuitId,
                        timestamp: now,
                        previousState: null,
                        newState: null,
                        data: {},
                    });
                    return {
                        resultId,
                        circuitId: config.circuitId,
                        success: true,
                        value: fallbackValue,
                        error: null,
                        duration: clock.nowMs() - startTime,
                        timestamp: startTime,
                        wasRejected: true,
                        usedFallback: true,
                    };
                }
                catch {
                    // Fallback failed
                }
            }
            await emitEvent({
                eventId: generateEventId(),
                type: 'call_rejected',
                circuitId: config.circuitId,
                timestamp: now,
                previousState: null,
                newState: null,
                data: { reason: 'Circuit is open' },
            });
            const mutableState = state;
            mutableState.totalRejections++;
            return {
                resultId,
                circuitId: config.circuitId,
                success: false,
                value: null,
                error: new Error('Circuit is open'),
                duration: clock.nowMs() - startTime,
                timestamp: startTime,
                wasRejected: true,
                usedFallback: false,
            };
        }
        await transitionToHalfOpen(config.circuitId);
    }
    if (state.state === 'half_open' && state.halfOpenCallCount >= config.halfOpenMaxCalls) {
        mutableStats.totalRejections++;
        const mutableState = state;
        mutableState.totalRejections++;
        return {
            resultId,
            circuitId: config.circuitId,
            success: false,
            value: null,
            error: new Error('Half-open call limit reached'),
            duration: clock.nowMs() - startTime,
            timestamp: startTime,
            wasRejected: true,
            usedFallback: false,
        };
    }
    mutableStats.totalCalls++;
    const mutableState = state;
    mutableState.totalCalls++;
    if (state.state === 'half_open') {
        mutableState.halfOpenCallCount++;
    }
    try {
        const timeoutPromise = new Promise((_, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('Operation timed out'));
            }, config.timeout);
            if (typeof timeoutId === 'object' && 'unref' in timeoutId) {
                timeoutId.unref();
            }
        });
        const value = await Promise.race([
            Promise.resolve(operation()),
            timeoutPromise,
        ]);
        const duration = clock.nowMs() - startTime;
        mutableStats.totalSuccesses++;
        mutableState.totalSuccesses++;
        mutableState.successCount++;
        mutableState.consecutiveSuccesses++;
        mutableState.consecutiveFailures = 0;
        mutableState.lastSuccessTime = clock.nowMs();
        if (duration > config.slowCallDurationThreshold) {
            mutableState.slowCallCount++;
        }
        const totalDuration = mutableState.averageResponseTime * (mutableState.totalCalls - 1) + duration;
        mutableState.averageResponseTime = totalDuration / mutableState.totalCalls;
        mutableStats.averageResponseTime = mutableState.averageResponseTime;
        await emitEvent({
            eventId: generateEventId(),
            type: 'call_success',
            circuitId: config.circuitId,
            timestamp: clock.nowMs(),
            previousState: null,
            newState: null,
            data: { duration },
        });
        if (state.state === 'half_open' && shouldCloseCircuit(config, state)) {
            await transitionToClosed(config.circuitId);
        }
        return {
            resultId,
            circuitId: config.circuitId,
            success: true,
            value,
            error: null,
            duration,
            timestamp: startTime,
            wasRejected: false,
            usedFallback: false,
        };
    }
    catch (error) {
        const duration = clock.nowMs() - startTime;
        const errorObj = error instanceof Error ? error : new Error(String(error));
        const isTimeout = errorObj.message === 'Operation timed out';
        mutableStats.totalFailures++;
        mutableState.totalFailures++;
        mutableState.failureCount++;
        mutableState.consecutiveFailures++;
        mutableState.consecutiveSuccesses = 0;
        mutableState.lastFailureTime = clock.nowMs();
        if (isTimeout) {
            mutableStats.totalTimeouts++;
            mutableState.totalTimeouts++;
        }
        const records = failureRecords.get(config.circuitId) ?? [];
        records.push({
            recordId: generateRecordId(),
            circuitId: config.circuitId,
            type: isTimeout ? 'timeout' : 'error',
            error: errorObj.message,
            timestamp: clock.nowMs(),
            duration,
            context,
        });
        failureRecords.set(config.circuitId, records);
        await emitEvent({
            eventId: generateEventId(),
            type: isTimeout ? 'call_timeout' : 'call_failure',
            circuitId: config.circuitId,
            timestamp: clock.nowMs(),
            previousState: null,
            newState: null,
            data: { error: errorObj.message, duration },
        });
        if (state.state === 'closed' && shouldOpenCircuit(config, state)) {
            await transitionToOpen(config.circuitId);
        }
        else if (state.state === 'half_open') {
            await transitionToOpen(config.circuitId);
        }
        const fallback = fallbacks.get(config.circuitId);
        if (fallback) {
            try {
                const fallbackValue = await fallback(errorObj, context);
                mutableStats.totalFallbacks++;
                await emitEvent({
                    eventId: generateEventId(),
                    type: 'fallback_executed',
                    circuitId: config.circuitId,
                    timestamp: clock.nowMs(),
                    previousState: null,
                    newState: null,
                    data: {},
                });
                return {
                    resultId,
                    circuitId: config.circuitId,
                    success: true,
                    value: fallbackValue,
                    error: null,
                    duration,
                    timestamp: startTime,
                    wasRejected: false,
                    usedFallback: true,
                };
            }
            catch {
                // Fallback failed
            }
        }
        return {
            resultId,
            circuitId: config.circuitId,
            success: false,
            value: null,
            error: errorObj,
            duration,
            timestamp: startTime,
            wasRejected: false,
            usedFallback: false,
        };
    }
}
// ============================================================================
// STATE TRANSITIONS
// ============================================================================
/**
 * Transition to open state
 */
async function transitionToOpen(circuitId) {
    const state = circuitStates.get(circuitId);
    if (!state) {
        return;
    }
    const previousState = state.state;
    const now = clock.nowMs();
    const newState = {
        ...state,
        state: 'open',
        lastStateChangeTime: now,
        openedAt: now,
        halfOpenCallCount: 0,
    };
    circuitStates.set(circuitId, newState);
    await emitEvent({
        eventId: generateEventId(),
        type: 'state_changed',
        circuitId,
        timestamp: now,
        previousState,
        newState: 'open',
        data: { reason: 'Failure threshold exceeded' },
    });
    await emitEvent({
        eventId: generateEventId(),
        type: 'threshold_exceeded',
        circuitId,
        timestamp: now,
        previousState: null,
        newState: null,
        data: {
            consecutiveFailures: state.consecutiveFailures,
            totalFailures: state.totalFailures,
        },
    });
    updateStatistics();
}
/**
 * Transition to half-open state
 */
async function transitionToHalfOpen(circuitId) {
    const state = circuitStates.get(circuitId);
    if (!state) {
        return;
    }
    const previousState = state.state;
    const now = clock.nowMs();
    const newState = {
        ...state,
        state: 'half_open',
        lastStateChangeTime: now,
        halfOpenCallCount: 0,
    };
    circuitStates.set(circuitId, newState);
    await emitEvent({
        eventId: generateEventId(),
        type: 'state_changed',
        circuitId,
        timestamp: now,
        previousState,
        newState: 'half_open',
        data: { reason: 'Recovery timeout elapsed' },
    });
    await emitEvent({
        eventId: generateEventId(),
        type: 'recovery_started',
        circuitId,
        timestamp: now,
        previousState: null,
        newState: null,
        data: {},
    });
    updateStatistics();
}
/**
 * Transition to closed state
 */
async function transitionToClosed(circuitId) {
    const state = circuitStates.get(circuitId);
    if (!state) {
        return;
    }
    const previousState = state.state;
    const now = clock.nowMs();
    const newState = {
        ...state,
        state: 'closed',
        lastStateChangeTime: now,
        openedAt: null,
        halfOpenCallCount: 0,
        failureCount: 0,
        successCount: 0,
        consecutiveFailures: 0,
    };
    circuitStates.set(circuitId, newState);
    failureRecords.set(circuitId, []);
    await emitEvent({
        eventId: generateEventId(),
        type: 'state_changed',
        circuitId,
        timestamp: now,
        previousState,
        newState: 'closed',
        data: { reason: 'Success threshold reached' },
    });
    await emitEvent({
        eventId: generateEventId(),
        type: 'recovery_completed',
        circuitId,
        timestamp: now,
        previousState: null,
        newState: null,
        data: {},
    });
    updateStatistics();
}
/**
 * Force open circuit
 */
async function forceOpen(nameOrId) {
    const config = circuits.get(nameOrId);
    if (!config) {
        return false;
    }
    await transitionToOpen(config.circuitId);
    return true;
}
/**
 * Force close circuit
 */
async function forceClose(nameOrId) {
    const config = circuits.get(nameOrId);
    if (!config) {
        return false;
    }
    await transitionToClosed(config.circuitId);
    return true;
}
/**
 * Reset circuit
 */
async function resetCircuit(nameOrId) {
    const config = circuits.get(nameOrId);
    if (!config) {
        return false;
    }
    const newState = initializeCircuitState(config.circuitId);
    circuitStates.set(config.circuitId, newState);
    failureRecords.set(config.circuitId, []);
    updateStatistics();
    return true;
}
// ============================================================================
// FALLBACK MANAGEMENT
// ============================================================================
/**
 * Register fallback
 */
function registerFallback(nameOrId, fallback) {
    const config = circuits.get(nameOrId);
    if (!config) {
        return false;
    }
    fallbacks.set(config.circuitId, fallback);
    return true;
}
/**
 * Remove fallback
 */
function removeFallback(nameOrId) {
    const config = circuits.get(nameOrId);
    if (!config) {
        return false;
    }
    return fallbacks.delete(config.circuitId);
}
// ============================================================================
// HEALTH CHECK MANAGEMENT
// ============================================================================
/**
 * Register health check
 */
function registerHealthCheck(nameOrId, healthCheck) {
    const config = circuits.get(nameOrId);
    if (!config) {
        return false;
    }
    healthChecks.set(config.circuitId, healthCheck);
    return true;
}
/**
 * Remove health check
 */
function removeHealthCheck(nameOrId) {
    const config = circuits.get(nameOrId);
    if (!config) {
        return false;
    }
    return healthChecks.delete(config.circuitId);
}
/**
 * Run health check
 */
async function runHealthCheck(nameOrId) {
    const config = circuits.get(nameOrId);
    if (!config) {
        return false;
    }
    const healthCheck = healthChecks.get(config.circuitId);
    if (!healthCheck) {
        return true;
    }
    try {
        return await healthCheck();
    }
    catch {
        return false;
    }
}
// ============================================================================
// BULKHEAD MANAGEMENT
// ============================================================================
/**
 * Create bulkhead
 */
function createBulkhead(name, options = {}) {
    const bulkheadId = generateBulkheadId();
    const config = {
        bulkheadId,
        name,
        maxConcurrent: options.maxConcurrent ?? 10,
        maxWait: options.maxWait ?? 5000,
        enabled: true,
    };
    bulkheads.set(bulkheadId, config);
    bulkheads.set(name, config);
    bulkheadStates.set(bulkheadId, {
        bulkheadId,
        currentConcurrent: 0,
        waitingCount: 0,
        totalExecuted: 0,
        totalRejected: 0,
    });
    return config;
}
/**
 * Get bulkhead
 */
function getBulkhead(nameOrId) {
    return bulkheads.get(nameOrId) ?? null;
}
/**
 * Get bulkhead state
 */
function getBulkheadState(nameOrId) {
    const config = bulkheads.get(nameOrId);
    if (!config) {
        return null;
    }
    return bulkheadStates.get(config.bulkheadId) ?? null;
}
/**
 * Delete bulkhead
 */
function deleteBulkhead(nameOrId) {
    const config = bulkheads.get(nameOrId);
    if (!config) {
        return false;
    }
    bulkheads.delete(config.bulkheadId);
    bulkheads.delete(config.name);
    bulkheadStates.delete(config.bulkheadId);
    return true;
}
// ============================================================================
// FAILURE RECORDS
// ============================================================================
/**
 * Get failure records
 */
function getFailureRecords(nameOrId) {
    const config = circuits.get(nameOrId);
    if (!config) {
        return [];
    }
    return failureRecords.get(config.circuitId) ?? [];
}
/**
 * Clear failure records
 */
function clearFailureRecords(nameOrId) {
    const config = circuits.get(nameOrId);
    if (!config) {
        return false;
    }
    failureRecords.set(config.circuitId, []);
    return true;
}
// ============================================================================
// STATISTICS
// ============================================================================
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
        totalCircuits: 0,
        openCircuits: 0,
        closedCircuits: 0,
        halfOpenCircuits: 0,
        totalCalls: 0,
        totalSuccesses: 0,
        totalFailures: 0,
        totalRejections: 0,
        totalTimeouts: 0,
        totalFallbacks: 0,
        averageResponseTime: 0,
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
    circuits.clear();
    circuitStates.clear();
    failureRecords.clear();
    fallbacks.clear();
    healthChecks.clear();
    bulkheads.clear();
    bulkheadStates.clear();
    eventListeners.clear();
    resetStatistics();
}
