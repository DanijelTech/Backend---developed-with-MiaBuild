/**
 * @file Circuit breaker modul za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-REL-002 Circuit breaker za zaledne sisteme
 * @design DSN-ZALEDNI-REL-002 Backend circuit breaker arhitektura
 * @test TEST-ZALEDNI-REL-002 Preverjanje circuit breaker funkcionalnosti
 *
 * Backend Circuit Breaker - prilagojen za zaledne sisteme:
 * - Database connection circuit breaker
 * - External service call circuit breaker
 * - Message broker circuit breaker
 * - Bulkhead pattern za resource isolation
 * - Fallback strategije za degraded mode
 * - Health-based circuit state transitions
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom REL_002 - Retry Logic (Circuit Breaker)
 */
/**
 * Stanje circuit breaker-ja
 */
export type CircuitState = 'closed' | 'open' | 'half-open';
/**
 * Konfiguracija circuit breaker-ja
 */
export interface CircuitBreakerConfig {
    /** Prag neuspehov za odprtje */
    readonly failureThreshold: number;
    /** Cas do ponastavitve v ms */
    readonly resetTimeout: number;
    /** Stevilo poskusov v half-open stanju */
    readonly halfOpenRequests: number;
    /** Cas okna za stetje neuspehov v ms */
    readonly failureWindow: number;
    /** Callback ob spremembi stanja */
    readonly onStateChange?: (from: CircuitState, to: CircuitState) => void;
}
/**
 * Statistika circuit breaker-ja
 */
export interface CircuitBreakerStats {
    /** Trenutno stanje */
    readonly state: CircuitState;
    /** Stevilo neuspehov */
    readonly failures: number;
    /** Stevilo uspehov */
    readonly successes: number;
    /** Cas zadnjega neuspeha */
    readonly lastFailure: number | null;
    /** Cas zadnjega uspeha */
    readonly lastSuccess: number | null;
    /** Cas odprtja */
    readonly openedAt: number | null;
}
/**
 * Tip backend resursa za circuit breaker
 */
export type BackendResourceType = 'DATABASE' | 'MESSAGE_BROKER' | 'CACHE' | 'EXTERNAL_SERVICE' | 'INTERNAL_SERVICE';
/**
 * Konfiguracija za bulkhead pattern
 */
export interface BulkheadConfig {
    /** Maksimalno stevilo socasnih zahtev */
    readonly maxConcurrent: number;
    /** Maksimalna velikost cakalne vrste */
    readonly maxQueue: number;
    /** Timeout za cakanje v vrsti v ms */
    readonly queueTimeout: number;
}
/**
 * Statistika bulkhead-a
 */
export interface BulkheadStats {
    /** Stevilo aktivnih zahtev */
    readonly activeCount: number;
    /** Stevilo zahtev v vrsti */
    readonly queuedCount: number;
    /** Stevilo zavrnjenih zahtev */
    readonly rejectedCount: number;
}
/**
 * Konfiguracija za backend circuit breaker
 */
export interface BackendCircuitBreakerConfig extends CircuitBreakerConfig {
    /** Tip resursa */
    readonly resourceType: BackendResourceType;
    /** Ime resursa */
    readonly resourceName: string;
    /** Bulkhead konfiguracija */
    readonly bulkhead?: BulkheadConfig;
    /** Fallback funkcija */
    readonly fallback?: <T>() => Promise<T>;
    /** Health check funkcija */
    readonly healthCheck?: () => Promise<boolean>;
}
/**
 * Circuit Breaker implementacija
 */
export declare class CircuitBreaker {
    private readonly config;
    private state;
    private failures;
    private successes;
    private lastFailure;
    private lastSuccess;
    private openedAt;
    private halfOpenAttempts;
    private failureTimestamps;
    constructor(config?: Partial<CircuitBreakerConfig>);
    /**
     * Pridobi trenutno stanje
     */
    getState(): CircuitState;
    /**
     * Pridobi statistiko
     */
    getStats(): CircuitBreakerStats;
    /**
     * Izvedi funkcijo skozi circuit breaker
     */
    execute<T>(fn: () => Promise<T>): Promise<T>;
    /**
     * Preveri in izvedi prehod stanja
     */
    private checkStateTransition;
    /**
     * Zabeleži uspeh
     */
    private recordSuccess;
    /**
     * Zabeleži neuspeh
     */
    private recordFailure;
    /**
     * Prehod v novo stanje
     */
    private transitionTo;
    /**
     * Rocno ponastavi circuit breaker
     */
    reset(): void;
}
/**
 * Napaka ko je circuit breaker odprt
 */
export declare class CircuitBreakerOpenError extends Error {
    constructor(message: string);
}
/**
 * Bulkhead implementacija za resource isolation
 */
export declare class Bulkhead {
    private readonly config;
    private activeCount;
    private queuedCount;
    private rejectedCount;
    private readonly queue;
    constructor(config?: Partial<BulkheadConfig>);
    /**
     * Pridobi statistiko
     */
    getStats(): BulkheadStats;
    /**
     * Pridobi permit za izvajanje
     */
    acquire(): Promise<void>;
    /**
     * Sprosti permit
     */
    release(): void;
    /**
     * Pocisti stare zahteve iz vrste
     */
    private cleanupQueue;
    /**
     * Izvedi funkcijo z bulkhead zaščito
     */
    execute<T>(fn: () => Promise<T>): Promise<T>;
}
/**
 * Napaka ko je bulkhead poln
 */
export declare class BulkheadRejectError extends Error {
    constructor(message: string);
}
/**
 * Napaka ko bulkhead timeout potece
 */
export declare class BulkheadTimeoutError extends Error {
    constructor(message: string);
}
/**
 * Backend Circuit Breaker z bulkhead in fallback podporo
 */
export declare class BackendCircuitBreaker extends CircuitBreaker {
    private readonly backendConfig;
    private readonly bulkhead;
    constructor(config: BackendCircuitBreakerConfig);
    /**
     * Pridobi tip resursa
     */
    getResourceType(): BackendResourceType;
    /**
     * Pridobi ime resursa
     */
    getResourceName(): string;
    /**
     * Pridobi bulkhead statistiko
     */
    getBulkheadStats(): BulkheadStats | null;
    /**
     * Izvedi funkcijo z circuit breaker in bulkhead zaščito
     */
    executeWithFallback<T>(fn: () => Promise<T>, fallback?: () => Promise<T>): Promise<T>;
    /**
     * Izvedi health check in posodobi stanje
     */
    checkHealth(): Promise<boolean>;
}
/**
 * Ustvari in registriraj database circuit breaker
 */
export declare function createDatabaseCircuitBreaker(name: string, config?: Partial<BackendCircuitBreakerConfig>): BackendCircuitBreaker;
/**
 * Ustvari in registriraj message broker circuit breaker
 */
export declare function createMessageBrokerCircuitBreaker(name: string, config?: Partial<BackendCircuitBreakerConfig>): BackendCircuitBreaker;
/**
 * Ustvari in registriraj cache circuit breaker
 */
export declare function createCacheCircuitBreaker(name: string, config?: Partial<BackendCircuitBreakerConfig>): BackendCircuitBreaker;
/**
 * Ustvari in registriraj external service circuit breaker
 */
export declare function createExternalServiceCircuitBreaker(name: string, config?: Partial<BackendCircuitBreakerConfig>): BackendCircuitBreaker;
/**
 * Pridobi circuit breaker iz registra
 */
export declare function getCircuitBreaker(key: string): BackendCircuitBreaker | null;
/**
 * Pridobi vse circuit breaker statistike
 */
export declare function getAllCircuitBreakerStats(): Record<string, {
    state: CircuitState;
    stats: CircuitBreakerStats;
    bulkhead: BulkheadStats | null;
}>;
export declare const CircuitBreakerModule: {
    CircuitBreaker: typeof CircuitBreaker;
    CircuitBreakerOpenError: typeof CircuitBreakerOpenError;
    Bulkhead: typeof Bulkhead;
    BulkheadRejectError: typeof BulkheadRejectError;
    BulkheadTimeoutError: typeof BulkheadTimeoutError;
    BackendCircuitBreaker: typeof BackendCircuitBreaker;
    createDatabaseCircuitBreaker: typeof createDatabaseCircuitBreaker;
    createMessageBrokerCircuitBreaker: typeof createMessageBrokerCircuitBreaker;
    createCacheCircuitBreaker: typeof createCacheCircuitBreaker;
    createExternalServiceCircuitBreaker: typeof createExternalServiceCircuitBreaker;
    getCircuitBreaker: typeof getCircuitBreaker;
    getAllCircuitBreakerStats: typeof getAllCircuitBreakerStats;
};
