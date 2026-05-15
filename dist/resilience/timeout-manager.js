"use strict";
/**
 * @file Timeout Manager za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-RES-003 Timeout management za zaledne sisteme
 * @design DSN-ZALEDNI-RES-003 Backend timeout arhitektura
 * @test TEST-ZALEDNI-RES-003 Preverjanje timeout management
 *
 * Timeout Manager - prilagojen za zaledne sisteme:
 * - Configurable timeouts
 * - Cascading timeouts
 * - Deadline propagation
 * - Timeout budgets
 * - Cancellation support
 * - Metrics collection
 * - Event notifications
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom RES_003 - Timeout Manager
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTimeoutConfig = createTimeoutConfig;
exports.getTimeoutConfig = getTimeoutConfig;
exports.getAllTimeoutConfigs = getAllTimeoutConfigs;
exports.updateTimeoutConfig = updateTimeoutConfig;
exports.deleteTimeoutConfig = deleteTimeoutConfig;
exports.startTimeout = startTimeout;
exports.getTimeoutInstance = getTimeoutInstance;
exports.getAllTimeoutInstances = getAllTimeoutInstances;
exports.cancelTimeout = cancelTimeout;
exports.completeTimeout = completeTimeout;
exports.isTimeoutExpired = isTimeoutExpired;
exports.getRemainingTime = getRemainingTime;
exports.createTimeoutBudget = createTimeoutBudget;
exports.getTimeoutBudget = getTimeoutBudget;
exports.allocateFromBudget = allocateFromBudget;
exports.releaseBudgetAllocation = releaseBudgetAllocation;
exports.deleteTimeoutBudget = deleteTimeoutBudget;
exports.createDeadlineContext = createDeadlineContext;
exports.getDeadlineContext = getDeadlineContext;
exports.propagateDeadline = propagateDeadline;
exports.deleteDeadlineContext = deleteDeadlineContext;
exports.createCancellationToken = createCancellationToken;
exports.getCancellationToken = getCancellationToken;
exports.cancelToken = cancelToken;
exports.isTokenCancelled = isTokenCancelled;
exports.deleteCancellationToken = deleteCancellationToken;
exports.executeWithTimeout = executeWithTimeout;
exports.executeWithDeadline = executeWithDeadline;
exports.executeWithBudget = executeWithBudget;
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
const instances = new Map();
const budgets = new Map();
const deadlineContexts = new Map();
const cancellationTokens = new Map();
const eventListeners = new Set();
let configCounter = 0;
let instanceCounter = 0;
let budgetCounter = 0;
let allocationCounter = 0;
let contextCounter = 0;
let tokenCounter = 0;
let eventCounter = 0;
const statistics = {
    totalConfigs: 0,
    activeTimeouts: 0,
    expiredTimeouts: 0,
    cancelledTimeouts: 0,
    completedTimeouts: 0,
    totalBudgets: 0,
    exhaustedBudgets: 0,
    averageTimeoutDuration: 0,
};
// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================
/**
 * Generate config ID
 */
function generateConfigId() {
    configCounter++;
    return (0, deterministic_1.generateDeterministicId)(`timeout-config-${configCounter}`);
}
/**
 * Generate instance ID
 */
function generateInstanceId() {
    instanceCounter++;
    return (0, deterministic_1.generateDeterministicId)(`timeout-instance-${instanceCounter}`);
}
/**
 * Generate budget ID
 */
function generateBudgetId() {
    budgetCounter++;
    return (0, deterministic_1.generateDeterministicId)(`timeout-budget-${budgetCounter}`);
}
/**
 * Generate allocation ID
 */
function generateAllocationId() {
    allocationCounter++;
    return (0, deterministic_1.generateDeterministicId)(`budget-alloc-${allocationCounter}`);
}
/**
 * Generate context ID
 */
function generateContextId() {
    contextCounter++;
    return (0, deterministic_1.generateDeterministicId)(`deadline-ctx-${contextCounter}`);
}
/**
 * Generate token ID
 */
function generateTokenId() {
    tokenCounter++;
    return (0, deterministic_1.generateDeterministicId)(`cancel-token-${tokenCounter}`);
}
/**
 * Generate event ID
 */
function generateEventId() {
    eventCounter++;
    return (0, deterministic_1.generateDeterministicId)(`timeout-event-${eventCounter}`);
}
/**
 * Emit timeout event
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
    mutableStats.activeTimeouts = 0;
    mutableStats.expiredTimeouts = 0;
    mutableStats.cancelledTimeouts = 0;
    mutableStats.completedTimeouts = 0;
    for (const instance of instances.values()) {
        switch (instance.state) {
            case 'active':
            case 'pending':
                mutableStats.activeTimeouts++;
                break;
            case 'expired':
                mutableStats.expiredTimeouts++;
                break;
            case 'cancelled':
                mutableStats.cancelledTimeouts++;
                break;
            case 'completed':
                mutableStats.completedTimeouts++;
                break;
        }
    }
    mutableStats.totalBudgets = budgets.size;
    mutableStats.exhaustedBudgets = Array.from(budgets.values())
        .filter(b => b.remainingBudget <= 0).length;
}
// ============================================================================
// CONFIG MANAGEMENT
// ============================================================================
/**
 * Create timeout config
 */
async function createTimeoutConfig(name, type, duration, options = {}) {
    const configId = generateConfigId();
    const config = {
        configId,
        name,
        type,
        duration,
        cascadeEnabled: options.cascadeEnabled ?? false,
        cascadeReduction: options.cascadeReduction ?? 0.1,
        minTimeout: options.minTimeout ?? 100,
        maxTimeout: options.maxTimeout ?? 300000,
        enabled: true,
        metadata: options.metadata ?? {},
    };
    configs.set(configId, config);
    configs.set(name, config);
    await emitEvent({
        eventId: generateEventId(),
        type: 'config_created',
        instanceId: null,
        timestamp: clock.nowMs(),
        data: { configId, name, type, duration },
    });
    updateStatistics();
    return config;
}
/**
 * Get timeout config
 */
function getTimeoutConfig(nameOrId) {
    return configs.get(nameOrId) ?? null;
}
/**
 * Get all timeout configs
 */
function getAllTimeoutConfigs() {
    const uniqueConfigs = new Map();
    for (const config of configs.values()) {
        uniqueConfigs.set(config.configId, config);
    }
    return Array.from(uniqueConfigs.values());
}
/**
 * Update timeout config
 */
function updateTimeoutConfig(nameOrId, updates) {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    const updatedConfig = {
        ...config,
        duration: updates.duration ?? config.duration,
        cascadeEnabled: updates.cascadeEnabled ?? config.cascadeEnabled,
        cascadeReduction: updates.cascadeReduction ?? config.cascadeReduction,
        minTimeout: updates.minTimeout ?? config.minTimeout,
        maxTimeout: updates.maxTimeout ?? config.maxTimeout,
        enabled: updates.enabled ?? config.enabled,
    };
    configs.set(config.configId, updatedConfig);
    configs.set(config.name, updatedConfig);
    return updatedConfig;
}
/**
 * Delete timeout config
 */
async function deleteTimeoutConfig(nameOrId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    configs.delete(config.configId);
    configs.delete(config.name);
    await emitEvent({
        eventId: generateEventId(),
        type: 'config_deleted',
        instanceId: null,
        timestamp: clock.nowMs(),
        data: { configId: config.configId },
    });
    updateStatistics();
    return true;
}
// ============================================================================
// TIMEOUT INSTANCE MANAGEMENT
// ============================================================================
/**
 * Start timeout
 */
async function startTimeout(nameOrId, options = {}) {
    const config = configs.get(nameOrId);
    if (!config) {
        throw new Error(`Timeout config '${nameOrId}' not found`);
    }
    const instanceId = generateInstanceId();
    const now = clock.nowMs();
    let duration = options.customDuration ?? config.duration;
    if (options.parentId && config.cascadeEnabled) {
        const parent = instances.get(options.parentId);
        if (parent && parent.state === 'active') {
            const cascadedDuration = parent.remainingTime * (1 - config.cascadeReduction);
            duration = Math.min(duration, cascadedDuration);
        }
    }
    duration = Math.max(config.minTimeout, Math.min(duration, config.maxTimeout));
    const deadline = now + duration;
    const instance = {
        instanceId,
        configId: config.configId,
        startTime: now,
        deadline,
        remainingTime: duration,
        state: 'active',
        parentId: options.parentId ?? null,
        childIds: [],
        metadata: options.metadata ?? {},
    };
    instances.set(instanceId, instance);
    if (options.parentId) {
        const parent = instances.get(options.parentId);
        if (parent) {
            const updatedParent = {
                ...parent,
                childIds: [...parent.childIds, instanceId],
            };
            instances.set(options.parentId, updatedParent);
        }
    }
    await emitEvent({
        eventId: generateEventId(),
        type: 'timeout_started',
        instanceId,
        timestamp: now,
        data: { configId: config.configId, duration, deadline },
    });
    updateStatistics();
    return instance;
}
/**
 * Get timeout instance
 */
function getTimeoutInstance(instanceId) {
    const instance = instances.get(instanceId);
    if (!instance) {
        return null;
    }
    const now = clock.nowMs();
    const remainingTime = Math.max(0, instance.deadline - now);
    if (instance.state === 'active' && remainingTime <= 0) {
        const expiredInstance = {
            ...instance,
            remainingTime: 0,
            state: 'expired',
        };
        instances.set(instanceId, expiredInstance);
        return expiredInstance;
    }
    return {
        ...instance,
        remainingTime,
    };
}
/**
 * Get all timeout instances
 */
function getAllTimeoutInstances() {
    return Array.from(instances.values()).map(instance => {
        const now = clock.nowMs();
        const remainingTime = Math.max(0, instance.deadline - now);
        return {
            ...instance,
            remainingTime,
        };
    });
}
/**
 * Cancel timeout
 */
async function cancelTimeout(instanceId, reason) {
    const instance = instances.get(instanceId);
    if (!instance || instance.state !== 'active') {
        return false;
    }
    const cancelledInstance = {
        ...instance,
        state: 'cancelled',
        remainingTime: 0,
    };
    instances.set(instanceId, cancelledInstance);
    for (const childId of instance.childIds) {
        await cancelTimeout(childId, reason);
    }
    await emitEvent({
        eventId: generateEventId(),
        type: 'timeout_cancelled',
        instanceId,
        timestamp: clock.nowMs(),
        data: { reason: reason ?? 'Cancelled by user' },
    });
    updateStatistics();
    return true;
}
/**
 * Complete timeout
 */
async function completeTimeout(instanceId) {
    const instance = instances.get(instanceId);
    if (!instance || instance.state !== 'active') {
        return false;
    }
    const completedInstance = {
        ...instance,
        state: 'completed',
    };
    instances.set(instanceId, completedInstance);
    await emitEvent({
        eventId: generateEventId(),
        type: 'timeout_completed',
        instanceId,
        timestamp: clock.nowMs(),
        data: {},
    });
    updateStatistics();
    return true;
}
/**
 * Check if timeout expired
 */
function isTimeoutExpired(instanceId) {
    const instance = getTimeoutInstance(instanceId);
    return instance?.state === 'expired';
}
/**
 * Get remaining time
 */
function getRemainingTime(instanceId) {
    const instance = getTimeoutInstance(instanceId);
    return instance?.remainingTime ?? 0;
}
// ============================================================================
// TIMEOUT BUDGET MANAGEMENT
// ============================================================================
/**
 * Create timeout budget
 */
async function createTimeoutBudget(name, totalBudget, expiresInMs) {
    const budgetId = generateBudgetId();
    const now = clock.nowMs();
    const budget = {
        budgetId,
        name,
        totalBudget,
        usedBudget: 0,
        remainingBudget: totalBudget,
        allocations: [],
        createdAt: now,
        expiresAt: expiresInMs ? now + expiresInMs : now + 3600000,
    };
    budgets.set(budgetId, budget);
    budgets.set(name, budget);
    await emitEvent({
        eventId: generateEventId(),
        type: 'budget_created',
        instanceId: null,
        timestamp: now,
        data: { budgetId, name, totalBudget },
    });
    updateStatistics();
    return budget;
}
/**
 * Get timeout budget
 */
function getTimeoutBudget(nameOrId) {
    return budgets.get(nameOrId) ?? null;
}
/**
 * Allocate from budget
 */
function allocateFromBudget(nameOrId, operation, amount) {
    const budget = budgets.get(nameOrId);
    if (!budget || budget.remainingBudget < amount) {
        return null;
    }
    const allocationId = generateAllocationId();
    const now = clock.nowMs();
    const allocation = {
        allocationId,
        budgetId: budget.budgetId,
        operation,
        allocated: amount,
        used: 0,
        startTime: now,
        endTime: null,
    };
    const updatedBudget = {
        ...budget,
        usedBudget: budget.usedBudget + amount,
        remainingBudget: budget.remainingBudget - amount,
        allocations: [...budget.allocations, allocation],
    };
    budgets.set(budget.budgetId, updatedBudget);
    budgets.set(budget.name, updatedBudget);
    return allocation;
}
/**
 * Release budget allocation
 */
function releaseBudgetAllocation(nameOrId, allocationId, actualUsed) {
    const budget = budgets.get(nameOrId);
    if (!budget) {
        return false;
    }
    const allocationIndex = budget.allocations.findIndex(a => a.allocationId === allocationId);
    if (allocationIndex === -1) {
        return false;
    }
    const allocation = budget.allocations[allocationIndex];
    const unused = allocation.allocated - actualUsed;
    const updatedAllocation = {
        ...allocation,
        used: actualUsed,
        endTime: clock.nowMs(),
    };
    const updatedAllocations = [...budget.allocations];
    updatedAllocations[allocationIndex] = updatedAllocation;
    const updatedBudget = {
        ...budget,
        usedBudget: budget.usedBudget - unused,
        remainingBudget: budget.remainingBudget + unused,
        allocations: updatedAllocations,
    };
    budgets.set(budget.budgetId, updatedBudget);
    budgets.set(budget.name, updatedBudget);
    return true;
}
/**
 * Delete timeout budget
 */
function deleteTimeoutBudget(nameOrId) {
    const budget = budgets.get(nameOrId);
    if (!budget) {
        return false;
    }
    budgets.delete(budget.budgetId);
    budgets.delete(budget.name);
    updateStatistics();
    return true;
}
// ============================================================================
// DEADLINE PROPAGATION
// ============================================================================
/**
 * Create deadline context
 */
async function createDeadlineContext(deadline, options = {}) {
    const contextId = generateContextId();
    const now = clock.nowMs();
    const context = {
        contextId,
        deadline,
        remainingTime: Math.max(0, deadline - now),
        propagatedFrom: options.propagatedFrom ?? null,
        propagatedTo: [],
        metadata: options.metadata ?? {},
    };
    deadlineContexts.set(contextId, context);
    if (options.propagatedFrom) {
        const parentContext = deadlineContexts.get(options.propagatedFrom);
        if (parentContext) {
            const updatedParent = {
                ...parentContext,
                propagatedTo: [...parentContext.propagatedTo, contextId],
            };
            deadlineContexts.set(options.propagatedFrom, updatedParent);
        }
        await emitEvent({
            eventId: generateEventId(),
            type: 'deadline_propagated',
            instanceId: null,
            timestamp: now,
            data: { from: options.propagatedFrom, to: contextId, deadline },
        });
    }
    return context;
}
/**
 * Get deadline context
 */
function getDeadlineContext(contextId) {
    const context = deadlineContexts.get(contextId);
    if (!context) {
        return null;
    }
    const now = clock.nowMs();
    return {
        ...context,
        remainingTime: Math.max(0, context.deadline - now),
    };
}
/**
 * Propagate deadline
 */
async function propagateDeadline(parentContextId, reduction = 0) {
    const parentContext = getDeadlineContext(parentContextId);
    if (!parentContext) {
        return null;
    }
    const now = clock.nowMs();
    const newDeadline = parentContext.deadline - reduction;
    if (newDeadline <= now) {
        return null;
    }
    return createDeadlineContext(newDeadline, {
        propagatedFrom: parentContextId,
    });
}
/**
 * Delete deadline context
 */
function deleteDeadlineContext(contextId) {
    return deadlineContexts.delete(contextId);
}
// ============================================================================
// CANCELLATION TOKEN MANAGEMENT
// ============================================================================
/**
 * Create cancellation token
 */
function createCancellationToken() {
    const tokenId = generateTokenId();
    const token = {
        tokenId,
        cancelled: false,
        reason: null,
        cancelledAt: null,
    };
    cancellationTokens.set(tokenId, token);
    return token;
}
/**
 * Get cancellation token
 */
function getCancellationToken(tokenId) {
    return cancellationTokens.get(tokenId) ?? null;
}
/**
 * Cancel token
 */
function cancelToken(tokenId, reason) {
    const token = cancellationTokens.get(tokenId);
    if (!token || token.cancelled) {
        return false;
    }
    const cancelledToken = {
        ...token,
        cancelled: true,
        reason: reason ?? null,
        cancelledAt: clock.nowMs(),
    };
    cancellationTokens.set(tokenId, cancelledToken);
    return true;
}
/**
 * Is token cancelled
 */
function isTokenCancelled(tokenId) {
    const token = cancellationTokens.get(tokenId);
    return token?.cancelled ?? false;
}
/**
 * Delete cancellation token
 */
function deleteCancellationToken(tokenId) {
    return cancellationTokens.delete(tokenId);
}
// ============================================================================
// TIMEOUT EXECUTION
// ============================================================================
/**
 * Execute with timeout
 */
async function executeWithTimeout(operation, timeoutMs, options = {}) {
    const startTime = clock.nowMs();
    const deadline = startTime + timeoutMs;
    return new Promise((resolve, reject) => {
        let completed = false;
        const timeoutId = setTimeout(() => {
            if (!completed) {
                completed = true;
                if (options.onTimeout) {
                    options.onTimeout();
                }
                reject(new Error('Operation timed out'));
            }
        }, timeoutMs);
        if (typeof timeoutId === 'object' && 'unref' in timeoutId) {
            timeoutId.unref();
        }
        const checkCancellation = () => {
            if (options.cancellationToken && isTokenCancelled(options.cancellationToken)) {
                if (!completed) {
                    completed = true;
                    clearTimeout(timeoutId);
                    reject(new Error('Operation cancelled'));
                }
                return true;
            }
            return false;
        };
        if (checkCancellation()) {
            return;
        }
        Promise.resolve(operation())
            .then(result => {
            if (!completed) {
                completed = true;
                clearTimeout(timeoutId);
                resolve(result);
            }
        })
            .catch(error => {
            if (!completed) {
                completed = true;
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    });
}
/**
 * Execute with deadline
 */
async function executeWithDeadline(operation, deadline, options = {}) {
    const now = clock.nowMs();
    const remainingTime = deadline - now;
    if (remainingTime <= 0) {
        throw new Error('Deadline already passed');
    }
    return executeWithTimeout(operation, remainingTime, options);
}
/**
 * Execute with budget
 */
async function executeWithBudget(budgetNameOrId, operation, requestedTime, fn) {
    const allocation = allocateFromBudget(budgetNameOrId, operation, requestedTime);
    if (!allocation) {
        throw new Error('Insufficient budget');
    }
    const startTime = clock.nowMs();
    try {
        const result = await executeWithTimeout(fn, allocation.allocated);
        const actualUsed = clock.nowMs() - startTime;
        releaseBudgetAllocation(budgetNameOrId, allocation.allocationId, actualUsed);
        return result;
    }
    catch (error) {
        const actualUsed = clock.nowMs() - startTime;
        releaseBudgetAllocation(budgetNameOrId, allocation.allocationId, actualUsed);
        throw error;
    }
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
        totalConfigs: 0,
        activeTimeouts: 0,
        expiredTimeouts: 0,
        cancelledTimeouts: 0,
        completedTimeouts: 0,
        totalBudgets: 0,
        exhaustedBudgets: 0,
        averageTimeoutDuration: 0,
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
    instances.clear();
    budgets.clear();
    deadlineContexts.clear();
    cancellationTokens.clear();
    eventListeners.clear();
    resetStatistics();
}
