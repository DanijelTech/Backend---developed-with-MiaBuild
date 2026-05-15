/**
 * @file Rate Limiter za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-RATE-001 Rate limiting za zaledne sisteme
 * @design DSN-ZALEDNI-RATE-001 Backend rate limiter arhitektura
 * @test TEST-ZALEDNI-RATE-001 Preverjanje rate limiter
 *
 * Rate Limiter - prilagojen za zaledne sisteme:
 * - Token bucket algorithm
 * - Sliding window algorithm
 * - Fixed window algorithm
 * - Leaky bucket algorithm
 * - Distributed rate limiting
 * - Rate limit headers
 * - Quota management
 * - Burst handling
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom RATE_001 - Rate Limiter
 */
/**
 * Rate limit algorithm
 */
export type RateLimitAlgorithm = 'token_bucket' | 'sliding_window' | 'fixed_window' | 'leaky_bucket';
/**
 * Rate limit result
 */
export interface RateLimitResult {
    readonly allowed: boolean;
    readonly remaining: number;
    readonly limit: number;
    readonly resetAt: number;
    readonly retryAfter: number | null;
    readonly headers: Readonly<Record<string, string>>;
}
/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
    readonly configId: string;
    readonly name: string;
    readonly algorithm: RateLimitAlgorithm;
    readonly limit: number;
    readonly window: number;
    readonly burstLimit: number | null;
    readonly keyGenerator: RateLimitKeyGenerator;
    readonly skipCondition: RateLimitSkipCondition | null;
    readonly onLimitReached: RateLimitCallback | null;
    readonly metadata: Readonly<Record<string, unknown>>;
}
/**
 * Rate limit key generator
 */
export type RateLimitKeyGenerator = (context: RateLimitContext) => string;
/**
 * Rate limit skip condition
 */
export type RateLimitSkipCondition = (context: RateLimitContext) => boolean;
/**
 * Rate limit callback
 */
export type RateLimitCallback = (context: RateLimitContext, result: RateLimitResult) => void | Promise<void>;
/**
 * Rate limit context
 */
export interface RateLimitContext {
    readonly requestId: string;
    readonly clientId: string | null;
    readonly userId: string | null;
    readonly ip: string;
    readonly path: string;
    readonly method: string;
    readonly headers: Readonly<Record<string, string>>;
    readonly metadata: Readonly<Record<string, unknown>>;
}
/**
 * Token bucket state
 */
export interface TokenBucketState {
    readonly key: string;
    readonly tokens: number;
    readonly lastRefill: number;
    readonly capacity: number;
    readonly refillRate: number;
}
/**
 * Sliding window state
 */
export interface SlidingWindowState {
    readonly key: string;
    readonly requests: readonly number[];
    readonly windowStart: number;
    readonly windowSize: number;
    readonly limit: number;
}
/**
 * Fixed window state
 */
export interface FixedWindowState {
    readonly key: string;
    readonly count: number;
    readonly windowStart: number;
    readonly windowSize: number;
    readonly limit: number;
}
/**
 * Leaky bucket state
 */
export interface LeakyBucketState {
    readonly key: string;
    readonly queue: number;
    readonly lastLeak: number;
    readonly capacity: number;
    readonly leakRate: number;
}
/**
 * Quota
 */
export interface Quota {
    readonly quotaId: string;
    readonly name: string;
    readonly limit: number;
    readonly period: QuotaPeriod;
    readonly used: number;
    readonly remaining: number;
    readonly resetAt: number;
    readonly createdAt: number;
    readonly updatedAt: number;
}
/**
 * Quota period
 */
export type QuotaPeriod = 'minute' | 'hour' | 'day' | 'week' | 'month';
/**
 * Quota usage
 */
export interface QuotaUsage {
    readonly quotaId: string;
    readonly key: string;
    readonly used: number;
    readonly limit: number;
    readonly remaining: number;
    readonly resetAt: number;
    readonly history: readonly QuotaUsageEntry[];
}
/**
 * Quota usage entry
 */
export interface QuotaUsageEntry {
    readonly timestamp: number;
    readonly amount: number;
    readonly metadata: Readonly<Record<string, unknown>>;
}
/**
 * Rate limit event
 */
export interface RateLimitEvent {
    readonly eventId: string;
    readonly type: RateLimitEventType;
    readonly configId: string;
    readonly key: string;
    readonly timestamp: number;
    readonly data: Readonly<Record<string, unknown>>;
}
/**
 * Rate limit event type
 */
export type RateLimitEventType = 'request_allowed' | 'request_denied' | 'limit_reached' | 'quota_exceeded' | 'quota_reset' | 'config_created' | 'config_updated' | 'config_deleted';
/**
 * Rate limit event listener
 */
export type RateLimitEventListener = (event: RateLimitEvent) => void | Promise<void>;
/**
 * Rate limiter statistics
 */
export interface RateLimiterStatistics {
    readonly totalRequests: number;
    readonly allowedRequests: number;
    readonly deniedRequests: number;
    readonly allowRate: number;
    readonly denyRate: number;
    readonly avgResponseTime: number;
    readonly activeKeys: number;
    readonly quotaExceeded: number;
}
/**
 * Distributed lock
 */
export interface DistributedLock {
    readonly lockId: string;
    readonly key: string;
    readonly ownerId: string;
    readonly acquiredAt: number;
    readonly expiresAt: number;
}
/**
 * Create rate limit configuration
 */
export declare function createConfig(name: string, options: {
    algorithm?: RateLimitAlgorithm;
    limit: number;
    window: number;
    burstLimit?: number;
    keyGenerator?: RateLimitKeyGenerator;
    skipCondition?: RateLimitSkipCondition;
    onLimitReached?: RateLimitCallback;
    metadata?: Record<string, unknown>;
}): RateLimitConfig;
/**
 * Get configuration
 */
export declare function getConfig(configId: string): RateLimitConfig | null;
/**
 * Get configuration by name
 */
export declare function getConfigByName(name: string): RateLimitConfig | null;
/**
 * Get all configurations
 */
export declare function getAllConfigs(): readonly RateLimitConfig[];
/**
 * Update configuration
 */
export declare function updateConfig(configId: string, updates: Partial<Pick<RateLimitConfig, 'limit' | 'window' | 'burstLimit' | 'metadata'>>): RateLimitConfig | null;
/**
 * Delete configuration
 */
export declare function deleteConfig(configId: string): boolean;
/**
 * Check rate limit
 */
export declare function checkRateLimit(configId: string, context: RateLimitContext, cost?: number): Promise<RateLimitResult>;
/**
 * Check rate limit by name
 */
export declare function checkRateLimitByName(name: string, context: RateLimitContext, cost?: number): Promise<RateLimitResult>;
/**
 * Reset rate limit for key
 */
export declare function resetRateLimit(configId: string, key: string): boolean;
/**
 * Get current rate limit state
 */
export declare function getRateLimitState(configId: string, key: string): {
    remaining: number;
    limit: number;
    resetAt: number;
} | null;
/**
 * Create quota
 */
export declare function createQuota(name: string, options: {
    limit: number;
    period: QuotaPeriod;
}): Quota;
/**
 * Get quota
 */
export declare function getQuota(quotaId: string): Quota | null;
/**
 * Get quota by name
 */
export declare function getQuotaByName(name: string): Quota | null;
/**
 * Get all quotas
 */
export declare function getAllQuotas(): readonly Quota[];
/**
 * Check quota
 */
export declare function checkQuota(quotaId: string, key: string, amount?: number): Promise<{
    allowed: boolean;
    remaining: number;
    limit: number;
    resetAt: number;
}>;
/**
 * Get quota usage
 */
export declare function getQuotaUsage(quotaId: string, key: string): QuotaUsage | null;
/**
 * Reset quota usage
 */
export declare function resetQuotaUsage(quotaId: string, key: string): boolean;
/**
 * Delete quota
 */
export declare function deleteQuota(quotaId: string): boolean;
/**
 * Add event listener
 */
export declare function addEventListener(listener: RateLimitEventListener): void;
/**
 * Remove event listener
 */
export declare function removeEventListener(listener: RateLimitEventListener): void;
/**
 * Clear event listeners
 */
export declare function clearEventListeners(): void;
/**
 * Get statistics
 */
export declare function getStatistics(): Readonly<RateLimiterStatistics>;
/**
 * Reset statistics
 */
export declare function resetStatistics(): void;
/**
 * Clear all state
 */
export declare function clearAll(): void;
/**
 * Cleanup expired entries
 */
export declare function cleanupExpired(): number;
