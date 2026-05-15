"use strict";
/**
 * @file Resource Limiter za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-RES-008 Resource limiter za zaledne sisteme
 * @design DSN-ZALEDNI-RES-008 Backend resource limiter arhitektura
 * @test TEST-ZALEDNI-RES-008 Preverjanje resource limiter
 *
 * Resource Limiter - prilagojen za zaledne sisteme:
 * - CPU limiting
 * - Memory limiting
 * - File descriptor limiting
 * - Network bandwidth limiting
 * - Concurrent operation limiting
 * - Resource quotas
 * - Metrics collection
 * - Event notifications
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom RES_008 - Resource Limiter
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createResourceLimiterConfig = createResourceLimiterConfig;
exports.getResourceLimiterConfig = getResourceLimiterConfig;
exports.getAllResourceLimiterConfigs = getAllResourceLimiterConfigs;
exports.updateResourceLimiterConfig = updateResourceLimiterConfig;
exports.deleteResourceLimiterConfig = deleteResourceLimiterConfig;
exports.allocateResource = allocateResource;
exports.releaseResource = releaseResource;
exports.getResourceUsage = getResourceUsage;
exports.getAllocations = getAllocations;
exports.getActiveAllocations = getActiveAllocations;
exports.createQuota = createQuota;
exports.getQuota = getQuota;
exports.useQuota = useQuota;
exports.resetQuota = resetQuota;
exports.deleteQuota = deleteQuota;
exports.getViolations = getViolations;
exports.getUnresolvedViolations = getUnresolvedViolations;
exports.resolveViolation = resolveViolation;
exports.clearViolations = clearViolations;
exports.getCooldownStatus = getCooldownStatus;
exports.clearCooldown = clearCooldown;
exports.cleanupExpiredAllocations = cleanupExpiredAllocations;
exports.getStatistics = getStatistics;
exports.resetStatistics = resetStatistics;
exports.addEventListener = addEventListener;
exports.removeEventListener = removeEventListener;
exports.clearEventListeners = clearEventListeners;
exports.clearAll = clearAll;
const clock_1 = require("@mia/core/clock");
const deterministic_1 = require("@mia/core/deterministic");
const clock = (0, clock_1.getClock)();
// ============================================================================
// STANJE
// ============================================================================
const configs = new Map();
const usages = new Map();
const allocations = new Map();
const quotas = new Map();
const violations = new Map();
const cooldowns = new Map();
const eventListeners = new Set();
let configCounter = 0;
let usageCounter = 0;
let allocationCounter = 0;
let quotaCounter = 0;
let violationCounter = 0;
let eventCounter = 0;
const statistics = {
    totalConfigs: 0,
    totalAllocations: 0,
    activeAllocations: 0,
    totalQuotas: 0,
    totalViolations: 0,
    resolvedViolations: 0,
    totalBursts: 0,
    averageUtilization: 0,
};
// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================
/**
 * Generate config ID
 */
function generateConfigId() {
    configCounter++;
    return (0, deterministic_1.generateDeterministicId)(`res-limit-config-${configCounter}`);
}
/**
 * Generate usage ID
 */
function generateUsageId() {
    usageCounter++;
    return (0, deterministic_1.generateDeterministicId)(`res-usage-${usageCounter}`);
}
/**
 * Generate allocation ID
 */
function generateAllocationId() {
    allocationCounter++;
    return (0, deterministic_1.generateDeterministicId)(`res-alloc-${allocationCounter}`);
}
/**
 * Generate quota ID
 */
function generateQuotaId() {
    quotaCounter++;
    return (0, deterministic_1.generateDeterministicId)(`res-quota-${quotaCounter}`);
}
/**
 * Generate violation ID
 */
function generateViolationId() {
    violationCounter++;
    return (0, deterministic_1.generateDeterministicId)(`limit-violation-${violationCounter}`);
}
/**
 * Generate event ID
 */
function generateEventId() {
    eventCounter++;
    return (0, deterministic_1.generateDeterministicId)(`res-limit-event-${eventCounter}`);
}
/**
 * Emit resource limiter event
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
function updateStatistics() {
    const mutableStats = statistics;
    mutableStats.totalConfigs = configs.size;
    mutableStats.totalAllocations = 0;
    mutableStats.activeAllocations = 0;
    mutableStats.totalQuotas = 0;
    mutableStats.totalViolations = 0;
    mutableStats.resolvedViolations = 0;
    for (const allocs of allocations.values()) {
        mutableStats.totalAllocations += allocs.length;
        mutableStats.activeAllocations += allocs.filter(a => !a.released).length;
    }
    for (const quotaList of quotas.values()) {
        mutableStats.totalQuotas += quotaList.length;
    }
    for (const violationList of violations.values()) {
        mutableStats.totalViolations += violationList.length;
        mutableStats.resolvedViolations += violationList.filter(v => v.resolved).length;
    }
    let totalUtilization = 0;
    let usageCount = 0;
    for (const usage of usages.values()) {
        totalUtilization += usage.percentage;
        usageCount++;
    }
    mutableStats.averageUtilization = usageCount > 0 ? totalUtilization / usageCount : 0;
}
/**
 * Calculate current usage
 */
function calculateCurrentUsage(configId) {
    const allocs = allocations.get(configId) ?? [];
    return allocs
        .filter(a => !a.released)
        .reduce((sum, a) => sum + a.amount, 0);
}
/**
 * Check if in cooldown
 */
function isInCooldown(configId) {
    const cooldownEnd = cooldowns.get(configId);
    if (!cooldownEnd) {
        return false;
    }
    return clock.nowMs() < cooldownEnd;
}
/**
 * Initialize usage
 */
function initializeUsage(configId, config) {
    return {
        usageId: generateUsageId(),
        configId,
        current: 0,
        limit: config.limit,
        percentage: 0,
        peak: 0,
        average: 0,
        timestamp: clock.nowMs(),
    };
}
// ============================================================================
// CONFIG MANAGEMENT
// ============================================================================
/**
 * Create resource limiter config
 */
async function createResourceLimiterConfig(name, resourceType, limit, options = {}) {
    const configId = generateConfigId();
    const config = {
        configId,
        name,
        resourceType,
        limit,
        unit: options.unit ?? 'units',
        enforcement: options.enforcement ?? 'hard',
        action: options.action ?? 'reject',
        burstLimit: options.burstLimit ?? limit * 1.2,
        burstWindow: options.burstWindow ?? 1000,
        cooldownPeriod: options.cooldownPeriod ?? 5000,
        enabled: true,
        metadata: options.metadata ?? {},
    };
    configs.set(configId, config);
    configs.set(name, config);
    usages.set(configId, initializeUsage(configId, config));
    allocations.set(configId, []);
    quotas.set(configId, []);
    violations.set(configId, []);
    await emitEvent({
        eventId: generateEventId(),
        type: 'config_created',
        configId,
        timestamp: clock.nowMs(),
        data: { name, resourceType, limit },
    });
    updateStatistics();
    return config;
}
/**
 * Get resource limiter config
 */
function getResourceLimiterConfig(nameOrId) {
    return configs.get(nameOrId) ?? null;
}
/**
 * Get all resource limiter configs
 */
function getAllResourceLimiterConfigs() {
    const uniqueConfigs = new Map();
    for (const config of configs.values()) {
        uniqueConfigs.set(config.configId, config);
    }
    return Array.from(uniqueConfigs.values());
}
/**
 * Update resource limiter config
 */
function updateResourceLimiterConfig(nameOrId, updates) {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    const updatedConfig = {
        ...config,
        limit: updates.limit ?? config.limit,
        enforcement: updates.enforcement ?? config.enforcement,
        action: updates.action ?? config.action,
        burstLimit: updates.burstLimit ?? config.burstLimit,
        enabled: updates.enabled ?? config.enabled,
    };
    configs.set(config.configId, updatedConfig);
    configs.set(config.name, updatedConfig);
    return updatedConfig;
}
/**
 * Delete resource limiter config
 */
async function deleteResourceLimiterConfig(nameOrId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    configs.delete(config.configId);
    configs.delete(config.name);
    usages.delete(config.configId);
    allocations.delete(config.configId);
    quotas.delete(config.configId);
    violations.delete(config.configId);
    cooldowns.delete(config.configId);
    await emitEvent({
        eventId: generateEventId(),
        type: 'config_deleted',
        configId: config.configId,
        timestamp: clock.nowMs(),
        data: {},
    });
    updateStatistics();
    return true;
}
// ============================================================================
// RESOURCE ALLOCATION
// ============================================================================
/**
 * Allocate resource
 */
async function allocateResource(nameOrId, requesterId, amount, options = {}) {
    const config = configs.get(nameOrId);
    if (!config || !config.enabled) {
        return null;
    }
    const now = clock.nowMs();
    const currentUsage = calculateCurrentUsage(config.configId);
    const available = config.limit - currentUsage;
    if (isInCooldown(config.configId)) {
        const violation = {
            violationId: generateViolationId(),
            configId: config.configId,
            requesterId,
            requested: amount,
            available,
            timestamp: now,
            action: config.action,
            resolved: false,
        };
        const violationList = violations.get(config.configId) ?? [];
        violationList.push(violation);
        violations.set(config.configId, violationList);
        await emitEvent({
            eventId: generateEventId(),
            type: 'limit_violation',
            configId: config.configId,
            timestamp: now,
            data: { requesterId, requested: amount, reason: 'cooldown' },
        });
        return null;
    }
    if (amount > available) {
        if (config.enforcement === 'hard') {
            const violation = {
                violationId: generateViolationId(),
                configId: config.configId,
                requesterId,
                requested: amount,
                available,
                timestamp: now,
                action: config.action,
                resolved: false,
            };
            const violationList = violations.get(config.configId) ?? [];
            violationList.push(violation);
            violations.set(config.configId, violationList);
            await emitEvent({
                eventId: generateEventId(),
                type: 'limit_exceeded',
                configId: config.configId,
                timestamp: now,
                data: { requesterId, requested: amount, available },
            });
            cooldowns.set(config.configId, now + config.cooldownPeriod);
            await emitEvent({
                eventId: generateEventId(),
                type: 'cooldown_started',
                configId: config.configId,
                timestamp: now,
                data: { duration: config.cooldownPeriod },
            });
            return null;
        }
        if (config.enforcement === 'soft' && currentUsage + amount > config.burstLimit) {
            const violation = {
                violationId: generateViolationId(),
                configId: config.configId,
                requesterId,
                requested: amount,
                available,
                timestamp: now,
                action: config.action,
                resolved: false,
            };
            const violationList = violations.get(config.configId) ?? [];
            violationList.push(violation);
            violations.set(config.configId, violationList);
            await emitEvent({
                eventId: generateEventId(),
                type: 'burst_detected',
                configId: config.configId,
                timestamp: now,
                data: { requesterId, requested: amount, burstLimit: config.burstLimit },
            });
            const mutableStats = statistics;
            mutableStats.totalBursts++;
            return null;
        }
    }
    const allocation = {
        allocationId: generateAllocationId(),
        configId: config.configId,
        requesterId,
        amount,
        allocatedAt: now,
        expiresAt: options.expiresIn ? now + options.expiresIn : null,
        released: false,
    };
    const allocs = allocations.get(config.configId) ?? [];
    allocs.push(allocation);
    allocations.set(config.configId, allocs);
    const newUsage = calculateCurrentUsage(config.configId);
    const usage = usages.get(config.configId);
    if (usage) {
        const updatedUsage = {
            ...usage,
            current: newUsage,
            percentage: (newUsage / config.limit) * 100,
            peak: Math.max(usage.peak, newUsage),
            timestamp: now,
        };
        usages.set(config.configId, updatedUsage);
    }
    await emitEvent({
        eventId: generateEventId(),
        type: 'resource_allocated',
        configId: config.configId,
        timestamp: now,
        data: { allocationId: allocation.allocationId, requesterId, amount },
    });
    if (newUsage >= config.limit) {
        await emitEvent({
            eventId: generateEventId(),
            type: 'limit_reached',
            configId: config.configId,
            timestamp: now,
            data: { current: newUsage, limit: config.limit },
        });
    }
    updateStatistics();
    return allocation;
}
/**
 * Release resource
 */
async function releaseResource(nameOrId, allocationId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    const allocs = allocations.get(config.configId);
    if (!allocs) {
        return false;
    }
    const index = allocs.findIndex(a => a.allocationId === allocationId);
    if (index === -1) {
        return false;
    }
    const allocation = allocs[index];
    if (allocation.released) {
        return false;
    }
    const releasedAllocation = {
        ...allocation,
        released: true,
    };
    allocs[index] = releasedAllocation;
    allocations.set(config.configId, allocs);
    const newUsage = calculateCurrentUsage(config.configId);
    const usage = usages.get(config.configId);
    if (usage) {
        const updatedUsage = {
            ...usage,
            current: newUsage,
            percentage: (newUsage / config.limit) * 100,
            timestamp: clock.nowMs(),
        };
        usages.set(config.configId, updatedUsage);
    }
    await emitEvent({
        eventId: generateEventId(),
        type: 'resource_released',
        configId: config.configId,
        timestamp: clock.nowMs(),
        data: { allocationId, amount: allocation.amount },
    });
    updateStatistics();
    return true;
}
/**
 * Get resource usage
 */
function getResourceUsage(nameOrId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    return usages.get(config.configId) ?? null;
}
/**
 * Get allocations
 */
function getAllocations(nameOrId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return [];
    }
    return allocations.get(config.configId) ?? [];
}
/**
 * Get active allocations
 */
function getActiveAllocations(nameOrId) {
    const allocs = getAllocations(nameOrId);
    return allocs.filter(a => !a.released);
}
// ============================================================================
// QUOTA MANAGEMENT
// ============================================================================
/**
 * Create quota
 */
async function createQuota(nameOrId, entityId, entityType, limit, options = {}) {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    const now = clock.nowMs();
    const quota = {
        quotaId: generateQuotaId(),
        configId: config.configId,
        entityId,
        entityType,
        limit,
        used: 0,
        remaining: limit,
        resetAt: options.resetIn ? now + options.resetIn : null,
    };
    const quotaList = quotas.get(config.configId) ?? [];
    quotaList.push(quota);
    quotas.set(config.configId, quotaList);
    await emitEvent({
        eventId: generateEventId(),
        type: 'quota_created',
        configId: config.configId,
        timestamp: now,
        data: { quotaId: quota.quotaId, entityId, limit },
    });
    updateStatistics();
    return quota;
}
/**
 * Get quota
 */
function getQuota(nameOrId, entityId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    const quotaList = quotas.get(config.configId) ?? [];
    return quotaList.find(q => q.entityId === entityId) ?? null;
}
/**
 * Use quota
 */
async function useQuota(nameOrId, entityId, amount) {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    const quotaList = quotas.get(config.configId) ?? [];
    const index = quotaList.findIndex(q => q.entityId === entityId);
    if (index === -1) {
        return false;
    }
    const quota = quotaList[index];
    const now = clock.nowMs();
    if (quota.resetAt && now >= quota.resetAt) {
        const resetQuota = {
            ...quota,
            used: 0,
            remaining: quota.limit,
            resetAt: quota.resetAt ? now + (quota.resetAt - now) : null,
        };
        quotaList[index] = resetQuota;
        quotas.set(config.configId, quotaList);
        await emitEvent({
            eventId: generateEventId(),
            type: 'quota_reset',
            configId: config.configId,
            timestamp: now,
            data: { quotaId: quota.quotaId, entityId },
        });
    }
    const currentQuota = quotaList[index];
    if (amount > currentQuota.remaining) {
        await emitEvent({
            eventId: generateEventId(),
            type: 'quota_exceeded',
            configId: config.configId,
            timestamp: now,
            data: { quotaId: currentQuota.quotaId, entityId, requested: amount, remaining: currentQuota.remaining },
        });
        return false;
    }
    const updatedQuota = {
        ...currentQuota,
        used: currentQuota.used + amount,
        remaining: currentQuota.remaining - amount,
    };
    quotaList[index] = updatedQuota;
    quotas.set(config.configId, quotaList);
    return true;
}
/**
 * Reset quota
 */
async function resetQuota(nameOrId, entityId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    const quotaList = quotas.get(config.configId) ?? [];
    const index = quotaList.findIndex(q => q.entityId === entityId);
    if (index === -1) {
        return false;
    }
    const quota = quotaList[index];
    const resetQuota = {
        ...quota,
        used: 0,
        remaining: quota.limit,
    };
    quotaList[index] = resetQuota;
    quotas.set(config.configId, quotaList);
    await emitEvent({
        eventId: generateEventId(),
        type: 'quota_reset',
        configId: config.configId,
        timestamp: clock.nowMs(),
        data: { quotaId: quota.quotaId, entityId },
    });
    return true;
}
/**
 * Delete quota
 */
function deleteQuota(nameOrId, entityId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    const quotaList = quotas.get(config.configId) ?? [];
    const index = quotaList.findIndex(q => q.entityId === entityId);
    if (index === -1) {
        return false;
    }
    quotaList.splice(index, 1);
    quotas.set(config.configId, quotaList);
    updateStatistics();
    return true;
}
// ============================================================================
// VIOLATIONS
// ============================================================================
/**
 * Get violations
 */
function getViolations(nameOrId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return [];
    }
    return violations.get(config.configId) ?? [];
}
/**
 * Get unresolved violations
 */
function getUnresolvedViolations(nameOrId) {
    const violationList = getViolations(nameOrId);
    return violationList.filter(v => !v.resolved);
}
/**
 * Resolve violation
 */
function resolveViolation(nameOrId, violationId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    const violationList = violations.get(config.configId) ?? [];
    const index = violationList.findIndex(v => v.violationId === violationId);
    if (index === -1) {
        return false;
    }
    const violation = violationList[index];
    const resolvedViolation = {
        ...violation,
        resolved: true,
    };
    violationList[index] = resolvedViolation;
    violations.set(config.configId, violationList);
    updateStatistics();
    return true;
}
/**
 * Clear violations
 */
function clearViolations(nameOrId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    violations.set(config.configId, []);
    updateStatistics();
    return true;
}
// ============================================================================
// COOLDOWN
// ============================================================================
/**
 * Check cooldown status
 */
function getCooldownStatus(nameOrId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    const cooldownEnd = cooldowns.get(config.configId);
    if (!cooldownEnd) {
        return { inCooldown: false, remainingMs: 0 };
    }
    const now = clock.nowMs();
    if (now >= cooldownEnd) {
        cooldowns.delete(config.configId);
        return { inCooldown: false, remainingMs: 0 };
    }
    return { inCooldown: true, remainingMs: cooldownEnd - now };
}
/**
 * Clear cooldown
 */
async function clearCooldown(nameOrId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    if (!cooldowns.has(config.configId)) {
        return false;
    }
    cooldowns.delete(config.configId);
    await emitEvent({
        eventId: generateEventId(),
        type: 'cooldown_ended',
        configId: config.configId,
        timestamp: clock.nowMs(),
        data: { reason: 'manual_clear' },
    });
    return true;
}
// ============================================================================
// MAINTENANCE
// ============================================================================
/**
 * Cleanup expired allocations
 */
async function cleanupExpiredAllocations(nameOrId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return 0;
    }
    const allocs = allocations.get(config.configId) ?? [];
    const now = clock.nowMs();
    let cleanedCount = 0;
    for (let i = 0; i < allocs.length; i++) {
        const allocation = allocs[i];
        if (!allocation.released && allocation.expiresAt && now >= allocation.expiresAt) {
            allocs[i] = { ...allocation, released: true };
            cleanedCount++;
            await emitEvent({
                eventId: generateEventId(),
                type: 'resource_released',
                configId: config.configId,
                timestamp: now,
                data: { allocationId: allocation.allocationId, reason: 'expired' },
            });
        }
    }
    allocations.set(config.configId, allocs);
    const newUsage = calculateCurrentUsage(config.configId);
    const usage = usages.get(config.configId);
    if (usage) {
        const updatedUsage = {
            ...usage,
            current: newUsage,
            percentage: (newUsage / config.limit) * 100,
            timestamp: now,
        };
        usages.set(config.configId, updatedUsage);
    }
    updateStatistics();
    return cleanedCount;
}
// ============================================================================
// STATISTICS
// ============================================================================
/**
 * Get statistics
 */
function getStatistics() {
    updateStatistics();
    return { ...statistics };
}
/**
 * Reset statistics
 */
function resetStatistics() {
    Object.assign(statistics, {
        totalConfigs: 0,
        totalAllocations: 0,
        activeAllocations: 0,
        totalQuotas: 0,
        totalViolations: 0,
        resolvedViolations: 0,
        totalBursts: 0,
        averageUtilization: 0,
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
// CLEANUP
// ============================================================================
/**
 * Clear all state
 */
function clearAll() {
    configs.clear();
    usages.clear();
    allocations.clear();
    quotas.clear();
    violations.clear();
    cooldowns.clear();
    eventListeners.clear();
    resetStatistics();
}
