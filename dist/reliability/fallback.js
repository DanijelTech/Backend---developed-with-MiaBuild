"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Fallback = void 0;
exports.withFallback = withFallback;
exports.fallbackTo = fallbackTo;
exports.fallbackChain = fallbackChain;
exports.createCachedFallback = createCachedFallback;
const clock_1 = require("@mia/core/clock");
const clock = (0, clock_1.getClock)();
// ============================================================================
// FUNKCIJE
// ============================================================================
/**
 * Izvedi funkcijo s fallback vrednostjo
 */
async function withFallback(fn, config) {
    const startTime = clock.nowMs();
    try {
        // Ustvari timeout promise
        const timeoutPromise = new Promise((_, reject) => {
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
    }
    catch (error) {
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
function fallbackTo(fallbackValue, timeout = 5000) {
    return async (fn) => {
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
async function fallbackChain(fns, defaultValue) {
    const startTime = clock.nowMs();
    let lastError = null;
    for (const fn of fns) {
        try {
            const value = await fn();
            return {
                value,
                usedFallback: false,
                error: null,
                executionTime: clock.nowMs() - startTime,
            };
        }
        catch (error) {
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
function createCachedFallback(primaryFn, cacheTtl = 60000) {
    let cachedValue = null;
    let cacheTimestamp = 0;
    return async () => {
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
        }
        catch (error) {
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
exports.Fallback = {
    withFallback,
    fallbackTo,
    fallbackChain,
    createCachedFallback,
};
