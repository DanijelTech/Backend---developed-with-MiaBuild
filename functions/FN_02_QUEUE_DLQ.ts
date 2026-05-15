/**
 * Dead Letter Queue obdelava
 * 
 * @metadata
 *   template_version: "1.0.0"
 *   template_type: "function"
 *   domain_id: "DOMENA_02"
 *   compliance_standards: ["DO-178C", "IEC-61508", "ISO-26262", "MIL-STD-882E"]
 *   generated_at: "{{DATUM_GENERACIJE}}"
 * 
 * @traceability
 *   @requirement ZAH-FN_02_QUEUE_DLQ-001
 *   @design DSN-FN_02_QUEUE_DLQ-001
 *   @test TST-FN_02_QUEUE_DLQ-001
 *   @function_id FN_02_QUEUE_DLQ
 *   @hazard_id HAZ-02-096
 * 
 * @approach_type REMEDIATION
 * @tradeoff_profile VISIBILITY_OVER_AUTOMATION
 * @failure_assumption MANUAL_INTERVENTION
 * 
 * @description
 * Obdelava sporocil iz Dead Letter Queue z moznostjo ponovnega poskusa ali arhiviranja.
 * Zagotavlja popolno sledljivost neuspelih sporocil.
 */

import { Logger } from '{{LOGGER_PATH}}';
import { Metrics } from '{{METRICS_PATH}}';
import { Clock } from '{{CLOCK_PATH}}';

export type DLQAction = 'RETRY' | 'ARCHIVE' | 'DELETE' | 'INSPECT';

export interface DLQMessage {
    readonly messageId: string;
    readonly originalQueueUrl: string;
    readonly body: unknown;
    readonly attributes: Record<string, string>;
    readonly failureReason: string;
    readonly failureCount: number;
    readonly firstFailureAt: string;
    readonly lastFailureAt: string;
    readonly receiptHandle: string;
}

export interface DLQActionResult {
    readonly messageId: string;
    readonly action: DLQAction;
    readonly status: 'SUCCESS' | 'FAILED';
    readonly error?: string;
}

export interface FN_02_QUEUE_DLQConfig {
    readonly enabled: boolean;
    readonly timeout: number;
    readonly maxMessages: number;
    readonly retryDelay: number;
    readonly maxRetryAttempts: number;
    readonly archiveEnabled: boolean;
    readonly archiveDestination: string;
    readonly alertOnThreshold: number;
}

export interface FN_02_QUEUE_DLQInput {
    readonly requestId: string;
    readonly timestamp: string;
    readonly dlqUrl: string;
    readonly action: DLQAction;
    readonly messageIds?: readonly string[];
    readonly filter?: (message: DLQMessage) => boolean;
}

export interface FN_02_QUEUE_DLQResult {
    readonly success: boolean;
    readonly requestId: string;
    readonly timestamp: string;
    readonly processedCount: number;
    readonly successCount: number;
    readonly failedCount: number;
    readonly results: readonly DLQActionResult[];
    readonly error?: string;
    readonly metrics: {
        readonly durationMs: number;
        readonly dlqDepth: number;
        readonly oldestMessageAge: number;
    };
}

const DEFAULT_CONFIG: FN_02_QUEUE_DLQConfig = {
    enabled: true,
    timeout: 300000,
    maxMessages: 100,
    retryDelay: 60000,
    maxRetryAttempts: 3,
    archiveEnabled: true,
    archiveDestination: 's3://dlq-archive',
    alertOnThreshold: 100,
};

const logger = new Logger('FN_02_QUEUE_DLQ');
const metrics = new Metrics('FN_02_QUEUE_DLQ');
const clock = new Clock();

/**
 * @requirement ZAH-FN_02_QUEUE_DLQ-001
 * @design DSN-FN_02_QUEUE_DLQ-001
 * @test TST-FN_02_QUEUE_DLQ-001
 * @function_id FN_02_QUEUE_DLQ
 * @hazard_id HAZ-02-096
 */
export async function executeFN_02_QUEUE_DLQ(
    input: FN_02_QUEUE_DLQInput,
    config: Partial<FN_02_QUEUE_DLQConfig> = {}
): Promise<FN_02_QUEUE_DLQResult> {
    const startTimestamp = clock.nowMs();
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    
    logger.info('Zacenjam izvajanje FN_02_QUEUE_DLQ', {
        requestId: input.requestId,
        dlqUrl: input.dlqUrl,
        action: input.action,
    });
    
    metrics.increment('FN_02_QUEUE_DLQ_started');
    
    try {
        validateInput(input);
        
        const messages = await receiveDLQMessages(input.dlqUrl, mergedConfig);
        const dlqDepth = messages.length;
        
        let filteredMessages = messages;
        if (input.messageIds && input.messageIds.length > 0) {
            filteredMessages = messages.filter(m => input.messageIds!.includes(m.messageId));
        }
        if (input.filter) {
            filteredMessages = filteredMessages.filter(input.filter);
        }
        
        const results: DLQActionResult[] = [];
        let successCount = 0;
        let failedCount = 0;
        let oldestMessageAge = 0;
        
        for (const message of filteredMessages) {
            const messageAge = clock.nowMs() - new Date(message.firstFailureAt).getTime();
            if (messageAge > oldestMessageAge) {
                oldestMessageAge = messageAge;
            }
            
            try {
                switch (input.action) {
                    case 'RETRY':
                        if (message.failureCount < mergedConfig.maxRetryAttempts) {
                            await retryMessage(message, mergedConfig);
                            results.push({ messageId: message.messageId, action: 'RETRY', status: 'SUCCESS' });
                        } else {
                            results.push({ messageId: message.messageId, action: 'RETRY', status: 'FAILED', error: 'Prekoraceno maksimalno stevilo ponovnih poskusov' });
                            failedCount++;
                            continue;
                        }
                        break;
                    case 'ARCHIVE':
                        await archiveMessage(message, mergedConfig);
                        results.push({ messageId: message.messageId, action: 'ARCHIVE', status: 'SUCCESS' });
                        break;
                    case 'DELETE':
                        await deleteMessage(input.dlqUrl, message.receiptHandle);
                        results.push({ messageId: message.messageId, action: 'DELETE', status: 'SUCCESS' });
                        break;
                    case 'INSPECT':
                        results.push({ messageId: message.messageId, action: 'INSPECT', status: 'SUCCESS' });
                        break;
                }
                successCount++;
            } catch (actionError) {
                results.push({
                    messageId: message.messageId,
                    action: input.action,
                    status: 'FAILED',
                    error: actionError instanceof Error ? actionError.message : String(actionError),
                });
                failedCount++;
            }
        }
        
        if (dlqDepth >= mergedConfig.alertOnThreshold) {
            logger.warn('DLQ presega prag za opozorilo', { dlqUrl: input.dlqUrl, depth: dlqDepth, threshold: mergedConfig.alertOnThreshold });
            metrics.increment('FN_02_QUEUE_DLQ_threshold_exceeded');
        }
        
        const durationMs = clock.nowMs() - startTimestamp;
        metrics.increment('FN_02_QUEUE_DLQ_success');
        metrics.gauge('FN_02_QUEUE_DLQ_depth', dlqDepth);
        
        return {
            success: failedCount === 0,
            requestId: input.requestId,
            timestamp: input.timestamp,
            processedCount: filteredMessages.length,
            successCount,
            failedCount,
            results,
            metrics: { durationMs, dlqDepth, oldestMessageAge },
        };
    } catch (error) {
        const durationMs = clock.nowMs() - startTimestamp;
        metrics.increment('FN_02_QUEUE_DLQ_failed');
        
        return {
            success: false,
            requestId: input.requestId,
            timestamp: input.timestamp,
            processedCount: 0,
            successCount: 0,
            failedCount: 0,
            results: [],
            error: error instanceof Error ? error.message : String(error),
            metrics: { durationMs, dlqDepth: 0, oldestMessageAge: 0 },
        };
    }
}

function validateInput(input: FN_02_QUEUE_DLQInput): void {
    if (!input.requestId) throw new Error('requestId je obvezen');
    if (!input.timestamp) throw new Error('timestamp je obvezen');
    if (!input.dlqUrl) throw new Error('dlqUrl je obvezen');
    if (!input.action) throw new Error('action je obvezen');
}

async function receiveDLQMessages(dlqUrl: string, config: FN_02_QUEUE_DLQConfig): Promise<DLQMessage[]> {
    logger.debug('Prejemam sporocila iz DLQ', { dlqUrl });
    await clock.delay(10);
    return [];
}

async function retryMessage(message: DLQMessage, config: FN_02_QUEUE_DLQConfig): Promise<void> {
    logger.debug('Ponovno poskusam sporocilo', { messageId: message.messageId, originalQueue: message.originalQueueUrl });
    await clock.delay(10);
}

async function archiveMessage(message: DLQMessage, config: FN_02_QUEUE_DLQConfig): Promise<void> {
    logger.debug('Arhiviram sporocilo', { messageId: message.messageId, destination: config.archiveDestination });
    await clock.delay(10);
}

async function deleteMessage(dlqUrl: string, receiptHandle: string): Promise<void> {
    logger.debug('Brisem sporocilo iz DLQ', { dlqUrl, receiptHandle });
    await clock.delay(5);
}

export const __test__ = { validateInput, receiveDLQMessages, retryMessage, archiveMessage, deleteMessage, DEFAULT_CONFIG };
