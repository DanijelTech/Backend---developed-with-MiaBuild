/**
 * @file Query Optimizer za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-DB-002 Query optimization za zaledne sisteme
 * @design DSN-ZALEDNI-DB-002 Backend query optimization arhitektura
 * @test TEST-ZALEDNI-DB-002 Preverjanje query optimization
 *
 * Query Optimizer - prilagojen za zaledne sisteme:
 * - Query plan analysis
 * - Index recommendations
 * - Query rewriting
 * - Statistics collection
 * - Cost estimation
 * - Join optimization
 * - Subquery optimization
 * - Parallel query execution
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom DB_002 - Query Optimizer
 */
/**
 * Query plan node type
 */
export type PlanNodeType = 'SeqScan' | 'IndexScan' | 'IndexOnlyScan' | 'BitmapIndexScan' | 'BitmapHeapScan' | 'NestedLoop' | 'HashJoin' | 'MergeJoin' | 'Sort' | 'Hash' | 'Aggregate' | 'GroupAggregate' | 'HashAggregate' | 'Limit' | 'Append' | 'MergeAppend' | 'Result' | 'Materialize' | 'Unique' | 'SetOp' | 'LockRows' | 'ModifyTable' | 'Values' | 'CTE' | 'WorkTableScan' | 'RecursiveUnion' | 'SubqueryScan' | 'FunctionScan' | 'TableFunctionScan' | 'Gather' | 'GatherMerge';
/**
 * Query plan node
 */
export interface QueryPlanNode {
    readonly nodeId: string;
    readonly nodeType: PlanNodeType;
    readonly relationName: string | null;
    readonly alias: string | null;
    readonly startupCost: number;
    readonly totalCost: number;
    readonly planRows: number;
    readonly planWidth: number;
    readonly actualStartupTime: number | null;
    readonly actualTotalTime: number | null;
    readonly actualRows: number | null;
    readonly actualLoops: number | null;
    readonly output: readonly string[];
    readonly filter: string | null;
    readonly rowsRemovedByFilter: number | null;
    readonly indexName: string | null;
    readonly indexCond: string | null;
    readonly scanDirection: 'Forward' | 'Backward' | null;
    readonly joinType: 'Inner' | 'Left' | 'Right' | 'Full' | 'Semi' | 'Anti' | null;
    readonly joinFilter: string | null;
    readonly hashCond: string | null;
    readonly mergeCond: string | null;
    readonly sortKey: readonly string[] | null;
    readonly sortMethod: string | null;
    readonly sortSpaceUsed: number | null;
    readonly sortSpaceType: 'Memory' | 'Disk' | null;
    readonly groupKey: readonly string[] | null;
    readonly partialMode: 'Simple' | 'Partial' | 'Finalize' | null;
    readonly parallelAware: boolean;
    readonly workersPlanned: number | null;
    readonly workersLaunched: number | null;
    readonly children: readonly QueryPlanNode[];
}
/**
 * Query plan
 */
export interface QueryPlan {
    readonly planId: string;
    readonly query: string;
    readonly rootNode: QueryPlanNode;
    readonly planningTime: number;
    readonly executionTime: number | null;
    readonly totalCost: number;
    readonly estimatedRows: number;
    readonly actualRows: number | null;
    readonly sharedHitBlocks: number | null;
    readonly sharedReadBlocks: number | null;
    readonly sharedDirtiedBlocks: number | null;
    readonly sharedWrittenBlocks: number | null;
    readonly localHitBlocks: number | null;
    readonly localReadBlocks: number | null;
    readonly localDirtiedBlocks: number | null;
    readonly localWrittenBlocks: number | null;
    readonly tempReadBlocks: number | null;
    readonly tempWrittenBlocks: number | null;
    readonly triggers: readonly TriggerInfo[];
}
/**
 * Trigger info
 */
export interface TriggerInfo {
    readonly triggerName: string;
    readonly relation: string;
    readonly time: number;
    readonly calls: number;
}
/**
 * Index recommendation
 */
export interface IndexRecommendation {
    readonly recommendationId: string;
    readonly tableName: string;
    readonly columns: readonly string[];
    readonly indexType: 'btree' | 'hash' | 'gin' | 'gist' | 'spgist' | 'brin';
    readonly isUnique: boolean;
    readonly isPartial: boolean;
    readonly whereClause: string | null;
    readonly estimatedSizeBytes: number;
    readonly estimatedSpeedup: number;
    readonly affectedQueries: readonly string[];
    readonly createStatement: string;
    readonly priority: 'high' | 'medium' | 'low';
    readonly reason: string;
}
/**
 * Table statistics
 */
export interface TableStatistics {
    readonly tableName: string;
    readonly schemaName: string;
    readonly rowCount: number;
    readonly deadRowCount: number;
    readonly tableSize: number;
    readonly indexSize: number;
    readonly toastSize: number;
    readonly totalSize: number;
    readonly lastVacuum: number | null;
    readonly lastAutoVacuum: number | null;
    readonly lastAnalyze: number | null;
    readonly lastAutoAnalyze: number | null;
    readonly vacuumCount: number;
    readonly autoVacuumCount: number;
    readonly analyzeCount: number;
    readonly autoAnalyzeCount: number;
    readonly seqScan: number;
    readonly seqTupRead: number;
    readonly idxScan: number;
    readonly idxTupFetch: number;
    readonly nTupIns: number;
    readonly nTupUpd: number;
    readonly nTupDel: number;
    readonly nTupHotUpd: number;
    readonly nLiveTup: number;
    readonly nDeadTup: number;
    readonly nModSinceAnalyze: number;
    readonly columnStatistics: readonly ColumnStatistics[];
}
/**
 * Column statistics
 */
export interface ColumnStatistics {
    readonly columnName: string;
    readonly dataType: string;
    readonly nullFraction: number;
    readonly avgWidth: number;
    readonly nDistinct: number;
    readonly mostCommonValues: readonly unknown[];
    readonly mostCommonFreqs: readonly number[];
    readonly histogramBounds: readonly unknown[];
    readonly correlation: number;
}
/**
 * Index statistics
 */
export interface IndexStatistics {
    readonly indexName: string;
    readonly tableName: string;
    readonly schemaName: string;
    readonly indexSize: number;
    readonly idxScan: number;
    readonly idxTupRead: number;
    readonly idxTupFetch: number;
    readonly isUnique: boolean;
    readonly isPrimary: boolean;
    readonly isValid: boolean;
    readonly indexDef: string;
    readonly columns: readonly string[];
}
/**
 * Query analysis result
 */
export interface QueryAnalysisResult {
    readonly analysisId: string;
    readonly query: string;
    readonly queryHash: string;
    readonly plan: QueryPlan;
    readonly issues: readonly QueryIssue[];
    readonly recommendations: readonly IndexRecommendation[];
    readonly estimatedCost: number;
    readonly actualCost: number | null;
    readonly costRatio: number | null;
    readonly rowEstimateAccuracy: number | null;
    readonly analyzedAt: number;
}
/**
 * Query issue
 */
export interface QueryIssue {
    readonly issueId: string;
    readonly severity: 'critical' | 'warning' | 'info';
    readonly category: QueryIssueCategory;
    readonly message: string;
    readonly details: string;
    readonly affectedNode: string | null;
    readonly suggestion: string;
}
/**
 * Query issue category
 */
export type QueryIssueCategory = 'sequential_scan' | 'missing_index' | 'inefficient_join' | 'sort_on_disk' | 'high_cost' | 'row_estimate_mismatch' | 'unused_index' | 'implicit_cast' | 'function_in_where' | 'or_condition' | 'not_in_subquery' | 'correlated_subquery' | 'select_star' | 'missing_limit' | 'cartesian_product';
/**
 * Query rewrite rule
 */
export interface QueryRewriteRule {
    readonly ruleId: string;
    readonly name: string;
    readonly description: string;
    readonly pattern: RegExp;
    readonly rewrite: (query: string, matches: RegExpMatchArray) => string;
    readonly priority: number;
    readonly enabled: boolean;
}
/**
 * Cost model parameters
 */
export interface CostModelParameters {
    readonly seqPageCost: number;
    readonly randomPageCost: number;
    readonly cpuTupleCost: number;
    readonly cpuIndexTupleCost: number;
    readonly cpuOperatorCost: number;
    readonly parallelTuplesCost: number;
    readonly parallelSetupCost: number;
    readonly effectiveCacheSize: number;
    readonly workMem: number;
    readonly maintenanceWorkMem: number;
    readonly minParallelTableScanSize: number;
    readonly minParallelIndexScanSize: number;
    readonly maxParallelWorkersPerGather: number;
}
/**
 * Optimizer configuration
 */
export interface OptimizerConfig {
    readonly enableSeqScan: boolean;
    readonly enableIndexScan: boolean;
    readonly enableIndexOnlyScan: boolean;
    readonly enableBitmapScan: boolean;
    readonly enableTidScan: boolean;
    readonly enableSort: boolean;
    readonly enableHashAgg: boolean;
    readonly enableHashJoin: boolean;
    readonly enableMergeJoin: boolean;
    readonly enableNestedLoop: boolean;
    readonly enableMaterial: boolean;
    readonly enablePartitionPruning: boolean;
    readonly enableParallelAppend: boolean;
    readonly enableParallelHash: boolean;
    readonly enablePartitionwiseJoin: boolean;
    readonly enablePartitionwiseAggregate: boolean;
    readonly costModel: CostModelParameters;
}
/**
 * Query cache entry
 */
export interface QueryCacheEntry {
    readonly queryHash: string;
    readonly query: string;
    readonly plan: QueryPlan;
    readonly cachedAt: number;
    readonly hitCount: number;
    readonly lastHitAt: number;
    readonly ttl: number;
}
/**
 * Optimizer statistics
 */
export interface OptimizerStatistics {
    readonly totalQueries: number;
    readonly cachedQueries: number;
    readonly cacheHits: number;
    readonly cacheMisses: number;
    readonly cacheHitRatio: number;
    readonly avgPlanningTime: number;
    readonly avgExecutionTime: number;
    readonly totalPlanningTime: number;
    readonly totalExecutionTime: number;
    readonly rewrittenQueries: number;
    readonly indexRecommendations: number;
    readonly issuesDetected: number;
}
/**
 * Analyze query plan
 */
export declare function analyzeQueryPlan(plan: QueryPlan): readonly QueryIssue[];
/**
 * Generate index recommendations from query plan
 */
export declare function generateIndexRecommendations(plan: QueryPlan, tableStats: readonly TableStatistics[]): readonly IndexRecommendation[];
/**
 * Register query rewrite rule
 */
export declare function registerRewriteRule(rule: QueryRewriteRule): void;
/**
 * Unregister query rewrite rule
 */
export declare function unregisterRewriteRule(ruleId: string): void;
/**
 * Apply rewrite rules to query
 */
export declare function rewriteQuery(query: string): {
    rewritten: string;
    appliedRules: readonly string[];
};
/**
 * Initialize default rewrite rules
 */
export declare function initializeDefaultRewriteRules(): void;
/**
 * Get cached query plan
 */
export declare function getCachedPlan(query: string): QueryPlan | null;
/**
 * Cache query plan
 */
export declare function cachePlan(query: string, plan: QueryPlan, ttl?: number): void;
/**
 * Invalidate cached plan
 */
export declare function invalidateCachedPlan(query: string): void;
/**
 * Invalidate all cached plans for table
 */
export declare function invalidateCachedPlansForTable(tableName: string): void;
/**
 * Clear query cache
 */
export declare function clearQueryCache(): void;
/**
 * Get cache statistics
 */
export declare function getCacheStatistics(): {
    size: number;
    hitRate: number;
    avgAge: number;
    oldestEntry: number;
    newestEntry: number;
};
/**
 * Configure optimizer
 */
export declare function configureOptimizer(newConfig: Partial<OptimizerConfig>): void;
/**
 * Get optimizer configuration
 */
export declare function getOptimizerConfig(): Readonly<OptimizerConfig>;
/**
 * Reset optimizer configuration to defaults
 */
export declare function resetOptimizerConfig(): void;
/**
 * Get optimizer statistics
 */
export declare function getOptimizerStatistics(): Readonly<OptimizerStatistics>;
/**
 * Reset optimizer statistics
 */
export declare function resetOptimizerStatistics(): void;
/**
 * Analyze query
 */
export declare function analyzeQuery(query: string, plan: QueryPlan, tableStats: readonly TableStatistics[]): QueryAnalysisResult;
/**
 * Get all rewrite rules
 */
export declare function getRewriteRules(): readonly QueryRewriteRule[];
/**
 * Clear all rewrite rules
 */
export declare function clearRewriteRules(): void;
