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
export type LoadSheddingEventType = 'config_created' | 'config_deleted' | 'request_accepted' | 'request_queued' | 'request_rejected' | 'request_degraded' | 'request_dequeued' | 'request_expired' | 'load_level_changed' | 'shedding_activated' | 'shedding_deactivated';
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
/**
 * Create load shedding config
 */
export declare function createLoadSheddingConfig(name: string, options?: {
    strategy?: SheddingStrategy;
    maxConcurrent?: number;
    maxQueueSize?: number;
    queueTimeout?: number;
    priorityWeights?: Record<RequestPriority, number>;
    thresholds?: Partial<LoadThresholds>;
    degradationRules?: readonly Omit<DegradationRule, 'ruleId'>[];
    metadata?: Record<string, unknown>;
}): Promise<LoadSheddingConfig>;
/**
 * Get load shedding config
 */
export declare function getLoadSheddingConfig(nameOrId: string): LoadSheddingConfig | null;
/**
 * Get all load shedding configs
 */
export declare function getAllLoadSheddingConfigs(): readonly LoadSheddingConfig[];
/**
 * Update load shedding config
 */
export declare function updateLoadSheddingConfig(nameOrId: string, updates: {
    strategy?: SheddingStrategy;
    maxConcurrent?: number;
    maxQueueSize?: number;
    queueTimeout?: number;
    enabled?: boolean;
}): LoadSheddingConfig | null;
/**
 * Delete load shedding config
 */
export declare function deleteLoadSheddingConfig(nameOrId: string): Promise<boolean>;
/**
 * Submit request
 */
export declare function submitRequest(nameOrId: string, priority: RequestPriority, options?: {
    deadline?: number;
    metadata?: Record<string, unknown>;
}): Promise<RequestDecision>;
/**
 * Complete request
 */
export declare function completeRequest(nameOrId: string, requestId: string, latency: number): Promise<boolean>;
/**
 * Get load metrics
 */
export declare function getLoadMetrics(nameOrId: string): LoadMetrics | null;
/**
 * Get current load level
 */
export declare function getCurrentLoadLevel(nameOrId: string): LoadLevel | null;
/**
 * Get queue status
 */
export declare function getQueueStatus(nameOrId: string): {
    size: number;
    entries: readonly QueueEntry[];
} | null;
/**
 * Add degradation rule
 */
export declare function addDegradationRule(nameOrId: string, loadLevel: LoadLevel, priority: RequestPriority, action: SheddingAction, degradationLevel?: number): DegradationRule | null;
/**
 * Remove degradation rule
 */
export declare function removeDegradationRule(nameOrId: string, ruleId: string): boolean;
/**
 * Get degradation rules
 */
export declare function getDegradationRules(nameOrId: string): readonly DegradationRule[];
/**
 * Get statistics
 */
export declare function getStatistics(): Readonly<LoadSheddingStatistics>;
/**
 * Reset statistics
 */
export declare function resetStatistics(): void;
/**
 * Add event listener
 */
export declare function addEventListener(listener: LoadSheddingEventListener): void;
/**
 * Remove event listener
 */
export declare function removeEventListener(listener: LoadSheddingEventListener): void;
/**
 * Clear event listeners
 */
export declare function clearEventListeners(): void;
/**
 * Clear all state
 */
export declare function clearAll(): void;
