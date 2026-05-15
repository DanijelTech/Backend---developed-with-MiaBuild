"use strict";
/**
 * @file Audit Logger za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-AUDIT-001 Audit logging za zaledne sisteme
 * @design DSN-ZALEDNI-AUDIT-001 Backend audit logger arhitektura
 * @test TEST-ZALEDNI-AUDIT-001 Preverjanje audit logger
 *
 * Audit Logger - prilagojen za zaledne sisteme:
 * - Event capture
 * - User tracking
 * - Resource tracking
 * - Change detection
 * - Compliance logging
 * - Retention policies
 * - Search and query
 * - Export capabilities
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom AUDIT_001 - Audit Logger
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = log;
exports.logCreate = logCreate;
exports.logRead = logRead;
exports.logUpdate = logUpdate;
exports.logDelete = logDelete;
exports.logLogin = logLogin;
exports.logLogout = logLogout;
exports.logAccessGranted = logAccessGranted;
exports.logAccessDenied = logAccessDenied;
exports.logSecurityAlert = logSecurityAlert;
exports.query = query;
exports.getEvent = getEvent;
exports.getEventsByCorrelation = getEventsByCorrelation;
exports.getEventsByActor = getEventsByActor;
exports.getEventsByResource = getEventsByResource;
exports.createRetentionPolicy = createRetentionPolicy;
exports.getRetentionPolicy = getRetentionPolicy;
exports.getAllRetentionPolicies = getAllRetentionPolicies;
exports.deleteRetentionPolicy = deleteRetentionPolicy;
exports.applyRetentionPolicies = applyRetentionPolicies;
exports.registerSink = registerSink;
exports.getSink = getSink;
exports.getAllSinks = getAllSinks;
exports.enableSink = enableSink;
exports.disableSink = disableSink;
exports.removeSink = removeSink;
exports.exportEvents = exportEvents;
exports.generateComplianceReport = generateComplianceReport;
exports.getStatistics = getStatistics;
exports.resetStatistics = resetStatistics;
exports.addEventListener = addEventListener;
exports.removeEventListener = removeEventListener;
exports.clearEventListeners = clearEventListeners;
exports.clearAll = clearAll;
const clock_1 = require("@mia/core/clock");
const deterministic_1 = require("@mia/core/deterministic");
const clock = (0, clock_1.getClock)();
// ============================================================================
// STANJE
// ============================================================================
const events = new Map();
const retentionPolicies = new Map();
const sinks = new Map();
const eventListeners = new Set();
let eventCounter = 0;
let changeCounter = 0;
let actionCounter = 0;
let policyCounter = 0;
let sinkCounter = 0;
let exportCounter = 0;
let reportCounter = 0;
let loggerEventCounter = 0;
const defaultContext = {
    requestId: null,
    traceId: null,
    spanId: null,
    environment: 'production',
    service: 'unknown',
    version: '1.0.0',
    region: null,
    custom: {},
};
const statistics = {
    totalEvents: 0,
    eventsByType: {
        create: 0,
        read: 0,
        update: 0,
        delete: 0,
        login: 0,
        logout: 0,
        access_granted: 0,
        access_denied: 0,
        permission_change: 0,
        config_change: 0,
        data_export: 0,
        data_import: 0,
        error: 0,
        security_alert: 0,
        compliance_check: 0,
        custom: 0,
    },
    eventsBySeverity: {
        info: 0,
        warning: 0,
        error: 0,
        critical: 0,
    },
    eventsByStatus: {
        success: 0,
        failure: 0,
        partial: 0,
        pending: 0,
    },
    eventsToday: 0,
    eventsThisWeek: 0,
    eventsThisMonth: 0,
    avgEventsPerDay: 0,
    storageUsed: 0,
};
// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================
/**
 * Generate event ID
 */
function generateEventId() {
    eventCounter++;
    return (0, deterministic_1.generateDeterministicId)(`audit-event-${eventCounter}`);
}
/**
 * Generate change ID
 */
function generateChangeId() {
    changeCounter++;
    return (0, deterministic_1.generateDeterministicId)(`audit-change-${changeCounter}`);
}
/**
 * Generate action ID
 */
function generateActionId() {
    actionCounter++;
    return (0, deterministic_1.generateDeterministicId)(`audit-action-${actionCounter}`);
}
/**
 * Generate policy ID
 */
function generatePolicyId() {
    policyCounter++;
    return (0, deterministic_1.generateDeterministicId)(`retention-policy-${policyCounter}`);
}
/**
 * Generate sink ID
 */
function generateSinkId() {
    sinkCounter++;
    return (0, deterministic_1.generateDeterministicId)(`audit-sink-${sinkCounter}`);
}
/**
 * Generate export ID
 */
function generateExportId() {
    exportCounter++;
    return (0, deterministic_1.generateDeterministicId)(`audit-export-${exportCounter}`);
}
/**
 * Generate report ID
 */
function generateReportId() {
    reportCounter++;
    return (0, deterministic_1.generateDeterministicId)(`compliance-report-${reportCounter}`);
}
/**
 * Generate logger event ID
 */
function generateLoggerEventId() {
    loggerEventCounter++;
    return (0, deterministic_1.generateDeterministicId)(`logger-event-${loggerEventCounter}`);
}
/**
 * Emit logger event
 */
async function emitLoggerEvent(event) {
    for (const listener of eventListeners) {
        try {
            await listener(event);
        }
        catch {
            // Ignore listener errors
        }
    }
}
/**
 * Update statistics
 */
function updateStatistics() {
    const mutableStats = statistics;
    mutableStats.totalEvents = events.size;
    const now = clock.nowMs();
    const dayMs = 24 * 60 * 60 * 1000;
    const weekMs = 7 * dayMs;
    const monthMs = 30 * dayMs;
    const todayStart = now - dayMs;
    const weekStart = now - weekMs;
    const monthStart = now - monthMs;
    mutableStats.eventsToday = 0;
    mutableStats.eventsThisWeek = 0;
    mutableStats.eventsThisMonth = 0;
    for (const event of events.values()) {
        if (event.timestamp >= todayStart) {
            mutableStats.eventsToday++;
        }
        if (event.timestamp >= weekStart) {
            mutableStats.eventsThisWeek++;
        }
        if (event.timestamp >= monthStart) {
            mutableStats.eventsThisMonth++;
        }
    }
    if (mutableStats.eventsThisMonth > 0) {
        mutableStats.avgEventsPerDay = mutableStats.eventsThisMonth / 30;
    }
}
/**
 * Match event to query
 */
function matchesQuery(event, query) {
    if (query.eventTypes && query.eventTypes.length > 0) {
        if (!query.eventTypes.includes(event.type)) {
            return false;
        }
    }
    if (query.severities && query.severities.length > 0) {
        if (!query.severities.includes(event.severity)) {
            return false;
        }
    }
    if (query.statuses && query.statuses.length > 0) {
        if (!query.statuses.includes(event.status)) {
            return false;
        }
    }
    if (query.actorIds && query.actorIds.length > 0) {
        if (!query.actorIds.includes(event.actor.actorId)) {
            return false;
        }
    }
    if (query.actorTypes && query.actorTypes.length > 0) {
        if (!query.actorTypes.includes(event.actor.type)) {
            return false;
        }
    }
    if (query.resourceIds && query.resourceIds.length > 0) {
        if (!query.resourceIds.includes(event.resource.resourceId)) {
            return false;
        }
    }
    if (query.resourceTypes && query.resourceTypes.length > 0) {
        if (!query.resourceTypes.includes(event.resource.type)) {
            return false;
        }
    }
    if (query.actionNames && query.actionNames.length > 0) {
        if (!query.actionNames.includes(event.action.name)) {
            return false;
        }
    }
    if (query.categories && query.categories.length > 0) {
        if (!query.categories.includes(event.action.category)) {
            return false;
        }
    }
    if (query.startTime !== undefined) {
        if (event.timestamp < query.startTime) {
            return false;
        }
    }
    if (query.endTime !== undefined) {
        if (event.timestamp > query.endTime) {
            return false;
        }
    }
    if (query.correlationId !== undefined) {
        if (event.correlationId !== query.correlationId) {
            return false;
        }
    }
    if (query.searchText !== undefined && query.searchText.length > 0) {
        const searchLower = query.searchText.toLowerCase();
        const searchable = [
            event.actor.name,
            event.actor.email,
            event.resource.name,
            event.resource.path,
            event.action.name,
            event.action.description,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!searchable.includes(searchLower)) {
            return false;
        }
    }
    return true;
}
/**
 * Compare events for sorting
 */
function compareEvents(a, b, sortBy, sortOrder) {
    let comparison = 0;
    switch (sortBy) {
        case 'timestamp':
            comparison = a.timestamp - b.timestamp;
            break;
        case 'type':
            comparison = a.type.localeCompare(b.type);
            break;
        case 'severity':
            const severityOrder = { info: 0, warning: 1, error: 2, critical: 3 };
            comparison = severityOrder[a.severity] - severityOrder[b.severity];
            break;
        case 'actor':
            comparison = a.actor.name.localeCompare(b.actor.name);
            break;
        case 'resource':
            comparison = a.resource.name.localeCompare(b.resource.name);
            break;
    }
    return sortOrder === 'desc' ? -comparison : comparison;
}
/**
 * Detect changes between objects
 */
function detectChanges(oldObj, newObj) {
    const changes = [];
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
    for (const key of allKeys) {
        const oldValue = oldObj[key];
        const newValue = newObj[key];
        if (!(key in oldObj)) {
            changes.push({
                changeId: generateChangeId(),
                field: key,
                oldValue: undefined,
                newValue,
                changeType: 'added',
            });
        }
        else if (!(key in newObj)) {
            changes.push({
                changeId: generateChangeId(),
                field: key,
                oldValue,
                newValue: undefined,
                changeType: 'removed',
            });
        }
        else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            changes.push({
                changeId: generateChangeId(),
                field: key,
                oldValue,
                newValue,
                changeType: 'modified',
            });
        }
    }
    return changes;
}
// ============================================================================
// LOGGING
// ============================================================================
/**
 * Log audit event
 */
async function log(type, actor, resource, action, options = {}) {
    const eventId = generateEventId();
    const now = clock.nowMs();
    const event = {
        eventId,
        type,
        severity: options.severity ?? 'info',
        status: options.status ?? 'success',
        timestamp: now,
        actor,
        resource,
        action: {
            ...action,
            actionId: generateActionId(),
        },
        context: {
            ...defaultContext,
            ...options.context,
        },
        changes: (options.changes ?? []).map(c => ({
            ...c,
            changeId: generateChangeId(),
        })),
        metadata: options.metadata ?? {},
        correlationId: options.correlationId ?? null,
        parentEventId: options.parentEventId ?? null,
    };
    events.set(eventId, event);
    const mutableStats = statistics;
    mutableStats.eventsByType[type]++;
    mutableStats.eventsBySeverity[event.severity]++;
    mutableStats.eventsByStatus[event.status]++;
    for (const sink of sinks.values()) {
        if (sink.enabled) {
            try {
                await sink.write([event]);
            }
            catch (error) {
                await emitLoggerEvent({
                    eventId: generateLoggerEventId(),
                    type: 'sink_error',
                    timestamp: clock.nowMs(),
                    data: { sinkId: sink.sinkId, error: error instanceof Error ? error.message : 'Unknown error' },
                });
            }
        }
    }
    await emitLoggerEvent({
        eventId: generateLoggerEventId(),
        type: 'event_logged',
        timestamp: now,
        data: { eventId, type, severity: event.severity },
    });
    updateStatistics();
    return event;
}
/**
 * Log create event
 */
async function logCreate(actor, resource, data, options = {}) {
    return log('create', actor, resource, {
        name: 'create',
        description: `Created ${resource.type} '${resource.name}'`,
        category: 'data',
        parameters: data,
    }, {
        ...options,
        changes: Object.entries(data).map(([field, value]) => ({
            field,
            oldValue: undefined,
            newValue: value,
            changeType: 'added',
        })),
    });
}
/**
 * Log read event
 */
async function logRead(actor, resource, options = {}) {
    return log('read', actor, resource, {
        name: 'read',
        description: `Read ${resource.type} '${resource.name}'`,
        category: 'data',
        parameters: {},
    }, options);
}
/**
 * Log update event
 */
async function logUpdate(actor, resource, oldData, newData, options = {}) {
    const changes = detectChanges(oldData, newData);
    return log('update', actor, resource, {
        name: 'update',
        description: `Updated ${resource.type} '${resource.name}'`,
        category: 'data',
        parameters: { oldData, newData },
    }, {
        ...options,
        changes,
    });
}
/**
 * Log delete event
 */
async function logDelete(actor, resource, data, options = {}) {
    return log('delete', actor, resource, {
        name: 'delete',
        description: `Deleted ${resource.type} '${resource.name}'`,
        category: 'data',
        parameters: data,
    }, {
        ...options,
        changes: Object.entries(data).map(([field, value]) => ({
            field,
            oldValue: value,
            newValue: undefined,
            changeType: 'removed',
        })),
    });
}
/**
 * Log login event
 */
async function logLogin(actor, success, options = {}) {
    return log('login', actor, {
        resourceId: 'auth',
        type: 'authentication',
        name: 'login',
        path: null,
        owner: null,
        metadata: {},
    }, {
        name: 'login',
        description: success ? `User '${actor.name}' logged in` : `Failed login attempt for '${actor.name}'`,
        category: 'authentication',
        parameters: { failureReason: options.failureReason },
    }, {
        ...options,
        status: success ? 'success' : 'failure',
        severity: success ? 'info' : 'warning',
    });
}
/**
 * Log logout event
 */
async function logLogout(actor, options = {}) {
    return log('logout', actor, {
        resourceId: 'auth',
        type: 'authentication',
        name: 'logout',
        path: null,
        owner: null,
        metadata: {},
    }, {
        name: 'logout',
        description: `User '${actor.name}' logged out`,
        category: 'authentication',
        parameters: {},
    }, options);
}
/**
 * Log access granted event
 */
async function logAccessGranted(actor, resource, permission, options = {}) {
    return log('access_granted', actor, resource, {
        name: 'access_granted',
        description: `Access granted to ${resource.type} '${resource.name}' with permission '${permission}'`,
        category: 'authorization',
        parameters: { permission },
    }, options);
}
/**
 * Log access denied event
 */
async function logAccessDenied(actor, resource, permission, reason, options = {}) {
    return log('access_denied', actor, resource, {
        name: 'access_denied',
        description: `Access denied to ${resource.type} '${resource.name}' for permission '${permission}'`,
        category: 'authorization',
        parameters: { permission, reason },
    }, {
        ...options,
        severity: 'warning',
        status: 'failure',
    });
}
/**
 * Log security alert
 */
async function logSecurityAlert(actor, alertType, description, options = {}) {
    return log('security_alert', actor, options.resource ?? {
        resourceId: 'security',
        type: 'security',
        name: alertType,
        path: null,
        owner: null,
        metadata: {},
    }, {
        name: alertType,
        description,
        category: 'security',
        parameters: {},
    }, {
        ...options,
        severity: 'critical',
    });
}
// ============================================================================
// QUERYING
// ============================================================================
/**
 * Query events
 */
async function query(queryParams) {
    const matchingEvents = [];
    for (const event of events.values()) {
        if (matchesQuery(event, queryParams)) {
            matchingEvents.push(event);
        }
    }
    const sortBy = queryParams.sortBy ?? 'timestamp';
    const sortOrder = queryParams.sortOrder ?? 'desc';
    matchingEvents.sort((a, b) => compareEvents(a, b, sortBy, sortOrder));
    const limit = queryParams.limit ?? 100;
    const offset = queryParams.offset ?? 0;
    const paginatedEvents = matchingEvents.slice(offset, offset + limit);
    await emitLoggerEvent({
        eventId: generateLoggerEventId(),
        type: 'query_executed',
        timestamp: clock.nowMs(),
        data: { total: matchingEvents.length, returned: paginatedEvents.length },
    });
    return {
        events: paginatedEvents,
        total: matchingEvents.length,
        limit,
        offset,
        hasMore: offset + limit < matchingEvents.length,
    };
}
/**
 * Get event by ID
 */
function getEvent(eventId) {
    return events.get(eventId) ?? null;
}
/**
 * Get events by correlation ID
 */
function getEventsByCorrelation(correlationId) {
    return Array.from(events.values()).filter(e => e.correlationId === correlationId);
}
/**
 * Get events by actor
 */
function getEventsByActor(actorId) {
    return Array.from(events.values()).filter(e => e.actor.actorId === actorId);
}
/**
 * Get events by resource
 */
function getEventsByResource(resourceId) {
    return Array.from(events.values()).filter(e => e.resource.resourceId === resourceId);
}
// ============================================================================
// RETENTION POLICIES
// ============================================================================
/**
 * Create retention policy
 */
function createRetentionPolicy(name, retentionDays, options = {}) {
    const policyId = generatePolicyId();
    const policy = {
        policyId,
        name,
        eventTypes: options.eventTypes ?? [],
        severities: options.severities ?? [],
        retentionDays,
        archiveEnabled: options.archiveEnabled ?? false,
        archiveDestination: options.archiveDestination ?? null,
        enabled: true,
    };
    retentionPolicies.set(policyId, policy);
    return policy;
}
/**
 * Get retention policy
 */
function getRetentionPolicy(policyId) {
    return retentionPolicies.get(policyId) ?? null;
}
/**
 * Get all retention policies
 */
function getAllRetentionPolicies() {
    return Array.from(retentionPolicies.values());
}
/**
 * Delete retention policy
 */
function deleteRetentionPolicy(policyId) {
    return retentionPolicies.delete(policyId);
}
/**
 * Apply retention policies
 */
async function applyRetentionPolicies() {
    const now = clock.nowMs();
    const dayMs = 24 * 60 * 60 * 1000;
    let deletedCount = 0;
    for (const policy of retentionPolicies.values()) {
        if (!policy.enabled) {
            continue;
        }
        const cutoffTime = now - (policy.retentionDays * dayMs);
        for (const [eventId, event] of events) {
            if (event.timestamp >= cutoffTime) {
                continue;
            }
            if (policy.eventTypes.length > 0 && !policy.eventTypes.includes(event.type)) {
                continue;
            }
            if (policy.severities.length > 0 && !policy.severities.includes(event.severity)) {
                continue;
            }
            if (policy.archiveEnabled) {
                await emitLoggerEvent({
                    eventId: generateLoggerEventId(),
                    type: 'event_archived',
                    timestamp: clock.nowMs(),
                    data: { eventId, destination: policy.archiveDestination },
                });
            }
            events.delete(eventId);
            deletedCount++;
            await emitLoggerEvent({
                eventId: generateLoggerEventId(),
                type: 'event_deleted',
                timestamp: clock.nowMs(),
                data: { eventId, policyId: policy.policyId },
            });
        }
    }
    await emitLoggerEvent({
        eventId: generateLoggerEventId(),
        type: 'retention_applied',
        timestamp: clock.nowMs(),
        data: { deletedCount },
    });
    updateStatistics();
    return deletedCount;
}
// ============================================================================
// SINKS
// ============================================================================
/**
 * Register sink
 */
function registerSink(name, type, write, config = {}) {
    const sinkId = generateSinkId();
    const sink = {
        sinkId,
        name,
        type,
        write,
        config,
        enabled: true,
    };
    sinks.set(sinkId, sink);
    return sink;
}
/**
 * Get sink
 */
function getSink(sinkId) {
    return sinks.get(sinkId) ?? null;
}
/**
 * Get all sinks
 */
function getAllSinks() {
    return Array.from(sinks.values());
}
/**
 * Enable sink
 */
function enableSink(sinkId) {
    const sink = sinks.get(sinkId);
    if (!sink) {
        return false;
    }
    sinks.set(sinkId, { ...sink, enabled: true });
    return true;
}
/**
 * Disable sink
 */
function disableSink(sinkId) {
    const sink = sinks.get(sinkId);
    if (!sink) {
        return false;
    }
    sinks.set(sinkId, { ...sink, enabled: false });
    return true;
}
/**
 * Remove sink
 */
function removeSink(sinkId) {
    return sinks.delete(sinkId);
}
// ============================================================================
// EXPORT
// ============================================================================
/**
 * Export events
 */
async function exportEvents(options) {
    const exportId = generateExportId();
    await emitLoggerEvent({
        eventId: generateLoggerEventId(),
        type: 'export_started',
        timestamp: clock.nowMs(),
        data: { exportId, format: options.format },
    });
    const result = await query(options.query);
    let content;
    switch (options.format) {
        case 'json':
            content = JSON.stringify(result.events, null, 2);
            break;
        case 'csv':
            const headers = ['eventId', 'type', 'severity', 'status', 'timestamp', 'actorId', 'actorName', 'resourceId', 'resourceName', 'actionName'];
            const rows = result.events.map(e => [
                e.eventId,
                e.type,
                e.severity,
                e.status,
                e.timestamp.toString(),
                e.actor.actorId,
                e.actor.name,
                e.resource.resourceId,
                e.resource.name,
                e.action.name,
            ].join(','));
            content = [headers.join(','), ...rows].join('\n');
            break;
        case 'xml':
            content = `<?xml version="1.0" encoding="UTF-8"?>\n<auditEvents>\n${result.events.map(e => `  <event id="${e.eventId}" type="${e.type}" />`).join('\n')}\n</auditEvents>`;
            break;
        default:
            content = JSON.stringify(result.events);
    }
    const filePath = `/tmp/audit-export-${exportId}.${options.format}`;
    const exportResult = {
        exportId,
        format: options.format,
        eventCount: result.events.length,
        fileSize: content.length,
        filePath,
        createdAt: clock.nowMs(),
    };
    await emitLoggerEvent({
        eventId: generateLoggerEventId(),
        type: 'export_completed',
        timestamp: clock.nowMs(),
        data: { exportId, eventCount: result.events.length },
    });
    return exportResult;
}
// ============================================================================
// COMPLIANCE
// ============================================================================
/**
 * Generate compliance report
 */
async function generateComplianceReport(name, startTime, endTime) {
    const reportId = generateReportId();
    const result = await query({
        startTime,
        endTime,
    });
    const findings = [];
    const failedLogins = result.events.filter(e => e.type === 'login' && e.status === 'failure');
    if (failedLogins.length > 10) {
        findings.push({
            findingId: (0, deterministic_1.generateDeterministicId)(`finding-${findings.length}`),
            type: 'anomaly',
            severity: 'warning',
            description: `High number of failed login attempts (${failedLogins.length})`,
            eventIds: failedLogins.map(e => e.eventId),
            recommendation: 'Review failed login attempts for potential brute force attacks',
        });
    }
    const accessDenied = result.events.filter(e => e.type === 'access_denied');
    if (accessDenied.length > 5) {
        findings.push({
            findingId: (0, deterministic_1.generateDeterministicId)(`finding-${findings.length}`),
            type: 'risk',
            severity: 'warning',
            description: `Multiple access denied events (${accessDenied.length})`,
            eventIds: accessDenied.map(e => e.eventId),
            recommendation: 'Review access control policies and user permissions',
        });
    }
    const securityAlerts = result.events.filter(e => e.type === 'security_alert');
    for (const alert of securityAlerts) {
        findings.push({
            findingId: (0, deterministic_1.generateDeterministicId)(`finding-${findings.length}`),
            type: 'violation',
            severity: alert.severity,
            description: alert.action.description,
            eventIds: [alert.eventId],
            recommendation: 'Investigate and remediate security alert',
        });
    }
    const summary = {
        totalFindings: findings.length,
        criticalFindings: findings.filter(f => f.severity === 'critical').length,
        highFindings: findings.filter(f => f.severity === 'error').length,
        mediumFindings: findings.filter(f => f.severity === 'warning').length,
        lowFindings: findings.filter(f => f.severity === 'info').length,
        complianceScore: findings.length === 0 ? 100 : Math.max(0, 100 - (findings.length * 5)),
    };
    return {
        reportId,
        name,
        startTime,
        endTime,
        totalEvents: result.total,
        findings,
        summary,
        generatedAt: clock.nowMs(),
    };
}
// ============================================================================
// STATISTICS
// ============================================================================
/**
 * Get statistics
 */
function getStatistics() {
    updateStatistics();
    return { ...statistics };
}
/**
 * Reset statistics
 */
function resetStatistics() {
    Object.assign(statistics, {
        totalEvents: 0,
        eventsByType: {
            create: 0,
            read: 0,
            update: 0,
            delete: 0,
            login: 0,
            logout: 0,
            access_granted: 0,
            access_denied: 0,
            permission_change: 0,
            config_change: 0,
            data_export: 0,
            data_import: 0,
            error: 0,
            security_alert: 0,
            compliance_check: 0,
            custom: 0,
        },
        eventsBySeverity: {
            info: 0,
            warning: 0,
            error: 0,
            critical: 0,
        },
        eventsByStatus: {
            success: 0,
            failure: 0,
            partial: 0,
            pending: 0,
        },
        eventsToday: 0,
        eventsThisWeek: 0,
        eventsThisMonth: 0,
        avgEventsPerDay: 0,
        storageUsed: 0,
    });
}
// ============================================================================
// EVENT LISTENERS
// ============================================================================
/**
 * Add event listener
 */
function addEventListener(listener) {
    eventListeners.add(listener);
}
/**
 * Remove event listener
 */
function removeEventListener(listener) {
    eventListeners.delete(listener);
}
/**
 * Clear event listeners
 */
function clearEventListeners() {
    eventListeners.clear();
}
// ============================================================================
// CLEANUP
// ============================================================================
/**
 * Clear all state
 */
function clearAll() {
    events.clear();
    retentionPolicies.clear();
    sinks.clear();
    eventListeners.clear();
    resetStatistics();
}
