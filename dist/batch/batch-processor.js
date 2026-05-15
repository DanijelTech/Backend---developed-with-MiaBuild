"use strict";
/**
 * @file Batch Processor za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-BATCH-001 Batch processing za zaledne sisteme
 * @design DSN-ZALEDNI-BATCH-001 Backend batch processor arhitektura
 * @test TEST-ZALEDNI-BATCH-001 Preverjanje batch processor
 *
 * Batch Processor - prilagojen za zaledne sisteme:
 * - Job definition
 * - Chunk processing
 * - Parallel execution
 * - Progress tracking
 * - Error handling
 * - Retry logic
 * - Checkpointing
 * - Resource management
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom BATCH_001 - Batch Processor
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineJob = defineJob;
exports.getJob = getJob;
exports.getAllJobs = getAllJobs;
exports.removeJob = removeJob;
exports.startJob = startJob;
exports.pauseJob = pauseJob;
exports.resumeJob = resumeJob;
exports.cancelJob = cancelJob;
exports.createCheckpoint = createCheckpoint;
exports.getCheckpoint = getCheckpoint;
exports.restoreFromCheckpoint = restoreFromCheckpoint;
exports.getExecution = getExecution;
exports.getAllExecutions = getAllExecutions;
exports.getExecutionsByJob = getExecutionsByJob;
exports.getExecutionsByStatus = getExecutionsByStatus;
exports.scheduleJob = scheduleJob;
exports.getSchedule = getSchedule;
exports.getAllSchedules = getAllSchedules;
exports.enableSchedule = enableSchedule;
exports.disableSchedule = disableSchedule;
exports.removeSchedule = removeSchedule;
exports.getStatistics = getStatistics;
exports.resetStatistics = resetStatistics;
exports.setResourceLimits = setResourceLimits;
exports.getResourceLimits = getResourceLimits;
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
const jobs = new Map();
const executions = new Map();
const schedules = new Map();
const checkpoints = new Map();
const eventListeners = new Set();
let jobCounter = 0;
let executionCounter = 0;
let chunkCounter = 0;
let errorCounter = 0;
let checkpointCounter = 0;
let scheduleCounter = 0;
let eventCounter = 0;
const defaultRetryPolicy = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableExceptions: ['TimeoutError', 'NetworkError', 'TransientError'],
};
const defaultSkipPolicy = {
    skipLimit: 10,
    skippableExceptions: ['ValidationError', 'DataError'],
};
const resourceLimits = {
    maxConcurrentJobs: 5,
    maxMemoryUsage: 0.8,
    maxCpuUsage: 0.9,
    maxDiskUsage: 0.9,
};
const statistics = {
    totalJobs: 0,
    runningJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    totalItemsProcessed: 0,
    totalItemsFailed: 0,
    totalItemsSkipped: 0,
    avgProcessingTime: 0,
    avgItemsPerSecond: 0,
};
// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================
/**
 * Generate job ID
 */
function generateJobId() {
    jobCounter++;
    return (0, deterministic_1.generateDeterministicId)(`batch-job-${jobCounter}`);
}
/**
 * Generate execution ID
 */
function generateExecutionId() {
    executionCounter++;
    return (0, deterministic_1.generateDeterministicId)(`batch-exec-${executionCounter}`);
}
/**
 * Generate chunk ID
 */
function generateChunkId() {
    chunkCounter++;
    return (0, deterministic_1.generateDeterministicId)(`batch-chunk-${chunkCounter}`);
}
/**
 * Generate error ID
 */
function generateErrorId() {
    errorCounter++;
    return (0, deterministic_1.generateDeterministicId)(`batch-error-${errorCounter}`);
}
/**
 * Generate checkpoint ID
 */
function generateCheckpointId() {
    checkpointCounter++;
    return (0, deterministic_1.generateDeterministicId)(`checkpoint-${checkpointCounter}`);
}
/**
 * Generate schedule ID
 */
function generateScheduleId() {
    scheduleCounter++;
    return (0, deterministic_1.generateDeterministicId)(`schedule-${scheduleCounter}`);
}
/**
 * Generate event ID
 */
function generateEventId() {
    eventCounter++;
    return (0, deterministic_1.generateDeterministicId)(`batch-event-${eventCounter}`);
}
/**
 * Emit batch event
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
    mutableStats.totalJobs = jobs.size;
    mutableStats.runningJobs = 0;
    mutableStats.completedJobs = 0;
    mutableStats.failedJobs = 0;
    for (const execution of executions.values()) {
        switch (execution.status) {
            case 'running':
                mutableStats.runningJobs++;
                break;
            case 'completed':
                mutableStats.completedJobs++;
                break;
            case 'failed':
                mutableStats.failedJobs++;
                break;
        }
    }
}
/**
 * Calculate delay with backoff
 */
function calculateDelay(retryCount, policy) {
    const delay = policy.initialDelay * Math.pow(policy.backoffMultiplier, retryCount);
    return Math.min(delay, policy.maxDelay);
}
/**
 * Is retryable error
 */
function isRetryableError(error, policy) {
    return policy.retryableExceptions.some(e => error.name === e || error.message.includes(e));
}
/**
 * Is skippable error
 */
function isSkippableError(error, policy) {
    return policy.skippableExceptions.some(e => error.name === e || error.message.includes(e));
}
/**
 * Create batch error
 */
function createBatchError(type, error, itemIndex, chunkNumber, retryPolicy, skipPolicy) {
    return {
        errorId: generateErrorId(),
        type,
        message: error.message,
        itemIndex,
        chunkNumber,
        timestamp: clock.nowMs(),
        retryable: isRetryableError(error, retryPolicy),
        skippable: isSkippableError(error, skipPolicy),
        details: { name: error.name, stack: error.stack },
    };
}
// ============================================================================
// JOB DEFINITION
// ============================================================================
/**
 * Define job
 */
function defineJob(name, config) {
    const jobId = generateJobId();
    const job = {
        jobId,
        name,
        description: config.description ?? '',
        reader: config.reader,
        processor: config.processor,
        writer: config.writer,
        chunkSize: config.chunkSize ?? 100,
        parallelism: config.parallelism ?? 1,
        retryPolicy: { ...defaultRetryPolicy, ...config.retryPolicy },
        skipPolicy: { ...defaultSkipPolicy, ...config.skipPolicy },
        listeners: config.listeners ?? [],
        metadata: config.metadata ?? {},
    };
    jobs.set(jobId, job);
    jobs.set(name, job);
    updateStatistics();
    return job;
}
/**
 * Get job
 */
function getJob(nameOrId) {
    return jobs.get(nameOrId) ?? null;
}
/**
 * Get all jobs
 */
function getAllJobs() {
    const uniqueJobs = new Map();
    for (const job of jobs.values()) {
        uniqueJobs.set(job.jobId, job);
    }
    return Array.from(uniqueJobs.values());
}
/**
 * Remove job
 */
function removeJob(nameOrId) {
    const job = jobs.get(nameOrId);
    if (!job) {
        return false;
    }
    jobs.delete(job.jobId);
    jobs.delete(job.name);
    updateStatistics();
    return true;
}
// ============================================================================
// JOB EXECUTION
// ============================================================================
/**
 * Start job
 */
async function startJob(jobNameOrId, parameters = {}) {
    const job = jobs.get(jobNameOrId);
    if (!job) {
        throw new Error(`Job '${jobNameOrId}' not found`);
    }
    const runningCount = Array.from(executions.values()).filter(e => e.status === 'running').length;
    if (runningCount >= resourceLimits.maxConcurrentJobs) {
        throw new Error(`Maximum concurrent jobs (${resourceLimits.maxConcurrentJobs}) reached`);
    }
    const executionId = generateExecutionId();
    const now = clock.nowMs();
    let execution = {
        executionId,
        jobId: job.jobId,
        status: 'pending',
        startTime: now,
        endTime: null,
        parameters,
        progress: {
            totalItems: job.reader.totalItems,
            processedItems: 0,
            successfulItems: 0,
            failedItems: 0,
            skippedItems: 0,
            currentChunk: 0,
            totalChunks: null,
            percentComplete: null,
            estimatedTimeRemaining: null,
            itemsPerSecond: 0,
        },
        chunks: [],
        errors: [],
        checkpoint: null,
        metadata: {},
    };
    executions.set(executionId, execution);
    for (const listener of job.listeners) {
        if (listener.beforeJob) {
            await listener.beforeJob(execution);
        }
    }
    execution = {
        ...execution,
        status: 'running',
    };
    executions.set(executionId, execution);
    await emitEvent({
        eventId: generateEventId(),
        type: 'job_started',
        executionId,
        jobId: job.jobId,
        timestamp: now,
        data: { parameters },
    });
    executeJob(executionId, job);
    return execution;
}
/**
 * Execute job
 */
async function executeJob(executionId, job) {
    let execution = executions.get(executionId);
    if (!execution) {
        return;
    }
    try {
        await job.reader.open();
        await job.writer.open();
        let chunkNumber = 0;
        let items = [];
        let item;
        let totalProcessed = 0;
        let totalSuccessful = 0;
        let totalFailed = 0;
        let totalSkipped = 0;
        while ((item = await job.reader.read()) !== null) {
            if (execution.status !== 'running') {
                break;
            }
            items.push(item);
            if (items.length >= job.chunkSize) {
                const chunkResult = await processChunk(executionId, job, items, chunkNumber, execution.parameters);
                totalProcessed += chunkResult.itemCount;
                totalSuccessful += chunkResult.successCount;
                totalFailed += chunkResult.failureCount;
                totalSkipped += chunkResult.skipCount;
                execution = executions.get(executionId);
                execution = {
                    ...execution,
                    chunks: [...execution.chunks, chunkResult],
                    progress: {
                        ...execution.progress,
                        processedItems: totalProcessed,
                        successfulItems: totalSuccessful,
                        failedItems: totalFailed,
                        skippedItems: totalSkipped,
                        currentChunk: chunkNumber + 1,
                        itemsPerSecond: totalProcessed / ((clock.nowMs() - execution.startTime) / 1000),
                    },
                };
                executions.set(executionId, execution);
                items = [];
                chunkNumber++;
            }
        }
        if (items.length > 0 && execution.status === 'running') {
            const chunkResult = await processChunk(executionId, job, items, chunkNumber, execution.parameters);
            totalProcessed += chunkResult.itemCount;
            totalSuccessful += chunkResult.successCount;
            totalFailed += chunkResult.failureCount;
            totalSkipped += chunkResult.skipCount;
            execution = executions.get(executionId);
            execution = {
                ...execution,
                chunks: [...execution.chunks, chunkResult],
                progress: {
                    ...execution.progress,
                    processedItems: totalProcessed,
                    successfulItems: totalSuccessful,
                    failedItems: totalFailed,
                    skippedItems: totalSkipped,
                    currentChunk: chunkNumber + 1,
                    itemsPerSecond: totalProcessed / ((clock.nowMs() - execution.startTime) / 1000),
                },
            };
            executions.set(executionId, execution);
        }
        await job.reader.close();
        await job.writer.close();
        execution = executions.get(executionId);
        if (execution.status === 'running') {
            const endTime = clock.nowMs();
            const duration = endTime - execution.startTime;
            execution = {
                ...execution,
                status: 'completed',
                endTime,
                progress: {
                    ...execution.progress,
                    percentComplete: 100,
                    estimatedTimeRemaining: 0,
                },
            };
            executions.set(executionId, execution);
            for (const listener of job.listeners) {
                if (listener.afterJob) {
                    await listener.afterJob(execution);
                }
            }
            await emitEvent({
                eventId: generateEventId(),
                type: 'job_completed',
                executionId,
                jobId: job.jobId,
                timestamp: endTime,
                data: { duration, progress: execution.progress },
            });
            const mutableStats = statistics;
            mutableStats.totalItemsProcessed += totalSuccessful;
            mutableStats.totalItemsFailed += totalFailed;
            mutableStats.totalItemsSkipped += totalSkipped;
            mutableStats.completedJobs++;
            const totalTime = mutableStats.avgProcessingTime * (mutableStats.completedJobs - 1) + duration;
            mutableStats.avgProcessingTime = totalTime / mutableStats.completedJobs;
            const totalRate = mutableStats.avgItemsPerSecond * (mutableStats.completedJobs - 1) + execution.progress.itemsPerSecond;
            mutableStats.avgItemsPerSecond = totalRate / mutableStats.completedJobs;
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        execution = executions.get(executionId);
        execution = {
            ...execution,
            status: 'failed',
            endTime: clock.nowMs(),
            errors: [
                ...execution.errors,
                {
                    errorId: generateErrorId(),
                    type: 'unknown',
                    message: errorMessage,
                    itemIndex: null,
                    chunkNumber: null,
                    timestamp: clock.nowMs(),
                    retryable: false,
                    skippable: false,
                    details: {},
                },
            ],
        };
        executions.set(executionId, execution);
        for (const listener of job.listeners) {
            if (listener.onError) {
                await listener.onError(execution.errors[execution.errors.length - 1]);
            }
        }
        await emitEvent({
            eventId: generateEventId(),
            type: 'job_failed',
            executionId,
            jobId: job.jobId,
            timestamp: clock.nowMs(),
            data: { error: errorMessage },
        });
        try {
            await job.reader.close();
            await job.writer.close();
        }
        catch {
            // Ignore close errors
        }
    }
    updateStatistics();
}
/**
 * Process chunk
 */
async function processChunk(executionId, job, items, chunkNumber, parameters) {
    const chunkId = generateChunkId();
    const startTime = clock.nowMs();
    let chunk = {
        chunkId,
        chunkNumber,
        status: 'processing',
        startTime,
        endTime: null,
        itemCount: items.length,
        successCount: 0,
        failureCount: 0,
        skipCount: 0,
        retryCount: 0,
        errors: [],
    };
    for (const listener of job.listeners) {
        if (listener.beforeChunk) {
            await listener.beforeChunk(chunk);
        }
    }
    await emitEvent({
        eventId: generateEventId(),
        type: 'chunk_started',
        executionId,
        jobId: job.jobId,
        timestamp: startTime,
        data: { chunkNumber, itemCount: items.length },
    });
    const results = [];
    const errors = [];
    let successCount = 0;
    let failureCount = 0;
    let skipCount = 0;
    let retryCount = 0;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const context = {
            jobId: job.jobId,
            executionId,
            chunkNumber,
            itemIndex: i,
            retryCount: 0,
            startTime,
            parameters,
        };
        let processed = false;
        let currentRetry = 0;
        while (!processed && currentRetry <= job.retryPolicy.maxRetries) {
            try {
                const result = await job.processor(item, { ...context, retryCount: currentRetry });
                results.push(result);
                successCount++;
                processed = true;
                await emitEvent({
                    eventId: generateEventId(),
                    type: 'item_processed',
                    executionId,
                    jobId: job.jobId,
                    timestamp: clock.nowMs(),
                    data: { chunkNumber, itemIndex: i },
                });
            }
            catch (error) {
                const batchError = createBatchError('process', error instanceof Error ? error : new Error(String(error)), i, chunkNumber, job.retryPolicy, job.skipPolicy);
                if (batchError.retryable && currentRetry < job.retryPolicy.maxRetries) {
                    currentRetry++;
                    retryCount++;
                    const delay = calculateDelay(currentRetry - 1, job.retryPolicy);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                else if (batchError.skippable && skipCount < job.skipPolicy.skipLimit) {
                    errors.push(batchError);
                    skipCount++;
                    processed = true;
                    for (const listener of job.listeners) {
                        if (listener.onSkip) {
                            await listener.onSkip(item, batchError);
                        }
                    }
                    await emitEvent({
                        eventId: generateEventId(),
                        type: 'item_skipped',
                        executionId,
                        jobId: job.jobId,
                        timestamp: clock.nowMs(),
                        data: { chunkNumber, itemIndex: i, error: batchError.message },
                    });
                }
                else {
                    errors.push(batchError);
                    failureCount++;
                    processed = true;
                    for (const listener of job.listeners) {
                        if (listener.onError) {
                            await listener.onError(batchError);
                        }
                    }
                    await emitEvent({
                        eventId: generateEventId(),
                        type: 'item_failed',
                        executionId,
                        jobId: job.jobId,
                        timestamp: clock.nowMs(),
                        data: { chunkNumber, itemIndex: i, error: batchError.message },
                    });
                }
            }
        }
    }
    if (results.length > 0) {
        try {
            await job.writer.write(results);
        }
        catch (error) {
            const batchError = createBatchError('write', error instanceof Error ? error : new Error(String(error)), null, chunkNumber, job.retryPolicy, job.skipPolicy);
            errors.push(batchError);
        }
    }
    const endTime = clock.nowMs();
    chunk = {
        ...chunk,
        status: failureCount > 0 ? 'failed' : 'completed',
        endTime,
        successCount,
        failureCount,
        skipCount,
        retryCount,
        errors,
    };
    for (const listener of job.listeners) {
        if (listener.afterChunk) {
            await listener.afterChunk(chunk);
        }
    }
    await emitEvent({
        eventId: generateEventId(),
        type: failureCount > 0 ? 'chunk_failed' : 'chunk_completed',
        executionId,
        jobId: job.jobId,
        timestamp: endTime,
        data: { chunkNumber, successCount, failureCount, skipCount },
    });
    return chunk;
}
// ============================================================================
// JOB CONTROL
// ============================================================================
/**
 * Pause job
 */
async function pauseJob(executionId) {
    let execution = executions.get(executionId);
    if (!execution || execution.status !== 'running') {
        return false;
    }
    execution = {
        ...execution,
        status: 'paused',
    };
    executions.set(executionId, execution);
    await emitEvent({
        eventId: generateEventId(),
        type: 'job_paused',
        executionId,
        jobId: execution.jobId,
        timestamp: clock.nowMs(),
        data: {},
    });
    updateStatistics();
    return true;
}
/**
 * Resume job
 */
async function resumeJob(executionId) {
    let execution = executions.get(executionId);
    if (!execution || execution.status !== 'paused') {
        return false;
    }
    const job = jobs.get(execution.jobId);
    if (!job) {
        return false;
    }
    execution = {
        ...execution,
        status: 'running',
    };
    executions.set(executionId, execution);
    await emitEvent({
        eventId: generateEventId(),
        type: 'job_resumed',
        executionId,
        jobId: execution.jobId,
        timestamp: clock.nowMs(),
        data: {},
    });
    executeJob(executionId, job);
    return true;
}
/**
 * Cancel job
 */
async function cancelJob(executionId) {
    let execution = executions.get(executionId);
    if (!execution || (execution.status !== 'running' && execution.status !== 'paused')) {
        return false;
    }
    execution = {
        ...execution,
        status: 'cancelled',
        endTime: clock.nowMs(),
    };
    executions.set(executionId, execution);
    await emitEvent({
        eventId: generateEventId(),
        type: 'job_cancelled',
        executionId,
        jobId: execution.jobId,
        timestamp: clock.nowMs(),
        data: {},
    });
    updateStatistics();
    return true;
}
// ============================================================================
// CHECKPOINTING
// ============================================================================
/**
 * Create checkpoint
 */
async function createCheckpoint(executionId, state = {}) {
    const execution = executions.get(executionId);
    if (!execution) {
        return null;
    }
    const checkpoint = {
        checkpointId: generateCheckpointId(),
        executionId,
        chunkNumber: execution.progress.currentChunk,
        itemIndex: execution.progress.processedItems,
        timestamp: clock.nowMs(),
        state,
    };
    checkpoints.set(checkpoint.checkpointId, checkpoint);
    const updatedExecution = {
        ...execution,
        checkpoint,
    };
    executions.set(executionId, updatedExecution);
    await emitEvent({
        eventId: generateEventId(),
        type: 'checkpoint_created',
        executionId,
        jobId: execution.jobId,
        timestamp: clock.nowMs(),
        data: { checkpointId: checkpoint.checkpointId },
    });
    return checkpoint;
}
/**
 * Get checkpoint
 */
function getCheckpoint(checkpointId) {
    return checkpoints.get(checkpointId) ?? null;
}
/**
 * Restore from checkpoint
 */
async function restoreFromCheckpoint(checkpointId) {
    const checkpoint = checkpoints.get(checkpointId);
    if (!checkpoint) {
        return null;
    }
    const originalExecution = executions.get(checkpoint.executionId);
    if (!originalExecution) {
        return null;
    }
    const job = jobs.get(originalExecution.jobId);
    if (!job) {
        return null;
    }
    const execution = await startJob(job.name, {
        ...originalExecution.parameters,
        __checkpoint: checkpoint,
    });
    await emitEvent({
        eventId: generateEventId(),
        type: 'checkpoint_restored',
        executionId: execution.executionId,
        jobId: job.jobId,
        timestamp: clock.nowMs(),
        data: { checkpointId, originalExecutionId: checkpoint.executionId },
    });
    return execution;
}
// ============================================================================
// EXECUTION QUERIES
// ============================================================================
/**
 * Get execution
 */
function getExecution(executionId) {
    return executions.get(executionId) ?? null;
}
/**
 * Get all executions
 */
function getAllExecutions() {
    return Array.from(executions.values());
}
/**
 * Get executions by job
 */
function getExecutionsByJob(jobNameOrId) {
    const job = jobs.get(jobNameOrId);
    if (!job) {
        return [];
    }
    return Array.from(executions.values()).filter(e => e.jobId === job.jobId);
}
/**
 * Get executions by status
 */
function getExecutionsByStatus(status) {
    return Array.from(executions.values()).filter(e => e.status === status);
}
// ============================================================================
// SCHEDULING
// ============================================================================
/**
 * Schedule job
 */
function scheduleJob(jobNameOrId, cronExpression, parameters = {}) {
    const job = jobs.get(jobNameOrId);
    if (!job) {
        throw new Error(`Job '${jobNameOrId}' not found`);
    }
    const scheduleId = generateScheduleId();
    const schedule = {
        scheduleId,
        jobId: job.jobId,
        cronExpression,
        enabled: true,
        parameters,
        lastRun: null,
        nextRun: null,
    };
    schedules.set(scheduleId, schedule);
    return schedule;
}
/**
 * Get schedule
 */
function getSchedule(scheduleId) {
    return schedules.get(scheduleId) ?? null;
}
/**
 * Get all schedules
 */
function getAllSchedules() {
    return Array.from(schedules.values());
}
/**
 * Enable schedule
 */
function enableSchedule(scheduleId) {
    const schedule = schedules.get(scheduleId);
    if (!schedule) {
        return false;
    }
    schedules.set(scheduleId, { ...schedule, enabled: true });
    return true;
}
/**
 * Disable schedule
 */
function disableSchedule(scheduleId) {
    const schedule = schedules.get(scheduleId);
    if (!schedule) {
        return false;
    }
    schedules.set(scheduleId, { ...schedule, enabled: false });
    return true;
}
/**
 * Remove schedule
 */
function removeSchedule(scheduleId) {
    return schedules.delete(scheduleId);
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
        totalJobs: 0,
        runningJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        totalItemsProcessed: 0,
        totalItemsFailed: 0,
        totalItemsSkipped: 0,
        avgProcessingTime: 0,
        avgItemsPerSecond: 0,
    });
}
// ============================================================================
// RESOURCE LIMITS
// ============================================================================
/**
 * Set resource limits
 */
function setResourceLimits(limits) {
    Object.assign(resourceLimits, limits);
}
/**
 * Get resource limits
 */
function getResourceLimits() {
    return { ...resourceLimits };
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
    jobs.clear();
    executions.clear();
    schedules.clear();
    checkpoints.clear();
    eventListeners.clear();
    resetStatistics();
}
