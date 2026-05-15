/**
 * @file Audit logging modul za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 * 
 * @requirement ZAH-ZALEDNI-SEC-006 Audit logiranje za zaledne sisteme
 * @design DSN-ZALEDNI-SEC-006 Backend audit logging arhitektura
 * @test TEST-ZALEDNI-SEC-006 Preverjanje audit logiranja
 * 
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom SEC_006 - Audit Logging
 */

import { getClock, Clock } from '@mia/core/clock';
const clock: Clock = getClock();

// ============================================================================
// TIPI
// ============================================================================

/**
 * Tip audit dogodka
 */
export type AuditEventType = 
    | 'authentication'
    | 'authorization'
    | 'data_access'
    | 'data_modification'
    | 'configuration_change'
    | 'system_event'
    | 'security_event';

/**
 * Rezultat akcije
 */
export type AuditOutcome = 'success' | 'failure' | 'error';

/**
 * Audit vnos
 */
export interface AuditEntry {
    /** Unikatni ID vnosa */
    readonly id: string;
    /** Casovni zig */
    readonly timestamp: number;
    /** Tip dogodka */
    readonly eventType: AuditEventType;
    /** Akcija */
    readonly action: string;
    /** ID uporabnika */
    readonly userId: string | null;
    /** Vir (resource) */
    readonly resource: string;
    /** ID vira */
    readonly resourceId: string | null;
    /** Rezultat */
    readonly outcome: AuditOutcome;
    /** Podrobnosti */
    readonly details: Readonly<Record<string, unknown>>;
    /** IP naslov */
    readonly ipAddress: string | null;
    /** User agent */
    readonly userAgent: string | null;
    /** ID seje */
    readonly sessionId: string | null;
    /** Trace ID za korelacijo */
    readonly traceId: string | null;
}

/**
 * Konfiguracija audit logiranja
 */
export interface AuditConfig {
    /** Ali je omogoceno */
    readonly enabled: boolean;
    /** Tipi dogodkov za logiranje */
    readonly enabledEventTypes: readonly AuditEventType[];
    /** Ali naj se logira v stdout */
    readonly logToStdout: boolean;
    /** Ali naj se hrani v pomnilniku */
    readonly storeInMemory: boolean;
    /** Maksimalno stevilo vnosov v pomnilniku */
    readonly maxMemoryEntries: number;
}

// ============================================================================
// STANJE
// ============================================================================

let config: AuditConfig = {
    enabled: true,
    enabledEventTypes: [
        'authentication',
        'authorization',
        'data_access',
        'data_modification',
        'configuration_change',
        'system_event',
        'security_event',
    ],
    logToStdout: true,
    storeInMemory: true,
    maxMemoryEntries: 10000,
};

const auditLog: AuditEntry[] = [];
let entryCounter = 0;

// ============================================================================
// FUNKCIJE
// ============================================================================

/**
 * Nastavi konfiguracijo
 */
export function configureAudit(newConfig: Partial<AuditConfig>): void {
    config = { ...config, ...newConfig };
}

/**
 * Generiraj ID vnosa
 */
function generateEntryId(): string {
    entryCounter++;
    return `audit-${entryCounter}-${clock.nowMs()}`;
}

/**
 * Zabeleži audit vnos
 */
export function logAudit(
    eventType: AuditEventType,
    action: string,
    resource: string,
    outcome: AuditOutcome,
    options: {
        userId?: string | null;
        resourceId?: string | null;
        details?: Record<string, unknown>;
        ipAddress?: string | null;
        userAgent?: string | null;
        sessionId?: string | null;
        traceId?: string | null;
    } = {}
): AuditEntry {
    const entry: AuditEntry = {
        id: generateEntryId(),
        timestamp: clock.nowMs(),
        eventType,
        action,
        userId: options.userId || null,
        resource,
        resourceId: options.resourceId || null,
        outcome,
        details: options.details || {},
        ipAddress: options.ipAddress || null,
        userAgent: options.userAgent || null,
        sessionId: options.sessionId || null,
        traceId: options.traceId || null,
    };
    
    // Preveri ali je tip dogodka omogocen
    if (!config.enabled || !config.enabledEventTypes.includes(eventType)) {
        return entry;
    }
    
    // Shrani v pomnilnik
    if (config.storeInMemory) {
        auditLog.push(entry);
        
        // Omejitev velikosti
        while (auditLog.length > config.maxMemoryEntries) {
            auditLog.shift();
        }
    }
    
    // Logiraj v stdout
    if (config.logToStdout) {
        const logLine = JSON.stringify({
            type: 'AUDIT',
            ...entry,
            timestamp: new Date(entry.timestamp).toISOString(),
        });
        process.stdout.write(logLine + '\n');
    }
    
    return entry;
}

/**
 * Zabeleži audit vnos (alias)
 */
export function recordAudit(
    eventType: AuditEventType,
    action: string,
    resource: string,
    outcome: AuditOutcome,
    options: {
        userId?: string | null;
        resourceId?: string | null;
        details?: Record<string, unknown>;
        ipAddress?: string | null;
        userAgent?: string | null;
        sessionId?: string | null;
        traceId?: string | null;
    } = {}
): AuditEntry {
    return logAudit(eventType, action, resource, outcome, options);
}

/**
 * Zabeleži avtentikacijski dogodek
 */
export function logAuthenticationEvent(
    action: 'login' | 'logout' | 'token_refresh' | 'password_change' | 'mfa_verify',
    outcome: AuditOutcome,
    userId: string | null,
    details: Record<string, unknown> = {}
): AuditEntry {
    return logAudit('authentication', action, 'auth', outcome, { userId, details });
}

/**
 * Zabeleži avtorizacijski dogodek
 */
export function logAuthorizationEvent(
    action: string,
    resource: string,
    outcome: AuditOutcome,
    userId: string,
    details: Record<string, unknown> = {}
): AuditEntry {
    return logAudit('authorization', action, resource, outcome, { userId, details });
}

/**
 * Zabeleži dostop do podatkov
 */
export function logDataAccess(
    resource: string,
    resourceId: string,
    userId: string,
    details: Record<string, unknown> = {}
): AuditEntry {
    return logAudit('data_access', 'read', resource, 'success', { userId, resourceId, details });
}

/**
 * Zabeleži spremembo podatkov
 */
export function logDataModification(
    action: 'create' | 'update' | 'delete',
    resource: string,
    resourceId: string,
    userId: string,
    details: Record<string, unknown> = {}
): AuditEntry {
    return logAudit('data_modification', action, resource, 'success', { userId, resourceId, details });
}

/**
 * Pridobi audit log
 */
export function getAuditLog(
    filter?: {
        eventType?: AuditEventType;
        userId?: string;
        resource?: string;
        outcome?: AuditOutcome;
        fromTimestamp?: number;
        toTimestamp?: number;
    }
): readonly AuditEntry[] {
    if (!filter) {
        return auditLog;
    }
    
    return auditLog.filter(entry => {
        if (filter.eventType && entry.eventType !== filter.eventType) return false;
        if (filter.userId && entry.userId !== filter.userId) return false;
        if (filter.resource && entry.resource !== filter.resource) return false;
        if (filter.outcome && entry.outcome !== filter.outcome) return false;
        if (filter.fromTimestamp && entry.timestamp < filter.fromTimestamp) return false;
        if (filter.toTimestamp && entry.timestamp > filter.toTimestamp) return false;
        return true;
    });
}

/**
 * Pocisti audit log
 */
export function clearAuditLog(): void {
    auditLog.length = 0;
}

// ============================================================================
// IZVOZ
// ============================================================================

export const Audit = {
    configure: configureAudit,
    logAudit,
    recordAudit,
    logAuthenticationEvent,
    logAuthorizationEvent,
    logDataAccess,
    logDataModification,
    getAuditLog,
    clearAuditLog,
};
