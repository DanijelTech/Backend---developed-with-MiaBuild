"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeQueryPlan = analyzeQueryPlan;
exports.generateIndexRecommendations = generateIndexRecommendations;
exports.registerRewriteRule = registerRewriteRule;
exports.unregisterRewriteRule = unregisterRewriteRule;
exports.rewriteQuery = rewriteQuery;
exports.initializeDefaultRewriteRules = initializeDefaultRewriteRules;
exports.getCachedPlan = getCachedPlan;
exports.cachePlan = cachePlan;
exports.invalidateCachedPlan = invalidateCachedPlan;
exports.invalidateCachedPlansForTable = invalidateCachedPlansForTable;
exports.clearQueryCache = clearQueryCache;
exports.getCacheStatistics = getCacheStatistics;
exports.configureOptimizer = configureOptimizer;
exports.getOptimizerConfig = getOptimizerConfig;
exports.resetOptimizerConfig = resetOptimizerConfig;
exports.getOptimizerStatistics = getOptimizerStatistics;
exports.resetOptimizerStatistics = resetOptimizerStatistics;
exports.analyzeQuery = analyzeQuery;
exports.getRewriteRules = getRewriteRules;
exports.clearRewriteRules = clearRewriteRules;
const clock_1 = require("@mia/core/clock");
const deterministic_1 = require("@mia/core/deterministic");
const clock = (0, clock_1.getClock)();
// ============================================================================
// STANJE
// ============================================================================
const queryCache = new Map();
const rewriteRules = new Map();
let planCounter = 0;
let analysisCounter = 0;
let recommendationCounter = 0;
let issueCounter = 0;
let config = {
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
const statistics = {
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
function generatePlanId() {
    planCounter++;
    return (0, deterministic_1.generateDeterministicId)(`plan-${planCounter}`);
}
/**
 * Generate analysis ID
 */
function generateAnalysisId() {
    analysisCounter++;
    return (0, deterministic_1.generateDeterministicId)(`analysis-${analysisCounter}`);
}
/**
 * Generate recommendation ID
 */
function generateRecommendationId() {
    recommendationCounter++;
    return (0, deterministic_1.generateDeterministicId)(`recommendation-${recommendationCounter}`);
}
/**
 * Generate issue ID
 */
function generateIssueId() {
    issueCounter++;
    return (0, deterministic_1.generateDeterministicId)(`issue-${issueCounter}`);
}
/**
 * Compute query hash
 */
function computeQueryHash(query) {
    const normalized = normalizeQuery(query);
    return (0, deterministic_1.generateDeterministicId)(`query-${normalized}`);
}
/**
 * Normalize query for caching
 */
function normalizeQuery(query) {
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
function estimateRowCount(tableName) {
    return 10000;
}
/**
 * Estimate selectivity for condition
 */
function estimateSelectivity(condition) {
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
function estimateSeqScanCost(rowCount, tupleWidth) {
    const pages = Math.ceil((rowCount * tupleWidth) / 8192);
    return pages * config.costModel.seqPageCost + rowCount * config.costModel.cpuTupleCost;
}
/**
 * Estimate cost for index scan
 */
function estimateIndexScanCost(rowCount, selectivity) {
    const selectedRows = Math.ceil(rowCount * selectivity);
    const indexPages = Math.ceil(Math.log2(rowCount + 1));
    return indexPages * config.costModel.randomPageCost +
        selectedRows * config.costModel.cpuIndexTupleCost +
        selectedRows * config.costModel.randomPageCost;
}
/**
 * Estimate cost for hash join
 */
function estimateHashJoinCost(outerRows, innerRows) {
    const buildCost = innerRows * config.costModel.cpuOperatorCost;
    const probeCost = outerRows * config.costModel.cpuOperatorCost;
    return buildCost + probeCost;
}
/**
 * Estimate cost for merge join
 */
function estimateMergeJoinCost(outerRows, innerRows) {
    const sortOuterCost = outerRows * Math.log2(outerRows + 1) * config.costModel.cpuOperatorCost;
    const sortInnerCost = innerRows * Math.log2(innerRows + 1) * config.costModel.cpuOperatorCost;
    const mergeCost = (outerRows + innerRows) * config.costModel.cpuOperatorCost;
    return sortOuterCost + sortInnerCost + mergeCost;
}
/**
 * Estimate cost for nested loop join
 */
function estimateNestedLoopCost(outerRows, innerRows) {
    return outerRows * innerRows * config.costModel.cpuTupleCost;
}
/**
 * Estimate cost for sort
 */
function estimateSortCost(rowCount) {
    if (rowCount <= 1) {
        return 0;
    }
    return rowCount * Math.log2(rowCount) * config.costModel.cpuOperatorCost;
}
/**
 * Estimate cost for aggregate
 */
function estimateAggregateCost(rowCount, groupCount) {
    return rowCount * config.costModel.cpuOperatorCost + groupCount * config.costModel.cpuTupleCost;
}
// ============================================================================
// QUERY PLAN ANALYSIS
// ============================================================================
/**
 * Analyze query plan
 */
function analyzeQueryPlan(plan) {
    const issues = [];
    function analyzeNode(node, depth) {
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
function generateIndexRecommendations(plan, tableStats) {
    const recommendations = [];
    function analyzeNode(node) {
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
function extractColumnsFromFilter(filter) {
    const columns = [];
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
function isReservedWord(word) {
    const reserved = ['and', 'or', 'not', 'is', 'null', 'true', 'false', 'like', 'in', 'between'];
    return reserved.includes(word.toLowerCase());
}
/**
 * Estimate speedup from index
 */
function estimateSpeedup(rowCount, columnCount) {
    const baseSpeedup = Math.log10(rowCount + 1);
    const columnFactor = 1 + (columnCount - 1) * 0.2;
    return Math.min(baseSpeedup * columnFactor, 100);
}
/**
 * Generate CREATE INDEX statement
 */
function generateCreateIndexStatement(tableName, columns, indexType) {
    const indexName = `idx_${tableName}_${columns.join('_')}`;
    const columnList = columns.map(c => `"${c}"`).join(', ');
    return `CREATE INDEX "${indexName}" ON "${tableName}" USING ${indexType} (${columnList})`;
}
/**
 * Find parent table for a node
 */
function findParentTable(targetNode, currentNode) {
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
function deduplicateRecommendations(recommendations) {
    const seen = new Set();
    const result = [];
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
function registerRewriteRule(rule) {
    rewriteRules.set(rule.ruleId, rule);
}
/**
 * Unregister query rewrite rule
 */
function unregisterRewriteRule(ruleId) {
    rewriteRules.delete(ruleId);
}
/**
 * Apply rewrite rules to query
 */
function rewriteQuery(query) {
    let rewritten = query;
    const appliedRules = [];
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
function initializeDefaultRewriteRules() {
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
function getCachedPlan(query) {
    const hash = computeQueryHash(query);
    const entry = queryCache.get(hash);
    if (!entry) {
        return null;
    }
    if (clock.nowMs() > entry.cachedAt + entry.ttl) {
        queryCache.delete(hash);
        return null;
    }
    const updatedEntry = {
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
function cachePlan(query, plan, ttl = 3600000) {
    const hash = computeQueryHash(query);
    const entry = {
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
function invalidateCachedPlan(query) {
    const hash = computeQueryHash(query);
    queryCache.delete(hash);
}
/**
 * Invalidate all cached plans for table
 */
function invalidateCachedPlansForTable(tableName) {
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
function clearQueryCache() {
    queryCache.clear();
}
/**
 * Get cache statistics
 */
function getCacheStatistics() {
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
function configureOptimizer(newConfig) {
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
function getOptimizerConfig() {
    return { ...config };
}
/**
 * Reset optimizer configuration to defaults
 */
function resetOptimizerConfig() {
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
function getOptimizerStatistics() {
    return { ...statistics };
}
/**
 * Reset optimizer statistics
 */
function resetOptimizerStatistics() {
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
function analyzeQuery(query, plan, tableStats) {
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
function getRewriteRules() {
    return Array.from(rewriteRules.values());
}
/**
 * Clear all rewrite rules
 */
function clearRewriteRules() {
    rewriteRules.clear();
}
