/**
 * @file Failover Manager za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-RES-006 Failover management za zaledne sisteme
 * @design DSN-ZALEDNI-RES-006 Backend failover arhitektura
 * @test TEST-ZALEDNI-RES-006 Preverjanje failover management
 *
 * Failover Manager - prilagojen za zaledne sisteme:
 * - Primary/secondary failover
 * - Health monitoring
 * - Automatic failover
 * - Manual failover
 * - Failback support
 * - State synchronization
 * - Metrics collection
 * - Event notifications
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom RES_006 - Failover Manager
 */
/**
 * Node role
 */
export type NodeRole = 'primary' | 'secondary' | 'standby' | 'observer';
/**
 * Node status
 */
export type NodeStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown' | 'offline';
/**
 * Failover mode
 */
export type FailoverMode = 'automatic' | 'manual' | 'semi_automatic';
/**
 * Failover state
 */
export type FailoverState = 'stable' | 'failover_in_progress' | 'failback_in_progress' | 'split_brain' | 'degraded';
/**
 * Failover configuration
 */
export interface FailoverConfig {
    readonly configId: string;
    readonly name: string;
    readonly mode: FailoverMode;
    readonly healthCheckInterval: number;
    readonly healthCheckTimeout: number;
    readonly failoverThreshold: number;
    readonly failbackThreshold: number;
    readonly splitBrainResolution: SplitBrainResolution;
    readonly quorumSize: number;
    readonly enabled: boolean;
    readonly metadata: Readonly<Record<string, unknown>>;
}
/**
 * Split brain resolution strategy
 */
export type SplitBrainResolution = 'prefer_primary' | 'prefer_secondary' | 'quorum' | 'manual';
/**
 * Cluster node
 */
export interface ClusterNode {
    readonly nodeId: string;
    readonly configId: string;
    readonly name: string;
    readonly role: NodeRole;
    readonly status: NodeStatus;
    readonly endpoint: string;
    readonly priority: number;
    readonly lastHealthCheck: number | null;
    readonly consecutiveFailures: number;
    readonly consecutiveSuccesses: number;
    readonly metadata: Readonly<Record<string, unknown>>;
}
/**
 * Health check result
 */
export interface HealthCheckResult {
    readonly checkId: string;
    readonly nodeId: string;
    readonly timestamp: number;
    readonly healthy: boolean;
    readonly latency: number;
    readonly details: Readonly<Record<string, unknown>>;
}
/**
 * Failover event record
 */
export interface FailoverRecord {
    readonly recordId: string;
    readonly configId: string;
    readonly type: FailoverRecordType;
    readonly fromNodeId: string | null;
    readonly toNodeId: string | null;
    readonly reason: string;
    readonly timestamp: number;
    readonly duration: number | null;
    readonly success: boolean;
    readonly metadata: Readonly<Record<string, unknown>>;
}
/**
 * Failover record type
 */
export type FailoverRecordType = 'failover' | 'failback' | 'promotion' | 'demotion' | 'split_brain_resolution';
/**
 * Cluster state
 */
export interface ClusterState {
    readonly stateId: string;
    readonly configId: string;
    readonly state: FailoverState;
    readonly primaryNodeId: string | null;
    readonly secondaryNodeIds: readonly string[];
    readonly healthyNodeCount: number;
    readonly totalNodeCount: number;
    readonly lastStateChange: number;
    readonly lastFailover: number | null;
    readonly failoverCount: number;
}
/**
 * Failover event
 */
export interface FailoverEvent {
    readonly eventId: string;
    readonly type: FailoverEventType;
    readonly configId: string | null;
    readonly nodeId: string | null;
    readonly timestamp: number;
    readonly data: Readonly<Record<string, unknown>>;
}
/**
 * Failover event type
 */
export type FailoverEventType = 'config_created' | 'config_deleted' | 'node_added' | 'node_removed' | 'node_promoted' | 'node_demoted' | 'health_check_passed' | 'health_check_failed' | 'failover_started' | 'failover_completed' | 'failover_failed' | 'failback_started' | 'failback_completed' | 'failback_failed' | 'split_brain_detected' | 'split_brain_resolved' | 'state_changed';
/**
 * Failover event listener
 */
export type FailoverEventListener = (event: FailoverEvent) => void | Promise<void>;
/**
 * Health check function
 */
export type HealthCheckFunction = (node: ClusterNode) => Promise<HealthCheckResult>;
/**
 * Failover statistics
 */
export interface FailoverStatistics {
    readonly totalConfigs: number;
    readonly totalNodes: number;
    readonly healthyNodes: number;
    readonly unhealthyNodes: number;
    readonly totalFailovers: number;
    readonly successfulFailovers: number;
    readonly failedFailovers: number;
    readonly totalFailbacks: number;
    readonly averageFailoverDuration: number;
    readonly splitBrainEvents: number;
}
/**
 * Create failover config
 */
export declare function createFailoverConfig(name: string, options?: {
    mode?: FailoverMode;
    healthCheckInterval?: number;
    healthCheckTimeout?: number;
    failoverThreshold?: number;
    failbackThreshold?: number;
    splitBrainResolution?: SplitBrainResolution;
    quorumSize?: number;
    metadata?: Record<string, unknown>;
}): Promise<FailoverConfig>;
/**
 * Get failover config
 */
export declare function getFailoverConfig(nameOrId: string): FailoverConfig | null;
/**
 * Get all failover configs
 */
export declare function getAllFailoverConfigs(): readonly FailoverConfig[];
/**
 * Update failover config
 */
export declare function updateFailoverConfig(nameOrId: string, updates: {
    mode?: FailoverMode;
    healthCheckInterval?: number;
    healthCheckTimeout?: number;
    failoverThreshold?: number;
    failbackThreshold?: number;
    enabled?: boolean;
}): FailoverConfig | null;
/**
 * Delete failover config
 */
export declare function deleteFailoverConfig(nameOrId: string): Promise<boolean>;
/**
 * Add node
 */
export declare function addNode(nameOrId: string, nodeName: string, endpoint: string, role: NodeRole, options?: {
    priority?: number;
    metadata?: Record<string, unknown>;
}): Promise<ClusterNode>;
/**
 * Get node
 */
export declare function getNode(nameOrId: string): ClusterNode | null;
/**
 * Get all nodes
 */
export declare function getAllNodes(configNameOrId?: string): readonly ClusterNode[];
/**
 * Update node status
 */
export declare function updateNodeStatus(nameOrId: string, status: NodeStatus): Promise<ClusterNode | null>;
/**
 * Remove node
 */
export declare function removeNode(nameOrId: string): Promise<boolean>;
/**
 * Register health check function
 */
export declare function registerHealthCheck(nameOrId: string, healthCheck: HealthCheckFunction): boolean;
/**
 * Run health check
 */
export declare function runHealthCheck(nodeNameOrId: string): Promise<HealthCheckResult>;
/**
 * Run health checks for all nodes
 */
export declare function runAllHealthChecks(configNameOrId: string): Promise<readonly HealthCheckResult[]>;
/**
 * Trigger failover
 */
export declare function triggerFailover(configNameOrId: string, reason: string): Promise<FailoverRecord>;
/**
 * Trigger failback
 */
export declare function triggerFailback(configNameOrId: string, targetNodeNameOrId: string, reason: string): Promise<FailoverRecord>;
/**
 * Promote node
 */
export declare function promoteNode(nodeNameOrId: string): Promise<ClusterNode | null>;
/**
 * Demote node
 */
export declare function demoteNode(nodeNameOrId: string): Promise<ClusterNode | null>;
/**
 * Get cluster state
 */
export declare function getClusterState(configNameOrId: string): ClusterState | null;
/**
 * Get primary node
 */
export declare function getPrimaryNode(configNameOrId: string): ClusterNode | null;
/**
 * Get secondary nodes
 */
export declare function getSecondaryNodes(configNameOrId: string): readonly ClusterNode[];
/**
 * Get failover records
 */
export declare function getFailoverRecords(configNameOrId: string): readonly FailoverRecord[];
/**
 * Get statistics
 */
export declare function getStatistics(): Readonly<FailoverStatistics>;
/**
 * Reset statistics
 */
export declare function resetStatistics(): void;
/**
 * Add event listener
 */
export declare function addEventListener(listener: FailoverEventListener): void;
/**
 * Remove event listener
 */
export declare function removeEventListener(listener: FailoverEventListener): void;
/**
 * Clear event listeners
 */
export declare function clearEventListeners(): void;
/**
 * Clear all state
 */
export declare function clearAll(): void;
