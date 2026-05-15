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
/**
 * Nastavi konfiguracijo tracinga
 */
export declare function configureTracing(newConfig: Partial<TracingConfig>): void;
/**
 * Ustvari nov trace
 */
export declare function createTrace(operationName: string): TraceContext;
/**
 * Zacni nov span
 */
export declare function startSpan(operationName: string, parentContext?: TraceContext): Span;
/**
 * Koncaj span
 */
export declare function endSpan(spanId: string, status?: 'OK' | 'ERROR'): Span | null;
/**
 * Dodaj atribut span-u
 */
export declare function setSpanAttribute(spanId: string, key: string, value: string | number | boolean): void;
/**
 * Dodaj dogodek span-u
 */
export declare function addSpanEvent(spanId: string, name: string, attributes?: Record<string, string | number | boolean>): void;
/**
 * Pridobi aktivni span
 */
export declare function getActiveSpan(spanId: string): Span | null;
/**
 * Pridobi vse zakljucene span-e
 */
export declare function getCompletedSpans(): readonly Span[];
/**
 * Pocisti zakljucene span-e
 */
export declare function clearCompletedSpans(): void;
/**
 * Pretvori TraceContext v W3C Trace Context format (traceparent header)
 * Format: {version}-{trace-id}-{parent-id}-{trace-flags}
 */
export declare function toW3CTraceContext(context: TraceContext): W3CTraceContext;
/**
 * Parsiraj W3C Trace Context iz traceparent headerja
 */
export declare function fromW3CTraceContext(traceparent: string): TraceContext | null;
/**
 * Zacni span za DB query
 */
export declare function startDbQuerySpan(context: DbQueryContext, parentContext?: TraceContext): Span;
/**
 * Zacni span za queue message operacijo
 */
export declare function startQueueSpan(context: QueueMessageContext, parentContext?: TraceContext): Span;
/**
 * Zacni span za background job
 */
export declare function startBackgroundJobSpan(context: BackgroundJobContext, parentContext?: TraceContext): Span;
/**
 * Zacni span za service-to-service klic
 */
export declare function startServiceCallSpan(targetService: string, method: string, parentContext?: TraceContext): Span;
/**
 * Inject trace context v HTTP headerje za propagacijo
 */
export declare function injectTraceContext(context: TraceContext, headers: Record<string, string>): Record<string, string>;
/**
 * Extract trace context iz HTTP headerjev
 */
export declare function extractTraceContext(headers: Record<string, string>): TraceContext | null;
export declare const Tracing: {
    configure: typeof configureTracing;
    createTrace: typeof createTrace;
    startSpan: typeof startSpan;
    endSpan: typeof endSpan;
    setSpanAttribute: typeof setSpanAttribute;
    addSpanEvent: typeof addSpanEvent;
    getActiveSpan: typeof getActiveSpan;
    getCompletedSpans: typeof getCompletedSpans;
    clearCompletedSpans: typeof clearCompletedSpans;
    toW3CTraceContext: typeof toW3CTraceContext;
    fromW3CTraceContext: typeof fromW3CTraceContext;
    startDbQuerySpan: typeof startDbQuerySpan;
    startQueueSpan: typeof startQueueSpan;
    startBackgroundJobSpan: typeof startBackgroundJobSpan;
    startServiceCallSpan: typeof startServiceCallSpan;
    injectTraceContext: typeof injectTraceContext;
    extractTraceContext: typeof extractTraceContext;
};
