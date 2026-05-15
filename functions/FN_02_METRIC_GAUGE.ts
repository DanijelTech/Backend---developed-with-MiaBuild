/**
 * Metrika tipa gauge
 * 
 * @metadata
 *   template_version: "1.0.0"
 *   template_type: "function"
 *   domain_id: "DOMENA_02"
 *   compliance_standards: ["DO-178C", "IEC-61508", "ISO-26262", "MIL-STD-882E"]
 *   generated_at: "{{DATUM_GENERACIJE}}"
 * 
 * @traceability
 *   @requirement ZAH-FN_02_METRIC_GAUGE-001
 *   @design DSN-FN_02_METRIC_GAUGE-001
 *   @test TST-FN_02_METRIC_GAUGE-001
 *   @function_id FN_02_METRIC_GAUGE
 *   @hazard_id HAZ-02-092
 * 
 * @approach_type ATOMIC
 * @tradeoff_profile ACCURACY_OVER_THROUGHPUT
 * @failure_assumption LAST_VALUE_ON_FAILURE
 * 
 * @description
 * Atomicno nastavljanje gauge metrike za trenutne vrednosti.
 * Podpira oznake, agregacijo in izvoz v Prometheus format.
 */

import { Logger } from '{{LOGGER_PATH}}';
import { Metrics } from '{{METRICS_PATH}}';
import { Clock } from '{{CLOCK_PATH}}';

export interface MetricLabels {
    readonly [key: string]: string;
}

export interface GaugeMetric {
    readonly name: string;
    readonly value: number;
    readonly labels: MetricLabels;
    readonly timestamp: string;
    readonly help: string;
    readonly unit?: string;
}

export interface FN_02_METRIC_GAUGEConfig {
    readonly enabled: boolean;
    readonly timeout: number;
    readonly maxLabels: number;
    readonly maxLabelLength: number;
    readonly aggregationEnabled: boolean;
    readonly exportFormat: 'PROMETHEUS' | 'OPENMETRICS' | 'JSON';
    readonly retentionSeconds: number;
}

export interface FN_02_METRIC_GAUGEInput {
    readonly requestId: string;
    readonly timestamp: string;
    readonly name: string;
    readonly value: number;
    readonly labels?: MetricLabels;
    readonly help?: string;
    readonly unit?: string;
    readonly operation?: 'SET' | 'INC' | 'DEC';
}

export interface FN_02_METRIC_GAUGEResult {
    readonly success: boolean;
    readonly requestId: string;
    readonly timestamp: string;
    readonly metric?: GaugeMetric;
    readonly previousValue?: number;
    readonly error?: string;
    readonly metrics: {
        readonly durationMs: number;
        readonly totalGauges: number;
    };
}

const DEFAULT_CONFIG: FN_02_METRIC_GAUGEConfig = {
    enabled: true,
    timeout: 5000,
    maxLabels: 10,
    maxLabelLength: 128,
    aggregationEnabled: true,
    exportFormat: 'PROMETHEUS',
    retentionSeconds: 300,
};

const logger = new Logger('FN_02_METRIC_GAUGE');
const metrics = new Metrics('FN_02_METRIC_GAUGE');
const clock = new Clock();
const gaugeRegistry: Map<string, GaugeMetric> = new Map();

/**
 * @requirement ZAH-FN_02_METRIC_GAUGE-001
 * @design DSN-FN_02_METRIC_GAUGE-001
 * @test TST-FN_02_METRIC_GAUGE-001
 * @function_id FN_02_METRIC_GAUGE
 * @hazard_id HAZ-02-092
 */
export async function executeFN_02_METRIC_GAUGE(
    input: FN_02_METRIC_GAUGEInput,
    config: Partial<FN_02_METRIC_GAUGEConfig> = {}
): Promise<FN_02_METRIC_GAUGEResult> {
    const startTimestamp = clock.nowMs();
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    
    logger.debug('Zacenjam izvajanje FN_02_METRIC_GAUGE', {
        requestId: input.requestId,
        name: input.name,
        value: input.value,
    });
    
    try {
        validateInput(input, mergedConfig);
        
        const metricKey = generateMetricKey(input.name, input.labels || {});
        const existingMetric = gaugeRegistry.get(metricKey);
        const previousValue = existingMetric?.value;
        
        let newValue = input.value;
        const operation = input.operation || 'SET';
        
        switch (operation) {
            case 'INC':
                newValue = (previousValue || 0) + input.value;
                break;
            case 'DEC':
                newValue = (previousValue || 0) - input.value;
                break;
            case 'SET':
            default:
                newValue = input.value;
                break;
        }
        
        const metric: GaugeMetric = {
            name: input.name,
            value: newValue,
            labels: input.labels || {},
            timestamp: clock.nowISO(),
            help: input.help || `Gauge metric ${input.name}`,
            unit: input.unit,
        };
        
        gaugeRegistry.set(metricKey, metric);
        
        const durationMs = clock.nowMs() - startTimestamp;
        
        return {
            success: true,
            requestId: input.requestId,
            timestamp: input.timestamp,
            metric,
            previousValue,
            metrics: { durationMs, totalGauges: gaugeRegistry.size },
        };
    } catch (error) {
        const durationMs = clock.nowMs() - startTimestamp;
        
        return {
            success: false,
            requestId: input.requestId,
            timestamp: input.timestamp,
            error: error instanceof Error ? error.message : String(error),
            metrics: { durationMs, totalGauges: gaugeRegistry.size },
        };
    }
}

function validateInput(input: FN_02_METRIC_GAUGEInput, config: FN_02_METRIC_GAUGEConfig): void {
    if (!input.requestId) throw new Error('requestId je obvezen');
    if (!input.timestamp) throw new Error('timestamp je obvezen');
    if (!input.name) throw new Error('name je obvezen');
    if (typeof input.value !== 'number' || isNaN(input.value)) throw new Error('value mora biti veljavno stevilo');
    
    if (input.labels) {
        const labelCount = Object.keys(input.labels).length;
        if (labelCount > config.maxLabels) {
            throw new Error(`Prekoraceno maksimalno stevilo oznak: ${config.maxLabels}`);
        }
        for (const [key, value] of Object.entries(input.labels)) {
            if (key.length > config.maxLabelLength || value.length > config.maxLabelLength) {
                throw new Error(`Oznaka presega maksimalno dolzino: ${config.maxLabelLength}`);
            }
        }
    }
}

function generateMetricKey(name: string, labels: MetricLabels): string {
    const sortedLabels = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
    const labelString = sortedLabels.map(([k, v]) => `${k}="${v}"`).join(',');
    return labelString ? `${name}{${labelString}}` : name;
}

export function exportMetrics(format: 'PROMETHEUS' | 'OPENMETRICS' | 'JSON'): string {
    const metricsArray = Array.from(gaugeRegistry.values());
    
    switch (format) {
        case 'JSON':
            return JSON.stringify(metricsArray, null, 2);
        case 'PROMETHEUS':
        case 'OPENMETRICS':
        default:
            return metricsArray.map(m => {
                const labels = Object.entries(m.labels).map(([k, v]) => `${k}="${v}"`).join(',');
                const labelStr = labels ? `{${labels}}` : '';
                return `# HELP ${m.name} ${m.help}\n# TYPE ${m.name} gauge\n${m.name}${labelStr} ${m.value}`;
            }).join('\n\n');
    }
}

export const __test__ = { validateInput, generateMetricKey, exportMetrics, DEFAULT_CONFIG, gaugeRegistry };
