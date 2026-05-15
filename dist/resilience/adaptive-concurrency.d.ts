/**
 * @file Adaptive Concurrency za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-RES-010 Adaptive concurrency za zaledne sisteme
 * @design DSN-ZALEDNI-RES-010 Backend adaptive concurrency arhitektura
 * @test TEST-ZALEDNI-RES-010 Preverjanje adaptive concurrency
 *
 * Adaptive Concurrency - prilagojen za zaledne sisteme:
 * - Dynamic concurrency limits
 * - Latency-based adjustment
 * - Gradient descent optimization
 * - Vegas algorithm
 * - AIMD algorithm
 * - Metrics collection
 * - Event notifications
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom RES_010 - Adaptive Concurrency
 */
/**
 * Concurrency algorithm
 */
export type ConcurrencyAlgorithm = 'vegas' | 'aimd' | 'gradient' | 'fixed' | 'pid';
/**
 * Adjustment direction
 */
export type AdjustmentDirection = 'increase' | 'decrease' | 'stable';
/**
 * Limiter state
 */
export type LimiterState = 'probing' | 'stable' | 'backoff' | 'recovery';
/**
 * Adaptive concurrency configuration
 */
export interface AdaptiveConcurrencyConfig {
    readonly configId: string;
    readonly name: string;
    readonly algorithm: ConcurrencyAlgorithm;
    readonly initialLimit: number;
    readonly minLimit: number;
    readonly maxLimit: number;
    readonly targetLatency: number;
    readonly latencyTolerance: number;
    readonly smoothingFactor: number;
    readonly probeInterval: number;
    readonly backoffMultiplier: number;
    readonly recoveryMultiplier: number;
    readonly enabled: boolean;
    readonly metadata: Readonly<Record<string, unknown>>;
}
/**
 * Concurrency state
 */
export interface ConcurrencyState {
    readonly stateId: string;
    readonly configId: string;
    readonly currentLimit: number;
    readonly inFlight: number;
    readonly available: number;
    readonly limiterState: LimiterState;
    readonly lastAdjustment: number | null;
    readonly adjustmentDirection: AdjustmentDirection;
    readonly consecutiveIncreases: number;
    readonly consecutiveDecreases: number;
}
/**
 * Latency sample
 */
export interface LatencySample {
    readonly sampleId: string;
    readonly configId: string;
    readonly latency: number;
    readonly timestamp: number;
    readonly success: boolean;
    readonly concurrencyAtTime: number;
}
/**
 * Latency statistics
 */
export interface LatencyStatistics {
    readonly configId: string;
    readonly sampleCount: number;
    readonly minLatency: number;
    readonly maxLatency: number;
    readonly avgLatency: number;
    readonly p50Latency: number;
    readonly p90Latency: number;
    readonly p99Latency: number;
    readonly stdDeviation: number;
    readonly windowStart: number;
    readonly windowEnd: number;
}
/**
 * Adjustment record
 */
export interface AdjustmentRecord {
    readonly recordId: string;
    readonly configId: string;
    readonly previousLimit: number;
    readonly newLimit: number;
    readonly direction: AdjustmentDirection;
    readonly reason: string;
    readonly timestamp: number;
    readonly latencyAtTime: number;
}
/**
 * Concurrency token
 */
export interface ConcurrencyToken {
    readonly tokenId: string;
    readonly configId: string;
    readonly acquiredAt: number;
    readonly released: boolean;
    readonly releasedAt: number | null;
    readonly latency: number | null;
}
/**
 * Adaptive concurrency event
 */
export interface AdaptiveConcurrencyEvent {
    readonly eventId: string;
    readonly type: AdaptiveConcurrencyEventType;
    readonly configId: string | null;
    readonly timestamp: number;
    readonly data: Readonly<Record<string, unknown>>;
}
/**
 * Adaptive concurrency event type
 */
export type AdaptiveConcurrencyEventType = 'config_created' | 'config_deleted' | 'token_acquired' | 'token_released' | 'token_rejected' | 'limit_increased' | 'limit_decreased' | 'limit_stable' | 'state_changed' | 'probe_started' | 'probe_completed' | 'backoff_started' | 'recovery_started' | 'latency_spike_detected';
/**
 * Adaptive concurrency event listener
 */
export type AdaptiveConcurrencyEventListener = (event: AdaptiveConcurrencyEvent) => void | Promise<void>;
/**
 * Adaptive concurrency statistics
 */
export interface AdaptiveConcurrencyStatistics {
    readonly totalConfigs: number;
    readonly totalTokensAcquired: number;
    readonly totalTokensReleased: number;
    readonly totalTokensRejected: number;
    readonly totalAdjustments: number;
    readonly totalIncreases: number;
    readonly totalDecreases: number;
    readonly averageLimit: number;
    readonly averageLatency: number;
}
/**
 * Create adaptive concurrency config
 */
export declare function createAdaptiveConcurrencyConfig(name: string, options?: {
    algorithm?: ConcurrencyAlgorithm;
    initialLimit?: number;
    minLimit?: number;
    maxLimit?: number;
    targetLatency?: number;
    latencyTolerance?: number;
    smoothingFactor?: number;
    probeInterval?: number;
    backoffMultiplier?: number;
    recoveryMultiplier?: number;
    metadata?: Record<string, unknown>;
}): Promise<AdaptiveConcurrencyConfig>;
/**
 * Get adaptive concurrency config
 */
export declare function getAdaptiveConcurrencyConfig(nameOrId: string): AdaptiveConcurrencyConfig | null;
/**
 * Get all adaptive concurrency configs
 */
export declare function getAllAdaptiveConcurrencyConfigs(): readonly AdaptiveConcurrencyConfig[];
/**
 * Update adaptive concurrency config
 */
export declare function updateAdaptiveConcurrencyConfig(nameOrId: string, updates: {
    targetLatency?: number;
    latencyTolerance?: number;
    minLimit?: number;
    maxLimit?: number;
    enabled?: boolean;
}): AdaptiveConcurrencyConfig | null;
/**
 * Delete adaptive concurrency config
 */
export declare function deleteAdaptiveConcurrencyConfig(nameOrId: string): Promise<boolean>;
/**
 * Acquire token
 */
export declare function acquireToken(nameOrId: string): Promise<ConcurrencyToken | null>;
/**
 * Release token
 */
export declare function releaseToken(nameOrId: string, tokenId: string, options?: {
    success?: boolean;
}): Promise<boolean>;
/**
 * Get active tokens
 */
export declare function getActiveTokens(nameOrId: string): readonly ConcurrencyToken[];
/**
 * Calculate latency statistics
 */
export declare function calculateLatencyStatistics(nameOrId: string): LatencyStatistics | null;
/**
 * Get concurrency state
 */
export declare function getConcurrencyState(nameOrId: string): ConcurrencyState | null;
/**
 * Get adjustment history
 */
export declare function getAdjustmentHistory(nameOrId: string): readonly AdjustmentRecord[];
/**
 * Get statistics
 */
export declare function getStatistics(): Readonly<AdaptiveConcurrencyStatistics>;
/**
 * Reset statistics
 */
export declare function resetStatistics(): void;
/**
 * Add event listener
 */
export declare function addEventListener(listener: AdaptiveConcurrencyEventListener): void;
/**
 * Remove event listener
 */
export declare function removeEventListener(listener: AdaptiveConcurrencyEventListener): void;
/**
 * Clear event listeners
 */
export declare function clearEventListeners(): void;
/**
 * Clear all state
 */
export declare function clearAll(): void;
