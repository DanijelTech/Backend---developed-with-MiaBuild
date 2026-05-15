"use strict";
/**
 * @file Graceful Shutdown za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-RES-009 Graceful shutdown za zaledne sisteme
 * @design DSN-ZALEDNI-RES-009 Backend graceful shutdown arhitektura
 * @test TEST-ZALEDNI-RES-009 Preverjanje graceful shutdown
 *
 * Graceful Shutdown - prilagojen za zaledne sisteme:
 * - Signal handling
 * - Connection draining
 * - Request completion
 * - Resource cleanup
 * - Shutdown hooks
 * - Timeout management
 * - State persistence
 * - Event notifications
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom RES_009 - Graceful Shutdown
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createShutdownConfig = createShutdownConfig;
exports.getShutdownConfig = getShutdownConfig;
exports.getAllShutdownConfigs = getAllShutdownConfigs;
exports.updateShutdownConfig = updateShutdownConfig;
exports.deleteShutdownConfig = deleteShutdownConfig;
exports.registerShutdownHook = registerShutdownHook;
exports.unregisterShutdownHook = unregisterShutdownHook;
exports.getShutdownHooks = getShutdownHooks;
exports.registerConnection = registerConnection;
exports.updateConnectionActivity = updateConnectionActivity;
exports.closeConnection = closeConnection;
exports.getActiveConnections = getActiveConnections;
exports.registerRequest = registerRequest;
exports.completeRequest = completeRequest;
exports.abortRequest = abortRequest;
exports.getPendingRequests = getPendingRequests;
exports.initiateShutdown = initiateShutdown;
exports.forceShutdown = forceShutdown;
exports.getShutdownState = getShutdownState;
exports.isShuttingDown = isShuttingDown;
exports.isTerminated = isTerminated;
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
const hooks = new Map();
const connections = new Map();
const requests = new Map();
const eventListeners = new Set();
let configCounter = 0;
let stateCounter = 0;
let hookCounter = 0;
let errorCounter = 0;
let connectionCounter = 0;
let requestCounter = 0;
let eventCounter = 0;
const statistics = {
    totalConfigs: 0,
    totalShutdowns: 0,
    successfulShutdowns: 0,
    failedShutdowns: 0,
    forcedShutdowns: 0,
    totalHooksExecuted: 0,
    failedHooks: 0,
    averageShutdownDuration: 0,
    totalConnectionsDrained: 0,
    totalRequestsCompleted: 0,
    totalRequestsAborted: 0,
};
// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================
/**
 * Generate config ID
 */
function generateConfigId() {
    configCounter++;
    return (0, deterministic_1.generateDeterministicId)(`shutdown-config-${configCounter}`);
}
/**
 * Generate state ID
 */
function generateStateId() {
    stateCounter++;
    return (0, deterministic_1.generateDeterministicId)(`shutdown-state-${stateCounter}`);
}
/**
 * Generate hook ID
 */
function generateHookId() {
    hookCounter++;
    return (0, deterministic_1.generateDeterministicId)(`shutdown-hook-${hookCounter}`);
}
/**
 * Generate error ID
 */
function generateErrorId() {
    errorCounter++;
    return (0, deterministic_1.generateDeterministicId)(`shutdown-error-${errorCounter}`);
}
/**
 * Generate connection ID
 */
function generateConnectionId() {
    connectionCounter++;
    return (0, deterministic_1.generateDeterministicId)(`shutdown-conn-${connectionCounter}`);
}
/**
 * Generate request ID
 */
function generateRequestId() {
    requestCounter++;
    return (0, deterministic_1.generateDeterministicId)(`shutdown-req-${requestCounter}`);
}
/**
 * Generate event ID
 */
function generateEventId() {
    eventCounter++;
    return (0, deterministic_1.generateDeterministicId)(`shutdown-event-${eventCounter}`);
}
/**
 * Emit shutdown event
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
}
/**
 * Get priority order
 */
function getPriorityOrder(priority) {
    switch (priority) {
        case 'critical': return 0;
        case 'high': return 1;
        case 'normal': return 2;
        case 'low': return 3;
        case 'cleanup': return 4;
        default: return 2;
    }
}
/**
 * Initialize shutdown state
 */
function initializeShutdownState(configId) {
    return {
        stateId: generateStateId(),
        configId,
        phase: 'running',
        signal: null,
        initiatedAt: null,
        completedAt: null,
        activeConnections: 0,
        pendingRequests: 0,
        completedHooks: 0,
        totalHooks: 0,
        errors: [],
    };
}
// ============================================================================
// CONFIG MANAGEMENT
// ============================================================================
/**
 * Create shutdown config
 */
async function createShutdownConfig(name, options = {}) {
    const configId = generateConfigId();
    const config = {
        configId,
        name,
        drainTimeout: options.drainTimeout ?? 30000,
        cleanupTimeout: options.cleanupTimeout ?? 10000,
        finalizeTimeout: options.finalizeTimeout ?? 5000,
        totalTimeout: options.totalTimeout ?? 60000,
        forceKillTimeout: options.forceKillTimeout ?? 5000,
        gracePeriod: options.gracePeriod ?? 5000,
        enabled: true,
        metadata: options.metadata ?? {},
    };
    configs.set(configId, config);
    configs.set(name, config);
    states.set(configId, initializeShutdownState(configId));
    hooks.set(configId, []);
    connections.set(configId, []);
    requests.set(configId, []);
    await emitEvent({
        eventId: generateEventId(),
        type: 'config_created',
        configId,
        timestamp: clock.nowMs(),
        data: { name },
    });
    updateStatistics();
    return config;
}
/**
 * Get shutdown config
 */
function getShutdownConfig(nameOrId) {
    return configs.get(nameOrId) ?? null;
}
/**
 * Get all shutdown configs
 */
function getAllShutdownConfigs() {
    const uniqueConfigs = new Map();
    for (const config of configs.values()) {
        uniqueConfigs.set(config.configId, config);
    }
    return Array.from(uniqueConfigs.values());
}
/**
 * Update shutdown config
 */
function updateShutdownConfig(nameOrId, updates) {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    const updatedConfig = {
        ...config,
        drainTimeout: updates.drainTimeout ?? config.drainTimeout,
        cleanupTimeout: updates.cleanupTimeout ?? config.cleanupTimeout,
        finalizeTimeout: updates.finalizeTimeout ?? config.finalizeTimeout,
        totalTimeout: updates.totalTimeout ?? config.totalTimeout,
        enabled: updates.enabled ?? config.enabled,
    };
    configs.set(config.configId, updatedConfig);
    configs.set(config.name, updatedConfig);
    return updatedConfig;
}
/**
 * Delete shutdown config
 */
async function deleteShutdownConfig(nameOrId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    configs.delete(config.configId);
    configs.delete(config.name);
    states.delete(config.configId);
    hooks.delete(config.configId);
    connections.delete(config.configId);
    requests.delete(config.configId);
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
// HOOK MANAGEMENT
// ============================================================================
/**
 * Register shutdown hook
 */
function registerShutdownHook(nameOrId, hookName, handler, options = {}) {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    const hook = {
        hookId: generateHookId(),
        configId: config.configId,
        name: hookName,
        priority: options.priority ?? 'normal',
        timeout: options.timeout ?? 5000,
        handler,
        executed: false,
        executedAt: null,
        success: null,
        error: null,
    };
    const hookList = hooks.get(config.configId) ?? [];
    hookList.push(hook);
    hookList.sort((a, b) => getPriorityOrder(a.priority) - getPriorityOrder(b.priority));
    hooks.set(config.configId, hookList);
    const state = states.get(config.configId);
    if (state) {
        const updatedState = {
            ...state,
            totalHooks: hookList.length,
        };
        states.set(config.configId, updatedState);
    }
    return hook;
}
/**
 * Unregister shutdown hook
 */
function unregisterShutdownHook(nameOrId, hookId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    const hookList = hooks.get(config.configId) ?? [];
    const index = hookList.findIndex(h => h.hookId === hookId);
    if (index === -1) {
        return false;
    }
    hookList.splice(index, 1);
    hooks.set(config.configId, hookList);
    const state = states.get(config.configId);
    if (state) {
        const updatedState = {
            ...state,
            totalHooks: hookList.length,
        };
        states.set(config.configId, updatedState);
    }
    return true;
}
/**
 * Get shutdown hooks
 */
function getShutdownHooks(nameOrId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return [];
    }
    return hooks.get(config.configId) ?? [];
}
// ============================================================================
// CONNECTION MANAGEMENT
// ============================================================================
/**
 * Register connection
 */
function registerConnection(nameOrId, type) {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    const now = clock.nowMs();
    const connection = {
        connectionId: generateConnectionId(),
        configId: config.configId,
        type,
        createdAt: now,
        lastActivityAt: now,
        draining: false,
        closed: false,
    };
    const connList = connections.get(config.configId) ?? [];
    connList.push(connection);
    connections.set(config.configId, connList);
    const state = states.get(config.configId);
    if (state) {
        const updatedState = {
            ...state,
            activeConnections: connList.filter(c => !c.closed).length,
        };
        states.set(config.configId, updatedState);
    }
    return connection;
}
/**
 * Update connection activity
 */
function updateConnectionActivity(nameOrId, connectionId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    const connList = connections.get(config.configId) ?? [];
    const index = connList.findIndex(c => c.connectionId === connectionId);
    if (index === -1) {
        return false;
    }
    const connection = connList[index];
    const updatedConnection = {
        ...connection,
        lastActivityAt: clock.nowMs(),
    };
    connList[index] = updatedConnection;
    connections.set(config.configId, connList);
    return true;
}
/**
 * Close connection
 */
async function closeConnection(nameOrId, connectionId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    const connList = connections.get(config.configId) ?? [];
    const index = connList.findIndex(c => c.connectionId === connectionId);
    if (index === -1) {
        return false;
    }
    const connection = connList[index];
    const closedConnection = {
        ...connection,
        closed: true,
    };
    connList[index] = closedConnection;
    connections.set(config.configId, connList);
    const state = states.get(config.configId);
    if (state) {
        const updatedState = {
            ...state,
            activeConnections: connList.filter(c => !c.closed).length,
        };
        states.set(config.configId, updatedState);
    }
    await emitEvent({
        eventId: generateEventId(),
        type: 'connection_drained',
        configId: config.configId,
        timestamp: clock.nowMs(),
        data: { connectionId },
    });
    const mutableStats = statistics;
    mutableStats.totalConnectionsDrained++;
    return true;
}
/**
 * Get active connections
 */
function getActiveConnections(nameOrId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return [];
    }
    const connList = connections.get(config.configId) ?? [];
    return connList.filter(c => !c.closed);
}
// ============================================================================
// REQUEST MANAGEMENT
// ============================================================================
/**
 * Register request
 */
function registerRequest(nameOrId, options = {}) {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    const now = clock.nowMs();
    const request = {
        requestId: generateRequestId(),
        configId: config.configId,
        startedAt: now,
        deadline: options.deadline ?? null,
        completed: false,
        aborted: false,
    };
    const reqList = requests.get(config.configId) ?? [];
    reqList.push(request);
    requests.set(config.configId, reqList);
    const state = states.get(config.configId);
    if (state) {
        const updatedState = {
            ...state,
            pendingRequests: reqList.filter(r => !r.completed && !r.aborted).length,
        };
        states.set(config.configId, updatedState);
    }
    return request;
}
/**
 * Complete request
 */
async function completeRequest(nameOrId, requestId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    const reqList = requests.get(config.configId) ?? [];
    const index = reqList.findIndex(r => r.requestId === requestId);
    if (index === -1) {
        return false;
    }
    const request = reqList[index];
    const completedRequest = {
        ...request,
        completed: true,
    };
    reqList[index] = completedRequest;
    requests.set(config.configId, reqList);
    const state = states.get(config.configId);
    if (state) {
        const updatedState = {
            ...state,
            pendingRequests: reqList.filter(r => !r.completed && !r.aborted).length,
        };
        states.set(config.configId, updatedState);
    }
    await emitEvent({
        eventId: generateEventId(),
        type: 'request_completed',
        configId: config.configId,
        timestamp: clock.nowMs(),
        data: { requestId },
    });
    const mutableStats = statistics;
    mutableStats.totalRequestsCompleted++;
    return true;
}
/**
 * Abort request
 */
async function abortRequest(nameOrId, requestId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    const reqList = requests.get(config.configId) ?? [];
    const index = reqList.findIndex(r => r.requestId === requestId);
    if (index === -1) {
        return false;
    }
    const request = reqList[index];
    const abortedRequest = {
        ...request,
        aborted: true,
    };
    reqList[index] = abortedRequest;
    requests.set(config.configId, reqList);
    const state = states.get(config.configId);
    if (state) {
        const updatedState = {
            ...state,
            pendingRequests: reqList.filter(r => !r.completed && !r.aborted).length,
        };
        states.set(config.configId, updatedState);
    }
    await emitEvent({
        eventId: generateEventId(),
        type: 'request_aborted',
        configId: config.configId,
        timestamp: clock.nowMs(),
        data: { requestId },
    });
    const mutableStats = statistics;
    mutableStats.totalRequestsAborted++;
    return true;
}
/**
 * Get pending requests
 */
function getPendingRequests(nameOrId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return [];
    }
    const reqList = requests.get(config.configId) ?? [];
    return reqList.filter(r => !r.completed && !r.aborted);
}
// ============================================================================
// SHUTDOWN OPERATIONS
// ============================================================================
/**
 * Initiate shutdown
 */
async function initiateShutdown(nameOrId, signal = 'manual') {
    const config = configs.get(nameOrId);
    if (!config || !config.enabled) {
        return false;
    }
    const state = states.get(config.configId);
    if (!state || state.phase !== 'running') {
        return false;
    }
    const now = clock.nowMs();
    const mutableStats = statistics;
    mutableStats.totalShutdowns++;
    const initiatedState = {
        ...state,
        phase: 'shutdown_initiated',
        signal,
        initiatedAt: now,
    };
    states.set(config.configId, initiatedState);
    await emitEvent({
        eventId: generateEventId(),
        type: 'shutdown_initiated',
        configId: config.configId,
        timestamp: now,
        data: { signal },
    });
    await emitEvent({
        eventId: generateEventId(),
        type: 'phase_changed',
        configId: config.configId,
        timestamp: now,
        data: { previousPhase: 'running', newPhase: 'shutdown_initiated' },
    });
    await executeDrainPhase(config.configId);
    await executeCleanupPhase(config.configId);
    await executeFinalizePhase(config.configId);
    return true;
}
/**
 * Execute drain phase
 */
async function executeDrainPhase(configId) {
    const config = configs.get(configId);
    const state = states.get(configId);
    if (!config || !state) {
        return;
    }
    const now = clock.nowMs();
    const drainingState = {
        ...state,
        phase: 'draining',
    };
    states.set(configId, drainingState);
    await emitEvent({
        eventId: generateEventId(),
        type: 'draining_started',
        configId,
        timestamp: now,
        data: {},
    });
    await emitEvent({
        eventId: generateEventId(),
        type: 'phase_changed',
        configId,
        timestamp: now,
        data: { previousPhase: 'shutdown_initiated', newPhase: 'draining' },
    });
    const connList = connections.get(configId) ?? [];
    for (let i = 0; i < connList.length; i++) {
        const conn = connList[i];
        if (!conn.closed) {
            connList[i] = { ...conn, draining: true };
        }
    }
    connections.set(configId, connList);
    const drainDeadline = now + config.drainTimeout;
    while (clock.nowMs() < drainDeadline) {
        const currentState = states.get(configId);
        if (!currentState) {
            break;
        }
        if (currentState.activeConnections === 0 && currentState.pendingRequests === 0) {
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    const finalState = states.get(configId);
    if (finalState && finalState.pendingRequests > 0) {
        const reqList = requests.get(configId) ?? [];
        for (const req of reqList) {
            if (!req.completed && !req.aborted) {
                await abortRequest(configId, req.requestId);
            }
        }
    }
    await emitEvent({
        eventId: generateEventId(),
        type: 'draining_completed',
        configId,
        timestamp: clock.nowMs(),
        data: {},
    });
}
/**
 * Execute cleanup phase
 */
async function executeCleanupPhase(configId) {
    const config = configs.get(configId);
    const state = states.get(configId);
    if (!config || !state) {
        return;
    }
    const now = clock.nowMs();
    const cleanupState = {
        ...state,
        phase: 'cleanup',
    };
    states.set(configId, cleanupState);
    await emitEvent({
        eventId: generateEventId(),
        type: 'cleanup_started',
        configId,
        timestamp: now,
        data: {},
    });
    await emitEvent({
        eventId: generateEventId(),
        type: 'phase_changed',
        configId,
        timestamp: now,
        data: { previousPhase: 'draining', newPhase: 'cleanup' },
    });
    const hookList = hooks.get(configId) ?? [];
    const mutableStats = statistics;
    for (let i = 0; i < hookList.length; i++) {
        const hook = hookList[i];
        if (hook.executed) {
            continue;
        }
        await emitEvent({
            eventId: generateEventId(),
            type: 'hook_started',
            configId,
            timestamp: clock.nowMs(),
            data: { hookId: hook.hookId, name: hook.name },
        });
        try {
            const hookPromise = Promise.resolve(hook.handler());
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Hook timeout')), hook.timeout);
            });
            await Promise.race([hookPromise, timeoutPromise]);
            const executedHook = {
                ...hook,
                executed: true,
                executedAt: clock.nowMs(),
                success: true,
            };
            hookList[i] = executedHook;
            mutableStats.totalHooksExecuted++;
            await emitEvent({
                eventId: generateEventId(),
                type: 'hook_completed',
                configId,
                timestamp: clock.nowMs(),
                data: { hookId: hook.hookId, name: hook.name },
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const failedHook = {
                ...hook,
                executed: true,
                executedAt: clock.nowMs(),
                success: false,
                error: errorMessage,
            };
            hookList[i] = failedHook;
            mutableStats.totalHooksExecuted++;
            mutableStats.failedHooks++;
            const currentState = states.get(configId);
            if (currentState) {
                const shutdownError = {
                    errorId: generateErrorId(),
                    phase: 'cleanup',
                    hookId: hook.hookId,
                    message: errorMessage,
                    timestamp: clock.nowMs(),
                };
                const updatedState = {
                    ...currentState,
                    errors: [...currentState.errors, shutdownError],
                };
                states.set(configId, updatedState);
            }
            const eventType = errorMessage === 'Hook timeout' ? 'hook_timeout' : 'hook_failed';
            await emitEvent({
                eventId: generateEventId(),
                type: eventType,
                configId,
                timestamp: clock.nowMs(),
                data: { hookId: hook.hookId, name: hook.name, error: errorMessage },
            });
        }
        const updatedState = states.get(configId);
        if (updatedState) {
            const completedCount = hookList.filter(h => h.executed).length;
            const newState = {
                ...updatedState,
                completedHooks: completedCount,
            };
            states.set(configId, newState);
        }
    }
    hooks.set(configId, hookList);
    await emitEvent({
        eventId: generateEventId(),
        type: 'cleanup_completed',
        configId,
        timestamp: clock.nowMs(),
        data: {},
    });
}
/**
 * Execute finalize phase
 */
async function executeFinalizePhase(configId) {
    const config = configs.get(configId);
    const state = states.get(configId);
    if (!config || !state) {
        return;
    }
    const now = clock.nowMs();
    const finalizingState = {
        ...state,
        phase: 'finalizing',
    };
    states.set(configId, finalizingState);
    await emitEvent({
        eventId: generateEventId(),
        type: 'phase_changed',
        configId,
        timestamp: now,
        data: { previousPhase: 'cleanup', newPhase: 'finalizing' },
    });
    const terminatedState = {
        ...finalizingState,
        phase: 'terminated',
        completedAt: clock.nowMs(),
    };
    states.set(configId, terminatedState);
    const mutableStats = statistics;
    if (terminatedState.errors.length === 0) {
        mutableStats.successfulShutdowns++;
    }
    else {
        mutableStats.failedShutdowns++;
    }
    const duration = terminatedState.completedAt - terminatedState.initiatedAt;
    const totalSuccessful = mutableStats.successfulShutdowns;
    mutableStats.averageShutdownDuration =
        (mutableStats.averageShutdownDuration * (totalSuccessful - 1) + duration) / totalSuccessful;
    await emitEvent({
        eventId: generateEventId(),
        type: 'shutdown_completed',
        configId,
        timestamp: clock.nowMs(),
        data: { duration, errors: terminatedState.errors.length },
    });
    await emitEvent({
        eventId: generateEventId(),
        type: 'phase_changed',
        configId,
        timestamp: clock.nowMs(),
        data: { previousPhase: 'finalizing', newPhase: 'terminated' },
    });
}
/**
 * Force shutdown
 */
async function forceShutdown(nameOrId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    const state = states.get(config.configId);
    if (!state) {
        return false;
    }
    const mutableStats = statistics;
    mutableStats.forcedShutdowns++;
    const terminatedState = {
        ...state,
        phase: 'terminated',
        completedAt: clock.nowMs(),
    };
    states.set(config.configId, terminatedState);
    await emitEvent({
        eventId: generateEventId(),
        type: 'force_kill',
        configId: config.configId,
        timestamp: clock.nowMs(),
        data: {},
    });
    return true;
}
// ============================================================================
// STATE QUERIES
// ============================================================================
/**
 * Get shutdown state
 */
function getShutdownState(nameOrId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    return states.get(config.configId) ?? null;
}
/**
 * Is shutting down
 */
function isShuttingDown(nameOrId) {
    const state = getShutdownState(nameOrId);
    if (!state) {
        return false;
    }
    return state.phase !== 'running' && state.phase !== 'terminated';
}
/**
 * Is terminated
 */
function isTerminated(nameOrId) {
    const state = getShutdownState(nameOrId);
    return state?.phase === 'terminated';
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
        totalShutdowns: 0,
        successfulShutdowns: 0,
        failedShutdowns: 0,
        forcedShutdowns: 0,
        totalHooksExecuted: 0,
        failedHooks: 0,
        averageShutdownDuration: 0,
        totalConnectionsDrained: 0,
        totalRequestsCompleted: 0,
        totalRequestsAborted: 0,
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
    hooks.clear();
    connections.clear();
    requests.clear();
    eventListeners.clear();
    resetStatistics();
}
