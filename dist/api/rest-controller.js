"use strict";
/**
 * @file REST Controller za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-API-001 REST API za zaledne sisteme
 * @design DSN-ZALEDNI-API-001 Backend REST arhitektura
 * @test TEST-ZALEDNI-API-001 Preverjanje REST API
 *
 * REST Controller - prilagojen za zaledne sisteme:
 * - Standardizirani HTTP metode (GET, POST, PUT, PATCH, DELETE)
 * - Validacija vhodnih podatkov
 * - Serializacija in deserializacija
 * - Error handling z ustreznimi HTTP kodami
 * - Rate limiting in throttling
 * - Request/Response logging
 * - CORS konfiguracija
 * - Content negotiation
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom API_001 - REST Controller
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureController = configureController;
exports.registerRoute = registerRoute;
exports.get = get;
exports.post = post;
exports.put = put;
exports.patch = patch;
exports.del = del;
exports.handleRequest = handleRequest;
exports.loggingMiddleware = loggingMiddleware;
exports.authenticationMiddleware = authenticationMiddleware;
exports.authorizationMiddleware = authorizationMiddleware;
exports.timeoutMiddleware = timeoutMiddleware;
exports.compressionMiddleware = compressionMiddleware;
exports.parsePaginationParams = parsePaginationParams;
exports.createPaginatedResponse = createPaginatedResponse;
exports.ok = ok;
exports.created = created;
exports.noContent = noContent;
exports.badRequest = badRequest;
exports.notFound = notFound;
exports.conflict = conflict;
exports.getRoutes = getRoutes;
exports.clearRoutes = clearRoutes;
exports.getConfig = getConfig;
const clock_1 = require("@mia/core/clock");
const deterministic_1 = require("@mia/core/deterministic");
const clock = (0, clock_1.getClock)();
// ============================================================================
// STANJE
// ============================================================================
const routes = new Map();
const rateLimitCounters = new Map();
let requestCounter = 0;
let config = {
    basePath: '/api',
    version: 'v1',
    cors: {
        allowedOrigins: ['*'],
        allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Correlation-ID'],
        exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
        maxAge: 86400,
        allowCredentials: true,
    },
    rateLimitPerMinute: 100,
    maxRequestBodySize: 1048576,
    requestTimeout: 30000,
    enableRequestLogging: true,
    enableResponseLogging: true,
};
// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================
/**
 * Generiraj request ID
 */
function generateRequestId() {
    requestCounter++;
    return (0, deterministic_1.generateDeterministicId)(`request-${requestCounter}`);
}
/**
 * Generiraj route key
 */
function generateRouteKey(method, path) {
    return `${method}:${path}`;
}
/**
 * Parse query string
 */
function parseQueryString(queryString) {
    const params = {};
    if (!queryString) {
        return params;
    }
    const pairs = queryString.split('&');
    for (const pair of pairs) {
        const [key, value] = pair.split('=').map(decodeURIComponent);
        if (key) {
            const existing = params[key];
            if (existing === undefined) {
                params[key] = value || '';
            }
            else if (Array.isArray(existing)) {
                existing.push(value || '');
            }
            else {
                params[key] = [existing, value || ''];
            }
        }
    }
    return params;
}
/**
 * Match path against route pattern
 */
function matchPath(pattern, path) {
    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = path.split('/').filter(Boolean);
    if (patternParts.length !== pathParts.length) {
        return null;
    }
    const params = {};
    for (let i = 0; i < patternParts.length; i++) {
        const patternPart = patternParts[i];
        const pathPart = pathParts[i];
        if (patternPart.startsWith(':')) {
            const paramName = patternPart.slice(1);
            params[paramName] = pathPart;
        }
        else if (patternPart !== pathPart) {
            return null;
        }
    }
    return params;
}
/**
 * Validate value against JSON schema
 */
function validateAgainstSchema(value, schema, path = '') {
    const errors = [];
    if (schema.type === 'object' && typeof value === 'object' && value !== null) {
        const obj = value;
        if (schema.required) {
            for (const requiredField of schema.required) {
                if (!(requiredField in obj)) {
                    errors.push({
                        field: path ? `${path}.${requiredField}` : requiredField,
                        message: `Field '${requiredField}' is required`,
                        code: 'REQUIRED_FIELD',
                    });
                }
            }
        }
        if (schema.properties) {
            for (const [propName, propSchema] of Object.entries(schema.properties)) {
                if (propName in obj) {
                    const propPath = path ? `${path}.${propName}` : propName;
                    errors.push(...validateAgainstSchema(obj[propName], propSchema, propPath));
                }
            }
        }
        if (schema.additionalProperties === false) {
            const allowedProps = new Set(Object.keys(schema.properties || {}));
            for (const key of Object.keys(obj)) {
                if (!allowedProps.has(key)) {
                    errors.push({
                        field: path ? `${path}.${key}` : key,
                        message: `Additional property '${key}' is not allowed`,
                        code: 'ADDITIONAL_PROPERTY',
                        value: obj[key],
                    });
                }
            }
        }
    }
    else if (schema.type === 'array' && Array.isArray(value)) {
        if (schema.items) {
            for (let i = 0; i < value.length; i++) {
                const itemPath = `${path}[${i}]`;
                errors.push(...validateAgainstSchema(value[i], schema.items, itemPath));
            }
        }
    }
    else if (schema.type === 'string') {
        if (typeof value !== 'string') {
            errors.push({
                field: path,
                message: `Expected string, got ${typeof value}`,
                code: 'INVALID_TYPE',
                value,
            });
        }
        else {
            if (schema.minLength !== undefined && value.length < schema.minLength) {
                errors.push({
                    field: path,
                    message: `String must be at least ${schema.minLength} characters`,
                    code: 'MIN_LENGTH',
                    value,
                });
            }
            if (schema.maxLength !== undefined && value.length > schema.maxLength) {
                errors.push({
                    field: path,
                    message: `String must be at most ${schema.maxLength} characters`,
                    code: 'MAX_LENGTH',
                    value,
                });
            }
            if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) {
                errors.push({
                    field: path,
                    message: `String does not match pattern '${schema.pattern}'`,
                    code: 'PATTERN_MISMATCH',
                    value,
                });
            }
            if (schema.enum !== undefined && !schema.enum.includes(value)) {
                errors.push({
                    field: path,
                    message: `Value must be one of: ${schema.enum.join(', ')}`,
                    code: 'INVALID_ENUM',
                    value,
                });
            }
        }
    }
    else if (schema.type === 'number' || schema.type === 'integer') {
        if (typeof value !== 'number') {
            errors.push({
                field: path,
                message: `Expected number, got ${typeof value}`,
                code: 'INVALID_TYPE',
                value,
            });
        }
        else {
            if (schema.type === 'integer' && !Number.isInteger(value)) {
                errors.push({
                    field: path,
                    message: 'Expected integer',
                    code: 'INVALID_INTEGER',
                    value,
                });
            }
            if (schema.minimum !== undefined && value < schema.minimum) {
                errors.push({
                    field: path,
                    message: `Value must be at least ${schema.minimum}`,
                    code: 'MIN_VALUE',
                    value,
                });
            }
            if (schema.maximum !== undefined && value > schema.maximum) {
                errors.push({
                    field: path,
                    message: `Value must be at most ${schema.maximum}`,
                    code: 'MAX_VALUE',
                    value,
                });
            }
        }
    }
    else if (schema.type === 'boolean') {
        if (typeof value !== 'boolean') {
            errors.push({
                field: path,
                message: `Expected boolean, got ${typeof value}`,
                code: 'INVALID_TYPE',
                value,
            });
        }
    }
    return errors;
}
/**
 * Create error response
 */
function createErrorResponse(statusCode, code, message, requestId, details) {
    const errorBody = {
        error: {
            code,
            message,
            details,
            requestId,
            timestamp: clock.nowMs(),
        },
    };
    return {
        statusCode,
        headers: [
            { name: 'Content-Type', value: 'application/json' },
            { name: 'X-Request-ID', value: requestId },
        ],
        body: errorBody,
        contentType: 'application/json',
    };
}
/**
 * Create success response
 */
function createSuccessResponse(statusCode, body, requestId, additionalHeaders = []) {
    return {
        statusCode,
        headers: [
            { name: 'Content-Type', value: 'application/json' },
            { name: 'X-Request-ID', value: requestId },
            ...additionalHeaders,
        ],
        body,
        contentType: 'application/json',
    };
}
/**
 * Check rate limit
 */
function checkRateLimit(clientId) {
    const now = clock.nowMs();
    const windowMs = 60000;
    let counter = rateLimitCounters.get(clientId);
    if (!counter || now >= counter.resetAt) {
        counter = {
            count: 0,
            resetAt: now + windowMs,
        };
        rateLimitCounters.set(clientId, counter);
    }
    counter.count++;
    const remaining = Math.max(0, config.rateLimitPerMinute - counter.count);
    const retryAfter = remaining === 0 ? Math.ceil((counter.resetAt - now) / 1000) : null;
    return {
        limit: config.rateLimitPerMinute,
        remaining,
        resetAt: counter.resetAt,
        retryAfter,
    };
}
/**
 * Get header value
 */
function getHeaderValue(headers, name) {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header?.value ?? null;
}
/**
 * Parse Accept header
 */
function parseAcceptHeader(acceptHeader) {
    if (!acceptHeader) {
        return ['*/*'];
    }
    return acceptHeader
        .split(',')
        .map(part => {
        const [mediaType] = part.trim().split(';');
        return mediaType.trim();
    })
        .filter(Boolean);
}
// ============================================================================
// CONTROLLER FUNKCIJE
// ============================================================================
/**
 * Nastavi konfiguracijo controllerja
 */
function configureController(newConfig) {
    config = { ...config, ...newConfig };
}
/**
 * Registriraj route
 */
function registerRoute(definition) {
    const fullPath = `${config.basePath}/${config.version}${definition.path}`;
    const key = generateRouteKey(definition.method, fullPath);
    routes.set(key, {
        ...definition,
        path: fullPath,
    });
}
/**
 * Registriraj GET route
 */
function get(path, handler, options = {}) {
    registerRoute({
        method: 'GET',
        path,
        handler,
        middleware: options.middleware || [],
        description: options.description || '',
        tags: options.tags || [],
        requestSchema: null,
        responseSchema: options.responseSchema || null,
    });
}
/**
 * Registriraj POST route
 */
function post(path, handler, options = {}) {
    registerRoute({
        method: 'POST',
        path,
        handler,
        middleware: options.middleware || [],
        description: options.description || '',
        tags: options.tags || [],
        requestSchema: options.requestSchema || null,
        responseSchema: options.responseSchema || null,
    });
}
/**
 * Registriraj PUT route
 */
function put(path, handler, options = {}) {
    registerRoute({
        method: 'PUT',
        path,
        handler,
        middleware: options.middleware || [],
        description: options.description || '',
        tags: options.tags || [],
        requestSchema: options.requestSchema || null,
        responseSchema: options.responseSchema || null,
    });
}
/**
 * Registriraj PATCH route
 */
function patch(path, handler, options = {}) {
    registerRoute({
        method: 'PATCH',
        path,
        handler,
        middleware: options.middleware || [],
        description: options.description || '',
        tags: options.tags || [],
        requestSchema: options.requestSchema || null,
        responseSchema: options.responseSchema || null,
    });
}
/**
 * Registriraj DELETE route
 */
function del(path, handler, options = {}) {
    registerRoute({
        method: 'DELETE',
        path,
        handler,
        middleware: options.middleware || [],
        description: options.description || '',
        tags: options.tags || [],
        requestSchema: null,
        responseSchema: options.responseSchema || null,
    });
}
/**
 * Find matching route
 */
function findRoute(method, path) {
    for (const route of routes.values()) {
        if (route.method !== method) {
            continue;
        }
        const pathParams = matchPath(route.path, path);
        if (pathParams !== null) {
            return { route, pathParams };
        }
    }
    return null;
}
/**
 * Handle CORS preflight
 */
function handleCorsPreflight(request) {
    const origin = getHeaderValue(request.headers, 'Origin');
    const requestMethod = getHeaderValue(request.headers, 'Access-Control-Request-Method');
    const requestHeaders = getHeaderValue(request.headers, 'Access-Control-Request-Headers');
    const headers = [];
    if (origin && (config.cors.allowedOrigins.includes('*') || config.cors.allowedOrigins.includes(origin))) {
        headers.push({ name: 'Access-Control-Allow-Origin', value: origin });
    }
    if (requestMethod && config.cors.allowedMethods.includes(requestMethod)) {
        headers.push({ name: 'Access-Control-Allow-Methods', value: config.cors.allowedMethods.join(', ') });
    }
    if (requestHeaders) {
        headers.push({ name: 'Access-Control-Allow-Headers', value: config.cors.allowedHeaders.join(', ') });
    }
    headers.push({ name: 'Access-Control-Max-Age', value: config.cors.maxAge.toString() });
    if (config.cors.allowCredentials) {
        headers.push({ name: 'Access-Control-Allow-Credentials', value: 'true' });
    }
    return {
        statusCode: 204,
        headers,
        body: null,
        contentType: '',
    };
}
/**
 * Add CORS headers to response
 */
function addCorsHeaders(response, origin) {
    const headers = [...response.headers];
    if (origin && (config.cors.allowedOrigins.includes('*') || config.cors.allowedOrigins.includes(origin))) {
        headers.push({ name: 'Access-Control-Allow-Origin', value: origin });
    }
    if (config.cors.exposedHeaders.length > 0) {
        headers.push({ name: 'Access-Control-Expose-Headers', value: config.cors.exposedHeaders.join(', ') });
    }
    if (config.cors.allowCredentials) {
        headers.push({ name: 'Access-Control-Allow-Credentials', value: 'true' });
    }
    return { ...response, headers };
}
/**
 * Execute middleware chain
 */
async function executeMiddlewareChain(request, context, middleware, handler) {
    let index = 0;
    const next = async () => {
        if (index < middleware.length) {
            const currentMiddleware = middleware[index];
            index++;
            return currentMiddleware(request, context, next);
        }
        return handler(request, context);
    };
    return next();
}
/**
 * Handle incoming request
 */
async function handleRequest(method, path, queryString, headers, body, remoteAddress) {
    const requestId = generateRequestId();
    const startTime = clock.nowMs();
    const request = {
        requestId,
        method,
        path,
        queryParams: parseQueryString(queryString),
        pathParams: {},
        headers,
        body,
        contentType: getHeaderValue(headers, 'Content-Type'),
        acceptTypes: parseAcceptHeader(getHeaderValue(headers, 'Accept')),
        remoteAddress,
        timestamp: startTime,
    };
    const origin = getHeaderValue(headers, 'Origin');
    if (method === 'OPTIONS') {
        return handleCorsPreflight(request);
    }
    const rateLimitInfo = checkRateLimit(remoteAddress);
    if (rateLimitInfo.remaining === 0) {
        const response = createErrorResponse(429, 'RATE_LIMIT_EXCEEDED', 'Too many requests', requestId);
        return addCorsHeaders({
            ...response,
            headers: [
                ...response.headers,
                { name: 'X-RateLimit-Limit', value: rateLimitInfo.limit.toString() },
                { name: 'X-RateLimit-Remaining', value: '0' },
                { name: 'X-RateLimit-Reset', value: rateLimitInfo.resetAt.toString() },
                { name: 'Retry-After', value: (rateLimitInfo.retryAfter || 60).toString() },
            ],
        }, origin);
    }
    const match = findRoute(method, path);
    if (!match) {
        const response = createErrorResponse(404, 'NOT_FOUND', `Route ${method} ${path} not found`, requestId);
        return addCorsHeaders(response, origin);
    }
    const { route, pathParams } = match;
    const requestWithParams = {
        ...request,
        pathParams,
    };
    if (route.requestSchema && body !== null && body !== undefined) {
        const validationErrors = validateAgainstSchema(body, route.requestSchema);
        if (validationErrors.length > 0) {
            const response = createErrorResponse(422, 'VALIDATION_ERROR', 'Request validation failed', requestId, validationErrors);
            return addCorsHeaders(response, origin);
        }
    }
    const context = {
        requestId,
        startTime,
        userId: null,
        roles: [],
        permissions: [],
        correlationId: getHeaderValue(headers, 'X-Correlation-ID') || requestId,
        traceId: getHeaderValue(headers, 'X-Trace-ID') || (0, deterministic_1.generateDeterministicId)(`trace-${requestCounter}`),
        spanId: (0, deterministic_1.generateDeterministicId)(`span-${requestCounter}`),
        metadata: {},
    };
    try {
        const response = await executeMiddlewareChain(requestWithParams, context, route.middleware, route.handler);
        const responseWithRateLimit = {
            ...response,
            headers: [
                ...response.headers,
                { name: 'X-RateLimit-Limit', value: rateLimitInfo.limit.toString() },
                { name: 'X-RateLimit-Remaining', value: rateLimitInfo.remaining.toString() },
                { name: 'X-RateLimit-Reset', value: rateLimitInfo.resetAt.toString() },
            ],
        };
        return addCorsHeaders(responseWithRateLimit, origin);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        const response = createErrorResponse(500, 'INTERNAL_ERROR', errorMessage, requestId);
        return addCorsHeaders(response, origin);
    }
}
// ============================================================================
// MIDDLEWARE FUNKCIJE
// ============================================================================
/**
 * Logging middleware
 */
function loggingMiddleware() {
    return async (request, context, next) => {
        const response = await next();
        return response;
    };
}
/**
 * Authentication middleware
 */
function authenticationMiddleware(validateToken) {
    return async (request, context, next) => {
        const authHeader = getHeaderValue(request.headers, 'Authorization');
        if (!authHeader) {
            return createErrorResponse(401, 'UNAUTHORIZED', 'Authorization header is required', request.requestId);
        }
        const [scheme, token] = authHeader.split(' ');
        if (scheme !== 'Bearer' || !token) {
            return createErrorResponse(401, 'UNAUTHORIZED', 'Invalid authorization scheme', request.requestId);
        }
        const user = await validateToken(token);
        if (!user) {
            return createErrorResponse(401, 'UNAUTHORIZED', 'Invalid or expired token', request.requestId);
        }
        const authenticatedContext = {
            ...context,
            userId: user.userId,
            roles: user.roles,
        };
        return next();
    };
}
/**
 * Authorization middleware
 */
function authorizationMiddleware(requiredRoles) {
    return async (request, context, next) => {
        if (!context.userId) {
            return createErrorResponse(401, 'UNAUTHORIZED', 'Authentication required', request.requestId);
        }
        const hasRequiredRole = requiredRoles.some(role => context.roles.includes(role));
        if (!hasRequiredRole) {
            return createErrorResponse(403, 'FORBIDDEN', 'Insufficient permissions', request.requestId);
        }
        return next();
    };
}
/**
 * Request timeout middleware
 */
function timeoutMiddleware(timeoutMs) {
    return async (request, context, next) => {
        const timeoutPromise = new Promise((_, reject) => {
            const timeoutId = setTimeout(() => {
                clearTimeout(timeoutId);
                reject(new Error('Request timeout'));
            }, timeoutMs);
        });
        try {
            return await Promise.race([next(), timeoutPromise]);
        }
        catch (error) {
            if (error instanceof Error && error.message === 'Request timeout') {
                return createErrorResponse(408, 'REQUEST_TIMEOUT', 'Request timed out', request.requestId);
            }
            throw error;
        }
    };
}
/**
 * Compression middleware
 */
function compressionMiddleware() {
    return async (request, context, next) => {
        const response = await next();
        const acceptEncoding = getHeaderValue(request.headers, 'Accept-Encoding');
        if (acceptEncoding && acceptEncoding.includes('gzip')) {
            return {
                ...response,
                headers: [
                    ...response.headers,
                    { name: 'Content-Encoding', value: 'gzip' },
                ],
            };
        }
        return response;
    };
}
// ============================================================================
// UTILITY FUNKCIJE ZA HANDLERS
// ============================================================================
/**
 * Parse pagination params from query
 */
function parsePaginationParams(queryParams, defaults = { pageSize: 20, maxPageSize: 100 }) {
    const pageParam = queryParams['page'];
    const pageSizeParam = queryParams['pageSize'] || queryParams['limit'];
    const sortByParam = queryParams['sortBy'] || queryParams['sort'];
    const sortOrderParam = queryParams['sortOrder'] || queryParams['order'];
    const page = Math.max(1, parseInt(Array.isArray(pageParam) ? pageParam[0] : pageParam || '1', 10) || 1);
    const requestedPageSize = parseInt(Array.isArray(pageSizeParam) ? pageSizeParam[0] : pageSizeParam || String(defaults.pageSize), 10) || defaults.pageSize;
    const pageSize = Math.min(Math.max(1, requestedPageSize), defaults.maxPageSize);
    const sortBy = Array.isArray(sortByParam) ? sortByParam[0] : sortByParam || null;
    const sortOrderValue = Array.isArray(sortOrderParam) ? sortOrderParam[0] : sortOrderParam;
    const sortOrder = sortOrderValue === 'desc' ? 'desc' : 'asc';
    return { page, pageSize, sortBy, sortOrder };
}
/**
 * Create paginated response
 */
function createPaginatedResponse(data, pagination, totalItems) {
    const totalPages = Math.ceil(totalItems / pagination.pageSize);
    return {
        data,
        pagination: {
            page: pagination.page,
            pageSize: pagination.pageSize,
            totalItems,
            totalPages,
            hasNextPage: pagination.page < totalPages,
            hasPreviousPage: pagination.page > 1,
        },
    };
}
/**
 * Create response with status 200
 */
function ok(body, requestId) {
    return createSuccessResponse(200, body, requestId);
}
/**
 * Create response with status 201
 */
function created(body, requestId, location) {
    const headers = [];
    if (location) {
        headers.push({ name: 'Location', value: location });
    }
    return createSuccessResponse(201, body, requestId, headers);
}
/**
 * Create response with status 204
 */
function noContent(requestId) {
    return {
        statusCode: 204,
        headers: [{ name: 'X-Request-ID', value: requestId }],
        body: null,
        contentType: '',
    };
}
/**
 * Create bad request response
 */
function badRequest(message, requestId, details) {
    return createErrorResponse(400, 'BAD_REQUEST', message, requestId, details);
}
/**
 * Create not found response
 */
function notFound(message, requestId) {
    return createErrorResponse(404, 'NOT_FOUND', message, requestId);
}
/**
 * Create conflict response
 */
function conflict(message, requestId) {
    return createErrorResponse(409, 'CONFLICT', message, requestId);
}
/**
 * Get all registered routes
 */
function getRoutes() {
    return Array.from(routes.values());
}
/**
 * Clear all routes
 */
function clearRoutes() {
    routes.clear();
}
/**
 * Get current configuration
 */
function getConfig() {
    return config;
}
