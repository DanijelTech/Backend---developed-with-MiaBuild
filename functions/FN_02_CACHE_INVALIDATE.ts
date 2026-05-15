/**
 * Invalidiraj cache
 * 
 * @metadata
 *   template_version: "1.0.0"
 *   template_type: "function"
 *   domain_id: "DOMENA_02"
 *   compliance_standards: ["DO-178C", "IEC-61508", "ISO-26262", "MIL-STD-882E"]
 *   generated_at: "{{DATUM_GENERACIJE}}"
 * 
 * @traceability
 *   @requirement ZAH-FN_02_CACHE_INVALIDATE-001
 *   @design DSN-FN_02_CACHE_INVALIDATE-001
 *   @test TST-FN_02_CACHE_INVALIDATE-001
 *   @function_id FN_02_CACHE_INVALIDATE
 *   @hazard_id HAZ-02-067
 * 
 * @approach_type EVENT_DRIVEN
 * @tradeoff_profile CONSISTENCY_OVER_SPEED
 * @failure_assumption BROADCAST_INVALIDATION
 * 
 * @description
 * Event-driven invalidacija po vzorcu za robustnost z fail-fast pristopom.
 * Podpira invalidacijo po kljucu, vzorcu ali oznakah.
 */

import { Logger } from '{{LOGGER_PATH}}';
import { Metrics } from '{{METRICS_PATH}}';
import { Clock } from '{{CLOCK_PATH}}';

export type InvalidationType = 'KEY' | 'PATTERN' | 'TAG' | 'PREFIX' | 'ALL';

export interface FN_02_CACHE_INVALIDATEConfig {
    readonly enabled: boolean;
    readonly timeout: number;
    readonly retryCount: number;
    readonly retryDelay: number;
    readonly broadcastEnabled: boolean;
    readonly asyncInvalidation: boolean;
    readonly batchSize: number;
}

export interface FN_02_CACHE_INVALIDATEInput {
    readonly requestId: string;
    readonly timestamp: string;
    readonly type: InvalidationType;
    readonly keys?: readonly string[];
    readonly pattern?: string;
    readonly tags?: readonly string[];
    readonly prefix?: string;
}

export interface FN_02_CACHE_INVALIDATEResult {
    readonly success: boolean;
    readonly requestId: string;
    readonly timestamp: string;
    readonly invalidatedCount: number;
    readonly invalidatedKeys?: readonly string[];
    readonly error?: string;
    readonly metrics: {
        readonly durationMs: number;
        readonly retries: number;
        readonly broadcastLatency: number;
    };
}

const DEFAULT_CONFIG: FN_02_CACHE_INVALIDATEConfig = {
    enabled: true,
    timeout: 10000,
    retryCount: 3,
    retryDelay: 500,
    broadcastEnabled: true,
    asyncInvalidation: false,
    batchSize: 1000,
};

const logger = new Logger('FN_02_CACHE_INVALIDATE');
const metrics = new Metrics('FN_02_CACHE_INVALIDATE');
const clock = new Clock();
const cacheStore: Map<string, { value: unknown; tags: readonly string[] }> = new Map();

/**
 * @requirement ZAH-FN_02_CACHE_INVALIDATE-001
 * @design DSN-FN_02_CACHE_INVALIDATE-001
 * @test TST-FN_02_CACHE_INVALIDATE-001
 * @function_id FN_02_CACHE_INVALIDATE
 * @hazard_id HAZ-02-067
 */
export async function executeFN_02_CACHE_INVALIDATE(
    input: FN_02_CACHE_INVALIDATEInput,
    config: Partial<FN_02_CACHE_INVALIDATEConfig> = {}
): Promise<FN_02_CACHE_INVALIDATEResult> {
    const startTimestamp = clock.nowMs();
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    
    logger.info('Zacenjam izvajanje FN_02_CACHE_INVALIDATE', { requestId: input.requestId, type: input.type });
    metrics.increment('FN_02_CACHE_INVALIDATE_started');
    
    let retries = 0;
    let lastError: Error | undefined;
    
    while (retries <= mergedConfig.retryCount) {
        try {
            validateInput(input);
            
            const keysToInvalidate = collectKeysToInvalidate(input);
            const invalidatedKeys: string[] = [];
            
            for (const key of keysToInvalidate) {
                if (cacheStore.delete(key)) {
                    invalidatedKeys.push(key);
                }
            }
            
            let broadcastLatency = 0;
            if (mergedConfig.broadcastEnabled && invalidatedKeys.length > 0) {
                const broadcastStart = clock.nowMs();
                await broadcastInvalidation(invalidatedKeys, mergedConfig);
                broadcastLatency = clock.nowMs() - broadcastStart;
            }
            
            const durationMs = clock.nowMs() - startTimestamp;
            metrics.increment('FN_02_CACHE_INVALIDATE_success');
            metrics.histogram('FN_02_CACHE_INVALIDATE_count', invalidatedKeys.length);
            
            return {
                success: true,
                requestId: input.requestId,
                timestamp: input.timestamp,
                invalidatedCount: invalidatedKeys.length,
                invalidatedKeys: invalidatedKeys.length <= 100 ? invalidatedKeys : undefined,
                metrics: { durationMs, retries, broadcastLatency },
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
    metrics.increment('FN_02_CACHE_INVALIDATE_failed');
    
    return {
        success: false,
        requestId: input.requestId,
        timestamp: input.timestamp,
        invalidatedCount: 0,
        error: lastError?.message || 'Neznana napaka',
        metrics: { durationMs, retries, broadcastLatency: 0 },
    };
}

function validateInput(input: FN_02_CACHE_INVALIDATEInput): void {
    if (!input.requestId) throw new Error('requestId je obvezen');
    if (!input.timestamp) throw new Error('timestamp je obvezen');
    if (!input.type) throw new Error('type je obvezen');
    
    switch (input.type) {
        case 'KEY':
            if (!input.keys || input.keys.length === 0) throw new Error('keys je obvezen za tip KEY');
            break;
        case 'PATTERN':
            if (!input.pattern) throw new Error('pattern je obvezen za tip PATTERN');
            break;
        case 'TAG':
            if (!input.tags || input.tags.length === 0) throw new Error('tags je obvezen za tip TAG');
            break;
        case 'PREFIX':
            if (!input.prefix) throw new Error('prefix je obvezen za tip PREFIX');
            break;
    }
}

function collectKeysToInvalidate(input: FN_02_CACHE_INVALIDATEInput): string[] {
    const keys: string[] = [];
    
    switch (input.type) {
        case 'KEY':
            keys.push(...(input.keys ?? []));
            break;
        case 'PATTERN':
            const regex = new RegExp(input.pattern!.replace(/\*/g, '.*'));
            for (const key of cacheStore.keys()) {
                if (regex.test(key)) keys.push(key);
            }
            break;
        case 'TAG':
            for (const [key, entry] of cacheStore.entries()) {
                if (input.tags!.some(tag => entry.tags.includes(tag))) keys.push(key);
            }
            break;
        case 'PREFIX':
            for (const key of cacheStore.keys()) {
                if (key.startsWith(input.prefix!)) keys.push(key);
            }
            break;
        case 'ALL':
            keys.push(...cacheStore.keys());
            break;
    }
    
    return keys;
}

async function broadcastInvalidation(keys: readonly string[], config: FN_02_CACHE_INVALIDATEConfig): Promise<void> {
    logger.debug('Oddajam invalidacijo', { keyCount: keys.length });
    await clock.delay(5);
}

export const __test__ = { validateInput, collectKeysToInvalidate, DEFAULT_CONFIG, cacheStore };
