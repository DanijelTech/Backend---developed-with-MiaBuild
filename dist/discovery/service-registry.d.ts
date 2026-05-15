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
export type ServiceEventType = 'service_registered' | 'service_deregistered' | 'service_updated' | 'instance_registered' | 'instance_deregistered' | 'instance_updated' | 'instance_healthy' | 'instance_unhealthy' | 'instance_maintenance' | 'instance_draining';
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
/**
 * Register service
 */
export declare function registerService(name: string, options?: {
    description?: string;
    namespace?: string;
    version?: string;
    protocol?: 'http' | 'https' | 'grpc' | 'tcp';
    loadBalancer?: Partial<LoadBalancerConfig>;
    healthCheck?: Partial<HealthCheckConfig>;
    metadata?: Record<string, string>;
    tags?: readonly string[];
}): ServiceDefinition;
/**
 * Deregister service
 */
export declare function deregisterService(serviceId: string): boolean;
/**
 * Update service
 */
export declare function updateService(serviceId: string, updates: Partial<Pick<ServiceDefinition, 'description' | 'version' | 'metadata' | 'tags'>>): ServiceDefinition | null;
/**
 * Get service
 */
export declare function getService(serviceId: string): ServiceDefinition | null;
/**
 * Get service by name
 */
export declare function getServiceByName(name: string, namespace?: string): ServiceDefinition | null;
/**
 * Get all services
 */
export declare function getAllServices(options?: ServiceQueryOptions): readonly ServiceDefinition[];
/**
 * Register instance
 */
export declare function registerInstance(serviceId: string, host: string, port: number, options?: {
    protocol?: 'http' | 'https' | 'grpc' | 'tcp';
    weight?: number;
    zone?: string;
    region?: string;
    version?: string;
    metadata?: Record<string, string>;
    tags?: readonly string[];
    healthCheck?: Partial<HealthCheckConfig>;
}): ServiceInstance | null;
/**
 * Deregister instance
 */
export declare function deregisterInstance(instanceId: string): boolean;
/**
 * Update instance
 */
export declare function updateInstance(instanceId: string, updates: Partial<Pick<ServiceInstance, 'weight' | 'metadata' | 'tags' | 'status'>>): ServiceInstance | null;
/**
 * Get instance
 */
export declare function getInstance(instanceId: string): ServiceInstance | null;
/**
 * Get instances for service
 */
export declare function getInstances(serviceId: string, options?: ServiceQueryOptions): readonly ServiceInstance[];
/**
 * Get all instances
 */
export declare function getAllInstances(options?: ServiceQueryOptions): readonly ServiceInstance[];
/**
 * Perform health check
 */
export declare function performHealthCheck(instanceId: string): Promise<HealthCheckResult>;
/**
 * Get health check history
 */
export declare function getHealthCheckHistory(instanceId: string, limit?: number): readonly HealthCheckResult[];
/**
 * Update TTL health check
 */
export declare function updateTtlHealthCheck(instanceId: string, status: 'passing' | 'warning' | 'critical', output?: string): boolean;
/**
 * Select instance for service
 */
export declare function selectInstance(serviceId: string, options?: {
    clientIp?: string;
    sessionId?: string;
    hashKey?: string;
}): ServiceInstance | null;
/**
 * Get service endpoint
 */
export declare function getEndpoint(serviceId: string, options?: {
    clientIp?: string;
    sessionId?: string;
    hashKey?: string;
}): ServiceEndpoint | null;
/**
 * Get all endpoints for service
 */
export declare function getEndpoints(serviceId: string, options?: ServiceQueryOptions): readonly ServiceEndpoint[];
/**
 * Record connection start
 */
export declare function recordConnectionStart(serviceId: string, instanceId: string): void;
/**
 * Record connection end
 */
export declare function recordConnectionEnd(serviceId: string, instanceId: string): void;
/**
 * Watch service
 */
export declare function watchService(serviceId: string, callback: ServiceWatchCallback): () => void;
/**
 * Watch all services
 */
export declare function watchAll(callback: ServiceWatchCallback): () => void;
/**
 * Get DNS records for service
 */
export declare function getDnsRecords(serviceName: string, namespace?: string): readonly DnsRecord[];
/**
 * Configure registry
 */
export declare function configure(newConfig: Partial<RegistryConfig>): void;
/**
 * Get configuration
 */
export declare function getConfig(): Readonly<RegistryConfig>;
/**
 * Get statistics
 */
export declare function getStatistics(): Readonly<RegistryStatistics>;
/**
 * Reset statistics
 */
export declare function resetStatistics(): void;
/**
 * Clear all state
 */
export declare function clearAll(): void;
