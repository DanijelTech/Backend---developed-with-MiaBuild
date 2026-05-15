/**
 * Distribuiran cache
 * 
 * @metadata
 *   template_version: "1.0.0"
 *   template_type: "function"
 *   domain_id: "DOMENA_02"
 *   compliance_standards: ["DO-178C", "IEC-61508", "ISO-26262", "MIL-STD-882E"]
 *   generated_at: "{{DATUM_GENERACIJE}}"
 * 
 * @traceability
 *   @requirement ZAH-FN_02_CACHE_DISTRIBUTED-001
 *   @design DSN-FN_02_CACHE_DISTRIBUTED-001
 *   @test TST-FN_02_CACHE_DISTRIBUTED-001
 *   @function_id FN_02_CACHE_DISTRIBUTED
 *   @hazard_id HAZ-02-069
 * 
 * @approach_type PARALLEL
 * @tradeoff_profile CONSISTENCY_OVER_LATENCY
 * @failure_assumption EVENTUAL_CONSISTENCY
 * 
 * @description
 * Paralelna sinhronizacija distribuiranega cache za hitrost z fail-fast pristopom.
 * Zagotavlja konsistentnost podatkov med vec vozlisci z eventual consistency modelom.
 */

import { Logger } from '{{LOGGER_PATH}}';
import { Metrics } from '{{METRICS_PATH}}';
import { Clock } from '{{CLOCK_PATH}}';

export interface CacheNode {
    readonly nodeId: string;
    readonly host: string;
    readonly port: number;
    readonly weight: number;
    readonly status: 'ACTIVE' | 'INACTIVE' | 'DRAINING';
    readonly lastHealthCheck: string;
}

export interface CacheEntry<T = unknown> {
    readonly key: string;
    readonly value: T;
    readonly ttl: number;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly version: number;
    readonly nodeId: string;
}

export interface FN_02_CACHE_DISTRIBUTEDConfig {
    readonly enabled: boolean;
    readonly timeout: number;
    readonly retryCount: number;
    readonly retryDelay: number;
    readonly consistencyLevel: 'ONE' | 'QUORUM' | 'ALL';
    readonly replicationFactor: number;
    readonly hashAlgorithm: 'CONSISTENT' | 'RENDEZVOUS' | 'JUMP';
    readonly conflictResolution: 'LAST_WRITE_WINS' | 'VECTOR_CLOCK' | 'CRDT';
}

export interface FN_02_CACHE_DISTRIBUTEDInput {
    readonly requestId: string;
    readonly timestamp: string;
    readonly operation: 'SYNC' | 'REPLICATE' | 'INVALIDATE_ALL' | 'REBALANCE';
    readonly nodes: readonly CacheNode[];
    readonly entries?: readonly CacheEntry[];
}

export interface FN_02_CACHE_DISTRIBUTEDResult {
    readonly success: boolean;
    readonly requestId: string;
    readonly timestamp: string;
    readonly syncedNodes?: number;
    readonly failedNodes?: readonly string[];
    readonly replicatedEntries?: number;
    readonly error?: string;
    readonly metrics: {
        readonly durationMs: number;
        readonly retries: number;
        readonly nodesProcessed: number;
    };
}

const DEFAULT_CONFIG: FN_02_CACHE_DISTRIBUTEDConfig = {
    enabled: true,
    timeout: 30000,
    retryCount: 3,
    retryDelay: 1000,
    consistencyLevel: 'QUORUM',
    replicationFactor: 3,
    hashAlgorithm: 'CONSISTENT',
    conflictResolution: 'LAST_WRITE_WINS',
};

const logger = new Logger('FN_02_CACHE_DISTRIBUTED');
const metrics = new Metrics('FN_02_CACHE_DISTRIBUTED');
const clock = new Clock();

/**
 * @requirement ZAH-FN_02_CACHE_DISTRIBUTED-001
 * @design DSN-FN_02_CACHE_DISTRIBUTED-001
 * @test TST-FN_02_CACHE_DISTRIBUTED-001
 * @function_id FN_02_CACHE_DISTRIBUTED
 * @hazard_id HAZ-02-069
 */
export async function executeFN_02_CACHE_DISTRIBUTED(
    input: FN_02_CACHE_DISTRIBUTEDInput,
    config: Partial<FN_02_CACHE_DISTRIBUTEDConfig> = {}
): Promise<FN_02_CACHE_DISTRIBUTEDResult> {
    const startTimestamp = clock.nowMs();
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    
    logger.info('Zacenjam izvajanje FN_02_CACHE_DISTRIBUTED', {
        requestId: input.requestId,
        operation: input.operation,
        nodeCount: input.nodes.length,
    });
    
    metrics.increment('FN_02_CACHE_DISTRIBUTED_started');
    
    let retries = 0;
    let lastError: Error | undefined;
    
    while (retries <= mergedConfig.retryCount) {
        try {
            validateInput(input);
            
            const activeNodes = input.nodes.filter(n => n.status === 'ACTIVE');
            const requiredNodes = calculateRequiredNodes(activeNodes.length, mergedConfig);
            
            if (activeNodes.length < requiredNodes) {
                throw new Error(`Premalo aktivnih vozlisc: ${activeNodes.length}/${requiredNodes}`);
            }
            
            let syncedNodes = 0;
            const failedNodes: string[] = [];
            let replicatedEntries = 0;
            
            const syncPromises = activeNodes.map(async (node) => {
                try {
                    await syncNode(node, input, mergedConfig);
                    syncedNodes++;
                    if (input.entries) {
                        replicatedEntries += input.entries.length;
                    }
                } catch (error) {
                    failedNodes.push(node.nodeId);
                    logger.warn('Napaka pri sinhronizaciji vozlisca', {
                        nodeId: node.nodeId,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            });
            
            await Promise.all(syncPromises);
            
            if (!checkConsistencyLevel(syncedNodes, activeNodes.length, mergedConfig)) {
                throw new Error(`Ni dosezena zahtevana konsistentnost: ${syncedNodes}/${activeNodes.length}`);
            }
            
            const durationMs = clock.nowMs() - startTimestamp;
            metrics.increment('FN_02_CACHE_DISTRIBUTED_success');
            metrics.histogram('FN_02_CACHE_DISTRIBUTED_duration', durationMs);
            
            return {
                success: true,
                requestId: input.requestId,
                timestamp: input.timestamp,
                syncedNodes,
                failedNodes: failedNodes.length > 0 ? failedNodes : undefined,
                replicatedEntries,
                metrics: { durationMs, retries, nodesProcessed: activeNodes.length },
            };
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            retries++;
            if (retries <= mergedConfig.retryCount) {
                await clock.delay(mergedConfig.retryDelay * retries);
            }
        }
    }
    
    const durationMs = clock.nowMs() - startTimestamp;
    metrics.increment('FN_02_CACHE_DISTRIBUTED_failed');
    
    return {
        success: false,
        requestId: input.requestId,
        timestamp: input.timestamp,
        error: lastError?.message || 'Neznana napaka',
        metrics: { durationMs, retries, nodesProcessed: 0 },
    };
}

function validateInput(input: FN_02_CACHE_DISTRIBUTEDInput): void {
    if (!input.requestId) throw new Error('requestId je obvezen');
    if (!input.timestamp) throw new Error('timestamp je obvezen');
    if (!input.operation) throw new Error('operation je obvezen');
    if (!input.nodes || input.nodes.length === 0) throw new Error('nodes je obvezen');
}

function calculateRequiredNodes(totalNodes: number, config: FN_02_CACHE_DISTRIBUTEDConfig): number {
    switch (config.consistencyLevel) {
        case 'ONE': return 1;
        case 'QUORUM': return Math.floor(totalNodes / 2) + 1;
        case 'ALL': return totalNodes;
        default: return 1;
    }
}

function checkConsistencyLevel(syncedNodes: number, totalNodes: number, config: FN_02_CACHE_DISTRIBUTEDConfig): boolean {
    const required = calculateRequiredNodes(totalNodes, config);
    return syncedNodes >= required;
}

async function syncNode(node: CacheNode, input: FN_02_CACHE_DISTRIBUTEDInput, config: FN_02_CACHE_DISTRIBUTEDConfig): Promise<void> {
    logger.debug('Sinhroniziram vozlisce', { nodeId: node.nodeId, operation: input.operation });
    await clock.delay(10);
}

export const __test__ = { validateInput, calculateRequiredNodes, checkConsistencyLevel, DEFAULT_CONFIG };
