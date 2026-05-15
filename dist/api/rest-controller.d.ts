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
/**
 * HTTP metoda
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
/**
 * HTTP status koda
 */
export type HttpStatusCode = 200 | 201 | 202 | 204 | 301 | 302 | 304 | 400 | 401 | 403 | 404 | 405 | 406 | 408 | 409 | 410 | 413 | 415 | 422 | 429 | 500 | 501 | 502 | 503 | 504;
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
export type MiddlewareFunction = (request: HttpRequest, context: RequestContext, next: () => Promise<HttpResponse>) => Promise<HttpResponse>;
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
/**
 * Nastavi konfiguracijo controllerja
 */
export declare function configureController(newConfig: Partial<ControllerConfig>): void;
/**
 * Registriraj route
 */
export declare function registerRoute(definition: RouteDefinition): void;
/**
 * Registriraj GET route
 */
export declare function get(path: string, handler: RouteHandler, options?: {
    middleware?: readonly MiddlewareFunction[];
    description?: string;
    tags?: readonly string[];
    responseSchema?: JsonSchema;
}): void;
/**
 * Registriraj POST route
 */
export declare function post(path: string, handler: RouteHandler, options?: {
    middleware?: readonly MiddlewareFunction[];
    description?: string;
    tags?: readonly string[];
    requestSchema?: JsonSchema;
    responseSchema?: JsonSchema;
}): void;
/**
 * Registriraj PUT route
 */
export declare function put(path: string, handler: RouteHandler, options?: {
    middleware?: readonly MiddlewareFunction[];
    description?: string;
    tags?: readonly string[];
    requestSchema?: JsonSchema;
    responseSchema?: JsonSchema;
}): void;
/**
 * Registriraj PATCH route
 */
export declare function patch(path: string, handler: RouteHandler, options?: {
    middleware?: readonly MiddlewareFunction[];
    description?: string;
    tags?: readonly string[];
    requestSchema?: JsonSchema;
    responseSchema?: JsonSchema;
}): void;
/**
 * Registriraj DELETE route
 */
export declare function del(path: string, handler: RouteHandler, options?: {
    middleware?: readonly MiddlewareFunction[];
    description?: string;
    tags?: readonly string[];
    responseSchema?: JsonSchema;
}): void;
/**
 * Handle incoming request
 */
export declare function handleRequest(method: HttpMethod, path: string, queryString: string, headers: readonly HttpHeader[], body: unknown, remoteAddress: string): Promise<HttpResponse>;
/**
 * Logging middleware
 */
export declare function loggingMiddleware(): MiddlewareFunction;
/**
 * Authentication middleware
 */
export declare function authenticationMiddleware(validateToken: (token: string) => Promise<{
    userId: string;
    roles: string[];
} | null>): MiddlewareFunction;
/**
 * Authorization middleware
 */
export declare function authorizationMiddleware(requiredRoles: readonly string[]): MiddlewareFunction;
/**
 * Request timeout middleware
 */
export declare function timeoutMiddleware(timeoutMs: number): MiddlewareFunction;
/**
 * Compression middleware
 */
export declare function compressionMiddleware(): MiddlewareFunction;
/**
 * Parse pagination params from query
 */
export declare function parsePaginationParams(queryParams: Readonly<Record<string, string | string[]>>, defaults?: {
    pageSize: number;
    maxPageSize: number;
}): PaginationParams;
/**
 * Create paginated response
 */
export declare function createPaginatedResponse<T>(data: readonly T[], pagination: PaginationParams, totalItems: number): PaginatedResponse<T>;
/**
 * Create response with status 200
 */
export declare function ok(body: unknown, requestId: string): HttpResponse;
/**
 * Create response with status 201
 */
export declare function created(body: unknown, requestId: string, location?: string): HttpResponse;
/**
 * Create response with status 204
 */
export declare function noContent(requestId: string): HttpResponse;
/**
 * Create bad request response
 */
export declare function badRequest(message: string, requestId: string, details?: readonly ValidationError[]): HttpResponse;
/**
 * Create not found response
 */
export declare function notFound(message: string, requestId: string): HttpResponse;
/**
 * Create conflict response
 */
export declare function conflict(message: string, requestId: string): HttpResponse;
/**
 * Get all registered routes
 */
export declare function getRoutes(): readonly RouteDefinition[];
/**
 * Clear all routes
 */
export declare function clearRoutes(): void;
/**
 * Get current configuration
 */
export declare function getConfig(): Readonly<ControllerConfig>;
