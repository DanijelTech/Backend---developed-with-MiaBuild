"use strict";
/**
 * @file Metrics Collector za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-MON-001 Metrics collection za zaledne sisteme
 * @design DSN-ZALEDNI-MON-001 Backend metrics collector arhitektura
 * @test TEST-ZALEDNI-MON-001 Preverjanje metrics collector
 *
 * Metrics Collector - prilagojen za zaledne sisteme:
 * - Counter metrics
 * - Gauge metrics
 * - Histogram metrics
 * - Summary metrics
 * - Labels and dimensions
 * - Metric aggregation
 * - Export formats
 * - Push/Pull models
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom MON_001 - Metrics Collector
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCounter = registerCounter;
exports.registerGauge = registerGauge;
exports.registerHistogram = registerHistogram;
exports.registerSummary = registerSummary;
exports.getDefinition = getDefinition;
exports.getAllDefinitions = getAllDefinitions;
exports.removeMetric = removeMetric;
exports.incrementCounter = incrementCounter;
exports.getCounterValue = getCounterValue;
exports.resetCounter = resetCounter;
exports.setGauge = setGauge;
exports.incrementGauge = incrementGauge;
exports.decrementGauge = decrementGauge;
exports.getGaugeValue = getGaugeValue;
exports.observeHistogram = observeHistogram;
exports.getHistogramValue = getHistogramValue;
exports.timeHistogram = timeHistogram;
exports.observeSummary = observeSummary;
exports.getSummaryValue = getSummaryValue;
exports.timeSummary = timeSummary;
exports.exportPrometheus = exportPrometheus;
exports.exportJson = exportJson;
exports.createAggregationRule = createAggregationRule;
exports.getAggregationRule = getAggregationRule;
exports.getAllAggregationRules = getAllAggregationRules;
exports.deleteAggregationRule = deleteAggregationRule;
exports.configure = configure;
exports.getConfig = getConfig;
exports.getStatistics = getStatistics;
exports.resetStatistics = resetStatistics;
exports.addEventListener = addEventListener;
exports.removeEventListener = removeEventListener;
exports.clearEventListeners = clearEventListeners;
exports.clearAll = clearAll;
const clock_1 = require("@mia/core/clock");
const deterministic_1 = require("@mia/core/deterministic");
const clock = (0, clock_1.getClock)();
// ============================================================================
// STANJE
// ============================================================================
const definitions = new Map();
const counters = new Map();
const gauges = new Map();
const histograms = new Map();
const summaries = new Map();
const aggregationRules = new Map();
const eventListeners = new Set();
let metricCounter = 0;
let eventCounter = 0;
let ruleCounter = 0;
let config = {
    collectorId: 'collector-1',
    defaultLabels: {},
    prefix: '',
    enableTimestamps: true,
    defaultBuckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    defaultQuantiles: [0.5, 0.9, 0.95, 0.99],
    maxSamples: 10000,
    flushInterval: 60000,
};
const statistics = {
    totalMetrics: 0,
    totalSamples: 0,
    counterCount: 0,
    gaugeCount: 0,
    histogramCount: 0,
    summaryCount: 0,
    lastFlush: null,
    flushCount: 0,
};
// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================
/**
 * Generate metric ID
 */
function generateMetricId() {
    metricCounter++;
    return (0, deterministic_1.generateDeterministicId)(`metric-${metricCounter}`);
}
/**
 * Generate event ID
 */
function generateEventId() {
    eventCounter++;
    return (0, deterministic_1.generateDeterministicId)(`metric-event-${eventCounter}`);
}
/**
 * Generate rule ID
 */
function generateRuleId() {
    ruleCounter++;
    return (0, deterministic_1.generateDeterministicId)(`agg-rule-${ruleCounter}`);
}
/**
 * Get label key
 */
function getLabelKey(labels) {
    const sortedKeys = Object.keys(labels).sort();
    return sortedKeys.map(k => `${k}="${labels[k]}"`).join(',');
}
/**
 * Merge labels
 */
function mergeLabels(base, override) {
    return { ...base, ...override };
}
/**
 * Get full metric name
 */
function getFullMetricName(name) {
    return config.prefix ? `${config.prefix}_${name}` : name;
}
/**
 * Emit metric event
 */
async function emitEvent(event) {
    for (const listener of eventListeners) {
        try {
            await listener(event);
        }
        catch {
            // Ignore listener errors
        }
    }
}
/**
 * Update statistics
 */
function updateStatistics() {
    const mutableStats = statistics;
    mutableStats.counterCount = counters.size;
    mutableStats.gaugeCount = gauges.size;
    mutableStats.histogramCount = histograms.size;
    mutableStats.summaryCount = summaries.size;
    mutableStats.totalMetrics = mutableStats.counterCount + mutableStats.gaugeCount + mutableStats.histogramCount + mutableStats.summaryCount;
    let samples = 0;
    for (const counter of counters.values()) {
        samples += Object.keys(counter.values).length;
    }
    for (const gauge of gauges.values()) {
        samples += Object.keys(gauge.values).length;
    }
    for (const histogram of histograms.values()) {
        samples += Object.keys(histogram.values).length * (histogram.buckets.length + 2);
    }
    for (const summary of summaries.values()) {
        for (const value of Object.values(summary.values)) {
            samples += Object.keys(value.quantileValues).length + 2;
        }
    }
    mutableStats.totalSamples = samples;
}
/**
 * Calculate quantile
 */
function calculateQuantile(observations, quantile) {
    if (observations.length === 0) {
        return 0;
    }
    const sorted = [...observations].sort((a, b) => a - b);
    const index = Math.ceil(quantile * sorted.length) - 1;
    return sorted[Math.max(0, index)];
}
/**
 * Find bucket for value
 */
function findBucket(value, buckets) {
    for (const bucket of buckets) {
        if (value <= bucket) {
            return String(bucket);
        }
    }
    return '+Inf';
}
// ============================================================================
// METRIC REGISTRATION
// ============================================================================
/**
 * Register counter
 */
function registerCounter(name, options = {}) {
    const metricId = generateMetricId();
    const now = clock.nowMs();
    const fullName = getFullMetricName(name);
    const definition = {
        metricId,
        name: fullName,
        type: 'counter',
        description: options.description ?? '',
        unit: options.unit ?? '',
        labelNames: options.labelNames ?? [],
        buckets: null,
        quantiles: null,
        maxAge: null,
        ageBuckets: null,
        createdAt: now,
    };
    definitions.set(fullName, definition);
    counters.set(fullName, {
        metricId,
        name: fullName,
        type: 'counter',
        values: {},
    });
    emitEvent({
        eventId: generateEventId(),
        type: 'metric_registered',
        metricName: fullName,
        labels: {},
        value: 0,
        timestamp: now,
    });
    updateStatistics();
    return definition;
}
/**
 * Register gauge
 */
function registerGauge(name, options = {}) {
    const metricId = generateMetricId();
    const now = clock.nowMs();
    const fullName = getFullMetricName(name);
    const definition = {
        metricId,
        name: fullName,
        type: 'gauge',
        description: options.description ?? '',
        unit: options.unit ?? '',
        labelNames: options.labelNames ?? [],
        buckets: null,
        quantiles: null,
        maxAge: null,
        ageBuckets: null,
        createdAt: now,
    };
    definitions.set(fullName, definition);
    gauges.set(fullName, {
        metricId,
        name: fullName,
        type: 'gauge',
        values: {},
    });
    emitEvent({
        eventId: generateEventId(),
        type: 'metric_registered',
        metricName: fullName,
        labels: {},
        value: 0,
        timestamp: now,
    });
    updateStatistics();
    return definition;
}
/**
 * Register histogram
 */
function registerHistogram(name, options = {}) {
    const metricId = generateMetricId();
    const now = clock.nowMs();
    const fullName = getFullMetricName(name);
    const buckets = options.buckets ?? config.defaultBuckets;
    const definition = {
        metricId,
        name: fullName,
        type: 'histogram',
        description: options.description ?? '',
        unit: options.unit ?? '',
        labelNames: options.labelNames ?? [],
        buckets,
        quantiles: null,
        maxAge: null,
        ageBuckets: null,
        createdAt: now,
    };
    definitions.set(fullName, definition);
    histograms.set(fullName, {
        metricId,
        name: fullName,
        type: 'histogram',
        buckets,
        values: {},
    });
    emitEvent({
        eventId: generateEventId(),
        type: 'metric_registered',
        metricName: fullName,
        labels: {},
        value: 0,
        timestamp: now,
    });
    updateStatistics();
    return definition;
}
/**
 * Register summary
 */
function registerSummary(name, options = {}) {
    const metricId = generateMetricId();
    const now = clock.nowMs();
    const fullName = getFullMetricName(name);
    const quantiles = options.quantiles ?? config.defaultQuantiles;
    const definition = {
        metricId,
        name: fullName,
        type: 'summary',
        description: options.description ?? '',
        unit: options.unit ?? '',
        labelNames: options.labelNames ?? [],
        buckets: null,
        quantiles,
        maxAge: options.maxAge ?? 600000,
        ageBuckets: options.ageBuckets ?? 5,
        createdAt: now,
    };
    definitions.set(fullName, definition);
    summaries.set(fullName, {
        metricId,
        name: fullName,
        type: 'summary',
        quantiles,
        values: {},
    });
    emitEvent({
        eventId: generateEventId(),
        type: 'metric_registered',
        metricName: fullName,
        labels: {},
        value: 0,
        timestamp: now,
    });
    updateStatistics();
    return definition;
}
/**
 * Get metric definition
 */
function getDefinition(name) {
    const fullName = getFullMetricName(name);
    return definitions.get(fullName) ?? null;
}
/**
 * Get all definitions
 */
function getAllDefinitions() {
    return Array.from(definitions.values());
}
/**
 * Remove metric
 */
function removeMetric(name) {
    const fullName = getFullMetricName(name);
    const definition = definitions.get(fullName);
    if (!definition) {
        return false;
    }
    definitions.delete(fullName);
    counters.delete(fullName);
    gauges.delete(fullName);
    histograms.delete(fullName);
    summaries.delete(fullName);
    emitEvent({
        eventId: generateEventId(),
        type: 'metric_removed',
        metricName: fullName,
        labels: {},
        value: 0,
        timestamp: clock.nowMs(),
    });
    updateStatistics();
    return true;
}
// ============================================================================
// COUNTER OPERATIONS
// ============================================================================
/**
 * Increment counter
 */
function incrementCounter(name, labels = {}, value = 1) {
    const fullName = getFullMetricName(name);
    const counter = counters.get(fullName);
    if (!counter) {
        registerCounter(name);
        incrementCounter(name, labels, value);
        return;
    }
    const now = clock.nowMs();
    const mergedLabels = mergeLabels(config.defaultLabels, labels);
    const labelKey = getLabelKey(mergedLabels);
    const existing = counter.values[labelKey];
    const newValue = (existing?.value ?? 0) + value;
    const newValues = {
        ...counter.values,
        [labelKey]: {
            value: newValue,
            labels: mergedLabels,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
        },
    };
    counters.set(fullName, {
        ...counter,
        values: newValues,
    });
    emitEvent({
        eventId: generateEventId(),
        type: 'counter_incremented',
        metricName: fullName,
        labels: mergedLabels,
        value,
        timestamp: now,
    });
    updateStatistics();
}
/**
 * Get counter value
 */
function getCounterValue(name, labels = {}) {
    const fullName = getFullMetricName(name);
    const counter = counters.get(fullName);
    if (!counter) {
        return 0;
    }
    const mergedLabels = mergeLabels(config.defaultLabels, labels);
    const labelKey = getLabelKey(mergedLabels);
    return counter.values[labelKey]?.value ?? 0;
}
/**
 * Reset counter
 */
function resetCounter(name, labels) {
    const fullName = getFullMetricName(name);
    const counter = counters.get(fullName);
    if (!counter) {
        return;
    }
    if (labels) {
        const mergedLabels = mergeLabels(config.defaultLabels, labels);
        const labelKey = getLabelKey(mergedLabels);
        const newValues = { ...counter.values };
        delete newValues[labelKey];
        counters.set(fullName, {
            ...counter,
            values: newValues,
        });
    }
    else {
        counters.set(fullName, {
            ...counter,
            values: {},
        });
    }
    updateStatistics();
}
// ============================================================================
// GAUGE OPERATIONS
// ============================================================================
/**
 * Set gauge value
 */
function setGauge(name, value, labels = {}) {
    const fullName = getFullMetricName(name);
    const gauge = gauges.get(fullName);
    if (!gauge) {
        registerGauge(name);
        setGauge(name, value, labels);
        return;
    }
    const now = clock.nowMs();
    const mergedLabels = mergeLabels(config.defaultLabels, labels);
    const labelKey = getLabelKey(mergedLabels);
    const existing = gauge.values[labelKey];
    const newValues = {
        ...gauge.values,
        [labelKey]: {
            value,
            labels: mergedLabels,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
        },
    };
    gauges.set(fullName, {
        ...gauge,
        values: newValues,
    });
    emitEvent({
        eventId: generateEventId(),
        type: 'gauge_set',
        metricName: fullName,
        labels: mergedLabels,
        value,
        timestamp: now,
    });
    updateStatistics();
}
/**
 * Increment gauge
 */
function incrementGauge(name, labels = {}, value = 1) {
    const fullName = getFullMetricName(name);
    const gauge = gauges.get(fullName);
    if (!gauge) {
        registerGauge(name);
        incrementGauge(name, labels, value);
        return;
    }
    const now = clock.nowMs();
    const mergedLabels = mergeLabels(config.defaultLabels, labels);
    const labelKey = getLabelKey(mergedLabels);
    const existing = gauge.values[labelKey];
    const newValue = (existing?.value ?? 0) + value;
    const newValues = {
        ...gauge.values,
        [labelKey]: {
            value: newValue,
            labels: mergedLabels,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
        },
    };
    gauges.set(fullName, {
        ...gauge,
        values: newValues,
    });
    emitEvent({
        eventId: generateEventId(),
        type: 'gauge_incremented',
        metricName: fullName,
        labels: mergedLabels,
        value,
        timestamp: now,
    });
    updateStatistics();
}
/**
 * Decrement gauge
 */
function decrementGauge(name, labels = {}, value = 1) {
    const fullName = getFullMetricName(name);
    const gauge = gauges.get(fullName);
    if (!gauge) {
        registerGauge(name);
        decrementGauge(name, labels, value);
        return;
    }
    const now = clock.nowMs();
    const mergedLabels = mergeLabels(config.defaultLabels, labels);
    const labelKey = getLabelKey(mergedLabels);
    const existing = gauge.values[labelKey];
    const newValue = (existing?.value ?? 0) - value;
    const newValues = {
        ...gauge.values,
        [labelKey]: {
            value: newValue,
            labels: mergedLabels,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
        },
    };
    gauges.set(fullName, {
        ...gauge,
        values: newValues,
    });
    emitEvent({
        eventId: generateEventId(),
        type: 'gauge_decremented',
        metricName: fullName,
        labels: mergedLabels,
        value,
        timestamp: now,
    });
    updateStatistics();
}
/**
 * Get gauge value
 */
function getGaugeValue(name, labels = {}) {
    const fullName = getFullMetricName(name);
    const gauge = gauges.get(fullName);
    if (!gauge) {
        return 0;
    }
    const mergedLabels = mergeLabels(config.defaultLabels, labels);
    const labelKey = getLabelKey(mergedLabels);
    return gauge.values[labelKey]?.value ?? 0;
}
// ============================================================================
// HISTOGRAM OPERATIONS
// ============================================================================
/**
 * Observe histogram value
 */
function observeHistogram(name, value, labels = {}) {
    const fullName = getFullMetricName(name);
    const histogram = histograms.get(fullName);
    if (!histogram) {
        registerHistogram(name);
        observeHistogram(name, value, labels);
        return;
    }
    const now = clock.nowMs();
    const mergedLabels = mergeLabels(config.defaultLabels, labels);
    const labelKey = getLabelKey(mergedLabels);
    const existing = histogram.values[labelKey];
    const bucket = findBucket(value, histogram.buckets);
    const newBucketCounts = { ...(existing?.bucketCounts ?? {}) };
    newBucketCounts[bucket] = (newBucketCounts[bucket] ?? 0) + 1;
    for (const b of histogram.buckets) {
        if (value <= b) {
            newBucketCounts[String(b)] = (newBucketCounts[String(b)] ?? 0) + 1;
        }
    }
    newBucketCounts['+Inf'] = (newBucketCounts['+Inf'] ?? 0) + 1;
    const newValues = {
        ...histogram.values,
        [labelKey]: {
            bucketCounts: newBucketCounts,
            sum: (existing?.sum ?? 0) + value,
            count: (existing?.count ?? 0) + 1,
            labels: mergedLabels,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
        },
    };
    histograms.set(fullName, {
        ...histogram,
        values: newValues,
    });
    emitEvent({
        eventId: generateEventId(),
        type: 'histogram_observed',
        metricName: fullName,
        labels: mergedLabels,
        value,
        timestamp: now,
    });
    updateStatistics();
}
/**
 * Get histogram value
 */
function getHistogramValue(name, labels = {}) {
    const fullName = getFullMetricName(name);
    const histogram = histograms.get(fullName);
    if (!histogram) {
        return null;
    }
    const mergedLabels = mergeLabels(config.defaultLabels, labels);
    const labelKey = getLabelKey(mergedLabels);
    return histogram.values[labelKey] ?? null;
}
/**
 * Time function with histogram
 */
async function timeHistogram(name, fn, labels = {}) {
    const start = clock.nowMs();
    try {
        return await fn();
    }
    finally {
        const duration = (clock.nowMs() - start) / 1000;
        observeHistogram(name, duration, labels);
    }
}
// ============================================================================
// SUMMARY OPERATIONS
// ============================================================================
/**
 * Observe summary value
 */
function observeSummary(name, value, labels = {}) {
    const fullName = getFullMetricName(name);
    const summary = summaries.get(fullName);
    if (!summary) {
        registerSummary(name);
        observeSummary(name, value, labels);
        return;
    }
    const now = clock.nowMs();
    const mergedLabels = mergeLabels(config.defaultLabels, labels);
    const labelKey = getLabelKey(mergedLabels);
    const existing = summary.values[labelKey];
    const observations = [...(existing?.observations ?? []), value].slice(-config.maxSamples);
    const quantileValues = {};
    for (const q of summary.quantiles) {
        quantileValues[String(q)] = calculateQuantile(observations, q);
    }
    const newValues = {
        ...summary.values,
        [labelKey]: {
            quantileValues,
            sum: (existing?.sum ?? 0) + value,
            count: (existing?.count ?? 0) + 1,
            observations,
            labels: mergedLabels,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
        },
    };
    summaries.set(fullName, {
        ...summary,
        values: newValues,
    });
    emitEvent({
        eventId: generateEventId(),
        type: 'summary_observed',
        metricName: fullName,
        labels: mergedLabels,
        value,
        timestamp: now,
    });
    updateStatistics();
}
/**
 * Get summary value
 */
function getSummaryValue(name, labels = {}) {
    const fullName = getFullMetricName(name);
    const summary = summaries.get(fullName);
    if (!summary) {
        return null;
    }
    const mergedLabels = mergeLabels(config.defaultLabels, labels);
    const labelKey = getLabelKey(mergedLabels);
    return summary.values[labelKey] ?? null;
}
/**
 * Time function with summary
 */
async function timeSummary(name, fn, labels = {}) {
    const start = clock.nowMs();
    try {
        return await fn();
    }
    finally {
        const duration = (clock.nowMs() - start) / 1000;
        observeSummary(name, duration, labels);
    }
}
// ============================================================================
// EXPORT
// ============================================================================
/**
 * Export metrics in Prometheus format
 */
function exportPrometheus() {
    const lines = [];
    const now = clock.nowMs();
    for (const counter of counters.values()) {
        const definition = definitions.get(counter.name);
        if (definition?.description) {
            lines.push(`# HELP ${counter.name} ${definition.description}`);
        }
        lines.push(`# TYPE ${counter.name} counter`);
        for (const value of Object.values(counter.values)) {
            const labelStr = Object.entries(value.labels)
                .map(([k, v]) => `${k}="${v}"`)
                .join(',');
            const suffix = labelStr ? `{${labelStr}}` : '';
            const timestamp = config.enableTimestamps ? ` ${now}` : '';
            lines.push(`${counter.name}${suffix} ${value.value}${timestamp}`);
        }
        lines.push('');
    }
    for (const gauge of gauges.values()) {
        const definition = definitions.get(gauge.name);
        if (definition?.description) {
            lines.push(`# HELP ${gauge.name} ${definition.description}`);
        }
        lines.push(`# TYPE ${gauge.name} gauge`);
        for (const value of Object.values(gauge.values)) {
            const labelStr = Object.entries(value.labels)
                .map(([k, v]) => `${k}="${v}"`)
                .join(',');
            const suffix = labelStr ? `{${labelStr}}` : '';
            const timestamp = config.enableTimestamps ? ` ${now}` : '';
            lines.push(`${gauge.name}${suffix} ${value.value}${timestamp}`);
        }
        lines.push('');
    }
    for (const histogram of histograms.values()) {
        const definition = definitions.get(histogram.name);
        if (definition?.description) {
            lines.push(`# HELP ${histogram.name} ${definition.description}`);
        }
        lines.push(`# TYPE ${histogram.name} histogram`);
        for (const value of Object.values(histogram.values)) {
            const baseLabels = Object.entries(value.labels)
                .map(([k, v]) => `${k}="${v}"`)
                .join(',');
            const timestamp = config.enableTimestamps ? ` ${now}` : '';
            let cumulativeCount = 0;
            for (const bucket of histogram.buckets) {
                cumulativeCount += value.bucketCounts[String(bucket)] ?? 0;
                const bucketLabel = baseLabels ? `${baseLabels},le="${bucket}"` : `le="${bucket}"`;
                lines.push(`${histogram.name}_bucket{${bucketLabel}} ${cumulativeCount}${timestamp}`);
            }
            cumulativeCount += value.bucketCounts['+Inf'] ?? 0;
            const infLabel = baseLabels ? `${baseLabels},le="+Inf"` : `le="+Inf"`;
            lines.push(`${histogram.name}_bucket{${infLabel}} ${cumulativeCount}${timestamp}`);
            const suffix = baseLabels ? `{${baseLabels}}` : '';
            lines.push(`${histogram.name}_sum${suffix} ${value.sum}${timestamp}`);
            lines.push(`${histogram.name}_count${suffix} ${value.count}${timestamp}`);
        }
        lines.push('');
    }
    for (const summary of summaries.values()) {
        const definition = definitions.get(summary.name);
        if (definition?.description) {
            lines.push(`# HELP ${summary.name} ${definition.description}`);
        }
        lines.push(`# TYPE ${summary.name} summary`);
        for (const value of Object.values(summary.values)) {
            const baseLabels = Object.entries(value.labels)
                .map(([k, v]) => `${k}="${v}"`)
                .join(',');
            const timestamp = config.enableTimestamps ? ` ${now}` : '';
            for (const [quantile, qValue] of Object.entries(value.quantileValues)) {
                const quantileLabel = baseLabels ? `${baseLabels},quantile="${quantile}"` : `quantile="${quantile}"`;
                lines.push(`${summary.name}{${quantileLabel}} ${qValue}${timestamp}`);
            }
            const suffix = baseLabels ? `{${baseLabels}}` : '';
            lines.push(`${summary.name}_sum${suffix} ${value.sum}${timestamp}`);
            lines.push(`${summary.name}_count${suffix} ${value.count}${timestamp}`);
        }
        lines.push('');
    }
    return lines.join('\n');
}
/**
 * Export metrics in JSON format
 */
function exportJson() {
    const families = [];
    const now = clock.nowMs();
    for (const counter of counters.values()) {
        const definition = definitions.get(counter.name);
        const samples = [];
        for (const value of Object.values(counter.values)) {
            samples.push({
                name: counter.name,
                labels: value.labels,
                value: value.value,
                timestamp: now,
            });
        }
        families.push({
            name: counter.name,
            type: 'counter',
            help: definition?.description ?? '',
            unit: definition?.unit ?? '',
            samples,
        });
    }
    for (const gauge of gauges.values()) {
        const definition = definitions.get(gauge.name);
        const samples = [];
        for (const value of Object.values(gauge.values)) {
            samples.push({
                name: gauge.name,
                labels: value.labels,
                value: value.value,
                timestamp: now,
            });
        }
        families.push({
            name: gauge.name,
            type: 'gauge',
            help: definition?.description ?? '',
            unit: definition?.unit ?? '',
            samples,
        });
    }
    for (const histogram of histograms.values()) {
        const definition = definitions.get(histogram.name);
        const samples = [];
        for (const value of Object.values(histogram.values)) {
            samples.push({
                name: `${histogram.name}_sum`,
                labels: value.labels,
                value: value.sum,
                timestamp: now,
            });
            samples.push({
                name: `${histogram.name}_count`,
                labels: value.labels,
                value: value.count,
                timestamp: now,
            });
        }
        families.push({
            name: histogram.name,
            type: 'histogram',
            help: definition?.description ?? '',
            unit: definition?.unit ?? '',
            samples,
        });
    }
    for (const summary of summaries.values()) {
        const definition = definitions.get(summary.name);
        const samples = [];
        for (const value of Object.values(summary.values)) {
            samples.push({
                name: `${summary.name}_sum`,
                labels: value.labels,
                value: value.sum,
                timestamp: now,
            });
            samples.push({
                name: `${summary.name}_count`,
                labels: value.labels,
                value: value.count,
                timestamp: now,
            });
        }
        families.push({
            name: summary.name,
            type: 'summary',
            help: definition?.description ?? '',
            unit: definition?.unit ?? '',
            samples,
        });
    }
    return families;
}
// ============================================================================
// AGGREGATION
// ============================================================================
/**
 * Create aggregation rule
 */
function createAggregationRule(sourceMetric, targetMetric, options) {
    const ruleId = generateRuleId();
    const rule = {
        ruleId,
        sourceMetric: getFullMetricName(sourceMetric),
        targetMetric: getFullMetricName(targetMetric),
        aggregationType: options.aggregationType,
        groupByLabels: options.groupByLabels ?? [],
        interval: options.interval ?? 60000,
    };
    aggregationRules.set(ruleId, rule);
    return rule;
}
/**
 * Get aggregation rule
 */
function getAggregationRule(ruleId) {
    return aggregationRules.get(ruleId) ?? null;
}
/**
 * Get all aggregation rules
 */
function getAllAggregationRules() {
    return Array.from(aggregationRules.values());
}
/**
 * Delete aggregation rule
 */
function deleteAggregationRule(ruleId) {
    return aggregationRules.delete(ruleId);
}
// ============================================================================
// CONFIGURATION
// ============================================================================
/**
 * Configure collector
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
        totalMetrics: 0,
        totalSamples: 0,
        counterCount: 0,
        gaugeCount: 0,
        histogramCount: 0,
        summaryCount: 0,
        lastFlush: null,
        flushCount: 0,
    });
}
// ============================================================================
// EVENT LISTENERS
// ============================================================================
/**
 * Add event listener
 */
function addEventListener(listener) {
    eventListeners.add(listener);
}
/**
 * Remove event listener
 */
function removeEventListener(listener) {
    eventListeners.delete(listener);
}
/**
 * Clear event listeners
 */
function clearEventListeners() {
    eventListeners.clear();
}
// ============================================================================
// CLEANUP
// ============================================================================
/**
 * Clear all state
 */
function clearAll() {
    definitions.clear();
    counters.clear();
    gauges.clear();
    histograms.clear();
    summaries.clear();
    aggregationRules.clear();
    eventListeners.clear();
    resetStatistics();
}
