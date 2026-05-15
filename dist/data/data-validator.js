"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSchema = registerSchema;
exports.getSchema = getSchema;
exports.getAllSchemas = getAllSchemas;
exports.removeSchema = removeSchema;
exports.registerCustomValidator = registerCustomValidator;
exports.getCustomValidator = getCustomValidator;
exports.getAllCustomValidators = getAllCustomValidators;
exports.removeCustomValidator = removeCustomValidator;
exports.registerFormatValidator = registerFormatValidator;
exports.getFormatValidator = getFormatValidator;
exports.getAllFormatValidators = getAllFormatValidators;
exports.validate = validate;
exports.validateWithCustom = validateWithCustom;
exports.field = field;
exports.constraint = constraint;
exports.rule = rule;
exports.clearCache = clearCache;
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
const customValidators = new Map();
const formatValidators = new Map();
const eventListeners = new Set();
const validationCache = new Map();
let schemaCounter = 0;
let validatorCounter = 0;
let ruleCounter = 0;
let eventCounter = 0;
const defaultOptions = {
    abortEarly: false,
    stripUnknown: false,
    allowUnknown: false,
    recursive: true,
    coerce: false,
    context: {},
    cache: true,
    timeout: 5000,
};
const statistics = {
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
function generateSchemaId() {
    schemaCounter++;
    return (0, deterministic_1.generateDeterministicId)(`val-schema-${schemaCounter}`);
}
/**
 * Generate validator ID
 */
function generateValidatorId() {
    validatorCounter++;
    return (0, deterministic_1.generateDeterministicId)(`validator-${validatorCounter}`);
}
/**
 * Generate rule ID
 */
function generateRuleId() {
    ruleCounter++;
    return (0, deterministic_1.generateDeterministicId)(`val-rule-${ruleCounter}`);
}
/**
 * Generate event ID
 */
function generateEventId() {
    eventCounter++;
    return (0, deterministic_1.generateDeterministicId)(`val-event-${eventCounter}`);
}
/**
 * Emit validation event
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
 * Get cache key
 */
function getCacheKey(schemaId, data) {
    const dataStr = JSON.stringify(data);
    return `${schemaId}:${dataStr}`;
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
 * Check if value is empty
 */
function isEmpty(value) {
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
function coerceValue(value, type) {
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
            return new Date(value);
        default:
            return value;
    }
}
/**
 * Check type
 */
function checkType(value, type) {
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
                new URL(value);
                return true;
            }
            catch {
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
function evaluateCondition(condition, data) {
    const value = getNestedValue(data, condition.field);
    switch (condition.operator) {
        case 'eq':
            return value === condition.value;
        case 'ne':
            return value !== condition.value;
        case 'gt':
            return value > condition.value;
        case 'gte':
            return value >= condition.value;
        case 'lt':
            return value < condition.value;
        case 'lte':
            return value <= condition.value;
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
function initializeFormatValidators() {
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
function registerSchema(name, fields, options = {}) {
    const schemaId = generateSchemaId();
    const rules = (options.rules ?? []).map(rule => ({
        ...rule,
        ruleId: generateRuleId(),
    }));
    const schema = {
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
function getSchema(nameOrId) {
    return schemas.get(nameOrId) ?? null;
}
/**
 * Get all schemas
 */
function getAllSchemas() {
    const uniqueSchemas = new Map();
    for (const schema of schemas.values()) {
        uniqueSchemas.set(schema.schemaId, schema);
    }
    return Array.from(uniqueSchemas.values());
}
/**
 * Remove schema
 */
function removeSchema(nameOrId) {
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
function registerCustomValidator(name, validate, options = {}) {
    const validatorId = generateValidatorId();
    const validator = {
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
function getCustomValidator(name) {
    return customValidators.get(name) ?? null;
}
/**
 * Get all custom validators
 */
function getAllCustomValidators() {
    return Array.from(customValidators.values());
}
/**
 * Remove custom validator
 */
function removeCustomValidator(name) {
    return customValidators.delete(name);
}
// ============================================================================
// FORMAT VALIDATORS
// ============================================================================
/**
 * Register format validator
 */
function registerFormatValidator(name, pattern, message) {
    const validator = {
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
function getFormatValidator(name) {
    return formatValidators.get(name) ?? null;
}
/**
 * Get all format validators
 */
function getAllFormatValidators() {
    return Array.from(formatValidators.values());
}
// ============================================================================
// VALIDATION
// ============================================================================
/**
 * Validate data against schema
 */
async function validate(data, schemaNameOrId, options = {}) {
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
    const mergedOptions = { ...defaultOptions, ...options };
    const startTime = clock.nowMs();
    if (mergedOptions.cache) {
        const cacheKey = getCacheKey(schema.schemaId, data);
        const cached = validationCache.get(cacheKey);
        if (cached) {
            const mutableStats = statistics;
            mutableStats.cacheHits++;
            return {
                ...cached,
                metadata: {
                    ...cached.metadata,
                    cacheHit: true,
                },
            };
        }
        const mutableStats = statistics;
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
    const errors = [];
    const warnings = [];
    let fieldsValidated = 0;
    let rulesApplied = 0;
    const context = {
        data: data,
        path: '',
        schema,
        options: mergedOptions,
        cache: new Map(),
    };
    const record = data;
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
                }
                else {
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
                }
                else if (rule.severity === 'warning') {
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
        }
        catch (error) {
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
    const result = {
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
    const mutableStats = statistics;
    mutableStats.totalValidations++;
    if (valid) {
        mutableStats.successfulValidations++;
    }
    else {
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
function validateField(value, schema, path, context) {
    const errors = [];
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
            const fieldValue = value[fieldName];
            const fieldErrors = validateField(fieldValue, fieldSchema, fieldPath, context);
            errors.push(...fieldErrors);
        }
    }
    return errors;
}
/**
 * Validate constraint
 */
function validateConstraint(value, constraint, path) {
    const message = constraint.message ?? `Constraint '${constraint.type}' failed for field '${path}'`;
    switch (constraint.type) {
        case 'min':
            if (typeof value === 'number' && value < constraint.value) {
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
            if (typeof value === 'number' && value > constraint.value) {
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
            if (typeof value === 'string' && value.length < constraint.value) {
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
            if (Array.isArray(value) && value.length < constraint.value) {
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
            if (typeof value === 'string' && value.length > constraint.value) {
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
            if (Array.isArray(value) && value.length > constraint.value) {
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
            if (typeof value === 'string' && !new RegExp(constraint.value).test(value)) {
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
            const formatValidator = formatValidators.get(constraint.value);
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
async function validateWithCustom(value, validatorName, params = {}, context) {
    const validator = customValidators.get(validatorName);
    if (!validator) {
        return `Custom validator '${validatorName}' not found`;
    }
    const fullContext = {
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
function field(type, options = {}) {
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
function constraint(type, value, message) {
    return {
        type,
        value,
        message: message ?? null,
    };
}
/**
 * Create rule
 */
function rule(name, validator, options = {}) {
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
function clearCache() {
    validationCache.clear();
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
    customValidators.clear();
    eventListeners.clear();
    validationCache.clear();
    initializeFormatValidators();
    resetStatistics();
}
