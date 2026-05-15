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
export type ValueNode = IntValueNode | FloatValueNode | StringValueNode | BooleanValueNode | NullValueNode | EnumValueNode | ListValueNode | ObjectValueNode | VariableNode;
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
export type DirectiveLocation = 'QUERY' | 'MUTATION' | 'SUBSCRIPTION' | 'FIELD' | 'FRAGMENT_DEFINITION' | 'FRAGMENT_SPREAD' | 'INLINE_FRAGMENT' | 'VARIABLE_DEFINITION' | 'SCHEMA' | 'SCALAR' | 'OBJECT' | 'FIELD_DEFINITION' | 'ARGUMENT_DEFINITION' | 'INTERFACE' | 'UNION' | 'ENUM' | 'ENUM_VALUE' | 'INPUT_OBJECT' | 'INPUT_FIELD_DEFINITION';
/**
 * Resolver function
 */
export type ResolverFunction<TParent = unknown, TArgs = Record<string, unknown>, TResult = unknown> = (parent: TParent, args: TArgs, context: GraphQLContext, info: GraphQLResolveInfo) => TResult | Promise<TResult>;
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
export type ResolverMiddleware = (resolve: ResolverFunction, parent: unknown, args: Record<string, unknown>, context: GraphQLContext, info: GraphQLResolveInfo) => unknown | Promise<unknown>;
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
/**
 * Create DataLoader
 */
export declare function createDataLoader<K, V>(batchLoadFn: BatchLoadFunction<K, V>, options?: DataLoaderOptions<K, V>): DataLoader<K, V>;
/**
 * Create DataLoader registry
 */
export declare function createDataLoaderRegistry(): DataLoaderRegistry;
/**
 * Create in-memory PubSub
 */
export declare function createPubSub(): PubSub;
/**
 * Register resolver for type and field
 */
export declare function registerResolver(typeName: string, fieldName: string, config: FieldResolverConfig): void;
/**
 * Register query resolver
 */
export declare function registerQueryResolver(fieldName: string, resolver: ResolverFunction, options?: {
    middleware?: readonly ResolverMiddleware[];
    authorization?: AuthorizationConfig;
    validation?: ValidationConfig;
    caching?: CachingConfig;
}): void;
/**
 * Register mutation resolver
 */
export declare function registerMutationResolver(fieldName: string, resolver: ResolverFunction, options?: {
    middleware?: readonly ResolverMiddleware[];
    authorization?: AuthorizationConfig;
    validation?: ValidationConfig;
}): void;
/**
 * Register subscription resolver
 */
export declare function registerSubscriptionResolver(fieldName: string, subscribe: (parent: unknown, args: Record<string, unknown>, context: GraphQLContext, info: GraphQLResolveInfo) => AsyncIterator<unknown>, options?: {
    resolve?: (payload: unknown, args: Record<string, unknown>, context: GraphQLContext, info: GraphQLResolveInfo) => unknown;
    authorization?: AuthorizationConfig;
}): void;
/**
 * Register field resolver
 */
export declare function registerFieldResolver(typeName: string, fieldName: string, resolver: ResolverFunction, options?: {
    middleware?: readonly ResolverMiddleware[];
    caching?: CachingConfig;
}): void;
/**
 * Get resolver for type and field
 */
export declare function getResolver(typeName: string, fieldName: string): FieldResolverConfig | null;
/**
 * Create GraphQL error
 */
export declare function createGraphQLError(message: string, code: string, extensions?: Record<string, unknown>): GraphQLError;
/**
 * Create GraphQL context
 */
export declare function createContext(requestId: string, userId: string | null, roles: readonly string[], permissions: readonly string[]): GraphQLContext;
/**
 * Logging middleware
 */
export declare function loggingMiddleware(): ResolverMiddleware;
/**
 * Error handling middleware
 */
export declare function errorHandlingMiddleware(): ResolverMiddleware;
/**
 * Caching middleware
 */
export declare function cachingMiddleware(cache: Map<string, {
    value: unknown;
    expiresAt: number;
}>): ResolverMiddleware;
/**
 * Tracing middleware
 */
export declare function tracingMiddleware(): ResolverMiddleware;
/**
 * Get selected fields from info
 */
export declare function getSelectedFields(info: GraphQLResolveInfo): string[];
/**
 * Check if field is selected
 */
export declare function isFieldSelected(info: GraphQLResolveInfo, fieldName: string): boolean;
/**
 * Get argument value with default
 */
export declare function getArgument<T>(args: Record<string, unknown>, name: string, defaultValue: T): T;
/**
 * Create connection response (Relay-style pagination)
 */
export declare function createConnection<T extends {
    id: string;
}>(nodes: readonly T[], args: {
    first?: number;
    after?: string;
    last?: number;
    before?: string;
}, totalCount: number): {
    edges: readonly {
        node: T;
        cursor: string;
    }[];
    pageInfo: {
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        startCursor: string | null;
        endCursor: string | null;
    };
    totalCount: number;
};
/**
 * Parse cursor
 */
export declare function parseCursor(cursor: string): string | null;
/**
 * Get all resolvers
 */
export declare function getAllResolvers(): ResolverMap;
/**
 * Clear all resolvers
 */
export declare function clearResolvers(): void;
