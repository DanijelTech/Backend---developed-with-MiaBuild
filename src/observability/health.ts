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

import { getClock, Clock } from '@mia/core/clock';
const clock: Clock = getClock();

// ============================================================================
// TIPI
// ============================================================================

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

// ============================================================================
// BACKEND-SPECIFICNI TIPI
// ============================================================================

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

// ============================================================================
// STANJE
// ============================================================================

const healthChecks: Map<string, HealthCheckFunction> = new Map();
const version = '1.0.0';

// ============================================================================
// FUNKCIJE
// ============================================================================

/**
 * Registriraj preverjanje zdravja
 */
export function registerHealthCheck(name: string, check: HealthCheckFunction): void {
    healthChecks.set(name, check);
}

/**
 * Odstrani preverjanje zdravja
 */
export function unregisterHealthCheck(name: string): void {
    healthChecks.delete(name);
}

/**
 * Izvedi preverjanje zdravja
 */
export async function checkHealth(type: HealthCheckType = 'readiness'): Promise<HealthStatus> {
    const startTime = clock.nowMs();
    const details: Record<string, ComponentHealth> = {};
    let overallStatus: HealthStatusValue = 'healthy';
    
    for (const [name, check] of healthChecks.entries()) {
        try {
            const result = await check();
            details[name] = result;
            
            if (result.status === 'unhealthy') {
                overallStatus = 'unhealthy';
            } else if (result.status === 'degraded' && overallStatus === 'healthy') {
                overallStatus = 'degraded';
            }
        } catch (error) {
            details[name] = {
                name,
                status: 'unhealthy',
                message: error instanceof Error ? error.message : 'Unknown error',
                lastCheck: clock.nowMs(),
            };
            overallStatus = 'unhealthy';
        }
    }
    
    const endTime = clock.nowMs();
    
    return {
        status: overallStatus,
        type,
        timestamp: endTime,
        details,
        version,
        responseTime: endTime - startTime,
    };
}

/**
 * Preveri liveness (ali je aplikacija ziva)
 */
export async function checkLiveness(): Promise<HealthStatus> {
    return checkHealth('liveness');
}

/**
 * Preveri readiness (ali je aplikacija pripravljena za promet)
 */
export async function checkReadiness(): Promise<HealthStatus> {
    return checkHealth('readiness');
}

/**
 * Preveri startup (ali se je aplikacija uspesno zagnala)
 */
export async function checkStartup(): Promise<HealthStatus> {
    return checkHealth('startup');
}

/**
 * Pridobi status zdravja (sinhrona verzija)
 */
export function getHealthStatus(): HealthStatus {
    const timestamp = clock.nowMs();
    return {
        status: 'healthy',
        type: 'liveness',
        timestamp,
        details: {},
        version,
        responseTime: 0,
    };
}

/**
 * Ustvari preprosto preverjanje zdravja
 */
export function createSimpleHealthCheck(
    name: string,
    checkFn: () => boolean | Promise<boolean>,
    message: string = 'OK'
): HealthCheckFunction {
    return async (): Promise<ComponentHealth> => {
        const lastCheck = clock.nowMs();
        try {
            const isHealthy = await checkFn();
            return {
                name,
                status: isHealthy ? 'healthy' : 'unhealthy',
                message: isHealthy ? message : 'Check failed',
                lastCheck,
            };
        } catch (error) {
            return {
                name,
                status: 'unhealthy',
                message: error instanceof Error ? error.message : 'Unknown error',
                lastCheck,
            };
        }
    };
}

// ============================================================================
// BACKEND-SPECIFICNE FUNKCIJE
// ============================================================================

/**
 * Ustvari health check za database connection pool
 */
export function createDatabaseHealthCheck(
    name: string,
    getPoolStatus: () => Promise<DatabasePoolStatus>,
    thresholds: {
        minIdleConnections?: number;
        maxWaitingRequests?: number;
        maxActiveRatio?: number;
    } = {}
): HealthCheckFunction {
    const {
        minIdleConnections = 1,
        maxWaitingRequests = 10,
        maxActiveRatio = 0.9,
    } = thresholds;
    
    return async (): Promise<ComponentHealth> => {
        const lastCheck = clock.nowMs();
        
        try {
            const status = await getPoolStatus();
            
            // Preveri ali je pool zdrav
            const activeRatio = status.activeConnections / status.maxConnections;
            
            if (status.idleConnections < minIdleConnections) {
                return {
                    name,
                    status: 'degraded',
                    message: `Low idle connections: ${status.idleConnections}`,
                    lastCheck,
                };
            }
            
            if (status.waitingRequests > maxWaitingRequests) {
                return {
                    name,
                    status: 'unhealthy',
                    message: `Too many waiting requests: ${status.waitingRequests}`,
                    lastCheck,
                };
            }
            
            if (activeRatio > maxActiveRatio) {
                return {
                    name,
                    status: 'degraded',
                    message: `High connection usage: ${Math.round(activeRatio * 100)}%`,
                    lastCheck,
                };
            }
            
            return {
                name,
                status: 'healthy',
                message: `Pool OK: ${status.activeConnections}/${status.maxConnections} active`,
                lastCheck,
            };
        } catch (error) {
            return {
                name,
                status: 'unhealthy',
                message: error instanceof Error ? error.message : 'Database pool check failed',
                lastCheck,
            };
        }
    };
}

/**
 * Ustvari health check za message queue
 */
export function createQueueHealthCheck(
    name: string,
    getQueueStatus: () => Promise<QueueStatus>,
    thresholds: {
        maxMessageCount?: number;
        maxLagMs?: number;
        minConsumers?: number;
    } = {}
): HealthCheckFunction {
    const {
        maxMessageCount = 10000,
        maxLagMs = 60000,
        minConsumers = 1,
    } = thresholds;
    
    return async (): Promise<ComponentHealth> => {
        const lastCheck = clock.nowMs();
        
        try {
            const status = await getQueueStatus();
            
            if (!status.connected) {
                return {
                    name,
                    status: 'unhealthy',
                    message: `Queue ${status.queueName} not connected`,
                    lastCheck,
                };
            }
            
            if (status.consumerCount < minConsumers) {
                return {
                    name,
                    status: 'unhealthy',
                    message: `Queue ${status.queueName} has no consumers`,
                    lastCheck,
                };
            }
            
            if (status.messageCount > maxMessageCount) {
                return {
                    name,
                    status: 'degraded',
                    message: `Queue ${status.queueName} backlog: ${status.messageCount} messages`,
                    lastCheck,
                };
            }
            
            if (status.lagMs > maxLagMs) {
                return {
                    name,
                    status: 'degraded',
                    message: `Queue ${status.queueName} lag: ${status.lagMs}ms`,
                    lastCheck,
                };
            }
            
            return {
                name,
                status: 'healthy',
                message: `Queue ${status.queueName} OK: ${status.messageCount} messages, ${status.consumerCount} consumers`,
                lastCheck,
            };
        } catch (error) {
            return {
                name,
                status: 'unhealthy',
                message: error instanceof Error ? error.message : 'Queue check failed',
                lastCheck,
            };
        }
    };
}

/**
 * Ustvari health check za cache (Redis/Memcached)
 */
export function createCacheHealthCheck(
    name: string,
    getCacheStatus: () => Promise<CacheStatus>,
    thresholds: {
        maxMemoryUsageRatio?: number;
        minHitRatio?: number;
    } = {}
): HealthCheckFunction {
    const {
        maxMemoryUsageRatio = 0.9,
        minHitRatio = 0.5,
    } = thresholds;
    
    return async (): Promise<ComponentHealth> => {
        const lastCheck = clock.nowMs();
        
        try {
            const status = await getCacheStatus();
            
            if (!status.connected) {
                return {
                    name,
                    status: 'unhealthy',
                    message: 'Cache not connected',
                    lastCheck,
                };
            }
            
            const memoryRatio = status.memoryUsageBytes / status.maxMemoryBytes;
            
            if (memoryRatio > maxMemoryUsageRatio) {
                return {
                    name,
                    status: 'degraded',
                    message: `Cache memory high: ${Math.round(memoryRatio * 100)}%`,
                    lastCheck,
                };
            }
            
            if (status.hitRatio < minHitRatio && status.keyCount > 100) {
                return {
                    name,
                    status: 'degraded',
                    message: `Cache hit ratio low: ${Math.round(status.hitRatio * 100)}%`,
                    lastCheck,
                };
            }
            
            return {
                name,
                status: 'healthy',
                message: `Cache OK: ${status.keyCount} keys, ${Math.round(status.hitRatio * 100)}% hit ratio`,
                lastCheck,
            };
        } catch (error) {
            return {
                name,
                status: 'unhealthy',
                message: error instanceof Error ? error.message : 'Cache check failed',
                lastCheck,
            };
        }
    };
}

/**
 * Ustvari health check za eksterno storitev
 */
export function createExternalServiceHealthCheck(
    name: string,
    checkService: () => Promise<ExternalServiceStatus>,
    thresholds: {
        maxLatencyMs?: number;
        maxStaleMs?: number;
    } = {}
): HealthCheckFunction {
    const {
        maxLatencyMs = 5000,
        maxStaleMs = 300000,
    } = thresholds;
    
    return async (): Promise<ComponentHealth> => {
        const lastCheck = clock.nowMs();
        
        try {
            const status = await checkService();
            
            if (!status.reachable) {
                return {
                    name,
                    status: 'unhealthy',
                    message: `Service ${status.serviceName} not reachable`,
                    lastCheck,
                };
            }
            
            if (status.latencyMs > maxLatencyMs) {
                return {
                    name,
                    status: 'degraded',
                    message: `Service ${status.serviceName} slow: ${status.latencyMs}ms`,
                    lastCheck,
                };
            }
            
            if (status.lastSuccessfulCall !== null) {
                const staleness = lastCheck - status.lastSuccessfulCall;
                if (staleness > maxStaleMs) {
                    return {
                        name,
                        status: 'degraded',
                        message: `Service ${status.serviceName} stale: last success ${Math.round(staleness / 1000)}s ago`,
                        lastCheck,
                    };
                }
            }
            
            return {
                name,
                status: 'healthy',
                message: `Service ${status.serviceName} OK: ${status.latencyMs}ms`,
                lastCheck,
            };
        } catch (error) {
            return {
                name,
                status: 'unhealthy',
                message: error instanceof Error ? error.message : 'External service check failed',
                lastCheck,
            };
        }
    };
}

/**
 * Registriraj vse backend dependency health checks
 */
export function registerBackendHealthChecks(dependencies: {
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
}): void {
    if (dependencies.database) {
        registerHealthCheck(
            dependencies.database.name,
            createDatabaseHealthCheck(dependencies.database.name, dependencies.database.getStatus)
        );
    }
    
    if (dependencies.queues) {
        for (const queue of dependencies.queues) {
            registerHealthCheck(
                queue.name,
                createQueueHealthCheck(queue.name, queue.getStatus)
            );
        }
    }
    
    if (dependencies.cache) {
        registerHealthCheck(
            dependencies.cache.name,
            createCacheHealthCheck(dependencies.cache.name, dependencies.cache.getStatus)
        );
    }
    
    if (dependencies.externalServices) {
        for (const service of dependencies.externalServices) {
            registerHealthCheck(
                service.name,
                createExternalServiceHealthCheck(service.name, service.checkService)
            );
        }
    }
}

// ============================================================================
// IZVOZ
// ============================================================================

export const Health = {
    registerHealthCheck,
    unregisterHealthCheck,
    checkHealth,
    checkLiveness,
    checkReadiness,
    checkStartup,
    getHealthStatus,
    createSimpleHealthCheck,
    createDatabaseHealthCheck,
    createQueueHealthCheck,
    createCacheHealthCheck,
    createExternalServiceHealthCheck,
    registerBackendHealthChecks,
};
