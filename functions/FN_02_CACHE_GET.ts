/**
 * Pridobi iz cache
 * 
 * @metadata
 *   template_version: "1.0.0"
 *   template_type: "function"
 *   domain_id: "DOMENA_02"
 *   compliance_standards: ["DO-178C", "IEC-61508", "ISO-26262", "MIL-STD-882E"]
 *   generated_at: "{{DATUM_GENERACIJE}}"
 * 
 * @traceability
 *   @requirement ZAH-FN_02_CACHE_GET-001
 *   @design DSN-FN_02_CACHE_GET-001
 *   @test TST-FN_02_CACHE_GET-001
 *   @function_id FN_02_CACHE_GET
 *   @hazard_id HAZ-02-062
 * 
 * @approach_type ASYNC
 * @tradeoff_profile SPEED_OVER_CONSISTENCY
 * @failure_assumption FALLBACK_TO_SOURCE
 * 
 * @description
 * Asinhrona pridobitev vrednosti iz cache z fallback za hitrost.
 * Implementira read-through vzorec z avtomatskim fallback na izvorni vir.
 */

import { Logger } from '{{LOGGER_PATH}}';
import { Metrics } from '{{METRICS_PATH}}';
import { Clock } from '{{CLOCK_PATH}}';

export interface CacheGetOptions {
    readonly allowStale: boolean;
    readonly maxStaleAge: number;
    readonly fallbackEnabled: boolean;
    readonly fallbackTimeout: number;
}

export interface FN_02_CACHE_GETConfig {
    readonly enabled: boolean;
    readonly timeout: number;
    readonly retryCount: number;
    readonly retryDelay: number;
    readonly defaultTtl: number;
    readonly compressionEnabled: boolean;
    readonly serializationFormat: 'JSON' | 'MSGPACK' | 'PROTOBUF';
}

export interface FN_02_CACHE_GETInput {
    readonly requestId: string;
    readonly timestamp: string;
    readonly key: string;
    readonly options?: CacheGetOptions;
    readonly fallbackFn?: () => Promise<unknown>;
}

export interface FN_02_CACHE_GETResult {
    readonly success: boolean;
    readonly requestId: string;
    readonly timestamp: string;
    readonly value?: unknown;
    readonly hit: boolean;
    readonly stale: boolean;
    readonly fromFallback: boolean;
    readonly error?: string;
    readonly metrics: {
        readonly durationMs: number;
        readonly retries: number;
        readonly cacheLatency: number;
    };
}

const DEFAULT_CONFIG: FN_02_CACHE_GETConfig = {
    enabled: true,
    timeout: 5000,
    retryCount: 2,
    retryDelay: 100,
    defaultTtl: 3600000,
    compressionEnabled: true,
    serializationFormat: 'JSON',
};

const DEFAULT_OPTIONS: CacheGetOptions = {
    allowStale: true,
    maxStaleAge: 60000,
    fallbackEnabled: true,
    fallbackTimeout: 10000,
};

const logger = new Logger('FN_02_CACHE_GET');
const metrics = new Metrics('FN_02_CACHE_GET');
const clock = new Clock();
const cacheStore: Map<string, { value: unknown; expiresAt: number; createdAt: number }> = new Map();

/**
 * @requirement ZAH-FN_02_CACHE_GET-001
 * @design DSN-FN_02_CACHE_GET-001
 * @test TST-FN_02_CACHE_GET-001
 * @function_id FN_02_CACHE_GET
 * @hazard_id HAZ-02-062
 */
export async function executeFN_02_CACHE_GET(
    input: FN_02_CACHE_GETInput,
    config: Partial<FN_02_CACHE_GETConfig> = {}
): Promise<FN_02_CACHE_GETResult> {
    const startTimestamp = clock.nowMs();
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    const options = { ...DEFAULT_OPTIONS, ...input.options };
    
    logger.info('Zacenjam izvajanje FN_02_CACHE_GET', { requestId: input.requestId, key: input.key });
    metrics.increment('FN_02_CACHE_GET_started');
    
    let retries = 0;
    let lastError: Error | undefined;
    
    while (retries <= mergedConfig.retryCount) {
        try {
            validateInput(input);
            
            const cacheStart = clock.nowMs();
            const cached = cacheStore.get(input.key);
            const cacheLatency = clock.nowMs() - cacheStart;
            
            if (cached) {
                const now = clock.nowMs();
                const isExpired = now > cached.expiresAt;
                const staleAge = now - cached.expiresAt;
                const isStale = isExpired && staleAge <= options.maxStaleAge;
                
                if (!isExpired || (isStale && options.allowStale)) {
                    const durationMs = clock.nowMs() - startTimestamp;
                    metrics.increment('FN_02_CACHE_GET_hit');
                    
                    return {
                        success: true,
                        requestId: input.requestId,
                        timestamp: input.timestamp,
                        value: cached.value,
                        hit: true,
                        stale: isStale,
                        fromFallback: false,
                        metrics: { durationMs, retries, cacheLatency },
                    };
                }
            }
            
            metrics.increment('FN_02_CACHE_GET_miss');
            
            if (options.fallbackEnabled && input.fallbackFn) {
                const fallbackValue = await Promise.race([
                    input.fallbackFn(),
                    clock.delay(options.fallbackTimeout).then(() => { throw new Error('Fallback timeout'); }),
                ]);
                
                cacheStore.set(input.key, {
                    value: fallbackValue,
                    expiresAt: clock.nowMs() + mergedConfig.defaultTtl,
                    createdAt: clock.nowMs(),
                });
                
                const durationMs = clock.nowMs() - startTimestamp;
                metrics.increment('FN_02_CACHE_GET_fallback');
                
                return {
                    success: true,
                    requestId: input.requestId,
                    timestamp: input.timestamp,
                    value: fallbackValue,
                    hit: false,
                    stale: false,
                    fromFallback: true,
                    metrics: { durationMs, retries, cacheLatency },
                };
            }
            
            const durationMs = clock.nowMs() - startTimestamp;
            return {
                success: true,
                requestId: input.requestId,
                timestamp: input.timestamp,
                value: undefined,
                hit: false,
                stale: false,
                fromFallback: false,
                metrics: { durationMs, retries, cacheLatency },
            };
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            retries++;
            if (retries <= mergedConfig.retryCount) {
                await clock.delay(mergedConfig.retryDelay * retries);
            }
        }
    }
    
    const durationMs = clock.nowMs() - startTimestamp;
    metrics.increment('FN_02_CACHE_GET_failed');
    
    return {
        success: false,
        requestId: input.requestId,
        timestamp: input.timestamp,
        hit: false,
        stale: false,
        fromFallback: false,
        error: lastError?.message || 'Neznana napaka',
        metrics: { durationMs, retries, cacheLatency: 0 },
    };
}

function validateInput(input: FN_02_CACHE_GETInput): void {
    if (!input.requestId) throw new Error('requestId je obvezen');
    if (!input.timestamp) throw new Error('timestamp je obvezen');
    if (!input.key) throw new Error('key je obvezen');
}

export const __test__ = { validateInput, DEFAULT_CONFIG, DEFAULT_OPTIONS, cacheStore };
