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

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI
// ============================================================================

/**
 * Span - enota dela v trace-u
 */
export interface Span {
    /** Unikatni ID span-a */
    readonly spanId: string;
    /** ID trace-a */
    readonly traceId: string;
    /** ID nadrejenega span-a */
    readonly parentSpanId: string | null;
    /** Ime operacije */
    readonly operationName: string;
    /** Cas zacetka */
    readonly startTime: number;
    /** Cas konca */
    readonly endTime: number | null;
    /** Trajanje v ms */
    readonly duration: number | null;
    /** Status */
    readonly status: 'OK' | 'ERROR' | 'UNSET';
    /** Atributi */
    readonly attributes: Readonly<Record<string, string | number | boolean>>;
    /** Dogodki */
    readonly events: readonly SpanEvent[];
}

/**
 * Dogodek v span-u
 */
export interface SpanEvent {
    /** Ime dogodka */
    readonly name: string;
    /** Casovni zig */
    readonly timestamp: number;
    /** Atributi */
    readonly attributes: Readonly<Record<string, string | number | boolean>>;
}

/**
 * Konfiguracija tracinga
 */
export interface TracingConfig {
    /** Ime storitve */
    readonly serviceName: string;
    /** Stopnja vzorcenja (0-1) */
    readonly samplingRate: number;
    /** Ali je omogoceno */
    readonly enabled: boolean;
    /** Endpoint za izvoz */
    readonly exporterEndpoint: string;
}

/**
 * Kontekst trace-a
 */
export interface TraceContext {
    readonly traceId: string;
    readonly spanId: string;
    readonly sampled: boolean;
}

/**
 * W3C Trace Context header format
 */
export interface W3CTraceContext {
    readonly traceparent: string;
    readonly tracestate: string;
}

/**
 * Kontekst za DB query tracing
 */
export interface DbQueryContext {
    readonly query: string;
    readonly database: string;
    readonly table: string;
    readonly operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'TRANSACTION';
    readonly rowCount?: number;
}

/**
 * Kontekst za queue message tracing
 */
export interface QueueMessageContext {
    readonly queueName: string;
    readonly operation: 'publish' | 'consume' | 'ack' | 'nack';
    readonly messageId: string;
    readonly routingKey?: string;
}

/**
 * Kontekst za background job tracing
 */
export interface BackgroundJobContext {
    readonly jobName: string;
    readonly jobId: string;
    readonly attempt: number;
    readonly maxAttempts: number;
}

// ============================================================================
// STANJE
// ============================================================================

let config: TracingConfig = {
    serviceName: 'NexGen',
    samplingRate: 1.0,
    enabled: true,
    exporterEndpoint: '',
};

const activeSpans: Map<string, MutableSpan> = new Map();
const completedSpans: Span[] = [];
let spanCounter = 0;

interface MutableSpan {
    spanId: string;
    traceId: string;
    parentSpanId: string | null;
    operationName: string;
    startTime: number;
    endTime: number | null;
    status: 'OK' | 'ERROR' | 'UNSET';
    attributes: Record<string, string | number | boolean>;
    events: SpanEvent[];
}

// ============================================================================
// FUNKCIJE
// ============================================================================

/**
 * Nastavi konfiguracijo tracinga
 */
export function configureTracing(newConfig: Partial<TracingConfig>): void {
    config = { ...config, ...newConfig };
}

/**
 * Generiraj trace ID
 */
function generateTraceId(): string {
    spanCounter++;
    return generateDeterministicId(`trace-${spanCounter}`);
}

/**
 * Generiraj span ID
 */
function generateSpanId(): string {
    spanCounter++;
    return generateDeterministicId(`span-${spanCounter}`);
}

/**
 * Deterministicen sampling na podlagi traceId
 * Uporablja hash traceId namesto nakljucnih vrednosti za reproducibilnost
 */
function deterministicSample(traceId: string, samplingRate: number): boolean {
    if (samplingRate >= 1.0) return true;
    if (samplingRate <= 0.0) return false;
    
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
export function createTrace(operationName: string): TraceContext {
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
export function startSpan(
    operationName: string,
    parentContext?: TraceContext
): Span {
    if (!config.enabled) {
        return createNoopSpan(operationName);
    }
    
    const spanId = generateSpanId();
    const traceId = parentContext?.traceId || generateTraceId();
    const parentSpanId = parentContext?.spanId || null;
    
    const span: MutableSpan = {
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
export function endSpan(spanId: string, status: 'OK' | 'ERROR' = 'OK'): Span | null {
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
export function setSpanAttribute(
    spanId: string,
    key: string,
    value: string | number | boolean
): void {
    const span = activeSpans.get(spanId);
    if (span) {
        span.attributes[key] = value;
    }
}

/**
 * Dodaj dogodek span-u
 */
export function addSpanEvent(
    spanId: string,
    name: string,
    attributes: Record<string, string | number | boolean> = {}
): void {
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
export function getActiveSpan(spanId: string): Span | null {
    const span = activeSpans.get(spanId);
    return span ? toImmutableSpan(span) : null;
}

/**
 * Pridobi vse zakljucene span-e
 */
export function getCompletedSpans(): readonly Span[] {
    return completedSpans;
}

/**
 * Pocisti zakljucene span-e
 */
export function clearCompletedSpans(): void {
    completedSpans.length = 0;
}

/**
 * Ustvari noop span (ko je tracing onemogocen)
 */
function createNoopSpan(operationName: string): Span {
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
function toImmutableSpan(span: MutableSpan): Span {
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
export function toW3CTraceContext(context: TraceContext): W3CTraceContext {
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
export function fromW3CTraceContext(traceparent: string): TraceContext | null {
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
export function startDbQuerySpan(
    context: DbQueryContext,
    parentContext?: TraceContext
): Span {
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
export function startQueueSpan(
    context: QueueMessageContext,
    parentContext?: TraceContext
): Span {
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
export function startBackgroundJobSpan(
    context: BackgroundJobContext,
    parentContext?: TraceContext
): Span {
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
export function startServiceCallSpan(
    targetService: string,
    method: string,
    parentContext?: TraceContext
): Span {
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
export function injectTraceContext(
    context: TraceContext,
    headers: Record<string, string>
): Record<string, string> {
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
export function extractTraceContext(
    headers: Record<string, string>
): TraceContext | null {
    const traceparent = headers['traceparent'] || headers['Traceparent'];
    if (!traceparent) {
        return null;
    }
    return fromW3CTraceContext(traceparent);
}

// ============================================================================
// IZVOZ
// ============================================================================

export const Tracing = {
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
