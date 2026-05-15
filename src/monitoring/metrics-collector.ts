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

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI ZA METRICS COLLECTOR
// ============================================================================

/**
 * Metric type
 */
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

/**
 * Metric value
 */
export type MetricValue = number;

/**
 * Metric labels
 */
export type MetricLabels = Readonly<Record<string, string>>;

/**
 * Metric definition
 */
export interface MetricDefinition {
    readonly metricId: string;
    readonly name: string;
    readonly type: MetricType;
    readonly description: string;
    readonly unit: string;
    readonly labelNames: readonly string[];
    readonly buckets: readonly number[] | null;
    readonly quantiles: readonly number[] | null;
    readonly maxAge: number | null;
    readonly ageBuckets: number | null;
    readonly createdAt: number;
}

/**
 * Counter metric
 */
export interface CounterMetric {
    readonly metricId: string;
    readonly name: string;
    readonly type: 'counter';
    readonly values: Readonly<Record<string, CounterValue>>;
}

/**
 * Counter value
 */
export interface CounterValue {
    readonly value: number;
    readonly labels: MetricLabels;
    readonly createdAt: number;
    readonly updatedAt: number;
}

/**
 * Gauge metric
 */
export interface GaugeMetric {
    readonly metricId: string;
    readonly name: string;
    readonly type: 'gauge';
    readonly values: Readonly<Record<string, GaugeValue>>;
}

/**
 * Gauge value
 */
export interface GaugeValue {
    readonly value: number;
    readonly labels: MetricLabels;
    readonly createdAt: number;
    readonly updatedAt: number;
}

/**
 * Histogram metric
 */
export interface HistogramMetric {
    readonly metricId: string;
    readonly name: string;
    readonly type: 'histogram';
    readonly buckets: readonly number[];
    readonly values: Readonly<Record<string, HistogramValue>>;
}

/**
 * Histogram value
 */
export interface HistogramValue {
    readonly bucketCounts: Readonly<Record<string, number>>;
    readonly sum: number;
    readonly count: number;
    readonly labels: MetricLabels;
    readonly createdAt: number;
    readonly updatedAt: number;
}

/**
 * Summary metric
 */
export interface SummaryMetric {
    readonly metricId: string;
    readonly name: string;
    readonly type: 'summary';
    readonly quantiles: readonly number[];
    readonly values: Readonly<Record<string, SummaryValue>>;
}

/**
 * Summary value
 */
export interface SummaryValue {
    readonly quantileValues: Readonly<Record<string, number>>;
    readonly sum: number;
    readonly count: number;
    readonly observations: readonly number[];
    readonly labels: MetricLabels;
    readonly createdAt: number;
    readonly updatedAt: number;
}

/**
 * Metric sample
 */
export interface MetricSample {
    readonly name: string;
    readonly labels: MetricLabels;
    readonly value: number;
    readonly timestamp: number;
}

/**
 * Metric family
 */
export interface MetricFamily {
    readonly name: string;
    readonly type: MetricType;
    readonly help: string;
    readonly unit: string;
    readonly samples: readonly MetricSample[];
}

/**
 * Export format
 */
export type ExportFormat = 'prometheus' | 'json' | 'openmetrics' | 'statsd';

/**
 * Collector configuration
 */
export interface CollectorConfig {
    readonly collectorId: string;
    readonly defaultLabels: MetricLabels;
    readonly prefix: string;
    readonly enableTimestamps: boolean;
    readonly defaultBuckets: readonly number[];
    readonly defaultQuantiles: readonly number[];
    readonly maxSamples: number;
    readonly flushInterval: number;
}

/**
 * Metric event
 */
export interface MetricEvent {
    readonly eventId: string;
    readonly type: MetricEventType;
    readonly metricName: string;
    readonly labels: MetricLabels;
    readonly value: number;
    readonly timestamp: number;
}

/**
 * Metric event type
 */
export type MetricEventType =
    | 'counter_incremented'
    | 'gauge_set'
    | 'gauge_incremented'
    | 'gauge_decremented'
    | 'histogram_observed'
    | 'summary_observed'
    | 'metric_registered'
    | 'metric_removed';

/**
 * Metric event listener
 */
export type MetricEventListener = (event: MetricEvent) => void | Promise<void>;

/**
 * Collector statistics
 */
export interface CollectorStatistics {
    readonly totalMetrics: number;
    readonly totalSamples: number;
    readonly counterCount: number;
    readonly gaugeCount: number;
    readonly histogramCount: number;
    readonly summaryCount: number;
    readonly lastFlush: number | null;
    readonly flushCount: number;
}

/**
 * Push gateway configuration
 */
export interface PushGatewayConfig {
    readonly url: string;
    readonly jobName: string;
    readonly instance: string;
    readonly pushInterval: number;
    readonly timeout: number;
    readonly headers: Readonly<Record<string, string>>;
}

/**
 * Aggregation type
 */
export type AggregationType = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'last';

/**
 * Aggregation rule
 */
export interface AggregationRule {
    readonly ruleId: string;
    readonly sourceMetric: string;
    readonly targetMetric: string;
    readonly aggregationType: AggregationType;
    readonly groupByLabels: readonly string[];
    readonly interval: number;
}

// ============================================================================
// STANJE
// ============================================================================

const definitions: Map<string, MetricDefinition> = new Map();
const counters: Map<string, CounterMetric> = new Map();
const gauges: Map<string, GaugeMetric> = new Map();
const histograms: Map<string, HistogramMetric> = new Map();
const summaries: Map<string, SummaryMetric> = new Map();
const aggregationRules: Map<string, AggregationRule> = new Map();
const eventListeners: Set<MetricEventListener> = new Set();

let metricCounter = 0;
let eventCounter = 0;
let ruleCounter = 0;

let config: CollectorConfig = {
    collectorId: 'collector-1',
    defaultLabels: {},
    prefix: '',
    enableTimestamps: true,
    defaultBuckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    defaultQuantiles: [0.5, 0.9, 0.95, 0.99],
    maxSamples: 10000,
    flushInterval: 60000,
};

const statistics: CollectorStatistics = {
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
function generateMetricId(): string {
    metricCounter++;
    return generateDeterministicId(`metric-${metricCounter}`);
}

/**
 * Generate event ID
 */
function generateEventId(): string {
    eventCounter++;
    return generateDeterministicId(`metric-event-${eventCounter}`);
}

/**
 * Generate rule ID
 */
function generateRuleId(): string {
    ruleCounter++;
    return generateDeterministicId(`agg-rule-${ruleCounter}`);
}

/**
 * Get label key
 */
function getLabelKey(labels: MetricLabels): string {
    const sortedKeys = Object.keys(labels).sort();
    return sortedKeys.map(k => `${k}="${labels[k]}"`).join(',');
}

/**
 * Merge labels
 */
function mergeLabels(base: MetricLabels, override: MetricLabels): MetricLabels {
    return { ...base, ...override };
}

/**
 * Get full metric name
 */
function getFullMetricName(name: string): string {
    return config.prefix ? `${config.prefix}_${name}` : name;
}

/**
 * Emit metric event
 */
async function emitEvent(event: MetricEvent): Promise<void> {
    for (const listener of eventListeners) {
        try {
            await listener(event);
        } catch {
            // Ignore listener errors
        }
    }
}

/**
 * Update statistics
 */
function updateStatistics(): void {
    const mutableStats = statistics as {
        totalMetrics: number;
        totalSamples: number;
        counterCount: number;
        gaugeCount: number;
        histogramCount: number;
        summaryCount: number;
    };
    
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
function calculateQuantile(observations: readonly number[], quantile: number): number {
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
function findBucket(value: number, buckets: readonly number[]): string {
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
export function registerCounter(
    name: string,
    options: {
        description?: string;
        unit?: string;
        labelNames?: readonly string[];
    } = {}
): MetricDefinition {
    const metricId = generateMetricId();
    const now = clock.nowMs();
    const fullName = getFullMetricName(name);
    
    const definition: MetricDefinition = {
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
export function registerGauge(
    name: string,
    options: {
        description?: string;
        unit?: string;
        labelNames?: readonly string[];
    } = {}
): MetricDefinition {
    const metricId = generateMetricId();
    const now = clock.nowMs();
    const fullName = getFullMetricName(name);
    
    const definition: MetricDefinition = {
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
export function registerHistogram(
    name: string,
    options: {
        description?: string;
        unit?: string;
        labelNames?: readonly string[];
        buckets?: readonly number[];
    } = {}
): MetricDefinition {
    const metricId = generateMetricId();
    const now = clock.nowMs();
    const fullName = getFullMetricName(name);
    const buckets = options.buckets ?? config.defaultBuckets;
    
    const definition: MetricDefinition = {
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
export function registerSummary(
    name: string,
    options: {
        description?: string;
        unit?: string;
        labelNames?: readonly string[];
        quantiles?: readonly number[];
        maxAge?: number;
        ageBuckets?: number;
    } = {}
): MetricDefinition {
    const metricId = generateMetricId();
    const now = clock.nowMs();
    const fullName = getFullMetricName(name);
    const quantiles = options.quantiles ?? config.defaultQuantiles;
    
    const definition: MetricDefinition = {
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
export function getDefinition(name: string): MetricDefinition | null {
    const fullName = getFullMetricName(name);
    return definitions.get(fullName) ?? null;
}

/**
 * Get all definitions
 */
export function getAllDefinitions(): readonly MetricDefinition[] {
    return Array.from(definitions.values());
}

/**
 * Remove metric
 */
export function removeMetric(name: string): boolean {
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
export function incrementCounter(name: string, labels: MetricLabels = {}, value: number = 1): void {
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
export function getCounterValue(name: string, labels: MetricLabels = {}): number {
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
export function resetCounter(name: string, labels?: MetricLabels): void {
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
    } else {
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
export function setGauge(name: string, value: number, labels: MetricLabels = {}): void {
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
export function incrementGauge(name: string, labels: MetricLabels = {}, value: number = 1): void {
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
export function decrementGauge(name: string, labels: MetricLabels = {}, value: number = 1): void {
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
export function getGaugeValue(name: string, labels: MetricLabels = {}): number {
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
export function observeHistogram(name: string, value: number, labels: MetricLabels = {}): void {
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
export function getHistogramValue(name: string, labels: MetricLabels = {}): HistogramValue | null {
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
export async function timeHistogram<T>(
    name: string,
    fn: () => Promise<T>,
    labels: MetricLabels = {}
): Promise<T> {
    const start = clock.nowMs();
    try {
        return await fn();
    } finally {
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
export function observeSummary(name: string, value: number, labels: MetricLabels = {}): void {
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
    
    const quantileValues: Record<string, number> = {};
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
export function getSummaryValue(name: string, labels: MetricLabels = {}): SummaryValue | null {
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
export async function timeSummary<T>(
    name: string,
    fn: () => Promise<T>,
    labels: MetricLabels = {}
): Promise<T> {
    const start = clock.nowMs();
    try {
        return await fn();
    } finally {
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
export function exportPrometheus(): string {
    const lines: string[] = [];
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
export function exportJson(): readonly MetricFamily[] {
    const families: MetricFamily[] = [];
    const now = clock.nowMs();
    
    for (const counter of counters.values()) {
        const definition = definitions.get(counter.name);
        const samples: MetricSample[] = [];
        
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
        const samples: MetricSample[] = [];
        
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
        const samples: MetricSample[] = [];
        
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
        const samples: MetricSample[] = [];
        
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
export function createAggregationRule(
    sourceMetric: string,
    targetMetric: string,
    options: {
        aggregationType: AggregationType;
        groupByLabels?: readonly string[];
        interval?: number;
    }
): AggregationRule {
    const ruleId = generateRuleId();
    
    const rule: AggregationRule = {
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
export function getAggregationRule(ruleId: string): AggregationRule | null {
    return aggregationRules.get(ruleId) ?? null;
}

/**
 * Get all aggregation rules
 */
export function getAllAggregationRules(): readonly AggregationRule[] {
    return Array.from(aggregationRules.values());
}

/**
 * Delete aggregation rule
 */
export function deleteAggregationRule(ruleId: string): boolean {
    return aggregationRules.delete(ruleId);
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Configure collector
 */
export function configure(newConfig: Partial<CollectorConfig>): void {
    config = { ...config, ...newConfig };
}

/**
 * Get configuration
 */
export function getConfig(): Readonly<CollectorConfig> {
    return { ...config };
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get statistics
 */
export function getStatistics(): Readonly<CollectorStatistics> {
    updateStatistics();
    return { ...statistics };
}

/**
 * Reset statistics
 */
export function resetStatistics(): void {
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
export function addEventListener(listener: MetricEventListener): void {
    eventListeners.add(listener);
}

/**
 * Remove event listener
 */
export function removeEventListener(listener: MetricEventListener): void {
    eventListeners.delete(listener);
}

/**
 * Clear event listeners
 */
export function clearEventListeners(): void {
    eventListeners.clear();
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Clear all state
 */
export function clearAll(): void {
    definitions.clear();
    counters.clear();
    gauges.clear();
    histograms.clear();
    summaries.clear();
    aggregationRules.clear();
    eventListeners.clear();
    resetStatistics();
}
