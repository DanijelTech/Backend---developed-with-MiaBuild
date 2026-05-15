/**
 * @file Repository Pattern za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-DB-001 Repository pattern za zaledne sisteme
 * @design DSN-ZALEDNI-DB-001 Backend database arhitektura
 * @test TEST-ZALEDNI-DB-001 Preverjanje repository pattern
 *
 * Repository Pattern - prilagojen za zaledne sisteme:
 * - Abstrakcija dostopa do podatkov
 * - CRUD operacije
 * - Query builder
 * - Transaction support
 * - Connection pooling
 * - Prepared statements
 * - Batch operations
 * - Optimistic locking
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom DB_001 - Repository Pattern
 */
/**
 * Entity base interface
 */
export interface Entity {
    readonly id: string;
    readonly createdAt: number;
    readonly updatedAt: number;
    readonly version: number;
}
/**
 * Query filter operator
 */
export type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'like' | 'ilike' | 'between' | 'isNull' | 'isNotNull' | 'contains' | 'startsWith' | 'endsWith';
/**
 * Query filter
 */
export interface QueryFilter {
    readonly field: string;
    readonly operator: FilterOperator;
    readonly value: unknown;
}
/**
 * Query sort direction
 */
export type SortDirection = 'asc' | 'desc';
/**
 * Query sort
 */
export interface QuerySort {
    readonly field: string;
    readonly direction: SortDirection;
}
/**
 * Query options
 */
export interface QueryOptions {
    readonly filters: readonly QueryFilter[];
    readonly sorts: readonly QuerySort[];
    readonly limit: number | null;
    readonly offset: number | null;
    readonly select: readonly string[] | null;
    readonly include: readonly string[] | null;
}
/**
 * Query result
 */
export interface QueryResult<T> {
    readonly data: readonly T[];
    readonly total: number;
    readonly hasMore: boolean;
}
/**
 * Transaction isolation level
 */
export type IsolationLevel = 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
/**
 * Transaction options
 */
export interface TransactionOptions {
    readonly isolationLevel: IsolationLevel;
    readonly timeout: number;
    readonly readOnly: boolean;
}
/**
 * Transaction context
 */
export interface TransactionContext {
    readonly transactionId: string;
    readonly startedAt: number;
    readonly isolationLevel: IsolationLevel;
    readonly readOnly: boolean;
}
/**
 * Connection pool config
 */
export interface ConnectionPoolConfig {
    readonly minConnections: number;
    readonly maxConnections: number;
    readonly acquireTimeout: number;
    readonly idleTimeout: number;
    readonly connectionTimeout: number;
    readonly maxRetries: number;
    readonly retryDelay: number;
}
/**
 * Connection info
 */
export interface ConnectionInfo {
    readonly connectionId: string;
    readonly createdAt: number;
    readonly lastUsedAt: number;
    readonly useCount: number;
    readonly isIdle: boolean;
}
/**
 * Database connection
 */
export interface DatabaseConnection {
    readonly connectionId: string;
    execute<T>(query: string, params: readonly unknown[]): Promise<T[]>;
    executeOne<T>(query: string, params: readonly unknown[]): Promise<T | null>;
    executeCount(query: string, params: readonly unknown[]): Promise<number>;
    beginTransaction(options?: Partial<TransactionOptions>): Promise<TransactionContext>;
    commit(context: TransactionContext): Promise<void>;
    rollback(context: TransactionContext): Promise<void>;
    release(): void;
}
/**
 * Repository interface
 */
export interface Repository<T extends Entity> {
    findById(id: string): Promise<T | null>;
    findOne(options: Partial<QueryOptions>): Promise<T | null>;
    findMany(options?: Partial<QueryOptions>): Promise<QueryResult<T>>;
    findAll(): Promise<readonly T[]>;
    create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<T>;
    createMany(data: readonly Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'version'>[]): Promise<readonly T[]>;
    update(id: string, data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'version'>>): Promise<T | null>;
    updateMany(filter: readonly QueryFilter[], data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'version'>>): Promise<number>;
    delete(id: string): Promise<boolean>;
    deleteMany(filter: readonly QueryFilter[]): Promise<number>;
    count(filter?: readonly QueryFilter[]): Promise<number>;
    exists(id: string): Promise<boolean>;
}
/**
 * Unit of Work interface
 */
export interface UnitOfWork {
    readonly transactionId: string;
    begin(options?: Partial<TransactionOptions>): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    getRepository<T extends Entity>(name: string): Repository<T>;
}
/**
 * Query builder interface
 */
export interface QueryBuilder<T extends Entity> {
    select(...fields: string[]): QueryBuilder<T>;
    where(field: string, operator: FilterOperator, value: unknown): QueryBuilder<T>;
    andWhere(field: string, operator: FilterOperator, value: unknown): QueryBuilder<T>;
    orWhere(field: string, operator: FilterOperator, value: unknown): QueryBuilder<T>;
    orderBy(field: string, direction?: SortDirection): QueryBuilder<T>;
    limit(count: number): QueryBuilder<T>;
    offset(count: number): QueryBuilder<T>;
    include(...relations: string[]): QueryBuilder<T>;
    execute(): Promise<QueryResult<T>>;
    executeOne(): Promise<T | null>;
    count(): Promise<number>;
}
/**
 * Migration interface
 */
export interface Migration {
    readonly version: string;
    readonly name: string;
    readonly timestamp: number;
    up(connection: DatabaseConnection): Promise<void>;
    down(connection: DatabaseConnection): Promise<void>;
}
/**
 * Migration status
 */
export interface MigrationStatus {
    readonly version: string;
    readonly name: string;
    readonly appliedAt: number | null;
    readonly isApplied: boolean;
}
/**
 * Seed interface
 */
export interface Seed {
    readonly name: string;
    readonly order: number;
    run(connection: DatabaseConnection): Promise<void>;
}
/**
 * Database event
 */
export interface DatabaseEvent {
    readonly type: 'insert' | 'update' | 'delete';
    readonly table: string;
    readonly entityId: string;
    readonly timestamp: number;
    readonly changes: Readonly<Record<string, {
        old: unknown;
        new: unknown;
    }>>;
}
/**
 * Database event listener
 */
export type DatabaseEventListener = (event: DatabaseEvent) => void | Promise<void>;
/**
 * Optimistic lock error
 */
export declare class OptimisticLockError extends Error {
    readonly entityId: string;
    readonly expectedVersion: number;
    readonly actualVersion: number;
    constructor(entityId: string, expectedVersion: number, actualVersion: number);
}
/**
 * Entity not found error
 */
export declare class EntityNotFoundError extends Error {
    readonly entityType: string;
    readonly entityId: string;
    constructor(entityType: string, entityId: string);
}
/**
 * Duplicate entity error
 */
export declare class DuplicateEntityError extends Error {
    readonly entityType: string;
    readonly field: string;
    readonly value: unknown;
    constructor(entityType: string, field: string, value: unknown);
}
/**
 * Transaction error
 */
export declare class TransactionError extends Error {
    readonly transactionId: string;
    readonly reason: string;
    constructor(transactionId: string, reason: string);
}
/**
 * Configure connection pool
 */
export declare function configurePool(config: Partial<ConnectionPoolConfig>): void;
/**
 * Get pool configuration
 */
export declare function getPoolConfig(): Readonly<ConnectionPoolConfig>;
/**
 * Get connection from pool
 */
export declare function getConnection(): Promise<DatabaseConnection>;
/**
 * Get pool statistics
 */
export declare function getPoolStats(): {
    totalConnections: number;
    idleConnections: number;
    activeConnections: number;
};
/**
 * Create base repository
 */
export declare function createRepository<T extends Entity>(tableName: string, connection: DatabaseConnection): Repository<T>;
/**
 * Create query builder
 */
export declare function createQueryBuilder<T extends Entity>(tableName: string, connection: DatabaseConnection): QueryBuilder<T>;
/**
 * Create unit of work
 */
export declare function createUnitOfWork(): Promise<UnitOfWork>;
/**
 * Run migrations
 */
export declare function runMigrations(migrations: readonly Migration[], connection: DatabaseConnection): Promise<MigrationStatus[]>;
/**
 * Rollback migrations
 */
export declare function rollbackMigrations(migrations: readonly Migration[], connection: DatabaseConnection, count?: number): Promise<MigrationStatus[]>;
/**
 * Run seeds
 */
export declare function runSeeds(seeds: readonly Seed[], connection: DatabaseConnection): Promise<void>;
/**
 * Add database event listener
 */
export declare function addDatabaseEventListener(listener: DatabaseEventListener): void;
/**
 * Remove database event listener
 */
export declare function removeDatabaseEventListener(listener: DatabaseEventListener): void;
/**
 * Clear all event listeners
 */
export declare function clearDatabaseEventListeners(): void;
/**
 * Execute raw query
 */
export declare function executeRawQuery<T>(query: string, params: readonly unknown[], connection: DatabaseConnection): Promise<T[]>;
/**
 * Execute raw query and return single result
 */
export declare function executeRawQueryOne<T>(query: string, params: readonly unknown[], connection: DatabaseConnection): Promise<T | null>;
/**
 * Check database health
 */
export declare function checkDatabaseHealth(connection: DatabaseConnection): Promise<{
    healthy: boolean;
    latencyMs: number;
    message: string;
}>;
/**
 * Get table info
 */
export declare function getTableInfo(tableName: string, connection: DatabaseConnection): Promise<{
    name: string;
    columns: readonly {
        name: string;
        type: string;
        nullable: boolean;
    }[];
    primaryKey: string | null;
    indexes: readonly string[];
}>;
/**
 * Truncate table
 */
export declare function truncateTable(tableName: string, connection: DatabaseConnection, cascade?: boolean): Promise<void>;
/**
 * Drop table
 */
export declare function dropTable(tableName: string, connection: DatabaseConnection, ifExists?: boolean): Promise<void>;
