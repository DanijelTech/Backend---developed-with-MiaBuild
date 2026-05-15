"use strict";
/**
 * @file Connection Pool za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-RES-007 Connection pool za zaledne sisteme
 * @design DSN-ZALEDNI-RES-007 Backend connection pool arhitektura
 * @test TEST-ZALEDNI-RES-007 Preverjanje connection pool
 *
 * Connection Pool - prilagojen za zaledne sisteme:
 * - Connection lifecycle management
 * - Pool sizing
 * - Connection validation
 * - Idle connection handling
 * - Connection reuse
 * - Health monitoring
 * - Metrics collection
 * - Event notifications
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom RES_007 - Connection Pool
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConnectionPool = createConnectionPool;
exports.getConnectionPoolConfig = getConnectionPoolConfig;
exports.getAllConnectionPoolConfigs = getAllConnectionPoolConfigs;
exports.closeConnectionPool = closeConnectionPool;
exports.acquireConnection = acquireConnection;
exports.releaseConnection = releaseConnection;
exports.getPoolState = getPoolState;
exports.getPoolConnections = getPoolConnections;
exports.getIdleConnections = getIdleConnections;
exports.getInUseConnections = getInUseConnections;
exports.evictIdleConnections = evictIdleConnections;
exports.validateAllConnections = validateAllConnections;
exports.resizePool = resizePool;
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
const pools = new Map();
const poolStates = new Map();
const pendingAcquires = new Map();
const factories = new Map();
const validators = new Map();
const destroyers = new Map();
const eventListeners = new Set();
let configCounter = 0;
let connectionCounter = 0;
let stateCounter = 0;
let requestCounter = 0;
let eventCounter = 0;
const statistics = {
    totalPools: 0,
    totalConnections: 0,
    idleConnections: 0,
    inUseConnections: 0,
    totalAcquires: 0,
    successfulAcquires: 0,
    failedAcquires: 0,
    totalReleases: 0,
    totalValidations: 0,
    failedValidations: 0,
    averageAcquireTime: 0,
    averageUseTime: 0,
};
// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================
/**
 * Generate config ID
 */
function generateConfigId() {
    configCounter++;
    return (0, deterministic_1.generateDeterministicId)(`pool-config-${configCounter}`);
}
/**
 * Generate connection ID
 */
function generateConnectionId() {
    connectionCounter++;
    return (0, deterministic_1.generateDeterministicId)(`pool-conn-${connectionCounter}`);
}
/**
 * Generate state ID
 */
function generateStateId() {
    stateCounter++;
    return (0, deterministic_1.generateDeterministicId)(`pool-state-${stateCounter}`);
}
/**
 * Generate request ID
 */
function generateRequestId() {
    requestCounter++;
    return (0, deterministic_1.generateDeterministicId)(`acquire-req-${requestCounter}`);
}
/**
 * Generate event ID
 */
function generateEventId() {
    eventCounter++;
    return (0, deterministic_1.generateDeterministicId)(`pool-event-${eventCounter}`);
}
/**
 * Emit pool event
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
    mutableStats.totalPools = configs.size;
    mutableStats.totalConnections = 0;
    mutableStats.idleConnections = 0;
    mutableStats.inUseConnections = 0;
    for (const pool of pools.values()) {
        mutableStats.totalConnections += pool.length;
        mutableStats.idleConnections += pool.filter(c => c.state === 'idle').length;
        mutableStats.inUseConnections += pool.filter(c => c.state === 'in_use').length;
    }
}
/**
 * Initialize pool state
 */
function initializePoolState(poolId) {
    return {
        stateId: generateStateId(),
        poolId,
        state: 'initializing',
        totalConnections: 0,
        idleConnections: 0,
        inUseConnections: 0,
        pendingAcquires: 0,
        createdConnections: 0,
        destroyedConnections: 0,
        failedAcquires: 0,
        failedValidations: 0,
    };
}
/**
 * Update pool state
 */
function updatePoolState(poolId) {
    const pool = pools.get(poolId) ?? [];
    const pending = pendingAcquires.get(poolId) ?? [];
    const currentState = poolStates.get(poolId);
    if (!currentState) {
        return;
    }
    const updatedState = {
        ...currentState,
        totalConnections: pool.length,
        idleConnections: pool.filter(c => c.state === 'idle').length,
        inUseConnections: pool.filter(c => c.state === 'in_use').length,
        pendingAcquires: pending.length,
    };
    poolStates.set(poolId, updatedState);
}
/**
 * Check if connection is expired
 */
function isConnectionExpired(connection, config) {
    const now = clock.nowMs();
    if (config.maxLifetime > 0 && now - connection.createdAt > config.maxLifetime) {
        return true;
    }
    if (connection.state === 'idle' && config.idleTimeout > 0) {
        if (now - connection.lastUsedAt > config.idleTimeout) {
            return true;
        }
    }
    return false;
}
// ============================================================================
// POOL MANAGEMENT
// ============================================================================
/**
 * Create connection pool
 */
async function createConnectionPool(name, factory, options = {}) {
    const configId = generateConfigId();
    const config = {
        configId,
        name,
        minSize: options.minSize ?? 2,
        maxSize: options.maxSize ?? 10,
        acquireTimeout: options.acquireTimeout ?? 30000,
        idleTimeout: options.idleTimeout ?? 300000,
        maxLifetime: options.maxLifetime ?? 3600000,
        validationInterval: options.validationInterval ?? 30000,
        validationStrategy: options.validationStrategy ?? 'on_acquire',
        testOnAcquire: options.testOnAcquire ?? true,
        testOnRelease: options.testOnRelease ?? false,
        enabled: true,
        metadata: options.metadata ?? {},
    };
    configs.set(configId, config);
    configs.set(name, config);
    pools.set(configId, []);
    poolStates.set(configId, initializePoolState(configId));
    pendingAcquires.set(configId, []);
    factories.set(configId, factory);
    if (options.validator) {
        validators.set(configId, options.validator);
    }
    if (options.destroyer) {
        destroyers.set(configId, options.destroyer);
    }
    await emitEvent({
        eventId: generateEventId(),
        type: 'pool_created',
        poolId: configId,
        connectionId: null,
        timestamp: clock.nowMs(),
        data: { name, minSize: config.minSize, maxSize: config.maxSize },
    });
    for (let i = 0; i < config.minSize; i++) {
        await createConnection(configId);
    }
    const state = poolStates.get(configId);
    if (state) {
        const updatedState = {
            ...state,
            state: 'running',
        };
        poolStates.set(configId, updatedState);
    }
    updateStatistics();
    return config;
}
/**
 * Get connection pool config
 */
function getConnectionPoolConfig(nameOrId) {
    return configs.get(nameOrId) ?? null;
}
/**
 * Get all connection pool configs
 */
function getAllConnectionPoolConfigs() {
    const uniqueConfigs = new Map();
    for (const config of configs.values()) {
        uniqueConfigs.set(config.configId, config);
    }
    return Array.from(uniqueConfigs.values());
}
/**
 * Close connection pool
 */
async function closeConnectionPool(nameOrId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    const state = poolStates.get(config.configId);
    if (state) {
        const updatedState = {
            ...state,
            state: 'draining',
        };
        poolStates.set(config.configId, updatedState);
    }
    const pool = pools.get(config.configId) ?? [];
    const destroyer = destroyers.get(config.configId);
    for (const connection of pool) {
        if (destroyer) {
            try {
                await destroyer(connection.resource);
            }
            catch {
                // Ignore destroy errors
            }
        }
        await emitEvent({
            eventId: generateEventId(),
            type: 'connection_destroyed',
            poolId: config.configId,
            connectionId: connection.connectionId,
            timestamp: clock.nowMs(),
            data: {},
        });
    }
    configs.delete(config.configId);
    configs.delete(config.name);
    pools.delete(config.configId);
    poolStates.delete(config.configId);
    pendingAcquires.delete(config.configId);
    factories.delete(config.configId);
    validators.delete(config.configId);
    destroyers.delete(config.configId);
    await emitEvent({
        eventId: generateEventId(),
        type: 'pool_closed',
        poolId: config.configId,
        connectionId: null,
        timestamp: clock.nowMs(),
        data: {},
    });
    updateStatistics();
    return true;
}
// ============================================================================
// CONNECTION MANAGEMENT
// ============================================================================
/**
 * Create connection
 */
async function createConnection(poolId) {
    const config = configs.get(poolId);
    const factory = factories.get(poolId);
    if (!config || !factory) {
        return null;
    }
    const pool = pools.get(poolId) ?? [];
    if (pool.length >= config.maxSize) {
        return null;
    }
    try {
        const resource = await factory();
        const now = clock.nowMs();
        const connection = {
            connectionId: generateConnectionId(),
            poolId,
            state: 'idle',
            resource: resource,
            createdAt: now,
            lastUsedAt: now,
            lastValidatedAt: null,
            useCount: 0,
            metadata: {},
        };
        pool.push(connection);
        pools.set(poolId, pool);
        const state = poolStates.get(poolId);
        if (state) {
            const updatedState = {
                ...state,
                createdConnections: state.createdConnections + 1,
            };
            poolStates.set(poolId, updatedState);
        }
        await emitEvent({
            eventId: generateEventId(),
            type: 'connection_created',
            poolId,
            connectionId: connection.connectionId,
            timestamp: now,
            data: {},
        });
        updatePoolState(poolId);
        return connection;
    }
    catch {
        return null;
    }
}
/**
 * Destroy connection
 */
async function destroyConnection(poolId, connectionId) {
    const pool = pools.get(poolId);
    if (!pool) {
        return false;
    }
    const index = pool.findIndex(c => c.connectionId === connectionId);
    if (index === -1) {
        return false;
    }
    const connection = pool[index];
    const destroyer = destroyers.get(poolId);
    if (destroyer) {
        try {
            await destroyer(connection.resource);
        }
        catch {
            // Ignore destroy errors
        }
    }
    pool.splice(index, 1);
    pools.set(poolId, pool);
    const state = poolStates.get(poolId);
    if (state) {
        const updatedState = {
            ...state,
            destroyedConnections: state.destroyedConnections + 1,
        };
        poolStates.set(poolId, updatedState);
    }
    await emitEvent({
        eventId: generateEventId(),
        type: 'connection_destroyed',
        poolId,
        connectionId,
        timestamp: clock.nowMs(),
        data: {},
    });
    updatePoolState(poolId);
    return true;
}
/**
 * Validate connection
 */
async function validateConnection(poolId, connection) {
    const validator = validators.get(poolId);
    if (!validator) {
        return true;
    }
    const mutableStats = statistics;
    mutableStats.totalValidations++;
    try {
        const isValid = await validator(connection.resource);
        if (isValid) {
            await emitEvent({
                eventId: generateEventId(),
                type: 'connection_validated',
                poolId,
                connectionId: connection.connectionId,
                timestamp: clock.nowMs(),
                data: {},
            });
            return true;
        }
        else {
            mutableStats.failedValidations++;
            const state = poolStates.get(poolId);
            if (state) {
                const updatedState = {
                    ...state,
                    failedValidations: state.failedValidations + 1,
                };
                poolStates.set(poolId, updatedState);
            }
            await emitEvent({
                eventId: generateEventId(),
                type: 'validation_failed',
                poolId,
                connectionId: connection.connectionId,
                timestamp: clock.nowMs(),
                data: {},
            });
            return false;
        }
    }
    catch {
        mutableStats.failedValidations++;
        await emitEvent({
            eventId: generateEventId(),
            type: 'validation_failed',
            poolId,
            connectionId: connection.connectionId,
            timestamp: clock.nowMs(),
            data: { error: 'Validation threw exception' },
        });
        return false;
    }
}
// ============================================================================
// ACQUIRE AND RELEASE
// ============================================================================
/**
 * Acquire connection
 */
async function acquireConnection(nameOrId, options = {}) {
    const config = configs.get(nameOrId);
    if (!config) {
        throw new Error(`Connection pool '${nameOrId}' not found`);
    }
    const pool = pools.get(config.configId) ?? [];
    const now = clock.nowMs();
    const timeout = options.timeout ?? config.acquireTimeout;
    const deadline = now + timeout;
    const mutableStats = statistics;
    mutableStats.totalAcquires++;
    while (clock.nowMs() < deadline) {
        for (let i = 0; i < pool.length; i++) {
            const connection = pool[i];
            if (connection.state !== 'idle') {
                continue;
            }
            if (isConnectionExpired(connection, config)) {
                await destroyConnection(config.configId, connection.connectionId);
                continue;
            }
            if (config.testOnAcquire) {
                const isValid = await validateConnection(config.configId, connection);
                if (!isValid) {
                    await destroyConnection(config.configId, connection.connectionId);
                    continue;
                }
            }
            const acquiredConnection = {
                ...connection,
                state: 'in_use',
                lastUsedAt: clock.nowMs(),
                useCount: connection.useCount + 1,
                lastValidatedAt: config.testOnAcquire ? clock.nowMs() : connection.lastValidatedAt,
            };
            pool[i] = acquiredConnection;
            pools.set(config.configId, pool);
            const acquireTime = clock.nowMs() - now;
            mutableStats.successfulAcquires++;
            mutableStats.averageAcquireTime =
                (mutableStats.averageAcquireTime * (mutableStats.successfulAcquires - 1) + acquireTime) /
                    mutableStats.successfulAcquires;
            await emitEvent({
                eventId: generateEventId(),
                type: 'connection_acquired',
                poolId: config.configId,
                connectionId: connection.connectionId,
                timestamp: clock.nowMs(),
                data: { acquireTime },
            });
            updatePoolState(config.configId);
            return acquiredConnection;
        }
        if (pool.length < config.maxSize) {
            const newConnection = await createConnection(config.configId);
            if (newConnection) {
                const acquiredConnection = {
                    ...newConnection,
                    state: 'in_use',
                    lastUsedAt: clock.nowMs(),
                    useCount: 1,
                };
                const updatedPool = pools.get(config.configId) ?? [];
                const index = updatedPool.findIndex(c => c.connectionId === newConnection.connectionId);
                if (index !== -1) {
                    updatedPool[index] = acquiredConnection;
                    pools.set(config.configId, updatedPool);
                }
                const acquireTime = clock.nowMs() - now;
                mutableStats.successfulAcquires++;
                mutableStats.averageAcquireTime =
                    (mutableStats.averageAcquireTime * (mutableStats.successfulAcquires - 1) + acquireTime) /
                        mutableStats.successfulAcquires;
                await emitEvent({
                    eventId: generateEventId(),
                    type: 'connection_acquired',
                    poolId: config.configId,
                    connectionId: newConnection.connectionId,
                    timestamp: clock.nowMs(),
                    data: { acquireTime, newConnection: true },
                });
                updatePoolState(config.configId);
                return acquiredConnection;
            }
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    mutableStats.failedAcquires++;
    const state = poolStates.get(config.configId);
    if (state) {
        const updatedState = {
            ...state,
            failedAcquires: state.failedAcquires + 1,
        };
        poolStates.set(config.configId, updatedState);
    }
    await emitEvent({
        eventId: generateEventId(),
        type: 'acquire_timeout',
        poolId: config.configId,
        connectionId: null,
        timestamp: clock.nowMs(),
        data: { timeout },
    });
    throw new Error(`Acquire timeout after ${timeout}ms`);
}
/**
 * Release connection
 */
async function releaseConnection(nameOrId, connectionId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    const pool = pools.get(config.configId);
    if (!pool) {
        return false;
    }
    const index = pool.findIndex(c => c.connectionId === connectionId);
    if (index === -1) {
        return false;
    }
    const connection = pool[index];
    if (connection.state !== 'in_use') {
        return false;
    }
    const mutableStats = statistics;
    mutableStats.totalReleases++;
    if (config.testOnRelease) {
        const isValid = await validateConnection(config.configId, connection);
        if (!isValid) {
            await destroyConnection(config.configId, connectionId);
            if (pool.length < config.minSize) {
                await createConnection(config.configId);
            }
            return true;
        }
    }
    if (isConnectionExpired(connection, config)) {
        await destroyConnection(config.configId, connectionId);
        if (pool.length < config.minSize) {
            await createConnection(config.configId);
        }
        return true;
    }
    const releasedConnection = {
        ...connection,
        state: 'idle',
        lastUsedAt: clock.nowMs(),
        lastValidatedAt: config.testOnRelease ? clock.nowMs() : connection.lastValidatedAt,
    };
    pool[index] = releasedConnection;
    pools.set(config.configId, pool);
    await emitEvent({
        eventId: generateEventId(),
        type: 'connection_released',
        poolId: config.configId,
        connectionId,
        timestamp: clock.nowMs(),
        data: {},
    });
    updatePoolState(config.configId);
    return true;
}
// ============================================================================
// POOL STATE
// ============================================================================
/**
 * Get pool state
 */
function getPoolState(nameOrId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    updatePoolState(config.configId);
    return poolStates.get(config.configId) ?? null;
}
/**
 * Get pool connections
 */
function getPoolConnections(nameOrId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return [];
    }
    return (pools.get(config.configId) ?? []);
}
/**
 * Get idle connections
 */
function getIdleConnections(nameOrId) {
    const connections = getPoolConnections(nameOrId);
    return connections.filter(c => c.state === 'idle');
}
/**
 * Get in-use connections
 */
function getInUseConnections(nameOrId) {
    const connections = getPoolConnections(nameOrId);
    return connections.filter(c => c.state === 'in_use');
}
// ============================================================================
// MAINTENANCE
// ============================================================================
/**
 * Evict idle connections
 */
async function evictIdleConnections(nameOrId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return 0;
    }
    const pool = pools.get(config.configId) ?? [];
    let evictedCount = 0;
    for (const connection of pool) {
        if (connection.state === 'idle' && isConnectionExpired(connection, config)) {
            if (pool.length - evictedCount > config.minSize) {
                await destroyConnection(config.configId, connection.connectionId);
                evictedCount++;
                await emitEvent({
                    eventId: generateEventId(),
                    type: 'idle_timeout',
                    poolId: config.configId,
                    connectionId: connection.connectionId,
                    timestamp: clock.nowMs(),
                    data: {},
                });
            }
        }
    }
    return evictedCount;
}
/**
 * Validate all connections
 */
async function validateAllConnections(nameOrId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return 0;
    }
    const pool = pools.get(config.configId) ?? [];
    let invalidCount = 0;
    for (const connection of pool) {
        if (connection.state === 'idle') {
            const isValid = await validateConnection(config.configId, connection);
            if (!isValid) {
                await destroyConnection(config.configId, connection.connectionId);
                invalidCount++;
            }
        }
    }
    const currentPool = pools.get(config.configId) ?? [];
    while (currentPool.length < config.minSize) {
        await createConnection(config.configId);
    }
    return invalidCount;
}
/**
 * Resize pool
 */
async function resizePool(nameOrId, newMinSize, newMaxSize) {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    const updatedConfig = {
        ...config,
        minSize: newMinSize,
        maxSize: newMaxSize,
    };
    configs.set(config.configId, updatedConfig);
    configs.set(config.name, updatedConfig);
    const pool = pools.get(config.configId) ?? [];
    while (pool.length < newMinSize) {
        await createConnection(config.configId);
    }
    while (pool.length > newMaxSize) {
        const idleConnection = pool.find(c => c.state === 'idle');
        if (idleConnection) {
            await destroyConnection(config.configId, idleConnection.connectionId);
        }
        else {
            break;
        }
    }
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
        totalPools: 0,
        totalConnections: 0,
        idleConnections: 0,
        inUseConnections: 0,
        totalAcquires: 0,
        successfulAcquires: 0,
        failedAcquires: 0,
        totalReleases: 0,
        totalValidations: 0,
        failedValidations: 0,
        averageAcquireTime: 0,
        averageUseTime: 0,
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
    pools.clear();
    poolStates.clear();
    pendingAcquires.clear();
    factories.clear();
    validators.clear();
    destroyers.clear();
    eventListeners.clear();
    resetStatistics();
}
