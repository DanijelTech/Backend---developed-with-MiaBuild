"use strict";
/**
 * @file Load Shedding za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-RES-004 Load shedding za zaledne sisteme
 * @design DSN-ZALEDNI-RES-004 Backend load shedding arhitektura
 * @test TEST-ZALEDNI-RES-004 Preverjanje load shedding
 *
 * Load Shedding - prilagojen za zaledne sisteme:
 * - Priority-based request handling
 * - Adaptive load management
 * - Request queuing
 * - Graceful degradation
 * - Resource monitoring
 * - Threshold management
 * - Metrics collection
 * - Event notifications
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom RES_004 - Load Shedding
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLoadSheddingConfig = createLoadSheddingConfig;
exports.getLoadSheddingConfig = getLoadSheddingConfig;
exports.getAllLoadSheddingConfigs = getAllLoadSheddingConfigs;
exports.updateLoadSheddingConfig = updateLoadSheddingConfig;
exports.deleteLoadSheddingConfig = deleteLoadSheddingConfig;
exports.submitRequest = submitRequest;
exports.completeRequest = completeRequest;
exports.getLoadMetrics = getLoadMetrics;
exports.getCurrentLoadLevel = getCurrentLoadLevel;
exports.getQueueStatus = getQueueStatus;
exports.addDegradationRule = addDegradationRule;
exports.removeDegradationRule = removeDegradationRule;
exports.getDegradationRules = getDegradationRules;
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
const queues = new Map();
const activeRequests = new Map();
const loadMetrics = new Map();
const eventListeners = new Set();
let configCounter = 0;
let requestCounter = 0;
let decisionCounter = 0;
let entryCounter = 0;
let ruleCounter = 0;
let eventCounter = 0;
const statistics = {
    totalConfigs: 0,
    totalRequests: 0,
    acceptedRequests: 0,
    queuedRequests: 0,
    rejectedRequests: 0,
    degradedRequests: 0,
    expiredRequests: 0,
    currentQueueSize: 0,
    peakQueueSize: 0,
    averageQueueTime: 0,
};
// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================
/**
 * Generate config ID
 */
function generateConfigId() {
    configCounter++;
    return (0, deterministic_1.generateDeterministicId)(`load-shed-config-${configCounter}`);
}
/**
 * Generate request ID
 */
function generateRequestId() {
    requestCounter++;
    return (0, deterministic_1.generateDeterministicId)(`load-shed-req-${requestCounter}`);
}
/**
 * Generate decision ID
 */
function generateDecisionId() {
    decisionCounter++;
    return (0, deterministic_1.generateDeterministicId)(`load-shed-dec-${decisionCounter}`);
}
/**
 * Generate entry ID
 */
function generateEntryId() {
    entryCounter++;
    return (0, deterministic_1.generateDeterministicId)(`queue-entry-${entryCounter}`);
}
/**
 * Generate rule ID
 */
function generateRuleId() {
    ruleCounter++;
    return (0, deterministic_1.generateDeterministicId)(`degrade-rule-${ruleCounter}`);
}
/**
 * Generate event ID
 */
function generateEventId() {
    eventCounter++;
    return (0, deterministic_1.generateDeterministicId)(`load-shed-event-${eventCounter}`);
}
/**
 * Emit load shedding event
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
    let totalQueueSize = 0;
    for (const queue of queues.values()) {
        totalQueueSize += queue.length;
    }
    mutableStats.currentQueueSize = totalQueueSize;
    if (totalQueueSize > mutableStats.peakQueueSize) {
        mutableStats.peakQueueSize = totalQueueSize;
    }
}
/**
 * Calculate load level
 */
function calculateLoadLevel(config, currentLoad) {
    if (currentLoad >= config.thresholds.overloadThreshold) {
        return 'overload';
    }
    if (currentLoad >= config.thresholds.criticalThreshold) {
        return 'critical';
    }
    if (currentLoad >= config.thresholds.highThreshold) {
        return 'high';
    }
    if (currentLoad >= config.thresholds.elevatedThreshold) {
        return 'elevated';
    }
    return 'normal';
}
/**
 * Get priority weight
 */
function getPriorityWeight(config, priority) {
    return config.priorityWeights[priority] ?? 1;
}
/**
 * Find degradation rule
 */
function findDegradationRule(config, loadLevel, priority) {
    for (const rule of config.degradationRules) {
        if (rule.loadLevel === loadLevel && rule.priority === priority) {
            return rule;
        }
    }
    return null;
}
/**
 * Initialize load metrics
 */
function initializeLoadMetrics(configId) {
    return {
        currentLoad: 0,
        loadLevel: 'normal',
        activeRequests: 0,
        queuedRequests: 0,
        acceptedRequests: 0,
        rejectedRequests: 0,
        degradedRequests: 0,
        averageLatency: 0,
        p99Latency: 0,
    };
}
// ============================================================================
// CONFIG MANAGEMENT
// ============================================================================
/**
 * Create load shedding config
 */
async function createLoadSheddingConfig(name, options = {}) {
    const configId = generateConfigId();
    const defaultWeights = {
        critical: 100,
        high: 75,
        normal: 50,
        low: 25,
        background: 10,
    };
    const defaultThresholds = {
        elevatedThreshold: 0.5,
        highThreshold: 0.7,
        criticalThreshold: 0.85,
        overloadThreshold: 0.95,
    };
    const degradationRules = (options.degradationRules ?? []).map(rule => ({
        ...rule,
        ruleId: generateRuleId(),
    }));
    const config = {
        configId,
        name,
        strategy: options.strategy ?? 'priority',
        maxConcurrent: options.maxConcurrent ?? 100,
        maxQueueSize: options.maxQueueSize ?? 1000,
        queueTimeout: options.queueTimeout ?? 30000,
        priorityWeights: options.priorityWeights ?? defaultWeights,
        thresholds: {
            ...defaultThresholds,
            ...options.thresholds,
        },
        degradationRules,
        enabled: true,
        metadata: options.metadata ?? {},
    };
    configs.set(configId, config);
    configs.set(name, config);
    queues.set(configId, []);
    activeRequests.set(configId, new Set());
    loadMetrics.set(configId, initializeLoadMetrics(configId));
    await emitEvent({
        eventId: generateEventId(),
        type: 'config_created',
        configId,
        requestId: null,
        timestamp: clock.nowMs(),
        data: { name },
    });
    updateStatistics();
    return config;
}
/**
 * Get load shedding config
 */
function getLoadSheddingConfig(nameOrId) {
    return configs.get(nameOrId) ?? null;
}
/**
 * Get all load shedding configs
 */
function getAllLoadSheddingConfigs() {
    const uniqueConfigs = new Map();
    for (const config of configs.values()) {
        uniqueConfigs.set(config.configId, config);
    }
    return Array.from(uniqueConfigs.values());
}
/**
 * Update load shedding config
 */
function updateLoadSheddingConfig(nameOrId, updates) {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    const updatedConfig = {
        ...config,
        strategy: updates.strategy ?? config.strategy,
        maxConcurrent: updates.maxConcurrent ?? config.maxConcurrent,
        maxQueueSize: updates.maxQueueSize ?? config.maxQueueSize,
        queueTimeout: updates.queueTimeout ?? config.queueTimeout,
        enabled: updates.enabled ?? config.enabled,
    };
    configs.set(config.configId, updatedConfig);
    configs.set(config.name, updatedConfig);
    return updatedConfig;
}
/**
 * Delete load shedding config
 */
async function deleteLoadSheddingConfig(nameOrId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    configs.delete(config.configId);
    configs.delete(config.name);
    queues.delete(config.configId);
    activeRequests.delete(config.configId);
    loadMetrics.delete(config.configId);
    await emitEvent({
        eventId: generateEventId(),
        type: 'config_deleted',
        configId: config.configId,
        requestId: null,
        timestamp: clock.nowMs(),
        data: {},
    });
    updateStatistics();
    return true;
}
// ============================================================================
// REQUEST HANDLING
// ============================================================================
/**
 * Submit request
 */
async function submitRequest(nameOrId, priority, options = {}) {
    const config = configs.get(nameOrId);
    if (!config) {
        throw new Error(`Load shedding config '${nameOrId}' not found`);
    }
    const requestId = generateRequestId();
    const decisionId = generateDecisionId();
    const now = clock.nowMs();
    const request = {
        requestId,
        priority,
        timestamp: now,
        deadline: options.deadline ?? null,
        metadata: options.metadata ?? {},
    };
    const mutableStats = statistics;
    mutableStats.totalRequests++;
    if (!config.enabled) {
        mutableStats.acceptedRequests++;
        return {
            decisionId,
            requestId,
            action: 'accept',
            queuePosition: null,
            estimatedWait: null,
            degradationLevel: 0,
            reason: 'Load shedding disabled',
            timestamp: now,
        };
    }
    const active = activeRequests.get(config.configId) ?? new Set();
    const queue = queues.get(config.configId) ?? [];
    const metrics = loadMetrics.get(config.configId) ?? initializeLoadMetrics(config.configId);
    const currentLoad = active.size / config.maxConcurrent;
    const loadLevel = calculateLoadLevel(config, currentLoad);
    const updatedMetrics = {
        ...metrics,
        currentLoad,
        loadLevel,
        activeRequests: active.size,
        queuedRequests: queue.length,
    };
    loadMetrics.set(config.configId, updatedMetrics);
    const rule = findDegradationRule(config, loadLevel, priority);
    if (rule) {
        switch (rule.action) {
            case 'reject':
                mutableStats.rejectedRequests++;
                await emitEvent({
                    eventId: generateEventId(),
                    type: 'request_rejected',
                    configId: config.configId,
                    requestId,
                    timestamp: now,
                    data: { loadLevel, priority, reason: 'Degradation rule' },
                });
                return {
                    decisionId,
                    requestId,
                    action: 'reject',
                    queuePosition: null,
                    estimatedWait: null,
                    degradationLevel: rule.degradationLevel,
                    reason: `Rejected due to ${loadLevel} load level`,
                    timestamp: now,
                };
            case 'degrade':
                mutableStats.degradedRequests++;
                await emitEvent({
                    eventId: generateEventId(),
                    type: 'request_degraded',
                    configId: config.configId,
                    requestId,
                    timestamp: now,
                    data: { loadLevel, priority, degradationLevel: rule.degradationLevel },
                });
                active.add(requestId);
                activeRequests.set(config.configId, active);
                return {
                    decisionId,
                    requestId,
                    action: 'degrade',
                    queuePosition: null,
                    estimatedWait: null,
                    degradationLevel: rule.degradationLevel,
                    reason: `Degraded due to ${loadLevel} load level`,
                    timestamp: now,
                };
            case 'queue':
                if (queue.length >= config.maxQueueSize) {
                    mutableStats.rejectedRequests++;
                    await emitEvent({
                        eventId: generateEventId(),
                        type: 'request_rejected',
                        configId: config.configId,
                        requestId,
                        timestamp: now,
                        data: { reason: 'Queue full' },
                    });
                    return {
                        decisionId,
                        requestId,
                        action: 'reject',
                        queuePosition: null,
                        estimatedWait: null,
                        degradationLevel: 0,
                        reason: 'Queue is full',
                        timestamp: now,
                    };
                }
                const entry = {
                    entryId: generateEntryId(),
                    request,
                    enqueuedAt: now,
                    expiresAt: now + config.queueTimeout,
                    position: queue.length,
                };
                queue.push(entry);
                queues.set(config.configId, queue);
                mutableStats.queuedRequests++;
                await emitEvent({
                    eventId: generateEventId(),
                    type: 'request_queued',
                    configId: config.configId,
                    requestId,
                    timestamp: now,
                    data: { position: entry.position },
                });
                updateStatistics();
                return {
                    decisionId,
                    requestId,
                    action: 'queue',
                    queuePosition: entry.position,
                    estimatedWait: entry.position * (metrics.averageLatency || 100),
                    degradationLevel: 0,
                    reason: `Queued at position ${entry.position}`,
                    timestamp: now,
                };
        }
    }
    if (active.size < config.maxConcurrent) {
        active.add(requestId);
        activeRequests.set(config.configId, active);
        mutableStats.acceptedRequests++;
        await emitEvent({
            eventId: generateEventId(),
            type: 'request_accepted',
            configId: config.configId,
            requestId,
            timestamp: now,
            data: {},
        });
        return {
            decisionId,
            requestId,
            action: 'accept',
            queuePosition: null,
            estimatedWait: null,
            degradationLevel: 0,
            reason: 'Accepted',
            timestamp: now,
        };
    }
    if (queue.length < config.maxQueueSize) {
        const entry = {
            entryId: generateEntryId(),
            request,
            enqueuedAt: now,
            expiresAt: now + config.queueTimeout,
            position: queue.length,
        };
        queue.push(entry);
        queues.set(config.configId, queue);
        mutableStats.queuedRequests++;
        await emitEvent({
            eventId: generateEventId(),
            type: 'request_queued',
            configId: config.configId,
            requestId,
            timestamp: now,
            data: { position: entry.position },
        });
        updateStatistics();
        return {
            decisionId,
            requestId,
            action: 'queue',
            queuePosition: entry.position,
            estimatedWait: entry.position * (metrics.averageLatency || 100),
            degradationLevel: 0,
            reason: `Queued at position ${entry.position}`,
            timestamp: now,
        };
    }
    mutableStats.rejectedRequests++;
    await emitEvent({
        eventId: generateEventId(),
        type: 'request_rejected',
        configId: config.configId,
        requestId,
        timestamp: now,
        data: { reason: 'At capacity' },
    });
    return {
        decisionId,
        requestId,
        action: 'reject',
        queuePosition: null,
        estimatedWait: null,
        degradationLevel: 0,
        reason: 'System at capacity',
        timestamp: now,
    };
}
/**
 * Complete request
 */
async function completeRequest(nameOrId, requestId, latency) {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    const active = activeRequests.get(config.configId);
    if (!active || !active.has(requestId)) {
        return false;
    }
    active.delete(requestId);
    activeRequests.set(config.configId, active);
    const metrics = loadMetrics.get(config.configId);
    if (metrics) {
        const totalRequests = metrics.acceptedRequests + 1;
        const newAverageLatency = (metrics.averageLatency * metrics.acceptedRequests + latency) / totalRequests;
        const updatedMetrics = {
            ...metrics,
            activeRequests: active.size,
            acceptedRequests: totalRequests,
            averageLatency: newAverageLatency,
        };
        loadMetrics.set(config.configId, updatedMetrics);
    }
    await processQueue(config.configId);
    return true;
}
/**
 * Process queue
 */
async function processQueue(configId) {
    const config = configs.get(configId);
    if (!config) {
        return;
    }
    const active = activeRequests.get(configId) ?? new Set();
    const queue = queues.get(configId) ?? [];
    const now = clock.nowMs();
    const expiredIndices = [];
    for (let i = 0; i < queue.length; i++) {
        if (queue[i].expiresAt <= now) {
            expiredIndices.push(i);
        }
    }
    for (let i = expiredIndices.length - 1; i >= 0; i--) {
        const entry = queue[expiredIndices[i]];
        queue.splice(expiredIndices[i], 1);
        const mutableStats = statistics;
        mutableStats.expiredRequests++;
        await emitEvent({
            eventId: generateEventId(),
            type: 'request_expired',
            configId,
            requestId: entry.request.requestId,
            timestamp: now,
            data: {},
        });
    }
    while (active.size < config.maxConcurrent && queue.length > 0) {
        let nextEntry = null;
        let nextIndex = 0;
        switch (config.strategy) {
            case 'fifo':
                nextEntry = queue[0];
                nextIndex = 0;
                break;
            case 'lifo':
                nextEntry = queue[queue.length - 1];
                nextIndex = queue.length - 1;
                break;
            case 'priority':
                let highestWeight = -1;
                for (let i = 0; i < queue.length; i++) {
                    const weight = getPriorityWeight(config, queue[i].request.priority);
                    if (weight > highestWeight) {
                        highestWeight = weight;
                        nextEntry = queue[i];
                        nextIndex = i;
                    }
                }
                break;
            case 'random':
                nextIndex = now % queue.length;
                nextEntry = queue[nextIndex];
                break;
            case 'adaptive':
                for (let i = 0; i < queue.length; i++) {
                    const entry = queue[i];
                    if (entry.request.deadline && entry.request.deadline <= now + 1000) {
                        nextEntry = entry;
                        nextIndex = i;
                        break;
                    }
                }
                if (!nextEntry) {
                    let highestWeight = -1;
                    for (let i = 0; i < queue.length; i++) {
                        const weight = getPriorityWeight(config, queue[i].request.priority);
                        if (weight > highestWeight) {
                            highestWeight = weight;
                            nextEntry = queue[i];
                            nextIndex = i;
                        }
                    }
                }
                break;
        }
        if (!nextEntry) {
            break;
        }
        queue.splice(nextIndex, 1);
        active.add(nextEntry.request.requestId);
        await emitEvent({
            eventId: generateEventId(),
            type: 'request_dequeued',
            configId,
            requestId: nextEntry.request.requestId,
            timestamp: now,
            data: { waitTime: now - nextEntry.enqueuedAt },
        });
    }
    for (let i = 0; i < queue.length; i++) {
        const entry = queue[i];
        queue[i] = { ...entry, position: i };
    }
    queues.set(configId, queue);
    activeRequests.set(configId, active);
    updateStatistics();
}
// ============================================================================
// LOAD METRICS
// ============================================================================
/**
 * Get load metrics
 */
function getLoadMetrics(nameOrId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    return loadMetrics.get(config.configId) ?? null;
}
/**
 * Get current load level
 */
function getCurrentLoadLevel(nameOrId) {
    const metrics = getLoadMetrics(nameOrId);
    return metrics?.loadLevel ?? null;
}
/**
 * Get queue status
 */
function getQueueStatus(nameOrId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    const queue = queues.get(config.configId) ?? [];
    return {
        size: queue.length,
        entries: queue,
    };
}
// ============================================================================
// DEGRADATION RULES
// ============================================================================
/**
 * Add degradation rule
 */
function addDegradationRule(nameOrId, loadLevel, priority, action, degradationLevel = 0) {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    const rule = {
        ruleId: generateRuleId(),
        loadLevel,
        priority,
        action,
        degradationLevel,
    };
    const updatedConfig = {
        ...config,
        degradationRules: [...config.degradationRules, rule],
    };
    configs.set(config.configId, updatedConfig);
    configs.set(config.name, updatedConfig);
    return rule;
}
/**
 * Remove degradation rule
 */
function removeDegradationRule(nameOrId, ruleId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    const index = config.degradationRules.findIndex(r => r.ruleId === ruleId);
    if (index === -1) {
        return false;
    }
    const updatedRules = [...config.degradationRules];
    updatedRules.splice(index, 1);
    const updatedConfig = {
        ...config,
        degradationRules: updatedRules,
    };
    configs.set(config.configId, updatedConfig);
    configs.set(config.name, updatedConfig);
    return true;
}
/**
 * Get degradation rules
 */
function getDegradationRules(nameOrId) {
    const config = configs.get(nameOrId);
    return config?.degradationRules ?? [];
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
        totalRequests: 0,
        acceptedRequests: 0,
        queuedRequests: 0,
        rejectedRequests: 0,
        degradedRequests: 0,
        expiredRequests: 0,
        currentQueueSize: 0,
        peakQueueSize: 0,
        averageQueueTime: 0,
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
    queues.clear();
    activeRequests.clear();
    loadMetrics.clear();
    eventListeners.clear();
    resetStatistics();
}
