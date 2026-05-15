/**
 * Metrics - Application metrics module
 * Provides counters, gauges, histograms, and timing utilities
 */

export interface MetricSample {
  name: string;
  value: number;
  type: 'counter' | 'gauge' | 'histogram' | 'timing';
  timestamp: number;
  labels?: Record<string, string>;
}

export interface Histogram {
  observe(value: number): void;
}

export interface Metrics {
  increment(name: string, value?: number, labels?: Record<string, string>): void;
  decrement(name: string, value?: number, labels?: Record<string, string>): void;
  gauge(name: string, value: number, labels?: Record<string, string>): void;
  timing(name: string, value: number, labels?: Record<string, string>): void;
  histogram(name: string): Histogram;
  get(name: string): number;
  reset(name?: string): void;
  collect(): MetricSample[];
}

type MetricType = 'counter' | 'gauge' | 'histogram';

interface MetricValue {
  type: MetricType;
  value: number;
  values: number[];
  labels?: Record<string, string>;
}

const metrics: Map<string, MetricValue> = new Map();

function getMetric(name: string, type: MetricType): MetricValue {
  let metric = metrics.get(name);
  if (!metric) {
    metric = { type, value: 0, values: [] };
    metrics.set(name, metric);
  }
  return metric;
}

/**
 * Create a new Metrics instance
 */
export function createMetrics(name?: string): Metrics {
  const prefix = name ? `${name}.` : '';

  return {
    increment(name: string, value = 1, labels?: Record<string, string>): void {
      const metric = getMetric(`${prefix}${name}`, 'counter');
      metric.value += value;
      metric.labels = labels;
    },

    decrement(name: string, value = 1, labels?: Record<string, string>): void {
      const metric = getMetric(`${prefix}${name}`, 'counter');
      metric.value -= value;
      metric.labels = labels;
    },

    gauge(name: string, value: number, labels?: Record<string, string>): void {
      const metric = getMetric(`${prefix}${name}`, 'gauge');
      metric.value = value;
      metric.labels = labels;
    },

    timing(name: string, value: number, labels?: Record<string, string>): void {
      const metric = getMetric(`${prefix}${name}`, 'histogram');
      metric.values.push(value);
      metric.labels = labels;
    },

    histogram(name: string): Histogram {
      const fullName = `${prefix}${name}`;
      const metric = getMetric(fullName, 'histogram');

      return {
        observe(value: number): void {
          metric.values.push(value);
        }
      };
    },

    get(name: string): number {
      const metric = metrics.get(`${prefix}${name}`);
      return metric?.value || 0;
    },

    reset(name?: string): void {
      if (name) {
        metrics.delete(`${prefix}${name}`);
      } else {
        metrics.clear();
      }
    },

    collect(): MetricSample[] {
      const samples: MetricSample[] = [];
      const now = Date.now();

      for (const [name, metric] of metrics.entries()) {
        if (metric.type === 'histogram' && metric.values.length > 0) {
          // Calculate mean for histogram
          const sum = metric.values.reduce((a, b) => a + b, 0);
          const mean = sum / metric.values.length;
          samples.push({
            name,
            value: mean,
            type: 'histogram',
            timestamp: now,
            labels: metric.labels
          });
        } else {
          samples.push({
            name,
            value: metric.value,
            type: metric.type as 'counter' | 'gauge',
            timestamp: now,
            labels: metric.labels
          });
        }
      }

      return samples;
    }
  };
}

let _metricsInstance: Metrics | null = null;

/**
 * Get the singleton Metrics instance
 */
export function getMetrics(): Metrics {
  if (!_metricsInstance) {
    _metricsInstance = createMetrics();
  }
  return _metricsInstance;
}

export default { createMetrics, getMetrics };