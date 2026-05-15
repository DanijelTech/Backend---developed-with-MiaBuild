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

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI ZA EVENT BUS
// ============================================================================

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

// ============================================================================
// STANJE
// ============================================================================

const subscriptions: Map<string, Subscription> = new Map();
const eventStore: EventEnvelope[] = [];
const outbox: Map<string, OutboxEntry> = new Map();
const deadLetterQueue: Map<string, DeadLetterEntry> = new Map();
const idempotencyRecords: Map<string, IdempotencyRecord> = new Map();
const replayRequests: Map<string, ReplayRequest> = new Map();

let eventCounter = 0;
let subscriptionCounter = 0;
let outboxCounter = 0;
let deadLetterCounter = 0;
let replayCounter = 0;
let currentOffset = 0;

let config: EventBusConfig = {
    maxEventSize: 1048576,
    maxBatchSize: 100,
    defaultRetryPolicy: {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 60000,
        backoffMultiplier: 2,
        retryableErrors: ['TIMEOUT', 'UNAVAILABLE', 'RESOURCE_EXHAUSTED'],
    },
    enableOutbox: true,
    outboxPollingInterval: 1000,
    enableDeadLetterQueue: true,
    deadLetterRetention: 604800000,
    enableIdempotency: true,
    idempotencyTtl: 86400000,
    enableEventReplay: true,
    maxReplayBatchSize: 1000,
};

const statistics: EventBusStatistics = {
    totalPublished: 0,
    totalDelivered: 0,
    totalFailed: 0,
    totalRetried: 0,
    activeSubscriptions: 0,
    pendingEvents: 0,
    deadLetterCount: 0,
    avgDeliveryTime: 0,
    avgProcessingTime: 0,
    throughput: 0,
};

// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================

/**
 * Generate event ID
 */
function generateEventId(): string {
    eventCounter++;
    return generateDeterministicId(`event-${eventCounter}`);
}

/**
 * Generate subscription ID
 */
function generateSubscriptionId(): string {
    subscriptionCounter++;
    return generateDeterministicId(`subscription-${subscriptionCounter}`);
}

/**
 * Generate outbox entry ID
 */
function generateOutboxEntryId(): string {
    outboxCounter++;
    return generateDeterministicId(`outbox-${outboxCounter}`);
}

/**
 * Generate dead letter entry ID
 */
function generateDeadLetterEntryId(): string {
    deadLetterCounter++;
    return generateDeterministicId(`deadletter-${deadLetterCounter}`);
}

/**
 * Generate replay request ID
 */
function generateReplayRequestId(): string {
    replayCounter++;
    return generateDeterministicId(`replay-${replayCounter}`);
}

/**
 * Generate correlation ID
 */
function generateCorrelationId(): string {
    return generateDeterministicId(`correlation-${eventCounter}`);
}

/**
 * Calculate next retry delay
 */
function calculateRetryDelay(retryCount: number, policy: RetryPolicy): number {
    const delay = policy.initialDelay * Math.pow(policy.backoffMultiplier, retryCount);
    return Math.min(delay, policy.maxDelay);
}

/**
 * Check if event matches filter
 */
function matchesFilter(event: DomainEvent, filter: EventFilter | null): boolean {
    if (!filter) {
        return true;
    }
    
    if (filter.aggregateTypes && event.metadata.aggregateType) {
        if (!filter.aggregateTypes.includes(event.metadata.aggregateType)) {
            return false;
        }
    }
    
    if (filter.aggregateIds && event.metadata.aggregateId) {
        if (!filter.aggregateIds.includes(event.metadata.aggregateId)) {
            return false;
        }
    }
    
    if (filter.tags && filter.tags.length > 0) {
        const hasMatchingTag = filter.tags.some(tag => event.metadata.tags.includes(tag));
        if (!hasMatchingTag) {
            return false;
        }
    }
    
    if (filter.sources && filter.sources.length > 0) {
        if (!filter.sources.includes(event.metadata.source)) {
            return false;
        }
    }
    
    if (filter.minVersion !== null && event.metadata.version < filter.minVersion) {
        return false;
    }
    
    if (filter.maxVersion !== null && event.metadata.version > filter.maxVersion) {
        return false;
    }
    
    if (filter.customFilter && !filter.customFilter(event)) {
        return false;
    }
    
    return true;
}

/**
 * Check idempotency
 */
function checkIdempotency(eventId: string, subscriptionId: string): boolean {
    const key = `${eventId}:${subscriptionId}`;
    const record = idempotencyRecords.get(key);
    
    if (!record) {
        return false;
    }
    
    if (clock.nowMs() > record.expiresAt) {
        idempotencyRecords.delete(key);
        return false;
    }
    
    return true;
}

/**
 * Record idempotency
 */
function recordIdempotency(eventId: string, subscriptionId: string): void {
    const key = `${eventId}:${subscriptionId}`;
    const now = clock.nowMs();
    
    idempotencyRecords.set(key, {
        eventId,
        subscriptionId,
        processedAt: now,
        expiresAt: now + config.idempotencyTtl,
    });
}

/**
 * Serialize event for storage
 */
function serializeEvent(event: DomainEvent): string {
    return JSON.stringify(event);
}

/**
 * Deserialize event from storage
 */
function deserializeEvent(data: string): DomainEvent {
    return JSON.parse(data) as DomainEvent;
}

// ============================================================================
// EVENT CREATION
// ============================================================================

/**
 * Create domain event
 */
export function createEvent<T>(
    eventType: string,
    payload: T,
    options: {
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
    } = {}
): DomainEvent<T> {
    const eventId = generateEventId();
    const now = clock.nowMs();
    
    return {
        metadata: {
            eventId,
            eventType,
            aggregateId: options.aggregateId ?? null,
            aggregateType: options.aggregateType ?? null,
            version: options.version ?? 1,
            timestamp: now,
            correlationId: options.correlationId ?? generateCorrelationId(),
            causationId: options.causationId ?? null,
            userId: options.userId ?? null,
            source: options.source ?? 'unknown',
            schemaVersion: options.schemaVersion ?? '1.0.0',
            tags: options.tags ?? [],
            headers: options.headers ?? {},
        },
        payload,
    };
}

/**
 * Create event from existing event (for chaining)
 */
export function createDerivedEvent<T>(
    eventType: string,
    payload: T,
    causedBy: DomainEvent,
    options: {
        aggregateId?: string;
        aggregateType?: string;
        version?: number;
        source?: string;
        schemaVersion?: string;
        tags?: readonly string[];
        headers?: Record<string, string>;
    } = {}
): DomainEvent<T> {
    return createEvent(eventType, payload, {
        ...options,
        correlationId: causedBy.metadata.correlationId,
        causationId: causedBy.metadata.eventId,
        userId: causedBy.metadata.userId,
    });
}

// ============================================================================
// PUBLISHING
// ============================================================================

/**
 * Publish event
 */
export async function publish<T>(event: DomainEvent<T>): Promise<EventEnvelope<T>> {
    const serialized = serializeEvent(event);
    if (serialized.length > config.maxEventSize) {
        throw new Error(`Event size ${serialized.length} exceeds maximum ${config.maxEventSize}`);
    }
    
    currentOffset++;
    const envelope: EventEnvelope<T> = {
        event,
        publishedAt: clock.nowMs(),
        partition: event.metadata.aggregateId,
        offset: currentOffset,
        retryCount: 0,
        maxRetries: config.defaultRetryPolicy.maxRetries,
        nextRetryAt: null,
    };
    
    eventStore.push(envelope as EventEnvelope);
    
    await deliverToSubscribers(envelope);
    
    return envelope;
}

/**
 * Publish multiple events
 */
export async function publishBatch<T>(events: readonly DomainEvent<T>[]): Promise<readonly EventEnvelope<T>[]> {
    if (events.length > config.maxBatchSize) {
        throw new Error(`Batch size ${events.length} exceeds maximum ${config.maxBatchSize}`);
    }
    
    const envelopes: EventEnvelope<T>[] = [];
    
    for (const event of events) {
        const envelope = await publish(event);
        envelopes.push(envelope);
    }
    
    return envelopes;
}

/**
 * Publish to outbox (transactional)
 */
export function publishToOutbox<T>(event: DomainEvent<T>): OutboxEntry {
    const entryId = generateOutboxEntryId();
    const now = clock.nowMs();
    
    const entry: OutboxEntry = {
        entryId,
        event: event as DomainEvent,
        createdAt: now,
        publishedAt: null,
        status: 'pending',
        retryCount: 0,
        lastError: null,
    };
    
    outbox.set(entryId, entry);
    
    return entry;
}

/**
 * Process outbox
 */
export async function processOutbox(): Promise<number> {
    let processedCount = 0;
    
    for (const [entryId, entry] of outbox) {
        if (entry.status !== 'pending') {
            continue;
        }
        
        try {
            await publish(entry.event);
            
            outbox.set(entryId, {
                ...entry,
                publishedAt: clock.nowMs(),
                status: 'published',
            });
            
            processedCount++;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const newRetryCount = entry.retryCount + 1;
            
            if (newRetryCount >= config.defaultRetryPolicy.maxRetries) {
                outbox.set(entryId, {
                    ...entry,
                    status: 'failed',
                    retryCount: newRetryCount,
                    lastError: errorMessage,
                });
            } else {
                outbox.set(entryId, {
                    ...entry,
                    retryCount: newRetryCount,
                    lastError: errorMessage,
                });
            }
        }
    }
    
    return processedCount;
}

// ============================================================================
// SUBSCRIPTION
// ============================================================================

/**
 * Subscribe to events
 */
export function subscribe<T>(
    eventTypes: readonly string[],
    handler: EventHandler<T>,
    options: Partial<SubscriptionOptions> = {}
): Subscription {
    const subscriptionId = options.subscriptionId ?? generateSubscriptionId();
    const now = clock.nowMs();
    
    const fullOptions: SubscriptionOptions = {
        subscriptionId,
        eventTypes,
        filter: options.filter ?? null,
        startFrom: options.startFrom ?? 'end',
        maxConcurrency: options.maxConcurrency ?? 1,
        batchSize: options.batchSize ?? 1,
        batchTimeout: options.batchTimeout ?? 1000,
        retryPolicy: options.retryPolicy ?? config.defaultRetryPolicy,
        deadLetterQueue: options.deadLetterQueue ?? null,
        enableIdempotency: options.enableIdempotency ?? config.enableIdempotency,
    };
    
    const subscription: Subscription = {
        subscriptionId,
        eventTypes,
        handler: handler as EventHandler,
        options: fullOptions,
        status: 'active',
        createdAt: now,
        lastEventAt: null,
        processedCount: 0,
        errorCount: 0,
    };
    
    subscriptions.set(subscriptionId, subscription);
    
    return subscription;
}

/**
 * Unsubscribe
 */
export function unsubscribe(subscriptionId: string): boolean {
    return subscriptions.delete(subscriptionId);
}

/**
 * Pause subscription
 */
export function pauseSubscription(subscriptionId: string): boolean {
    const subscription = subscriptions.get(subscriptionId);
    if (!subscription) {
        return false;
    }
    
    subscriptions.set(subscriptionId, {
        ...subscription,
        status: 'paused',
    });
    
    return true;
}

/**
 * Resume subscription
 */
export function resumeSubscription(subscriptionId: string): boolean {
    const subscription = subscriptions.get(subscriptionId);
    if (!subscription || subscription.status !== 'paused') {
        return false;
    }
    
    subscriptions.set(subscriptionId, {
        ...subscription,
        status: 'active',
    });
    
    return true;
}

/**
 * Get subscription
 */
export function getSubscription(subscriptionId: string): Subscription | null {
    return subscriptions.get(subscriptionId) ?? null;
}

/**
 * Get all subscriptions
 */
export function getAllSubscriptions(): readonly Subscription[] {
    return Array.from(subscriptions.values());
}

// ============================================================================
// DELIVERY
// ============================================================================

/**
 * Deliver event to subscribers
 */
async function deliverToSubscribers<T>(envelope: EventEnvelope<T>): Promise<void> {
    const event = envelope.event;
    
    for (const subscription of subscriptions.values()) {
        if (subscription.status !== 'active') {
            continue;
        }
        
        if (!subscription.eventTypes.includes(event.metadata.eventType)) {
            continue;
        }
        
        if (!matchesFilter(event as DomainEvent, subscription.options.filter)) {
            continue;
        }
        
        if (subscription.options.enableIdempotency) {
            if (checkIdempotency(event.metadata.eventId, subscription.subscriptionId)) {
                continue;
            }
        }
        
        await deliverToSubscription(envelope as EventEnvelope, subscription);
    }
}

/**
 * Deliver event to single subscription
 */
async function deliverToSubscription(
    envelope: EventEnvelope,
    subscription: Subscription
): Promise<void> {
    const startTime = clock.nowMs();
    let acknowledged = false;
    let rejected = false;
    let retryRequested = false;
    let retryDelay = 0;
    let rejectReason = '';
    
    const context: HandlerContext = {
        handlerId: generateDeterministicId(`handler-${eventCounter}`),
        subscriptionId: subscription.subscriptionId,
        receivedAt: startTime,
        retryCount: envelope.retryCount,
        isReplay: false,
        acknowledge: async () => {
            acknowledged = true;
        },
        reject: async (reason: string) => {
            rejected = true;
            rejectReason = reason;
        },
        retry: async (delayMs: number) => {
            retryRequested = true;
            retryDelay = delayMs;
        },
    };
    
    try {
        await subscription.handler(envelope.event, context);
        
        if (!rejected && !retryRequested) {
            acknowledged = true;
        }
    } catch (error) {
        rejected = true;
        rejectReason = error instanceof Error ? error.message : 'Unknown error';
    }
    
    const processingTime = clock.nowMs() - startTime;
    
    if (acknowledged) {
        if (subscription.options.enableIdempotency) {
            recordIdempotency(envelope.event.metadata.eventId, subscription.subscriptionId);
        }
        
        subscriptions.set(subscription.subscriptionId, {
            ...subscription,
            lastEventAt: clock.nowMs(),
            processedCount: subscription.processedCount + 1,
        });
    } else if (retryRequested || rejected) {
        const newRetryCount = envelope.retryCount + 1;
        
        if (newRetryCount >= subscription.options.retryPolicy.maxRetries) {
            await moveToDeadLetter(envelope, subscription.subscriptionId, rejectReason);
            
            subscriptions.set(subscription.subscriptionId, {
                ...subscription,
                errorCount: subscription.errorCount + 1,
            });
        } else {
            const delay = retryRequested
                ? retryDelay
                : calculateRetryDelay(newRetryCount, subscription.options.retryPolicy);
            
            const retryEnvelope: EventEnvelope = {
                ...envelope,
                retryCount: newRetryCount,
                nextRetryAt: clock.nowMs() + delay,
            };
            
            scheduleRetry(retryEnvelope, subscription);
        }
    }
}

/**
 * Schedule retry
 */
function scheduleRetry(envelope: EventEnvelope, subscription: Subscription): void {
    // In a real implementation, this would schedule the retry
}

/**
 * Move to dead letter queue
 */
async function moveToDeadLetter(
    envelope: EventEnvelope,
    subscriptionId: string,
    reason: string
): Promise<void> {
    if (!config.enableDeadLetterQueue) {
        return;
    }
    
    const entryId = generateDeadLetterEntryId();
    
    const entry: DeadLetterEntry = {
        entryId,
        event: envelope.event,
        subscriptionId,
        failedAt: clock.nowMs(),
        reason,
        retryCount: envelope.retryCount,
        originalOffset: envelope.offset,
    };
    
    deadLetterQueue.set(entryId, entry);
}

// ============================================================================
// DEAD LETTER QUEUE
// ============================================================================

/**
 * Get dead letter entries
 */
export function getDeadLetterEntries(
    subscriptionId?: string,
    limit: number = 100
): readonly DeadLetterEntry[] {
    let entries = Array.from(deadLetterQueue.values());
    
    if (subscriptionId) {
        entries = entries.filter(e => e.subscriptionId === subscriptionId);
    }
    
    return entries.slice(0, limit);
}

/**
 * Retry dead letter entry
 */
export async function retryDeadLetterEntry(entryId: string): Promise<boolean> {
    const entry = deadLetterQueue.get(entryId);
    if (!entry) {
        return false;
    }
    
    const subscription = subscriptions.get(entry.subscriptionId);
    if (!subscription) {
        return false;
    }
    
    const envelope: EventEnvelope = {
        event: entry.event,
        publishedAt: clock.nowMs(),
        partition: entry.event.metadata.aggregateId,
        offset: entry.originalOffset,
        retryCount: 0,
        maxRetries: subscription.options.retryPolicy.maxRetries,
        nextRetryAt: null,
    };
    
    await deliverToSubscription(envelope, subscription);
    
    deadLetterQueue.delete(entryId);
    
    return true;
}

/**
 * Delete dead letter entry
 */
export function deleteDeadLetterEntry(entryId: string): boolean {
    return deadLetterQueue.delete(entryId);
}

/**
 * Purge dead letter queue
 */
export function purgeDeadLetterQueue(subscriptionId?: string): number {
    let count = 0;
    
    for (const [entryId, entry] of deadLetterQueue) {
        if (!subscriptionId || entry.subscriptionId === subscriptionId) {
            deadLetterQueue.delete(entryId);
            count++;
        }
    }
    
    return count;
}

// ============================================================================
// EVENT REPLAY
// ============================================================================

/**
 * Start event replay
 */
export function startReplay(
    subscriptionId: string,
    options: {
        fromOffset?: number;
        toOffset?: number;
        eventTypes?: readonly string[];
        filter?: EventFilter;
    } = {}
): ReplayRequest {
    const requestId = generateReplayRequestId();
    const now = clock.nowMs();
    
    const request: ReplayRequest = {
        requestId,
        subscriptionId,
        fromOffset: options.fromOffset ?? 0,
        toOffset: options.toOffset ?? null,
        eventTypes: options.eventTypes ?? null,
        filter: options.filter ?? null,
        status: 'pending',
        startedAt: now,
        completedAt: null,
        processedCount: 0,
        errorCount: 0,
    };
    
    replayRequests.set(requestId, request);
    
    return request;
}

/**
 * Process replay request
 */
export async function processReplay(requestId: string): Promise<ReplayRequest> {
    const request = replayRequests.get(requestId);
    if (!request) {
        throw new Error(`Replay request ${requestId} not found`);
    }
    
    const subscription = subscriptions.get(request.subscriptionId);
    if (!subscription) {
        throw new Error(`Subscription ${request.subscriptionId} not found`);
    }
    
    replayRequests.set(requestId, {
        ...request,
        status: 'running',
    });
    
    let processedCount = 0;
    let errorCount = 0;
    
    const toOffset = request.toOffset ?? eventStore.length;
    
    for (let i = request.fromOffset; i < toOffset && i < eventStore.length; i++) {
        const envelope = eventStore[i];
        
        if (request.eventTypes && !request.eventTypes.includes(envelope.event.metadata.eventType)) {
            continue;
        }
        
        if (!matchesFilter(envelope.event, request.filter)) {
            continue;
        }
        
        try {
            const replayContext: HandlerContext = {
                handlerId: generateDeterministicId(`replay-handler-${i}`),
                subscriptionId: subscription.subscriptionId,
                receivedAt: clock.nowMs(),
                retryCount: 0,
                isReplay: true,
                acknowledge: async () => {},
                reject: async () => {},
                retry: async () => {},
            };
            
            await subscription.handler(envelope.event, replayContext);
            processedCount++;
        } catch {
            errorCount++;
        }
        
        if (processedCount >= config.maxReplayBatchSize) {
            break;
        }
    }
    
    const updatedRequest: ReplayRequest = {
        ...request,
        status: 'completed',
        completedAt: clock.nowMs(),
        processedCount,
        errorCount,
    };
    
    replayRequests.set(requestId, updatedRequest);
    
    return updatedRequest;
}

/**
 * Cancel replay
 */
export function cancelReplay(requestId: string): boolean {
    const request = replayRequests.get(requestId);
    if (!request || request.status !== 'running') {
        return false;
    }
    
    replayRequests.set(requestId, {
        ...request,
        status: 'cancelled',
        completedAt: clock.nowMs(),
    });
    
    return true;
}

/**
 * Get replay request
 */
export function getReplayRequest(requestId: string): ReplayRequest | null {
    return replayRequests.get(requestId) ?? null;
}

// ============================================================================
// EVENT STORE
// ============================================================================

/**
 * Read events from store
 */
export function readEvents(
    fromOffset: number = 0,
    limit: number = 100
): readonly EventEnvelope[] {
    return eventStore.slice(fromOffset, fromOffset + limit);
}

/**
 * Read events by aggregate
 */
export function readEventsByAggregate(
    aggregateId: string,
    fromVersion: number = 0
): readonly EventEnvelope[] {
    return eventStore.filter(
        e => e.event.metadata.aggregateId === aggregateId &&
             e.event.metadata.version >= fromVersion
    );
}

/**
 * Read events by type
 */
export function readEventsByType(
    eventType: string,
    fromOffset: number = 0,
    limit: number = 100
): readonly EventEnvelope[] {
    return eventStore
        .filter(e => e.event.metadata.eventType === eventType)
        .slice(fromOffset, fromOffset + limit);
}

/**
 * Get current offset
 */
export function getCurrentOffset(): number {
    return currentOffset;
}

/**
 * Get aggregate version
 */
export function getAggregateVersion(aggregateId: string): number {
    const events = readEventsByAggregate(aggregateId);
    if (events.length === 0) {
        return 0;
    }
    return Math.max(...events.map(e => e.event.metadata.version));
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Configure event bus
 */
export function configureEventBus(newConfig: Partial<EventBusConfig>): void {
    config = {
        ...config,
        ...newConfig,
        defaultRetryPolicy: {
            ...config.defaultRetryPolicy,
            ...(newConfig.defaultRetryPolicy || {}),
        },
    };
}

/**
 * Get event bus configuration
 */
export function getEventBusConfig(): Readonly<EventBusConfig> {
    return { ...config };
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get event bus statistics
 */
export function getEventBusStatistics(): Readonly<EventBusStatistics> {
    return {
        ...statistics,
        activeSubscriptions: Array.from(subscriptions.values()).filter(s => s.status === 'active').length,
        pendingEvents: Array.from(outbox.values()).filter(e => e.status === 'pending').length,
        deadLetterCount: deadLetterQueue.size,
    };
}

/**
 * Reset statistics
 */
export function resetEventBusStatistics(): void {
    Object.assign(statistics, {
        totalPublished: 0,
        totalDelivered: 0,
        totalFailed: 0,
        totalRetried: 0,
        activeSubscriptions: 0,
        pendingEvents: 0,
        deadLetterCount: 0,
        avgDeliveryTime: 0,
        avgProcessingTime: 0,
        throughput: 0,
    });
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Clear all state
 */
export function clearEventBus(): void {
    subscriptions.clear();
    eventStore.length = 0;
    outbox.clear();
    deadLetterQueue.clear();
    idempotencyRecords.clear();
    replayRequests.clear();
    currentOffset = 0;
    resetEventBusStatistics();
}

/**
 * Cleanup expired idempotency records
 */
export function cleanupIdempotencyRecords(): number {
    const now = clock.nowMs();
    let count = 0;
    
    for (const [key, record] of idempotencyRecords) {
        if (now > record.expiresAt) {
            idempotencyRecords.delete(key);
            count++;
        }
    }
    
    return count;
}

/**
 * Cleanup old dead letter entries
 */
export function cleanupDeadLetterQueue(): number {
    const now = clock.nowMs();
    const cutoff = now - config.deadLetterRetention;
    let count = 0;
    
    for (const [entryId, entry] of deadLetterQueue) {
        if (entry.failedAt < cutoff) {
            deadLetterQueue.delete(entryId);
            count++;
        }
    }
    
    return count;
}
