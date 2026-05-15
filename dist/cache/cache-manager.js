"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.get = get;
exports.set = set;
exports.del = del;
exports.has = has;
exports.getOrSet = getOrSet;
exports.getEntry = getEntry;
exports.touch = touch;
exports.extendTtl = extendTtl;
exports.invalidate = invalidate;
exports.invalidateByPattern = invalidateByPattern;
exports.invalidateByTags = invalidateByTags;
exports.registerInvalidationPattern = registerInvalidationPattern;
exports.unregisterInvalidationPattern = unregisterInvalidationPattern;
exports.applyInvalidationPatterns = applyInvalidationPatterns;
exports.warmup = warmup;
exports.warmupFromTier = warmupFromTier;
exports.clearTier = clearTier;
exports.clearAll = clearAll;
exports.cleanupAllExpired = cleanupAllExpired;
exports.configure = configure;
exports.configureTier = configureTier;
exports.getConfig = getConfig;
exports.getTierConfig = getTierConfig;
exports.enableTier = enableTier;
exports.disableTier = disableTier;
exports.getStatistics = getStatistics;
exports.resetStatistics = resetStatistics;
exports.addEventListener = addEventListener;
exports.removeEventListener = removeEventListener;
exports.clearEventListeners = clearEventListeners;
exports.keys = keys;
exports.getEntriesByTag = getEntriesByTag;
exports.getMany = getMany;
exports.setMany = setMany;
exports.delMany = delMany;
exports.cached = cached;
const clock_1 = require("@mia/core/clock");
const deterministic_1 = require("@mia/core/deterministic");
const clock = (0, clock_1.getClock)();
// ============================================================================
// STANJE
// ============================================================================
const l1Cache = new Map();
const l2Cache = new Map();
const l3Cache = new Map();
const eventListeners = new Set();
const invalidationPatterns = new Map();
let eventCounter = 0;
let patternCounter = 0;
const statistics = {
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
const tierConfigs = {
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
let globalConfig = {
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
function generateEventId() {
    eventCounter++;
    return (0, deterministic_1.generateDeterministicId)(`cache-event-${eventCounter}`);
}
/**
 * Generate pattern ID
 */
function generatePatternId() {
    patternCounter++;
    return (0, deterministic_1.generateDeterministicId)(`cache-pattern-${patternCounter}`);
}
/**
 * Get cache for tier
 */
function getCacheForTier(tier) {
    switch (tier) {
        case 'L1': return l1Cache;
        case 'L2': return l2Cache;
        case 'L3': return l3Cache;
    }
}
/**
 * Calculate entry size
 */
function calculateEntrySize(value) {
    const json = JSON.stringify(value);
    return json.length * 2;
}
/**
 * Check if entry is expired
 */
function isEntryExpired(entry) {
    if (entry.expiresAt === null) {
        return false;
    }
    return clock.nowMs() > entry.expiresAt;
}
/**
 * Check if entry is stale
 */
function isEntryStale(entry, staleTtl) {
    if (entry.expiresAt === null) {
        return false;
    }
    return clock.nowMs() > entry.expiresAt - staleTtl;
}
/**
 * Emit cache event
 */
async function emitEvent(event) {
    for (const listener of eventListeners) {
        try {
            await listener(event);
        }
        catch {
            // Ignore listener errors
        }
    }
}
/**
 * Update statistics for hit
 */
function recordHit(tier) {
    if (!globalConfig.enableStatistics) {
        return;
    }
    const mutableStats = statistics;
    mutableStats.totalHits++;
    mutableStats.hitRatio = mutableStats.totalHits / (mutableStats.totalHits + statistics.totalMisses);
    const tierStats = mutableStats.tierStatistics[tier];
    tierStats.hits++;
    tierStats.hitRatio = tierStats.hits / (tierStats.hits + statistics.tierStatistics[tier].misses);
}
/**
 * Update statistics for miss
 */
function recordMiss(tier) {
    if (!globalConfig.enableStatistics) {
        return;
    }
    const mutableStats = statistics;
    mutableStats.totalMisses++;
    mutableStats.hitRatio = statistics.totalHits / (statistics.totalHits + mutableStats.totalMisses);
    const tierStats = mutableStats.tierStatistics[tier];
    tierStats.misses++;
    tierStats.hitRatio = statistics.tierStatistics[tier].hits / (statistics.tierStatistics[tier].hits + tierStats.misses);
}
/**
 * Update statistics for eviction
 */
function recordEviction(tier) {
    if (!globalConfig.enableStatistics) {
        return;
    }
    const mutableStats = statistics;
    mutableStats.evictionCount++;
    mutableStats.tierStatistics[tier].evictions++;
}
/**
 * Find entry to evict using LRU
 */
function findLruEntry(cache) {
    let oldestKey = null;
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
function findLfuEntry(cache) {
    let leastKey = null;
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
function findFifoEntry(cache) {
    let oldestKey = null;
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
function findTtlEntry(cache) {
    let nearestKey = null;
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
function findSizeEntry(cache) {
    let largestKey = null;
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
function findEntryToEvict(cache, policy) {
    switch (policy) {
        case 'LRU': return findLruEntry(cache);
        case 'LFU': return findLfuEntry(cache);
        case 'FIFO': return findFifoEntry(cache);
        case 'TTL': return findTtlEntry(cache);
        case 'SIZE': return findSizeEntry(cache);
        case 'RANDOM': {
            const keys = Array.from(cache.keys());
            if (keys.length === 0)
                return null;
            const index = Math.floor(keys.length / 2);
            return keys[index];
        }
    }
}
/**
 * Evict entries if needed
 */
async function evictIfNeeded(tier) {
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
async function cleanupExpired(tier) {
    const cache = getCacheForTier(tier);
    let count = 0;
    for (const [key, entry] of cache) {
        if (isEntryExpired(entry)) {
            cache.delete(key);
            count++;
            const mutableStats = statistics;
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
async function get(key, tier) {
    const tiers = tier ? [tier] : ['L1', 'L2', 'L3'];
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
            const updatedEntry = {
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
            return entry.value;
        }
        recordMiss(t);
    }
    return null;
}
/**
 * Set value in cache
 */
async function set(key, value, options = {}) {
    const tier = options.tier ?? 'L1';
    const config = tierConfigs[tier];
    if (!config.enabled) {
        throw new Error(`Cache tier ${tier} is disabled`);
    }
    const cache = getCacheForTier(tier);
    const now = clock.nowMs();
    const ttl = options.ttl ?? config.defaultTtl;
    const size = calculateEntrySize(value);
    const entry = {
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
    cache.set(key, entry);
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
async function del(key, tier) {
    const tiers = tier ? [tier] : ['L1', 'L2', 'L3'];
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
function has(key, tier) {
    const tiers = tier ? [tier] : ['L1', 'L2', 'L3'];
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
async function getOrSet(key, loader, options = {}) {
    const cached = await get(key, options.tier);
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
function getEntry(key, tier) {
    const tiers = tier ? [tier] : ['L1', 'L2', 'L3'];
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
async function touch(key, tier) {
    const tiers = tier ? [tier] : ['L1', 'L2', 'L3'];
    for (const t of tiers) {
        const cache = getCacheForTier(t);
        const entry = cache.get(key);
        if (entry && !isEntryExpired(entry)) {
            const updatedEntry = {
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
async function extendTtl(key, additionalTtl, tier) {
    const tiers = tier ? [tier] : ['L1', 'L2', 'L3'];
    for (const t of tiers) {
        const cache = getCacheForTier(t);
        const entry = cache.get(key);
        if (entry && !isEntryExpired(entry)) {
            const newExpiry = entry.expiresAt !== null
                ? entry.expiresAt + additionalTtl
                : clock.nowMs() + additionalTtl;
            const updatedEntry = {
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
async function invalidate(key, tier) {
    const deleted = await del(key, tier);
    if (deleted) {
        const mutableStats = statistics;
        mutableStats.invalidationCount++;
    }
    return deleted;
}
/**
 * Invalidate by pattern
 */
async function invalidateByPattern(pattern, tier) {
    const tiers = tier ? [tier] : ['L1', 'L2', 'L3'];
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
    const mutableStats = statistics;
    mutableStats.invalidationCount += count;
    return count;
}
/**
 * Invalidate by tags
 */
async function invalidateByTags(tags, tier) {
    const tiers = tier ? [tier] : ['L1', 'L2', 'L3'];
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
    const mutableStats = statistics;
    mutableStats.invalidationCount += count;
    return count;
}
/**
 * Register invalidation pattern
 */
function registerInvalidationPattern(pattern, options = {}) {
    const patternId = generatePatternId();
    const invalidationPattern = {
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
function unregisterInvalidationPattern(patternId) {
    return invalidationPatterns.delete(patternId);
}
/**
 * Apply registered invalidation patterns
 */
async function applyInvalidationPatterns(key) {
    let count = 0;
    for (const pattern of invalidationPatterns.values()) {
        const regex = typeof pattern.pattern === 'string'
            ? new RegExp(pattern.pattern)
            : pattern.pattern;
        if (regex.test(key)) {
            if (pattern.tags) {
                count += await invalidateByTags(pattern.tags, pattern.tier ?? undefined);
            }
            else {
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
async function warmup(sources) {
    let success = 0;
    let failed = 0;
    const errors = [];
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
        }
        catch (error) {
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
async function warmupFromTier(sourceTier, targetTier, keys) {
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
async function clearTier(tier) {
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
async function clearAll() {
    let total = 0;
    total += await clearTier('L1');
    total += await clearTier('L2');
    total += await clearTier('L3');
    return total;
}
/**
 * Cleanup expired entries in all tiers
 */
async function cleanupAllExpired() {
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
function configure(config) {
    globalConfig = { ...globalConfig, ...config };
}
/**
 * Configure tier
 */
function configureTier(tier, config) {
    tierConfigs[tier] = { ...tierConfigs[tier], ...config };
}
/**
 * Get configuration
 */
function getConfig() {
    return { ...globalConfig };
}
/**
 * Get tier configuration
 */
function getTierConfig(tier) {
    return { ...tierConfigs[tier] };
}
/**
 * Enable tier
 */
function enableTier(tier) {
    tierConfigs[tier] = { ...tierConfigs[tier], enabled: true };
}
/**
 * Disable tier
 */
function disableTier(tier) {
    tierConfigs[tier] = { ...tierConfigs[tier], enabled: false };
}
// ============================================================================
// STATISTICS
// ============================================================================
/**
 * Get statistics
 */
function getStatistics() {
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
function resetStatistics() {
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
function addEventListener(listener) {
    eventListeners.add(listener);
}
/**
 * Remove event listener
 */
function removeEventListener(listener) {
    eventListeners.delete(listener);
}
/**
 * Clear event listeners
 */
function clearEventListeners() {
    eventListeners.clear();
}
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
/**
 * Get all keys
 */
function keys(tier) {
    const tiers = tier ? [tier] : ['L1', 'L2', 'L3'];
    const allKeys = [];
    for (const t of tiers) {
        const cache = getCacheForTier(t);
        allKeys.push(...cache.keys());
    }
    return [...new Set(allKeys)];
}
/**
 * Get entries by tag
 */
function getEntriesByTag(tag, tier) {
    const tiers = tier ? [tier] : ['L1', 'L2', 'L3'];
    const entries = [];
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
async function getMany(keys, tier) {
    const results = new Map();
    for (const key of keys) {
        const value = await get(key, tier);
        results.set(key, value);
    }
    return results;
}
/**
 * Set multiple values
 */
async function setMany(entries) {
    for (const entry of entries) {
        await set(entry.key, entry.value, entry.options);
    }
}
/**
 * Delete multiple keys
 */
async function delMany(keys, tier) {
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
function cached(fn, options = {}) {
    const keyGenerator = options.keyGenerator ?? ((...args) => JSON.stringify(args));
    const tier = options.tier ?? 'L1';
    const ttl = options.ttl ?? null;
    const tags = options.tags ?? [];
    return (async (...args) => {
        const key = keyGenerator(...args);
        const cached = await get(key, tier);
        if (cached !== null) {
            return cached;
        }
        const result = await fn(...args);
        await set(key, result, { tier, ttl, tags });
        return result;
    });
}
