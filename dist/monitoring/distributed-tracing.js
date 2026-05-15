"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTracer = getTracer;
exports.getAllTracers = getAllTracers;
exports.inject = inject;
exports.extract = extract;
exports.addPropagator = addPropagator;
exports.removePropagator = removePropagator;
exports.addSpanProcessor = addSpanProcessor;
exports.removeSpanProcessor = removeSpanProcessor;
exports.getSpanProcessors = getSpanProcessors;
exports.addSpanExporter = addSpanExporter;
exports.removeSpanExporter = removeSpanExporter;
exports.getSpanExporters = getSpanExporters;
exports.exportSpans = exportSpans;
exports.setBaggageEntry = setBaggageEntry;
exports.getBaggageEntry = getBaggageEntry;
exports.removeBaggageEntry = removeBaggageEntry;
exports.getAllBaggage = getAllBaggage;
exports.clearBaggage = clearBaggage;
exports.createAlwaysOnSampler = createAlwaysOnSampler;
exports.createAlwaysOffSampler = createAlwaysOffSampler;
exports.createRatioSampler = createRatioSampler;
exports.createParentBasedSampler = createParentBasedSampler;
exports.createW3CTraceContextPropagator = createW3CTraceContextPropagator;
exports.createB3Propagator = createB3Propagator;
exports.configure = configure;
exports.getConfig = getConfig;
exports.getStatistics = getStatistics;
exports.resetStatistics = resetStatistics;
exports.shutdown = shutdown;
exports.forceFlush = forceFlush;
exports.clearAll = clearAll;
const clock_1 = require("@mia/core/clock");
const deterministic_1 = require("@mia/core/deterministic");
const clock = (0, clock_1.getClock)();
// ============================================================================
// STANJE
// ============================================================================
const tracers = new Map();
const activeSpans = new Map();
const completedSpans = [];
const spanProcessors = [];
const spanExporters = [];
const propagators = [];
const contextStack = [];
const baggage = new Map();
let traceCounter = 0;
let spanCounter = 0;
let config = {
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
const statistics = {
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
function generateTraceId() {
    traceCounter++;
    return (0, deterministic_1.generateDeterministicId)(`trace-${traceCounter}`);
}
/**
 * Generate span ID
 */
function generateSpanId() {
    spanCounter++;
    return (0, deterministic_1.generateDeterministicId)(`span-${spanCounter}`);
}
/**
 * Get current context
 */
function getCurrentContext() {
    return contextStack.length > 0 ? contextStack[contextStack.length - 1] : null;
}
/**
 * Push context
 */
function pushContext(context) {
    contextStack.push(context);
}
/**
 * Pop context
 */
function popContext() {
    return contextStack.pop() ?? null;
}
/**
 * Update statistics
 */
function updateStatistics() {
    const mutableStats = statistics;
    mutableStats.activeSpans = activeSpans.size;
    mutableStats.completedSpans = completedSpans.length;
    mutableStats.totalSpans = mutableStats.activeSpans + mutableStats.completedSpans;
}
/**
 * Truncate attribute value
 */
function truncateAttributeValue(value) {
    if (typeof value === 'string' && value.length > config.maxAttributeValueLength) {
        return value.slice(0, config.maxAttributeValueLength);
    }
    return value;
}
/**
 * Limit attributes
 */
function limitAttributes(attributes) {
    const entries = Object.entries(attributes);
    if (entries.length <= config.maxAttributeCount) {
        return attributes;
    }
    const limited = {};
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
function createSpan(name, traceId, spanId, parentSpanId, kind, startTime, initialAttributes) {
    let spanData = {
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
    const spanContext = {
        traceId,
        spanId,
        traceFlags: 1,
        traceState: { entries: {} },
        isRemote: false,
    };
    let isRecording = true;
    const span = {
        get spanContext() { return spanContext; },
        get isRecording() { return isRecording; },
        setAttribute(key, value) {
            if (!isRecording)
                return span;
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
        setAttributes(attributes) {
            if (!isRecording)
                return span;
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
        addEvent(eventName, attributes = {}) {
            if (!isRecording)
                return span;
            if (spanData.events.length >= config.maxEventCount) {
                return span;
            }
            const event = {
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
        addLink(link) {
            if (!isRecording)
                return span;
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
        setStatus(status) {
            if (!isRecording)
                return span;
            spanData = {
                ...spanData,
                status,
            };
            activeSpans.set(spanId, spanData);
            return span;
        },
        updateName(newName) {
            if (!isRecording)
                return span;
            spanData = {
                ...spanData,
                name: newName,
            };
            activeSpans.set(spanId, spanData);
            return span;
        },
        end(endTime) {
            if (!isRecording)
                return;
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
                }
                catch {
                    // Ignore processor errors
                }
            }
            const mutableStats = statistics;
            mutableStats.sampledSpans++;
            const duration = finalEndTime - spanData.startTime;
            const totalDuration = mutableStats.avgSpanDuration * (mutableStats.sampledSpans - 1) + duration;
            mutableStats.avgSpanDuration = totalDuration / mutableStats.sampledSpans;
            updateStatistics();
        },
        recordException(exception, attributes = {}) {
            if (!isRecording)
                return span;
            const exceptionAttributes = {
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
        }
        catch {
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
function createTracer(name, version) {
    const tracer = {
        name,
        version,
        startSpan(spanName, options = {}) {
            const currentContext = getCurrentContext();
            const isRoot = options.root ?? false;
            let traceId;
            let parentSpanId = null;
            if (isRoot || !currentContext) {
                traceId = generateTraceId();
            }
            else {
                traceId = currentContext.traceId;
                parentSpanId = currentContext.spanId;
            }
            const spanId = generateSpanId();
            const kind = options.kind ?? 'internal';
            const startTime = options.startTime ?? clock.nowMs();
            const attributes = options.attributes ?? {};
            const samplingResult = config.sampler.shouldSample(currentContext ?? {
                traceId,
                spanId: '',
                traceFlags: 0,
                traceState: { entries: {} },
                isRemote: false,
            }, traceId, spanName, kind, attributes);
            if (samplingResult.decision === 'not_record') {
                const mutableStats = statistics;
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
        startActiveSpan(spanName, optionsOrFn, maybeFn) {
            let options = {};
            let fn;
            if (typeof optionsOrFn === 'function') {
                fn = optionsOrFn;
            }
            else {
                options = optionsOrFn;
                fn = maybeFn;
            }
            const span = tracer.startSpan(spanName, options);
            pushContext(span.spanContext);
            try {
                return fn(span);
            }
            finally {
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
function createNoopSpan(traceId, spanId) {
    const spanContext = {
        traceId,
        spanId,
        traceFlags: 0,
        traceState: { entries: {} },
        isRemote: false,
    };
    const noopSpan = {
        spanContext,
        isRecording: false,
        setAttribute: () => noopSpan,
        setAttributes: () => noopSpan,
        addEvent: () => noopSpan,
        addLink: () => noopSpan,
        setStatus: () => noopSpan,
        updateName: () => noopSpan,
        end: () => { },
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
function getTracer(name, version = '0.0.0') {
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
function getAllTracers() {
    return Array.from(tracers.values());
}
// ============================================================================
// CONTEXT PROPAGATION
// ============================================================================
/**
 * Inject context into carrier
 */
function inject(carrier, context) {
    const ctx = context ?? getCurrentContext();
    if (!ctx)
        return;
    for (const propagator of propagators) {
        try {
            propagator.inject(ctx, carrier);
        }
        catch {
            // Ignore propagator errors
        }
    }
}
/**
 * Extract context from carrier
 */
function extract(carrier) {
    for (const propagator of propagators) {
        try {
            const context = propagator.extract(carrier);
            if (context) {
                return context;
            }
        }
        catch {
            // Ignore propagator errors
        }
    }
    return null;
}
/**
 * Add propagator
 */
function addPropagator(propagator) {
    propagators.push(propagator);
}
/**
 * Remove propagator
 */
function removePropagator(name) {
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
function addSpanProcessor(processor) {
    spanProcessors.push(processor);
}
/**
 * Remove span processor
 */
function removeSpanProcessor(name) {
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
function getSpanProcessors() {
    return [...spanProcessors];
}
// ============================================================================
// SPAN EXPORTERS
// ============================================================================
/**
 * Add span exporter
 */
function addSpanExporter(exporter) {
    spanExporters.push(exporter);
}
/**
 * Remove span exporter
 */
function removeSpanExporter(name) {
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
function getSpanExporters() {
    return [...spanExporters];
}
/**
 * Export spans
 */
async function exportSpans() {
    if (completedSpans.length === 0) {
        return;
    }
    const spansToExport = [...completedSpans];
    completedSpans.length = 0;
    for (const exporter of spanExporters) {
        try {
            const result = await exporter.export(spansToExport);
            if (result.code === 'success') {
                const mutableStats = statistics;
                mutableStats.exportedSpans += spansToExport.length;
            }
            else {
                const mutableStats = statistics;
                mutableStats.exportErrors++;
            }
        }
        catch {
            const mutableStats = statistics;
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
function setBaggageEntry(key, value, metadata) {
    baggage.set(key, { value, metadata: metadata ?? null });
}
/**
 * Get baggage entry
 */
function getBaggageEntry(key) {
    return baggage.get(key) ?? null;
}
/**
 * Remove baggage entry
 */
function removeBaggageEntry(key) {
    return baggage.delete(key);
}
/**
 * Get all baggage
 */
function getAllBaggage() {
    return {
        entries: Object.fromEntries(baggage),
    };
}
/**
 * Clear baggage
 */
function clearBaggage() {
    baggage.clear();
}
// ============================================================================
// SAMPLERS
// ============================================================================
/**
 * Create always on sampler
 */
function createAlwaysOnSampler() {
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
function createAlwaysOffSampler() {
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
function createRatioSampler(ratio) {
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
function createParentBasedSampler(root) {
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
function createW3CTraceContextPropagator() {
    return {
        name: 'w3c_trace_context',
        inject(context, carrier) {
            const traceparent = `00-${context.traceId}-${context.spanId}-${context.traceFlags.toString(16).padStart(2, '0')}`;
            carrier['traceparent'] = traceparent;
            if (Object.keys(context.traceState.entries).length > 0) {
                const tracestate = Object.entries(context.traceState.entries)
                    .map(([k, v]) => `${k}=${v}`)
                    .join(',');
                carrier['tracestate'] = tracestate;
            }
        },
        extract(carrier) {
            const traceparent = carrier['traceparent'];
            if (!traceparent) {
                return null;
            }
            const parts = traceparent.split('-');
            if (parts.length !== 4) {
                return null;
            }
            const [, traceId, spanId, flags] = parts;
            let traceState = { entries: {} };
            const tracestateHeader = carrier['tracestate'];
            if (tracestateHeader) {
                const entries = {};
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
        fields() {
            return ['traceparent', 'tracestate'];
        },
    };
}
/**
 * Create B3 propagator
 */
function createB3Propagator() {
    return {
        name: 'b3',
        inject(context, carrier) {
            carrier['X-B3-TraceId'] = context.traceId;
            carrier['X-B3-SpanId'] = context.spanId;
            carrier['X-B3-Sampled'] = context.traceFlags & 1 ? '1' : '0';
        },
        extract(carrier) {
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
        fields() {
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
function configure(newConfig) {
    config = { ...config, ...newConfig };
}
/**
 * Get configuration
 */
function getConfig() {
    return { ...config };
}
// ============================================================================
// STATISTICS
// ============================================================================
/**
 * Get statistics
 */
function getStatistics() {
    updateStatistics();
    return { ...statistics };
}
/**
 * Reset statistics
 */
function resetStatistics() {
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
async function shutdown() {
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
async function forceFlush() {
    for (const processor of spanProcessors) {
        await processor.forceFlush();
    }
    await exportSpans();
}
/**
 * Clear all state
 */
function clearAll() {
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
