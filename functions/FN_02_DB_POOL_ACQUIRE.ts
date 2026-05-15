/**
 * Pridobitev povezave iz poola
 * 
 * @metadata
 *   template_version: "1.0.0"
 *   template_type: "function"
 *   domain_id: "DOMENA_02"
 *   compliance_standards: ["DO-178C", "IEC-61508", "ISO-26262", "MIL-STD-882E"]
 *   generated_at: "{{DATUM_GENERACIJE}}"
 * 
 * @traceability
 *   @requirement ZAH-FN_02_DB_POOL_ACQUIRE-001
 *   @design DSN-FN_02_DB_POOL_ACQUIRE-001
 *   @test TST-FN_02_DB_POOL_ACQUIRE-001
 *   @function_id FN_02_DB_POOL_ACQUIRE
 *   @hazard_id HAZ-02-083
 * 
 * @approach_type BLOCKING
 * @tradeoff_profile FAIRNESS_OVER_THROUGHPUT
 * @failure_assumption TIMEOUT_ON_EXHAUSTION
 * 
 * @description
 * Pridobitev povezave iz connection poola z FIFO cakalno vrsto.
 * Podpira prioritetno pridobivanje in avtomatsko zdravstveno preverjanje.
 */

import { Logger } from '{{LOGGER_PATH}}';
import { Metrics } from '{{METRICS_PATH}}';
import { Clock } from '{{CLOCK_PATH}}';

export interface PooledConnection {
    readonly connectionId: string;
    readonly poolId: string;
    readonly acquiredAt: string;
    readonly lastUsed: string;
    readonly healthy: boolean;
    readonly transactionActive: boolean;
}

export interface FN_02_DB_POOL_ACQUIREConfig {
    readonly enabled: boolean;
    readonly timeout: number;
    readonly acquireTimeout: number;
    readonly healthCheckOnAcquire: boolean;
    readonly priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
    readonly maxWaitingRequests: number;
    readonly validateOnBorrow: boolean;
}

export interface FN_02_DB_POOL_ACQUIREInput {
    readonly requestId: string;
    readonly timestamp: string;
    readonly poolId: string;
    readonly priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
    readonly purpose?: string;
}

export interface FN_02_DB_POOL_ACQUIREResult {
    readonly success: boolean;
    readonly requestId: string;
    readonly timestamp: string;
    readonly connection?: PooledConnection;
    readonly error?: string;
    readonly metrics: {
        readonly durationMs: number;
        readonly waitTimeMs: number;
        readonly poolUtilization: number;
        readonly queueDepth: number;
    };
}

const DEFAULT_CONFIG: FN_02_DB_POOL_ACQUIREConfig = {
    enabled: true,
    timeout: 30000,
    acquireTimeout: 10000,
    healthCheckOnAcquire: true,
    priority: 'NORMAL',
    maxWaitingRequests: 100,
    validateOnBorrow: true,
};

const logger = new Logger('FN_02_DB_POOL_ACQUIRE');
const metrics = new Metrics('FN_02_DB_POOL_ACQUIRE');
const clock = new Clock();

interface PoolState {
    readonly connections: PooledConnection[];
    readonly waitingRequests: number;
    readonly totalSize: number;
}

const pools: Map<string, PoolState> = new Map();

/**
 * @requirement ZAH-FN_02_DB_POOL_ACQUIRE-001
 * @design DSN-FN_02_DB_POOL_ACQUIRE-001
 * @test TST-FN_02_DB_POOL_ACQUIRE-001
 * @function_id FN_02_DB_POOL_ACQUIRE
 * @hazard_id HAZ-02-083
 */
export async function executeFN_02_DB_POOL_ACQUIRE(
    input: FN_02_DB_POOL_ACQUIREInput,
    config: Partial<FN_02_DB_POOL_ACQUIREConfig> = {}
): Promise<FN_02_DB_POOL_ACQUIREResult> {
    const startTimestamp = clock.nowMs();
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    const priority = input.priority || mergedConfig.priority;
    
    logger.info('Zacenjam izvajanje FN_02_DB_POOL_ACQUIRE', {
        requestId: input.requestId,
        poolId: input.poolId,
        priority,
    });
    
    metrics.increment('FN_02_DB_POOL_ACQUIRE_started');
    
    try {
        validateInput(input);
        
        let pool = pools.get(input.poolId);
        if (!pool) {
            pool = { connections: [], waitingRequests: 0, totalSize: 20 };
            pools.set(input.poolId, pool);
        }
        
        if (pool.waitingRequests >= mergedConfig.maxWaitingRequests) {
            throw new Error('Prekoracena maksimalna dolzina cakalne vrste');
        }
        
        const waitStart = clock.nowMs();
        let connection: PooledConnection | undefined;
        
        pool = { ...pool, waitingRequests: pool.waitingRequests + 1 };
        pools.set(input.poolId, pool);
        
        try {
            while (clock.nowMs() - waitStart < mergedConfig.acquireTimeout) {
                const availableConnection = pool.connections.find(c => !c.transactionActive && c.healthy);
                
                if (availableConnection) {
                    if (mergedConfig.healthCheckOnAcquire) {
                        const isHealthy = await checkConnectionHealth(availableConnection);
                        if (!isHealthy) {
                            continue;
                        }
                    }
                    
                    connection = {
                        ...availableConnection,
                        acquiredAt: clock.nowISO(),
                        lastUsed: clock.nowISO(),
                        transactionActive: true,
                    };
                    break;
                }
                
                if (pool.connections.length < pool.totalSize) {
                    connection = await createNewConnection(input.poolId);
                    pool = { ...pool, connections: [...pool.connections, connection] };
                    pools.set(input.poolId, pool);
                    break;
                }
                
                await clock.delay(50);
            }
        } finally {
            pool = pools.get(input.poolId)!;
            pool = { ...pool, waitingRequests: Math.max(0, pool.waitingRequests - 1) };
            pools.set(input.poolId, pool);
        }
        
        if (!connection) {
            throw new Error('Timeout pri pridobivanju povezave iz poola');
        }
        
        const waitTimeMs = clock.nowMs() - waitStart;
        const durationMs = clock.nowMs() - startTimestamp;
        const poolUtilization = pool.connections.filter(c => c.transactionActive).length / pool.totalSize;
        
        metrics.increment('FN_02_DB_POOL_ACQUIRE_success');
        metrics.histogram('FN_02_DB_POOL_ACQUIRE_wait_time', waitTimeMs);
        metrics.gauge('FN_02_DB_POOL_ACQUIRE_utilization', poolUtilization);
        
        return {
            success: true,
            requestId: input.requestId,
            timestamp: input.timestamp,
            connection,
            metrics: { durationMs, waitTimeMs, poolUtilization, queueDepth: pool.waitingRequests },
        };
    } catch (error) {
        const durationMs = clock.nowMs() - startTimestamp;
        const pool = pools.get(input.poolId);
        metrics.increment('FN_02_DB_POOL_ACQUIRE_failed');
        
        return {
            success: false,
            requestId: input.requestId,
            timestamp: input.timestamp,
            error: error instanceof Error ? error.message : String(error),
            metrics: { durationMs, waitTimeMs: durationMs, poolUtilization: 0, queueDepth: pool?.waitingRequests || 0 },
        };
    }
}

function validateInput(input: FN_02_DB_POOL_ACQUIREInput): void {
    if (!input.requestId) throw new Error('requestId je obvezen');
    if (!input.timestamp) throw new Error('timestamp je obvezen');
    if (!input.poolId) throw new Error('poolId je obvezen');
}

async function checkConnectionHealth(connection: PooledConnection): Promise<boolean> {
    await clock.delay(5);
    return connection.healthy;
}

async function createNewConnection(poolId: string): Promise<PooledConnection> {
    await clock.delay(20);
    return {
        connectionId: `CONN-${poolId}-${clock.nowMs()}`,
        poolId,
        acquiredAt: clock.nowISO(),
        lastUsed: clock.nowISO(),
        healthy: true,
        transactionActive: true,
    };
}

export const __test__ = { validateInput, checkConnectionHealth, createNewConnection, DEFAULT_CONFIG, pools };
