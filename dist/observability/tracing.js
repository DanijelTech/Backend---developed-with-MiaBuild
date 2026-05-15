"use strict";
/**
 * @file Distributed tracing modul za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-OBS-003 Distributed tracing za zaledne sisteme
 * @design DSN-ZALEDNI-OBS-003 W3C Trace Context arhitektura
 * @test TEST-ZALEDNI-OBS-003 Preverjanje trace propagacije
 *
 * Backend Distributed Tracing - prilagojen za zaledne sisteme:
 * - Service-to-service trace propagation (W3C Trace Context)
 * - Database query tracing z SQL parametri
 * - Message queue span-i (publish/consume)
 * - Background job tracing z parent context
 * - External API call tracing
 * - Automatic span context injection/extraction
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom OBS_003 - Distributed Tracing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tracing = void 0;
exports.configureTracing = configureTracing;
exports.createTrace = createTrace;
exports.startSpan = startSpan;
exports.endSpan = endSpan;
exports.setSpanAttribute = setSpanAttribute;
exports.addSpanEvent = addSpanEvent;
exports.getActiveSpan = getActiveSpan;
exports.getCompletedSpans = getCompletedSpans;
exports.clearCompletedSpans = clearCompletedSpans;
exports.toW3CTraceContext = toW3CTraceContext;
exports.fromW3CTraceContext = fromW3CTraceContext;
exports.startDbQuerySpan = startDbQuerySpan;
exports.startQueueSpan = startQueueSpan;
exports.startBackgroundJobSpan = startBackgroundJobSpan;
exports.startServiceCallSpan = startServiceCallSpan;
exports.injectTraceContext = injectTraceContext;
exports.extractTraceContext = extractTraceContext;
const clock_1 = require("@mia/core/clock");
const deterministic_1 = require("@mia/core/deterministic");
const clock = (0, clock_1.getClock)();
// ============================================================================
// STANJE
// ============================================================================
let config = {
    serviceName: 'NexGen',
    samplingRate: 1.0,
    enabled: true,
    exporterEndpoint: '',
};
const activeSpans = new Map();
const completedSpans = [];
let spanCounter = 0;
// ============================================================================
// FUNKCIJE
// ============================================================================
/**
 * Nastavi konfiguracijo tracinga
 */
function configureTracing(newConfig) {
    config = { ...config, ...newConfig };
}
/**
 * Generiraj trace ID
 */
function generateTraceId() {
    spanCounter++;
    return (0, deterministic_1.generateDeterministicId)(`trace-${spanCounter}`);
}
/**
 * Generiraj span ID
 */
function generateSpanId() {
    spanCounter++;
    return (0, deterministic_1.generateDeterministicId)(`span-${spanCounter}`);
}
/**
 * Deterministicen sampling na podlagi traceId
 * Uporablja hash traceId namesto nakljucnih vrednosti za reproducibilnost
 */
function deterministicSample(traceId, samplingRate) {
    if (samplingRate >= 1.0)
        return true;
    if (samplingRate <= 0.0)
        return false;
    // Izracunaj hash traceId za deterministicen sampling
    let hash = 0;
    for (let i = 0; i < traceId.length; i++) {
        const char = traceId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    // Normaliziraj na 0-100 in primerjaj s samplingRate
    const normalizedHash = Math.abs(hash) % 100;
    return normalizedHash < (samplingRate * 100);
}
/**
 * Ustvari nov trace
 */
function createTrace(operationName) {
    const traceId = generateTraceId();
    const spanId = generateSpanId();
    const sampled = deterministicSample(traceId, config.samplingRate);
    return {
        traceId,
        spanId,
        sampled,
    };
}
/**
 * Zacni nov span
 */
function startSpan(operationName, parentContext) {
    if (!config.enabled) {
        return createNoopSpan(operationName);
    }
    const spanId = generateSpanId();
    const traceId = parentContext?.traceId || generateTraceId();
    const parentSpanId = parentContext?.spanId || null;
    const span = {
        spanId,
        traceId,
        parentSpanId,
        operationName,
        startTime: clock.nowMs(),
        endTime: null,
        status: 'UNSET',
        attributes: {
            'service.name': config.serviceName,
        },
        events: [],
    };
    activeSpans.set(spanId, span);
    return toImmutableSpan(span);
}
/**
 * Koncaj span
 */
function endSpan(spanId, status = 'OK') {
    const span = activeSpans.get(spanId);
    if (!span) {
        return null;
    }
    span.endTime = clock.nowMs();
    span.status = status;
    activeSpans.delete(spanId);
    const immutableSpan = toImmutableSpan(span);
    completedSpans.push(immutableSpan);
    return immutableSpan;
}
/**
 * Dodaj atribut span-u
 */
function setSpanAttribute(spanId, key, value) {
    const span = activeSpans.get(spanId);
    if (span) {
        span.attributes[key] = value;
    }
}
/**
 * Dodaj dogodek span-u
 */
function addSpanEvent(spanId, name, attributes = {}) {
    const span = activeSpans.get(spanId);
    if (span) {
        span.events.push({
            name,
            timestamp: clock.nowMs(),
            attributes,
        });
    }
}
/**
 * Pridobi aktivni span
 */
function getActiveSpan(spanId) {
    const span = activeSpans.get(spanId);
    return span ? toImmutableSpan(span) : null;
}
/**
 * Pridobi vse zakljucene span-e
 */
function getCompletedSpans() {
    return completedSpans;
}
/**
 * Pocisti zakljucene span-e
 */
function clearCompletedSpans() {
    completedSpans.length = 0;
}
/**
 * Ustvari noop span (ko je tracing onemogocen)
 */
function createNoopSpan(operationName) {
    return {
        spanId: 'noop',
        traceId: 'noop',
        parentSpanId: null,
        operationName,
        startTime: 0,
        endTime: 0,
        duration: 0,
        status: 'UNSET',
        attributes: {},
        events: [],
    };
}
/**
 * Pretvori v nespremenljiv span
 */
function toImmutableSpan(span) {
    const duration = span.endTime !== null ? span.endTime - span.startTime : null;
    return {
        spanId: span.spanId,
        traceId: span.traceId,
        parentSpanId: span.parentSpanId,
        operationName: span.operationName,
        startTime: span.startTime,
        endTime: span.endTime,
        duration,
        status: span.status,
        attributes: { ...span.attributes },
        events: [...span.events],
    };
}
// ============================================================================
// BACKEND-SPECIFICNE FUNKCIJE
// ============================================================================
/**
 * Pretvori TraceContext v W3C Trace Context format (traceparent header)
 * Format: {version}-{trace-id}-{parent-id}-{trace-flags}
 */
function toW3CTraceContext(context) {
    const version = '00';
    const traceFlags = context.sampled ? '01' : '00';
    const traceparent = `${version}-${context.traceId}-${context.spanId}-${traceFlags}`;
    return {
        traceparent,
        tracestate: `mia=${config.serviceName}`,
    };
}
/**
 * Parsiraj W3C Trace Context iz traceparent headerja
 */
function fromW3CTraceContext(traceparent) {
    const parts = traceparent.split('-');
    if (parts.length !== 4) {
        return null;
    }
    const [version, traceId, spanId, traceFlags] = parts;
    if (version !== '00') {
        return null;
    }
    return {
        traceId,
        spanId,
        sampled: traceFlags === '01',
    };
}
/**
 * Zacni span za DB query
 */
function startDbQuerySpan(context, parentContext) {
    const span = startSpan(`db.${context.operation.toLowerCase()}`, parentContext);
    if (span.spanId !== 'noop') {
        setSpanAttribute(span.spanId, 'db.system', 'postgresql');
        setSpanAttribute(span.spanId, 'db.name', context.database);
        setSpanAttribute(span.spanId, 'db.sql.table', context.table);
        setSpanAttribute(span.spanId, 'db.operation', context.operation);
        setSpanAttribute(span.spanId, 'db.statement', context.query);
        if (context.rowCount !== undefined) {
            setSpanAttribute(span.spanId, 'db.row_count', context.rowCount);
        }
    }
    return span;
}
/**
 * Zacni span za queue message operacijo
 */
function startQueueSpan(context, parentContext) {
    const operationName = context.operation === 'publish'
        ? `queue.publish.${context.queueName}`
        : `queue.${context.operation}.${context.queueName}`;
    const span = startSpan(operationName, parentContext);
    if (span.spanId !== 'noop') {
        setSpanAttribute(span.spanId, 'messaging.system', 'rabbitmq');
        setSpanAttribute(span.spanId, 'messaging.destination', context.queueName);
        setSpanAttribute(span.spanId, 'messaging.operation', context.operation);
        setSpanAttribute(span.spanId, 'messaging.message_id', context.messageId);
        if (context.routingKey) {
            setSpanAttribute(span.spanId, 'messaging.rabbitmq.routing_key', context.routingKey);
        }
    }
    return span;
}
/**
 * Zacni span za background job
 */
function startBackgroundJobSpan(context, parentContext) {
    const span = startSpan(`job.${context.jobName}`, parentContext);
    if (span.spanId !== 'noop') {
        setSpanAttribute(span.spanId, 'job.name', context.jobName);
        setSpanAttribute(span.spanId, 'job.id', context.jobId);
        setSpanAttribute(span.spanId, 'job.attempt', context.attempt);
        setSpanAttribute(span.spanId, 'job.max_attempts', context.maxAttempts);
    }
    return span;
}
/**
 * Zacni span za service-to-service klic
 */
function startServiceCallSpan(targetService, method, parentContext) {
    const span = startSpan(`service.call.${targetService}.${method}`, parentContext);
    if (span.spanId !== 'noop') {
        setSpanAttribute(span.spanId, 'rpc.system', 'grpc');
        setSpanAttribute(span.spanId, 'rpc.service', targetService);
        setSpanAttribute(span.spanId, 'rpc.method', method);
        setSpanAttribute(span.spanId, 'peer.service', targetService);
    }
    return span;
}
/**
 * Inject trace context v HTTP headerje za propagacijo
 */
function injectTraceContext(context, headers) {
    const w3c = toW3CTraceContext(context);
    return {
        ...headers,
        'traceparent': w3c.traceparent,
        'tracestate': w3c.tracestate,
    };
}
/**
 * Extract trace context iz HTTP headerjev
 */
function extractTraceContext(headers) {
    const traceparent = headers['traceparent'] || headers['Traceparent'];
    if (!traceparent) {
        return null;
    }
    return fromW3CTraceContext(traceparent);
}
// ============================================================================
// IZVOZ
// ============================================================================
exports.Tracing = {
    configure: configureTracing,
    createTrace,
    startSpan,
    endSpan,
    setSpanAttribute,
    addSpanEvent,
    getActiveSpan,
    getCompletedSpans,
    clearCompletedSpans,
    toW3CTraceContext,
    fromW3CTraceContext,
    startDbQuerySpan,
    startQueueSpan,
    startBackgroundJobSpan,
    startServiceCallSpan,
    injectTraceContext,
    extractTraceContext,
};
