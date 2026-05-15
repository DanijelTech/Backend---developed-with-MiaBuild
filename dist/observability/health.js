"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Health = void 0;
exports.registerHealthCheck = registerHealthCheck;
exports.unregisterHealthCheck = unregisterHealthCheck;
exports.checkHealth = checkHealth;
exports.checkLiveness = checkLiveness;
exports.checkReadiness = checkReadiness;
exports.checkStartup = checkStartup;
exports.getHealthStatus = getHealthStatus;
exports.createSimpleHealthCheck = createSimpleHealthCheck;
exports.createDatabaseHealthCheck = createDatabaseHealthCheck;
exports.createQueueHealthCheck = createQueueHealthCheck;
exports.createCacheHealthCheck = createCacheHealthCheck;
exports.createExternalServiceHealthCheck = createExternalServiceHealthCheck;
exports.registerBackendHealthChecks = registerBackendHealthChecks;
const clock_1 = require("@mia/core/clock");
const clock = (0, clock_1.getClock)();
// ============================================================================
// STANJE
// ============================================================================
const healthChecks = new Map();
const version = '1.0.0';
// ============================================================================
// FUNKCIJE
// ============================================================================
/**
 * Registriraj preverjanje zdravja
 */
function registerHealthCheck(name, check) {
    healthChecks.set(name, check);
}
/**
 * Odstrani preverjanje zdravja
 */
function unregisterHealthCheck(name) {
    healthChecks.delete(name);
}
/**
 * Izvedi preverjanje zdravja
 */
async function checkHealth(type = 'readiness') {
    const startTime = clock.nowMs();
    const details = {};
    let overallStatus = 'healthy';
    for (const [name, check] of healthChecks.entries()) {
        try {
            const result = await check();
            details[name] = result;
            if (result.status === 'unhealthy') {
                overallStatus = 'unhealthy';
            }
            else if (result.status === 'degraded' && overallStatus === 'healthy') {
                overallStatus = 'degraded';
            }
        }
        catch (error) {
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
async function checkLiveness() {
    return checkHealth('liveness');
}
/**
 * Preveri readiness (ali je aplikacija pripravljena za promet)
 */
async function checkReadiness() {
    return checkHealth('readiness');
}
/**
 * Preveri startup (ali se je aplikacija uspesno zagnala)
 */
async function checkStartup() {
    return checkHealth('startup');
}
/**
 * Pridobi status zdravja (sinhrona verzija)
 */
function getHealthStatus() {
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
function createSimpleHealthCheck(name, checkFn, message = 'OK') {
    return async () => {
        const lastCheck = clock.nowMs();
        try {
            const isHealthy = await checkFn();
            return {
                name,
                status: isHealthy ? 'healthy' : 'unhealthy',
                message: isHealthy ? message : 'Check failed',
                lastCheck,
            };
        }
        catch (error) {
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
function createDatabaseHealthCheck(name, getPoolStatus, thresholds = {}) {
    const { minIdleConnections = 1, maxWaitingRequests = 10, maxActiveRatio = 0.9, } = thresholds;
    return async () => {
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
        }
        catch (error) {
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
function createQueueHealthCheck(name, getQueueStatus, thresholds = {}) {
    const { maxMessageCount = 10000, maxLagMs = 60000, minConsumers = 1, } = thresholds;
    return async () => {
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
        }
        catch (error) {
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
function createCacheHealthCheck(name, getCacheStatus, thresholds = {}) {
    const { maxMemoryUsageRatio = 0.9, minHitRatio = 0.5, } = thresholds;
    return async () => {
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
        }
        catch (error) {
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
function createExternalServiceHealthCheck(name, checkService, thresholds = {}) {
    const { maxLatencyMs = 5000, maxStaleMs = 300000, } = thresholds;
    return async () => {
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
        }
        catch (error) {
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
function registerBackendHealthChecks(dependencies) {
    if (dependencies.database) {
        registerHealthCheck(dependencies.database.name, createDatabaseHealthCheck(dependencies.database.name, dependencies.database.getStatus));
    }
    if (dependencies.queues) {
        for (const queue of dependencies.queues) {
            registerHealthCheck(queue.name, createQueueHealthCheck(queue.name, queue.getStatus));
        }
    }
    if (dependencies.cache) {
        registerHealthCheck(dependencies.cache.name, createCacheHealthCheck(dependencies.cache.name, dependencies.cache.getStatus));
    }
    if (dependencies.externalServices) {
        for (const service of dependencies.externalServices) {
            registerHealthCheck(service.name, createExternalServiceHealthCheck(service.name, service.checkService));
        }
    }
}
// ============================================================================
// IZVOZ
// ============================================================================
exports.Health = {
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
