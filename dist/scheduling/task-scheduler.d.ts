/**
 * @file Task Scheduler za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-SCHED-001 Task scheduling za zaledne sisteme
 * @design DSN-ZALEDNI-SCHED-001 Backend task scheduler arhitektura
 * @test TEST-ZALEDNI-SCHED-001 Preverjanje task scheduler
 *
 * Task Scheduler - prilagojen za zaledne sisteme:
 * - Cron-based scheduling
 * - One-time task scheduling
 * - Recurring tasks
 * - Task prioritization
 * - Task dependencies
 * - Distributed locking
 * - Task history
 * - Failure handling
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom SCHED_001 - Task Scheduler
 */
/**
 * Task status
 */
export type TaskStatus = 'pending' | 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout' | 'skipped';
/**
 * Task priority
 */
export type TaskPriority = 'critical' | 'high' | 'normal' | 'low';
/**
 * Schedule type
 */
export type ScheduleType = 'once' | 'cron' | 'interval' | 'fixed_delay';
/**
 * Task definition
 */
export interface TaskDefinition {
    readonly taskId: string;
    readonly name: string;
    readonly description: string;
    readonly handler: TaskHandler;
    readonly schedule: TaskSchedule;
    readonly priority: TaskPriority;
    readonly timeout: number;
    readonly retryPolicy: TaskRetryPolicy;
    readonly dependencies: readonly string[];
    readonly tags: readonly string[];
    readonly metadata: Readonly<Record<string, unknown>>;
    readonly enabled: boolean;
    readonly exclusive: boolean;
    readonly maxConcurrent: number;
}
/**
 * Task schedule
 */
export interface TaskSchedule {
    readonly type: ScheduleType;
    readonly cronExpression: string | null;
    readonly interval: number | null;
    readonly startAt: number | null;
    readonly endAt: number | null;
    readonly timezone: string;
}
/**
 * Task retry policy
 */
export interface TaskRetryPolicy {
    readonly maxRetries: number;
    readonly initialDelay: number;
    readonly maxDelay: number;
    readonly backoffMultiplier: number;
    readonly retryableErrors: readonly string[];
}
/**
 * Task handler
 */
export type TaskHandler = (context: TaskContext) => Promise<TaskResult>;
/**
 * Task context
 */
export interface TaskContext {
    readonly executionId: string;
    readonly taskId: string;
    readonly taskName: string;
    readonly scheduledAt: number;
    readonly startedAt: number;
    readonly attempt: number;
    readonly maxAttempts: number;
    readonly timeout: number;
    readonly metadata: Readonly<Record<string, unknown>>;
    readonly signal: AbortSignal;
    progress(percent: number, message?: string): void;
    checkpoint(data: unknown): Promise<void>;
    getCheckpoint<T>(): Promise<T | null>;
}
/**
 * Task result
 */
export interface TaskResult {
    readonly success: boolean;
    readonly data: unknown;
    readonly error: string | null;
    readonly duration: number;
    readonly metrics: Readonly<Record<string, number>>;
}
/**
 * Task execution
 */
export interface TaskExecution {
    readonly executionId: string;
    readonly taskId: string;
    readonly taskName: string;
    readonly status: TaskStatus;
    readonly scheduledAt: number;
    readonly startedAt: number | null;
    readonly completedAt: number | null;
    readonly attempt: number;
    readonly result: TaskResult | null;
    readonly progress: number;
    readonly progressMessage: string | null;
    readonly checkpoint: unknown;
    readonly error: string | null;
    readonly stackTrace: string | null;
}
/**
 * Task history entry
 */
export interface TaskHistoryEntry {
    readonly executionId: string;
    readonly taskId: string;
    readonly taskName: string;
    readonly status: TaskStatus;
    readonly scheduledAt: number;
    readonly startedAt: number;
    readonly completedAt: number;
    readonly duration: number;
    readonly attempt: number;
    readonly success: boolean;
    readonly error: string | null;
}
/**
 * Scheduler configuration
 */
export interface SchedulerConfig {
    readonly maxConcurrentTasks: number;
    readonly defaultTimeout: number;
    readonly defaultRetryPolicy: TaskRetryPolicy;
    readonly historyRetention: number;
    readonly cleanupInterval: number;
    readonly lockTimeout: number;
    readonly heartbeatInterval: number;
    readonly enableDistributedLocking: boolean;
    readonly schedulerId: string;
}
/**
 * Scheduler statistics
 */
export interface SchedulerStatistics {
    readonly totalTasks: number;
    readonly activeTasks: number;
    readonly pendingTasks: number;
    readonly completedTasks: number;
    readonly failedTasks: number;
    readonly cancelledTasks: number;
    readonly avgExecutionTime: number;
    readonly successRate: number;
    readonly throughput: number;
    readonly uptime: number;
}
/**
 * Distributed lock
 */
export interface DistributedLock {
    readonly lockId: string;
    readonly taskId: string;
    readonly ownerId: string;
    readonly acquiredAt: number;
    readonly expiresAt: number;
    readonly renewCount: number;
}
/**
 * Cron field
 */
export interface CronField {
    readonly type: 'value' | 'range' | 'step' | 'list' | 'any';
    readonly values: readonly number[];
    readonly step: number | null;
    readonly min: number;
    readonly max: number;
}
/**
 * Parsed cron expression
 */
export interface ParsedCron {
    readonly minute: CronField;
    readonly hour: CronField;
    readonly dayOfMonth: CronField;
    readonly month: CronField;
    readonly dayOfWeek: CronField;
    readonly second: CronField | null;
}
/**
 * Task event
 */
export interface TaskEvent {
    readonly eventId: string;
    readonly type: TaskEventType;
    readonly taskId: string;
    readonly executionId: string | null;
    readonly timestamp: number;
    readonly data: Readonly<Record<string, unknown>>;
}
/**
 * Task event type
 */
export type TaskEventType = 'task_registered' | 'task_unregistered' | 'task_enabled' | 'task_disabled' | 'execution_scheduled' | 'execution_started' | 'execution_completed' | 'execution_failed' | 'execution_cancelled' | 'execution_timeout' | 'execution_retried' | 'progress_updated' | 'checkpoint_saved';
/**
 * Task event listener
 */
export type TaskEventListener = (event: TaskEvent) => void | Promise<void>;
/**
 * Parse cron expression
 */
export declare function parseCronExpression(expression: string): ParsedCron;
/**
 * Get next cron execution time
 */
export declare function getNextCronExecution(expression: string, after?: number): number;
/**
 * Register task
 */
export declare function registerTask(name: string, handler: TaskHandler, options?: {
    description?: string;
    schedule?: Partial<TaskSchedule>;
    priority?: TaskPriority;
    timeout?: number;
    retryPolicy?: Partial<TaskRetryPolicy>;
    dependencies?: readonly string[];
    tags?: readonly string[];
    metadata?: Record<string, unknown>;
    enabled?: boolean;
    exclusive?: boolean;
    maxConcurrent?: number;
}): TaskDefinition;
/**
 * Unregister task
 */
export declare function unregisterTask(taskId: string): boolean;
/**
 * Enable task
 */
export declare function enableTask(taskId: string): boolean;
/**
 * Disable task
 */
export declare function disableTask(taskId: string): boolean;
/**
 * Get task
 */
export declare function getTask(taskId: string): TaskDefinition | null;
/**
 * Get all tasks
 */
export declare function getAllTasks(): readonly TaskDefinition[];
/**
 * Get tasks by tag
 */
export declare function getTasksByTag(tag: string): readonly TaskDefinition[];
/**
 * Schedule task execution
 */
export declare function scheduleTask(taskId: string, scheduledAt?: number): TaskExecution | null;
/**
 * Schedule task with cron
 */
export declare function scheduleTaskWithCron(taskId: string, cronExpression: string): TaskExecution | null;
/**
 * Cancel task execution
 */
export declare function cancelExecution(executionId: string): boolean;
/**
 * Get execution
 */
export declare function getExecution(executionId: string): TaskExecution | null;
/**
 * Get executions for task
 */
export declare function getExecutionsForTask(taskId: string): readonly TaskExecution[];
/**
 * Get pending executions
 */
export declare function getPendingExecutions(): readonly TaskExecution[];
/**
 * Execute task
 */
export declare function executeTask(executionId: string): Promise<TaskResult>;
/**
 * Acquire lock
 */
export declare function acquireLock(taskId: string): Promise<DistributedLock | null>;
/**
 * Release lock
 */
export declare function releaseLock(taskId: string): Promise<boolean>;
/**
 * Renew lock
 */
export declare function renewLock(taskId: string): Promise<boolean>;
/**
 * Start scheduler
 */
export declare function start(): void;
/**
 * Stop scheduler
 */
export declare function stop(): void;
/**
 * Process pending tasks
 */
export declare function processPendingTasks(): Promise<number>;
/**
 * Get task history
 */
export declare function getHistory(options?: {
    taskId?: string;
    status?: TaskStatus;
    fromDate?: number;
    toDate?: number;
    limit?: number;
}): readonly TaskHistoryEntry[];
/**
 * Cleanup old history
 */
export declare function cleanupHistory(): number;
/**
 * Cleanup completed executions
 */
export declare function cleanupExecutions(): number;
/**
 * Configure scheduler
 */
export declare function configure(newConfig: Partial<SchedulerConfig>): void;
/**
 * Get configuration
 */
export declare function getConfig(): Readonly<SchedulerConfig>;
/**
 * Get statistics
 */
export declare function getStatistics(): Readonly<SchedulerStatistics>;
/**
 * Reset statistics
 */
export declare function resetStatistics(): void;
/**
 * Add event listener
 */
export declare function addEventListener(listener: TaskEventListener): void;
/**
 * Remove event listener
 */
export declare function removeEventListener(listener: TaskEventListener): void;
/**
 * Clear event listeners
 */
export declare function clearEventListeners(): void;
/**
 * Clear all state
 */
export declare function clearAll(): void;
