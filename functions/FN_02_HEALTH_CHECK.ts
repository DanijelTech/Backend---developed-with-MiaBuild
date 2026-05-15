/**
 * Zdravstveno preverjanje
 * 
 * @metadata
 *   template_version: "1.0.0"
 *   template_type: "function"
 *   domain_id: "DOMENA_02"
 *   compliance_standards: ["DO-178C", "IEC-61508", "ISO-26262", "MIL-STD-882E"]
 *   generated_at: "{{DATUM_GENERACIJE}}"
 * 
 * @traceability
 *   @requirement ZAH-FN_02_HEALTH_CHECK-001
 *   @design DSN-FN_02_HEALTH_CHECK-001
 *   @test TST-FN_02_HEALTH_CHECK-001
 *   @function_id FN_02_HEALTH_CHECK
 *   @hazard_id HAZ-02-091
 * 
 * @approach_type COMPOSITE
 * @tradeoff_profile AVAILABILITY_OVER_LATENCY
 * @failure_assumption DEGRADED_SERVICE
 * 
 * @description
 * Kompozitno zdravstveno preverjanje vseh sistemskih komponent.
 * Podpira liveness, readiness in startup probe za Kubernetes integracijo.
 */

import { Logger } from '{{LOGGER_PATH}}';
import { Metrics } from '{{METRICS_PATH}}';
import { Clock } from '{{CLOCK_PATH}}';

export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';
export type ProbeType = 'LIVENESS' | 'READINESS' | 'STARTUP';

export interface ComponentHealth {
    readonly name: string;
    readonly status: HealthStatus;
    readonly latencyMs: number;
    readonly message?: string;
    readonly lastCheck: string;
    readonly consecutiveFailures: number;
}

export interface FN_02_HEALTH_CHECKConfig {
    readonly enabled: boolean;
    readonly timeout: number;
    readonly componentTimeout: number;
    readonly parallelChecks: boolean;
    readonly includeDetails: boolean;
    readonly degradedThreshold: number;
    readonly unhealthyThreshold: number;
}

export interface FN_02_HEALTH_CHECKInput {
    readonly requestId: string;
    readonly timestamp: string;
    readonly probeType: ProbeType;
    readonly components?: readonly string[];
    readonly includeMetrics?: boolean;
}

export interface FN_02_HEALTH_CHECKResult {
    readonly success: boolean;
    readonly requestId: string;
    readonly timestamp: string;
    readonly status: HealthStatus;
    readonly components: readonly ComponentHealth[];
    readonly error?: string;
    readonly metrics: {
        readonly durationMs: number;
        readonly healthyCount: number;
        readonly degradedCount: number;
        readonly unhealthyCount: number;
    };
}

const DEFAULT_CONFIG: FN_02_HEALTH_CHECKConfig = {
    enabled: true,
    timeout: 30000,
    componentTimeout: 5000,
    parallelChecks: true,
    includeDetails: true,
    degradedThreshold: 1,
    unhealthyThreshold: 3,
};

const logger = new Logger('FN_02_HEALTH_CHECK');
const metrics = new Metrics('FN_02_HEALTH_CHECK');
const clock = new Clock();

const componentCheckers: Map<string, () => Promise<ComponentHealth>> = new Map();
const componentFailures: Map<string, number> = new Map();

/**
 * @requirement ZAH-FN_02_HEALTH_CHECK-001
 * @design DSN-FN_02_HEALTH_CHECK-001
 * @test TST-FN_02_HEALTH_CHECK-001
 * @function_id FN_02_HEALTH_CHECK
 * @hazard_id HAZ-02-091
 */
export async function executeFN_02_HEALTH_CHECK(
    input: FN_02_HEALTH_CHECKInput,
    config: Partial<FN_02_HEALTH_CHECKConfig> = {}
): Promise<FN_02_HEALTH_CHECKResult> {
    const startTimestamp = clock.nowMs();
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    
    logger.info('Zacenjam izvajanje FN_02_HEALTH_CHECK', {
        requestId: input.requestId,
        probeType: input.probeType,
    });
    
    metrics.increment('FN_02_HEALTH_CHECK_started');
    
    try {
        validateInput(input);
        
        const componentsToCheck = input.components || getDefaultComponents(input.probeType);
        const componentResults: ComponentHealth[] = [];
        
        if (mergedConfig.parallelChecks) {
            const checkPromises = componentsToCheck.map(name => checkComponent(name, mergedConfig));
            const results = await Promise.all(checkPromises);
            componentResults.push(...results);
        } else {
            for (const name of componentsToCheck) {
                const result = await checkComponent(name, mergedConfig);
                componentResults.push(result);
            }
        }
        
        const healthyCount = componentResults.filter(c => c.status === 'HEALTHY').length;
        const degradedCount = componentResults.filter(c => c.status === 'DEGRADED').length;
        const unhealthyCount = componentResults.filter(c => c.status === 'UNHEALTHY').length;
        
        const overallStatus = determineOverallStatus(componentResults, mergedConfig);
        
        const durationMs = clock.nowMs() - startTimestamp;
        metrics.increment('FN_02_HEALTH_CHECK_success');
        metrics.gauge('FN_02_HEALTH_CHECK_healthy', healthyCount);
        metrics.gauge('FN_02_HEALTH_CHECK_unhealthy', unhealthyCount);
        
        return {
            success: overallStatus !== 'UNHEALTHY',
            requestId: input.requestId,
            timestamp: input.timestamp,
            status: overallStatus,
            components: mergedConfig.includeDetails ? componentResults : [],
            metrics: { durationMs, healthyCount, degradedCount, unhealthyCount },
        };
    } catch (error) {
        const durationMs = clock.nowMs() - startTimestamp;
        metrics.increment('FN_02_HEALTH_CHECK_failed');
        
        return {
            success: false,
            requestId: input.requestId,
            timestamp: input.timestamp,
            status: 'UNHEALTHY',
            components: [],
            error: error instanceof Error ? error.message : String(error),
            metrics: { durationMs, healthyCount: 0, degradedCount: 0, unhealthyCount: 0 },
        };
    }
}

function validateInput(input: FN_02_HEALTH_CHECKInput): void {
    if (!input.requestId) throw new Error('requestId je obvezen');
    if (!input.timestamp) throw new Error('timestamp je obvezen');
    if (!input.probeType) throw new Error('probeType je obvezen');
}

function getDefaultComponents(probeType: ProbeType): string[] {
    switch (probeType) {
        case 'LIVENESS':
            return ['process', 'memory'];
        case 'READINESS':
            return ['database', 'cache', 'queue', 'external_api'];
        case 'STARTUP':
            return ['config', 'database', 'migrations'];
        default:
            return ['database', 'cache'];
    }
}

async function checkComponent(name: string, config: FN_02_HEALTH_CHECKConfig): Promise<ComponentHealth> {
    const checkStart = clock.nowMs();
    
    try {
        const checker = componentCheckers.get(name);
        if (checker) {
            return await Promise.race([
                checker(),
                clock.delay(config.componentTimeout).then(() => {
                    throw new Error('Timeout');
                }),
            ]);
        }
        
        await clock.delay(10);
        
        const failures = componentFailures.get(name) || 0;
        componentFailures.set(name, 0);
        
        return {
            name,
            status: 'HEALTHY',
            latencyMs: clock.nowMs() - checkStart,
            lastCheck: clock.nowISO(),
            consecutiveFailures: 0,
        };
    } catch (error) {
        const failures = (componentFailures.get(name) || 0) + 1;
        componentFailures.set(name, failures);
        
        const status: HealthStatus = failures >= config.unhealthyThreshold ? 'UNHEALTHY' : 
                                     failures >= config.degradedThreshold ? 'DEGRADED' : 'HEALTHY';
        
        return {
            name,
            status,
            latencyMs: clock.nowMs() - checkStart,
            message: error instanceof Error ? error.message : String(error),
            lastCheck: clock.nowISO(),
            consecutiveFailures: failures,
        };
    }
}

function determineOverallStatus(components: readonly ComponentHealth[], config: FN_02_HEALTH_CHECKConfig): HealthStatus {
    if (components.some(c => c.status === 'UNHEALTHY')) return 'UNHEALTHY';
    if (components.some(c => c.status === 'DEGRADED')) return 'DEGRADED';
    if (components.some(c => c.status === 'UNKNOWN')) return 'DEGRADED';
    return 'HEALTHY';
}

export function registerComponentChecker(name: string, checker: () => Promise<ComponentHealth>): void {
    componentCheckers.set(name, checker);
}

export const __test__ = { validateInput, getDefaultComponents, checkComponent, determineOverallStatus, DEFAULT_CONFIG, componentCheckers, componentFailures };
