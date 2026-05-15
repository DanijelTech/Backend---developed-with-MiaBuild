/**
 * @file Timeout Manager za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-RES-003 Timeout management za zaledne sisteme
 * @design DSN-ZALEDNI-RES-003 Backend timeout arhitektura
 * @test TEST-ZALEDNI-RES-003 Preverjanje timeout management
 *
 * Timeout Manager - prilagojen za zaledne sisteme:
 * - Configurable timeouts
 * - Cascading timeouts
 * - Deadline propagation
 * - Timeout budgets
 * - Cancellation support
 * - Metrics collection
 * - Event notifications
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom RES_003 - Timeout Manager
 */
/**
 * Timeout type
 */
export type TimeoutType = 'connection' | 'read' | 'write' | 'idle' | 'total' | 'custom';
/**
 * Timeout state
 */
export type TimeoutState = 'pending' | 'active' | 'expired' | 'cancelled' | 'completed';
/**
 * Timeout configuration
 */
export interface TimeoutConfig {
    readonly configId: string;
    readonly name: string;
    readonly type: TimeoutType;
    readonly duration: number;
    readonly cascadeEnabled: boolean;
    readonly cascadeReduction: number;
    readonly minTimeout: number;
    readonly maxTimeout: number;
    readonly enabled: boolean;
    readonly metadata: Readonly<Record<string, unknown>>;
}
/**
 * Timeout instance
 */
export interface TimeoutInstance {
    readonly instanceId: string;
    readonly configId: string;
    readonly startTime: number;
    readonly deadline: number;
    readonly remainingTime: number;
    readonly state: TimeoutState;
    readonly parentId: string | null;
    readonly childIds: readonly string[];
    readonly metadata: Readonly<Record<string, unknown>>;
}
/**
 * Timeout budget
 */
export interface TimeoutBudget {
    readonly budgetId: string;
    readonly name: string;
    readonly totalBudget: number;
    readonly usedBudget: number;
    readonly remainingBudget: number;
    readonly allocations: readonly BudgetAllocation[];
    readonly createdAt: number;
    readonly expiresAt: number;
}
/**
 * Budget allocation
 */
export interface BudgetAllocation {
    readonly allocationId: string;
    readonly budgetId: string;
    readonly operation: string;
    readonly allocated: number;
    readonly used: number;
    readonly startTime: number;
    readonly endTime: number | null;
}
/**
 * Deadline context
 */
export interface DeadlineContext {
    readonly contextId: string;
    readonly deadline: number;
    readonly remainingTime: number;
    readonly propagatedFrom: string | null;
    readonly propagatedTo: readonly string[];
    readonly metadata: Readonly<Record<string, unknown>>;
}
/**
 * Timeout event
 */
export interface TimeoutEvent {
    readonly eventId: string;
    readonly type: TimeoutEventType;
    readonly instanceId: string | null;
    readonly timestamp: number;
    readonly data: Readonly<Record<string, unknown>>;
}
/**
 * Timeout event type
 */
export type TimeoutEventType = 'config_created' | 'config_deleted' | 'timeout_started' | 'timeout_expired' | 'timeout_cancelled' | 'timeout_completed' | 'budget_created' | 'budget_exhausted' | 'deadline_propagated' | 'cascade_triggered';
/**
 * Timeout event listener
 */
export type TimeoutEventListener = (event: TimeoutEvent) => void | Promise<void>;
/**
 * Timeout statistics
 */
export interface TimeoutStatistics {
    readonly totalConfigs: number;
    readonly activeTimeouts: number;
    readonly expiredTimeouts: number;
    readonly cancelledTimeouts: number;
    readonly completedTimeouts: number;
    readonly totalBudgets: number;
    readonly exhaustedBudgets: number;
    readonly averageTimeoutDuration: number;
}
/**
 * Cancellation token
 */
export interface CancellationToken {
    readonly tokenId: string;
    readonly cancelled: boolean;
    readonly reason: string | null;
    readonly cancelledAt: number | null;
}
/**
 * Create timeout config
 */
export declare function createTimeoutConfig(name: string, type: TimeoutType, duration: number, options?: {
    cascadeEnabled?: boolean;
    cascadeReduction?: number;
    minTimeout?: number;
    maxTimeout?: number;
    metadata?: Record<string, unknown>;
}): Promise<TimeoutConfig>;
/**
 * Get timeout config
 */
export declare function getTimeoutConfig(nameOrId: string): TimeoutConfig | null;
/**
 * Get all timeout configs
 */
export declare function getAllTimeoutConfigs(): readonly TimeoutConfig[];
/**
 * Update timeout config
 */
export declare function updateTimeoutConfig(nameOrId: string, updates: {
    duration?: number;
    cascadeEnabled?: boolean;
    cascadeReduction?: number;
    minTimeout?: number;
    maxTimeout?: number;
    enabled?: boolean;
}): TimeoutConfig | null;
/**
 * Delete timeout config
 */
export declare function deleteTimeoutConfig(nameOrId: string): Promise<boolean>;
/**
 * Start timeout
 */
export declare function startTimeout(nameOrId: string, options?: {
    parentId?: string;
    customDuration?: number;
    metadata?: Record<string, unknown>;
}): Promise<TimeoutInstance>;
/**
 * Get timeout instance
 */
export declare function getTimeoutInstance(instanceId: string): TimeoutInstance | null;
/**
 * Get all timeout instances
 */
export declare function getAllTimeoutInstances(): readonly TimeoutInstance[];
/**
 * Cancel timeout
 */
export declare function cancelTimeout(instanceId: string, reason?: string): Promise<boolean>;
/**
 * Complete timeout
 */
export declare function completeTimeout(instanceId: string): Promise<boolean>;
/**
 * Check if timeout expired
 */
export declare function isTimeoutExpired(instanceId: string): boolean;
/**
 * Get remaining time
 */
export declare function getRemainingTime(instanceId: string): number;
/**
 * Create timeout budget
 */
export declare function createTimeoutBudget(name: string, totalBudget: number, expiresInMs?: number): Promise<TimeoutBudget>;
/**
 * Get timeout budget
 */
export declare function getTimeoutBudget(nameOrId: string): TimeoutBudget | null;
/**
 * Allocate from budget
 */
export declare function allocateFromBudget(nameOrId: string, operation: string, amount: number): BudgetAllocation | null;
/**
 * Release budget allocation
 */
export declare function releaseBudgetAllocation(nameOrId: string, allocationId: string, actualUsed: number): boolean;
/**
 * Delete timeout budget
 */
export declare function deleteTimeoutBudget(nameOrId: string): boolean;
/**
 * Create deadline context
 */
export declare function createDeadlineContext(deadline: number, options?: {
    propagatedFrom?: string;
    metadata?: Record<string, unknown>;
}): Promise<DeadlineContext>;
/**
 * Get deadline context
 */
export declare function getDeadlineContext(contextId: string): DeadlineContext | null;
/**
 * Propagate deadline
 */
export declare function propagateDeadline(parentContextId: string, reduction?: number): Promise<DeadlineContext | null>;
/**
 * Delete deadline context
 */
export declare function deleteDeadlineContext(contextId: string): boolean;
/**
 * Create cancellation token
 */
export declare function createCancellationToken(): CancellationToken;
/**
 * Get cancellation token
 */
export declare function getCancellationToken(tokenId: string): CancellationToken | null;
/**
 * Cancel token
 */
export declare function cancelToken(tokenId: string, reason?: string): boolean;
/**
 * Is token cancelled
 */
export declare function isTokenCancelled(tokenId: string): boolean;
/**
 * Delete cancellation token
 */
export declare function deleteCancellationToken(tokenId: string): boolean;
/**
 * Execute with timeout
 */
export declare function executeWithTimeout<T>(operation: () => T | Promise<T>, timeoutMs: number, options?: {
    cancellationToken?: string;
    onTimeout?: () => void;
}): Promise<T>;
/**
 * Execute with deadline
 */
export declare function executeWithDeadline<T>(operation: () => T | Promise<T>, deadline: number, options?: {
    cancellationToken?: string;
    onTimeout?: () => void;
}): Promise<T>;
/**
 * Execute with budget
 */
export declare function executeWithBudget<T>(budgetNameOrId: string, operation: string, requestedTime: number, fn: () => T | Promise<T>): Promise<T>;
/**
 * Get statistics
 */
export declare function getStatistics(): Readonly<TimeoutStatistics>;
/**
 * Reset statistics
 */
export declare function resetStatistics(): void;
/**
 * Add event listener
 */
export declare function addEventListener(listener: TimeoutEventListener): void;
/**
 * Remove event listener
 */
export declare function removeEventListener(listener: TimeoutEventListener): void;
/**
 * Clear event listeners
 */
export declare function clearEventListeners(): void;
/**
 * Clear all state
 */
export declare function clearAll(): void;
