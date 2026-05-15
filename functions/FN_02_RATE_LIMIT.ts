/**
 * Omejevanje hitrosti zahtev
 * 
 * @metadata
 *   template_version: "1.0.0"
 *   template_type: "function"
 *   domain_id: "DOMENA_02"
 *   compliance_standards: ["DO-178C", "IEC-61508", "ISO-26262", "MIL-STD-882E"]
 *   generated_at: "{{DATUM_GENERACIJE}}"
 * 
 * @traceability
 *   @requirement ZAH-FN_02_RATE_LIMIT-001
 *   @design DSN-FN_02_RATE_LIMIT-001
 *   @test TST-FN_02_RATE_LIMIT-001
 *   @function_id FN_02_RATE_LIMIT
 *   @hazard_id HAZ-02-100
 * 
 * @approach_type TOKEN_BUCKET
 * @tradeoff_profile FAIRNESS_OVER_THROUGHPUT
 * @failure_assumption REJECT_ON_LIMIT
 * 
 * @description
 * Omejevanje hitrosti zahtev z token bucket algoritmom.
 * Podpira vec ravni omejitev (globalno, per-user, per-endpoint).
 */

import { Logger } from '{{LOGGER_PATH}}';
import { Metrics } from '{{METRICS_PATH}}';
import { Clock } from '{{CLOCK_PATH}}';

export type RateLimitScope = 'GLOBAL' | 'USER' | 'IP' | 'ENDPOINT' | 'API_KEY';

export interface RateLimitRule {
    readonly scope: RateLimitScope;
    readonly identifier: string;
    readonly maxTokens: number;
    readonly refillRate: number;
    readonly refillInterval: number;
}

export interface TokenBucketState {
    readonly tokens: number;
    readonly lastRefill: number;
    readonly totalRequests: number;
    readonly totalRejected: number;
}

export interface FN_02_RATE_LIMITConfig {
    readonly enabled: boolean;
    readonly timeout: number;
    readonly defaultMaxTokens: number;
    readonly defaultRefillRate: number;
    readonly defaultRefillInterval: number;
    readonly burstAllowed: boolean;
    readonly burstMultiplier: number;
    readonly headerEnabled: boolean;
}

export interface FN_02_RATE_LIMITInput {
    readonly requestId: string;
    readonly timestamp: string;
    readonly scope: RateLimitScope;
    readonly identifier: string;
    readonly cost?: number;
    readonly rule?: Partial<RateLimitRule>;
}

export interface FN_02_RATE_LIMITResult {
    readonly success: boolean;
    readonly requestId: string;
    readonly timestamp: string;
    readonly allowed: boolean;
    readonly remainingTokens: number;
    readonly resetAt: string;
    readonly retryAfter?: number;
    readonly error?: string;
    readonly metrics: {
        readonly durationMs: number;
        readonly currentTokens: number;
        readonly maxTokens: number;
    };
}

const DEFAULT_CONFIG: FN_02_RATE_LIMITConfig = {
    enabled: true,
    timeout: 5000,
    defaultMaxTokens: 100,
    defaultRefillRate: 10,
    defaultRefillInterval: 1000,
    burstAllowed: true,
    burstMultiplier: 1.5,
    headerEnabled: true,
};

const logger = new Logger('FN_02_RATE_LIMIT');
const metrics = new Metrics('FN_02_RATE_LIMIT');
const clock = new Clock();
const buckets: Map<string, TokenBucketState> = new Map();

/**
 * @requirement ZAH-FN_02_RATE_LIMIT-001
 * @design DSN-FN_02_RATE_LIMIT-001
 * @test TST-FN_02_RATE_LIMIT-001
 * @function_id FN_02_RATE_LIMIT
 * @hazard_id HAZ-02-100
 */
export async function executeFN_02_RATE_LIMIT(
    input: FN_02_RATE_LIMITInput,
    config: Partial<FN_02_RATE_LIMITConfig> = {}
): Promise<FN_02_RATE_LIMITResult> {
    const startTimestamp = clock.nowMs();
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    
    logger.debug('Zacenjam izvajanje FN_02_RATE_LIMIT', {
        requestId: input.requestId,
        scope: input.scope,
        identifier: input.identifier,
    });
    
    try {
        validateInput(input);
        
        const bucketKey = generateBucketKey(input.scope, input.identifier);
        const rule = resolveRule(input, mergedConfig);
        const cost = input.cost || 1;
        
        let bucket = buckets.get(bucketKey);
        const now = clock.nowMs();
        
        if (!bucket) {
            bucket = {
                tokens: rule.maxTokens,
                lastRefill: now,
                totalRequests: 0,
                totalRejected: 0,
            };
        }
        
        bucket = refillBucket(bucket, rule, now);
        
        const maxTokens = mergedConfig.burstAllowed ? Math.floor(rule.maxTokens * mergedConfig.burstMultiplier) : rule.maxTokens;
        const allowed = bucket.tokens >= cost;
        
        if (allowed) {
            bucket = {
                ...bucket,
                tokens: bucket.tokens - cost,
                totalRequests: bucket.totalRequests + 1,
            };
            metrics.increment('FN_02_RATE_LIMIT_allowed');
        } else {
            bucket = {
                ...bucket,
                totalRequests: bucket.totalRequests + 1,
                totalRejected: bucket.totalRejected + 1,
            };
            metrics.increment('FN_02_RATE_LIMIT_rejected');
        }
        
        buckets.set(bucketKey, bucket);
        
        const tokensNeeded = cost - bucket.tokens;
        const refillsNeeded = Math.ceil(tokensNeeded / rule.refillRate);
        const retryAfter = allowed ? undefined : refillsNeeded * rule.refillInterval;
        const resetAt = new Date(now + rule.refillInterval).toISOString();
        
        const durationMs = clock.nowMs() - startTimestamp;
        
        return {
            success: true,
            requestId: input.requestId,
            timestamp: input.timestamp,
            allowed,
            remainingTokens: Math.max(0, bucket.tokens),
            resetAt,
            retryAfter,
            metrics: { durationMs, currentTokens: bucket.tokens, maxTokens },
        };
    } catch (error) {
        const durationMs = clock.nowMs() - startTimestamp;
        metrics.increment('FN_02_RATE_LIMIT_error');
        
        return {
            success: false,
            requestId: input.requestId,
            timestamp: input.timestamp,
            allowed: false,
            remainingTokens: 0,
            resetAt: clock.nowISO(),
            error: error instanceof Error ? error.message : String(error),
            metrics: { durationMs, currentTokens: 0, maxTokens: 0 },
        };
    }
}

function validateInput(input: FN_02_RATE_LIMITInput): void {
    if (!input.requestId) throw new Error('requestId je obvezen');
    if (!input.timestamp) throw new Error('timestamp je obvezen');
    if (!input.scope) throw new Error('scope je obvezen');
    if (!input.identifier) throw new Error('identifier je obvezen');
}

function generateBucketKey(scope: RateLimitScope, identifier: string): string {
    return `${scope}:${identifier}`;
}

function resolveRule(input: FN_02_RATE_LIMITInput, config: FN_02_RATE_LIMITConfig): RateLimitRule {
    return {
        scope: input.scope,
        identifier: input.identifier,
        maxTokens: input.rule?.maxTokens ?? config.defaultMaxTokens,
        refillRate: input.rule?.refillRate ?? config.defaultRefillRate,
        refillInterval: input.rule?.refillInterval ?? config.defaultRefillInterval,
    };
}

function refillBucket(bucket: TokenBucketState, rule: RateLimitRule, now: number): TokenBucketState {
    const timeSinceLastRefill = now - bucket.lastRefill;
    const refillCount = Math.floor(timeSinceLastRefill / rule.refillInterval);
    
    if (refillCount > 0) {
        const tokensToAdd = refillCount * rule.refillRate;
        const newTokens = Math.min(bucket.tokens + tokensToAdd, rule.maxTokens);
        return {
            ...bucket,
            tokens: newTokens,
            lastRefill: bucket.lastRefill + (refillCount * rule.refillInterval),
        };
    }
    
    return bucket;
}

export const __test__ = { validateInput, generateBucketKey, resolveRule, refillBucket, DEFAULT_CONFIG, buckets };
