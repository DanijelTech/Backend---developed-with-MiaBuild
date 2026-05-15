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
/**
 * Tip audit dogodka
 */
export type AuditEventType = 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'configuration_change' | 'system_event' | 'security_event';
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
/**
 * Nastavi konfiguracijo
 */
export declare function configureAudit(newConfig: Partial<AuditConfig>): void;
/**
 * Zabeleži audit vnos
 */
export declare function logAudit(eventType: AuditEventType, action: string, resource: string, outcome: AuditOutcome, options?: {
    userId?: string | null;
    resourceId?: string | null;
    details?: Record<string, unknown>;
    ipAddress?: string | null;
    userAgent?: string | null;
    sessionId?: string | null;
    traceId?: string | null;
}): AuditEntry;
/**
 * Zabeleži audit vnos (alias)
 */
export declare function recordAudit(eventType: AuditEventType, action: string, resource: string, outcome: AuditOutcome, options?: {
    userId?: string | null;
    resourceId?: string | null;
    details?: Record<string, unknown>;
    ipAddress?: string | null;
    userAgent?: string | null;
    sessionId?: string | null;
    traceId?: string | null;
}): AuditEntry;
/**
 * Zabeleži avtentikacijski dogodek
 */
export declare function logAuthenticationEvent(action: 'login' | 'logout' | 'token_refresh' | 'password_change' | 'mfa_verify', outcome: AuditOutcome, userId: string | null, details?: Record<string, unknown>): AuditEntry;
/**
 * Zabeleži avtorizacijski dogodek
 */
export declare function logAuthorizationEvent(action: string, resource: string, outcome: AuditOutcome, userId: string, details?: Record<string, unknown>): AuditEntry;
/**
 * Zabeleži dostop do podatkov
 */
export declare function logDataAccess(resource: string, resourceId: string, userId: string, details?: Record<string, unknown>): AuditEntry;
/**
 * Zabeleži spremembo podatkov
 */
export declare function logDataModification(action: 'create' | 'update' | 'delete', resource: string, resourceId: string, userId: string, details?: Record<string, unknown>): AuditEntry;
/**
 * Pridobi audit log
 */
export declare function getAuditLog(filter?: {
    eventType?: AuditEventType;
    userId?: string;
    resource?: string;
    outcome?: AuditOutcome;
    fromTimestamp?: number;
    toTimestamp?: number;
}): readonly AuditEntry[];
/**
 * Pocisti audit log
 */
export declare function clearAuditLog(): void;
export declare const Audit: {
    configure: typeof configureAudit;
    logAudit: typeof logAudit;
    recordAudit: typeof recordAudit;
    logAuthenticationEvent: typeof logAuthenticationEvent;
    logAuthorizationEvent: typeof logAuthorizationEvent;
    logDataAccess: typeof logDataAccess;
    logDataModification: typeof logDataModification;
    getAuditLog: typeof getAuditLog;
    clearAuditLog: typeof clearAuditLog;
};
