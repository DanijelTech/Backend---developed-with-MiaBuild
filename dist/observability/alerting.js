"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Alerting = void 0;
exports.configureAlerting = configureAlerting;
exports.registerAlertRule = registerAlertRule;
exports.unregisterAlertRule = unregisterAlertRule;
exports.triggerAlert = triggerAlert;
exports.sendAlert = sendAlert;
exports.resolveAlert = resolveAlert;
exports.checkAndAlert = checkAndAlert;
exports.getActiveAlerts = getActiveAlerts;
exports.getAlertHistory = getAlertHistory;
exports.clearAlertHistory = clearAlertHistory;
exports.registerBackendAlertRule = registerBackendAlertRule;
exports.triggerBackendAlert = triggerBackendAlert;
exports.registerDefaultBackendAlerts = registerDefaultBackendAlerts;
exports.checkBackendMetrics = checkBackendMetrics;
const clock_1 = require("@mia/core/clock");
const clock = (0, clock_1.getClock)();
// ============================================================================
// STANJE
// ============================================================================
let config = {
    enabled: true,
    webhookUrl: '',
    checkInterval: 60000,
};
const alertRules = new Map();
const activeAlerts = new Map();
const alertHistory = [];
let alertCounter = 0;
// ============================================================================
// FUNKCIJE
// ============================================================================
/**
 * Nastavi konfiguracijo alertinga
 */
function configureAlerting(newConfig) {
    config = { ...config, ...newConfig };
}
/**
 * Registriraj pravilo za alarm
 */
function registerAlertRule(rule) {
    alertRules.set(rule.name, rule);
}
/**
 * Odstrani pravilo za alarm
 */
function unregisterAlertRule(name) {
    alertRules.delete(name);
}
/**
 * Generiraj ID alarma
 */
function generateAlertId() {
    alertCounter++;
    return `alert-${alertCounter}-${clock.nowMs()}`;
}
/**
 * Preveri vrednost proti pravilu
 */
function checkThreshold(value, rule) {
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
function triggerAlert(name, message, severity = 'warning', value = null, threshold = null, labels = {}) {
    const alert = {
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
async function sendAlert(alert) {
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
function resolveAlert(alertId) {
    const alert = activeAlerts.get(alertId);
    if (!alert) {
        return null;
    }
    const resolvedAlert = {
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
function checkAndAlert(ruleName, value, additionalLabels = {}) {
    const rule = alertRules.get(ruleName);
    if (!rule) {
        return null;
    }
    if (checkThreshold(value, rule)) {
        return triggerAlert(rule.name, rule.message, rule.severity, value, rule.threshold, { ...rule.labels, ...additionalLabels });
    }
    return null;
}
/**
 * Pridobi aktivne alarme
 */
function getActiveAlerts() {
    return Array.from(activeAlerts.values());
}
/**
 * Pridobi zgodovino alarmov
 */
function getAlertHistory() {
    return alertHistory;
}
/**
 * Pocisti zgodovino alarmov
 */
function clearAlertHistory() {
    alertHistory.length = 0;
}
// ============================================================================
// BACKEND-SPECIFICNE FUNKCIJE
// ============================================================================
// Backend alert rules storage
const backendAlertRules = new Map();
/**
 * Registriraj backend alert rule
 */
function registerBackendAlertRule(rule) {
    backendAlertRules.set(rule.name, rule);
    registerAlertRule(rule);
}
/**
 * Sprozi backend alert z dodatnimi metapodatki
 */
function triggerBackendAlert(ruleName, value, additionalContext = {}) {
    const rule = backendAlertRules.get(ruleName);
    if (!rule) {
        return checkAndAlert(ruleName, value, additionalContext);
    }
    if (!checkThresholdForRule(value, rule)) {
        return null;
    }
    return triggerAlert(rule.name, rule.message, rule.severity, value, rule.threshold, {
        ...rule.labels,
        ...additionalContext,
        alertType: rule.alertType,
        runbookUrl: rule.runbookUrl,
        escalationTeam: rule.escalationTeam,
    });
}
/**
 * Preveri vrednost proti pravilu (helper)
 */
function checkThresholdForRule(value, rule) {
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
function registerDefaultBackendAlerts(config) {
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
function checkBackendMetrics(metrics, serviceName) {
    const alerts = [];
    const checkAndCollect = (ruleSuffix, value) => {
        if (value === undefined)
            return;
        const alert = triggerBackendAlert(`${serviceName}_${ruleSuffix}`, value);
        if (alert)
            alerts.push(alert);
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
exports.Alerting = {
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
