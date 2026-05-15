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

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI ZA SERVICE REGISTRY
// ============================================================================

/**
 * Service status
 */
export type ServiceStatus = 'healthy' | 'unhealthy' | 'unknown' | 'maintenance' | 'draining';

/**
 * Health check type
 */
export type HealthCheckType = 'http' | 'tcp' | 'grpc' | 'script' | 'ttl';

/**
 * Load balancer algorithm
 */
export type LoadBalancerAlgorithm = 'round_robin' | 'random' | 'least_connections' | 'weighted' | 'ip_hash' | 'consistent_hash';

/**
 * Service instance
 */
export interface ServiceInstance {
    readonly instanceId: string;
    readonly serviceId: string;
    readonly serviceName: string;
    readonly host: string;
    readonly port: number;
    readonly protocol: 'http' | 'https' | 'grpc' | 'tcp';
    readonly status: ServiceStatus;
    readonly weight: number;
    readonly zone: string;
    readonly region: string;
    readonly version: string;
    readonly metadata: Readonly<Record<string, string>>;
    readonly tags: readonly string[];
    readonly healthCheck: HealthCheckConfig;
    readonly lastHealthCheck: number | null;
    readonly lastHealthCheckResult: HealthCheckResult | null;
    readonly registeredAt: number;
    readonly updatedAt: number;
    readonly deregisteredAt: number | null;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
    readonly type: HealthCheckType;
    readonly endpoint: string | null;
    readonly interval: number;
    readonly timeout: number;
    readonly healthyThreshold: number;
    readonly unhealthyThreshold: number;
    readonly headers: Readonly<Record<string, string>>;
    readonly expectedStatus: number | null;
    readonly expectedBody: string | null;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
    readonly checkId: string;
    readonly instanceId: string;
    readonly status: 'passing' | 'warning' | 'critical';
    readonly output: string;
    readonly duration: number;
    readonly timestamp: number;
}

/**
 * Service definition
 */
export interface ServiceDefinition {
    readonly serviceId: string;
    readonly name: string;
    readonly description: string;
    readonly namespace: string;
    readonly version: string;
    readonly protocol: 'http' | 'https' | 'grpc' | 'tcp';
    readonly loadBalancer: LoadBalancerConfig;
    readonly healthCheck: HealthCheckConfig;
    readonly metadata: Readonly<Record<string, string>>;
    readonly tags: readonly string[];
    readonly createdAt: number;
    readonly updatedAt: number;
}

/**
 * Load balancer configuration
 */
export interface LoadBalancerConfig {
    readonly algorithm: LoadBalancerAlgorithm;
    readonly healthyOnly: boolean;
    readonly stickySession: StickySessionConfig | null;
    readonly zoneAware: boolean;
    readonly failover: FailoverConfig | null;
}

/**
 * Sticky session configuration
 */
export interface StickySessionConfig {
    readonly enabled: boolean;
    readonly cookieName: string;
    readonly ttl: number;
}

/**
 * Failover configuration
 */
export interface FailoverConfig {
    readonly enabled: boolean;
    readonly maxRetries: number;
    readonly retryDelay: number;
    readonly failoverZones: readonly string[];
}

/**
 * Service endpoint
 */
export interface ServiceEndpoint {
    readonly host: string;
    readonly port: number;
    readonly protocol: 'http' | 'https' | 'grpc' | 'tcp';
    readonly weight: number;
    readonly zone: string;
    readonly metadata: Readonly<Record<string, string>>;
}

/**
 * Service watch callback
 */
export type ServiceWatchCallback = (event: ServiceEvent) => void | Promise<void>;

/**
 * Service event
 */
export interface ServiceEvent {
    readonly eventId: string;
    readonly type: ServiceEventType;
    readonly serviceId: string;
    readonly serviceName: string;
    readonly instanceId: string | null;
    readonly timestamp: number;
    readonly data: Readonly<Record<string, unknown>>;
}

/**
 * Service event type
 */
export type ServiceEventType =
    | 'service_registered'
    | 'service_deregistered'
    | 'service_updated'
    | 'instance_registered'
    | 'instance_deregistered'
    | 'instance_updated'
    | 'instance_healthy'
    | 'instance_unhealthy'
    | 'instance_maintenance'
    | 'instance_draining';

/**
 * Registry configuration
 */
export interface RegistryConfig {
    readonly registryId: string;
    readonly defaultHealthCheck: HealthCheckConfig;
    readonly defaultLoadBalancer: LoadBalancerConfig;
    readonly healthCheckInterval: number;
    readonly deregisterCriticalServiceAfter: number;
    readonly enableDns: boolean;
    readonly dnsPort: number;
    readonly dnsTtl: number;
}

/**
 * Registry statistics
 */
export interface RegistryStatistics {
    readonly totalServices: number;
    readonly totalInstances: number;
    readonly healthyInstances: number;
    readonly unhealthyInstances: number;
    readonly instancesByZone: Readonly<Record<string, number>>;
    readonly instancesByRegion: Readonly<Record<string, number>>;
    readonly healthChecksPassed: number;
    readonly healthChecksFailed: number;
    readonly avgHealthCheckDuration: number;
}

/**
 * DNS record
 */
export interface DnsRecord {
    readonly name: string;
    readonly type: 'A' | 'AAAA' | 'SRV' | 'TXT';
    readonly ttl: number;
    readonly value: string;
    readonly priority: number | null;
    readonly weight: number | null;
    readonly port: number | null;
}

/**
 * Service query options
 */
export interface ServiceQueryOptions {
    readonly namespace?: string;
    readonly tags?: readonly string[];
    readonly status?: ServiceStatus;
    readonly zone?: string;
    readonly region?: string;
    readonly version?: string;
    readonly healthyOnly?: boolean;
}

/**
 * Load balancer state
 */
export interface LoadBalancerState {
    readonly serviceId: string;
    readonly currentIndex: number;
    readonly connectionCounts: Readonly<Record<string, number>>;
    readonly stickySessionMap: Readonly<Record<string, string>>;
    readonly lastUpdated: number;
}

// ============================================================================
// STANJE
// ============================================================================

const services: Map<string, ServiceDefinition> = new Map();
const instances: Map<string, ServiceInstance> = new Map();
const serviceInstances: Map<string, Set<string>> = new Map();
const watchers: Map<string, Set<ServiceWatchCallback>> = new Map();
const loadBalancerStates: Map<string, LoadBalancerState> = new Map();
const healthCheckHistory: Map<string, HealthCheckResult[]> = new Map();

let serviceCounter = 0;
let instanceCounter = 0;
let eventCounter = 0;
let checkCounter = 0;

let config: RegistryConfig = {
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

const statistics: RegistryStatistics = {
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
function generateServiceId(): string {
    serviceCounter++;
    return generateDeterministicId(`service-${serviceCounter}`);
}

/**
 * Generate instance ID
 */
function generateInstanceId(): string {
    instanceCounter++;
    return generateDeterministicId(`instance-${instanceCounter}`);
}

/**
 * Generate event ID
 */
function generateEventId(): string {
    eventCounter++;
    return generateDeterministicId(`registry-event-${eventCounter}`);
}

/**
 * Generate check ID
 */
function generateCheckId(): string {
    checkCounter++;
    return generateDeterministicId(`health-check-${checkCounter}`);
}

/**
 * Emit service event
 */
async function emitEvent(event: ServiceEvent): Promise<void> {
    const serviceWatchers = watchers.get(event.serviceId) ?? new Set();
    const globalWatchers = watchers.get('*') ?? new Set();
    
    const allWatchers = new Set([...serviceWatchers, ...globalWatchers]);
    
    for (const callback of allWatchers) {
        try {
            await callback(event);
        } catch {
            // Ignore watcher errors
        }
    }
}

/**
 * Update statistics
 */
function updateStatistics(): void {
    const mutableStats = statistics as {
        totalServices: number;
        totalInstances: number;
        healthyInstances: number;
        unhealthyInstances: number;
        instancesByZone: Record<string, number>;
        instancesByRegion: Record<string, number>;
    };
    
    mutableStats.totalServices = services.size;
    mutableStats.totalInstances = instances.size;
    mutableStats.healthyInstances = 0;
    mutableStats.unhealthyInstances = 0;
    mutableStats.instancesByZone = {};
    mutableStats.instancesByRegion = {};
    
    for (const instance of instances.values()) {
        if (instance.status === 'healthy') {
            mutableStats.healthyInstances++;
        } else if (instance.status === 'unhealthy') {
            mutableStats.unhealthyInstances++;
        }
        
        mutableStats.instancesByZone[instance.zone] = (mutableStats.instancesByZone[instance.zone] ?? 0) + 1;
        mutableStats.instancesByRegion[instance.region] = (mutableStats.instancesByRegion[instance.region] ?? 0) + 1;
    }
}

/**
 * Get or create load balancer state
 */
function getLoadBalancerState(serviceId: string): LoadBalancerState {
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
function selectRoundRobin(serviceId: string, healthyInstances: readonly ServiceInstance[]): ServiceInstance | null {
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
function selectWeighted(healthyInstances: readonly ServiceInstance[]): ServiceInstance | null {
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
function selectLeastConnections(serviceId: string, healthyInstances: readonly ServiceInstance[]): ServiceInstance | null {
    if (healthyInstances.length === 0) {
        return null;
    }
    
    const state = getLoadBalancerState(serviceId);
    
    let minConnections = Infinity;
    let selectedInstance: ServiceInstance | null = null;
    
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
function selectIpHash(healthyInstances: readonly ServiceInstance[], clientIp: string): ServiceInstance | null {
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
function selectConsistentHash(healthyInstances: readonly ServiceInstance[], key: string): ServiceInstance | null {
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
export function registerService(
    name: string,
    options: {
        description?: string;
        namespace?: string;
        version?: string;
        protocol?: 'http' | 'https' | 'grpc' | 'tcp';
        loadBalancer?: Partial<LoadBalancerConfig>;
        healthCheck?: Partial<HealthCheckConfig>;
        metadata?: Record<string, string>;
        tags?: readonly string[];
    } = {}
): ServiceDefinition {
    const serviceId = generateServiceId();
    const now = clock.nowMs();
    
    const service: ServiceDefinition = {
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
export function deregisterService(serviceId: string): boolean {
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
export function updateService(
    serviceId: string,
    updates: Partial<Pick<ServiceDefinition, 'description' | 'version' | 'metadata' | 'tags'>>
): ServiceDefinition | null {
    const service = services.get(serviceId);
    if (!service) {
        return null;
    }
    
    const now = clock.nowMs();
    
    const updated: ServiceDefinition = {
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
export function getService(serviceId: string): ServiceDefinition | null {
    return services.get(serviceId) ?? null;
}

/**
 * Get service by name
 */
export function getServiceByName(name: string, namespace: string = 'default'): ServiceDefinition | null {
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
export function getAllServices(options: ServiceQueryOptions = {}): readonly ServiceDefinition[] {
    let result = Array.from(services.values());
    
    if (options.namespace) {
        result = result.filter(s => s.namespace === options.namespace);
    }
    
    if (options.tags && options.tags.length > 0) {
        result = result.filter(s => options.tags!.every(tag => s.tags.includes(tag)));
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
export function registerInstance(
    serviceId: string,
    host: string,
    port: number,
    options: {
        protocol?: 'http' | 'https' | 'grpc' | 'tcp';
        weight?: number;
        zone?: string;
        region?: string;
        version?: string;
        metadata?: Record<string, string>;
        tags?: readonly string[];
        healthCheck?: Partial<HealthCheckConfig>;
    } = {}
): ServiceInstance | null {
    const service = services.get(serviceId);
    if (!service) {
        return null;
    }
    
    const instanceId = generateInstanceId();
    const now = clock.nowMs();
    
    const instance: ServiceInstance = {
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
export function deregisterInstance(instanceId: string): boolean {
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
export function updateInstance(
    instanceId: string,
    updates: Partial<Pick<ServiceInstance, 'weight' | 'metadata' | 'tags' | 'status'>>
): ServiceInstance | null {
    const instance = instances.get(instanceId);
    if (!instance) {
        return null;
    }
    
    const now = clock.nowMs();
    const oldStatus = instance.status;
    
    const updated: ServiceInstance = {
        ...instance,
        ...updates,
        updatedAt: now,
    };
    
    instances.set(instanceId, updated);
    
    if (updates.status && updates.status !== oldStatus) {
        let eventType: ServiceEventType;
        
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
    } else {
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
export function getInstance(instanceId: string): ServiceInstance | null {
    return instances.get(instanceId) ?? null;
}

/**
 * Get instances for service
 */
export function getInstances(serviceId: string, options: ServiceQueryOptions = {}): readonly ServiceInstance[] {
    const instanceIds = serviceInstances.get(serviceId);
    if (!instanceIds) {
        return [];
    }
    
    let result: ServiceInstance[] = [];
    
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
        result = result.filter(i => options.tags!.every(tag => i.tags.includes(tag)));
    }
    
    return result;
}

/**
 * Get all instances
 */
export function getAllInstances(options: ServiceQueryOptions = {}): readonly ServiceInstance[] {
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
export async function performHealthCheck(instanceId: string): Promise<HealthCheckResult> {
    const instance = instances.get(instanceId);
    if (!instance) {
        throw new Error(`Instance ${instanceId} not found`);
    }
    
    const checkId = generateCheckId();
    const startTime = clock.nowMs();
    
    let status: 'passing' | 'warning' | 'critical' = 'passing';
    let output = 'Health check passed';
    
    const duration = clock.nowMs() - startTime;
    
    const result: HealthCheckResult = {
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
    
    let newStatus: ServiceStatus = instance.status;
    
    if (failedCount >= instance.healthCheck.unhealthyThreshold) {
        newStatus = 'unhealthy';
    } else if (passedCount >= instance.healthCheck.healthyThreshold) {
        newStatus = 'healthy';
    }
    
    if (newStatus !== instance.status) {
        updateInstance(instanceId, { status: newStatus });
    }
    
    instances.set(instanceId, {
        ...instances.get(instanceId)!,
        lastHealthCheck: clock.nowMs(),
        lastHealthCheckResult: result,
    });
    
    const mutableStats = statistics as {
        healthChecksPassed: number;
        healthChecksFailed: number;
        avgHealthCheckDuration: number;
    };
    
    if (status === 'passing') {
        mutableStats.healthChecksPassed++;
    } else {
        mutableStats.healthChecksFailed++;
    }
    
    const totalChecks = mutableStats.healthChecksPassed + mutableStats.healthChecksFailed;
    mutableStats.avgHealthCheckDuration = (mutableStats.avgHealthCheckDuration * (totalChecks - 1) + duration) / totalChecks;
    
    return result;
}

/**
 * Get health check history
 */
export function getHealthCheckHistory(instanceId: string, limit: number = 100): readonly HealthCheckResult[] {
    const history = healthCheckHistory.get(instanceId) ?? [];
    return history.slice(-limit);
}

/**
 * Update TTL health check
 */
export function updateTtlHealthCheck(instanceId: string, status: 'passing' | 'warning' | 'critical', output: string = ''): boolean {
    const instance = instances.get(instanceId);
    if (!instance || instance.healthCheck.type !== 'ttl') {
        return false;
    }
    
    const checkId = generateCheckId();
    
    const result: HealthCheckResult = {
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
    
    let newStatus: ServiceStatus;
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
        ...instances.get(instanceId)!,
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
export function selectInstance(
    serviceId: string,
    options: {
        clientIp?: string;
        sessionId?: string;
        hashKey?: string;
    } = {}
): ServiceInstance | null {
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
    
    let selectedInstance: ServiceInstance | null = null;
    
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
export function getEndpoint(
    serviceId: string,
    options: {
        clientIp?: string;
        sessionId?: string;
        hashKey?: string;
    } = {}
): ServiceEndpoint | null {
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
export function getEndpoints(serviceId: string, options: ServiceQueryOptions = {}): readonly ServiceEndpoint[] {
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
export function recordConnectionStart(serviceId: string, instanceId: string): void {
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
export function recordConnectionEnd(serviceId: string, instanceId: string): void {
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
export function watchService(serviceId: string, callback: ServiceWatchCallback): () => void {
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
export function watchAll(callback: ServiceWatchCallback): () => void {
    return watchService('*', callback);
}

// ============================================================================
// DNS
// ============================================================================

/**
 * Get DNS records for service
 */
export function getDnsRecords(serviceName: string, namespace: string = 'default'): readonly DnsRecord[] {
    const service = getServiceByName(serviceName, namespace);
    if (!service) {
        return [];
    }
    
    const healthyInstances = getInstances(service.serviceId, { healthyOnly: true });
    const records: DnsRecord[] = [];
    
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
export function configure(newConfig: Partial<RegistryConfig>): void {
    config = { ...config, ...newConfig };
}

/**
 * Get configuration
 */
export function getConfig(): Readonly<RegistryConfig> {
    return { ...config };
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get statistics
 */
export function getStatistics(): Readonly<RegistryStatistics> {
    updateStatistics();
    return { ...statistics };
}

/**
 * Reset statistics
 */
export function resetStatistics(): void {
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
export function clearAll(): void {
    services.clear();
    instances.clear();
    serviceInstances.clear();
    watchers.clear();
    loadBalancerStates.clear();
    healthCheckHistory.clear();
    resetStatistics();
}
