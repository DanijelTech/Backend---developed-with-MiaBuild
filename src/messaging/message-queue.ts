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

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI ZA MESSAGE QUEUE
// ============================================================================

/**
 * Message priority
 */
export type MessagePriority = 'critical' | 'high' | 'normal' | 'low';

/**
 * Message status
 */
export type MessageStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired' | 'dead_letter';

/**
 * Message headers
 */
export interface MessageHeaders {
    readonly messageId: string;
    readonly correlationId: string;
    readonly replyTo: string | null;
    readonly contentType: string;
    readonly contentEncoding: string | null;
    readonly priority: MessagePriority;
    readonly timestamp: number;
    readonly expiration: number | null;
    readonly deliveryMode: 'persistent' | 'transient';
    readonly userId: string | null;
    readonly appId: string | null;
    readonly clusterId: string | null;
    readonly type: string | null;
    readonly customHeaders: Readonly<Record<string, string>>;
}

/**
 * Message
 */
export interface Message<T = unknown> {
    readonly headers: MessageHeaders;
    readonly body: T;
    readonly routingKey: string;
    readonly exchange: string | null;
}

/**
 * Message envelope
 */
export interface MessageEnvelope<T = unknown> {
    readonly message: Message<T>;
    readonly queueName: string;
    readonly deliveryTag: number;
    readonly redelivered: boolean;
    readonly consumerTag: string | null;
    readonly receivedAt: number;
    readonly retryCount: number;
    readonly scheduledAt: number | null;
}

/**
 * Queue configuration
 */
export interface QueueConfig {
    readonly name: string;
    readonly durable: boolean;
    readonly exclusive: boolean;
    readonly autoDelete: boolean;
    readonly maxLength: number | null;
    readonly maxLengthBytes: number | null;
    readonly messageTtl: number | null;
    readonly deadLetterExchange: string | null;
    readonly deadLetterRoutingKey: string | null;
    readonly maxPriority: number | null;
    readonly lazy: boolean;
    readonly overflow: 'drop-head' | 'reject-publish' | 'reject-publish-dlx';
    readonly arguments: Readonly<Record<string, unknown>>;
}

/**
 * Queue state
 */
export interface QueueState {
    readonly name: string;
    readonly messageCount: number;
    readonly consumerCount: number;
    readonly memoryUsage: number;
    readonly status: 'running' | 'idle' | 'flow' | 'down';
    readonly createdAt: number;
    readonly lastActivityAt: number;
}

/**
 * Exchange type
 */
export type ExchangeType = 'direct' | 'fanout' | 'topic' | 'headers';

/**
 * Exchange configuration
 */
export interface ExchangeConfig {
    readonly name: string;
    readonly type: ExchangeType;
    readonly durable: boolean;
    readonly autoDelete: boolean;
    readonly internal: boolean;
    readonly alternateExchange: string | null;
    readonly arguments: Readonly<Record<string, unknown>>;
}

/**
 * Binding
 */
export interface Binding {
    readonly source: string;
    readonly destination: string;
    readonly destinationType: 'queue' | 'exchange';
    readonly routingKey: string;
    readonly arguments: Readonly<Record<string, unknown>>;
}

/**
 * Consumer configuration
 */
export interface ConsumerConfig {
    readonly consumerTag: string;
    readonly queueName: string;
    readonly prefetchCount: number;
    readonly prefetchSize: number;
    readonly noAck: boolean;
    readonly exclusive: boolean;
    readonly priority: number;
    readonly arguments: Readonly<Record<string, unknown>>;
}

/**
 * Consumer handler
 */
export type ConsumerHandler<T = unknown> = (
    envelope: MessageEnvelope<T>,
    actions: ConsumerActions
) => Promise<void>;

/**
 * Consumer actions
 */
export interface ConsumerActions {
    ack(): Promise<void>;
    nack(requeue: boolean): Promise<void>;
    reject(requeue: boolean): Promise<void>;
    retry(delayMs: number): Promise<void>;
}

/**
 * Consumer state
 */
export interface ConsumerState {
    readonly consumerTag: string;
    readonly queueName: string;
    readonly status: 'active' | 'paused' | 'cancelled';
    readonly messagesProcessed: number;
    readonly messagesAcked: number;
    readonly messagesNacked: number;
    readonly messagesRejected: number;
    readonly avgProcessingTime: number;
    readonly lastMessageAt: number | null;
    readonly createdAt: number;
}

/**
 * Producer configuration
 */
export interface ProducerConfig {
    readonly confirmMode: boolean;
    readonly mandatory: boolean;
    readonly immediate: boolean;
    readonly defaultExchange: string | null;
    readonly defaultRoutingKey: string | null;
    readonly defaultPriority: MessagePriority;
    readonly defaultTtl: number | null;
    readonly defaultDeliveryMode: 'persistent' | 'transient';
}

/**
 * Publish options
 */
export interface PublishOptions {
    readonly exchange?: string;
    readonly routingKey?: string;
    readonly priority?: MessagePriority;
    readonly ttl?: number;
    readonly delay?: number;
    readonly correlationId?: string;
    readonly replyTo?: string;
    readonly contentType?: string;
    readonly headers?: Record<string, string>;
    readonly mandatory?: boolean;
    readonly immediate?: boolean;
}

/**
 * Publish result
 */
export interface PublishResult {
    readonly messageId: string;
    readonly confirmed: boolean;
    readonly deliveryTag: number;
    readonly exchange: string;
    readonly routingKey: string;
    readonly timestamp: number;
}

/**
 * Consumer group
 */
export interface ConsumerGroup {
    readonly groupId: string;
    readonly queueName: string;
    readonly consumers: readonly ConsumerState[];
    readonly totalMessages: number;
    readonly pendingMessages: number;
    readonly lastActivityAt: number;
}

/**
 * Queue statistics
 */
export interface QueueStatistics {
    readonly totalQueues: number;
    readonly totalExchanges: number;
    readonly totalBindings: number;
    readonly totalConsumers: number;
    readonly totalMessages: number;
    readonly totalMessagesReady: number;
    readonly totalMessagesUnacked: number;
    readonly publishRate: number;
    readonly deliverRate: number;
    readonly ackRate: number;
    readonly redeliverRate: number;
    readonly memoryUsage: number;
    readonly diskUsage: number;
}

/**
 * Delayed message entry
 */
export interface DelayedMessageEntry {
    readonly entryId: string;
    readonly message: Message;
    readonly queueName: string;
    readonly scheduledAt: number;
    readonly createdAt: number;
}

/**
 * Message batch
 */
export interface MessageBatch<T = unknown> {
    readonly batchId: string;
    readonly messages: readonly Message<T>[];
    readonly queueName: string;
    readonly createdAt: number;
}

// ============================================================================
// STANJE
// ============================================================================

const queues: Map<string, { config: QueueConfig; messages: MessageEnvelope[] }> = new Map();
const exchanges: Map<string, ExchangeConfig> = new Map();
const bindings: Binding[] = [];
const consumers: Map<string, { config: ConsumerConfig; handler: ConsumerHandler; state: ConsumerState }> = new Map();
const delayedMessages: Map<string, DelayedMessageEntry> = new Map();

let messageCounter = 0;
let deliveryTagCounter = 0;
let consumerTagCounter = 0;
let batchCounter = 0;
let delayedCounter = 0;

let producerConfig: ProducerConfig = {
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
function generateMessageId(): string {
    messageCounter++;
    return generateDeterministicId(`message-${messageCounter}`);
}

/**
 * Generate delivery tag
 */
function generateDeliveryTag(): number {
    deliveryTagCounter++;
    return deliveryTagCounter;
}

/**
 * Generate consumer tag
 */
function generateConsumerTag(): string {
    consumerTagCounter++;
    return generateDeterministicId(`consumer-${consumerTagCounter}`);
}

/**
 * Generate batch ID
 */
function generateBatchId(): string {
    batchCounter++;
    return generateDeterministicId(`batch-${batchCounter}`);
}

/**
 * Generate delayed entry ID
 */
function generateDelayedEntryId(): string {
    delayedCounter++;
    return generateDeterministicId(`delayed-${delayedCounter}`);
}

/**
 * Get priority value
 */
function getPriorityValue(priority: MessagePriority): number {
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
function matchRoutingKey(pattern: string, routingKey: string): boolean {
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
        } else if (patternPart === '*') {
            patternIndex++;
            keyIndex++;
        } else if (patternPart === keyPart) {
            patternIndex++;
            keyIndex++;
        } else {
            return false;
        }
    }
    
    return patternIndex === patternParts.length && keyIndex === keyParts.length;
}

/**
 * Match headers against arguments
 */
function matchHeaders(
    messageHeaders: Readonly<Record<string, string>>,
    bindingArgs: Readonly<Record<string, unknown>>
): boolean {
    const matchType = bindingArgs['x-match'] as string || 'all';
    
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
function findTargetQueues(exchange: string, routingKey: string, headers: Readonly<Record<string, string>>): string[] {
    const targetQueues: string[] = [];
    
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
function isMessageExpired(envelope: MessageEnvelope): boolean {
    const expiration = envelope.message.headers.expiration;
    if (expiration === null) {
        return false;
    }
    return clock.nowMs() > expiration;
}

/**
 * Sort messages by priority
 */
function sortByPriority(messages: MessageEnvelope[]): void {
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
export function declareQueue(config: Partial<QueueConfig> & { name: string }): QueueConfig {
    const fullConfig: QueueConfig = {
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
export function deleteQueue(name: string, options: { ifUnused?: boolean; ifEmpty?: boolean } = {}): boolean {
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
export function purgeQueue(name: string): number {
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
export function getQueueState(name: string): QueueState | null {
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
export function getAllQueues(): readonly QueueState[] {
    const states: QueueState[] = [];
    
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
export function declareExchange(config: Partial<ExchangeConfig> & { name: string; type: ExchangeType }): ExchangeConfig {
    const fullConfig: ExchangeConfig = {
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
export function deleteExchange(name: string, options: { ifUnused?: boolean } = {}): boolean {
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
export function getExchange(name: string): ExchangeConfig | null {
    return exchanges.get(name) ?? null;
}

/**
 * Get all exchanges
 */
export function getAllExchanges(): readonly ExchangeConfig[] {
    return Array.from(exchanges.values());
}

// ============================================================================
// BINDING MANAGEMENT
// ============================================================================

/**
 * Bind queue to exchange
 */
export function bindQueue(
    queueName: string,
    exchangeName: string,
    routingKey: string,
    args: Record<string, unknown> = {}
): Binding {
    const binding: Binding = {
        source: exchangeName,
        destination: queueName,
        destinationType: 'queue',
        routingKey,
        arguments: args,
    };
    
    const exists = bindings.some(
        b => b.source === exchangeName &&
             b.destination === queueName &&
             b.routingKey === routingKey
    );
    
    if (!exists) {
        bindings.push(binding);
    }
    
    return binding;
}

/**
 * Unbind queue from exchange
 */
export function unbindQueue(
    queueName: string,
    exchangeName: string,
    routingKey: string
): boolean {
    const index = bindings.findIndex(
        b => b.source === exchangeName &&
             b.destination === queueName &&
             b.routingKey === routingKey
    );
    
    if (index === -1) {
        return false;
    }
    
    bindings.splice(index, 1);
    
    return true;
}

/**
 * Bind exchange to exchange
 */
export function bindExchange(
    destinationExchange: string,
    sourceExchange: string,
    routingKey: string,
    args: Record<string, unknown> = {}
): Binding {
    const binding: Binding = {
        source: sourceExchange,
        destination: destinationExchange,
        destinationType: 'exchange',
        routingKey,
        arguments: args,
    };
    
    const exists = bindings.some(
        b => b.source === sourceExchange &&
             b.destination === destinationExchange &&
             b.routingKey === routingKey
    );
    
    if (!exists) {
        bindings.push(binding);
    }
    
    return binding;
}

/**
 * Get bindings for queue
 */
export function getQueueBindings(queueName: string): readonly Binding[] {
    return bindings.filter(b => b.destination === queueName && b.destinationType === 'queue');
}

/**
 * Get bindings for exchange
 */
export function getExchangeBindings(exchangeName: string): readonly Binding[] {
    return bindings.filter(b => b.source === exchangeName);
}

// ============================================================================
// PUBLISHING
// ============================================================================

/**
 * Configure producer
 */
export function configureProducer(config: Partial<ProducerConfig>): void {
    producerConfig = { ...producerConfig, ...config };
}

/**
 * Publish message
 */
export function publish<T>(body: T, options: PublishOptions = {}): PublishResult {
    const now = clock.nowMs();
    const messageId = generateMessageId();
    const deliveryTag = generateDeliveryTag();
    
    const exchange = options.exchange ?? producerConfig.defaultExchange ?? '';
    const routingKey = options.routingKey ?? producerConfig.defaultRoutingKey ?? '';
    const priority = options.priority ?? producerConfig.defaultPriority;
    const ttl = options.ttl ?? producerConfig.defaultTtl;
    
    const headers: MessageHeaders = {
        messageId,
        correlationId: options.correlationId ?? generateDeterministicId(`correlation-${messageCounter}`),
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
    
    const message: Message<T> = {
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
        
        const envelope: MessageEnvelope<T> = {
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
                        moveToDeadLetter(envelope as MessageEnvelope, queue.config);
                    }
                    continue;
            }
        }
        
        queue.messages.push(envelope as MessageEnvelope);
        
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
export function publishBatch<T>(messages: readonly { body: T; options?: PublishOptions }[]): readonly PublishResult[] {
    const results: PublishResult[] = [];
    
    for (const { body, options } of messages) {
        const result = publish(body, options);
        results.push(result);
    }
    
    return results;
}

/**
 * Schedule delayed message
 */
function scheduleDelayedMessage<T>(message: Message<T>, queueName: string, delayMs: number): void {
    const entryId = generateDelayedEntryId();
    const now = clock.nowMs();
    
    const entry: DelayedMessageEntry = {
        entryId,
        message: message as Message,
        queueName,
        scheduledAt: now + delayMs,
        createdAt: now,
    };
    
    delayedMessages.set(entryId, entry);
}

/**
 * Process delayed messages
 */
export function processDelayedMessages(): number {
    const now = clock.nowMs();
    let processedCount = 0;
    
    for (const [entryId, entry] of delayedMessages) {
        if (entry.scheduledAt <= now) {
            const targetQueues = findTargetQueues(
                entry.message.exchange || '',
                entry.message.routingKey,
                entry.message.headers.customHeaders
            );
            
            for (const queueName of targetQueues) {
                const queue = queues.get(queueName);
                if (!queue) {
                    continue;
                }
                
                const envelope: MessageEnvelope = {
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
function moveToDeadLetter(envelope: MessageEnvelope, queueConfig: QueueConfig): void {
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
export function consume<T>(
    queueName: string,
    handler: ConsumerHandler<T>,
    options: Partial<ConsumerConfig> = {}
): ConsumerState {
    const consumerTag = options.consumerTag ?? generateConsumerTag();
    const now = clock.nowMs();
    
    const config: ConsumerConfig = {
        consumerTag,
        queueName,
        prefetchCount: options.prefetchCount ?? 1,
        prefetchSize: options.prefetchSize ?? 0,
        noAck: options.noAck ?? false,
        exclusive: options.exclusive ?? false,
        priority: options.priority ?? 0,
        arguments: options.arguments ?? {},
    };
    
    const state: ConsumerState = {
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
        handler: handler as ConsumerHandler,
        state,
    });
    
    return state;
}

/**
 * Cancel consumer
 */
export function cancelConsumer(consumerTag: string): boolean {
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
export function pauseConsumer(consumerTag: string): boolean {
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
export function resumeConsumer(consumerTag: string): boolean {
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
export function getConsumerState(consumerTag: string): ConsumerState | null {
    const consumer = consumers.get(consumerTag);
    return consumer?.state ?? null;
}

/**
 * Get all consumers
 */
export function getAllConsumers(): readonly ConsumerState[] {
    return Array.from(consumers.values()).map(c => c.state);
}

/**
 * Process messages for consumers
 */
export async function processMessages(): Promise<number> {
    let processedCount = 0;
    
    for (const [consumerTag, consumer] of consumers) {
        if (consumer.state.status !== 'active') {
            continue;
        }
        
        const queue = queues.get(consumer.config.queueName);
        if (!queue || queue.messages.length === 0) {
            continue;
        }
        
        const messagesToProcess = Math.min(
            consumer.config.prefetchCount,
            queue.messages.length
        );
        
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
            
            const actions: ConsumerActions = {
                async ack(): Promise<void> {
                    acked = true;
                },
                async nack(requeueFlag: boolean): Promise<void> {
                    nacked = true;
                    requeue = requeueFlag;
                },
                async reject(requeueFlag: boolean): Promise<void> {
                    rejected = true;
                    requeue = requeueFlag;
                },
                async retry(delayMs: number): Promise<void> {
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
            } catch {
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
            } else if (nacked || rejected) {
                if (requeue) {
                    const requeuedEnvelope: MessageEnvelope = {
                        ...envelope,
                        redelivered: true,
                        retryCount: envelope.retryCount + 1,
                    };
                    queue.messages.push(requeuedEnvelope);
                } else if (queue.config.deadLetterExchange) {
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
            } else if (retryDelay > 0) {
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
export function getConsumerGroup(queueName: string): ConsumerGroup | null {
    const queueConsumers = Array.from(consumers.values())
        .filter(c => c.config.queueName === queueName)
        .map(c => c.state);
    
    if (queueConsumers.length === 0) {
        return null;
    }
    
    const queue = queues.get(queueName);
    
    return {
        groupId: generateDeterministicId(`group-${queueName}`),
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
export function getQueueStatistics(): QueueStatistics {
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
export function clearMessageQueue(): void {
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
export function cleanupExpiredMessages(): number {
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
export function getMessageById(messageId: string): MessageEnvelope | null {
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
export function getMessages(queueName: string, limit: number = 100): readonly MessageEnvelope[] {
    const queue = queues.get(queueName);
    if (!queue) {
        return [];
    }
    return queue.messages.slice(0, limit);
}
