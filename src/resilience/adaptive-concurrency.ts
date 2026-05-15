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

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI ZA ADAPTIVE CONCURRENCY
// ============================================================================

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
export type AdaptiveConcurrencyEventType =
    | 'config_created'
    | 'config_deleted'
    | 'token_acquired'
    | 'token_released'
    | 'token_rejected'
    | 'limit_increased'
    | 'limit_decreased'
    | 'limit_stable'
    | 'state_changed'
    | 'probe_started'
    | 'probe_completed'
    | 'backoff_started'
    | 'recovery_started'
    | 'latency_spike_detected';

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

// ============================================================================
// STANJE
// ============================================================================

const configs: Map<string, AdaptiveConcurrencyConfig> = new Map();
const states: Map<string, ConcurrencyState> = new Map();
const samples: Map<string, LatencySample[]> = new Map();
const tokens: Map<string, ConcurrencyToken[]> = new Map();
const adjustments: Map<string, AdjustmentRecord[]> = new Map();
const eventListeners: Set<AdaptiveConcurrencyEventListener> = new Set();

let configCounter = 0;
let stateCounter = 0;
let sampleCounter = 0;
let tokenCounter = 0;
let recordCounter = 0;
let eventCounter = 0;

const statistics: AdaptiveConcurrencyStatistics = {
    totalConfigs: 0,
    totalTokensAcquired: 0,
    totalTokensReleased: 0,
    totalTokensRejected: 0,
    totalAdjustments: 0,
    totalIncreases: 0,
    totalDecreases: 0,
    averageLimit: 0,
    averageLatency: 0,
};

// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================

/**
 * Generate config ID
 */
function generateConfigId(): string {
    configCounter++;
    return generateDeterministicId(`ac-config-${configCounter}`);
}

/**
 * Generate state ID
 */
function generateStateId(): string {
    stateCounter++;
    return generateDeterministicId(`ac-state-${stateCounter}`);
}

/**
 * Generate sample ID
 */
function generateSampleId(): string {
    sampleCounter++;
    return generateDeterministicId(`latency-sample-${sampleCounter}`);
}

/**
 * Generate token ID
 */
function generateTokenId(): string {
    tokenCounter++;
    return generateDeterministicId(`conc-token-${tokenCounter}`);
}

/**
 * Generate record ID
 */
function generateRecordId(): string {
    recordCounter++;
    return generateDeterministicId(`adj-record-${recordCounter}`);
}

/**
 * Generate event ID
 */
function generateEventId(): string {
    eventCounter++;
    return generateDeterministicId(`ac-event-${eventCounter}`);
}

/**
 * Emit adaptive concurrency event
 */
async function emitEvent(event: AdaptiveConcurrencyEvent): Promise<void> {
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
        averageLimit: number;
        averageLatency: number;
    };
    
    mutableStats.totalConfigs = configs.size;
    
    let totalLimit = 0;
    let limitCount = 0;
    for (const state of states.values()) {
        totalLimit += state.currentLimit;
        limitCount++;
    }
    mutableStats.averageLimit = limitCount > 0 ? totalLimit / limitCount : 0;
    
    let totalLatency = 0;
    let latencyCount = 0;
    for (const sampleList of samples.values()) {
        for (const sample of sampleList) {
            totalLatency += sample.latency;
            latencyCount++;
        }
    }
    mutableStats.averageLatency = latencyCount > 0 ? totalLatency / latencyCount : 0;
}

/**
 * Initialize concurrency state
 */
function initializeConcurrencyState(configId: string, initialLimit: number): ConcurrencyState {
    return {
        stateId: generateStateId(),
        configId,
        currentLimit: initialLimit,
        inFlight: 0,
        available: initialLimit,
        limiterState: 'stable',
        lastAdjustment: null,
        adjustmentDirection: 'stable',
        consecutiveIncreases: 0,
        consecutiveDecreases: 0,
    };
}

/**
 * Calculate percentile
 */
function calculatePercentile(sortedValues: readonly number[], percentile: number): number {
    if (sortedValues.length === 0) {
        return 0;
    }
    
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
}

/**
 * Calculate standard deviation
 */
function calculateStdDeviation(values: readonly number[], mean: number): number {
    if (values.length === 0) {
        return 0;
    }
    
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
}

// ============================================================================
// CONFIG MANAGEMENT
// ============================================================================

/**
 * Create adaptive concurrency config
 */
export async function createAdaptiveConcurrencyConfig(
    name: string,
    options: {
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
    } = {}
): Promise<AdaptiveConcurrencyConfig> {
    const configId = generateConfigId();
    
    const config: AdaptiveConcurrencyConfig = {
        configId,
        name,
        algorithm: options.algorithm ?? 'vegas',
        initialLimit: options.initialLimit ?? 10,
        minLimit: options.minLimit ?? 1,
        maxLimit: options.maxLimit ?? 100,
        targetLatency: options.targetLatency ?? 100,
        latencyTolerance: options.latencyTolerance ?? 0.1,
        smoothingFactor: options.smoothingFactor ?? 0.2,
        probeInterval: options.probeInterval ?? 1000,
        backoffMultiplier: options.backoffMultiplier ?? 0.9,
        recoveryMultiplier: options.recoveryMultiplier ?? 1.1,
        enabled: true,
        metadata: options.metadata ?? {},
    };
    
    configs.set(configId, config);
    configs.set(name, config);
    
    states.set(configId, initializeConcurrencyState(configId, config.initialLimit));
    samples.set(configId, []);
    tokens.set(configId, []);
    adjustments.set(configId, []);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'config_created',
        configId,
        timestamp: clock.nowMs(),
        data: { name, algorithm: config.algorithm, initialLimit: config.initialLimit },
    });
    
    updateStatistics();
    
    return config;
}

/**
 * Get adaptive concurrency config
 */
export function getAdaptiveConcurrencyConfig(nameOrId: string): AdaptiveConcurrencyConfig | null {
    return configs.get(nameOrId) ?? null;
}

/**
 * Get all adaptive concurrency configs
 */
export function getAllAdaptiveConcurrencyConfigs(): readonly AdaptiveConcurrencyConfig[] {
    const uniqueConfigs = new Map<string, AdaptiveConcurrencyConfig>();
    for (const config of configs.values()) {
        uniqueConfigs.set(config.configId, config);
    }
    return Array.from(uniqueConfigs.values());
}

/**
 * Update adaptive concurrency config
 */
export function updateAdaptiveConcurrencyConfig(
    nameOrId: string,
    updates: {
        targetLatency?: number;
        latencyTolerance?: number;
        minLimit?: number;
        maxLimit?: number;
        enabled?: boolean;
    }
): AdaptiveConcurrencyConfig | null {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    
    const updatedConfig: AdaptiveConcurrencyConfig = {
        ...config,
        targetLatency: updates.targetLatency ?? config.targetLatency,
        latencyTolerance: updates.latencyTolerance ?? config.latencyTolerance,
        minLimit: updates.minLimit ?? config.minLimit,
        maxLimit: updates.maxLimit ?? config.maxLimit,
        enabled: updates.enabled ?? config.enabled,
    };
    
    configs.set(config.configId, updatedConfig);
    configs.set(config.name, updatedConfig);
    
    return updatedConfig;
}

/**
 * Delete adaptive concurrency config
 */
export async function deleteAdaptiveConcurrencyConfig(nameOrId: string): Promise<boolean> {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    
    configs.delete(config.configId);
    configs.delete(config.name);
    states.delete(config.configId);
    samples.delete(config.configId);
    tokens.delete(config.configId);
    adjustments.delete(config.configId);
    
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
// TOKEN MANAGEMENT
// ============================================================================

/**
 * Acquire token
 */
export async function acquireToken(nameOrId: string): Promise<ConcurrencyToken | null> {
    const config = configs.get(nameOrId);
    if (!config || !config.enabled) {
        return null;
    }
    
    const state = states.get(config.configId);
    if (!state) {
        return null;
    }
    
    const mutableStats = statistics as {
        totalTokensAcquired: number;
        totalTokensRejected: number;
    };
    
    if (state.available <= 0) {
        mutableStats.totalTokensRejected++;
        
        await emitEvent({
            eventId: generateEventId(),
            type: 'token_rejected',
            configId: config.configId,
            timestamp: clock.nowMs(),
            data: { currentLimit: state.currentLimit, inFlight: state.inFlight },
        });
        
        return null;
    }
    
    const now = clock.nowMs();
    
    const token: ConcurrencyToken = {
        tokenId: generateTokenId(),
        configId: config.configId,
        acquiredAt: now,
        released: false,
        releasedAt: null,
        latency: null,
    };
    
    const tokenList = tokens.get(config.configId) ?? [];
    tokenList.push(token);
    tokens.set(config.configId, tokenList);
    
    const updatedState: ConcurrencyState = {
        ...state,
        inFlight: state.inFlight + 1,
        available: state.available - 1,
    };
    states.set(config.configId, updatedState);
    
    mutableStats.totalTokensAcquired++;
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'token_acquired',
        configId: config.configId,
        timestamp: now,
        data: { tokenId: token.tokenId, inFlight: updatedState.inFlight },
    });
    
    return token;
}

/**
 * Release token
 */
export async function releaseToken(
    nameOrId: string,
    tokenId: string,
    options: {
        success?: boolean;
    } = {}
): Promise<boolean> {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    
    const tokenList = tokens.get(config.configId);
    if (!tokenList) {
        return false;
    }
    
    const index = tokenList.findIndex(t => t.tokenId === tokenId);
    if (index === -1) {
        return false;
    }
    
    const token = tokenList[index];
    if (token.released) {
        return false;
    }
    
    const now = clock.nowMs();
    const latency = now - token.acquiredAt;
    
    const releasedToken: ConcurrencyToken = {
        ...token,
        released: true,
        releasedAt: now,
        latency,
    };
    
    tokenList[index] = releasedToken;
    tokens.set(config.configId, tokenList);
    
    const state = states.get(config.configId);
    if (state) {
        const updatedState: ConcurrencyState = {
            ...state,
            inFlight: state.inFlight - 1,
            available: state.available + 1,
        };
        states.set(config.configId, updatedState);
    }
    
    const sample: LatencySample = {
        sampleId: generateSampleId(),
        configId: config.configId,
        latency,
        timestamp: now,
        success: options.success ?? true,
        concurrencyAtTime: state?.currentLimit ?? config.initialLimit,
    };
    
    const sampleList = samples.get(config.configId) ?? [];
    sampleList.push(sample);
    
    if (sampleList.length > 1000) {
        sampleList.shift();
    }
    
    samples.set(config.configId, sampleList);
    
    const mutableStats = statistics as { totalTokensReleased: number };
    mutableStats.totalTokensReleased++;
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'token_released',
        configId: config.configId,
        timestamp: now,
        data: { tokenId, latency, success: options.success ?? true },
    });
    
    await adjustLimit(config.configId);
    
    return true;
}

/**
 * Get active tokens
 */
export function getActiveTokens(nameOrId: string): readonly ConcurrencyToken[] {
    const config = configs.get(nameOrId);
    if (!config) {
        return [];
    }
    
    const tokenList = tokens.get(config.configId) ?? [];
    return tokenList.filter(t => !t.released);
}

// ============================================================================
// LIMIT ADJUSTMENT
// ============================================================================

/**
 * Adjust limit based on algorithm
 */
async function adjustLimit(configId: string): Promise<void> {
    const config = configs.get(configId);
    const state = states.get(configId);
    
    if (!config || !state) {
        return;
    }
    
    const now = clock.nowMs();
    
    if (state.lastAdjustment && now - state.lastAdjustment < config.probeInterval) {
        return;
    }
    
    const latencyStats = calculateLatencyStatistics(configId);
    if (!latencyStats || latencyStats.sampleCount < 10) {
        return;
    }
    
    let newLimit = state.currentLimit;
    let direction: AdjustmentDirection = 'stable';
    let reason = '';
    
    switch (config.algorithm) {
        case 'vegas':
            const vegasResult = vegasAlgorithm(config, state, latencyStats);
            newLimit = vegasResult.limit;
            direction = vegasResult.direction;
            reason = vegasResult.reason;
            break;
        
        case 'aimd':
            const aimdResult = aimdAlgorithm(config, state, latencyStats);
            newLimit = aimdResult.limit;
            direction = aimdResult.direction;
            reason = aimdResult.reason;
            break;
        
        case 'gradient':
            const gradientResult = gradientAlgorithm(config, state, latencyStats);
            newLimit = gradientResult.limit;
            direction = gradientResult.direction;
            reason = gradientResult.reason;
            break;
        
        case 'pid':
            const pidResult = pidAlgorithm(config, state, latencyStats);
            newLimit = pidResult.limit;
            direction = pidResult.direction;
            reason = pidResult.reason;
            break;
        
        case 'fixed':
            newLimit = config.initialLimit;
            direction = 'stable';
            reason = 'Fixed limit';
            break;
    }
    
    newLimit = Math.max(config.minLimit, Math.min(config.maxLimit, Math.round(newLimit)));
    
    if (newLimit === state.currentLimit) {
        direction = 'stable';
    }
    
    const mutableStats = statistics as {
        totalAdjustments: number;
        totalIncreases: number;
        totalDecreases: number;
    };
    
    if (direction !== 'stable') {
        mutableStats.totalAdjustments++;
        
        if (direction === 'increase') {
            mutableStats.totalIncreases++;
        } else {
            mutableStats.totalDecreases++;
        }
        
        const record: AdjustmentRecord = {
            recordId: generateRecordId(),
            configId,
            previousLimit: state.currentLimit,
            newLimit,
            direction,
            reason,
            timestamp: now,
            latencyAtTime: latencyStats.avgLatency,
        };
        
        const adjustmentList = adjustments.get(configId) ?? [];
        adjustmentList.push(record);
        
        if (adjustmentList.length > 100) {
            adjustmentList.shift();
        }
        
        adjustments.set(configId, adjustmentList);
    }
    
    const updatedState: ConcurrencyState = {
        ...state,
        currentLimit: newLimit,
        available: newLimit - state.inFlight,
        lastAdjustment: now,
        adjustmentDirection: direction,
        consecutiveIncreases: direction === 'increase' ? state.consecutiveIncreases + 1 : 0,
        consecutiveDecreases: direction === 'decrease' ? state.consecutiveDecreases + 1 : 0,
    };
    states.set(configId, updatedState);
    
    if (direction !== 'stable') {
        const eventType: AdaptiveConcurrencyEventType = 
            direction === 'increase' ? 'limit_increased' : 'limit_decreased';
        
        await emitEvent({
            eventId: generateEventId(),
            type: eventType,
            configId,
            timestamp: now,
            data: { previousLimit: state.currentLimit, newLimit, reason },
        });
    }
    
    updateStatistics();
}

/**
 * Vegas algorithm
 */
function vegasAlgorithm(
    config: AdaptiveConcurrencyConfig,
    state: ConcurrencyState,
    stats: LatencyStatistics
): { limit: number; direction: AdjustmentDirection; reason: string } {
    const rttNoLoad = config.targetLatency;
    const rttActual = stats.avgLatency;
    
    const expectedInFlight = state.currentLimit * (rttNoLoad / rttActual);
    const diff = state.currentLimit - expectedInFlight;
    
    const alpha = 3;
    const beta = 6;
    
    if (diff < alpha) {
        return {
            limit: state.currentLimit + 1,
            direction: 'increase',
            reason: `Vegas: diff (${diff.toFixed(2)}) < alpha (${alpha})`,
        };
    } else if (diff > beta) {
        return {
            limit: state.currentLimit - 1,
            direction: 'decrease',
            reason: `Vegas: diff (${diff.toFixed(2)}) > beta (${beta})`,
        };
    }
    
    return {
        limit: state.currentLimit,
        direction: 'stable',
        reason: 'Vegas: within bounds',
    };
}

/**
 * AIMD algorithm
 */
function aimdAlgorithm(
    config: AdaptiveConcurrencyConfig,
    state: ConcurrencyState,
    stats: LatencyStatistics
): { limit: number; direction: AdjustmentDirection; reason: string } {
    const latencyRatio = stats.avgLatency / config.targetLatency;
    const tolerance = config.latencyTolerance;
    
    if (latencyRatio < 1 - tolerance) {
        return {
            limit: state.currentLimit + 1,
            direction: 'increase',
            reason: `AIMD: latency ratio (${latencyRatio.toFixed(2)}) below target`,
        };
    } else if (latencyRatio > 1 + tolerance) {
        return {
            limit: Math.floor(state.currentLimit * config.backoffMultiplier),
            direction: 'decrease',
            reason: `AIMD: latency ratio (${latencyRatio.toFixed(2)}) above target`,
        };
    }
    
    return {
        limit: state.currentLimit,
        direction: 'stable',
        reason: 'AIMD: within tolerance',
    };
}

/**
 * Gradient algorithm
 */
function gradientAlgorithm(
    config: AdaptiveConcurrencyConfig,
    state: ConcurrencyState,
    stats: LatencyStatistics
): { limit: number; direction: AdjustmentDirection; reason: string } {
    const gradient = (stats.avgLatency - config.targetLatency) / config.targetLatency;
    const smoothedGradient = gradient * config.smoothingFactor;
    
    const adjustment = -smoothedGradient * state.currentLimit;
    const newLimit = state.currentLimit + adjustment;
    
    if (adjustment > 0.5) {
        return {
            limit: newLimit,
            direction: 'increase',
            reason: `Gradient: positive adjustment (${adjustment.toFixed(2)})`,
        };
    } else if (adjustment < -0.5) {
        return {
            limit: newLimit,
            direction: 'decrease',
            reason: `Gradient: negative adjustment (${adjustment.toFixed(2)})`,
        };
    }
    
    return {
        limit: state.currentLimit,
        direction: 'stable',
        reason: 'Gradient: minimal adjustment',
    };
}

/**
 * PID algorithm
 */
function pidAlgorithm(
    config: AdaptiveConcurrencyConfig,
    state: ConcurrencyState,
    stats: LatencyStatistics
): { limit: number; direction: AdjustmentDirection; reason: string } {
    const kp = 0.5;
    const ki = 0.1;
    const kd = 0.05;
    
    const error = config.targetLatency - stats.avgLatency;
    const normalizedError = error / config.targetLatency;
    
    const pTerm = kp * normalizedError;
    const iTerm = ki * normalizedError;
    const dTerm = kd * normalizedError;
    
    const output = pTerm + iTerm + dTerm;
    const adjustment = output * state.currentLimit;
    const newLimit = state.currentLimit + adjustment;
    
    if (adjustment > 0.5) {
        return {
            limit: newLimit,
            direction: 'increase',
            reason: `PID: positive output (${output.toFixed(2)})`,
        };
    } else if (adjustment < -0.5) {
        return {
            limit: newLimit,
            direction: 'decrease',
            reason: `PID: negative output (${output.toFixed(2)})`,
        };
    }
    
    return {
        limit: state.currentLimit,
        direction: 'stable',
        reason: 'PID: minimal output',
    };
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Calculate latency statistics
 */
export function calculateLatencyStatistics(nameOrId: string): LatencyStatistics | null {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    
    const sampleList = samples.get(config.configId) ?? [];
    if (sampleList.length === 0) {
        return null;
    }
    
    const latencies = sampleList.map(s => s.latency);
    const sortedLatencies = [...latencies].sort((a, b) => a - b);
    
    const sum = latencies.reduce((acc, v) => acc + v, 0);
    const avg = sum / latencies.length;
    
    return {
        configId: config.configId,
        sampleCount: sampleList.length,
        minLatency: sortedLatencies[0],
        maxLatency: sortedLatencies[sortedLatencies.length - 1],
        avgLatency: avg,
        p50Latency: calculatePercentile(sortedLatencies, 50),
        p90Latency: calculatePercentile(sortedLatencies, 90),
        p99Latency: calculatePercentile(sortedLatencies, 99),
        stdDeviation: calculateStdDeviation(latencies, avg),
        windowStart: sampleList[0].timestamp,
        windowEnd: sampleList[sampleList.length - 1].timestamp,
    };
}

/**
 * Get concurrency state
 */
export function getConcurrencyState(nameOrId: string): ConcurrencyState | null {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    return states.get(config.configId) ?? null;
}

/**
 * Get adjustment history
 */
export function getAdjustmentHistory(nameOrId: string): readonly AdjustmentRecord[] {
    const config = configs.get(nameOrId);
    if (!config) {
        return [];
    }
    return adjustments.get(config.configId) ?? [];
}

/**
 * Get statistics
 */
export function getStatistics(): Readonly<AdaptiveConcurrencyStatistics> {
    updateStatistics();
    return { ...statistics };
}

/**
 * Reset statistics
 */
export function resetStatistics(): void {
    Object.assign(statistics, {
        totalConfigs: 0,
        totalTokensAcquired: 0,
        totalTokensReleased: 0,
        totalTokensRejected: 0,
        totalAdjustments: 0,
        totalIncreases: 0,
        totalDecreases: 0,
        averageLimit: 0,
        averageLatency: 0,
    });
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Add event listener
 */
export function addEventListener(listener: AdaptiveConcurrencyEventListener): void {
    eventListeners.add(listener);
}

/**
 * Remove event listener
 */
export function removeEventListener(listener: AdaptiveConcurrencyEventListener): void {
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
    states.clear();
    samples.clear();
    tokens.clear();
    adjustments.clear();
    eventListeners.clear();
    resetStatistics();
}
