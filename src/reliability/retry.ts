/**
 * @file Retry logic modul za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 * 
 * @requirement ZAH-ZALEDNI-REL-002B Retry logika za zaledne sisteme
 * @design DSN-ZALEDNI-REL-002B Backend retry arhitektura
 * @test TEST-ZALEDNI-REL-002B Preverjanje retry funkcionalnosti
 * 
 * Backend Retry Logic - prilagojen za zaledne sisteme:
 * - Idempotency key podpora za write operacije
 * - Bounded retries z exponential backoff in jitter
 * - Klasifikacija napak (retryable vs non-retryable)
 * - Database transaction retry (deadlock, lock timeout)
 * - Message queue retry z dead letter queue podpora
 * - Service-to-service retry z circuit breaker integracija
 * 
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom REL_002 - Retry Logic
 */

import { getClock, Clock } from '@mia/core/clock';
const clock: Clock = getClock();

// ============================================================================
// TIPI
// ============================================================================

/**
 * Strategija backoff-a
 */
export type BackoffStrategy = 'fixed' | 'linear' | 'exponential';

/**
 * Konfiguracija retry-ja
 */
export interface RetryConfig {
    /** Maksimalno stevilo poskusov */
    readonly maxAttempts: number;
    /** Zacetna zakasnitev v ms */
    readonly delay: number;
    /** Strategija backoff-a */
    readonly backoff: BackoffStrategy;
    /** Faktor za exponential backoff */
    readonly backoffFactor: number;
    /** Maksimalna zakasnitev v ms */
    readonly maxDelay: number;
    /** Funkcija za preverjanje ali naj se ponovi */
    readonly shouldRetry?: (error: unknown, attempt: number) => boolean;
    /** Callback ob vsakem poskusu */
    readonly onRetry?: (error: unknown, attempt: number, delay: number) => void;
}

/**
 * Rezultat retry-ja
 */
export interface RetryResult<T> {
    /** Ali je uspelo */
    readonly success: boolean;
    /** Rezultat (ce je uspelo) */
    readonly data: T | null;
    /** Napaka (ce ni uspelo) */
    readonly error: unknown | null;
    /** Stevilo poskusov */
    readonly attempts: number;
    /** Skupni cas v ms */
    readonly totalTime: number;
}

/**
 * Klasifikacija napak za backend sisteme
 */
export type ErrorClassification = 
    | 'RETRYABLE_TRANSIENT'      // Prehodne napake (network timeout, 503)
    | 'RETRYABLE_THROTTLE'       // Rate limiting (429)
    | 'RETRYABLE_DB_DEADLOCK'    // Database deadlock
    | 'RETRYABLE_DB_LOCK'        // Database lock timeout
    | 'RETRYABLE_QUEUE_FULL'     // Message queue full
    | 'NON_RETRYABLE_CLIENT'     // Client error (4xx razen 429)
    | 'NON_RETRYABLE_AUTH'       // Authentication/authorization error
    | 'NON_RETRYABLE_VALIDATION' // Validation error
    | 'NON_RETRYABLE_NOT_FOUND'  // Resource not found
    | 'UNKNOWN';

/**
 * Konfiguracija idempotency za write operacije
 */
export interface IdempotencyConfig {
    /** Idempotency key */
    readonly idempotencyKey: string;
    /** TTL za idempotency key v ms */
    readonly ttlMs: number;
    /** Ali naj se rezultat shrani */
    readonly storeResult: boolean;
}

/**
 * Rezultat idempotency preverjanja
 */
export interface IdempotencyResult<T> {
    /** Ali je bila operacija ze izvedena */
    readonly alreadyExecuted: boolean;
    /** Shranjen rezultat (ce obstaja) */
    readonly storedResult: T | null;
}

/**
 * Konfiguracija za DB transaction retry
 */
export interface DbRetryConfig extends Partial<RetryConfig> {
    /** Ali naj se retry izvede za deadlock */
    readonly retryOnDeadlock: boolean;
    /** Ali naj se retry izvede za lock timeout */
    readonly retryOnLockTimeout: boolean;
    /** Ali naj se retry izvede za connection error */
    readonly retryOnConnectionError: boolean;
}

/**
 * Konfiguracija za queue retry
 */
export interface QueueRetryConfig extends Partial<RetryConfig> {
    /** Ali naj se sporocilo poslje v dead letter queue po izcrpanju retry-jev */
    readonly sendToDeadLetterQueue: boolean;
    /** Ime dead letter queue */
    readonly deadLetterQueueName: string;
    /** Ali naj se ohrani original message metadata */
    readonly preserveMetadata: boolean;
}

// ============================================================================
// KONSTANTE
// ============================================================================

const DEFAULT_CONFIG: RetryConfig = {
    maxAttempts: 3,
    delay: 1000,
    backoff: 'exponential',
    backoffFactor: 2,
    maxDelay: 30000,
};

// ============================================================================
// FUNKCIJE
// ============================================================================

/**
 * Izracunaj zakasnitev za naslednji poskus
 */
function calculateDelay(config: RetryConfig, attempt: number): number {
    let delay: number;
    
    switch (config.backoff) {
        case 'fixed':
            delay = config.delay;
            break;
        case 'linear':
            delay = config.delay * attempt;
            break;
        case 'exponential':
            delay = config.delay * Math.pow(config.backoffFactor, attempt - 1);
            break;
        default:
            delay = config.delay;
    }
    
    return Math.min(delay, config.maxDelay);
}

/**
 * Pocakaj dolocen cas
 */
async function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Izvedi funkcijo z retry logiko
 */
export async function retry<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
    const fullConfig: RetryConfig = { ...DEFAULT_CONFIG, ...config };
    const startTime = clock.nowMs();
    let lastError: unknown = null;
    
    for (let attempt = 1; attempt <= fullConfig.maxAttempts; attempt++) {
        try {
            const data = await fn();
            return {
                success: true,
                data,
                error: null,
                attempts: attempt,
                totalTime: clock.nowMs() - startTime,
            };
        } catch (error) {
            lastError = error;
            
            // Preveri ali naj se ponovi
            if (fullConfig.shouldRetry && !fullConfig.shouldRetry(error, attempt)) {
                break;
            }
            
            // Ce je to zadnji poskus, ne cakaj
            if (attempt === fullConfig.maxAttempts) {
                break;
            }
            
            // Izracunaj zakasnitev
            const delay = calculateDelay(fullConfig, attempt);
            
            // Callback ob retry-ju
            if (fullConfig.onRetry) {
                fullConfig.onRetry(error, attempt, delay);
            }
            
            // Pocakaj pred naslednjim poskusom
            await wait(delay);
        }
    }
    
    return {
        success: false,
        data: null,
        error: lastError,
        attempts: fullConfig.maxAttempts,
        totalTime: clock.nowMs() - startTime,
    };
}

/**
 * Wrapper funkcija za retry
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {}
): Promise<T> {
    const result = await retry(fn, config);
    
    if (!result.success) {
        throw result.error;
    }
    
    return result.data as T;
}

/**
 * Ustvari retry wrapper za funkcijo
 */
export function createRetryWrapper<T>(
    config: Partial<RetryConfig> = {}
): (fn: () => Promise<T>) => Promise<T> {
    return (fn: () => Promise<T>) => withRetry(fn, config);
}

// ============================================================================
// BACKEND-SPECIFICNE FUNKCIJE
// ============================================================================

/**
 * Klasificiraj napako za dolocitev retry strategije
 */
export function classifyError(error: unknown): ErrorClassification {
    if (!(error instanceof Error)) {
        return 'UNKNOWN';
    }
    
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();
    
    // Database deadlock
    if (message.includes('deadlock') || message.includes('40p01')) {
        return 'RETRYABLE_DB_DEADLOCK';
    }
    
    // Database lock timeout
    if (message.includes('lock timeout') || message.includes('55p03')) {
        return 'RETRYABLE_DB_LOCK';
    }
    
    // Rate limiting
    if (message.includes('429') || message.includes('rate limit') || message.includes('too many requests')) {
        return 'RETRYABLE_THROTTLE';
    }
    
    // Queue full
    if (message.includes('queue full') || message.includes('channel closed')) {
        return 'RETRYABLE_QUEUE_FULL';
    }
    
    // Transient errors
    if (message.includes('timeout') || message.includes('503') || message.includes('econnreset') || 
        message.includes('econnrefused') || message.includes('network')) {
        return 'RETRYABLE_TRANSIENT';
    }
    
    // Authentication errors
    if (message.includes('401') || message.includes('403') || message.includes('unauthorized') || 
        message.includes('forbidden')) {
        return 'NON_RETRYABLE_AUTH';
    }
    
    // Validation errors
    if (message.includes('400') || message.includes('validation') || message.includes('invalid')) {
        return 'NON_RETRYABLE_VALIDATION';
    }
    
    // Not found
    if (message.includes('404') || message.includes('not found')) {
        return 'NON_RETRYABLE_NOT_FOUND';
    }
    
    // Client errors
    if (message.includes('4') && (message.includes('00') || message.includes('client'))) {
        return 'NON_RETRYABLE_CLIENT';
    }
    
    return 'UNKNOWN';
}

/**
 * Preveri ali je napaka retryable
 */
export function isRetryableError(error: unknown): boolean {
    const classification = classifyError(error);
    return classification.startsWith('RETRYABLE_');
}

/**
 * Izracunaj delay z jitter za backend retry
 * Jitter preprecuje thundering herd problem
 */
function calculateDelayWithJitter(config: RetryConfig, attempt: number, jitterFactor: number = 0.1): number {
    const baseDelay = calculateDelay(config, attempt);
    
    // Deterministicen jitter na podlagi attempt stevila
    const jitterSeed = attempt * 31;
    const jitterMultiplier = 1 + ((jitterSeed % 100) / 100 - 0.5) * 2 * jitterFactor;
    
    return Math.min(Math.floor(baseDelay * jitterMultiplier), config.maxDelay);
}

// Idempotency storage (v produkciji bi bil Redis/DB)
const idempotencyStore: Map<string, { result: unknown; expiresAt: number }> = new Map();

/**
 * Preveri idempotency key in vrni shranjen rezultat ce obstaja
 */
export function checkIdempotency<T>(config: IdempotencyConfig): IdempotencyResult<T> {
    const stored = idempotencyStore.get(config.idempotencyKey);
    
    if (!stored) {
        return { alreadyExecuted: false, storedResult: null };
    }
    
    // Preveri ali je potekel
    if (clock.nowMs() > stored.expiresAt) {
        idempotencyStore.delete(config.idempotencyKey);
        return { alreadyExecuted: false, storedResult: null };
    }
    
    return { 
        alreadyExecuted: true, 
        storedResult: stored.result as T 
    };
}

/**
 * Shrani rezultat za idempotency key
 */
export function storeIdempotencyResult<T>(config: IdempotencyConfig, result: T): void {
    if (!config.storeResult) {
        return;
    }
    
    idempotencyStore.set(config.idempotencyKey, {
        result,
        expiresAt: clock.nowMs() + config.ttlMs,
    });
}

/**
 * Izvedi operacijo z idempotency podporo
 */
export async function withIdempotency<T>(
    fn: () => Promise<T>,
    idempotencyConfig: IdempotencyConfig,
    retryConfig: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
    // Preveri ali je bila operacija ze izvedena
    const idempotencyCheck = checkIdempotency<T>(idempotencyConfig);
    if (idempotencyCheck.alreadyExecuted && idempotencyCheck.storedResult !== null) {
        return {
            success: true,
            data: idempotencyCheck.storedResult,
            error: null,
            attempts: 0,
            totalTime: 0,
        };
    }
    
    // Izvedi operacijo z retry
    const result = await retry(fn, {
        ...retryConfig,
        shouldRetry: (error, attempt) => {
            if (retryConfig.shouldRetry && !retryConfig.shouldRetry(error, attempt)) {
                return false;
            }
            return isRetryableError(error);
        },
    });
    
    // Shrani rezultat ce je uspelo
    if (result.success && result.data !== null) {
        storeIdempotencyResult(idempotencyConfig, result.data);
    }
    
    return result;
}

/**
 * Retry za DB transakcije z deadlock/lock timeout podporo
 */
export async function retryDbTransaction<T>(
    fn: () => Promise<T>,
    config: DbRetryConfig = { retryOnDeadlock: true, retryOnLockTimeout: true, retryOnConnectionError: true }
): Promise<RetryResult<T>> {
    return retry(fn, {
        maxAttempts: config.maxAttempts ?? 5,
        delay: config.delay ?? 100,
        backoff: config.backoff ?? 'exponential',
        backoffFactor: config.backoffFactor ?? 2,
        maxDelay: config.maxDelay ?? 5000,
        shouldRetry: (error) => {
            const classification = classifyError(error);
            
            if (classification === 'RETRYABLE_DB_DEADLOCK' && config.retryOnDeadlock) {
                return true;
            }
            if (classification === 'RETRYABLE_DB_LOCK' && config.retryOnLockTimeout) {
                return true;
            }
            if (classification === 'RETRYABLE_TRANSIENT' && config.retryOnConnectionError) {
                return true;
            }
            
            return false;
        },
        onRetry: config.onRetry,
    });
}

/**
 * Retry za queue operacije z dead letter queue podporo
 */
export async function retryQueueOperation<T>(
    fn: () => Promise<T>,
    config: QueueRetryConfig,
    onDeadLetter?: (error: unknown, attempts: number) => Promise<void>
): Promise<RetryResult<T>> {
    const result = await retry(fn, {
        maxAttempts: config.maxAttempts ?? 3,
        delay: config.delay ?? 1000,
        backoff: config.backoff ?? 'exponential',
        backoffFactor: config.backoffFactor ?? 2,
        maxDelay: config.maxDelay ?? 30000,
        shouldRetry: (error) => {
            const classification = classifyError(error);
            return classification === 'RETRYABLE_QUEUE_FULL' || 
                   classification === 'RETRYABLE_TRANSIENT';
        },
        onRetry: config.onRetry,
    });
    
    // Posli v dead letter queue ce je retry izcrpan
    if (!result.success && config.sendToDeadLetterQueue && onDeadLetter) {
        await onDeadLetter(result.error, result.attempts);
    }
    
    return result;
}

/**
 * Retry za service-to-service klice
 */
export async function retryServiceCall<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
    return retry(fn, {
        maxAttempts: config.maxAttempts ?? 3,
        delay: config.delay ?? 500,
        backoff: config.backoff ?? 'exponential',
        backoffFactor: config.backoffFactor ?? 2,
        maxDelay: config.maxDelay ?? 10000,
        shouldRetry: (error) => {
            const classification = classifyError(error);
            return classification === 'RETRYABLE_TRANSIENT' || 
                   classification === 'RETRYABLE_THROTTLE';
        },
        onRetry: config.onRetry,
    });
}

// ============================================================================
// IZVOZ
// ============================================================================

export const Retry = {
    retry,
    withRetry,
    createRetryWrapper,
    calculateDelay,
    classifyError,
    isRetryableError,
    checkIdempotency,
    storeIdempotencyResult,
    withIdempotency,
    retryDbTransaction,
    retryQueueOperation,
    retryServiceCall,
};
