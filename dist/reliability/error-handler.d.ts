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
/**
 * Kategorija napake
 */
export type ErrorCategory = 'VALIDATION' | 'AUTHENTICATION' | 'AUTHORIZATION' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL' | 'EXTERNAL' | 'TIMEOUT' | 'RATE_LIMIT';
/**
 * Resnost napake
 */
export type ErrorSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
/**
 * Aplikacijska napaka
 */
export declare class AppError extends Error {
    /** Unikatna koda napake */
    readonly errorCode: string;
    /** Kategorija napake */
    readonly category: ErrorCategory;
    /** Resnost napake */
    readonly severity: ErrorSeverity;
    /** HTTP status koda */
    readonly statusCode: number;
    /** Casovni zig */
    readonly timestamp: number;
    /** Vzrok napake */
    readonly cause: Error | null;
    /** Kontekst napake */
    readonly context: Readonly<Record<string, unknown>>;
    /** Stack trace */
    readonly stack: string;
    constructor(message: string, errorCode: string, category?: ErrorCategory, severity?: ErrorSeverity, statusCode?: number, cause?: Error | null, context?: Record<string, unknown>);
    private generateStack;
    /**
     * Pretvori v JSON
     */
    toJSON(): Record<string, unknown>;
}
/**
 * Ustvari validacijsko napako
 */
export declare function createValidationError(message: string, context?: Record<string, unknown>): AppError;
/**
 * Ustvari napako avtentikacije
 */
export declare function createAuthenticationError(message?: string, context?: Record<string, unknown>): AppError;
/**
 * Ustvari napako avtorizacije
 */
export declare function createAuthorizationError(message?: string, context?: Record<string, unknown>): AppError;
/**
 * Ustvari napako "ni najdeno"
 */
export declare function createNotFoundError(resource: string, context?: Record<string, unknown>): AppError;
/**
 * Ustvari napako konflikta
 */
export declare function createConflictError(message: string, context?: Record<string, unknown>): AppError;
/**
 * Ustvari interno napako
 */
export declare function createInternalError(message?: string, cause?: Error | null, context?: Record<string, unknown>): AppError;
/**
 * Ovij napako v AppError
 */
export declare function wrapError(error: unknown, context?: Record<string, unknown>): AppError;
/**
 * Obdelaj napako
 */
export declare function handleError(error: unknown, context?: Record<string, unknown>): AppError;
/**
 * Varno izvedi funkcijo
 */
export declare function safeExecute<T>(fn: () => Promise<T>, context?: Record<string, unknown>): Promise<{
    success: true;
    data: T;
} | {
    success: false;
    error: AppError;
}>;
/**
 * Preveri ali je napaka specificne kategorije
 */
export declare function isErrorCategory(error: unknown, category: ErrorCategory): boolean;
export declare const ErrorHandler: {
    AppError: typeof AppError;
    createValidationError: typeof createValidationError;
    createAuthenticationError: typeof createAuthenticationError;
    createAuthorizationError: typeof createAuthorizationError;
    createNotFoundError: typeof createNotFoundError;
    createConflictError: typeof createConflictError;
    createInternalError: typeof createInternalError;
    wrapError: typeof wrapError;
    handleError: typeof handleError;
    safeExecute: typeof safeExecute;
    isErrorCategory: typeof isErrorCategory;
};
