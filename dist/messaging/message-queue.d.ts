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
export type ConsumerHandler<T = unknown> = (envelope: MessageEnvelope<T>, actions: ConsumerActions) => Promise<void>;
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
/**
 * Declare queue
 */
export declare function declareQueue(config: Partial<QueueConfig> & {
    name: string;
}): QueueConfig;
/**
 * Delete queue
 */
export declare function deleteQueue(name: string, options?: {
    ifUnused?: boolean;
    ifEmpty?: boolean;
}): boolean;
/**
 * Purge queue
 */
export declare function purgeQueue(name: string): number;
/**
 * Get queue state
 */
export declare function getQueueState(name: string): QueueState | null;
/**
 * Get all queues
 */
export declare function getAllQueues(): readonly QueueState[];
/**
 * Declare exchange
 */
export declare function declareExchange(config: Partial<ExchangeConfig> & {
    name: string;
    type: ExchangeType;
}): ExchangeConfig;
/**
 * Delete exchange
 */
export declare function deleteExchange(name: string, options?: {
    ifUnused?: boolean;
}): boolean;
/**
 * Get exchange
 */
export declare function getExchange(name: string): ExchangeConfig | null;
/**
 * Get all exchanges
 */
export declare function getAllExchanges(): readonly ExchangeConfig[];
/**
 * Bind queue to exchange
 */
export declare function bindQueue(queueName: string, exchangeName: string, routingKey: string, args?: Record<string, unknown>): Binding;
/**
 * Unbind queue from exchange
 */
export declare function unbindQueue(queueName: string, exchangeName: string, routingKey: string): boolean;
/**
 * Bind exchange to exchange
 */
export declare function bindExchange(destinationExchange: string, sourceExchange: string, routingKey: string, args?: Record<string, unknown>): Binding;
/**
 * Get bindings for queue
 */
export declare function getQueueBindings(queueName: string): readonly Binding[];
/**
 * Get bindings for exchange
 */
export declare function getExchangeBindings(exchangeName: string): readonly Binding[];
/**
 * Configure producer
 */
export declare function configureProducer(config: Partial<ProducerConfig>): void;
/**
 * Publish message
 */
export declare function publish<T>(body: T, options?: PublishOptions): PublishResult;
/**
 * Publish batch
 */
export declare function publishBatch<T>(messages: readonly {
    body: T;
    options?: PublishOptions;
}[]): readonly PublishResult[];
/**
 * Process delayed messages
 */
export declare function processDelayedMessages(): number;
/**
 * Start consumer
 */
export declare function consume<T>(queueName: string, handler: ConsumerHandler<T>, options?: Partial<ConsumerConfig>): ConsumerState;
/**
 * Cancel consumer
 */
export declare function cancelConsumer(consumerTag: string): boolean;
/**
 * Pause consumer
 */
export declare function pauseConsumer(consumerTag: string): boolean;
/**
 * Resume consumer
 */
export declare function resumeConsumer(consumerTag: string): boolean;
/**
 * Get consumer state
 */
export declare function getConsumerState(consumerTag: string): ConsumerState | null;
/**
 * Get all consumers
 */
export declare function getAllConsumers(): readonly ConsumerState[];
/**
 * Process messages for consumers
 */
export declare function processMessages(): Promise<number>;
/**
 * Get consumer group
 */
export declare function getConsumerGroup(queueName: string): ConsumerGroup | null;
/**
 * Get queue statistics
 */
export declare function getQueueStatistics(): QueueStatistics;
/**
 * Clear all state
 */
export declare function clearMessageQueue(): void;
/**
 * Cleanup expired messages
 */
export declare function cleanupExpiredMessages(): number;
/**
 * Get message by ID
 */
export declare function getMessageById(messageId: string): MessageEnvelope | null;
/**
 * Get messages from queue
 */
export declare function getMessages(queueName: string, limit?: number): readonly MessageEnvelope[];
