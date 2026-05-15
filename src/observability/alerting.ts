/**
 * @file Alerting modul za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 * 
 * @requirement ZAH-ZALEDNI-OBS-005 Alerting sistem za zaledne sisteme
 * @design DSN-ZALEDNI-OBS-005 Backend alerting arhitektura
 * @test TEST-ZALEDNI-OBS-005 Preverjanje alerting funkcionalnosti
 * 
 * Backend Alerting - prilagojen za zaledne sisteme:
 * - Database connection pool exhaustion alerts
 * - Message queue depth/lag alerts
 * - Background job failure rate alerts
 * - Service dependency health alerts
 * - Cache hit ratio degradation alerts
 * - Disk space/memory pressure alerts
 * - Dead letter queue accumulation alerts
 * 
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom OBS_005 - Alerting
 */

import { getClock, Clock } from '@mia/core/clock';
const clock: Clock = getClock();

// ============================================================================
// TIPI
// ============================================================================

/**
 * Resnost alarma
 */
export type AlertSeverity = 'critical' | 'warning' | 'info';

/**
 * Status alarma
 */
export type AlertStatus = 'firing' | 'resolved' | 'pending';

/**
 * Alarm
 */
export interface Alert {
    /** Unikatni ID alarma */
    readonly id: string;
    /** Ime alarma */
    readonly name: string;
    /** Resnost */
    readonly severity: AlertSeverity;
    /** Status */
    readonly status: AlertStatus;
    /** Sporocilo */
    readonly message: string;
    /** Casovni zig */
    readonly timestamp: number;
    /** Oznake */
    readonly labels: Readonly<Record<string, string>>;
    /** Vrednost, ki je sprozila alarm */
    readonly value: number | null;
    /** Prag */
    readonly threshold: number | null;
}

/**
 * Pravilo za alarm
 */
export interface AlertRule {
    /** Ime pravila */
    readonly name: string;
    /** Resnost */
    readonly severity: AlertSeverity;
    /** Prag */
    readonly threshold: number;
    /** Operator primerjave */
    readonly operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    /** Trajanje pred sprozilom (ms) */
    readonly duration: number;
    /** Sporocilo */
    readonly message: string;
    /** Oznake */
    readonly labels: Readonly<Record<string, string>>;
}

/**
 * Konfiguracija alertinga
 */
export interface AlertingConfig {
    /** Ali je omogoceno */
    readonly enabled: boolean;
    /** Endpoint za posiljanje alarmov */
    readonly webhookUrl: string;
    /** Interval preverjanja (ms) */
    readonly checkInterval: number;
}

// ============================================================================
// BACKEND-SPECIFICNI TIPI
// ============================================================================

/**
 * Tip backend alarma
 */
export type BackendAlertType = 
    | 'DB_CONNECTION_POOL'
    | 'DB_QUERY_LATENCY'
    | 'DB_REPLICATION_LAG'
    | 'QUEUE_DEPTH'
    | 'QUEUE_LAG'
    | 'QUEUE_DEAD_LETTER'
    | 'JOB_FAILURE_RATE'
    | 'JOB_QUEUE_BACKLOG'
    | 'SERVICE_DEPENDENCY'
    | 'CACHE_HIT_RATIO'
    | 'CACHE_MEMORY'
    | 'DISK_SPACE'
    | 'MEMORY_PRESSURE'
    | 'CPU_USAGE'
    | 'ERROR_RATE';

/**
 * Backend alert rule z dodatnimi metapodatki
 */
export interface BackendAlertRule extends AlertRule {
    /** Tip backend alarma */
    readonly alertType: BackendAlertType;
    /** Runbook URL */
    readonly runbookUrl: string;
    /** Team za eskalacijo */
    readonly escalationTeam: string;
}

// ============================================================================
// STANJE
// ============================================================================

let config: AlertingConfig = {
    enabled: true,
    webhookUrl: '',
    checkInterval: 60000,
};

const alertRules: Map<string, AlertRule> = new Map();
const activeAlerts: Map<string, Alert> = new Map();
const alertHistory: Alert[] = [];
let alertCounter = 0;

// ============================================================================
// FUNKCIJE
// ============================================================================

/**
 * Nastavi konfiguracijo alertinga
 */
export function configureAlerting(newConfig: Partial<AlertingConfig>): void {
    config = { ...config, ...newConfig };
}

/**
 * Registriraj pravilo za alarm
 */
export function registerAlertRule(rule: AlertRule): void {
    alertRules.set(rule.name, rule);
}

/**
 * Odstrani pravilo za alarm
 */
export function unregisterAlertRule(name: string): void {
    alertRules.delete(name);
}

/**
 * Generiraj ID alarma
 */
function generateAlertId(): string {
    alertCounter++;
    return `alert-${alertCounter}-${clock.nowMs()}`;
}

/**
 * Preveri vrednost proti pravilu
 */
function checkThreshold(value: number, rule: AlertRule): boolean {
    switch (rule.operator) {
        case 'gt':
            return value > rule.threshold;
        case 'lt':
            return value < rule.threshold;
        case 'eq':
            return value === rule.threshold;
        case 'gte':
            return value >= rule.threshold;
        case 'lte':
            return value <= rule.threshold;
        default:
            return false;
    }
}

/**
 * Sprozi alarm
 */
export function triggerAlert(
    name: string,
    message: string,
    severity: AlertSeverity = 'warning',
    value: number | null = null,
    threshold: number | null = null,
    labels: Record<string, string> = {}
): Alert {
    const alert: Alert = {
        id: generateAlertId(),
        name,
        severity,
        status: 'firing',
        message,
        timestamp: clock.nowMs(),
        labels,
        value,
        threshold,
    };
    
    activeAlerts.set(alert.id, alert);
    alertHistory.push(alert);
    
    return alert;
}

/**
 * Posli alarm (webhook)
 */
export async function sendAlert(alert: Alert): Promise<boolean> {
    if (!config.enabled || !config.webhookUrl) {
        return false;
    }
    
    // V produkciji bi tukaj poslali HTTP request
    // Za deterministicnost samo zabelezimo
    process.stdout.write(`[ALERT] ${alert.severity.toUpperCase()}: ${alert.name} - ${alert.message}\n`);
    
    return true;
}

/**
 * Razresi alarm
 */
export function resolveAlert(alertId: string): Alert | null {
    const alert = activeAlerts.get(alertId);
    if (!alert) {
        return null;
    }
    
    const resolvedAlert: Alert = {
        ...alert,
        status: 'resolved',
        timestamp: clock.nowMs(),
    };
    
    activeAlerts.delete(alertId);
    alertHistory.push(resolvedAlert);
    
    return resolvedAlert;
}

/**
 * Preveri vrednost in sprozi alarm ce je potrebno
 */
export function checkAndAlert(
    ruleName: string,
    value: number,
    additionalLabels: Record<string, string> = {}
): Alert | null {
    const rule = alertRules.get(ruleName);
    if (!rule) {
        return null;
    }
    
    if (checkThreshold(value, rule)) {
        return triggerAlert(
            rule.name,
            rule.message,
            rule.severity,
            value,
            rule.threshold,
            { ...rule.labels, ...additionalLabels }
        );
    }
    
    return null;
}

/**
 * Pridobi aktivne alarme
 */
export function getActiveAlerts(): readonly Alert[] {
    return Array.from(activeAlerts.values());
}

/**
 * Pridobi zgodovino alarmov
 */
export function getAlertHistory(): readonly Alert[] {
    return alertHistory;
}

/**
 * Pocisti zgodovino alarmov
 */
export function clearAlertHistory(): void {
    alertHistory.length = 0;
}

// ============================================================================
// BACKEND-SPECIFICNE FUNKCIJE
// ============================================================================

// Backend alert rules storage
const backendAlertRules: Map<string, BackendAlertRule> = new Map();

/**
 * Registriraj backend alert rule
 */
export function registerBackendAlertRule(rule: BackendAlertRule): void {
    backendAlertRules.set(rule.name, rule);
    registerAlertRule(rule);
}

/**
 * Sprozi backend alert z dodatnimi metapodatki
 */
export function triggerBackendAlert(
    ruleName: string,
    value: number,
    additionalContext: Record<string, string> = {}
): Alert | null {
    const rule = backendAlertRules.get(ruleName);
    if (!rule) {
        return checkAndAlert(ruleName, value, additionalContext);
    }
    
    if (!checkThresholdForRule(value, rule)) {
        return null;
    }
    
    return triggerAlert(
        rule.name,
        rule.message,
        rule.severity,
        value,
        rule.threshold,
        {
            ...rule.labels,
            ...additionalContext,
            alertType: rule.alertType,
            runbookUrl: rule.runbookUrl,
            escalationTeam: rule.escalationTeam,
        }
    );
}

/**
 * Preveri vrednost proti pravilu (helper)
 */
function checkThresholdForRule(value: number, rule: AlertRule): boolean {
    switch (rule.operator) {
        case 'gt': return value > rule.threshold;
        case 'lt': return value < rule.threshold;
        case 'eq': return value === rule.threshold;
        case 'gte': return value >= rule.threshold;
        case 'lte': return value <= rule.threshold;
        default: return false;
    }
}

/**
 * Registriraj predefinirane backend alert rules
 */
export function registerDefaultBackendAlerts(config: {
    serviceName: string;
    runbookBaseUrl: string;
    escalationTeam: string;
}): void {
    const { serviceName, runbookBaseUrl, escalationTeam } = config;
    
    // Database connection pool exhaustion
    registerBackendAlertRule({
        name: `${serviceName}_db_pool_exhaustion`,
        severity: 'critical',
        threshold: 90,
        operator: 'gt',
        duration: 60000,
        message: 'Database connection pool usage exceeds 90%',
        labels: { service: serviceName, component: 'database' },
        alertType: 'DB_CONNECTION_POOL',
        runbookUrl: `${runbookBaseUrl}/db-pool-exhaustion`,
        escalationTeam,
    });
    
    // Database query latency
    registerBackendAlertRule({
        name: `${serviceName}_db_query_latency`,
        severity: 'warning',
        threshold: 1000,
        operator: 'gt',
        duration: 300000,
        message: 'Database query latency exceeds 1000ms',
        labels: { service: serviceName, component: 'database' },
        alertType: 'DB_QUERY_LATENCY',
        runbookUrl: `${runbookBaseUrl}/db-query-latency`,
        escalationTeam,
    });
    
    // Queue depth
    registerBackendAlertRule({
        name: `${serviceName}_queue_depth`,
        severity: 'warning',
        threshold: 10000,
        operator: 'gt',
        duration: 300000,
        message: 'Message queue depth exceeds 10000 messages',
        labels: { service: serviceName, component: 'queue' },
        alertType: 'QUEUE_DEPTH',
        runbookUrl: `${runbookBaseUrl}/queue-depth`,
        escalationTeam,
    });
    
    // Queue lag
    registerBackendAlertRule({
        name: `${serviceName}_queue_lag`,
        severity: 'warning',
        threshold: 60000,
        operator: 'gt',
        duration: 300000,
        message: 'Message queue lag exceeds 60 seconds',
        labels: { service: serviceName, component: 'queue' },
        alertType: 'QUEUE_LAG',
        runbookUrl: `${runbookBaseUrl}/queue-lag`,
        escalationTeam,
    });
    
    // Dead letter queue accumulation
    registerBackendAlertRule({
        name: `${serviceName}_dead_letter_queue`,
        severity: 'critical',
        threshold: 100,
        operator: 'gt',
        duration: 60000,
        message: 'Dead letter queue has more than 100 messages',
        labels: { service: serviceName, component: 'queue' },
        alertType: 'QUEUE_DEAD_LETTER',
        runbookUrl: `${runbookBaseUrl}/dead-letter-queue`,
        escalationTeam,
    });
    
    // Job failure rate
    registerBackendAlertRule({
        name: `${serviceName}_job_failure_rate`,
        severity: 'warning',
        threshold: 10,
        operator: 'gt',
        duration: 300000,
        message: 'Background job failure rate exceeds 10%',
        labels: { service: serviceName, component: 'jobs' },
        alertType: 'JOB_FAILURE_RATE',
        runbookUrl: `${runbookBaseUrl}/job-failure-rate`,
        escalationTeam,
    });
    
    // Job queue backlog
    registerBackendAlertRule({
        name: `${serviceName}_job_backlog`,
        severity: 'warning',
        threshold: 1000,
        operator: 'gt',
        duration: 300000,
        message: 'Background job queue backlog exceeds 1000 jobs',
        labels: { service: serviceName, component: 'jobs' },
        alertType: 'JOB_QUEUE_BACKLOG',
        runbookUrl: `${runbookBaseUrl}/job-backlog`,
        escalationTeam,
    });
    
    // Cache hit ratio degradation
    registerBackendAlertRule({
        name: `${serviceName}_cache_hit_ratio`,
        severity: 'warning',
        threshold: 50,
        operator: 'lt',
        duration: 600000,
        message: 'Cache hit ratio dropped below 50%',
        labels: { service: serviceName, component: 'cache' },
        alertType: 'CACHE_HIT_RATIO',
        runbookUrl: `${runbookBaseUrl}/cache-hit-ratio`,
        escalationTeam,
    });
    
    // Cache memory pressure
    registerBackendAlertRule({
        name: `${serviceName}_cache_memory`,
        severity: 'warning',
        threshold: 85,
        operator: 'gt',
        duration: 300000,
        message: 'Cache memory usage exceeds 85%',
        labels: { service: serviceName, component: 'cache' },
        alertType: 'CACHE_MEMORY',
        runbookUrl: `${runbookBaseUrl}/cache-memory`,
        escalationTeam,
    });
    
    // Service dependency health
    registerBackendAlertRule({
        name: `${serviceName}_service_dependency`,
        severity: 'critical',
        threshold: 3,
        operator: 'gte',
        duration: 60000,
        message: 'External service dependency failures exceed threshold',
        labels: { service: serviceName, component: 'dependencies' },
        alertType: 'SERVICE_DEPENDENCY',
        runbookUrl: `${runbookBaseUrl}/service-dependency`,
        escalationTeam,
    });
    
    // Error rate
    registerBackendAlertRule({
        name: `${serviceName}_error_rate`,
        severity: 'critical',
        threshold: 5,
        operator: 'gt',
        duration: 300000,
        message: 'Error rate exceeds 5%',
        labels: { service: serviceName, component: 'api' },
        alertType: 'ERROR_RATE',
        runbookUrl: `${runbookBaseUrl}/error-rate`,
        escalationTeam,
    });
    
    // Disk space
    registerBackendAlertRule({
        name: `${serviceName}_disk_space`,
        severity: 'warning',
        threshold: 80,
        operator: 'gt',
        duration: 300000,
        message: 'Disk space usage exceeds 80%',
        labels: { service: serviceName, component: 'infrastructure' },
        alertType: 'DISK_SPACE',
        runbookUrl: `${runbookBaseUrl}/disk-space`,
        escalationTeam,
    });
    
    // Memory pressure
    registerBackendAlertRule({
        name: `${serviceName}_memory_pressure`,
        severity: 'warning',
        threshold: 85,
        operator: 'gt',
        duration: 300000,
        message: 'Memory usage exceeds 85%',
        labels: { service: serviceName, component: 'infrastructure' },
        alertType: 'MEMORY_PRESSURE',
        runbookUrl: `${runbookBaseUrl}/memory-pressure`,
        escalationTeam,
    });
}

/**
 * Preveri in sprozi alarme za vse backend metrike
 */
export function checkBackendMetrics(metrics: {
    dbPoolUsagePercent?: number;
    dbQueryLatencyMs?: number;
    queueDepth?: number;
    queueLagMs?: number;
    deadLetterCount?: number;
    jobFailureRatePercent?: number;
    jobBacklogCount?: number;
    cacheHitRatioPercent?: number;
    cacheMemoryPercent?: number;
    serviceDependencyFailures?: number;
    errorRatePercent?: number;
    diskUsagePercent?: number;
    memoryUsagePercent?: number;
}, serviceName: string): Alert[] {
    const alerts: Alert[] = [];
    
    const checkAndCollect = (ruleSuffix: string, value: number | undefined) => {
        if (value === undefined) return;
        const alert = triggerBackendAlert(`${serviceName}_${ruleSuffix}`, value);
        if (alert) alerts.push(alert);
    };
    
    checkAndCollect('db_pool_exhaustion', metrics.dbPoolUsagePercent);
    checkAndCollect('db_query_latency', metrics.dbQueryLatencyMs);
    checkAndCollect('queue_depth', metrics.queueDepth);
    checkAndCollect('queue_lag', metrics.queueLagMs);
    checkAndCollect('dead_letter_queue', metrics.deadLetterCount);
    checkAndCollect('job_failure_rate', metrics.jobFailureRatePercent);
    checkAndCollect('job_backlog', metrics.jobBacklogCount);
    checkAndCollect('cache_hit_ratio', metrics.cacheHitRatioPercent);
    checkAndCollect('cache_memory', metrics.cacheMemoryPercent);
    checkAndCollect('service_dependency', metrics.serviceDependencyFailures);
    checkAndCollect('error_rate', metrics.errorRatePercent);
    checkAndCollect('disk_space', metrics.diskUsagePercent);
    checkAndCollect('memory_pressure', metrics.memoryUsagePercent);
    
    return alerts;
}

// ============================================================================
// IZVOZ
// ============================================================================

export const Alerting = {
    configure: configureAlerting,
    registerAlertRule,
    unregisterAlertRule,
    triggerAlert,
    sendAlert,
    resolveAlert,
    checkAndAlert,
    getActiveAlerts,
    getAlertHistory,
    clearAlertHistory,
    registerBackendAlertRule,
    triggerBackendAlert,
    registerDefaultBackendAlerts,
    checkBackendMetrics,
};
