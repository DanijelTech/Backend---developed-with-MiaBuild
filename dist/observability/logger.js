"use strict";
/**
 * @file Strukturirani service logger modul za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-OBS-001 Strukturirano logiranje za zaledne sisteme
 * @design DSN-ZALEDNI-OBS-001 Backend service logger arhitektura
 * @test TEST-ZALEDNI-OBS-001 Preverjanje logiranja in redakcije
 *
 * Backend Service Logger - prilagojen za zaledne sisteme:
 * - Service-to-service komunikacija
 * - Database operacije
 * - Message queue procesiranje
 * - Background job logiranje
 * - Redakcija občutljivih podatkov (PII, tokeni, gesla)
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom OBS_001 - Structured Logging
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
exports.configureLogger = configureLogger;
exports.setTraceContext = setTraceContext;
exports.setCorrelationId = setCorrelationId;
exports.setJobContext = setJobContext;
exports.logDebug = logDebug;
exports.logInfo = logInfo;
exports.logWarn = logWarn;
exports.logError = logError;
exports.logFatal = logFatal;
exports.log = log;
exports.logDbQuery = logDbQuery;
exports.logQueueMessage = logQueueMessage;
exports.logServiceCall = logServiceCall;
exports.logBackgroundJob = logBackgroundJob;
const clock_1 = require("@mia/core/clock");
const clock = (0, clock_1.getClock)();
// ============================================================================
// KONSTANTE
// ============================================================================
const LOG_LEVEL_PRIORITY = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    FATAL: 4,
};
const DEFAULT_REDACT_FIELDS = [
    'password', 'token', 'apiKey', 'secret', 'authorization',
    'cookie', 'creditCard', 'ssn', 'email', 'phone',
];
const DEFAULT_CONFIG = {
    service: 'NexGen',
    serviceVersion: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    minLevel: 'INFO',
    format: 'json',
    enabled: true,
    redactFields: DEFAULT_REDACT_FIELDS,
};
// ============================================================================
// STANJE
// ============================================================================
let currentConfig = DEFAULT_CONFIG;
let currentTraceId = null;
let currentSpanId = null;
let currentCorrelationId = null;
let currentJobContext = null;
// ============================================================================
// FUNKCIJE
// ============================================================================
function redactSensitiveData(data) {
    const result = {};
    for (const [key, value] of Object.entries(data)) {
        const shouldRedact = currentConfig.redactFields.some(f => key.toLowerCase().includes(f.toLowerCase()));
        if (shouldRedact) {
            result[key] = '[REDACTED]';
        }
        else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            result[key] = redactSensitiveData(value);
        }
        else {
            result[key] = value;
        }
    }
    return result;
}
function configureLogger(config) {
    currentConfig = { ...currentConfig, ...config };
}
function setTraceContext(traceId, spanId) {
    currentTraceId = traceId;
    currentSpanId = spanId;
}
function setCorrelationId(correlationId) {
    currentCorrelationId = correlationId;
}
function setJobContext(jobName, jobId) {
    currentJobContext = jobName && jobId ? { jobName, jobId } : null;
}
function createLogEntry(level, message, context = {}, durationMs = null) {
    return {
        timestamp: new Date(clock.nowMs()).toISOString(),
        level,
        message,
        context: redactSensitiveData(context),
        service: currentConfig.service,
        serviceVersion: currentConfig.serviceVersion,
        environment: currentConfig.environment,
        traceId: currentTraceId,
        spanId: currentSpanId,
        correlationId: currentCorrelationId,
        requestId: null,
        operationType: null,
        jobName: currentJobContext?.jobName ?? null,
        jobId: currentJobContext?.jobId ?? null,
        durationMs,
    };
}
function formatLogEntry(entry) {
    if (currentConfig.format === 'json') {
        return JSON.stringify(entry);
    }
    return `[${entry.timestamp}] [${entry.level}] [${entry.service}] ${entry.message}`;
}
function writeLog(entry) {
    if (!currentConfig.enabled)
        return;
    const entryPriority = LOG_LEVEL_PRIORITY[entry.level];
    const minPriority = LOG_LEVEL_PRIORITY[currentConfig.minLevel];
    if (entryPriority < minPriority)
        return;
    process.stdout.write(formatLogEntry(entry) + '\n');
}
function logDebug(message, context = {}) {
    writeLog(createLogEntry('DEBUG', message, context));
}
function logInfo(message, context = {}) {
    writeLog(createLogEntry('INFO', message, context));
}
function logWarn(message, context = {}) {
    writeLog(createLogEntry('WARN', message, context));
}
function logError(message, context = {}) {
    writeLog(createLogEntry('ERROR', message, context));
}
function logFatal(message, context = {}) {
    writeLog(createLogEntry('FATAL', message, context));
}
function log(level, message, context = {}) {
    writeLog(createLogEntry(level, message, context));
}
function logDbQuery(query, durationMs, context = {}) {
    writeLog(createLogEntry('INFO', `DB Query: ${query}`, { ...context, operationType: 'DB_QUERY' }, durationMs));
}
function logQueueMessage(queue, operation, context = {}) {
    const opType = operation === 'publish' ? 'QUEUE_PUBLISH' : 'QUEUE_CONSUME';
    writeLog(createLogEntry('INFO', `Queue ${operation}: ${queue}`, { ...context, operationType: opType }));
}
function logServiceCall(targetService, method, durationMs, context = {}) {
    writeLog(createLogEntry('INFO', `Service call: ${targetService}.${method}`, { ...context, operationType: 'SERVICE_CALL' }, durationMs));
}
function logBackgroundJob(jobName, status, context = {}) {
    const level = status === 'failed' ? 'ERROR' : 'INFO';
    writeLog(createLogEntry(level, `Background job ${jobName}: ${status}`, { ...context, operationType: 'BACKGROUND_JOB' }));
}
// ============================================================================
// IZVOZ
// ============================================================================
exports.Logger = {
    configure: configureLogger,
    setTraceContext,
    setCorrelationId,
    setJobContext,
    debug: logDebug,
    info: logInfo,
    warn: logWarn,
    error: logError,
    fatal: logFatal,
    log,
    db: logDbQuery,
    queue: logQueueMessage,
    service: logServiceCall,
    job: logBackgroundJob,
};
