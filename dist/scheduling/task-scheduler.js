"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCronExpression = parseCronExpression;
exports.getNextCronExecution = getNextCronExecution;
exports.registerTask = registerTask;
exports.unregisterTask = unregisterTask;
exports.enableTask = enableTask;
exports.disableTask = disableTask;
exports.getTask = getTask;
exports.getAllTasks = getAllTasks;
exports.getTasksByTag = getTasksByTag;
exports.scheduleTask = scheduleTask;
exports.scheduleTaskWithCron = scheduleTaskWithCron;
exports.cancelExecution = cancelExecution;
exports.getExecution = getExecution;
exports.getExecutionsForTask = getExecutionsForTask;
exports.getPendingExecutions = getPendingExecutions;
exports.executeTask = executeTask;
exports.acquireLock = acquireLock;
exports.releaseLock = releaseLock;
exports.renewLock = renewLock;
exports.start = start;
exports.stop = stop;
exports.processPendingTasks = processPendingTasks;
exports.getHistory = getHistory;
exports.cleanupHistory = cleanupHistory;
exports.cleanupExecutions = cleanupExecutions;
exports.configure = configure;
exports.getConfig = getConfig;
exports.getStatistics = getStatistics;
exports.resetStatistics = resetStatistics;
exports.addEventListener = addEventListener;
exports.removeEventListener = removeEventListener;
exports.clearEventListeners = clearEventListeners;
exports.clearAll = clearAll;
const clock_1 = require("@mia/core/clock");
const deterministic_1 = require("@mia/core/deterministic");
const clock = (0, clock_1.getClock)();
// ============================================================================
// STANJE
// ============================================================================
const tasks = new Map();
const executions = new Map();
const history = [];
const locks = new Map();
const eventListeners = new Set();
const checkpoints = new Map();
let taskCounter = 0;
let executionCounter = 0;
let eventCounter = 0;
let lockCounter = 0;
let startTime = 0;
let config = {
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
const statistics = {
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
function generateTaskId() {
    taskCounter++;
    return (0, deterministic_1.generateDeterministicId)(`task-${taskCounter}`);
}
/**
 * Generate execution ID
 */
function generateExecutionId() {
    executionCounter++;
    return (0, deterministic_1.generateDeterministicId)(`execution-${executionCounter}`);
}
/**
 * Generate event ID
 */
function generateEventId() {
    eventCounter++;
    return (0, deterministic_1.generateDeterministicId)(`task-event-${eventCounter}`);
}
/**
 * Generate lock ID
 */
function generateLockId() {
    lockCounter++;
    return (0, deterministic_1.generateDeterministicId)(`lock-${lockCounter}`);
}
/**
 * Get priority value
 */
function getPriorityValue(priority) {
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
function calculateRetryDelay(attempt, policy) {
    const delay = policy.initialDelay * Math.pow(policy.backoffMultiplier, attempt - 1);
    return Math.min(delay, policy.maxDelay);
}
/**
 * Emit task event
 */
async function emitEvent(event) {
    for (const listener of eventListeners) {
        try {
            await listener(event);
        }
        catch {
            // Ignore listener errors
        }
    }
}
/**
 * Update statistics
 */
function updateStatistics() {
    const mutableStats = statistics;
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
function parseCronField(field, min, max) {
    if (field === '*') {
        return { type: 'any', values: [], step: null, min, max };
    }
    if (field.includes('/')) {
        const [range, stepStr] = field.split('/');
        const step = parseInt(stepStr, 10);
        const values = [];
        let start = min;
        let end = max;
        if (range !== '*') {
            if (range.includes('-')) {
                const [startStr, endStr] = range.split('-');
                start = parseInt(startStr, 10);
                end = parseInt(endStr, 10);
            }
            else {
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
        const values = [];
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
function parseCronExpression(expression) {
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
function cronFieldMatches(field, value) {
    if (field.type === 'any') {
        return true;
    }
    return field.values.includes(value);
}
/**
 * Check if cron matches date
 */
function cronMatchesDate(cron, date) {
    const minute = date.getMinutes();
    const hour = date.getHours();
    const dayOfMonth = date.getDate();
    const month = date.getMonth() + 1;
    const dayOfWeek = date.getDay();
    if (!cronFieldMatches(cron.minute, minute))
        return false;
    if (!cronFieldMatches(cron.hour, hour))
        return false;
    if (!cronFieldMatches(cron.dayOfMonth, dayOfMonth))
        return false;
    if (!cronFieldMatches(cron.month, month))
        return false;
    if (!cronFieldMatches(cron.dayOfWeek, dayOfWeek))
        return false;
    if (cron.second !== null) {
        const second = date.getSeconds();
        if (!cronFieldMatches(cron.second, second))
            return false;
    }
    return true;
}
/**
 * Get next cron execution time
 */
function getNextCronExecution(expression, after = clock.nowMs()) {
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
function registerTask(name, handler, options = {}) {
    const taskId = generateTaskId();
    const now = clock.nowMs();
    const schedule = {
        type: options.schedule?.type ?? 'once',
        cronExpression: options.schedule?.cronExpression ?? null,
        interval: options.schedule?.interval ?? null,
        startAt: options.schedule?.startAt ?? now,
        endAt: options.schedule?.endAt ?? null,
        timezone: options.schedule?.timezone ?? 'UTC',
    };
    const retryPolicy = {
        ...config.defaultRetryPolicy,
        ...options.retryPolicy,
    };
    const task = {
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
function unregisterTask(taskId) {
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
function enableTask(taskId) {
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
function disableTask(taskId) {
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
function getTask(taskId) {
    return tasks.get(taskId) ?? null;
}
/**
 * Get all tasks
 */
function getAllTasks() {
    return Array.from(tasks.values());
}
/**
 * Get tasks by tag
 */
function getTasksByTag(tag) {
    return Array.from(tasks.values()).filter(t => t.tags.includes(tag));
}
// ============================================================================
// TASK SCHEDULING
// ============================================================================
/**
 * Schedule task execution
 */
function scheduleTask(taskId, scheduledAt) {
    const task = tasks.get(taskId);
    if (!task || !task.enabled) {
        return null;
    }
    const executionId = generateExecutionId();
    const now = clock.nowMs();
    const scheduleTime = scheduledAt ?? now;
    const execution = {
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
function scheduleTaskWithCron(taskId, cronExpression) {
    const nextExecution = getNextCronExecution(cronExpression);
    return scheduleTask(taskId, nextExecution);
}
/**
 * Cancel task execution
 */
function cancelExecution(executionId) {
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
function getExecution(executionId) {
    return executions.get(executionId) ?? null;
}
/**
 * Get executions for task
 */
function getExecutionsForTask(taskId) {
    return Array.from(executions.values()).filter(e => e.taskId === taskId);
}
/**
 * Get pending executions
 */
function getPendingExecutions() {
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
async function executeTask(executionId) {
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
    let timeoutId = null;
    if (task.timeout > 0) {
        timeoutId = setTimeout(() => {
            abortController.abort();
        }, task.timeout);
    }
    const context = {
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
        progress: (percent, message) => {
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
        checkpoint: async (data) => {
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
        getCheckpoint: async () => {
            return checkpoints.get(executionId) ?? null;
        },
    };
    let result;
    try {
        result = await task.handler(context);
    }
    catch (error) {
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
    }
    finally {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }
        if (task.exclusive && config.enableDistributedLocking) {
            await releaseLock(task.taskId);
        }
    }
    const completedAt = clock.nowMs();
    const finalStatus = result.success ? 'completed' : 'failed';
    executions.set(executionId, {
        ...executions.get(executionId),
        status: finalStatus,
        completedAt,
        result,
        progress: result.success ? 100 : executions.get(executionId).progress,
    });
    addToHistory(executions.get(executionId), finalStatus, completedAt);
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
function addToHistory(execution, status, completedAt) {
    const entry = {
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
    const mutableStats = statistics;
    const totalDuration = history.reduce((sum, h) => sum + h.duration, 0);
    mutableStats.avgExecutionTime = history.length > 0 ? totalDuration / history.length : 0;
}
// ============================================================================
// DISTRIBUTED LOCKING
// ============================================================================
/**
 * Acquire lock
 */
async function acquireLock(taskId) {
    const existingLock = locks.get(taskId);
    if (existingLock) {
        if (clock.nowMs() < existingLock.expiresAt) {
            return null;
        }
        locks.delete(taskId);
    }
    const now = clock.nowMs();
    const lock = {
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
async function releaseLock(taskId) {
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
async function renewLock(taskId) {
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
function start() {
    startTime = clock.nowMs();
}
/**
 * Stop scheduler
 */
function stop() {
    for (const execution of executions.values()) {
        if (execution.status === 'pending' || execution.status === 'scheduled') {
            cancelExecution(execution.executionId);
        }
    }
}
/**
 * Process pending tasks
 */
async function processPendingTasks() {
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
                    if (!depTask)
                        return true;
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
function getHistory(options = {}) {
    let filtered = [...history];
    if (options.taskId) {
        filtered = filtered.filter(h => h.taskId === options.taskId);
    }
    if (options.status) {
        filtered = filtered.filter(h => h.status === options.status);
    }
    if (options.fromDate) {
        filtered = filtered.filter(h => h.completedAt >= options.fromDate);
    }
    if (options.toDate) {
        filtered = filtered.filter(h => h.completedAt <= options.toDate);
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
function cleanupHistory() {
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
function cleanupExecutions() {
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
function configure(newConfig) {
    config = { ...config, ...newConfig };
}
/**
 * Get configuration
 */
function getConfig() {
    return { ...config };
}
// ============================================================================
// STATISTICS
// ============================================================================
/**
 * Get statistics
 */
function getStatistics() {
    updateStatistics();
    return { ...statistics };
}
/**
 * Reset statistics
 */
function resetStatistics() {
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
function addEventListener(listener) {
    eventListeners.add(listener);
}
/**
 * Remove event listener
 */
function removeEventListener(listener) {
    eventListeners.delete(listener);
}
/**
 * Clear event listeners
 */
function clearEventListeners() {
    eventListeners.clear();
}
// ============================================================================
// CLEANUP
// ============================================================================
/**
 * Clear all state
 */
function clearAll() {
    tasks.clear();
    executions.clear();
    history.length = 0;
    locks.clear();
    checkpoints.clear();
    eventListeners.clear();
    resetStatistics();
}
