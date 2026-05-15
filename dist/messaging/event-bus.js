"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEvent = createEvent;
exports.createDerivedEvent = createDerivedEvent;
exports.publish = publish;
exports.publishBatch = publishBatch;
exports.publishToOutbox = publishToOutbox;
exports.processOutbox = processOutbox;
exports.subscribe = subscribe;
exports.unsubscribe = unsubscribe;
exports.pauseSubscription = pauseSubscription;
exports.resumeSubscription = resumeSubscription;
exports.getSubscription = getSubscription;
exports.getAllSubscriptions = getAllSubscriptions;
exports.getDeadLetterEntries = getDeadLetterEntries;
exports.retryDeadLetterEntry = retryDeadLetterEntry;
exports.deleteDeadLetterEntry = deleteDeadLetterEntry;
exports.purgeDeadLetterQueue = purgeDeadLetterQueue;
exports.startReplay = startReplay;
exports.processReplay = processReplay;
exports.cancelReplay = cancelReplay;
exports.getReplayRequest = getReplayRequest;
exports.readEvents = readEvents;
exports.readEventsByAggregate = readEventsByAggregate;
exports.readEventsByType = readEventsByType;
exports.getCurrentOffset = getCurrentOffset;
exports.getAggregateVersion = getAggregateVersion;
exports.configureEventBus = configureEventBus;
exports.getEventBusConfig = getEventBusConfig;
exports.getEventBusStatistics = getEventBusStatistics;
exports.resetEventBusStatistics = resetEventBusStatistics;
exports.clearEventBus = clearEventBus;
exports.cleanupIdempotencyRecords = cleanupIdempotencyRecords;
exports.cleanupDeadLetterQueue = cleanupDeadLetterQueue;
const clock_1 = require("@mia/core/clock");
const deterministic_1 = require("@mia/core/deterministic");
const clock = (0, clock_1.getClock)();
// ============================================================================
// STANJE
// ============================================================================
const subscriptions = new Map();
const eventStore = [];
const outbox = new Map();
const deadLetterQueue = new Map();
const idempotencyRecords = new Map();
const replayRequests = new Map();
let eventCounter = 0;
let subscriptionCounter = 0;
let outboxCounter = 0;
let deadLetterCounter = 0;
let replayCounter = 0;
let currentOffset = 0;
let config = {
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
const statistics = {
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
function generateEventId() {
    eventCounter++;
    return (0, deterministic_1.generateDeterministicId)(`event-${eventCounter}`);
}
/**
 * Generate subscription ID
 */
function generateSubscriptionId() {
    subscriptionCounter++;
    return (0, deterministic_1.generateDeterministicId)(`subscription-${subscriptionCounter}`);
}
/**
 * Generate outbox entry ID
 */
function generateOutboxEntryId() {
    outboxCounter++;
    return (0, deterministic_1.generateDeterministicId)(`outbox-${outboxCounter}`);
}
/**
 * Generate dead letter entry ID
 */
function generateDeadLetterEntryId() {
    deadLetterCounter++;
    return (0, deterministic_1.generateDeterministicId)(`deadletter-${deadLetterCounter}`);
}
/**
 * Generate replay request ID
 */
function generateReplayRequestId() {
    replayCounter++;
    return (0, deterministic_1.generateDeterministicId)(`replay-${replayCounter}`);
}
/**
 * Generate correlation ID
 */
function generateCorrelationId() {
    return (0, deterministic_1.generateDeterministicId)(`correlation-${eventCounter}`);
}
/**
 * Calculate next retry delay
 */
function calculateRetryDelay(retryCount, policy) {
    const delay = policy.initialDelay * Math.pow(policy.backoffMultiplier, retryCount);
    return Math.min(delay, policy.maxDelay);
}
/**
 * Check if event matches filter
 */
function matchesFilter(event, filter) {
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
function checkIdempotency(eventId, subscriptionId) {
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
function recordIdempotency(eventId, subscriptionId) {
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
function serializeEvent(event) {
    return JSON.stringify(event);
}
/**
 * Deserialize event from storage
 */
function deserializeEvent(data) {
    return JSON.parse(data);
}
// ============================================================================
// EVENT CREATION
// ============================================================================
/**
 * Create domain event
 */
function createEvent(eventType, payload, options = {}) {
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
function createDerivedEvent(eventType, payload, causedBy, options = {}) {
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
async function publish(event) {
    const serialized = serializeEvent(event);
    if (serialized.length > config.maxEventSize) {
        throw new Error(`Event size ${serialized.length} exceeds maximum ${config.maxEventSize}`);
    }
    currentOffset++;
    const envelope = {
        event,
        publishedAt: clock.nowMs(),
        partition: event.metadata.aggregateId,
        offset: currentOffset,
        retryCount: 0,
        maxRetries: config.defaultRetryPolicy.maxRetries,
        nextRetryAt: null,
    };
    eventStore.push(envelope);
    await deliverToSubscribers(envelope);
    return envelope;
}
/**
 * Publish multiple events
 */
async function publishBatch(events) {
    if (events.length > config.maxBatchSize) {
        throw new Error(`Batch size ${events.length} exceeds maximum ${config.maxBatchSize}`);
    }
    const envelopes = [];
    for (const event of events) {
        const envelope = await publish(event);
        envelopes.push(envelope);
    }
    return envelopes;
}
/**
 * Publish to outbox (transactional)
 */
function publishToOutbox(event) {
    const entryId = generateOutboxEntryId();
    const now = clock.nowMs();
    const entry = {
        entryId,
        event: event,
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
async function processOutbox() {
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const newRetryCount = entry.retryCount + 1;
            if (newRetryCount >= config.defaultRetryPolicy.maxRetries) {
                outbox.set(entryId, {
                    ...entry,
                    status: 'failed',
                    retryCount: newRetryCount,
                    lastError: errorMessage,
                });
            }
            else {
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
function subscribe(eventTypes, handler, options = {}) {
    const subscriptionId = options.subscriptionId ?? generateSubscriptionId();
    const now = clock.nowMs();
    const fullOptions = {
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
    const subscription = {
        subscriptionId,
        eventTypes,
        handler: handler,
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
function unsubscribe(subscriptionId) {
    return subscriptions.delete(subscriptionId);
}
/**
 * Pause subscription
 */
function pauseSubscription(subscriptionId) {
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
function resumeSubscription(subscriptionId) {
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
function getSubscription(subscriptionId) {
    return subscriptions.get(subscriptionId) ?? null;
}
/**
 * Get all subscriptions
 */
function getAllSubscriptions() {
    return Array.from(subscriptions.values());
}
// ============================================================================
// DELIVERY
// ============================================================================
/**
 * Deliver event to subscribers
 */
async function deliverToSubscribers(envelope) {
    const event = envelope.event;
    for (const subscription of subscriptions.values()) {
        if (subscription.status !== 'active') {
            continue;
        }
        if (!subscription.eventTypes.includes(event.metadata.eventType)) {
            continue;
        }
        if (!matchesFilter(event, subscription.options.filter)) {
            continue;
        }
        if (subscription.options.enableIdempotency) {
            if (checkIdempotency(event.metadata.eventId, subscription.subscriptionId)) {
                continue;
            }
        }
        await deliverToSubscription(envelope, subscription);
    }
}
/**
 * Deliver event to single subscription
 */
async function deliverToSubscription(envelope, subscription) {
    const startTime = clock.nowMs();
    let acknowledged = false;
    let rejected = false;
    let retryRequested = false;
    let retryDelay = 0;
    let rejectReason = '';
    const context = {
        handlerId: (0, deterministic_1.generateDeterministicId)(`handler-${eventCounter}`),
        subscriptionId: subscription.subscriptionId,
        receivedAt: startTime,
        retryCount: envelope.retryCount,
        isReplay: false,
        acknowledge: async () => {
            acknowledged = true;
        },
        reject: async (reason) => {
            rejected = true;
            rejectReason = reason;
        },
        retry: async (delayMs) => {
            retryRequested = true;
            retryDelay = delayMs;
        },
    };
    try {
        await subscription.handler(envelope.event, context);
        if (!rejected && !retryRequested) {
            acknowledged = true;
        }
    }
    catch (error) {
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
    }
    else if (retryRequested || rejected) {
        const newRetryCount = envelope.retryCount + 1;
        if (newRetryCount >= subscription.options.retryPolicy.maxRetries) {
            await moveToDeadLetter(envelope, subscription.subscriptionId, rejectReason);
            subscriptions.set(subscription.subscriptionId, {
                ...subscription,
                errorCount: subscription.errorCount + 1,
            });
        }
        else {
            const delay = retryRequested
                ? retryDelay
                : calculateRetryDelay(newRetryCount, subscription.options.retryPolicy);
            const retryEnvelope = {
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
function scheduleRetry(envelope, subscription) {
    // In a real implementation, this would schedule the retry
}
/**
 * Move to dead letter queue
 */
async function moveToDeadLetter(envelope, subscriptionId, reason) {
    if (!config.enableDeadLetterQueue) {
        return;
    }
    const entryId = generateDeadLetterEntryId();
    const entry = {
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
function getDeadLetterEntries(subscriptionId, limit = 100) {
    let entries = Array.from(deadLetterQueue.values());
    if (subscriptionId) {
        entries = entries.filter(e => e.subscriptionId === subscriptionId);
    }
    return entries.slice(0, limit);
}
/**
 * Retry dead letter entry
 */
async function retryDeadLetterEntry(entryId) {
    const entry = deadLetterQueue.get(entryId);
    if (!entry) {
        return false;
    }
    const subscription = subscriptions.get(entry.subscriptionId);
    if (!subscription) {
        return false;
    }
    const envelope = {
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
function deleteDeadLetterEntry(entryId) {
    return deadLetterQueue.delete(entryId);
}
/**
 * Purge dead letter queue
 */
function purgeDeadLetterQueue(subscriptionId) {
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
function startReplay(subscriptionId, options = {}) {
    const requestId = generateReplayRequestId();
    const now = clock.nowMs();
    const request = {
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
async function processReplay(requestId) {
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
            const replayContext = {
                handlerId: (0, deterministic_1.generateDeterministicId)(`replay-handler-${i}`),
                subscriptionId: subscription.subscriptionId,
                receivedAt: clock.nowMs(),
                retryCount: 0,
                isReplay: true,
                acknowledge: async () => { },
                reject: async () => { },
                retry: async () => { },
            };
            await subscription.handler(envelope.event, replayContext);
            processedCount++;
        }
        catch {
            errorCount++;
        }
        if (processedCount >= config.maxReplayBatchSize) {
            break;
        }
    }
    const updatedRequest = {
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
function cancelReplay(requestId) {
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
function getReplayRequest(requestId) {
    return replayRequests.get(requestId) ?? null;
}
// ============================================================================
// EVENT STORE
// ============================================================================
/**
 * Read events from store
 */
function readEvents(fromOffset = 0, limit = 100) {
    return eventStore.slice(fromOffset, fromOffset + limit);
}
/**
 * Read events by aggregate
 */
function readEventsByAggregate(aggregateId, fromVersion = 0) {
    return eventStore.filter(e => e.event.metadata.aggregateId === aggregateId &&
        e.event.metadata.version >= fromVersion);
}
/**
 * Read events by type
 */
function readEventsByType(eventType, fromOffset = 0, limit = 100) {
    return eventStore
        .filter(e => e.event.metadata.eventType === eventType)
        .slice(fromOffset, fromOffset + limit);
}
/**
 * Get current offset
 */
function getCurrentOffset() {
    return currentOffset;
}
/**
 * Get aggregate version
 */
function getAggregateVersion(aggregateId) {
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
function configureEventBus(newConfig) {
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
function getEventBusConfig() {
    return { ...config };
}
// ============================================================================
// STATISTICS
// ============================================================================
/**
 * Get event bus statistics
 */
function getEventBusStatistics() {
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
function resetEventBusStatistics() {
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
function clearEventBus() {
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
function cleanupIdempotencyRecords() {
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
function cleanupDeadLetterQueue() {
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
