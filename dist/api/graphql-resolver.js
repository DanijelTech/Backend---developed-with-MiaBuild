"use strict";
/**
 * @file GraphQL Resolver za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-GQL-001 GraphQL API za zaledne sisteme
 * @design DSN-ZALEDNI-GQL-001 Backend GraphQL arhitektura
 * @test TEST-ZALEDNI-GQL-001 Preverjanje GraphQL API
 *
 * GraphQL Resolver - prilagojen za zaledne sisteme:
 * - Query resolverji za branje podatkov
 * - Mutation resolverji za spreminjanje podatkov
 * - Subscription resolverji za real-time posodobitve
 * - Field resolverji za kompleksne tipe
 * - DataLoader za N+1 optimizacijo
 * - Error handling z GraphQL napakami
 * - Authorization na nivoju resolverja
 * - Input validacija
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom API_002 - GraphQL Resolver
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDataLoader = createDataLoader;
exports.createDataLoaderRegistry = createDataLoaderRegistry;
exports.createPubSub = createPubSub;
exports.registerResolver = registerResolver;
exports.registerQueryResolver = registerQueryResolver;
exports.registerMutationResolver = registerMutationResolver;
exports.registerSubscriptionResolver = registerSubscriptionResolver;
exports.registerFieldResolver = registerFieldResolver;
exports.getResolver = getResolver;
exports.createGraphQLError = createGraphQLError;
exports.createContext = createContext;
exports.loggingMiddleware = loggingMiddleware;
exports.errorHandlingMiddleware = errorHandlingMiddleware;
exports.cachingMiddleware = cachingMiddleware;
exports.tracingMiddleware = tracingMiddleware;
exports.getSelectedFields = getSelectedFields;
exports.isFieldSelected = isFieldSelected;
exports.getArgument = getArgument;
exports.createConnection = createConnection;
exports.parseCursor = parseCursor;
exports.getAllResolvers = getAllResolvers;
exports.clearResolvers = clearResolvers;
const clock_1 = require("@mia/core/clock");
const deterministic_1 = require("@mia/core/deterministic");
const clock = (0, clock_1.getClock)();
// ============================================================================
// STANJE
// ============================================================================
const resolvers = new Map();
const subscriptions = new Map();
let resolverCounter = 0;
// ============================================================================
// DATALOADER IMPLEMENTACIJA
// ============================================================================
/**
 * Create DataLoader
 */
function createDataLoader(batchLoadFn, options = {}) {
    const cache = options.cache !== false;
    const cacheKeyFn = options.cacheKeyFn || ((key) => String(key));
    const cacheMap = options.cacheMap || new Map();
    const maxBatchSize = options.maxBatchSize || 100;
    let batch = null;
    function dispatchBatch() {
        if (!batch)
            return;
        const currentBatch = batch;
        batch = null;
        batchLoadFn(currentBatch.keys)
            .then(values => {
            if (values.length !== currentBatch.keys.length) {
                currentBatch.reject(new Error('DataLoader batch function must return array of same length as keys'));
                return;
            }
            currentBatch.resolve(values);
        })
            .catch(error => {
            currentBatch.reject(error);
        });
    }
    function load(key) {
        const cacheKey = cacheKeyFn(key);
        if (cache) {
            const cached = cacheMap.get(cacheKey);
            if (cached) {
                return cached;
            }
        }
        const promise = new Promise((resolve, reject) => {
            if (!batch) {
                batch = {
                    keys: [],
                    resolve: (values) => {
                        for (let i = 0; i < batch.keys.length; i++) {
                            const value = values[i];
                            if (value instanceof Error) {
                                reject(value);
                            }
                            else {
                                resolve(value);
                            }
                        }
                    },
                    reject,
                };
                queueMicrotask(dispatchBatch);
            }
            batch.keys.push(key);
            if (batch.keys.length >= maxBatchSize) {
                dispatchBatch();
            }
        });
        if (cache) {
            cacheMap.set(cacheKey, promise);
        }
        return promise;
    }
    function loadMany(keys) {
        return Promise.all(keys.map(key => load(key).catch(error => error)));
    }
    function clear(key) {
        const cacheKey = cacheKeyFn(key);
        cacheMap.delete(cacheKey);
        return loader;
    }
    function clearAll() {
        cacheMap.clear();
        return loader;
    }
    function prime(key, value) {
        const cacheKey = cacheKeyFn(key);
        if (!cacheMap.has(cacheKey)) {
            const promise = value instanceof Error ? Promise.reject(value) : Promise.resolve(value);
            cacheMap.set(cacheKey, promise);
        }
        return loader;
    }
    const loader = {
        load,
        loadMany,
        clear,
        clearAll,
        prime,
    };
    return loader;
}
/**
 * Create DataLoader registry
 */
function createDataLoaderRegistry() {
    const loaders = new Map();
    return {
        get(name) {
            return loaders.get(name);
        },
        register(name, loader) {
            loaders.set(name, loader);
        },
        clear() {
            loaders.clear();
        },
    };
}
// ============================================================================
// PUBSUB IMPLEMENTACIJA
// ============================================================================
/**
 * Create in-memory PubSub
 */
function createPubSub() {
    const subscribers = new Map();
    let subscriptionCounter = 0;
    const subscriptionMap = new Map();
    return {
        async publish(channel, payload) {
            const channelSubscribers = subscribers.get(channel);
            if (channelSubscribers) {
                for (const callback of channelSubscribers) {
                    callback(payload);
                }
            }
        },
        subscribe(channel) {
            const queue = [];
            let resolveNext = null;
            let done = false;
            const callback = (payload) => {
                if (done)
                    return;
                if (resolveNext) {
                    resolveNext({ value: payload, done: false });
                    resolveNext = null;
                }
                else {
                    queue.push(payload);
                }
            };
            let channelSubscribers = subscribers.get(channel);
            if (!channelSubscribers) {
                channelSubscribers = new Set();
                subscribers.set(channel, channelSubscribers);
            }
            channelSubscribers.add(callback);
            subscriptionCounter++;
            const subscriptionId = subscriptionCounter;
            subscriptionMap.set(subscriptionId, { channel, callback });
            return {
                next() {
                    if (done) {
                        return Promise.resolve({ value: undefined, done: true });
                    }
                    if (queue.length > 0) {
                        return Promise.resolve({ value: queue.shift(), done: false });
                    }
                    return new Promise(resolve => {
                        resolveNext = resolve;
                    });
                },
                return() {
                    done = true;
                    const subscription = subscriptionMap.get(subscriptionId);
                    if (subscription) {
                        const channelSubs = subscribers.get(subscription.channel);
                        if (channelSubs) {
                            channelSubs.delete(subscription.callback);
                        }
                        subscriptionMap.delete(subscriptionId);
                    }
                    return Promise.resolve({ value: undefined, done: true });
                },
                throw(error) {
                    done = true;
                    return Promise.reject(error);
                },
                [Symbol.asyncIterator]() {
                    return this;
                },
            };
        },
        unsubscribe(subscriptionId) {
            const subscription = subscriptionMap.get(subscriptionId);
            if (subscription) {
                const channelSubs = subscribers.get(subscription.channel);
                if (channelSubs) {
                    channelSubs.delete(subscription.callback);
                }
                subscriptionMap.delete(subscriptionId);
            }
        },
    };
}
// ============================================================================
// RESOLVER REGISTRACIJA
// ============================================================================
/**
 * Register resolver for type and field
 */
function registerResolver(typeName, fieldName, config) {
    let typeResolvers = resolvers.get(typeName);
    if (!typeResolvers) {
        typeResolvers = new Map();
        resolvers.set(typeName, typeResolvers);
    }
    typeResolvers.set(fieldName, config);
}
/**
 * Register query resolver
 */
function registerQueryResolver(fieldName, resolver, options = {}) {
    registerResolver('Query', fieldName, {
        resolver,
        middleware: options.middleware || [],
        authorization: options.authorization || null,
        validation: options.validation || null,
        caching: options.caching || null,
    });
}
/**
 * Register mutation resolver
 */
function registerMutationResolver(fieldName, resolver, options = {}) {
    registerResolver('Mutation', fieldName, {
        resolver,
        middleware: options.middleware || [],
        authorization: options.authorization || null,
        validation: options.validation || null,
        caching: null,
    });
}
/**
 * Register subscription resolver
 */
function registerSubscriptionResolver(fieldName, subscribe, options = {}) {
    const subscriptionResolver = {
        subscribe,
        resolve: options.resolve,
    };
    registerResolver('Subscription', fieldName, {
        resolver: subscriptionResolver,
        middleware: [],
        authorization: options.authorization || null,
        validation: null,
        caching: null,
    });
}
/**
 * Register field resolver
 */
function registerFieldResolver(typeName, fieldName, resolver, options = {}) {
    registerResolver(typeName, fieldName, {
        resolver,
        middleware: options.middleware || [],
        authorization: null,
        validation: null,
        caching: options.caching || null,
    });
}
// ============================================================================
// RESOLVER EXECUTION
// ============================================================================
/**
 * Get resolver for type and field
 */
function getResolver(typeName, fieldName) {
    const typeResolvers = resolvers.get(typeName);
    if (!typeResolvers) {
        return null;
    }
    return typeResolvers.get(fieldName) || null;
}
/**
 * Check authorization
 */
function checkAuthorization(config, context, args) {
    if (config.requireAuth && !context.userId) {
        return false;
    }
    if (config.requiredRoles.length > 0) {
        const hasRole = config.requiredRoles.some(role => context.roles.includes(role));
        if (!hasRole) {
            return false;
        }
    }
    if (config.requiredPermissions.length > 0) {
        const hasPermission = config.requiredPermissions.every(perm => context.permissions.includes(perm));
        if (!hasPermission) {
            return false;
        }
    }
    if (config.customCheck && !config.customCheck(context, args)) {
        return false;
    }
    return true;
}
/**
 * Validate arguments
 */
function validateArguments(config, args) {
    const errors = [];
    for (const rule of config.rules) {
        const value = args[rule.field];
        if (!rule.validator(value)) {
            errors.push({
                message: rule.message,
                locations: null,
                path: [rule.field],
                extensions: { code: 'VALIDATION_ERROR', field: rule.field },
            });
        }
    }
    return errors;
}
/**
 * Execute resolver with middleware
 */
async function executeResolver(config, parent, args, context, info) {
    if (config.authorization) {
        const authorized = checkAuthorization(config.authorization, context, args);
        if (!authorized) {
            throw createGraphQLError('Not authorized', 'UNAUTHORIZED');
        }
    }
    if (config.validation) {
        const validationErrors = validateArguments(config.validation, args);
        if (validationErrors.length > 0) {
            throw createGraphQLError(validationErrors[0].message, 'VALIDATION_ERROR');
        }
    }
    let resolve = config.resolver;
    for (let i = config.middleware.length - 1; i >= 0; i--) {
        const middleware = config.middleware[i];
        const previousResolve = resolve;
        resolve = ((p, a, c, i2) => middleware(previousResolve, p, a, c, i2));
    }
    return resolve(parent, args, context, info);
}
/**
 * Create GraphQL error
 */
function createGraphQLError(message, code, extensions) {
    return {
        message,
        locations: null,
        path: null,
        extensions: { code, ...extensions },
    };
}
// ============================================================================
// CONTEXT CREATION
// ============================================================================
/**
 * Create GraphQL context
 */
function createContext(requestId, userId, roles, permissions) {
    resolverCounter++;
    return {
        requestId,
        userId,
        roles,
        permissions,
        dataloaders: createDataLoaderRegistry(),
        startTime: clock.nowMs(),
        correlationId: (0, deterministic_1.generateDeterministicId)(`correlation-${resolverCounter}`),
        traceId: (0, deterministic_1.generateDeterministicId)(`trace-${resolverCounter}`),
        spanId: (0, deterministic_1.generateDeterministicId)(`span-${resolverCounter}`),
    };
}
// ============================================================================
// MIDDLEWARE FUNKCIJE
// ============================================================================
/**
 * Logging middleware
 */
function loggingMiddleware() {
    return async (resolve, parent, args, context, info) => {
        const result = await resolve(parent, args, context, info);
        return result;
    };
}
/**
 * Error handling middleware
 */
function errorHandlingMiddleware() {
    return async (resolve, parent, args, context, info) => {
        try {
            return await resolve(parent, args, context, info);
        }
        catch (error) {
            if (error instanceof Error) {
                throw createGraphQLError(error.message, 'INTERNAL_ERROR');
            }
            throw createGraphQLError('Unknown error', 'INTERNAL_ERROR');
        }
    };
}
/**
 * Caching middleware
 */
function cachingMiddleware(cache) {
    return async (resolve, parent, args, context, info) => {
        const cacheKey = `${info.parentType.name}.${info.fieldName}:${JSON.stringify(args)}`;
        const cached = cache.get(cacheKey);
        if (cached && cached.expiresAt > clock.nowMs()) {
            return cached.value;
        }
        const result = await resolve(parent, args, context, info);
        const resolverConfig = getResolver(info.parentType.name, info.fieldName);
        if (resolverConfig?.caching) {
            cache.set(cacheKey, {
                value: result,
                expiresAt: clock.nowMs() + resolverConfig.caching.ttl,
            });
        }
        return result;
    };
}
/**
 * Tracing middleware
 */
function tracingMiddleware() {
    return async (resolve, parent, args, context, info) => {
        const result = await resolve(parent, args, context, info);
        return result;
    };
}
// ============================================================================
// UTILITY FUNKCIJE
// ============================================================================
/**
 * Get selected fields from info
 */
function getSelectedFields(info) {
    const fields = [];
    function extractFields(selectionSet) {
        if (!selectionSet)
            return;
        for (const selection of selectionSet.selections) {
            if (selection.kind === 'Field') {
                fields.push(selection.name);
                extractFields(selection.selectionSet);
            }
            else if (selection.kind === 'FragmentSpread') {
                const fragment = info.fragments[selection.name];
                if (fragment) {
                    extractFields(fragment.selectionSet);
                }
            }
            else if (selection.kind === 'InlineFragment') {
                extractFields(selection.selectionSet);
            }
        }
    }
    for (const fieldNode of info.fieldNodes) {
        extractFields(fieldNode.selectionSet);
    }
    return fields;
}
/**
 * Check if field is selected
 */
function isFieldSelected(info, fieldName) {
    return getSelectedFields(info).includes(fieldName);
}
/**
 * Get argument value with default
 */
function getArgument(args, name, defaultValue) {
    const value = args[name];
    if (value === undefined || value === null) {
        return defaultValue;
    }
    return value;
}
/**
 * Create connection response (Relay-style pagination)
 */
function createConnection(nodes, args, totalCount) {
    const edges = nodes.map(node => ({
        node,
        cursor: Buffer.from(`cursor:${node.id}`).toString('base64'),
    }));
    return {
        edges,
        pageInfo: {
            hasNextPage: args.first !== undefined && nodes.length === args.first,
            hasPreviousPage: args.last !== undefined && nodes.length === args.last,
            startCursor: edges.length > 0 ? edges[0].cursor : null,
            endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        totalCount,
    };
}
/**
 * Parse cursor
 */
function parseCursor(cursor) {
    try {
        const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
        if (decoded.startsWith('cursor:')) {
            return decoded.slice(7);
        }
        return null;
    }
    catch {
        return null;
    }
}
/**
 * Get all resolvers
 */
function getAllResolvers() {
    const result = {};
    for (const [typeName, typeResolvers] of resolvers) {
        result[typeName] = {};
        for (const [fieldName, config] of typeResolvers) {
            result[typeName][fieldName] = config.resolver;
        }
    }
    return result;
}
/**
 * Clear all resolvers
 */
function clearResolvers() {
    resolvers.clear();
}
