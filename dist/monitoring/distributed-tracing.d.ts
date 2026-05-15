/**
 * @file Distributed Tracing za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-MON-002 Distributed tracing za zaledne sisteme
 * @design DSN-ZALEDNI-MON-002 Backend distributed tracing arhitektura
 * @test TEST-ZALEDNI-MON-002 Preverjanje distributed tracing
 *
 * Distributed Tracing - prilagojen za zaledne sisteme:
 * - Trace context propagation
 * - Span creation and management
 * - Baggage items
 * - Sampling strategies
 * - Trace exporters
 * - Span processors
 * - Context injection/extraction
 * - Performance optimization
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom MON_002 - Distributed Tracing
 */
/**
 * Trace ID
 */
export type TraceId = string;
/**
 * Span ID
 */
export type SpanId = string;
/**
 * Span kind
 */
export type SpanKind = 'internal' | 'server' | 'client' | 'producer' | 'consumer';
/**
 * Span status code
 */
export type SpanStatusCode = 'unset' | 'ok' | 'error';
/**
 * Span status
 */
export interface SpanStatus {
    readonly code: SpanStatusCode;
    readonly message: string;
}
/**
 * Span context
 */
export interface SpanContext {
    readonly traceId: TraceId;
    readonly spanId: SpanId;
    readonly traceFlags: number;
    readonly traceState: TraceState;
    readonly isRemote: boolean;
}
/**
 * Trace state
 */
export interface TraceState {
    readonly entries: Readonly<Record<string, string>>;
}
/**
 * Span attributes
 */
export type SpanAttributes = Readonly<Record<string, SpanAttributeValue>>;
/**
 * Span attribute value
 */
export type SpanAttributeValue = string | number | boolean | readonly string[] | readonly number[] | readonly boolean[];
/**
 * Span event
 */
export interface SpanEvent {
    readonly name: string;
    readonly timestamp: number;
    readonly attributes: SpanAttributes;
}
/**
 * Span link
 */
export interface SpanLink {
    readonly context: SpanContext;
    readonly attributes: SpanAttributes;
}
/**
 * Span data
 */
export interface SpanData {
    readonly spanId: SpanId;
    readonly traceId: TraceId;
    readonly parentSpanId: SpanId | null;
    readonly name: string;
    readonly kind: SpanKind;
    readonly startTime: number;
    readonly endTime: number | null;
    readonly status: SpanStatus;
    readonly attributes: SpanAttributes;
    readonly events: readonly SpanEvent[];
    readonly links: readonly SpanLink[];
    readonly resource: Resource;
    readonly instrumentationScope: InstrumentationScope;
}
/**
 * Resource
 */
export interface Resource {
    readonly attributes: SpanAttributes;
    readonly schemaUrl: string | null;
}
/**
 * Instrumentation scope
 */
export interface InstrumentationScope {
    readonly name: string;
    readonly version: string;
    readonly schemaUrl: string | null;
}
/**
 * Span interface
 */
export interface Span {
    readonly spanContext: SpanContext;
    readonly isRecording: boolean;
    setAttribute(key: string, value: SpanAttributeValue): Span;
    setAttributes(attributes: SpanAttributes): Span;
    addEvent(name: string, attributes?: SpanAttributes): Span;
    addLink(link: SpanLink): Span;
    setStatus(status: SpanStatus): Span;
    updateName(name: string): Span;
    end(endTime?: number): void;
    recordException(exception: Error, attributes?: SpanAttributes): Span;
}
/**
 * Tracer interface
 */
export interface Tracer {
    readonly name: string;
    readonly version: string;
    startSpan(name: string, options?: SpanOptions): Span;
    startActiveSpan<T>(name: string, fn: (span: Span) => T): T;
    startActiveSpan<T>(name: string, options: SpanOptions, fn: (span: Span) => T): T;
}
/**
 * Span options
 */
export interface SpanOptions {
    readonly kind?: SpanKind;
    readonly attributes?: SpanAttributes;
    readonly links?: readonly SpanLink[];
    readonly startTime?: number;
    readonly root?: boolean;
}
/**
 * Sampler
 */
export interface Sampler {
    readonly name: string;
    shouldSample(context: SpanContext, traceId: TraceId, spanName: string, spanKind: SpanKind, attributes: SpanAttributes): SamplingResult;
}
/**
 * Sampling result
 */
export interface SamplingResult {
    readonly decision: SamplingDecision;
    readonly attributes: SpanAttributes;
    readonly traceState: TraceState;
}
/**
 * Sampling decision
 */
export type SamplingDecision = 'not_record' | 'record' | 'record_and_sample';
/**
 * Span processor
 */
export interface SpanProcessor {
    readonly name: string;
    onStart(span: Span, parentContext: SpanContext | null): void;
    onEnd(span: SpanData): void;
    shutdown(): Promise<void>;
    forceFlush(): Promise<void>;
}
/**
 * Span exporter
 */
export interface SpanExporter {
    readonly name: string;
    export(spans: readonly SpanData[]): Promise<ExportResult>;
    shutdown(): Promise<void>;
}
/**
 * Export result
 */
export interface ExportResult {
    readonly code: ExportResultCode;
    readonly error: Error | null;
}
/**
 * Export result code
 */
export type ExportResultCode = 'success' | 'failed';
/**
 * Context carrier
 */
export type ContextCarrier = Record<string, string>;
/**
 * Propagator
 */
export interface Propagator {
    readonly name: string;
    inject(context: SpanContext, carrier: ContextCarrier): void;
    extract(carrier: ContextCarrier): SpanContext | null;
    fields(): readonly string[];
}
/**
 * Baggage
 */
export interface Baggage {
    readonly entries: Readonly<Record<string, BaggageEntry>>;
}
/**
 * Baggage entry
 */
export interface BaggageEntry {
    readonly value: string;
    readonly metadata: string | null;
}
/**
 * Tracer configuration
 */
export interface TracerConfig {
    readonly serviceName: string;
    readonly serviceVersion: string;
    readonly environment: string;
    readonly sampler: Sampler;
    readonly spanProcessors: readonly SpanProcessor[];
    readonly propagators: readonly Propagator[];
    readonly resource: Resource;
    readonly maxAttributeCount: number;
    readonly maxEventCount: number;
    readonly maxLinkCount: number;
    readonly maxAttributeValueLength: number;
}
/**
 * Tracing statistics
 */
export interface TracingStatistics {
    readonly totalSpans: number;
    readonly activeSpans: number;
    readonly completedSpans: number;
    readonly droppedSpans: number;
    readonly sampledSpans: number;
    readonly exportedSpans: number;
    readonly exportErrors: number;
    readonly avgSpanDuration: number;
}
/**
 * Get tracer
 */
export declare function getTracer(name: string, version?: string): Tracer;
/**
 * Get all tracers
 */
export declare function getAllTracers(): readonly Tracer[];
/**
 * Inject context into carrier
 */
export declare function inject(carrier: ContextCarrier, context?: SpanContext): void;
/**
 * Extract context from carrier
 */
export declare function extract(carrier: ContextCarrier): SpanContext | null;
/**
 * Add propagator
 */
export declare function addPropagator(propagator: Propagator): void;
/**
 * Remove propagator
 */
export declare function removePropagator(name: string): boolean;
/**
 * Add span processor
 */
export declare function addSpanProcessor(processor: SpanProcessor): void;
/**
 * Remove span processor
 */
export declare function removeSpanProcessor(name: string): boolean;
/**
 * Get all span processors
 */
export declare function getSpanProcessors(): readonly SpanProcessor[];
/**
 * Add span exporter
 */
export declare function addSpanExporter(exporter: SpanExporter): void;
/**
 * Remove span exporter
 */
export declare function removeSpanExporter(name: string): boolean;
/**
 * Get all span exporters
 */
export declare function getSpanExporters(): readonly SpanExporter[];
/**
 * Export spans
 */
export declare function exportSpans(): Promise<void>;
/**
 * Set baggage entry
 */
export declare function setBaggageEntry(key: string, value: string, metadata?: string): void;
/**
 * Get baggage entry
 */
export declare function getBaggageEntry(key: string): BaggageEntry | null;
/**
 * Remove baggage entry
 */
export declare function removeBaggageEntry(key: string): boolean;
/**
 * Get all baggage
 */
export declare function getAllBaggage(): Baggage;
/**
 * Clear baggage
 */
export declare function clearBaggage(): void;
/**
 * Create always on sampler
 */
export declare function createAlwaysOnSampler(): Sampler;
/**
 * Create always off sampler
 */
export declare function createAlwaysOffSampler(): Sampler;
/**
 * Create ratio sampler
 */
export declare function createRatioSampler(ratio: number): Sampler;
/**
 * Create parent based sampler
 */
export declare function createParentBasedSampler(root: Sampler): Sampler;
/**
 * Create W3C trace context propagator
 */
export declare function createW3CTraceContextPropagator(): Propagator;
/**
 * Create B3 propagator
 */
export declare function createB3Propagator(): Propagator;
/**
 * Configure tracer
 */
export declare function configure(newConfig: Partial<TracerConfig>): void;
/**
 * Get configuration
 */
export declare function getConfig(): Readonly<TracerConfig>;
/**
 * Get statistics
 */
export declare function getStatistics(): Readonly<TracingStatistics>;
/**
 * Reset statistics
 */
export declare function resetStatistics(): void;
/**
 * Shutdown
 */
export declare function shutdown(): Promise<void>;
/**
 * Force flush
 */
export declare function forceFlush(): Promise<void>;
/**
 * Clear all state
 */
export declare function clearAll(): void;
