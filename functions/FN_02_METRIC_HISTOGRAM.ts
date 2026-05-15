/**
 * Metrika tipa histogram
 * 
 * @metadata
 *   template_version: "1.0.0"
 *   template_type: "function"
 *   domain_id: "DOMENA_02"
 *   compliance_standards: ["DO-178C", "IEC-61508", "ISO-26262", "MIL-STD-882E"]
 *   generated_at: "{{DATUM_GENERACIJE}}"
 * 
 * @traceability
 *   @requirement ZAH-FN_02_METRIC_HISTOGRAM-001
 *   @design DSN-FN_02_METRIC_HISTOGRAM-001
 *   @test TST-FN_02_METRIC_HISTOGRAM-001
 *   @function_id FN_02_METRIC_HISTOGRAM
 *   @hazard_id HAZ-02-093
 * 
 * @approach_type BUCKETED
 * @tradeoff_profile PRECISION_OVER_MEMORY
 * @failure_assumption APPROXIMATE_ON_OVERFLOW
 * 
 * @description
 * Histogram metrika za distribucijo vrednosti z nastavljivimi bucketi.
 * Podpira percentile, povprecja in izvoz v Prometheus format.
 */

import { Logger } from '{{LOGGER_PATH}}';
import { Metrics } from '{{METRICS_PATH}}';
import { Clock } from '{{CLOCK_PATH}}';

export interface MetricLabels {
    readonly [key: string]: string;
}

export interface HistogramBucket {
    readonly le: number;
    readonly count: number;
}

export interface HistogramMetric {
    readonly name: string;
    readonly labels: MetricLabels;
    readonly buckets: readonly HistogramBucket[];
    readonly sum: number;
    readonly count: number;
    readonly timestamp: string;
    readonly help: string;
}

export interface FN_02_METRIC_HISTOGRAMConfig {
    readonly enabled: boolean;
    readonly timeout: number;
    readonly defaultBuckets: readonly number[];
    readonly maxLabels: number;
    readonly maxLabelLength: number;
    readonly exportFormat: 'PROMETHEUS' | 'OPENMETRICS' | 'JSON';
}

export interface FN_02_METRIC_HISTOGRAMInput {
    readonly requestId: string;
    readonly timestamp: string;
    readonly name: string;
    readonly value: number;
    readonly labels?: MetricLabels;
    readonly buckets?: readonly number[];
    readonly help?: string;
}

export interface FN_02_METRIC_HISTOGRAMResult {
    readonly success: boolean;
    readonly requestId: string;
    readonly timestamp: string;
    readonly metric?: HistogramMetric;
    readonly percentiles?: {
        readonly p50: number;
        readonly p90: number;
        readonly p95: number;
        readonly p99: number;
    };
    readonly error?: string;
    readonly metrics: {
        readonly durationMs: number;
        readonly totalHistograms: number;
    };
}

const DEFAULT_CONFIG: FN_02_METRIC_HISTOGRAMConfig = {
    enabled: true,
    timeout: 5000,
    defaultBuckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    maxLabels: 10,
    maxLabelLength: 128,
    exportFormat: 'PROMETHEUS',
};

const logger = new Logger('FN_02_METRIC_HISTOGRAM');
const metrics = new Metrics('FN_02_METRIC_HISTOGRAM');
const clock = new Clock();

interface HistogramState {
    bucketCounts: number[];
    sum: number;
    count: number;
    values: number[];
    buckets: readonly number[];
    help: string;
    labels: MetricLabels;
}

const histogramRegistry: Map<string, HistogramState> = new Map();

/**
 * @requirement ZAH-FN_02_METRIC_HISTOGRAM-001
 * @design DSN-FN_02_METRIC_HISTOGRAM-001
 * @test TST-FN_02_METRIC_HISTOGRAM-001
 * @function_id FN_02_METRIC_HISTOGRAM
 * @hazard_id HAZ-02-093
 */
export async function executeFN_02_METRIC_HISTOGRAM(
    input: FN_02_METRIC_HISTOGRAMInput,
    config: Partial<FN_02_METRIC_HISTOGRAMConfig> = {}
): Promise<FN_02_METRIC_HISTOGRAMResult> {
    const startTimestamp = clock.nowMs();
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    
    logger.debug('Zacenjam izvajanje FN_02_METRIC_HISTOGRAM', {
        requestId: input.requestId,
        name: input.name,
        value: input.value,
    });
    
    try {
        validateInput(input, mergedConfig);
        
        const metricKey = generateMetricKey(input.name, input.labels || {});
        const buckets = input.buckets || mergedConfig.defaultBuckets;
        
        let state = histogramRegistry.get(metricKey);
        if (!state) {
            state = {
                bucketCounts: new Array(buckets.length).fill(0),
                sum: 0,
                count: 0,
                values: [],
                buckets,
                help: input.help || `Histogram metric ${input.name}`,
                labels: input.labels || {},
            };
        }
        
        state.sum += input.value;
        state.count += 1;
        state.values.push(input.value);
        
        if (state.values.length > 10000) {
            state.values = state.values.slice(-10000);
        }
        
        for (let i = 0; i < buckets.length; i++) {
            if (input.value <= buckets[i]) {
                state.bucketCounts[i]++;
            }
        }
        
        histogramRegistry.set(metricKey, state);
        
        const histogramBuckets: HistogramBucket[] = buckets.map((le, i) => ({
            le,
            count: state!.bucketCounts[i],
        }));
        
        const metric: HistogramMetric = {
            name: input.name,
            labels: state.labels,
            buckets: histogramBuckets,
            sum: state.sum,
            count: state.count,
            timestamp: clock.nowISO(),
            help: state.help,
        };
        
        const percentiles = calculatePercentiles(state.values);
        
        const durationMs = clock.nowMs() - startTimestamp;
        
        return {
            success: true,
            requestId: input.requestId,
            timestamp: input.timestamp,
            metric,
            percentiles,
            metrics: { durationMs, totalHistograms: histogramRegistry.size },
        };
    } catch (error) {
        const durationMs = clock.nowMs() - startTimestamp;
        
        return {
            success: false,
            requestId: input.requestId,
            timestamp: input.timestamp,
            error: error instanceof Error ? error.message : String(error),
            metrics: { durationMs, totalHistograms: histogramRegistry.size },
        };
    }
}

function validateInput(input: FN_02_METRIC_HISTOGRAMInput, config: FN_02_METRIC_HISTOGRAMConfig): void {
    if (!input.requestId) throw new Error('requestId je obvezen');
    if (!input.timestamp) throw new Error('timestamp je obvezen');
    if (!input.name) throw new Error('name je obvezen');
    if (typeof input.value !== 'number' || isNaN(input.value)) throw new Error('value mora biti veljavno stevilo');
    
    if (input.labels) {
        const labelCount = Object.keys(input.labels).length;
        if (labelCount > config.maxLabels) {
            throw new Error(`Prekoraceno maksimalno stevilo oznak: ${config.maxLabels}`);
        }
    }
}

function generateMetricKey(name: string, labels: MetricLabels): string {
    const sortedLabels = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
    const labelString = sortedLabels.map(([k, v]) => `${k}="${v}"`).join(',');
    return labelString ? `${name}{${labelString}}` : name;
}

function calculatePercentiles(values: number[]): { p50: number; p90: number; p95: number; p99: number } {
    if (values.length === 0) {
        return { p50: 0, p90: 0, p95: 0, p99: 0 };
    }
    
    const sorted = [...values].sort((a, b) => a - b);
    const percentile = (p: number) => {
        const index = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    };
    
    return {
        p50: percentile(50),
        p90: percentile(90),
        p95: percentile(95),
        p99: percentile(99),
    };
}

export const __test__ = { validateInput, generateMetricKey, calculatePercentiles, DEFAULT_CONFIG, histogramRegistry };
