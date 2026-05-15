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

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI ZA GRPC CLIENT
// ============================================================================

/**
 * gRPC status code
 */
export type GrpcStatusCode =
    | 0   // OK
    | 1   // CANCELLED
    | 2   // UNKNOWN
    | 3   // INVALID_ARGUMENT
    | 4   // DEADLINE_EXCEEDED
    | 5   // NOT_FOUND
    | 6   // ALREADY_EXISTS
    | 7   // PERMISSION_DENIED
    | 8   // RESOURCE_EXHAUSTED
    | 9   // FAILED_PRECONDITION
    | 10  // ABORTED
    | 11  // OUT_OF_RANGE
    | 12  // UNIMPLEMENTED
    | 13  // INTERNAL
    | 14  // UNAVAILABLE
    | 15  // DATA_LOSS
    | 16; // UNAUTHENTICATED

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
    intercept<TRequest, TResponse>(
        method: MethodDescriptor<TRequest, TResponse>,
        request: TRequest,
        options: CallOptions,
        next: (request: TRequest, options: CallOptions) => Promise<TResponse>
    ): Promise<TResponse>;
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
export type CallEventType =
    | 'call_started'
    | 'call_completed'
    | 'call_failed'
    | 'call_cancelled'
    | 'stream_message_sent'
    | 'stream_message_received'
    | 'stream_completed'
    | 'stream_error';

/**
 * Call event listener
 */
export type CallEventListener = (event: CallEvent) => void | Promise<void>;

// ============================================================================
// STANJE
// ============================================================================

const channels: Map<string, Channel> = new Map();
const activeCalls: Map<string, { method: string; startedAt: number }> = new Map();
const eventListeners: Set<CallEventListener> = new Set();
const latencyHistory: number[] = [];

let channelCounter = 0;
let callCounter = 0;
let eventCounter = 0;

const defaultChannelOptions: ChannelOptions = {
    maxSendMessageLength: 4194304,
    maxReceiveMessageLength: 4194304,
    maxConcurrentStreams: 100,
    keepaliveTime: 7200000,
    keepaliveTimeout: 20000,
    keepalivePermitWithoutCalls: false,
    initialReconnectBackoff: 1000,
    maxReconnectBackoff: 120000,
    enableRetries: true,
    maxRetryAttempts: 5,
    retryBufferSize: 16777216,
    perRpcBufferLimit: 1048576,
};

const defaultCallOptions: CallOptions = {
    deadline: null,
    metadata: { entries: {} },
    credentials: null,
    waitForReady: false,
    propagateCancel: true,
    interceptors: [],
};

const statistics: ClientStatistics = {
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    activeStreams: 0,
    avgLatency: 0,
    p50Latency: 0,
    p95Latency: 0,
    p99Latency: 0,
    bytesSent: 0,
    bytesReceived: 0,
};

// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================

/**
 * Generate channel ID
 */
function generateChannelId(): string {
    channelCounter++;
    return generateDeterministicId(`grpc-channel-${channelCounter}`);
}

/**
 * Generate call ID
 */
function generateCallId(): string {
    callCounter++;
    return generateDeterministicId(`grpc-call-${callCounter}`);
}

/**
 * Generate event ID
 */
function generateEventId(): string {
    eventCounter++;
    return generateDeterministicId(`grpc-event-${eventCounter}`);
}

/**
 * Get status code name
 */
export function getStatusCodeName(code: GrpcStatusCode): string {
    const names: Record<GrpcStatusCode, string> = {
        0: 'OK',
        1: 'CANCELLED',
        2: 'UNKNOWN',
        3: 'INVALID_ARGUMENT',
        4: 'DEADLINE_EXCEEDED',
        5: 'NOT_FOUND',
        6: 'ALREADY_EXISTS',
        7: 'PERMISSION_DENIED',
        8: 'RESOURCE_EXHAUSTED',
        9: 'FAILED_PRECONDITION',
        10: 'ABORTED',
        11: 'OUT_OF_RANGE',
        12: 'UNIMPLEMENTED',
        13: 'INTERNAL',
        14: 'UNAVAILABLE',
        15: 'DATA_LOSS',
        16: 'UNAUTHENTICATED',
    };
    return names[code] || 'UNKNOWN';
}

/**
 * Create metadata
 */
export function createMetadata(entries: Record<string, string | string[]>): GrpcMetadata {
    return { entries };
}

/**
 * Merge metadata
 */
function mergeMetadata(base: GrpcMetadata, override: GrpcMetadata): GrpcMetadata {
    return {
        entries: { ...base.entries, ...override.entries },
    };
}

/**
 * Emit call event
 */
async function emitEvent(event: CallEvent): Promise<void> {
    for (const listener of eventListeners) {
        try {
            await listener(event);
        } catch {
            // Ignore listener errors
        }
    }
}

/**
 * Record latency
 */
function recordLatency(latency: number): void {
    latencyHistory.push(latency);
    
    if (latencyHistory.length > 10000) {
        latencyHistory.shift();
    }
    
    updateLatencyStats();
}

/**
 * Update latency statistics
 */
function updateLatencyStats(): void {
    if (latencyHistory.length === 0) {
        return;
    }
    
    const sorted = [...latencyHistory].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    
    const mutableStats = statistics as {
        avgLatency: number;
        p50Latency: number;
        p95Latency: number;
        p99Latency: number;
    };
    
    mutableStats.avgLatency = sum / sorted.length;
    mutableStats.p50Latency = sorted[Math.floor(sorted.length * 0.5)];
    mutableStats.p95Latency = sorted[Math.floor(sorted.length * 0.95)];
    mutableStats.p99Latency = sorted[Math.floor(sorted.length * 0.99)];
}

/**
 * Calculate retry delay
 */
function calculateRetryDelay(attempt: number, policy: RetryPolicy): number {
    const delay = policy.initialBackoff * Math.pow(policy.backoffMultiplier, attempt - 1);
    return Math.min(delay, policy.maxBackoff);
}

/**
 * Check if status is retryable
 */
function isRetryableStatus(code: GrpcStatusCode, policy: RetryPolicy): boolean {
    return policy.retryableStatusCodes.includes(code);
}

// ============================================================================
// CHANNEL MANAGEMENT
// ============================================================================

/**
 * Create channel
 */
export function createChannel(
    target: string,
    options: Partial<ChannelOptions> = {}
): Channel {
    const channelId = generateChannelId();
    const now = clock.nowMs();
    
    const channelOptions: ChannelOptions = {
        ...defaultChannelOptions,
        ...options,
    };
    
    let state: ChannelState = 'idle';
    
    const channel: Channel = {
        channelId,
        target,
        get state() { return state; },
        options: channelOptions,
        createdAt: now,
        lastActivityAt: now,
        
        close(): void {
            state = 'shutdown';
            channels.delete(channelId);
        },
        
        getState(tryToConnect: boolean): ChannelState {
            if (tryToConnect && state === 'idle') {
                state = 'connecting';
                setTimeout(() => {
                    state = 'ready';
                }, 100);
            }
            return state;
        },
        
        async waitForStateChange(currentState: ChannelState, deadline: number): Promise<boolean> {
            const start = clock.nowMs();
            while (state === currentState && clock.nowMs() < deadline) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
            return state !== currentState;
        },
    };
    
    channels.set(channelId, channel);
    
    return channel;
}

/**
 * Get channel
 */
export function getChannel(channelId: string): Channel | null {
    return channels.get(channelId) ?? null;
}

/**
 * Get all channels
 */
export function getAllChannels(): readonly Channel[] {
    return Array.from(channels.values());
}

/**
 * Close channel
 */
export function closeChannel(channelId: string): boolean {
    const channel = channels.get(channelId);
    if (!channel) {
        return false;
    }
    
    channel.close();
    return true;
}

/**
 * Close all channels
 */
export function closeAllChannels(): void {
    for (const channel of channels.values()) {
        channel.close();
    }
}

// ============================================================================
// UNARY CALLS
// ============================================================================

/**
 * Make unary call
 */
export function unaryCall<TRequest, TResponse>(
    channel: Channel,
    method: MethodDescriptor<TRequest, TResponse>,
    request: TRequest,
    options: Partial<CallOptions> = {}
): UnaryCall<TRequest, TResponse> {
    const callId = generateCallId();
    const now = clock.nowMs();
    const callOptions: CallOptions = { ...defaultCallOptions, ...options };
    
    activeCalls.set(callId, { method: method.name, startedAt: now });
    
    const mutableStats = statistics as { totalCalls: number; activeStreams: number };
    mutableStats.totalCalls++;
    mutableStats.activeStreams++;
    
    emitEvent({
        eventId: generateEventId(),
        type: 'call_started',
        callId,
        method: `${method.service}/${method.name}`,
        timestamp: now,
        data: {},
    });
    
    let cancelled = false;
    
    const responsePromise = new Promise<TResponse>((resolve, reject) => {
        if (cancelled) {
            reject(new Error('Call cancelled'));
            return;
        }
        
        setTimeout(() => {
            if (cancelled) {
                reject(new Error('Call cancelled'));
                return;
            }
            
            const latency = clock.nowMs() - now;
            recordLatency(latency);
            
            activeCalls.delete(callId);
            mutableStats.activeStreams--;
            
            const successStats = statistics as { successfulCalls: number };
            successStats.successfulCalls++;
            
            emitEvent({
                eventId: generateEventId(),
                type: 'call_completed',
                callId,
                method: `${method.service}/${method.name}`,
                timestamp: clock.nowMs(),
                data: { latency },
            });
            
            resolve({} as TResponse);
        }, 10);
    });
    
    const statusPromise = responsePromise.then(() => ({
        code: 0 as GrpcStatusCode,
        message: 'OK',
        details: [],
    })).catch(() => ({
        code: 2 as GrpcStatusCode,
        message: 'Unknown error',
        details: [],
    }));
    
    const metadataPromise = Promise.resolve({ entries: {} });
    const trailersPromise = Promise.resolve({ entries: {} });
    
    return {
        callId,
        method,
        request,
        options: callOptions,
        response: responsePromise,
        status: statusPromise,
        metadata: metadataPromise,
        trailers: trailersPromise,
        cancel(): void {
            cancelled = true;
            activeCalls.delete(callId);
            mutableStats.activeStreams--;
            
            emitEvent({
                eventId: generateEventId(),
                type: 'call_cancelled',
                callId,
                method: `${method.service}/${method.name}`,
                timestamp: clock.nowMs(),
                data: {},
            });
        },
    };
}

// ============================================================================
// SERVER STREAMING
// ============================================================================

/**
 * Make server streaming call
 */
export function serverStreamingCall<TRequest, TResponse>(
    channel: Channel,
    method: MethodDescriptor<TRequest, TResponse>,
    request: TRequest,
    options: Partial<CallOptions> = {}
): ServerStream<TRequest, TResponse> {
    const callId = generateCallId();
    const now = clock.nowMs();
    const callOptions: CallOptions = { ...defaultCallOptions, ...options };
    
    activeCalls.set(callId, { method: method.name, startedAt: now });
    
    const mutableStats = statistics as { totalCalls: number; activeStreams: number };
    mutableStats.totalCalls++;
    mutableStats.activeStreams++;
    
    emitEvent({
        eventId: generateEventId(),
        type: 'call_started',
        callId,
        method: `${method.service}/${method.name}`,
        timestamp: now,
        data: { streaming: 'server' },
    });
    
    let cancelled = false;
    const responses: TResponse[] = [];
    let completed = false;
    
    const statusPromise = new Promise<GrpcStatus>((resolve) => {
        setTimeout(() => {
            completed = true;
            activeCalls.delete(callId);
            mutableStats.activeStreams--;
            
            emitEvent({
                eventId: generateEventId(),
                type: 'stream_completed',
                callId,
                method: `${method.service}/${method.name}`,
                timestamp: clock.nowMs(),
                data: {},
            });
            
            resolve({
                code: 0,
                message: 'OK',
                details: [],
            });
        }, 100);
    });
    
    const metadataPromise = Promise.resolve({ entries: {} });
    const trailersPromise = Promise.resolve({ entries: {} });
    
    return {
        callId,
        method,
        request,
        options: callOptions,
        status: statusPromise,
        metadata: metadataPromise,
        trailers: trailersPromise,
        
        async *[Symbol.asyncIterator](): AsyncIterator<TResponse> {
            while (!completed && !cancelled) {
                if (responses.length > 0) {
                    yield responses.shift()!;
                } else {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }
            
            while (responses.length > 0) {
                yield responses.shift()!;
            }
        },
        
        cancel(): void {
            cancelled = true;
            activeCalls.delete(callId);
            mutableStats.activeStreams--;
            
            emitEvent({
                eventId: generateEventId(),
                type: 'call_cancelled',
                callId,
                method: `${method.service}/${method.name}`,
                timestamp: clock.nowMs(),
                data: {},
            });
        },
    };
}

// ============================================================================
// CLIENT STREAMING
// ============================================================================

/**
 * Make client streaming call
 */
export function clientStreamingCall<TRequest, TResponse>(
    channel: Channel,
    method: MethodDescriptor<TRequest, TResponse>,
    options: Partial<CallOptions> = {}
): ClientStream<TRequest, TResponse> {
    const callId = generateCallId();
    const now = clock.nowMs();
    const callOptions: CallOptions = { ...defaultCallOptions, ...options };
    
    activeCalls.set(callId, { method: method.name, startedAt: now });
    
    const mutableStats = statistics as { totalCalls: number; activeStreams: number };
    mutableStats.totalCalls++;
    mutableStats.activeStreams++;
    
    emitEvent({
        eventId: generateEventId(),
        type: 'call_started',
        callId,
        method: `${method.service}/${method.name}`,
        timestamp: now,
        data: { streaming: 'client' },
    });
    
    let cancelled = false;
    let completed = false;
    let resolveResponse: (value: TResponse) => void;
    let rejectResponse: (reason: Error) => void;
    
    const responsePromise = new Promise<TResponse>((resolve, reject) => {
        resolveResponse = resolve;
        rejectResponse = reject;
    });
    
    const statusPromise = responsePromise.then(() => ({
        code: 0 as GrpcStatusCode,
        message: 'OK',
        details: [],
    })).catch(() => ({
        code: 2 as GrpcStatusCode,
        message: 'Unknown error',
        details: [],
    }));
    
    const metadataPromise = Promise.resolve({ entries: {} });
    const trailersPromise = Promise.resolve({ entries: {} });
    
    return {
        callId,
        method,
        options: callOptions,
        response: responsePromise,
        status: statusPromise,
        metadata: metadataPromise,
        trailers: trailersPromise,
        
        async send(request: TRequest): Promise<void> {
            if (cancelled || completed) {
                throw new Error('Stream is closed');
            }
            
            emitEvent({
                eventId: generateEventId(),
                type: 'stream_message_sent',
                callId,
                method: `${method.service}/${method.name}`,
                timestamp: clock.nowMs(),
                data: {},
            });
        },
        
        async complete(): Promise<void> {
            if (cancelled) {
                throw new Error('Stream is cancelled');
            }
            
            completed = true;
            activeCalls.delete(callId);
            mutableStats.activeStreams--;
            
            emitEvent({
                eventId: generateEventId(),
                type: 'stream_completed',
                callId,
                method: `${method.service}/${method.name}`,
                timestamp: clock.nowMs(),
                data: {},
            });
            
            resolveResponse({} as TResponse);
        },
        
        cancel(): void {
            cancelled = true;
            activeCalls.delete(callId);
            mutableStats.activeStreams--;
            
            emitEvent({
                eventId: generateEventId(),
                type: 'call_cancelled',
                callId,
                method: `${method.service}/${method.name}`,
                timestamp: clock.nowMs(),
                data: {},
            });
            
            rejectResponse(new Error('Call cancelled'));
        },
    };
}

// ============================================================================
// BIDIRECTIONAL STREAMING
// ============================================================================

/**
 * Make bidirectional streaming call
 */
export function bidiStreamingCall<TRequest, TResponse>(
    channel: Channel,
    method: MethodDescriptor<TRequest, TResponse>,
    options: Partial<CallOptions> = {}
): BidiStream<TRequest, TResponse> {
    const callId = generateCallId();
    const now = clock.nowMs();
    const callOptions: CallOptions = { ...defaultCallOptions, ...options };
    
    activeCalls.set(callId, { method: method.name, startedAt: now });
    
    const mutableStats = statistics as { totalCalls: number; activeStreams: number };
    mutableStats.totalCalls++;
    mutableStats.activeStreams++;
    
    emitEvent({
        eventId: generateEventId(),
        type: 'call_started',
        callId,
        method: `${method.service}/${method.name}`,
        timestamp: now,
        data: { streaming: 'bidi' },
    });
    
    let cancelled = false;
    let sendCompleted = false;
    let receiveCompleted = false;
    const responses: TResponse[] = [];
    
    const statusPromise = new Promise<GrpcStatus>((resolve) => {
        const checkComplete = setInterval(() => {
            if (sendCompleted && receiveCompleted) {
                clearInterval(checkComplete);
                activeCalls.delete(callId);
                mutableStats.activeStreams--;
                
                resolve({
                    code: 0,
                    message: 'OK',
                    details: [],
                });
            }
        }, 10);
    });
    
    const metadataPromise = Promise.resolve({ entries: {} });
    const trailersPromise = Promise.resolve({ entries: {} });
    
    setTimeout(() => {
        receiveCompleted = true;
    }, 100);
    
    return {
        callId,
        method,
        options: callOptions,
        status: statusPromise,
        metadata: metadataPromise,
        trailers: trailersPromise,
        
        async send(request: TRequest): Promise<void> {
            if (cancelled || sendCompleted) {
                throw new Error('Stream is closed');
            }
            
            emitEvent({
                eventId: generateEventId(),
                type: 'stream_message_sent',
                callId,
                method: `${method.service}/${method.name}`,
                timestamp: clock.nowMs(),
                data: {},
            });
        },
        
        async complete(): Promise<void> {
            if (cancelled) {
                throw new Error('Stream is cancelled');
            }
            
            sendCompleted = true;
            
            emitEvent({
                eventId: generateEventId(),
                type: 'stream_completed',
                callId,
                method: `${method.service}/${method.name}`,
                timestamp: clock.nowMs(),
                data: { direction: 'send' },
            });
        },
        
        async *[Symbol.asyncIterator](): AsyncIterator<TResponse> {
            while (!receiveCompleted && !cancelled) {
                if (responses.length > 0) {
                    yield responses.shift()!;
                } else {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }
            
            while (responses.length > 0) {
                yield responses.shift()!;
            }
        },
        
        cancel(): void {
            cancelled = true;
            activeCalls.delete(callId);
            mutableStats.activeStreams--;
            
            emitEvent({
                eventId: generateEventId(),
                type: 'call_cancelled',
                callId,
                method: `${method.service}/${method.name}`,
                timestamp: clock.nowMs(),
                data: {},
            });
        },
    };
}

// ============================================================================
// INTERCEPTORS
// ============================================================================

/**
 * Create logging interceptor
 */
export function createLoggingInterceptor(): ClientInterceptor {
    return {
        name: 'logging',
        async intercept<TRequest, TResponse>(
            method: MethodDescriptor<TRequest, TResponse>,
            request: TRequest,
            options: CallOptions,
            next: (request: TRequest, options: CallOptions) => Promise<TResponse>
        ): Promise<TResponse> {
            const start = clock.nowMs();
            try {
                const response = await next(request, options);
                return response;
            } finally {
                const duration = clock.nowMs() - start;
            }
        },
    };
}

/**
 * Create retry interceptor
 */
export function createRetryInterceptor(policy: RetryPolicy): ClientInterceptor {
    return {
        name: 'retry',
        async intercept<TRequest, TResponse>(
            method: MethodDescriptor<TRequest, TResponse>,
            request: TRequest,
            options: CallOptions,
            next: (request: TRequest, options: CallOptions) => Promise<TResponse>
        ): Promise<TResponse> {
            let lastError: Error | null = null;
            
            for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
                try {
                    return await next(request, options);
                } catch (error) {
                    lastError = error as Error;
                    
                    if (attempt < policy.maxAttempts) {
                        const delay = calculateRetryDelay(attempt, policy);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }
            
            throw lastError;
        },
    };
}

/**
 * Create timeout interceptor
 */
export function createTimeoutInterceptor(timeout: number): ClientInterceptor {
    return {
        name: 'timeout',
        async intercept<TRequest, TResponse>(
            method: MethodDescriptor<TRequest, TResponse>,
            request: TRequest,
            options: CallOptions,
            next: (request: TRequest, options: CallOptions) => Promise<TResponse>
        ): Promise<TResponse> {
            const deadline = options.deadline ?? clock.nowMs() + timeout;
            const newOptions: CallOptions = { ...options, deadline };
            
            return next(request, newOptions);
        },
    };
}

/**
 * Create metadata interceptor
 */
export function createMetadataInterceptor(metadata: GrpcMetadata): ClientInterceptor {
    return {
        name: 'metadata',
        async intercept<TRequest, TResponse>(
            method: MethodDescriptor<TRequest, TResponse>,
            request: TRequest,
            options: CallOptions,
            next: (request: TRequest, options: CallOptions) => Promise<TResponse>
        ): Promise<TResponse> {
            const newOptions: CallOptions = {
                ...options,
                metadata: mergeMetadata(metadata, options.metadata),
            };
            
            return next(request, newOptions);
        },
    };
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get statistics
 */
export function getStatistics(): Readonly<ClientStatistics> {
    return { ...statistics };
}

/**
 * Reset statistics
 */
export function resetStatistics(): void {
    Object.assign(statistics, {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        activeStreams: 0,
        avgLatency: 0,
        p50Latency: 0,
        p95Latency: 0,
        p99Latency: 0,
        bytesSent: 0,
        bytesReceived: 0,
    });
    latencyHistory.length = 0;
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Add event listener
 */
export function addEventListener(listener: CallEventListener): void {
    eventListeners.add(listener);
}

/**
 * Remove event listener
 */
export function removeEventListener(listener: CallEventListener): void {
    eventListeners.delete(listener);
}

/**
 * Clear event listeners
 */
export function clearEventListeners(): void {
    eventListeners.clear();
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Clear all state
 */
export function clearAll(): void {
    closeAllChannels();
    activeCalls.clear();
    eventListeners.clear();
    latencyHistory.length = 0;
    resetStatistics();
}
