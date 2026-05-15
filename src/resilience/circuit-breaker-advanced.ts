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

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI ZA CIRCUIT BREAKER
// ============================================================================

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
export type CircuitEventType =
    | 'circuit_created'
    | 'circuit_deleted'
    | 'state_changed'
    | 'call_success'
    | 'call_failure'
    | 'call_rejected'
    | 'call_timeout'
    | 'fallback_executed'
    | 'recovery_started'
    | 'recovery_completed'
    | 'threshold_exceeded';

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

// ============================================================================
// STANJE
// ============================================================================

const circuits: Map<string, CircuitBreakerConfig> = new Map();
const circuitStates: Map<string, CircuitBreakerState> = new Map();
const failureRecords: Map<string, FailureRecord[]> = new Map();
const fallbacks: Map<string, FallbackFunction<unknown>> = new Map();
const healthChecks: Map<string, HealthCheckFunction> = new Map();
const bulkheads: Map<string, BulkheadConfig> = new Map();
const bulkheadStates: Map<string, BulkheadState> = new Map();
const eventListeners: Set<CircuitEventListener> = new Set();

let circuitCounter = 0;
let resultCounter = 0;
let recordCounter = 0;
let eventCounter = 0;
let bulkheadCounter = 0;

const statistics: CircuitStatistics = {
    totalCircuits: 0,
    openCircuits: 0,
    closedCircuits: 0,
    halfOpenCircuits: 0,
    totalCalls: 0,
    totalSuccesses: 0,
    totalFailures: 0,
    totalRejections: 0,
    totalTimeouts: 0,
    totalFallbacks: 0,
    averageResponseTime: 0,
};

// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================

/**
 * Generate circuit ID
 */
function generateCircuitId(): string {
    circuitCounter++;
    return generateDeterministicId(`circuit-${circuitCounter}`);
}

/**
 * Generate result ID
 */
function generateResultId(): string {
    resultCounter++;
    return generateDeterministicId(`circuit-result-${resultCounter}`);
}

/**
 * Generate record ID
 */
function generateRecordId(): string {
    recordCounter++;
    return generateDeterministicId(`failure-record-${recordCounter}`);
}

/**
 * Generate event ID
 */
function generateEventId(): string {
    eventCounter++;
    return generateDeterministicId(`circuit-event-${eventCounter}`);
}

/**
 * Generate bulkhead ID
 */
function generateBulkheadId(): string {
    bulkheadCounter++;
    return generateDeterministicId(`bulkhead-${bulkheadCounter}`);
}

/**
 * Emit circuit event
 */
async function emitEvent(event: CircuitEvent): Promise<void> {
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
        totalCircuits: number;
        openCircuits: number;
        closedCircuits: number;
        halfOpenCircuits: number;
    };
    
    mutableStats.totalCircuits = circuits.size;
    mutableStats.openCircuits = 0;
    mutableStats.closedCircuits = 0;
    mutableStats.halfOpenCircuits = 0;
    
    for (const state of circuitStates.values()) {
        switch (state.state) {
            case 'open':
                mutableStats.openCircuits++;
                break;
            case 'closed':
                mutableStats.closedCircuits++;
                break;
            case 'half_open':
                mutableStats.halfOpenCircuits++;
                break;
        }
    }
}

/**
 * Calculate recovery delay
 */
function calculateRecoveryDelay(
    strategy: RecoveryStrategy,
    baseDelay: number,
    maxDelay: number,
    attempt: number
): number {
    let delay: number;
    
    switch (strategy) {
        case 'linear':
            delay = baseDelay * attempt;
            break;
        case 'exponential':
            delay = baseDelay * Math.pow(2, attempt - 1);
            break;
        case 'fibonacci':
            const fib = (n: number): number => {
                if (n <= 1) return n;
                let a = 0, b = 1;
                for (let i = 2; i <= n; i++) {
                    const temp = a + b;
                    a = b;
                    b = temp;
                }
                return b;
            };
            delay = baseDelay * fib(attempt);
            break;
        case 'adaptive':
            delay = baseDelay * Math.log2(attempt + 1) * attempt;
            break;
        default:
            delay = baseDelay;
    }
    
    return Math.min(delay, maxDelay);
}

/**
 * Check if circuit should open
 */
function shouldOpenCircuit(config: CircuitBreakerConfig, state: CircuitBreakerState): boolean {
    if (state.totalCalls < config.volumeThreshold) {
        return false;
    }
    
    if (state.consecutiveFailures >= config.failureThreshold) {
        return true;
    }
    
    const errorPercentage = (state.totalFailures / state.totalCalls) * 100;
    if (errorPercentage >= config.errorPercentageThreshold) {
        return true;
    }
    
    const slowCallPercentage = (state.slowCallCount / state.totalCalls) * 100;
    if (slowCallPercentage >= config.slowCallPercentageThreshold) {
        return true;
    }
    
    return false;
}

/**
 * Check if circuit should close
 */
function shouldCloseCircuit(config: CircuitBreakerConfig, state: CircuitBreakerState): boolean {
    return state.consecutiveSuccesses >= config.successThreshold;
}

/**
 * Initialize circuit state
 */
function initializeCircuitState(circuitId: string): CircuitBreakerState {
    const now = clock.nowMs();
    return {
        circuitId,
        state: 'closed',
        failureCount: 0,
        successCount: 0,
        lastFailureTime: null,
        lastSuccessTime: null,
        lastStateChangeTime: now,
        openedAt: null,
        halfOpenCallCount: 0,
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        totalCalls: 0,
        totalFailures: 0,
        totalSuccesses: 0,
        totalTimeouts: 0,
        totalRejections: 0,
        slowCallCount: 0,
        averageResponseTime: 0,
    };
}

// ============================================================================
// CIRCUIT BREAKER MANAGEMENT
// ============================================================================

/**
 * Create circuit breaker
 */
export async function createCircuitBreaker(
    name: string,
    options: {
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
    } = {}
): Promise<CircuitBreakerConfig> {
    const circuitId = generateCircuitId();
    
    const config: CircuitBreakerConfig = {
        circuitId,
        name,
        failureThreshold: options.failureThreshold ?? 5,
        successThreshold: options.successThreshold ?? 3,
        timeout: options.timeout ?? 30000,
        halfOpenMaxCalls: options.halfOpenMaxCalls ?? 3,
        volumeThreshold: options.volumeThreshold ?? 10,
        errorPercentageThreshold: options.errorPercentageThreshold ?? 50,
        slowCallDurationThreshold: options.slowCallDurationThreshold ?? 5000,
        slowCallPercentageThreshold: options.slowCallPercentageThreshold ?? 80,
        recoveryStrategy: options.recoveryStrategy ?? 'exponential',
        recoveryBaseDelay: options.recoveryBaseDelay ?? 1000,
        recoveryMaxDelay: options.recoveryMaxDelay ?? 60000,
        enabled: true,
        metadata: options.metadata ?? {},
    };
    
    circuits.set(circuitId, config);
    circuits.set(name, config);
    
    const state = initializeCircuitState(circuitId);
    circuitStates.set(circuitId, state);
    
    failureRecords.set(circuitId, []);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'circuit_created',
        circuitId,
        timestamp: clock.nowMs(),
        previousState: null,
        newState: 'closed',
        data: { name },
    });
    
    updateStatistics();
    
    return config;
}

/**
 * Get circuit breaker
 */
export function getCircuitBreaker(nameOrId: string): CircuitBreakerConfig | null {
    return circuits.get(nameOrId) ?? null;
}

/**
 * Get all circuit breakers
 */
export function getAllCircuitBreakers(): readonly CircuitBreakerConfig[] {
    const uniqueCircuits = new Map<string, CircuitBreakerConfig>();
    for (const circuit of circuits.values()) {
        uniqueCircuits.set(circuit.circuitId, circuit);
    }
    return Array.from(uniqueCircuits.values());
}

/**
 * Get circuit state
 */
export function getCircuitState(nameOrId: string): CircuitBreakerState | null {
    const config = circuits.get(nameOrId);
    if (!config) {
        return null;
    }
    return circuitStates.get(config.circuitId) ?? null;
}

/**
 * Delete circuit breaker
 */
export async function deleteCircuitBreaker(nameOrId: string): Promise<boolean> {
    const config = circuits.get(nameOrId);
    if (!config) {
        return false;
    }
    
    circuits.delete(config.circuitId);
    circuits.delete(config.name);
    circuitStates.delete(config.circuitId);
    failureRecords.delete(config.circuitId);
    fallbacks.delete(config.circuitId);
    healthChecks.delete(config.circuitId);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'circuit_deleted',
        circuitId: config.circuitId,
        timestamp: clock.nowMs(),
        previousState: null,
        newState: null,
        data: {},
    });
    
    updateStatistics();
    
    return true;
}

// ============================================================================
// CIRCUIT EXECUTION
// ============================================================================

/**
 * Execute with circuit breaker
 */
export async function execute<T>(
    nameOrId: string,
    operation: () => T | Promise<T>,
    context: Record<string, unknown> = {}
): Promise<CircuitCallResult<T>> {
    const config = circuits.get(nameOrId);
    if (!config) {
        throw new Error(`Circuit breaker '${nameOrId}' not found`);
    }
    
    const state = circuitStates.get(config.circuitId);
    if (!state) {
        throw new Error(`Circuit state not found for '${nameOrId}'`);
    }
    
    const resultId = generateResultId();
    const startTime = clock.nowMs();
    
    const mutableStats = statistics as {
        totalCalls: number;
        totalSuccesses: number;
        totalFailures: number;
        totalRejections: number;
        totalTimeouts: number;
        totalFallbacks: number;
        averageResponseTime: number;
    };
    
    if (!config.enabled) {
        try {
            const value = await operation();
            const duration = clock.nowMs() - startTime;
            
            return {
                resultId,
                circuitId: config.circuitId,
                success: true,
                value,
                error: null,
                duration,
                timestamp: startTime,
                wasRejected: false,
                usedFallback: false,
            };
        } catch (error) {
            const duration = clock.nowMs() - startTime;
            
            return {
                resultId,
                circuitId: config.circuitId,
                success: false,
                value: null,
                error: error instanceof Error ? error : new Error(String(error)),
                duration,
                timestamp: startTime,
                wasRejected: false,
                usedFallback: false,
            };
        }
    }
    
    if (state.state === 'open') {
        const now = clock.nowMs();
        const openDuration = now - (state.openedAt ?? now);
        const recoveryDelay = calculateRecoveryDelay(
            config.recoveryStrategy,
            config.recoveryBaseDelay,
            config.recoveryMaxDelay,
            state.consecutiveFailures
        );
        
        if (openDuration < recoveryDelay) {
            mutableStats.totalRejections++;
            
            const fallback = fallbacks.get(config.circuitId);
            if (fallback) {
                try {
                    const fallbackValue = await (fallback as FallbackFunction<T>)(
                        new Error('Circuit is open'),
                        context
                    );
                    
                    mutableStats.totalFallbacks++;
                    
                    await emitEvent({
                        eventId: generateEventId(),
                        type: 'fallback_executed',
                        circuitId: config.circuitId,
                        timestamp: now,
                        previousState: null,
                        newState: null,
                        data: {},
                    });
                    
                    return {
                        resultId,
                        circuitId: config.circuitId,
                        success: true,
                        value: fallbackValue,
                        error: null,
                        duration: clock.nowMs() - startTime,
                        timestamp: startTime,
                        wasRejected: true,
                        usedFallback: true,
                    };
                } catch {
                    // Fallback failed
                }
            }
            
            await emitEvent({
                eventId: generateEventId(),
                type: 'call_rejected',
                circuitId: config.circuitId,
                timestamp: now,
                previousState: null,
                newState: null,
                data: { reason: 'Circuit is open' },
            });
            
            const mutableState = state as {
                totalRejections: number;
            };
            mutableState.totalRejections++;
            
            return {
                resultId,
                circuitId: config.circuitId,
                success: false,
                value: null,
                error: new Error('Circuit is open'),
                duration: clock.nowMs() - startTime,
                timestamp: startTime,
                wasRejected: true,
                usedFallback: false,
            };
        }
        
        await transitionToHalfOpen(config.circuitId);
    }
    
    if (state.state === 'half_open' && state.halfOpenCallCount >= config.halfOpenMaxCalls) {
        mutableStats.totalRejections++;
        
        const mutableState = state as {
            totalRejections: number;
        };
        mutableState.totalRejections++;
        
        return {
            resultId,
            circuitId: config.circuitId,
            success: false,
            value: null,
            error: new Error('Half-open call limit reached'),
            duration: clock.nowMs() - startTime,
            timestamp: startTime,
            wasRejected: true,
            usedFallback: false,
        };
    }
    
    mutableStats.totalCalls++;
    
    const mutableState = state as {
        totalCalls: number;
        halfOpenCallCount: number;
        totalSuccesses: number;
        successCount: number;
        consecutiveSuccesses: number;
        consecutiveFailures: number;
        lastSuccessTime: number;
        totalFailures: number;
        failureCount: number;
        lastFailureTime: number;
        totalTimeouts: number;
        slowCallCount: number;
        averageResponseTime: number;
    };
    
    mutableState.totalCalls++;
    
    if (state.state === 'half_open') {
        mutableState.halfOpenCallCount++;
    }
    
    try {
        const timeoutPromise = new Promise<never>((_, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('Operation timed out'));
            }, config.timeout);
            
            if (typeof timeoutId === 'object' && 'unref' in timeoutId) {
                (timeoutId as NodeJS.Timeout).unref();
            }
        });
        
        const value = await Promise.race([
            Promise.resolve(operation()),
            timeoutPromise,
        ]);
        
        const duration = clock.nowMs() - startTime;
        
        mutableStats.totalSuccesses++;
        mutableState.totalSuccesses++;
        mutableState.successCount++;
        mutableState.consecutiveSuccesses++;
        mutableState.consecutiveFailures = 0;
        mutableState.lastSuccessTime = clock.nowMs();
        
        if (duration > config.slowCallDurationThreshold) {
            mutableState.slowCallCount++;
        }
        
        const totalDuration = mutableState.averageResponseTime * (mutableState.totalCalls - 1) + duration;
        mutableState.averageResponseTime = totalDuration / mutableState.totalCalls;
        mutableStats.averageResponseTime = mutableState.averageResponseTime;
        
        await emitEvent({
            eventId: generateEventId(),
            type: 'call_success',
            circuitId: config.circuitId,
            timestamp: clock.nowMs(),
            previousState: null,
            newState: null,
            data: { duration },
        });
        
        if (state.state === 'half_open' && shouldCloseCircuit(config, state)) {
            await transitionToClosed(config.circuitId);
        }
        
        return {
            resultId,
            circuitId: config.circuitId,
            success: true,
            value,
            error: null,
            duration,
            timestamp: startTime,
            wasRejected: false,
            usedFallback: false,
        };
    } catch (error) {
        const duration = clock.nowMs() - startTime;
        const errorObj = error instanceof Error ? error : new Error(String(error));
        const isTimeout = errorObj.message === 'Operation timed out';
        
        mutableStats.totalFailures++;
        mutableState.totalFailures++;
        mutableState.failureCount++;
        mutableState.consecutiveFailures++;
        mutableState.consecutiveSuccesses = 0;
        mutableState.lastFailureTime = clock.nowMs();
        
        if (isTimeout) {
            mutableStats.totalTimeouts++;
            mutableState.totalTimeouts++;
        }
        
        const records = failureRecords.get(config.circuitId) ?? [];
        records.push({
            recordId: generateRecordId(),
            circuitId: config.circuitId,
            type: isTimeout ? 'timeout' : 'error',
            error: errorObj.message,
            timestamp: clock.nowMs(),
            duration,
            context,
        });
        failureRecords.set(config.circuitId, records);
        
        await emitEvent({
            eventId: generateEventId(),
            type: isTimeout ? 'call_timeout' : 'call_failure',
            circuitId: config.circuitId,
            timestamp: clock.nowMs(),
            previousState: null,
            newState: null,
            data: { error: errorObj.message, duration },
        });
        
        if (state.state === 'closed' && shouldOpenCircuit(config, state)) {
            await transitionToOpen(config.circuitId);
        } else if (state.state === 'half_open') {
            await transitionToOpen(config.circuitId);
        }
        
        const fallback = fallbacks.get(config.circuitId);
        if (fallback) {
            try {
                const fallbackValue = await (fallback as FallbackFunction<T>)(errorObj, context);
                
                mutableStats.totalFallbacks++;
                
                await emitEvent({
                    eventId: generateEventId(),
                    type: 'fallback_executed',
                    circuitId: config.circuitId,
                    timestamp: clock.nowMs(),
                    previousState: null,
                    newState: null,
                    data: {},
                });
                
                return {
                    resultId,
                    circuitId: config.circuitId,
                    success: true,
                    value: fallbackValue,
                    error: null,
                    duration,
                    timestamp: startTime,
                    wasRejected: false,
                    usedFallback: true,
                };
            } catch {
                // Fallback failed
            }
        }
        
        return {
            resultId,
            circuitId: config.circuitId,
            success: false,
            value: null,
            error: errorObj,
            duration,
            timestamp: startTime,
            wasRejected: false,
            usedFallback: false,
        };
    }
}

// ============================================================================
// STATE TRANSITIONS
// ============================================================================

/**
 * Transition to open state
 */
async function transitionToOpen(circuitId: string): Promise<void> {
    const state = circuitStates.get(circuitId);
    if (!state) {
        return;
    }
    
    const previousState = state.state;
    const now = clock.nowMs();
    
    const newState: CircuitBreakerState = {
        ...state,
        state: 'open',
        lastStateChangeTime: now,
        openedAt: now,
        halfOpenCallCount: 0,
    };
    
    circuitStates.set(circuitId, newState);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'state_changed',
        circuitId,
        timestamp: now,
        previousState,
        newState: 'open',
        data: { reason: 'Failure threshold exceeded' },
    });
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'threshold_exceeded',
        circuitId,
        timestamp: now,
        previousState: null,
        newState: null,
        data: {
            consecutiveFailures: state.consecutiveFailures,
            totalFailures: state.totalFailures,
        },
    });
    
    updateStatistics();
}

/**
 * Transition to half-open state
 */
async function transitionToHalfOpen(circuitId: string): Promise<void> {
    const state = circuitStates.get(circuitId);
    if (!state) {
        return;
    }
    
    const previousState = state.state;
    const now = clock.nowMs();
    
    const newState: CircuitBreakerState = {
        ...state,
        state: 'half_open',
        lastStateChangeTime: now,
        halfOpenCallCount: 0,
    };
    
    circuitStates.set(circuitId, newState);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'state_changed',
        circuitId,
        timestamp: now,
        previousState,
        newState: 'half_open',
        data: { reason: 'Recovery timeout elapsed' },
    });
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'recovery_started',
        circuitId,
        timestamp: now,
        previousState: null,
        newState: null,
        data: {},
    });
    
    updateStatistics();
}

/**
 * Transition to closed state
 */
async function transitionToClosed(circuitId: string): Promise<void> {
    const state = circuitStates.get(circuitId);
    if (!state) {
        return;
    }
    
    const previousState = state.state;
    const now = clock.nowMs();
    
    const newState: CircuitBreakerState = {
        ...state,
        state: 'closed',
        lastStateChangeTime: now,
        openedAt: null,
        halfOpenCallCount: 0,
        failureCount: 0,
        successCount: 0,
        consecutiveFailures: 0,
    };
    
    circuitStates.set(circuitId, newState);
    
    failureRecords.set(circuitId, []);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'state_changed',
        circuitId,
        timestamp: now,
        previousState,
        newState: 'closed',
        data: { reason: 'Success threshold reached' },
    });
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'recovery_completed',
        circuitId,
        timestamp: now,
        previousState: null,
        newState: null,
        data: {},
    });
    
    updateStatistics();
}

/**
 * Force open circuit
 */
export async function forceOpen(nameOrId: string): Promise<boolean> {
    const config = circuits.get(nameOrId);
    if (!config) {
        return false;
    }
    
    await transitionToOpen(config.circuitId);
    return true;
}

/**
 * Force close circuit
 */
export async function forceClose(nameOrId: string): Promise<boolean> {
    const config = circuits.get(nameOrId);
    if (!config) {
        return false;
    }
    
    await transitionToClosed(config.circuitId);
    return true;
}

/**
 * Reset circuit
 */
export async function resetCircuit(nameOrId: string): Promise<boolean> {
    const config = circuits.get(nameOrId);
    if (!config) {
        return false;
    }
    
    const newState = initializeCircuitState(config.circuitId);
    circuitStates.set(config.circuitId, newState);
    failureRecords.set(config.circuitId, []);
    
    updateStatistics();
    
    return true;
}

// ============================================================================
// FALLBACK MANAGEMENT
// ============================================================================

/**
 * Register fallback
 */
export function registerFallback<T>(
    nameOrId: string,
    fallback: FallbackFunction<T>
): boolean {
    const config = circuits.get(nameOrId);
    if (!config) {
        return false;
    }
    
    fallbacks.set(config.circuitId, fallback as FallbackFunction<unknown>);
    return true;
}

/**
 * Remove fallback
 */
export function removeFallback(nameOrId: string): boolean {
    const config = circuits.get(nameOrId);
    if (!config) {
        return false;
    }
    
    return fallbacks.delete(config.circuitId);
}

// ============================================================================
// HEALTH CHECK MANAGEMENT
// ============================================================================

/**
 * Register health check
 */
export function registerHealthCheck(
    nameOrId: string,
    healthCheck: HealthCheckFunction
): boolean {
    const config = circuits.get(nameOrId);
    if (!config) {
        return false;
    }
    
    healthChecks.set(config.circuitId, healthCheck);
    return true;
}

/**
 * Remove health check
 */
export function removeHealthCheck(nameOrId: string): boolean {
    const config = circuits.get(nameOrId);
    if (!config) {
        return false;
    }
    
    return healthChecks.delete(config.circuitId);
}

/**
 * Run health check
 */
export async function runHealthCheck(nameOrId: string): Promise<boolean> {
    const config = circuits.get(nameOrId);
    if (!config) {
        return false;
    }
    
    const healthCheck = healthChecks.get(config.circuitId);
    if (!healthCheck) {
        return true;
    }
    
    try {
        return await healthCheck();
    } catch {
        return false;
    }
}

// ============================================================================
// BULKHEAD MANAGEMENT
// ============================================================================

/**
 * Create bulkhead
 */
export function createBulkhead(
    name: string,
    options: {
        maxConcurrent?: number;
        maxWait?: number;
    } = {}
): BulkheadConfig {
    const bulkheadId = generateBulkheadId();
    
    const config: BulkheadConfig = {
        bulkheadId,
        name,
        maxConcurrent: options.maxConcurrent ?? 10,
        maxWait: options.maxWait ?? 5000,
        enabled: true,
    };
    
    bulkheads.set(bulkheadId, config);
    bulkheads.set(name, config);
    
    bulkheadStates.set(bulkheadId, {
        bulkheadId,
        currentConcurrent: 0,
        waitingCount: 0,
        totalExecuted: 0,
        totalRejected: 0,
    });
    
    return config;
}

/**
 * Get bulkhead
 */
export function getBulkhead(nameOrId: string): BulkheadConfig | null {
    return bulkheads.get(nameOrId) ?? null;
}

/**
 * Get bulkhead state
 */
export function getBulkheadState(nameOrId: string): BulkheadState | null {
    const config = bulkheads.get(nameOrId);
    if (!config) {
        return null;
    }
    return bulkheadStates.get(config.bulkheadId) ?? null;
}

/**
 * Delete bulkhead
 */
export function deleteBulkhead(nameOrId: string): boolean {
    const config = bulkheads.get(nameOrId);
    if (!config) {
        return false;
    }
    
    bulkheads.delete(config.bulkheadId);
    bulkheads.delete(config.name);
    bulkheadStates.delete(config.bulkheadId);
    
    return true;
}

// ============================================================================
// FAILURE RECORDS
// ============================================================================

/**
 * Get failure records
 */
export function getFailureRecords(nameOrId: string): readonly FailureRecord[] {
    const config = circuits.get(nameOrId);
    if (!config) {
        return [];
    }
    return failureRecords.get(config.circuitId) ?? [];
}

/**
 * Clear failure records
 */
export function clearFailureRecords(nameOrId: string): boolean {
    const config = circuits.get(nameOrId);
    if (!config) {
        return false;
    }
    
    failureRecords.set(config.circuitId, []);
    return true;
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get statistics
 */
export function getStatistics(): Readonly<CircuitStatistics> {
    updateStatistics();
    return { ...statistics };
}

/**
 * Reset statistics
 */
export function resetStatistics(): void {
    Object.assign(statistics, {
        totalCircuits: 0,
        openCircuits: 0,
        closedCircuits: 0,
        halfOpenCircuits: 0,
        totalCalls: 0,
        totalSuccesses: 0,
        totalFailures: 0,
        totalRejections: 0,
        totalTimeouts: 0,
        totalFallbacks: 0,
        averageResponseTime: 0,
    });
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Add event listener
 */
export function addEventListener(listener: CircuitEventListener): void {
    eventListeners.add(listener);
}

/**
 * Remove event listener
 */
export function removeEventListener(listener: CircuitEventListener): void {
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
    circuits.clear();
    circuitStates.clear();
    failureRecords.clear();
    fallbacks.clear();
    healthChecks.clear();
    bulkheads.clear();
    bulkheadStates.clear();
    eventListeners.clear();
    resetStatistics();
}
