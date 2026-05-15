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
export type ResourceLimiterEventType = 'config_created' | 'config_deleted' | 'resource_allocated' | 'resource_released' | 'limit_reached' | 'limit_exceeded' | 'limit_violation' | 'quota_created' | 'quota_exceeded' | 'quota_reset' | 'burst_detected' | 'cooldown_started' | 'cooldown_ended';
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
/**
 * Create resource limiter config
 */
export declare function createResourceLimiterConfig(name: string, resourceType: ResourceType, limit: number, options?: {
    unit?: string;
    enforcement?: LimitEnforcement;
    action?: LimitAction;
    burstLimit?: number;
    burstWindow?: number;
    cooldownPeriod?: number;
    metadata?: Record<string, unknown>;
}): Promise<ResourceLimiterConfig>;
/**
 * Get resource limiter config
 */
export declare function getResourceLimiterConfig(nameOrId: string): ResourceLimiterConfig | null;
/**
 * Get all resource limiter configs
 */
export declare function getAllResourceLimiterConfigs(): readonly ResourceLimiterConfig[];
/**
 * Update resource limiter config
 */
export declare function updateResourceLimiterConfig(nameOrId: string, updates: {
    limit?: number;
    enforcement?: LimitEnforcement;
    action?: LimitAction;
    burstLimit?: number;
    enabled?: boolean;
}): ResourceLimiterConfig | null;
/**
 * Delete resource limiter config
 */
export declare function deleteResourceLimiterConfig(nameOrId: string): Promise<boolean>;
/**
 * Allocate resource
 */
export declare function allocateResource(nameOrId: string, requesterId: string, amount: number, options?: {
    expiresIn?: number;
}): Promise<ResourceAllocation | null>;
/**
 * Release resource
 */
export declare function releaseResource(nameOrId: string, allocationId: string): Promise<boolean>;
/**
 * Get resource usage
 */
export declare function getResourceUsage(nameOrId: string): ResourceUsage | null;
/**
 * Get allocations
 */
export declare function getAllocations(nameOrId: string): readonly ResourceAllocation[];
/**
 * Get active allocations
 */
export declare function getActiveAllocations(nameOrId: string): readonly ResourceAllocation[];
/**
 * Create quota
 */
export declare function createQuota(nameOrId: string, entityId: string, entityType: string, limit: number, options?: {
    resetIn?: number;
}): Promise<ResourceQuota | null>;
/**
 * Get quota
 */
export declare function getQuota(nameOrId: string, entityId: string): ResourceQuota | null;
/**
 * Use quota
 */
export declare function useQuota(nameOrId: string, entityId: string, amount: number): Promise<boolean>;
/**
 * Reset quota
 */
export declare function resetQuota(nameOrId: string, entityId: string): Promise<boolean>;
/**
 * Delete quota
 */
export declare function deleteQuota(nameOrId: string, entityId: string): boolean;
/**
 * Get violations
 */
export declare function getViolations(nameOrId: string): readonly LimitViolation[];
/**
 * Get unresolved violations
 */
export declare function getUnresolvedViolations(nameOrId: string): readonly LimitViolation[];
/**
 * Resolve violation
 */
export declare function resolveViolation(nameOrId: string, violationId: string): boolean;
/**
 * Clear violations
 */
export declare function clearViolations(nameOrId: string): boolean;
/**
 * Check cooldown status
 */
export declare function getCooldownStatus(nameOrId: string): {
    inCooldown: boolean;
    remainingMs: number;
} | null;
/**
 * Clear cooldown
 */
export declare function clearCooldown(nameOrId: string): Promise<boolean>;
/**
 * Cleanup expired allocations
 */
export declare function cleanupExpiredAllocations(nameOrId: string): Promise<number>;
/**
 * Get statistics
 */
export declare function getStatistics(): Readonly<ResourceLimiterStatistics>;
/**
 * Reset statistics
 */
export declare function resetStatistics(): void;
/**
 * Add event listener
 */
export declare function addEventListener(listener: ResourceLimiterEventListener): void;
/**
 * Remove event listener
 */
export declare function removeEventListener(listener: ResourceLimiterEventListener): void;
/**
 * Clear event listeners
 */
export declare function clearEventListeners(): void;
/**
 * Clear all state
 */
export declare function clearAll(): void;
