"use strict";
/**
 * @file Input validation modul za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-SEC-007 Input validacija za zaledne sisteme
 * @design DSN-ZALEDNI-SEC-007 Backend input validation arhitektura
 * @test TEST-ZALEDNI-SEC-007 Preverjanje input validacije
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom SEC_007 - Input Validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Validation = void 0;
exports.validate = validate;
exports.sanitize = sanitize;
exports.sanitizeObject = sanitizeObject;
exports.createValidator = createValidator;
// ============================================================================
// REGEX VZORCI
// ============================================================================
const PATTERNS = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    url: /^https?:\/\/[^\s/$.?#].[^\s]*$/,
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    date: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/,
    alphanumeric: /^[a-zA-Z0-9]+$/,
    slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
};
// ============================================================================
// FUNKCIJE
// ============================================================================
/**
 * Validiraj vrednost proti pravilu
 */
function validateValue(value, rule) {
    const errors = [];
    // Preveri obveznost
    if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(rule.message || 'Field is required');
        return errors;
    }
    // Ce ni obvezno in je prazno, preskoci
    if (!rule.required && (value === undefined || value === null || value === '')) {
        return errors;
    }
    // Validiraj glede na tip
    switch (rule.type) {
        case 'string':
            if (typeof value !== 'string') {
                errors.push(rule.message || 'Must be a string');
            }
            else {
                if (rule.min !== undefined && value.length < rule.min) {
                    errors.push(rule.message || `Minimum length is ${rule.min}`);
                }
                if (rule.max !== undefined && value.length > rule.max) {
                    errors.push(rule.message || `Maximum length is ${rule.max}`);
                }
                if (rule.pattern) {
                    const regex = new RegExp(rule.pattern);
                    if (!regex.test(value)) {
                        errors.push(rule.message || 'Invalid format');
                    }
                }
            }
            break;
        case 'number':
            const num = typeof value === 'number' ? value : parseFloat(String(value));
            if (isNaN(num)) {
                errors.push(rule.message || 'Must be a number');
            }
            else {
                if (rule.min !== undefined && num < rule.min) {
                    errors.push(rule.message || `Minimum value is ${rule.min}`);
                }
                if (rule.max !== undefined && num > rule.max) {
                    errors.push(rule.message || `Maximum value is ${rule.max}`);
                }
            }
            break;
        case 'boolean':
            if (typeof value !== 'boolean') {
                errors.push(rule.message || 'Must be a boolean');
            }
            break;
        case 'email':
            if (typeof value !== 'string' || !PATTERNS.email.test(value)) {
                errors.push(rule.message || 'Invalid email address');
            }
            break;
        case 'url':
            if (typeof value !== 'string' || !PATTERNS.url.test(value)) {
                errors.push(rule.message || 'Invalid URL');
            }
            break;
        case 'uuid':
            if (typeof value !== 'string' || !PATTERNS.uuid.test(value)) {
                errors.push(rule.message || 'Invalid UUID');
            }
            break;
        case 'date':
            if (typeof value !== 'string' || !PATTERNS.date.test(value)) {
                errors.push(rule.message || 'Invalid date format');
            }
            break;
        case 'array':
            if (!Array.isArray(value)) {
                errors.push(rule.message || 'Must be an array');
            }
            else {
                if (rule.min !== undefined && value.length < rule.min) {
                    errors.push(rule.message || `Minimum length is ${rule.min}`);
                }
                if (rule.max !== undefined && value.length > rule.max) {
                    errors.push(rule.message || `Maximum length is ${rule.max}`);
                }
            }
            break;
        case 'object':
            if (typeof value !== 'object' || value === null || Array.isArray(value)) {
                errors.push(rule.message || 'Must be an object');
            }
            break;
        case 'custom':
            if (rule.customValidator && !rule.customValidator(value)) {
                errors.push(rule.message || 'Validation failed');
            }
            break;
    }
    // Preveri enum
    if (rule.enum && !rule.enum.includes(value)) {
        errors.push(rule.message || `Must be one of: ${rule.enum.join(', ')}`);
    }
    return errors;
}
/**
 * Validiraj objekt proti shemi
 */
function validate(data, schema) {
    const errors = {};
    let validatedData = {};
    if (typeof data !== 'object' || data === null) {
        return {
            valid: false,
            errors: { _root: ['Input must be an object'] },
            data: null,
        };
    }
    const inputData = data;
    // Validiraj definirana polja
    for (const [field, rule] of Object.entries(schema.fields)) {
        const value = inputData[field];
        const fieldErrors = validateValue(value, rule);
        if (fieldErrors.length > 0) {
            errors[field] = fieldErrors;
        }
        else if (value !== undefined) {
            validatedData[field] = value;
        }
    }
    // Obdelaj dodatna polja
    const definedFields = new Set(Object.keys(schema.fields));
    for (const [field, value] of Object.entries(inputData)) {
        if (!definedFields.has(field)) {
            if (!schema.allowAdditional) {
                errors[field] = ['Unknown field'];
            }
            else if (!schema.stripAdditional) {
                validatedData[field] = value;
            }
        }
    }
    return {
        valid: Object.keys(errors).length === 0,
        errors,
        data: Object.keys(errors).length === 0 ? validatedData : null,
    };
}
/**
 * Sanitiziraj string
 */
function sanitize(input) {
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}
/**
 * Sanitiziraj objekt
 */
function sanitizeObject(obj) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            result[key] = sanitize(value);
        }
        else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            result[key] = sanitizeObject(value);
        }
        else if (Array.isArray(value)) {
            result[key] = value.map(item => typeof item === 'string' ? sanitize(item) : item);
        }
        else {
            result[key] = value;
        }
    }
    return result;
}
/**
 * Ustvari validator za shemo
 */
function createValidator(schema) {
    return (data) => validate(data, schema);
}
// ============================================================================
// IZVOZ
// ============================================================================
exports.Validation = {
    validate,
    sanitize,
    sanitizeObject,
    createValidator,
    PATTERNS,
};
