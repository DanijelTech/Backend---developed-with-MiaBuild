"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Audit = void 0;
exports.configureAudit = configureAudit;
exports.logAudit = logAudit;
exports.recordAudit = recordAudit;
exports.logAuthenticationEvent = logAuthenticationEvent;
exports.logAuthorizationEvent = logAuthorizationEvent;
exports.logDataAccess = logDataAccess;
exports.logDataModification = logDataModification;
exports.getAuditLog = getAuditLog;
exports.clearAuditLog = clearAuditLog;
const clock_1 = require("@mia/core/clock");
const clock = (0, clock_1.getClock)();
// ============================================================================
// STANJE
// ============================================================================
let config = {
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
const auditLog = [];
let entryCounter = 0;
// ============================================================================
// FUNKCIJE
// ============================================================================
/**
 * Nastavi konfiguracijo
 */
function configureAudit(newConfig) {
    config = { ...config, ...newConfig };
}
/**
 * Generiraj ID vnosa
 */
function generateEntryId() {
    entryCounter++;
    return `audit-${entryCounter}-${clock.nowMs()}`;
}
/**
 * Zabeleži audit vnos
 */
function logAudit(eventType, action, resource, outcome, options = {}) {
    const entry = {
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
function recordAudit(eventType, action, resource, outcome, options = {}) {
    return logAudit(eventType, action, resource, outcome, options);
}
/**
 * Zabeleži avtentikacijski dogodek
 */
function logAuthenticationEvent(action, outcome, userId, details = {}) {
    return logAudit('authentication', action, 'auth', outcome, { userId, details });
}
/**
 * Zabeleži avtorizacijski dogodek
 */
function logAuthorizationEvent(action, resource, outcome, userId, details = {}) {
    return logAudit('authorization', action, resource, outcome, { userId, details });
}
/**
 * Zabeleži dostop do podatkov
 */
function logDataAccess(resource, resourceId, userId, details = {}) {
    return logAudit('data_access', 'read', resource, 'success', { userId, resourceId, details });
}
/**
 * Zabeleži spremembo podatkov
 */
function logDataModification(action, resource, resourceId, userId, details = {}) {
    return logAudit('data_modification', action, resource, 'success', { userId, resourceId, details });
}
/**
 * Pridobi audit log
 */
function getAuditLog(filter) {
    if (!filter) {
        return auditLog;
    }
    return auditLog.filter(entry => {
        if (filter.eventType && entry.eventType !== filter.eventType)
            return false;
        if (filter.userId && entry.userId !== filter.userId)
            return false;
        if (filter.resource && entry.resource !== filter.resource)
            return false;
        if (filter.outcome && entry.outcome !== filter.outcome)
            return false;
        if (filter.fromTimestamp && entry.timestamp < filter.fromTimestamp)
            return false;
        if (filter.toTimestamp && entry.timestamp > filter.toTimestamp)
            return false;
        return true;
    });
}
/**
 * Pocisti audit log
 */
function clearAuditLog() {
    auditLog.length = 0;
}
// ============================================================================
// IZVOZ
// ============================================================================
exports.Audit = {
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
