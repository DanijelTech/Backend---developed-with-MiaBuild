/**
 * @file Load Shedding za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 * 
 * @requirement ZAH-ZALEDNI-RES-004 Load shedding za zaledne sisteme
 * @design DSN-ZALEDNI-RES-004 Backend load shedding arhitektura
 * @test TEST-ZALEDNI-RES-004 Preverjanje load shedding
 * 
 * Load Shedding - prilagojen za zaledne sisteme:
 * - Priority-based request handling
 * - Adaptive load management
 * - Request queuing
 * - Graceful degradation
 * - Resource monitoring
 * - Threshold management
 * - Metrics collection
 * - Event notifications
 * 
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom RES_004 - Load Shedding
 */

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI ZA LOAD SHEDDING
// ============================================================================

/**
 * Request priority
 */
export type RequestPriority = 'critical' | 'high' | 'normal' | 'low' | 'background';

/**
 * Shedding strategy
 */
export type SheddingStrategy = 'priority' | 'fifo' | 'lifo' | 'random' | 'adaptive';

/**
 * Load level
 */
export type LoadLevel = 'normal' | 'elevated' | 'high' | 'critical' | 'overload';

/**
 * Shedding action
 */
export type SheddingAction = 'accept' | 'queue' | 'reject' | 'degrade';

/**
 * Load shedding configuration
 */
export interface LoadSheddingConfig {
    readonly configId: string;
    readonly name: string;
    readonly strategy: SheddingStrategy;
    readonly maxConcurrent: number;
    readonly maxQueueSize: number;
    readonly queueTimeout: number;
    readonly priorityWeights: Readonly<Record<RequestPriority, number>>;
    readonly thresholds: LoadThresholds;
    readonly degradationRules: readonly DegradationRule[];
    readonly enabled: boolean;
    readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Load thresholds
 */
export interface LoadThresholds {
    readonly elevatedThreshold: number;
    readonly highThreshold: number;
    readonly criticalThreshold: number;
    readonly overloadThreshold: number;
}

/**
 * Degradation rule
 */
export interface DegradationRule {
    readonly ruleId: string;
    readonly loadLevel: LoadLevel;
    readonly priority: RequestPriority;
    readonly action: SheddingAction;
    readonly degradationLevel: number;
}

/**
 * Incoming request
 */
export interface IncomingRequest {
    readonly requestId: string;
    readonly priority: RequestPriority;
    readonly timestamp: number;
    readonly deadline: number | null;
    readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Request decision
 */
export interface RequestDecision {
    readonly decisionId: string;
    readonly requestId: string;
    readonly action: SheddingAction;
    readonly queuePosition: number | null;
    readonly estimatedWait: number | null;
    readonly degradationLevel: number;
    readonly reason: string;
    readonly timestamp: number;
}

/**
 * Queue entry
 */
export interface QueueEntry {
    readonly entryId: string;
    readonly request: IncomingRequest;
    readonly enqueuedAt: number;
    readonly expiresAt: number;
    readonly position: number;
}

/**
 * Load metrics
 */
export interface LoadMetrics {
    readonly currentLoad: number;
    readonly loadLevel: LoadLevel;
    readonly activeRequests: number;
    readonly queuedRequests: number;
    readonly acceptedRequests: number;
    readonly rejectedRequests: number;
    readonly degradedRequests: number;
    readonly averageLatency: number;
    readonly p99Latency: number;
}

/**
 * Load shedding event
 */
export interface LoadSheddingEvent {
    readonly eventId: string;
    readonly type: LoadSheddingEventType;
    readonly configId: string | null;
    readonly requestId: string | null;
    readonly timestamp: number;
    readonly data: Readonly<Record<string, unknown>>;
}

/**
 * Load shedding event type
 */
export type LoadSheddingEventType =
    | 'config_created'
    | 'config_deleted'
    | 'request_accepted'
    | 'request_queued'
    | 'request_rejected'
    | 'request_degraded'
    | 'request_dequeued'
    | 'request_expired'
    | 'load_level_changed'
    | 'shedding_activated'
    | 'shedding_deactivated';

/**
 * Load shedding event listener
 */
export type LoadSheddingEventListener = (event: LoadSheddingEvent) => void | Promise<void>;

/**
 * Load shedding statistics
 */
export interface LoadSheddingStatistics {
    readonly totalConfigs: number;
    readonly totalRequests: number;
    readonly acceptedRequests: number;
    readonly queuedRequests: number;
    readonly rejectedRequests: number;
    readonly degradedRequests: number;
    readonly expiredRequests: number;
    readonly currentQueueSize: number;
    readonly peakQueueSize: number;
    readonly averageQueueTime: number;
}

// ============================================================================
// STANJE
// ============================================================================

const configs: Map<string, LoadSheddingConfig> = new Map();
const queues: Map<string, QueueEntry[]> = new Map();
const activeRequests: Map<string, Set<string>> = new Map();
const loadMetrics: Map<string, LoadMetrics> = new Map();
const eventListeners: Set<LoadSheddingEventListener> = new Set();

let configCounter = 0;
let requestCounter = 0;
let decisionCounter = 0;
let entryCounter = 0;
let ruleCounter = 0;
let eventCounter = 0;

const statistics: LoadSheddingStatistics = {
    totalConfigs: 0,
    totalRequests: 0,
    acceptedRequests: 0,
    queuedRequests: 0,
    rejectedRequests: 0,
    degradedRequests: 0,
    expiredRequests: 0,
    currentQueueSize: 0,
    peakQueueSize: 0,
    averageQueueTime: 0,
};

// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================

/**
 * Generate config ID
 */
function generateConfigId(): string {
    configCounter++;
    return generateDeterministicId(`load-shed-config-${configCounter}`);
}

/**
 * Generate request ID
 */
function generateRequestId(): string {
    requestCounter++;
    return generateDeterministicId(`load-shed-req-${requestCounter}`);
}

/**
 * Generate decision ID
 */
function generateDecisionId(): string {
    decisionCounter++;
    return generateDeterministicId(`load-shed-dec-${decisionCounter}`);
}

/**
 * Generate entry ID
 */
function generateEntryId(): string {
    entryCounter++;
    return generateDeterministicId(`queue-entry-${entryCounter}`);
}

/**
 * Generate rule ID
 */
function generateRuleId(): string {
    ruleCounter++;
    return generateDeterministicId(`degrade-rule-${ruleCounter}`);
}

/**
 * Generate event ID
 */
function generateEventId(): string {
    eventCounter++;
    return generateDeterministicId(`load-shed-event-${eventCounter}`);
}

/**
 * Emit load shedding event
 */
async function emitEvent(event: LoadSheddingEvent): Promise<void> {
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
        currentQueueSize: number;
        peakQueueSize: number;
    };
    
    mutableStats.totalConfigs = configs.size;
    
    let totalQueueSize = 0;
    for (const queue of queues.values()) {
        totalQueueSize += queue.length;
    }
    mutableStats.currentQueueSize = totalQueueSize;
    
    if (totalQueueSize > mutableStats.peakQueueSize) {
        mutableStats.peakQueueSize = totalQueueSize;
    }
}

/**
 * Calculate load level
 */
function calculateLoadLevel(config: LoadSheddingConfig, currentLoad: number): LoadLevel {
    if (currentLoad >= config.thresholds.overloadThreshold) {
        return 'overload';
    }
    if (currentLoad >= config.thresholds.criticalThreshold) {
        return 'critical';
    }
    if (currentLoad >= config.thresholds.highThreshold) {
        return 'high';
    }
    if (currentLoad >= config.thresholds.elevatedThreshold) {
        return 'elevated';
    }
    return 'normal';
}

/**
 * Get priority weight
 */
function getPriorityWeight(config: LoadSheddingConfig, priority: RequestPriority): number {
    return config.priorityWeights[priority] ?? 1;
}

/**
 * Find degradation rule
 */
function findDegradationRule(
    config: LoadSheddingConfig,
    loadLevel: LoadLevel,
    priority: RequestPriority
): DegradationRule | null {
    for (const rule of config.degradationRules) {
        if (rule.loadLevel === loadLevel && rule.priority === priority) {
            return rule;
        }
    }
    return null;
}

/**
 * Initialize load metrics
 */
function initializeLoadMetrics(configId: string): LoadMetrics {
    return {
        currentLoad: 0,
        loadLevel: 'normal',
        activeRequests: 0,
        queuedRequests: 0,
        acceptedRequests: 0,
        rejectedRequests: 0,
        degradedRequests: 0,
        averageLatency: 0,
        p99Latency: 0,
    };
}

// ============================================================================
// CONFIG MANAGEMENT
// ============================================================================

/**
 * Create load shedding config
 */
export async function createLoadSheddingConfig(
    name: string,
    options: {
        strategy?: SheddingStrategy;
        maxConcurrent?: number;
        maxQueueSize?: number;
        queueTimeout?: number;
        priorityWeights?: Record<RequestPriority, number>;
        thresholds?: Partial<LoadThresholds>;
        degradationRules?: readonly Omit<DegradationRule, 'ruleId'>[];
        metadata?: Record<string, unknown>;
    } = {}
): Promise<LoadSheddingConfig> {
    const configId = generateConfigId();
    
    const defaultWeights: Record<RequestPriority, number> = {
        critical: 100,
        high: 75,
        normal: 50,
        low: 25,
        background: 10,
    };
    
    const defaultThresholds: LoadThresholds = {
        elevatedThreshold: 0.5,
        highThreshold: 0.7,
        criticalThreshold: 0.85,
        overloadThreshold: 0.95,
    };
    
    const degradationRules: DegradationRule[] = (options.degradationRules ?? []).map(rule => ({
        ...rule,
        ruleId: generateRuleId(),
    }));
    
    const config: LoadSheddingConfig = {
        configId,
        name,
        strategy: options.strategy ?? 'priority',
        maxConcurrent: options.maxConcurrent ?? 100,
        maxQueueSize: options.maxQueueSize ?? 1000,
        queueTimeout: options.queueTimeout ?? 30000,
        priorityWeights: options.priorityWeights ?? defaultWeights,
        thresholds: {
            ...defaultThresholds,
            ...options.thresholds,
        },
        degradationRules,
        enabled: true,
        metadata: options.metadata ?? {},
    };
    
    configs.set(configId, config);
    configs.set(name, config);
    
    queues.set(configId, []);
    activeRequests.set(configId, new Set());
    loadMetrics.set(configId, initializeLoadMetrics(configId));
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'config_created',
        configId,
        requestId: null,
        timestamp: clock.nowMs(),
        data: { name },
    });
    
    updateStatistics();
    
    return config;
}

/**
 * Get load shedding config
 */
export function getLoadSheddingConfig(nameOrId: string): LoadSheddingConfig | null {
    return configs.get(nameOrId) ?? null;
}

/**
 * Get all load shedding configs
 */
export function getAllLoadSheddingConfigs(): readonly LoadSheddingConfig[] {
    const uniqueConfigs = new Map<string, LoadSheddingConfig>();
    for (const config of configs.values()) {
        uniqueConfigs.set(config.configId, config);
    }
    return Array.from(uniqueConfigs.values());
}

/**
 * Update load shedding config
 */
export function updateLoadSheddingConfig(
    nameOrId: string,
    updates: {
        strategy?: SheddingStrategy;
        maxConcurrent?: number;
        maxQueueSize?: number;
        queueTimeout?: number;
        enabled?: boolean;
    }
): LoadSheddingConfig | null {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    
    const updatedConfig: LoadSheddingConfig = {
        ...config,
        strategy: updates.strategy ?? config.strategy,
        maxConcurrent: updates.maxConcurrent ?? config.maxConcurrent,
        maxQueueSize: updates.maxQueueSize ?? config.maxQueueSize,
        queueTimeout: updates.queueTimeout ?? config.queueTimeout,
        enabled: updates.enabled ?? config.enabled,
    };
    
    configs.set(config.configId, updatedConfig);
    configs.set(config.name, updatedConfig);
    
    return updatedConfig;
}

/**
 * Delete load shedding config
 */
export async function deleteLoadSheddingConfig(nameOrId: string): Promise<boolean> {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    
    configs.delete(config.configId);
    configs.delete(config.name);
    queues.delete(config.configId);
    activeRequests.delete(config.configId);
    loadMetrics.delete(config.configId);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'config_deleted',
        configId: config.configId,
        requestId: null,
        timestamp: clock.nowMs(),
        data: {},
    });
    
    updateStatistics();
    
    return true;
}

// ============================================================================
// REQUEST HANDLING
// ============================================================================

/**
 * Submit request
 */
export async function submitRequest(
    nameOrId: string,
    priority: RequestPriority,
    options: {
        deadline?: number;
        metadata?: Record<string, unknown>;
    } = {}
): Promise<RequestDecision> {
    const config = configs.get(nameOrId);
    if (!config) {
        throw new Error(`Load shedding config '${nameOrId}' not found`);
    }
    
    const requestId = generateRequestId();
    const decisionId = generateDecisionId();
    const now = clock.nowMs();
    
    const request: IncomingRequest = {
        requestId,
        priority,
        timestamp: now,
        deadline: options.deadline ?? null,
        metadata: options.metadata ?? {},
    };
    
    const mutableStats = statistics as {
        totalRequests: number;
        acceptedRequests: number;
        queuedRequests: number;
        rejectedRequests: number;
        degradedRequests: number;
    };
    
    mutableStats.totalRequests++;
    
    if (!config.enabled) {
        mutableStats.acceptedRequests++;
        
        return {
            decisionId,
            requestId,
            action: 'accept',
            queuePosition: null,
            estimatedWait: null,
            degradationLevel: 0,
            reason: 'Load shedding disabled',
            timestamp: now,
        };
    }
    
    const active = activeRequests.get(config.configId) ?? new Set();
    const queue = queues.get(config.configId) ?? [];
    const metrics = loadMetrics.get(config.configId) ?? initializeLoadMetrics(config.configId);
    
    const currentLoad = active.size / config.maxConcurrent;
    const loadLevel = calculateLoadLevel(config, currentLoad);
    
    const updatedMetrics: LoadMetrics = {
        ...metrics,
        currentLoad,
        loadLevel,
        activeRequests: active.size,
        queuedRequests: queue.length,
    };
    loadMetrics.set(config.configId, updatedMetrics);
    
    const rule = findDegradationRule(config, loadLevel, priority);
    
    if (rule) {
        switch (rule.action) {
            case 'reject':
                mutableStats.rejectedRequests++;
                
                await emitEvent({
                    eventId: generateEventId(),
                    type: 'request_rejected',
                    configId: config.configId,
                    requestId,
                    timestamp: now,
                    data: { loadLevel, priority, reason: 'Degradation rule' },
                });
                
                return {
                    decisionId,
                    requestId,
                    action: 'reject',
                    queuePosition: null,
                    estimatedWait: null,
                    degradationLevel: rule.degradationLevel,
                    reason: `Rejected due to ${loadLevel} load level`,
                    timestamp: now,
                };
            
            case 'degrade':
                mutableStats.degradedRequests++;
                
                await emitEvent({
                    eventId: generateEventId(),
                    type: 'request_degraded',
                    configId: config.configId,
                    requestId,
                    timestamp: now,
                    data: { loadLevel, priority, degradationLevel: rule.degradationLevel },
                });
                
                active.add(requestId);
                activeRequests.set(config.configId, active);
                
                return {
                    decisionId,
                    requestId,
                    action: 'degrade',
                    queuePosition: null,
                    estimatedWait: null,
                    degradationLevel: rule.degradationLevel,
                    reason: `Degraded due to ${loadLevel} load level`,
                    timestamp: now,
                };
            
            case 'queue':
                if (queue.length >= config.maxQueueSize) {
                    mutableStats.rejectedRequests++;
                    
                    await emitEvent({
                        eventId: generateEventId(),
                        type: 'request_rejected',
                        configId: config.configId,
                        requestId,
                        timestamp: now,
                        data: { reason: 'Queue full' },
                    });
                    
                    return {
                        decisionId,
                        requestId,
                        action: 'reject',
                        queuePosition: null,
                        estimatedWait: null,
                        degradationLevel: 0,
                        reason: 'Queue is full',
                        timestamp: now,
                    };
                }
                
                const entry: QueueEntry = {
                    entryId: generateEntryId(),
                    request,
                    enqueuedAt: now,
                    expiresAt: now + config.queueTimeout,
                    position: queue.length,
                };
                
                queue.push(entry);
                queues.set(config.configId, queue);
                
                mutableStats.queuedRequests++;
                
                await emitEvent({
                    eventId: generateEventId(),
                    type: 'request_queued',
                    configId: config.configId,
                    requestId,
                    timestamp: now,
                    data: { position: entry.position },
                });
                
                updateStatistics();
                
                return {
                    decisionId,
                    requestId,
                    action: 'queue',
                    queuePosition: entry.position,
                    estimatedWait: entry.position * (metrics.averageLatency || 100),
                    degradationLevel: 0,
                    reason: `Queued at position ${entry.position}`,
                    timestamp: now,
                };
        }
    }
    
    if (active.size < config.maxConcurrent) {
        active.add(requestId);
        activeRequests.set(config.configId, active);
        
        mutableStats.acceptedRequests++;
        
        await emitEvent({
            eventId: generateEventId(),
            type: 'request_accepted',
            configId: config.configId,
            requestId,
            timestamp: now,
            data: {},
        });
        
        return {
            decisionId,
            requestId,
            action: 'accept',
            queuePosition: null,
            estimatedWait: null,
            degradationLevel: 0,
            reason: 'Accepted',
            timestamp: now,
        };
    }
    
    if (queue.length < config.maxQueueSize) {
        const entry: QueueEntry = {
            entryId: generateEntryId(),
            request,
            enqueuedAt: now,
            expiresAt: now + config.queueTimeout,
            position: queue.length,
        };
        
        queue.push(entry);
        queues.set(config.configId, queue);
        
        mutableStats.queuedRequests++;
        
        await emitEvent({
            eventId: generateEventId(),
            type: 'request_queued',
            configId: config.configId,
            requestId,
            timestamp: now,
            data: { position: entry.position },
        });
        
        updateStatistics();
        
        return {
            decisionId,
            requestId,
            action: 'queue',
            queuePosition: entry.position,
            estimatedWait: entry.position * (metrics.averageLatency || 100),
            degradationLevel: 0,
            reason: `Queued at position ${entry.position}`,
            timestamp: now,
        };
    }
    
    mutableStats.rejectedRequests++;
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'request_rejected',
        configId: config.configId,
        requestId,
        timestamp: now,
        data: { reason: 'At capacity' },
    });
    
    return {
        decisionId,
        requestId,
        action: 'reject',
        queuePosition: null,
        estimatedWait: null,
        degradationLevel: 0,
        reason: 'System at capacity',
        timestamp: now,
    };
}

/**
 * Complete request
 */
export async function completeRequest(
    nameOrId: string,
    requestId: string,
    latency: number
): Promise<boolean> {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    
    const active = activeRequests.get(config.configId);
    if (!active || !active.has(requestId)) {
        return false;
    }
    
    active.delete(requestId);
    activeRequests.set(config.configId, active);
    
    const metrics = loadMetrics.get(config.configId);
    if (metrics) {
        const totalRequests = metrics.acceptedRequests + 1;
        const newAverageLatency = (metrics.averageLatency * metrics.acceptedRequests + latency) / totalRequests;
        
        const updatedMetrics: LoadMetrics = {
            ...metrics,
            activeRequests: active.size,
            acceptedRequests: totalRequests,
            averageLatency: newAverageLatency,
        };
        loadMetrics.set(config.configId, updatedMetrics);
    }
    
    await processQueue(config.configId);
    
    return true;
}

/**
 * Process queue
 */
async function processQueue(configId: string): Promise<void> {
    const config = configs.get(configId);
    if (!config) {
        return;
    }
    
    const active = activeRequests.get(configId) ?? new Set();
    const queue = queues.get(configId) ?? [];
    const now = clock.nowMs();
    
    const expiredIndices: number[] = [];
    for (let i = 0; i < queue.length; i++) {
        if (queue[i].expiresAt <= now) {
            expiredIndices.push(i);
        }
    }
    
    for (let i = expiredIndices.length - 1; i >= 0; i--) {
        const entry = queue[expiredIndices[i]];
        queue.splice(expiredIndices[i], 1);
        
        const mutableStats = statistics as { expiredRequests: number };
        mutableStats.expiredRequests++;
        
        await emitEvent({
            eventId: generateEventId(),
            type: 'request_expired',
            configId,
            requestId: entry.request.requestId,
            timestamp: now,
            data: {},
        });
    }
    
    while (active.size < config.maxConcurrent && queue.length > 0) {
        let nextEntry: QueueEntry | null = null;
        let nextIndex = 0;
        
        switch (config.strategy) {
            case 'fifo':
                nextEntry = queue[0];
                nextIndex = 0;
                break;
            
            case 'lifo':
                nextEntry = queue[queue.length - 1];
                nextIndex = queue.length - 1;
                break;
            
            case 'priority':
                let highestWeight = -1;
                for (let i = 0; i < queue.length; i++) {
                    const weight = getPriorityWeight(config, queue[i].request.priority);
                    if (weight > highestWeight) {
                        highestWeight = weight;
                        nextEntry = queue[i];
                        nextIndex = i;
                    }
                }
                break;
            
            case 'random':
                nextIndex = now % queue.length;
                nextEntry = queue[nextIndex];
                break;
            
            case 'adaptive':
                for (let i = 0; i < queue.length; i++) {
                    const entry = queue[i];
                    if (entry.request.deadline && entry.request.deadline <= now + 1000) {
                        nextEntry = entry;
                        nextIndex = i;
                        break;
                    }
                }
                if (!nextEntry) {
                    let highestWeight = -1;
                    for (let i = 0; i < queue.length; i++) {
                        const weight = getPriorityWeight(config, queue[i].request.priority);
                        if (weight > highestWeight) {
                            highestWeight = weight;
                            nextEntry = queue[i];
                            nextIndex = i;
                        }
                    }
                }
                break;
        }
        
        if (!nextEntry) {
            break;
        }
        
        queue.splice(nextIndex, 1);
        active.add(nextEntry.request.requestId);
        
        await emitEvent({
            eventId: generateEventId(),
            type: 'request_dequeued',
            configId,
            requestId: nextEntry.request.requestId,
            timestamp: now,
            data: { waitTime: now - nextEntry.enqueuedAt },
        });
    }
    
    for (let i = 0; i < queue.length; i++) {
        const entry = queue[i];
        queue[i] = { ...entry, position: i };
    }
    
    queues.set(configId, queue);
    activeRequests.set(configId, active);
    
    updateStatistics();
}

// ============================================================================
// LOAD METRICS
// ============================================================================

/**
 * Get load metrics
 */
export function getLoadMetrics(nameOrId: string): LoadMetrics | null {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    return loadMetrics.get(config.configId) ?? null;
}

/**
 * Get current load level
 */
export function getCurrentLoadLevel(nameOrId: string): LoadLevel | null {
    const metrics = getLoadMetrics(nameOrId);
    return metrics?.loadLevel ?? null;
}

/**
 * Get queue status
 */
export function getQueueStatus(nameOrId: string): {
    size: number;
    entries: readonly QueueEntry[];
} | null {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    
    const queue = queues.get(config.configId) ?? [];
    return {
        size: queue.length,
        entries: queue,
    };
}

// ============================================================================
// DEGRADATION RULES
// ============================================================================

/**
 * Add degradation rule
 */
export function addDegradationRule(
    nameOrId: string,
    loadLevel: LoadLevel,
    priority: RequestPriority,
    action: SheddingAction,
    degradationLevel: number = 0
): DegradationRule | null {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    
    const rule: DegradationRule = {
        ruleId: generateRuleId(),
        loadLevel,
        priority,
        action,
        degradationLevel,
    };
    
    const updatedConfig: LoadSheddingConfig = {
        ...config,
        degradationRules: [...config.degradationRules, rule],
    };
    
    configs.set(config.configId, updatedConfig);
    configs.set(config.name, updatedConfig);
    
    return rule;
}

/**
 * Remove degradation rule
 */
export function removeDegradationRule(nameOrId: string, ruleId: string): boolean {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    
    const index = config.degradationRules.findIndex(r => r.ruleId === ruleId);
    if (index === -1) {
        return false;
    }
    
    const updatedRules = [...config.degradationRules];
    updatedRules.splice(index, 1);
    
    const updatedConfig: LoadSheddingConfig = {
        ...config,
        degradationRules: updatedRules,
    };
    
    configs.set(config.configId, updatedConfig);
    configs.set(config.name, updatedConfig);
    
    return true;
}

/**
 * Get degradation rules
 */
export function getDegradationRules(nameOrId: string): readonly DegradationRule[] {
    const config = configs.get(nameOrId);
    return config?.degradationRules ?? [];
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get statistics
 */
export function getStatistics(): Readonly<LoadSheddingStatistics> {
    updateStatistics();
    return { ...statistics };
}

/**
 * Reset statistics
 */
export function resetStatistics(): void {
    Object.assign(statistics, {
        totalConfigs: 0,
        totalRequests: 0,
        acceptedRequests: 0,
        queuedRequests: 0,
        rejectedRequests: 0,
        degradedRequests: 0,
        expiredRequests: 0,
        currentQueueSize: 0,
        peakQueueSize: 0,
        averageQueueTime: 0,
    });
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Add event listener
 */
export function addEventListener(listener: LoadSheddingEventListener): void {
    eventListeners.add(listener);
}

/**
 * Remove event listener
 */
export function removeEventListener(listener: LoadSheddingEventListener): void {
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
    queues.clear();
    activeRequests.clear();
    loadMetrics.clear();
    eventListeners.clear();
    resetStatistics();
}
