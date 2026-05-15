/**
 * @file Data Validator za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 * 
 * @requirement ZAH-ZALEDNI-DATA-002 Data validation za zaledne sisteme
 * @design DSN-ZALEDNI-DATA-002 Backend data validator arhitektura
 * @test TEST-ZALEDNI-DATA-002 Preverjanje data validator
 * 
 * Data Validator - prilagojen za zaledne sisteme:
 * - Schema validation
 * - Type checking
 * - Constraint validation
 * - Custom validators
 * - Async validation
 * - Conditional validation
 * - Error formatting
 * - Validation caching
 * 
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom DATA_002 - Data Validator
 */

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI ZA DATA VALIDATOR
// ============================================================================

/**
 * Validation result
 */
export interface ValidationResult {
    readonly valid: boolean;
    readonly errors: readonly ValidationError[];
    readonly warnings: readonly ValidationWarning[];
    readonly metadata: ValidationMetadata;
}

/**
 * Validation error
 */
export interface ValidationError {
    readonly path: string;
    readonly message: string;
    readonly code: string;
    readonly value: unknown;
    readonly constraint: string | null;
    readonly expected: unknown;
    readonly actual: unknown;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
    readonly path: string;
    readonly message: string;
    readonly code: string;
    readonly suggestion: string | null;
}

/**
 * Validation metadata
 */
export interface ValidationMetadata {
    readonly validatedAt: number;
    readonly duration: number;
    readonly rulesApplied: number;
    readonly fieldsValidated: number;
    readonly cacheHit: boolean;
}

/**
 * Validation schema
 */
export interface ValidationSchema {
    readonly schemaId: string;
    readonly name: string;
    readonly version: string;
    readonly fields: Readonly<Record<string, FieldSchema>>;
    readonly rules: readonly SchemaRule[];
    readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Field schema
 */
export interface FieldSchema {
    readonly type: FieldType;
    readonly required: boolean;
    readonly nullable: boolean;
    readonly defaultValue: unknown;
    readonly constraints: readonly FieldConstraint[];
    readonly nested: ValidationSchema | null;
    readonly arrayOf: FieldSchema | null;
    readonly description: string;
}

/**
 * Field type
 */
export type FieldType = 
    | 'string'
    | 'number'
    | 'integer'
    | 'boolean'
    | 'date'
    | 'datetime'
    | 'email'
    | 'url'
    | 'uuid'
    | 'array'
    | 'object'
    | 'any';

/**
 * Field constraint
 */
export interface FieldConstraint {
    readonly type: ConstraintType;
    readonly value: unknown;
    readonly message: string | null;
}

/**
 * Constraint type
 */
export type ConstraintType =
    | 'min'
    | 'max'
    | 'minLength'
    | 'maxLength'
    | 'pattern'
    | 'enum'
    | 'format'
    | 'unique'
    | 'custom';

/**
 * Schema rule
 */
export interface SchemaRule {
    readonly ruleId: string;
    readonly name: string;
    readonly type: RuleType;
    readonly condition: RuleCondition | null;
    readonly validator: RuleValidator;
    readonly message: string;
    readonly severity: RuleSeverity;
}

/**
 * Rule type
 */
export type RuleType = 'field' | 'cross_field' | 'conditional' | 'async' | 'custom';

/**
 * Rule condition
 */
export interface RuleCondition {
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
    | 'notIn'
    | 'contains'
    | 'startsWith'
    | 'endsWith'
    | 'matches'
    | 'isNull'
    | 'isNotNull';

/**
 * Rule validator
 */
export type RuleValidator = (value: unknown, context: ValidationContext) => boolean | Promise<boolean>;

/**
 * Rule severity
 */
export type RuleSeverity = 'error' | 'warning' | 'info';

/**
 * Validation context
 */
export interface ValidationContext {
    readonly data: Readonly<Record<string, unknown>>;
    readonly path: string;
    readonly schema: ValidationSchema;
    readonly options: ValidationOptions;
    readonly cache: Map<string, unknown>;
}

/**
 * Validation options
 */
export interface ValidationOptions {
    readonly abortEarly: boolean;
    readonly stripUnknown: boolean;
    readonly allowUnknown: boolean;
    readonly recursive: boolean;
    readonly coerce: boolean;
    readonly context: Readonly<Record<string, unknown>>;
    readonly cache: boolean;
    readonly timeout: number;
}

/**
 * Custom validator
 */
export interface CustomValidator {
    readonly validatorId: string;
    readonly name: string;
    readonly description: string;
    readonly validate: ValidatorFunction;
    readonly async: boolean;
}

/**
 * Validator function
 */
export type ValidatorFunction = (
    value: unknown,
    params: Readonly<Record<string, unknown>>,
    context: ValidationContext
) => boolean | string | Promise<boolean | string>;

/**
 * Validation event
 */
export interface ValidationEvent {
    readonly eventId: string;
    readonly type: ValidationEventType;
    readonly schemaId: string | null;
    readonly path: string | null;
    readonly timestamp: number;
    readonly data: Readonly<Record<string, unknown>>;
}

/**
 * Validation event type
 */
export type ValidationEventType =
    | 'validation_started'
    | 'validation_completed'
    | 'validation_failed'
    | 'field_validated'
    | 'rule_applied'
    | 'schema_registered'
    | 'validator_registered';

/**
 * Validation event listener
 */
export type ValidationEventListener = (event: ValidationEvent) => void | Promise<void>;

/**
 * Validator statistics
 */
export interface ValidatorStatistics {
    readonly totalValidations: number;
    readonly successfulValidations: number;
    readonly failedValidations: number;
    readonly totalErrors: number;
    readonly totalWarnings: number;
    readonly avgValidationTime: number;
    readonly cacheHits: number;
    readonly cacheMisses: number;
}

/**
 * Format validator
 */
export interface FormatValidator {
    readonly name: string;
    readonly pattern: RegExp;
    readonly message: string;
}

// ============================================================================
// STANJE
// ============================================================================

const schemas: Map<string, ValidationSchema> = new Map();
const customValidators: Map<string, CustomValidator> = new Map();
const formatValidators: Map<string, FormatValidator> = new Map();
const eventListeners: Set<ValidationEventListener> = new Set();
const validationCache: Map<string, ValidationResult> = new Map();

let schemaCounter = 0;
let validatorCounter = 0;
let ruleCounter = 0;
let eventCounter = 0;

const defaultOptions: ValidationOptions = {
    abortEarly: false,
    stripUnknown: false,
    allowUnknown: false,
    recursive: true,
    coerce: false,
    context: {},
    cache: true,
    timeout: 5000,
};

const statistics: ValidatorStatistics = {
    totalValidations: 0,
    successfulValidations: 0,
    failedValidations: 0,
    totalErrors: 0,
    totalWarnings: 0,
    avgValidationTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
};

// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================

/**
 * Generate schema ID
 */
function generateSchemaId(): string {
    schemaCounter++;
    return generateDeterministicId(`val-schema-${schemaCounter}`);
}

/**
 * Generate validator ID
 */
function generateValidatorId(): string {
    validatorCounter++;
    return generateDeterministicId(`validator-${validatorCounter}`);
}

/**
 * Generate rule ID
 */
function generateRuleId(): string {
    ruleCounter++;
    return generateDeterministicId(`val-rule-${ruleCounter}`);
}

/**
 * Generate event ID
 */
function generateEventId(): string {
    eventCounter++;
    return generateDeterministicId(`val-event-${eventCounter}`);
}

/**
 * Emit validation event
 */
async function emitEvent(event: ValidationEvent): Promise<void> {
    for (const listener of eventListeners) {
        try {
            await listener(event);
        } catch {
            // Ignore listener errors
        }
    }
}

/**
 * Get cache key
 */
function getCacheKey(schemaId: string, data: unknown): string {
    const dataStr = JSON.stringify(data);
    return `${schemaId}:${dataStr}`;
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
 * Check if value is empty
 */
function isEmpty(value: unknown): boolean {
    if (value === null || value === undefined) {
        return true;
    }
    if (typeof value === 'string' && value.trim() === '') {
        return true;
    }
    if (Array.isArray(value) && value.length === 0) {
        return true;
    }
    if (typeof value === 'object' && Object.keys(value).length === 0) {
        return true;
    }
    return false;
}

/**
 * Coerce value to type
 */
function coerceValue(value: unknown, type: FieldType): unknown {
    if (value === null || value === undefined) {
        return value;
    }
    
    switch (type) {
        case 'string':
            return String(value);
        case 'number':
            return Number(value);
        case 'integer':
            return Math.floor(Number(value));
        case 'boolean':
            if (typeof value === 'string') {
                return value.toLowerCase() === 'true' || value === '1';
            }
            return Boolean(value);
        case 'date':
        case 'datetime':
            return new Date(value as string | number);
        default:
            return value;
    }
}

/**
 * Check type
 */
function checkType(value: unknown, type: FieldType): boolean {
    if (value === null || value === undefined) {
        return true;
    }
    
    switch (type) {
        case 'string':
            return typeof value === 'string';
        case 'number':
            return typeof value === 'number' && !isNaN(value);
        case 'integer':
            return typeof value === 'number' && Number.isInteger(value);
        case 'boolean':
            return typeof value === 'boolean';
        case 'date':
        case 'datetime':
            return value instanceof Date && !isNaN(value.getTime());
        case 'email':
            return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        case 'url':
            try {
                new URL(value as string);
                return true;
            } catch {
                return false;
            }
        case 'uuid':
            return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
        case 'array':
            return Array.isArray(value);
        case 'object':
            return typeof value === 'object' && !Array.isArray(value);
        case 'any':
            return true;
    }
}

/**
 * Evaluate condition
 */
function evaluateCondition(condition: RuleCondition, data: Record<string, unknown>): boolean {
    const value = getNestedValue(data, condition.field);
    
    switch (condition.operator) {
        case 'eq':
            return value === condition.value;
        case 'ne':
            return value !== condition.value;
        case 'gt':
            return (value as number) > (condition.value as number);
        case 'gte':
            return (value as number) >= (condition.value as number);
        case 'lt':
            return (value as number) < (condition.value as number);
        case 'lte':
            return (value as number) <= (condition.value as number);
        case 'in':
            return Array.isArray(condition.value) && condition.value.includes(value);
        case 'notIn':
            return Array.isArray(condition.value) && !condition.value.includes(value);
        case 'contains':
            return String(value).includes(String(condition.value));
        case 'startsWith':
            return String(value).startsWith(String(condition.value));
        case 'endsWith':
            return String(value).endsWith(String(condition.value));
        case 'matches':
            return new RegExp(String(condition.value)).test(String(value));
        case 'isNull':
            return value === null || value === undefined;
        case 'isNotNull':
            return value !== null && value !== undefined;
    }
}

// ============================================================================
// BUILT-IN FORMAT VALIDATORS
// ============================================================================

/**
 * Initialize built-in format validators
 */
function initializeFormatValidators(): void {
    formatValidators.set('email', {
        name: 'email',
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: 'Invalid email format',
    });
    
    formatValidators.set('url', {
        name: 'url',
        pattern: /^https?:\/\/[^\s]+$/,
        message: 'Invalid URL format',
    });
    
    formatValidators.set('uuid', {
        name: 'uuid',
        pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        message: 'Invalid UUID format',
    });
    
    formatValidators.set('ipv4', {
        name: 'ipv4',
        pattern: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
        message: 'Invalid IPv4 format',
    });
    
    formatValidators.set('ipv6', {
        name: 'ipv6',
        pattern: /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
        message: 'Invalid IPv6 format',
    });
    
    formatValidators.set('date', {
        name: 'date',
        pattern: /^\d{4}-\d{2}-\d{2}$/,
        message: 'Invalid date format (YYYY-MM-DD)',
    });
    
    formatValidators.set('datetime', {
        name: 'datetime',
        pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?$/,
        message: 'Invalid datetime format (ISO 8601)',
    });
    
    formatValidators.set('time', {
        name: 'time',
        pattern: /^\d{2}:\d{2}:\d{2}$/,
        message: 'Invalid time format (HH:MM:SS)',
    });
    
    formatValidators.set('phone', {
        name: 'phone',
        pattern: /^\+?[1-9]\d{1,14}$/,
        message: 'Invalid phone number format',
    });
    
    formatValidators.set('creditCard', {
        name: 'creditCard',
        pattern: /^\d{13,19}$/,
        message: 'Invalid credit card number format',
    });
    
    formatValidators.set('alphanumeric', {
        name: 'alphanumeric',
        pattern: /^[a-zA-Z0-9]+$/,
        message: 'Must contain only alphanumeric characters',
    });
    
    formatValidators.set('slug', {
        name: 'slug',
        pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        message: 'Invalid slug format',
    });
}

initializeFormatValidators();

// ============================================================================
// SCHEMA MANAGEMENT
// ============================================================================

/**
 * Register schema
 */
export function registerSchema(
    name: string,
    fields: Record<string, FieldSchema>,
    options: {
        version?: string;
        rules?: readonly Omit<SchemaRule, 'ruleId'>[];
        metadata?: Record<string, unknown>;
    } = {}
): ValidationSchema {
    const schemaId = generateSchemaId();
    
    const rules: SchemaRule[] = (options.rules ?? []).map(rule => ({
        ...rule,
        ruleId: generateRuleId(),
    }));
    
    const schema: ValidationSchema = {
        schemaId,
        name,
        version: options.version ?? '1.0.0',
        fields,
        rules,
        metadata: options.metadata ?? {},
    };
    
    schemas.set(schemaId, schema);
    schemas.set(name, schema);
    
    emitEvent({
        eventId: generateEventId(),
        type: 'schema_registered',
        schemaId,
        path: null,
        timestamp: clock.nowMs(),
        data: { name, fieldCount: Object.keys(fields).length },
    });
    
    return schema;
}

/**
 * Get schema
 */
export function getSchema(nameOrId: string): ValidationSchema | null {
    return schemas.get(nameOrId) ?? null;
}

/**
 * Get all schemas
 */
export function getAllSchemas(): readonly ValidationSchema[] {
    const uniqueSchemas = new Map<string, ValidationSchema>();
    for (const schema of schemas.values()) {
        uniqueSchemas.set(schema.schemaId, schema);
    }
    return Array.from(uniqueSchemas.values());
}

/**
 * Remove schema
 */
export function removeSchema(nameOrId: string): boolean {
    const schema = schemas.get(nameOrId);
    if (!schema) {
        return false;
    }
    
    schemas.delete(schema.schemaId);
    schemas.delete(schema.name);
    
    return true;
}

// ============================================================================
// CUSTOM VALIDATORS
// ============================================================================

/**
 * Register custom validator
 */
export function registerCustomValidator(
    name: string,
    validate: ValidatorFunction,
    options: {
        description?: string;
        async?: boolean;
    } = {}
): CustomValidator {
    const validatorId = generateValidatorId();
    
    const validator: CustomValidator = {
        validatorId,
        name,
        description: options.description ?? '',
        validate,
        async: options.async ?? false,
    };
    
    customValidators.set(name, validator);
    
    emitEvent({
        eventId: generateEventId(),
        type: 'validator_registered',
        schemaId: null,
        path: null,
        timestamp: clock.nowMs(),
        data: { name, async: validator.async },
    });
    
    return validator;
}

/**
 * Get custom validator
 */
export function getCustomValidator(name: string): CustomValidator | null {
    return customValidators.get(name) ?? null;
}

/**
 * Get all custom validators
 */
export function getAllCustomValidators(): readonly CustomValidator[] {
    return Array.from(customValidators.values());
}

/**
 * Remove custom validator
 */
export function removeCustomValidator(name: string): boolean {
    return customValidators.delete(name);
}

// ============================================================================
// FORMAT VALIDATORS
// ============================================================================

/**
 * Register format validator
 */
export function registerFormatValidator(
    name: string,
    pattern: RegExp,
    message: string
): FormatValidator {
    const validator: FormatValidator = {
        name,
        pattern,
        message,
    };
    
    formatValidators.set(name, validator);
    
    return validator;
}

/**
 * Get format validator
 */
export function getFormatValidator(name: string): FormatValidator | null {
    return formatValidators.get(name) ?? null;
}

/**
 * Get all format validators
 */
export function getAllFormatValidators(): readonly FormatValidator[] {
    return Array.from(formatValidators.values());
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate data against schema
 */
export async function validate(
    data: unknown,
    schemaNameOrId: string,
    options: Partial<ValidationOptions> = {}
): Promise<ValidationResult> {
    const schema = schemas.get(schemaNameOrId);
    if (!schema) {
        return {
            valid: false,
            errors: [{
                path: '',
                message: `Schema '${schemaNameOrId}' not found`,
                code: 'SCHEMA_NOT_FOUND',
                value: null,
                constraint: null,
                expected: 'existing schema',
                actual: schemaNameOrId,
            }],
            warnings: [],
            metadata: {
                validatedAt: clock.nowMs(),
                duration: 0,
                rulesApplied: 0,
                fieldsValidated: 0,
                cacheHit: false,
            },
        };
    }
    
    const mergedOptions: ValidationOptions = { ...defaultOptions, ...options };
    const startTime = clock.nowMs();
    
    if (mergedOptions.cache) {
        const cacheKey = getCacheKey(schema.schemaId, data);
        const cached = validationCache.get(cacheKey);
        
        if (cached) {
            const mutableStats = statistics as { cacheHits: number };
            mutableStats.cacheHits++;
            
            return {
                ...cached,
                metadata: {
                    ...cached.metadata,
                    cacheHit: true,
                },
            };
        }
        
        const mutableStats = statistics as { cacheMisses: number };
        mutableStats.cacheMisses++;
    }
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'validation_started',
        schemaId: schema.schemaId,
        path: null,
        timestamp: startTime,
        data: {},
    });
    
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let fieldsValidated = 0;
    let rulesApplied = 0;
    
    const context: ValidationContext = {
        data: data as Record<string, unknown>,
        path: '',
        schema,
        options: mergedOptions,
        cache: new Map(),
    };
    
    const record = data as Record<string, unknown>;
    
    for (const [fieldName, fieldSchema] of Object.entries(schema.fields)) {
        const fieldPath = fieldName;
        let value = record[fieldName];
        
        if (mergedOptions.coerce && value !== undefined) {
            value = coerceValue(value, fieldSchema.type);
        }
        
        const fieldErrors = validateField(value, fieldSchema, fieldPath, context);
        errors.push(...fieldErrors);
        fieldsValidated++;
        
        if (mergedOptions.abortEarly && errors.length > 0) {
            break;
        }
    }
    
    if (!mergedOptions.allowUnknown) {
        for (const key of Object.keys(record)) {
            if (!(key in schema.fields)) {
                if (mergedOptions.stripUnknown) {
                    delete record[key];
                } else {
                    errors.push({
                        path: key,
                        message: `Unknown field '${key}'`,
                        code: 'UNKNOWN_FIELD',
                        value: record[key],
                        constraint: null,
                        expected: 'known field',
                        actual: key,
                    });
                }
            }
        }
    }
    
    for (const rule of schema.rules) {
        if (rule.condition && !evaluateCondition(rule.condition, record)) {
            continue;
        }
        
        try {
            const isValid = await rule.validator(record, context);
            rulesApplied++;
            
            if (!isValid) {
                if (rule.severity === 'error') {
                    errors.push({
                        path: '',
                        message: rule.message,
                        code: `RULE_${rule.ruleId}`,
                        value: record,
                        constraint: rule.name,
                        expected: 'valid',
                        actual: 'invalid',
                    });
                } else if (rule.severity === 'warning') {
                    warnings.push({
                        path: '',
                        message: rule.message,
                        code: `RULE_${rule.ruleId}`,
                        suggestion: null,
                    });
                }
            }
            
            await emitEvent({
                eventId: generateEventId(),
                type: 'rule_applied',
                schemaId: schema.schemaId,
                path: null,
                timestamp: clock.nowMs(),
                data: { ruleName: rule.name, valid: isValid },
            });
        } catch (error) {
            errors.push({
                path: '',
                message: `Rule '${rule.name}' failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                code: 'RULE_ERROR',
                value: record,
                constraint: rule.name,
                expected: 'successful validation',
                actual: 'error',
            });
        }
        
        if (mergedOptions.abortEarly && errors.length > 0) {
            break;
        }
    }
    
    const duration = clock.nowMs() - startTime;
    const valid = errors.length === 0;
    
    const result: ValidationResult = {
        valid,
        errors,
        warnings,
        metadata: {
            validatedAt: startTime,
            duration,
            rulesApplied,
            fieldsValidated,
            cacheHit: false,
        },
    };
    
    if (mergedOptions.cache) {
        const cacheKey = getCacheKey(schema.schemaId, data);
        validationCache.set(cacheKey, result);
    }
    
    const mutableStats = statistics as {
        totalValidations: number;
        successfulValidations: number;
        failedValidations: number;
        totalErrors: number;
        totalWarnings: number;
        avgValidationTime: number;
    };
    
    mutableStats.totalValidations++;
    if (valid) {
        mutableStats.successfulValidations++;
    } else {
        mutableStats.failedValidations++;
    }
    mutableStats.totalErrors += errors.length;
    mutableStats.totalWarnings += warnings.length;
    
    const totalTime = mutableStats.avgValidationTime * (mutableStats.totalValidations - 1) + duration;
    mutableStats.avgValidationTime = totalTime / mutableStats.totalValidations;
    
    await emitEvent({
        eventId: generateEventId(),
        type: valid ? 'validation_completed' : 'validation_failed',
        schemaId: schema.schemaId,
        path: null,
        timestamp: clock.nowMs(),
        data: { valid, errorCount: errors.length, duration },
    });
    
    return result;
}

/**
 * Validate field
 */
function validateField(
    value: unknown,
    schema: FieldSchema,
    path: string,
    context: ValidationContext
): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (schema.required && isEmpty(value)) {
        errors.push({
            path,
            message: `Field '${path}' is required`,
            code: 'REQUIRED',
            value,
            constraint: 'required',
            expected: 'non-empty value',
            actual: value,
        });
        return errors;
    }
    
    if (isEmpty(value)) {
        return errors;
    }
    
    if (!schema.nullable && value === null) {
        errors.push({
            path,
            message: `Field '${path}' cannot be null`,
            code: 'NOT_NULLABLE',
            value,
            constraint: 'nullable',
            expected: 'non-null value',
            actual: null,
        });
        return errors;
    }
    
    if (value === null) {
        return errors;
    }
    
    if (!checkType(value, schema.type)) {
        errors.push({
            path,
            message: `Field '${path}' must be of type '${schema.type}'`,
            code: 'TYPE_MISMATCH',
            value,
            constraint: 'type',
            expected: schema.type,
            actual: typeof value,
        });
        return errors;
    }
    
    for (const constraint of schema.constraints) {
        const constraintError = validateConstraint(value, constraint, path);
        if (constraintError) {
            errors.push(constraintError);
        }
    }
    
    if (schema.type === 'array' && Array.isArray(value) && schema.arrayOf) {
        for (let i = 0; i < value.length; i++) {
            const itemPath = `${path}[${i}]`;
            const itemErrors = validateField(value[i], schema.arrayOf, itemPath, context);
            errors.push(...itemErrors);
        }
    }
    
    if (schema.type === 'object' && schema.nested && typeof value === 'object') {
        for (const [fieldName, fieldSchema] of Object.entries(schema.nested.fields)) {
            const fieldPath = `${path}.${fieldName}`;
            const fieldValue = (value as Record<string, unknown>)[fieldName];
            const fieldErrors = validateField(fieldValue, fieldSchema, fieldPath, context);
            errors.push(...fieldErrors);
        }
    }
    
    return errors;
}

/**
 * Validate constraint
 */
function validateConstraint(
    value: unknown,
    constraint: FieldConstraint,
    path: string
): ValidationError | null {
    const message = constraint.message ?? `Constraint '${constraint.type}' failed for field '${path}'`;
    
    switch (constraint.type) {
        case 'min':
            if (typeof value === 'number' && value < (constraint.value as number)) {
                return {
                    path,
                    message,
                    code: 'MIN',
                    value,
                    constraint: 'min',
                    expected: `>= ${constraint.value}`,
                    actual: value,
                };
            }
            break;
        case 'max':
            if (typeof value === 'number' && value > (constraint.value as number)) {
                return {
                    path,
                    message,
                    code: 'MAX',
                    value,
                    constraint: 'max',
                    expected: `<= ${constraint.value}`,
                    actual: value,
                };
            }
            break;
        case 'minLength':
            if (typeof value === 'string' && value.length < (constraint.value as number)) {
                return {
                    path,
                    message,
                    code: 'MIN_LENGTH',
                    value,
                    constraint: 'minLength',
                    expected: `length >= ${constraint.value}`,
                    actual: value.length,
                };
            }
            if (Array.isArray(value) && value.length < (constraint.value as number)) {
                return {
                    path,
                    message,
                    code: 'MIN_LENGTH',
                    value,
                    constraint: 'minLength',
                    expected: `length >= ${constraint.value}`,
                    actual: value.length,
                };
            }
            break;
        case 'maxLength':
            if (typeof value === 'string' && value.length > (constraint.value as number)) {
                return {
                    path,
                    message,
                    code: 'MAX_LENGTH',
                    value,
                    constraint: 'maxLength',
                    expected: `length <= ${constraint.value}`,
                    actual: value.length,
                };
            }
            if (Array.isArray(value) && value.length > (constraint.value as number)) {
                return {
                    path,
                    message,
                    code: 'MAX_LENGTH',
                    value,
                    constraint: 'maxLength',
                    expected: `length <= ${constraint.value}`,
                    actual: value.length,
                };
            }
            break;
        case 'pattern':
            if (typeof value === 'string' && !new RegExp(constraint.value as string).test(value)) {
                return {
                    path,
                    message,
                    code: 'PATTERN',
                    value,
                    constraint: 'pattern',
                    expected: constraint.value,
                    actual: value,
                };
            }
            break;
        case 'enum':
            if (Array.isArray(constraint.value) && !constraint.value.includes(value)) {
                return {
                    path,
                    message,
                    code: 'ENUM',
                    value,
                    constraint: 'enum',
                    expected: constraint.value,
                    actual: value,
                };
            }
            break;
        case 'format':
            const formatValidator = formatValidators.get(constraint.value as string);
            if (formatValidator && typeof value === 'string' && !formatValidator.pattern.test(value)) {
                return {
                    path,
                    message: formatValidator.message,
                    code: 'FORMAT',
                    value,
                    constraint: 'format',
                    expected: constraint.value,
                    actual: value,
                };
            }
            break;
    }
    
    return null;
}

/**
 * Validate with custom validator
 */
export async function validateWithCustom(
    value: unknown,
    validatorName: string,
    params: Record<string, unknown> = {},
    context?: Partial<ValidationContext>
): Promise<boolean | string> {
    const validator = customValidators.get(validatorName);
    if (!validator) {
        return `Custom validator '${validatorName}' not found`;
    }
    
    const fullContext: ValidationContext = {
        data: context?.data ?? {},
        path: context?.path ?? '',
        schema: context?.schema ?? { schemaId: '', name: '', version: '', fields: {}, rules: [], metadata: {} },
        options: context?.options ?? defaultOptions,
        cache: context?.cache ?? new Map(),
    };
    
    return validator.validate(value, params, fullContext);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create field schema
 */
export function field(
    type: FieldType,
    options: {
        required?: boolean;
        nullable?: boolean;
        defaultValue?: unknown;
        constraints?: readonly FieldConstraint[];
        nested?: ValidationSchema;
        arrayOf?: FieldSchema;
        description?: string;
    } = {}
): FieldSchema {
    return {
        type,
        required: options.required ?? false,
        nullable: options.nullable ?? false,
        defaultValue: options.defaultValue,
        constraints: options.constraints ?? [],
        nested: options.nested ?? null,
        arrayOf: options.arrayOf ?? null,
        description: options.description ?? '',
    };
}

/**
 * Create constraint
 */
export function constraint(
    type: ConstraintType,
    value: unknown,
    message?: string
): FieldConstraint {
    return {
        type,
        value,
        message: message ?? null,
    };
}

/**
 * Create rule
 */
export function rule(
    name: string,
    validator: RuleValidator,
    options: {
        type?: RuleType;
        condition?: RuleCondition;
        message?: string;
        severity?: RuleSeverity;
    } = {}
): Omit<SchemaRule, 'ruleId'> {
    return {
        name,
        type: options.type ?? 'custom',
        condition: options.condition ?? null,
        validator,
        message: options.message ?? `Rule '${name}' failed`,
        severity: options.severity ?? 'error',
    };
}

/**
 * Clear validation cache
 */
export function clearCache(): void {
    validationCache.clear();
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get statistics
 */
export function getStatistics(): Readonly<ValidatorStatistics> {
    return { ...statistics };
}

/**
 * Reset statistics
 */
export function resetStatistics(): void {
    Object.assign(statistics, {
        totalValidations: 0,
        successfulValidations: 0,
        failedValidations: 0,
        totalErrors: 0,
        totalWarnings: 0,
        avgValidationTime: 0,
        cacheHits: 0,
        cacheMisses: 0,
    });
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Add event listener
 */
export function addEventListener(listener: ValidationEventListener): void {
    eventListeners.add(listener);
}

/**
 * Remove event listener
 */
export function removeEventListener(listener: ValidationEventListener): void {
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
    customValidators.clear();
    eventListeners.clear();
    validationCache.clear();
    initializeFormatValidators();
    resetStatistics();
}
