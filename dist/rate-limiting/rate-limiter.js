"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConfig = createConfig;
exports.getConfig = getConfig;
exports.getConfigByName = getConfigByName;
exports.getAllConfigs = getAllConfigs;
exports.updateConfig = updateConfig;
exports.deleteConfig = deleteConfig;
exports.checkRateLimit = checkRateLimit;
exports.checkRateLimitByName = checkRateLimitByName;
exports.resetRateLimit = resetRateLimit;
exports.getRateLimitState = getRateLimitState;
exports.createQuota = createQuota;
exports.getQuota = getQuota;
exports.getQuotaByName = getQuotaByName;
exports.getAllQuotas = getAllQuotas;
exports.checkQuota = checkQuota;
exports.getQuotaUsage = getQuotaUsage;
exports.resetQuotaUsage = resetQuotaUsage;
exports.deleteQuota = deleteQuota;
exports.addEventListener = addEventListener;
exports.removeEventListener = removeEventListener;
exports.clearEventListeners = clearEventListeners;
exports.getStatistics = getStatistics;
exports.resetStatistics = resetStatistics;
exports.clearAll = clearAll;
exports.cleanupExpired = cleanupExpired;
const clock_1 = require("@mia/core/clock");
const deterministic_1 = require("@mia/core/deterministic");
const clock = (0, clock_1.getClock)();
// ============================================================================
// STANJE
// ============================================================================
const configs = new Map();
const tokenBuckets = new Map();
const slidingWindows = new Map();
const fixedWindows = new Map();
const leakyBuckets = new Map();
const quotas = new Map();
const quotaUsages = new Map();
const eventListeners = new Set();
const locks = new Map();
let configCounter = 0;
let quotaCounter = 0;
let eventCounter = 0;
let lockCounter = 0;
const statistics = {
    totalRequests: 0,
    allowedRequests: 0,
    deniedRequests: 0,
    allowRate: 0,
    denyRate: 0,
    avgResponseTime: 0,
    activeKeys: 0,
    quotaExceeded: 0,
};
// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================
/**
 * Generate config ID
 */
function generateConfigId() {
    configCounter++;
    return (0, deterministic_1.generateDeterministicId)(`rate-config-${configCounter}`);
}
/**
 * Generate quota ID
 */
function generateQuotaId() {
    quotaCounter++;
    return (0, deterministic_1.generateDeterministicId)(`quota-${quotaCounter}`);
}
/**
 * Generate event ID
 */
function generateEventId() {
    eventCounter++;
    return (0, deterministic_1.generateDeterministicId)(`rate-event-${eventCounter}`);
}
/**
 * Generate lock ID
 */
function generateLockId() {
    lockCounter++;
    return (0, deterministic_1.generateDeterministicId)(`rate-lock-${lockCounter}`);
}
/**
 * Emit rate limit event
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
 * Update statistics
 */
function updateStatistics(allowed) {
    const mutableStats = statistics;
    mutableStats.totalRequests++;
    if (allowed) {
        mutableStats.allowedRequests++;
    }
    else {
        mutableStats.deniedRequests++;
    }
    mutableStats.allowRate = mutableStats.allowedRequests / mutableStats.totalRequests;
    mutableStats.denyRate = mutableStats.deniedRequests / mutableStats.totalRequests;
    mutableStats.activeKeys = tokenBuckets.size + slidingWindows.size + fixedWindows.size + leakyBuckets.size;
}
/**
 * Get period duration in milliseconds
 */
function getPeriodDuration(period) {
    switch (period) {
        case 'minute': return 60000;
        case 'hour': return 3600000;
        case 'day': return 86400000;
        case 'week': return 604800000;
        case 'month': return 2592000000;
    }
}
/**
 * Get period start
 */
function getPeriodStart(period, timestamp) {
    const date = new Date(timestamp);
    switch (period) {
        case 'minute':
            date.setSeconds(0, 0);
            break;
        case 'hour':
            date.setMinutes(0, 0, 0);
            break;
        case 'day':
            date.setHours(0, 0, 0, 0);
            break;
        case 'week':
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() - date.getDay());
            break;
        case 'month':
            date.setHours(0, 0, 0, 0);
            date.setDate(1);
            break;
    }
    return date.getTime();
}
/**
 * Build rate limit headers
 */
function buildHeaders(result) {
    const headers = {
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(Math.max(0, result.remaining)),
        'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
    };
    if (result.retryAfter !== null) {
        headers['Retry-After'] = String(Math.ceil(result.retryAfter / 1000));
    }
    return headers;
}
// ============================================================================
// TOKEN BUCKET ALGORITHM
// ============================================================================
/**
 * Check token bucket rate limit
 */
function checkTokenBucket(key, config, cost = 1) {
    const now = clock.nowMs();
    let state = tokenBuckets.get(key);
    if (!state) {
        state = {
            key,
            tokens: config.limit,
            lastRefill: now,
            capacity: config.limit,
            refillRate: config.limit / config.window,
        };
    }
    const elapsed = now - state.lastRefill;
    const refillAmount = elapsed * state.refillRate;
    const newTokens = Math.min(state.capacity, state.tokens + refillAmount);
    const allowed = newTokens >= cost;
    const remaining = allowed ? newTokens - cost : newTokens;
    tokenBuckets.set(key, {
        ...state,
        tokens: allowed ? remaining : newTokens,
        lastRefill: now,
    });
    const resetAt = now + config.window;
    const retryAfter = allowed ? null : Math.ceil((cost - newTokens) / state.refillRate);
    const result = {
        allowed,
        remaining: Math.floor(remaining),
        limit: config.limit,
        resetAt,
        retryAfter,
    };
    return {
        ...result,
        headers: buildHeaders(result),
    };
}
// ============================================================================
// SLIDING WINDOW ALGORITHM
// ============================================================================
/**
 * Check sliding window rate limit
 */
function checkSlidingWindow(key, config, cost = 1) {
    const now = clock.nowMs();
    let state = slidingWindows.get(key);
    if (!state) {
        state = {
            key,
            requests: [],
            windowStart: now,
            windowSize: config.window,
            limit: config.limit,
        };
    }
    const windowStart = now - config.window;
    const validRequests = state.requests.filter(t => t > windowStart);
    const currentCount = validRequests.length;
    const allowed = currentCount + cost <= config.limit;
    if (allowed) {
        for (let i = 0; i < cost; i++) {
            validRequests.push(now);
        }
    }
    slidingWindows.set(key, {
        ...state,
        requests: validRequests,
        windowStart: now,
    });
    const remaining = config.limit - validRequests.length;
    const resetAt = validRequests.length > 0 ? validRequests[0] + config.window : now + config.window;
    const retryAfter = allowed ? null : resetAt - now;
    const result = {
        allowed,
        remaining: Math.max(0, remaining),
        limit: config.limit,
        resetAt,
        retryAfter,
    };
    return {
        ...result,
        headers: buildHeaders(result),
    };
}
// ============================================================================
// FIXED WINDOW ALGORITHM
// ============================================================================
/**
 * Check fixed window rate limit
 */
function checkFixedWindow(key, config, cost = 1) {
    const now = clock.nowMs();
    let state = fixedWindows.get(key);
    const currentWindowStart = Math.floor(now / config.window) * config.window;
    if (!state || state.windowStart !== currentWindowStart) {
        state = {
            key,
            count: 0,
            windowStart: currentWindowStart,
            windowSize: config.window,
            limit: config.limit,
        };
    }
    const allowed = state.count + cost <= config.limit;
    const newCount = allowed ? state.count + cost : state.count;
    fixedWindows.set(key, {
        ...state,
        count: newCount,
    });
    const remaining = config.limit - newCount;
    const resetAt = currentWindowStart + config.window;
    const retryAfter = allowed ? null : resetAt - now;
    const result = {
        allowed,
        remaining: Math.max(0, remaining),
        limit: config.limit,
        resetAt,
        retryAfter,
    };
    return {
        ...result,
        headers: buildHeaders(result),
    };
}
// ============================================================================
// LEAKY BUCKET ALGORITHM
// ============================================================================
/**
 * Check leaky bucket rate limit
 */
function checkLeakyBucket(key, config, cost = 1) {
    const now = clock.nowMs();
    let state = leakyBuckets.get(key);
    if (!state) {
        state = {
            key,
            queue: 0,
            lastLeak: now,
            capacity: config.limit,
            leakRate: config.limit / config.window,
        };
    }
    const elapsed = now - state.lastLeak;
    const leaked = elapsed * state.leakRate;
    const currentQueue = Math.max(0, state.queue - leaked);
    const allowed = currentQueue + cost <= state.capacity;
    const newQueue = allowed ? currentQueue + cost : currentQueue;
    leakyBuckets.set(key, {
        ...state,
        queue: newQueue,
        lastLeak: now,
    });
    const remaining = state.capacity - newQueue;
    const resetAt = now + (newQueue / state.leakRate);
    const retryAfter = allowed ? null : Math.ceil((newQueue + cost - state.capacity) / state.leakRate);
    const result = {
        allowed,
        remaining: Math.floor(Math.max(0, remaining)),
        limit: config.limit,
        resetAt,
        retryAfter,
    };
    return {
        ...result,
        headers: buildHeaders(result),
    };
}
// ============================================================================
// CONFIGURATION MANAGEMENT
// ============================================================================
/**
 * Create rate limit configuration
 */
function createConfig(name, options) {
    const configId = generateConfigId();
    const config = {
        configId,
        name,
        algorithm: options.algorithm ?? 'token_bucket',
        limit: options.limit,
        window: options.window,
        burstLimit: options.burstLimit ?? null,
        keyGenerator: options.keyGenerator ?? ((ctx) => ctx.ip),
        skipCondition: options.skipCondition ?? null,
        onLimitReached: options.onLimitReached ?? null,
        metadata: options.metadata ?? {},
    };
    configs.set(configId, config);
    emitEvent({
        eventId: generateEventId(),
        type: 'config_created',
        configId,
        key: '',
        timestamp: clock.nowMs(),
        data: { name, algorithm: config.algorithm, limit: config.limit },
    });
    return config;
}
/**
 * Get configuration
 */
function getConfig(configId) {
    return configs.get(configId) ?? null;
}
/**
 * Get configuration by name
 */
function getConfigByName(name) {
    for (const config of configs.values()) {
        if (config.name === name) {
            return config;
        }
    }
    return null;
}
/**
 * Get all configurations
 */
function getAllConfigs() {
    return Array.from(configs.values());
}
/**
 * Update configuration
 */
function updateConfig(configId, updates) {
    const config = configs.get(configId);
    if (!config) {
        return null;
    }
    const updated = {
        ...config,
        ...updates,
    };
    configs.set(configId, updated);
    emitEvent({
        eventId: generateEventId(),
        type: 'config_updated',
        configId,
        key: '',
        timestamp: clock.nowMs(),
        data: updates,
    });
    return updated;
}
/**
 * Delete configuration
 */
function deleteConfig(configId) {
    const config = configs.get(configId);
    if (!config) {
        return false;
    }
    configs.delete(configId);
    emitEvent({
        eventId: generateEventId(),
        type: 'config_deleted',
        configId,
        key: '',
        timestamp: clock.nowMs(),
        data: { name: config.name },
    });
    return true;
}
// ============================================================================
// RATE LIMITING
// ============================================================================
/**
 * Check rate limit
 */
async function checkRateLimit(configId, context, cost = 1) {
    const config = configs.get(configId);
    if (!config) {
        return {
            allowed: true,
            remaining: Infinity,
            limit: Infinity,
            resetAt: 0,
            retryAfter: null,
            headers: {},
        };
    }
    if (config.skipCondition && config.skipCondition(context)) {
        return {
            allowed: true,
            remaining: config.limit,
            limit: config.limit,
            resetAt: clock.nowMs() + config.window,
            retryAfter: null,
            headers: {},
        };
    }
    const key = `${configId}:${config.keyGenerator(context)}`;
    let result;
    switch (config.algorithm) {
        case 'token_bucket':
            result = checkTokenBucket(key, config, cost);
            break;
        case 'sliding_window':
            result = checkSlidingWindow(key, config, cost);
            break;
        case 'fixed_window':
            result = checkFixedWindow(key, config, cost);
            break;
        case 'leaky_bucket':
            result = checkLeakyBucket(key, config, cost);
            break;
    }
    updateStatistics(result.allowed);
    if (!result.allowed && config.onLimitReached) {
        await config.onLimitReached(context, result);
    }
    await emitEvent({
        eventId: generateEventId(),
        type: result.allowed ? 'request_allowed' : 'request_denied',
        configId,
        key,
        timestamp: clock.nowMs(),
        data: { remaining: result.remaining, limit: result.limit },
    });
    if (!result.allowed) {
        await emitEvent({
            eventId: generateEventId(),
            type: 'limit_reached',
            configId,
            key,
            timestamp: clock.nowMs(),
            data: { retryAfter: result.retryAfter },
        });
    }
    return result;
}
/**
 * Check rate limit by name
 */
async function checkRateLimitByName(name, context, cost = 1) {
    const config = getConfigByName(name);
    if (!config) {
        return {
            allowed: true,
            remaining: Infinity,
            limit: Infinity,
            resetAt: 0,
            retryAfter: null,
            headers: {},
        };
    }
    return checkRateLimit(config.configId, context, cost);
}
/**
 * Reset rate limit for key
 */
function resetRateLimit(configId, key) {
    const fullKey = `${configId}:${key}`;
    let deleted = false;
    if (tokenBuckets.delete(fullKey))
        deleted = true;
    if (slidingWindows.delete(fullKey))
        deleted = true;
    if (fixedWindows.delete(fullKey))
        deleted = true;
    if (leakyBuckets.delete(fullKey))
        deleted = true;
    return deleted;
}
/**
 * Get current rate limit state
 */
function getRateLimitState(configId, key) {
    const config = configs.get(configId);
    if (!config) {
        return null;
    }
    const fullKey = `${configId}:${key}`;
    const now = clock.nowMs();
    switch (config.algorithm) {
        case 'token_bucket': {
            const state = tokenBuckets.get(fullKey);
            if (!state)
                return null;
            const elapsed = now - state.lastRefill;
            const tokens = Math.min(state.capacity, state.tokens + elapsed * state.refillRate);
            return {
                remaining: Math.floor(tokens),
                limit: config.limit,
                resetAt: now + config.window,
            };
        }
        case 'sliding_window': {
            const state = slidingWindows.get(fullKey);
            if (!state)
                return null;
            const windowStart = now - config.window;
            const validRequests = state.requests.filter(t => t > windowStart);
            return {
                remaining: config.limit - validRequests.length,
                limit: config.limit,
                resetAt: validRequests.length > 0 ? validRequests[0] + config.window : now + config.window,
            };
        }
        case 'fixed_window': {
            const state = fixedWindows.get(fullKey);
            if (!state)
                return null;
            const currentWindowStart = Math.floor(now / config.window) * config.window;
            if (state.windowStart !== currentWindowStart) {
                return {
                    remaining: config.limit,
                    limit: config.limit,
                    resetAt: currentWindowStart + config.window,
                };
            }
            return {
                remaining: config.limit - state.count,
                limit: config.limit,
                resetAt: state.windowStart + config.window,
            };
        }
        case 'leaky_bucket': {
            const state = leakyBuckets.get(fullKey);
            if (!state)
                return null;
            const elapsed = now - state.lastLeak;
            const leaked = elapsed * state.leakRate;
            const currentQueue = Math.max(0, state.queue - leaked);
            return {
                remaining: Math.floor(state.capacity - currentQueue),
                limit: config.limit,
                resetAt: now + (currentQueue / state.leakRate),
            };
        }
    }
}
// ============================================================================
// QUOTA MANAGEMENT
// ============================================================================
/**
 * Create quota
 */
function createQuota(name, options) {
    const quotaId = generateQuotaId();
    const now = clock.nowMs();
    const periodStart = getPeriodStart(options.period, now);
    const periodDuration = getPeriodDuration(options.period);
    const quota = {
        quotaId,
        name,
        limit: options.limit,
        period: options.period,
        used: 0,
        remaining: options.limit,
        resetAt: periodStart + periodDuration,
        createdAt: now,
        updatedAt: now,
    };
    quotas.set(quotaId, quota);
    return quota;
}
/**
 * Get quota
 */
function getQuota(quotaId) {
    return quotas.get(quotaId) ?? null;
}
/**
 * Get quota by name
 */
function getQuotaByName(name) {
    for (const quota of quotas.values()) {
        if (quota.name === name) {
            return quota;
        }
    }
    return null;
}
/**
 * Get all quotas
 */
function getAllQuotas() {
    return Array.from(quotas.values());
}
/**
 * Check quota
 */
async function checkQuota(quotaId, key, amount = 1) {
    const quota = quotas.get(quotaId);
    if (!quota) {
        return {
            allowed: true,
            remaining: Infinity,
            limit: Infinity,
            resetAt: 0,
        };
    }
    const now = clock.nowMs();
    const usageKey = `${quotaId}:${key}`;
    let usage = quotaUsages.get(usageKey);
    const periodStart = getPeriodStart(quota.period, now);
    const periodDuration = getPeriodDuration(quota.period);
    const resetAt = periodStart + periodDuration;
    if (!usage || now >= usage.resetAt) {
        usage = {
            quotaId,
            key,
            used: 0,
            limit: quota.limit,
            remaining: quota.limit,
            resetAt,
            history: [],
        };
    }
    const allowed = usage.used + amount <= quota.limit;
    if (allowed) {
        const newUsed = usage.used + amount;
        const newHistory = [
            ...usage.history,
            { timestamp: now, amount, metadata: {} },
        ].slice(-1000);
        usage = {
            ...usage,
            used: newUsed,
            remaining: quota.limit - newUsed,
            history: newHistory,
        };
        quotaUsages.set(usageKey, usage);
    }
    else {
        const mutableStats = statistics;
        mutableStats.quotaExceeded++;
        await emitEvent({
            eventId: generateEventId(),
            type: 'quota_exceeded',
            configId: quotaId,
            key,
            timestamp: now,
            data: { used: usage.used, limit: quota.limit, requested: amount },
        });
    }
    return {
        allowed,
        remaining: usage.remaining,
        limit: quota.limit,
        resetAt: usage.resetAt,
    };
}
/**
 * Get quota usage
 */
function getQuotaUsage(quotaId, key) {
    const usageKey = `${quotaId}:${key}`;
    return quotaUsages.get(usageKey) ?? null;
}
/**
 * Reset quota usage
 */
function resetQuotaUsage(quotaId, key) {
    const usageKey = `${quotaId}:${key}`;
    const usage = quotaUsages.get(usageKey);
    if (!usage) {
        return false;
    }
    const quota = quotas.get(quotaId);
    if (!quota) {
        return false;
    }
    const now = clock.nowMs();
    const periodStart = getPeriodStart(quota.period, now);
    const periodDuration = getPeriodDuration(quota.period);
    quotaUsages.set(usageKey, {
        ...usage,
        used: 0,
        remaining: quota.limit,
        resetAt: periodStart + periodDuration,
        history: [],
    });
    emitEvent({
        eventId: generateEventId(),
        type: 'quota_reset',
        configId: quotaId,
        key,
        timestamp: now,
        data: {},
    });
    return true;
}
/**
 * Delete quota
 */
function deleteQuota(quotaId) {
    const quota = quotas.get(quotaId);
    if (!quota) {
        return false;
    }
    quotas.delete(quotaId);
    for (const [key] of quotaUsages) {
        if (key.startsWith(`${quotaId}:`)) {
            quotaUsages.delete(key);
        }
    }
    return true;
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
// STATISTICS
// ============================================================================
/**
 * Get statistics
 */
function getStatistics() {
    return { ...statistics };
}
/**
 * Reset statistics
 */
function resetStatistics() {
    Object.assign(statistics, {
        totalRequests: 0,
        allowedRequests: 0,
        deniedRequests: 0,
        allowRate: 0,
        denyRate: 0,
        avgResponseTime: 0,
        activeKeys: 0,
        quotaExceeded: 0,
    });
}
// ============================================================================
// CLEANUP
// ============================================================================
/**
 * Clear all state
 */
function clearAll() {
    configs.clear();
    tokenBuckets.clear();
    slidingWindows.clear();
    fixedWindows.clear();
    leakyBuckets.clear();
    quotas.clear();
    quotaUsages.clear();
    eventListeners.clear();
    locks.clear();
    resetStatistics();
}
/**
 * Cleanup expired entries
 */
function cleanupExpired() {
    const now = clock.nowMs();
    let count = 0;
    for (const [key, state] of slidingWindows) {
        const windowStart = now - state.windowSize;
        const validRequests = state.requests.filter(t => t > windowStart);
        if (validRequests.length === 0) {
            slidingWindows.delete(key);
            count++;
        }
        else {
            slidingWindows.set(key, {
                ...state,
                requests: validRequests,
            });
        }
    }
    for (const [key, state] of fixedWindows) {
        const currentWindowStart = Math.floor(now / state.windowSize) * state.windowSize;
        if (state.windowStart < currentWindowStart - state.windowSize) {
            fixedWindows.delete(key);
            count++;
        }
    }
    return count;
}
