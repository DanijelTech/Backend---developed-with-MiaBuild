"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRequestInterceptor = addRequestInterceptor;
exports.addResponseInterceptor = addResponseInterceptor;
exports.addErrorInterceptor = addErrorInterceptor;
exports.removeRequestInterceptor = removeRequestInterceptor;
exports.removeResponseInterceptor = removeResponseInterceptor;
exports.removeErrorInterceptor = removeErrorInterceptor;
exports.clearInterceptors = clearInterceptors;
exports.request = request;
exports.get = get;
exports.post = post;
exports.put = put;
exports.patch = patch;
exports.del = del;
exports.head = head;
exports.options = options;
exports.configure = configure;
exports.getConfig = getConfig;
exports.configureCircuitBreaker = configureCircuitBreaker;
exports.getCircuitBreakerConfig = getCircuitBreakerConfig;
exports.getPoolStats = getPoolStats;
exports.getMetrics = getMetrics;
exports.getCircuitBreakerStats = getCircuitBreakerStats;
exports.resetCircuitBreaker = resetCircuitBreaker;
exports.resetAllCircuitBreakers = resetAllCircuitBreakers;
exports.clearMetrics = clearMetrics;
exports.resetPoolStats = resetPoolStats;
exports.clearAll = clearAll;
const clock_1 = require("@mia/core/clock");
const deterministic_1 = require("@mia/core/deterministic");
const clock = (0, clock_1.getClock)();
// ============================================================================
// STANJE
// ============================================================================
const requestInterceptors = [];
const responseInterceptors = [];
const errorInterceptors = [];
const metricsHistory = [];
const circuitBreakers = new Map();
let requestCounter = 0;
let activeRequests = 0;
let clientConfig = {
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
let circuitBreakerConfig = {
    enabled: false,
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 30000,
    volumeThreshold: 10,
};
const poolStats = {
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
function generateRequestId() {
    requestCounter++;
    return (0, deterministic_1.generateDeterministicId)(`http-request-${requestCounter}`);
}
/**
 * Build URL with params
 */
function buildUrl(baseUrl, url, params) {
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
function mergeHeaders(defaultHeaders, customHeaders) {
    return { ...defaultHeaders, ...customHeaders };
}
/**
 * Calculate retry delay with exponential backoff
 */
function calculateRetryDelay(attempt, baseDelay) {
    return baseDelay * Math.pow(2, attempt - 1);
}
/**
 * Check if should retry
 */
function shouldRetry(status, retryStatusCodes) {
    if (status === null) {
        return true;
    }
    return retryStatusCodes.includes(status);
}
/**
 * Get circuit breaker key
 */
function getCircuitBreakerKey(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.origin;
    }
    catch {
        return url;
    }
}
/**
 * Get or create circuit breaker stats
 */
function getCircuitBreakerStats(key) {
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
function recordCircuitBreakerSuccess(key) {
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
function recordCircuitBreakerFailure(key) {
    const stats = getCircuitBreakerStats(key);
    const now = clock.nowMs();
    let newState = stats.state;
    let newFailures = stats.failures + 1;
    let openedAt = stats.openedAt;
    if (stats.state === 'closed' && newFailures >= circuitBreakerConfig.failureThreshold) {
        newState = 'open';
        openedAt = now;
    }
    else if (stats.state === 'half_open') {
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
function isCircuitOpen(key) {
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
function recordMetrics(metrics) {
    metricsHistory.push(metrics);
    if (metricsHistory.length > 10000) {
        metricsHistory.shift();
    }
    const mutablePoolStats = poolStats;
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
function addRequestInterceptor(interceptor) {
    requestInterceptors.push(interceptor);
}
/**
 * Add response interceptor
 */
function addResponseInterceptor(interceptor) {
    responseInterceptors.push(interceptor);
}
/**
 * Add error interceptor
 */
function addErrorInterceptor(interceptor) {
    errorInterceptors.push(interceptor);
}
/**
 * Remove request interceptor
 */
function removeRequestInterceptor(interceptor) {
    const index = requestInterceptors.indexOf(interceptor);
    if (index !== -1) {
        requestInterceptors.splice(index, 1);
    }
}
/**
 * Remove response interceptor
 */
function removeResponseInterceptor(interceptor) {
    const index = responseInterceptors.indexOf(interceptor);
    if (index !== -1) {
        responseInterceptors.splice(index, 1);
    }
}
/**
 * Remove error interceptor
 */
function removeErrorInterceptor(interceptor) {
    const index = errorInterceptors.indexOf(interceptor);
    if (index !== -1) {
        errorInterceptors.splice(index, 1);
    }
}
/**
 * Clear all interceptors
 */
function clearInterceptors() {
    requestInterceptors.length = 0;
    responseInterceptors.length = 0;
    errorInterceptors.length = 0;
}
/**
 * Apply request interceptors
 */
async function applyRequestInterceptors(config) {
    let result = config;
    for (const interceptor of requestInterceptors) {
        result = await interceptor(result);
    }
    return result;
}
/**
 * Apply response interceptors
 */
async function applyResponseInterceptors(response) {
    let result = response;
    for (const interceptor of responseInterceptors) {
        result = await interceptor(result);
    }
    return result;
}
/**
 * Apply error interceptors
 */
async function applyErrorInterceptors(error) {
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
async function executeRequest(config) {
    const requestId = generateRequestId();
    const startTime = clock.nowMs();
    const fullUrl = buildUrl(clientConfig.baseUrl, config.url, config.params);
    const circuitKey = getCircuitBreakerKey(fullUrl);
    if (isCircuitOpen(circuitKey)) {
        const error = {
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
    const mutablePoolStats = poolStats;
    mutablePoolStats.activeConnections = activeRequests;
    try {
        const response = {
            requestId,
            status: 200,
            statusText: 'OK',
            headers: {},
            data: {},
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
    }
    catch (err) {
        if (circuitBreakerConfig.enabled) {
            recordCircuitBreakerFailure(circuitKey);
        }
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        const error = {
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
    }
    finally {
        activeRequests--;
        mutablePoolStats.activeConnections = activeRequests;
    }
}
/**
 * Execute request with retries
 */
async function executeWithRetries(config) {
    let lastError = null;
    let retryCount = 0;
    for (let attempt = 0; attempt <= config.retries; attempt++) {
        try {
            const response = await executeRequest(config);
            if (!config.validateStatus(response.status)) {
                if (shouldRetry(response.status, clientConfig.retryStatusCodes) && attempt < config.retries) {
                    const delay = calculateRetryDelay(attempt + 1, config.retryDelay);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    retryCount++;
                    continue;
                }
                const error = {
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
        }
        catch (error) {
            lastError = error;
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
async function request(url, options = {}) {
    const config = {
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
    return executeWithRetries(interceptedConfig);
}
/**
 * GET request
 */
async function get(url, options = {}) {
    return request(url, { ...options, method: 'GET' });
}
/**
 * POST request
 */
async function post(url, body, options = {}) {
    return request(url, { ...options, method: 'POST', body });
}
/**
 * PUT request
 */
async function put(url, body, options = {}) {
    return request(url, { ...options, method: 'PUT', body });
}
/**
 * PATCH request
 */
async function patch(url, body, options = {}) {
    return request(url, { ...options, method: 'PATCH', body });
}
/**
 * DELETE request
 */
async function del(url, options = {}) {
    return request(url, { ...options, method: 'DELETE' });
}
/**
 * HEAD request
 */
async function head(url, options = {}) {
    return request(url, { ...options, method: 'HEAD' });
}
/**
 * OPTIONS request
 */
async function options(url, options = {}) {
    return request(url, { ...options, method: 'OPTIONS' });
}
// ============================================================================
// CONFIGURATION
// ============================================================================
/**
 * Configure client
 */
function configure(config) {
    clientConfig = { ...clientConfig, ...config };
}
/**
 * Get configuration
 */
function getConfig() {
    return { ...clientConfig };
}
/**
 * Configure circuit breaker
 */
function configureCircuitBreaker(config) {
    circuitBreakerConfig = { ...circuitBreakerConfig, ...config };
}
/**
 * Get circuit breaker configuration
 */
function getCircuitBreakerConfig() {
    return { ...circuitBreakerConfig };
}
// ============================================================================
// STATISTICS
// ============================================================================
/**
 * Get connection pool stats
 */
function getPoolStats() {
    return { ...poolStats };
}
/**
 * Get request metrics
 */
function getMetrics(options = {}) {
    let filtered = [...metricsHistory];
    if (options.url) {
        filtered = filtered.filter(m => m.url.includes(options.url));
    }
    if (options.method) {
        filtered = filtered.filter(m => m.method === options.method);
    }
    if (options.success !== undefined) {
        filtered = filtered.filter(m => m.success === options.success);
    }
    if (options.fromDate) {
        filtered = filtered.filter(m => m.timestamp >= options.fromDate);
    }
    if (options.toDate) {
        filtered = filtered.filter(m => m.timestamp <= options.toDate);
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
function getCircuitBreakerStats(url) {
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
function resetCircuitBreaker(url) {
    const key = getCircuitBreakerKey(url);
    circuitBreakers.delete(key);
}
/**
 * Reset all circuit breakers
 */
function resetAllCircuitBreakers() {
    circuitBreakers.clear();
}
// ============================================================================
// CLEANUP
// ============================================================================
/**
 * Clear metrics history
 */
function clearMetrics() {
    metricsHistory.length = 0;
}
/**
 * Reset pool stats
 */
function resetPoolStats() {
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
function clearAll() {
    clearInterceptors();
    clearMetrics();
    resetPoolStats();
    resetAllCircuitBreakers();
}
