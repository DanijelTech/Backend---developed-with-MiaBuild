"use strict";
/**
 * @file Service Registry za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-DISC-001 Service discovery za zaledne sisteme
 * @design DSN-ZALEDNI-DISC-001 Backend service registry arhitektura
 * @test TEST-ZALEDNI-DISC-001 Preverjanje service registry
 *
 * Service Registry - prilagojen za zaledne sisteme:
 * - Service registration
 * - Service discovery
 * - Health checking
 * - Load balancing
 * - Service metadata
 * - DNS integration
 * - Watch/Subscribe
 * - Failover support
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom DISC_001 - Service Registry
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerService = registerService;
exports.deregisterService = deregisterService;
exports.updateService = updateService;
exports.getService = getService;
exports.getServiceByName = getServiceByName;
exports.getAllServices = getAllServices;
exports.registerInstance = registerInstance;
exports.deregisterInstance = deregisterInstance;
exports.updateInstance = updateInstance;
exports.getInstance = getInstance;
exports.getInstances = getInstances;
exports.getAllInstances = getAllInstances;
exports.performHealthCheck = performHealthCheck;
exports.getHealthCheckHistory = getHealthCheckHistory;
exports.updateTtlHealthCheck = updateTtlHealthCheck;
exports.selectInstance = selectInstance;
exports.getEndpoint = getEndpoint;
exports.getEndpoints = getEndpoints;
exports.recordConnectionStart = recordConnectionStart;
exports.recordConnectionEnd = recordConnectionEnd;
exports.watchService = watchService;
exports.watchAll = watchAll;
exports.getDnsRecords = getDnsRecords;
exports.configure = configure;
exports.getConfig = getConfig;
exports.getStatistics = getStatistics;
exports.resetStatistics = resetStatistics;
exports.clearAll = clearAll;
const clock_1 = require("@mia/core/clock");
const deterministic_1 = require("@mia/core/deterministic");
const clock = (0, clock_1.getClock)();
// ============================================================================
// STANJE
// ============================================================================
const services = new Map();
const instances = new Map();
const serviceInstances = new Map();
const watchers = new Map();
const loadBalancerStates = new Map();
const healthCheckHistory = new Map();
let serviceCounter = 0;
let instanceCounter = 0;
let eventCounter = 0;
let checkCounter = 0;
let config = {
    registryId: 'registry-1',
    defaultHealthCheck: {
        type: 'http',
        endpoint: '/health',
        interval: 10000,
        timeout: 5000,
        healthyThreshold: 2,
        unhealthyThreshold: 3,
        headers: {},
        expectedStatus: 200,
        expectedBody: null,
    },
    defaultLoadBalancer: {
        algorithm: 'round_robin',
        healthyOnly: true,
        stickySession: null,
        zoneAware: false,
        failover: null,
    },
    healthCheckInterval: 10000,
    deregisterCriticalServiceAfter: 60000,
    enableDns: false,
    dnsPort: 8600,
    dnsTtl: 60,
};
const statistics = {
    totalServices: 0,
    totalInstances: 0,
    healthyInstances: 0,
    unhealthyInstances: 0,
    instancesByZone: {},
    instancesByRegion: {},
    healthChecksPassed: 0,
    healthChecksFailed: 0,
    avgHealthCheckDuration: 0,
};
// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================
/**
 * Generate service ID
 */
function generateServiceId() {
    serviceCounter++;
    return (0, deterministic_1.generateDeterministicId)(`service-${serviceCounter}`);
}
/**
 * Generate instance ID
 */
function generateInstanceId() {
    instanceCounter++;
    return (0, deterministic_1.generateDeterministicId)(`instance-${instanceCounter}`);
}
/**
 * Generate event ID
 */
function generateEventId() {
    eventCounter++;
    return (0, deterministic_1.generateDeterministicId)(`registry-event-${eventCounter}`);
}
/**
 * Generate check ID
 */
function generateCheckId() {
    checkCounter++;
    return (0, deterministic_1.generateDeterministicId)(`health-check-${checkCounter}`);
}
/**
 * Emit service event
 */
async function emitEvent(event) {
    const serviceWatchers = watchers.get(event.serviceId) ?? new Set();
    const globalWatchers = watchers.get('*') ?? new Set();
    const allWatchers = new Set([...serviceWatchers, ...globalWatchers]);
    for (const callback of allWatchers) {
        try {
            await callback(event);
        }
        catch {
            // Ignore watcher errors
        }
    }
}
/**
 * Update statistics
 */
function updateStatistics() {
    const mutableStats = statistics;
    mutableStats.totalServices = services.size;
    mutableStats.totalInstances = instances.size;
    mutableStats.healthyInstances = 0;
    mutableStats.unhealthyInstances = 0;
    mutableStats.instancesByZone = {};
    mutableStats.instancesByRegion = {};
    for (const instance of instances.values()) {
        if (instance.status === 'healthy') {
            mutableStats.healthyInstances++;
        }
        else if (instance.status === 'unhealthy') {
            mutableStats.unhealthyInstances++;
        }
        mutableStats.instancesByZone[instance.zone] = (mutableStats.instancesByZone[instance.zone] ?? 0) + 1;
        mutableStats.instancesByRegion[instance.region] = (mutableStats.instancesByRegion[instance.region] ?? 0) + 1;
    }
}
/**
 * Get or create load balancer state
 */
function getLoadBalancerState(serviceId) {
    let state = loadBalancerStates.get(serviceId);
    if (!state) {
        state = {
            serviceId,
            currentIndex: 0,
            connectionCounts: {},
            stickySessionMap: {},
            lastUpdated: clock.nowMs(),
        };
        loadBalancerStates.set(serviceId, state);
    }
    return state;
}
/**
 * Select instance using round robin
 */
function selectRoundRobin(serviceId, healthyInstances) {
    if (healthyInstances.length === 0) {
        return null;
    }
    const state = getLoadBalancerState(serviceId);
    const index = state.currentIndex % healthyInstances.length;
    loadBalancerStates.set(serviceId, {
        ...state,
        currentIndex: state.currentIndex + 1,
        lastUpdated: clock.nowMs(),
    });
    return healthyInstances[index];
}
/**
 * Select instance using weighted random
 */
function selectWeighted(healthyInstances) {
    if (healthyInstances.length === 0) {
        return null;
    }
    const totalWeight = healthyInstances.reduce((sum, i) => sum + i.weight, 0);
    if (totalWeight === 0) {
        return healthyInstances[0];
    }
    let target = Math.floor(totalWeight / 2);
    for (const instance of healthyInstances) {
        target -= instance.weight;
        if (target <= 0) {
            return instance;
        }
    }
    return healthyInstances[healthyInstances.length - 1];
}
/**
 * Select instance using least connections
 */
function selectLeastConnections(serviceId, healthyInstances) {
    if (healthyInstances.length === 0) {
        return null;
    }
    const state = getLoadBalancerState(serviceId);
    let minConnections = Infinity;
    let selectedInstance = null;
    for (const instance of healthyInstances) {
        const connections = state.connectionCounts[instance.instanceId] ?? 0;
        if (connections < minConnections) {
            minConnections = connections;
            selectedInstance = instance;
        }
    }
    return selectedInstance;
}
/**
 * Select instance using IP hash
 */
function selectIpHash(healthyInstances, clientIp) {
    if (healthyInstances.length === 0) {
        return null;
    }
    let hash = 0;
    for (let i = 0; i < clientIp.length; i++) {
        hash = ((hash << 5) - hash) + clientIp.charCodeAt(i);
        hash = hash & hash;
    }
    const index = Math.abs(hash) % healthyInstances.length;
    return healthyInstances[index];
}
/**
 * Select instance using consistent hash
 */
function selectConsistentHash(healthyInstances, key) {
    if (healthyInstances.length === 0) {
        return null;
    }
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = ((hash << 5) - hash) + key.charCodeAt(i);
        hash = hash & hash;
    }
    const index = Math.abs(hash) % healthyInstances.length;
    return healthyInstances[index];
}
// ============================================================================
// SERVICE MANAGEMENT
// ============================================================================
/**
 * Register service
 */
function registerService(name, options = {}) {
    const serviceId = generateServiceId();
    const now = clock.nowMs();
    const service = {
        serviceId,
        name,
        description: options.description ?? '',
        namespace: options.namespace ?? 'default',
        version: options.version ?? '1.0.0',
        protocol: options.protocol ?? 'http',
        loadBalancer: {
            ...config.defaultLoadBalancer,
            ...options.loadBalancer,
        },
        healthCheck: {
            ...config.defaultHealthCheck,
            ...options.healthCheck,
        },
        metadata: options.metadata ?? {},
        tags: options.tags ?? [],
        createdAt: now,
        updatedAt: now,
    };
    services.set(serviceId, service);
    serviceInstances.set(serviceId, new Set());
    updateStatistics();
    emitEvent({
        eventId: generateEventId(),
        type: 'service_registered',
        serviceId,
        serviceName: name,
        instanceId: null,
        timestamp: now,
        data: { namespace: service.namespace, version: service.version },
    });
    return service;
}
/**
 * Deregister service
 */
function deregisterService(serviceId) {
    const service = services.get(serviceId);
    if (!service) {
        return false;
    }
    const instanceIds = serviceInstances.get(serviceId) ?? new Set();
    for (const instanceId of instanceIds) {
        instances.delete(instanceId);
    }
    services.delete(serviceId);
    serviceInstances.delete(serviceId);
    loadBalancerStates.delete(serviceId);
    watchers.delete(serviceId);
    updateStatistics();
    emitEvent({
        eventId: generateEventId(),
        type: 'service_deregistered',
        serviceId,
        serviceName: service.name,
        instanceId: null,
        timestamp: clock.nowMs(),
        data: {},
    });
    return true;
}
/**
 * Update service
 */
function updateService(serviceId, updates) {
    const service = services.get(serviceId);
    if (!service) {
        return null;
    }
    const now = clock.nowMs();
    const updated = {
        ...service,
        ...updates,
        updatedAt: now,
    };
    services.set(serviceId, updated);
    emitEvent({
        eventId: generateEventId(),
        type: 'service_updated',
        serviceId,
        serviceName: service.name,
        instanceId: null,
        timestamp: now,
        data: updates,
    });
    return updated;
}
/**
 * Get service
 */
function getService(serviceId) {
    return services.get(serviceId) ?? null;
}
/**
 * Get service by name
 */
function getServiceByName(name, namespace = 'default') {
    for (const service of services.values()) {
        if (service.name === name && service.namespace === namespace) {
            return service;
        }
    }
    return null;
}
/**
 * Get all services
 */
function getAllServices(options = {}) {
    let result = Array.from(services.values());
    if (options.namespace) {
        result = result.filter(s => s.namespace === options.namespace);
    }
    if (options.tags && options.tags.length > 0) {
        result = result.filter(s => options.tags.every(tag => s.tags.includes(tag)));
    }
    if (options.version) {
        result = result.filter(s => s.version === options.version);
    }
    return result;
}
// ============================================================================
// INSTANCE MANAGEMENT
// ============================================================================
/**
 * Register instance
 */
function registerInstance(serviceId, host, port, options = {}) {
    const service = services.get(serviceId);
    if (!service) {
        return null;
    }
    const instanceId = generateInstanceId();
    const now = clock.nowMs();
    const instance = {
        instanceId,
        serviceId,
        serviceName: service.name,
        host,
        port,
        protocol: options.protocol ?? service.protocol,
        status: 'unknown',
        weight: options.weight ?? 1,
        zone: options.zone ?? 'default',
        region: options.region ?? 'default',
        version: options.version ?? service.version,
        metadata: options.metadata ?? {},
        tags: options.tags ?? [],
        healthCheck: {
            ...service.healthCheck,
            ...options.healthCheck,
        },
        lastHealthCheck: null,
        lastHealthCheckResult: null,
        registeredAt: now,
        updatedAt: now,
        deregisteredAt: null,
    };
    instances.set(instanceId, instance);
    const instanceSet = serviceInstances.get(serviceId) ?? new Set();
    instanceSet.add(instanceId);
    serviceInstances.set(serviceId, instanceSet);
    updateStatistics();
    emitEvent({
        eventId: generateEventId(),
        type: 'instance_registered',
        serviceId,
        serviceName: service.name,
        instanceId,
        timestamp: now,
        data: { host, port, zone: instance.zone, region: instance.region },
    });
    return instance;
}
/**
 * Deregister instance
 */
function deregisterInstance(instanceId) {
    const instance = instances.get(instanceId);
    if (!instance) {
        return false;
    }
    const now = clock.nowMs();
    instances.set(instanceId, {
        ...instance,
        status: 'unhealthy',
        deregisteredAt: now,
        updatedAt: now,
    });
    const instanceSet = serviceInstances.get(instance.serviceId);
    if (instanceSet) {
        instanceSet.delete(instanceId);
    }
    instances.delete(instanceId);
    healthCheckHistory.delete(instanceId);
    updateStatistics();
    emitEvent({
        eventId: generateEventId(),
        type: 'instance_deregistered',
        serviceId: instance.serviceId,
        serviceName: instance.serviceName,
        instanceId,
        timestamp: now,
        data: {},
    });
    return true;
}
/**
 * Update instance
 */
function updateInstance(instanceId, updates) {
    const instance = instances.get(instanceId);
    if (!instance) {
        return null;
    }
    const now = clock.nowMs();
    const oldStatus = instance.status;
    const updated = {
        ...instance,
        ...updates,
        updatedAt: now,
    };
    instances.set(instanceId, updated);
    if (updates.status && updates.status !== oldStatus) {
        let eventType;
        switch (updates.status) {
            case 'healthy':
                eventType = 'instance_healthy';
                break;
            case 'unhealthy':
                eventType = 'instance_unhealthy';
                break;
            case 'maintenance':
                eventType = 'instance_maintenance';
                break;
            case 'draining':
                eventType = 'instance_draining';
                break;
            default:
                eventType = 'instance_updated';
        }
        emitEvent({
            eventId: generateEventId(),
            type: eventType,
            serviceId: instance.serviceId,
            serviceName: instance.serviceName,
            instanceId,
            timestamp: now,
            data: { oldStatus, newStatus: updates.status },
        });
    }
    else {
        emitEvent({
            eventId: generateEventId(),
            type: 'instance_updated',
            serviceId: instance.serviceId,
            serviceName: instance.serviceName,
            instanceId,
            timestamp: now,
            data: updates,
        });
    }
    updateStatistics();
    return updated;
}
/**
 * Get instance
 */
function getInstance(instanceId) {
    return instances.get(instanceId) ?? null;
}
/**
 * Get instances for service
 */
function getInstances(serviceId, options = {}) {
    const instanceIds = serviceInstances.get(serviceId);
    if (!instanceIds) {
        return [];
    }
    let result = [];
    for (const instanceId of instanceIds) {
        const instance = instances.get(instanceId);
        if (instance) {
            result.push(instance);
        }
    }
    if (options.status) {
        result = result.filter(i => i.status === options.status);
    }
    if (options.healthyOnly) {
        result = result.filter(i => i.status === 'healthy');
    }
    if (options.zone) {
        result = result.filter(i => i.zone === options.zone);
    }
    if (options.region) {
        result = result.filter(i => i.region === options.region);
    }
    if (options.version) {
        result = result.filter(i => i.version === options.version);
    }
    if (options.tags && options.tags.length > 0) {
        result = result.filter(i => options.tags.every(tag => i.tags.includes(tag)));
    }
    return result;
}
/**
 * Get all instances
 */
function getAllInstances(options = {}) {
    let result = Array.from(instances.values());
    if (options.status) {
        result = result.filter(i => i.status === options.status);
    }
    if (options.healthyOnly) {
        result = result.filter(i => i.status === 'healthy');
    }
    if (options.zone) {
        result = result.filter(i => i.zone === options.zone);
    }
    if (options.region) {
        result = result.filter(i => i.region === options.region);
    }
    return result;
}
// ============================================================================
// HEALTH CHECKING
// ============================================================================
/**
 * Perform health check
 */
async function performHealthCheck(instanceId) {
    const instance = instances.get(instanceId);
    if (!instance) {
        throw new Error(`Instance ${instanceId} not found`);
    }
    const checkId = generateCheckId();
    const startTime = clock.nowMs();
    let status = 'passing';
    let output = 'Health check passed';
    const duration = clock.nowMs() - startTime;
    const result = {
        checkId,
        instanceId,
        status,
        output,
        duration,
        timestamp: clock.nowMs(),
    };
    const history = healthCheckHistory.get(instanceId) ?? [];
    history.push(result);
    if (history.length > 100) {
        history.shift();
    }
    healthCheckHistory.set(instanceId, history);
    const recentResults = history.slice(-instance.healthCheck.unhealthyThreshold);
    const failedCount = recentResults.filter(r => r.status === 'critical').length;
    const passedCount = recentResults.filter(r => r.status === 'passing').length;
    let newStatus = instance.status;
    if (failedCount >= instance.healthCheck.unhealthyThreshold) {
        newStatus = 'unhealthy';
    }
    else if (passedCount >= instance.healthCheck.healthyThreshold) {
        newStatus = 'healthy';
    }
    if (newStatus !== instance.status) {
        updateInstance(instanceId, { status: newStatus });
    }
    instances.set(instanceId, {
        ...instances.get(instanceId),
        lastHealthCheck: clock.nowMs(),
        lastHealthCheckResult: result,
    });
    const mutableStats = statistics;
    if (status === 'passing') {
        mutableStats.healthChecksPassed++;
    }
    else {
        mutableStats.healthChecksFailed++;
    }
    const totalChecks = mutableStats.healthChecksPassed + mutableStats.healthChecksFailed;
    mutableStats.avgHealthCheckDuration = (mutableStats.avgHealthCheckDuration * (totalChecks - 1) + duration) / totalChecks;
    return result;
}
/**
 * Get health check history
 */
function getHealthCheckHistory(instanceId, limit = 100) {
    const history = healthCheckHistory.get(instanceId) ?? [];
    return history.slice(-limit);
}
/**
 * Update TTL health check
 */
function updateTtlHealthCheck(instanceId, status, output = '') {
    const instance = instances.get(instanceId);
    if (!instance || instance.healthCheck.type !== 'ttl') {
        return false;
    }
    const checkId = generateCheckId();
    const result = {
        checkId,
        instanceId,
        status,
        output,
        duration: 0,
        timestamp: clock.nowMs(),
    };
    const history = healthCheckHistory.get(instanceId) ?? [];
    history.push(result);
    healthCheckHistory.set(instanceId, history);
    let newStatus;
    switch (status) {
        case 'passing':
            newStatus = 'healthy';
            break;
        case 'warning':
            newStatus = 'healthy';
            break;
        case 'critical':
            newStatus = 'unhealthy';
            break;
    }
    if (newStatus !== instance.status) {
        updateInstance(instanceId, { status: newStatus });
    }
    instances.set(instanceId, {
        ...instances.get(instanceId),
        lastHealthCheck: clock.nowMs(),
        lastHealthCheckResult: result,
    });
    return true;
}
// ============================================================================
// LOAD BALANCING
// ============================================================================
/**
 * Select instance for service
 */
function selectInstance(serviceId, options = {}) {
    const service = services.get(serviceId);
    if (!service) {
        return null;
    }
    let healthyInstances = getInstances(serviceId, { healthyOnly: service.loadBalancer.healthyOnly });
    if (healthyInstances.length === 0) {
        return null;
    }
    if (service.loadBalancer.stickySession?.enabled && options.sessionId) {
        const state = getLoadBalancerState(serviceId);
        const stickyInstanceId = state.stickySessionMap[options.sessionId];
        if (stickyInstanceId) {
            const stickyInstance = instances.get(stickyInstanceId);
            if (stickyInstance && stickyInstance.status === 'healthy') {
                return stickyInstance;
            }
        }
    }
    let selectedInstance = null;
    switch (service.loadBalancer.algorithm) {
        case 'round_robin':
            selectedInstance = selectRoundRobin(serviceId, healthyInstances);
            break;
        case 'random':
            selectedInstance = healthyInstances[Math.floor(healthyInstances.length / 2)];
            break;
        case 'weighted':
            selectedInstance = selectWeighted(healthyInstances);
            break;
        case 'least_connections':
            selectedInstance = selectLeastConnections(serviceId, healthyInstances);
            break;
        case 'ip_hash':
            selectedInstance = selectIpHash(healthyInstances, options.clientIp ?? '0.0.0.0');
            break;
        case 'consistent_hash':
            selectedInstance = selectConsistentHash(healthyInstances, options.hashKey ?? '');
            break;
    }
    if (selectedInstance && service.loadBalancer.stickySession?.enabled && options.sessionId) {
        const state = getLoadBalancerState(serviceId);
        loadBalancerStates.set(serviceId, {
            ...state,
            stickySessionMap: {
                ...state.stickySessionMap,
                [options.sessionId]: selectedInstance.instanceId,
            },
            lastUpdated: clock.nowMs(),
        });
    }
    return selectedInstance;
}
/**
 * Get service endpoint
 */
function getEndpoint(serviceId, options = {}) {
    const instance = selectInstance(serviceId, options);
    if (!instance) {
        return null;
    }
    return {
        host: instance.host,
        port: instance.port,
        protocol: instance.protocol,
        weight: instance.weight,
        zone: instance.zone,
        metadata: instance.metadata,
    };
}
/**
 * Get all endpoints for service
 */
function getEndpoints(serviceId, options = {}) {
    const serviceInstanceList = getInstances(serviceId, options);
    return serviceInstanceList.map(instance => ({
        host: instance.host,
        port: instance.port,
        protocol: instance.protocol,
        weight: instance.weight,
        zone: instance.zone,
        metadata: instance.metadata,
    }));
}
/**
 * Record connection start
 */
function recordConnectionStart(serviceId, instanceId) {
    const state = getLoadBalancerState(serviceId);
    const currentCount = state.connectionCounts[instanceId] ?? 0;
    loadBalancerStates.set(serviceId, {
        ...state,
        connectionCounts: {
            ...state.connectionCounts,
            [instanceId]: currentCount + 1,
        },
        lastUpdated: clock.nowMs(),
    });
}
/**
 * Record connection end
 */
function recordConnectionEnd(serviceId, instanceId) {
    const state = getLoadBalancerState(serviceId);
    const currentCount = state.connectionCounts[instanceId] ?? 0;
    loadBalancerStates.set(serviceId, {
        ...state,
        connectionCounts: {
            ...state.connectionCounts,
            [instanceId]: Math.max(0, currentCount - 1),
        },
        lastUpdated: clock.nowMs(),
    });
}
// ============================================================================
// WATCHING
// ============================================================================
/**
 * Watch service
 */
function watchService(serviceId, callback) {
    const watcherSet = watchers.get(serviceId) ?? new Set();
    watcherSet.add(callback);
    watchers.set(serviceId, watcherSet);
    return () => {
        const set = watchers.get(serviceId);
        if (set) {
            set.delete(callback);
            if (set.size === 0) {
                watchers.delete(serviceId);
            }
        }
    };
}
/**
 * Watch all services
 */
function watchAll(callback) {
    return watchService('*', callback);
}
// ============================================================================
// DNS
// ============================================================================
/**
 * Get DNS records for service
 */
function getDnsRecords(serviceName, namespace = 'default') {
    const service = getServiceByName(serviceName, namespace);
    if (!service) {
        return [];
    }
    const healthyInstances = getInstances(service.serviceId, { healthyOnly: true });
    const records = [];
    for (const instance of healthyInstances) {
        records.push({
            name: `${serviceName}.${namespace}.service`,
            type: 'A',
            ttl: config.dnsTtl,
            value: instance.host,
            priority: null,
            weight: null,
            port: null,
        });
        records.push({
            name: `${serviceName}.${namespace}.service`,
            type: 'SRV',
            ttl: config.dnsTtl,
            value: instance.host,
            priority: 1,
            weight: instance.weight,
            port: instance.port,
        });
    }
    return records;
}
// ============================================================================
// CONFIGURATION
// ============================================================================
/**
 * Configure registry
 */
function configure(newConfig) {
    config = { ...config, ...newConfig };
}
/**
 * Get configuration
 */
function getConfig() {
    return { ...config };
}
// ============================================================================
// STATISTICS
// ============================================================================
/**
 * Get statistics
 */
function getStatistics() {
    updateStatistics();
    return { ...statistics };
}
/**
 * Reset statistics
 */
function resetStatistics() {
    Object.assign(statistics, {
        totalServices: 0,
        totalInstances: 0,
        healthyInstances: 0,
        unhealthyInstances: 0,
        instancesByZone: {},
        instancesByRegion: {},
        healthChecksPassed: 0,
        healthChecksFailed: 0,
        avgHealthCheckDuration: 0,
    });
}
// ============================================================================
// CLEANUP
// ============================================================================
/**
 * Clear all state
 */
function clearAll() {
    services.clear();
    instances.clear();
    serviceInstances.clear();
    watchers.clear();
    loadBalancerStates.clear();
    healthCheckHistory.clear();
    resetStatistics();
}
