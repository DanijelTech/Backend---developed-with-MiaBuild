/**
 * @file Backpressure Management za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-RES-005 Backpressure management za zaledne sisteme
 * @design DSN-ZALEDNI-RES-005 Backend backpressure arhitektura
 * @test TEST-ZALEDNI-RES-005 Preverjanje backpressure management
 *
 * Backpressure Management - prilagojen za zaledne sisteme:
 * - Flow control
 * - Buffer management
 * - Rate adaptation
 * - Producer throttling
 * - Consumer pacing
 * - Overflow handling
 * - Metrics collection
 * - Event notifications
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom RES_005 - Backpressure Management
 */
/**
 * Backpressure strategy
 */
export type BackpressureStrategy = 'drop_oldest' | 'drop_newest' | 'block' | 'throttle' | 'sample';
/**
 * Flow state
 */
export type FlowState = 'flowing' | 'paused' | 'throttled' | 'blocked';
/**
 * Buffer overflow action
 */
export type OverflowAction = 'drop' | 'reject' | 'spill' | 'compress';
/**
 * Backpressure configuration
 */
export interface BackpressureConfig {
    readonly configId: string;
    readonly name: string;
    readonly strategy: BackpressureStrategy;
    readonly bufferSize: number;
    readonly highWaterMark: number;
    readonly lowWaterMark: number;
    readonly throttleRate: number;
    readonly sampleRate: number;
    readonly overflowAction: OverflowAction;
    readonly spillThreshold: number;
    readonly enabled: boolean;
    readonly metadata: Readonly<Record<string, unknown>>;
}
/**
 * Buffer state
 */
export interface BufferState {
    readonly bufferId: string;
    readonly configId: string;
    readonly currentSize: number;
    readonly maxSize: number;
    readonly fillPercentage: number;
    readonly flowState: FlowState;
    readonly itemCount: number;
    readonly droppedCount: number;
    readonly spilledCount: number;
    readonly lastWriteTime: number | null;
    readonly lastReadTime: number | null;
}
/**
 * Buffer item
 */
export interface BufferItem<T> {
    readonly itemId: string;
    readonly data: T;
    readonly size: number;
    readonly timestamp: number;
    readonly priority: number;
    readonly metadata: Readonly<Record<string, unknown>>;
}
/**
 * Flow control signal
 */
export interface FlowControlSignal {
    readonly signalId: string;
    readonly type: FlowSignalType;
    readonly sourceId: string;
    readonly targetId: string | null;
    readonly timestamp: number;
    readonly data: Readonly<Record<string, unknown>>;
}
/**
 * Flow signal type
 */
export type FlowSignalType = 'pause' | 'resume' | 'throttle' | 'unthrottle' | 'drain' | 'overflow';
/**
 * Producer state
 */
export interface ProducerState {
    readonly producerId: string;
    readonly configId: string;
    readonly flowState: FlowState;
    readonly producedCount: number;
    readonly throttledCount: number;
    readonly blockedCount: number;
    readonly lastProduceTime: number | null;
    readonly averageProduceRate: number;
}
/**
 * Consumer state
 */
export interface ConsumerState {
    readonly consumerId: string;
    readonly configId: string;
    readonly flowState: FlowState;
    readonly consumedCount: number;
    readonly lastConsumeTime: number | null;
    readonly averageConsumeRate: number;
    readonly processingTime: number;
}
/**
 * Backpressure event
 */
export interface BackpressureEvent {
    readonly eventId: string;
    readonly type: BackpressureEventType;
    readonly configId: string | null;
    readonly timestamp: number;
    readonly data: Readonly<Record<string, unknown>>;
}
/**
 * Backpressure event type
 */
export type BackpressureEventType = 'config_created' | 'config_deleted' | 'buffer_created' | 'buffer_cleared' | 'item_added' | 'item_removed' | 'item_dropped' | 'item_spilled' | 'flow_paused' | 'flow_resumed' | 'flow_throttled' | 'high_watermark_reached' | 'low_watermark_reached' | 'overflow_detected' | 'producer_registered' | 'consumer_registered';
/**
 * Backpressure event listener
 */
export type BackpressureEventListener = (event: BackpressureEvent) => void | Promise<void>;
/**
 * Backpressure statistics
 */
export interface BackpressureStatistics {
    readonly totalConfigs: number;
    readonly totalBuffers: number;
    readonly totalProducers: number;
    readonly totalConsumers: number;
    readonly totalItemsAdded: number;
    readonly totalItemsRemoved: number;
    readonly totalItemsDropped: number;
    readonly totalItemsSpilled: number;
    readonly totalPauseEvents: number;
    readonly totalThrottleEvents: number;
    readonly averageBufferUtilization: number;
}
/**
 * Spill storage
 */
export interface SpillStorage<T> {
    readonly storageId: string;
    readonly configId: string;
    readonly items: readonly BufferItem<T>[];
    readonly totalSize: number;
    readonly createdAt: number;
}
/**
 * Create backpressure config
 */
export declare function createBackpressureConfig(name: string, options?: {
    strategy?: BackpressureStrategy;
    bufferSize?: number;
    highWaterMark?: number;
    lowWaterMark?: number;
    throttleRate?: number;
    sampleRate?: number;
    overflowAction?: OverflowAction;
    spillThreshold?: number;
    metadata?: Record<string, unknown>;
}): Promise<BackpressureConfig>;
/**
 * Get backpressure config
 */
export declare function getBackpressureConfig(nameOrId: string): BackpressureConfig | null;
/**
 * Get all backpressure configs
 */
export declare function getAllBackpressureConfigs(): readonly BackpressureConfig[];
/**
 * Update backpressure config
 */
export declare function updateBackpressureConfig(nameOrId: string, updates: {
    strategy?: BackpressureStrategy;
    bufferSize?: number;
    highWaterMark?: number;
    lowWaterMark?: number;
    throttleRate?: number;
    enabled?: boolean;
}): BackpressureConfig | null;
/**
 * Delete backpressure config
 */
export declare function deleteBackpressureConfig(nameOrId: string): Promise<boolean>;
/**
 * Add item to buffer
 */
export declare function addItem<T>(nameOrId: string, data: T, options?: {
    priority?: number;
    metadata?: Record<string, unknown>;
}): Promise<BufferItem<T> | null>;
/**
 * Remove item from buffer
 */
export declare function removeItem<T>(nameOrId: string): Promise<BufferItem<T> | null>;
/**
 * Peek item from buffer
 */
export declare function peekItem<T>(nameOrId: string): BufferItem<T> | null;
/**
 * Clear buffer
 */
export declare function clearBuffer(nameOrId: string): Promise<boolean>;
/**
 * Get buffer state
 */
export declare function getBufferState(nameOrId: string): BufferState | null;
/**
 * Register producer
 */
export declare function registerProducer(nameOrId: string): Promise<ProducerState | null>;
/**
 * Get producer state
 */
export declare function getProducerState(producerId: string): ProducerState | null;
/**
 * Update producer state
 */
export declare function updateProducerState(producerId: string, updates: {
    flowState?: FlowState;
    producedCount?: number;
}): ProducerState | null;
/**
 * Unregister producer
 */
export declare function unregisterProducer(producerId: string): boolean;
/**
 * Register consumer
 */
export declare function registerConsumer(nameOrId: string): Promise<ConsumerState | null>;
/**
 * Get consumer state
 */
export declare function getConsumerState(consumerId: string): ConsumerState | null;
/**
 * Update consumer state
 */
export declare function updateConsumerState(consumerId: string, updates: {
    flowState?: FlowState;
    consumedCount?: number;
    processingTime?: number;
}): ConsumerState | null;
/**
 * Unregister consumer
 */
export declare function unregisterConsumer(consumerId: string): boolean;
/**
 * Send flow signal
 */
export declare function sendFlowSignal(nameOrId: string, type: FlowSignalType, targetId?: string): Promise<FlowControlSignal | null>;
/**
 * Get flow signals
 */
export declare function getFlowSignals(nameOrId: string): readonly FlowControlSignal[];
/**
 * Get current flow state
 */
export declare function getCurrentFlowState(nameOrId: string): FlowState | null;
/**
 * Get spill storage
 */
export declare function getSpillStorage<T>(nameOrId: string): SpillStorage<T> | null;
/**
 * Recover from spill
 */
export declare function recoverFromSpill<T>(nameOrId: string, count: number): Promise<readonly BufferItem<T>[]>;
/**
 * Clear spill storage
 */
export declare function clearSpillStorage(nameOrId: string): boolean;
/**
 * Get statistics
 */
export declare function getStatistics(): Readonly<BackpressureStatistics>;
/**
 * Reset statistics
 */
export declare function resetStatistics(): void;
/**
 * Add event listener
 */
export declare function addEventListener(listener: BackpressureEventListener): void;
/**
 * Remove event listener
 */
export declare function removeEventListener(listener: BackpressureEventListener): void;
/**
 * Clear event listeners
 */
export declare function clearEventListeners(): void;
/**
 * Clear all state
 */
export declare function clearAll(): void;
