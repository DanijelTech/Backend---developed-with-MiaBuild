/**
 * Circuit Breaker
 * 
 * @metadata
 *   template_version: "1.0.0"
 *   template_type: "function"
 *   domain_id: "DOMENA_02"
 *   compliance_standards: ["DO-178C", "IEC-61508", "ISO-26262", "MIL-STD-882E"]
 *   generated_at: "{{DATUM_GENERACIJE}}"
 * 
 * @traceability
 *   @requirement ZAH-FN_02_CIRCUIT_BREAKER-001
 *   @design DSN-FN_02_CIRCUIT_BREAKER-001
 *   @test TST-FN_02_CIRCUIT_BREAKER-001
 *   @function_id FN_02_CIRCUIT_BREAKER
 *   @hazard_id HAZ-02-070
 * 
 * @approach_type STATE_MACHINE
 * @tradeoff_profile AVAILABILITY_OVER_CONSISTENCY
 * @failure_assumption FAIL_FAST
 * 
 * @description
 * Implementacija circuit breaker vzorca za zascito pred kaskadnimi napakami.
 * Podpira tri stanja: CLOSED, OPEN, HALF_OPEN z avtomatskim okrevanjem.
 */

import { Logger } from '{{LOGGER_PATH}}';
import { Metrics } from '{{METRICS_PATH}}';
import { Clock } from '{{CLOCK_PATH}}';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerState {
    readonly state: CircuitState;
    readonly failureCount: number;
    readonly successCount: number;
    readonly lastFailureTime?: number;
    readonly lastStateChange: number;
    readonly totalRequests: number;
    readonly totalFailures: number;
}

export interface FN_02_CIRCUIT_BREAKERConfig {
    readonly enabled: boolean;
    readonly timeout: number;
    readonly failureThreshold: number;
    readonly successThreshold: number;
    readonly resetTimeout: number;
    readonly halfOpenMaxRequests: number;
    readonly monitoringWindow: number;
    readonly volumeThreshold: number;
}

export interface FN_02_CIRCUIT_BREAKERInput {
    readonly requestId: string;
    readonly timestamp: string;
    readonly circuitId: string;
    readonly operation: 'EXECUTE' | 'GET_STATE' | 'RESET' | 'FORCE_OPEN' | 'FORCE_CLOSE';
    readonly action?: () => Promise<unknown>;
    readonly fallback?: () => Promise<unknown>;
}

export interface FN_02_CIRCUIT_BREAKERResult {
    readonly success: boolean;
    readonly requestId: string;
    readonly timestamp: string;
    readonly circuitId: string;
    readonly state: CircuitState;
    readonly result?: unknown;
    readonly usedFallback: boolean;
    readonly error?: string;
    readonly metrics: {
        readonly durationMs: number;
        readonly failureRate: number;
        readonly requestsInWindow: number;
    };
}

const DEFAULT_CONFIG: FN_02_CIRCUIT_BREAKERConfig = {
    enabled: true,
    timeout: 30000,
    failureThreshold: 5,
    successThreshold: 3,
    resetTimeout: 30000,
    halfOpenMaxRequests: 3,
    monitoringWindow: 60000,
    volumeThreshold: 10,
};

const logger = new Logger('FN_02_CIRCUIT_BREAKER');
const metrics = new Metrics('FN_02_CIRCUIT_BREAKER');
const clock = new Clock();
const circuits: Map<string, CircuitBreakerState> = new Map();

/**
 * @requirement ZAH-FN_02_CIRCUIT_BREAKER-001
 * @design DSN-FN_02_CIRCUIT_BREAKER-001
 * @test TST-FN_02_CIRCUIT_BREAKER-001
 * @function_id FN_02_CIRCUIT_BREAKER
 * @hazard_id HAZ-02-070
 */
export async function executeFN_02_CIRCUIT_BREAKER(
    input: FN_02_CIRCUIT_BREAKERInput,
    config: Partial<FN_02_CIRCUIT_BREAKERConfig> = {}
): Promise<FN_02_CIRCUIT_BREAKERResult> {
    const startTimestamp = clock.nowMs();
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    
    logger.info('Zacenjam izvajanje FN_02_CIRCUIT_BREAKER', {
        requestId: input.requestId,
        circuitId: input.circuitId,
        operation: input.operation,
    });
    
    metrics.increment('FN_02_CIRCUIT_BREAKER_started');
    
    try {
        validateInput(input);
        
        let circuit = circuits.get(input.circuitId);
        if (!circuit) {
            circuit = createInitialState();
            circuits.set(input.circuitId, circuit);
        }
        
        circuit = updateCircuitState(circuit, mergedConfig);
        circuits.set(input.circuitId, circuit);
        
        let result: unknown;
        let usedFallback = false;
        
        switch (input.operation) {
            case 'GET_STATE':
                break;
            case 'RESET':
                circuit = createInitialState();
                circuits.set(input.circuitId, circuit);
                break;
            case 'FORCE_OPEN':
                circuit = { ...circuit, state: 'OPEN', lastStateChange: clock.nowMs() };
                circuits.set(input.circuitId, circuit);
                break;
            case 'FORCE_CLOSE':
                circuit = { ...circuit, state: 'CLOSED', failureCount: 0, lastStateChange: clock.nowMs() };
                circuits.set(input.circuitId, circuit);
                break;
            case 'EXECUTE':
                if (!input.action) throw new Error('action je obvezen za EXECUTE operacijo');
                
                if (circuit.state === 'OPEN') {
                    if (input.fallback) {
                        result = await input.fallback();
                        usedFallback = true;
                    } else {
                        throw new Error('Circuit je odprt - zahteva zavrnjena');
                    }
                } else {
                    try {
                        result = await Promise.race([
                            input.action(),
                            clock.delay(mergedConfig.timeout).then(() => { throw new Error('Timeout'); }),
                        ]);
                        circuit = recordSuccess(circuit, mergedConfig);
                    } catch (actionError) {
                        circuit = recordFailure(circuit, mergedConfig);
                        if (input.fallback) {
                            result = await input.fallback();
                            usedFallback = true;
                        } else {
                            throw actionError;
                        }
                    }
                    circuits.set(input.circuitId, circuit);
                }
                break;
        }
        
        const durationMs = clock.nowMs() - startTimestamp;
        const failureRate = circuit.totalRequests > 0 ? circuit.totalFailures / circuit.totalRequests : 0;
        
        metrics.increment('FN_02_CIRCUIT_BREAKER_success');
        metrics.gauge(`circuit_${input.circuitId}_state`, circuit.state === 'CLOSED' ? 0 : circuit.state === 'HALF_OPEN' ? 1 : 2);
        
        return {
            success: true,
            requestId: input.requestId,
            timestamp: input.timestamp,
            circuitId: input.circuitId,
            state: circuit.state,
            result,
            usedFallback,
            metrics: { durationMs, failureRate, requestsInWindow: circuit.totalRequests },
        };
    } catch (error) {
        const durationMs = clock.nowMs() - startTimestamp;
        const circuit = circuits.get(input.circuitId);
        metrics.increment('FN_02_CIRCUIT_BREAKER_failed');
        
        return {
            success: false,
            requestId: input.requestId,
            timestamp: input.timestamp,
            circuitId: input.circuitId,
            state: circuit?.state ?? 'CLOSED',
            usedFallback: false,
            error: error instanceof Error ? error.message : String(error),
            metrics: { durationMs, failureRate: 0, requestsInWindow: 0 },
        };
    }
}

function validateInput(input: FN_02_CIRCUIT_BREAKERInput): void {
    if (!input.requestId) throw new Error('requestId je obvezen');
    if (!input.timestamp) throw new Error('timestamp je obvezen');
    if (!input.circuitId) throw new Error('circuitId je obvezen');
    if (!input.operation) throw new Error('operation je obvezen');
}

function createInitialState(): CircuitBreakerState {
    return {
        state: 'CLOSED',
        failureCount: 0,
        successCount: 0,
        lastStateChange: clock.nowMs(),
        totalRequests: 0,
        totalFailures: 0,
    };
}

function updateCircuitState(circuit: CircuitBreakerState, config: FN_02_CIRCUIT_BREAKERConfig): CircuitBreakerState {
    if (circuit.state === 'OPEN') {
        const timeSinceOpen = clock.nowMs() - circuit.lastStateChange;
        if (timeSinceOpen >= config.resetTimeout) {
            return { ...circuit, state: 'HALF_OPEN', successCount: 0, lastStateChange: clock.nowMs() };
        }
    }
    return circuit;
}

function recordSuccess(circuit: CircuitBreakerState, config: FN_02_CIRCUIT_BREAKERConfig): CircuitBreakerState {
    const newSuccessCount = circuit.successCount + 1;
    const newTotalRequests = circuit.totalRequests + 1;
    
    if (circuit.state === 'HALF_OPEN' && newSuccessCount >= config.successThreshold) {
        return { ...circuit, state: 'CLOSED', failureCount: 0, successCount: 0, lastStateChange: clock.nowMs(), totalRequests: newTotalRequests };
    }
    
    return { ...circuit, successCount: newSuccessCount, totalRequests: newTotalRequests };
}

function recordFailure(circuit: CircuitBreakerState, config: FN_02_CIRCUIT_BREAKERConfig): CircuitBreakerState {
    const newFailureCount = circuit.failureCount + 1;
    const newTotalRequests = circuit.totalRequests + 1;
    const newTotalFailures = circuit.totalFailures + 1;
    
    if (circuit.state === 'HALF_OPEN' || newFailureCount >= config.failureThreshold) {
        return { ...circuit, state: 'OPEN', failureCount: newFailureCount, lastFailureTime: clock.nowMs(), lastStateChange: clock.nowMs(), totalRequests: newTotalRequests, totalFailures: newTotalFailures };
    }
    
    return { ...circuit, failureCount: newFailureCount, lastFailureTime: clock.nowMs(), totalRequests: newTotalRequests, totalFailures: newTotalFailures };
}

export const __test__ = { validateInput, createInitialState, updateCircuitState, recordSuccess, recordFailure, DEFAULT_CONFIG, circuits };
