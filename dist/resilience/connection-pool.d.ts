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
export type PoolEventType = 'pool_created' | 'pool_closed' | 'connection_created' | 'connection_acquired' | 'connection_released' | 'connection_validated' | 'connection_invalidated' | 'connection_destroyed' | 'connection_timeout' | 'acquire_timeout' | 'validation_failed' | 'pool_exhausted' | 'idle_timeout';
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
/**
 * Create connection pool
 */
export declare function createConnectionPool<T>(name: string, factory: ConnectionFactory<T>, options?: {
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
}): Promise<ConnectionPoolConfig>;
/**
 * Get connection pool config
 */
export declare function getConnectionPoolConfig(nameOrId: string): ConnectionPoolConfig | null;
/**
 * Get all connection pool configs
 */
export declare function getAllConnectionPoolConfigs(): readonly ConnectionPoolConfig[];
/**
 * Close connection pool
 */
export declare function closeConnectionPool(nameOrId: string): Promise<boolean>;
/**
 * Acquire connection
 */
export declare function acquireConnection<T>(nameOrId: string, options?: {
    timeout?: number;
    priority?: number;
}): Promise<PoolConnection<T>>;
/**
 * Release connection
 */
export declare function releaseConnection<T>(nameOrId: string, connectionId: string): Promise<boolean>;
/**
 * Get pool state
 */
export declare function getPoolState(nameOrId: string): PoolStateInfo | null;
/**
 * Get pool connections
 */
export declare function getPoolConnections<T>(nameOrId: string): readonly PoolConnection<T>[];
/**
 * Get idle connections
 */
export declare function getIdleConnections<T>(nameOrId: string): readonly PoolConnection<T>[];
/**
 * Get in-use connections
 */
export declare function getInUseConnections<T>(nameOrId: string): readonly PoolConnection<T>[];
/**
 * Evict idle connections
 */
export declare function evictIdleConnections(nameOrId: string): Promise<number>;
/**
 * Validate all connections
 */
export declare function validateAllConnections(nameOrId: string): Promise<number>;
/**
 * Resize pool
 */
export declare function resizePool(nameOrId: string, newMinSize: number, newMaxSize: number): Promise<boolean>;
/**
 * Get statistics
 */
export declare function getStatistics(): Readonly<PoolStatistics>;
/**
 * Reset statistics
 */
export declare function resetStatistics(): void;
/**
 * Add event listener
 */
export declare function addEventListener(listener: PoolEventListener): void;
/**
 * Remove event listener
 */
export declare function removeEventListener(listener: PoolEventListener): void;
/**
 * Clear event listeners
 */
export declare function clearEventListeners(): void;
/**
 * Clear all state
 */
export declare function clearAll(): void;
