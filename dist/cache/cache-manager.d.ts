/**
 * @file Cache Manager za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-CACHE-001 Cache management za zaledne sisteme
 * @design DSN-ZALEDNI-CACHE-001 Backend cache arhitektura
 * @test TEST-ZALEDNI-CACHE-001 Preverjanje cache management
 *
 * Cache Manager - prilagojen za zaledne sisteme:
 * - Multi-tier caching (L1, L2, L3)
 * - Cache invalidation strategies
 * - TTL management
 * - Cache warming
 * - Cache statistics
 * - Distributed cache support
 * - Cache serialization
 * - Memory management
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom CACHE_001 - Cache Manager
 */
/**
 * Cache tier
 */
export type CacheTier = 'L1' | 'L2' | 'L3';
/**
 * Cache entry status
 */
export type CacheEntryStatus = 'valid' | 'stale' | 'expired' | 'invalidated';
/**
 * Eviction policy
 */
export type EvictionPolicy = 'LRU' | 'LFU' | 'FIFO' | 'TTL' | 'RANDOM' | 'SIZE';
/**
 * Cache entry
 */
export interface CacheEntry<T = unknown> {
    readonly key: string;
    readonly value: T;
    readonly tier: CacheTier;
    readonly createdAt: number;
    readonly updatedAt: number;
    readonly expiresAt: number | null;
    readonly accessCount: number;
    readonly lastAccessedAt: number;
    readonly size: number;
    readonly tags: readonly string[];
    readonly metadata: Readonly<Record<string, unknown>>;
    readonly status: CacheEntryStatus;
    readonly version: number;
}
/**
 * Cache options
 */
export interface CacheOptions {
    readonly ttl: number | null;
    readonly tier: CacheTier;
    readonly tags: readonly string[];
    readonly metadata: Record<string, unknown>;
    readonly priority: number;
    readonly compress: boolean;
    readonly serialize: boolean;
}
/**
 * Cache configuration
 */
export interface CacheConfig {
    readonly maxSize: number;
    readonly maxEntries: number;
    readonly defaultTtl: number;
    readonly evictionPolicy: EvictionPolicy;
    readonly evictionThreshold: number;
    readonly enableCompression: boolean;
    readonly compressionThreshold: number;
    readonly enableStatistics: boolean;
    readonly statisticsInterval: number;
    readonly enableWarmup: boolean;
    readonly warmupBatchSize: number;
}
/**
 * Tier configuration
 */
export interface TierConfig {
    readonly tier: CacheTier;
    readonly maxSize: number;
    readonly maxEntries: number;
    readonly defaultTtl: number;
    readonly evictionPolicy: EvictionPolicy;
    readonly enabled: boolean;
}
/**
 * Cache statistics
 */
export interface CacheStatistics {
    readonly totalHits: number;
    readonly totalMisses: number;
    readonly hitRatio: number;
    readonly totalEntries: number;
    readonly totalSize: number;
    readonly avgEntrySize: number;
    readonly avgAccessTime: number;
    readonly evictionCount: number;
    readonly invalidationCount: number;
    readonly expirationCount: number;
    readonly tierStatistics: Readonly<Record<CacheTier, TierStatistics>>;
}
/**
 * Tier statistics
 */
export interface TierStatistics {
    readonly tier: CacheTier;
    readonly hits: number;
    readonly misses: number;
    readonly hitRatio: number;
    readonly entries: number;
    readonly size: number;
    readonly evictions: number;
}
/**
 * Cache event
 */
export interface CacheEvent {
    readonly eventId: string;
    readonly type: CacheEventType;
    readonly key: string;
    readonly tier: CacheTier;
    readonly timestamp: number;
    readonly metadata: Readonly<Record<string, unknown>>;
}
/**
 * Cache event type
 */
export type CacheEventType = 'get' | 'set' | 'delete' | 'expire' | 'evict' | 'invalidate' | 'warmup' | 'clear';
/**
 * Cache event listener
 */
export type CacheEventListener = (event: CacheEvent) => void | Promise<void>;
/**
 * Warmup source
 */
export interface WarmupSource<T = unknown> {
    readonly key: string;
    readonly loader: () => Promise<T>;
    readonly options: Partial<CacheOptions>;
}
/**
 * Cache loader
 */
export type CacheLoader<T = unknown> = (key: string) => Promise<T>;
/**
 * Cache serializer
 */
export interface CacheSerializer {
    serialize<T>(value: T): string;
    deserialize<T>(data: string): T;
}
/**
 * Cache compressor
 */
export interface CacheCompressor {
    compress(data: string): string;
    decompress(data: string): string;
}
/**
 * Invalidation pattern
 */
export interface InvalidationPattern {
    readonly patternId: string;
    readonly pattern: string | RegExp;
    readonly tags: readonly string[] | null;
    readonly tier: CacheTier | null;
}
/**
 * Cache key generator
 */
export type CacheKeyGenerator = (...args: unknown[]) => string;
/**
 * Cached function options
 */
export interface CachedFunctionOptions {
    readonly keyGenerator: CacheKeyGenerator;
    readonly ttl: number | null;
    readonly tier: CacheTier;
    readonly tags: readonly string[];
    readonly staleWhileRevalidate: boolean;
    readonly staleIfError: boolean;
}
/**
 * Get value from cache
 */
export declare function get<T>(key: string, tier?: CacheTier): Promise<T | null>;
/**
 * Set value in cache
 */
export declare function set<T>(key: string, value: T, options?: Partial<CacheOptions>): Promise<CacheEntry<T>>;
/**
 * Delete value from cache
 */
export declare function del(key: string, tier?: CacheTier): Promise<boolean>;
/**
 * Check if key exists in cache
 */
export declare function has(key: string, tier?: CacheTier): boolean;
/**
 * Get or set value
 */
export declare function getOrSet<T>(key: string, loader: CacheLoader<T>, options?: Partial<CacheOptions>): Promise<T>;
/**
 * Get entry metadata
 */
export declare function getEntry(key: string, tier?: CacheTier): CacheEntry | null;
/**
 * Update entry metadata
 */
export declare function touch(key: string, tier?: CacheTier): Promise<boolean>;
/**
 * Extend TTL for entry
 */
export declare function extendTtl(key: string, additionalTtl: number, tier?: CacheTier): Promise<boolean>;
/**
 * Invalidate by key
 */
export declare function invalidate(key: string, tier?: CacheTier): Promise<boolean>;
/**
 * Invalidate by pattern
 */
export declare function invalidateByPattern(pattern: string | RegExp, tier?: CacheTier): Promise<number>;
/**
 * Invalidate by tags
 */
export declare function invalidateByTags(tags: readonly string[], tier?: CacheTier): Promise<number>;
/**
 * Register invalidation pattern
 */
export declare function registerInvalidationPattern(pattern: string | RegExp, options?: {
    tags?: readonly string[];
    tier?: CacheTier;
}): InvalidationPattern;
/**
 * Unregister invalidation pattern
 */
export declare function unregisterInvalidationPattern(patternId: string): boolean;
/**
 * Apply registered invalidation patterns
 */
export declare function applyInvalidationPatterns(key: string): Promise<number>;
/**
 * Warm cache with sources
 */
export declare function warmup<T>(sources: readonly WarmupSource<T>[]): Promise<{
    success: number;
    failed: number;
    errors: readonly {
        key: string;
        error: string;
    }[];
}>;
/**
 * Warm cache from another tier
 */
export declare function warmupFromTier(sourceTier: CacheTier, targetTier: CacheTier, keys?: readonly string[]): Promise<number>;
/**
 * Clear tier
 */
export declare function clearTier(tier: CacheTier): Promise<number>;
/**
 * Clear all caches
 */
export declare function clearAll(): Promise<number>;
/**
 * Cleanup expired entries in all tiers
 */
export declare function cleanupAllExpired(): Promise<number>;
/**
 * Configure cache manager
 */
export declare function configure(config: Partial<CacheConfig>): void;
/**
 * Configure tier
 */
export declare function configureTier(tier: CacheTier, config: Partial<TierConfig>): void;
/**
 * Get configuration
 */
export declare function getConfig(): Readonly<CacheConfig>;
/**
 * Get tier configuration
 */
export declare function getTierConfig(tier: CacheTier): Readonly<TierConfig>;
/**
 * Enable tier
 */
export declare function enableTier(tier: CacheTier): void;
/**
 * Disable tier
 */
export declare function disableTier(tier: CacheTier): void;
/**
 * Get statistics
 */
export declare function getStatistics(): Readonly<CacheStatistics>;
/**
 * Reset statistics
 */
export declare function resetStatistics(): void;
/**
 * Add event listener
 */
export declare function addEventListener(listener: CacheEventListener): void;
/**
 * Remove event listener
 */
export declare function removeEventListener(listener: CacheEventListener): void;
/**
 * Clear event listeners
 */
export declare function clearEventListeners(): void;
/**
 * Get all keys
 */
export declare function keys(tier?: CacheTier): readonly string[];
/**
 * Get entries by tag
 */
export declare function getEntriesByTag(tag: string, tier?: CacheTier): readonly CacheEntry[];
/**
 * Get multiple values
 */
export declare function getMany<T>(keys: readonly string[], tier?: CacheTier): Promise<Map<string, T | null>>;
/**
 * Set multiple values
 */
export declare function setMany<T>(entries: readonly {
    key: string;
    value: T;
    options?: Partial<CacheOptions>;
}[]): Promise<void>;
/**
 * Delete multiple keys
 */
export declare function delMany(keys: readonly string[], tier?: CacheTier): Promise<number>;
/**
 * Create cached function wrapper
 */
export declare function cached<T extends (...args: unknown[]) => Promise<unknown>>(fn: T, options?: Partial<CachedFunctionOptions>): T;
