/**
 * @file Retry Policy za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-RES-002 Retry policy za zaledne sisteme
 * @design DSN-ZALEDNI-RES-002 Backend retry arhitektura
 * @test TEST-ZALEDNI-RES-002 Preverjanje retry policy
 *
 * Retry Policy - prilagojen za zaledne sisteme:
 * - Configurable retry strategies
 * - Backoff algorithms
 * - Jitter support
 * - Retry conditions
 * - Timeout handling
 * - Circuit breaker integration
 * - Metrics collection
 * - Event notifications
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom RES_002 - Retry Policy
 */
/**
 * Retry strategy
 */
export type RetryStrategy = 'fixed' | 'linear' | 'exponential' | 'fibonacci' | 'decorrelated_jitter';
/**
 * Jitter type
 */
export type JitterType = 'none' | 'full' | 'equal' | 'decorrelated';
/**
 * Retry condition type
 */
export type RetryConditionType = 'always' | 'on_error' | 'on_timeout' | 'on_status' | 'custom';
/**
 * Retry policy configuration
 */
export interface RetryPolicyConfig {
    readonly policyId: string;
    readonly name: string;
    readonly maxRetries: number;
    readonly strategy: RetryStrategy;
    readonly baseDelay: number;
    readonly maxDelay: number;
    readonly multiplier: number;
    readonly jitterType: JitterType;
    readonly jitterFactor: number;
    readonly timeout: number;
    readonly retryableErrors: readonly string[];
    readonly nonRetryableErrors: readonly string[];
    readonly retryableStatusCodes: readonly number[];
    readonly enabled: boolean;
    readonly metadata: Readonly<Record<string, unknown>>;
}
/**
 * Retry attempt
 */
export interface RetryAttempt {
    readonly attemptId: string;
    readonly policyId: string;
    readonly attemptNumber: number;
    readonly startTime: number;
    readonly endTime: number | null;
    readonly duration: number | null;
    readonly success: boolean;
    readonly error: string | null;
    readonly delay: number;
    readonly metadata: Readonly<Record<string, unknown>>;
}
/**
 * Retry execution result
 */
export interface RetryExecutionResult<T> {
    readonly executionId: string;
    readonly policyId: string;
    readonly success: boolean;
    readonly value: T | null;
    readonly error: Error | null;
    readonly totalAttempts: number;
    readonly totalDuration: number;
    readonly attempts: readonly RetryAttempt[];
    readonly timestamp: number;
}
/**
 * Retry condition
 */
export interface RetryCondition {
    readonly conditionId: string;
    readonly type: RetryConditionType;
    readonly predicate: RetryPredicate | null;
    readonly errorPatterns: readonly string[];
    readonly statusCodes: readonly number[];
}
/**
 * Retry predicate
 */
export type RetryPredicate = (error: Error, attempt: number, context: Record<string, unknown>) => boolean;
/**
 * Retry event
 */
export interface RetryEvent {
    readonly eventId: string;
    readonly type: RetryEventType;
    readonly policyId: string;
    readonly timestamp: number;
    readonly attemptNumber: number | null;
    readonly data: Readonly<Record<string, unknown>>;
}
/**
 * Retry event type
 */
export type RetryEventType = 'policy_created' | 'policy_deleted' | 'execution_started' | 'attempt_started' | 'attempt_success' | 'attempt_failure' | 'attempt_timeout' | 'retry_scheduled' | 'execution_success' | 'execution_failure' | 'execution_exhausted';
/**
 * Retry event listener
 */
export type RetryEventListener = (event: RetryEvent) => void | Promise<void>;
/**
 * Retry statistics
 */
export interface RetryStatistics {
    readonly totalPolicies: number;
    readonly totalExecutions: number;
    readonly successfulExecutions: number;
    readonly failedExecutions: number;
    readonly exhaustedExecutions: number;
    readonly totalAttempts: number;
    readonly successfulAttempts: number;
    readonly failedAttempts: number;
    readonly averageAttemptsPerExecution: number;
    readonly averageExecutionDuration: number;
}
/**
 * Delay calculator
 */
export type DelayCalculator = (attempt: number, baseDelay: number, maxDelay: number, multiplier: number) => number;
/**
 * Create retry policy
 */
export declare function createRetryPolicy(name: string, options?: {
    maxRetries?: number;
    strategy?: RetryStrategy;
    baseDelay?: number;
    maxDelay?: number;
    multiplier?: number;
    jitterType?: JitterType;
    jitterFactor?: number;
    timeout?: number;
    retryableErrors?: readonly string[];
    nonRetryableErrors?: readonly string[];
    retryableStatusCodes?: readonly number[];
    metadata?: Record<string, unknown>;
}): Promise<RetryPolicyConfig>;
/**
 * Get retry policy
 */
export declare function getRetryPolicy(nameOrId: string): RetryPolicyConfig | null;
/**
 * Get all retry policies
 */
export declare function getAllRetryPolicies(): readonly RetryPolicyConfig[];
/**
 * Update retry policy
 */
export declare function updateRetryPolicy(nameOrId: string, updates: {
    maxRetries?: number;
    strategy?: RetryStrategy;
    baseDelay?: number;
    maxDelay?: number;
    multiplier?: number;
    jitterType?: JitterType;
    jitterFactor?: number;
    timeout?: number;
    enabled?: boolean;
}): RetryPolicyConfig | null;
/**
 * Delete retry policy
 */
export declare function deleteRetryPolicy(nameOrId: string): Promise<boolean>;
/**
 * Add retry condition
 */
export declare function addRetryCondition(nameOrId: string, type: RetryConditionType, options?: {
    predicate?: RetryPredicate;
    errorPatterns?: readonly string[];
    statusCodes?: readonly number[];
}): RetryCondition | null;
/**
 * Remove retry condition
 */
export declare function removeRetryCondition(nameOrId: string, conditionId: string): boolean;
/**
 * Get retry conditions
 */
export declare function getRetryConditions(nameOrId: string): readonly RetryCondition[];
/**
 * Execute with retry
 */
export declare function executeWithRetry<T>(nameOrId: string, operation: () => T | Promise<T>, context?: Record<string, unknown>): Promise<RetryExecutionResult<T>>;
/**
 * Execute with simple retry
 */
export declare function retrySimple<T>(operation: () => T | Promise<T>, maxRetries?: number, baseDelay?: number): Promise<T>;
/**
 * Register delay calculator
 */
export declare function registerDelayCalculator(strategy: RetryStrategy, calculator: DelayCalculator): void;
/**
 * Get delay calculator
 */
export declare function getDelayCalculator(strategy: RetryStrategy): DelayCalculator | null;
/**
 * Get statistics
 */
export declare function getStatistics(): Readonly<RetryStatistics>;
/**
 * Reset statistics
 */
export declare function resetStatistics(): void;
/**
 * Add event listener
 */
export declare function addEventListener(listener: RetryEventListener): void;
/**
 * Remove event listener
 */
export declare function removeEventListener(listener: RetryEventListener): void;
/**
 * Clear event listeners
 */
export declare function clearEventListeners(): void;
/**
 * Clear all state
 */
export declare function clearAll(): void;
