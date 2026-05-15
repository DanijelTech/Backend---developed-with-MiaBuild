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

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI ZA CACHE MANAGER
// ============================================================================

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
export type CacheEventType = 
    | 'get'
    | 'set'
    | 'delete'
    | 'expire'
    | 'evict'
    | 'invalidate'
    | 'warmup'
    | 'clear';

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

// ============================================================================
// STANJE
// ============================================================================

const l1Cache: Map<string, CacheEntry> = new Map();
const l2Cache: Map<string, CacheEntry> = new Map();
const l3Cache: Map<string, CacheEntry> = new Map();
const eventListeners: Set<CacheEventListener> = new Set();
const invalidationPatterns: Map<string, InvalidationPattern> = new Map();

let eventCounter = 0;
let patternCounter = 0;

const statistics: CacheStatistics = {
    totalHits: 0,
    totalMisses: 0,
    hitRatio: 0,
    totalEntries: 0,
    totalSize: 0,
    avgEntrySize: 0,
    avgAccessTime: 0,
    evictionCount: 0,
    invalidationCount: 0,
    expirationCount: 0,
    tierStatistics: {
        L1: { tier: 'L1', hits: 0, misses: 0, hitRatio: 0, entries: 0, size: 0, evictions: 0 },
        L2: { tier: 'L2', hits: 0, misses: 0, hitRatio: 0, entries: 0, size: 0, evictions: 0 },
        L3: { tier: 'L3', hits: 0, misses: 0, hitRatio: 0, entries: 0, size: 0, evictions: 0 },
    },
};

const tierConfigs: Record<CacheTier, TierConfig> = {
    L1: {
        tier: 'L1',
        maxSize: 10485760,
        maxEntries: 1000,
        defaultTtl: 60000,
        evictionPolicy: 'LRU',
        enabled: true,
    },
    L2: {
        tier: 'L2',
        maxSize: 104857600,
        maxEntries: 10000,
        defaultTtl: 300000,
        evictionPolicy: 'LRU',
        enabled: true,
    },
    L3: {
        tier: 'L3',
        maxSize: 1073741824,
        maxEntries: 100000,
        defaultTtl: 3600000,
        evictionPolicy: 'LFU',
        enabled: true,
    },
};

let globalConfig: CacheConfig = {
    maxSize: 1188978688,
    maxEntries: 111000,
    defaultTtl: 300000,
    evictionPolicy: 'LRU',
    evictionThreshold: 0.9,
    enableCompression: true,
    compressionThreshold: 1024,
    enableStatistics: true,
    statisticsInterval: 60000,
    enableWarmup: true,
    warmupBatchSize: 100,
};

// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================

/**
 * Generate event ID
 */
function generateEventId(): string {
    eventCounter++;
    return generateDeterministicId(`cache-event-${eventCounter}`);
}

/**
 * Generate pattern ID
 */
function generatePatternId(): string {
    patternCounter++;
    return generateDeterministicId(`cache-pattern-${patternCounter}`);
}

/**
 * Get cache for tier
 */
function getCacheForTier(tier: CacheTier): Map<string, CacheEntry> {
    switch (tier) {
        case 'L1': return l1Cache;
        case 'L2': return l2Cache;
        case 'L3': return l3Cache;
    }
}

/**
 * Calculate entry size
 */
function calculateEntrySize(value: unknown): number {
    const json = JSON.stringify(value);
    return json.length * 2;
}

/**
 * Check if entry is expired
 */
function isEntryExpired(entry: CacheEntry): boolean {
    if (entry.expiresAt === null) {
        return false;
    }
    return clock.nowMs() > entry.expiresAt;
}

/**
 * Check if entry is stale
 */
function isEntryStale(entry: CacheEntry, staleTtl: number): boolean {
    if (entry.expiresAt === null) {
        return false;
    }
    return clock.nowMs() > entry.expiresAt - staleTtl;
}

/**
 * Emit cache event
 */
async function emitEvent(event: CacheEvent): Promise<void> {
    for (const listener of eventListeners) {
        try {
            await listener(event);
        } catch {
            // Ignore listener errors
        }
    }
}

/**
 * Update statistics for hit
 */
function recordHit(tier: CacheTier): void {
    if (!globalConfig.enableStatistics) {
        return;
    }
    
    const mutableStats = statistics as { totalHits: number; hitRatio: number; tierStatistics: Record<CacheTier, { hits: number; hitRatio: number }> };
    mutableStats.totalHits++;
    mutableStats.hitRatio = mutableStats.totalHits / (mutableStats.totalHits + statistics.totalMisses);
    
    const tierStats = mutableStats.tierStatistics[tier];
    tierStats.hits++;
    tierStats.hitRatio = tierStats.hits / (tierStats.hits + statistics.tierStatistics[tier].misses);
}

/**
 * Update statistics for miss
 */
function recordMiss(tier: CacheTier): void {
    if (!globalConfig.enableStatistics) {
        return;
    }
    
    const mutableStats = statistics as { totalMisses: number; hitRatio: number; tierStatistics: Record<CacheTier, { misses: number; hitRatio: number }> };
    mutableStats.totalMisses++;
    mutableStats.hitRatio = statistics.totalHits / (statistics.totalHits + mutableStats.totalMisses);
    
    const tierStats = mutableStats.tierStatistics[tier];
    tierStats.misses++;
    tierStats.hitRatio = statistics.tierStatistics[tier].hits / (statistics.tierStatistics[tier].hits + tierStats.misses);
}

/**
 * Update statistics for eviction
 */
function recordEviction(tier: CacheTier): void {
    if (!globalConfig.enableStatistics) {
        return;
    }
    
    const mutableStats = statistics as { evictionCount: number; tierStatistics: Record<CacheTier, { evictions: number }> };
    mutableStats.evictionCount++;
    mutableStats.tierStatistics[tier].evictions++;
}

/**
 * Find entry to evict using LRU
 */
function findLruEntry(cache: Map<string, CacheEntry>): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of cache) {
        if (entry.lastAccessedAt < oldestTime) {
            oldestTime = entry.lastAccessedAt;
            oldestKey = key;
        }
    }
    
    return oldestKey;
}

/**
 * Find entry to evict using LFU
 */
function findLfuEntry(cache: Map<string, CacheEntry>): string | null {
    let leastKey: string | null = null;
    let leastCount = Infinity;
    
    for (const [key, entry] of cache) {
        if (entry.accessCount < leastCount) {
            leastCount = entry.accessCount;
            leastKey = key;
        }
    }
    
    return leastKey;
}

/**
 * Find entry to evict using FIFO
 */
function findFifoEntry(cache: Map<string, CacheEntry>): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of cache) {
        if (entry.createdAt < oldestTime) {
            oldestTime = entry.createdAt;
            oldestKey = key;
        }
    }
    
    return oldestKey;
}

/**
 * Find entry to evict using TTL
 */
function findTtlEntry(cache: Map<string, CacheEntry>): string | null {
    let nearestKey: string | null = null;
    let nearestExpiry = Infinity;
    
    for (const [key, entry] of cache) {
        const expiry = entry.expiresAt ?? Infinity;
        if (expiry < nearestExpiry) {
            nearestExpiry = expiry;
            nearestKey = key;
        }
    }
    
    return nearestKey;
}

/**
 * Find entry to evict using SIZE
 */
function findSizeEntry(cache: Map<string, CacheEntry>): string | null {
    let largestKey: string | null = null;
    let largestSize = 0;
    
    for (const [key, entry] of cache) {
        if (entry.size > largestSize) {
            largestSize = entry.size;
            largestKey = key;
        }
    }
    
    return largestKey;
}

/**
 * Find entry to evict
 */
function findEntryToEvict(cache: Map<string, CacheEntry>, policy: EvictionPolicy): string | null {
    switch (policy) {
        case 'LRU': return findLruEntry(cache);
        case 'LFU': return findLfuEntry(cache);
        case 'FIFO': return findFifoEntry(cache);
        case 'TTL': return findTtlEntry(cache);
        case 'SIZE': return findSizeEntry(cache);
        case 'RANDOM': {
            const keys = Array.from(cache.keys());
            if (keys.length === 0) return null;
            const index = Math.floor(keys.length / 2);
            return keys[index];
        }
    }
}

/**
 * Evict entries if needed
 */
async function evictIfNeeded(tier: CacheTier): Promise<void> {
    const cache = getCacheForTier(tier);
    const config = tierConfigs[tier];
    
    if (!config.enabled) {
        return;
    }
    
    let currentSize = 0;
    for (const entry of cache.values()) {
        currentSize += entry.size;
    }
    
    while (cache.size > config.maxEntries || currentSize > config.maxSize) {
        const keyToEvict = findEntryToEvict(cache, config.evictionPolicy);
        if (!keyToEvict) {
            break;
        }
        
        const entry = cache.get(keyToEvict);
        if (entry) {
            currentSize -= entry.size;
            cache.delete(keyToEvict);
            recordEviction(tier);
            
            await emitEvent({
                eventId: generateEventId(),
                type: 'evict',
                key: keyToEvict,
                tier,
                timestamp: clock.nowMs(),
                metadata: { reason: 'capacity' },
            });
        }
    }
}

/**
 * Cleanup expired entries
 */
async function cleanupExpired(tier: CacheTier): Promise<number> {
    const cache = getCacheForTier(tier);
    let count = 0;
    
    for (const [key, entry] of cache) {
        if (isEntryExpired(entry)) {
            cache.delete(key);
            count++;
            
            const mutableStats = statistics as { expirationCount: number };
            mutableStats.expirationCount++;
            
            await emitEvent({
                eventId: generateEventId(),
                type: 'expire',
                key,
                tier,
                timestamp: clock.nowMs(),
                metadata: {},
            });
        }
    }
    
    return count;
}

// ============================================================================
// CACHE OPERATIONS
// ============================================================================

/**
 * Get value from cache
 */
export async function get<T>(key: string, tier?: CacheTier): Promise<T | null> {
    const tiers: CacheTier[] = tier ? [tier] : ['L1', 'L2', 'L3'];
    
    for (const t of tiers) {
        if (!tierConfigs[t].enabled) {
            continue;
        }
        
        const cache = getCacheForTier(t);
        const entry = cache.get(key);
        
        if (entry) {
            if (isEntryExpired(entry)) {
                cache.delete(key);
                recordMiss(t);
                continue;
            }
            
            const updatedEntry: CacheEntry = {
                ...entry,
                accessCount: entry.accessCount + 1,
                lastAccessedAt: clock.nowMs(),
            };
            cache.set(key, updatedEntry);
            
            recordHit(t);
            
            await emitEvent({
                eventId: generateEventId(),
                type: 'get',
                key,
                tier: t,
                timestamp: clock.nowMs(),
                metadata: { hit: true },
            });
            
            return entry.value as T;
        }
        
        recordMiss(t);
    }
    
    return null;
}

/**
 * Set value in cache
 */
export async function set<T>(
    key: string,
    value: T,
    options: Partial<CacheOptions> = {}
): Promise<CacheEntry<T>> {
    const tier = options.tier ?? 'L1';
    const config = tierConfigs[tier];
    
    if (!config.enabled) {
        throw new Error(`Cache tier ${tier} is disabled`);
    }
    
    const cache = getCacheForTier(tier);
    const now = clock.nowMs();
    const ttl = options.ttl ?? config.defaultTtl;
    const size = calculateEntrySize(value);
    
    const entry: CacheEntry<T> = {
        key,
        value,
        tier,
        createdAt: now,
        updatedAt: now,
        expiresAt: ttl > 0 ? now + ttl : null,
        accessCount: 0,
        lastAccessedAt: now,
        size,
        tags: options.tags ?? [],
        metadata: options.metadata ?? {},
        status: 'valid',
        version: 1,
    };
    
    await evictIfNeeded(tier);
    
    cache.set(key, entry as CacheEntry);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'set',
        key,
        tier,
        timestamp: now,
        metadata: { size, ttl },
    });
    
    return entry;
}

/**
 * Delete value from cache
 */
export async function del(key: string, tier?: CacheTier): Promise<boolean> {
    const tiers: CacheTier[] = tier ? [tier] : ['L1', 'L2', 'L3'];
    let deleted = false;
    
    for (const t of tiers) {
        const cache = getCacheForTier(t);
        if (cache.delete(key)) {
            deleted = true;
            
            await emitEvent({
                eventId: generateEventId(),
                type: 'delete',
                key,
                tier: t,
                timestamp: clock.nowMs(),
                metadata: {},
            });
        }
    }
    
    return deleted;
}

/**
 * Check if key exists in cache
 */
export function has(key: string, tier?: CacheTier): boolean {
    const tiers: CacheTier[] = tier ? [tier] : ['L1', 'L2', 'L3'];
    
    for (const t of tiers) {
        if (!tierConfigs[t].enabled) {
            continue;
        }
        
        const cache = getCacheForTier(t);
        const entry = cache.get(key);
        
        if (entry && !isEntryExpired(entry)) {
            return true;
        }
    }
    
    return false;
}

/**
 * Get or set value
 */
export async function getOrSet<T>(
    key: string,
    loader: CacheLoader<T>,
    options: Partial<CacheOptions> = {}
): Promise<T> {
    const cached = await get<T>(key, options.tier);
    
    if (cached !== null) {
        return cached;
    }
    
    const value = await loader(key);
    await set(key, value, options);
    
    return value;
}

/**
 * Get entry metadata
 */
export function getEntry(key: string, tier?: CacheTier): CacheEntry | null {
    const tiers: CacheTier[] = tier ? [tier] : ['L1', 'L2', 'L3'];
    
    for (const t of tiers) {
        const cache = getCacheForTier(t);
        const entry = cache.get(key);
        
        if (entry && !isEntryExpired(entry)) {
            return entry;
        }
    }
    
    return null;
}

/**
 * Update entry metadata
 */
export async function touch(key: string, tier?: CacheTier): Promise<boolean> {
    const tiers: CacheTier[] = tier ? [tier] : ['L1', 'L2', 'L3'];
    
    for (const t of tiers) {
        const cache = getCacheForTier(t);
        const entry = cache.get(key);
        
        if (entry && !isEntryExpired(entry)) {
            const updatedEntry: CacheEntry = {
                ...entry,
                lastAccessedAt: clock.nowMs(),
                accessCount: entry.accessCount + 1,
            };
            cache.set(key, updatedEntry);
            return true;
        }
    }
    
    return false;
}

/**
 * Extend TTL for entry
 */
export async function extendTtl(key: string, additionalTtl: number, tier?: CacheTier): Promise<boolean> {
    const tiers: CacheTier[] = tier ? [tier] : ['L1', 'L2', 'L3'];
    
    for (const t of tiers) {
        const cache = getCacheForTier(t);
        const entry = cache.get(key);
        
        if (entry && !isEntryExpired(entry)) {
            const newExpiry = entry.expiresAt !== null
                ? entry.expiresAt + additionalTtl
                : clock.nowMs() + additionalTtl;
            
            const updatedEntry: CacheEntry = {
                ...entry,
                expiresAt: newExpiry,
                updatedAt: clock.nowMs(),
            };
            cache.set(key, updatedEntry);
            return true;
        }
    }
    
    return false;
}

// ============================================================================
// INVALIDATION
// ============================================================================

/**
 * Invalidate by key
 */
export async function invalidate(key: string, tier?: CacheTier): Promise<boolean> {
    const deleted = await del(key, tier);
    
    if (deleted) {
        const mutableStats = statistics as { invalidationCount: number };
        mutableStats.invalidationCount++;
    }
    
    return deleted;
}

/**
 * Invalidate by pattern
 */
export async function invalidateByPattern(pattern: string | RegExp, tier?: CacheTier): Promise<number> {
    const tiers: CacheTier[] = tier ? [tier] : ['L1', 'L2', 'L3'];
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    let count = 0;
    
    for (const t of tiers) {
        const cache = getCacheForTier(t);
        
        for (const key of cache.keys()) {
            if (regex.test(key)) {
                cache.delete(key);
                count++;
                
                await emitEvent({
                    eventId: generateEventId(),
                    type: 'invalidate',
                    key,
                    tier: t,
                    timestamp: clock.nowMs(),
                    metadata: { pattern: pattern.toString() },
                });
            }
        }
    }
    
    const mutableStats = statistics as { invalidationCount: number };
    mutableStats.invalidationCount += count;
    
    return count;
}

/**
 * Invalidate by tags
 */
export async function invalidateByTags(tags: readonly string[], tier?: CacheTier): Promise<number> {
    const tiers: CacheTier[] = tier ? [tier] : ['L1', 'L2', 'L3'];
    let count = 0;
    
    for (const t of tiers) {
        const cache = getCacheForTier(t);
        
        for (const [key, entry] of cache) {
            const hasMatchingTag = tags.some(tag => entry.tags.includes(tag));
            if (hasMatchingTag) {
                cache.delete(key);
                count++;
                
                await emitEvent({
                    eventId: generateEventId(),
                    type: 'invalidate',
                    key,
                    tier: t,
                    timestamp: clock.nowMs(),
                    metadata: { tags },
                });
            }
        }
    }
    
    const mutableStats = statistics as { invalidationCount: number };
    mutableStats.invalidationCount += count;
    
    return count;
}

/**
 * Register invalidation pattern
 */
export function registerInvalidationPattern(
    pattern: string | RegExp,
    options: { tags?: readonly string[]; tier?: CacheTier } = {}
): InvalidationPattern {
    const patternId = generatePatternId();
    
    const invalidationPattern: InvalidationPattern = {
        patternId,
        pattern,
        tags: options.tags ?? null,
        tier: options.tier ?? null,
    };
    
    invalidationPatterns.set(patternId, invalidationPattern);
    
    return invalidationPattern;
}

/**
 * Unregister invalidation pattern
 */
export function unregisterInvalidationPattern(patternId: string): boolean {
    return invalidationPatterns.delete(patternId);
}

/**
 * Apply registered invalidation patterns
 */
export async function applyInvalidationPatterns(key: string): Promise<number> {
    let count = 0;
    
    for (const pattern of invalidationPatterns.values()) {
        const regex = typeof pattern.pattern === 'string'
            ? new RegExp(pattern.pattern)
            : pattern.pattern;
        
        if (regex.test(key)) {
            if (pattern.tags) {
                count += await invalidateByTags(pattern.tags, pattern.tier ?? undefined);
            } else {
                count += await invalidateByPattern(pattern.pattern, pattern.tier ?? undefined);
            }
        }
    }
    
    return count;
}

// ============================================================================
// CACHE WARMING
// ============================================================================

/**
 * Warm cache with sources
 */
export async function warmup<T>(sources: readonly WarmupSource<T>[]): Promise<{
    success: number;
    failed: number;
    errors: readonly { key: string; error: string }[];
}> {
    let success = 0;
    let failed = 0;
    const errors: { key: string; error: string }[] = [];
    
    for (const source of sources) {
        try {
            const value = await source.loader();
            await set(source.key, value, source.options);
            success++;
            
            await emitEvent({
                eventId: generateEventId(),
                type: 'warmup',
                key: source.key,
                tier: source.options.tier ?? 'L1',
                timestamp: clock.nowMs(),
                metadata: { success: true },
            });
        } catch (error) {
            failed++;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            errors.push({ key: source.key, error: errorMessage });
            
            await emitEvent({
                eventId: generateEventId(),
                type: 'warmup',
                key: source.key,
                tier: source.options.tier ?? 'L1',
                timestamp: clock.nowMs(),
                metadata: { success: false, error: errorMessage },
            });
        }
    }
    
    return { success, failed, errors };
}

/**
 * Warm cache from another tier
 */
export async function warmupFromTier(
    sourceTier: CacheTier,
    targetTier: CacheTier,
    keys?: readonly string[]
): Promise<number> {
    const sourceCache = getCacheForTier(sourceTier);
    let count = 0;
    
    const keysToWarm = keys ?? Array.from(sourceCache.keys());
    
    for (const key of keysToWarm) {
        const entry = sourceCache.get(key);
        if (entry && !isEntryExpired(entry)) {
            await set(key, entry.value, {
                tier: targetTier,
                ttl: entry.expiresAt !== null ? entry.expiresAt - clock.nowMs() : null,
                tags: [...entry.tags],
                metadata: { ...entry.metadata },
            });
            count++;
        }
    }
    
    return count;
}

// ============================================================================
// CLEAR OPERATIONS
// ============================================================================

/**
 * Clear tier
 */
export async function clearTier(tier: CacheTier): Promise<number> {
    const cache = getCacheForTier(tier);
    const count = cache.size;
    
    cache.clear();
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'clear',
        key: '*',
        tier,
        timestamp: clock.nowMs(),
        metadata: { count },
    });
    
    return count;
}

/**
 * Clear all caches
 */
export async function clearAll(): Promise<number> {
    let total = 0;
    
    total += await clearTier('L1');
    total += await clearTier('L2');
    total += await clearTier('L3');
    
    return total;
}

/**
 * Cleanup expired entries in all tiers
 */
export async function cleanupAllExpired(): Promise<number> {
    let total = 0;
    
    total += await cleanupExpired('L1');
    total += await cleanupExpired('L2');
    total += await cleanupExpired('L3');
    
    return total;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Configure cache manager
 */
export function configure(config: Partial<CacheConfig>): void {
    globalConfig = { ...globalConfig, ...config };
}

/**
 * Configure tier
 */
export function configureTier(tier: CacheTier, config: Partial<TierConfig>): void {
    tierConfigs[tier] = { ...tierConfigs[tier], ...config };
}

/**
 * Get configuration
 */
export function getConfig(): Readonly<CacheConfig> {
    return { ...globalConfig };
}

/**
 * Get tier configuration
 */
export function getTierConfig(tier: CacheTier): Readonly<TierConfig> {
    return { ...tierConfigs[tier] };
}

/**
 * Enable tier
 */
export function enableTier(tier: CacheTier): void {
    tierConfigs[tier] = { ...tierConfigs[tier], enabled: true };
}

/**
 * Disable tier
 */
export function disableTier(tier: CacheTier): void {
    tierConfigs[tier] = { ...tierConfigs[tier], enabled: false };
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get statistics
 */
export function getStatistics(): Readonly<CacheStatistics> {
    const l1Size = Array.from(l1Cache.values()).reduce((sum, e) => sum + e.size, 0);
    const l2Size = Array.from(l2Cache.values()).reduce((sum, e) => sum + e.size, 0);
    const l3Size = Array.from(l3Cache.values()).reduce((sum, e) => sum + e.size, 0);
    
    const totalEntries = l1Cache.size + l2Cache.size + l3Cache.size;
    const totalSize = l1Size + l2Size + l3Size;
    
    return {
        ...statistics,
        totalEntries,
        totalSize,
        avgEntrySize: totalEntries > 0 ? totalSize / totalEntries : 0,
        tierStatistics: {
            L1: { ...statistics.tierStatistics.L1, entries: l1Cache.size, size: l1Size },
            L2: { ...statistics.tierStatistics.L2, entries: l2Cache.size, size: l2Size },
            L3: { ...statistics.tierStatistics.L3, entries: l3Cache.size, size: l3Size },
        },
    };
}

/**
 * Reset statistics
 */
export function resetStatistics(): void {
    Object.assign(statistics, {
        totalHits: 0,
        totalMisses: 0,
        hitRatio: 0,
        totalEntries: 0,
        totalSize: 0,
        avgEntrySize: 0,
        avgAccessTime: 0,
        evictionCount: 0,
        invalidationCount: 0,
        expirationCount: 0,
        tierStatistics: {
            L1: { tier: 'L1', hits: 0, misses: 0, hitRatio: 0, entries: 0, size: 0, evictions: 0 },
            L2: { tier: 'L2', hits: 0, misses: 0, hitRatio: 0, entries: 0, size: 0, evictions: 0 },
            L3: { tier: 'L3', hits: 0, misses: 0, hitRatio: 0, entries: 0, size: 0, evictions: 0 },
        },
    });
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Add event listener
 */
export function addEventListener(listener: CacheEventListener): void {
    eventListeners.add(listener);
}

/**
 * Remove event listener
 */
export function removeEventListener(listener: CacheEventListener): void {
    eventListeners.delete(listener);
}

/**
 * Clear event listeners
 */
export function clearEventListeners(): void {
    eventListeners.clear();
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get all keys
 */
export function keys(tier?: CacheTier): readonly string[] {
    const tiers: CacheTier[] = tier ? [tier] : ['L1', 'L2', 'L3'];
    const allKeys: string[] = [];
    
    for (const t of tiers) {
        const cache = getCacheForTier(t);
        allKeys.push(...cache.keys());
    }
    
    return [...new Set(allKeys)];
}

/**
 * Get entries by tag
 */
export function getEntriesByTag(tag: string, tier?: CacheTier): readonly CacheEntry[] {
    const tiers: CacheTier[] = tier ? [tier] : ['L1', 'L2', 'L3'];
    const entries: CacheEntry[] = [];
    
    for (const t of tiers) {
        const cache = getCacheForTier(t);
        for (const entry of cache.values()) {
            if (entry.tags.includes(tag) && !isEntryExpired(entry)) {
                entries.push(entry);
            }
        }
    }
    
    return entries;
}

/**
 * Get multiple values
 */
export async function getMany<T>(keys: readonly string[], tier?: CacheTier): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();
    
    for (const key of keys) {
        const value = await get<T>(key, tier);
        results.set(key, value);
    }
    
    return results;
}

/**
 * Set multiple values
 */
export async function setMany<T>(
    entries: readonly { key: string; value: T; options?: Partial<CacheOptions> }[]
): Promise<void> {
    for (const entry of entries) {
        await set(entry.key, entry.value, entry.options);
    }
}

/**
 * Delete multiple keys
 */
export async function delMany(keys: readonly string[], tier?: CacheTier): Promise<number> {
    let count = 0;
    
    for (const key of keys) {
        if (await del(key, tier)) {
            count++;
        }
    }
    
    return count;
}

/**
 * Create cached function wrapper
 */
export function cached<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    options: Partial<CachedFunctionOptions> = {}
): T {
    const keyGenerator = options.keyGenerator ?? ((...args) => JSON.stringify(args));
    const tier = options.tier ?? 'L1';
    const ttl = options.ttl ?? null;
    const tags = options.tags ?? [];
    
    return (async (...args: unknown[]) => {
        const key = keyGenerator(...args);
        const cached = await get(key, tier);
        
        if (cached !== null) {
            return cached;
        }
        
        const result = await fn(...args);
        await set(key, result, { tier, ttl, tags });
        
        return result;
    }) as T;
}
