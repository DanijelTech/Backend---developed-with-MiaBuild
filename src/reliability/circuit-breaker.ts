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

import { getClock, Clock } from '@mia/core/clock';
const clock: Clock = getClock();

// ============================================================================
// TIPI
// ============================================================================

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

// ============================================================================
// BACKEND-SPECIFICNI TIPI
// ============================================================================

/**
 * Tip backend resursa za circuit breaker
 */
export type BackendResourceType = 
    | 'DATABASE'
    | 'MESSAGE_BROKER'
    | 'CACHE'
    | 'EXTERNAL_SERVICE'
    | 'INTERNAL_SERVICE';

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

// ============================================================================
// KONSTANTE
// ============================================================================

const DEFAULT_CONFIG: CircuitBreakerConfig = {
    failureThreshold: 5,
    resetTimeout: 30000,
    halfOpenRequests: 1,
    failureWindow: 60000,
};

// ============================================================================
// CIRCUIT BREAKER RAZRED
// ============================================================================

/**
 * Circuit Breaker implementacija
 */
export class CircuitBreaker {
    private readonly config: CircuitBreakerConfig;
    private state: CircuitState = 'closed';
    private failures: number = 0;
    private successes: number = 0;
    private lastFailure: number | null = null;
    private lastSuccess: number | null = null;
    private openedAt: number | null = null;
    private halfOpenAttempts: number = 0;
    private failureTimestamps: number[] = [];

    constructor(config: Partial<CircuitBreakerConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Pridobi trenutno stanje
     */
    public getState(): CircuitState {
        this.checkStateTransition();
        return this.state;
    }

    /**
     * Pridobi statistiko
     */
    public getStats(): CircuitBreakerStats {
        return {
            state: this.state,
            failures: this.failures,
            successes: this.successes,
            lastFailure: this.lastFailure,
            lastSuccess: this.lastSuccess,
            openedAt: this.openedAt,
        };
    }

    /**
     * Izvedi funkcijo skozi circuit breaker
     */
    public async execute<T>(fn: () => Promise<T>): Promise<T> {
        this.checkStateTransition();

        if (this.state === 'open') {
            throw new CircuitBreakerOpenError('Circuit breaker is open');
        }

        if (this.state === 'half-open') {
            if (this.halfOpenAttempts >= this.config.halfOpenRequests) {
                throw new CircuitBreakerOpenError('Circuit breaker half-open limit reached');
            }
            this.halfOpenAttempts++;
        }

        try {
            const result = await fn();
            this.recordSuccess();
            return result;
        } catch (error) {
            this.recordFailure();
            throw error;
        }
    }

    /**
     * Preveri in izvedi prehod stanja
     */
    private checkStateTransition(): void {
        const now = clock.nowMs();

        if (this.state === 'open' && this.openedAt !== null) {
            if (now - this.openedAt >= this.config.resetTimeout) {
                this.transitionTo('half-open');
            }
        }

        // Pocisti stare failure timestamp-e
        this.failureTimestamps = this.failureTimestamps.filter(
            ts => now - ts < this.config.failureWindow
        );
    }

    /**
     * Zabeleži uspeh
     */
    private recordSuccess(): void {
        this.successes++;
        this.lastSuccess = clock.nowMs();

        if (this.state === 'half-open') {
            this.transitionTo('closed');
            this.failures = 0;
            this.failureTimestamps = [];
            this.halfOpenAttempts = 0;
        }
    }

    /**
     * Zabeleži neuspeh
     */
    private recordFailure(): void {
        const now = clock.nowMs();
        this.failures++;
        this.lastFailure = now;
        this.failureTimestamps.push(now);

        // Pocisti stare timestamp-e
        this.failureTimestamps = this.failureTimestamps.filter(
            ts => now - ts < this.config.failureWindow
        );

        if (this.state === 'half-open') {
            this.transitionTo('open');
            this.halfOpenAttempts = 0;
        } else if (this.state === 'closed') {
            if (this.failureTimestamps.length >= this.config.failureThreshold) {
                this.transitionTo('open');
            }
        }
    }

    /**
     * Prehod v novo stanje
     */
    private transitionTo(newState: CircuitState): void {
        const oldState = this.state;
        this.state = newState;

        if (newState === 'open') {
            this.openedAt = clock.nowMs();
        } else if (newState === 'closed') {
            this.openedAt = null;
        }

        if (this.config.onStateChange) {
            this.config.onStateChange(oldState, newState);
        }
    }

    /**
     * Rocno ponastavi circuit breaker
     */
    public reset(): void {
        this.state = 'closed';
        this.failures = 0;
        this.successes = 0;
        this.lastFailure = null;
        this.lastSuccess = null;
        this.openedAt = null;
        this.halfOpenAttempts = 0;
        this.failureTimestamps = [];
    }
}

/**
 * Napaka ko je circuit breaker odprt
 */
export class CircuitBreakerOpenError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CircuitBreakerOpenError';
        Object.setPrototypeOf(this, CircuitBreakerOpenError.prototype);
    }
}

// ============================================================================
// BACKEND-SPECIFICNE FUNKCIJE
// ============================================================================

/**
 * Bulkhead implementacija za resource isolation
 */
export class Bulkhead {
    private readonly config: BulkheadConfig;
    private activeCount: number = 0;
    private queuedCount: number = 0;
    private rejectedCount: number = 0;
    private readonly queue: Array<{
        resolve: () => void;
        reject: (error: Error) => void;
        timestamp: number;
    }> = [];

    constructor(config: Partial<BulkheadConfig> = {}) {
        this.config = {
            maxConcurrent: config.maxConcurrent ?? 10,
            maxQueue: config.maxQueue ?? 100,
            queueTimeout: config.queueTimeout ?? 30000,
        };
    }

    /**
     * Pridobi statistiko
     */
    public getStats(): BulkheadStats {
        return {
            activeCount: this.activeCount,
            queuedCount: this.queuedCount,
            rejectedCount: this.rejectedCount,
        };
    }

    /**
     * Pridobi permit za izvajanje
     */
    public async acquire(): Promise<void> {
        // Pocisti stare zahteve iz vrste
        this.cleanupQueue();

        if (this.activeCount < this.config.maxConcurrent) {
            this.activeCount++;
            return;
        }

        if (this.queuedCount >= this.config.maxQueue) {
            this.rejectedCount++;
            throw new BulkheadRejectError('Bulkhead queue is full');
        }

        return new Promise<void>((resolve, reject) => {
            this.queue.push({
                resolve: () => {
                    this.queuedCount--;
                    this.activeCount++;
                    resolve();
                },
                reject,
                timestamp: clock.nowMs(),
            });
            this.queuedCount++;
        });
    }

    /**
     * Sprosti permit
     */
    public release(): void {
        this.activeCount--;

        // Procesiraj naslednjo zahtevo iz vrste
        if (this.queue.length > 0) {
            const next = this.queue.shift();
            if (next) {
                next.resolve();
            }
        }
    }

    /**
     * Pocisti stare zahteve iz vrste
     */
    private cleanupQueue(): void {
        const now = clock.nowMs();
        const expiredIndices: number[] = [];

        for (let i = 0; i < this.queue.length; i++) {
            if (now - this.queue[i].timestamp > this.config.queueTimeout) {
                expiredIndices.push(i);
            }
        }

        // Odstrani od konca proti zacetku
        for (let i = expiredIndices.length - 1; i >= 0; i--) {
            const idx = expiredIndices[i];
            const expired = this.queue.splice(idx, 1)[0];
            this.queuedCount--;
            expired.reject(new BulkheadTimeoutError('Bulkhead queue timeout'));
        }
    }

    /**
     * Izvedi funkcijo z bulkhead zaščito
     */
    public async execute<T>(fn: () => Promise<T>): Promise<T> {
        await this.acquire();
        try {
            return await fn();
        } finally {
            this.release();
        }
    }
}

/**
 * Napaka ko je bulkhead poln
 */
export class BulkheadRejectError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'BulkheadRejectError';
        Object.setPrototypeOf(this, BulkheadRejectError.prototype);
    }
}

/**
 * Napaka ko bulkhead timeout potece
 */
export class BulkheadTimeoutError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'BulkheadTimeoutError';
        Object.setPrototypeOf(this, BulkheadTimeoutError.prototype);
    }
}

/**
 * Backend Circuit Breaker z bulkhead in fallback podporo
 */
export class BackendCircuitBreaker extends CircuitBreaker {
    private readonly backendConfig: BackendCircuitBreakerConfig;
    private readonly bulkhead: Bulkhead | null;

    constructor(config: BackendCircuitBreakerConfig) {
        super(config);
        this.backendConfig = config;
        this.bulkhead = config.bulkhead ? new Bulkhead(config.bulkhead) : null;
    }

    /**
     * Pridobi tip resursa
     */
    public getResourceType(): BackendResourceType {
        return this.backendConfig.resourceType;
    }

    /**
     * Pridobi ime resursa
     */
    public getResourceName(): string {
        return this.backendConfig.resourceName;
    }

    /**
     * Pridobi bulkhead statistiko
     */
    public getBulkheadStats(): BulkheadStats | null {
        return this.bulkhead?.getStats() ?? null;
    }

    /**
     * Izvedi funkcijo z circuit breaker in bulkhead zaščito
     */
    public async executeWithFallback<T>(
        fn: () => Promise<T>,
        fallback?: () => Promise<T>
    ): Promise<T> {
        const effectiveFallback = fallback ?? this.backendConfig.fallback;

        try {
            if (this.bulkhead) {
                return await this.bulkhead.execute(() => super.execute(fn));
            }
            return await super.execute(fn);
        } catch (error) {
            if (effectiveFallback && error instanceof CircuitBreakerOpenError) {
                return effectiveFallback() as Promise<T>;
            }
            throw error;
        }
    }

    /**
     * Izvedi health check in posodobi stanje
     */
    public async checkHealth(): Promise<boolean> {
        if (!this.backendConfig.healthCheck) {
            return true;
        }

        try {
            const healthy = await this.backendConfig.healthCheck();
            if (healthy && this.getState() === 'open') {
                // Health check uspel, poskusi half-open
                this.reset();
            }
            return healthy;
        } catch {
            return false;
        }
    }
}

// Registry za backend circuit breakers
const circuitBreakerRegistry: Map<string, BackendCircuitBreaker> = new Map();

/**
 * Ustvari in registriraj database circuit breaker
 */
export function createDatabaseCircuitBreaker(
    name: string,
    config: Partial<BackendCircuitBreakerConfig> = {}
): BackendCircuitBreaker {
    const cb = new BackendCircuitBreaker({
        resourceType: 'DATABASE',
        resourceName: name,
        failureThreshold: config.failureThreshold ?? 3,
        resetTimeout: config.resetTimeout ?? 30000,
        halfOpenRequests: config.halfOpenRequests ?? 1,
        failureWindow: config.failureWindow ?? 60000,
        bulkhead: config.bulkhead ?? {
            maxConcurrent: 20,
            maxQueue: 50,
            queueTimeout: 5000,
        },
        ...config,
    });
    circuitBreakerRegistry.set(`db:${name}`, cb);
    return cb;
}

/**
 * Ustvari in registriraj message broker circuit breaker
 */
export function createMessageBrokerCircuitBreaker(
    name: string,
    config: Partial<BackendCircuitBreakerConfig> = {}
): BackendCircuitBreaker {
    const cb = new BackendCircuitBreaker({
        resourceType: 'MESSAGE_BROKER',
        resourceName: name,
        failureThreshold: config.failureThreshold ?? 5,
        resetTimeout: config.resetTimeout ?? 60000,
        halfOpenRequests: config.halfOpenRequests ?? 1,
        failureWindow: config.failureWindow ?? 120000,
        bulkhead: config.bulkhead ?? {
            maxConcurrent: 50,
            maxQueue: 200,
            queueTimeout: 10000,
        },
        ...config,
    });
    circuitBreakerRegistry.set(`broker:${name}`, cb);
    return cb;
}

/**
 * Ustvari in registriraj cache circuit breaker
 */
export function createCacheCircuitBreaker(
    name: string,
    config: Partial<BackendCircuitBreakerConfig> = {}
): BackendCircuitBreaker {
    const cb = new BackendCircuitBreaker({
        resourceType: 'CACHE',
        resourceName: name,
        failureThreshold: config.failureThreshold ?? 5,
        resetTimeout: config.resetTimeout ?? 10000,
        halfOpenRequests: config.halfOpenRequests ?? 2,
        failureWindow: config.failureWindow ?? 30000,
        bulkhead: config.bulkhead ?? {
            maxConcurrent: 100,
            maxQueue: 500,
            queueTimeout: 1000,
        },
        ...config,
    });
    circuitBreakerRegistry.set(`cache:${name}`, cb);
    return cb;
}

/**
 * Ustvari in registriraj external service circuit breaker
 */
export function createExternalServiceCircuitBreaker(
    name: string,
    config: Partial<BackendCircuitBreakerConfig> = {}
): BackendCircuitBreaker {
    const cb = new BackendCircuitBreaker({
        resourceType: 'EXTERNAL_SERVICE',
        resourceName: name,
        failureThreshold: config.failureThreshold ?? 5,
        resetTimeout: config.resetTimeout ?? 30000,
        halfOpenRequests: config.halfOpenRequests ?? 1,
        failureWindow: config.failureWindow ?? 60000,
        bulkhead: config.bulkhead ?? {
            maxConcurrent: 10,
            maxQueue: 20,
            queueTimeout: 30000,
        },
        ...config,
    });
    circuitBreakerRegistry.set(`external:${name}`, cb);
    return cb;
}

/**
 * Pridobi circuit breaker iz registra
 */
export function getCircuitBreaker(key: string): BackendCircuitBreaker | null {
    return circuitBreakerRegistry.get(key) ?? null;
}

/**
 * Pridobi vse circuit breaker statistike
 */
export function getAllCircuitBreakerStats(): Record<string, {
    state: CircuitState;
    stats: CircuitBreakerStats;
    bulkhead: BulkheadStats | null;
}> {
    const result: Record<string, {
        state: CircuitState;
        stats: CircuitBreakerStats;
        bulkhead: BulkheadStats | null;
    }> = {};

    for (const [key, cb] of circuitBreakerRegistry.entries()) {
        result[key] = {
            state: cb.getState(),
            stats: cb.getStats(),
            bulkhead: cb.getBulkheadStats(),
        };
    }

    return result;
}

// ============================================================================
// IZVOZ
// ============================================================================

export const CircuitBreakerModule = {
    CircuitBreaker,
    CircuitBreakerOpenError,
    Bulkhead,
    BulkheadRejectError,
    BulkheadTimeoutError,
    BackendCircuitBreaker,
    createDatabaseCircuitBreaker,
    createMessageBrokerCircuitBreaker,
    createCacheCircuitBreaker,
    createExternalServiceCircuitBreaker,
    getCircuitBreaker,
    getAllCircuitBreakerStats,
};
