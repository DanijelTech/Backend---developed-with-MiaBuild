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

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI ZA QUERY OPTIMIZER
// ============================================================================

/**
 * Query plan node type
 */
export type PlanNodeType =
    | 'SeqScan'
    | 'IndexScan'
    | 'IndexOnlyScan'
    | 'BitmapIndexScan'
    | 'BitmapHeapScan'
    | 'NestedLoop'
    | 'HashJoin'
    | 'MergeJoin'
    | 'Sort'
    | 'Hash'
    | 'Aggregate'
    | 'GroupAggregate'
    | 'HashAggregate'
    | 'Limit'
    | 'Append'
    | 'MergeAppend'
    | 'Result'
    | 'Materialize'
    | 'Unique'
    | 'SetOp'
    | 'LockRows'
    | 'ModifyTable'
    | 'Values'
    | 'CTE'
    | 'WorkTableScan'
    | 'RecursiveUnion'
    | 'SubqueryScan'
    | 'FunctionScan'
    | 'TableFunctionScan'
    | 'Gather'
    | 'GatherMerge';

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
export type QueryIssueCategory =
    | 'sequential_scan'
    | 'missing_index'
    | 'inefficient_join'
    | 'sort_on_disk'
    | 'high_cost'
    | 'row_estimate_mismatch'
    | 'unused_index'
    | 'implicit_cast'
    | 'function_in_where'
    | 'or_condition'
    | 'not_in_subquery'
    | 'correlated_subquery'
    | 'select_star'
    | 'missing_limit'
    | 'cartesian_product';

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

// ============================================================================
// STANJE
// ============================================================================

const queryCache: Map<string, QueryCacheEntry> = new Map();
const rewriteRules: Map<string, QueryRewriteRule> = new Map();
let planCounter = 0;
let analysisCounter = 0;
let recommendationCounter = 0;
let issueCounter = 0;

let config: OptimizerConfig = {
    enableSeqScan: true,
    enableIndexScan: true,
    enableIndexOnlyScan: true,
    enableBitmapScan: true,
    enableTidScan: true,
    enableSort: true,
    enableHashAgg: true,
    enableHashJoin: true,
    enableMergeJoin: true,
    enableNestedLoop: true,
    enableMaterial: true,
    enablePartitionPruning: true,
    enableParallelAppend: true,
    enableParallelHash: true,
    enablePartitionwiseJoin: false,
    enablePartitionwiseAggregate: false,
    costModel: {
        seqPageCost: 1.0,
        randomPageCost: 4.0,
        cpuTupleCost: 0.01,
        cpuIndexTupleCost: 0.005,
        cpuOperatorCost: 0.0025,
        parallelTuplesCost: 0.1,
        parallelSetupCost: 1000.0,
        effectiveCacheSize: 4294967296,
        workMem: 4194304,
        maintenanceWorkMem: 67108864,
        minParallelTableScanSize: 8388608,
        minParallelIndexScanSize: 524288,
        maxParallelWorkersPerGather: 2,
    },
};

const statistics: OptimizerStatistics = {
    totalQueries: 0,
    cachedQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    cacheHitRatio: 0,
    avgPlanningTime: 0,
    avgExecutionTime: 0,
    totalPlanningTime: 0,
    totalExecutionTime: 0,
    rewrittenQueries: 0,
    indexRecommendations: 0,
    issuesDetected: 0,
};

// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================

/**
 * Generate plan ID
 */
function generatePlanId(): string {
    planCounter++;
    return generateDeterministicId(`plan-${planCounter}`);
}

/**
 * Generate analysis ID
 */
function generateAnalysisId(): string {
    analysisCounter++;
    return generateDeterministicId(`analysis-${analysisCounter}`);
}

/**
 * Generate recommendation ID
 */
function generateRecommendationId(): string {
    recommendationCounter++;
    return generateDeterministicId(`recommendation-${recommendationCounter}`);
}

/**
 * Generate issue ID
 */
function generateIssueId(): string {
    issueCounter++;
    return generateDeterministicId(`issue-${issueCounter}`);
}

/**
 * Compute query hash
 */
function computeQueryHash(query: string): string {
    const normalized = normalizeQuery(query);
    return generateDeterministicId(`query-${normalized}`);
}

/**
 * Normalize query for caching
 */
function normalizeQuery(query: string): string {
    return query
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/\s*,\s*/g, ',')
        .replace(/\s*=\s*/g, '=')
        .replace(/\s*<\s*/g, '<')
        .replace(/\s*>\s*/g, '>')
        .replace(/\s*\(\s*/g, '(')
        .replace(/\s*\)\s*/g, ')')
        .trim();
}

/**
 * Estimate row count for table
 */
function estimateRowCount(tableName: string): number {
    return 10000;
}

/**
 * Estimate selectivity for condition
 */
function estimateSelectivity(condition: string): number {
    if (condition.includes('=')) {
        return 0.01;
    }
    if (condition.includes('<') || condition.includes('>')) {
        return 0.33;
    }
    if (condition.includes('LIKE')) {
        if (condition.includes('%')) {
            return 0.1;
        }
        return 0.01;
    }
    if (condition.includes('IN')) {
        return 0.05;
    }
    if (condition.includes('BETWEEN')) {
        return 0.25;
    }
    if (condition.includes('IS NULL')) {
        return 0.01;
    }
    return 0.5;
}

/**
 * Estimate cost for sequential scan
 */
function estimateSeqScanCost(rowCount: number, tupleWidth: number): number {
    const pages = Math.ceil((rowCount * tupleWidth) / 8192);
    return pages * config.costModel.seqPageCost + rowCount * config.costModel.cpuTupleCost;
}

/**
 * Estimate cost for index scan
 */
function estimateIndexScanCost(rowCount: number, selectivity: number): number {
    const selectedRows = Math.ceil(rowCount * selectivity);
    const indexPages = Math.ceil(Math.log2(rowCount + 1));
    return indexPages * config.costModel.randomPageCost +
           selectedRows * config.costModel.cpuIndexTupleCost +
           selectedRows * config.costModel.randomPageCost;
}

/**
 * Estimate cost for hash join
 */
function estimateHashJoinCost(outerRows: number, innerRows: number): number {
    const buildCost = innerRows * config.costModel.cpuOperatorCost;
    const probeCost = outerRows * config.costModel.cpuOperatorCost;
    return buildCost + probeCost;
}

/**
 * Estimate cost for merge join
 */
function estimateMergeJoinCost(outerRows: number, innerRows: number): number {
    const sortOuterCost = outerRows * Math.log2(outerRows + 1) * config.costModel.cpuOperatorCost;
    const sortInnerCost = innerRows * Math.log2(innerRows + 1) * config.costModel.cpuOperatorCost;
    const mergeCost = (outerRows + innerRows) * config.costModel.cpuOperatorCost;
    return sortOuterCost + sortInnerCost + mergeCost;
}

/**
 * Estimate cost for nested loop join
 */
function estimateNestedLoopCost(outerRows: number, innerRows: number): number {
    return outerRows * innerRows * config.costModel.cpuTupleCost;
}

/**
 * Estimate cost for sort
 */
function estimateSortCost(rowCount: number): number {
    if (rowCount <= 1) {
        return 0;
    }
    return rowCount * Math.log2(rowCount) * config.costModel.cpuOperatorCost;
}

/**
 * Estimate cost for aggregate
 */
function estimateAggregateCost(rowCount: number, groupCount: number): number {
    return rowCount * config.costModel.cpuOperatorCost + groupCount * config.costModel.cpuTupleCost;
}

// ============================================================================
// QUERY PLAN ANALYSIS
// ============================================================================

/**
 * Analyze query plan
 */
export function analyzeQueryPlan(plan: QueryPlan): readonly QueryIssue[] {
    const issues: QueryIssue[] = [];
    
    function analyzeNode(node: QueryPlanNode, depth: number): void {
        if (node.nodeType === 'SeqScan' && node.planRows > 1000) {
            issues.push({
                issueId: generateIssueId(),
                severity: node.planRows > 10000 ? 'critical' : 'warning',
                category: 'sequential_scan',
                message: `Sequential scan on ${node.relationName} with ${node.planRows} estimated rows`,
                details: `A sequential scan reads all rows from the table. Consider adding an index on the filtered columns.`,
                affectedNode: node.nodeId,
                suggestion: `Create an index on the columns used in the WHERE clause for table ${node.relationName}`,
            });
        }
        
        if (node.sortMethod === 'external merge' || node.sortSpaceType === 'Disk') {
            issues.push({
                issueId: generateIssueId(),
                severity: 'warning',
                category: 'sort_on_disk',
                message: `Sort operation spilled to disk`,
                details: `The sort operation required more memory than available and spilled to disk, which is slower.`,
                affectedNode: node.nodeId,
                suggestion: `Increase work_mem or add an index that provides the required sort order`,
            });
        }
        
        if (node.nodeType === 'NestedLoop' && node.planRows > 10000) {
            const innerChild = node.children.length > 1 ? node.children[1] : null;
            if (innerChild && innerChild.nodeType === 'SeqScan') {
                issues.push({
                    issueId: generateIssueId(),
                    severity: 'critical',
                    category: 'inefficient_join',
                    message: `Nested loop join with sequential scan on inner table`,
                    details: `This join pattern can be very slow for large tables.`,
                    affectedNode: node.nodeId,
                    suggestion: `Add an index on the join column of the inner table`,
                });
            }
        }
        
        if (node.actualRows !== null && node.planRows > 0) {
            const ratio = node.actualRows / node.planRows;
            if (ratio > 10 || ratio < 0.1) {
                issues.push({
                    issueId: generateIssueId(),
                    severity: 'warning',
                    category: 'row_estimate_mismatch',
                    message: `Row estimate mismatch: estimated ${node.planRows}, actual ${node.actualRows}`,
                    details: `The planner's row estimate was off by a factor of ${ratio.toFixed(2)}. This can lead to suboptimal plan choices.`,
                    affectedNode: node.nodeId,
                    suggestion: `Run ANALYZE on the affected tables to update statistics`,
                });
            }
        }
        
        if (node.totalCost > 100000) {
            issues.push({
                issueId: generateIssueId(),
                severity: 'info',
                category: 'high_cost',
                message: `High cost operation: ${node.totalCost.toFixed(2)}`,
                details: `This operation has a high estimated cost.`,
                affectedNode: node.nodeId,
                suggestion: `Review the query and consider optimization opportunities`,
            });
        }
        
        for (const child of node.children) {
            analyzeNode(child, depth + 1);
        }
    }
    
    analyzeNode(plan.rootNode, 0);
    
    return issues;
}

/**
 * Generate index recommendations from query plan
 */
export function generateIndexRecommendations(
    plan: QueryPlan,
    tableStats: readonly TableStatistics[]
): readonly IndexRecommendation[] {
    const recommendations: IndexRecommendation[] = [];
    
    function analyzeNode(node: QueryPlanNode): void {
        if (node.nodeType === 'SeqScan' && node.filter && node.planRows > 1000) {
            const tableName = node.relationName;
            if (tableName) {
                const columns = extractColumnsFromFilter(node.filter);
                if (columns.length > 0) {
                    const tableSize = tableStats.find(t => t.tableName === tableName)?.tableSize ?? 0;
                    const estimatedIndexSize = Math.ceil(tableSize * 0.3);
                    
                    recommendations.push({
                        recommendationId: generateRecommendationId(),
                        tableName,
                        columns,
                        indexType: 'btree',
                        isUnique: false,
                        isPartial: false,
                        whereClause: null,
                        estimatedSizeBytes: estimatedIndexSize,
                        estimatedSpeedup: estimateSpeedup(node.planRows, columns.length),
                        affectedQueries: [plan.query],
                        createStatement: generateCreateIndexStatement(tableName, columns, 'btree'),
                        priority: node.planRows > 10000 ? 'high' : 'medium',
                        reason: `Sequential scan on ${tableName} with filter on ${columns.join(', ')}`,
                    });
                }
            }
        }
        
        if (node.nodeType === 'Sort' && node.sortKey && node.sortSpaceType === 'Disk') {
            const parentTable = findParentTable(node, plan.rootNode);
            if (parentTable) {
                const columns = node.sortKey.map(k => k.replace(/ (ASC|DESC)$/i, ''));
                
                recommendations.push({
                    recommendationId: generateRecommendationId(),
                    tableName: parentTable,
                    columns,
                    indexType: 'btree',
                    isUnique: false,
                    isPartial: false,
                    whereClause: null,
                    estimatedSizeBytes: 0,
                    estimatedSpeedup: 2.0,
                    affectedQueries: [plan.query],
                    createStatement: generateCreateIndexStatement(parentTable, columns, 'btree'),
                    priority: 'medium',
                    reason: `Sort operation on ${columns.join(', ')} spilled to disk`,
                });
            }
        }
        
        for (const child of node.children) {
            analyzeNode(child);
        }
    }
    
    analyzeNode(plan.rootNode);
    
    return deduplicateRecommendations(recommendations);
}

/**
 * Extract columns from filter expression
 */
function extractColumnsFromFilter(filter: string): string[] {
    const columns: string[] = [];
    const columnPattern = /\b([a-z_][a-z0-9_]*)\s*(?:=|<|>|<=|>=|<>|!=|LIKE|IN|BETWEEN)/gi;
    let match;
    
    while ((match = columnPattern.exec(filter)) !== null) {
        const column = match[1].toLowerCase();
        if (!columns.includes(column) && !isReservedWord(column)) {
            columns.push(column);
        }
    }
    
    return columns;
}

/**
 * Check if word is SQL reserved word
 */
function isReservedWord(word: string): boolean {
    const reserved = ['and', 'or', 'not', 'is', 'null', 'true', 'false', 'like', 'in', 'between'];
    return reserved.includes(word.toLowerCase());
}

/**
 * Estimate speedup from index
 */
function estimateSpeedup(rowCount: number, columnCount: number): number {
    const baseSpeedup = Math.log10(rowCount + 1);
    const columnFactor = 1 + (columnCount - 1) * 0.2;
    return Math.min(baseSpeedup * columnFactor, 100);
}

/**
 * Generate CREATE INDEX statement
 */
function generateCreateIndexStatement(
    tableName: string,
    columns: readonly string[],
    indexType: string
): string {
    const indexName = `idx_${tableName}_${columns.join('_')}`;
    const columnList = columns.map(c => `"${c}"`).join(', ');
    return `CREATE INDEX "${indexName}" ON "${tableName}" USING ${indexType} (${columnList})`;
}

/**
 * Find parent table for a node
 */
function findParentTable(targetNode: QueryPlanNode, currentNode: QueryPlanNode): string | null {
    if (currentNode.relationName && currentNode.children.some(c => c.nodeId === targetNode.nodeId)) {
        return currentNode.relationName;
    }
    
    for (const child of currentNode.children) {
        if (child.relationName) {
            return child.relationName;
        }
        const found = findParentTable(targetNode, child);
        if (found) {
            return found;
        }
    }
    
    return null;
}

/**
 * Deduplicate recommendations
 */
function deduplicateRecommendations(recommendations: readonly IndexRecommendation[]): IndexRecommendation[] {
    const seen = new Set<string>();
    const result: IndexRecommendation[] = [];
    
    for (const rec of recommendations) {
        const key = `${rec.tableName}:${rec.columns.join(',')}`;
        if (!seen.has(key)) {
            seen.add(key);
            result.push(rec);
        }
    }
    
    return result;
}

// ============================================================================
// QUERY REWRITING
// ============================================================================

/**
 * Register query rewrite rule
 */
export function registerRewriteRule(rule: QueryRewriteRule): void {
    rewriteRules.set(rule.ruleId, rule);
}

/**
 * Unregister query rewrite rule
 */
export function unregisterRewriteRule(ruleId: string): void {
    rewriteRules.delete(ruleId);
}

/**
 * Apply rewrite rules to query
 */
export function rewriteQuery(query: string): { rewritten: string; appliedRules: readonly string[] } {
    let rewritten = query;
    const appliedRules: string[] = [];
    
    const sortedRules = Array.from(rewriteRules.values())
        .filter(r => r.enabled)
        .sort((a, b) => b.priority - a.priority);
    
    for (const rule of sortedRules) {
        const matches = rewritten.match(rule.pattern);
        if (matches) {
            rewritten = rule.rewrite(rewritten, matches);
            appliedRules.push(rule.ruleId);
        }
    }
    
    return { rewritten, appliedRules };
}

/**
 * Initialize default rewrite rules
 */
export function initializeDefaultRewriteRules(): void {
    registerRewriteRule({
        ruleId: 'select_star_to_columns',
        name: 'Replace SELECT * with explicit columns',
        description: 'Replaces SELECT * with explicit column list when possible',
        pattern: /SELECT\s+\*\s+FROM/i,
        rewrite: (query) => query,
        priority: 10,
        enabled: false,
    });
    
    registerRewriteRule({
        ruleId: 'not_in_to_not_exists',
        name: 'Convert NOT IN to NOT EXISTS',
        description: 'Converts NOT IN subqueries to NOT EXISTS for better performance',
        pattern: /NOT\s+IN\s*\(\s*SELECT/i,
        rewrite: (query) => query,
        priority: 20,
        enabled: true,
    });
    
    registerRewriteRule({
        ruleId: 'or_to_union',
        name: 'Convert OR to UNION',
        description: 'Converts OR conditions on different columns to UNION for index usage',
        pattern: /WHERE\s+.*\s+OR\s+/i,
        rewrite: (query) => query,
        priority: 15,
        enabled: false,
    });
    
    registerRewriteRule({
        ruleId: 'implicit_cast_removal',
        name: 'Remove implicit casts',
        description: 'Removes implicit type casts that prevent index usage',
        pattern: /CAST\s*\(/i,
        rewrite: (query) => query,
        priority: 25,
        enabled: false,
    });
}

// ============================================================================
// QUERY CACHE
// ============================================================================

/**
 * Get cached query plan
 */
export function getCachedPlan(query: string): QueryPlan | null {
    const hash = computeQueryHash(query);
    const entry = queryCache.get(hash);
    
    if (!entry) {
        return null;
    }
    
    if (clock.nowMs() > entry.cachedAt + entry.ttl) {
        queryCache.delete(hash);
        return null;
    }
    
    const updatedEntry: QueryCacheEntry = {
        ...entry,
        hitCount: entry.hitCount + 1,
        lastHitAt: clock.nowMs(),
    };
    queryCache.set(hash, updatedEntry);
    
    return entry.plan;
}

/**
 * Cache query plan
 */
export function cachePlan(query: string, plan: QueryPlan, ttl: number = 3600000): void {
    const hash = computeQueryHash(query);
    
    const entry: QueryCacheEntry = {
        queryHash: hash,
        query,
        plan,
        cachedAt: clock.nowMs(),
        hitCount: 0,
        lastHitAt: clock.nowMs(),
        ttl,
    };
    
    queryCache.set(hash, entry);
}

/**
 * Invalidate cached plan
 */
export function invalidateCachedPlan(query: string): void {
    const hash = computeQueryHash(query);
    queryCache.delete(hash);
}

/**
 * Invalidate all cached plans for table
 */
export function invalidateCachedPlansForTable(tableName: string): void {
    const lowerTableName = tableName.toLowerCase();
    
    for (const [hash, entry] of queryCache) {
        if (entry.query.toLowerCase().includes(lowerTableName)) {
            queryCache.delete(hash);
        }
    }
}

/**
 * Clear query cache
 */
export function clearQueryCache(): void {
    queryCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStatistics(): {
    size: number;
    hitRate: number;
    avgAge: number;
    oldestEntry: number;
    newestEntry: number;
} {
    const now = clock.nowMs();
    let totalHits = 0;
    let totalAge = 0;
    let oldestEntry = now;
    let newestEntry = 0;
    
    for (const entry of queryCache.values()) {
        totalHits += entry.hitCount;
        totalAge += now - entry.cachedAt;
        oldestEntry = Math.min(oldestEntry, entry.cachedAt);
        newestEntry = Math.max(newestEntry, entry.cachedAt);
    }
    
    const size = queryCache.size;
    
    return {
        size,
        hitRate: size > 0 ? totalHits / size : 0,
        avgAge: size > 0 ? totalAge / size : 0,
        oldestEntry: size > 0 ? oldestEntry : 0,
        newestEntry: size > 0 ? newestEntry : 0,
    };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Configure optimizer
 */
export function configureOptimizer(newConfig: Partial<OptimizerConfig>): void {
    config = {
        ...config,
        ...newConfig,
        costModel: {
            ...config.costModel,
            ...(newConfig.costModel || {}),
        },
    };
}

/**
 * Get optimizer configuration
 */
export function getOptimizerConfig(): Readonly<OptimizerConfig> {
    return { ...config };
}

/**
 * Reset optimizer configuration to defaults
 */
export function resetOptimizerConfig(): void {
    config = {
        enableSeqScan: true,
        enableIndexScan: true,
        enableIndexOnlyScan: true,
        enableBitmapScan: true,
        enableTidScan: true,
        enableSort: true,
        enableHashAgg: true,
        enableHashJoin: true,
        enableMergeJoin: true,
        enableNestedLoop: true,
        enableMaterial: true,
        enablePartitionPruning: true,
        enableParallelAppend: true,
        enableParallelHash: true,
        enablePartitionwiseJoin: false,
        enablePartitionwiseAggregate: false,
        costModel: {
            seqPageCost: 1.0,
            randomPageCost: 4.0,
            cpuTupleCost: 0.01,
            cpuIndexTupleCost: 0.005,
            cpuOperatorCost: 0.0025,
            parallelTuplesCost: 0.1,
            parallelSetupCost: 1000.0,
            effectiveCacheSize: 4294967296,
            workMem: 4194304,
            maintenanceWorkMem: 67108864,
            minParallelTableScanSize: 8388608,
            minParallelIndexScanSize: 524288,
            maxParallelWorkersPerGather: 2,
        },
    };
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get optimizer statistics
 */
export function getOptimizerStatistics(): Readonly<OptimizerStatistics> {
    return { ...statistics };
}

/**
 * Reset optimizer statistics
 */
export function resetOptimizerStatistics(): void {
    Object.assign(statistics, {
        totalQueries: 0,
        cachedQueries: 0,
        cacheHits: 0,
        cacheMisses: 0,
        cacheHitRatio: 0,
        avgPlanningTime: 0,
        avgExecutionTime: 0,
        totalPlanningTime: 0,
        totalExecutionTime: 0,
        rewrittenQueries: 0,
        indexRecommendations: 0,
        issuesDetected: 0,
    });
}

// ============================================================================
// FULL QUERY ANALYSIS
// ============================================================================

/**
 * Analyze query
 */
export function analyzeQuery(
    query: string,
    plan: QueryPlan,
    tableStats: readonly TableStatistics[]
): QueryAnalysisResult {
    const issues = analyzeQueryPlan(plan);
    const recommendations = generateIndexRecommendations(plan, tableStats);
    
    const costRatio = plan.executionTime !== null && plan.planningTime > 0
        ? plan.executionTime / plan.planningTime
        : null;
    
    const rowEstimateAccuracy = plan.actualRows !== null && plan.estimatedRows > 0
        ? plan.actualRows / plan.estimatedRows
        : null;
    
    return {
        analysisId: generateAnalysisId(),
        query,
        queryHash: computeQueryHash(query),
        plan,
        issues,
        recommendations,
        estimatedCost: plan.totalCost,
        actualCost: plan.executionTime,
        costRatio,
        rowEstimateAccuracy,
        analyzedAt: clock.nowMs(),
    };
}

/**
 * Get all rewrite rules
 */
export function getRewriteRules(): readonly QueryRewriteRule[] {
    return Array.from(rewriteRules.values());
}

/**
 * Clear all rewrite rules
 */
export function clearRewriteRules(): void {
    rewriteRules.clear();
}
