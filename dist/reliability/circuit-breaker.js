"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreakerModule = exports.BackendCircuitBreaker = exports.BulkheadTimeoutError = exports.BulkheadRejectError = exports.Bulkhead = exports.CircuitBreakerOpenError = exports.CircuitBreaker = void 0;
exports.createDatabaseCircuitBreaker = createDatabaseCircuitBreaker;
exports.createMessageBrokerCircuitBreaker = createMessageBrokerCircuitBreaker;
exports.createCacheCircuitBreaker = createCacheCircuitBreaker;
exports.createExternalServiceCircuitBreaker = createExternalServiceCircuitBreaker;
exports.getCircuitBreaker = getCircuitBreaker;
exports.getAllCircuitBreakerStats = getAllCircuitBreakerStats;
const clock_1 = require("@mia/core/clock");
const clock = (0, clock_1.getClock)();
// ============================================================================
// KONSTANTE
// ============================================================================
const DEFAULT_CONFIG = {
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
class CircuitBreaker {
    constructor(config = {}) {
        this.state = 'closed';
        this.failures = 0;
        this.successes = 0;
        this.lastFailure = null;
        this.lastSuccess = null;
        this.openedAt = null;
        this.halfOpenAttempts = 0;
        this.failureTimestamps = [];
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /**
     * Pridobi trenutno stanje
     */
    getState() {
        this.checkStateTransition();
        return this.state;
    }
    /**
     * Pridobi statistiko
     */
    getStats() {
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
    async execute(fn) {
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
        }
        catch (error) {
            this.recordFailure();
            throw error;
        }
    }
    /**
     * Preveri in izvedi prehod stanja
     */
    checkStateTransition() {
        const now = clock.nowMs();
        if (this.state === 'open' && this.openedAt !== null) {
            if (now - this.openedAt >= this.config.resetTimeout) {
                this.transitionTo('half-open');
            }
        }
        // Pocisti stare failure timestamp-e
        this.failureTimestamps = this.failureTimestamps.filter(ts => now - ts < this.config.failureWindow);
    }
    /**
     * Zabeleži uspeh
     */
    recordSuccess() {
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
    recordFailure() {
        const now = clock.nowMs();
        this.failures++;
        this.lastFailure = now;
        this.failureTimestamps.push(now);
        // Pocisti stare timestamp-e
        this.failureTimestamps = this.failureTimestamps.filter(ts => now - ts < this.config.failureWindow);
        if (this.state === 'half-open') {
            this.transitionTo('open');
            this.halfOpenAttempts = 0;
        }
        else if (this.state === 'closed') {
            if (this.failureTimestamps.length >= this.config.failureThreshold) {
                this.transitionTo('open');
            }
        }
    }
    /**
     * Prehod v novo stanje
     */
    transitionTo(newState) {
        const oldState = this.state;
        this.state = newState;
        if (newState === 'open') {
            this.openedAt = clock.nowMs();
        }
        else if (newState === 'closed') {
            this.openedAt = null;
        }
        if (this.config.onStateChange) {
            this.config.onStateChange(oldState, newState);
        }
    }
    /**
     * Rocno ponastavi circuit breaker
     */
    reset() {
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
exports.CircuitBreaker = CircuitBreaker;
/**
 * Napaka ko je circuit breaker odprt
 */
class CircuitBreakerOpenError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CircuitBreakerOpenError';
        Object.setPrototypeOf(this, CircuitBreakerOpenError.prototype);
    }
}
exports.CircuitBreakerOpenError = CircuitBreakerOpenError;
// ============================================================================
// BACKEND-SPECIFICNE FUNKCIJE
// ============================================================================
/**
 * Bulkhead implementacija za resource isolation
 */
class Bulkhead {
    constructor(config = {}) {
        this.activeCount = 0;
        this.queuedCount = 0;
        this.rejectedCount = 0;
        this.queue = [];
        this.config = {
            maxConcurrent: config.maxConcurrent ?? 10,
            maxQueue: config.maxQueue ?? 100,
            queueTimeout: config.queueTimeout ?? 30000,
        };
    }
    /**
     * Pridobi statistiko
     */
    getStats() {
        return {
            activeCount: this.activeCount,
            queuedCount: this.queuedCount,
            rejectedCount: this.rejectedCount,
        };
    }
    /**
     * Pridobi permit za izvajanje
     */
    async acquire() {
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
        return new Promise((resolve, reject) => {
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
    release() {
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
    cleanupQueue() {
        const now = clock.nowMs();
        const expiredIndices = [];
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
    async execute(fn) {
        await this.acquire();
        try {
            return await fn();
        }
        finally {
            this.release();
        }
    }
}
exports.Bulkhead = Bulkhead;
/**
 * Napaka ko je bulkhead poln
 */
class BulkheadRejectError extends Error {
    constructor(message) {
        super(message);
        this.name = 'BulkheadRejectError';
        Object.setPrototypeOf(this, BulkheadRejectError.prototype);
    }
}
exports.BulkheadRejectError = BulkheadRejectError;
/**
 * Napaka ko bulkhead timeout potece
 */
class BulkheadTimeoutError extends Error {
    constructor(message) {
        super(message);
        this.name = 'BulkheadTimeoutError';
        Object.setPrototypeOf(this, BulkheadTimeoutError.prototype);
    }
}
exports.BulkheadTimeoutError = BulkheadTimeoutError;
/**
 * Backend Circuit Breaker z bulkhead in fallback podporo
 */
class BackendCircuitBreaker extends CircuitBreaker {
    constructor(config) {
        super(config);
        this.backendConfig = config;
        this.bulkhead = config.bulkhead ? new Bulkhead(config.bulkhead) : null;
    }
    /**
     * Pridobi tip resursa
     */
    getResourceType() {
        return this.backendConfig.resourceType;
    }
    /**
     * Pridobi ime resursa
     */
    getResourceName() {
        return this.backendConfig.resourceName;
    }
    /**
     * Pridobi bulkhead statistiko
     */
    getBulkheadStats() {
        return this.bulkhead?.getStats() ?? null;
    }
    /**
     * Izvedi funkcijo z circuit breaker in bulkhead zaščito
     */
    async executeWithFallback(fn, fallback) {
        const effectiveFallback = fallback ?? this.backendConfig.fallback;
        try {
            if (this.bulkhead) {
                return await this.bulkhead.execute(() => super.execute(fn));
            }
            return await super.execute(fn);
        }
        catch (error) {
            if (effectiveFallback && error instanceof CircuitBreakerOpenError) {
                return effectiveFallback();
            }
            throw error;
        }
    }
    /**
     * Izvedi health check in posodobi stanje
     */
    async checkHealth() {
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
        }
        catch {
            return false;
        }
    }
}
exports.BackendCircuitBreaker = BackendCircuitBreaker;
// Registry za backend circuit breakers
const circuitBreakerRegistry = new Map();
/**
 * Ustvari in registriraj database circuit breaker
 */
function createDatabaseCircuitBreaker(name, config = {}) {
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
function createMessageBrokerCircuitBreaker(name, config = {}) {
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
function createCacheCircuitBreaker(name, config = {}) {
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
function createExternalServiceCircuitBreaker(name, config = {}) {
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
function getCircuitBreaker(key) {
    return circuitBreakerRegistry.get(key) ?? null;
}
/**
 * Pridobi vse circuit breaker statistike
 */
function getAllCircuitBreakerStats() {
    const result = {};
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
exports.CircuitBreakerModule = {
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
