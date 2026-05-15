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

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI ZA DISTRIBUTED TRACING
// ============================================================================

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

// ============================================================================
// STANJE
// ============================================================================

const tracers: Map<string, Tracer> = new Map();
const activeSpans: Map<SpanId, SpanData> = new Map();
const completedSpans: SpanData[] = [];
const spanProcessors: SpanProcessor[] = [];
const spanExporters: SpanExporter[] = [];
const propagators: Propagator[] = [];
const contextStack: SpanContext[] = [];
const baggage: Map<string, BaggageEntry> = new Map();

let traceCounter = 0;
let spanCounter = 0;

let config: TracerConfig = {
    serviceName: 'unknown',
    serviceVersion: '0.0.0',
    environment: 'development',
    sampler: {
        name: 'always_on',
        shouldSample: () => ({
            decision: 'record_and_sample',
            attributes: {},
            traceState: { entries: {} },
        }),
    },
    spanProcessors: [],
    propagators: [],
    resource: {
        attributes: {},
        schemaUrl: null,
    },
    maxAttributeCount: 128,
    maxEventCount: 128,
    maxLinkCount: 128,
    maxAttributeValueLength: 1024,
};

const statistics: TracingStatistics = {
    totalSpans: 0,
    activeSpans: 0,
    completedSpans: 0,
    droppedSpans: 0,
    sampledSpans: 0,
    exportedSpans: 0,
    exportErrors: 0,
    avgSpanDuration: 0,
};

// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================

/**
 * Generate trace ID
 */
function generateTraceId(): TraceId {
    traceCounter++;
    return generateDeterministicId(`trace-${traceCounter}`);
}

/**
 * Generate span ID
 */
function generateSpanId(): SpanId {
    spanCounter++;
    return generateDeterministicId(`span-${spanCounter}`);
}

/**
 * Get current context
 */
function getCurrentContext(): SpanContext | null {
    return contextStack.length > 0 ? contextStack[contextStack.length - 1] : null;
}

/**
 * Push context
 */
function pushContext(context: SpanContext): void {
    contextStack.push(context);
}

/**
 * Pop context
 */
function popContext(): SpanContext | null {
    return contextStack.pop() ?? null;
}

/**
 * Update statistics
 */
function updateStatistics(): void {
    const mutableStats = statistics as {
        totalSpans: number;
        activeSpans: number;
        completedSpans: number;
    };
    
    mutableStats.activeSpans = activeSpans.size;
    mutableStats.completedSpans = completedSpans.length;
    mutableStats.totalSpans = mutableStats.activeSpans + mutableStats.completedSpans;
}

/**
 * Truncate attribute value
 */
function truncateAttributeValue(value: SpanAttributeValue): SpanAttributeValue {
    if (typeof value === 'string' && value.length > config.maxAttributeValueLength) {
        return value.slice(0, config.maxAttributeValueLength);
    }
    return value;
}

/**
 * Limit attributes
 */
function limitAttributes(attributes: SpanAttributes): SpanAttributes {
    const entries = Object.entries(attributes);
    if (entries.length <= config.maxAttributeCount) {
        return attributes;
    }
    
    const limited: Record<string, SpanAttributeValue> = {};
    for (let i = 0; i < config.maxAttributeCount; i++) {
        const [key, value] = entries[i];
        limited[key] = truncateAttributeValue(value);
    }
    
    return limited;
}

// ============================================================================
// SPAN IMPLEMENTATION
// ============================================================================

/**
 * Create span implementation
 */
function createSpan(
    name: string,
    traceId: TraceId,
    spanId: SpanId,
    parentSpanId: SpanId | null,
    kind: SpanKind,
    startTime: number,
    initialAttributes: SpanAttributes
): Span {
    let spanData: SpanData = {
        spanId,
        traceId,
        parentSpanId,
        name,
        kind,
        startTime,
        endTime: null,
        status: { code: 'unset', message: '' },
        attributes: limitAttributes(initialAttributes),
        events: [],
        links: [],
        resource: config.resource,
        instrumentationScope: {
            name: config.serviceName,
            version: config.serviceVersion,
            schemaUrl: null,
        },
    };
    
    activeSpans.set(spanId, spanData);
    
    const spanContext: SpanContext = {
        traceId,
        spanId,
        traceFlags: 1,
        traceState: { entries: {} },
        isRemote: false,
    };
    
    let isRecording = true;
    
    const span: Span = {
        get spanContext() { return spanContext; },
        get isRecording() { return isRecording; },
        
        setAttribute(key: string, value: SpanAttributeValue): Span {
            if (!isRecording) return span;
            
            const newAttributes = {
                ...spanData.attributes,
                [key]: truncateAttributeValue(value),
            };
            
            spanData = {
                ...spanData,
                attributes: limitAttributes(newAttributes),
            };
            activeSpans.set(spanId, spanData);
            
            return span;
        },
        
        setAttributes(attributes: SpanAttributes): Span {
            if (!isRecording) return span;
            
            const newAttributes = { ...spanData.attributes };
            for (const [key, value] of Object.entries(attributes)) {
                newAttributes[key] = truncateAttributeValue(value);
            }
            
            spanData = {
                ...spanData,
                attributes: limitAttributes(newAttributes),
            };
            activeSpans.set(spanId, spanData);
            
            return span;
        },
        
        addEvent(eventName: string, attributes: SpanAttributes = {}): Span {
            if (!isRecording) return span;
            
            if (spanData.events.length >= config.maxEventCount) {
                return span;
            }
            
            const event: SpanEvent = {
                name: eventName,
                timestamp: clock.nowMs(),
                attributes: limitAttributes(attributes),
            };
            
            spanData = {
                ...spanData,
                events: [...spanData.events, event],
            };
            activeSpans.set(spanId, spanData);
            
            return span;
        },
        
        addLink(link: SpanLink): Span {
            if (!isRecording) return span;
            
            if (spanData.links.length >= config.maxLinkCount) {
                return span;
            }
            
            spanData = {
                ...spanData,
                links: [...spanData.links, link],
            };
            activeSpans.set(spanId, spanData);
            
            return span;
        },
        
        setStatus(status: SpanStatus): Span {
            if (!isRecording) return span;
            
            spanData = {
                ...spanData,
                status,
            };
            activeSpans.set(spanId, spanData);
            
            return span;
        },
        
        updateName(newName: string): Span {
            if (!isRecording) return span;
            
            spanData = {
                ...spanData,
                name: newName,
            };
            activeSpans.set(spanId, spanData);
            
            return span;
        },
        
        end(endTime?: number): void {
            if (!isRecording) return;
            
            isRecording = false;
            const finalEndTime = endTime ?? clock.nowMs();
            
            spanData = {
                ...spanData,
                endTime: finalEndTime,
            };
            
            activeSpans.delete(spanId);
            completedSpans.push(spanData);
            
            for (const processor of spanProcessors) {
                try {
                    processor.onEnd(spanData);
                } catch {
                    // Ignore processor errors
                }
            }
            
            const mutableStats = statistics as {
                sampledSpans: number;
                avgSpanDuration: number;
            };
            mutableStats.sampledSpans++;
            
            const duration = finalEndTime - spanData.startTime;
            const totalDuration = mutableStats.avgSpanDuration * (mutableStats.sampledSpans - 1) + duration;
            mutableStats.avgSpanDuration = totalDuration / mutableStats.sampledSpans;
            
            updateStatistics();
        },
        
        recordException(exception: Error, attributes: SpanAttributes = {}): Span {
            if (!isRecording) return span;
            
            const exceptionAttributes: SpanAttributes = {
                'exception.type': exception.name,
                'exception.message': exception.message,
                'exception.stacktrace': exception.stack ?? '',
                ...attributes,
            };
            
            span.addEvent('exception', exceptionAttributes);
            span.setStatus({ code: 'error', message: exception.message });
            
            return span;
        },
    };
    
    for (const processor of spanProcessors) {
        try {
            processor.onStart(span, parentSpanId ? getCurrentContext() : null);
        } catch {
            // Ignore processor errors
        }
    }
    
    return span;
}

// ============================================================================
// TRACER IMPLEMENTATION
// ============================================================================

/**
 * Create tracer implementation
 */
function createTracer(name: string, version: string): Tracer {
    const tracer: Tracer = {
        name,
        version,
        
        startSpan(spanName: string, options: SpanOptions = {}): Span {
            const currentContext = getCurrentContext();
            const isRoot = options.root ?? false;
            
            let traceId: TraceId;
            let parentSpanId: SpanId | null = null;
            
            if (isRoot || !currentContext) {
                traceId = generateTraceId();
            } else {
                traceId = currentContext.traceId;
                parentSpanId = currentContext.spanId;
            }
            
            const spanId = generateSpanId();
            const kind = options.kind ?? 'internal';
            const startTime = options.startTime ?? clock.nowMs();
            const attributes = options.attributes ?? {};
            
            const samplingResult = config.sampler.shouldSample(
                currentContext ?? {
                    traceId,
                    spanId: '',
                    traceFlags: 0,
                    traceState: { entries: {} },
                    isRemote: false,
                },
                traceId,
                spanName,
                kind,
                attributes
            );
            
            if (samplingResult.decision === 'not_record') {
                const mutableStats = statistics as { droppedSpans: number };
                mutableStats.droppedSpans++;
                
                return createNoopSpan(traceId, spanId);
            }
            
            const mergedAttributes = { ...attributes, ...samplingResult.attributes };
            
            const span = createSpan(spanName, traceId, spanId, parentSpanId, kind, startTime, mergedAttributes);
            
            if (options.links) {
                for (const link of options.links) {
                    span.addLink(link);
                }
            }
            
            return span;
        },
        
        startActiveSpan<T>(
            spanName: string,
            optionsOrFn: SpanOptions | ((span: Span) => T),
            maybeFn?: (span: Span) => T
        ): T {
            let options: SpanOptions = {};
            let fn: (span: Span) => T;
            
            if (typeof optionsOrFn === 'function') {
                fn = optionsOrFn;
            } else {
                options = optionsOrFn;
                fn = maybeFn!;
            }
            
            const span = tracer.startSpan(spanName, options);
            pushContext(span.spanContext);
            
            try {
                return fn(span);
            } finally {
                popContext();
                span.end();
            }
        },
    };
    
    return tracer;
}

/**
 * Create noop span
 */
function createNoopSpan(traceId: TraceId, spanId: SpanId): Span {
    const spanContext: SpanContext = {
        traceId,
        spanId,
        traceFlags: 0,
        traceState: { entries: {} },
        isRemote: false,
    };
    
    const noopSpan: Span = {
        spanContext,
        isRecording: false,
        setAttribute: () => noopSpan,
        setAttributes: () => noopSpan,
        addEvent: () => noopSpan,
        addLink: () => noopSpan,
        setStatus: () => noopSpan,
        updateName: () => noopSpan,
        end: () => {},
        recordException: () => noopSpan,
    };
    
    return noopSpan;
}

// ============================================================================
// TRACER PROVIDER
// ============================================================================

/**
 * Get tracer
 */
export function getTracer(name: string, version: string = '0.0.0'): Tracer {
    const key = `${name}@${version}`;
    let tracer = tracers.get(key);
    
    if (!tracer) {
        tracer = createTracer(name, version);
        tracers.set(key, tracer);
    }
    
    return tracer;
}

/**
 * Get all tracers
 */
export function getAllTracers(): readonly Tracer[] {
    return Array.from(tracers.values());
}

// ============================================================================
// CONTEXT PROPAGATION
// ============================================================================

/**
 * Inject context into carrier
 */
export function inject(carrier: ContextCarrier, context?: SpanContext): void {
    const ctx = context ?? getCurrentContext();
    if (!ctx) return;
    
    for (const propagator of propagators) {
        try {
            propagator.inject(ctx, carrier);
        } catch {
            // Ignore propagator errors
        }
    }
}

/**
 * Extract context from carrier
 */
export function extract(carrier: ContextCarrier): SpanContext | null {
    for (const propagator of propagators) {
        try {
            const context = propagator.extract(carrier);
            if (context) {
                return context;
            }
        } catch {
            // Ignore propagator errors
        }
    }
    
    return null;
}

/**
 * Add propagator
 */
export function addPropagator(propagator: Propagator): void {
    propagators.push(propagator);
}

/**
 * Remove propagator
 */
export function removePropagator(name: string): boolean {
    const index = propagators.findIndex(p => p.name === name);
    if (index !== -1) {
        propagators.splice(index, 1);
        return true;
    }
    return false;
}

// ============================================================================
// SPAN PROCESSORS
// ============================================================================

/**
 * Add span processor
 */
export function addSpanProcessor(processor: SpanProcessor): void {
    spanProcessors.push(processor);
}

/**
 * Remove span processor
 */
export function removeSpanProcessor(name: string): boolean {
    const index = spanProcessors.findIndex(p => p.name === name);
    if (index !== -1) {
        spanProcessors.splice(index, 1);
        return true;
    }
    return false;
}

/**
 * Get all span processors
 */
export function getSpanProcessors(): readonly SpanProcessor[] {
    return [...spanProcessors];
}

// ============================================================================
// SPAN EXPORTERS
// ============================================================================

/**
 * Add span exporter
 */
export function addSpanExporter(exporter: SpanExporter): void {
    spanExporters.push(exporter);
}

/**
 * Remove span exporter
 */
export function removeSpanExporter(name: string): boolean {
    const index = spanExporters.findIndex(e => e.name === name);
    if (index !== -1) {
        spanExporters.splice(index, 1);
        return true;
    }
    return false;
}

/**
 * Get all span exporters
 */
export function getSpanExporters(): readonly SpanExporter[] {
    return [...spanExporters];
}

/**
 * Export spans
 */
export async function exportSpans(): Promise<void> {
    if (completedSpans.length === 0) {
        return;
    }
    
    const spansToExport = [...completedSpans];
    completedSpans.length = 0;
    
    for (const exporter of spanExporters) {
        try {
            const result = await exporter.export(spansToExport);
            
            if (result.code === 'success') {
                const mutableStats = statistics as { exportedSpans: number };
                mutableStats.exportedSpans += spansToExport.length;
            } else {
                const mutableStats = statistics as { exportErrors: number };
                mutableStats.exportErrors++;
            }
        } catch {
            const mutableStats = statistics as { exportErrors: number };
            mutableStats.exportErrors++;
        }
    }
}

// ============================================================================
// BAGGAGE
// ============================================================================

/**
 * Set baggage entry
 */
export function setBaggageEntry(key: string, value: string, metadata?: string): void {
    baggage.set(key, { value, metadata: metadata ?? null });
}

/**
 * Get baggage entry
 */
export function getBaggageEntry(key: string): BaggageEntry | null {
    return baggage.get(key) ?? null;
}

/**
 * Remove baggage entry
 */
export function removeBaggageEntry(key: string): boolean {
    return baggage.delete(key);
}

/**
 * Get all baggage
 */
export function getAllBaggage(): Baggage {
    return {
        entries: Object.fromEntries(baggage),
    };
}

/**
 * Clear baggage
 */
export function clearBaggage(): void {
    baggage.clear();
}

// ============================================================================
// SAMPLERS
// ============================================================================

/**
 * Create always on sampler
 */
export function createAlwaysOnSampler(): Sampler {
    return {
        name: 'always_on',
        shouldSample: () => ({
            decision: 'record_and_sample',
            attributes: {},
            traceState: { entries: {} },
        }),
    };
}

/**
 * Create always off sampler
 */
export function createAlwaysOffSampler(): Sampler {
    return {
        name: 'always_off',
        shouldSample: () => ({
            decision: 'not_record',
            attributes: {},
            traceState: { entries: {} },
        }),
    };
}

/**
 * Create ratio sampler
 */
export function createRatioSampler(ratio: number): Sampler {
    return {
        name: `ratio_${ratio}`,
        shouldSample: (context, traceId) => {
            let hash = 0;
            for (let i = 0; i < traceId.length; i++) {
                hash = ((hash << 5) - hash) + traceId.charCodeAt(i);
                hash = hash & hash;
            }
            
            const sample = (Math.abs(hash) % 100) / 100;
            
            return {
                decision: sample < ratio ? 'record_and_sample' : 'not_record',
                attributes: {},
                traceState: { entries: {} },
            };
        },
    };
}

/**
 * Create parent based sampler
 */
export function createParentBasedSampler(root: Sampler): Sampler {
    return {
        name: 'parent_based',
        shouldSample: (context, traceId, spanName, spanKind, attributes) => {
            if (context.isRemote) {
                if (context.traceFlags & 1) {
                    return {
                        decision: 'record_and_sample',
                        attributes: {},
                        traceState: context.traceState,
                    };
                }
                return {
                    decision: 'not_record',
                    attributes: {},
                    traceState: context.traceState,
                };
            }
            
            return root.shouldSample(context, traceId, spanName, spanKind, attributes);
        },
    };
}

// ============================================================================
// PROPAGATORS
// ============================================================================

/**
 * Create W3C trace context propagator
 */
export function createW3CTraceContextPropagator(): Propagator {
    return {
        name: 'w3c_trace_context',
        
        inject(context: SpanContext, carrier: ContextCarrier): void {
            const traceparent = `00-${context.traceId}-${context.spanId}-${context.traceFlags.toString(16).padStart(2, '0')}`;
            carrier['traceparent'] = traceparent;
            
            if (Object.keys(context.traceState.entries).length > 0) {
                const tracestate = Object.entries(context.traceState.entries)
                    .map(([k, v]) => `${k}=${v}`)
                    .join(',');
                carrier['tracestate'] = tracestate;
            }
        },
        
        extract(carrier: ContextCarrier): SpanContext | null {
            const traceparent = carrier['traceparent'];
            if (!traceparent) {
                return null;
            }
            
            const parts = traceparent.split('-');
            if (parts.length !== 4) {
                return null;
            }
            
            const [, traceId, spanId, flags] = parts;
            
            let traceState: TraceState = { entries: {} };
            const tracestateHeader = carrier['tracestate'];
            if (tracestateHeader) {
                const entries: Record<string, string> = {};
                for (const pair of tracestateHeader.split(',')) {
                    const [key, value] = pair.split('=');
                    if (key && value) {
                        entries[key.trim()] = value.trim();
                    }
                }
                traceState = { entries };
            }
            
            return {
                traceId,
                spanId,
                traceFlags: parseInt(flags, 16),
                traceState,
                isRemote: true,
            };
        },
        
        fields(): readonly string[] {
            return ['traceparent', 'tracestate'];
        },
    };
}

/**
 * Create B3 propagator
 */
export function createB3Propagator(): Propagator {
    return {
        name: 'b3',
        
        inject(context: SpanContext, carrier: ContextCarrier): void {
            carrier['X-B3-TraceId'] = context.traceId;
            carrier['X-B3-SpanId'] = context.spanId;
            carrier['X-B3-Sampled'] = context.traceFlags & 1 ? '1' : '0';
        },
        
        extract(carrier: ContextCarrier): SpanContext | null {
            const traceId = carrier['X-B3-TraceId'] ?? carrier['x-b3-traceid'];
            const spanId = carrier['X-B3-SpanId'] ?? carrier['x-b3-spanid'];
            const sampled = carrier['X-B3-Sampled'] ?? carrier['x-b3-sampled'];
            
            if (!traceId || !spanId) {
                return null;
            }
            
            return {
                traceId,
                spanId,
                traceFlags: sampled === '1' ? 1 : 0,
                traceState: { entries: {} },
                isRemote: true,
            };
        },
        
        fields(): readonly string[] {
            return ['X-B3-TraceId', 'X-B3-SpanId', 'X-B3-Sampled'];
        },
    };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Configure tracer
 */
export function configure(newConfig: Partial<TracerConfig>): void {
    config = { ...config, ...newConfig };
}

/**
 * Get configuration
 */
export function getConfig(): Readonly<TracerConfig> {
    return { ...config };
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get statistics
 */
export function getStatistics(): Readonly<TracingStatistics> {
    updateStatistics();
    return { ...statistics };
}

/**
 * Reset statistics
 */
export function resetStatistics(): void {
    Object.assign(statistics, {
        totalSpans: 0,
        activeSpans: 0,
        completedSpans: 0,
        droppedSpans: 0,
        sampledSpans: 0,
        exportedSpans: 0,
        exportErrors: 0,
        avgSpanDuration: 0,
    });
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Shutdown
 */
export async function shutdown(): Promise<void> {
    await exportSpans();
    
    for (const processor of spanProcessors) {
        await processor.shutdown();
    }
    
    for (const exporter of spanExporters) {
        await exporter.shutdown();
    }
}

/**
 * Force flush
 */
export async function forceFlush(): Promise<void> {
    for (const processor of spanProcessors) {
        await processor.forceFlush();
    }
    
    await exportSpans();
}

/**
 * Clear all state
 */
export function clearAll(): void {
    tracers.clear();
    activeSpans.clear();
    completedSpans.length = 0;
    spanProcessors.length = 0;
    spanExporters.length = 0;
    propagators.length = 0;
    contextStack.length = 0;
    baggage.clear();
    resetStatistics();
}
