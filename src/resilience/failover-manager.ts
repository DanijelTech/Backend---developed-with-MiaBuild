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

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI ZA FAILOVER MANAGER
// ============================================================================

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
export type FailoverEventType =
    | 'config_created'
    | 'config_deleted'
    | 'node_added'
    | 'node_removed'
    | 'node_promoted'
    | 'node_demoted'
    | 'health_check_passed'
    | 'health_check_failed'
    | 'failover_started'
    | 'failover_completed'
    | 'failover_failed'
    | 'failback_started'
    | 'failback_completed'
    | 'failback_failed'
    | 'split_brain_detected'
    | 'split_brain_resolved'
    | 'state_changed';

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

// ============================================================================
// STANJE
// ============================================================================

const configs: Map<string, FailoverConfig> = new Map();
const nodes: Map<string, ClusterNode> = new Map();
const clusterStates: Map<string, ClusterState> = new Map();
const failoverRecords: Map<string, FailoverRecord[]> = new Map();
const healthCheckFunctions: Map<string, HealthCheckFunction> = new Map();
const eventListeners: Set<FailoverEventListener> = new Set();

let configCounter = 0;
let nodeCounter = 0;
let checkCounter = 0;
let recordCounter = 0;
let stateCounter = 0;
let eventCounter = 0;

const statistics: FailoverStatistics = {
    totalConfigs: 0,
    totalNodes: 0,
    healthyNodes: 0,
    unhealthyNodes: 0,
    totalFailovers: 0,
    successfulFailovers: 0,
    failedFailovers: 0,
    totalFailbacks: 0,
    averageFailoverDuration: 0,
    splitBrainEvents: 0,
};

// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================

/**
 * Generate config ID
 */
function generateConfigId(): string {
    configCounter++;
    return generateDeterministicId(`failover-config-${configCounter}`);
}

/**
 * Generate node ID
 */
function generateNodeId(): string {
    nodeCounter++;
    return generateDeterministicId(`cluster-node-${nodeCounter}`);
}

/**
 * Generate check ID
 */
function generateCheckId(): string {
    checkCounter++;
    return generateDeterministicId(`health-check-${checkCounter}`);
}

/**
 * Generate record ID
 */
function generateRecordId(): string {
    recordCounter++;
    return generateDeterministicId(`failover-record-${recordCounter}`);
}

/**
 * Generate state ID
 */
function generateStateId(): string {
    stateCounter++;
    return generateDeterministicId(`cluster-state-${stateCounter}`);
}

/**
 * Generate event ID
 */
function generateEventId(): string {
    eventCounter++;
    return generateDeterministicId(`failover-event-${eventCounter}`);
}

/**
 * Emit failover event
 */
async function emitEvent(event: FailoverEvent): Promise<void> {
    for (const listener of eventListeners) {
        try {
            await listener(event);
        } catch {
            // Ignore listener errors
        }
    }
}

/**
 * Update statistics
 */
function updateStatistics(): void {
    const mutableStats = statistics as {
        totalConfigs: number;
        totalNodes: number;
        healthyNodes: number;
        unhealthyNodes: number;
    };
    
    mutableStats.totalConfigs = configs.size;
    mutableStats.totalNodes = 0;
    mutableStats.healthyNodes = 0;
    mutableStats.unhealthyNodes = 0;
    
    const uniqueNodes = new Map<string, ClusterNode>();
    for (const node of nodes.values()) {
        uniqueNodes.set(node.nodeId, node);
    }
    
    for (const node of uniqueNodes.values()) {
        mutableStats.totalNodes++;
        if (node.status === 'healthy') {
            mutableStats.healthyNodes++;
        } else if (node.status === 'unhealthy' || node.status === 'offline') {
            mutableStats.unhealthyNodes++;
        }
    }
}

/**
 * Get nodes for config
 */
function getNodesForConfig(configId: string): ClusterNode[] {
    const result: ClusterNode[] = [];
    for (const node of nodes.values()) {
        if (node.configId === configId) {
            result.push(node);
        }
    }
    return result;
}

/**
 * Find best secondary for promotion
 */
function findBestSecondary(configId: string): ClusterNode | null {
    const configNodes = getNodesForConfig(configId);
    
    const candidates = configNodes
        .filter(n => n.role === 'secondary' && n.status === 'healthy')
        .sort((a, b) => b.priority - a.priority);
    
    return candidates[0] ?? null;
}

/**
 * Initialize cluster state
 */
function initializeClusterState(configId: string): ClusterState {
    const now = clock.nowMs();
    return {
        stateId: generateStateId(),
        configId,
        state: 'stable',
        primaryNodeId: null,
        secondaryNodeIds: [],
        healthyNodeCount: 0,
        totalNodeCount: 0,
        lastStateChange: now,
        lastFailover: null,
        failoverCount: 0,
    };
}

// ============================================================================
// CONFIG MANAGEMENT
// ============================================================================

/**
 * Create failover config
 */
export async function createFailoverConfig(
    name: string,
    options: {
        mode?: FailoverMode;
        healthCheckInterval?: number;
        healthCheckTimeout?: number;
        failoverThreshold?: number;
        failbackThreshold?: number;
        splitBrainResolution?: SplitBrainResolution;
        quorumSize?: number;
        metadata?: Record<string, unknown>;
    } = {}
): Promise<FailoverConfig> {
    const configId = generateConfigId();
    
    const config: FailoverConfig = {
        configId,
        name,
        mode: options.mode ?? 'automatic',
        healthCheckInterval: options.healthCheckInterval ?? 5000,
        healthCheckTimeout: options.healthCheckTimeout ?? 3000,
        failoverThreshold: options.failoverThreshold ?? 3,
        failbackThreshold: options.failbackThreshold ?? 5,
        splitBrainResolution: options.splitBrainResolution ?? 'prefer_primary',
        quorumSize: options.quorumSize ?? 2,
        enabled: true,
        metadata: options.metadata ?? {},
    };
    
    configs.set(configId, config);
    configs.set(name, config);
    
    clusterStates.set(configId, initializeClusterState(configId));
    failoverRecords.set(configId, []);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'config_created',
        configId,
        nodeId: null,
        timestamp: clock.nowMs(),
        data: { name },
    });
    
    updateStatistics();
    
    return config;
}

/**
 * Get failover config
 */
export function getFailoverConfig(nameOrId: string): FailoverConfig | null {
    return configs.get(nameOrId) ?? null;
}

/**
 * Get all failover configs
 */
export function getAllFailoverConfigs(): readonly FailoverConfig[] {
    const uniqueConfigs = new Map<string, FailoverConfig>();
    for (const config of configs.values()) {
        uniqueConfigs.set(config.configId, config);
    }
    return Array.from(uniqueConfigs.values());
}

/**
 * Update failover config
 */
export function updateFailoverConfig(
    nameOrId: string,
    updates: {
        mode?: FailoverMode;
        healthCheckInterval?: number;
        healthCheckTimeout?: number;
        failoverThreshold?: number;
        failbackThreshold?: number;
        enabled?: boolean;
    }
): FailoverConfig | null {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    
    const updatedConfig: FailoverConfig = {
        ...config,
        mode: updates.mode ?? config.mode,
        healthCheckInterval: updates.healthCheckInterval ?? config.healthCheckInterval,
        healthCheckTimeout: updates.healthCheckTimeout ?? config.healthCheckTimeout,
        failoverThreshold: updates.failoverThreshold ?? config.failoverThreshold,
        failbackThreshold: updates.failbackThreshold ?? config.failbackThreshold,
        enabled: updates.enabled ?? config.enabled,
    };
    
    configs.set(config.configId, updatedConfig);
    configs.set(config.name, updatedConfig);
    
    return updatedConfig;
}

/**
 * Delete failover config
 */
export async function deleteFailoverConfig(nameOrId: string): Promise<boolean> {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    
    const configNodes = getNodesForConfig(config.configId);
    for (const node of configNodes) {
        nodes.delete(node.nodeId);
        nodes.delete(node.name);
    }
    
    configs.delete(config.configId);
    configs.delete(config.name);
    clusterStates.delete(config.configId);
    failoverRecords.delete(config.configId);
    healthCheckFunctions.delete(config.configId);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'config_deleted',
        configId: config.configId,
        nodeId: null,
        timestamp: clock.nowMs(),
        data: {},
    });
    
    updateStatistics();
    
    return true;
}

// ============================================================================
// NODE MANAGEMENT
// ============================================================================

/**
 * Add node
 */
export async function addNode(
    nameOrId: string,
    nodeName: string,
    endpoint: string,
    role: NodeRole,
    options: {
        priority?: number;
        metadata?: Record<string, unknown>;
    } = {}
): Promise<ClusterNode> {
    const config = configs.get(nameOrId);
    if (!config) {
        throw new Error(`Failover config '${nameOrId}' not found`);
    }
    
    const nodeId = generateNodeId();
    
    const node: ClusterNode = {
        nodeId,
        configId: config.configId,
        name: nodeName,
        role,
        status: 'unknown',
        endpoint,
        priority: options.priority ?? 0,
        lastHealthCheck: null,
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        metadata: options.metadata ?? {},
    };
    
    nodes.set(nodeId, node);
    nodes.set(nodeName, node);
    
    const state = clusterStates.get(config.configId);
    if (state) {
        const updatedState: ClusterState = {
            ...state,
            totalNodeCount: state.totalNodeCount + 1,
            primaryNodeId: role === 'primary' ? nodeId : state.primaryNodeId,
            secondaryNodeIds: role === 'secondary' 
                ? [...state.secondaryNodeIds, nodeId] 
                : state.secondaryNodeIds,
        };
        clusterStates.set(config.configId, updatedState);
    }
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'node_added',
        configId: config.configId,
        nodeId,
        timestamp: clock.nowMs(),
        data: { name: nodeName, role, endpoint },
    });
    
    updateStatistics();
    
    return node;
}

/**
 * Get node
 */
export function getNode(nameOrId: string): ClusterNode | null {
    return nodes.get(nameOrId) ?? null;
}

/**
 * Get all nodes
 */
export function getAllNodes(configNameOrId?: string): readonly ClusterNode[] {
    if (configNameOrId) {
        const config = configs.get(configNameOrId);
        if (!config) {
            return [];
        }
        return getNodesForConfig(config.configId);
    }
    
    const uniqueNodes = new Map<string, ClusterNode>();
    for (const node of nodes.values()) {
        uniqueNodes.set(node.nodeId, node);
    }
    return Array.from(uniqueNodes.values());
}

/**
 * Update node status
 */
export async function updateNodeStatus(
    nameOrId: string,
    status: NodeStatus
): Promise<ClusterNode | null> {
    const node = nodes.get(nameOrId);
    if (!node) {
        return null;
    }
    
    const updatedNode: ClusterNode = {
        ...node,
        status,
        lastHealthCheck: clock.nowMs(),
    };
    
    nodes.set(node.nodeId, updatedNode);
    nodes.set(node.name, updatedNode);
    
    const state = clusterStates.get(node.configId);
    if (state) {
        const configNodes = getNodesForConfig(node.configId);
        const healthyCount = configNodes.filter(n => n.status === 'healthy').length;
        
        const updatedState: ClusterState = {
            ...state,
            healthyNodeCount: healthyCount,
        };
        clusterStates.set(node.configId, updatedState);
    }
    
    updateStatistics();
    
    return updatedNode;
}

/**
 * Remove node
 */
export async function removeNode(nameOrId: string): Promise<boolean> {
    const node = nodes.get(nameOrId);
    if (!node) {
        return false;
    }
    
    nodes.delete(node.nodeId);
    nodes.delete(node.name);
    
    const state = clusterStates.get(node.configId);
    if (state) {
        const updatedState: ClusterState = {
            ...state,
            totalNodeCount: state.totalNodeCount - 1,
            primaryNodeId: state.primaryNodeId === node.nodeId ? null : state.primaryNodeId,
            secondaryNodeIds: state.secondaryNodeIds.filter(id => id !== node.nodeId),
        };
        clusterStates.set(node.configId, updatedState);
    }
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'node_removed',
        configId: node.configId,
        nodeId: node.nodeId,
        timestamp: clock.nowMs(),
        data: {},
    });
    
    updateStatistics();
    
    return true;
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Register health check function
 */
export function registerHealthCheck(
    nameOrId: string,
    healthCheck: HealthCheckFunction
): boolean {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    
    healthCheckFunctions.set(config.configId, healthCheck);
    return true;
}

/**
 * Run health check
 */
export async function runHealthCheck(nodeNameOrId: string): Promise<HealthCheckResult> {
    const node = nodes.get(nodeNameOrId);
    if (!node) {
        throw new Error(`Node '${nodeNameOrId}' not found`);
    }
    
    const config = configs.get(node.configId);
    if (!config) {
        throw new Error(`Config for node '${nodeNameOrId}' not found`);
    }
    
    const healthCheck = healthCheckFunctions.get(config.configId);
    const startTime = clock.nowMs();
    
    let result: HealthCheckResult;
    
    if (healthCheck) {
        try {
            result = await healthCheck(node);
        } catch (error) {
            result = {
                checkId: generateCheckId(),
                nodeId: node.nodeId,
                timestamp: startTime,
                healthy: false,
                latency: clock.nowMs() - startTime,
                details: { error: error instanceof Error ? error.message : String(error) },
            };
        }
    } else {
        result = {
            checkId: generateCheckId(),
            nodeId: node.nodeId,
            timestamp: startTime,
            healthy: true,
            latency: clock.nowMs() - startTime,
            details: { message: 'Default health check (no custom function)' },
        };
    }
    
    const updatedNode: ClusterNode = {
        ...node,
        status: result.healthy ? 'healthy' : 'unhealthy',
        lastHealthCheck: result.timestamp,
        consecutiveFailures: result.healthy ? 0 : node.consecutiveFailures + 1,
        consecutiveSuccesses: result.healthy ? node.consecutiveSuccesses + 1 : 0,
    };
    
    nodes.set(node.nodeId, updatedNode);
    nodes.set(node.name, updatedNode);
    
    await emitEvent({
        eventId: generateEventId(),
        type: result.healthy ? 'health_check_passed' : 'health_check_failed',
        configId: node.configId,
        nodeId: node.nodeId,
        timestamp: result.timestamp,
        data: { latency: result.latency },
    });
    
    if (!result.healthy && updatedNode.consecutiveFailures >= config.failoverThreshold) {
        if (config.mode === 'automatic' && node.role === 'primary') {
            await triggerFailover(config.configId, 'Health check threshold exceeded');
        }
    }
    
    updateStatistics();
    
    return result;
}

/**
 * Run health checks for all nodes
 */
export async function runAllHealthChecks(configNameOrId: string): Promise<readonly HealthCheckResult[]> {
    const config = configs.get(configNameOrId);
    if (!config) {
        return [];
    }
    
    const configNodes = getNodesForConfig(config.configId);
    const results: HealthCheckResult[] = [];
    
    for (const node of configNodes) {
        const result = await runHealthCheck(node.nodeId);
        results.push(result);
    }
    
    return results;
}

// ============================================================================
// FAILOVER OPERATIONS
// ============================================================================

/**
 * Trigger failover
 */
export async function triggerFailover(
    configNameOrId: string,
    reason: string
): Promise<FailoverRecord> {
    const config = configs.get(configNameOrId);
    if (!config) {
        throw new Error(`Failover config '${configNameOrId}' not found`);
    }
    
    const state = clusterStates.get(config.configId);
    if (!state) {
        throw new Error(`Cluster state not found for '${configNameOrId}'`);
    }
    
    const now = clock.nowMs();
    const recordId = generateRecordId();
    
    const mutableStats = statistics as {
        totalFailovers: number;
        successfulFailovers: number;
        failedFailovers: number;
        averageFailoverDuration: number;
    };
    
    mutableStats.totalFailovers++;
    
    const updatedState: ClusterState = {
        ...state,
        state: 'failover_in_progress',
        lastStateChange: now,
    };
    clusterStates.set(config.configId, updatedState);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'failover_started',
        configId: config.configId,
        nodeId: state.primaryNodeId,
        timestamp: now,
        data: { reason },
    });
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'state_changed',
        configId: config.configId,
        nodeId: null,
        timestamp: now,
        data: { previousState: state.state, newState: 'failover_in_progress' },
    });
    
    const oldPrimaryId = state.primaryNodeId;
    const newPrimary = findBestSecondary(config.configId);
    
    if (!newPrimary) {
        const failedRecord: FailoverRecord = {
            recordId,
            configId: config.configId,
            type: 'failover',
            fromNodeId: oldPrimaryId,
            toNodeId: null,
            reason,
            timestamp: now,
            duration: clock.nowMs() - now,
            success: false,
            metadata: { error: 'No healthy secondary available' },
        };
        
        const records = failoverRecords.get(config.configId) ?? [];
        records.push(failedRecord);
        failoverRecords.set(config.configId, records);
        
        const failedState: ClusterState = {
            ...updatedState,
            state: 'degraded',
            lastStateChange: clock.nowMs(),
        };
        clusterStates.set(config.configId, failedState);
        
        mutableStats.failedFailovers++;
        
        await emitEvent({
            eventId: generateEventId(),
            type: 'failover_failed',
            configId: config.configId,
            nodeId: null,
            timestamp: clock.nowMs(),
            data: { reason: 'No healthy secondary available' },
        });
        
        return failedRecord;
    }
    
    if (oldPrimaryId) {
        const oldPrimary = nodes.get(oldPrimaryId);
        if (oldPrimary) {
            const demotedNode: ClusterNode = {
                ...oldPrimary,
                role: 'secondary',
            };
            nodes.set(oldPrimary.nodeId, demotedNode);
            nodes.set(oldPrimary.name, demotedNode);
            
            await emitEvent({
                eventId: generateEventId(),
                type: 'node_demoted',
                configId: config.configId,
                nodeId: oldPrimary.nodeId,
                timestamp: clock.nowMs(),
                data: { previousRole: 'primary', newRole: 'secondary' },
            });
        }
    }
    
    const promotedNode: ClusterNode = {
        ...newPrimary,
        role: 'primary',
    };
    nodes.set(newPrimary.nodeId, promotedNode);
    nodes.set(newPrimary.name, promotedNode);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'node_promoted',
        configId: config.configId,
        nodeId: newPrimary.nodeId,
        timestamp: clock.nowMs(),
        data: { previousRole: 'secondary', newRole: 'primary' },
    });
    
    const duration = clock.nowMs() - now;
    
    const successRecord: FailoverRecord = {
        recordId,
        configId: config.configId,
        type: 'failover',
        fromNodeId: oldPrimaryId,
        toNodeId: newPrimary.nodeId,
        reason,
        timestamp: now,
        duration,
        success: true,
        metadata: {},
    };
    
    const records = failoverRecords.get(config.configId) ?? [];
    records.push(successRecord);
    failoverRecords.set(config.configId, records);
    
    const finalState: ClusterState = {
        ...updatedState,
        state: 'stable',
        primaryNodeId: newPrimary.nodeId,
        secondaryNodeIds: state.secondaryNodeIds
            .filter(id => id !== newPrimary.nodeId)
            .concat(oldPrimaryId ? [oldPrimaryId] : []),
        lastStateChange: clock.nowMs(),
        lastFailover: clock.nowMs(),
        failoverCount: state.failoverCount + 1,
    };
    clusterStates.set(config.configId, finalState);
    
    mutableStats.successfulFailovers++;
    mutableStats.averageFailoverDuration = 
        (mutableStats.averageFailoverDuration * (mutableStats.successfulFailovers - 1) + duration) / 
        mutableStats.successfulFailovers;
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'failover_completed',
        configId: config.configId,
        nodeId: newPrimary.nodeId,
        timestamp: clock.nowMs(),
        data: { duration, fromNodeId: oldPrimaryId, toNodeId: newPrimary.nodeId },
    });
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'state_changed',
        configId: config.configId,
        nodeId: null,
        timestamp: clock.nowMs(),
        data: { previousState: 'failover_in_progress', newState: 'stable' },
    });
    
    updateStatistics();
    
    return successRecord;
}

/**
 * Trigger failback
 */
export async function triggerFailback(
    configNameOrId: string,
    targetNodeNameOrId: string,
    reason: string
): Promise<FailoverRecord> {
    const config = configs.get(configNameOrId);
    if (!config) {
        throw new Error(`Failover config '${configNameOrId}' not found`);
    }
    
    const targetNode = nodes.get(targetNodeNameOrId);
    if (!targetNode || targetNode.configId !== config.configId) {
        throw new Error(`Target node '${targetNodeNameOrId}' not found in config`);
    }
    
    if (targetNode.status !== 'healthy') {
        throw new Error(`Target node '${targetNodeNameOrId}' is not healthy`);
    }
    
    const state = clusterStates.get(config.configId);
    if (!state) {
        throw new Error(`Cluster state not found for '${configNameOrId}'`);
    }
    
    const now = clock.nowMs();
    const recordId = generateRecordId();
    
    const mutableStats = statistics as { totalFailbacks: number };
    mutableStats.totalFailbacks++;
    
    const updatedState: ClusterState = {
        ...state,
        state: 'failback_in_progress',
        lastStateChange: now,
    };
    clusterStates.set(config.configId, updatedState);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'failback_started',
        configId: config.configId,
        nodeId: targetNode.nodeId,
        timestamp: now,
        data: { reason },
    });
    
    const oldPrimaryId = state.primaryNodeId;
    
    if (oldPrimaryId && oldPrimaryId !== targetNode.nodeId) {
        const oldPrimary = nodes.get(oldPrimaryId);
        if (oldPrimary) {
            const demotedNode: ClusterNode = {
                ...oldPrimary,
                role: 'secondary',
            };
            nodes.set(oldPrimary.nodeId, demotedNode);
            nodes.set(oldPrimary.name, demotedNode);
        }
    }
    
    const promotedNode: ClusterNode = {
        ...targetNode,
        role: 'primary',
    };
    nodes.set(targetNode.nodeId, promotedNode);
    nodes.set(targetNode.name, promotedNode);
    
    const duration = clock.nowMs() - now;
    
    const record: FailoverRecord = {
        recordId,
        configId: config.configId,
        type: 'failback',
        fromNodeId: oldPrimaryId,
        toNodeId: targetNode.nodeId,
        reason,
        timestamp: now,
        duration,
        success: true,
        metadata: {},
    };
    
    const records = failoverRecords.get(config.configId) ?? [];
    records.push(record);
    failoverRecords.set(config.configId, records);
    
    const finalState: ClusterState = {
        ...updatedState,
        state: 'stable',
        primaryNodeId: targetNode.nodeId,
        secondaryNodeIds: state.secondaryNodeIds
            .filter(id => id !== targetNode.nodeId)
            .concat(oldPrimaryId && oldPrimaryId !== targetNode.nodeId ? [oldPrimaryId] : []),
        lastStateChange: clock.nowMs(),
    };
    clusterStates.set(config.configId, finalState);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'failback_completed',
        configId: config.configId,
        nodeId: targetNode.nodeId,
        timestamp: clock.nowMs(),
        data: { duration },
    });
    
    updateStatistics();
    
    return record;
}

/**
 * Promote node
 */
export async function promoteNode(nodeNameOrId: string): Promise<ClusterNode | null> {
    const node = nodes.get(nodeNameOrId);
    if (!node) {
        return null;
    }
    
    const promotedNode: ClusterNode = {
        ...node,
        role: 'primary',
    };
    
    nodes.set(node.nodeId, promotedNode);
    nodes.set(node.name, promotedNode);
    
    const state = clusterStates.get(node.configId);
    if (state) {
        const updatedState: ClusterState = {
            ...state,
            primaryNodeId: node.nodeId,
            secondaryNodeIds: state.secondaryNodeIds.filter(id => id !== node.nodeId),
        };
        clusterStates.set(node.configId, updatedState);
    }
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'node_promoted',
        configId: node.configId,
        nodeId: node.nodeId,
        timestamp: clock.nowMs(),
        data: { previousRole: node.role, newRole: 'primary' },
    });
    
    return promotedNode;
}

/**
 * Demote node
 */
export async function demoteNode(nodeNameOrId: string): Promise<ClusterNode | null> {
    const node = nodes.get(nodeNameOrId);
    if (!node) {
        return null;
    }
    
    const demotedNode: ClusterNode = {
        ...node,
        role: 'secondary',
    };
    
    nodes.set(node.nodeId, demotedNode);
    nodes.set(node.name, demotedNode);
    
    const state = clusterStates.get(node.configId);
    if (state && state.primaryNodeId === node.nodeId) {
        const updatedState: ClusterState = {
            ...state,
            primaryNodeId: null,
            secondaryNodeIds: [...state.secondaryNodeIds, node.nodeId],
        };
        clusterStates.set(node.configId, updatedState);
    }
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'node_demoted',
        configId: node.configId,
        nodeId: node.nodeId,
        timestamp: clock.nowMs(),
        data: { previousRole: node.role, newRole: 'secondary' },
    });
    
    return demotedNode;
}

// ============================================================================
// CLUSTER STATE
// ============================================================================

/**
 * Get cluster state
 */
export function getClusterState(configNameOrId: string): ClusterState | null {
    const config = configs.get(configNameOrId);
    if (!config) {
        return null;
    }
    return clusterStates.get(config.configId) ?? null;
}

/**
 * Get primary node
 */
export function getPrimaryNode(configNameOrId: string): ClusterNode | null {
    const state = getClusterState(configNameOrId);
    if (!state || !state.primaryNodeId) {
        return null;
    }
    return nodes.get(state.primaryNodeId) ?? null;
}

/**
 * Get secondary nodes
 */
export function getSecondaryNodes(configNameOrId: string): readonly ClusterNode[] {
    const state = getClusterState(configNameOrId);
    if (!state) {
        return [];
    }
    
    return state.secondaryNodeIds
        .map(id => nodes.get(id))
        .filter((node): node is ClusterNode => node !== undefined);
}

/**
 * Get failover records
 */
export function getFailoverRecords(configNameOrId: string): readonly FailoverRecord[] {
    const config = configs.get(configNameOrId);
    if (!config) {
        return [];
    }
    return failoverRecords.get(config.configId) ?? [];
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get statistics
 */
export function getStatistics(): Readonly<FailoverStatistics> {
    updateStatistics();
    return { ...statistics };
}

/**
 * Reset statistics
 */
export function resetStatistics(): void {
    Object.assign(statistics, {
        totalConfigs: 0,
        totalNodes: 0,
        healthyNodes: 0,
        unhealthyNodes: 0,
        totalFailovers: 0,
        successfulFailovers: 0,
        failedFailovers: 0,
        totalFailbacks: 0,
        averageFailoverDuration: 0,
        splitBrainEvents: 0,
    });
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Add event listener
 */
export function addEventListener(listener: FailoverEventListener): void {
    eventListeners.add(listener);
}

/**
 * Remove event listener
 */
export function removeEventListener(listener: FailoverEventListener): void {
    eventListeners.delete(listener);
}

/**
 * Clear event listeners
 */
export function clearEventListeners(): void {
    eventListeners.clear();
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Clear all state
 */
export function clearAll(): void {
    configs.clear();
    nodes.clear();
    clusterStates.clear();
    failoverRecords.clear();
    healthCheckFunctions.clear();
    eventListeners.clear();
    resetStatistics();
}
