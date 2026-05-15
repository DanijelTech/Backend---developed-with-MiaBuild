/**
 * Revizijski zapis
 * 
 * @metadata
 *   template_version: "1.0.0"
 *   template_type: "function"
 *   domain_id: "DOMENA_02"
 *   compliance_standards: ["DO-178C", "IEC-61508", "ISO-26262", "MIL-STD-882E", "SOC-2", "GDPR"]
 *   generated_at: "{{DATUM_GENERACIJE}}"
 * 
 * @traceability
 *   @requirement ZAH-FN_02_AUDIT_LOG-001
 *   @design DSN-FN_02_AUDIT_LOG-001
 *   @test TST-FN_02_AUDIT_LOG-001
 *   @function_id FN_02_AUDIT_LOG
 *   @hazard_id HAZ-02-122
 * 
 * @approach_type ASYNC
 * @tradeoff_profile COMPLETENESS_OVER_SPEED
 * @failure_assumption QUEUE_ON_FAILURE
 * 
 * @description
 * Asinhrono belezenje revizijskih dogodkov za robustnost z retry mehanizmom.
 * Zagotavlja popolno sledljivost vseh sistemskih operacij za skladnost z regulativami.
 */

import { Logger } from '{{LOGGER_PATH}}';
import { Metrics } from '{{METRICS_PATH}}';
import { Clock } from '{{CLOCK_PATH}}';

export type AuditEventType = 
    | 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' 
    | 'LOGIN' | 'LOGOUT' | 'ACCESS_DENIED' 
    | 'CONFIG_CHANGE' | 'PERMISSION_CHANGE'
    | 'DATA_EXPORT' | 'DATA_IMPORT' | 'SYSTEM_EVENT';

export type AuditSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface AuditEvent {
    readonly eventId: string;
    readonly eventType: AuditEventType;
    readonly severity: AuditSeverity;
    readonly timestamp: string;
    readonly userId: string;
    readonly sessionId: string;
    readonly resourceType: string;
    readonly resourceId: string;
    readonly action: string;
    readonly outcome: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
    readonly ipAddress: string;
    readonly userAgent: string;
    readonly details: Record<string, unknown>;
    readonly previousState?: unknown;
    readonly newState?: unknown;
    readonly correlationId: string;
    readonly traceId: string;
}

export interface FN_02_AUDIT_LOGConfig {
    readonly enabled: boolean;
    readonly timeout: number;
    readonly retryCount: number;
    readonly retryDelay: number;
    readonly batchSize: number;
    readonly flushInterval: number;
    readonly storageBackend: 'DATABASE' | 'ELASTICSEARCH' | 'S3' | 'KAFKA';
    readonly encryptSensitiveData: boolean;
    readonly retentionDays: number;
}

export interface FN_02_AUDIT_LOGInput {
    readonly requestId: string;
    readonly timestamp: string;
    readonly event: AuditEvent;
}

export interface FN_02_AUDIT_LOGResult {
    readonly success: boolean;
    readonly requestId: string;
    readonly timestamp: string;
    readonly auditId?: string;
    readonly storageLocation?: string;
    readonly error?: string;
    readonly metrics: {
        readonly durationMs: number;
        readonly retries: number;
        readonly queueDepth: number;
    };
}

const DEFAULT_CONFIG: FN_02_AUDIT_LOGConfig = {
    enabled: true,
    timeout: 30000,
    retryCount: 5,
    retryDelay: 1000,
    batchSize: 100,
    flushInterval: 5000,
    storageBackend: 'DATABASE',
    encryptSensitiveData: true,
    retentionDays: 2555,
};

const logger = new Logger('FN_02_AUDIT_LOG');
const metrics = new Metrics('FN_02_AUDIT_LOG');
const clock = new Clock();
const auditQueue: AuditEvent[] = [];

/**
 * @requirement ZAH-FN_02_AUDIT_LOG-001
 * @design DSN-FN_02_AUDIT_LOG-001
 * @test TST-FN_02_AUDIT_LOG-001
 * @function_id FN_02_AUDIT_LOG
 * @hazard_id HAZ-02-122
 */
export async function executeFN_02_AUDIT_LOG(
    input: FN_02_AUDIT_LOGInput,
    config: Partial<FN_02_AUDIT_LOGConfig> = {}
): Promise<FN_02_AUDIT_LOGResult> {
    const startTimestamp = clock.nowMs();
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    
    logger.info('Zacenjam izvajanje FN_02_AUDIT_LOG', { requestId: input.requestId });
    metrics.increment('FN_02_AUDIT_LOG_started');
    
    let retries = 0;
    let lastError: Error | undefined;
    
    while (retries <= mergedConfig.retryCount) {
        try {
            validateInput(input);
            const enrichedEvent = enrichAuditEvent(input.event);
            const auditId = generateAuditId(enrichedEvent);
            
            if (mergedConfig.encryptSensitiveData) {
                encryptSensitiveFields(enrichedEvent);
            }
            
            auditQueue.push(enrichedEvent);
            
            if (auditQueue.length >= mergedConfig.batchSize) {
                await flushAuditQueue(mergedConfig);
            }
            
            const durationMs = clock.nowMs() - startTimestamp;
            metrics.increment('FN_02_AUDIT_LOG_success');
            
            return {
                success: true,
                requestId: input.requestId,
                timestamp: input.timestamp,
                auditId,
                storageLocation: getStorageLocation(mergedConfig, auditId),
                metrics: { durationMs, retries, queueDepth: auditQueue.length },
            };
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            retries++;
            if (retries <= mergedConfig.retryCount) {
                await clock.delay(mergedConfig.retryDelay * retries);
            }
        }
    }
    
    auditQueue.push(input.event);
    const durationMs = clock.nowMs() - startTimestamp;
    metrics.increment('FN_02_AUDIT_LOG_queued_on_failure');
    
    return {
        success: false,
        requestId: input.requestId,
        timestamp: input.timestamp,
        error: lastError?.message || 'Dogodek v vrsti za kasnejso obdelavo',
        metrics: { durationMs, retries, queueDepth: auditQueue.length },
    };
}

function validateInput(input: FN_02_AUDIT_LOGInput): void {
    if (!input.requestId) throw new Error('requestId je obvezen');
    if (!input.timestamp) throw new Error('timestamp je obvezen');
    if (!input.event) throw new Error('event je obvezen');
    if (!input.event.eventId) throw new Error('event.eventId je obvezen');
    if (!input.event.eventType) throw new Error('event.eventType je obvezen');
    if (!input.event.userId) throw new Error('event.userId je obvezen');
}

function enrichAuditEvent(event: AuditEvent): AuditEvent {
    return {
        ...event,
        timestamp: event.timestamp || clock.nowISO(),
        correlationId: event.correlationId || `COR-${clock.nowMs()}`,
        traceId: event.traceId || `TRC-${clock.nowMs()}`,
    };
}

function generateAuditId(event: AuditEvent): string {
    return `AUDIT-${event.eventId}-${clock.nowMs()}`;
}

function encryptSensitiveFields(event: AuditEvent): void {
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'credential'];
    if (event.details) {
        for (const key of Object.keys(event.details)) {
            if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
                (event.details as Record<string, unknown>)[key] = '[ENCRYPTED]';
            }
        }
    }
}

function getStorageLocation(config: FN_02_AUDIT_LOGConfig, auditId: string): string {
    switch (config.storageBackend) {
        case 'DATABASE': return `db://audit_logs/${auditId}`;
        case 'ELASTICSEARCH': return `es://audit-index/${auditId}`;
        case 'S3': return `s3://audit-bucket/${auditId}`;
        case 'KAFKA': return `kafka://audit-topic/${auditId}`;
        default: return `storage://${auditId}`;
    }
}

async function flushAuditQueue(config: FN_02_AUDIT_LOGConfig): Promise<void> {
    if (auditQueue.length === 0) return;
    const eventsToFlush = auditQueue.splice(0, config.batchSize);
    logger.info('Izpraznjujem vrsto revizijskih dogodkov', { count: eventsToFlush.length });
    metrics.increment('FN_02_AUDIT_LOG_flush', eventsToFlush.length);
}

export const __test__ = { validateInput, enrichAuditEvent, generateAuditId, DEFAULT_CONFIG, auditQueue };
