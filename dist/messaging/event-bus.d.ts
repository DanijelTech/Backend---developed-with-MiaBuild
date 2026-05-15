/**
 * @file Event Bus za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-MSG-001 Event bus za zaledne sisteme
 * @design DSN-ZALEDNI-MSG-001 Backend event bus arhitektura
 * @test TEST-ZALEDNI-MSG-001 Preverjanje event bus
 *
 * Event Bus - prilagojen za zaledne sisteme:
 * - Publish/Subscribe pattern
 * - Event routing
 * - Event filtering
 * - Dead letter queue
 * - Event replay
 * - Event sourcing support
 * - Transactional outbox
 * - Idempotency handling
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom MSG_001 - Event Bus
 */
/**
 * Event metadata
 */
export interface EventMetadata {
    readonly eventId: string;
    readonly eventType: string;
    readonly aggregateId: string | null;
    readonly aggregateType: string | null;
    readonly version: number;
    readonly timestamp: number;
    readonly correlationId: string;
    readonly causationId: string | null;
    readonly userId: string | null;
    readonly source: string;
    readonly schemaVersion: string;
    readonly tags: readonly string[];
    readonly headers: Readonly<Record<string, string>>;
}
/**
 * Domain event
 */
export interface DomainEvent<T = unknown> {
    readonly metadata: EventMetadata;
    readonly payload: T;
}
/**
 * Event envelope
 */
export interface EventEnvelope<T = unknown> {
    readonly event: DomainEvent<T>;
    readonly publishedAt: number;
    readonly partition: string | null;
    readonly offset: number;
    readonly retryCount: number;
    readonly maxRetries: number;
    readonly nextRetryAt: number | null;
}
/**
 * Event handler
 */
export type EventHandler<T = unknown> = (event: DomainEvent<T>, context: HandlerContext) => Promise<void>;
/**
 * Handler context
 */
export interface HandlerContext {
    readonly handlerId: string;
    readonly subscriptionId: string;
    readonly receivedAt: number;
    readonly retryCount: number;
    readonly isReplay: boolean;
    readonly acknowledge: () => Promise<void>;
    readonly reject: (reason: string) => Promise<void>;
    readonly retry: (delayMs: number) => Promise<void>;
}
/**
 * Subscription options
 */
export interface SubscriptionOptions {
    readonly subscriptionId: string;
    readonly eventTypes: readonly string[];
    readonly filter: EventFilter | null;
    readonly startFrom: 'beginning' | 'end' | number;
    readonly maxConcurrency: number;
    readonly batchSize: number;
    readonly batchTimeout: number;
    readonly retryPolicy: RetryPolicy;
    readonly deadLetterQueue: string | null;
    readonly enableIdempotency: boolean;
}
/**
 * Event filter
 */
export interface EventFilter {
    readonly aggregateTypes: readonly string[] | null;
    readonly aggregateIds: readonly string[] | null;
    readonly tags: readonly string[] | null;
    readonly sources: readonly string[] | null;
    readonly minVersion: number | null;
    readonly maxVersion: number | null;
    readonly customFilter: ((event: DomainEvent) => boolean) | null;
}
/**
 * Retry policy
 */
export interface RetryPolicy {
    readonly maxRetries: number;
    readonly initialDelay: number;
    readonly maxDelay: number;
    readonly backoffMultiplier: number;
    readonly retryableErrors: readonly string[];
}
/**
 * Subscription
 */
export interface Subscription {
    readonly subscriptionId: string;
    readonly eventTypes: readonly string[];
    readonly handler: EventHandler;
    readonly options: SubscriptionOptions;
    readonly status: SubscriptionStatus;
    readonly createdAt: number;
    readonly lastEventAt: number | null;
    readonly processedCount: number;
    readonly errorCount: number;
}
/**
 * Subscription status
 */
export type SubscriptionStatus = 'active' | 'paused' | 'stopped' | 'error';
/**
 * Event store
 */
export interface EventStore {
    append(events: readonly DomainEvent[]): Promise<readonly EventEnvelope[]>;
    read(streamId: string, fromVersion?: number): Promise<readonly EventEnvelope[]>;
    readAll(fromOffset?: number, limit?: number): Promise<readonly EventEnvelope[]>;
    getLastOffset(): Promise<number>;
    getStreamVersion(streamId: string): Promise<number>;
}
/**
 * Outbox entry
 */
export interface OutboxEntry {
    readonly entryId: string;
    readonly event: DomainEvent;
    readonly createdAt: number;
    readonly publishedAt: number | null;
    readonly status: OutboxStatus;
    readonly retryCount: number;
    readonly lastError: string | null;
}
/**
 * Outbox status
 */
export type OutboxStatus = 'pending' | 'published' | 'failed';
/**
 * Dead letter entry
 */
export interface DeadLetterEntry {
    readonly entryId: string;
    readonly event: DomainEvent;
    readonly subscriptionId: string;
    readonly failedAt: number;
    readonly reason: string;
    readonly retryCount: number;
    readonly originalOffset: number;
}
/**
 * Event bus statistics
 */
export interface EventBusStatistics {
    readonly totalPublished: number;
    readonly totalDelivered: number;
    readonly totalFailed: number;
    readonly totalRetried: number;
    readonly activeSubscriptions: number;
    readonly pendingEvents: number;
    readonly deadLetterCount: number;
    readonly avgDeliveryTime: number;
    readonly avgProcessingTime: number;
    readonly throughput: number;
}
/**
 * Event bus configuration
 */
export interface EventBusConfig {
    readonly maxEventSize: number;
    readonly maxBatchSize: number;
    readonly defaultRetryPolicy: RetryPolicy;
    readonly enableOutbox: boolean;
    readonly outboxPollingInterval: number;
    readonly enableDeadLetterQueue: boolean;
    readonly deadLetterRetention: number;
    readonly enableIdempotency: boolean;
    readonly idempotencyTtl: number;
    readonly enableEventReplay: boolean;
    readonly maxReplayBatchSize: number;
}
/**
 * Idempotency record
 */
export interface IdempotencyRecord {
    readonly eventId: string;
    readonly subscriptionId: string;
    readonly processedAt: number;
    readonly expiresAt: number;
}
/**
 * Replay request
 */
export interface ReplayRequest {
    readonly requestId: string;
    readonly subscriptionId: string;
    readonly fromOffset: number;
    readonly toOffset: number | null;
    readonly eventTypes: readonly string[] | null;
    readonly filter: EventFilter | null;
    readonly status: ReplayStatus;
    readonly startedAt: number;
    readonly completedAt: number | null;
    readonly processedCount: number;
    readonly errorCount: number;
}
/**
 * Replay status
 */
export type ReplayStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
/**
 * Create domain event
 */
export declare function createEvent<T>(eventType: string, payload: T, options?: {
    aggregateId?: string;
    aggregateType?: string;
    version?: number;
    correlationId?: string;
    causationId?: string;
    userId?: string;
    source?: string;
    schemaVersion?: string;
    tags?: readonly string[];
    headers?: Record<string, string>;
}): DomainEvent<T>;
/**
 * Create event from existing event (for chaining)
 */
export declare function createDerivedEvent<T>(eventType: string, payload: T, causedBy: DomainEvent, options?: {
    aggregateId?: string;
    aggregateType?: string;
    version?: number;
    source?: string;
    schemaVersion?: string;
    tags?: readonly string[];
    headers?: Record<string, string>;
}): DomainEvent<T>;
/**
 * Publish event
 */
export declare function publish<T>(event: DomainEvent<T>): Promise<EventEnvelope<T>>;
/**
 * Publish multiple events
 */
export declare function publishBatch<T>(events: readonly DomainEvent<T>[]): Promise<readonly EventEnvelope<T>[]>;
/**
 * Publish to outbox (transactional)
 */
export declare function publishToOutbox<T>(event: DomainEvent<T>): OutboxEntry;
/**
 * Process outbox
 */
export declare function processOutbox(): Promise<number>;
/**
 * Subscribe to events
 */
export declare function subscribe<T>(eventTypes: readonly string[], handler: EventHandler<T>, options?: Partial<SubscriptionOptions>): Subscription;
/**
 * Unsubscribe
 */
export declare function unsubscribe(subscriptionId: string): boolean;
/**
 * Pause subscription
 */
export declare function pauseSubscription(subscriptionId: string): boolean;
/**
 * Resume subscription
 */
export declare function resumeSubscription(subscriptionId: string): boolean;
/**
 * Get subscription
 */
export declare function getSubscription(subscriptionId: string): Subscription | null;
/**
 * Get all subscriptions
 */
export declare function getAllSubscriptions(): readonly Subscription[];
/**
 * Get dead letter entries
 */
export declare function getDeadLetterEntries(subscriptionId?: string, limit?: number): readonly DeadLetterEntry[];
/**
 * Retry dead letter entry
 */
export declare function retryDeadLetterEntry(entryId: string): Promise<boolean>;
/**
 * Delete dead letter entry
 */
export declare function deleteDeadLetterEntry(entryId: string): boolean;
/**
 * Purge dead letter queue
 */
export declare function purgeDeadLetterQueue(subscriptionId?: string): number;
/**
 * Start event replay
 */
export declare function startReplay(subscriptionId: string, options?: {
    fromOffset?: number;
    toOffset?: number;
    eventTypes?: readonly string[];
    filter?: EventFilter;
}): ReplayRequest;
/**
 * Process replay request
 */
export declare function processReplay(requestId: string): Promise<ReplayRequest>;
/**
 * Cancel replay
 */
export declare function cancelReplay(requestId: string): boolean;
/**
 * Get replay request
 */
export declare function getReplayRequest(requestId: string): ReplayRequest | null;
/**
 * Read events from store
 */
export declare function readEvents(fromOffset?: number, limit?: number): readonly EventEnvelope[];
/**
 * Read events by aggregate
 */
export declare function readEventsByAggregate(aggregateId: string, fromVersion?: number): readonly EventEnvelope[];
/**
 * Read events by type
 */
export declare function readEventsByType(eventType: string, fromOffset?: number, limit?: number): readonly EventEnvelope[];
/**
 * Get current offset
 */
export declare function getCurrentOffset(): number;
/**
 * Get aggregate version
 */
export declare function getAggregateVersion(aggregateId: string): number;
/**
 * Configure event bus
 */
export declare function configureEventBus(newConfig: Partial<EventBusConfig>): void;
/**
 * Get event bus configuration
 */
export declare function getEventBusConfig(): Readonly<EventBusConfig>;
/**
 * Get event bus statistics
 */
export declare function getEventBusStatistics(): Readonly<EventBusStatistics>;
/**
 * Reset statistics
 */
export declare function resetEventBusStatistics(): void;
/**
 * Clear all state
 */
export declare function clearEventBus(): void;
/**
 * Cleanup expired idempotency records
 */
export declare function cleanupIdempotencyRecords(): number;
/**
 * Cleanup old dead letter entries
 */
export declare function cleanupDeadLetterQueue(): number;
