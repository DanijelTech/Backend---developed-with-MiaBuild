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

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI ZA TASK SCHEDULER
// ============================================================================

/**
 * Task status
 */
export type TaskStatus = 
    | 'pending'
    | 'scheduled'
    | 'running'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'timeout'
    | 'skipped';

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
export type TaskEventType =
    | 'task_registered'
    | 'task_unregistered'
    | 'task_enabled'
    | 'task_disabled'
    | 'execution_scheduled'
    | 'execution_started'
    | 'execution_completed'
    | 'execution_failed'
    | 'execution_cancelled'
    | 'execution_timeout'
    | 'execution_retried'
    | 'progress_updated'
    | 'checkpoint_saved';

/**
 * Task event listener
 */
export type TaskEventListener = (event: TaskEvent) => void | Promise<void>;

// ============================================================================
// STANJE
// ============================================================================

const tasks: Map<string, TaskDefinition> = new Map();
const executions: Map<string, TaskExecution> = new Map();
const history: TaskHistoryEntry[] = [];
const locks: Map<string, DistributedLock> = new Map();
const eventListeners: Set<TaskEventListener> = new Set();
const checkpoints: Map<string, unknown> = new Map();

let taskCounter = 0;
let executionCounter = 0;
let eventCounter = 0;
let lockCounter = 0;
let startTime = 0;

let config: SchedulerConfig = {
    maxConcurrentTasks: 10,
    defaultTimeout: 300000,
    defaultRetryPolicy: {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 60000,
        backoffMultiplier: 2,
        retryableErrors: ['TIMEOUT', 'TEMPORARY_ERROR', 'NETWORK_ERROR'],
    },
    historyRetention: 604800000,
    cleanupInterval: 3600000,
    lockTimeout: 60000,
    heartbeatInterval: 10000,
    enableDistributedLocking: false,
    schedulerId: 'scheduler-1',
};

const statistics: SchedulerStatistics = {
    totalTasks: 0,
    activeTasks: 0,
    pendingTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    cancelledTasks: 0,
    avgExecutionTime: 0,
    successRate: 0,
    throughput: 0,
    uptime: 0,
};

// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================

/**
 * Generate task ID
 */
function generateTaskId(): string {
    taskCounter++;
    return generateDeterministicId(`task-${taskCounter}`);
}

/**
 * Generate execution ID
 */
function generateExecutionId(): string {
    executionCounter++;
    return generateDeterministicId(`execution-${executionCounter}`);
}

/**
 * Generate event ID
 */
function generateEventId(): string {
    eventCounter++;
    return generateDeterministicId(`task-event-${eventCounter}`);
}

/**
 * Generate lock ID
 */
function generateLockId(): string {
    lockCounter++;
    return generateDeterministicId(`lock-${lockCounter}`);
}

/**
 * Get priority value
 */
function getPriorityValue(priority: TaskPriority): number {
    switch (priority) {
        case 'critical': return 4;
        case 'high': return 3;
        case 'normal': return 2;
        case 'low': return 1;
    }
}

/**
 * Calculate retry delay
 */
function calculateRetryDelay(attempt: number, policy: TaskRetryPolicy): number {
    const delay = policy.initialDelay * Math.pow(policy.backoffMultiplier, attempt - 1);
    return Math.min(delay, policy.maxDelay);
}

/**
 * Emit task event
 */
async function emitEvent(event: TaskEvent): Promise<void> {
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
        totalTasks: number;
        activeTasks: number;
        pendingTasks: number;
        completedTasks: number;
        failedTasks: number;
        cancelledTasks: number;
        successRate: number;
        uptime: number;
    };
    
    mutableStats.totalTasks = tasks.size;
    mutableStats.activeTasks = Array.from(executions.values()).filter(e => e.status === 'running').length;
    mutableStats.pendingTasks = Array.from(executions.values()).filter(e => e.status === 'pending' || e.status === 'scheduled').length;
    mutableStats.completedTasks = history.filter(h => h.success).length;
    mutableStats.failedTasks = history.filter(h => !h.success).length;
    mutableStats.cancelledTasks = history.filter(h => h.status === 'cancelled').length;
    
    const total = mutableStats.completedTasks + mutableStats.failedTasks;
    mutableStats.successRate = total > 0 ? mutableStats.completedTasks / total : 0;
    mutableStats.uptime = startTime > 0 ? clock.nowMs() - startTime : 0;
}

// ============================================================================
// CRON PARSING
// ============================================================================

/**
 * Parse cron field
 */
function parseCronField(field: string, min: number, max: number): CronField {
    if (field === '*') {
        return { type: 'any', values: [], step: null, min, max };
    }
    
    if (field.includes('/')) {
        const [range, stepStr] = field.split('/');
        const step = parseInt(stepStr, 10);
        const values: number[] = [];
        
        let start = min;
        let end = max;
        
        if (range !== '*') {
            if (range.includes('-')) {
                const [startStr, endStr] = range.split('-');
                start = parseInt(startStr, 10);
                end = parseInt(endStr, 10);
            } else {
                start = parseInt(range, 10);
            }
        }
        
        for (let i = start; i <= end; i += step) {
            values.push(i);
        }
        
        return { type: 'step', values, step, min, max };
    }
    
    if (field.includes(',')) {
        const values = field.split(',').map(v => parseInt(v.trim(), 10));
        return { type: 'list', values, step: null, min, max };
    }
    
    if (field.includes('-')) {
        const [startStr, endStr] = field.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        const values: number[] = [];
        
        for (let i = start; i <= end; i++) {
            values.push(i);
        }
        
        return { type: 'range', values, step: null, min, max };
    }
    
    const value = parseInt(field, 10);
    return { type: 'value', values: [value], step: null, min, max };
}

/**
 * Parse cron expression
 */
export function parseCronExpression(expression: string): ParsedCron {
    const parts = expression.trim().split(/\s+/);
    
    if (parts.length === 5) {
        return {
            minute: parseCronField(parts[0], 0, 59),
            hour: parseCronField(parts[1], 0, 23),
            dayOfMonth: parseCronField(parts[2], 1, 31),
            month: parseCronField(parts[3], 1, 12),
            dayOfWeek: parseCronField(parts[4], 0, 6),
            second: null,
        };
    }
    
    if (parts.length === 6) {
        return {
            second: parseCronField(parts[0], 0, 59),
            minute: parseCronField(parts[1], 0, 59),
            hour: parseCronField(parts[2], 0, 23),
            dayOfMonth: parseCronField(parts[3], 1, 31),
            month: parseCronField(parts[4], 1, 12),
            dayOfWeek: parseCronField(parts[5], 0, 6),
        };
    }
    
    throw new Error(`Invalid cron expression: ${expression}`);
}

/**
 * Check if cron field matches value
 */
function cronFieldMatches(field: CronField, value: number): boolean {
    if (field.type === 'any') {
        return true;
    }
    return field.values.includes(value);
}

/**
 * Check if cron matches date
 */
function cronMatchesDate(cron: ParsedCron, date: Date): boolean {
    const minute = date.getMinutes();
    const hour = date.getHours();
    const dayOfMonth = date.getDate();
    const month = date.getMonth() + 1;
    const dayOfWeek = date.getDay();
    
    if (!cronFieldMatches(cron.minute, minute)) return false;
    if (!cronFieldMatches(cron.hour, hour)) return false;
    if (!cronFieldMatches(cron.dayOfMonth, dayOfMonth)) return false;
    if (!cronFieldMatches(cron.month, month)) return false;
    if (!cronFieldMatches(cron.dayOfWeek, dayOfWeek)) return false;
    
    if (cron.second !== null) {
        const second = date.getSeconds();
        if (!cronFieldMatches(cron.second, second)) return false;
    }
    
    return true;
}

/**
 * Get next cron execution time
 */
export function getNextCronExecution(expression: string, after: number = clock.nowMs()): number {
    const cron = parseCronExpression(expression);
    const date = new Date(after);
    
    date.setSeconds(0);
    date.setMilliseconds(0);
    date.setMinutes(date.getMinutes() + 1);
    
    const maxIterations = 366 * 24 * 60;
    
    for (let i = 0; i < maxIterations; i++) {
        if (cronMatchesDate(cron, date)) {
            return date.getTime();
        }
        date.setMinutes(date.getMinutes() + 1);
    }
    
    throw new Error(`Could not find next execution time for cron: ${expression}`);
}

// ============================================================================
// TASK REGISTRATION
// ============================================================================

/**
 * Register task
 */
export function registerTask(
    name: string,
    handler: TaskHandler,
    options: {
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
    } = {}
): TaskDefinition {
    const taskId = generateTaskId();
    const now = clock.nowMs();
    
    const schedule: TaskSchedule = {
        type: options.schedule?.type ?? 'once',
        cronExpression: options.schedule?.cronExpression ?? null,
        interval: options.schedule?.interval ?? null,
        startAt: options.schedule?.startAt ?? now,
        endAt: options.schedule?.endAt ?? null,
        timezone: options.schedule?.timezone ?? 'UTC',
    };
    
    const retryPolicy: TaskRetryPolicy = {
        ...config.defaultRetryPolicy,
        ...options.retryPolicy,
    };
    
    const task: TaskDefinition = {
        taskId,
        name,
        description: options.description ?? '',
        handler,
        schedule,
        priority: options.priority ?? 'normal',
        timeout: options.timeout ?? config.defaultTimeout,
        retryPolicy,
        dependencies: options.dependencies ?? [],
        tags: options.tags ?? [],
        metadata: options.metadata ?? {},
        enabled: options.enabled ?? true,
        exclusive: options.exclusive ?? false,
        maxConcurrent: options.maxConcurrent ?? 1,
    };
    
    tasks.set(taskId, task);
    
    emitEvent({
        eventId: generateEventId(),
        type: 'task_registered',
        taskId,
        executionId: null,
        timestamp: now,
        data: { name, schedule },
    });
    
    return task;
}

/**
 * Unregister task
 */
export function unregisterTask(taskId: string): boolean {
    const task = tasks.get(taskId);
    if (!task) {
        return false;
    }
    
    tasks.delete(taskId);
    
    emitEvent({
        eventId: generateEventId(),
        type: 'task_unregistered',
        taskId,
        executionId: null,
        timestamp: clock.nowMs(),
        data: { name: task.name },
    });
    
    return true;
}

/**
 * Enable task
 */
export function enableTask(taskId: string): boolean {
    const task = tasks.get(taskId);
    if (!task) {
        return false;
    }
    
    tasks.set(taskId, { ...task, enabled: true });
    
    emitEvent({
        eventId: generateEventId(),
        type: 'task_enabled',
        taskId,
        executionId: null,
        timestamp: clock.nowMs(),
        data: {},
    });
    
    return true;
}

/**
 * Disable task
 */
export function disableTask(taskId: string): boolean {
    const task = tasks.get(taskId);
    if (!task) {
        return false;
    }
    
    tasks.set(taskId, { ...task, enabled: false });
    
    emitEvent({
        eventId: generateEventId(),
        type: 'task_disabled',
        taskId,
        executionId: null,
        timestamp: clock.nowMs(),
        data: {},
    });
    
    return true;
}

/**
 * Get task
 */
export function getTask(taskId: string): TaskDefinition | null {
    return tasks.get(taskId) ?? null;
}

/**
 * Get all tasks
 */
export function getAllTasks(): readonly TaskDefinition[] {
    return Array.from(tasks.values());
}

/**
 * Get tasks by tag
 */
export function getTasksByTag(tag: string): readonly TaskDefinition[] {
    return Array.from(tasks.values()).filter(t => t.tags.includes(tag));
}

// ============================================================================
// TASK SCHEDULING
// ============================================================================

/**
 * Schedule task execution
 */
export function scheduleTask(taskId: string, scheduledAt?: number): TaskExecution | null {
    const task = tasks.get(taskId);
    if (!task || !task.enabled) {
        return null;
    }
    
    const executionId = generateExecutionId();
    const now = clock.nowMs();
    const scheduleTime = scheduledAt ?? now;
    
    const execution: TaskExecution = {
        executionId,
        taskId,
        taskName: task.name,
        status: scheduleTime > now ? 'scheduled' : 'pending',
        scheduledAt: scheduleTime,
        startedAt: null,
        completedAt: null,
        attempt: 1,
        result: null,
        progress: 0,
        progressMessage: null,
        checkpoint: null,
        error: null,
        stackTrace: null,
    };
    
    executions.set(executionId, execution);
    
    emitEvent({
        eventId: generateEventId(),
        type: 'execution_scheduled',
        taskId,
        executionId,
        timestamp: now,
        data: { scheduledAt: scheduleTime },
    });
    
    return execution;
}

/**
 * Schedule task with cron
 */
export function scheduleTaskWithCron(taskId: string, cronExpression: string): TaskExecution | null {
    const nextExecution = getNextCronExecution(cronExpression);
    return scheduleTask(taskId, nextExecution);
}

/**
 * Cancel task execution
 */
export function cancelExecution(executionId: string): boolean {
    const execution = executions.get(executionId);
    if (!execution) {
        return false;
    }
    
    if (execution.status === 'completed' || execution.status === 'failed') {
        return false;
    }
    
    const now = clock.nowMs();
    
    executions.set(executionId, {
        ...execution,
        status: 'cancelled',
        completedAt: now,
    });
    
    addToHistory(execution, 'cancelled', now);
    
    emitEvent({
        eventId: generateEventId(),
        type: 'execution_cancelled',
        taskId: execution.taskId,
        executionId,
        timestamp: now,
        data: {},
    });
    
    return true;
}

/**
 * Get execution
 */
export function getExecution(executionId: string): TaskExecution | null {
    return executions.get(executionId) ?? null;
}

/**
 * Get executions for task
 */
export function getExecutionsForTask(taskId: string): readonly TaskExecution[] {
    return Array.from(executions.values()).filter(e => e.taskId === taskId);
}

/**
 * Get pending executions
 */
export function getPendingExecutions(): readonly TaskExecution[] {
    return Array.from(executions.values())
        .filter(e => e.status === 'pending' || e.status === 'scheduled')
        .sort((a, b) => {
            const taskA = tasks.get(a.taskId);
            const taskB = tasks.get(b.taskId);
            const priorityA = taskA ? getPriorityValue(taskA.priority) : 0;
            const priorityB = taskB ? getPriorityValue(taskB.priority) : 0;
            
            if (priorityA !== priorityB) {
                return priorityB - priorityA;
            }
            
            return a.scheduledAt - b.scheduledAt;
        });
}

// ============================================================================
// TASK EXECUTION
// ============================================================================

/**
 * Execute task
 */
export async function executeTask(executionId: string): Promise<TaskResult> {
    const execution = executions.get(executionId);
    if (!execution) {
        throw new Error(`Execution ${executionId} not found`);
    }
    
    const task = tasks.get(execution.taskId);
    if (!task) {
        throw new Error(`Task ${execution.taskId} not found`);
    }
    
    const now = clock.nowMs();
    
    if (task.exclusive && config.enableDistributedLocking) {
        const lock = await acquireLock(task.taskId);
        if (!lock) {
            executions.set(executionId, {
                ...execution,
                status: 'skipped',
                completedAt: now,
                error: 'Could not acquire lock',
            });
            return {
                success: false,
                data: null,
                error: 'Could not acquire lock',
                duration: 0,
                metrics: {},
            };
        }
    }
    
    executions.set(executionId, {
        ...execution,
        status: 'running',
        startedAt: now,
    });
    
    emitEvent({
        eventId: generateEventId(),
        type: 'execution_started',
        taskId: task.taskId,
        executionId,
        timestamp: now,
        data: { attempt: execution.attempt },
    });
    
    const abortController = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    if (task.timeout > 0) {
        timeoutId = setTimeout(() => {
            abortController.abort();
        }, task.timeout);
    }
    
    const context: TaskContext = {
        executionId,
        taskId: task.taskId,
        taskName: task.name,
        scheduledAt: execution.scheduledAt,
        startedAt: now,
        attempt: execution.attempt,
        maxAttempts: task.retryPolicy.maxRetries + 1,
        timeout: task.timeout,
        metadata: task.metadata,
        signal: abortController.signal,
        progress: (percent: number, message?: string) => {
            const currentExecution = executions.get(executionId);
            if (currentExecution) {
                executions.set(executionId, {
                    ...currentExecution,
                    progress: percent,
                    progressMessage: message ?? null,
                });
                
                emitEvent({
                    eventId: generateEventId(),
                    type: 'progress_updated',
                    taskId: task.taskId,
                    executionId,
                    timestamp: clock.nowMs(),
                    data: { percent, message },
                });
            }
        },
        checkpoint: async (data: unknown) => {
            checkpoints.set(executionId, data);
            const currentExecution = executions.get(executionId);
            if (currentExecution) {
                executions.set(executionId, {
                    ...currentExecution,
                    checkpoint: data,
                });
            }
            
            emitEvent({
                eventId: generateEventId(),
                type: 'checkpoint_saved',
                taskId: task.taskId,
                executionId,
                timestamp: clock.nowMs(),
                data: {},
            });
        },
        getCheckpoint: async <T>() => {
            return (checkpoints.get(executionId) as T) ?? null;
        },
    };
    
    let result: TaskResult;
    
    try {
        result = await task.handler(context);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const stackTrace = error instanceof Error ? error.stack ?? null : null;
        
        const isTimeout = abortController.signal.aborted;
        
        result = {
            success: false,
            data: null,
            error: isTimeout ? 'Task timeout' : errorMessage,
            duration: clock.nowMs() - now,
            metrics: {},
        };
        
        const currentExecution = executions.get(executionId);
        if (currentExecution) {
            executions.set(executionId, {
                ...currentExecution,
                error: result.error,
                stackTrace,
            });
        }
    } finally {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }
        
        if (task.exclusive && config.enableDistributedLocking) {
            await releaseLock(task.taskId);
        }
    }
    
    const completedAt = clock.nowMs();
    const finalStatus: TaskStatus = result.success ? 'completed' : 'failed';
    
    executions.set(executionId, {
        ...executions.get(executionId)!,
        status: finalStatus,
        completedAt,
        result,
        progress: result.success ? 100 : executions.get(executionId)!.progress,
    });
    
    addToHistory(executions.get(executionId)!, finalStatus, completedAt);
    
    emitEvent({
        eventId: generateEventId(),
        type: result.success ? 'execution_completed' : 'execution_failed',
        taskId: task.taskId,
        executionId,
        timestamp: completedAt,
        data: { duration: result.duration, success: result.success },
    });
    
    if (!result.success && execution.attempt < task.retryPolicy.maxRetries + 1) {
        const shouldRetry = task.retryPolicy.retryableErrors.length === 0 ||
            task.retryPolicy.retryableErrors.some(e => result.error?.includes(e));
        
        if (shouldRetry) {
            const delay = calculateRetryDelay(execution.attempt, task.retryPolicy);
            const retryExecution = scheduleTask(task.taskId, completedAt + delay);
            
            if (retryExecution) {
                executions.set(retryExecution.executionId, {
                    ...retryExecution,
                    attempt: execution.attempt + 1,
                    checkpoint: execution.checkpoint,
                });
                
                emitEvent({
                    eventId: generateEventId(),
                    type: 'execution_retried',
                    taskId: task.taskId,
                    executionId: retryExecution.executionId,
                    timestamp: completedAt,
                    data: { attempt: execution.attempt + 1, delay },
                });
            }
        }
    }
    
    return result;
}

/**
 * Add execution to history
 */
function addToHistory(execution: TaskExecution, status: TaskStatus, completedAt: number): void {
    const entry: TaskHistoryEntry = {
        executionId: execution.executionId,
        taskId: execution.taskId,
        taskName: execution.taskName,
        status,
        scheduledAt: execution.scheduledAt,
        startedAt: execution.startedAt ?? completedAt,
        completedAt,
        duration: execution.startedAt ? completedAt - execution.startedAt : 0,
        attempt: execution.attempt,
        success: status === 'completed',
        error: execution.error,
    };
    
    history.push(entry);
    
    const mutableStats = statistics as { avgExecutionTime: number };
    const totalDuration = history.reduce((sum, h) => sum + h.duration, 0);
    mutableStats.avgExecutionTime = history.length > 0 ? totalDuration / history.length : 0;
}

// ============================================================================
// DISTRIBUTED LOCKING
// ============================================================================

/**
 * Acquire lock
 */
export async function acquireLock(taskId: string): Promise<DistributedLock | null> {
    const existingLock = locks.get(taskId);
    
    if (existingLock) {
        if (clock.nowMs() < existingLock.expiresAt) {
            return null;
        }
        locks.delete(taskId);
    }
    
    const now = clock.nowMs();
    const lock: DistributedLock = {
        lockId: generateLockId(),
        taskId,
        ownerId: config.schedulerId,
        acquiredAt: now,
        expiresAt: now + config.lockTimeout,
        renewCount: 0,
    };
    
    locks.set(taskId, lock);
    
    return lock;
}

/**
 * Release lock
 */
export async function releaseLock(taskId: string): Promise<boolean> {
    const lock = locks.get(taskId);
    
    if (!lock || lock.ownerId !== config.schedulerId) {
        return false;
    }
    
    locks.delete(taskId);
    
    return true;
}

/**
 * Renew lock
 */
export async function renewLock(taskId: string): Promise<boolean> {
    const lock = locks.get(taskId);
    
    if (!lock || lock.ownerId !== config.schedulerId) {
        return false;
    }
    
    const now = clock.nowMs();
    
    locks.set(taskId, {
        ...lock,
        expiresAt: now + config.lockTimeout,
        renewCount: lock.renewCount + 1,
    });
    
    return true;
}

// ============================================================================
// SCHEDULER CONTROL
// ============================================================================

/**
 * Start scheduler
 */
export function start(): void {
    startTime = clock.nowMs();
}

/**
 * Stop scheduler
 */
export function stop(): void {
    for (const execution of executions.values()) {
        if (execution.status === 'pending' || execution.status === 'scheduled') {
            cancelExecution(execution.executionId);
        }
    }
}

/**
 * Process pending tasks
 */
export async function processPendingTasks(): Promise<number> {
    const pending = getPendingExecutions();
    const now = clock.nowMs();
    let processed = 0;
    
    const running = Array.from(executions.values()).filter(e => e.status === 'running').length;
    const available = config.maxConcurrentTasks - running;
    
    for (const execution of pending.slice(0, available)) {
        if (execution.scheduledAt <= now) {
            const task = tasks.get(execution.taskId);
            if (task) {
                const dependenciesMet = task.dependencies.every(depId => {
                    const depTask = tasks.get(depId);
                    if (!depTask) return true;
                    
                    const depExecutions = getExecutionsForTask(depId);
                    return depExecutions.some(e => e.status === 'completed');
                });
                
                if (dependenciesMet) {
                    await executeTask(execution.executionId);
                    processed++;
                }
            }
        }
    }
    
    return processed;
}

// ============================================================================
// HISTORY AND CLEANUP
// ============================================================================

/**
 * Get task history
 */
export function getHistory(options: {
    taskId?: string;
    status?: TaskStatus;
    fromDate?: number;
    toDate?: number;
    limit?: number;
} = {}): readonly TaskHistoryEntry[] {
    let filtered = [...history];
    
    if (options.taskId) {
        filtered = filtered.filter(h => h.taskId === options.taskId);
    }
    
    if (options.status) {
        filtered = filtered.filter(h => h.status === options.status);
    }
    
    if (options.fromDate) {
        filtered = filtered.filter(h => h.completedAt >= options.fromDate!);
    }
    
    if (options.toDate) {
        filtered = filtered.filter(h => h.completedAt <= options.toDate!);
    }
    
    filtered.sort((a, b) => b.completedAt - a.completedAt);
    
    if (options.limit) {
        filtered = filtered.slice(0, options.limit);
    }
    
    return filtered;
}

/**
 * Cleanup old history
 */
export function cleanupHistory(): number {
    const cutoff = clock.nowMs() - config.historyRetention;
    const initialLength = history.length;
    
    const newHistory = history.filter(h => h.completedAt >= cutoff);
    history.length = 0;
    history.push(...newHistory);
    
    return initialLength - history.length;
}

/**
 * Cleanup completed executions
 */
export function cleanupExecutions(): number {
    let count = 0;
    
    for (const [executionId, execution] of executions) {
        if (execution.status === 'completed' || execution.status === 'failed' || execution.status === 'cancelled') {
            executions.delete(executionId);
            checkpoints.delete(executionId);
            count++;
        }
    }
    
    return count;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Configure scheduler
 */
export function configure(newConfig: Partial<SchedulerConfig>): void {
    config = { ...config, ...newConfig };
}

/**
 * Get configuration
 */
export function getConfig(): Readonly<SchedulerConfig> {
    return { ...config };
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get statistics
 */
export function getStatistics(): Readonly<SchedulerStatistics> {
    updateStatistics();
    return { ...statistics };
}

/**
 * Reset statistics
 */
export function resetStatistics(): void {
    Object.assign(statistics, {
        totalTasks: 0,
        activeTasks: 0,
        pendingTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        cancelledTasks: 0,
        avgExecutionTime: 0,
        successRate: 0,
        throughput: 0,
        uptime: 0,
    });
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Add event listener
 */
export function addEventListener(listener: TaskEventListener): void {
    eventListeners.add(listener);
}

/**
 * Remove event listener
 */
export function removeEventListener(listener: TaskEventListener): void {
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
    tasks.clear();
    executions.clear();
    history.length = 0;
    locks.clear();
    checkpoints.clear();
    eventListeners.clear();
    resetStatistics();
}
