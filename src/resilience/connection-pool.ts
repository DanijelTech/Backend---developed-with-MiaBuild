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

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI ZA CONNECTION POOL
// ============================================================================

/**
 * Connection state
 */
export type ConnectionState = 'idle' | 'in_use' | 'validating' | 'invalid' | 'closed';

/**
 * Pool state
 */
export type PoolState = 'initializing' | 'running' | 'draining' | 'closed';

/**
 * Validation strategy
 */
export type ValidationStrategy = 'on_acquire' | 'on_release' | 'periodic' | 'none';

/**
 * Connection pool configuration
 */
export interface ConnectionPoolConfig {
    readonly configId: string;
    readonly name: string;
    readonly minSize: number;
    readonly maxSize: number;
    readonly acquireTimeout: number;
    readonly idleTimeout: number;
    readonly maxLifetime: number;
    readonly validationInterval: number;
    readonly validationStrategy: ValidationStrategy;
    readonly testOnAcquire: boolean;
    readonly testOnRelease: boolean;
    readonly enabled: boolean;
    readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Pool connection
 */
export interface PoolConnection<T> {
    readonly connectionId: string;
    readonly poolId: string;
    readonly state: ConnectionState;
    readonly resource: T;
    readonly createdAt: number;
    readonly lastUsedAt: number;
    readonly lastValidatedAt: number | null;
    readonly useCount: number;
    readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Pool state info
 */
export interface PoolStateInfo {
    readonly stateId: string;
    readonly poolId: string;
    readonly state: PoolState;
    readonly totalConnections: number;
    readonly idleConnections: number;
    readonly inUseConnections: number;
    readonly pendingAcquires: number;
    readonly createdConnections: number;
    readonly destroyedConnections: number;
    readonly failedAcquires: number;
    readonly failedValidations: number;
}

/**
 * Acquire request
 */
export interface AcquireRequest {
    readonly requestId: string;
    readonly poolId: string;
    readonly timestamp: number;
    readonly timeout: number;
    readonly priority: number;
}

/**
 * Connection factory
 */
export type ConnectionFactory<T> = () => T | Promise<T>;

/**
 * Connection validator
 */
export type ConnectionValidator<T> = (connection: T) => boolean | Promise<boolean>;

/**
 * Connection destroyer
 */
export type ConnectionDestroyer<T> = (connection: T) => void | Promise<void>;

/**
 * Pool event
 */
export interface PoolEvent {
    readonly eventId: string;
    readonly type: PoolEventType;
    readonly poolId: string | null;
    readonly connectionId: string | null;
    readonly timestamp: number;
    readonly data: Readonly<Record<string, unknown>>;
}

/**
 * Pool event type
 */
export type PoolEventType =
    | 'pool_created'
    | 'pool_closed'
    | 'connection_created'
    | 'connection_acquired'
    | 'connection_released'
    | 'connection_validated'
    | 'connection_invalidated'
    | 'connection_destroyed'
    | 'connection_timeout'
    | 'acquire_timeout'
    | 'validation_failed'
    | 'pool_exhausted'
    | 'idle_timeout';

/**
 * Pool event listener
 */
export type PoolEventListener = (event: PoolEvent) => void | Promise<void>;

/**
 * Pool statistics
 */
export interface PoolStatistics {
    readonly totalPools: number;
    readonly totalConnections: number;
    readonly idleConnections: number;
    readonly inUseConnections: number;
    readonly totalAcquires: number;
    readonly successfulAcquires: number;
    readonly failedAcquires: number;
    readonly totalReleases: number;
    readonly totalValidations: number;
    readonly failedValidations: number;
    readonly averageAcquireTime: number;
    readonly averageUseTime: number;
}

// ============================================================================
// STANJE
// ============================================================================

const configs: Map<string, ConnectionPoolConfig> = new Map();
const pools: Map<string, PoolConnection<unknown>[]> = new Map();
const poolStates: Map<string, PoolStateInfo> = new Map();
const pendingAcquires: Map<string, AcquireRequest[]> = new Map();
const factories: Map<string, ConnectionFactory<unknown>> = new Map();
const validators: Map<string, ConnectionValidator<unknown>> = new Map();
const destroyers: Map<string, ConnectionDestroyer<unknown>> = new Map();
const eventListeners: Set<PoolEventListener> = new Set();

let configCounter = 0;
let connectionCounter = 0;
let stateCounter = 0;
let requestCounter = 0;
let eventCounter = 0;

const statistics: PoolStatistics = {
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
function generateConfigId(): string {
    configCounter++;
    return generateDeterministicId(`pool-config-${configCounter}`);
}

/**
 * Generate connection ID
 */
function generateConnectionId(): string {
    connectionCounter++;
    return generateDeterministicId(`pool-conn-${connectionCounter}`);
}

/**
 * Generate state ID
 */
function generateStateId(): string {
    stateCounter++;
    return generateDeterministicId(`pool-state-${stateCounter}`);
}

/**
 * Generate request ID
 */
function generateRequestId(): string {
    requestCounter++;
    return generateDeterministicId(`acquire-req-${requestCounter}`);
}

/**
 * Generate event ID
 */
function generateEventId(): string {
    eventCounter++;
    return generateDeterministicId(`pool-event-${eventCounter}`);
}

/**
 * Emit pool event
 */
async function emitEvent(event: PoolEvent): Promise<void> {
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
function updateStatistics(): void {
    const mutableStats = statistics as {
        totalPools: number;
        totalConnections: number;
        idleConnections: number;
        inUseConnections: number;
    };
    
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
function initializePoolState(poolId: string): PoolStateInfo {
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
function updatePoolState(poolId: string): void {
    const pool = pools.get(poolId) ?? [];
    const pending = pendingAcquires.get(poolId) ?? [];
    const currentState = poolStates.get(poolId);
    
    if (!currentState) {
        return;
    }
    
    const updatedState: PoolStateInfo = {
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
function isConnectionExpired(connection: PoolConnection<unknown>, config: ConnectionPoolConfig): boolean {
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
export async function createConnectionPool<T>(
    name: string,
    factory: ConnectionFactory<T>,
    options: {
        minSize?: number;
        maxSize?: number;
        acquireTimeout?: number;
        idleTimeout?: number;
        maxLifetime?: number;
        validationInterval?: number;
        validationStrategy?: ValidationStrategy;
        testOnAcquire?: boolean;
        testOnRelease?: boolean;
        validator?: ConnectionValidator<T>;
        destroyer?: ConnectionDestroyer<T>;
        metadata?: Record<string, unknown>;
    } = {}
): Promise<ConnectionPoolConfig> {
    const configId = generateConfigId();
    
    const config: ConnectionPoolConfig = {
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
    factories.set(configId, factory as ConnectionFactory<unknown>);
    
    if (options.validator) {
        validators.set(configId, options.validator as ConnectionValidator<unknown>);
    }
    
    if (options.destroyer) {
        destroyers.set(configId, options.destroyer as ConnectionDestroyer<unknown>);
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
        const updatedState: PoolStateInfo = {
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
export function getConnectionPoolConfig(nameOrId: string): ConnectionPoolConfig | null {
    return configs.get(nameOrId) ?? null;
}

/**
 * Get all connection pool configs
 */
export function getAllConnectionPoolConfigs(): readonly ConnectionPoolConfig[] {
    const uniqueConfigs = new Map<string, ConnectionPoolConfig>();
    for (const config of configs.values()) {
        uniqueConfigs.set(config.configId, config);
    }
    return Array.from(uniqueConfigs.values());
}

/**
 * Close connection pool
 */
export async function closeConnectionPool(nameOrId: string): Promise<boolean> {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    
    const state = poolStates.get(config.configId);
    if (state) {
        const updatedState: PoolStateInfo = {
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
            } catch {
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
async function createConnection<T>(poolId: string): Promise<PoolConnection<T> | null> {
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
        
        const connection: PoolConnection<T> = {
            connectionId: generateConnectionId(),
            poolId,
            state: 'idle',
            resource: resource as T,
            createdAt: now,
            lastUsedAt: now,
            lastValidatedAt: null,
            useCount: 0,
            metadata: {},
        };
        
        pool.push(connection as PoolConnection<unknown>);
        pools.set(poolId, pool);
        
        const state = poolStates.get(poolId);
        if (state) {
            const updatedState: PoolStateInfo = {
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
    } catch {
        return null;
    }
}

/**
 * Destroy connection
 */
async function destroyConnection(poolId: string, connectionId: string): Promise<boolean> {
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
        } catch {
            // Ignore destroy errors
        }
    }
    
    pool.splice(index, 1);
    pools.set(poolId, pool);
    
    const state = poolStates.get(poolId);
    if (state) {
        const updatedState: PoolStateInfo = {
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
async function validateConnection<T>(poolId: string, connection: PoolConnection<T>): Promise<boolean> {
    const validator = validators.get(poolId);
    
    if (!validator) {
        return true;
    }
    
    const mutableStats = statistics as {
        totalValidations: number;
        failedValidations: number;
    };
    
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
        } else {
            mutableStats.failedValidations++;
            
            const state = poolStates.get(poolId);
            if (state) {
                const updatedState: PoolStateInfo = {
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
    } catch {
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
export async function acquireConnection<T>(
    nameOrId: string,
    options: {
        timeout?: number;
        priority?: number;
    } = {}
): Promise<PoolConnection<T>> {
    const config = configs.get(nameOrId);
    if (!config) {
        throw new Error(`Connection pool '${nameOrId}' not found`);
    }
    
    const pool = pools.get(config.configId) ?? [];
    const now = clock.nowMs();
    const timeout = options.timeout ?? config.acquireTimeout;
    const deadline = now + timeout;
    
    const mutableStats = statistics as {
        totalAcquires: number;
        successfulAcquires: number;
        failedAcquires: number;
        averageAcquireTime: number;
    };
    
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
            
            const acquiredConnection: PoolConnection<T> = {
                ...connection,
                state: 'in_use',
                lastUsedAt: clock.nowMs(),
                useCount: connection.useCount + 1,
                lastValidatedAt: config.testOnAcquire ? clock.nowMs() : connection.lastValidatedAt,
            } as PoolConnection<T>;
            
            pool[i] = acquiredConnection as PoolConnection<unknown>;
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
            const newConnection = await createConnection<T>(config.configId);
            if (newConnection) {
                const acquiredConnection: PoolConnection<T> = {
                    ...newConnection,
                    state: 'in_use',
                    lastUsedAt: clock.nowMs(),
                    useCount: 1,
                };
                
                const updatedPool = pools.get(config.configId) ?? [];
                const index = updatedPool.findIndex(c => c.connectionId === newConnection.connectionId);
                if (index !== -1) {
                    updatedPool[index] = acquiredConnection as PoolConnection<unknown>;
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
        const updatedState: PoolStateInfo = {
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
export async function releaseConnection<T>(
    nameOrId: string,
    connectionId: string
): Promise<boolean> {
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
    
    const mutableStats = statistics as { totalReleases: number };
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
    
    const releasedConnection: PoolConnection<unknown> = {
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
export function getPoolState(nameOrId: string): PoolStateInfo | null {
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
export function getPoolConnections<T>(nameOrId: string): readonly PoolConnection<T>[] {
    const config = configs.get(nameOrId);
    if (!config) {
        return [];
    }
    return (pools.get(config.configId) ?? []) as readonly PoolConnection<T>[];
}

/**
 * Get idle connections
 */
export function getIdleConnections<T>(nameOrId: string): readonly PoolConnection<T>[] {
    const connections = getPoolConnections<T>(nameOrId);
    return connections.filter(c => c.state === 'idle');
}

/**
 * Get in-use connections
 */
export function getInUseConnections<T>(nameOrId: string): readonly PoolConnection<T>[] {
    const connections = getPoolConnections<T>(nameOrId);
    return connections.filter(c => c.state === 'in_use');
}

// ============================================================================
// MAINTENANCE
// ============================================================================

/**
 * Evict idle connections
 */
export async function evictIdleConnections(nameOrId: string): Promise<number> {
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
export async function validateAllConnections(nameOrId: string): Promise<number> {
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
export async function resizePool(
    nameOrId: string,
    newMinSize: number,
    newMaxSize: number
): Promise<boolean> {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    
    const updatedConfig: ConnectionPoolConfig = {
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
        } else {
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
export function getStatistics(): Readonly<PoolStatistics> {
    updateStatistics();
    return { ...statistics };
}

/**
 * Reset statistics
 */
export function resetStatistics(): void {
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
export function addEventListener(listener: PoolEventListener): void {
    eventListeners.add(listener);
}

/**
 * Remove event listener
 */
export function removeEventListener(listener: PoolEventListener): void {
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
 * Clear all state
 */
export function clearAll(): void {
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
