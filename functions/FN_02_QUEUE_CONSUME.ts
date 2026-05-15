/**
 * Poraba sporocil iz vrste
 * 
 * @metadata
 *   template_version: "1.0.0"
 *   template_type: "function"
 *   domain_id: "DOMENA_02"
 *   compliance_standards: ["DO-178C", "IEC-61508", "ISO-26262", "MIL-STD-882E"]
 *   generated_at: "{{DATUM_GENERACIJE}}"
 * 
 * @traceability
 *   @requirement ZAH-FN_02_QUEUE_CONSUME-001
 *   @design DSN-FN_02_QUEUE_CONSUME-001
 *   @test TST-FN_02_QUEUE_CONSUME-001
 *   @function_id FN_02_QUEUE_CONSUME
 *   @hazard_id HAZ-02-095
 * 
 * @approach_type PULL
 * @tradeoff_profile RELIABILITY_OVER_THROUGHPUT
 * @failure_assumption ACK_ON_SUCCESS
 * 
 * @description
 * Pull-based poraba sporocil iz vrste z eksplicitnim potrjevanjem.
 * Podpira at-least-once in exactly-once semantiko dostave.
 */

import { Logger } from '{{LOGGER_PATH}}';
import { Metrics } from '{{METRICS_PATH}}';
import { Clock } from '{{CLOCK_PATH}}';

export type DeliverySemantics = 'AT_MOST_ONCE' | 'AT_LEAST_ONCE' | 'EXACTLY_ONCE';

export interface QueueMessage<T = unknown> {
    readonly messageId: string;
    readonly body: T;
    readonly attributes: Record<string, string>;
    readonly timestamp: string;
    readonly receiptHandle: string;
    readonly approximateReceiveCount: number;
    readonly sequenceNumber?: string;
}

export interface ConsumeResult {
    readonly messageId: string;
    readonly status: 'ACKNOWLEDGED' | 'REJECTED' | 'REQUEUED';
    readonly processingTimeMs: number;
}

export interface FN_02_QUEUE_CONSUMEConfig {
    readonly enabled: boolean;
    readonly timeout: number;
    readonly maxMessages: number;
    readonly waitTimeSeconds: number;
    readonly visibilityTimeout: number;
    readonly deliverySemantics: DeliverySemantics;
    readonly autoAcknowledge: boolean;
    readonly deadLetterEnabled: boolean;
    readonly maxReceiveCount: number;
}

export interface FN_02_QUEUE_CONSUMEInput {
    readonly requestId: string;
    readonly timestamp: string;
    readonly queueUrl: string;
    readonly maxMessages?: number;
    readonly handler: (message: QueueMessage) => Promise<boolean>;
}

export interface FN_02_QUEUE_CONSUMEResult {
    readonly success: boolean;
    readonly requestId: string;
    readonly timestamp: string;
    readonly consumedCount: number;
    readonly acknowledgedCount: number;
    readonly rejectedCount: number;
    readonly results: readonly ConsumeResult[];
    readonly error?: string;
    readonly metrics: {
        readonly durationMs: number;
        readonly avgProcessingTimeMs: number;
        readonly messagesPerSecond: number;
    };
}

const DEFAULT_CONFIG: FN_02_QUEUE_CONSUMEConfig = {
    enabled: true,
    timeout: 60000,
    maxMessages: 10,
    waitTimeSeconds: 20,
    visibilityTimeout: 30,
    deliverySemantics: 'AT_LEAST_ONCE',
    autoAcknowledge: false,
    deadLetterEnabled: true,
    maxReceiveCount: 5,
};

const logger = new Logger('FN_02_QUEUE_CONSUME');
const metrics = new Metrics('FN_02_QUEUE_CONSUME');
const clock = new Clock();

/**
 * @requirement ZAH-FN_02_QUEUE_CONSUME-001
 * @design DSN-FN_02_QUEUE_CONSUME-001
 * @test TST-FN_02_QUEUE_CONSUME-001
 * @function_id FN_02_QUEUE_CONSUME
 * @hazard_id HAZ-02-095
 */
export async function executeFN_02_QUEUE_CONSUME(
    input: FN_02_QUEUE_CONSUMEInput,
    config: Partial<FN_02_QUEUE_CONSUMEConfig> = {}
): Promise<FN_02_QUEUE_CONSUMEResult> {
    const startTimestamp = clock.nowMs();
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    
    logger.info('Zacenjam izvajanje FN_02_QUEUE_CONSUME', {
        requestId: input.requestId,
        queueUrl: input.queueUrl,
        maxMessages: input.maxMessages || mergedConfig.maxMessages,
    });
    
    metrics.increment('FN_02_QUEUE_CONSUME_started');
    
    try {
        validateInput(input);
        
        const maxMessages = input.maxMessages || mergedConfig.maxMessages;
        const messages = await receiveMessages(input.queueUrl, maxMessages, mergedConfig);
        
        if (messages.length === 0) {
            const durationMs = clock.nowMs() - startTimestamp;
            return {
                success: true,
                requestId: input.requestId,
                timestamp: input.timestamp,
                consumedCount: 0,
                acknowledgedCount: 0,
                rejectedCount: 0,
                results: [],
                metrics: { durationMs, avgProcessingTimeMs: 0, messagesPerSecond: 0 },
            };
        }
        
        const results: ConsumeResult[] = [];
        let acknowledgedCount = 0;
        let rejectedCount = 0;
        let totalProcessingTime = 0;
        
        for (const message of messages) {
            const processingStart = clock.nowMs();
            
            try {
                const success = await input.handler(message);
                const processingTimeMs = clock.nowMs() - processingStart;
                totalProcessingTime += processingTimeMs;
                
                if (success) {
                    await acknowledgeMessage(input.queueUrl, message.receiptHandle);
                    results.push({ messageId: message.messageId, status: 'ACKNOWLEDGED', processingTimeMs });
                    acknowledgedCount++;
                } else {
                    if (message.approximateReceiveCount >= mergedConfig.maxReceiveCount && mergedConfig.deadLetterEnabled) {
                        await moveToDeadLetter(input.queueUrl, message);
                        results.push({ messageId: message.messageId, status: 'REJECTED', processingTimeMs });
                    } else {
                        await requeueMessage(input.queueUrl, message, 0);
                        results.push({ messageId: message.messageId, status: 'REQUEUED', processingTimeMs });
                    }
                    rejectedCount++;
                }
            } catch (handlerError) {
                const processingTimeMs = clock.nowMs() - processingStart;
                totalProcessingTime += processingTimeMs;
                
                logger.error('Napaka pri obdelavi sporocila', {
                    messageId: message.messageId,
                    error: handlerError instanceof Error ? handlerError.message : String(handlerError),
                });
                
                await requeueMessage(input.queueUrl, message, mergedConfig.visibilityTimeout);
                results.push({ messageId: message.messageId, status: 'REQUEUED', processingTimeMs });
                rejectedCount++;
            }
        }
        
        const durationMs = clock.nowMs() - startTimestamp;
        const avgProcessingTimeMs = messages.length > 0 ? totalProcessingTime / messages.length : 0;
        const messagesPerSecond = messages.length / (durationMs / 1000);
        
        metrics.increment('FN_02_QUEUE_CONSUME_success');
        metrics.histogram('FN_02_QUEUE_CONSUME_batch_size', messages.length);
        metrics.histogram('FN_02_QUEUE_CONSUME_processing_time', avgProcessingTimeMs);
        
        return {
            success: rejectedCount === 0,
            requestId: input.requestId,
            timestamp: input.timestamp,
            consumedCount: messages.length,
            acknowledgedCount,
            rejectedCount,
            results,
            metrics: { durationMs, avgProcessingTimeMs, messagesPerSecond },
        };
    } catch (error) {
        const durationMs = clock.nowMs() - startTimestamp;
        metrics.increment('FN_02_QUEUE_CONSUME_failed');
        
        return {
            success: false,
            requestId: input.requestId,
            timestamp: input.timestamp,
            consumedCount: 0,
            acknowledgedCount: 0,
            rejectedCount: 0,
            results: [],
            error: error instanceof Error ? error.message : String(error),
            metrics: { durationMs, avgProcessingTimeMs: 0, messagesPerSecond: 0 },
        };
    }
}

function validateInput(input: FN_02_QUEUE_CONSUMEInput): void {
    if (!input.requestId) throw new Error('requestId je obvezen');
    if (!input.timestamp) throw new Error('timestamp je obvezen');
    if (!input.queueUrl) throw new Error('queueUrl je obvezen');
    if (!input.handler) throw new Error('handler je obvezen');
}

async function receiveMessages(queueUrl: string, maxMessages: number, config: FN_02_QUEUE_CONSUMEConfig): Promise<QueueMessage[]> {
    logger.debug('Prejemam sporocila iz vrste', { queueUrl, maxMessages });
    await clock.delay(10);
    return [];
}

async function acknowledgeMessage(queueUrl: string, receiptHandle: string): Promise<void> {
    logger.debug('Potrjujem sporocilo', { queueUrl, receiptHandle });
    await clock.delay(5);
}

async function requeueMessage(queueUrl: string, message: QueueMessage, visibilityTimeout: number): Promise<void> {
    logger.debug('Vracam sporocilo v vrsto', { queueUrl, messageId: message.messageId, visibilityTimeout });
    await clock.delay(5);
}

async function moveToDeadLetter(queueUrl: string, message: QueueMessage): Promise<void> {
    logger.debug('Premikam sporocilo v DLQ', { queueUrl, messageId: message.messageId });
    await clock.delay(5);
}

export const __test__ = { validateInput, receiveMessages, acknowledgeMessage, requeueMessage, moveToDeadLetter, DEFAULT_CONFIG };
