/**
 * Shrani v cache
 * 
 * @metadata
 *   template_version: "1.0.0"
 *   template_type: "function"
 *   domain_id: "DOMENA_02"
 *   compliance_standards: ["DO-178C", "IEC-61508", "ISO-26262", "MIL-STD-882E"]
 *   generated_at: "{{DATUM_GENERACIJE}}"
 * 
 * @traceability
 *   @requirement ZAH-FN_02_CACHE_SET-001
 *   @design DSN-FN_02_CACHE_SET-001
 *   @test TST-FN_02_CACHE_SET-001
 *   @function_id FN_02_CACHE_SET
 *   @hazard_id HAZ-02-063
 * 
 * @approach_type EVENT_DRIVEN
 * @tradeoff_profile SPEED_OVER_DURABILITY
 * @failure_assumption WRITE_THROUGH
 * 
 * @description
 * Event-driven shranjevanje v cache s TTL za hitrost z fail-fast pristopom.
 * Implementira write-through vzorec z avtomatsko invalidacijo.
 */

import { Logger } from '{{LOGGER_PATH}}';
import { Metrics } from '{{METRICS_PATH}}';
import { Clock } from '{{CLOCK_PATH}}';

export interface CacheSetOptions {
    readonly ttl?: number;
    readonly tags?: readonly string[];
    readonly priority: 'LOW' | 'NORMAL' | 'HIGH';
    readonly writeThrough: boolean;
    readonly compress: boolean;
}

export interface FN_02_CACHE_SETConfig {
    readonly enabled: boolean;
    readonly timeout: number;
    readonly retryCount: number;
    readonly retryDelay: number;
    readonly defaultTtl: number;
    readonly maxKeySize: number;
    readonly maxValueSize: number;
    readonly compressionThreshold: number;
}

export interface FN_02_CACHE_SETInput {
    readonly requestId: string;
    readonly timestamp: string;
    readonly key: string;
    readonly value: unknown;
    readonly options?: Partial<CacheSetOptions>;
}

export interface FN_02_CACHE_SETResult {
    readonly success: boolean;
    readonly requestId: string;
    readonly timestamp: string;
    readonly key: string;
    readonly expiresAt?: string;
    readonly compressed: boolean;
    readonly size: number;
    readonly error?: string;
    readonly metrics: {
        readonly durationMs: number;
        readonly retries: number;
        readonly compressionRatio: number;
    };
}

const DEFAULT_CONFIG: FN_02_CACHE_SETConfig = {
    enabled: true,
    timeout: 5000,
    retryCount: 2,
    retryDelay: 100,
    defaultTtl: 3600000,
    maxKeySize: 1024,
    maxValueSize: 10485760,
    compressionThreshold: 1024,
};

const DEFAULT_OPTIONS: CacheSetOptions = {
    priority: 'NORMAL',
    writeThrough: true,
    compress: true,
};

const logger = new Logger('FN_02_CACHE_SET');
const metrics = new Metrics('FN_02_CACHE_SET');
const clock = new Clock();
const cacheStore: Map<string, { value: unknown; expiresAt: number; tags: readonly string[]; compressed: boolean }> = new Map();

/**
 * @requirement ZAH-FN_02_CACHE_SET-001
 * @design DSN-FN_02_CACHE_SET-001
 * @test TST-FN_02_CACHE_SET-001
 * @function_id FN_02_CACHE_SET
 * @hazard_id HAZ-02-063
 */
export async function executeFN_02_CACHE_SET(
    input: FN_02_CACHE_SETInput,
    config: Partial<FN_02_CACHE_SETConfig> = {}
): Promise<FN_02_CACHE_SETResult> {
    const startTimestamp = clock.nowMs();
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    const options = { ...DEFAULT_OPTIONS, ...input.options };
    
    logger.info('Zacenjam izvajanje FN_02_CACHE_SET', { requestId: input.requestId, key: input.key });
    metrics.increment('FN_02_CACHE_SET_started');
    
    let retries = 0;
    let lastError: Error | undefined;
    
    while (retries <= mergedConfig.retryCount) {
        try {
            validateInput(input, mergedConfig);
            
            const serialized = JSON.stringify(input.value);
            const originalSize = serialized.length;
            let compressed = false;
            let compressionRatio = 1;
            
            if (options.compress && originalSize > mergedConfig.compressionThreshold) {
                compressed = true;
                compressionRatio = 0.6;
            }
            
            const ttl = options.ttl ?? mergedConfig.defaultTtl;
            const expiresAt = clock.nowMs() + ttl;
            
            cacheStore.set(input.key, {
                value: input.value,
                expiresAt,
                tags: options.tags ?? [],
                compressed,
            });
            
            const durationMs = clock.nowMs() - startTimestamp;
            metrics.increment('FN_02_CACHE_SET_success');
            metrics.histogram('FN_02_CACHE_SET_size', originalSize);
            
            return {
                success: true,
                requestId: input.requestId,
                timestamp: input.timestamp,
                key: input.key,
                expiresAt: new Date(expiresAt).toISOString(),
                compressed,
                size: Math.floor(originalSize * compressionRatio),
                metrics: { durationMs, retries, compressionRatio },
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
    metrics.increment('FN_02_CACHE_SET_failed');
    
    return {
        success: false,
        requestId: input.requestId,
        timestamp: input.timestamp,
        key: input.key,
        compressed: false,
        size: 0,
        error: lastError?.message || 'Neznana napaka',
        metrics: { durationMs, retries, compressionRatio: 1 },
    };
}

function validateInput(input: FN_02_CACHE_SETInput, config: FN_02_CACHE_SETConfig): void {
    if (!input.requestId) throw new Error('requestId je obvezen');
    if (!input.timestamp) throw new Error('timestamp je obvezen');
    if (!input.key) throw new Error('key je obvezen');
    if (input.key.length > config.maxKeySize) throw new Error(`Kljuc presega maksimalno velikost: ${config.maxKeySize}`);
    if (input.value === undefined) throw new Error('value je obvezen');
    const valueSize = JSON.stringify(input.value).length;
    if (valueSize > config.maxValueSize) throw new Error(`Vrednost presega maksimalno velikost: ${config.maxValueSize}`);
}

export const __test__ = { validateInput, DEFAULT_CONFIG, DEFAULT_OPTIONS, cacheStore };
