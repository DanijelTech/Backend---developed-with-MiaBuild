/**
 * @file Health check modul za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-OBS-004 Health checks za zaledne sisteme
 * @design DSN-ZALEDNI-OBS-004 Backend health check arhitektura
 * @test TEST-ZALEDNI-OBS-004 Preverjanje health check funkcionalnosti
 *
 * Backend Health Checks - prilagojen za zaledne sisteme:
 * - Database connectivity check (connection pool status)
 * - Message queue connectivity (RabbitMQ/Kafka broker status)
 * - Cache connectivity (Redis/Memcached)
 * - External service dependencies
 * - Kubernetes liveness/readiness probes
 * - Graceful degradation support
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom OBS_004 - Health Checks
 */
/**
 * Status zdravja
 */
export type HealthStatusValue = 'healthy' | 'unhealthy' | 'degraded';
/**
 * Tip preverjanja zdravja
 */
export type HealthCheckType = 'liveness' | 'readiness' | 'startup';
/**
 * Rezultat preverjanja zdravja
 */
export interface HealthStatus {
    /** Status */
    readonly status: HealthStatusValue;
    /** Tip preverjanja */
    readonly type: HealthCheckType;
    /** Casovni zig */
    readonly timestamp: number;
    /** Podrobnosti */
    readonly details: Readonly<Record<string, ComponentHealth>>;
    /** Verzija */
    readonly version: string;
    /** Cas odziva v ms */
    readonly responseTime: number;
}
/**
 * Zdravje komponente
 */
export interface ComponentHealth {
    /** Ime komponente */
    readonly name: string;
    /** Status */
    readonly status: HealthStatusValue;
    /** Sporocilo */
    readonly message: string;
    /** Cas zadnjega preverjanja */
    readonly lastCheck: number;
}
/**
 * Funkcija za preverjanje zdravja komponente
 */
export type HealthCheckFunction = () => Promise<ComponentHealth>;
/**
 * Status database connection pool
 */
export interface DatabasePoolStatus {
    /** Skupno stevilo povezav v poolu */
    readonly totalConnections: number;
    /** Stevilo aktivnih povezav */
    readonly activeConnections: number;
    /** Stevilo prostih povezav */
    readonly idleConnections: number;
    /** Stevilo cakajocih zahtev */
    readonly waitingRequests: number;
    /** Maksimalno stevilo povezav */
    readonly maxConnections: number;
}
/**
 * Status message queue
 */
export interface QueueStatus {
    /** Ime queue */
    readonly queueName: string;
    /** Ali je povezava aktivna */
    readonly connected: boolean;
    /** Stevilo sporocil v queue */
    readonly messageCount: number;
    /** Stevilo consumerjev */
    readonly consumerCount: number;
    /** Lag (zakasnitev) v ms */
    readonly lagMs: number;
}
/**
 * Status cache
 */
export interface CacheStatus {
    /** Ali je povezava aktivna */
    readonly connected: boolean;
    /** Uporaba pomnilnika v bytih */
    readonly memoryUsageBytes: number;
    /** Maksimalni pomnilnik v bytih */
    readonly maxMemoryBytes: number;
    /** Hit ratio (0-1) */
    readonly hitRatio: number;
    /** Stevilo kljucev */
    readonly keyCount: number;
}
/**
 * Status eksterne storitve
 */
export interface ExternalServiceStatus {
    /** Ime storitve */
    readonly serviceName: string;
    /** Ali je dosegljiva */
    readonly reachable: boolean;
    /** Latenca v ms */
    readonly latencyMs: number;
    /** Zadnji uspesen klic */
    readonly lastSuccessfulCall: number | null;
}
/**
 * Registriraj preverjanje zdravja
 */
export declare function registerHealthCheck(name: string, check: HealthCheckFunction): void;
/**
 * Odstrani preverjanje zdravja
 */
export declare function unregisterHealthCheck(name: string): void;
/**
 * Izvedi preverjanje zdravja
 */
export declare function checkHealth(type?: HealthCheckType): Promise<HealthStatus>;
/**
 * Preveri liveness (ali je aplikacija ziva)
 */
export declare function checkLiveness(): Promise<HealthStatus>;
/**
 * Preveri readiness (ali je aplikacija pripravljena za promet)
 */
export declare function checkReadiness(): Promise<HealthStatus>;
/**
 * Preveri startup (ali se je aplikacija uspesno zagnala)
 */
export declare function checkStartup(): Promise<HealthStatus>;
/**
 * Pridobi status zdravja (sinhrona verzija)
 */
export declare function getHealthStatus(): HealthStatus;
/**
 * Ustvari preprosto preverjanje zdravja
 */
export declare function createSimpleHealthCheck(name: string, checkFn: () => boolean | Promise<boolean>, message?: string): HealthCheckFunction;
/**
 * Ustvari health check za database connection pool
 */
export declare function createDatabaseHealthCheck(name: string, getPoolStatus: () => Promise<DatabasePoolStatus>, thresholds?: {
    minIdleConnections?: number;
    maxWaitingRequests?: number;
    maxActiveRatio?: number;
}): HealthCheckFunction;
/**
 * Ustvari health check za message queue
 */
export declare function createQueueHealthCheck(name: string, getQueueStatus: () => Promise<QueueStatus>, thresholds?: {
    maxMessageCount?: number;
    maxLagMs?: number;
    minConsumers?: number;
}): HealthCheckFunction;
/**
 * Ustvari health check za cache (Redis/Memcached)
 */
export declare function createCacheHealthCheck(name: string, getCacheStatus: () => Promise<CacheStatus>, thresholds?: {
    maxMemoryUsageRatio?: number;
    minHitRatio?: number;
}): HealthCheckFunction;
/**
 * Ustvari health check za eksterno storitev
 */
export declare function createExternalServiceHealthCheck(name: string, checkService: () => Promise<ExternalServiceStatus>, thresholds?: {
    maxLatencyMs?: number;
    maxStaleMs?: number;
}): HealthCheckFunction;
/**
 * Registriraj vse backend dependency health checks
 */
export declare function registerBackendHealthChecks(dependencies: {
    database?: {
        name: string;
        getStatus: () => Promise<DatabasePoolStatus>;
    };
    queues?: Array<{
        name: string;
        getStatus: () => Promise<QueueStatus>;
    }>;
    cache?: {
        name: string;
        getStatus: () => Promise<CacheStatus>;
    };
    externalServices?: Array<{
        name: string;
        checkService: () => Promise<ExternalServiceStatus>;
    }>;
}): void;
export declare const Health: {
    registerHealthCheck: typeof registerHealthCheck;
    unregisterHealthCheck: typeof unregisterHealthCheck;
    checkHealth: typeof checkHealth;
    checkLiveness: typeof checkLiveness;
    checkReadiness: typeof checkReadiness;
    checkStartup: typeof checkStartup;
    getHealthStatus: typeof getHealthStatus;
    createSimpleHealthCheck: typeof createSimpleHealthCheck;
    createDatabaseHealthCheck: typeof createDatabaseHealthCheck;
    createQueueHealthCheck: typeof createQueueHealthCheck;
    createCacheHealthCheck: typeof createCacheHealthCheck;
    createExternalServiceHealthCheck: typeof createExternalServiceHealthCheck;
    registerBackendHealthChecks: typeof registerBackendHealthChecks;
};
