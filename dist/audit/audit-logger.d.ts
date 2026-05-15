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
/**
 * Audit event type
 */
export type AuditEventType = 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'access_granted' | 'access_denied' | 'permission_change' | 'config_change' | 'data_export' | 'data_import' | 'error' | 'security_alert' | 'compliance_check' | 'custom';
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
export type AuditLoggerEventType = 'event_logged' | 'event_archived' | 'event_deleted' | 'export_started' | 'export_completed' | 'retention_applied' | 'sink_error' | 'query_executed';
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
/**
 * Log audit event
 */
export declare function log(type: AuditEventType, actor: AuditActor, resource: AuditResource, action: Omit<AuditAction, 'actionId'>, options?: {
    severity?: AuditSeverity;
    status?: AuditStatus;
    context?: Partial<AuditContext>;
    changes?: readonly Omit<AuditChange, 'changeId'>[];
    metadata?: Record<string, unknown>;
    correlationId?: string;
    parentEventId?: string;
}): Promise<AuditEvent>;
/**
 * Log create event
 */
export declare function logCreate(actor: AuditActor, resource: AuditResource, data: Record<string, unknown>, options?: {
    context?: Partial<AuditContext>;
    metadata?: Record<string, unknown>;
    correlationId?: string;
}): Promise<AuditEvent>;
/**
 * Log read event
 */
export declare function logRead(actor: AuditActor, resource: AuditResource, options?: {
    context?: Partial<AuditContext>;
    metadata?: Record<string, unknown>;
    correlationId?: string;
}): Promise<AuditEvent>;
/**
 * Log update event
 */
export declare function logUpdate(actor: AuditActor, resource: AuditResource, oldData: Record<string, unknown>, newData: Record<string, unknown>, options?: {
    context?: Partial<AuditContext>;
    metadata?: Record<string, unknown>;
    correlationId?: string;
}): Promise<AuditEvent>;
/**
 * Log delete event
 */
export declare function logDelete(actor: AuditActor, resource: AuditResource, data: Record<string, unknown>, options?: {
    context?: Partial<AuditContext>;
    metadata?: Record<string, unknown>;
    correlationId?: string;
}): Promise<AuditEvent>;
/**
 * Log login event
 */
export declare function logLogin(actor: AuditActor, success: boolean, options?: {
    context?: Partial<AuditContext>;
    metadata?: Record<string, unknown>;
    correlationId?: string;
    failureReason?: string;
}): Promise<AuditEvent>;
/**
 * Log logout event
 */
export declare function logLogout(actor: AuditActor, options?: {
    context?: Partial<AuditContext>;
    metadata?: Record<string, unknown>;
    correlationId?: string;
}): Promise<AuditEvent>;
/**
 * Log access granted event
 */
export declare function logAccessGranted(actor: AuditActor, resource: AuditResource, permission: string, options?: {
    context?: Partial<AuditContext>;
    metadata?: Record<string, unknown>;
    correlationId?: string;
}): Promise<AuditEvent>;
/**
 * Log access denied event
 */
export declare function logAccessDenied(actor: AuditActor, resource: AuditResource, permission: string, reason: string, options?: {
    context?: Partial<AuditContext>;
    metadata?: Record<string, unknown>;
    correlationId?: string;
}): Promise<AuditEvent>;
/**
 * Log security alert
 */
export declare function logSecurityAlert(actor: AuditActor, alertType: string, description: string, options?: {
    resource?: AuditResource;
    context?: Partial<AuditContext>;
    metadata?: Record<string, unknown>;
    correlationId?: string;
}): Promise<AuditEvent>;
/**
 * Query events
 */
export declare function query(queryParams: AuditQuery): Promise<AuditQueryResult>;
/**
 * Get event by ID
 */
export declare function getEvent(eventId: string): AuditEvent | null;
/**
 * Get events by correlation ID
 */
export declare function getEventsByCorrelation(correlationId: string): readonly AuditEvent[];
/**
 * Get events by actor
 */
export declare function getEventsByActor(actorId: string): readonly AuditEvent[];
/**
 * Get events by resource
 */
export declare function getEventsByResource(resourceId: string): readonly AuditEvent[];
/**
 * Create retention policy
 */
export declare function createRetentionPolicy(name: string, retentionDays: number, options?: {
    eventTypes?: readonly AuditEventType[];
    severities?: readonly AuditSeverity[];
    archiveEnabled?: boolean;
    archiveDestination?: string;
}): RetentionPolicy;
/**
 * Get retention policy
 */
export declare function getRetentionPolicy(policyId: string): RetentionPolicy | null;
/**
 * Get all retention policies
 */
export declare function getAllRetentionPolicies(): readonly RetentionPolicy[];
/**
 * Delete retention policy
 */
export declare function deleteRetentionPolicy(policyId: string): boolean;
/**
 * Apply retention policies
 */
export declare function applyRetentionPolicies(): Promise<number>;
/**
 * Register sink
 */
export declare function registerSink(name: string, type: SinkType, write: SinkWriteFunction, config?: Record<string, unknown>): AuditSink;
/**
 * Get sink
 */
export declare function getSink(sinkId: string): AuditSink | null;
/**
 * Get all sinks
 */
export declare function getAllSinks(): readonly AuditSink[];
/**
 * Enable sink
 */
export declare function enableSink(sinkId: string): boolean;
/**
 * Disable sink
 */
export declare function disableSink(sinkId: string): boolean;
/**
 * Remove sink
 */
export declare function removeSink(sinkId: string): boolean;
/**
 * Export events
 */
export declare function exportEvents(options: AuditExportOptions): Promise<AuditExportResult>;
/**
 * Generate compliance report
 */
export declare function generateComplianceReport(name: string, startTime: number, endTime: number): Promise<ComplianceReport>;
/**
 * Get statistics
 */
export declare function getStatistics(): Readonly<AuditStatistics>;
/**
 * Reset statistics
 */
export declare function resetStatistics(): void;
/**
 * Add event listener
 */
export declare function addEventListener(listener: AuditLoggerEventListener): void;
/**
 * Remove event listener
 */
export declare function removeEventListener(listener: AuditLoggerEventListener): void;
/**
 * Clear event listeners
 */
export declare function clearEventListeners(): void;
/**
 * Clear all state
 */
export declare function clearAll(): void;
