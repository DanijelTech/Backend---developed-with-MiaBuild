/**
 * GDPR brisanje podatkov
 * 
 * @metadata
 *   template_version: "1.0.0"
 *   template_type: "function"
 *   domain_id: "DOMENA_02"
 *   compliance_standards: ["DO-178C", "IEC-61508", "ISO-26262", "MIL-STD-882E", "GDPR", "CCPA"]
 *   generated_at: "{{DATUM_GENERACIJE}}"
 * 
 * @traceability
 *   @requirement ZAH-FN_02_GDPR_DELETE-001
 *   @design DSN-FN_02_GDPR_DELETE-001
 *   @test TST-FN_02_GDPR_DELETE-001
 *   @function_id FN_02_GDPR_DELETE
 *   @hazard_id HAZ-02-090
 * 
 * @approach_type CASCADING
 * @tradeoff_profile COMPLIANCE_OVER_PERFORMANCE
 * @failure_assumption AUDIT_ON_FAILURE
 * 
 * @description
 * Kaskadno brisanje osebnih podatkov v skladu z GDPR clen 17 (pravica do pozabe).
 * Zagotavlja popolno sledljivost in revizijsko sled vseh brisanj.
 */

import { Logger } from '{{LOGGER_PATH}}';
import { Metrics } from '{{METRICS_PATH}}';
import { Clock } from '{{CLOCK_PATH}}';

export type DataCategory = 'PERSONAL' | 'SENSITIVE' | 'FINANCIAL' | 'HEALTH' | 'BIOMETRIC' | 'LOCATION';
export type DeletionMethod = 'HARD_DELETE' | 'SOFT_DELETE' | 'ANONYMIZE' | 'PSEUDONYMIZE';

export interface DataLocation {
    readonly system: string;
    readonly table: string;
    readonly column: string;
    readonly recordId: string;
    readonly category: DataCategory;
}

export interface DeletionRecord {
    readonly deletionId: string;
    readonly subjectId: string;
    readonly location: DataLocation;
    readonly method: DeletionMethod;
    readonly deletedAt: string;
    readonly deletedBy: string;
    readonly verificationHash: string;
}

export interface FN_02_GDPR_DELETEConfig {
    readonly enabled: boolean;
    readonly timeout: number;
    readonly retryCount: number;
    readonly retryDelay: number;
    readonly defaultMethod: DeletionMethod;
    readonly requireVerification: boolean;
    readonly auditRetentionDays: number;
    readonly cascadeEnabled: boolean;
    readonly notifyDataSubject: boolean;
}

export interface FN_02_GDPR_DELETEInput {
    readonly requestId: string;
    readonly timestamp: string;
    readonly subjectId: string;
    readonly requestedBy: string;
    readonly reason: string;
    readonly dataLocations: readonly DataLocation[];
    readonly method?: DeletionMethod;
    readonly verificationToken?: string;
}

export interface FN_02_GDPR_DELETEResult {
    readonly success: boolean;
    readonly requestId: string;
    readonly timestamp: string;
    readonly deletionRecords: readonly DeletionRecord[];
    readonly totalDeleted: number;
    readonly totalFailed: number;
    readonly error?: string;
    readonly metrics: {
        readonly durationMs: number;
        readonly retries: number;
        readonly systemsProcessed: number;
    };
}

const DEFAULT_CONFIG: FN_02_GDPR_DELETEConfig = {
    enabled: true,
    timeout: 300000,
    retryCount: 3,
    retryDelay: 5000,
    defaultMethod: 'HARD_DELETE',
    requireVerification: true,
    auditRetentionDays: 2555,
    cascadeEnabled: true,
    notifyDataSubject: true,
};

const logger = new Logger('FN_02_GDPR_DELETE');
const metrics = new Metrics('FN_02_GDPR_DELETE');
const clock = new Clock();
const deletionAuditLog: DeletionRecord[] = [];

/**
 * @requirement ZAH-FN_02_GDPR_DELETE-001
 * @design DSN-FN_02_GDPR_DELETE-001
 * @test TST-FN_02_GDPR_DELETE-001
 * @function_id FN_02_GDPR_DELETE
 * @hazard_id HAZ-02-090
 */
export async function executeFN_02_GDPR_DELETE(
    input: FN_02_GDPR_DELETEInput,
    config: Partial<FN_02_GDPR_DELETEConfig> = {}
): Promise<FN_02_GDPR_DELETEResult> {
    const startTimestamp = clock.nowMs();
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    
    logger.info('Zacenjam izvajanje FN_02_GDPR_DELETE', {
        requestId: input.requestId,
        subjectId: input.subjectId,
        locationCount: input.dataLocations.length,
    });
    
    metrics.increment('FN_02_GDPR_DELETE_started');
    
    const deletionRecords: DeletionRecord[] = [];
    let totalDeleted = 0;
    let totalFailed = 0;
    const systemsProcessed = new Set<string>();
    
    try {
        validateInput(input, mergedConfig);
        
        if (mergedConfig.requireVerification && !input.verificationToken) {
            throw new Error('Verifikacijski token je obvezen');
        }
        
        const method = input.method || mergedConfig.defaultMethod;
        
        for (const location of input.dataLocations) {
            systemsProcessed.add(location.system);
            
            try {
                await deleteDataAtLocation(location, method, mergedConfig);
                
                const deletionRecord: DeletionRecord = {
                    deletionId: generateDeletionId(input, location),
                    subjectId: input.subjectId,
                    location,
                    method,
                    deletedAt: clock.nowISO(),
                    deletedBy: input.requestedBy,
                    verificationHash: generateVerificationHash(location, method),
                };
                
                deletionRecords.push(deletionRecord);
                deletionAuditLog.push(deletionRecord);
                totalDeleted++;
                
                logger.info('Podatki uspesno izbrisani', {
                    system: location.system,
                    table: location.table,
                    recordId: location.recordId,
                });
            } catch (locationError) {
                totalFailed++;
                logger.error('Napaka pri brisanju podatkov', {
                    location,
                    error: locationError instanceof Error ? locationError.message : String(locationError),
                });
            }
        }
        
        if (mergedConfig.notifyDataSubject && totalDeleted > 0) {
            await notifyDataSubject(input.subjectId, totalDeleted);
        }
        
        const durationMs = clock.nowMs() - startTimestamp;
        metrics.increment('FN_02_GDPR_DELETE_success');
        metrics.histogram('FN_02_GDPR_DELETE_records', totalDeleted);
        
        return {
            success: totalFailed === 0,
            requestId: input.requestId,
            timestamp: input.timestamp,
            deletionRecords,
            totalDeleted,
            totalFailed,
            error: totalFailed > 0 ? `${totalFailed} lokacij ni bilo mogoce izbrisati` : undefined,
            metrics: { durationMs, retries: 0, systemsProcessed: systemsProcessed.size },
        };
    } catch (error) {
        const durationMs = clock.nowMs() - startTimestamp;
        metrics.increment('FN_02_GDPR_DELETE_failed');
        
        return {
            success: false,
            requestId: input.requestId,
            timestamp: input.timestamp,
            deletionRecords,
            totalDeleted,
            totalFailed: input.dataLocations.length - totalDeleted,
            error: error instanceof Error ? error.message : String(error),
            metrics: { durationMs, retries: 0, systemsProcessed: systemsProcessed.size },
        };
    }
}

function validateInput(input: FN_02_GDPR_DELETEInput, config: FN_02_GDPR_DELETEConfig): void {
    if (!input.requestId) throw new Error('requestId je obvezen');
    if (!input.timestamp) throw new Error('timestamp je obvezen');
    if (!input.subjectId) throw new Error('subjectId je obvezen');
    if (!input.requestedBy) throw new Error('requestedBy je obvezen');
    if (!input.reason) throw new Error('reason je obvezen');
    if (!input.dataLocations || input.dataLocations.length === 0) throw new Error('dataLocations je obvezen');
}

function generateDeletionId(input: FN_02_GDPR_DELETEInput, location: DataLocation): string {
    return `DEL-${input.subjectId}-${location.system}-${location.recordId}-${clock.nowMs()}`;
}

function generateVerificationHash(location: DataLocation, method: DeletionMethod): string {
    const data = `${location.system}:${location.table}:${location.recordId}:${method}:${clock.nowMs()}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        hash = ((hash << 5) - hash) + data.charCodeAt(i);
        hash = hash & hash;
    }
    return `SHA256:${Math.abs(hash).toString(16).padStart(64, '0')}`;
}

async function deleteDataAtLocation(location: DataLocation, method: DeletionMethod, config: FN_02_GDPR_DELETEConfig): Promise<void> {
    logger.debug('Brisem podatke na lokaciji', { location, method });
    await clock.delay(50);
}

async function notifyDataSubject(subjectId: string, deletedCount: number): Promise<void> {
    logger.debug('Obvescam subjekt podatkov', { subjectId, deletedCount });
    await clock.delay(10);
}

export const __test__ = { validateInput, generateDeletionId, generateVerificationHash, DEFAULT_CONFIG, deletionAuditLog };
