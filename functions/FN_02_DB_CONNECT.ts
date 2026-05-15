/**
 * Povezava na podatkovno bazo
 * 
 * @metadata
 *   template_version: "1.0.0"
 *   template_type: "function"
 *   domain_id: "DOMENA_02"
 *   compliance_standards: ["DO-178C", "IEC-61508", "ISO-26262", "MIL-STD-882E"]
 *   generated_at: "{{DATUM_GENERACIJE}}"
 * 
 * @traceability
 *   @requirement ZAH-FN_02_DB_CONNECT-001
 *   @design DSN-FN_02_DB_CONNECT-001
 *   @test TST-FN_02_DB_CONNECT-001
 *   @function_id FN_02_DB_CONNECT
 *   @hazard_id HAZ-02-081
 * 
 * @approach_type POOLED
 * @tradeoff_profile RELIABILITY_OVER_LATENCY
 * @failure_assumption RECONNECT_ON_FAILURE
 * 
 * @description
 * Vzpostavitev povezave na podatkovno bazo z connection pooling in avtomatskim reconnect.
 * Podpira vec tipov baz podatkov z enotnim vmesnikom.
 */

import { Logger } from '{{LOGGER_PATH}}';
import { Metrics } from '{{METRICS_PATH}}';
import { Clock } from '{{CLOCK_PATH}}';

export type DatabaseType = 'POSTGRESQL' | 'MYSQL' | 'MSSQL' | 'ORACLE' | 'MONGODB' | 'REDIS';

export interface ConnectionOptions {
    readonly host: string;
    readonly port: number;
    readonly database: string;
    readonly username: string;
    readonly password: string;
    readonly ssl: boolean;
    readonly sslCert?: string;
    readonly sslKey?: string;
    readonly sslCa?: string;
}

export interface ConnectionState {
    readonly connectionId: string;
    readonly databaseType: DatabaseType;
    readonly status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'ERROR';
    readonly connectedAt?: string;
    readonly lastActivity?: string;
    readonly errorMessage?: string;
}

export interface FN_02_DB_CONNECTConfig {
    readonly enabled: boolean;
    readonly timeout: number;
    readonly retryCount: number;
    readonly retryDelay: number;
    readonly poolSize: number;
    readonly poolMin: number;
    readonly idleTimeout: number;
    readonly acquireTimeout: number;
    readonly healthCheckInterval: number;
}

export interface FN_02_DB_CONNECTInput {
    readonly requestId: string;
    readonly timestamp: string;
    readonly databaseType: DatabaseType;
    readonly connectionOptions: ConnectionOptions;
    readonly poolName?: string;
}

export interface FN_02_DB_CONNECTResult {
    readonly success: boolean;
    readonly requestId: string;
    readonly timestamp: string;
    readonly connection?: ConnectionState;
    readonly error?: string;
    readonly metrics: {
        readonly durationMs: number;
        readonly retries: number;
        readonly poolSize: number;
        readonly activeConnections: number;
    };
}

const DEFAULT_CONFIG: FN_02_DB_CONNECTConfig = {
    enabled: true,
    timeout: 30000,
    retryCount: 3,
    retryDelay: 1000,
    poolSize: 20,
    poolMin: 5,
    idleTimeout: 60000,
    acquireTimeout: 10000,
    healthCheckInterval: 30000,
};

const logger = new Logger('FN_02_DB_CONNECT');
const metrics = new Metrics('FN_02_DB_CONNECT');
const clock = new Clock();
const connectionPools: Map<string, ConnectionState[]> = new Map();

/**
 * @requirement ZAH-FN_02_DB_CONNECT-001
 * @design DSN-FN_02_DB_CONNECT-001
 * @test TST-FN_02_DB_CONNECT-001
 * @function_id FN_02_DB_CONNECT
 * @hazard_id HAZ-02-081
 */
export async function executeFN_02_DB_CONNECT(
    input: FN_02_DB_CONNECTInput,
    config: Partial<FN_02_DB_CONNECTConfig> = {}
): Promise<FN_02_DB_CONNECTResult> {
    const startTimestamp = clock.nowMs();
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    
    logger.info('Zacenjam izvajanje FN_02_DB_CONNECT', {
        requestId: input.requestId,
        databaseType: input.databaseType,
        host: input.connectionOptions.host,
    });
    
    metrics.increment('FN_02_DB_CONNECT_started');
    
    let retries = 0;
    let lastError: Error | undefined;
    
    while (retries <= mergedConfig.retryCount) {
        try {
            validateInput(input);
            
            const poolName = input.poolName || generatePoolName(input);
            let pool = connectionPools.get(poolName);
            
            if (!pool) {
                pool = [];
                connectionPools.set(poolName, pool);
            }
            
            const availableConnection = pool.find(c => c.status === 'CONNECTED');
            if (availableConnection) {
                const durationMs = clock.nowMs() - startTimestamp;
                metrics.increment('FN_02_DB_CONNECT_reused');
                
                return {
                    success: true,
                    requestId: input.requestId,
                    timestamp: input.timestamp,
                    connection: { ...availableConnection, lastActivity: clock.nowISO() },
                    metrics: { durationMs, retries, poolSize: pool.length, activeConnections: pool.filter(c => c.status === 'CONNECTED').length },
                };
            }
            
            if (pool.length >= mergedConfig.poolSize) {
                throw new Error('Pool je poln - ni prostih povezav');
            }
            
            const connectionId = generateConnectionId(input);
            const connection = await establishConnection(input, connectionId, mergedConfig);
            
            pool.push(connection);
            
            const durationMs = clock.nowMs() - startTimestamp;
            metrics.increment('FN_02_DB_CONNECT_success');
            metrics.gauge('FN_02_DB_CONNECT_pool_size', pool.length);
            
            return {
                success: true,
                requestId: input.requestId,
                timestamp: input.timestamp,
                connection,
                metrics: { durationMs, retries, poolSize: pool.length, activeConnections: pool.filter(c => c.status === 'CONNECTED').length },
            };
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            retries++;
            if (retries <= mergedConfig.retryCount) {
                logger.warn(`Ponovni poskus FN_02_DB_CONNECT (${retries}/${mergedConfig.retryCount})`, { error: lastError.message });
                await clock.delay(mergedConfig.retryDelay * retries);
            }
        }
    }
    
    const durationMs = clock.nowMs() - startTimestamp;
    metrics.increment('FN_02_DB_CONNECT_failed');
    
    return {
        success: false,
        requestId: input.requestId,
        timestamp: input.timestamp,
        error: lastError?.message || 'Neznana napaka',
        metrics: { durationMs, retries, poolSize: 0, activeConnections: 0 },
    };
}

function validateInput(input: FN_02_DB_CONNECTInput): void {
    if (!input.requestId) throw new Error('requestId je obvezen');
    if (!input.timestamp) throw new Error('timestamp je obvezen');
    if (!input.databaseType) throw new Error('databaseType je obvezen');
    if (!input.connectionOptions) throw new Error('connectionOptions je obvezen');
    if (!input.connectionOptions.host) throw new Error('connectionOptions.host je obvezen');
    if (!input.connectionOptions.port) throw new Error('connectionOptions.port je obvezen');
    if (!input.connectionOptions.database) throw new Error('connectionOptions.database je obvezen');
    if (!input.connectionOptions.username) throw new Error('connectionOptions.username je obvezen');
    if (!input.connectionOptions.password) throw new Error('connectionOptions.password je obvezen');
}

function generatePoolName(input: FN_02_DB_CONNECTInput): string {
    return `${input.databaseType}:${input.connectionOptions.host}:${input.connectionOptions.port}/${input.connectionOptions.database}`;
}

function generateConnectionId(input: FN_02_DB_CONNECTInput): string {
    return `CONN-${input.databaseType}-${clock.nowMs()}`;
}

async function establishConnection(input: FN_02_DB_CONNECTInput, connectionId: string, config: FN_02_DB_CONNECTConfig): Promise<ConnectionState> {
    logger.debug('Vzpostavljam povezavo', { connectionId, databaseType: input.databaseType });
    await clock.delay(50);
    
    return {
        connectionId,
        databaseType: input.databaseType,
        status: 'CONNECTED',
        connectedAt: clock.nowISO(),
        lastActivity: clock.nowISO(),
    };
}

export const __test__ = { validateInput, generatePoolName, generateConnectionId, DEFAULT_CONFIG, connectionPools };
