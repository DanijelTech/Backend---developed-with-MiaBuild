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

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI ZA RESOURCE LIMITER
// ============================================================================

/**
 * Resource type
 */
export type ResourceType = 'cpu' | 'memory' | 'file_descriptors' | 'network' | 'concurrent' | 'custom';

/**
 * Limit enforcement
 */
export type LimitEnforcement = 'hard' | 'soft' | 'advisory';

/**
 * Limit action
 */
export type LimitAction = 'reject' | 'queue' | 'throttle' | 'degrade' | 'log';

/**
 * Resource limiter configuration
 */
export interface ResourceLimiterConfig {
    readonly configId: string;
    readonly name: string;
    readonly resourceType: ResourceType;
    readonly limit: number;
    readonly unit: string;
    readonly enforcement: LimitEnforcement;
    readonly action: LimitAction;
    readonly burstLimit: number;
    readonly burstWindow: number;
    readonly cooldownPeriod: number;
    readonly enabled: boolean;
    readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Resource usage
 */
export interface ResourceUsage {
    readonly usageId: string;
    readonly configId: string;
    readonly current: number;
    readonly limit: number;
    readonly percentage: number;
    readonly peak: number;
    readonly average: number;
    readonly timestamp: number;
}

/**
 * Resource allocation
 */
export interface ResourceAllocation {
    readonly allocationId: string;
    readonly configId: string;
    readonly requesterId: string;
    readonly amount: number;
    readonly allocatedAt: number;
    readonly expiresAt: number | null;
    readonly released: boolean;
}

/**
 * Resource quota
 */
export interface ResourceQuota {
    readonly quotaId: string;
    readonly configId: string;
    readonly entityId: string;
    readonly entityType: string;
    readonly limit: number;
    readonly used: number;
    readonly remaining: number;
    readonly resetAt: number | null;
}

/**
 * Limit violation
 */
export interface LimitViolation {
    readonly violationId: string;
    readonly configId: string;
    readonly requesterId: string;
    readonly requested: number;
    readonly available: number;
    readonly timestamp: number;
    readonly action: LimitAction;
    readonly resolved: boolean;
}

/**
 * Resource limiter event
 */
export interface ResourceLimiterEvent {
    readonly eventId: string;
    readonly type: ResourceLimiterEventType;
    readonly configId: string | null;
    readonly timestamp: number;
    readonly data: Readonly<Record<string, unknown>>;
}

/**
 * Resource limiter event type
 */
export type ResourceLimiterEventType =
    | 'config_created'
    | 'config_deleted'
    | 'resource_allocated'
    | 'resource_released'
    | 'limit_reached'
    | 'limit_exceeded'
    | 'limit_violation'
    | 'quota_created'
    | 'quota_exceeded'
    | 'quota_reset'
    | 'burst_detected'
    | 'cooldown_started'
    | 'cooldown_ended';

/**
 * Resource limiter event listener
 */
export type ResourceLimiterEventListener = (event: ResourceLimiterEvent) => void | Promise<void>;

/**
 * Resource limiter statistics
 */
export interface ResourceLimiterStatistics {
    readonly totalConfigs: number;
    readonly totalAllocations: number;
    readonly activeAllocations: number;
    readonly totalQuotas: number;
    readonly totalViolations: number;
    readonly resolvedViolations: number;
    readonly totalBursts: number;
    readonly averageUtilization: number;
}

// ============================================================================
// STANJE
// ============================================================================

const configs: Map<string, ResourceLimiterConfig> = new Map();
const usages: Map<string, ResourceUsage> = new Map();
const allocations: Map<string, ResourceAllocation[]> = new Map();
const quotas: Map<string, ResourceQuota[]> = new Map();
const violations: Map<string, LimitViolation[]> = new Map();
const cooldowns: Map<string, number> = new Map();
const eventListeners: Set<ResourceLimiterEventListener> = new Set();

let configCounter = 0;
let usageCounter = 0;
let allocationCounter = 0;
let quotaCounter = 0;
let violationCounter = 0;
let eventCounter = 0;

const statistics: ResourceLimiterStatistics = {
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
function generateConfigId(): string {
    configCounter++;
    return generateDeterministicId(`res-limit-config-${configCounter}`);
}

/**
 * Generate usage ID
 */
function generateUsageId(): string {
    usageCounter++;
    return generateDeterministicId(`res-usage-${usageCounter}`);
}

/**
 * Generate allocation ID
 */
function generateAllocationId(): string {
    allocationCounter++;
    return generateDeterministicId(`res-alloc-${allocationCounter}`);
}

/**
 * Generate quota ID
 */
function generateQuotaId(): string {
    quotaCounter++;
    return generateDeterministicId(`res-quota-${quotaCounter}`);
}

/**
 * Generate violation ID
 */
function generateViolationId(): string {
    violationCounter++;
    return generateDeterministicId(`limit-violation-${violationCounter}`);
}

/**
 * Generate event ID
 */
function generateEventId(): string {
    eventCounter++;
    return generateDeterministicId(`res-limit-event-${eventCounter}`);
}

/**
 * Emit resource limiter event
 */
async function emitEvent(event: ResourceLimiterEvent): Promise<void> {
    for (const listener of eventListeners) {
        try {
            await listener(event);
        } catch {
            // Ignore listener errors
        }
    }
}

/**
 * Update statistics
 */
function updateStatistics(): void {
    const mutableStats = statistics as {
        totalConfigs: number;
        totalAllocations: number;
        activeAllocations: number;
        totalQuotas: number;
        totalViolations: number;
        resolvedViolations: number;
        averageUtilization: number;
    };
    
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
function calculateCurrentUsage(configId: string): number {
    const allocs = allocations.get(configId) ?? [];
    return allocs
        .filter(a => !a.released)
        .reduce((sum, a) => sum + a.amount, 0);
}

/**
 * Check if in cooldown
 */
function isInCooldown(configId: string): boolean {
    const cooldownEnd = cooldowns.get(configId);
    if (!cooldownEnd) {
        return false;
    }
    return clock.nowMs() < cooldownEnd;
}

/**
 * Initialize usage
 */
function initializeUsage(configId: string, config: ResourceLimiterConfig): ResourceUsage {
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
export async function createResourceLimiterConfig(
    name: string,
    resourceType: ResourceType,
    limit: number,
    options: {
        unit?: string;
        enforcement?: LimitEnforcement;
        action?: LimitAction;
        burstLimit?: number;
        burstWindow?: number;
        cooldownPeriod?: number;
        metadata?: Record<string, unknown>;
    } = {}
): Promise<ResourceLimiterConfig> {
    const configId = generateConfigId();
    
    const config: ResourceLimiterConfig = {
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
export function getResourceLimiterConfig(nameOrId: string): ResourceLimiterConfig | null {
    return configs.get(nameOrId) ?? null;
}

/**
 * Get all resource limiter configs
 */
export function getAllResourceLimiterConfigs(): readonly ResourceLimiterConfig[] {
    const uniqueConfigs = new Map<string, ResourceLimiterConfig>();
    for (const config of configs.values()) {
        uniqueConfigs.set(config.configId, config);
    }
    return Array.from(uniqueConfigs.values());
}

/**
 * Update resource limiter config
 */
export function updateResourceLimiterConfig(
    nameOrId: string,
    updates: {
        limit?: number;
        enforcement?: LimitEnforcement;
        action?: LimitAction;
        burstLimit?: number;
        enabled?: boolean;
    }
): ResourceLimiterConfig | null {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    
    const updatedConfig: ResourceLimiterConfig = {
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
export async function deleteResourceLimiterConfig(nameOrId: string): Promise<boolean> {
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
export async function allocateResource(
    nameOrId: string,
    requesterId: string,
    amount: number,
    options: {
        expiresIn?: number;
    } = {}
): Promise<ResourceAllocation | null> {
    const config = configs.get(nameOrId);
    if (!config || !config.enabled) {
        return null;
    }
    
    const now = clock.nowMs();
    const currentUsage = calculateCurrentUsage(config.configId);
    const available = config.limit - currentUsage;
    
    if (isInCooldown(config.configId)) {
        const violation: LimitViolation = {
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
            const violation: LimitViolation = {
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
            const violation: LimitViolation = {
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
            
            const mutableStats = statistics as { totalBursts: number };
            mutableStats.totalBursts++;
            
            return null;
        }
    }
    
    const allocation: ResourceAllocation = {
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
        const updatedUsage: ResourceUsage = {
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
export async function releaseResource(
    nameOrId: string,
    allocationId: string
): Promise<boolean> {
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
    
    const releasedAllocation: ResourceAllocation = {
        ...allocation,
        released: true,
    };
    
    allocs[index] = releasedAllocation;
    allocations.set(config.configId, allocs);
    
    const newUsage = calculateCurrentUsage(config.configId);
    const usage = usages.get(config.configId);
    if (usage) {
        const updatedUsage: ResourceUsage = {
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
export function getResourceUsage(nameOrId: string): ResourceUsage | null {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    return usages.get(config.configId) ?? null;
}

/**
 * Get allocations
 */
export function getAllocations(nameOrId: string): readonly ResourceAllocation[] {
    const config = configs.get(nameOrId);
    if (!config) {
        return [];
    }
    return allocations.get(config.configId) ?? [];
}

/**
 * Get active allocations
 */
export function getActiveAllocations(nameOrId: string): readonly ResourceAllocation[] {
    const allocs = getAllocations(nameOrId);
    return allocs.filter(a => !a.released);
}

// ============================================================================
// QUOTA MANAGEMENT
// ============================================================================

/**
 * Create quota
 */
export async function createQuota(
    nameOrId: string,
    entityId: string,
    entityType: string,
    limit: number,
    options: {
        resetIn?: number;
    } = {}
): Promise<ResourceQuota | null> {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    
    const now = clock.nowMs();
    
    const quota: ResourceQuota = {
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
export function getQuota(nameOrId: string, entityId: string): ResourceQuota | null {
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
export async function useQuota(
    nameOrId: string,
    entityId: string,
    amount: number
): Promise<boolean> {
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
        const resetQuota: ResourceQuota = {
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
    
    const updatedQuota: ResourceQuota = {
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
export async function resetQuota(nameOrId: string, entityId: string): Promise<boolean> {
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
    
    const resetQuota: ResourceQuota = {
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
export function deleteQuota(nameOrId: string, entityId: string): boolean {
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
export function getViolations(nameOrId: string): readonly LimitViolation[] {
    const config = configs.get(nameOrId);
    if (!config) {
        return [];
    }
    return violations.get(config.configId) ?? [];
}

/**
 * Get unresolved violations
 */
export function getUnresolvedViolations(nameOrId: string): readonly LimitViolation[] {
    const violationList = getViolations(nameOrId);
    return violationList.filter(v => !v.resolved);
}

/**
 * Resolve violation
 */
export function resolveViolation(nameOrId: string, violationId: string): boolean {
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
    
    const resolvedViolation: LimitViolation = {
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
export function clearViolations(nameOrId: string): boolean {
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
export function getCooldownStatus(nameOrId: string): {
    inCooldown: boolean;
    remainingMs: number;
} | null {
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
export async function clearCooldown(nameOrId: string): Promise<boolean> {
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
export async function cleanupExpiredAllocations(nameOrId: string): Promise<number> {
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
        const updatedUsage: ResourceUsage = {
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
export function getStatistics(): Readonly<ResourceLimiterStatistics> {
    updateStatistics();
    return { ...statistics };
}

/**
 * Reset statistics
 */
export function resetStatistics(): void {
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
export function addEventListener(listener: ResourceLimiterEventListener): void {
    eventListeners.add(listener);
}

/**
 * Remove event listener
 */
export function removeEventListener(listener: ResourceLimiterEventListener): void {
    eventListeners.delete(listener);
}

/**
 * Clear event listeners
 */
export function clearEventListeners(): void {
    eventListeners.clear();
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Clear all state
 */
export function clearAll(): void {
    configs.clear();
    usages.clear();
    allocations.clear();
    quotas.clear();
    violations.clear();
    cooldowns.clear();
    eventListeners.clear();
    resetStatistics();
}
