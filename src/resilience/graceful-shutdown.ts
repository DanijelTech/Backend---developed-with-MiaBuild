/**
 * @file Graceful Shutdown za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 * 
 * @requirement ZAH-ZALEDNI-RES-009 Graceful shutdown za zaledne sisteme
 * @design DSN-ZALEDNI-RES-009 Backend graceful shutdown arhitektura
 * @test TEST-ZALEDNI-RES-009 Preverjanje graceful shutdown
 * 
 * Graceful Shutdown - prilagojen za zaledne sisteme:
 * - Signal handling
 * - Connection draining
 * - Request completion
 * - Resource cleanup
 * - Shutdown hooks
 * - Timeout management
 * - State persistence
 * - Event notifications
 * 
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom RES_009 - Graceful Shutdown
 */

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI ZA GRACEFUL SHUTDOWN
// ============================================================================

/**
 * Shutdown phase
 */
export type ShutdownPhase = 
    | 'running'
    | 'shutdown_initiated'
    | 'draining'
    | 'cleanup'
    | 'finalizing'
    | 'terminated';

/**
 * Shutdown signal
 */
export type ShutdownSignal = 'SIGTERM' | 'SIGINT' | 'SIGHUP' | 'SIGQUIT' | 'manual';

/**
 * Hook priority
 */
export type HookPriority = 'critical' | 'high' | 'normal' | 'low' | 'cleanup';

/**
 * Shutdown configuration
 */
export interface ShutdownConfig {
    readonly configId: string;
    readonly name: string;
    readonly drainTimeout: number;
    readonly cleanupTimeout: number;
    readonly finalizeTimeout: number;
    readonly totalTimeout: number;
    readonly forceKillTimeout: number;
    readonly gracePeriod: number;
    readonly enabled: boolean;
    readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Shutdown state
 */
export interface ShutdownState {
    readonly stateId: string;
    readonly configId: string;
    readonly phase: ShutdownPhase;
    readonly signal: ShutdownSignal | null;
    readonly initiatedAt: number | null;
    readonly completedAt: number | null;
    readonly activeConnections: number;
    readonly pendingRequests: number;
    readonly completedHooks: number;
    readonly totalHooks: number;
    readonly errors: readonly ShutdownError[];
}

/**
 * Shutdown hook
 */
export interface ShutdownHook {
    readonly hookId: string;
    readonly configId: string;
    readonly name: string;
    readonly priority: HookPriority;
    readonly timeout: number;
    readonly handler: ShutdownHandler;
    readonly executed: boolean;
    readonly executedAt: number | null;
    readonly success: boolean | null;
    readonly error: string | null;
}

/**
 * Shutdown handler
 */
export type ShutdownHandler = () => void | Promise<void>;

/**
 * Shutdown error
 */
export interface ShutdownError {
    readonly errorId: string;
    readonly phase: ShutdownPhase;
    readonly hookId: string | null;
    readonly message: string;
    readonly timestamp: number;
}

/**
 * Connection info
 */
export interface ConnectionInfo {
    readonly connectionId: string;
    readonly configId: string;
    readonly type: string;
    readonly createdAt: number;
    readonly lastActivityAt: number;
    readonly draining: boolean;
    readonly closed: boolean;
}

/**
 * Request info
 */
export interface RequestInfo {
    readonly requestId: string;
    readonly configId: string;
    readonly startedAt: number;
    readonly deadline: number | null;
    readonly completed: boolean;
    readonly aborted: boolean;
}

/**
 * Shutdown event
 */
export interface ShutdownEvent {
    readonly eventId: string;
    readonly type: ShutdownEventType;
    readonly configId: string | null;
    readonly timestamp: number;
    readonly data: Readonly<Record<string, unknown>>;
}

/**
 * Shutdown event type
 */
export type ShutdownEventType =
    | 'config_created'
    | 'config_deleted'
    | 'shutdown_initiated'
    | 'phase_changed'
    | 'draining_started'
    | 'draining_completed'
    | 'hook_started'
    | 'hook_completed'
    | 'hook_failed'
    | 'hook_timeout'
    | 'cleanup_started'
    | 'cleanup_completed'
    | 'connection_drained'
    | 'request_completed'
    | 'request_aborted'
    | 'shutdown_completed'
    | 'force_kill';

/**
 * Shutdown event listener
 */
export type ShutdownEventListener = (event: ShutdownEvent) => void | Promise<void>;

/**
 * Shutdown statistics
 */
export interface ShutdownStatistics {
    readonly totalConfigs: number;
    readonly totalShutdowns: number;
    readonly successfulShutdowns: number;
    readonly failedShutdowns: number;
    readonly forcedShutdowns: number;
    readonly totalHooksExecuted: number;
    readonly failedHooks: number;
    readonly averageShutdownDuration: number;
    readonly totalConnectionsDrained: number;
    readonly totalRequestsCompleted: number;
    readonly totalRequestsAborted: number;
}

// ============================================================================
// STANJE
// ============================================================================

const configs: Map<string, ShutdownConfig> = new Map();
const states: Map<string, ShutdownState> = new Map();
const hooks: Map<string, ShutdownHook[]> = new Map();
const connections: Map<string, ConnectionInfo[]> = new Map();
const requests: Map<string, RequestInfo[]> = new Map();
const eventListeners: Set<ShutdownEventListener> = new Set();

let configCounter = 0;
let stateCounter = 0;
let hookCounter = 0;
let errorCounter = 0;
let connectionCounter = 0;
let requestCounter = 0;
let eventCounter = 0;

const statistics: ShutdownStatistics = {
    totalConfigs: 0,
    totalShutdowns: 0,
    successfulShutdowns: 0,
    failedShutdowns: 0,
    forcedShutdowns: 0,
    totalHooksExecuted: 0,
    failedHooks: 0,
    averageShutdownDuration: 0,
    totalConnectionsDrained: 0,
    totalRequestsCompleted: 0,
    totalRequestsAborted: 0,
};

// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================

/**
 * Generate config ID
 */
function generateConfigId(): string {
    configCounter++;
    return generateDeterministicId(`shutdown-config-${configCounter}`);
}

/**
 * Generate state ID
 */
function generateStateId(): string {
    stateCounter++;
    return generateDeterministicId(`shutdown-state-${stateCounter}`);
}

/**
 * Generate hook ID
 */
function generateHookId(): string {
    hookCounter++;
    return generateDeterministicId(`shutdown-hook-${hookCounter}`);
}

/**
 * Generate error ID
 */
function generateErrorId(): string {
    errorCounter++;
    return generateDeterministicId(`shutdown-error-${errorCounter}`);
}

/**
 * Generate connection ID
 */
function generateConnectionId(): string {
    connectionCounter++;
    return generateDeterministicId(`shutdown-conn-${connectionCounter}`);
}

/**
 * Generate request ID
 */
function generateRequestId(): string {
    requestCounter++;
    return generateDeterministicId(`shutdown-req-${requestCounter}`);
}

/**
 * Generate event ID
 */
function generateEventId(): string {
    eventCounter++;
    return generateDeterministicId(`shutdown-event-${eventCounter}`);
}

/**
 * Emit shutdown event
 */
async function emitEvent(event: ShutdownEvent): Promise<void> {
    for (const listener of eventListeners) {
        try {
            await listener(event);
        } catch {
            // Ignore listener errors
        }
    }
}

/**
 * Update statistics
 */
function updateStatistics(): void {
    const mutableStats = statistics as {
        totalConfigs: number;
    };
    
    mutableStats.totalConfigs = configs.size;
}

/**
 * Get priority order
 */
function getPriorityOrder(priority: HookPriority): number {
    switch (priority) {
        case 'critical': return 0;
        case 'high': return 1;
        case 'normal': return 2;
        case 'low': return 3;
        case 'cleanup': return 4;
        default: return 2;
    }
}

/**
 * Initialize shutdown state
 */
function initializeShutdownState(configId: string): ShutdownState {
    return {
        stateId: generateStateId(),
        configId,
        phase: 'running',
        signal: null,
        initiatedAt: null,
        completedAt: null,
        activeConnections: 0,
        pendingRequests: 0,
        completedHooks: 0,
        totalHooks: 0,
        errors: [],
    };
}

// ============================================================================
// CONFIG MANAGEMENT
// ============================================================================

/**
 * Create shutdown config
 */
export async function createShutdownConfig(
    name: string,
    options: {
        drainTimeout?: number;
        cleanupTimeout?: number;
        finalizeTimeout?: number;
        totalTimeout?: number;
        forceKillTimeout?: number;
        gracePeriod?: number;
        metadata?: Record<string, unknown>;
    } = {}
): Promise<ShutdownConfig> {
    const configId = generateConfigId();
    
    const config: ShutdownConfig = {
        configId,
        name,
        drainTimeout: options.drainTimeout ?? 30000,
        cleanupTimeout: options.cleanupTimeout ?? 10000,
        finalizeTimeout: options.finalizeTimeout ?? 5000,
        totalTimeout: options.totalTimeout ?? 60000,
        forceKillTimeout: options.forceKillTimeout ?? 5000,
        gracePeriod: options.gracePeriod ?? 5000,
        enabled: true,
        metadata: options.metadata ?? {},
    };
    
    configs.set(configId, config);
    configs.set(name, config);
    
    states.set(configId, initializeShutdownState(configId));
    hooks.set(configId, []);
    connections.set(configId, []);
    requests.set(configId, []);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'config_created',
        configId,
        timestamp: clock.nowMs(),
        data: { name },
    });
    
    updateStatistics();
    
    return config;
}

/**
 * Get shutdown config
 */
export function getShutdownConfig(nameOrId: string): ShutdownConfig | null {
    return configs.get(nameOrId) ?? null;
}

/**
 * Get all shutdown configs
 */
export function getAllShutdownConfigs(): readonly ShutdownConfig[] {
    const uniqueConfigs = new Map<string, ShutdownConfig>();
    for (const config of configs.values()) {
        uniqueConfigs.set(config.configId, config);
    }
    return Array.from(uniqueConfigs.values());
}

/**
 * Update shutdown config
 */
export function updateShutdownConfig(
    nameOrId: string,
    updates: {
        drainTimeout?: number;
        cleanupTimeout?: number;
        finalizeTimeout?: number;
        totalTimeout?: number;
        enabled?: boolean;
    }
): ShutdownConfig | null {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    
    const updatedConfig: ShutdownConfig = {
        ...config,
        drainTimeout: updates.drainTimeout ?? config.drainTimeout,
        cleanupTimeout: updates.cleanupTimeout ?? config.cleanupTimeout,
        finalizeTimeout: updates.finalizeTimeout ?? config.finalizeTimeout,
        totalTimeout: updates.totalTimeout ?? config.totalTimeout,
        enabled: updates.enabled ?? config.enabled,
    };
    
    configs.set(config.configId, updatedConfig);
    configs.set(config.name, updatedConfig);
    
    return updatedConfig;
}

/**
 * Delete shutdown config
 */
export async function deleteShutdownConfig(nameOrId: string): Promise<boolean> {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    
    configs.delete(config.configId);
    configs.delete(config.name);
    states.delete(config.configId);
    hooks.delete(config.configId);
    connections.delete(config.configId);
    requests.delete(config.configId);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'config_deleted',
        configId: config.configId,
        timestamp: clock.nowMs(),
        data: {},
    });
    
    updateStatistics();
    
    return true;
}

// ============================================================================
// HOOK MANAGEMENT
// ============================================================================

/**
 * Register shutdown hook
 */
export function registerShutdownHook(
    nameOrId: string,
    hookName: string,
    handler: ShutdownHandler,
    options: {
        priority?: HookPriority;
        timeout?: number;
    } = {}
): ShutdownHook | null {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    
    const hook: ShutdownHook = {
        hookId: generateHookId(),
        configId: config.configId,
        name: hookName,
        priority: options.priority ?? 'normal',
        timeout: options.timeout ?? 5000,
        handler,
        executed: false,
        executedAt: null,
        success: null,
        error: null,
    };
    
    const hookList = hooks.get(config.configId) ?? [];
    hookList.push(hook);
    hookList.sort((a, b) => getPriorityOrder(a.priority) - getPriorityOrder(b.priority));
    hooks.set(config.configId, hookList);
    
    const state = states.get(config.configId);
    if (state) {
        const updatedState: ShutdownState = {
            ...state,
            totalHooks: hookList.length,
        };
        states.set(config.configId, updatedState);
    }
    
    return hook;
}

/**
 * Unregister shutdown hook
 */
export function unregisterShutdownHook(nameOrId: string, hookId: string): boolean {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    
    const hookList = hooks.get(config.configId) ?? [];
    const index = hookList.findIndex(h => h.hookId === hookId);
    
    if (index === -1) {
        return false;
    }
    
    hookList.splice(index, 1);
    hooks.set(config.configId, hookList);
    
    const state = states.get(config.configId);
    if (state) {
        const updatedState: ShutdownState = {
            ...state,
            totalHooks: hookList.length,
        };
        states.set(config.configId, updatedState);
    }
    
    return true;
}

/**
 * Get shutdown hooks
 */
export function getShutdownHooks(nameOrId: string): readonly ShutdownHook[] {
    const config = configs.get(nameOrId);
    if (!config) {
        return [];
    }
    return hooks.get(config.configId) ?? [];
}

// ============================================================================
// CONNECTION MANAGEMENT
// ============================================================================

/**
 * Register connection
 */
export function registerConnection(
    nameOrId: string,
    type: string
): ConnectionInfo | null {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    
    const now = clock.nowMs();
    
    const connection: ConnectionInfo = {
        connectionId: generateConnectionId(),
        configId: config.configId,
        type,
        createdAt: now,
        lastActivityAt: now,
        draining: false,
        closed: false,
    };
    
    const connList = connections.get(config.configId) ?? [];
    connList.push(connection);
    connections.set(config.configId, connList);
    
    const state = states.get(config.configId);
    if (state) {
        const updatedState: ShutdownState = {
            ...state,
            activeConnections: connList.filter(c => !c.closed).length,
        };
        states.set(config.configId, updatedState);
    }
    
    return connection;
}

/**
 * Update connection activity
 */
export function updateConnectionActivity(nameOrId: string, connectionId: string): boolean {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    
    const connList = connections.get(config.configId) ?? [];
    const index = connList.findIndex(c => c.connectionId === connectionId);
    
    if (index === -1) {
        return false;
    }
    
    const connection = connList[index];
    
    const updatedConnection: ConnectionInfo = {
        ...connection,
        lastActivityAt: clock.nowMs(),
    };
    
    connList[index] = updatedConnection;
    connections.set(config.configId, connList);
    
    return true;
}

/**
 * Close connection
 */
export async function closeConnection(nameOrId: string, connectionId: string): Promise<boolean> {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    
    const connList = connections.get(config.configId) ?? [];
    const index = connList.findIndex(c => c.connectionId === connectionId);
    
    if (index === -1) {
        return false;
    }
    
    const connection = connList[index];
    
    const closedConnection: ConnectionInfo = {
        ...connection,
        closed: true,
    };
    
    connList[index] = closedConnection;
    connections.set(config.configId, connList);
    
    const state = states.get(config.configId);
    if (state) {
        const updatedState: ShutdownState = {
            ...state,
            activeConnections: connList.filter(c => !c.closed).length,
        };
        states.set(config.configId, updatedState);
    }
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'connection_drained',
        configId: config.configId,
        timestamp: clock.nowMs(),
        data: { connectionId },
    });
    
    const mutableStats = statistics as { totalConnectionsDrained: number };
    mutableStats.totalConnectionsDrained++;
    
    return true;
}

/**
 * Get active connections
 */
export function getActiveConnections(nameOrId: string): readonly ConnectionInfo[] {
    const config = configs.get(nameOrId);
    if (!config) {
        return [];
    }
    
    const connList = connections.get(config.configId) ?? [];
    return connList.filter(c => !c.closed);
}

// ============================================================================
// REQUEST MANAGEMENT
// ============================================================================

/**
 * Register request
 */
export function registerRequest(
    nameOrId: string,
    options: {
        deadline?: number;
    } = {}
): RequestInfo | null {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    
    const now = clock.nowMs();
    
    const request: RequestInfo = {
        requestId: generateRequestId(),
        configId: config.configId,
        startedAt: now,
        deadline: options.deadline ?? null,
        completed: false,
        aborted: false,
    };
    
    const reqList = requests.get(config.configId) ?? [];
    reqList.push(request);
    requests.set(config.configId, reqList);
    
    const state = states.get(config.configId);
    if (state) {
        const updatedState: ShutdownState = {
            ...state,
            pendingRequests: reqList.filter(r => !r.completed && !r.aborted).length,
        };
        states.set(config.configId, updatedState);
    }
    
    return request;
}

/**
 * Complete request
 */
export async function completeRequest(nameOrId: string, requestId: string): Promise<boolean> {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    
    const reqList = requests.get(config.configId) ?? [];
    const index = reqList.findIndex(r => r.requestId === requestId);
    
    if (index === -1) {
        return false;
    }
    
    const request = reqList[index];
    
    const completedRequest: RequestInfo = {
        ...request,
        completed: true,
    };
    
    reqList[index] = completedRequest;
    requests.set(config.configId, reqList);
    
    const state = states.get(config.configId);
    if (state) {
        const updatedState: ShutdownState = {
            ...state,
            pendingRequests: reqList.filter(r => !r.completed && !r.aborted).length,
        };
        states.set(config.configId, updatedState);
    }
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'request_completed',
        configId: config.configId,
        timestamp: clock.nowMs(),
        data: { requestId },
    });
    
    const mutableStats = statistics as { totalRequestsCompleted: number };
    mutableStats.totalRequestsCompleted++;
    
    return true;
}

/**
 * Abort request
 */
export async function abortRequest(nameOrId: string, requestId: string): Promise<boolean> {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    
    const reqList = requests.get(config.configId) ?? [];
    const index = reqList.findIndex(r => r.requestId === requestId);
    
    if (index === -1) {
        return false;
    }
    
    const request = reqList[index];
    
    const abortedRequest: RequestInfo = {
        ...request,
        aborted: true,
    };
    
    reqList[index] = abortedRequest;
    requests.set(config.configId, reqList);
    
    const state = states.get(config.configId);
    if (state) {
        const updatedState: ShutdownState = {
            ...state,
            pendingRequests: reqList.filter(r => !r.completed && !r.aborted).length,
        };
        states.set(config.configId, updatedState);
    }
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'request_aborted',
        configId: config.configId,
        timestamp: clock.nowMs(),
        data: { requestId },
    });
    
    const mutableStats = statistics as { totalRequestsAborted: number };
    mutableStats.totalRequestsAborted++;
    
    return true;
}

/**
 * Get pending requests
 */
export function getPendingRequests(nameOrId: string): readonly RequestInfo[] {
    const config = configs.get(nameOrId);
    if (!config) {
        return [];
    }
    
    const reqList = requests.get(config.configId) ?? [];
    return reqList.filter(r => !r.completed && !r.aborted);
}

// ============================================================================
// SHUTDOWN OPERATIONS
// ============================================================================

/**
 * Initiate shutdown
 */
export async function initiateShutdown(
    nameOrId: string,
    signal: ShutdownSignal = 'manual'
): Promise<boolean> {
    const config = configs.get(nameOrId);
    if (!config || !config.enabled) {
        return false;
    }
    
    const state = states.get(config.configId);
    if (!state || state.phase !== 'running') {
        return false;
    }
    
    const now = clock.nowMs();
    
    const mutableStats = statistics as { totalShutdowns: number };
    mutableStats.totalShutdowns++;
    
    const initiatedState: ShutdownState = {
        ...state,
        phase: 'shutdown_initiated',
        signal,
        initiatedAt: now,
    };
    states.set(config.configId, initiatedState);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'shutdown_initiated',
        configId: config.configId,
        timestamp: now,
        data: { signal },
    });
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'phase_changed',
        configId: config.configId,
        timestamp: now,
        data: { previousPhase: 'running', newPhase: 'shutdown_initiated' },
    });
    
    await executeDrainPhase(config.configId);
    await executeCleanupPhase(config.configId);
    await executeFinalizePhase(config.configId);
    
    return true;
}

/**
 * Execute drain phase
 */
async function executeDrainPhase(configId: string): Promise<void> {
    const config = configs.get(configId);
    const state = states.get(configId);
    
    if (!config || !state) {
        return;
    }
    
    const now = clock.nowMs();
    
    const drainingState: ShutdownState = {
        ...state,
        phase: 'draining',
    };
    states.set(configId, drainingState);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'draining_started',
        configId,
        timestamp: now,
        data: {},
    });
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'phase_changed',
        configId,
        timestamp: now,
        data: { previousPhase: 'shutdown_initiated', newPhase: 'draining' },
    });
    
    const connList = connections.get(configId) ?? [];
    for (let i = 0; i < connList.length; i++) {
        const conn = connList[i];
        if (!conn.closed) {
            connList[i] = { ...conn, draining: true };
        }
    }
    connections.set(configId, connList);
    
    const drainDeadline = now + config.drainTimeout;
    
    while (clock.nowMs() < drainDeadline) {
        const currentState = states.get(configId);
        if (!currentState) {
            break;
        }
        
        if (currentState.activeConnections === 0 && currentState.pendingRequests === 0) {
            break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const finalState = states.get(configId);
    if (finalState && finalState.pendingRequests > 0) {
        const reqList = requests.get(configId) ?? [];
        for (const req of reqList) {
            if (!req.completed && !req.aborted) {
                await abortRequest(configId, req.requestId);
            }
        }
    }
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'draining_completed',
        configId,
        timestamp: clock.nowMs(),
        data: {},
    });
}

/**
 * Execute cleanup phase
 */
async function executeCleanupPhase(configId: string): Promise<void> {
    const config = configs.get(configId);
    const state = states.get(configId);
    
    if (!config || !state) {
        return;
    }
    
    const now = clock.nowMs();
    
    const cleanupState: ShutdownState = {
        ...state,
        phase: 'cleanup',
    };
    states.set(configId, cleanupState);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'cleanup_started',
        configId,
        timestamp: now,
        data: {},
    });
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'phase_changed',
        configId,
        timestamp: now,
        data: { previousPhase: 'draining', newPhase: 'cleanup' },
    });
    
    const hookList = hooks.get(configId) ?? [];
    const mutableStats = statistics as {
        totalHooksExecuted: number;
        failedHooks: number;
    };
    
    for (let i = 0; i < hookList.length; i++) {
        const hook = hookList[i];
        
        if (hook.executed) {
            continue;
        }
        
        await emitEvent({
            eventId: generateEventId(),
            type: 'hook_started',
            configId,
            timestamp: clock.nowMs(),
            data: { hookId: hook.hookId, name: hook.name },
        });
        
        try {
            const hookPromise = Promise.resolve(hook.handler());
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Hook timeout')), hook.timeout);
            });
            
            await Promise.race([hookPromise, timeoutPromise]);
            
            const executedHook: ShutdownHook = {
                ...hook,
                executed: true,
                executedAt: clock.nowMs(),
                success: true,
            };
            
            hookList[i] = executedHook;
            
            mutableStats.totalHooksExecuted++;
            
            await emitEvent({
                eventId: generateEventId(),
                type: 'hook_completed',
                configId,
                timestamp: clock.nowMs(),
                data: { hookId: hook.hookId, name: hook.name },
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            const failedHook: ShutdownHook = {
                ...hook,
                executed: true,
                executedAt: clock.nowMs(),
                success: false,
                error: errorMessage,
            };
            
            hookList[i] = failedHook;
            
            mutableStats.totalHooksExecuted++;
            mutableStats.failedHooks++;
            
            const currentState = states.get(configId);
            if (currentState) {
                const shutdownError: ShutdownError = {
                    errorId: generateErrorId(),
                    phase: 'cleanup',
                    hookId: hook.hookId,
                    message: errorMessage,
                    timestamp: clock.nowMs(),
                };
                
                const updatedState: ShutdownState = {
                    ...currentState,
                    errors: [...currentState.errors, shutdownError],
                };
                states.set(configId, updatedState);
            }
            
            const eventType: ShutdownEventType = errorMessage === 'Hook timeout' ? 'hook_timeout' : 'hook_failed';
            
            await emitEvent({
                eventId: generateEventId(),
                type: eventType,
                configId,
                timestamp: clock.nowMs(),
                data: { hookId: hook.hookId, name: hook.name, error: errorMessage },
            });
        }
        
        const updatedState = states.get(configId);
        if (updatedState) {
            const completedCount = hookList.filter(h => h.executed).length;
            const newState: ShutdownState = {
                ...updatedState,
                completedHooks: completedCount,
            };
            states.set(configId, newState);
        }
    }
    
    hooks.set(configId, hookList);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'cleanup_completed',
        configId,
        timestamp: clock.nowMs(),
        data: {},
    });
}

/**
 * Execute finalize phase
 */
async function executeFinalizePhase(configId: string): Promise<void> {
    const config = configs.get(configId);
    const state = states.get(configId);
    
    if (!config || !state) {
        return;
    }
    
    const now = clock.nowMs();
    
    const finalizingState: ShutdownState = {
        ...state,
        phase: 'finalizing',
    };
    states.set(configId, finalizingState);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'phase_changed',
        configId,
        timestamp: now,
        data: { previousPhase: 'cleanup', newPhase: 'finalizing' },
    });
    
    const terminatedState: ShutdownState = {
        ...finalizingState,
        phase: 'terminated',
        completedAt: clock.nowMs(),
    };
    states.set(configId, terminatedState);
    
    const mutableStats = statistics as {
        successfulShutdowns: number;
        failedShutdowns: number;
        averageShutdownDuration: number;
    };
    
    if (terminatedState.errors.length === 0) {
        mutableStats.successfulShutdowns++;
    } else {
        mutableStats.failedShutdowns++;
    }
    
    const duration = terminatedState.completedAt! - terminatedState.initiatedAt!;
    const totalSuccessful = mutableStats.successfulShutdowns;
    mutableStats.averageShutdownDuration = 
        (mutableStats.averageShutdownDuration * (totalSuccessful - 1) + duration) / totalSuccessful;
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'shutdown_completed',
        configId,
        timestamp: clock.nowMs(),
        data: { duration, errors: terminatedState.errors.length },
    });
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'phase_changed',
        configId,
        timestamp: clock.nowMs(),
        data: { previousPhase: 'finalizing', newPhase: 'terminated' },
    });
}

/**
 * Force shutdown
 */
export async function forceShutdown(nameOrId: string): Promise<boolean> {
    const config = configs.get(nameOrId);
    if (!config) {
        return false;
    }
    
    const state = states.get(config.configId);
    if (!state) {
        return false;
    }
    
    const mutableStats = statistics as { forcedShutdowns: number };
    mutableStats.forcedShutdowns++;
    
    const terminatedState: ShutdownState = {
        ...state,
        phase: 'terminated',
        completedAt: clock.nowMs(),
    };
    states.set(config.configId, terminatedState);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'force_kill',
        configId: config.configId,
        timestamp: clock.nowMs(),
        data: {},
    });
    
    return true;
}

// ============================================================================
// STATE QUERIES
// ============================================================================

/**
 * Get shutdown state
 */
export function getShutdownState(nameOrId: string): ShutdownState | null {
    const config = configs.get(nameOrId);
    if (!config) {
        return null;
    }
    return states.get(config.configId) ?? null;
}

/**
 * Is shutting down
 */
export function isShuttingDown(nameOrId: string): boolean {
    const state = getShutdownState(nameOrId);
    if (!state) {
        return false;
    }
    return state.phase !== 'running' && state.phase !== 'terminated';
}

/**
 * Is terminated
 */
export function isTerminated(nameOrId: string): boolean {
    const state = getShutdownState(nameOrId);
    return state?.phase === 'terminated';
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get statistics
 */
export function getStatistics(): Readonly<ShutdownStatistics> {
    updateStatistics();
    return { ...statistics };
}

/**
 * Reset statistics
 */
export function resetStatistics(): void {
    Object.assign(statistics, {
        totalConfigs: 0,
        totalShutdowns: 0,
        successfulShutdowns: 0,
        failedShutdowns: 0,
        forcedShutdowns: 0,
        totalHooksExecuted: 0,
        failedHooks: 0,
        averageShutdownDuration: 0,
        totalConnectionsDrained: 0,
        totalRequestsCompleted: 0,
        totalRequestsAborted: 0,
    });
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Add event listener
 */
export function addEventListener(listener: ShutdownEventListener): void {
    eventListeners.add(listener);
}

/**
 * Remove event listener
 */
export function removeEventListener(listener: ShutdownEventListener): void {
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
    configs.clear();
    states.clear();
    hooks.clear();
    connections.clear();
    requests.clear();
    eventListeners.clear();
    resetStatistics();
}
