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
/**
 * Izvedi funkcijo s fallback vrednostjo
 */
export declare function withFallback<T>(fn: () => Promise<T>, config: FallbackConfig<T>): Promise<FallbackResult<T>>;
/**
 * Ustvari funkcijo s fallback vrednostjo
 */
export declare function fallbackTo<T>(fallbackValue: T, timeout?: number): (fn: () => Promise<T>) => Promise<T>;
/**
 * Izvedi vec funkcij v zaporedju dokler ena ne uspe
 */
export declare function fallbackChain<T>(fns: ReadonlyArray<() => Promise<T>>, defaultValue: T): Promise<FallbackResult<T>>;
/**
 * Cached fallback - uporabi cache ce primarna funkcija ne uspe
 */
export declare function createCachedFallback<T>(primaryFn: () => Promise<T>, cacheTtl?: number): () => Promise<FallbackResult<T>>;
export declare const Fallback: {
    withFallback: typeof withFallback;
    fallbackTo: typeof fallbackTo;
    fallbackChain: typeof fallbackChain;
    createCachedFallback: typeof createCachedFallback;
};
