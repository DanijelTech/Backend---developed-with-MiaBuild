/**
 * Prioritetna vrsta sporocil
 * 
 * @metadata
 *   template_version: "1.0.0"
 *   template_type: "function"
 *   domain_id: "DOMENA_02"
 *   compliance_standards: ["DO-178C", "IEC-61508", "ISO-26262", "MIL-STD-882E"]
 *   generated_at: "{{DATUM_GENERACIJE}}"
 * 
 * @traceability
 *   @requirement ZAH-FN_02_QUEUE_PRIORITY-001
 *   @design DSN-FN_02_QUEUE_PRIORITY-001
 *   @test TST-FN_02_QUEUE_PRIORITY-001
 *   @function_id FN_02_QUEUE_PRIORITY
 *   @hazard_id HAZ-02-097
 * 
 * @approach_type HEAP_BASED
 * @tradeoff_profile FAIRNESS_OVER_THROUGHPUT
 * @failure_assumption PRIORITY_PRESERVATION
 * 
 * @description
 * Prioritetna vrsta sporocil z vec ravnmi prioritet.
 * Zagotavlja, da se sporocila z visjo prioriteto obdelajo prej.
 */

import { Logger } from '{{LOGGER_PATH}}';
import { Metrics } from '{{METRICS_PATH}}';
import { Clock } from '{{CLOCK_PATH}}';

export type PriorityLevel = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW' | 'BACKGROUND';

export interface PriorityMessage<T = unknown> {
    readonly messageId: string;
    readonly priority: PriorityLevel;
    readonly body: T;
    readonly attributes: Record<string, string>;
    readonly timestamp: string;
    readonly deadline?: string;
}

export interface FN_02_QUEUE_PRIORITYConfig {
    readonly enabled: boolean;
    readonly timeout: number;
    readonly maxQueueSize: number;
    readonly priorityWeights: Record<PriorityLevel, number>;
    readonly starvationPrevention: boolean;
    readonly maxWaitTime: Record<PriorityLevel, number>;
    readonly preemptionEnabled: boolean;
}

export interface FN_02_QUEUE_PRIORITYInput {
    readonly requestId: string;
    readonly timestamp: string;
    readonly queueId: string;
    readonly operation: 'ENQUEUE' | 'DEQUEUE' | 'PEEK' | 'REORDER';
    readonly message?: PriorityMessage;
    readonly count?: number;
}

export interface FN_02_QUEUE_PRIORITYResult {
    readonly success: boolean;
    readonly requestId: string;
    readonly timestamp: string;
    readonly messages?: readonly PriorityMessage[];
    readonly queueDepth: number;
    readonly priorityDistribution: Record<PriorityLevel, number>;
    readonly error?: string;
    readonly metrics: {
        readonly durationMs: number;
        readonly avgWaitTime: number;
        readonly preemptionCount: number;
    };
}

const DEFAULT_CONFIG: FN_02_QUEUE_PRIORITYConfig = {
    enabled: true,
    timeout: 30000,
    maxQueueSize: 100000,
    priorityWeights: { CRITICAL: 100, HIGH: 50, NORMAL: 10, LOW: 5, BACKGROUND: 1 },
    starvationPrevention: true,
    maxWaitTime: { CRITICAL: 1000, HIGH: 5000, NORMAL: 30000, LOW: 60000, BACKGROUND: 300000 },
    preemptionEnabled: true,
};

const logger = new Logger('FN_02_QUEUE_PRIORITY');
const metrics = new Metrics('FN_02_QUEUE_PRIORITY');
const clock = new Clock();

interface PriorityQueueState {
    messages: PriorityMessage[];
    enqueuedAt: Map<string, number>;
}

const priorityQueues: Map<string, PriorityQueueState> = new Map();

/**
 * @requirement ZAH-FN_02_QUEUE_PRIORITY-001
 * @design DSN-FN_02_QUEUE_PRIORITY-001
 * @test TST-FN_02_QUEUE_PRIORITY-001
 * @function_id FN_02_QUEUE_PRIORITY
 * @hazard_id HAZ-02-097
 */
export async function executeFN_02_QUEUE_PRIORITY(
    input: FN_02_QUEUE_PRIORITYInput,
    config: Partial<FN_02_QUEUE_PRIORITYConfig> = {}
): Promise<FN_02_QUEUE_PRIORITYResult> {
    const startTimestamp = clock.nowMs();
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    
    logger.info('Zacenjam izvajanje FN_02_QUEUE_PRIORITY', {
        requestId: input.requestId,
        queueId: input.queueId,
        operation: input.operation,
    });
    
    metrics.increment('FN_02_QUEUE_PRIORITY_started');
    
    try {
        validateInput(input);
        
        let queue = priorityQueues.get(input.queueId);
        if (!queue) {
            queue = { messages: [], enqueuedAt: new Map() };
            priorityQueues.set(input.queueId, queue);
        }
        
        let resultMessages: PriorityMessage[] = [];
        let preemptionCount = 0;
        
        switch (input.operation) {
            case 'ENQUEUE':
                if (!input.message) throw new Error('message je obvezen za ENQUEUE');
                if (queue.messages.length >= mergedConfig.maxQueueSize) {
                    throw new Error('Vrsta je polna');
                }
                
                queue.messages.push(input.message);
                queue.enqueuedAt.set(input.message.messageId, clock.nowMs());
                sortQueue(queue, mergedConfig);
                
                logger.debug('Sporocilo dodano v vrsto', { messageId: input.message.messageId, priority: input.message.priority });
                break;
                
            case 'DEQUEUE':
                const count = input.count || 1;
                
                if (mergedConfig.starvationPrevention) {
                    preemptionCount = preventStarvation(queue, mergedConfig);
                }
                
                resultMessages = queue.messages.splice(0, count);
                for (const msg of resultMessages) {
                    queue.enqueuedAt.delete(msg.messageId);
                }
                break;
                
            case 'PEEK':
                const peekCount = input.count || 1;
                resultMessages = queue.messages.slice(0, peekCount);
                break;
                
            case 'REORDER':
                sortQueue(queue, mergedConfig);
                if (mergedConfig.starvationPrevention) {
                    preemptionCount = preventStarvation(queue, mergedConfig);
                }
                break;
        }
        
        const priorityDistribution = calculatePriorityDistribution(queue);
        const avgWaitTime = calculateAverageWaitTime(queue);
        
        const durationMs = clock.nowMs() - startTimestamp;
        metrics.increment('FN_02_QUEUE_PRIORITY_success');
        metrics.gauge(`FN_02_QUEUE_PRIORITY_${input.queueId}_depth`, queue.messages.length);
        
        return {
            success: true,
            requestId: input.requestId,
            timestamp: input.timestamp,
            messages: resultMessages.length > 0 ? resultMessages : undefined,
            queueDepth: queue.messages.length,
            priorityDistribution,
            metrics: { durationMs, avgWaitTime, preemptionCount },
        };
    } catch (error) {
        const durationMs = clock.nowMs() - startTimestamp;
        metrics.increment('FN_02_QUEUE_PRIORITY_failed');
        
        return {
            success: false,
            requestId: input.requestId,
            timestamp: input.timestamp,
            queueDepth: 0,
            priorityDistribution: { CRITICAL: 0, HIGH: 0, NORMAL: 0, LOW: 0, BACKGROUND: 0 },
            error: error instanceof Error ? error.message : String(error),
            metrics: { durationMs, avgWaitTime: 0, preemptionCount: 0 },
        };
    }
}

function validateInput(input: FN_02_QUEUE_PRIORITYInput): void {
    if (!input.requestId) throw new Error('requestId je obvezen');
    if (!input.timestamp) throw new Error('timestamp je obvezen');
    if (!input.queueId) throw new Error('queueId je obvezen');
    if (!input.operation) throw new Error('operation je obvezen');
}

function sortQueue(queue: PriorityQueueState, config: FN_02_QUEUE_PRIORITYConfig): void {
    queue.messages.sort((a, b) => {
        const weightA = config.priorityWeights[a.priority];
        const weightB = config.priorityWeights[b.priority];
        if (weightA !== weightB) return weightB - weightA;
        
        const timeA = queue.enqueuedAt.get(a.messageId) || 0;
        const timeB = queue.enqueuedAt.get(b.messageId) || 0;
        return timeA - timeB;
    });
}

function preventStarvation(queue: PriorityQueueState, config: FN_02_QUEUE_PRIORITYConfig): number {
    let preemptionCount = 0;
    const now = clock.nowMs();
    
    for (let i = 0; i < queue.messages.length; i++) {
        const message = queue.messages[i];
        const enqueuedAt = queue.enqueuedAt.get(message.messageId) || now;
        const waitTime = now - enqueuedAt;
        const maxWait = config.maxWaitTime[message.priority];
        
        if (waitTime > maxWait && i > 0) {
            queue.messages.splice(i, 1);
            queue.messages.unshift(message);
            preemptionCount++;
        }
    }
    
    return preemptionCount;
}

function calculatePriorityDistribution(queue: PriorityQueueState): Record<PriorityLevel, number> {
    const distribution: Record<PriorityLevel, number> = { CRITICAL: 0, HIGH: 0, NORMAL: 0, LOW: 0, BACKGROUND: 0 };
    for (const message of queue.messages) {
        distribution[message.priority]++;
    }
    return distribution;
}

function calculateAverageWaitTime(queue: PriorityQueueState): number {
    if (queue.messages.length === 0) return 0;
    const now = clock.nowMs();
    let totalWait = 0;
    for (const message of queue.messages) {
        const enqueuedAt = queue.enqueuedAt.get(message.messageId) || now;
        totalWait += now - enqueuedAt;
    }
    return totalWait / queue.messages.length;
}

export const __test__ = { validateInput, sortQueue, preventStarvation, calculatePriorityDistribution, DEFAULT_CONFIG, priorityQueues };
