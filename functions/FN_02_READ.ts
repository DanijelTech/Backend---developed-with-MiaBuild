/**
 * Branje podatkov
 * 
 * @metadata
 *   template_version: "1.0.0"
 *   template_type: "function"
 *   domain_id: "DOMENA_02"
 *   compliance_standards: ["DO-178C", "IEC-61508", "ISO-26262", "MIL-STD-882E"]
 *   generated_at: "{{DATUM_GENERACIJE}}"
 * 
 * @traceability
 *   @requirement ZAH-FN_02_READ-001
 *   @design DSN-FN_02_READ-001
 *   @test TST-FN_02_READ-001
 *   @function_id FN_02_READ
 *   @hazard_id HAZ-02-101
 * 
 * @approach_type QUERY_BUILDER
 * @tradeoff_profile CONSISTENCY_OVER_LATENCY
 * @failure_assumption RETRY_ON_TIMEOUT
 * 
 * @description
 * Branje podatkov iz podatkovne baze z query builder vzorcem.
 * Podpira filtriranje, sortiranje, paginacijo in projekcijo.
 */

import { Logger } from '{{LOGGER_PATH}}';
import { Metrics } from '{{METRICS_PATH}}';
import { Clock } from '{{CLOCK_PATH}}';

export type SortDirection = 'ASC' | 'DESC';
export type FilterOperator = 'EQ' | 'NE' | 'GT' | 'GTE' | 'LT' | 'LTE' | 'IN' | 'NOT_IN' | 'LIKE' | 'IS_NULL' | 'IS_NOT_NULL';

export interface FilterCondition {
    readonly field: string;
    readonly operator: FilterOperator;
    readonly value: unknown;
}

export interface SortCondition {
    readonly field: string;
    readonly direction: SortDirection;
}

export interface Pagination {
    readonly offset: number;
    readonly limit: number;
}

export interface ReadQuery {
    readonly table: string;
    readonly fields?: readonly string[];
    readonly filters?: readonly FilterCondition[];
    readonly sort?: readonly SortCondition[];
    readonly pagination?: Pagination;
    readonly joins?: readonly JoinClause[];
}

export interface JoinClause {
    readonly type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
    readonly table: string;
    readonly on: string;
}

export interface FN_02_READConfig {
    readonly enabled: boolean;
    readonly timeout: number;
    readonly retryCount: number;
    readonly retryDelay: number;
    readonly maxLimit: number;
    readonly defaultLimit: number;
    readonly cacheEnabled: boolean;
    readonly cacheTtl: number;
}

export interface FN_02_READInput {
    readonly requestId: string;
    readonly timestamp: string;
    readonly connectionId: string;
    readonly query: ReadQuery;
    readonly useCache?: boolean;
}

export interface FN_02_READResult {
    readonly success: boolean;
    readonly requestId: string;
    readonly timestamp: string;
    readonly data?: readonly Record<string, unknown>[];
    readonly totalCount?: number;
    readonly hasMore?: boolean;
    readonly error?: string;
    readonly metrics: {
        readonly durationMs: number;
        readonly retries: number;
        readonly rowsReturned: number;
        readonly cacheHit: boolean;
    };
}

const DEFAULT_CONFIG: FN_02_READConfig = {
    enabled: true,
    timeout: 30000,
    retryCount: 2,
    retryDelay: 500,
    maxLimit: 1000,
    defaultLimit: 100,
    cacheEnabled: true,
    cacheTtl: 60000,
};

const logger = new Logger('FN_02_READ');
const metrics = new Metrics('FN_02_READ');
const clock = new Clock();
const queryCache: Map<string, { data: readonly Record<string, unknown>[]; expiresAt: number }> = new Map();

/**
 * @requirement ZAH-FN_02_READ-001
 * @design DSN-FN_02_READ-001
 * @test TST-FN_02_READ-001
 * @function_id FN_02_READ
 * @hazard_id HAZ-02-101
 */
export async function executeFN_02_READ(
    input: FN_02_READInput,
    config: Partial<FN_02_READConfig> = {}
): Promise<FN_02_READResult> {
    const startTimestamp = clock.nowMs();
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    
    logger.info('Zacenjam izvajanje FN_02_READ', {
        requestId: input.requestId,
        table: input.query.table,
        connectionId: input.connectionId,
    });
    
    metrics.increment('FN_02_READ_started');
    
    let retries = 0;
    let lastError: Error | undefined;
    
    while (retries <= mergedConfig.retryCount) {
        try {
            validateInput(input, mergedConfig);
            
            const cacheKey = generateCacheKey(input);
            const useCache = input.useCache !== false && mergedConfig.cacheEnabled;
            
            if (useCache) {
                const cached = queryCache.get(cacheKey);
                if (cached && cached.expiresAt > clock.nowMs()) {
                    const durationMs = clock.nowMs() - startTimestamp;
                    metrics.increment('FN_02_READ_cache_hit');
                    
                    return {
                        success: true,
                        requestId: input.requestId,
                        timestamp: input.timestamp,
                        data: cached.data,
                        totalCount: cached.data.length,
                        hasMore: false,
                        metrics: { durationMs, retries, rowsReturned: cached.data.length, cacheHit: true },
                    };
                }
            }
            
            const sql = buildQuery(input.query, mergedConfig);
            const data = await executeQuery(input.connectionId, sql);
            
            if (useCache) {
                queryCache.set(cacheKey, { data, expiresAt: clock.nowMs() + mergedConfig.cacheTtl });
            }
            
            const pagination = input.query.pagination;
            const limit = pagination?.limit ?? mergedConfig.defaultLimit;
            const hasMore = data.length === limit;
            
            const durationMs = clock.nowMs() - startTimestamp;
            metrics.increment('FN_02_READ_success');
            metrics.histogram('FN_02_READ_rows', data.length);
            
            return {
                success: true,
                requestId: input.requestId,
                timestamp: input.timestamp,
                data,
                totalCount: data.length,
                hasMore,
                metrics: { durationMs, retries, rowsReturned: data.length, cacheHit: false },
            };
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            retries++;
            if (retries <= mergedConfig.retryCount) {
                logger.warn(`Ponovni poskus FN_02_READ (${retries}/${mergedConfig.retryCount})`, { error: lastError.message });
                await clock.delay(mergedConfig.retryDelay * retries);
            }
        }
    }
    
    const durationMs = clock.nowMs() - startTimestamp;
    metrics.increment('FN_02_READ_failed');
    
    return {
        success: false,
        requestId: input.requestId,
        timestamp: input.timestamp,
        error: lastError?.message || 'Neznana napaka',
        metrics: { durationMs, retries, rowsReturned: 0, cacheHit: false },
    };
}

function validateInput(input: FN_02_READInput, config: FN_02_READConfig): void {
    if (!input.requestId) throw new Error('requestId je obvezen');
    if (!input.timestamp) throw new Error('timestamp je obvezen');
    if (!input.connectionId) throw new Error('connectionId je obvezen');
    if (!input.query) throw new Error('query je obvezen');
    if (!input.query.table) throw new Error('query.table je obvezen');
    
    if (input.query.pagination?.limit && input.query.pagination.limit > config.maxLimit) {
        throw new Error(`limit presega maksimum: ${config.maxLimit}`);
    }
}

function generateCacheKey(input: FN_02_READInput): string {
    return `${input.connectionId}:${JSON.stringify(input.query)}`;
}

function buildQuery(query: ReadQuery, config: FN_02_READConfig): string {
    const fields = query.fields?.join(', ') || '*';
    let sql = `SELECT ${fields} FROM ${query.table}`;
    
    if (query.joins && query.joins.length > 0) {
        for (const join of query.joins) {
            sql += ` ${join.type} JOIN ${join.table} ON ${join.on}`;
        }
    }
    
    if (query.filters && query.filters.length > 0) {
        const conditions = query.filters.map(f => buildFilterCondition(f)).join(' AND ');
        sql += ` WHERE ${conditions}`;
    }
    
    if (query.sort && query.sort.length > 0) {
        const orderBy = query.sort.map(s => `${s.field} ${s.direction}`).join(', ');
        sql += ` ORDER BY ${orderBy}`;
    }
    
    const limit = query.pagination?.limit ?? config.defaultLimit;
    const offset = query.pagination?.offset ?? 0;
    sql += ` LIMIT ${limit} OFFSET ${offset}`;
    
    return sql;
}

function buildFilterCondition(filter: FilterCondition): string {
    switch (filter.operator) {
        case 'EQ': return `${filter.field} = '${filter.value}'`;
        case 'NE': return `${filter.field} != '${filter.value}'`;
        case 'GT': return `${filter.field} > '${filter.value}'`;
        case 'GTE': return `${filter.field} >= '${filter.value}'`;
        case 'LT': return `${filter.field} < '${filter.value}'`;
        case 'LTE': return `${filter.field} <= '${filter.value}'`;
        case 'IN': return `${filter.field} IN (${(filter.value as unknown[]).map(v => `'${v}'`).join(', ')})`;
        case 'NOT_IN': return `${filter.field} NOT IN (${(filter.value as unknown[]).map(v => `'${v}'`).join(', ')})`;
        case 'LIKE': return `${filter.field} LIKE '${filter.value}'`;
        case 'IS_NULL': return `${filter.field} IS NULL`;
        case 'IS_NOT_NULL': return `${filter.field} IS NOT NULL`;
        default: return `${filter.field} = '${filter.value}'`;
    }
}

async function executeQuery(connectionId: string, sql: string): Promise<Record<string, unknown>[]> {
    logger.debug('Izvajam poizvedbo', { connectionId, sql: sql.substring(0, 100) });
    await clock.delay(20);
    return [];
}

export const __test__ = { validateInput, generateCacheKey, buildQuery, buildFilterCondition, DEFAULT_CONFIG, queryCache };
