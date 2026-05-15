/**
 * @file gRPC Client za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-INT-002 gRPC client za zaledne sisteme
 * @design DSN-ZALEDNI-INT-002 Backend gRPC client arhitektura
 * @test TEST-ZALEDNI-INT-002 Preverjanje gRPC client
 *
 * gRPC Client - prilagojen za zaledne sisteme:
 * - Unary calls
 * - Server streaming
 * - Client streaming
 * - Bidirectional streaming
 * - Connection management
 * - Load balancing
 * - Retry policies
 * - Deadline propagation
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom INT_002 - gRPC Client
 */
/**
 * gRPC status code
 */
export type GrpcStatusCode = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;
/**
 * gRPC status
 */
export interface GrpcStatus {
    readonly code: GrpcStatusCode;
    readonly message: string;
    readonly details: readonly GrpcStatusDetail[];
}
/**
 * gRPC status detail
 */
export interface GrpcStatusDetail {
    readonly type: string;
    readonly value: unknown;
}
/**
 * gRPC metadata
 */
export interface GrpcMetadata {
    readonly entries: Readonly<Record<string, string | readonly string[]>>;
}
/**
 * Call options
 */
export interface CallOptions {
    readonly deadline: number | null;
    readonly metadata: GrpcMetadata;
    readonly credentials: CallCredentials | null;
    readonly waitForReady: boolean;
    readonly propagateCancel: boolean;
    readonly interceptors: readonly ClientInterceptor[];
}
/**
 * Call credentials
 */
export interface CallCredentials {
    readonly type: 'insecure' | 'ssl' | 'token';
    readonly token: string | null;
    readonly certificate: string | null;
    readonly privateKey: string | null;
    readonly rootCertificate: string | null;
}
/**
 * Client interceptor
 */
export interface ClientInterceptor {
    readonly name: string;
    intercept<TRequest, TResponse>(method: MethodDescriptor<TRequest, TResponse>, request: TRequest, options: CallOptions, next: (request: TRequest, options: CallOptions) => Promise<TResponse>): Promise<TResponse>;
}
/**
 * Method descriptor
 */
export interface MethodDescriptor<TRequest = unknown, TResponse = unknown> {
    readonly name: string;
    readonly service: string;
    readonly requestType: string;
    readonly responseType: string;
    readonly requestStream: boolean;
    readonly responseStream: boolean;
    readonly serialize: (request: TRequest) => Uint8Array;
    readonly deserialize: (data: Uint8Array) => TResponse;
}
/**
 * Service descriptor
 */
export interface ServiceDescriptor {
    readonly name: string;
    readonly package: string;
    readonly methods: readonly MethodDescriptor[];
}
/**
 * Channel state
 */
export type ChannelState = 'idle' | 'connecting' | 'ready' | 'transient_failure' | 'shutdown';
/**
 * Channel options
 */
export interface ChannelOptions {
    readonly maxSendMessageLength: number;
    readonly maxReceiveMessageLength: number;
    readonly maxConcurrentStreams: number;
    readonly keepaliveTime: number;
    readonly keepaliveTimeout: number;
    readonly keepalivePermitWithoutCalls: boolean;
    readonly initialReconnectBackoff: number;
    readonly maxReconnectBackoff: number;
    readonly enableRetries: boolean;
    readonly maxRetryAttempts: number;
    readonly retryBufferSize: number;
    readonly perRpcBufferLimit: number;
}
/**
 * Channel
 */
export interface Channel {
    readonly channelId: string;
    readonly target: string;
    readonly state: ChannelState;
    readonly options: ChannelOptions;
    readonly createdAt: number;
    readonly lastActivityAt: number;
    close(): void;
    getState(tryToConnect: boolean): ChannelState;
    waitForStateChange(currentState: ChannelState, deadline: number): Promise<boolean>;
}
/**
 * Unary call
 */
export interface UnaryCall<TRequest, TResponse> {
    readonly callId: string;
    readonly method: MethodDescriptor<TRequest, TResponse>;
    readonly request: TRequest;
    readonly options: CallOptions;
    readonly response: Promise<TResponse>;
    readonly status: Promise<GrpcStatus>;
    readonly metadata: Promise<GrpcMetadata>;
    readonly trailers: Promise<GrpcMetadata>;
    cancel(): void;
}
/**
 * Server stream
 */
export interface ServerStream<TRequest, TResponse> {
    readonly callId: string;
    readonly method: MethodDescriptor<TRequest, TResponse>;
    readonly request: TRequest;
    readonly options: CallOptions;
    readonly status: Promise<GrpcStatus>;
    readonly metadata: Promise<GrpcMetadata>;
    readonly trailers: Promise<GrpcMetadata>;
    [Symbol.asyncIterator](): AsyncIterator<TResponse>;
    cancel(): void;
}
/**
 * Client stream
 */
export interface ClientStream<TRequest, TResponse> {
    readonly callId: string;
    readonly method: MethodDescriptor<TRequest, TResponse>;
    readonly options: CallOptions;
    readonly response: Promise<TResponse>;
    readonly status: Promise<GrpcStatus>;
    readonly metadata: Promise<GrpcMetadata>;
    readonly trailers: Promise<GrpcMetadata>;
    send(request: TRequest): Promise<void>;
    complete(): Promise<void>;
    cancel(): void;
}
/**
 * Bidirectional stream
 */
export interface BidiStream<TRequest, TResponse> {
    readonly callId: string;
    readonly method: MethodDescriptor<TRequest, TResponse>;
    readonly options: CallOptions;
    readonly status: Promise<GrpcStatus>;
    readonly metadata: Promise<GrpcMetadata>;
    readonly trailers: Promise<GrpcMetadata>;
    send(request: TRequest): Promise<void>;
    complete(): Promise<void>;
    [Symbol.asyncIterator](): AsyncIterator<TResponse>;
    cancel(): void;
}
/**
 * Load balancer policy
 */
export type LoadBalancerPolicy = 'pick_first' | 'round_robin' | 'grpclb' | 'xds';
/**
 * Load balancer config
 */
export interface LoadBalancerConfig {
    readonly policy: LoadBalancerPolicy;
    readonly serviceConfig: ServiceConfig | null;
}
/**
 * Service config
 */
export interface ServiceConfig {
    readonly loadBalancingPolicy: LoadBalancerPolicy;
    readonly methodConfig: readonly MethodConfig[];
    readonly retryThrottling: RetryThrottling | null;
    readonly healthCheckConfig: HealthCheckConfig | null;
}
/**
 * Method config
 */
export interface MethodConfig {
    readonly name: readonly MethodName[];
    readonly waitForReady: boolean;
    readonly timeout: number | null;
    readonly maxRequestMessageBytes: number | null;
    readonly maxResponseMessageBytes: number | null;
    readonly retryPolicy: RetryPolicy | null;
    readonly hedgingPolicy: HedgingPolicy | null;
}
/**
 * Method name
 */
export interface MethodName {
    readonly service: string;
    readonly method: string;
}
/**
 * Retry policy
 */
export interface RetryPolicy {
    readonly maxAttempts: number;
    readonly initialBackoff: number;
    readonly maxBackoff: number;
    readonly backoffMultiplier: number;
    readonly retryableStatusCodes: readonly GrpcStatusCode[];
}
/**
 * Hedging policy
 */
export interface HedgingPolicy {
    readonly maxAttempts: number;
    readonly hedgingDelay: number;
    readonly nonFatalStatusCodes: readonly GrpcStatusCode[];
}
/**
 * Retry throttling
 */
export interface RetryThrottling {
    readonly maxTokens: number;
    readonly tokenRatio: number;
}
/**
 * Health check config
 */
export interface HealthCheckConfig {
    readonly serviceName: string;
}
/**
 * Client statistics
 */
export interface ClientStatistics {
    readonly totalCalls: number;
    readonly successfulCalls: number;
    readonly failedCalls: number;
    readonly activeStreams: number;
    readonly avgLatency: number;
    readonly p50Latency: number;
    readonly p95Latency: number;
    readonly p99Latency: number;
    readonly bytesSent: number;
    readonly bytesReceived: number;
}
/**
 * Call event
 */
export interface CallEvent {
    readonly eventId: string;
    readonly type: CallEventType;
    readonly callId: string;
    readonly method: string;
    readonly timestamp: number;
    readonly data: Readonly<Record<string, unknown>>;
}
/**
 * Call event type
 */
export type CallEventType = 'call_started' | 'call_completed' | 'call_failed' | 'call_cancelled' | 'stream_message_sent' | 'stream_message_received' | 'stream_completed' | 'stream_error';
/**
 * Call event listener
 */
export type CallEventListener = (event: CallEvent) => void | Promise<void>;
/**
 * Get status code name
 */
export declare function getStatusCodeName(code: GrpcStatusCode): string;
/**
 * Create metadata
 */
export declare function createMetadata(entries: Record<string, string | string[]>): GrpcMetadata;
/**
 * Create channel
 */
export declare function createChannel(target: string, options?: Partial<ChannelOptions>): Channel;
/**
 * Get channel
 */
export declare function getChannel(channelId: string): Channel | null;
/**
 * Get all channels
 */
export declare function getAllChannels(): readonly Channel[];
/**
 * Close channel
 */
export declare function closeChannel(channelId: string): boolean;
/**
 * Close all channels
 */
export declare function closeAllChannels(): void;
/**
 * Make unary call
 */
export declare function unaryCall<TRequest, TResponse>(channel: Channel, method: MethodDescriptor<TRequest, TResponse>, request: TRequest, options?: Partial<CallOptions>): UnaryCall<TRequest, TResponse>;
/**
 * Make server streaming call
 */
export declare function serverStreamingCall<TRequest, TResponse>(channel: Channel, method: MethodDescriptor<TRequest, TResponse>, request: TRequest, options?: Partial<CallOptions>): ServerStream<TRequest, TResponse>;
/**
 * Make client streaming call
 */
export declare function clientStreamingCall<TRequest, TResponse>(channel: Channel, method: MethodDescriptor<TRequest, TResponse>, options?: Partial<CallOptions>): ClientStream<TRequest, TResponse>;
/**
 * Make bidirectional streaming call
 */
export declare function bidiStreamingCall<TRequest, TResponse>(channel: Channel, method: MethodDescriptor<TRequest, TResponse>, options?: Partial<CallOptions>): BidiStream<TRequest, TResponse>;
/**
 * Create logging interceptor
 */
export declare function createLoggingInterceptor(): ClientInterceptor;
/**
 * Create retry interceptor
 */
export declare function createRetryInterceptor(policy: RetryPolicy): ClientInterceptor;
/**
 * Create timeout interceptor
 */
export declare function createTimeoutInterceptor(timeout: number): ClientInterceptor;
/**
 * Create metadata interceptor
 */
export declare function createMetadataInterceptor(metadata: GrpcMetadata): ClientInterceptor;
/**
 * Get statistics
 */
export declare function getStatistics(): Readonly<ClientStatistics>;
/**
 * Reset statistics
 */
export declare function resetStatistics(): void;
/**
 * Add event listener
 */
export declare function addEventListener(listener: CallEventListener): void;
/**
 * Remove event listener
 */
export declare function removeEventListener(listener: CallEventListener): void;
/**
 * Clear event listeners
 */
export declare function clearEventListeners(): void;
/**
 * Clear all state
 */
export declare function clearAll(): void;
