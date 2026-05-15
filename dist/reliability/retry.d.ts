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
export type ErrorClassification = 'RETRYABLE_TRANSIENT' | 'RETRYABLE_THROTTLE' | 'RETRYABLE_DB_DEADLOCK' | 'RETRYABLE_DB_LOCK' | 'RETRYABLE_QUEUE_FULL' | 'NON_RETRYABLE_CLIENT' | 'NON_RETRYABLE_AUTH' | 'NON_RETRYABLE_VALIDATION' | 'NON_RETRYABLE_NOT_FOUND' | 'UNKNOWN';
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
/**
 * Izracunaj zakasnitev za naslednji poskus
 */
declare function calculateDelay(config: RetryConfig, attempt: number): number;
/**
 * Izvedi funkcijo z retry logiko
 */
export declare function retry<T>(fn: () => Promise<T>, config?: Partial<RetryConfig>): Promise<RetryResult<T>>;
/**
 * Wrapper funkcija za retry
 */
export declare function withRetry<T>(fn: () => Promise<T>, config?: Partial<RetryConfig>): Promise<T>;
/**
 * Ustvari retry wrapper za funkcijo
 */
export declare function createRetryWrapper<T>(config?: Partial<RetryConfig>): (fn: () => Promise<T>) => Promise<T>;
/**
 * Klasificiraj napako za dolocitev retry strategije
 */
export declare function classifyError(error: unknown): ErrorClassification;
/**
 * Preveri ali je napaka retryable
 */
export declare function isRetryableError(error: unknown): boolean;
/**
 * Preveri idempotency key in vrni shranjen rezultat ce obstaja
 */
export declare function checkIdempotency<T>(config: IdempotencyConfig): IdempotencyResult<T>;
/**
 * Shrani rezultat za idempotency key
 */
export declare function storeIdempotencyResult<T>(config: IdempotencyConfig, result: T): void;
/**
 * Izvedi operacijo z idempotency podporo
 */
export declare function withIdempotency<T>(fn: () => Promise<T>, idempotencyConfig: IdempotencyConfig, retryConfig?: Partial<RetryConfig>): Promise<RetryResult<T>>;
/**
 * Retry za DB transakcije z deadlock/lock timeout podporo
 */
export declare function retryDbTransaction<T>(fn: () => Promise<T>, config?: DbRetryConfig): Promise<RetryResult<T>>;
/**
 * Retry za queue operacije z dead letter queue podporo
 */
export declare function retryQueueOperation<T>(fn: () => Promise<T>, config: QueueRetryConfig, onDeadLetter?: (error: unknown, attempts: number) => Promise<void>): Promise<RetryResult<T>>;
/**
 * Retry za service-to-service klice
 */
export declare function retryServiceCall<T>(fn: () => Promise<T>, config?: Partial<RetryConfig>): Promise<RetryResult<T>>;
export declare const Retry: {
    retry: typeof retry;
    withRetry: typeof withRetry;
    createRetryWrapper: typeof createRetryWrapper;
    calculateDelay: typeof calculateDelay;
    classifyError: typeof classifyError;
    isRetryableError: typeof isRetryableError;
    checkIdempotency: typeof checkIdempotency;
    storeIdempotencyResult: typeof storeIdempotencyResult;
    withIdempotency: typeof withIdempotency;
    retryDbTransaction: typeof retryDbTransaction;
    retryQueueOperation: typeof retryQueueOperation;
    retryServiceCall: typeof retryServiceCall;
};
export {};
