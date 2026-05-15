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
/**
 * Shutdown phase
 */
export type ShutdownPhase = 'running' | 'shutdown_initiated' | 'draining' | 'cleanup' | 'finalizing' | 'terminated';
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
export type ShutdownEventType = 'config_created' | 'config_deleted' | 'shutdown_initiated' | 'phase_changed' | 'draining_started' | 'draining_completed' | 'hook_started' | 'hook_completed' | 'hook_failed' | 'hook_timeout' | 'cleanup_started' | 'cleanup_completed' | 'connection_drained' | 'request_completed' | 'request_aborted' | 'shutdown_completed' | 'force_kill';
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
/**
 * Create shutdown config
 */
export declare function createShutdownConfig(name: string, options?: {
    drainTimeout?: number;
    cleanupTimeout?: number;
    finalizeTimeout?: number;
    totalTimeout?: number;
    forceKillTimeout?: number;
    gracePeriod?: number;
    metadata?: Record<string, unknown>;
}): Promise<ShutdownConfig>;
/**
 * Get shutdown config
 */
export declare function getShutdownConfig(nameOrId: string): ShutdownConfig | null;
/**
 * Get all shutdown configs
 */
export declare function getAllShutdownConfigs(): readonly ShutdownConfig[];
/**
 * Update shutdown config
 */
export declare function updateShutdownConfig(nameOrId: string, updates: {
    drainTimeout?: number;
    cleanupTimeout?: number;
    finalizeTimeout?: number;
    totalTimeout?: number;
    enabled?: boolean;
}): ShutdownConfig | null;
/**
 * Delete shutdown config
 */
export declare function deleteShutdownConfig(nameOrId: string): Promise<boolean>;
/**
 * Register shutdown hook
 */
export declare function registerShutdownHook(nameOrId: string, hookName: string, handler: ShutdownHandler, options?: {
    priority?: HookPriority;
    timeout?: number;
}): ShutdownHook | null;
/**
 * Unregister shutdown hook
 */
export declare function unregisterShutdownHook(nameOrId: string, hookId: string): boolean;
/**
 * Get shutdown hooks
 */
export declare function getShutdownHooks(nameOrId: string): readonly ShutdownHook[];
/**
 * Register connection
 */
export declare function registerConnection(nameOrId: string, type: string): ConnectionInfo | null;
/**
 * Update connection activity
 */
export declare function updateConnectionActivity(nameOrId: string, connectionId: string): boolean;
/**
 * Close connection
 */
export declare function closeConnection(nameOrId: string, connectionId: string): Promise<boolean>;
/**
 * Get active connections
 */
export declare function getActiveConnections(nameOrId: string): readonly ConnectionInfo[];
/**
 * Register request
 */
export declare function registerRequest(nameOrId: string, options?: {
    deadline?: number;
}): RequestInfo | null;
/**
 * Complete request
 */
export declare function completeRequest(nameOrId: string, requestId: string): Promise<boolean>;
/**
 * Abort request
 */
export declare function abortRequest(nameOrId: string, requestId: string): Promise<boolean>;
/**
 * Get pending requests
 */
export declare function getPendingRequests(nameOrId: string): readonly RequestInfo[];
/**
 * Initiate shutdown
 */
export declare function initiateShutdown(nameOrId: string, signal?: ShutdownSignal): Promise<boolean>;
/**
 * Force shutdown
 */
export declare function forceShutdown(nameOrId: string): Promise<boolean>;
/**
 * Get shutdown state
 */
export declare function getShutdownState(nameOrId: string): ShutdownState | null;
/**
 * Is shutting down
 */
export declare function isShuttingDown(nameOrId: string): boolean;
/**
 * Is terminated
 */
export declare function isTerminated(nameOrId: string): boolean;
/**
 * Get statistics
 */
export declare function getStatistics(): Readonly<ShutdownStatistics>;
/**
 * Reset statistics
 */
export declare function resetStatistics(): void;
/**
 * Add event listener
 */
export declare function addEventListener(listener: ShutdownEventListener): void;
/**
 * Remove event listener
 */
export declare function removeEventListener(listener: ShutdownEventListener): void;
/**
 * Clear event listeners
 */
export declare function clearEventListeners(): void;
/**
 * Clear all state
 */
export declare function clearAll(): void;
