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

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI ZA BACKPRESSURE
// ============================================================================

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
export type BackpressureEventType =
    | 'config_created'
    | 'config_deleted'
    | 'buffer_created'
    | 'buffer_cleared'
    | 'item_added'
    | 'item_removed'
    | 'item_dropped'
    | 'item_spilled'
    | 'flow_paused'
    | 'flow_resumed'
    | 'flow_throttled'
    | 'high_watermark_reached'
    | 'low_watermark_reached'
    | 'overflow_detected'
    | 'producer_registered'
    | 'consumer_registered';

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

// ============================================================================
// STANJE
// ============================================================================

const configs: Map<string, BackpressureConfig> = new Map();
const buffers: Map<string, BufferItem<unknown>[]> = new Map();
const bufferStates: Map<string, BufferState> = new Map();
const producers: Map<string, ProducerState> = new Map();
const consumers: Map<string, ConsumerState> = new Map();
const spillStorages: Map<string, SpillStorage<unknown>> = new Map();
const flowSignals: Map<string, FlowControlSignal[]> = new Map();
const eventListeners: Set<BackpressureEventListener> = new Set();

let configCounter = 0;
let bufferCounter = 0;
let itemCounter = 0;
let signalCounter = 0;
let producerCounter = 0;
let consumerCounter = 0;
let spillCounter = 0;
let eventCounter = 0;

const statistics: BackpressureStatistics = {
    totalConfigs: 0,
    totalBuffers: 0,
    totalProducers: 0,
    totalConsumers: 0,
    totalItemsAdded: 0,
    totalItemsRemoved: 0,
    totalItemsDropped: 0,
    totalItemsSpilled: 0,
    totalPauseEvents: 0,
    totalThrottleEvents: 0,
    averageBufferUtilization: 0,
};

// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================

/**
 * Generate config ID
 */
function generateConfigId(): string {
    configCounter++;
    return generateDeterministicId(`bp-config-${configCounter}`);
}

/**
 * Generate buffer ID
 */
function generateBufferId(): string {
    bufferCounter++;
    return generateDeterministicId(`bp-buffer-${bufferCounter}`);
}

/**
 * Generate item ID
 */
function generateItemId(): string {
    itemCounter++;
    return generateDeterministicId(`bp-item-${itemCounter}`);
}

/**
 * Generate signal ID
 */
function generateSignalId(): string {
    signalCounter++;
    return generateDeterministicId(`flow-signal-${signalCounter}`);
}

/**
 * Generate producer ID
 */
function generateProducerId(): string {
    producerCounter++;
    return generateDeterministicId(`producer-${producerCounter}`);
}

/**
 * Generate consumer ID
 */
function generateConsumerId(): string {
    consumerCounter++;
    return generateDeterministicId(`consumer-${consumerCounter}`);
}

/**
 * Generate spill ID
 */
function generateSpillId(): string {
    spillCounter++;
    return generateDeterministicId(`spill-${spillCounter}`);
}

/**
 * Generate event ID
 */
function generateEventId(): string {
    eventCounter++;
    return generateDeterministicId(`bp-event-${eventCounter}`);
}

/**
 * Emit backpressure event
 */
async function emitEvent(event: BackpressureEvent): Promise<void> {
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
        totalBuffers: number;
        totalProducers: number;
        totalConsumers: number;
        averageBufferUtilization: number;
    };
    
    mutableStats.totalConfigs = configs.size;
    mutableStats.totalBuffers = bufferStates.size;
    mutableStats.totalProducers = producers.size;
    mutableStats.totalConsumers = consumers.size;
    
    let totalUtilization = 0;
    let bufferCount = 0;
    for (const state of bufferStates.values()) {
        totalUtilization += state.fillPercentage;
        bufferCount++;
    }
    mutableStats.averageBufferUtilization = bufferCount > 0 ? totalUtilization / bufferCount : 0;
}

/**
 * Calculate buffer fill percentage
 */
function calculateFillPercentage(currentSize: number, maxSize: number): number {
    if (maxSize <= 0) return 0;
    return (currentSize / maxSize) * 100;
}

/**
 * Determine flow state based on fill percentage
 */
function determineFlowState(
    config: BackpressureConfig,
    fillPercentage: number,
    currentState: FlowState
): FlowState {
    const fillRatio = fillPercentage / 100;
    
    if (fillRatio >= 1) {
        return 'blocked';
    }
    
    if (fillRatio >= config.highWaterMark) {
        if (config.strategy === 'throttle') {
            return 'throttled';
        }
        return 'paused';
    }
    
    if (fillRatio <= config.lowWaterMark && currentState !== 'flowing') {
        return 'flowing';
    }
    
    return currentState;
}

/**
 * Calculate item size
 */
function calculateItemSize(data: unknown): number {
    if (data === null || data === undefined) {
        return 0;
    }
    
    if (typeof data === 'string') {
        return data.length * 2;
    }
    
    if (typeof data === 'number') {
        return 8;
    }
    
    if (typeof data === 'boolean') {
        return 1;
    }
    
    if (Array.isArray(data)) {
        return data.reduce((sum, item) => sum + calculateItemSize(item), 0);
    }
    
    if (typeof data === 'object') {
        return JSON.stringify(data).length * 2;
    }
    
    return 8;
}

// ============================================================================
// CONFIG MANAGEMENT
// ============================================================================

/**
 * Create backpressure config
 */
export async function createBackpressureConfig(
    name: string,
    options: {
        strategy?: BackpressureStrategy;
        bufferSize?: number;
        highWaterMark?: number;
        lowWaterMark?: number;
        throttleRate?: number;
        sampleRate?: number;
        overflowAction?: OverflowAction;
        spillThreshold?: number;
        metadata?: Record<string, unknown>;
    } = {}
): Promise<BackpressureConfig> {
    const configId = generateConfigId();
    
    const config: BackpressureConfig = {
        configId,
        name,
        strategy: options.strategy ?? 'drop_oldest',
        bufferSize: options.bufferSize ?? 10000,
        highWaterMark: options.highWaterMark ?? 0.8,
        lowWaterMark: options.lowWaterMark ?? 0.5,
        throttleRate: options.throttleRate ?? 0.5,
        sampleRate: options.sampleRate ?? 0.1,
        overflowAction: options.overflowAction ?? 'drop',
        spillThreshold: options.spillThreshold ?? 0.9,
        enabled: true,
        metadata: options.metadata ?? {},
    };
    
    configs.set(configId, config);
    configs.set(name, config);
    
    const bufferId = generateBufferId();
    buffers.set(configId, []);
    
    const bufferState: BufferState = {
        bufferId,
        configId,
        currentSize: 0,
        maxSize: config.bufferSize,
        fillPercentage: 0,
        flowState: 'flowing',
        itemCount: 0,
        droppedCount: 0,
        spilledCount: 0,
        lastWriteTime: null,
        lastReadTime: null,
    };
    bufferStates.set(configId, bufferState);
    
    flowSignals.set(configId, []);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'config_created',
        configId,
        timestamp: clock.nowMs(),
        data: { name },
    });
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'buffer_created',
        configId,
        timestamp: clock.nowMs(),
        data: { bufferId, maxSize: config.bufferSize },
    });
    
    updateStatistics();
    
    return config;
}

/**
 * Get backpressure config
 */
export function getBackpressureConfig(nameOrId: string): BackpressureConfig | null {
    return configs.get(nameOrId) ?? null;
}

/**
 * Get all backpressure configs
 */
export function getAllBackpressureConfigs(): readonly BackpressureConfig[] {
    const uniqueConfigs = new Map<string, BackpressureConfig>();
    for (const config of configs.values()) {
        uniqueConfigs.set(config.configId, config);
    }
    return Array.from(uniqueConfigs.values());
}

/**
 * Update backpressure config
 */
export function updateBackpressureConfig(
    nameOrId: string,
    updates: {
        strategy?: BackpressureStrategy;
        bufferSize?: number;
        highWaterMark?: number;
        lowWaterMark?: number;
        throttleRate?: number;
        enabled?: boolean;
    }
): BackpressureConfig | null {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    
    const updatedConfig: BackpressureConfig = {
        ...config,
        strategy: updates.strategy ?? config.strategy,
        bufferSize: updates.bufferSize ?? config.bufferSize,
        highWaterMark: updates.highWaterMark ?? config.highWaterMark,
        lowWaterMark: updates.lowWaterMark ?? config.lowWaterMark,
        throttleRate: updates.throttleRate ?? config.throttleRate,
        enabled: updates.enabled ?? config.enabled,
    };
    
    configs.set(config.configId, updatedConfig);
    configs.set(config.name, updatedConfig);
    
    return updatedConfig;
}

/**
 * Delete backpressure config
 */
export async function deleteBackpressureConfig(nameOrId: string): Promise<boolean> {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    
    configs.delete(config.configId);
    configs.delete(config.name);
    buffers.delete(config.configId);
    bufferStates.delete(config.configId);
    flowSignals.delete(config.configId);
    spillStorages.delete(config.configId);
    
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
// BUFFER OPERATIONS
// ============================================================================

/**
 * Add item to buffer
 */
export async function addItem<T>(
    nameOrId: string,
    data: T,
    options: {
        priority?: number;
        metadata?: Record<string, unknown>;
    } = {}
): Promise<BufferItem<T> | null> {
    const config = configs.get(nameOrId);
    if (!config || !config.enabled) {
        return null;
    }
    
    const buffer = buffers.get(config.configId);
    const state = bufferStates.get(config.configId);
    if (!buffer || !state) {
        return null;
    }
    
    const now = clock.nowMs();
    const itemSize = calculateItemSize(data);
    
    const mutableStats = statistics as {
        totalItemsAdded: number;
        totalItemsDropped: number;
        totalItemsSpilled: number;
        totalPauseEvents: number;
        totalThrottleEvents: number;
    };
    
    if (state.currentSize + itemSize > config.bufferSize) {
        switch (config.strategy) {
            case 'drop_oldest':
                while (buffer.length > 0 && state.currentSize + itemSize > config.bufferSize) {
                    const dropped = buffer.shift();
                    if (dropped) {
                        const newSize = state.currentSize - dropped.size;
                        const newState: BufferState = {
                            ...state,
                            currentSize: newSize,
                            fillPercentage: calculateFillPercentage(newSize, config.bufferSize),
                            itemCount: buffer.length,
                            droppedCount: state.droppedCount + 1,
                        };
                        bufferStates.set(config.configId, newState);
                        
                        mutableStats.totalItemsDropped++;
                        
                        await emitEvent({
                            eventId: generateEventId(),
                            type: 'item_dropped',
                            configId: config.configId,
                            timestamp: now,
                            data: { itemId: dropped.itemId, reason: 'drop_oldest' },
                        });
                    }
                }
                break;
            
            case 'drop_newest':
                mutableStats.totalItemsDropped++;
                
                await emitEvent({
                    eventId: generateEventId(),
                    type: 'item_dropped',
                    configId: config.configId,
                    timestamp: now,
                    data: { reason: 'drop_newest' },
                });
                
                return null;
            
            case 'block':
                return null;
            
            case 'sample':
                const sampleDecision = (now % 100) / 100;
                if (sampleDecision > config.sampleRate) {
                    mutableStats.totalItemsDropped++;
                    return null;
                }
                break;
        }
        
        if (config.overflowAction === 'spill' && state.fillPercentage >= config.spillThreshold * 100) {
            const spilledItems = buffer.splice(0, Math.floor(buffer.length * 0.2));
            
            let spill = spillStorages.get(config.configId);
            if (!spill) {
                spill = {
                    storageId: generateSpillId(),
                    configId: config.configId,
                    items: [],
                    totalSize: 0,
                    createdAt: now,
                };
            }
            
            const updatedSpill: SpillStorage<unknown> = {
                ...spill,
                items: [...spill.items, ...spilledItems],
                totalSize: spill.totalSize + spilledItems.reduce((sum, item) => sum + item.size, 0),
            };
            spillStorages.set(config.configId, updatedSpill);
            
            const spilledSize = spilledItems.reduce((sum, item) => sum + item.size, 0);
            const newSize = state.currentSize - spilledSize;
            const newState: BufferState = {
                ...state,
                currentSize: newSize,
                fillPercentage: calculateFillPercentage(newSize, config.bufferSize),
                itemCount: buffer.length,
                spilledCount: state.spilledCount + spilledItems.length,
            };
            bufferStates.set(config.configId, newState);
            
            mutableStats.totalItemsSpilled += spilledItems.length;
            
            await emitEvent({
                eventId: generateEventId(),
                type: 'item_spilled',
                configId: config.configId,
                timestamp: now,
                data: { count: spilledItems.length },
            });
        }
    }
    
    const item: BufferItem<T> = {
        itemId: generateItemId(),
        data,
        size: itemSize,
        timestamp: now,
        priority: options.priority ?? 0,
        metadata: options.metadata ?? {},
    };
    
    buffer.push(item as BufferItem<unknown>);
    
    const newSize = state.currentSize + itemSize;
    const newFillPercentage = calculateFillPercentage(newSize, config.bufferSize);
    const newFlowState = determineFlowState(config, newFillPercentage, state.flowState);
    
    const newState: BufferState = {
        ...state,
        currentSize: newSize,
        fillPercentage: newFillPercentage,
        flowState: newFlowState,
        itemCount: buffer.length,
        lastWriteTime: now,
    };
    bufferStates.set(config.configId, newState);
    
    mutableStats.totalItemsAdded++;
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'item_added',
        configId: config.configId,
        timestamp: now,
        data: { itemId: item.itemId, size: itemSize },
    });
    
    if (newFillPercentage >= config.highWaterMark * 100 && state.fillPercentage < config.highWaterMark * 100) {
        await emitEvent({
            eventId: generateEventId(),
            type: 'high_watermark_reached',
            configId: config.configId,
            timestamp: now,
            data: { fillPercentage: newFillPercentage },
        });
        
        if (newFlowState === 'paused' && state.flowState !== 'paused') {
            mutableStats.totalPauseEvents++;
            
            await emitEvent({
                eventId: generateEventId(),
                type: 'flow_paused',
                configId: config.configId,
                timestamp: now,
                data: {},
            });
        }
        
        if (newFlowState === 'throttled' && state.flowState !== 'throttled') {
            mutableStats.totalThrottleEvents++;
            
            await emitEvent({
                eventId: generateEventId(),
                type: 'flow_throttled',
                configId: config.configId,
                timestamp: now,
                data: { throttleRate: config.throttleRate },
            });
        }
    }
    
    updateStatistics();
    
    return item;
}

/**
 * Remove item from buffer
 */
export async function removeItem<T>(nameOrId: string): Promise<BufferItem<T> | null> {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    
    const buffer = buffers.get(config.configId);
    const state = bufferStates.get(config.configId);
    if (!buffer || !state || buffer.length === 0) {
        return null;
    }
    
    const now = clock.nowMs();
    const item = buffer.shift() as BufferItem<T> | undefined;
    if (!item) {
        return null;
    }
    
    const newSize = state.currentSize - item.size;
    const newFillPercentage = calculateFillPercentage(newSize, config.bufferSize);
    const newFlowState = determineFlowState(config, newFillPercentage, state.flowState);
    
    const newState: BufferState = {
        ...state,
        currentSize: newSize,
        fillPercentage: newFillPercentage,
        flowState: newFlowState,
        itemCount: buffer.length,
        lastReadTime: now,
    };
    bufferStates.set(config.configId, newState);
    
    const mutableStats = statistics as { totalItemsRemoved: number };
    mutableStats.totalItemsRemoved++;
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'item_removed',
        configId: config.configId,
        timestamp: now,
        data: { itemId: item.itemId },
    });
    
    if (newFillPercentage <= config.lowWaterMark * 100 && state.fillPercentage > config.lowWaterMark * 100) {
        await emitEvent({
            eventId: generateEventId(),
            type: 'low_watermark_reached',
            configId: config.configId,
            timestamp: now,
            data: { fillPercentage: newFillPercentage },
        });
        
        if (newFlowState === 'flowing' && state.flowState !== 'flowing') {
            await emitEvent({
                eventId: generateEventId(),
                type: 'flow_resumed',
                configId: config.configId,
                timestamp: now,
                data: {},
            });
        }
    }
    
    updateStatistics();
    
    return item;
}

/**
 * Peek item from buffer
 */
export function peekItem<T>(nameOrId: string): BufferItem<T> | null {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    
    const buffer = buffers.get(config.configId);
    if (!buffer || buffer.length === 0) {
        return null;
    }
    
    return buffer[0] as BufferItem<T>;
}

/**
 * Clear buffer
 */
export async function clearBuffer(nameOrId: string): Promise<boolean> {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    
    const buffer = buffers.get(config.configId);
    const state = bufferStates.get(config.configId);
    if (!buffer || !state) {
        return false;
    }
    
    buffer.length = 0;
    
    const newState: BufferState = {
        ...state,
        currentSize: 0,
        fillPercentage: 0,
        flowState: 'flowing',
        itemCount: 0,
    };
    bufferStates.set(config.configId, newState);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'buffer_cleared',
        configId: config.configId,
        timestamp: clock.nowMs(),
        data: {},
    });
    
    updateStatistics();
    
    return true;
}

/**
 * Get buffer state
 */
export function getBufferState(nameOrId: string): BufferState | null {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    return bufferStates.get(config.configId) ?? null;
}

// ============================================================================
// PRODUCER MANAGEMENT
// ============================================================================

/**
 * Register producer
 */
export async function registerProducer(nameOrId: string): Promise<ProducerState | null> {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    
    const producerId = generateProducerId();
    
    const producer: ProducerState = {
        producerId,
        configId: config.configId,
        flowState: 'flowing',
        producedCount: 0,
        throttledCount: 0,
        blockedCount: 0,
        lastProduceTime: null,
        averageProduceRate: 0,
    };
    
    producers.set(producerId, producer);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'producer_registered',
        configId: config.configId,
        timestamp: clock.nowMs(),
        data: { producerId },
    });
    
    updateStatistics();
    
    return producer;
}

/**
 * Get producer state
 */
export function getProducerState(producerId: string): ProducerState | null {
    return producers.get(producerId) ?? null;
}

/**
 * Update producer state
 */
export function updateProducerState(
    producerId: string,
    updates: {
        flowState?: FlowState;
        producedCount?: number;
    }
): ProducerState | null {
    const producer = producers.get(producerId);
    if (!producer) {
        return null;
    }
    
    const updatedProducer: ProducerState = {
        ...producer,
        flowState: updates.flowState ?? producer.flowState,
        producedCount: updates.producedCount ?? producer.producedCount,
        lastProduceTime: clock.nowMs(),
    };
    
    producers.set(producerId, updatedProducer);
    
    return updatedProducer;
}

/**
 * Unregister producer
 */
export function unregisterProducer(producerId: string): boolean {
    return producers.delete(producerId);
}

// ============================================================================
// CONSUMER MANAGEMENT
// ============================================================================

/**
 * Register consumer
 */
export async function registerConsumer(nameOrId: string): Promise<ConsumerState | null> {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    
    const consumerId = generateConsumerId();
    
    const consumer: ConsumerState = {
        consumerId,
        configId: config.configId,
        flowState: 'flowing',
        consumedCount: 0,
        lastConsumeTime: null,
        averageConsumeRate: 0,
        processingTime: 0,
    };
    
    consumers.set(consumerId, consumer);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'consumer_registered',
        configId: config.configId,
        timestamp: clock.nowMs(),
        data: { consumerId },
    });
    
    updateStatistics();
    
    return consumer;
}

/**
 * Get consumer state
 */
export function getConsumerState(consumerId: string): ConsumerState | null {
    return consumers.get(consumerId) ?? null;
}

/**
 * Update consumer state
 */
export function updateConsumerState(
    consumerId: string,
    updates: {
        flowState?: FlowState;
        consumedCount?: number;
        processingTime?: number;
    }
): ConsumerState | null {
    const consumer = consumers.get(consumerId);
    if (!consumer) {
        return null;
    }
    
    const updatedConsumer: ConsumerState = {
        ...consumer,
        flowState: updates.flowState ?? consumer.flowState,
        consumedCount: updates.consumedCount ?? consumer.consumedCount,
        processingTime: updates.processingTime ?? consumer.processingTime,
        lastConsumeTime: clock.nowMs(),
    };
    
    consumers.set(consumerId, updatedConsumer);
    
    return updatedConsumer;
}

/**
 * Unregister consumer
 */
export function unregisterConsumer(consumerId: string): boolean {
    return consumers.delete(consumerId);
}

// ============================================================================
// FLOW CONTROL
// ============================================================================

/**
 * Send flow signal
 */
export async function sendFlowSignal(
    nameOrId: string,
    type: FlowSignalType,
    targetId?: string
): Promise<FlowControlSignal | null> {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    
    const signal: FlowControlSignal = {
        signalId: generateSignalId(),
        type,
        sourceId: config.configId,
        targetId: targetId ?? null,
        timestamp: clock.nowMs(),
        data: {},
    };
    
    const signals = flowSignals.get(config.configId) ?? [];
    signals.push(signal);
    flowSignals.set(config.configId, signals);
    
    return signal;
}

/**
 * Get flow signals
 */
export function getFlowSignals(nameOrId: string): readonly FlowControlSignal[] {
    const config = configs.get(nameOrId);
    if (!config) {
        return [];
    }
    return flowSignals.get(config.configId) ?? [];
}

/**
 * Get current flow state
 */
export function getCurrentFlowState(nameOrId: string): FlowState | null {
    const state = getBufferState(nameOrId);
    return state?.flowState ?? null;
}

// ============================================================================
// SPILL STORAGE
// ============================================================================

/**
 * Get spill storage
 */
export function getSpillStorage<T>(nameOrId: string): SpillStorage<T> | null {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    return spillStorages.get(config.configId) as SpillStorage<T> | null;
}

/**
 * Recover from spill
 */
export async function recoverFromSpill<T>(nameOrId: string, count: number): Promise<readonly BufferItem<T>[]> {
    const config = configs.get(nameOrId);
    if (!config) {
        return [];
    }
    
    const spill = spillStorages.get(config.configId);
    if (!spill || spill.items.length === 0) {
        return [];
    }
    
    const recoveredItems = spill.items.slice(0, count) as BufferItem<T>[];
    const remainingItems = spill.items.slice(count);
    
    const updatedSpill: SpillStorage<unknown> = {
        ...spill,
        items: remainingItems,
        totalSize: remainingItems.reduce((sum, item) => sum + item.size, 0),
    };
    spillStorages.set(config.configId, updatedSpill);
    
    return recoveredItems;
}

/**
 * Clear spill storage
 */
export function clearSpillStorage(nameOrId: string): boolean {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    return spillStorages.delete(config.configId);
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get statistics
 */
export function getStatistics(): Readonly<BackpressureStatistics> {
    updateStatistics();
    return { ...statistics };
}

/**
 * Reset statistics
 */
export function resetStatistics(): void {
    Object.assign(statistics, {
        totalConfigs: 0,
        totalBuffers: 0,
        totalProducers: 0,
        totalConsumers: 0,
        totalItemsAdded: 0,
        totalItemsRemoved: 0,
        totalItemsDropped: 0,
        totalItemsSpilled: 0,
        totalPauseEvents: 0,
        totalThrottleEvents: 0,
        averageBufferUtilization: 0,
    });
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Add event listener
 */
export function addEventListener(listener: BackpressureEventListener): void {
    eventListeners.add(listener);
}

/**
 * Remove event listener
 */
export function removeEventListener(listener: BackpressureEventListener): void {
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
    buffers.clear();
    bufferStates.clear();
    producers.clear();
    consumers.clear();
    spillStorages.clear();
    flowSignals.clear();
    eventListeners.clear();
    resetStatistics();
}
