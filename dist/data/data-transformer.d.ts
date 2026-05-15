/**
 * @file Data Transformer za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-DATA-001 Data transformation za zaledne sisteme
 * @design DSN-ZALEDNI-DATA-001 Backend data transformer arhitektura
 * @test TEST-ZALEDNI-DATA-001 Preverjanje data transformer
 *
 * Data Transformer - prilagojen za zaledne sisteme:
 * - Schema mapping
 * - Data validation
 * - Type conversion
 * - Field mapping
 * - Aggregation
 * - Filtering
 * - Enrichment
 * - Normalization
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom DATA_001 - Data Transformer
 */
/**
 * Data type
 */
export type DataType = 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object' | 'null';
/**
 * Transform operation
 */
export type TransformOperation = 'map' | 'filter' | 'reduce' | 'flatten' | 'group' | 'sort' | 'distinct' | 'join' | 'split' | 'merge' | 'pick' | 'omit' | 'rename' | 'convert' | 'validate' | 'enrich' | 'normalize' | 'denormalize' | 'aggregate' | 'pivot' | 'unpivot';
/**
 * Field mapping
 */
export interface FieldMapping {
    readonly source: string;
    readonly target: string;
    readonly transform: FieldTransform | null;
    readonly defaultValue: unknown;
    readonly required: boolean;
}
/**
 * Field transform
 */
export interface FieldTransform {
    readonly type: FieldTransformType;
    readonly params: Readonly<Record<string, unknown>>;
}
/**
 * Field transform type
 */
export type FieldTransformType = 'uppercase' | 'lowercase' | 'trim' | 'pad' | 'truncate' | 'replace' | 'split' | 'join' | 'parse_int' | 'parse_float' | 'parse_date' | 'format_date' | 'round' | 'floor' | 'ceil' | 'abs' | 'negate' | 'add' | 'subtract' | 'multiply' | 'divide' | 'concat' | 'template' | 'lookup' | 'coalesce' | 'conditional' | 'custom';
/**
 * Schema definition
 */
export interface SchemaDefinition {
    readonly schemaId: string;
    readonly name: string;
    readonly version: string;
    readonly fields: readonly FieldDefinition[];
    readonly metadata: Readonly<Record<string, unknown>>;
}
/**
 * Field definition
 */
export interface FieldDefinition {
    readonly name: string;
    readonly type: DataType;
    readonly required: boolean;
    readonly nullable: boolean;
    readonly defaultValue: unknown;
    readonly validators: readonly FieldValidator[];
    readonly description: string;
}
/**
 * Field validator
 */
export interface FieldValidator {
    readonly type: ValidatorType;
    readonly params: Readonly<Record<string, unknown>>;
    readonly message: string;
}
/**
 * Validator type
 */
export type ValidatorType = 'required' | 'type' | 'min' | 'max' | 'min_length' | 'max_length' | 'pattern' | 'enum' | 'email' | 'url' | 'uuid' | 'date' | 'custom';
/**
 * Transformation pipeline
 */
export interface TransformationPipeline {
    readonly pipelineId: string;
    readonly name: string;
    readonly description: string;
    readonly steps: readonly TransformationStep[];
    readonly inputSchema: SchemaDefinition | null;
    readonly outputSchema: SchemaDefinition | null;
    readonly metadata: Readonly<Record<string, unknown>>;
}
/**
 * Transformation step
 */
export interface TransformationStep {
    readonly stepId: string;
    readonly name: string;
    readonly operation: TransformOperation;
    readonly config: Readonly<Record<string, unknown>>;
    readonly condition: TransformCondition | null;
    readonly errorHandling: ErrorHandling;
}
/**
 * Transform condition
 */
export interface TransformCondition {
    readonly field: string;
    readonly operator: ConditionOperator;
    readonly value: unknown;
}
/**
 * Condition operator
 */
export type ConditionOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'matches' | 'is_null' | 'is_not_null';
/**
 * Error handling
 */
export interface ErrorHandling {
    readonly strategy: ErrorStrategy;
    readonly defaultValue: unknown;
    readonly logErrors: boolean;
}
/**
 * Error strategy
 */
export type ErrorStrategy = 'fail' | 'skip' | 'default' | 'null';
/**
 * Transformation result
 */
export interface TransformationResult<T = unknown> {
    readonly resultId: string;
    readonly success: boolean;
    readonly data: T;
    readonly errors: readonly TransformationError[];
    readonly warnings: readonly TransformationWarning[];
    readonly metadata: TransformationMetadata;
}
/**
 * Transformation error
 */
export interface TransformationError {
    readonly field: string | null;
    readonly step: string | null;
    readonly message: string;
    readonly code: string;
    readonly value: unknown;
}
/**
 * Transformation warning
 */
export interface TransformationWarning {
    readonly field: string | null;
    readonly step: string | null;
    readonly message: string;
    readonly code: string;
}
/**
 * Transformation metadata
 */
export interface TransformationMetadata {
    readonly inputCount: number;
    readonly outputCount: number;
    readonly duration: number;
    readonly timestamp: number;
    readonly stepsExecuted: number;
    readonly stepsSkipped: number;
}
/**
 * Aggregation config
 */
export interface AggregationConfig {
    readonly groupBy: readonly string[];
    readonly aggregations: readonly AggregationField[];
}
/**
 * Aggregation field
 */
export interface AggregationField {
    readonly field: string;
    readonly operation: AggregationOperation;
    readonly alias: string;
}
/**
 * Aggregation operation
 */
export type AggregationOperation = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'first' | 'last' | 'collect';
/**
 * Join config
 */
export interface JoinConfig {
    readonly type: JoinType;
    readonly leftKey: string;
    readonly rightKey: string;
    readonly prefix: string | null;
}
/**
 * Join type
 */
export type JoinType = 'inner' | 'left' | 'right' | 'full' | 'cross';
/**
 * Transformer event
 */
export interface TransformerEvent {
    readonly eventId: string;
    readonly type: TransformerEventType;
    readonly pipelineId: string | null;
    readonly stepId: string | null;
    readonly timestamp: number;
    readonly data: Readonly<Record<string, unknown>>;
}
/**
 * Transformer event type
 */
export type TransformerEventType = 'pipeline_started' | 'pipeline_completed' | 'pipeline_failed' | 'step_started' | 'step_completed' | 'step_skipped' | 'step_failed' | 'validation_failed' | 'schema_registered';
/**
 * Transformer event listener
 */
export type TransformerEventListener = (event: TransformerEvent) => void | Promise<void>;
/**
 * Transformer statistics
 */
export interface TransformerStatistics {
    readonly totalTransformations: number;
    readonly successfulTransformations: number;
    readonly failedTransformations: number;
    readonly totalRecordsProcessed: number;
    readonly avgTransformationTime: number;
    readonly validationErrors: number;
}
/**
 * Register schema
 */
export declare function registerSchema(name: string, fields: readonly FieldDefinition[], options?: {
    version?: string;
    metadata?: Record<string, unknown>;
}): SchemaDefinition;
/**
 * Get schema
 */
export declare function getSchema(name: string): SchemaDefinition | null;
/**
 * Get all schemas
 */
export declare function getAllSchemas(): readonly SchemaDefinition[];
/**
 * Remove schema
 */
export declare function removeSchema(name: string): boolean;
/**
 * Create pipeline
 */
export declare function createPipeline(name: string, steps: readonly Omit<TransformationStep, 'stepId'>[], options?: {
    description?: string;
    inputSchema?: string;
    outputSchema?: string;
    metadata?: Record<string, unknown>;
}): TransformationPipeline;
/**
 * Get pipeline
 */
export declare function getPipeline(pipelineId: string): TransformationPipeline | null;
/**
 * Get all pipelines
 */
export declare function getAllPipelines(): readonly TransformationPipeline[];
/**
 * Remove pipeline
 */
export declare function removePipeline(pipelineId: string): boolean;
/**
 * Register lookup table
 */
export declare function registerLookupTable(name: string, data: Record<string, unknown>): void;
/**
 * Get lookup table
 */
export declare function getLookupTable(name: string): Map<string, unknown> | null;
/**
 * Remove lookup table
 */
export declare function removeLookupTable(name: string): boolean;
/**
 * Validate data against schema
 */
export declare function validateAgainstSchema(data: unknown, schemaName: string): {
    valid: boolean;
    errors: readonly TransformationError[];
};
/**
 * Map records
 */
export declare function mapRecords<T, R>(records: readonly T[], mappings: readonly FieldMapping[]): R[];
/**
 * Filter records
 */
export declare function filterRecords<T>(records: readonly T[], condition: TransformCondition): T[];
/**
 * Group records
 */
export declare function groupRecords<T>(records: readonly T[], groupBy: readonly string[]): Map<string, T[]>;
/**
 * Aggregate records
 */
export declare function aggregateRecords<T>(records: readonly T[], config: AggregationConfig): Record<string, unknown>[];
/**
 * Sort records
 */
export declare function sortRecords<T>(records: readonly T[], sortBy: readonly {
    field: string;
    direction: 'asc' | 'desc';
}[]): T[];
/**
 * Join records
 */
export declare function joinRecords<T, U>(left: readonly T[], right: readonly U[], config: JoinConfig): Record<string, unknown>[];
/**
 * Flatten records
 */
export declare function flattenRecords<T>(records: readonly T[], field: string, preserveParent?: boolean): Record<string, unknown>[];
/**
 * Distinct records
 */
export declare function distinctRecords<T>(records: readonly T[], fields: readonly string[]): T[];
/**
 * Execute pipeline
 */
export declare function executePipeline<T, R>(pipelineId: string, data: readonly T[]): Promise<TransformationResult<R[]>>;
/**
 * Get statistics
 */
export declare function getStatistics(): Readonly<TransformerStatistics>;
/**
 * Reset statistics
 */
export declare function resetStatistics(): void;
/**
 * Add event listener
 */
export declare function addEventListener(listener: TransformerEventListener): void;
/**
 * Remove event listener
 */
export declare function removeEventListener(listener: TransformerEventListener): void;
/**
 * Clear event listeners
 */
export declare function clearEventListeners(): void;
/**
 * Clear all state
 */
export declare function clearAll(): void;
