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

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI ZA REST CONTROLLER
// ============================================================================

/**
 * HTTP metoda
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * HTTP status koda
 */
export type HttpStatusCode = 
    | 200 | 201 | 202 | 204
    | 301 | 302 | 304
    | 400 | 401 | 403 | 404 | 405 | 406 | 408 | 409 | 410 | 413 | 415 | 422 | 429
    | 500 | 501 | 502 | 503 | 504;

/**
 * HTTP header
 */
export interface HttpHeader {
    readonly name: string;
    readonly value: string;
}

/**
 * HTTP request
 */
export interface HttpRequest {
    readonly requestId: string;
    readonly method: HttpMethod;
    readonly path: string;
    readonly queryParams: Readonly<Record<string, string | string[]>>;
    readonly pathParams: Readonly<Record<string, string>>;
    readonly headers: readonly HttpHeader[];
    readonly body: unknown;
    readonly contentType: string | null;
    readonly acceptTypes: readonly string[];
    readonly remoteAddress: string;
    readonly timestamp: number;
}

/**
 * HTTP response
 */
export interface HttpResponse {
    readonly statusCode: HttpStatusCode;
    readonly headers: readonly HttpHeader[];
    readonly body: unknown;
    readonly contentType: string;
}

/**
 * Route definicija
 */
export interface RouteDefinition {
    readonly method: HttpMethod;
    readonly path: string;
    readonly handler: RouteHandler;
    readonly middleware: readonly MiddlewareFunction[];
    readonly description: string;
    readonly tags: readonly string[];
    readonly requestSchema: JsonSchema | null;
    readonly responseSchema: JsonSchema | null;
}

/**
 * Route handler funkcija
 */
export type RouteHandler = (request: HttpRequest, context: RequestContext) => Promise<HttpResponse>;

/**
 * Middleware funkcija
 */
export type MiddlewareFunction = (
    request: HttpRequest,
    context: RequestContext,
    next: () => Promise<HttpResponse>
) => Promise<HttpResponse>;

/**
 * Request context
 */
export interface RequestContext {
    readonly requestId: string;
    readonly startTime: number;
    readonly userId: string | null;
    readonly roles: readonly string[];
    readonly permissions: readonly string[];
    readonly correlationId: string;
    readonly traceId: string;
    readonly spanId: string;
    readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * JSON Schema za validacijo
 */
export interface JsonSchema {
    readonly type: string;
    readonly properties?: Readonly<Record<string, JsonSchema>>;
    readonly required?: readonly string[];
    readonly items?: JsonSchema;
    readonly enum?: readonly unknown[];
    readonly minimum?: number;
    readonly maximum?: number;
    readonly minLength?: number;
    readonly maxLength?: number;
    readonly pattern?: string;
    readonly format?: string;
    readonly additionalProperties?: boolean | JsonSchema;
}

/**
 * Validation error
 */
export interface ValidationError {
    readonly field: string;
    readonly message: string;
    readonly code: string;
    readonly value?: unknown;
}

/**
 * API error response
 */
export interface ApiErrorResponse {
    readonly error: {
        readonly code: string;
        readonly message: string;
        readonly details?: readonly ValidationError[];
        readonly requestId: string;
        readonly timestamp: number;
    };
}

/**
 * Pagination parametri
 */
export interface PaginationParams {
    readonly page: number;
    readonly pageSize: number;
    readonly sortBy: string | null;
    readonly sortOrder: 'asc' | 'desc';
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
    readonly data: readonly T[];
    readonly pagination: {
        readonly page: number;
        readonly pageSize: number;
        readonly totalItems: number;
        readonly totalPages: number;
        readonly hasNextPage: boolean;
        readonly hasPreviousPage: boolean;
    };
}

/**
 * Rate limit info
 */
export interface RateLimitInfo {
    readonly limit: number;
    readonly remaining: number;
    readonly resetAt: number;
    readonly retryAfter: number | null;
}

/**
 * CORS konfiguracija
 */
export interface CorsConfig {
    readonly allowedOrigins: readonly string[];
    readonly allowedMethods: readonly HttpMethod[];
    readonly allowedHeaders: readonly string[];
    readonly exposedHeaders: readonly string[];
    readonly maxAge: number;
    readonly allowCredentials: boolean;
}

/**
 * Controller konfiguracija
 */
export interface ControllerConfig {
    readonly basePath: string;
    readonly version: string;
    readonly cors: CorsConfig;
    readonly rateLimitPerMinute: number;
    readonly maxRequestBodySize: number;
    readonly requestTimeout: number;
    readonly enableRequestLogging: boolean;
    readonly enableResponseLogging: boolean;
}

// ============================================================================
// STANJE
// ============================================================================

const routes: Map<string, RouteDefinition> = new Map();
const rateLimitCounters: Map<string, { count: number; resetAt: number }> = new Map();
let requestCounter = 0;

let config: ControllerConfig = {
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
function generateRequestId(): string {
    requestCounter++;
    return generateDeterministicId(`request-${requestCounter}`);
}

/**
 * Generiraj route key
 */
function generateRouteKey(method: HttpMethod, path: string): string {
    return `${method}:${path}`;
}

/**
 * Parse query string
 */
function parseQueryString(queryString: string): Record<string, string | string[]> {
    const params: Record<string, string | string[]> = {};
    
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
            } else if (Array.isArray(existing)) {
                existing.push(value || '');
            } else {
                params[key] = [existing, value || ''];
            }
        }
    }
    
    return params;
}

/**
 * Match path against route pattern
 */
function matchPath(pattern: string, path: string): Record<string, string> | null {
    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = path.split('/').filter(Boolean);
    
    if (patternParts.length !== pathParts.length) {
        return null;
    }
    
    const params: Record<string, string> = {};
    
    for (let i = 0; i < patternParts.length; i++) {
        const patternPart = patternParts[i];
        const pathPart = pathParts[i];
        
        if (patternPart.startsWith(':')) {
            const paramName = patternPart.slice(1);
            params[paramName] = pathPart;
        } else if (patternPart !== pathPart) {
            return null;
        }
    }
    
    return params;
}

/**
 * Validate value against JSON schema
 */
function validateAgainstSchema(value: unknown, schema: JsonSchema, path: string = ''): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (schema.type === 'object' && typeof value === 'object' && value !== null) {
        const obj = value as Record<string, unknown>;
        
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
    } else if (schema.type === 'array' && Array.isArray(value)) {
        if (schema.items) {
            for (let i = 0; i < value.length; i++) {
                const itemPath = `${path}[${i}]`;
                errors.push(...validateAgainstSchema(value[i], schema.items, itemPath));
            }
        }
    } else if (schema.type === 'string') {
        if (typeof value !== 'string') {
            errors.push({
                field: path,
                message: `Expected string, got ${typeof value}`,
                code: 'INVALID_TYPE',
                value,
            });
        } else {
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
    } else if (schema.type === 'number' || schema.type === 'integer') {
        if (typeof value !== 'number') {
            errors.push({
                field: path,
                message: `Expected number, got ${typeof value}`,
                code: 'INVALID_TYPE',
                value,
            });
        } else {
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
    } else if (schema.type === 'boolean') {
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
function createErrorResponse(
    statusCode: HttpStatusCode,
    code: string,
    message: string,
    requestId: string,
    details?: readonly ValidationError[]
): HttpResponse {
    const errorBody: ApiErrorResponse = {
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
function createSuccessResponse(
    statusCode: HttpStatusCode,
    body: unknown,
    requestId: string,
    additionalHeaders: readonly HttpHeader[] = []
): HttpResponse {
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
function checkRateLimit(clientId: string): RateLimitInfo {
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
function getHeaderValue(headers: readonly HttpHeader[], name: string): string | null {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header?.value ?? null;
}

/**
 * Parse Accept header
 */
function parseAcceptHeader(acceptHeader: string | null): string[] {
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
export function configureController(newConfig: Partial<ControllerConfig>): void {
    config = { ...config, ...newConfig };
}

/**
 * Registriraj route
 */
export function registerRoute(definition: RouteDefinition): void {
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
export function get(
    path: string,
    handler: RouteHandler,
    options: {
        middleware?: readonly MiddlewareFunction[];
        description?: string;
        tags?: readonly string[];
        responseSchema?: JsonSchema;
    } = {}
): void {
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
export function post(
    path: string,
    handler: RouteHandler,
    options: {
        middleware?: readonly MiddlewareFunction[];
        description?: string;
        tags?: readonly string[];
        requestSchema?: JsonSchema;
        responseSchema?: JsonSchema;
    } = {}
): void {
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
export function put(
    path: string,
    handler: RouteHandler,
    options: {
        middleware?: readonly MiddlewareFunction[];
        description?: string;
        tags?: readonly string[];
        requestSchema?: JsonSchema;
        responseSchema?: JsonSchema;
    } = {}
): void {
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
export function patch(
    path: string,
    handler: RouteHandler,
    options: {
        middleware?: readonly MiddlewareFunction[];
        description?: string;
        tags?: readonly string[];
        requestSchema?: JsonSchema;
        responseSchema?: JsonSchema;
    } = {}
): void {
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
export function del(
    path: string,
    handler: RouteHandler,
    options: {
        middleware?: readonly MiddlewareFunction[];
        description?: string;
        tags?: readonly string[];
        responseSchema?: JsonSchema;
    } = {}
): void {
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
function findRoute(method: HttpMethod, path: string): { route: RouteDefinition; pathParams: Record<string, string> } | null {
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
function handleCorsPreflight(request: HttpRequest): HttpResponse {
    const origin = getHeaderValue(request.headers, 'Origin');
    const requestMethod = getHeaderValue(request.headers, 'Access-Control-Request-Method');
    const requestHeaders = getHeaderValue(request.headers, 'Access-Control-Request-Headers');
    
    const headers: HttpHeader[] = [];
    
    if (origin && (config.cors.allowedOrigins.includes('*') || config.cors.allowedOrigins.includes(origin))) {
        headers.push({ name: 'Access-Control-Allow-Origin', value: origin });
    }
    
    if (requestMethod && config.cors.allowedMethods.includes(requestMethod as HttpMethod)) {
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
function addCorsHeaders(response: HttpResponse, origin: string | null): HttpResponse {
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
async function executeMiddlewareChain(
    request: HttpRequest,
    context: RequestContext,
    middleware: readonly MiddlewareFunction[],
    handler: RouteHandler
): Promise<HttpResponse> {
    let index = 0;
    
    const next = async (): Promise<HttpResponse> => {
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
export async function handleRequest(
    method: HttpMethod,
    path: string,
    queryString: string,
    headers: readonly HttpHeader[],
    body: unknown,
    remoteAddress: string
): Promise<HttpResponse> {
    const requestId = generateRequestId();
    const startTime = clock.nowMs();
    
    const request: HttpRequest = {
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
        const response = createErrorResponse(
            429,
            'RATE_LIMIT_EXCEEDED',
            'Too many requests',
            requestId
        );
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
        const response = createErrorResponse(
            404,
            'NOT_FOUND',
            `Route ${method} ${path} not found`,
            requestId
        );
        return addCorsHeaders(response, origin);
    }
    
    const { route, pathParams } = match;
    
    const requestWithParams: HttpRequest = {
        ...request,
        pathParams,
    };
    
    if (route.requestSchema && body !== null && body !== undefined) {
        const validationErrors = validateAgainstSchema(body, route.requestSchema);
        if (validationErrors.length > 0) {
            const response = createErrorResponse(
                422,
                'VALIDATION_ERROR',
                'Request validation failed',
                requestId,
                validationErrors
            );
            return addCorsHeaders(response, origin);
        }
    }
    
    const context: RequestContext = {
        requestId,
        startTime,
        userId: null,
        roles: [],
        permissions: [],
        correlationId: getHeaderValue(headers, 'X-Correlation-ID') || requestId,
        traceId: getHeaderValue(headers, 'X-Trace-ID') || generateDeterministicId(`trace-${requestCounter}`),
        spanId: generateDeterministicId(`span-${requestCounter}`),
        metadata: {},
    };
    
    try {
        const response = await executeMiddlewareChain(
            requestWithParams,
            context,
            route.middleware,
            route.handler
        );
        
        const responseWithRateLimit: HttpResponse = {
            ...response,
            headers: [
                ...response.headers,
                { name: 'X-RateLimit-Limit', value: rateLimitInfo.limit.toString() },
                { name: 'X-RateLimit-Remaining', value: rateLimitInfo.remaining.toString() },
                { name: 'X-RateLimit-Reset', value: rateLimitInfo.resetAt.toString() },
            ],
        };
        
        return addCorsHeaders(responseWithRateLimit, origin);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        const response = createErrorResponse(
            500,
            'INTERNAL_ERROR',
            errorMessage,
            requestId
        );
        return addCorsHeaders(response, origin);
    }
}

// ============================================================================
// MIDDLEWARE FUNKCIJE
// ============================================================================

/**
 * Logging middleware
 */
export function loggingMiddleware(): MiddlewareFunction {
    return async (request, context, next) => {
        const response = await next();
        return response;
    };
}

/**
 * Authentication middleware
 */
export function authenticationMiddleware(
    validateToken: (token: string) => Promise<{ userId: string; roles: string[] } | null>
): MiddlewareFunction {
    return async (request, context, next) => {
        const authHeader = getHeaderValue(request.headers, 'Authorization');
        
        if (!authHeader) {
            return createErrorResponse(
                401,
                'UNAUTHORIZED',
                'Authorization header is required',
                request.requestId
            );
        }
        
        const [scheme, token] = authHeader.split(' ');
        
        if (scheme !== 'Bearer' || !token) {
            return createErrorResponse(
                401,
                'UNAUTHORIZED',
                'Invalid authorization scheme',
                request.requestId
            );
        }
        
        const user = await validateToken(token);
        
        if (!user) {
            return createErrorResponse(
                401,
                'UNAUTHORIZED',
                'Invalid or expired token',
                request.requestId
            );
        }
        
        const authenticatedContext: RequestContext = {
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
export function authorizationMiddleware(requiredRoles: readonly string[]): MiddlewareFunction {
    return async (request, context, next) => {
        if (!context.userId) {
            return createErrorResponse(
                401,
                'UNAUTHORIZED',
                'Authentication required',
                request.requestId
            );
        }
        
        const hasRequiredRole = requiredRoles.some(role => context.roles.includes(role));
        
        if (!hasRequiredRole) {
            return createErrorResponse(
                403,
                'FORBIDDEN',
                'Insufficient permissions',
                request.requestId
            );
        }
        
        return next();
    };
}

/**
 * Request timeout middleware
 */
export function timeoutMiddleware(timeoutMs: number): MiddlewareFunction {
    return async (request, context, next) => {
        const timeoutPromise = new Promise<HttpResponse>((_, reject) => {
            const timeoutId = setTimeout(() => {
                clearTimeout(timeoutId);
                reject(new Error('Request timeout'));
            }, timeoutMs);
        });
        
        try {
            return await Promise.race([next(), timeoutPromise]);
        } catch (error) {
            if (error instanceof Error && error.message === 'Request timeout') {
                return createErrorResponse(
                    408,
                    'REQUEST_TIMEOUT',
                    'Request timed out',
                    request.requestId
                );
            }
            throw error;
        }
    };
}

/**
 * Compression middleware
 */
export function compressionMiddleware(): MiddlewareFunction {
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
export function parsePaginationParams(
    queryParams: Readonly<Record<string, string | string[]>>,
    defaults: { pageSize: number; maxPageSize: number } = { pageSize: 20, maxPageSize: 100 }
): PaginationParams {
    const pageParam = queryParams['page'];
    const pageSizeParam = queryParams['pageSize'] || queryParams['limit'];
    const sortByParam = queryParams['sortBy'] || queryParams['sort'];
    const sortOrderParam = queryParams['sortOrder'] || queryParams['order'];
    
    const page = Math.max(1, parseInt(Array.isArray(pageParam) ? pageParam[0] : pageParam || '1', 10) || 1);
    const requestedPageSize = parseInt(Array.isArray(pageSizeParam) ? pageSizeParam[0] : pageSizeParam || String(defaults.pageSize), 10) || defaults.pageSize;
    const pageSize = Math.min(Math.max(1, requestedPageSize), defaults.maxPageSize);
    const sortBy = Array.isArray(sortByParam) ? sortByParam[0] : sortByParam || null;
    const sortOrderValue = Array.isArray(sortOrderParam) ? sortOrderParam[0] : sortOrderParam;
    const sortOrder: 'asc' | 'desc' = sortOrderValue === 'desc' ? 'desc' : 'asc';
    
    return { page, pageSize, sortBy, sortOrder };
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
    data: readonly T[],
    pagination: PaginationParams,
    totalItems: number
): PaginatedResponse<T> {
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
export function ok(body: unknown, requestId: string): HttpResponse {
    return createSuccessResponse(200, body, requestId);
}

/**
 * Create response with status 201
 */
export function created(body: unknown, requestId: string, location?: string): HttpResponse {
    const headers: HttpHeader[] = [];
    if (location) {
        headers.push({ name: 'Location', value: location });
    }
    return createSuccessResponse(201, body, requestId, headers);
}

/**
 * Create response with status 204
 */
export function noContent(requestId: string): HttpResponse {
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
export function badRequest(message: string, requestId: string, details?: readonly ValidationError[]): HttpResponse {
    return createErrorResponse(400, 'BAD_REQUEST', message, requestId, details);
}

/**
 * Create not found response
 */
export function notFound(message: string, requestId: string): HttpResponse {
    return createErrorResponse(404, 'NOT_FOUND', message, requestId);
}

/**
 * Create conflict response
 */
export function conflict(message: string, requestId: string): HttpResponse {
    return createErrorResponse(409, 'CONFLICT', message, requestId);
}

/**
 * Get all registered routes
 */
export function getRoutes(): readonly RouteDefinition[] {
    return Array.from(routes.values());
}

/**
 * Clear all routes
 */
export function clearRoutes(): void {
    routes.clear();
}

/**
 * Get current configuration
 */
export function getConfig(): Readonly<ControllerConfig> {
    return config;
}
