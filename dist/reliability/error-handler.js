"use strict";
/**
 * @file Error handling modul za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-REL-001 Error handling za zaledne sisteme
 * @design DSN-ZALEDNI-REL-001 Backend error handling arhitektura
 * @test TEST-ZALEDNI-REL-001 Preverjanje error handling funkcionalnosti
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom REL_001 - Error Handling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandler = exports.AppError = void 0;
exports.createValidationError = createValidationError;
exports.createAuthenticationError = createAuthenticationError;
exports.createAuthorizationError = createAuthorizationError;
exports.createNotFoundError = createNotFoundError;
exports.createConflictError = createConflictError;
exports.createInternalError = createInternalError;
exports.wrapError = wrapError;
exports.handleError = handleError;
exports.safeExecute = safeExecute;
exports.isErrorCategory = isErrorCategory;
const clock_1 = require("@mia/core/clock");
const clock = (0, clock_1.getClock)();
/**
 * Aplikacijska napaka
 */
class AppError extends Error {
    constructor(message, errorCode, category = 'INTERNAL', severity = 'MEDIUM', statusCode = 500, cause = null, context = {}) {
        super(message);
        this.name = 'AppError';
        this.errorCode = errorCode;
        this.category = category;
        this.severity = severity;
        this.statusCode = statusCode;
        this.timestamp = clock.nowMs();
        this.cause = cause;
        this.context = context;
        this.stack = this.generateStack();
        // Ohrani prototip
        Object.setPrototypeOf(this, AppError.prototype);
    }
    generateStack() {
        const stack = new Error().stack || '';
        return stack;
    }
    /**
     * Pretvori v JSON
     */
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            errorCode: this.errorCode,
            category: this.category,
            severity: this.severity,
            statusCode: this.statusCode,
            timestamp: this.timestamp,
            context: this.context,
            stack: this.stack,
            cause: this.cause ? {
                name: this.cause.name,
                message: this.cause.message,
            } : null,
        };
    }
}
exports.AppError = AppError;
// ============================================================================
// TOVARNIŠKE FUNKCIJE
// ============================================================================
/**
 * Ustvari validacijsko napako
 */
function createValidationError(message, context = {}) {
    return new AppError(message, 'ERR_VALIDATION', 'VALIDATION', 'LOW', 400, null, context);
}
/**
 * Ustvari napako avtentikacije
 */
function createAuthenticationError(message = 'Authentication required', context = {}) {
    return new AppError(message, 'ERR_AUTHENTICATION', 'AUTHENTICATION', 'MEDIUM', 401, null, context);
}
/**
 * Ustvari napako avtorizacije
 */
function createAuthorizationError(message = 'Access denied', context = {}) {
    return new AppError(message, 'ERR_AUTHORIZATION', 'AUTHORIZATION', 'MEDIUM', 403, null, context);
}
/**
 * Ustvari napako "ni najdeno"
 */
function createNotFoundError(resource, context = {}) {
    return new AppError(`Resource not found: ${resource}`, 'ERR_NOT_FOUND', 'NOT_FOUND', 'LOW', 404, null, context);
}
/**
 * Ustvari napako konflikta
 */
function createConflictError(message, context = {}) {
    return new AppError(message, 'ERR_CONFLICT', 'CONFLICT', 'MEDIUM', 409, null, context);
}
/**
 * Ustvari interno napako
 */
function createInternalError(message = 'Internal server error', cause = null, context = {}) {
    return new AppError(message, 'ERR_INTERNAL', 'INTERNAL', 'HIGH', 500, cause, context);
}
// ============================================================================
// FUNKCIJE ZA OBDELAVO NAPAK
// ============================================================================
/**
 * Ovij napako v AppError
 */
function wrapError(error, context = {}) {
    if (error instanceof AppError) {
        return error;
    }
    if (error instanceof Error) {
        return new AppError(error.message, 'ERR_WRAPPED', 'INTERNAL', 'MEDIUM', 500, error, context);
    }
    return new AppError(String(error), 'ERR_UNKNOWN', 'INTERNAL', 'MEDIUM', 500, null, context);
}
/**
 * Obdelaj napako
 */
function handleError(error, context = {}) {
    const appError = wrapError(error, context);
    // Logiraj napako (brez console.log)
    const logEntry = JSON.stringify({
        type: 'ERROR',
        timestamp: new Date(appError.timestamp).toISOString(),
        error: appError.toJSON(),
    });
    process.stderr.write(logEntry + '\n');
    return appError;
}
/**
 * Varno izvedi funkcijo
 */
async function safeExecute(fn, context = {}) {
    try {
        const data = await fn();
        return { success: true, data };
    }
    catch (error) {
        return { success: false, error: handleError(error, context) };
    }
}
/**
 * Preveri ali je napaka specificne kategorije
 */
function isErrorCategory(error, category) {
    return error instanceof AppError && error.category === category;
}
// ============================================================================
// IZVOZ
// ============================================================================
exports.ErrorHandler = {
    AppError,
    createValidationError,
    createAuthenticationError,
    createAuthorizationError,
    createNotFoundError,
    createConflictError,
    createInternalError,
    wrapError,
    handleError,
    safeExecute,
    isErrorCategory,
};
