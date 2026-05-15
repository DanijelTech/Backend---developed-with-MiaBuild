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

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI ZA TIMEOUT MANAGER
// ============================================================================

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
export type TimeoutEventType =
    | 'config_created'
    | 'config_deleted'
    | 'timeout_started'
    | 'timeout_expired'
    | 'timeout_cancelled'
    | 'timeout_completed'
    | 'budget_created'
    | 'budget_exhausted'
    | 'deadline_propagated'
    | 'cascade_triggered';

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

// ============================================================================
// STANJE
// ============================================================================

const configs: Map<string, TimeoutConfig> = new Map();
const instances: Map<string, TimeoutInstance> = new Map();
const budgets: Map<string, TimeoutBudget> = new Map();
const deadlineContexts: Map<string, DeadlineContext> = new Map();
const cancellationTokens: Map<string, CancellationToken> = new Map();
const eventListeners: Set<TimeoutEventListener> = new Set();

let configCounter = 0;
let instanceCounter = 0;
let budgetCounter = 0;
let allocationCounter = 0;
let contextCounter = 0;
let tokenCounter = 0;
let eventCounter = 0;

const statistics: TimeoutStatistics = {
    totalConfigs: 0,
    activeTimeouts: 0,
    expiredTimeouts: 0,
    cancelledTimeouts: 0,
    completedTimeouts: 0,
    totalBudgets: 0,
    exhaustedBudgets: 0,
    averageTimeoutDuration: 0,
};

// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================

/**
 * Generate config ID
 */
function generateConfigId(): string {
    configCounter++;
    return generateDeterministicId(`timeout-config-${configCounter}`);
}

/**
 * Generate instance ID
 */
function generateInstanceId(): string {
    instanceCounter++;
    return generateDeterministicId(`timeout-instance-${instanceCounter}`);
}

/**
 * Generate budget ID
 */
function generateBudgetId(): string {
    budgetCounter++;
    return generateDeterministicId(`timeout-budget-${budgetCounter}`);
}

/**
 * Generate allocation ID
 */
function generateAllocationId(): string {
    allocationCounter++;
    return generateDeterministicId(`budget-alloc-${allocationCounter}`);
}

/**
 * Generate context ID
 */
function generateContextId(): string {
    contextCounter++;
    return generateDeterministicId(`deadline-ctx-${contextCounter}`);
}

/**
 * Generate token ID
 */
function generateTokenId(): string {
    tokenCounter++;
    return generateDeterministicId(`cancel-token-${tokenCounter}`);
}

/**
 * Generate event ID
 */
function generateEventId(): string {
    eventCounter++;
    return generateDeterministicId(`timeout-event-${eventCounter}`);
}

/**
 * Emit timeout event
 */
async function emitEvent(event: TimeoutEvent): Promise<void> {
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
        activeTimeouts: number;
        expiredTimeouts: number;
        cancelledTimeouts: number;
        completedTimeouts: number;
        totalBudgets: number;
        exhaustedBudgets: number;
    };
    
    mutableStats.totalConfigs = configs.size;
    mutableStats.activeTimeouts = 0;
    mutableStats.expiredTimeouts = 0;
    mutableStats.cancelledTimeouts = 0;
    mutableStats.completedTimeouts = 0;
    
    for (const instance of instances.values()) {
        switch (instance.state) {
            case 'active':
            case 'pending':
                mutableStats.activeTimeouts++;
                break;
            case 'expired':
                mutableStats.expiredTimeouts++;
                break;
            case 'cancelled':
                mutableStats.cancelledTimeouts++;
                break;
            case 'completed':
                mutableStats.completedTimeouts++;
                break;
        }
    }
    
    mutableStats.totalBudgets = budgets.size;
    mutableStats.exhaustedBudgets = Array.from(budgets.values())
        .filter(b => b.remainingBudget <= 0).length;
}

// ============================================================================
// CONFIG MANAGEMENT
// ============================================================================

/**
 * Create timeout config
 */
export async function createTimeoutConfig(
    name: string,
    type: TimeoutType,
    duration: number,
    options: {
        cascadeEnabled?: boolean;
        cascadeReduction?: number;
        minTimeout?: number;
        maxTimeout?: number;
        metadata?: Record<string, unknown>;
    } = {}
): Promise<TimeoutConfig> {
    const configId = generateConfigId();
    
    const config: TimeoutConfig = {
        configId,
        name,
        type,
        duration,
        cascadeEnabled: options.cascadeEnabled ?? false,
        cascadeReduction: options.cascadeReduction ?? 0.1,
        minTimeout: options.minTimeout ?? 100,
        maxTimeout: options.maxTimeout ?? 300000,
        enabled: true,
        metadata: options.metadata ?? {},
    };
    
    configs.set(configId, config);
    configs.set(name, config);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'config_created',
        instanceId: null,
        timestamp: clock.nowMs(),
        data: { configId, name, type, duration },
    });
    
    updateStatistics();
    
    return config;
}

/**
 * Get timeout config
 */
export function getTimeoutConfig(nameOrId: string): TimeoutConfig | null {
    return configs.get(nameOrId) ?? null;
}

/**
 * Get all timeout configs
 */
export function getAllTimeoutConfigs(): readonly TimeoutConfig[] {
    const uniqueConfigs = new Map<string, TimeoutConfig>();
    for (const config of configs.values()) {
        uniqueConfigs.set(config.configId, config);
    }
    return Array.from(uniqueConfigs.values());
}

/**
 * Update timeout config
 */
export function updateTimeoutConfig(
    nameOrId: string,
    updates: {
        duration?: number;
        cascadeEnabled?: boolean;
        cascadeReduction?: number;
        minTimeout?: number;
        maxTimeout?: number;
        enabled?: boolean;
    }
): TimeoutConfig | null {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    
    const updatedConfig: TimeoutConfig = {
        ...config,
        duration: updates.duration ?? config.duration,
        cascadeEnabled: updates.cascadeEnabled ?? config.cascadeEnabled,
        cascadeReduction: updates.cascadeReduction ?? config.cascadeReduction,
        minTimeout: updates.minTimeout ?? config.minTimeout,
        maxTimeout: updates.maxTimeout ?? config.maxTimeout,
        enabled: updates.enabled ?? config.enabled,
    };
    
    configs.set(config.configId, updatedConfig);
    configs.set(config.name, updatedConfig);
    
    return updatedConfig;
}

/**
 * Delete timeout config
 */
export async function deleteTimeoutConfig(nameOrId: string): Promise<boolean> {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    
    configs.delete(config.configId);
    configs.delete(config.name);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'config_deleted',
        instanceId: null,
        timestamp: clock.nowMs(),
        data: { configId: config.configId },
    });
    
    updateStatistics();
    
    return true;
}

// ============================================================================
// TIMEOUT INSTANCE MANAGEMENT
// ============================================================================

/**
 * Start timeout
 */
export async function startTimeout(
    nameOrId: string,
    options: {
        parentId?: string;
        customDuration?: number;
        metadata?: Record<string, unknown>;
    } = {}
): Promise<TimeoutInstance> {
    const config = configs.get(nameOrId);
    if (!config) {
        throw new Error(`Timeout config '${nameOrId}' not found`);
    }
    
    const instanceId = generateInstanceId();
    const now = clock.nowMs();
    
    let duration = options.customDuration ?? config.duration;
    
    if (options.parentId && config.cascadeEnabled) {
        const parent = instances.get(options.parentId);
        if (parent && parent.state === 'active') {
            const cascadedDuration = parent.remainingTime * (1 - config.cascadeReduction);
            duration = Math.min(duration, cascadedDuration);
        }
    }
    
    duration = Math.max(config.minTimeout, Math.min(duration, config.maxTimeout));
    
    const deadline = now + duration;
    
    const instance: TimeoutInstance = {
        instanceId,
        configId: config.configId,
        startTime: now,
        deadline,
        remainingTime: duration,
        state: 'active',
        parentId: options.parentId ?? null,
        childIds: [],
        metadata: options.metadata ?? {},
    };
    
    instances.set(instanceId, instance);
    
    if (options.parentId) {
        const parent = instances.get(options.parentId);
        if (parent) {
            const updatedParent: TimeoutInstance = {
                ...parent,
                childIds: [...parent.childIds, instanceId],
            };
            instances.set(options.parentId, updatedParent);
        }
    }
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'timeout_started',
        instanceId,
        timestamp: now,
        data: { configId: config.configId, duration, deadline },
    });
    
    updateStatistics();
    
    return instance;
}

/**
 * Get timeout instance
 */
export function getTimeoutInstance(instanceId: string): TimeoutInstance | null {
    const instance = instances.get(instanceId);
    if (!instance) {
        return null;
    }
    
    const now = clock.nowMs();
    const remainingTime = Math.max(0, instance.deadline - now);
    
    if (instance.state === 'active' && remainingTime <= 0) {
        const expiredInstance: TimeoutInstance = {
            ...instance,
            remainingTime: 0,
            state: 'expired',
        };
        instances.set(instanceId, expiredInstance);
        return expiredInstance;
    }
    
    return {
        ...instance,
        remainingTime,
    };
}

/**
 * Get all timeout instances
 */
export function getAllTimeoutInstances(): readonly TimeoutInstance[] {
    return Array.from(instances.values()).map(instance => {
        const now = clock.nowMs();
        const remainingTime = Math.max(0, instance.deadline - now);
        return {
            ...instance,
            remainingTime,
        };
    });
}

/**
 * Cancel timeout
 */
export async function cancelTimeout(instanceId: string, reason?: string): Promise<boolean> {
    const instance = instances.get(instanceId);
    if (!instance || instance.state !== 'active') {
        return false;
    }
    
    const cancelledInstance: TimeoutInstance = {
        ...instance,
        state: 'cancelled',
        remainingTime: 0,
    };
    
    instances.set(instanceId, cancelledInstance);
    
    for (const childId of instance.childIds) {
        await cancelTimeout(childId, reason);
    }
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'timeout_cancelled',
        instanceId,
        timestamp: clock.nowMs(),
        data: { reason: reason ?? 'Cancelled by user' },
    });
    
    updateStatistics();
    
    return true;
}

/**
 * Complete timeout
 */
export async function completeTimeout(instanceId: string): Promise<boolean> {
    const instance = instances.get(instanceId);
    if (!instance || instance.state !== 'active') {
        return false;
    }
    
    const completedInstance: TimeoutInstance = {
        ...instance,
        state: 'completed',
    };
    
    instances.set(instanceId, completedInstance);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'timeout_completed',
        instanceId,
        timestamp: clock.nowMs(),
        data: {},
    });
    
    updateStatistics();
    
    return true;
}

/**
 * Check if timeout expired
 */
export function isTimeoutExpired(instanceId: string): boolean {
    const instance = getTimeoutInstance(instanceId);
    return instance?.state === 'expired';
}

/**
 * Get remaining time
 */
export function getRemainingTime(instanceId: string): number {
    const instance = getTimeoutInstance(instanceId);
    return instance?.remainingTime ?? 0;
}

// ============================================================================
// TIMEOUT BUDGET MANAGEMENT
// ============================================================================

/**
 * Create timeout budget
 */
export async function createTimeoutBudget(
    name: string,
    totalBudget: number,
    expiresInMs?: number
): Promise<TimeoutBudget> {
    const budgetId = generateBudgetId();
    const now = clock.nowMs();
    
    const budget: TimeoutBudget = {
        budgetId,
        name,
        totalBudget,
        usedBudget: 0,
        remainingBudget: totalBudget,
        allocations: [],
        createdAt: now,
        expiresAt: expiresInMs ? now + expiresInMs : now + 3600000,
    };
    
    budgets.set(budgetId, budget);
    budgets.set(name, budget);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'budget_created',
        instanceId: null,
        timestamp: now,
        data: { budgetId, name, totalBudget },
    });
    
    updateStatistics();
    
    return budget;
}

/**
 * Get timeout budget
 */
export function getTimeoutBudget(nameOrId: string): TimeoutBudget | null {
    return budgets.get(nameOrId) ?? null;
}

/**
 * Allocate from budget
 */
export function allocateFromBudget(
    nameOrId: string,
    operation: string,
    amount: number
): BudgetAllocation | null {
    const budget = budgets.get(nameOrId);
    if (!budget || budget.remainingBudget < amount) {
        return null;
    }
    
    const allocationId = generateAllocationId();
    const now = clock.nowMs();
    
    const allocation: BudgetAllocation = {
        allocationId,
        budgetId: budget.budgetId,
        operation,
        allocated: amount,
        used: 0,
        startTime: now,
        endTime: null,
    };
    
    const updatedBudget: TimeoutBudget = {
        ...budget,
        usedBudget: budget.usedBudget + amount,
        remainingBudget: budget.remainingBudget - amount,
        allocations: [...budget.allocations, allocation],
    };
    
    budgets.set(budget.budgetId, updatedBudget);
    budgets.set(budget.name, updatedBudget);
    
    return allocation;
}

/**
 * Release budget allocation
 */
export function releaseBudgetAllocation(
    nameOrId: string,
    allocationId: string,
    actualUsed: number
): boolean {
    const budget = budgets.get(nameOrId);
    if (!budget) {
        return false;
    }
    
    const allocationIndex = budget.allocations.findIndex(a => a.allocationId === allocationId);
    if (allocationIndex === -1) {
        return false;
    }
    
    const allocation = budget.allocations[allocationIndex];
    const unused = allocation.allocated - actualUsed;
    
    const updatedAllocation: BudgetAllocation = {
        ...allocation,
        used: actualUsed,
        endTime: clock.nowMs(),
    };
    
    const updatedAllocations = [...budget.allocations];
    updatedAllocations[allocationIndex] = updatedAllocation;
    
    const updatedBudget: TimeoutBudget = {
        ...budget,
        usedBudget: budget.usedBudget - unused,
        remainingBudget: budget.remainingBudget + unused,
        allocations: updatedAllocations,
    };
    
    budgets.set(budget.budgetId, updatedBudget);
    budgets.set(budget.name, updatedBudget);
    
    return true;
}

/**
 * Delete timeout budget
 */
export function deleteTimeoutBudget(nameOrId: string): boolean {
    const budget = budgets.get(nameOrId);
    if (!budget) {
        return false;
    }
    
    budgets.delete(budget.budgetId);
    budgets.delete(budget.name);
    
    updateStatistics();
    
    return true;
}

// ============================================================================
// DEADLINE PROPAGATION
// ============================================================================

/**
 * Create deadline context
 */
export async function createDeadlineContext(
    deadline: number,
    options: {
        propagatedFrom?: string;
        metadata?: Record<string, unknown>;
    } = {}
): Promise<DeadlineContext> {
    const contextId = generateContextId();
    const now = clock.nowMs();
    
    const context: DeadlineContext = {
        contextId,
        deadline,
        remainingTime: Math.max(0, deadline - now),
        propagatedFrom: options.propagatedFrom ?? null,
        propagatedTo: [],
        metadata: options.metadata ?? {},
    };
    
    deadlineContexts.set(contextId, context);
    
    if (options.propagatedFrom) {
        const parentContext = deadlineContexts.get(options.propagatedFrom);
        if (parentContext) {
            const updatedParent: DeadlineContext = {
                ...parentContext,
                propagatedTo: [...parentContext.propagatedTo, contextId],
            };
            deadlineContexts.set(options.propagatedFrom, updatedParent);
        }
        
        await emitEvent({
            eventId: generateEventId(),
            type: 'deadline_propagated',
            instanceId: null,
            timestamp: now,
            data: { from: options.propagatedFrom, to: contextId, deadline },
        });
    }
    
    return context;
}

/**
 * Get deadline context
 */
export function getDeadlineContext(contextId: string): DeadlineContext | null {
    const context = deadlineContexts.get(contextId);
    if (!context) {
        return null;
    }
    
    const now = clock.nowMs();
    return {
        ...context,
        remainingTime: Math.max(0, context.deadline - now),
    };
}

/**
 * Propagate deadline
 */
export async function propagateDeadline(
    parentContextId: string,
    reduction: number = 0
): Promise<DeadlineContext | null> {
    const parentContext = getDeadlineContext(parentContextId);
    if (!parentContext) {
        return null;
    }
    
    const now = clock.nowMs();
    const newDeadline = parentContext.deadline - reduction;
    
    if (newDeadline <= now) {
        return null;
    }
    
    return createDeadlineContext(newDeadline, {
        propagatedFrom: parentContextId,
    });
}

/**
 * Delete deadline context
 */
export function deleteDeadlineContext(contextId: string): boolean {
    return deadlineContexts.delete(contextId);
}

// ============================================================================
// CANCELLATION TOKEN MANAGEMENT
// ============================================================================

/**
 * Create cancellation token
 */
export function createCancellationToken(): CancellationToken {
    const tokenId = generateTokenId();
    
    const token: CancellationToken = {
        tokenId,
        cancelled: false,
        reason: null,
        cancelledAt: null,
    };
    
    cancellationTokens.set(tokenId, token);
    
    return token;
}

/**
 * Get cancellation token
 */
export function getCancellationToken(tokenId: string): CancellationToken | null {
    return cancellationTokens.get(tokenId) ?? null;
}

/**
 * Cancel token
 */
export function cancelToken(tokenId: string, reason?: string): boolean {
    const token = cancellationTokens.get(tokenId);
    if (!token || token.cancelled) {
        return false;
    }
    
    const cancelledToken: CancellationToken = {
        ...token,
        cancelled: true,
        reason: reason ?? null,
        cancelledAt: clock.nowMs(),
    };
    
    cancellationTokens.set(tokenId, cancelledToken);
    
    return true;
}

/**
 * Is token cancelled
 */
export function isTokenCancelled(tokenId: string): boolean {
    const token = cancellationTokens.get(tokenId);
    return token?.cancelled ?? false;
}

/**
 * Delete cancellation token
 */
export function deleteCancellationToken(tokenId: string): boolean {
    return cancellationTokens.delete(tokenId);
}

// ============================================================================
// TIMEOUT EXECUTION
// ============================================================================

/**
 * Execute with timeout
 */
export async function executeWithTimeout<T>(
    operation: () => T | Promise<T>,
    timeoutMs: number,
    options: {
        cancellationToken?: string;
        onTimeout?: () => void;
    } = {}
): Promise<T> {
    const startTime = clock.nowMs();
    const deadline = startTime + timeoutMs;
    
    return new Promise<T>((resolve, reject) => {
        let completed = false;
        
        const timeoutId = setTimeout(() => {
            if (!completed) {
                completed = true;
                if (options.onTimeout) {
                    options.onTimeout();
                }
                reject(new Error('Operation timed out'));
            }
        }, timeoutMs);
        
        if (typeof timeoutId === 'object' && 'unref' in timeoutId) {
            (timeoutId as NodeJS.Timeout).unref();
        }
        
        const checkCancellation = (): boolean => {
            if (options.cancellationToken && isTokenCancelled(options.cancellationToken)) {
                if (!completed) {
                    completed = true;
                    clearTimeout(timeoutId);
                    reject(new Error('Operation cancelled'));
                }
                return true;
            }
            return false;
        };
        
        if (checkCancellation()) {
            return;
        }
        
        Promise.resolve(operation())
            .then(result => {
                if (!completed) {
                    completed = true;
                    clearTimeout(timeoutId);
                    resolve(result);
                }
            })
            .catch(error => {
                if (!completed) {
                    completed = true;
                    clearTimeout(timeoutId);
                    reject(error);
                }
            });
    });
}

/**
 * Execute with deadline
 */
export async function executeWithDeadline<T>(
    operation: () => T | Promise<T>,
    deadline: number,
    options: {
        cancellationToken?: string;
        onTimeout?: () => void;
    } = {}
): Promise<T> {
    const now = clock.nowMs();
    const remainingTime = deadline - now;
    
    if (remainingTime <= 0) {
        throw new Error('Deadline already passed');
    }
    
    return executeWithTimeout(operation, remainingTime, options);
}

/**
 * Execute with budget
 */
export async function executeWithBudget<T>(
    budgetNameOrId: string,
    operation: string,
    requestedTime: number,
    fn: () => T | Promise<T>
): Promise<T> {
    const allocation = allocateFromBudget(budgetNameOrId, operation, requestedTime);
    if (!allocation) {
        throw new Error('Insufficient budget');
    }
    
    const startTime = clock.nowMs();
    
    try {
        const result = await executeWithTimeout(fn, allocation.allocated);
        const actualUsed = clock.nowMs() - startTime;
        releaseBudgetAllocation(budgetNameOrId, allocation.allocationId, actualUsed);
        return result;
    } catch (error) {
        const actualUsed = clock.nowMs() - startTime;
        releaseBudgetAllocation(budgetNameOrId, allocation.allocationId, actualUsed);
        throw error;
    }
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get statistics
 */
export function getStatistics(): Readonly<TimeoutStatistics> {
    updateStatistics();
    return { ...statistics };
}

/**
 * Reset statistics
 */
export function resetStatistics(): void {
    Object.assign(statistics, {
        totalConfigs: 0,
        activeTimeouts: 0,
        expiredTimeouts: 0,
        cancelledTimeouts: 0,
        completedTimeouts: 0,
        totalBudgets: 0,
        exhaustedBudgets: 0,
        averageTimeoutDuration: 0,
    });
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Add event listener
 */
export function addEventListener(listener: TimeoutEventListener): void {
    eventListeners.add(listener);
}

/**
 * Remove event listener
 */
export function removeEventListener(listener: TimeoutEventListener): void {
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
    instances.clear();
    budgets.clear();
    deadlineContexts.clear();
    cancellationTokens.clear();
    eventListeners.clear();
    resetStatistics();
}
