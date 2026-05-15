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

import { getClock, Clock } from '@mia/core/clock';
const clock: Clock = getClock();

// ============================================================================
// TIPI
// ============================================================================

/**
 * Kategorija napake
 */
export type ErrorCategory = 
    | 'VALIDATION'
    | 'AUTHENTICATION'
    | 'AUTHORIZATION'
    | 'NOT_FOUND'
    | 'CONFLICT'
    | 'INTERNAL'
    | 'EXTERNAL'
    | 'TIMEOUT'
    | 'RATE_LIMIT';

/**
 * Resnost napake
 */
export type ErrorSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Aplikacijska napaka
 */
export class AppError extends Error {
    /** Unikatna koda napake */
    public readonly errorCode: string;
    /** Kategorija napake */
    public readonly category: ErrorCategory;
    /** Resnost napake */
    public readonly severity: ErrorSeverity;
    /** HTTP status koda */
    public readonly statusCode: number;
    /** Casovni zig */
    public readonly timestamp: number;
    /** Vzrok napake */
    public readonly cause: Error | null;
    /** Kontekst napake */
    public readonly context: Readonly<Record<string, unknown>>;
    /** Stack trace */
    public readonly stack: string;

    constructor(
        message: string,
        errorCode: string,
        category: ErrorCategory = 'INTERNAL',
        severity: ErrorSeverity = 'MEDIUM',
        statusCode: number = 500,
        cause: Error | null = null,
        context: Record<string, unknown> = {}
    ) {
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

    private generateStack(): string {
        const stack = new Error().stack || '';
        return stack;
    }

    /**
     * Pretvori v JSON
     */
    public toJSON(): Record<string, unknown> {
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

// ============================================================================
// TOVARNIŠKE FUNKCIJE
// ============================================================================

/**
 * Ustvari validacijsko napako
 */
export function createValidationError(
    message: string,
    context: Record<string, unknown> = {}
): AppError {
    return new AppError(
        message,
        'ERR_VALIDATION',
        'VALIDATION',
        'LOW',
        400,
        null,
        context
    );
}

/**
 * Ustvari napako avtentikacije
 */
export function createAuthenticationError(
    message: string = 'Authentication required',
    context: Record<string, unknown> = {}
): AppError {
    return new AppError(
        message,
        'ERR_AUTHENTICATION',
        'AUTHENTICATION',
        'MEDIUM',
        401,
        null,
        context
    );
}

/**
 * Ustvari napako avtorizacije
 */
export function createAuthorizationError(
    message: string = 'Access denied',
    context: Record<string, unknown> = {}
): AppError {
    return new AppError(
        message,
        'ERR_AUTHORIZATION',
        'AUTHORIZATION',
        'MEDIUM',
        403,
        null,
        context
    );
}

/**
 * Ustvari napako "ni najdeno"
 */
export function createNotFoundError(
    resource: string,
    context: Record<string, unknown> = {}
): AppError {
    return new AppError(
        `Resource not found: ${resource}`,
        'ERR_NOT_FOUND',
        'NOT_FOUND',
        'LOW',
        404,
        null,
        context
    );
}

/**
 * Ustvari napako konflikta
 */
export function createConflictError(
    message: string,
    context: Record<string, unknown> = {}
): AppError {
    return new AppError(
        message,
        'ERR_CONFLICT',
        'CONFLICT',
        'MEDIUM',
        409,
        null,
        context
    );
}

/**
 * Ustvari interno napako
 */
export function createInternalError(
    message: string = 'Internal server error',
    cause: Error | null = null,
    context: Record<string, unknown> = {}
): AppError {
    return new AppError(
        message,
        'ERR_INTERNAL',
        'INTERNAL',
        'HIGH',
        500,
        cause,
        context
    );
}

// ============================================================================
// FUNKCIJE ZA OBDELAVO NAPAK
// ============================================================================

/**
 * Ovij napako v AppError
 */
export function wrapError(error: unknown, context: Record<string, unknown> = {}): AppError {
    if (error instanceof AppError) {
        return error;
    }
    
    if (error instanceof Error) {
        return new AppError(
            error.message,
            'ERR_WRAPPED',
            'INTERNAL',
            'MEDIUM',
            500,
            error,
            context
        );
    }
    
    return new AppError(
        String(error),
        'ERR_UNKNOWN',
        'INTERNAL',
        'MEDIUM',
        500,
        null,
        context
    );
}

/**
 * Obdelaj napako
 */
export function handleError(error: unknown, context: Record<string, unknown> = {}): AppError {
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
export async function safeExecute<T>(
    fn: () => Promise<T>,
    context: Record<string, unknown> = {}
): Promise<{ success: true; data: T } | { success: false; error: AppError }> {
    try {
        const data = await fn();
        return { success: true, data };
    } catch (error) {
        return { success: false, error: handleError(error, context) };
    }
}

/**
 * Preveri ali je napaka specificne kategorije
 */
export function isErrorCategory(error: unknown, category: ErrorCategory): boolean {
    return error instanceof AppError && error.category === category;
}

// ============================================================================
// IZVOZ
// ============================================================================

export const ErrorHandler = {
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
