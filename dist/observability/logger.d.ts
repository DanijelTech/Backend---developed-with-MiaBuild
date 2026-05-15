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
/**
 * Nivo logiranja
 */
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
/**
 * Tip operacije za backend sisteme
 */
export type OperationType = 'DB_QUERY' | 'DB_TRANSACTION' | 'QUEUE_PUBLISH' | 'QUEUE_CONSUME' | 'SERVICE_CALL' | 'BACKGROUND_JOB' | 'CACHE_OPERATION' | 'API_REQUEST' | 'API_RESPONSE';
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
export declare function configureLogger(config: Partial<LoggerConfig>): void;
export declare function setTraceContext(traceId: string | null, spanId: string | null): void;
export declare function setCorrelationId(correlationId: string | null): void;
export declare function setJobContext(jobName: string | null, jobId: string | null): void;
export declare function logDebug(message: string, context?: Record<string, unknown>): void;
export declare function logInfo(message: string, context?: Record<string, unknown>): void;
export declare function logWarn(message: string, context?: Record<string, unknown>): void;
export declare function logError(message: string, context?: Record<string, unknown>): void;
export declare function logFatal(message: string, context?: Record<string, unknown>): void;
export declare function log(level: LogLevel, message: string, context?: Record<string, unknown>): void;
export declare function logDbQuery(query: string, durationMs: number, context?: Record<string, unknown>): void;
export declare function logQueueMessage(queue: string, operation: 'publish' | 'consume', context?: Record<string, unknown>): void;
export declare function logServiceCall(targetService: string, method: string, durationMs: number, context?: Record<string, unknown>): void;
export declare function logBackgroundJob(jobName: string, status: 'started' | 'completed' | 'failed', context?: Record<string, unknown>): void;
export declare const Logger: {
    configure: typeof configureLogger;
    setTraceContext: typeof setTraceContext;
    setCorrelationId: typeof setCorrelationId;
    setJobContext: typeof setJobContext;
    debug: typeof logDebug;
    info: typeof logInfo;
    warn: typeof logWarn;
    error: typeof logError;
    fatal: typeof logFatal;
    log: typeof log;
    db: typeof logDbQuery;
    queue: typeof logQueueMessage;
    service: typeof logServiceCall;
    job: typeof logBackgroundJob;
};
