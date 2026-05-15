/**
 * @file HTTP Client za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-INT-001 HTTP client za zaledne sisteme
 * @design DSN-ZALEDNI-INT-001 Backend HTTP client arhitektura
 * @test TEST-ZALEDNI-INT-001 Preverjanje HTTP client
 *
 * HTTP Client - prilagojen za zaledne sisteme:
 * - Request/Response handling
 * - Connection pooling
 * - Retry logic
 * - Timeout handling
 * - Request interceptors
 * - Response interceptors
 * - Circuit breaker integration
 * - Metrics collection
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom INT_001 - HTTP Client
 */
/**
 * HTTP method
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
/**
 * Request config
 */
export interface RequestConfig {
    readonly url: string;
    readonly method: HttpMethod;
    readonly headers: Readonly<Record<string, string>>;
    readonly params: Readonly<Record<string, string | number | boolean>>;
    readonly body: unknown;
    readonly timeout: number;
    readonly retries: number;
    readonly retryDelay: number;
    readonly followRedirects: boolean;
    readonly maxRedirects: number;
    readonly validateStatus: (status: number) => boolean;
    readonly responseType: ResponseType;
    readonly signal: AbortSignal | null;
    readonly metadata: Readonly<Record<string, unknown>>;
}
/**
 * Response type
 */
export type ResponseType = 'json' | 'text' | 'blob' | 'arraybuffer' | 'stream';
/**
 * HTTP response
 */
export interface HttpResponse<T = unknown> {
    readonly requestId: string;
    readonly status: number;
    readonly statusText: string;
    readonly headers: Readonly<Record<string, string>>;
    readonly data: T;
    readonly config: RequestConfig;
    readonly duration: number;
    readonly retryCount: number;
    readonly redirectCount: number;
}
/**
 * HTTP error
 */
export interface HttpError {
    readonly requestId: string;
    readonly message: string;
    readonly code: string;
    readonly status: number | null;
    readonly config: RequestConfig;
    readonly response: HttpResponse | null;
    readonly isTimeout: boolean;
    readonly isNetworkError: boolean;
    readonly isAborted: boolean;
}
/**
 * Request interceptor
 */
export type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
/**
 * Response interceptor
 */
export type ResponseInterceptor<T = unknown> = (response: HttpResponse<T>) => HttpResponse<T> | Promise<HttpResponse<T>>;
/**
 * Error interceptor
 */
export type ErrorInterceptor = (error: HttpError) => HttpError | Promise<HttpError>;
/**
 * Client configuration
 */
export interface ClientConfig {
    readonly baseUrl: string;
    readonly timeout: number;
    readonly retries: number;
    readonly retryDelay: number;
    readonly retryStatusCodes: readonly number[];
    readonly headers: Readonly<Record<string, string>>;
    readonly followRedirects: boolean;
    readonly maxRedirects: number;
    readonly validateStatus: (status: number) => boolean;
    readonly maxConcurrentRequests: number;
    readonly keepAlive: boolean;
    readonly keepAliveTimeout: number;
}
/**
 * Connection pool stats
 */
export interface ConnectionPoolStats {
    readonly totalConnections: number;
    readonly activeConnections: number;
    readonly idleConnections: number;
    readonly pendingRequests: number;
    readonly totalRequests: number;
    readonly failedRequests: number;
    readonly avgResponseTime: number;
}
/**
 * Request metrics
 */
export interface RequestMetrics {
    readonly requestId: string;
    readonly url: string;
    readonly method: HttpMethod;
    readonly status: number | null;
    readonly duration: number;
    readonly retryCount: number;
    readonly success: boolean;
    readonly timestamp: number;
}
/**
 * Circuit breaker state
 */
export type CircuitState = 'closed' | 'open' | 'half_open';
/**
 * Circuit breaker config
 */
export interface CircuitBreakerConfig {
    readonly enabled: boolean;
    readonly failureThreshold: number;
    readonly successThreshold: number;
    readonly timeout: number;
    readonly volumeThreshold: number;
}
/**
 * Circuit breaker stats
 */
export interface CircuitBreakerStats {
    readonly state: CircuitState;
    readonly failures: number;
    readonly successes: number;
    readonly lastFailure: number | null;
    readonly lastSuccess: number | null;
    readonly openedAt: number | null;
}
/**
 * Add request interceptor
 */
export declare function addRequestInterceptor(interceptor: RequestInterceptor): void;
/**
 * Add response interceptor
 */
export declare function addResponseInterceptor(interceptor: ResponseInterceptor): void;
/**
 * Add error interceptor
 */
export declare function addErrorInterceptor(interceptor: ErrorInterceptor): void;
/**
 * Remove request interceptor
 */
export declare function removeRequestInterceptor(interceptor: RequestInterceptor): void;
/**
 * Remove response interceptor
 */
export declare function removeResponseInterceptor(interceptor: ResponseInterceptor): void;
/**
 * Remove error interceptor
 */
export declare function removeErrorInterceptor(interceptor: ErrorInterceptor): void;
/**
 * Clear all interceptors
 */
export declare function clearInterceptors(): void;
/**
 * Make HTTP request
 */
export declare function request<T = unknown>(url: string, options?: Partial<RequestConfig>): Promise<HttpResponse<T>>;
/**
 * GET request
 */
export declare function get<T = unknown>(url: string, options?: Partial<Omit<RequestConfig, 'method' | 'body'>>): Promise<HttpResponse<T>>;
/**
 * POST request
 */
export declare function post<T = unknown>(url: string, body?: unknown, options?: Partial<Omit<RequestConfig, 'method'>>): Promise<HttpResponse<T>>;
/**
 * PUT request
 */
export declare function put<T = unknown>(url: string, body?: unknown, options?: Partial<Omit<RequestConfig, 'method'>>): Promise<HttpResponse<T>>;
/**
 * PATCH request
 */
export declare function patch<T = unknown>(url: string, body?: unknown, options?: Partial<Omit<RequestConfig, 'method'>>): Promise<HttpResponse<T>>;
/**
 * DELETE request
 */
export declare function del<T = unknown>(url: string, options?: Partial<Omit<RequestConfig, 'method'>>): Promise<HttpResponse<T>>;
/**
 * HEAD request
 */
export declare function head(url: string, options?: Partial<Omit<RequestConfig, 'method' | 'body'>>): Promise<HttpResponse<void>>;
/**
 * OPTIONS request
 */
export declare function options(url: string, options?: Partial<Omit<RequestConfig, 'method' | 'body'>>): Promise<HttpResponse<void>>;
/**
 * Configure client
 */
export declare function configure(config: Partial<ClientConfig>): void;
/**
 * Get configuration
 */
export declare function getConfig(): Readonly<ClientConfig>;
/**
 * Configure circuit breaker
 */
export declare function configureCircuitBreaker(config: Partial<CircuitBreakerConfig>): void;
/**
 * Get circuit breaker configuration
 */
export declare function getCircuitBreakerConfig(): Readonly<CircuitBreakerConfig>;
/**
 * Get connection pool stats
 */
export declare function getPoolStats(): Readonly<ConnectionPoolStats>;
/**
 * Get request metrics
 */
export declare function getMetrics(options?: {
    url?: string;
    method?: HttpMethod;
    success?: boolean;
    fromDate?: number;
    toDate?: number;
    limit?: number;
}): readonly RequestMetrics[];
/**
 * Get circuit breaker stats
 */
export declare function getCircuitBreakerStats(url?: string): Readonly<Record<string, CircuitBreakerStats>>;
/**
 * Reset circuit breaker
 */
export declare function resetCircuitBreaker(url: string): void;
/**
 * Reset all circuit breakers
 */
export declare function resetAllCircuitBreakers(): void;
/**
 * Clear metrics history
 */
export declare function clearMetrics(): void;
/**
 * Reset pool stats
 */
export declare function resetPoolStats(): void;
/**
 * Clear all state
 */
export declare function clearAll(): void;
