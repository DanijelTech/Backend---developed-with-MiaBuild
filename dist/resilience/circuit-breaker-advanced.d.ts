/**
 * @file Advanced Circuit Breaker za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-RES-001 Advanced circuit breaker za zaledne sisteme
 * @design DSN-ZALEDNI-RES-001 Backend resilience arhitektura
 * @test TEST-ZALEDNI-RES-001 Preverjanje circuit breaker
 *
 * Advanced Circuit Breaker - prilagojen za zaledne sisteme:
 * - Multi-level circuit breakers
 * - Adaptive thresholds
 * - Health-based transitions
 * - Bulkhead isolation
 * - Fallback strategies
 * - Recovery patterns
 * - Metrics collection
 * - Event notifications
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom RES_001 - Advanced Circuit Breaker
 */
/**
 * Circuit state
 */
export type CircuitState = 'closed' | 'open' | 'half_open';
/**
 * Failure type
 */
export type FailureType = 'timeout' | 'error' | 'rejection' | 'overload' | 'custom';
/**
 * Recovery strategy
 */
export type RecoveryStrategy = 'linear' | 'exponential' | 'fibonacci' | 'adaptive';
/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
    readonly circuitId: string;
    readonly name: string;
    readonly failureThreshold: number;
    readonly successThreshold: number;
    readonly timeout: number;
    readonly halfOpenMaxCalls: number;
    readonly volumeThreshold: number;
    readonly errorPercentageThreshold: number;
    readonly slowCallDurationThreshold: number;
    readonly slowCallPercentageThreshold: number;
    readonly recoveryStrategy: RecoveryStrategy;
    readonly recoveryBaseDelay: number;
    readonly recoveryMaxDelay: number;
    readonly enabled: boolean;
    readonly metadata: Readonly<Record<string, unknown>>;
}
/**
 * Circuit breaker state
 */
export interface CircuitBreakerState {
    readonly circuitId: string;
    readonly state: CircuitState;
    readonly failureCount: number;
    readonly successCount: number;
    readonly lastFailureTime: number | null;
    readonly lastSuccessTime: number | null;
    readonly lastStateChangeTime: number;
    readonly openedAt: number | null;
    readonly halfOpenCallCount: number;
    readonly consecutiveFailures: number;
    readonly consecutiveSuccesses: number;
    readonly totalCalls: number;
    readonly totalFailures: number;
    readonly totalSuccesses: number;
    readonly totalTimeouts: number;
    readonly totalRejections: number;
    readonly slowCallCount: number;
    readonly averageResponseTime: number;
}
/**
 * Circuit call result
 */
export interface CircuitCallResult<T> {
    readonly resultId: string;
    readonly circuitId: string;
    readonly success: boolean;
    readonly value: T | null;
    readonly error: Error | null;
    readonly duration: number;
    readonly timestamp: number;
    readonly wasRejected: boolean;
    readonly usedFallback: boolean;
}
/**
 * Failure record
 */
export interface FailureRecord {
    readonly recordId: string;
    readonly circuitId: string;
    readonly type: FailureType;
    readonly error: string;
    readonly timestamp: number;
    readonly duration: number;
    readonly context: Readonly<Record<string, unknown>>;
}
/**
 * Circuit event
 */
export interface CircuitEvent {
    readonly eventId: string;
    readonly type: CircuitEventType;
    readonly circuitId: string;
    readonly timestamp: number;
    readonly previousState: CircuitState | null;
    readonly newState: CircuitState | null;
    readonly data: Readonly<Record<string, unknown>>;
}
/**
 * Circuit event type
 */
export type CircuitEventType = 'circuit_created' | 'circuit_deleted' | 'state_changed' | 'call_success' | 'call_failure' | 'call_rejected' | 'call_timeout' | 'fallback_executed' | 'recovery_started' | 'recovery_completed' | 'threshold_exceeded';
/**
 * Circuit event listener
 */
export type CircuitEventListener = (event: CircuitEvent) => void | Promise<void>;
/**
 * Fallback function
 */
export type FallbackFunction<T> = (error: Error, context: Record<string, unknown>) => T | Promise<T>;
/**
 * Health check function
 */
export type HealthCheckFunction = () => boolean | Promise<boolean>;
/**
 * Circuit statistics
 */
export interface CircuitStatistics {
    readonly totalCircuits: number;
    readonly openCircuits: number;
    readonly closedCircuits: number;
    readonly halfOpenCircuits: number;
    readonly totalCalls: number;
    readonly totalSuccesses: number;
    readonly totalFailures: number;
    readonly totalRejections: number;
    readonly totalTimeouts: number;
    readonly totalFallbacks: number;
    readonly averageResponseTime: number;
}
/**
 * Bulkhead configuration
 */
export interface BulkheadConfig {
    readonly bulkheadId: string;
    readonly name: string;
    readonly maxConcurrent: number;
    readonly maxWait: number;
    readonly enabled: boolean;
}
/**
 * Bulkhead state
 */
export interface BulkheadState {
    readonly bulkheadId: string;
    readonly currentConcurrent: number;
    readonly waitingCount: number;
    readonly totalExecuted: number;
    readonly totalRejected: number;
}
/**
 * Create circuit breaker
 */
export declare function createCircuitBreaker(name: string, options?: {
    failureThreshold?: number;
    successThreshold?: number;
    timeout?: number;
    halfOpenMaxCalls?: number;
    volumeThreshold?: number;
    errorPercentageThreshold?: number;
    slowCallDurationThreshold?: number;
    slowCallPercentageThreshold?: number;
    recoveryStrategy?: RecoveryStrategy;
    recoveryBaseDelay?: number;
    recoveryMaxDelay?: number;
    metadata?: Record<string, unknown>;
}): Promise<CircuitBreakerConfig>;
/**
 * Get circuit breaker
 */
export declare function getCircuitBreaker(nameOrId: string): CircuitBreakerConfig | null;
/**
 * Get all circuit breakers
 */
export declare function getAllCircuitBreakers(): readonly CircuitBreakerConfig[];
/**
 * Get circuit state
 */
export declare function getCircuitState(nameOrId: string): CircuitBreakerState | null;
/**
 * Delete circuit breaker
 */
export declare function deleteCircuitBreaker(nameOrId: string): Promise<boolean>;
/**
 * Execute with circuit breaker
 */
export declare function execute<T>(nameOrId: string, operation: () => T | Promise<T>, context?: Record<string, unknown>): Promise<CircuitCallResult<T>>;
/**
 * Force open circuit
 */
export declare function forceOpen(nameOrId: string): Promise<boolean>;
/**
 * Force close circuit
 */
export declare function forceClose(nameOrId: string): Promise<boolean>;
/**
 * Reset circuit
 */
export declare function resetCircuit(nameOrId: string): Promise<boolean>;
/**
 * Register fallback
 */
export declare function registerFallback<T>(nameOrId: string, fallback: FallbackFunction<T>): boolean;
/**
 * Remove fallback
 */
export declare function removeFallback(nameOrId: string): boolean;
/**
 * Register health check
 */
export declare function registerHealthCheck(nameOrId: string, healthCheck: HealthCheckFunction): boolean;
/**
 * Remove health check
 */
export declare function removeHealthCheck(nameOrId: string): boolean;
/**
 * Run health check
 */
export declare function runHealthCheck(nameOrId: string): Promise<boolean>;
/**
 * Create bulkhead
 */
export declare function createBulkhead(name: string, options?: {
    maxConcurrent?: number;
    maxWait?: number;
}): BulkheadConfig;
/**
 * Get bulkhead
 */
export declare function getBulkhead(nameOrId: string): BulkheadConfig | null;
/**
 * Get bulkhead state
 */
export declare function getBulkheadState(nameOrId: string): BulkheadState | null;
/**
 * Delete bulkhead
 */
export declare function deleteBulkhead(nameOrId: string): boolean;
/**
 * Get failure records
 */
export declare function getFailureRecords(nameOrId: string): readonly FailureRecord[];
/**
 * Clear failure records
 */
export declare function clearFailureRecords(nameOrId: string): boolean;
/**
 * Get statistics
 */
export declare function getStatistics(): Readonly<CircuitStatistics>;
/**
 * Reset statistics
 */
export declare function resetStatistics(): void;
/**
 * Add event listener
 */
export declare function addEventListener(listener: CircuitEventListener): void;
/**
 * Remove event listener
 */
export declare function removeEventListener(listener: CircuitEventListener): void;
/**
 * Clear event listeners
 */
export declare function clearEventListeners(): void;
/**
 * Clear all state
 */
export declare function clearAll(): void;
