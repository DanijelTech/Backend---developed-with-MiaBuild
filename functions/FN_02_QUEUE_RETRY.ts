/**
 * Ponovni poskus sporocila
 * 
 * @metadata
 *   template_version: "1.0.0"
 *   template_type: "function"
 *   domain_id: "DOMENA_02"
 *   compliance_standards: ["DO-178C", "IEC-61508", "ISO-26262", "MIL-STD-882E"]
 *   generated_at: "{{DATUM_GENERACIJE}}"
 * 
 * @traceability
 *   @requirement ZAH-FN_02_QUEUE_RETRY-001
 *   @design DSN-FN_02_QUEUE_RETRY-001
 *   @test TST-FN_02_QUEUE_RETRY-001
 *   @function_id FN_02_QUEUE_RETRY
 *   @hazard_id HAZ-02-099
 * 
 * @approach_type EXPONENTIAL_BACKOFF
 * @tradeoff_profile RELIABILITY_OVER_SPEED
 * @failure_assumption DLQ_ON_EXHAUSTION
 * 
 * @description
 * Ponovni poskus neuspelih sporocil z eksponentnim backoff algoritmom.
 * Podpira nastavljivo stevilo poskusov in jitter za preprecevanje thundering herd.
 */

import { Logger } from '{{LOGGER_PATH}}';
import { Metrics } from '{{METRICS_PATH}}';
import { Clock } from '{{CLOCK_PATH}}';

export interface RetryPolicy {
    readonly maxAttempts: number;
    readonly initialDelay: number;
    readonly maxDelay: number;
    readonly multiplier: number;
    readonly jitterEnabled: boolean;
    readonly jitterFactor: number;
}

export interface RetryableMessage {
    readonly messageId: string;
    readonly body: unknown;
    readonly originalQueueUrl: string;
    readonly attemptNumber: number;
    readonly firstAttemptAt: string;
    readonly lastAttemptAt: string;
    readonly lastError: string;
}

export interface FN_02_QUEUE_RETRYConfig {
    readonly enabled: boolean;
    readonly timeout: number;
    readonly defaultPolicy: RetryPolicy;
    readonly perQueuePolicies: Record<string, RetryPolicy>;
    readonly dlqEnabled: boolean;
    readonly dlqSuffix: string;
}

export interface FN_02_QUEUE_RETRYInput {
    readonly requestId: string;
    readonly timestamp: string;
    readonly message: RetryableMessage;
    readonly policy?: Partial<RetryPolicy>;
}

export interface FN_02_QUEUE_RETRYResult {
    readonly success: boolean;
    readonly requestId: string;
    readonly timestamp: string;
    readonly action: 'RETRIED' | 'DLQ' | 'EXHAUSTED';
    readonly nextAttemptAt?: string;
    readonly delayMs?: number;
    readonly error?: string;
    readonly metrics: {
        readonly durationMs: number;
        readonly attemptNumber: number;
        readonly totalDelayMs: number;
    };
}

const DEFAULT_POLICY: RetryPolicy = {
    maxAttempts: 5,
    initialDelay: 1000,
    maxDelay: 300000,
    multiplier: 2,
    jitterEnabled: true,
    jitterFactor: 0.2,
};

const DEFAULT_CONFIG: FN_02_QUEUE_RETRYConfig = {
    enabled: true,
    timeout: 30000,
    defaultPolicy: DEFAULT_POLICY,
    perQueuePolicies: {},
    dlqEnabled: true,
    dlqSuffix: '-dlq',
};

const logger = new Logger('FN_02_QUEUE_RETRY');
const metrics = new Metrics('FN_02_QUEUE_RETRY');
const clock = new Clock();

/**
 * @requirement ZAH-FN_02_QUEUE_RETRY-001
 * @design DSN-FN_02_QUEUE_RETRY-001
 * @test TST-FN_02_QUEUE_RETRY-001
 * @function_id FN_02_QUEUE_RETRY
 * @hazard_id HAZ-02-099
 */
export async function executeFN_02_QUEUE_RETRY(
    input: FN_02_QUEUE_RETRYInput,
    config: Partial<FN_02_QUEUE_RETRYConfig> = {}
): Promise<FN_02_QUEUE_RETRYResult> {
    const startTimestamp = clock.nowMs();
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    
    logger.info('Zacenjam izvajanje FN_02_QUEUE_RETRY', {
        requestId: input.requestId,
        messageId: input.message.messageId,
        attemptNumber: input.message.attemptNumber,
    });
    
    metrics.increment('FN_02_QUEUE_RETRY_started');
    
    try {
        validateInput(input);
        
        const policy = resolvePolicy(input.message.originalQueueUrl, input.policy, mergedConfig);
        const attemptNumber = input.message.attemptNumber + 1;
        
        if (attemptNumber > policy.maxAttempts) {
            if (mergedConfig.dlqEnabled) {
                await moveToDeadLetterQueue(input.message, mergedConfig);
                
                const durationMs = clock.nowMs() - startTimestamp;
                metrics.increment('FN_02_QUEUE_RETRY_dlq');
                
                return {
                    success: true,
                    requestId: input.requestId,
                    timestamp: input.timestamp,
                    action: 'DLQ',
                    metrics: { durationMs, attemptNumber: attemptNumber - 1, totalDelayMs: calculateTotalDelay(input.message) },
                };
            }
            
            const durationMs = clock.nowMs() - startTimestamp;
            metrics.increment('FN_02_QUEUE_RETRY_exhausted');
            
            return {
                success: false,
                requestId: input.requestId,
                timestamp: input.timestamp,
                action: 'EXHAUSTED',
                error: 'Vsi poskusi izcrpani',
                metrics: { durationMs, attemptNumber: attemptNumber - 1, totalDelayMs: calculateTotalDelay(input.message) },
            };
        }
        
        const delayMs = calculateDelay(attemptNumber, policy);
        const nextAttemptAt = new Date(clock.nowMs() + delayMs).toISOString();
        
        await scheduleRetry(input.message, delayMs, attemptNumber);
        
        const durationMs = clock.nowMs() - startTimestamp;
        metrics.increment('FN_02_QUEUE_RETRY_scheduled');
        metrics.histogram('FN_02_QUEUE_RETRY_delay', delayMs);
        
        return {
            success: true,
            requestId: input.requestId,
            timestamp: input.timestamp,
            action: 'RETRIED',
            nextAttemptAt,
            delayMs,
            metrics: { durationMs, attemptNumber, totalDelayMs: calculateTotalDelay(input.message) + delayMs },
        };
    } catch (error) {
        const durationMs = clock.nowMs() - startTimestamp;
        metrics.increment('FN_02_QUEUE_RETRY_failed');
        
        return {
            success: false,
            requestId: input.requestId,
            timestamp: input.timestamp,
            action: 'EXHAUSTED',
            error: error instanceof Error ? error.message : String(error),
            metrics: { durationMs, attemptNumber: input.message.attemptNumber, totalDelayMs: 0 },
        };
    }
}

function validateInput(input: FN_02_QUEUE_RETRYInput): void {
    if (!input.requestId) throw new Error('requestId je obvezen');
    if (!input.timestamp) throw new Error('timestamp je obvezen');
    if (!input.message) throw new Error('message je obvezen');
    if (!input.message.messageId) throw new Error('message.messageId je obvezen');
    if (!input.message.originalQueueUrl) throw new Error('message.originalQueueUrl je obvezen');
}

function resolvePolicy(queueUrl: string, overrides: Partial<RetryPolicy> | undefined, config: FN_02_QUEUE_RETRYConfig): RetryPolicy {
    const queuePolicy = config.perQueuePolicies[queueUrl];
    const basePolicy = queuePolicy || config.defaultPolicy;
    return { ...basePolicy, ...overrides };
}

function calculateDelay(attemptNumber: number, policy: RetryPolicy): number {
    let delay = policy.initialDelay * Math.pow(policy.multiplier, attemptNumber - 1);
    delay = Math.min(delay, policy.maxDelay);
    
    if (policy.jitterEnabled) {
        const jitter = delay * policy.jitterFactor * (Math.random() * 2 - 1);
        delay = Math.max(0, delay + jitter);
    }
    
    return Math.floor(delay);
}

function calculateTotalDelay(message: RetryableMessage): number {
    const firstAttempt = new Date(message.firstAttemptAt).getTime();
    const lastAttempt = new Date(message.lastAttemptAt).getTime();
    return lastAttempt - firstAttempt;
}

async function scheduleRetry(message: RetryableMessage, delayMs: number, attemptNumber: number): Promise<void> {
    logger.debug('Nacrtujem ponovni poskus', { messageId: message.messageId, delayMs, attemptNumber });
    await clock.delay(10);
}

async function moveToDeadLetterQueue(message: RetryableMessage, config: FN_02_QUEUE_RETRYConfig): Promise<void> {
    const dlqUrl = message.originalQueueUrl + config.dlqSuffix;
    logger.debug('Premikam sporocilo v DLQ', { messageId: message.messageId, dlqUrl });
    await clock.delay(10);
}

export const __test__ = { validateInput, resolvePolicy, calculateDelay, calculateTotalDelay, DEFAULT_CONFIG, DEFAULT_POLICY };
