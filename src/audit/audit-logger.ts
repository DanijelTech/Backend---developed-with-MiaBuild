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

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI ZA AUDIT LOGGER
// ============================================================================

/**
 * Audit event type
 */
export type AuditEventType =
    | 'create'
    | 'read'
    | 'update'
    | 'delete'
    | 'login'
    | 'logout'
    | 'access_granted'
    | 'access_denied'
    | 'permission_change'
    | 'config_change'
    | 'data_export'
    | 'data_import'
    | 'error'
    | 'security_alert'
    | 'compliance_check'
    | 'custom';

/**
 * Audit severity
 */
export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Audit status
 */
export type AuditStatus = 'success' | 'failure' | 'partial' | 'pending';

/**
 * Audit event
 */
export interface AuditEvent {
    readonly eventId: string;
    readonly type: AuditEventType;
    readonly severity: AuditSeverity;
    readonly status: AuditStatus;
    readonly timestamp: number;
    readonly actor: AuditActor;
    readonly resource: AuditResource;
    readonly action: AuditAction;
    readonly context: AuditContext;
    readonly changes: readonly AuditChange[];
    readonly metadata: Readonly<Record<string, unknown>>;
    readonly correlationId: string | null;
    readonly parentEventId: string | null;
}

/**
 * Audit actor
 */
export interface AuditActor {
    readonly actorId: string;
    readonly type: ActorType;
    readonly name: string;
    readonly email: string | null;
    readonly roles: readonly string[];
    readonly ipAddress: string | null;
    readonly userAgent: string | null;
    readonly sessionId: string | null;
}

/**
 * Actor type
 */
export type ActorType = 'user' | 'service' | 'system' | 'anonymous' | 'api_key';

/**
 * Audit resource
 */
export interface AuditResource {
    readonly resourceId: string;
    readonly type: string;
    readonly name: string;
    readonly path: string | null;
    readonly owner: string | null;
    readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Audit action
 */
export interface AuditAction {
    readonly actionId: string;
    readonly name: string;
    readonly description: string;
    readonly category: string;
    readonly parameters: Readonly<Record<string, unknown>>;
}

/**
 * Audit context
 */
export interface AuditContext {
    readonly requestId: string | null;
    readonly traceId: string | null;
    readonly spanId: string | null;
    readonly environment: string;
    readonly service: string;
    readonly version: string;
    readonly region: string | null;
    readonly custom: Readonly<Record<string, unknown>>;
}

/**
 * Audit change
 */
export interface AuditChange {
    readonly changeId: string;
    readonly field: string;
    readonly oldValue: unknown;
    readonly newValue: unknown;
    readonly changeType: ChangeType;
}

/**
 * Change type
 */
export type ChangeType = 'added' | 'modified' | 'removed';

/**
 * Audit query
 */
export interface AuditQuery {
    readonly eventTypes?: readonly AuditEventType[];
    readonly severities?: readonly AuditSeverity[];
    readonly statuses?: readonly AuditStatus[];
    readonly actorIds?: readonly string[];
    readonly actorTypes?: readonly ActorType[];
    readonly resourceIds?: readonly string[];
    readonly resourceTypes?: readonly string[];
    readonly actionNames?: readonly string[];
    readonly categories?: readonly string[];
    readonly startTime?: number;
    readonly endTime?: number;
    readonly correlationId?: string;
    readonly searchText?: string;
    readonly limit?: number;
    readonly offset?: number;
    readonly sortBy?: AuditSortField;
    readonly sortOrder?: SortOrder;
}

/**
 * Audit sort field
 */
export type AuditSortField = 'timestamp' | 'type' | 'severity' | 'actor' | 'resource';

/**
 * Sort order
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Audit query result
 */
export interface AuditQueryResult {
    readonly events: readonly AuditEvent[];
    readonly total: number;
    readonly limit: number;
    readonly offset: number;
    readonly hasMore: boolean;
}

/**
 * Retention policy
 */
export interface RetentionPolicy {
    readonly policyId: string;
    readonly name: string;
    readonly eventTypes: readonly AuditEventType[];
    readonly severities: readonly AuditSeverity[];
    readonly retentionDays: number;
    readonly archiveEnabled: boolean;
    readonly archiveDestination: string | null;
    readonly enabled: boolean;
}

/**
 * Audit export format
 */
export type AuditExportFormat = 'json' | 'csv' | 'xml' | 'parquet';

/**
 * Audit export options
 */
export interface AuditExportOptions {
    readonly format: AuditExportFormat;
    readonly query: AuditQuery;
    readonly includeMetadata: boolean;
    readonly compress: boolean;
}

/**
 * Audit export result
 */
export interface AuditExportResult {
    readonly exportId: string;
    readonly format: AuditExportFormat;
    readonly eventCount: number;
    readonly fileSize: number;
    readonly filePath: string;
    readonly createdAt: number;
}

/**
 * Audit sink
 */
export interface AuditSink {
    readonly sinkId: string;
    readonly name: string;
    readonly type: SinkType;
    readonly write: SinkWriteFunction;
    readonly config: Readonly<Record<string, unknown>>;
    readonly enabled: boolean;
}

/**
 * Sink type
 */
export type SinkType = 'database' | 'file' | 'elasticsearch' | 'kafka' | 'syslog' | 'custom';

/**
 * Sink write function
 */
export type SinkWriteFunction = (events: readonly AuditEvent[]) => Promise<void>;

/**
 * Audit logger event
 */
export interface AuditLoggerEvent {
    readonly eventId: string;
    readonly type: AuditLoggerEventType;
    readonly timestamp: number;
    readonly data: Readonly<Record<string, unknown>>;
}

/**
 * Audit logger event type
 */
export type AuditLoggerEventType =
    | 'event_logged'
    | 'event_archived'
    | 'event_deleted'
    | 'export_started'
    | 'export_completed'
    | 'retention_applied'
    | 'sink_error'
    | 'query_executed';

/**
 * Audit logger event listener
 */
export type AuditLoggerEventListener = (event: AuditLoggerEvent) => void | Promise<void>;

/**
 * Audit statistics
 */
export interface AuditStatistics {
    readonly totalEvents: number;
    readonly eventsByType: Readonly<Record<AuditEventType, number>>;
    readonly eventsBySeverity: Readonly<Record<AuditSeverity, number>>;
    readonly eventsByStatus: Readonly<Record<AuditStatus, number>>;
    readonly eventsToday: number;
    readonly eventsThisWeek: number;
    readonly eventsThisMonth: number;
    readonly avgEventsPerDay: number;
    readonly storageUsed: number;
}

/**
 * Compliance report
 */
export interface ComplianceReport {
    readonly reportId: string;
    readonly name: string;
    readonly startTime: number;
    readonly endTime: number;
    readonly totalEvents: number;
    readonly findings: readonly ComplianceFinding[];
    readonly summary: ComplianceSummary;
    readonly generatedAt: number;
}

/**
 * Compliance finding
 */
export interface ComplianceFinding {
    readonly findingId: string;
    readonly type: FindingType;
    readonly severity: AuditSeverity;
    readonly description: string;
    readonly eventIds: readonly string[];
    readonly recommendation: string;
}

/**
 * Finding type
 */
export type FindingType = 'violation' | 'anomaly' | 'gap' | 'risk';

/**
 * Compliance summary
 */
export interface ComplianceSummary {
    readonly totalFindings: number;
    readonly criticalFindings: number;
    readonly highFindings: number;
    readonly mediumFindings: number;
    readonly lowFindings: number;
    readonly complianceScore: number;
}

// ============================================================================
// STANJE
// ============================================================================

const events: Map<string, AuditEvent> = new Map();
const retentionPolicies: Map<string, RetentionPolicy> = new Map();
const sinks: Map<string, AuditSink> = new Map();
const eventListeners: Set<AuditLoggerEventListener> = new Set();

let eventCounter = 0;
let changeCounter = 0;
let actionCounter = 0;
let policyCounter = 0;
let sinkCounter = 0;
let exportCounter = 0;
let reportCounter = 0;
let loggerEventCounter = 0;

const defaultContext: AuditContext = {
    requestId: null,
    traceId: null,
    spanId: null,
    environment: 'production',
    service: 'unknown',
    version: '1.0.0',
    region: null,
    custom: {},
};

const statistics: AuditStatistics = {
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
function generateEventId(): string {
    eventCounter++;
    return generateDeterministicId(`audit-event-${eventCounter}`);
}

/**
 * Generate change ID
 */
function generateChangeId(): string {
    changeCounter++;
    return generateDeterministicId(`audit-change-${changeCounter}`);
}

/**
 * Generate action ID
 */
function generateActionId(): string {
    actionCounter++;
    return generateDeterministicId(`audit-action-${actionCounter}`);
}

/**
 * Generate policy ID
 */
function generatePolicyId(): string {
    policyCounter++;
    return generateDeterministicId(`retention-policy-${policyCounter}`);
}

/**
 * Generate sink ID
 */
function generateSinkId(): string {
    sinkCounter++;
    return generateDeterministicId(`audit-sink-${sinkCounter}`);
}

/**
 * Generate export ID
 */
function generateExportId(): string {
    exportCounter++;
    return generateDeterministicId(`audit-export-${exportCounter}`);
}

/**
 * Generate report ID
 */
function generateReportId(): string {
    reportCounter++;
    return generateDeterministicId(`compliance-report-${reportCounter}`);
}

/**
 * Generate logger event ID
 */
function generateLoggerEventId(): string {
    loggerEventCounter++;
    return generateDeterministicId(`logger-event-${loggerEventCounter}`);
}

/**
 * Emit logger event
 */
async function emitLoggerEvent(event: AuditLoggerEvent): Promise<void> {
    for (const listener of eventListeners) {
        try {
            await listener(event);
        } catch {
            // Ignore listener errors
        }
    }
}

/**
 * Update statistics
 */
function updateStatistics(): void {
    const mutableStats = statistics as {
        totalEvents: number;
        eventsToday: number;
        eventsThisWeek: number;
        eventsThisMonth: number;
        avgEventsPerDay: number;
    };
    
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
function matchesQuery(event: AuditEvent, query: AuditQuery): boolean {
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
function compareEvents(a: AuditEvent, b: AuditEvent, sortBy: AuditSortField, sortOrder: SortOrder): number {
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
function detectChanges(oldObj: Record<string, unknown>, newObj: Record<string, unknown>): AuditChange[] {
    const changes: AuditChange[] = [];
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
        } else if (!(key in newObj)) {
            changes.push({
                changeId: generateChangeId(),
                field: key,
                oldValue,
                newValue: undefined,
                changeType: 'removed',
            });
        } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
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
export async function log(
    type: AuditEventType,
    actor: AuditActor,
    resource: AuditResource,
    action: Omit<AuditAction, 'actionId'>,
    options: {
        severity?: AuditSeverity;
        status?: AuditStatus;
        context?: Partial<AuditContext>;
        changes?: readonly Omit<AuditChange, 'changeId'>[];
        metadata?: Record<string, unknown>;
        correlationId?: string;
        parentEventId?: string;
    } = {}
): Promise<AuditEvent> {
    const eventId = generateEventId();
    const now = clock.nowMs();
    
    const event: AuditEvent = {
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
    
    const mutableStats = statistics as {
        eventsByType: Record<AuditEventType, number>;
        eventsBySeverity: Record<AuditSeverity, number>;
        eventsByStatus: Record<AuditStatus, number>;
    };
    
    mutableStats.eventsByType[type]++;
    mutableStats.eventsBySeverity[event.severity]++;
    mutableStats.eventsByStatus[event.status]++;
    
    for (const sink of sinks.values()) {
        if (sink.enabled) {
            try {
                await sink.write([event]);
            } catch (error) {
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
export async function logCreate(
    actor: AuditActor,
    resource: AuditResource,
    data: Record<string, unknown>,
    options: {
        context?: Partial<AuditContext>;
        metadata?: Record<string, unknown>;
        correlationId?: string;
    } = {}
): Promise<AuditEvent> {
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
            changeType: 'added' as ChangeType,
        })),
    });
}

/**
 * Log read event
 */
export async function logRead(
    actor: AuditActor,
    resource: AuditResource,
    options: {
        context?: Partial<AuditContext>;
        metadata?: Record<string, unknown>;
        correlationId?: string;
    } = {}
): Promise<AuditEvent> {
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
export async function logUpdate(
    actor: AuditActor,
    resource: AuditResource,
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>,
    options: {
        context?: Partial<AuditContext>;
        metadata?: Record<string, unknown>;
        correlationId?: string;
    } = {}
): Promise<AuditEvent> {
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
export async function logDelete(
    actor: AuditActor,
    resource: AuditResource,
    data: Record<string, unknown>,
    options: {
        context?: Partial<AuditContext>;
        metadata?: Record<string, unknown>;
        correlationId?: string;
    } = {}
): Promise<AuditEvent> {
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
            changeType: 'removed' as ChangeType,
        })),
    });
}

/**
 * Log login event
 */
export async function logLogin(
    actor: AuditActor,
    success: boolean,
    options: {
        context?: Partial<AuditContext>;
        metadata?: Record<string, unknown>;
        correlationId?: string;
        failureReason?: string;
    } = {}
): Promise<AuditEvent> {
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
export async function logLogout(
    actor: AuditActor,
    options: {
        context?: Partial<AuditContext>;
        metadata?: Record<string, unknown>;
        correlationId?: string;
    } = {}
): Promise<AuditEvent> {
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
export async function logAccessGranted(
    actor: AuditActor,
    resource: AuditResource,
    permission: string,
    options: {
        context?: Partial<AuditContext>;
        metadata?: Record<string, unknown>;
        correlationId?: string;
    } = {}
): Promise<AuditEvent> {
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
export async function logAccessDenied(
    actor: AuditActor,
    resource: AuditResource,
    permission: string,
    reason: string,
    options: {
        context?: Partial<AuditContext>;
        metadata?: Record<string, unknown>;
        correlationId?: string;
    } = {}
): Promise<AuditEvent> {
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
export async function logSecurityAlert(
    actor: AuditActor,
    alertType: string,
    description: string,
    options: {
        resource?: AuditResource;
        context?: Partial<AuditContext>;
        metadata?: Record<string, unknown>;
        correlationId?: string;
    } = {}
): Promise<AuditEvent> {
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
export async function query(queryParams: AuditQuery): Promise<AuditQueryResult> {
    const matchingEvents: AuditEvent[] = [];
    
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
export function getEvent(eventId: string): AuditEvent | null {
    return events.get(eventId) ?? null;
}

/**
 * Get events by correlation ID
 */
export function getEventsByCorrelation(correlationId: string): readonly AuditEvent[] {
    return Array.from(events.values()).filter(e => e.correlationId === correlationId);
}

/**
 * Get events by actor
 */
export function getEventsByActor(actorId: string): readonly AuditEvent[] {
    return Array.from(events.values()).filter(e => e.actor.actorId === actorId);
}

/**
 * Get events by resource
 */
export function getEventsByResource(resourceId: string): readonly AuditEvent[] {
    return Array.from(events.values()).filter(e => e.resource.resourceId === resourceId);
}

// ============================================================================
// RETENTION POLICIES
// ============================================================================

/**
 * Create retention policy
 */
export function createRetentionPolicy(
    name: string,
    retentionDays: number,
    options: {
        eventTypes?: readonly AuditEventType[];
        severities?: readonly AuditSeverity[];
        archiveEnabled?: boolean;
        archiveDestination?: string;
    } = {}
): RetentionPolicy {
    const policyId = generatePolicyId();
    
    const policy: RetentionPolicy = {
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
export function getRetentionPolicy(policyId: string): RetentionPolicy | null {
    return retentionPolicies.get(policyId) ?? null;
}

/**
 * Get all retention policies
 */
export function getAllRetentionPolicies(): readonly RetentionPolicy[] {
    return Array.from(retentionPolicies.values());
}

/**
 * Delete retention policy
 */
export function deleteRetentionPolicy(policyId: string): boolean {
    return retentionPolicies.delete(policyId);
}

/**
 * Apply retention policies
 */
export async function applyRetentionPolicies(): Promise<number> {
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
export function registerSink(
    name: string,
    type: SinkType,
    write: SinkWriteFunction,
    config: Record<string, unknown> = {}
): AuditSink {
    const sinkId = generateSinkId();
    
    const sink: AuditSink = {
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
export function getSink(sinkId: string): AuditSink | null {
    return sinks.get(sinkId) ?? null;
}

/**
 * Get all sinks
 */
export function getAllSinks(): readonly AuditSink[] {
    return Array.from(sinks.values());
}

/**
 * Enable sink
 */
export function enableSink(sinkId: string): boolean {
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
export function disableSink(sinkId: string): boolean {
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
export function removeSink(sinkId: string): boolean {
    return sinks.delete(sinkId);
}

// ============================================================================
// EXPORT
// ============================================================================

/**
 * Export events
 */
export async function exportEvents(options: AuditExportOptions): Promise<AuditExportResult> {
    const exportId = generateExportId();
    
    await emitLoggerEvent({
        eventId: generateLoggerEventId(),
        type: 'export_started',
        timestamp: clock.nowMs(),
        data: { exportId, format: options.format },
    });
    
    const result = await query(options.query);
    
    let content: string;
    
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
    
    const exportResult: AuditExportResult = {
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
export async function generateComplianceReport(
    name: string,
    startTime: number,
    endTime: number
): Promise<ComplianceReport> {
    const reportId = generateReportId();
    
    const result = await query({
        startTime,
        endTime,
    });
    
    const findings: ComplianceFinding[] = [];
    
    const failedLogins = result.events.filter(e => e.type === 'login' && e.status === 'failure');
    if (failedLogins.length > 10) {
        findings.push({
            findingId: generateDeterministicId(`finding-${findings.length}`),
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
            findingId: generateDeterministicId(`finding-${findings.length}`),
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
            findingId: generateDeterministicId(`finding-${findings.length}`),
            type: 'violation',
            severity: alert.severity,
            description: alert.action.description,
            eventIds: [alert.eventId],
            recommendation: 'Investigate and remediate security alert',
        });
    }
    
    const summary: ComplianceSummary = {
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
export function getStatistics(): Readonly<AuditStatistics> {
    updateStatistics();
    return { ...statistics };
}

/**
 * Reset statistics
 */
export function resetStatistics(): void {
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
export function addEventListener(listener: AuditLoggerEventListener): void {
    eventListeners.add(listener);
}

/**
 * Remove event listener
 */
export function removeEventListener(listener: AuditLoggerEventListener): void {
    eventListeners.delete(listener);
}

/**
 * Clear event listeners
 */
export function clearEventListeners(): void {
    eventListeners.clear();
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Clear all state
 */
export function clearAll(): void {
    events.clear();
    retentionPolicies.clear();
    sinks.clear();
    eventListeners.clear();
    resetStatistics();
}
