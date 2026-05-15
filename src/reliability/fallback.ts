/**
 * @file Fallback modul za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 * 
 * @requirement ZAH-ZALEDNI-REL-005 Graceful degradation za zaledne sisteme
 * @design DSN-ZALEDNI-REL-005 Backend fallback arhitektura
 * @test TEST-ZALEDNI-REL-005 Preverjanje fallback funkcionalnosti
 * 
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom REL_005 - Graceful Degradation
 */

import { getClock, Clock } from '@mia/core/clock';
const clock: Clock = getClock();

// ============================================================================
// TIPI
// ============================================================================

/**
 * Konfiguracija fallback-a
 */
export interface FallbackConfig<T> {
    /** Privzeta vrednost */
    readonly fallbackValue: T;
    /** Timeout v ms */
    readonly timeout: number;
    /** Ali naj se logira */
    readonly logFallback: boolean;
    /** Callback ob fallback-u */
    readonly onFallback?: (error: unknown, fallbackValue: T) => void;
}

/**
 * Rezultat z fallback informacijo
 */
export interface FallbackResult<T> {
    /** Vrednost */
    readonly value: T;
    /** Ali je bil uporabljen fallback */
    readonly usedFallback: boolean;
    /** Napaka (ce je bila) */
    readonly error: unknown | null;
    /** Cas izvajanja v ms */
    readonly executionTime: number;
}

// ============================================================================
// FUNKCIJE
// ============================================================================

/**
 * Izvedi funkcijo s fallback vrednostjo
 */
export async function withFallback<T>(
    fn: () => Promise<T>,
    config: FallbackConfig<T>
): Promise<FallbackResult<T>> {
    const startTime = clock.nowMs();
    
    try {
        // Ustvari timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Operation timed out after ${config.timeout}ms`));
            }, config.timeout);
        });
        
        // Race med funkcijo in timeout-om
        const value = await Promise.race([fn(), timeoutPromise]);
        
        return {
            value,
            usedFallback: false,
            error: null,
            executionTime: clock.nowMs() - startTime,
        };
    } catch (error) {
        // Logiraj fallback
        if (config.logFallback) {
            const logEntry = JSON.stringify({
                type: 'FALLBACK',
                timestamp: new Date(clock.nowMs()).toISOString(),
                error: error instanceof Error ? error.message : String(error),
                fallbackValue: config.fallbackValue,
            });
            process.stderr.write(logEntry + '\n');
        }
        
        // Callback
        if (config.onFallback) {
            config.onFallback(error, config.fallbackValue);
        }
        
        return {
            value: config.fallbackValue,
            usedFallback: true,
            error,
            executionTime: clock.nowMs() - startTime,
        };
    }
}

/**
 * Ustvari funkcijo s fallback vrednostjo
 */
export function fallbackTo<T>(
    fallbackValue: T,
    timeout: number = 5000
): (fn: () => Promise<T>) => Promise<T> {
    return async (fn: () => Promise<T>): Promise<T> => {
        const result = await withFallback(fn, {
            fallbackValue,
            timeout,
            logFallback: true,
        });
        return result.value;
    };
}

/**
 * Izvedi vec funkcij v zaporedju dokler ena ne uspe
 */
export async function fallbackChain<T>(
    fns: ReadonlyArray<() => Promise<T>>,
    defaultValue: T
): Promise<FallbackResult<T>> {
    const startTime = clock.nowMs();
    let lastError: unknown = null;
    
    for (const fn of fns) {
        try {
            const value = await fn();
            return {
                value,
                usedFallback: false,
                error: null,
                executionTime: clock.nowMs() - startTime,
            };
        } catch (error) {
            lastError = error;
            // Nadaljuj z naslednjo funkcijo
        }
    }
    
    return {
        value: defaultValue,
        usedFallback: true,
        error: lastError,
        executionTime: clock.nowMs() - startTime,
    };
}

/**
 * Cached fallback - uporabi cache ce primarna funkcija ne uspe
 */
export function createCachedFallback<T>(
    primaryFn: () => Promise<T>,
    cacheTtl: number = 60000
): () => Promise<FallbackResult<T>> {
    let cachedValue: T | null = null;
    let cacheTimestamp: number = 0;
    
    return async (): Promise<FallbackResult<T>> => {
        const startTime = clock.nowMs();
        
        try {
            const value = await primaryFn();
            cachedValue = value;
            cacheTimestamp = clock.nowMs();
            
            return {
                value,
                usedFallback: false,
                error: null,
                executionTime: clock.nowMs() - startTime,
            };
        } catch (error) {
            // Preveri ali je cache se veljaven
            if (cachedValue !== null && clock.nowMs() - cacheTimestamp < cacheTtl) {
                return {
                    value: cachedValue,
                    usedFallback: true,
                    error,
                    executionTime: clock.nowMs() - startTime,
                };
            }
            
            throw error;
        }
    };
}

// ============================================================================
// IZVOZ
// ============================================================================

export const Fallback = {
    withFallback,
    fallbackTo,
    fallbackChain,
    createCachedFallback,
};
