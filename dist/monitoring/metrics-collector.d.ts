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
export type MetricEventType = 'counter_incremented' | 'gauge_set' | 'gauge_incremented' | 'gauge_decremented' | 'histogram_observed' | 'summary_observed' | 'metric_registered' | 'metric_removed';
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
/**
 * Register counter
 */
export declare function registerCounter(name: string, options?: {
    description?: string;
    unit?: string;
    labelNames?: readonly string[];
}): MetricDefinition;
/**
 * Register gauge
 */
export declare function registerGauge(name: string, options?: {
    description?: string;
    unit?: string;
    labelNames?: readonly string[];
}): MetricDefinition;
/**
 * Register histogram
 */
export declare function registerHistogram(name: string, options?: {
    description?: string;
    unit?: string;
    labelNames?: readonly string[];
    buckets?: readonly number[];
}): MetricDefinition;
/**
 * Register summary
 */
export declare function registerSummary(name: string, options?: {
    description?: string;
    unit?: string;
    labelNames?: readonly string[];
    quantiles?: readonly number[];
    maxAge?: number;
    ageBuckets?: number;
}): MetricDefinition;
/**
 * Get metric definition
 */
export declare function getDefinition(name: string): MetricDefinition | null;
/**
 * Get all definitions
 */
export declare function getAllDefinitions(): readonly MetricDefinition[];
/**
 * Remove metric
 */
export declare function removeMetric(name: string): boolean;
/**
 * Increment counter
 */
export declare function incrementCounter(name: string, labels?: MetricLabels, value?: number): void;
/**
 * Get counter value
 */
export declare function getCounterValue(name: string, labels?: MetricLabels): number;
/**
 * Reset counter
 */
export declare function resetCounter(name: string, labels?: MetricLabels): void;
/**
 * Set gauge value
 */
export declare function setGauge(name: string, value: number, labels?: MetricLabels): void;
/**
 * Increment gauge
 */
export declare function incrementGauge(name: string, labels?: MetricLabels, value?: number): void;
/**
 * Decrement gauge
 */
export declare function decrementGauge(name: string, labels?: MetricLabels, value?: number): void;
/**
 * Get gauge value
 */
export declare function getGaugeValue(name: string, labels?: MetricLabels): number;
/**
 * Observe histogram value
 */
export declare function observeHistogram(name: string, value: number, labels?: MetricLabels): void;
/**
 * Get histogram value
 */
export declare function getHistogramValue(name: string, labels?: MetricLabels): HistogramValue | null;
/**
 * Time function with histogram
 */
export declare function timeHistogram<T>(name: string, fn: () => Promise<T>, labels?: MetricLabels): Promise<T>;
/**
 * Observe summary value
 */
export declare function observeSummary(name: string, value: number, labels?: MetricLabels): void;
/**
 * Get summary value
 */
export declare function getSummaryValue(name: string, labels?: MetricLabels): SummaryValue | null;
/**
 * Time function with summary
 */
export declare function timeSummary<T>(name: string, fn: () => Promise<T>, labels?: MetricLabels): Promise<T>;
/**
 * Export metrics in Prometheus format
 */
export declare function exportPrometheus(): string;
/**
 * Export metrics in JSON format
 */
export declare function exportJson(): readonly MetricFamily[];
/**
 * Create aggregation rule
 */
export declare function createAggregationRule(sourceMetric: string, targetMetric: string, options: {
    aggregationType: AggregationType;
    groupByLabels?: readonly string[];
    interval?: number;
}): AggregationRule;
/**
 * Get aggregation rule
 */
export declare function getAggregationRule(ruleId: string): AggregationRule | null;
/**
 * Get all aggregation rules
 */
export declare function getAllAggregationRules(): readonly AggregationRule[];
/**
 * Delete aggregation rule
 */
export declare function deleteAggregationRule(ruleId: string): boolean;
/**
 * Configure collector
 */
export declare function configure(newConfig: Partial<CollectorConfig>): void;
/**
 * Get configuration
 */
export declare function getConfig(): Readonly<CollectorConfig>;
/**
 * Get statistics
 */
export declare function getStatistics(): Readonly<CollectorStatistics>;
/**
 * Reset statistics
 */
export declare function resetStatistics(): void;
/**
 * Add event listener
 */
export declare function addEventListener(listener: MetricEventListener): void;
/**
 * Remove event listener
 */
export declare function removeEventListener(listener: MetricEventListener): void;
/**
 * Clear event listeners
 */
export declare function clearEventListeners(): void;
/**
 * Clear all state
 */
export declare function clearAll(): void;
