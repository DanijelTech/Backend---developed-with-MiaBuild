/**
 * Skaliranje delavcev
 * 
 * @metadata
 *   template_version: "1.0.0"
 *   template_type: "function"
 *   domain_id: "DOMENA_02"
 *   compliance_standards: ["DO-178C", "IEC-61508", "ISO-26262", "MIL-STD-882E"]
 *   generated_at: "{{DATUM_GENERACIJE}}"
 * 
 * @traceability
 *   @requirement ZAH-FN_02_WORKER_SCALE-001
 *   @design DSN-FN_02_WORKER_SCALE-001
 *   @test TST-FN_02_WORKER_SCALE-001
 *   @function_id FN_02_WORKER_SCALE
 *   @hazard_id HAZ-02-103
 * 
 * @approach_type ADAPTIVE
 * @tradeoff_profile EFFICIENCY_OVER_RESPONSIVENESS
 * @failure_assumption GRACEFUL_DEGRADATION
 * 
 * @description
 * Adaptivno skaliranje delavcev glede na obremenitev.
 * Podpira horizontalno in vertikalno skaliranje z nastavljivimi pragovi.
 */

import { Logger } from '{{LOGGER_PATH}}';
import { Metrics } from '{{METRICS_PATH}}';
import { Clock } from '{{CLOCK_PATH}}';

export type ScaleDirection = 'UP' | 'DOWN' | 'NONE';
export type WorkerStatus = 'RUNNING' | 'IDLE' | 'STARTING' | 'STOPPING' | 'FAILED';

export interface WorkerInstance {
    readonly workerId: string;
    readonly status: WorkerStatus;
    readonly startedAt: string;
    readonly lastActivity: string;
    readonly tasksProcessed: number;
    readonly currentLoad: number;
}

export interface ScalingMetrics {
    readonly avgCpuUtilization: number;
    readonly avgMemoryUtilization: number;
    readonly queueDepth: number;
    readonly avgLatency: number;
    readonly errorRate: number;
}

export interface FN_02_WORKER_SCALEConfig {
    readonly enabled: boolean;
    readonly timeout: number;
    readonly minWorkers: number;
    readonly maxWorkers: number;
    readonly scaleUpThreshold: number;
    readonly scaleDownThreshold: number;
    readonly cooldownPeriod: number;
    readonly scaleUpStep: number;
    readonly scaleDownStep: number;
    readonly evaluationPeriod: number;
}

export interface FN_02_WORKER_SCALEInput {
    readonly requestId: string;
    readonly timestamp: string;
    readonly poolId: string;
    readonly currentWorkers: readonly WorkerInstance[];
    readonly metrics: ScalingMetrics;
    readonly forceScale?: ScaleDirection;
}

export interface FN_02_WORKER_SCALEResult {
    readonly success: boolean;
    readonly requestId: string;
    readonly timestamp: string;
    readonly decision: ScaleDirection;
    readonly targetWorkerCount: number;
    readonly workersToAdd?: number;
    readonly workersToRemove?: readonly string[];
    readonly reason: string;
    readonly error?: string;
    readonly metrics: {
        readonly durationMs: number;
        readonly currentWorkerCount: number;
        readonly utilizationScore: number;
    };
}

const DEFAULT_CONFIG: FN_02_WORKER_SCALEConfig = {
    enabled: true,
    timeout: 30000,
    minWorkers: 1,
    maxWorkers: 100,
    scaleUpThreshold: 0.8,
    scaleDownThreshold: 0.3,
    cooldownPeriod: 300000,
    scaleUpStep: 2,
    scaleDownStep: 1,
    evaluationPeriod: 60000,
};

const logger = new Logger('FN_02_WORKER_SCALE');
const metrics = new Metrics('FN_02_WORKER_SCALE');
const clock = new Clock();
const lastScaleAction: Map<string, { direction: ScaleDirection; timestamp: number }> = new Map();

/**
 * @requirement ZAH-FN_02_WORKER_SCALE-001
 * @design DSN-FN_02_WORKER_SCALE-001
 * @test TST-FN_02_WORKER_SCALE-001
 * @function_id FN_02_WORKER_SCALE
 * @hazard_id HAZ-02-103
 */
export async function executeFN_02_WORKER_SCALE(
    input: FN_02_WORKER_SCALEInput,
    config: Partial<FN_02_WORKER_SCALEConfig> = {}
): Promise<FN_02_WORKER_SCALEResult> {
    const startTimestamp = clock.nowMs();
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    
    logger.info('Zacenjam izvajanje FN_02_WORKER_SCALE', {
        requestId: input.requestId,
        poolId: input.poolId,
        currentWorkers: input.currentWorkers.length,
    });
    
    metrics.increment('FN_02_WORKER_SCALE_started');
    
    try {
        validateInput(input, mergedConfig);
        
        const currentWorkerCount = input.currentWorkers.length;
        const utilizationScore = calculateUtilizationScore(input.metrics);
        
        let decision: ScaleDirection = 'NONE';
        let targetWorkerCount = currentWorkerCount;
        let reason = 'Brez spremembe - obremenitev v normalnem obmocju';
        
        if (input.forceScale) {
            decision = input.forceScale;
            reason = 'Prisilno skaliranje';
        } else {
            const lastAction = lastScaleAction.get(input.poolId);
            const inCooldown = lastAction && (clock.nowMs() - lastAction.timestamp) < mergedConfig.cooldownPeriod;
            
            if (inCooldown) {
                decision = 'NONE';
                reason = 'V cooldown obdobju';
            } else if (utilizationScore > mergedConfig.scaleUpThreshold) {
                decision = 'UP';
                reason = `Visoka obremenitev: ${(utilizationScore * 100).toFixed(1)}% > ${(mergedConfig.scaleUpThreshold * 100).toFixed(1)}%`;
            } else if (utilizationScore < mergedConfig.scaleDownThreshold && currentWorkerCount > mergedConfig.minWorkers) {
                decision = 'DOWN';
                reason = `Nizka obremenitev: ${(utilizationScore * 100).toFixed(1)}% < ${(mergedConfig.scaleDownThreshold * 100).toFixed(1)}%`;
            }
        }
        
        let workersToAdd: number | undefined;
        let workersToRemove: string[] | undefined;
        
        switch (decision) {
            case 'UP':
                workersToAdd = Math.min(mergedConfig.scaleUpStep, mergedConfig.maxWorkers - currentWorkerCount);
                targetWorkerCount = currentWorkerCount + workersToAdd;
                if (workersToAdd === 0) {
                    decision = 'NONE';
                    reason = 'Dosezeno maksimalno stevilo delavcev';
                }
                break;
            case 'DOWN':
                const removeCount = Math.min(mergedConfig.scaleDownStep, currentWorkerCount - mergedConfig.minWorkers);
                if (removeCount > 0) {
                    workersToRemove = selectWorkersToRemove(input.currentWorkers, removeCount);
                    targetWorkerCount = currentWorkerCount - workersToRemove.length;
                } else {
                    decision = 'NONE';
                    reason = 'Dosezeno minimalno stevilo delavcev';
                }
                break;
        }
        
        if (decision !== 'NONE') {
            lastScaleAction.set(input.poolId, { direction: decision, timestamp: clock.nowMs() });
            
            if (decision === 'UP' && workersToAdd) {
                await startWorkers(input.poolId, workersToAdd);
            } else if (decision === 'DOWN' && workersToRemove) {
                await stopWorkers(input.poolId, workersToRemove);
            }
        }
        
        const durationMs = clock.nowMs() - startTimestamp;
        metrics.increment(`FN_02_WORKER_SCALE_${decision.toLowerCase()}`);
        metrics.gauge(`FN_02_WORKER_SCALE_${input.poolId}_count`, targetWorkerCount);
        
        return {
            success: true,
            requestId: input.requestId,
            timestamp: input.timestamp,
            decision,
            targetWorkerCount,
            workersToAdd: workersToAdd && workersToAdd > 0 ? workersToAdd : undefined,
            workersToRemove: workersToRemove && workersToRemove.length > 0 ? workersToRemove : undefined,
            reason,
            metrics: { durationMs, currentWorkerCount, utilizationScore },
        };
    } catch (error) {
        const durationMs = clock.nowMs() - startTimestamp;
        metrics.increment('FN_02_WORKER_SCALE_failed');
        
        return {
            success: false,
            requestId: input.requestId,
            timestamp: input.timestamp,
            decision: 'NONE',
            targetWorkerCount: input.currentWorkers.length,
            reason: 'Napaka pri skaliranju',
            error: error instanceof Error ? error.message : String(error),
            metrics: { durationMs, currentWorkerCount: input.currentWorkers.length, utilizationScore: 0 },
        };
    }
}

function validateInput(input: FN_02_WORKER_SCALEInput, config: FN_02_WORKER_SCALEConfig): void {
    if (!input.requestId) throw new Error('requestId je obvezen');
    if (!input.timestamp) throw new Error('timestamp je obvezen');
    if (!input.poolId) throw new Error('poolId je obvezen');
    if (!input.currentWorkers) throw new Error('currentWorkers je obvezen');
    if (!input.metrics) throw new Error('metrics je obvezen');
}

function calculateUtilizationScore(metrics: ScalingMetrics): number {
    const cpuWeight = 0.4;
    const memoryWeight = 0.3;
    const queueWeight = 0.2;
    const latencyWeight = 0.1;
    
    const normalizedQueue = Math.min(metrics.queueDepth / 1000, 1);
    const normalizedLatency = Math.min(metrics.avgLatency / 5000, 1);
    
    return (
        metrics.avgCpuUtilization * cpuWeight +
        metrics.avgMemoryUtilization * memoryWeight +
        normalizedQueue * queueWeight +
        normalizedLatency * latencyWeight
    );
}

function selectWorkersToRemove(workers: readonly WorkerInstance[], count: number): string[] {
    const idleWorkers = workers
        .filter(w => w.status === 'IDLE' || w.currentLoad < 0.1)
        .sort((a, b) => a.tasksProcessed - b.tasksProcessed);
    
    return idleWorkers.slice(0, count).map(w => w.workerId);
}

async function startWorkers(poolId: string, count: number): Promise<void> {
    logger.info('Zaganjam nove delavce', { poolId, count });
    await clock.delay(50);
}

async function stopWorkers(poolId: string, workerIds: readonly string[]): Promise<void> {
    logger.info('Ustavljam delavce', { poolId, workerIds });
    await clock.delay(50);
}

export const __test__ = { validateInput, calculateUtilizationScore, selectWorkersToRemove, DEFAULT_CONFIG, lastScaleAction };
