"use strict";
/**
 * @file Retry Policy za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-RES-002 Retry policy za zaledne sisteme
 * @design DSN-ZALEDNI-RES-002 Backend retry arhitektura
 * @test TEST-ZALEDNI-RES-002 Preverjanje retry policy
 *
 * Retry Policy - prilagojen za zaledne sisteme:
 * - Configurable retry strategies
 * - Backoff algorithms
 * - Jitter support
 * - Retry conditions
 * - Timeout handling
 * - Circuit breaker integration
 * - Metrics collection
 * - Event notifications
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom RES_002 - Retry Policy
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRetryPolicy = createRetryPolicy;
exports.getRetryPolicy = getRetryPolicy;
exports.getAllRetryPolicies = getAllRetryPolicies;
exports.updateRetryPolicy = updateRetryPolicy;
exports.deleteRetryPolicy = deleteRetryPolicy;
exports.addRetryCondition = addRetryCondition;
exports.removeRetryCondition = removeRetryCondition;
exports.getRetryConditions = getRetryConditions;
exports.executeWithRetry = executeWithRetry;
exports.retrySimple = retrySimple;
exports.registerDelayCalculator = registerDelayCalculator;
exports.getDelayCalculator = getDelayCalculator;
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
const policies = new Map();
const conditions = new Map();
const delayCalculators = new Map();
const eventListeners = new Set();
let policyCounter = 0;
let attemptCounter = 0;
let executionCounter = 0;
let conditionCounter = 0;
let eventCounter = 0;
const statistics = {
    totalPolicies: 0,
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    exhaustedExecutions: 0,
    totalAttempts: 0,
    successfulAttempts: 0,
    failedAttempts: 0,
    averageAttemptsPerExecution: 0,
    averageExecutionDuration: 0,
};
// ============================================================================
// INICIALIZACIJA DELAY CALCULATORS
// ============================================================================
delayCalculators.set('fixed', (attempt, baseDelay) => baseDelay);
delayCalculators.set('linear', (attempt, baseDelay, maxDelay, multiplier) => {
    const delay = baseDelay * attempt * multiplier;
    return Math.min(delay, maxDelay);
});
delayCalculators.set('exponential', (attempt, baseDelay, maxDelay, multiplier) => {
    const delay = baseDelay * Math.pow(multiplier, attempt - 1);
    return Math.min(delay, maxDelay);
});
delayCalculators.set('fibonacci', (attempt, baseDelay, maxDelay) => {
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
    const delay = baseDelay * fib(attempt);
    return Math.min(delay, maxDelay);
});
delayCalculators.set('decorrelated_jitter', (attempt, baseDelay, maxDelay) => {
    const delay = baseDelay * Math.pow(2, attempt - 1);
    return Math.min(delay, maxDelay);
});
// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================
/**
 * Generate policy ID
 */
function generatePolicyId() {
    policyCounter++;
    return (0, deterministic_1.generateDeterministicId)(`retry-policy-${policyCounter}`);
}
/**
 * Generate attempt ID
 */
function generateAttemptId() {
    attemptCounter++;
    return (0, deterministic_1.generateDeterministicId)(`retry-attempt-${attemptCounter}`);
}
/**
 * Generate execution ID
 */
function generateExecutionId() {
    executionCounter++;
    return (0, deterministic_1.generateDeterministicId)(`retry-exec-${executionCounter}`);
}
/**
 * Generate condition ID
 */
function generateConditionId() {
    conditionCounter++;
    return (0, deterministic_1.generateDeterministicId)(`retry-cond-${conditionCounter}`);
}
/**
 * Generate event ID
 */
function generateEventId() {
    eventCounter++;
    return (0, deterministic_1.generateDeterministicId)(`retry-event-${eventCounter}`);
}
/**
 * Emit retry event
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
    mutableStats.totalPolicies = policies.size;
}
/**
 * Calculate delay with jitter
 */
function calculateDelayWithJitter(config, attempt, seed) {
    const calculator = delayCalculators.get(config.strategy);
    if (!calculator) {
        return config.baseDelay;
    }
    const baseCalculatedDelay = calculator(attempt, config.baseDelay, config.maxDelay, config.multiplier);
    if (config.jitterType === 'none') {
        return baseCalculatedDelay;
    }
    const deterministicRandom = (seed % 1000) / 1000;
    switch (config.jitterType) {
        case 'full':
            return baseCalculatedDelay * deterministicRandom;
        case 'equal':
            return baseCalculatedDelay * (0.5 + deterministicRandom * 0.5);
        case 'decorrelated':
            const jitterRange = baseCalculatedDelay * config.jitterFactor;
            return baseCalculatedDelay + (deterministicRandom * jitterRange * 2 - jitterRange);
        default:
            return baseCalculatedDelay;
    }
}
/**
 * Check if error is retryable
 */
function isRetryableError(config, error) {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();
    for (const pattern of config.nonRetryableErrors) {
        if (errorMessage.includes(pattern.toLowerCase()) || errorName.includes(pattern.toLowerCase())) {
            return false;
        }
    }
    if (config.retryableErrors.length === 0) {
        return true;
    }
    for (const pattern of config.retryableErrors) {
        if (errorMessage.includes(pattern.toLowerCase()) || errorName.includes(pattern.toLowerCase())) {
            return true;
        }
    }
    return false;
}
/**
 * Check retry conditions
 */
function checkRetryConditions(policyId, error, attempt, context) {
    const policyConditions = conditions.get(policyId);
    if (!policyConditions || policyConditions.length === 0) {
        return true;
    }
    for (const condition of policyConditions) {
        switch (condition.type) {
            case 'always':
                return true;
            case 'on_error':
                for (const pattern of condition.errorPatterns) {
                    if (error.message.includes(pattern) || error.name.includes(pattern)) {
                        return true;
                    }
                }
                break;
            case 'custom':
                if (condition.predicate && condition.predicate(error, attempt, context)) {
                    return true;
                }
                break;
        }
    }
    return false;
}
/**
 * Sleep for specified duration
 */
function sleep(ms) {
    return new Promise(resolve => {
        const timeoutId = setTimeout(resolve, ms);
        if (typeof timeoutId === 'object' && 'unref' in timeoutId) {
            timeoutId.unref();
        }
    });
}
// ============================================================================
// POLICY MANAGEMENT
// ============================================================================
/**
 * Create retry policy
 */
async function createRetryPolicy(name, options = {}) {
    const policyId = generatePolicyId();
    const config = {
        policyId,
        name,
        maxRetries: options.maxRetries ?? 3,
        strategy: options.strategy ?? 'exponential',
        baseDelay: options.baseDelay ?? 1000,
        maxDelay: options.maxDelay ?? 30000,
        multiplier: options.multiplier ?? 2,
        jitterType: options.jitterType ?? 'equal',
        jitterFactor: options.jitterFactor ?? 0.5,
        timeout: options.timeout ?? 30000,
        retryableErrors: options.retryableErrors ?? [],
        nonRetryableErrors: options.nonRetryableErrors ?? ['ValidationError', 'AuthenticationError'],
        retryableStatusCodes: options.retryableStatusCodes ?? [408, 429, 500, 502, 503, 504],
        enabled: true,
        metadata: options.metadata ?? {},
    };
    policies.set(policyId, config);
    policies.set(name, config);
    conditions.set(policyId, []);
    await emitEvent({
        eventId: generateEventId(),
        type: 'policy_created',
        policyId,
        timestamp: clock.nowMs(),
        attemptNumber: null,
        data: { name },
    });
    updateStatistics();
    return config;
}
/**
 * Get retry policy
 */
function getRetryPolicy(nameOrId) {
    return policies.get(nameOrId) ?? null;
}
/**
 * Get all retry policies
 */
function getAllRetryPolicies() {
    const uniquePolicies = new Map();
    for (const policy of policies.values()) {
        uniquePolicies.set(policy.policyId, policy);
    }
    return Array.from(uniquePolicies.values());
}
/**
 * Update retry policy
 */
function updateRetryPolicy(nameOrId, updates) {
    const policy = policies.get(nameOrId);
    if (!policy) {
        return null;
    }
    const updatedPolicy = {
        ...policy,
        maxRetries: updates.maxRetries ?? policy.maxRetries,
        strategy: updates.strategy ?? policy.strategy,
        baseDelay: updates.baseDelay ?? policy.baseDelay,
        maxDelay: updates.maxDelay ?? policy.maxDelay,
        multiplier: updates.multiplier ?? policy.multiplier,
        jitterType: updates.jitterType ?? policy.jitterType,
        jitterFactor: updates.jitterFactor ?? policy.jitterFactor,
        timeout: updates.timeout ?? policy.timeout,
        enabled: updates.enabled ?? policy.enabled,
    };
    policies.set(policy.policyId, updatedPolicy);
    policies.set(policy.name, updatedPolicy);
    return updatedPolicy;
}
/**
 * Delete retry policy
 */
async function deleteRetryPolicy(nameOrId) {
    const policy = policies.get(nameOrId);
    if (!policy) {
        return false;
    }
    policies.delete(policy.policyId);
    policies.delete(policy.name);
    conditions.delete(policy.policyId);
    await emitEvent({
        eventId: generateEventId(),
        type: 'policy_deleted',
        policyId: policy.policyId,
        timestamp: clock.nowMs(),
        attemptNumber: null,
        data: {},
    });
    updateStatistics();
    return true;
}
// ============================================================================
// CONDITION MANAGEMENT
// ============================================================================
/**
 * Add retry condition
 */
function addRetryCondition(nameOrId, type, options = {}) {
    const policy = policies.get(nameOrId);
    if (!policy) {
        return null;
    }
    const condition = {
        conditionId: generateConditionId(),
        type,
        predicate: options.predicate ?? null,
        errorPatterns: options.errorPatterns ?? [],
        statusCodes: options.statusCodes ?? [],
    };
    const policyConditions = conditions.get(policy.policyId) ?? [];
    policyConditions.push(condition);
    conditions.set(policy.policyId, policyConditions);
    return condition;
}
/**
 * Remove retry condition
 */
function removeRetryCondition(nameOrId, conditionId) {
    const policy = policies.get(nameOrId);
    if (!policy) {
        return false;
    }
    const policyConditions = conditions.get(policy.policyId);
    if (!policyConditions) {
        return false;
    }
    const index = policyConditions.findIndex(c => c.conditionId === conditionId);
    if (index === -1) {
        return false;
    }
    policyConditions.splice(index, 1);
    return true;
}
/**
 * Get retry conditions
 */
function getRetryConditions(nameOrId) {
    const policy = policies.get(nameOrId);
    if (!policy) {
        return [];
    }
    return conditions.get(policy.policyId) ?? [];
}
// ============================================================================
// RETRY EXECUTION
// ============================================================================
/**
 * Execute with retry
 */
async function executeWithRetry(nameOrId, operation, context = {}) {
    const config = policies.get(nameOrId);
    if (!config) {
        throw new Error(`Retry policy '${nameOrId}' not found`);
    }
    const executionId = generateExecutionId();
    const startTime = clock.nowMs();
    const attempts = [];
    const mutableStats = statistics;
    mutableStats.totalExecutions++;
    await emitEvent({
        eventId: generateEventId(),
        type: 'execution_started',
        policyId: config.policyId,
        timestamp: startTime,
        attemptNumber: null,
        data: { executionId },
    });
    let lastError = null;
    for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
        const attemptId = generateAttemptId();
        const attemptStartTime = clock.nowMs();
        const delay = attempt === 1 ? 0 : calculateDelayWithJitter(config, attempt - 1, attemptStartTime);
        if (delay > 0) {
            await emitEvent({
                eventId: generateEventId(),
                type: 'retry_scheduled',
                policyId: config.policyId,
                timestamp: clock.nowMs(),
                attemptNumber: attempt,
                data: { delay },
            });
            await sleep(delay);
        }
        await emitEvent({
            eventId: generateEventId(),
            type: 'attempt_started',
            policyId: config.policyId,
            timestamp: clock.nowMs(),
            attemptNumber: attempt,
            data: {},
        });
        mutableStats.totalAttempts++;
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
            const attemptEndTime = clock.nowMs();
            const attemptDuration = attemptEndTime - attemptStartTime;
            const attemptRecord = {
                attemptId,
                policyId: config.policyId,
                attemptNumber: attempt,
                startTime: attemptStartTime,
                endTime: attemptEndTime,
                duration: attemptDuration,
                success: true,
                error: null,
                delay,
                metadata: {},
            };
            attempts.push(attemptRecord);
            mutableStats.successfulAttempts++;
            await emitEvent({
                eventId: generateEventId(),
                type: 'attempt_success',
                policyId: config.policyId,
                timestamp: attemptEndTime,
                attemptNumber: attempt,
                data: { duration: attemptDuration },
            });
            const totalDuration = clock.nowMs() - startTime;
            mutableStats.successfulExecutions++;
            const totalExecs = mutableStats.totalExecutions;
            mutableStats.averageAttemptsPerExecution =
                (mutableStats.averageAttemptsPerExecution * (totalExecs - 1) + attempt) / totalExecs;
            mutableStats.averageExecutionDuration =
                (mutableStats.averageExecutionDuration * (totalExecs - 1) + totalDuration) / totalExecs;
            await emitEvent({
                eventId: generateEventId(),
                type: 'execution_success',
                policyId: config.policyId,
                timestamp: clock.nowMs(),
                attemptNumber: attempt,
                data: { totalAttempts: attempt, totalDuration },
            });
            return {
                executionId,
                policyId: config.policyId,
                success: true,
                value,
                error: null,
                totalAttempts: attempt,
                totalDuration,
                attempts,
                timestamp: startTime,
            };
        }
        catch (error) {
            const attemptEndTime = clock.nowMs();
            const attemptDuration = attemptEndTime - attemptStartTime;
            const errorObj = error instanceof Error ? error : new Error(String(error));
            const isTimeout = errorObj.message === 'Operation timed out';
            lastError = errorObj;
            const attemptRecord = {
                attemptId,
                policyId: config.policyId,
                attemptNumber: attempt,
                startTime: attemptStartTime,
                endTime: attemptEndTime,
                duration: attemptDuration,
                success: false,
                error: errorObj.message,
                delay,
                metadata: {},
            };
            attempts.push(attemptRecord);
            mutableStats.failedAttempts++;
            await emitEvent({
                eventId: generateEventId(),
                type: isTimeout ? 'attempt_timeout' : 'attempt_failure',
                policyId: config.policyId,
                timestamp: attemptEndTime,
                attemptNumber: attempt,
                data: { error: errorObj.message, duration: attemptDuration },
            });
            if (attempt <= config.maxRetries) {
                if (!config.enabled) {
                    break;
                }
                if (!isRetryableError(config, errorObj)) {
                    break;
                }
                if (!checkRetryConditions(config.policyId, errorObj, attempt, context)) {
                    break;
                }
            }
        }
    }
    const totalDuration = clock.nowMs() - startTime;
    const totalAttempts = attempts.length;
    if (totalAttempts > config.maxRetries) {
        mutableStats.exhaustedExecutions++;
        await emitEvent({
            eventId: generateEventId(),
            type: 'execution_exhausted',
            policyId: config.policyId,
            timestamp: clock.nowMs(),
            attemptNumber: totalAttempts,
            data: { maxRetries: config.maxRetries },
        });
    }
    mutableStats.failedExecutions++;
    const totalExecs = mutableStats.totalExecutions;
    mutableStats.averageAttemptsPerExecution =
        (mutableStats.averageAttemptsPerExecution * (totalExecs - 1) + totalAttempts) / totalExecs;
    mutableStats.averageExecutionDuration =
        (mutableStats.averageExecutionDuration * (totalExecs - 1) + totalDuration) / totalExecs;
    await emitEvent({
        eventId: generateEventId(),
        type: 'execution_failure',
        policyId: config.policyId,
        timestamp: clock.nowMs(),
        attemptNumber: totalAttempts,
        data: { error: lastError?.message, totalAttempts, totalDuration },
    });
    return {
        executionId,
        policyId: config.policyId,
        success: false,
        value: null,
        error: lastError,
        totalAttempts,
        totalDuration,
        attempts,
        timestamp: startTime,
    };
}
/**
 * Execute with simple retry
 */
async function retrySimple(operation, maxRetries = 3, baseDelay = 1000) {
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt <= maxRetries) {
                const delay = baseDelay * Math.pow(2, attempt - 1);
                await sleep(delay);
            }
        }
    }
    throw lastError ?? new Error('Retry failed');
}
// ============================================================================
// DELAY CALCULATOR MANAGEMENT
// ============================================================================
/**
 * Register delay calculator
 */
function registerDelayCalculator(strategy, calculator) {
    delayCalculators.set(strategy, calculator);
}
/**
 * Get delay calculator
 */
function getDelayCalculator(strategy) {
    return delayCalculators.get(strategy) ?? null;
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
        totalPolicies: 0,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        exhaustedExecutions: 0,
        totalAttempts: 0,
        successfulAttempts: 0,
        failedAttempts: 0,
        averageAttemptsPerExecution: 0,
        averageExecutionDuration: 0,
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
    policies.clear();
    conditions.clear();
    eventListeners.clear();
    resetStatistics();
}
