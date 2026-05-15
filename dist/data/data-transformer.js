"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSchema = registerSchema;
exports.getSchema = getSchema;
exports.getAllSchemas = getAllSchemas;
exports.removeSchema = removeSchema;
exports.createPipeline = createPipeline;
exports.getPipeline = getPipeline;
exports.getAllPipelines = getAllPipelines;
exports.removePipeline = removePipeline;
exports.registerLookupTable = registerLookupTable;
exports.getLookupTable = getLookupTable;
exports.removeLookupTable = removeLookupTable;
exports.validateAgainstSchema = validateAgainstSchema;
exports.mapRecords = mapRecords;
exports.filterRecords = filterRecords;
exports.groupRecords = groupRecords;
exports.aggregateRecords = aggregateRecords;
exports.sortRecords = sortRecords;
exports.joinRecords = joinRecords;
exports.flattenRecords = flattenRecords;
exports.distinctRecords = distinctRecords;
exports.executePipeline = executePipeline;
exports.getStatistics = getStatistics;
exports.resetStatistics = resetStatistics;
exports.addEventListener = addEventListener;
exports.removeEventListener = removeEventListener;
exports.clearEventListeners = clearEventListeners;
exports.clearAll = clearAll;
const clock_1 = require("@mia/core/clock");
const deterministic_1 = require("@mia/core/deterministic");
const clock = (0, clock_1.getClock)();
// ============================================================================
// STANJE
// ============================================================================
const schemas = new Map();
const pipelines = new Map();
const lookupTables = new Map();
const eventListeners = new Set();
let schemaCounter = 0;
let pipelineCounter = 0;
let stepCounter = 0;
let resultCounter = 0;
let eventCounter = 0;
const statistics = {
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
function generateSchemaId() {
    schemaCounter++;
    return (0, deterministic_1.generateDeterministicId)(`schema-${schemaCounter}`);
}
/**
 * Generate pipeline ID
 */
function generatePipelineId() {
    pipelineCounter++;
    return (0, deterministic_1.generateDeterministicId)(`pipeline-${pipelineCounter}`);
}
/**
 * Generate step ID
 */
function generateStepId() {
    stepCounter++;
    return (0, deterministic_1.generateDeterministicId)(`step-${stepCounter}`);
}
/**
 * Generate result ID
 */
function generateResultId() {
    resultCounter++;
    return (0, deterministic_1.generateDeterministicId)(`result-${resultCounter}`);
}
/**
 * Generate event ID
 */
function generateEventId() {
    eventCounter++;
    return (0, deterministic_1.generateDeterministicId)(`transformer-event-${eventCounter}`);
}
/**
 * Emit transformer event
 */
async function emitEvent(event) {
    for (const listener of eventListeners) {
        try {
            await listener(event);
        }
        catch {
            // Ignore listener errors
        }
    }
}
/**
 * Get nested value
 */
function getNestedValue(obj, path) {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
        if (current === null || current === undefined) {
            return undefined;
        }
        if (typeof current !== 'object') {
            return undefined;
        }
        current = current[part];
    }
    return current;
}
/**
 * Set nested value
 */
function setNestedValue(obj, path, value) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!(part in current) || typeof current[part] !== 'object') {
            current[part] = {};
        }
        current = current[part];
    }
    current[parts[parts.length - 1]] = value;
}
/**
 * Infer data type
 */
function inferDataType(value) {
    if (value === null)
        return 'null';
    if (Array.isArray(value))
        return 'array';
    if (value instanceof Date)
        return 'date';
    if (typeof value === 'object')
        return 'object';
    if (typeof value === 'string')
        return 'string';
    if (typeof value === 'number')
        return 'number';
    if (typeof value === 'boolean')
        return 'boolean';
    return 'string';
}
/**
 * Convert value to type
 */
function convertToType(value, targetType) {
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
            return new Date(value);
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
function evaluateCondition(value, condition) {
    const fieldValue = typeof value === 'object' && value !== null
        ? getNestedValue(value, condition.field)
        : value;
    switch (condition.operator) {
        case 'eq':
            return fieldValue === condition.value;
        case 'ne':
            return fieldValue !== condition.value;
        case 'gt':
            return fieldValue > condition.value;
        case 'gte':
            return fieldValue >= condition.value;
        case 'lt':
            return fieldValue < condition.value;
        case 'lte':
            return fieldValue <= condition.value;
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
function applyFieldTransform(value, transform) {
    switch (transform.type) {
        case 'uppercase':
            return String(value).toUpperCase();
        case 'lowercase':
            return String(value).toLowerCase();
        case 'trim':
            return String(value).trim();
        case 'pad':
            const padLength = transform.params.length ?? 0;
            const padChar = transform.params.char ?? ' ';
            const padSide = transform.params.side ?? 'left';
            return padSide === 'left'
                ? String(value).padStart(padLength, padChar)
                : String(value).padEnd(padLength, padChar);
        case 'truncate':
            const maxLength = transform.params.length ?? 100;
            const suffix = transform.params.suffix ?? '...';
            const str = String(value);
            return str.length > maxLength ? str.slice(0, maxLength - suffix.length) + suffix : str;
        case 'replace':
            const pattern = transform.params.pattern;
            const replacement = transform.params.replacement ?? '';
            return String(value).replace(new RegExp(pattern, 'g'), replacement);
        case 'split':
            const delimiter = transform.params.delimiter ?? ',';
            return String(value).split(delimiter);
        case 'join':
            const joinDelimiter = transform.params.delimiter ?? ',';
            return Array.isArray(value) ? value.join(joinDelimiter) : String(value);
        case 'parse_int':
            return parseInt(String(value), transform.params.radix ?? 10);
        case 'parse_float':
            return parseFloat(String(value));
        case 'parse_date':
            return new Date(value);
        case 'format_date':
            const date = value instanceof Date ? value : new Date(value);
            return date.toISOString();
        case 'round':
            const decimals = transform.params.decimals ?? 0;
            const factor = Math.pow(10, decimals);
            return Math.round(value * factor) / factor;
        case 'floor':
            return Math.floor(value);
        case 'ceil':
            return Math.ceil(value);
        case 'abs':
            return Math.abs(value);
        case 'negate':
            return -value;
        case 'add':
            return value + (transform.params.value ?? 0);
        case 'subtract':
            return value - (transform.params.value ?? 0);
        case 'multiply':
            return value * (transform.params.value ?? 1);
        case 'divide':
            return value / (transform.params.value ?? 1);
        case 'concat':
            const prefix = transform.params.prefix ?? '';
            const concatSuffix = transform.params.suffix ?? '';
            return prefix + String(value) + concatSuffix;
        case 'template':
            const template = transform.params.template ?? '{{value}}';
            return template.replace('{{value}}', String(value));
        case 'lookup':
            const tableName = transform.params.table;
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
function registerSchema(name, fields, options = {}) {
    const schemaId = generateSchemaId();
    const schema = {
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
function getSchema(name) {
    return schemas.get(name) ?? null;
}
/**
 * Get all schemas
 */
function getAllSchemas() {
    return Array.from(schemas.values());
}
/**
 * Remove schema
 */
function removeSchema(name) {
    return schemas.delete(name);
}
// ============================================================================
// PIPELINE MANAGEMENT
// ============================================================================
/**
 * Create pipeline
 */
function createPipeline(name, steps, options = {}) {
    const pipelineId = generatePipelineId();
    const stepsWithIds = steps.map(step => ({
        ...step,
        stepId: generateStepId(),
    }));
    const pipeline = {
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
function getPipeline(pipelineId) {
    return pipelines.get(pipelineId) ?? null;
}
/**
 * Get all pipelines
 */
function getAllPipelines() {
    return Array.from(pipelines.values());
}
/**
 * Remove pipeline
 */
function removePipeline(pipelineId) {
    return pipelines.delete(pipelineId);
}
// ============================================================================
// LOOKUP TABLES
// ============================================================================
/**
 * Register lookup table
 */
function registerLookupTable(name, data) {
    const table = new Map();
    for (const [key, value] of Object.entries(data)) {
        table.set(key, value);
    }
    lookupTables.set(name, table);
}
/**
 * Get lookup table
 */
function getLookupTable(name) {
    return lookupTables.get(name) ?? null;
}
/**
 * Remove lookup table
 */
function removeLookupTable(name) {
    return lookupTables.delete(name);
}
// ============================================================================
// VALIDATION
// ============================================================================
/**
 * Validate data against schema
 */
function validateAgainstSchema(data, schemaName) {
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
    const errors = [];
    const record = data;
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
function runValidator(fieldName, value, validator) {
    switch (validator.type) {
        case 'min':
            if (value < validator.params.value) {
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
            if (value > validator.params.value) {
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
            if (String(value).length < validator.params.value) {
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
            if (String(value).length > validator.params.value) {
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
            if (!new RegExp(validator.params.pattern).test(String(value))) {
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
            }
            catch {
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
function mapRecords(records, mappings) {
    return records.map(record => {
        const result = {};
        const source = record;
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
        return result;
    });
}
/**
 * Filter records
 */
function filterRecords(records, condition) {
    return records.filter(record => evaluateCondition(record, condition));
}
/**
 * Group records
 */
function groupRecords(records, groupBy) {
    const groups = new Map();
    for (const record of records) {
        const keyParts = groupBy.map(field => {
            const value = getNestedValue(record, field);
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
function aggregateRecords(records, config) {
    const groups = groupRecords(records, config.groupBy);
    const results = [];
    for (const [key, groupRecords] of groups) {
        const result = {};
        const keyParts = key.split('|');
        for (let i = 0; i < config.groupBy.length; i++) {
            result[config.groupBy[i]] = keyParts[i];
        }
        for (const agg of config.aggregations) {
            const values = groupRecords.map(r => getNestedValue(r, agg.field)).filter(v => v !== undefined && v !== null);
            let aggregatedValue;
            switch (agg.operation) {
                case 'sum':
                    aggregatedValue = values.reduce((sum, v) => sum + v, 0);
                    break;
                case 'avg':
                    aggregatedValue = values.length > 0
                        ? values.reduce((sum, v) => sum + v, 0) / values.length
                        : 0;
                    break;
                case 'min':
                    aggregatedValue = Math.min(...values.map(v => v));
                    break;
                case 'max':
                    aggregatedValue = Math.max(...values.map(v => v));
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
function sortRecords(records, sortBy) {
    return [...records].sort((a, b) => {
        for (const sort of sortBy) {
            const aValue = getNestedValue(a, sort.field);
            const bValue = getNestedValue(b, sort.field);
            let comparison = 0;
            if (aValue < bValue)
                comparison = -1;
            if (aValue > bValue)
                comparison = 1;
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
function joinRecords(left, right, config) {
    const results = [];
    const rightMap = new Map();
    for (const record of right) {
        const key = String(getNestedValue(record, config.rightKey));
        const existing = rightMap.get(key) ?? [];
        existing.push(record);
        rightMap.set(key, existing);
    }
    for (const leftRecord of left) {
        const key = String(getNestedValue(leftRecord, config.leftKey));
        const rightRecords = rightMap.get(key) ?? [];
        if (rightRecords.length > 0) {
            for (const rightRecord of rightRecords) {
                const merged = { ...leftRecord };
                for (const [k, v] of Object.entries(rightRecord)) {
                    const targetKey = config.prefix ? `${config.prefix}${k}` : k;
                    merged[targetKey] = v;
                }
                results.push(merged);
            }
        }
        else if (config.type === 'left' || config.type === 'full') {
            results.push({ ...leftRecord });
        }
    }
    if (config.type === 'right' || config.type === 'full') {
        const leftKeys = new Set(left.map(r => String(getNestedValue(r, config.leftKey))));
        for (const rightRecord of right) {
            const key = String(getNestedValue(rightRecord, config.rightKey));
            if (!leftKeys.has(key)) {
                const merged = {};
                for (const [k, v] of Object.entries(rightRecord)) {
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
function flattenRecords(records, field, preserveParent = true) {
    const results = [];
    for (const record of records) {
        const arrayValue = getNestedValue(record, field);
        if (Array.isArray(arrayValue)) {
            for (const item of arrayValue) {
                if (preserveParent) {
                    const parent = { ...record };
                    delete parent[field];
                    results.push({ ...parent, [field]: item });
                }
                else {
                    results.push(typeof item === 'object' ? item : { value: item });
                }
            }
        }
        else {
            results.push(record);
        }
    }
    return results;
}
/**
 * Distinct records
 */
function distinctRecords(records, fields) {
    const seen = new Set();
    const results = [];
    for (const record of records) {
        const keyParts = fields.map(field => {
            const value = getNestedValue(record, field);
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
async function executePipeline(pipelineId, data) {
    const pipeline = pipelines.get(pipelineId);
    if (!pipeline) {
        return {
            resultId: generateResultId(),
            success: false,
            data: [],
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
    const errors = [];
    const warnings = [];
    let currentData = [...data];
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
        if (step.condition && !currentData.every(record => evaluateCondition(record, step.condition))) {
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
        }
        catch (error) {
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
            }
            else if (step.errorHandling.strategy === 'default') {
                currentData = [step.errorHandling.defaultValue];
            }
            else if (step.errorHandling.strategy === 'null') {
                currentData = [];
            }
        }
    }
    const duration = clock.nowMs() - startTime;
    const success = errors.length === 0;
    const mutableStats = statistics;
    mutableStats.totalTransformations++;
    if (success) {
        mutableStats.successfulTransformations++;
    }
    else {
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
        data: currentData,
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
function executeStep(data, step) {
    switch (step.operation) {
        case 'map':
            return mapRecords(data, step.config.mappings);
        case 'filter':
            return filterRecords(data, step.config.condition);
        case 'sort':
            return sortRecords(data, step.config.sortBy);
        case 'distinct':
            return distinctRecords(data, step.config.fields);
        case 'flatten':
            return flattenRecords(data, step.config.field, step.config.preserveParent ?? true);
        case 'aggregate':
            return aggregateRecords(data, step.config);
        case 'join':
            return joinRecords(data, step.config.right, step.config);
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
function getStatistics() {
    return { ...statistics };
}
/**
 * Reset statistics
 */
function resetStatistics() {
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
function addEventListener(listener) {
    eventListeners.add(listener);
}
/**
 * Remove event listener
 */
function removeEventListener(listener) {
    eventListeners.delete(listener);
}
/**
 * Clear event listeners
 */
function clearEventListeners() {
    eventListeners.clear();
}
// ============================================================================
// CLEANUP
// ============================================================================
/**
 * Clear all state
 */
function clearAll() {
    schemas.clear();
    pipelines.clear();
    lookupTables.clear();
    eventListeners.clear();
    resetStatistics();
}
