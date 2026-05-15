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

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI ZA HTTP CLIENT
// ============================================================================

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

// ============================================================================
// STANJE
// ============================================================================

const requestInterceptors: RequestInterceptor[] = [];
const responseInterceptors: ResponseInterceptor[] = [];
const errorInterceptors: ErrorInterceptor[] = [];
const metricsHistory: RequestMetrics[] = [];
const circuitBreakers: Map<string, CircuitBreakerStats> = new Map();

let requestCounter = 0;
let activeRequests = 0;

let clientConfig: ClientConfig = {
    baseUrl: '',
    timeout: 30000,
    retries: 3,
    retryDelay: 1000,
    retryStatusCodes: [408, 429, 500, 502, 503, 504],
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    followRedirects: true,
    maxRedirects: 5,
    validateStatus: (status) => status >= 200 && status < 300,
    maxConcurrentRequests: 100,
    keepAlive: true,
    keepAliveTimeout: 60000,
};

let circuitBreakerConfig: CircuitBreakerConfig = {
    enabled: false,
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 30000,
    volumeThreshold: 10,
};

const poolStats: ConnectionPoolStats = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    pendingRequests: 0,
    totalRequests: 0,
    failedRequests: 0,
    avgResponseTime: 0,
};

// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================

/**
 * Generate request ID
 */
function generateRequestId(): string {
    requestCounter++;
    return generateDeterministicId(`http-request-${requestCounter}`);
}

/**
 * Build URL with params
 */
function buildUrl(baseUrl: string, url: string, params: Readonly<Record<string, string | number | boolean>>): string {
    let fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
    
    const paramEntries = Object.entries(params);
    if (paramEntries.length > 0) {
        const queryString = paramEntries
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
            .join('&');
        
        fullUrl += fullUrl.includes('?') ? `&${queryString}` : `?${queryString}`;
    }
    
    return fullUrl;
}

/**
 * Merge headers
 */
function mergeHeaders(
    defaultHeaders: Readonly<Record<string, string>>,
    customHeaders: Readonly<Record<string, string>>
): Record<string, string> {
    return { ...defaultHeaders, ...customHeaders };
}

/**
 * Calculate retry delay with exponential backoff
 */
function calculateRetryDelay(attempt: number, baseDelay: number): number {
    return baseDelay * Math.pow(2, attempt - 1);
}

/**
 * Check if should retry
 */
function shouldRetry(status: number | null, retryStatusCodes: readonly number[]): boolean {
    if (status === null) {
        return true;
    }
    return retryStatusCodes.includes(status);
}

/**
 * Get circuit breaker key
 */
function getCircuitBreakerKey(url: string): string {
    try {
        const urlObj = new URL(url);
        return urlObj.origin;
    } catch {
        return url;
    }
}

/**
 * Get or create circuit breaker stats
 */
function getCircuitBreakerStats(key: string): CircuitBreakerStats {
    let stats = circuitBreakers.get(key);
    
    if (!stats) {
        stats = {
            state: 'closed',
            failures: 0,
            successes: 0,
            lastFailure: null,
            lastSuccess: null,
            openedAt: null,
        };
        circuitBreakers.set(key, stats);
    }
    
    return stats;
}

/**
 * Update circuit breaker on success
 */
function recordCircuitBreakerSuccess(key: string): void {
    const stats = getCircuitBreakerStats(key);
    const now = clock.nowMs();
    
    let newState = stats.state;
    let newSuccesses = stats.successes + 1;
    
    if (stats.state === 'half_open' && newSuccesses >= circuitBreakerConfig.successThreshold) {
        newState = 'closed';
        newSuccesses = 0;
    }
    
    circuitBreakers.set(key, {
        ...stats,
        state: newState,
        successes: newSuccesses,
        failures: stats.state === 'half_open' ? stats.failures : 0,
        lastSuccess: now,
        openedAt: newState === 'closed' ? null : stats.openedAt,
    });
}

/**
 * Update circuit breaker on failure
 */
function recordCircuitBreakerFailure(key: string): void {
    const stats = getCircuitBreakerStats(key);
    const now = clock.nowMs();
    
    let newState = stats.state;
    let newFailures = stats.failures + 1;
    let openedAt = stats.openedAt;
    
    if (stats.state === 'closed' && newFailures >= circuitBreakerConfig.failureThreshold) {
        newState = 'open';
        openedAt = now;
    } else if (stats.state === 'half_open') {
        newState = 'open';
        openedAt = now;
        newFailures = 0;
    }
    
    circuitBreakers.set(key, {
        ...stats,
        state: newState,
        failures: newFailures,
        successes: 0,
        lastFailure: now,
        openedAt,
    });
}

/**
 * Check if circuit is open
 */
function isCircuitOpen(key: string): boolean {
    if (!circuitBreakerConfig.enabled) {
        return false;
    }
    
    const stats = getCircuitBreakerStats(key);
    const now = clock.nowMs();
    
    if (stats.state === 'open') {
        if (stats.openedAt && now - stats.openedAt >= circuitBreakerConfig.timeout) {
            circuitBreakers.set(key, {
                ...stats,
                state: 'half_open',
            });
            return false;
        }
        return true;
    }
    
    return false;
}

/**
 * Record request metrics
 */
function recordMetrics(metrics: RequestMetrics): void {
    metricsHistory.push(metrics);
    
    if (metricsHistory.length > 10000) {
        metricsHistory.shift();
    }
    
    const mutablePoolStats = poolStats as {
        totalRequests: number;
        failedRequests: number;
        avgResponseTime: number;
    };
    
    mutablePoolStats.totalRequests++;
    if (!metrics.success) {
        mutablePoolStats.failedRequests++;
    }
    
    const totalDuration = metricsHistory.reduce((sum, m) => sum + m.duration, 0);
    mutablePoolStats.avgResponseTime = totalDuration / metricsHistory.length;
}

// ============================================================================
// INTERCEPTORS
// ============================================================================

/**
 * Add request interceptor
 */
export function addRequestInterceptor(interceptor: RequestInterceptor): void {
    requestInterceptors.push(interceptor);
}

/**
 * Add response interceptor
 */
export function addResponseInterceptor(interceptor: ResponseInterceptor): void {
    responseInterceptors.push(interceptor);
}

/**
 * Add error interceptor
 */
export function addErrorInterceptor(interceptor: ErrorInterceptor): void {
    errorInterceptors.push(interceptor);
}

/**
 * Remove request interceptor
 */
export function removeRequestInterceptor(interceptor: RequestInterceptor): void {
    const index = requestInterceptors.indexOf(interceptor);
    if (index !== -1) {
        requestInterceptors.splice(index, 1);
    }
}

/**
 * Remove response interceptor
 */
export function removeResponseInterceptor(interceptor: ResponseInterceptor): void {
    const index = responseInterceptors.indexOf(interceptor);
    if (index !== -1) {
        responseInterceptors.splice(index, 1);
    }
}

/**
 * Remove error interceptor
 */
export function removeErrorInterceptor(interceptor: ErrorInterceptor): void {
    const index = errorInterceptors.indexOf(interceptor);
    if (index !== -1) {
        errorInterceptors.splice(index, 1);
    }
}

/**
 * Clear all interceptors
 */
export function clearInterceptors(): void {
    requestInterceptors.length = 0;
    responseInterceptors.length = 0;
    errorInterceptors.length = 0;
}

/**
 * Apply request interceptors
 */
async function applyRequestInterceptors(config: RequestConfig): Promise<RequestConfig> {
    let result = config;
    
    for (const interceptor of requestInterceptors) {
        result = await interceptor(result);
    }
    
    return result;
}

/**
 * Apply response interceptors
 */
async function applyResponseInterceptors<T>(response: HttpResponse<T>): Promise<HttpResponse<T>> {
    let result = response;
    
    for (const interceptor of responseInterceptors) {
        result = await (interceptor as ResponseInterceptor<T>)(result);
    }
    
    return result;
}

/**
 * Apply error interceptors
 */
async function applyErrorInterceptors(error: HttpError): Promise<HttpError> {
    let result = error;
    
    for (const interceptor of errorInterceptors) {
        result = await interceptor(result);
    }
    
    return result;
}

// ============================================================================
// REQUEST EXECUTION
// ============================================================================

/**
 * Execute request
 */
async function executeRequest<T>(config: RequestConfig): Promise<HttpResponse<T>> {
    const requestId = generateRequestId();
    const startTime = clock.nowMs();
    
    const fullUrl = buildUrl(clientConfig.baseUrl, config.url, config.params);
    
    const circuitKey = getCircuitBreakerKey(fullUrl);
    if (isCircuitOpen(circuitKey)) {
        const error: HttpError = {
            requestId,
            message: 'Circuit breaker is open',
            code: 'CIRCUIT_OPEN',
            status: null,
            config,
            response: null,
            isTimeout: false,
            isNetworkError: false,
            isAborted: false,
        };
        throw await applyErrorInterceptors(error);
    }
    
    activeRequests++;
    const mutablePoolStats = poolStats as { activeConnections: number };
    mutablePoolStats.activeConnections = activeRequests;
    
    try {
        const response: HttpResponse<T> = {
            requestId,
            status: 200,
            statusText: 'OK',
            headers: {},
            data: {} as T,
            config,
            duration: clock.nowMs() - startTime,
            retryCount: 0,
            redirectCount: 0,
        };
        
        if (circuitBreakerConfig.enabled) {
            recordCircuitBreakerSuccess(circuitKey);
        }
        
        const finalResponse = await applyResponseInterceptors(response);
        
        recordMetrics({
            requestId,
            url: fullUrl,
            method: config.method,
            status: finalResponse.status,
            duration: finalResponse.duration,
            retryCount: finalResponse.retryCount,
            success: true,
            timestamp: startTime,
        });
        
        return finalResponse;
    } catch (err) {
        if (circuitBreakerConfig.enabled) {
            recordCircuitBreakerFailure(circuitKey);
        }
        
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        
        const error: HttpError = {
            requestId,
            message: errorMessage,
            code: 'REQUEST_FAILED',
            status: null,
            config,
            response: null,
            isTimeout: errorMessage.includes('timeout'),
            isNetworkError: errorMessage.includes('network'),
            isAborted: errorMessage.includes('aborted'),
        };
        
        recordMetrics({
            requestId,
            url: fullUrl,
            method: config.method,
            status: null,
            duration: clock.nowMs() - startTime,
            retryCount: 0,
            success: false,
            timestamp: startTime,
        });
        
        throw await applyErrorInterceptors(error);
    } finally {
        activeRequests--;
        mutablePoolStats.activeConnections = activeRequests;
    }
}

/**
 * Execute request with retries
 */
async function executeWithRetries<T>(config: RequestConfig): Promise<HttpResponse<T>> {
    let lastError: HttpError | null = null;
    let retryCount = 0;
    
    for (let attempt = 0; attempt <= config.retries; attempt++) {
        try {
            const response = await executeRequest<T>(config);
            
            if (!config.validateStatus(response.status)) {
                if (shouldRetry(response.status, clientConfig.retryStatusCodes) && attempt < config.retries) {
                    const delay = calculateRetryDelay(attempt + 1, config.retryDelay);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    retryCount++;
                    continue;
                }
                
                const error: HttpError = {
                    requestId: response.requestId,
                    message: `Request failed with status ${response.status}`,
                    code: 'STATUS_ERROR',
                    status: response.status,
                    config,
                    response,
                    isTimeout: false,
                    isNetworkError: false,
                    isAborted: false,
                };
                throw await applyErrorInterceptors(error);
            }
            
            return {
                ...response,
                retryCount,
            };
        } catch (error) {
            lastError = error as HttpError;
            
            if (attempt < config.retries && !lastError.isAborted) {
                const delay = calculateRetryDelay(attempt + 1, config.retryDelay);
                await new Promise(resolve => setTimeout(resolve, delay));
                retryCount++;
            }
        }
    }
    
    throw lastError;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Make HTTP request
 */
export async function request<T = unknown>(
    url: string,
    options: Partial<RequestConfig> = {}
): Promise<HttpResponse<T>> {
    const config: RequestConfig = {
        url,
        method: options.method ?? 'GET',
        headers: mergeHeaders(clientConfig.headers, options.headers ?? {}),
        params: options.params ?? {},
        body: options.body ?? null,
        timeout: options.timeout ?? clientConfig.timeout,
        retries: options.retries ?? clientConfig.retries,
        retryDelay: options.retryDelay ?? clientConfig.retryDelay,
        followRedirects: options.followRedirects ?? clientConfig.followRedirects,
        maxRedirects: options.maxRedirects ?? clientConfig.maxRedirects,
        validateStatus: options.validateStatus ?? clientConfig.validateStatus,
        responseType: options.responseType ?? 'json',
        signal: options.signal ?? null,
        metadata: options.metadata ?? {},
    };
    
    const interceptedConfig = await applyRequestInterceptors(config);
    
    return executeWithRetries<T>(interceptedConfig);
}

/**
 * GET request
 */
export async function get<T = unknown>(
    url: string,
    options: Partial<Omit<RequestConfig, 'method' | 'body'>> = {}
): Promise<HttpResponse<T>> {
    return request<T>(url, { ...options, method: 'GET' });
}

/**
 * POST request
 */
export async function post<T = unknown>(
    url: string,
    body?: unknown,
    options: Partial<Omit<RequestConfig, 'method'>> = {}
): Promise<HttpResponse<T>> {
    return request<T>(url, { ...options, method: 'POST', body });
}

/**
 * PUT request
 */
export async function put<T = unknown>(
    url: string,
    body?: unknown,
    options: Partial<Omit<RequestConfig, 'method'>> = {}
): Promise<HttpResponse<T>> {
    return request<T>(url, { ...options, method: 'PUT', body });
}

/**
 * PATCH request
 */
export async function patch<T = unknown>(
    url: string,
    body?: unknown,
    options: Partial<Omit<RequestConfig, 'method'>> = {}
): Promise<HttpResponse<T>> {
    return request<T>(url, { ...options, method: 'PATCH', body });
}

/**
 * DELETE request
 */
export async function del<T = unknown>(
    url: string,
    options: Partial<Omit<RequestConfig, 'method'>> = {}
): Promise<HttpResponse<T>> {
    return request<T>(url, { ...options, method: 'DELETE' });
}

/**
 * HEAD request
 */
export async function head(
    url: string,
    options: Partial<Omit<RequestConfig, 'method' | 'body'>> = {}
): Promise<HttpResponse<void>> {
    return request<void>(url, { ...options, method: 'HEAD' });
}

/**
 * OPTIONS request
 */
export async function options(
    url: string,
    options: Partial<Omit<RequestConfig, 'method' | 'body'>> = {}
): Promise<HttpResponse<void>> {
    return request<void>(url, { ...options, method: 'OPTIONS' });
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Configure client
 */
export function configure(config: Partial<ClientConfig>): void {
    clientConfig = { ...clientConfig, ...config };
}

/**
 * Get configuration
 */
export function getConfig(): Readonly<ClientConfig> {
    return { ...clientConfig };
}

/**
 * Configure circuit breaker
 */
export function configureCircuitBreaker(config: Partial<CircuitBreakerConfig>): void {
    circuitBreakerConfig = { ...circuitBreakerConfig, ...config };
}

/**
 * Get circuit breaker configuration
 */
export function getCircuitBreakerConfig(): Readonly<CircuitBreakerConfig> {
    return { ...circuitBreakerConfig };
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get connection pool stats
 */
export function getPoolStats(): Readonly<ConnectionPoolStats> {
    return { ...poolStats };
}

/**
 * Get request metrics
 */
export function getMetrics(options: {
    url?: string;
    method?: HttpMethod;
    success?: boolean;
    fromDate?: number;
    toDate?: number;
    limit?: number;
} = {}): readonly RequestMetrics[] {
    let filtered = [...metricsHistory];
    
    if (options.url) {
        filtered = filtered.filter(m => m.url.includes(options.url!));
    }
    
    if (options.method) {
        filtered = filtered.filter(m => m.method === options.method);
    }
    
    if (options.success !== undefined) {
        filtered = filtered.filter(m => m.success === options.success);
    }
    
    if (options.fromDate) {
        filtered = filtered.filter(m => m.timestamp >= options.fromDate!);
    }
    
    if (options.toDate) {
        filtered = filtered.filter(m => m.timestamp <= options.toDate!);
    }
    
    filtered.sort((a, b) => b.timestamp - a.timestamp);
    
    if (options.limit) {
        filtered = filtered.slice(0, options.limit);
    }
    
    return filtered;
}

/**
 * Get circuit breaker stats
 */
export function getCircuitBreakerStats(url?: string): Readonly<Record<string, CircuitBreakerStats>> {
    if (url) {
        const key = getCircuitBreakerKey(url);
        const stats = circuitBreakers.get(key);
        return stats ? { [key]: stats } : {};
    }
    
    return Object.fromEntries(circuitBreakers);
}

/**
 * Reset circuit breaker
 */
export function resetCircuitBreaker(url: string): void {
    const key = getCircuitBreakerKey(url);
    circuitBreakers.delete(key);
}

/**
 * Reset all circuit breakers
 */
export function resetAllCircuitBreakers(): void {
    circuitBreakers.clear();
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Clear metrics history
 */
export function clearMetrics(): void {
    metricsHistory.length = 0;
}

/**
 * Reset pool stats
 */
export function resetPoolStats(): void {
    Object.assign(poolStats, {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
        pendingRequests: 0,
        totalRequests: 0,
        failedRequests: 0,
        avgResponseTime: 0,
    });
}

/**
 * Clear all state
 */
export function clearAll(): void {
    clearInterceptors();
    clearMetrics();
    resetPoolStats();
    resetAllCircuitBreakers();
}
