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
/**
 * Tip backend alarma
 */
export type BackendAlertType = 'DB_CONNECTION_POOL' | 'DB_QUERY_LATENCY' | 'DB_REPLICATION_LAG' | 'QUEUE_DEPTH' | 'QUEUE_LAG' | 'QUEUE_DEAD_LETTER' | 'JOB_FAILURE_RATE' | 'JOB_QUEUE_BACKLOG' | 'SERVICE_DEPENDENCY' | 'CACHE_HIT_RATIO' | 'CACHE_MEMORY' | 'DISK_SPACE' | 'MEMORY_PRESSURE' | 'CPU_USAGE' | 'ERROR_RATE';
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
/**
 * Nastavi konfiguracijo alertinga
 */
export declare function configureAlerting(newConfig: Partial<AlertingConfig>): void;
/**
 * Registriraj pravilo za alarm
 */
export declare function registerAlertRule(rule: AlertRule): void;
/**
 * Odstrani pravilo za alarm
 */
export declare function unregisterAlertRule(name: string): void;
/**
 * Sprozi alarm
 */
export declare function triggerAlert(name: string, message: string, severity?: AlertSeverity, value?: number | null, threshold?: number | null, labels?: Record<string, string>): Alert;
/**
 * Posli alarm (webhook)
 */
export declare function sendAlert(alert: Alert): Promise<boolean>;
/**
 * Razresi alarm
 */
export declare function resolveAlert(alertId: string): Alert | null;
/**
 * Preveri vrednost in sprozi alarm ce je potrebno
 */
export declare function checkAndAlert(ruleName: string, value: number, additionalLabels?: Record<string, string>): Alert | null;
/**
 * Pridobi aktivne alarme
 */
export declare function getActiveAlerts(): readonly Alert[];
/**
 * Pridobi zgodovino alarmov
 */
export declare function getAlertHistory(): readonly Alert[];
/**
 * Pocisti zgodovino alarmov
 */
export declare function clearAlertHistory(): void;
/**
 * Registriraj backend alert rule
 */
export declare function registerBackendAlertRule(rule: BackendAlertRule): void;
/**
 * Sprozi backend alert z dodatnimi metapodatki
 */
export declare function triggerBackendAlert(ruleName: string, value: number, additionalContext?: Record<string, string>): Alert | null;
/**
 * Registriraj predefinirane backend alert rules
 */
export declare function registerDefaultBackendAlerts(config: {
    serviceName: string;
    runbookBaseUrl: string;
    escalationTeam: string;
}): void;
/**
 * Preveri in sprozi alarme za vse backend metrike
 */
export declare function checkBackendMetrics(metrics: {
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
}, serviceName: string): Alert[];
export declare const Alerting: {
    configure: typeof configureAlerting;
    registerAlertRule: typeof registerAlertRule;
    unregisterAlertRule: typeof unregisterAlertRule;
    triggerAlert: typeof triggerAlert;
    sendAlert: typeof sendAlert;
    resolveAlert: typeof resolveAlert;
    checkAndAlert: typeof checkAndAlert;
    getActiveAlerts: typeof getActiveAlerts;
    getAlertHistory: typeof getAlertHistory;
    clearAlertHistory: typeof clearAlertHistory;
    registerBackendAlertRule: typeof registerBackendAlertRule;
    triggerBackendAlert: typeof triggerBackendAlert;
    registerDefaultBackendAlerts: typeof registerDefaultBackendAlerts;
    checkBackendMetrics: typeof checkBackendMetrics;
};
