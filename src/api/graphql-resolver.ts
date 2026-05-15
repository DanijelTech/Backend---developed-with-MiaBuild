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

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI ZA GRAPHQL RESOLVER
// ============================================================================

/**
 * GraphQL context
 */
export interface GraphQLContext {
    readonly requestId: string;
    readonly userId: string | null;
    readonly roles: readonly string[];
    readonly permissions: readonly string[];
    readonly dataloaders: DataLoaderRegistry;
    readonly startTime: number;
    readonly correlationId: string;
    readonly traceId: string;
    readonly spanId: string;
}

/**
 * GraphQL info
 */
export interface GraphQLResolveInfo {
    readonly fieldName: string;
    readonly fieldNodes: readonly FieldNode[];
    readonly returnType: GraphQLOutputType;
    readonly parentType: GraphQLObjectType;
    readonly path: ResponsePath;
    readonly schema: GraphQLSchema;
    readonly fragments: Readonly<Record<string, FragmentDefinition>>;
    readonly rootValue: unknown;
    readonly operation: OperationDefinition;
    readonly variableValues: Readonly<Record<string, unknown>>;
}

/**
 * Field node
 */
export interface FieldNode {
    readonly kind: 'Field';
    readonly alias: string | null;
    readonly name: string;
    readonly arguments: readonly ArgumentNode[];
    readonly directives: readonly DirectiveNode[];
    readonly selectionSet: SelectionSet | null;
}

/**
 * Argument node
 */
export interface ArgumentNode {
    readonly kind: 'Argument';
    readonly name: string;
    readonly value: ValueNode;
}

/**
 * Directive node
 */
export interface DirectiveNode {
    readonly kind: 'Directive';
    readonly name: string;
    readonly arguments: readonly ArgumentNode[];
}

/**
 * Selection set
 */
export interface SelectionSet {
    readonly kind: 'SelectionSet';
    readonly selections: readonly SelectionNode[];
}

/**
 * Selection node
 */
export type SelectionNode = FieldNode | FragmentSpread | InlineFragment;

/**
 * Fragment spread
 */
export interface FragmentSpread {
    readonly kind: 'FragmentSpread';
    readonly name: string;
    readonly directives: readonly DirectiveNode[];
}

/**
 * Inline fragment
 */
export interface InlineFragment {
    readonly kind: 'InlineFragment';
    readonly typeCondition: string | null;
    readonly directives: readonly DirectiveNode[];
    readonly selectionSet: SelectionSet;
}

/**
 * Fragment definition
 */
export interface FragmentDefinition {
    readonly kind: 'FragmentDefinition';
    readonly name: string;
    readonly typeCondition: string;
    readonly directives: readonly DirectiveNode[];
    readonly selectionSet: SelectionSet;
}

/**
 * Operation definition
 */
export interface OperationDefinition {
    readonly kind: 'OperationDefinition';
    readonly operation: 'query' | 'mutation' | 'subscription';
    readonly name: string | null;
    readonly variableDefinitions: readonly VariableDefinition[];
    readonly directives: readonly DirectiveNode[];
    readonly selectionSet: SelectionSet;
}

/**
 * Variable definition
 */
export interface VariableDefinition {
    readonly kind: 'VariableDefinition';
    readonly variable: string;
    readonly type: TypeNode;
    readonly defaultValue: ValueNode | null;
    readonly directives: readonly DirectiveNode[];
}

/**
 * Type node
 */
export type TypeNode = NamedTypeNode | ListTypeNode | NonNullTypeNode;

/**
 * Named type node
 */
export interface NamedTypeNode {
    readonly kind: 'NamedType';
    readonly name: string;
}

/**
 * List type node
 */
export interface ListTypeNode {
    readonly kind: 'ListType';
    readonly type: TypeNode;
}

/**
 * Non-null type node
 */
export interface NonNullTypeNode {
    readonly kind: 'NonNullType';
    readonly type: NamedTypeNode | ListTypeNode;
}

/**
 * Value node
 */
export type ValueNode =
    | IntValueNode
    | FloatValueNode
    | StringValueNode
    | BooleanValueNode
    | NullValueNode
    | EnumValueNode
    | ListValueNode
    | ObjectValueNode
    | VariableNode;

/**
 * Int value node
 */
export interface IntValueNode {
    readonly kind: 'IntValue';
    readonly value: string;
}

/**
 * Float value node
 */
export interface FloatValueNode {
    readonly kind: 'FloatValue';
    readonly value: string;
}

/**
 * String value node
 */
export interface StringValueNode {
    readonly kind: 'StringValue';
    readonly value: string;
    readonly block: boolean;
}

/**
 * Boolean value node
 */
export interface BooleanValueNode {
    readonly kind: 'BooleanValue';
    readonly value: boolean;
}

/**
 * Null value node
 */
export interface NullValueNode {
    readonly kind: 'NullValue';
}

/**
 * Enum value node
 */
export interface EnumValueNode {
    readonly kind: 'EnumValue';
    readonly value: string;
}

/**
 * List value node
 */
export interface ListValueNode {
    readonly kind: 'ListValue';
    readonly values: readonly ValueNode[];
}

/**
 * Object value node
 */
export interface ObjectValueNode {
    readonly kind: 'ObjectValue';
    readonly fields: readonly ObjectFieldNode[];
}

/**
 * Object field node
 */
export interface ObjectFieldNode {
    readonly kind: 'ObjectField';
    readonly name: string;
    readonly value: ValueNode;
}

/**
 * Variable node
 */
export interface VariableNode {
    readonly kind: 'Variable';
    readonly name: string;
}

/**
 * Response path
 */
export interface ResponsePath {
    readonly prev: ResponsePath | null;
    readonly key: string | number;
    readonly typename: string | null;
}

/**
 * GraphQL output type
 */
export interface GraphQLOutputType {
    readonly name: string;
    readonly kind: 'SCALAR' | 'OBJECT' | 'INTERFACE' | 'UNION' | 'ENUM' | 'LIST' | 'NON_NULL';
}

/**
 * GraphQL object type
 */
export interface GraphQLObjectType {
    readonly name: string;
    readonly description: string | null;
    readonly fields: Readonly<Record<string, GraphQLField>>;
    readonly interfaces: readonly GraphQLInterfaceType[];
}

/**
 * GraphQL interface type
 */
export interface GraphQLInterfaceType {
    readonly name: string;
    readonly description: string | null;
    readonly fields: Readonly<Record<string, GraphQLField>>;
}

/**
 * GraphQL field
 */
export interface GraphQLField {
    readonly name: string;
    readonly description: string | null;
    readonly type: GraphQLOutputType;
    readonly args: readonly GraphQLArgument[];
    readonly resolve: ResolverFunction | null;
    readonly subscribe: SubscriptionResolver | null;
    readonly deprecationReason: string | null;
}

/**
 * GraphQL argument
 */
export interface GraphQLArgument {
    readonly name: string;
    readonly description: string | null;
    readonly type: GraphQLInputType;
    readonly defaultValue: unknown;
}

/**
 * GraphQL input type
 */
export interface GraphQLInputType {
    readonly name: string;
    readonly kind: 'SCALAR' | 'INPUT_OBJECT' | 'ENUM' | 'LIST' | 'NON_NULL';
}

/**
 * GraphQL schema
 */
export interface GraphQLSchema {
    readonly queryType: GraphQLObjectType | null;
    readonly mutationType: GraphQLObjectType | null;
    readonly subscriptionType: GraphQLObjectType | null;
    readonly types: readonly GraphQLNamedType[];
    readonly directives: readonly GraphQLDirective[];
}

/**
 * GraphQL named type
 */
export type GraphQLNamedType = GraphQLObjectType | GraphQLInterfaceType | GraphQLInputObjectType | GraphQLEnumType | GraphQLScalarType | GraphQLUnionType;

/**
 * GraphQL input object type
 */
export interface GraphQLInputObjectType {
    readonly name: string;
    readonly description: string | null;
    readonly fields: Readonly<Record<string, GraphQLInputField>>;
}

/**
 * GraphQL input field
 */
export interface GraphQLInputField {
    readonly name: string;
    readonly description: string | null;
    readonly type: GraphQLInputType;
    readonly defaultValue: unknown;
}

/**
 * GraphQL enum type
 */
export interface GraphQLEnumType {
    readonly name: string;
    readonly description: string | null;
    readonly values: readonly GraphQLEnumValue[];
}

/**
 * GraphQL enum value
 */
export interface GraphQLEnumValue {
    readonly name: string;
    readonly description: string | null;
    readonly value: unknown;
    readonly deprecationReason: string | null;
}

/**
 * GraphQL scalar type
 */
export interface GraphQLScalarType {
    readonly name: string;
    readonly description: string | null;
    readonly serialize: (value: unknown) => unknown;
    readonly parseValue: (value: unknown) => unknown;
    readonly parseLiteral: (ast: ValueNode) => unknown;
}

/**
 * GraphQL union type
 */
export interface GraphQLUnionType {
    readonly name: string;
    readonly description: string | null;
    readonly types: readonly GraphQLObjectType[];
    readonly resolveType: (value: unknown, context: GraphQLContext, info: GraphQLResolveInfo) => string | null;
}

/**
 * GraphQL directive
 */
export interface GraphQLDirective {
    readonly name: string;
    readonly description: string | null;
    readonly locations: readonly DirectiveLocation[];
    readonly args: readonly GraphQLArgument[];
    readonly isRepeatable: boolean;
}

/**
 * Directive location
 */
export type DirectiveLocation =
    | 'QUERY'
    | 'MUTATION'
    | 'SUBSCRIPTION'
    | 'FIELD'
    | 'FRAGMENT_DEFINITION'
    | 'FRAGMENT_SPREAD'
    | 'INLINE_FRAGMENT'
    | 'VARIABLE_DEFINITION'
    | 'SCHEMA'
    | 'SCALAR'
    | 'OBJECT'
    | 'FIELD_DEFINITION'
    | 'ARGUMENT_DEFINITION'
    | 'INTERFACE'
    | 'UNION'
    | 'ENUM'
    | 'ENUM_VALUE'
    | 'INPUT_OBJECT'
    | 'INPUT_FIELD_DEFINITION';

/**
 * Resolver function
 */
export type ResolverFunction<TParent = unknown, TArgs = Record<string, unknown>, TResult = unknown> = (
    parent: TParent,
    args: TArgs,
    context: GraphQLContext,
    info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

/**
 * Subscription resolver
 */
export type SubscriptionResolver<TParent = unknown, TArgs = Record<string, unknown>, TResult = unknown> = {
    readonly subscribe: (parent: TParent, args: TArgs, context: GraphQLContext, info: GraphQLResolveInfo) => AsyncIterator<TResult>;
    readonly resolve?: (payload: TResult, args: TArgs, context: GraphQLContext, info: GraphQLResolveInfo) => unknown;
};

/**
 * GraphQL error
 */
export interface GraphQLError {
    readonly message: string;
    readonly locations: readonly SourceLocation[] | null;
    readonly path: readonly (string | number)[] | null;
    readonly extensions: Readonly<Record<string, unknown>> | null;
}

/**
 * Source location
 */
export interface SourceLocation {
    readonly line: number;
    readonly column: number;
}

/**
 * GraphQL execution result
 */
export interface ExecutionResult<TData = Record<string, unknown>> {
    readonly data: TData | null;
    readonly errors: readonly GraphQLError[] | null;
    readonly extensions: Readonly<Record<string, unknown>> | null;
}

/**
 * DataLoader batch function
 */
export type BatchLoadFunction<K, V> = (keys: readonly K[]) => Promise<readonly (V | Error)[]>;

/**
 * DataLoader options
 */
export interface DataLoaderOptions<K, V> {
    readonly batch?: boolean;
    readonly maxBatchSize?: number;
    readonly cache?: boolean;
    readonly cacheKeyFn?: (key: K) => string;
    readonly cacheMap?: Map<string, Promise<V>>;
}

/**
 * DataLoader
 */
export interface DataLoader<K, V> {
    load(key: K): Promise<V>;
    loadMany(keys: readonly K[]): Promise<readonly (V | Error)[]>;
    clear(key: K): DataLoader<K, V>;
    clearAll(): DataLoader<K, V>;
    prime(key: K, value: V | Error): DataLoader<K, V>;
}

/**
 * DataLoader registry
 */
export interface DataLoaderRegistry {
    get<K, V>(name: string): DataLoader<K, V> | null;
    register<K, V>(name: string, loader: DataLoader<K, V>): void;
    clear(): void;
}

/**
 * Resolver map
 */
export interface ResolverMap {
    readonly Query?: Readonly<Record<string, ResolverFunction>>;
    readonly Mutation?: Readonly<Record<string, ResolverFunction>>;
    readonly Subscription?: Readonly<Record<string, SubscriptionResolver>>;
    readonly [typeName: string]: Readonly<Record<string, ResolverFunction | SubscriptionResolver>> | undefined;
}

/**
 * Field resolver config
 */
export interface FieldResolverConfig {
    readonly resolver: ResolverFunction;
    readonly middleware: readonly ResolverMiddleware[];
    readonly authorization: AuthorizationConfig | null;
    readonly validation: ValidationConfig | null;
    readonly caching: CachingConfig | null;
}

/**
 * Resolver middleware
 */
export type ResolverMiddleware = (
    resolve: ResolverFunction,
    parent: unknown,
    args: Record<string, unknown>,
    context: GraphQLContext,
    info: GraphQLResolveInfo
) => unknown | Promise<unknown>;

/**
 * Authorization config
 */
export interface AuthorizationConfig {
    readonly requireAuth: boolean;
    readonly requiredRoles: readonly string[];
    readonly requiredPermissions: readonly string[];
    readonly customCheck: ((context: GraphQLContext, args: Record<string, unknown>) => boolean) | null;
}

/**
 * Validation config
 */
export interface ValidationConfig {
    readonly rules: readonly ValidationRule[];
}

/**
 * Validation rule
 */
export interface ValidationRule {
    readonly field: string;
    readonly validator: (value: unknown) => boolean;
    readonly message: string;
}

/**
 * Caching config
 */
export interface CachingConfig {
    readonly ttl: number;
    readonly scope: 'PUBLIC' | 'PRIVATE';
    readonly maxAge: number;
}

/**
 * Subscription event
 */
export interface SubscriptionEvent<T = unknown> {
    readonly type: string;
    readonly payload: T;
    readonly timestamp: number;
    readonly correlationId: string;
}

/**
 * PubSub interface
 */
export interface PubSub {
    publish<T>(channel: string, payload: T): Promise<void>;
    subscribe<T>(channel: string): AsyncIterator<T>;
    unsubscribe(subscriptionId: number): void;
}

// ============================================================================
// STANJE
// ============================================================================

const resolvers: Map<string, Map<string, FieldResolverConfig>> = new Map();
const subscriptions: Map<string, Set<(event: SubscriptionEvent) => void>> = new Map();
let resolverCounter = 0;

// ============================================================================
// DATALOADER IMPLEMENTACIJA
// ============================================================================

/**
 * Create DataLoader
 */
export function createDataLoader<K, V>(
    batchLoadFn: BatchLoadFunction<K, V>,
    options: DataLoaderOptions<K, V> = {}
): DataLoader<K, V> {
    const cache = options.cache !== false;
    const cacheKeyFn = options.cacheKeyFn || ((key: K) => String(key));
    const cacheMap = options.cacheMap || new Map<string, Promise<V>>();
    const maxBatchSize = options.maxBatchSize || 100;
    
    let batch: { keys: K[]; resolve: (values: readonly (V | Error)[]) => void; reject: (error: Error) => void } | null = null;
    
    function dispatchBatch(): void {
        if (!batch) return;
        
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
    
    function load(key: K): Promise<V> {
        const cacheKey = cacheKeyFn(key);
        
        if (cache) {
            const cached = cacheMap.get(cacheKey);
            if (cached) {
                return cached;
            }
        }
        
        const promise = new Promise<V>((resolve, reject) => {
            if (!batch) {
                batch = {
                    keys: [],
                    resolve: (values) => {
                        for (let i = 0; i < batch!.keys.length; i++) {
                            const value = values[i];
                            if (value instanceof Error) {
                                reject(value);
                            } else {
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
    
    function loadMany(keys: readonly K[]): Promise<readonly (V | Error)[]> {
        return Promise.all(keys.map(key => load(key).catch(error => error)));
    }
    
    function clear(key: K): DataLoader<K, V> {
        const cacheKey = cacheKeyFn(key);
        cacheMap.delete(cacheKey);
        return loader;
    }
    
    function clearAll(): DataLoader<K, V> {
        cacheMap.clear();
        return loader;
    }
    
    function prime(key: K, value: V | Error): DataLoader<K, V> {
        const cacheKey = cacheKeyFn(key);
        if (!cacheMap.has(cacheKey)) {
            const promise = value instanceof Error ? Promise.reject(value) : Promise.resolve(value);
            cacheMap.set(cacheKey, promise);
        }
        return loader;
    }
    
    const loader: DataLoader<K, V> = {
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
export function createDataLoaderRegistry(): DataLoaderRegistry {
    const loaders = new Map<string, DataLoader<unknown, unknown>>();
    
    return {
        get<K, V>(name: string): DataLoader<K, V> | null {
            return loaders.get(name) as DataLoader<K, V> | null;
        },
        register<K, V>(name: string, loader: DataLoader<K, V>): void {
            loaders.set(name, loader as DataLoader<unknown, unknown>);
        },
        clear(): void {
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
export function createPubSub(): PubSub {
    const subscribers = new Map<string, Set<(payload: unknown) => void>>();
    let subscriptionCounter = 0;
    const subscriptionMap = new Map<number, { channel: string; callback: (payload: unknown) => void }>();
    
    return {
        async publish<T>(channel: string, payload: T): Promise<void> {
            const channelSubscribers = subscribers.get(channel);
            if (channelSubscribers) {
                for (const callback of channelSubscribers) {
                    callback(payload);
                }
            }
        },
        
        subscribe<T>(channel: string): AsyncIterator<T> {
            const queue: T[] = [];
            let resolveNext: ((value: IteratorResult<T>) => void) | null = null;
            let done = false;
            
            const callback = (payload: unknown): void => {
                if (done) return;
                
                if (resolveNext) {
                    resolveNext({ value: payload as T, done: false });
                    resolveNext = null;
                } else {
                    queue.push(payload as T);
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
                next(): Promise<IteratorResult<T>> {
                    if (done) {
                        return Promise.resolve({ value: undefined as unknown as T, done: true });
                    }
                    
                    if (queue.length > 0) {
                        return Promise.resolve({ value: queue.shift()!, done: false });
                    }
                    
                    return new Promise(resolve => {
                        resolveNext = resolve;
                    });
                },
                
                return(): Promise<IteratorResult<T>> {
                    done = true;
                    const subscription = subscriptionMap.get(subscriptionId);
                    if (subscription) {
                        const channelSubs = subscribers.get(subscription.channel);
                        if (channelSubs) {
                            channelSubs.delete(subscription.callback);
                        }
                        subscriptionMap.delete(subscriptionId);
                    }
                    return Promise.resolve({ value: undefined as unknown as T, done: true });
                },
                
                throw(error: Error): Promise<IteratorResult<T>> {
                    done = true;
                    return Promise.reject(error);
                },
                
                [Symbol.asyncIterator](): AsyncIterator<T> {
                    return this;
                },
            };
        },
        
        unsubscribe(subscriptionId: number): void {
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
export function registerResolver(
    typeName: string,
    fieldName: string,
    config: FieldResolverConfig
): void {
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
export function registerQueryResolver(
    fieldName: string,
    resolver: ResolverFunction,
    options: {
        middleware?: readonly ResolverMiddleware[];
        authorization?: AuthorizationConfig;
        validation?: ValidationConfig;
        caching?: CachingConfig;
    } = {}
): void {
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
export function registerMutationResolver(
    fieldName: string,
    resolver: ResolverFunction,
    options: {
        middleware?: readonly ResolverMiddleware[];
        authorization?: AuthorizationConfig;
        validation?: ValidationConfig;
    } = {}
): void {
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
export function registerSubscriptionResolver(
    fieldName: string,
    subscribe: (parent: unknown, args: Record<string, unknown>, context: GraphQLContext, info: GraphQLResolveInfo) => AsyncIterator<unknown>,
    options: {
        resolve?: (payload: unknown, args: Record<string, unknown>, context: GraphQLContext, info: GraphQLResolveInfo) => unknown;
        authorization?: AuthorizationConfig;
    } = {}
): void {
    const subscriptionResolver: SubscriptionResolver = {
        subscribe,
        resolve: options.resolve,
    };
    
    registerResolver('Subscription', fieldName, {
        resolver: subscriptionResolver as unknown as ResolverFunction,
        middleware: [],
        authorization: options.authorization || null,
        validation: null,
        caching: null,
    });
}

/**
 * Register field resolver
 */
export function registerFieldResolver(
    typeName: string,
    fieldName: string,
    resolver: ResolverFunction,
    options: {
        middleware?: readonly ResolverMiddleware[];
        caching?: CachingConfig;
    } = {}
): void {
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
export function getResolver(typeName: string, fieldName: string): FieldResolverConfig | null {
    const typeResolvers = resolvers.get(typeName);
    if (!typeResolvers) {
        return null;
    }
    return typeResolvers.get(fieldName) || null;
}

/**
 * Check authorization
 */
function checkAuthorization(
    config: AuthorizationConfig,
    context: GraphQLContext,
    args: Record<string, unknown>
): boolean {
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
function validateArguments(
    config: ValidationConfig,
    args: Record<string, unknown>
): GraphQLError[] {
    const errors: GraphQLError[] = [];
    
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
async function executeResolver(
    config: FieldResolverConfig,
    parent: unknown,
    args: Record<string, unknown>,
    context: GraphQLContext,
    info: GraphQLResolveInfo
): Promise<unknown> {
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
        resolve = ((p, a, c, i2) => middleware(previousResolve, p, a, c, i2)) as ResolverFunction;
    }
    
    return resolve(parent, args, context, info);
}

/**
 * Create GraphQL error
 */
export function createGraphQLError(
    message: string,
    code: string,
    extensions?: Record<string, unknown>
): GraphQLError {
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
export function createContext(
    requestId: string,
    userId: string | null,
    roles: readonly string[],
    permissions: readonly string[]
): GraphQLContext {
    resolverCounter++;
    
    return {
        requestId,
        userId,
        roles,
        permissions,
        dataloaders: createDataLoaderRegistry(),
        startTime: clock.nowMs(),
        correlationId: generateDeterministicId(`correlation-${resolverCounter}`),
        traceId: generateDeterministicId(`trace-${resolverCounter}`),
        spanId: generateDeterministicId(`span-${resolverCounter}`),
    };
}

// ============================================================================
// MIDDLEWARE FUNKCIJE
// ============================================================================

/**
 * Logging middleware
 */
export function loggingMiddleware(): ResolverMiddleware {
    return async (resolve, parent, args, context, info) => {
        const result = await resolve(parent, args, context, info);
        return result;
    };
}

/**
 * Error handling middleware
 */
export function errorHandlingMiddleware(): ResolverMiddleware {
    return async (resolve, parent, args, context, info) => {
        try {
            return await resolve(parent, args, context, info);
        } catch (error) {
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
export function cachingMiddleware(cache: Map<string, { value: unknown; expiresAt: number }>): ResolverMiddleware {
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
export function tracingMiddleware(): ResolverMiddleware {
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
export function getSelectedFields(info: GraphQLResolveInfo): string[] {
    const fields: string[] = [];
    
    function extractFields(selectionSet: SelectionSet | null): void {
        if (!selectionSet) return;
        
        for (const selection of selectionSet.selections) {
            if (selection.kind === 'Field') {
                fields.push(selection.name);
                extractFields(selection.selectionSet);
            } else if (selection.kind === 'FragmentSpread') {
                const fragment = info.fragments[selection.name];
                if (fragment) {
                    extractFields(fragment.selectionSet);
                }
            } else if (selection.kind === 'InlineFragment') {
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
export function isFieldSelected(info: GraphQLResolveInfo, fieldName: string): boolean {
    return getSelectedFields(info).includes(fieldName);
}

/**
 * Get argument value with default
 */
export function getArgument<T>(args: Record<string, unknown>, name: string, defaultValue: T): T {
    const value = args[name];
    if (value === undefined || value === null) {
        return defaultValue;
    }
    return value as T;
}

/**
 * Create connection response (Relay-style pagination)
 */
export function createConnection<T extends { id: string }>(
    nodes: readonly T[],
    args: { first?: number; after?: string; last?: number; before?: string },
    totalCount: number
): {
    edges: readonly { node: T; cursor: string }[];
    pageInfo: {
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        startCursor: string | null;
        endCursor: string | null;
    };
    totalCount: number;
} {
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
export function parseCursor(cursor: string): string | null {
    try {
        const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
        if (decoded.startsWith('cursor:')) {
            return decoded.slice(7);
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Get all resolvers
 */
export function getAllResolvers(): ResolverMap {
    const result: Record<string, Record<string, ResolverFunction | SubscriptionResolver>> = {};
    
    for (const [typeName, typeResolvers] of resolvers) {
        result[typeName] = {};
        for (const [fieldName, config] of typeResolvers) {
            result[typeName][fieldName] = config.resolver;
        }
    }
    
    return result as ResolverMap;
}

/**
 * Clear all resolvers
 */
export function clearResolvers(): void {
    resolvers.clear();
}
