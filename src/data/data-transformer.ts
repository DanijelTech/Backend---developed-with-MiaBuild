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

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI ZA DATA TRANSFORMER
// ============================================================================

/**
 * Data type
 */
export type DataType = 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object' | 'null';

/**
 * Transform operation
 */
export type TransformOperation =
    | 'map'
    | 'filter'
    | 'reduce'
    | 'flatten'
    | 'group'
    | 'sort'
    | 'distinct'
    | 'join'
    | 'split'
    | 'merge'
    | 'pick'
    | 'omit'
    | 'rename'
    | 'convert'
    | 'validate'
    | 'enrich'
    | 'normalize'
    | 'denormalize'
    | 'aggregate'
    | 'pivot'
    | 'unpivot';

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
export type FieldTransformType =
    | 'uppercase'
    | 'lowercase'
    | 'trim'
    | 'pad'
    | 'truncate'
    | 'replace'
    | 'split'
    | 'join'
    | 'parse_int'
    | 'parse_float'
    | 'parse_date'
    | 'format_date'
    | 'round'
    | 'floor'
    | 'ceil'
    | 'abs'
    | 'negate'
    | 'add'
    | 'subtract'
    | 'multiply'
    | 'divide'
    | 'concat'
    | 'template'
    | 'lookup'
    | 'coalesce'
    | 'conditional'
    | 'custom';

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
export type ValidatorType =
    | 'required'
    | 'type'
    | 'min'
    | 'max'
    | 'min_length'
    | 'max_length'
    | 'pattern'
    | 'enum'
    | 'email'
    | 'url'
    | 'uuid'
    | 'date'
    | 'custom';

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
export type ConditionOperator =
    | 'eq'
    | 'ne'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'in'
    | 'not_in'
    | 'contains'
    | 'not_contains'
    | 'starts_with'
    | 'ends_with'
    | 'matches'
    | 'is_null'
    | 'is_not_null';

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
export type TransformerEventType =
    | 'pipeline_started'
    | 'pipeline_completed'
    | 'pipeline_failed'
    | 'step_started'
    | 'step_completed'
    | 'step_skipped'
    | 'step_failed'
    | 'validation_failed'
    | 'schema_registered';

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

// ============================================================================
// STANJE
// ============================================================================

const schemas: Map<string, SchemaDefinition> = new Map();
const pipelines: Map<string, TransformationPipeline> = new Map();
const lookupTables: Map<string, Map<string, unknown>> = new Map();
const eventListeners: Set<TransformerEventListener> = new Set();

let schemaCounter = 0;
let pipelineCounter = 0;
let stepCounter = 0;
let resultCounter = 0;
let eventCounter = 0;

const statistics: TransformerStatistics = {
    totalTransformations: 0,
    successfulTransformations: 0,
    failedTransformations: 0,
    totalRecordsProcessed: 0,
    avgTransformationTime: 0,
    validationErrors: 0,
};

// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================

/**
 * Generate schema ID
 */
function generateSchemaId(): string {
    schemaCounter++;
    return generateDeterministicId(`schema-${schemaCounter}`);
}

/**
 * Generate pipeline ID
 */
function generatePipelineId(): string {
    pipelineCounter++;
    return generateDeterministicId(`pipeline-${pipelineCounter}`);
}

/**
 * Generate step ID
 */
function generateStepId(): string {
    stepCounter++;
    return generateDeterministicId(`step-${stepCounter}`);
}

/**
 * Generate result ID
 */
function generateResultId(): string {
    resultCounter++;
    return generateDeterministicId(`result-${resultCounter}`);
}

/**
 * Generate event ID
 */
function generateEventId(): string {
    eventCounter++;
    return generateDeterministicId(`transformer-event-${eventCounter}`);
}

/**
 * Emit transformer event
 */
async function emitEvent(event: TransformerEvent): Promise<void> {
    for (const listener of eventListeners) {
        try {
            await listener(event);
        } catch {
            // Ignore listener errors
        }
    }
}

/**
 * Get nested value
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;
    
    for (const part of parts) {
        if (current === null || current === undefined) {
            return undefined;
        }
        if (typeof current !== 'object') {
            return undefined;
        }
        current = (current as Record<string, unknown>)[part];
    }
    
    return current;
}

/**
 * Set nested value
 */
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!(part in current) || typeof current[part] !== 'object') {
            current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
    }
    
    current[parts[parts.length - 1]] = value;
}

/**
 * Infer data type
 */
function inferDataType(value: unknown): DataType {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date) return 'date';
    if (typeof value === 'object') return 'object';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    return 'string';
}

/**
 * Convert value to type
 */
function convertToType(value: unknown, targetType: DataType): unknown {
    if (value === null || value === undefined) {
        return null;
    }
    
    switch (targetType) {
        case 'string':
            return String(value);
        case 'number':
            return Number(value);
        case 'boolean':
            return Boolean(value);
        case 'date':
            return new Date(value as string | number);
        case 'array':
            return Array.isArray(value) ? value : [value];
        case 'object':
            return typeof value === 'object' ? value : { value };
        case 'null':
            return null;
    }
}

/**
 * Evaluate condition
 */
function evaluateCondition(value: unknown, condition: TransformCondition): boolean {
    const fieldValue = typeof value === 'object' && value !== null
        ? getNestedValue(value as Record<string, unknown>, condition.field)
        : value;
    
    switch (condition.operator) {
        case 'eq':
            return fieldValue === condition.value;
        case 'ne':
            return fieldValue !== condition.value;
        case 'gt':
            return (fieldValue as number) > (condition.value as number);
        case 'gte':
            return (fieldValue as number) >= (condition.value as number);
        case 'lt':
            return (fieldValue as number) < (condition.value as number);
        case 'lte':
            return (fieldValue as number) <= (condition.value as number);
        case 'in':
            return Array.isArray(condition.value) && condition.value.includes(fieldValue);
        case 'not_in':
            return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
        case 'contains':
            return String(fieldValue).includes(String(condition.value));
        case 'not_contains':
            return !String(fieldValue).includes(String(condition.value));
        case 'starts_with':
            return String(fieldValue).startsWith(String(condition.value));
        case 'ends_with':
            return String(fieldValue).endsWith(String(condition.value));
        case 'matches':
            return new RegExp(String(condition.value)).test(String(fieldValue));
        case 'is_null':
            return fieldValue === null || fieldValue === undefined;
        case 'is_not_null':
            return fieldValue !== null && fieldValue !== undefined;
    }
}

/**
 * Apply field transform
 */
function applyFieldTransform(value: unknown, transform: FieldTransform): unknown {
    switch (transform.type) {
        case 'uppercase':
            return String(value).toUpperCase();
        case 'lowercase':
            return String(value).toLowerCase();
        case 'trim':
            return String(value).trim();
        case 'pad':
            const padLength = transform.params.length as number ?? 0;
            const padChar = transform.params.char as string ?? ' ';
            const padSide = transform.params.side as string ?? 'left';
            return padSide === 'left'
                ? String(value).padStart(padLength, padChar)
                : String(value).padEnd(padLength, padChar);
        case 'truncate':
            const maxLength = transform.params.length as number ?? 100;
            const suffix = transform.params.suffix as string ?? '...';
            const str = String(value);
            return str.length > maxLength ? str.slice(0, maxLength - suffix.length) + suffix : str;
        case 'replace':
            const pattern = transform.params.pattern as string;
            const replacement = transform.params.replacement as string ?? '';
            return String(value).replace(new RegExp(pattern, 'g'), replacement);
        case 'split':
            const delimiter = transform.params.delimiter as string ?? ',';
            return String(value).split(delimiter);
        case 'join':
            const joinDelimiter = transform.params.delimiter as string ?? ',';
            return Array.isArray(value) ? value.join(joinDelimiter) : String(value);
        case 'parse_int':
            return parseInt(String(value), transform.params.radix as number ?? 10);
        case 'parse_float':
            return parseFloat(String(value));
        case 'parse_date':
            return new Date(value as string | number);
        case 'format_date':
            const date = value instanceof Date ? value : new Date(value as string | number);
            return date.toISOString();
        case 'round':
            const decimals = transform.params.decimals as number ?? 0;
            const factor = Math.pow(10, decimals);
            return Math.round((value as number) * factor) / factor;
        case 'floor':
            return Math.floor(value as number);
        case 'ceil':
            return Math.ceil(value as number);
        case 'abs':
            return Math.abs(value as number);
        case 'negate':
            return -(value as number);
        case 'add':
            return (value as number) + (transform.params.value as number ?? 0);
        case 'subtract':
            return (value as number) - (transform.params.value as number ?? 0);
        case 'multiply':
            return (value as number) * (transform.params.value as number ?? 1);
        case 'divide':
            return (value as number) / (transform.params.value as number ?? 1);
        case 'concat':
            const prefix = transform.params.prefix as string ?? '';
            const concatSuffix = transform.params.suffix as string ?? '';
            return prefix + String(value) + concatSuffix;
        case 'template':
            const template = transform.params.template as string ?? '{{value}}';
            return template.replace('{{value}}', String(value));
        case 'lookup':
            const tableName = transform.params.table as string;
            const table = lookupTables.get(tableName);
            return table?.get(String(value)) ?? transform.params.default;
        case 'coalesce':
            const fallback = transform.params.fallback;
            return value ?? fallback;
        case 'conditional':
            const conditionValue = transform.params.condition;
            const trueValue = transform.params.trueValue;
            const falseValue = transform.params.falseValue;
            return value === conditionValue ? trueValue : falseValue;
        case 'custom':
            return value;
    }
}

// ============================================================================
// SCHEMA MANAGEMENT
// ============================================================================

/**
 * Register schema
 */
export function registerSchema(
    name: string,
    fields: readonly FieldDefinition[],
    options: {
        version?: string;
        metadata?: Record<string, unknown>;
    } = {}
): SchemaDefinition {
    const schemaId = generateSchemaId();
    
    const schema: SchemaDefinition = {
        schemaId,
        name,
        version: options.version ?? '1.0.0',
        fields,
        metadata: options.metadata ?? {},
    };
    
    schemas.set(name, schema);
    
    emitEvent({
        eventId: generateEventId(),
        type: 'schema_registered',
        pipelineId: null,
        stepId: null,
        timestamp: clock.nowMs(),
        data: { name, fieldCount: fields.length },
    });
    
    return schema;
}

/**
 * Get schema
 */
export function getSchema(name: string): SchemaDefinition | null {
    return schemas.get(name) ?? null;
}

/**
 * Get all schemas
 */
export function getAllSchemas(): readonly SchemaDefinition[] {
    return Array.from(schemas.values());
}

/**
 * Remove schema
 */
export function removeSchema(name: string): boolean {
    return schemas.delete(name);
}

// ============================================================================
// PIPELINE MANAGEMENT
// ============================================================================

/**
 * Create pipeline
 */
export function createPipeline(
    name: string,
    steps: readonly Omit<TransformationStep, 'stepId'>[],
    options: {
        description?: string;
        inputSchema?: string;
        outputSchema?: string;
        metadata?: Record<string, unknown>;
    } = {}
): TransformationPipeline {
    const pipelineId = generatePipelineId();
    
    const stepsWithIds: TransformationStep[] = steps.map(step => ({
        ...step,
        stepId: generateStepId(),
    }));
    
    const pipeline: TransformationPipeline = {
        pipelineId,
        name,
        description: options.description ?? '',
        steps: stepsWithIds,
        inputSchema: options.inputSchema ? schemas.get(options.inputSchema) ?? null : null,
        outputSchema: options.outputSchema ? schemas.get(options.outputSchema) ?? null : null,
        metadata: options.metadata ?? {},
    };
    
    pipelines.set(pipelineId, pipeline);
    
    return pipeline;
}

/**
 * Get pipeline
 */
export function getPipeline(pipelineId: string): TransformationPipeline | null {
    return pipelines.get(pipelineId) ?? null;
}

/**
 * Get all pipelines
 */
export function getAllPipelines(): readonly TransformationPipeline[] {
    return Array.from(pipelines.values());
}

/**
 * Remove pipeline
 */
export function removePipeline(pipelineId: string): boolean {
    return pipelines.delete(pipelineId);
}

// ============================================================================
// LOOKUP TABLES
// ============================================================================

/**
 * Register lookup table
 */
export function registerLookupTable(name: string, data: Record<string, unknown>): void {
    const table = new Map<string, unknown>();
    for (const [key, value] of Object.entries(data)) {
        table.set(key, value);
    }
    lookupTables.set(name, table);
}

/**
 * Get lookup table
 */
export function getLookupTable(name: string): Map<string, unknown> | null {
    return lookupTables.get(name) ?? null;
}

/**
 * Remove lookup table
 */
export function removeLookupTable(name: string): boolean {
    return lookupTables.delete(name);
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate data against schema
 */
export function validateAgainstSchema(
    data: unknown,
    schemaName: string
): { valid: boolean; errors: readonly TransformationError[] } {
    const schema = schemas.get(schemaName);
    if (!schema) {
        return {
            valid: false,
            errors: [{
                field: null,
                step: null,
                message: `Schema '${schemaName}' not found`,
                code: 'SCHEMA_NOT_FOUND',
                value: null,
            }],
        };
    }
    
    const errors: TransformationError[] = [];
    const record = data as Record<string, unknown>;
    
    for (const field of schema.fields) {
        const value = record[field.name];
        
        if (field.required && (value === undefined || value === null)) {
            errors.push({
                field: field.name,
                step: null,
                message: `Field '${field.name}' is required`,
                code: 'REQUIRED',
                value,
            });
            continue;
        }
        
        if (value !== undefined && value !== null) {
            const actualType = inferDataType(value);
            if (actualType !== field.type && field.type !== 'null') {
                errors.push({
                    field: field.name,
                    step: null,
                    message: `Field '${field.name}' expected type '${field.type}', got '${actualType}'`,
                    code: 'TYPE_MISMATCH',
                    value,
                });
            }
            
            for (const validator of field.validators) {
                const validationError = runValidator(field.name, value, validator);
                if (validationError) {
                    errors.push(validationError);
                }
            }
        }
    }
    
    return { valid: errors.length === 0, errors };
}

/**
 * Run validator
 */
function runValidator(
    fieldName: string,
    value: unknown,
    validator: FieldValidator
): TransformationError | null {
    switch (validator.type) {
        case 'min':
            if ((value as number) < (validator.params.value as number)) {
                return {
                    field: fieldName,
                    step: null,
                    message: validator.message,
                    code: 'MIN_VALUE',
                    value,
                };
            }
            break;
        case 'max':
            if ((value as number) > (validator.params.value as number)) {
                return {
                    field: fieldName,
                    step: null,
                    message: validator.message,
                    code: 'MAX_VALUE',
                    value,
                };
            }
            break;
        case 'min_length':
            if (String(value).length < (validator.params.value as number)) {
                return {
                    field: fieldName,
                    step: null,
                    message: validator.message,
                    code: 'MIN_LENGTH',
                    value,
                };
            }
            break;
        case 'max_length':
            if (String(value).length > (validator.params.value as number)) {
                return {
                    field: fieldName,
                    step: null,
                    message: validator.message,
                    code: 'MAX_LENGTH',
                    value,
                };
            }
            break;
        case 'pattern':
            if (!new RegExp(validator.params.pattern as string).test(String(value))) {
                return {
                    field: fieldName,
                    step: null,
                    message: validator.message,
                    code: 'PATTERN_MISMATCH',
                    value,
                };
            }
            break;
        case 'enum':
            if (!Array.isArray(validator.params.values) || !validator.params.values.includes(value)) {
                return {
                    field: fieldName,
                    step: null,
                    message: validator.message,
                    code: 'ENUM_MISMATCH',
                    value,
                };
            }
            break;
        case 'email':
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(String(value))) {
                return {
                    field: fieldName,
                    step: null,
                    message: validator.message,
                    code: 'INVALID_EMAIL',
                    value,
                };
            }
            break;
        case 'url':
            try {
                new URL(String(value));
            } catch {
                return {
                    field: fieldName,
                    step: null,
                    message: validator.message,
                    code: 'INVALID_URL',
                    value,
                };
            }
            break;
    }
    
    return null;
}

// ============================================================================
// TRANSFORMATION OPERATIONS
// ============================================================================

/**
 * Map records
 */
export function mapRecords<T, R>(
    records: readonly T[],
    mappings: readonly FieldMapping[]
): R[] {
    return records.map(record => {
        const result: Record<string, unknown> = {};
        const source = record as Record<string, unknown>;
        
        for (const mapping of mappings) {
            let value = getNestedValue(source, mapping.source);
            
            if (value === undefined && mapping.defaultValue !== undefined) {
                value = mapping.defaultValue;
            }
            
            if (mapping.transform) {
                value = applyFieldTransform(value, mapping.transform);
            }
            
            setNestedValue(result, mapping.target, value);
        }
        
        return result as R;
    });
}

/**
 * Filter records
 */
export function filterRecords<T>(
    records: readonly T[],
    condition: TransformCondition
): T[] {
    return records.filter(record => evaluateCondition(record, condition));
}

/**
 * Group records
 */
export function groupRecords<T>(
    records: readonly T[],
    groupBy: readonly string[]
): Map<string, T[]> {
    const groups = new Map<string, T[]>();
    
    for (const record of records) {
        const keyParts = groupBy.map(field => {
            const value = getNestedValue(record as Record<string, unknown>, field);
            return String(value ?? 'null');
        });
        const key = keyParts.join('|');
        
        const group = groups.get(key) ?? [];
        group.push(record);
        groups.set(key, group);
    }
    
    return groups;
}

/**
 * Aggregate records
 */
export function aggregateRecords<T>(
    records: readonly T[],
    config: AggregationConfig
): Record<string, unknown>[] {
    const groups = groupRecords(records, config.groupBy);
    const results: Record<string, unknown>[] = [];
    
    for (const [key, groupRecords] of groups) {
        const result: Record<string, unknown> = {};
        
        const keyParts = key.split('|');
        for (let i = 0; i < config.groupBy.length; i++) {
            result[config.groupBy[i]] = keyParts[i];
        }
        
        for (const agg of config.aggregations) {
            const values = groupRecords.map(r => 
                getNestedValue(r as Record<string, unknown>, agg.field)
            ).filter(v => v !== undefined && v !== null);
            
            let aggregatedValue: unknown;
            
            switch (agg.operation) {
                case 'sum':
                    aggregatedValue = values.reduce((sum, v) => sum + (v as number), 0);
                    break;
                case 'avg':
                    aggregatedValue = values.length > 0
                        ? values.reduce((sum, v) => sum + (v as number), 0) / values.length
                        : 0;
                    break;
                case 'min':
                    aggregatedValue = Math.min(...values.map(v => v as number));
                    break;
                case 'max':
                    aggregatedValue = Math.max(...values.map(v => v as number));
                    break;
                case 'count':
                    aggregatedValue = values.length;
                    break;
                case 'first':
                    aggregatedValue = values[0];
                    break;
                case 'last':
                    aggregatedValue = values[values.length - 1];
                    break;
                case 'collect':
                    aggregatedValue = values;
                    break;
            }
            
            result[agg.alias] = aggregatedValue;
        }
        
        results.push(result);
    }
    
    return results;
}

/**
 * Sort records
 */
export function sortRecords<T>(
    records: readonly T[],
    sortBy: readonly { field: string; direction: 'asc' | 'desc' }[]
): T[] {
    return [...records].sort((a, b) => {
        for (const sort of sortBy) {
            const aValue = getNestedValue(a as Record<string, unknown>, sort.field);
            const bValue = getNestedValue(b as Record<string, unknown>, sort.field);
            
            let comparison = 0;
            if (aValue < bValue) comparison = -1;
            if (aValue > bValue) comparison = 1;
            
            if (comparison !== 0) {
                return sort.direction === 'asc' ? comparison : -comparison;
            }
        }
        return 0;
    });
}

/**
 * Join records
 */
export function joinRecords<T, U>(
    left: readonly T[],
    right: readonly U[],
    config: JoinConfig
): Record<string, unknown>[] {
    const results: Record<string, unknown>[] = [];
    const rightMap = new Map<string, U[]>();
    
    for (const record of right) {
        const key = String(getNestedValue(record as Record<string, unknown>, config.rightKey));
        const existing = rightMap.get(key) ?? [];
        existing.push(record);
        rightMap.set(key, existing);
    }
    
    for (const leftRecord of left) {
        const key = String(getNestedValue(leftRecord as Record<string, unknown>, config.leftKey));
        const rightRecords = rightMap.get(key) ?? [];
        
        if (rightRecords.length > 0) {
            for (const rightRecord of rightRecords) {
                const merged: Record<string, unknown> = { ...(leftRecord as Record<string, unknown>) };
                
                for (const [k, v] of Object.entries(rightRecord as Record<string, unknown>)) {
                    const targetKey = config.prefix ? `${config.prefix}${k}` : k;
                    merged[targetKey] = v;
                }
                
                results.push(merged);
            }
        } else if (config.type === 'left' || config.type === 'full') {
            results.push({ ...(leftRecord as Record<string, unknown>) });
        }
    }
    
    if (config.type === 'right' || config.type === 'full') {
        const leftKeys = new Set(left.map(r => 
            String(getNestedValue(r as Record<string, unknown>, config.leftKey))
        ));
        
        for (const rightRecord of right) {
            const key = String(getNestedValue(rightRecord as Record<string, unknown>, config.rightKey));
            if (!leftKeys.has(key)) {
                const merged: Record<string, unknown> = {};
                for (const [k, v] of Object.entries(rightRecord as Record<string, unknown>)) {
                    const targetKey = config.prefix ? `${config.prefix}${k}` : k;
                    merged[targetKey] = v;
                }
                results.push(merged);
            }
        }
    }
    
    return results;
}

/**
 * Flatten records
 */
export function flattenRecords<T>(
    records: readonly T[],
    field: string,
    preserveParent: boolean = true
): Record<string, unknown>[] {
    const results: Record<string, unknown>[] = [];
    
    for (const record of records) {
        const arrayValue = getNestedValue(record as Record<string, unknown>, field);
        
        if (Array.isArray(arrayValue)) {
            for (const item of arrayValue) {
                if (preserveParent) {
                    const parent = { ...(record as Record<string, unknown>) };
                    delete parent[field];
                    results.push({ ...parent, [field]: item });
                } else {
                    results.push(typeof item === 'object' ? item as Record<string, unknown> : { value: item });
                }
            }
        } else {
            results.push(record as Record<string, unknown>);
        }
    }
    
    return results;
}

/**
 * Distinct records
 */
export function distinctRecords<T>(
    records: readonly T[],
    fields: readonly string[]
): T[] {
    const seen = new Set<string>();
    const results: T[] = [];
    
    for (const record of records) {
        const keyParts = fields.map(field => {
            const value = getNestedValue(record as Record<string, unknown>, field);
            return JSON.stringify(value);
        });
        const key = keyParts.join('|');
        
        if (!seen.has(key)) {
            seen.add(key);
            results.push(record);
        }
    }
    
    return results;
}

// ============================================================================
// PIPELINE EXECUTION
// ============================================================================

/**
 * Execute pipeline
 */
export async function executePipeline<T, R>(
    pipelineId: string,
    data: readonly T[]
): Promise<TransformationResult<R[]>> {
    const pipeline = pipelines.get(pipelineId);
    if (!pipeline) {
        return {
            resultId: generateResultId(),
            success: false,
            data: [] as R[],
            errors: [{
                field: null,
                step: null,
                message: `Pipeline '${pipelineId}' not found`,
                code: 'PIPELINE_NOT_FOUND',
                value: null,
            }],
            warnings: [],
            metadata: {
                inputCount: data.length,
                outputCount: 0,
                duration: 0,
                timestamp: clock.nowMs(),
                stepsExecuted: 0,
                stepsSkipped: 0,
            },
        };
    }
    
    const startTime = clock.nowMs();
    const errors: TransformationError[] = [];
    const warnings: TransformationWarning[] = [];
    let currentData: unknown[] = [...data];
    let stepsExecuted = 0;
    let stepsSkipped = 0;
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'pipeline_started',
        pipelineId,
        stepId: null,
        timestamp: startTime,
        data: { inputCount: data.length },
    });
    
    for (const step of pipeline.steps) {
        if (step.condition && !currentData.every(record => evaluateCondition(record, step.condition!))) {
            stepsSkipped++;
            
            await emitEvent({
                eventId: generateEventId(),
                type: 'step_skipped',
                pipelineId,
                stepId: step.stepId,
                timestamp: clock.nowMs(),
                data: { reason: 'condition_not_met' },
            });
            
            continue;
        }
        
        await emitEvent({
            eventId: generateEventId(),
            type: 'step_started',
            pipelineId,
            stepId: step.stepId,
            timestamp: clock.nowMs(),
            data: { operation: step.operation },
        });
        
        try {
            currentData = executeStep(currentData, step);
            stepsExecuted++;
            
            await emitEvent({
                eventId: generateEventId(),
                type: 'step_completed',
                pipelineId,
                stepId: step.stepId,
                timestamp: clock.nowMs(),
                data: { outputCount: currentData.length },
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            
            await emitEvent({
                eventId: generateEventId(),
                type: 'step_failed',
                pipelineId,
                stepId: step.stepId,
                timestamp: clock.nowMs(),
                data: { error: errorMessage },
            });
            
            if (step.errorHandling.strategy === 'fail') {
                errors.push({
                    field: null,
                    step: step.stepId,
                    message: errorMessage,
                    code: 'STEP_FAILED',
                    value: null,
                });
                break;
            } else if (step.errorHandling.strategy === 'default') {
                currentData = [step.errorHandling.defaultValue];
            } else if (step.errorHandling.strategy === 'null') {
                currentData = [];
            }
        }
    }
    
    const duration = clock.nowMs() - startTime;
    const success = errors.length === 0;
    
    const mutableStats = statistics as {
        totalTransformations: number;
        successfulTransformations: number;
        failedTransformations: number;
        totalRecordsProcessed: number;
        avgTransformationTime: number;
    };
    
    mutableStats.totalTransformations++;
    if (success) {
        mutableStats.successfulTransformations++;
    } else {
        mutableStats.failedTransformations++;
    }
    mutableStats.totalRecordsProcessed += data.length;
    
    const totalTime = mutableStats.avgTransformationTime * (mutableStats.totalTransformations - 1) + duration;
    mutableStats.avgTransformationTime = totalTime / mutableStats.totalTransformations;
    
    await emitEvent({
        eventId: generateEventId(),
        type: success ? 'pipeline_completed' : 'pipeline_failed',
        pipelineId,
        stepId: null,
        timestamp: clock.nowMs(),
        data: { duration, outputCount: currentData.length },
    });
    
    return {
        resultId: generateResultId(),
        success,
        data: currentData as R[],
        errors,
        warnings,
        metadata: {
            inputCount: data.length,
            outputCount: currentData.length,
            duration,
            timestamp: clock.nowMs(),
            stepsExecuted,
            stepsSkipped,
        },
    };
}

/**
 * Execute step
 */
function executeStep(data: unknown[], step: TransformationStep): unknown[] {
    switch (step.operation) {
        case 'map':
            return mapRecords(data, step.config.mappings as FieldMapping[]);
        case 'filter':
            return filterRecords(data, step.config.condition as TransformCondition);
        case 'sort':
            return sortRecords(data, step.config.sortBy as { field: string; direction: 'asc' | 'desc' }[]);
        case 'distinct':
            return distinctRecords(data, step.config.fields as string[]);
        case 'flatten':
            return flattenRecords(data, step.config.field as string, step.config.preserveParent as boolean ?? true);
        case 'aggregate':
            return aggregateRecords(data, step.config as unknown as AggregationConfig);
        case 'join':
            return joinRecords(data, step.config.right as unknown[], step.config as unknown as JoinConfig);
        default:
            return data;
    }
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get statistics
 */
export function getStatistics(): Readonly<TransformerStatistics> {
    return { ...statistics };
}

/**
 * Reset statistics
 */
export function resetStatistics(): void {
    Object.assign(statistics, {
        totalTransformations: 0,
        successfulTransformations: 0,
        failedTransformations: 0,
        totalRecordsProcessed: 0,
        avgTransformationTime: 0,
        validationErrors: 0,
    });
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Add event listener
 */
export function addEventListener(listener: TransformerEventListener): void {
    eventListeners.add(listener);
}

/**
 * Remove event listener
 */
export function removeEventListener(listener: TransformerEventListener): void {
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
    schemas.clear();
    pipelines.clear();
    lookupTables.clear();
    eventListeners.clear();
    resetStatistics();
}
