"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBackpressureConfig = createBackpressureConfig;
exports.getBackpressureConfig = getBackpressureConfig;
exports.getAllBackpressureConfigs = getAllBackpressureConfigs;
exports.updateBackpressureConfig = updateBackpressureConfig;
exports.deleteBackpressureConfig = deleteBackpressureConfig;
exports.addItem = addItem;
exports.removeItem = removeItem;
exports.peekItem = peekItem;
exports.clearBuffer = clearBuffer;
exports.getBufferState = getBufferState;
exports.registerProducer = registerProducer;
exports.getProducerState = getProducerState;
exports.updateProducerState = updateProducerState;
exports.unregisterProducer = unregisterProducer;
exports.registerConsumer = registerConsumer;
exports.getConsumerState = getConsumerState;
exports.updateConsumerState = updateConsumerState;
exports.unregisterConsumer = unregisterConsumer;
exports.sendFlowSignal = sendFlowSignal;
exports.getFlowSignals = getFlowSignals;
exports.getCurrentFlowState = getCurrentFlowState;
exports.getSpillStorage = getSpillStorage;
exports.recoverFromSpill = recoverFromSpill;
exports.clearSpillStorage = clearSpillStorage;
exports.getStatistics = getStatistics;
exports.resetStatistics = resetStatistics;
exports.addEventListener = addEventListener;
exports.removeEventListener = removeEventListener;
exports.clearEventListeners = clearEventListeners;
exports.clearAll = clearAll;
const clock_1 = require("@mia/core/clock");
const deterministic_1 = require("@mia/core/deterministic");
const clock = (0, clock_1.getClock)();
// ============================================================================
// STANJE
// ============================================================================
const configs = new Map();
const buffers = new Map();
const bufferStates = new Map();
const producers = new Map();
const consumers = new Map();
const spillStorages = new Map();
const flowSignals = new Map();
const eventListeners = new Set();
let configCounter = 0;
let bufferCounter = 0;
let itemCounter = 0;
let signalCounter = 0;
let producerCounter = 0;
let consumerCounter = 0;
let spillCounter = 0;
let eventCounter = 0;
const statistics = {
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
function generateConfigId() {
    configCounter++;
    return (0, deterministic_1.generateDeterministicId)(`bp-config-${configCounter}`);
}
/**
 * Generate buffer ID
 */
function generateBufferId() {
    bufferCounter++;
    return (0, deterministic_1.generateDeterministicId)(`bp-buffer-${bufferCounter}`);
}
/**
 * Generate item ID
 */
function generateItemId() {
    itemCounter++;
    return (0, deterministic_1.generateDeterministicId)(`bp-item-${itemCounter}`);
}
/**
 * Generate signal ID
 */
function generateSignalId() {
    signalCounter++;
    return (0, deterministic_1.generateDeterministicId)(`flow-signal-${signalCounter}`);
}
/**
 * Generate producer ID
 */
function generateProducerId() {
    producerCounter++;
    return (0, deterministic_1.generateDeterministicId)(`producer-${producerCounter}`);
}
/**
 * Generate consumer ID
 */
function generateConsumerId() {
    consumerCounter++;
    return (0, deterministic_1.generateDeterministicId)(`consumer-${consumerCounter}`);
}
/**
 * Generate spill ID
 */
function generateSpillId() {
    spillCounter++;
    return (0, deterministic_1.generateDeterministicId)(`spill-${spillCounter}`);
}
/**
 * Generate event ID
 */
function generateEventId() {
    eventCounter++;
    return (0, deterministic_1.generateDeterministicId)(`bp-event-${eventCounter}`);
}
/**
 * Emit backpressure event
 */
async function emitEvent(event) {
    for (const listener of eventListeners) {
        try {
            await listener(event);
        }
        catch {
            // Ignore listener errors
        }
    }
}
/**
 * Update statistics
 */
function updateStatistics() {
    const mutableStats = statistics;
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
function calculateFillPercentage(currentSize, maxSize) {
    if (maxSize <= 0)
        return 0;
    return (currentSize / maxSize) * 100;
}
/**
 * Determine flow state based on fill percentage
 */
function determineFlowState(config, fillPercentage, currentState) {
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
function calculateItemSize(data) {
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
async function createBackpressureConfig(name, options = {}) {
    const configId = generateConfigId();
    const config = {
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
    const bufferState = {
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
function getBackpressureConfig(nameOrId) {
    return configs.get(nameOrId) ?? null;
}
/**
 * Get all backpressure configs
 */
function getAllBackpressureConfigs() {
    const uniqueConfigs = new Map();
    for (const config of configs.values()) {
        uniqueConfigs.set(config.configId, config);
    }
    return Array.from(uniqueConfigs.values());
}
/**
 * Update backpressure config
 */
function updateBackpressureConfig(nameOrId, updates) {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    const updatedConfig = {
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
async function deleteBackpressureConfig(nameOrId) {
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
async function addItem(nameOrId, data, options = {}) {
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
    const mutableStats = statistics;
    if (state.currentSize + itemSize > config.bufferSize) {
        switch (config.strategy) {
            case 'drop_oldest':
                while (buffer.length > 0 && state.currentSize + itemSize > config.bufferSize) {
                    const dropped = buffer.shift();
                    if (dropped) {
                        const newSize = state.currentSize - dropped.size;
                        const newState = {
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
            const updatedSpill = {
                ...spill,
                items: [...spill.items, ...spilledItems],
                totalSize: spill.totalSize + spilledItems.reduce((sum, item) => sum + item.size, 0),
            };
            spillStorages.set(config.configId, updatedSpill);
            const spilledSize = spilledItems.reduce((sum, item) => sum + item.size, 0);
            const newSize = state.currentSize - spilledSize;
            const newState = {
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
    const item = {
        itemId: generateItemId(),
        data,
        size: itemSize,
        timestamp: now,
        priority: options.priority ?? 0,
        metadata: options.metadata ?? {},
    };
    buffer.push(item);
    const newSize = state.currentSize + itemSize;
    const newFillPercentage = calculateFillPercentage(newSize, config.bufferSize);
    const newFlowState = determineFlowState(config, newFillPercentage, state.flowState);
    const newState = {
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
async function removeItem(nameOrId) {
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
    const item = buffer.shift();
    if (!item) {
        return null;
    }
    const newSize = state.currentSize - item.size;
    const newFillPercentage = calculateFillPercentage(newSize, config.bufferSize);
    const newFlowState = determineFlowState(config, newFillPercentage, state.flowState);
    const newState = {
        ...state,
        currentSize: newSize,
        fillPercentage: newFillPercentage,
        flowState: newFlowState,
        itemCount: buffer.length,
        lastReadTime: now,
    };
    bufferStates.set(config.configId, newState);
    const mutableStats = statistics;
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
function peekItem(nameOrId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    const buffer = buffers.get(config.configId);
    if (!buffer || buffer.length === 0) {
        return null;
    }
    return buffer[0];
}
/**
 * Clear buffer
 */
async function clearBuffer(nameOrId) {
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
    const newState = {
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
function getBufferState(nameOrId) {
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
async function registerProducer(nameOrId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    const producerId = generateProducerId();
    const producer = {
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
function getProducerState(producerId) {
    return producers.get(producerId) ?? null;
}
/**
 * Update producer state
 */
function updateProducerState(producerId, updates) {
    const producer = producers.get(producerId);
    if (!producer) {
        return null;
    }
    const updatedProducer = {
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
function unregisterProducer(producerId) {
    return producers.delete(producerId);
}
// ============================================================================
// CONSUMER MANAGEMENT
// ============================================================================
/**
 * Register consumer
 */
async function registerConsumer(nameOrId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    const consumerId = generateConsumerId();
    const consumer = {
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
function getConsumerState(consumerId) {
    return consumers.get(consumerId) ?? null;
}
/**
 * Update consumer state
 */
function updateConsumerState(consumerId, updates) {
    const consumer = consumers.get(consumerId);
    if (!consumer) {
        return null;
    }
    const updatedConsumer = {
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
function unregisterConsumer(consumerId) {
    return consumers.delete(consumerId);
}
// ============================================================================
// FLOW CONTROL
// ============================================================================
/**
 * Send flow signal
 */
async function sendFlowSignal(nameOrId, type, targetId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    const signal = {
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
function getFlowSignals(nameOrId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return [];
    }
    return flowSignals.get(config.configId) ?? [];
}
/**
 * Get current flow state
 */
function getCurrentFlowState(nameOrId) {
    const state = getBufferState(nameOrId);
    return state?.flowState ?? null;
}
// ============================================================================
// SPILL STORAGE
// ============================================================================
/**
 * Get spill storage
 */
function getSpillStorage(nameOrId) {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    return spillStorages.get(config.configId);
}
/**
 * Recover from spill
 */
async function recoverFromSpill(nameOrId, count) {
    const config = configs.get(nameOrId);
    if (!config) {
        return [];
    }
    const spill = spillStorages.get(config.configId);
    if (!spill || spill.items.length === 0) {
        return [];
    }
    const recoveredItems = spill.items.slice(0, count);
    const remainingItems = spill.items.slice(count);
    const updatedSpill = {
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
function clearSpillStorage(nameOrId) {
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
function getStatistics() {
    updateStatistics();
    return { ...statistics };
}
/**
 * Reset statistics
 */
function resetStatistics() {
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
function addEventListener(listener) {
    eventListeners.add(listener);
}
/**
 * Remove event listener
 */
function removeEventListener(listener) {
    eventListeners.delete(listener);
}
/**
 * Clear event listeners
 */
function clearEventListeners() {
    eventListeners.clear();
}
// ============================================================================
// CLEANUP
// ============================================================================
/**
 * Clear all state
 */
function clearAll() {
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
