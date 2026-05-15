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

import { getClock, Clock } from '@mia/core/clock';
const clock: Clock = getClock();

// ============================================================================
// TIPI
// ============================================================================

/**
 * Nivo logiranja
 */
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

/**
 * Tip operacije za backend sisteme
 */
export type OperationType = 
    | 'DB_QUERY'
    | 'DB_TRANSACTION'
    | 'QUEUE_PUBLISH'
    | 'QUEUE_CONSUME'
    | 'SERVICE_CALL'
    | 'BACKGROUND_JOB'
    | 'CACHE_OPERATION'
    | 'API_REQUEST'
    | 'API_RESPONSE';

/**
 * Strukturiran log vnos za backend sisteme
 */
export interface LogEntry {
    /** Casovni zig */
    readonly timestamp: string;
    /** Nivo logiranja */
    readonly level: LogLevel;
    /** Sporocilo */
    readonly message: string;
    /** Kontekst */
    readonly context: Readonly<Record<string, unknown>>;
    /** Ime storitve */
    readonly service: string;
    /** Verzija storitve */
    readonly serviceVersion: string;
    /** Okolje (production, staging, development) */
    readonly environment: string;
    /** Trace ID za distribuirano sledenje */
    readonly traceId: string | null;
    /** Span ID za korelacijo */
    readonly spanId: string | null;
    /** Correlation ID za service-to-service komunikacijo */
    readonly correlationId: string | null;
    /** Request ID */
    readonly requestId: string | null;
    /** Tip operacije */
    readonly operationType: OperationType | null;
    /** Ime background job-a */
    readonly jobName: string | null;
    /** ID background job-a */
    readonly jobId: string | null;
    /** Trajanje operacije v ms */
    readonly durationMs: number | null;
}

/**
 * Konfiguracija loggerja za backend sisteme
 */
export interface LoggerConfig {
    /** Ime storitve */
    readonly service: string;
    /** Verzija storitve */
    readonly serviceVersion: string;
    /** Okolje */
    readonly environment: string;
    /** Minimalni nivo logiranja */
    readonly minLevel: LogLevel;
    /** Format izhoda */
    readonly format: 'json' | 'text';
    /** Ali je omogoceno */
    readonly enabled: boolean;
    /** Seznam polj za redakcijo */
    readonly redactFields: readonly string[];
}

// ============================================================================
// KONSTANTE
// ============================================================================

const LOG_LEVEL_PRIORITY: Readonly<Record<LogLevel, number>> = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    FATAL: 4,
};

const DEFAULT_REDACT_FIELDS: readonly string[] = [
    'password', 'token', 'apiKey', 'secret', 'authorization',
    'cookie', 'creditCard', 'ssn', 'email', 'phone',
];

const DEFAULT_CONFIG: LoggerConfig = {
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

let currentConfig: LoggerConfig = DEFAULT_CONFIG;
let currentTraceId: string | null = null;
let currentSpanId: string | null = null;
let currentCorrelationId: string | null = null;
let currentJobContext: { jobName: string; jobId: string } | null = null;

// ============================================================================
// FUNKCIJE
// ============================================================================

function redactSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
        const shouldRedact = currentConfig.redactFields.some(f => 
            key.toLowerCase().includes(f.toLowerCase())
        );
        if (shouldRedact) {
            result[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            result[key] = redactSensitiveData(value as Record<string, unknown>);
        } else {
            result[key] = value;
        }
    }
    return result;
}

export function configureLogger(config: Partial<LoggerConfig>): void {
    currentConfig = { ...currentConfig, ...config };
}

export function setTraceContext(traceId: string | null, spanId: string | null): void {
    currentTraceId = traceId;
    currentSpanId = spanId;
}

export function setCorrelationId(correlationId: string | null): void {
    currentCorrelationId = correlationId;
}

export function setJobContext(jobName: string | null, jobId: string | null): void {
    currentJobContext = jobName && jobId ? { jobName, jobId } : null;
}

function createLogEntry(
    level: LogLevel,
    message: string,
    context: Record<string, unknown> = {},
    durationMs: number | null = null
): LogEntry {
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

function formatLogEntry(entry: LogEntry): string {
    if (currentConfig.format === 'json') {
        return JSON.stringify(entry);
    }
    return `[${entry.timestamp}] [${entry.level}] [${entry.service}] ${entry.message}`;
}

function writeLog(entry: LogEntry): void {
    if (!currentConfig.enabled) return;
    const entryPriority = LOG_LEVEL_PRIORITY[entry.level];
    const minPriority = LOG_LEVEL_PRIORITY[currentConfig.minLevel];
    if (entryPriority < minPriority) return;
    process.stdout.write(formatLogEntry(entry) + '\n');
}

export function logDebug(message: string, context: Record<string, unknown> = {}): void {
    writeLog(createLogEntry('DEBUG', message, context));
}

export function logInfo(message: string, context: Record<string, unknown> = {}): void {
    writeLog(createLogEntry('INFO', message, context));
}

export function logWarn(message: string, context: Record<string, unknown> = {}): void {
    writeLog(createLogEntry('WARN', message, context));
}

export function logError(message: string, context: Record<string, unknown> = {}): void {
    writeLog(createLogEntry('ERROR', message, context));
}

export function logFatal(message: string, context: Record<string, unknown> = {}): void {
    writeLog(createLogEntry('FATAL', message, context));
}

export function log(level: LogLevel, message: string, context: Record<string, unknown> = {}): void {
    writeLog(createLogEntry(level, message, context));
}

export function logDbQuery(query: string, durationMs: number, context: Record<string, unknown> = {}): void {
    writeLog(createLogEntry('INFO', `DB Query: ${query}`, { ...context, operationType: 'DB_QUERY' }, durationMs));
}

export function logQueueMessage(queue: string, operation: 'publish' | 'consume', context: Record<string, unknown> = {}): void {
    const opType = operation === 'publish' ? 'QUEUE_PUBLISH' : 'QUEUE_CONSUME';
    writeLog(createLogEntry('INFO', `Queue ${operation}: ${queue}`, { ...context, operationType: opType }));
}

export function logServiceCall(targetService: string, method: string, durationMs: number, context: Record<string, unknown> = {}): void {
    writeLog(createLogEntry('INFO', `Service call: ${targetService}.${method}`, { ...context, operationType: 'SERVICE_CALL' }, durationMs));
}

export function logBackgroundJob(jobName: string, status: 'started' | 'completed' | 'failed', context: Record<string, unknown> = {}): void {
    const level: LogLevel = status === 'failed' ? 'ERROR' : 'INFO';
    writeLog(createLogEntry(level, `Background job ${jobName}: ${status}`, { ...context, operationType: 'BACKGROUND_JOB' }));
}

// ============================================================================
// IZVOZ
// ============================================================================

export const Logger = {
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
