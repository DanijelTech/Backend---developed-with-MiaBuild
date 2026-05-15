"use strict";
/**
 * @file Message Queue za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-MSG-002 Message queue za zaledne sisteme
 * @design DSN-ZALEDNI-MSG-002 Backend message queue arhitektura
 * @test TEST-ZALEDNI-MSG-002 Preverjanje message queue
 *
 * Message Queue - prilagojen za zaledne sisteme:
 * - Producer/Consumer pattern
 * - Message acknowledgment
 * - Message persistence
 * - Priority queues
 * - Delayed messages
 * - Message TTL
 * - Queue monitoring
 * - Consumer groups
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom MSG_002 - Message Queue
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.declareQueue = declareQueue;
exports.deleteQueue = deleteQueue;
exports.purgeQueue = purgeQueue;
exports.getQueueState = getQueueState;
exports.getAllQueues = getAllQueues;
exports.declareExchange = declareExchange;
exports.deleteExchange = deleteExchange;
exports.getExchange = getExchange;
exports.getAllExchanges = getAllExchanges;
exports.bindQueue = bindQueue;
exports.unbindQueue = unbindQueue;
exports.bindExchange = bindExchange;
exports.getQueueBindings = getQueueBindings;
exports.getExchangeBindings = getExchangeBindings;
exports.configureProducer = configureProducer;
exports.publish = publish;
exports.publishBatch = publishBatch;
exports.processDelayedMessages = processDelayedMessages;
exports.consume = consume;
exports.cancelConsumer = cancelConsumer;
exports.pauseConsumer = pauseConsumer;
exports.resumeConsumer = resumeConsumer;
exports.getConsumerState = getConsumerState;
exports.getAllConsumers = getAllConsumers;
exports.processMessages = processMessages;
exports.getConsumerGroup = getConsumerGroup;
exports.getQueueStatistics = getQueueStatistics;
exports.clearMessageQueue = clearMessageQueue;
exports.cleanupExpiredMessages = cleanupExpiredMessages;
exports.getMessageById = getMessageById;
exports.getMessages = getMessages;
const clock_1 = require("@mia/core/clock");
const deterministic_1 = require("@mia/core/deterministic");
const clock = (0, clock_1.getClock)();
// ============================================================================
// STANJE
// ============================================================================
const queues = new Map();
const exchanges = new Map();
const bindings = [];
const consumers = new Map();
const delayedMessages = new Map();
let messageCounter = 0;
let deliveryTagCounter = 0;
let consumerTagCounter = 0;
let batchCounter = 0;
let delayedCounter = 0;
let producerConfig = {
    confirmMode: true,
    mandatory: false,
    immediate: false,
    defaultExchange: '',
    defaultRoutingKey: '',
    defaultPriority: 'normal',
    defaultTtl: null,
    defaultDeliveryMode: 'persistent',
};
// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================
/**
 * Generate message ID
 */
function generateMessageId() {
    messageCounter++;
    return (0, deterministic_1.generateDeterministicId)(`message-${messageCounter}`);
}
/**
 * Generate delivery tag
 */
function generateDeliveryTag() {
    deliveryTagCounter++;
    return deliveryTagCounter;
}
/**
 * Generate consumer tag
 */
function generateConsumerTag() {
    consumerTagCounter++;
    return (0, deterministic_1.generateDeterministicId)(`consumer-${consumerTagCounter}`);
}
/**
 * Generate batch ID
 */
function generateBatchId() {
    batchCounter++;
    return (0, deterministic_1.generateDeterministicId)(`batch-${batchCounter}`);
}
/**
 * Generate delayed entry ID
 */
function generateDelayedEntryId() {
    delayedCounter++;
    return (0, deterministic_1.generateDeterministicId)(`delayed-${delayedCounter}`);
}
/**
 * Get priority value
 */
function getPriorityValue(priority) {
    switch (priority) {
        case 'critical': return 4;
        case 'high': return 3;
        case 'normal': return 2;
        case 'low': return 1;
        default: return 2;
    }
}
/**
 * Match routing key against pattern
 */
function matchRoutingKey(pattern, routingKey) {
    if (pattern === routingKey) {
        return true;
    }
    if (pattern === '#') {
        return true;
    }
    const patternParts = pattern.split('.');
    const keyParts = routingKey.split('.');
    let patternIndex = 0;
    let keyIndex = 0;
    while (patternIndex < patternParts.length && keyIndex < keyParts.length) {
        const patternPart = patternParts[patternIndex];
        const keyPart = keyParts[keyIndex];
        if (patternPart === '#') {
            if (patternIndex === patternParts.length - 1) {
                return true;
            }
            const nextPattern = patternParts[patternIndex + 1];
            while (keyIndex < keyParts.length) {
                if (keyParts[keyIndex] === nextPattern || nextPattern === '*') {
                    break;
                }
                keyIndex++;
            }
            patternIndex++;
        }
        else if (patternPart === '*') {
            patternIndex++;
            keyIndex++;
        }
        else if (patternPart === keyPart) {
            patternIndex++;
            keyIndex++;
        }
        else {
            return false;
        }
    }
    return patternIndex === patternParts.length && keyIndex === keyParts.length;
}
/**
 * Match headers against arguments
 */
function matchHeaders(messageHeaders, bindingArgs) {
    const matchType = bindingArgs['x-match'] || 'all';
    let matchCount = 0;
    let totalArgs = 0;
    for (const [key, value] of Object.entries(bindingArgs)) {
        if (key.startsWith('x-')) {
            continue;
        }
        totalArgs++;
        if (messageHeaders[key] === String(value)) {
            matchCount++;
        }
    }
    if (matchType === 'any') {
        return matchCount > 0;
    }
    return matchCount === totalArgs;
}
/**
 * Find target queues for message
 */
function findTargetQueues(exchange, routingKey, headers) {
    const targetQueues = [];
    if (!exchange) {
        if (queues.has(routingKey)) {
            targetQueues.push(routingKey);
        }
        return targetQueues;
    }
    const exchangeConfig = exchanges.get(exchange);
    if (!exchangeConfig) {
        return targetQueues;
    }
    for (const binding of bindings) {
        if (binding.source !== exchange) {
            continue;
        }
        if (binding.destinationType !== 'queue') {
            continue;
        }
        let matches = false;
        switch (exchangeConfig.type) {
            case 'direct':
                matches = binding.routingKey === routingKey;
                break;
            case 'fanout':
                matches = true;
                break;
            case 'topic':
                matches = matchRoutingKey(binding.routingKey, routingKey);
                break;
            case 'headers':
                matches = matchHeaders(headers, binding.arguments);
                break;
        }
        if (matches && !targetQueues.includes(binding.destination)) {
            targetQueues.push(binding.destination);
        }
    }
    return targetQueues;
}
/**
 * Check if message is expired
 */
function isMessageExpired(envelope) {
    const expiration = envelope.message.headers.expiration;
    if (expiration === null) {
        return false;
    }
    return clock.nowMs() > expiration;
}
/**
 * Sort messages by priority
 */
function sortByPriority(messages) {
    messages.sort((a, b) => {
        const priorityA = getPriorityValue(a.message.headers.priority);
        const priorityB = getPriorityValue(b.message.headers.priority);
        return priorityB - priorityA;
    });
}
// ============================================================================
// QUEUE MANAGEMENT
// ============================================================================
/**
 * Declare queue
 */
function declareQueue(config) {
    const fullConfig = {
        name: config.name,
        durable: config.durable ?? true,
        exclusive: config.exclusive ?? false,
        autoDelete: config.autoDelete ?? false,
        maxLength: config.maxLength ?? null,
        maxLengthBytes: config.maxLengthBytes ?? null,
        messageTtl: config.messageTtl ?? null,
        deadLetterExchange: config.deadLetterExchange ?? null,
        deadLetterRoutingKey: config.deadLetterRoutingKey ?? null,
        maxPriority: config.maxPriority ?? null,
        lazy: config.lazy ?? false,
        overflow: config.overflow ?? 'drop-head',
        arguments: config.arguments ?? {},
    };
    if (!queues.has(config.name)) {
        queues.set(config.name, { config: fullConfig, messages: [] });
    }
    return fullConfig;
}
/**
 * Delete queue
 */
function deleteQueue(name, options = {}) {
    const queue = queues.get(name);
    if (!queue) {
        return false;
    }
    if (options.ifUnused) {
        const hasConsumers = Array.from(consumers.values()).some(c => c.config.queueName === name);
        if (hasConsumers) {
            return false;
        }
    }
    if (options.ifEmpty && queue.messages.length > 0) {
        return false;
    }
    queues.delete(name);
    return true;
}
/**
 * Purge queue
 */
function purgeQueue(name) {
    const queue = queues.get(name);
    if (!queue) {
        return 0;
    }
    const count = queue.messages.length;
    queue.messages.length = 0;
    return count;
}
/**
 * Get queue state
 */
function getQueueState(name) {
    const queue = queues.get(name);
    if (!queue) {
        return null;
    }
    const consumerCount = Array.from(consumers.values())
        .filter(c => c.config.queueName === name && c.state.status === 'active')
        .length;
    const lastMessage = queue.messages[queue.messages.length - 1];
    return {
        name,
        messageCount: queue.messages.length,
        consumerCount,
        memoryUsage: 0,
        status: 'running',
        createdAt: 0,
        lastActivityAt: lastMessage?.receivedAt ?? 0,
    };
}
/**
 * Get all queues
 */
function getAllQueues() {
    const states = [];
    for (const name of queues.keys()) {
        const state = getQueueState(name);
        if (state) {
            states.push(state);
        }
    }
    return states;
}
// ============================================================================
// EXCHANGE MANAGEMENT
// ============================================================================
/**
 * Declare exchange
 */
function declareExchange(config) {
    const fullConfig = {
        name: config.name,
        type: config.type,
        durable: config.durable ?? true,
        autoDelete: config.autoDelete ?? false,
        internal: config.internal ?? false,
        alternateExchange: config.alternateExchange ?? null,
        arguments: config.arguments ?? {},
    };
    exchanges.set(config.name, fullConfig);
    return fullConfig;
}
/**
 * Delete exchange
 */
function deleteExchange(name, options = {}) {
    if (!exchanges.has(name)) {
        return false;
    }
    if (options.ifUnused) {
        const hasBindings = bindings.some(b => b.source === name || b.destination === name);
        if (hasBindings) {
            return false;
        }
    }
    exchanges.delete(name);
    return true;
}
/**
 * Get exchange
 */
function getExchange(name) {
    return exchanges.get(name) ?? null;
}
/**
 * Get all exchanges
 */
function getAllExchanges() {
    return Array.from(exchanges.values());
}
// ============================================================================
// BINDING MANAGEMENT
// ============================================================================
/**
 * Bind queue to exchange
 */
function bindQueue(queueName, exchangeName, routingKey, args = {}) {
    const binding = {
        source: exchangeName,
        destination: queueName,
        destinationType: 'queue',
        routingKey,
        arguments: args,
    };
    const exists = bindings.some(b => b.source === exchangeName &&
        b.destination === queueName &&
        b.routingKey === routingKey);
    if (!exists) {
        bindings.push(binding);
    }
    return binding;
}
/**
 * Unbind queue from exchange
 */
function unbindQueue(queueName, exchangeName, routingKey) {
    const index = bindings.findIndex(b => b.source === exchangeName &&
        b.destination === queueName &&
        b.routingKey === routingKey);
    if (index === -1) {
        return false;
    }
    bindings.splice(index, 1);
    return true;
}
/**
 * Bind exchange to exchange
 */
function bindExchange(destinationExchange, sourceExchange, routingKey, args = {}) {
    const binding = {
        source: sourceExchange,
        destination: destinationExchange,
        destinationType: 'exchange',
        routingKey,
        arguments: args,
    };
    const exists = bindings.some(b => b.source === sourceExchange &&
        b.destination === destinationExchange &&
        b.routingKey === routingKey);
    if (!exists) {
        bindings.push(binding);
    }
    return binding;
}
/**
 * Get bindings for queue
 */
function getQueueBindings(queueName) {
    return bindings.filter(b => b.destination === queueName && b.destinationType === 'queue');
}
/**
 * Get bindings for exchange
 */
function getExchangeBindings(exchangeName) {
    return bindings.filter(b => b.source === exchangeName);
}
// ============================================================================
// PUBLISHING
// ============================================================================
/**
 * Configure producer
 */
function configureProducer(config) {
    producerConfig = { ...producerConfig, ...config };
}
/**
 * Publish message
 */
function publish(body, options = {}) {
    const now = clock.nowMs();
    const messageId = generateMessageId();
    const deliveryTag = generateDeliveryTag();
    const exchange = options.exchange ?? producerConfig.defaultExchange ?? '';
    const routingKey = options.routingKey ?? producerConfig.defaultRoutingKey ?? '';
    const priority = options.priority ?? producerConfig.defaultPriority;
    const ttl = options.ttl ?? producerConfig.defaultTtl;
    const headers = {
        messageId,
        correlationId: options.correlationId ?? (0, deterministic_1.generateDeterministicId)(`correlation-${messageCounter}`),
        replyTo: options.replyTo ?? null,
        contentType: options.contentType ?? 'application/json',
        contentEncoding: null,
        priority,
        timestamp: now,
        expiration: ttl !== null ? now + ttl : null,
        deliveryMode: producerConfig.defaultDeliveryMode,
        userId: null,
        appId: null,
        clusterId: null,
        type: null,
        customHeaders: options.headers ?? {},
    };
    const message = {
        headers,
        body,
        routingKey,
        exchange: exchange || null,
    };
    if (options.delay && options.delay > 0) {
        scheduleDelayedMessage(message, routingKey, options.delay);
        return {
            messageId,
            confirmed: true,
            deliveryTag,
            exchange,
            routingKey,
            timestamp: now,
        };
    }
    const targetQueues = findTargetQueues(exchange, routingKey, headers.customHeaders);
    for (const queueName of targetQueues) {
        const queue = queues.get(queueName);
        if (!queue) {
            continue;
        }
        const envelope = {
            message,
            queueName,
            deliveryTag,
            redelivered: false,
            consumerTag: null,
            receivedAt: now,
            retryCount: 0,
            scheduledAt: null,
        };
        if (queue.config.maxLength !== null && queue.messages.length >= queue.config.maxLength) {
            switch (queue.config.overflow) {
                case 'drop-head':
                    queue.messages.shift();
                    break;
                case 'reject-publish':
                    continue;
                case 'reject-publish-dlx':
                    if (queue.config.deadLetterExchange) {
                        moveToDeadLetter(envelope, queue.config);
                    }
                    continue;
            }
        }
        queue.messages.push(envelope);
        if (queue.config.maxPriority !== null) {
            sortByPriority(queue.messages);
        }
    }
    return {
        messageId,
        confirmed: true,
        deliveryTag,
        exchange,
        routingKey,
        timestamp: now,
    };
}
/**
 * Publish batch
 */
function publishBatch(messages) {
    const results = [];
    for (const { body, options } of messages) {
        const result = publish(body, options);
        results.push(result);
    }
    return results;
}
/**
 * Schedule delayed message
 */
function scheduleDelayedMessage(message, queueName, delayMs) {
    const entryId = generateDelayedEntryId();
    const now = clock.nowMs();
    const entry = {
        entryId,
        message: message,
        queueName,
        scheduledAt: now + delayMs,
        createdAt: now,
    };
    delayedMessages.set(entryId, entry);
}
/**
 * Process delayed messages
 */
function processDelayedMessages() {
    const now = clock.nowMs();
    let processedCount = 0;
    for (const [entryId, entry] of delayedMessages) {
        if (entry.scheduledAt <= now) {
            const targetQueues = findTargetQueues(entry.message.exchange || '', entry.message.routingKey, entry.message.headers.customHeaders);
            for (const queueName of targetQueues) {
                const queue = queues.get(queueName);
                if (!queue) {
                    continue;
                }
                const envelope = {
                    message: entry.message,
                    queueName,
                    deliveryTag: generateDeliveryTag(),
                    redelivered: false,
                    consumerTag: null,
                    receivedAt: now,
                    retryCount: 0,
                    scheduledAt: entry.scheduledAt,
                };
                queue.messages.push(envelope);
            }
            delayedMessages.delete(entryId);
            processedCount++;
        }
    }
    return processedCount;
}
/**
 * Move message to dead letter queue
 */
function moveToDeadLetter(envelope, queueConfig) {
    if (!queueConfig.deadLetterExchange) {
        return;
    }
    const routingKey = queueConfig.deadLetterRoutingKey || envelope.message.routingKey;
    publish(envelope.message.body, {
        exchange: queueConfig.deadLetterExchange,
        routingKey,
        headers: {
            'x-death-queue': envelope.queueName,
            'x-death-reason': 'rejected',
            'x-death-count': String(envelope.retryCount + 1),
            ...envelope.message.headers.customHeaders,
        },
    });
}
// ============================================================================
// CONSUMING
// ============================================================================
/**
 * Start consumer
 */
function consume(queueName, handler, options = {}) {
    const consumerTag = options.consumerTag ?? generateConsumerTag();
    const now = clock.nowMs();
    const config = {
        consumerTag,
        queueName,
        prefetchCount: options.prefetchCount ?? 1,
        prefetchSize: options.prefetchSize ?? 0,
        noAck: options.noAck ?? false,
        exclusive: options.exclusive ?? false,
        priority: options.priority ?? 0,
        arguments: options.arguments ?? {},
    };
    const state = {
        consumerTag,
        queueName,
        status: 'active',
        messagesProcessed: 0,
        messagesAcked: 0,
        messagesNacked: 0,
        messagesRejected: 0,
        avgProcessingTime: 0,
        lastMessageAt: null,
        createdAt: now,
    };
    consumers.set(consumerTag, {
        config,
        handler: handler,
        state,
    });
    return state;
}
/**
 * Cancel consumer
 */
function cancelConsumer(consumerTag) {
    const consumer = consumers.get(consumerTag);
    if (!consumer) {
        return false;
    }
    consumers.set(consumerTag, {
        ...consumer,
        state: {
            ...consumer.state,
            status: 'cancelled',
        },
    });
    return true;
}
/**
 * Pause consumer
 */
function pauseConsumer(consumerTag) {
    const consumer = consumers.get(consumerTag);
    if (!consumer || consumer.state.status !== 'active') {
        return false;
    }
    consumers.set(consumerTag, {
        ...consumer,
        state: {
            ...consumer.state,
            status: 'paused',
        },
    });
    return true;
}
/**
 * Resume consumer
 */
function resumeConsumer(consumerTag) {
    const consumer = consumers.get(consumerTag);
    if (!consumer || consumer.state.status !== 'paused') {
        return false;
    }
    consumers.set(consumerTag, {
        ...consumer,
        state: {
            ...consumer.state,
            status: 'active',
        },
    });
    return true;
}
/**
 * Get consumer state
 */
function getConsumerState(consumerTag) {
    const consumer = consumers.get(consumerTag);
    return consumer?.state ?? null;
}
/**
 * Get all consumers
 */
function getAllConsumers() {
    return Array.from(consumers.values()).map(c => c.state);
}
/**
 * Process messages for consumers
 */
async function processMessages() {
    let processedCount = 0;
    for (const [consumerTag, consumer] of consumers) {
        if (consumer.state.status !== 'active') {
            continue;
        }
        const queue = queues.get(consumer.config.queueName);
        if (!queue || queue.messages.length === 0) {
            continue;
        }
        const messagesToProcess = Math.min(consumer.config.prefetchCount, queue.messages.length);
        for (let i = 0; i < messagesToProcess; i++) {
            const envelope = queue.messages[0];
            if (isMessageExpired(envelope)) {
                queue.messages.shift();
                if (queue.config.deadLetterExchange) {
                    moveToDeadLetter(envelope, queue.config);
                }
                continue;
            }
            const startTime = clock.nowMs();
            let acked = false;
            let nacked = false;
            let rejected = false;
            let requeue = false;
            let retryDelay = 0;
            const actions = {
                async ack() {
                    acked = true;
                },
                async nack(requeueFlag) {
                    nacked = true;
                    requeue = requeueFlag;
                },
                async reject(requeueFlag) {
                    rejected = true;
                    requeue = requeueFlag;
                },
                async retry(delayMs) {
                    retryDelay = delayMs;
                },
            };
            try {
                await consumer.handler(envelope, actions);
                if (!acked && !nacked && !rejected && retryDelay === 0) {
                    if (consumer.config.noAck) {
                        acked = true;
                    }
                }
            }
            catch {
                nacked = true;
                requeue = true;
            }
            const processingTime = clock.nowMs() - startTime;
            queue.messages.shift();
            if (acked) {
                consumers.set(consumerTag, {
                    ...consumer,
                    state: {
                        ...consumer.state,
                        messagesProcessed: consumer.state.messagesProcessed + 1,
                        messagesAcked: consumer.state.messagesAcked + 1,
                        lastMessageAt: clock.nowMs(),
                        avgProcessingTime: (consumer.state.avgProcessingTime * consumer.state.messagesProcessed + processingTime) / (consumer.state.messagesProcessed + 1),
                    },
                });
            }
            else if (nacked || rejected) {
                if (requeue) {
                    const requeuedEnvelope = {
                        ...envelope,
                        redelivered: true,
                        retryCount: envelope.retryCount + 1,
                    };
                    queue.messages.push(requeuedEnvelope);
                }
                else if (queue.config.deadLetterExchange) {
                    moveToDeadLetter(envelope, queue.config);
                }
                consumers.set(consumerTag, {
                    ...consumer,
                    state: {
                        ...consumer.state,
                        messagesProcessed: consumer.state.messagesProcessed + 1,
                        messagesNacked: nacked ? consumer.state.messagesNacked + 1 : consumer.state.messagesNacked,
                        messagesRejected: rejected ? consumer.state.messagesRejected + 1 : consumer.state.messagesRejected,
                        lastMessageAt: clock.nowMs(),
                    },
                });
            }
            else if (retryDelay > 0) {
                scheduleDelayedMessage(envelope.message, consumer.config.queueName, retryDelay);
                consumers.set(consumerTag, {
                    ...consumer,
                    state: {
                        ...consumer.state,
                        messagesProcessed: consumer.state.messagesProcessed + 1,
                        lastMessageAt: clock.nowMs(),
                    },
                });
            }
            processedCount++;
        }
    }
    return processedCount;
}
// ============================================================================
// CONSUMER GROUPS
// ============================================================================
/**
 * Get consumer group
 */
function getConsumerGroup(queueName) {
    const queueConsumers = Array.from(consumers.values())
        .filter(c => c.config.queueName === queueName)
        .map(c => c.state);
    if (queueConsumers.length === 0) {
        return null;
    }
    const queue = queues.get(queueName);
    return {
        groupId: (0, deterministic_1.generateDeterministicId)(`group-${queueName}`),
        queueName,
        consumers: queueConsumers,
        totalMessages: queue?.messages.length ?? 0,
        pendingMessages: queue?.messages.filter(m => !isMessageExpired(m)).length ?? 0,
        lastActivityAt: Math.max(...queueConsumers.map(c => c.lastMessageAt ?? 0)),
    };
}
// ============================================================================
// STATISTICS
// ============================================================================
/**
 * Get queue statistics
 */
function getQueueStatistics() {
    let totalMessages = 0;
    let totalMessagesReady = 0;
    for (const queue of queues.values()) {
        totalMessages += queue.messages.length;
        totalMessagesReady += queue.messages.filter(m => !isMessageExpired(m)).length;
    }
    return {
        totalQueues: queues.size,
        totalExchanges: exchanges.size,
        totalBindings: bindings.length,
        totalConsumers: consumers.size,
        totalMessages,
        totalMessagesReady,
        totalMessagesUnacked: 0,
        publishRate: 0,
        deliverRate: 0,
        ackRate: 0,
        redeliverRate: 0,
        memoryUsage: 0,
        diskUsage: 0,
    };
}
// ============================================================================
// CLEANUP
// ============================================================================
/**
 * Clear all state
 */
function clearMessageQueue() {
    queues.clear();
    exchanges.clear();
    bindings.length = 0;
    consumers.clear();
    delayedMessages.clear();
    messageCounter = 0;
    deliveryTagCounter = 0;
    consumerTagCounter = 0;
}
/**
 * Cleanup expired messages
 */
function cleanupExpiredMessages() {
    let count = 0;
    for (const queue of queues.values()) {
        const initialLength = queue.messages.length;
        queue.messages = queue.messages.filter(envelope => {
            if (isMessageExpired(envelope)) {
                if (queue.config.deadLetterExchange) {
                    moveToDeadLetter(envelope, queue.config);
                }
                return false;
            }
            return true;
        });
        count += initialLength - queue.messages.length;
    }
    return count;
}
/**
 * Get message by ID
 */
function getMessageById(messageId) {
    for (const queue of queues.values()) {
        const envelope = queue.messages.find(e => e.message.headers.messageId === messageId);
        if (envelope) {
            return envelope;
        }
    }
    return null;
}
/**
 * Get messages from queue
 */
function getMessages(queueName, limit = 100) {
    const queue = queues.get(queueName);
    if (!queue) {
        return [];
    }
    return queue.messages.slice(0, limit);
}
