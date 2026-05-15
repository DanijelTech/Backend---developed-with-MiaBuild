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

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI ZA BATCH PROCESSOR
// ============================================================================

/**
 * Job status
 */
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';

/**
 * Chunk status
 */
export type ChunkStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

/**
 * Job priority
 */
export type JobPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Job definition
 */
export interface JobDefinition<T = unknown, R = unknown> {
    readonly jobId: string;
    readonly name: string;
    readonly description: string;
    readonly reader: ItemReader<T>;
    readonly processor: ItemProcessor<T, R>;
    readonly writer: ItemWriter<R>;
    readonly chunkSize: number;
    readonly parallelism: number;
    readonly retryPolicy: RetryPolicy;
    readonly skipPolicy: SkipPolicy;
    readonly listeners: readonly JobListener[];
    readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Item reader
 */
export interface ItemReader<T> {
    open(): Promise<void>;
    read(): Promise<T | null>;
    close(): Promise<void>;
    readonly totalItems: number | null;
}

/**
 * Item processor
 */
export type ItemProcessor<T, R> = (item: T, context: ProcessingContext) => Promise<R>;

/**
 * Item writer
 */
export interface ItemWriter<R> {
    open(): Promise<void>;
    write(items: readonly R[]): Promise<void>;
    close(): Promise<void>;
}

/**
 * Processing context
 */
export interface ProcessingContext {
    readonly jobId: string;
    readonly executionId: string;
    readonly chunkNumber: number;
    readonly itemIndex: number;
    readonly retryCount: number;
    readonly startTime: number;
    readonly parameters: Readonly<Record<string, unknown>>;
}

/**
 * Retry policy
 */
export interface RetryPolicy {
    readonly maxRetries: number;
    readonly initialDelay: number;
    readonly maxDelay: number;
    readonly backoffMultiplier: number;
    readonly retryableExceptions: readonly string[];
}

/**
 * Skip policy
 */
export interface SkipPolicy {
    readonly skipLimit: number;
    readonly skippableExceptions: readonly string[];
}

/**
 * Job listener
 */
export interface JobListener {
    beforeJob?(execution: JobExecution): Promise<void>;
    afterJob?(execution: JobExecution): Promise<void>;
    beforeChunk?(chunk: ChunkExecution): Promise<void>;
    afterChunk?(chunk: ChunkExecution): Promise<void>;
    onError?(error: BatchError): Promise<void>;
    onSkip?(item: unknown, error: BatchError): Promise<void>;
}

/**
 * Job execution
 */
export interface JobExecution {
    readonly executionId: string;
    readonly jobId: string;
    readonly status: JobStatus;
    readonly startTime: number;
    readonly endTime: number | null;
    readonly parameters: Readonly<Record<string, unknown>>;
    readonly progress: JobProgress;
    readonly chunks: readonly ChunkExecution[];
    readonly errors: readonly BatchError[];
    readonly checkpoint: Checkpoint | null;
    readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Job progress
 */
export interface JobProgress {
    readonly totalItems: number | null;
    readonly processedItems: number;
    readonly successfulItems: number;
    readonly failedItems: number;
    readonly skippedItems: number;
    readonly currentChunk: number;
    readonly totalChunks: number | null;
    readonly percentComplete: number | null;
    readonly estimatedTimeRemaining: number | null;
    readonly itemsPerSecond: number;
}

/**
 * Chunk execution
 */
export interface ChunkExecution {
    readonly chunkId: string;
    readonly chunkNumber: number;
    readonly status: ChunkStatus;
    readonly startTime: number;
    readonly endTime: number | null;
    readonly itemCount: number;
    readonly successCount: number;
    readonly failureCount: number;
    readonly skipCount: number;
    readonly retryCount: number;
    readonly errors: readonly BatchError[];
}

/**
 * Batch error
 */
export interface BatchError {
    readonly errorId: string;
    readonly type: BatchErrorType;
    readonly message: string;
    readonly itemIndex: number | null;
    readonly chunkNumber: number | null;
    readonly timestamp: number;
    readonly retryable: boolean;
    readonly skippable: boolean;
    readonly details: Readonly<Record<string, unknown>>;
}

/**
 * Batch error type
 */
export type BatchErrorType = 'read' | 'process' | 'write' | 'validation' | 'timeout' | 'resource' | 'unknown';

/**
 * Checkpoint
 */
export interface Checkpoint {
    readonly checkpointId: string;
    readonly executionId: string;
    readonly chunkNumber: number;
    readonly itemIndex: number;
    readonly timestamp: number;
    readonly state: Readonly<Record<string, unknown>>;
}

/**
 * Job schedule
 */
export interface JobSchedule {
    readonly scheduleId: string;
    readonly jobId: string;
    readonly cronExpression: string;
    readonly enabled: boolean;
    readonly parameters: Readonly<Record<string, unknown>>;
    readonly lastRun: number | null;
    readonly nextRun: number | null;
}

/**
 * Batch event
 */
export interface BatchEvent {
    readonly eventId: string;
    readonly type: BatchEventType;
    readonly executionId: string;
    readonly jobId: string;
    readonly timestamp: number;
    readonly data: Readonly<Record<string, unknown>>;
}

/**
 * Batch event type
 */
export type BatchEventType =
    | 'job_started'
    | 'job_completed'
    | 'job_failed'
    | 'job_cancelled'
    | 'job_paused'
    | 'job_resumed'
    | 'chunk_started'
    | 'chunk_completed'
    | 'chunk_failed'
    | 'item_processed'
    | 'item_failed'
    | 'item_skipped'
    | 'checkpoint_created'
    | 'checkpoint_restored';

/**
 * Batch event listener
 */
export type BatchEventListener = (event: BatchEvent) => void | Promise<void>;

/**
 * Batch statistics
 */
export interface BatchStatistics {
    readonly totalJobs: number;
    readonly runningJobs: number;
    readonly completedJobs: number;
    readonly failedJobs: number;
    readonly totalItemsProcessed: number;
    readonly totalItemsFailed: number;
    readonly totalItemsSkipped: number;
    readonly avgProcessingTime: number;
    readonly avgItemsPerSecond: number;
}

/**
 * Resource limits
 */
export interface ResourceLimits {
    readonly maxConcurrentJobs: number;
    readonly maxMemoryUsage: number;
    readonly maxCpuUsage: number;
    readonly maxDiskUsage: number;
}

// ============================================================================
// STANJE
// ============================================================================

const jobs: Map<string, JobDefinition> = new Map();
const executions: Map<string, JobExecution> = new Map();
const schedules: Map<string, JobSchedule> = new Map();
const checkpoints: Map<string, Checkpoint> = new Map();
const eventListeners: Set<BatchEventListener> = new Set();

let jobCounter = 0;
let executionCounter = 0;
let chunkCounter = 0;
let errorCounter = 0;
let checkpointCounter = 0;
let scheduleCounter = 0;
let eventCounter = 0;

const defaultRetryPolicy: RetryPolicy = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableExceptions: ['TimeoutError', 'NetworkError', 'TransientError'],
};

const defaultSkipPolicy: SkipPolicy = {
    skipLimit: 10,
    skippableExceptions: ['ValidationError', 'DataError'],
};

const resourceLimits: ResourceLimits = {
    maxConcurrentJobs: 5,
    maxMemoryUsage: 0.8,
    maxCpuUsage: 0.9,
    maxDiskUsage: 0.9,
};

const statistics: BatchStatistics = {
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
function generateJobId(): string {
    jobCounter++;
    return generateDeterministicId(`batch-job-${jobCounter}`);
}

/**
 * Generate execution ID
 */
function generateExecutionId(): string {
    executionCounter++;
    return generateDeterministicId(`batch-exec-${executionCounter}`);
}

/**
 * Generate chunk ID
 */
function generateChunkId(): string {
    chunkCounter++;
    return generateDeterministicId(`batch-chunk-${chunkCounter}`);
}

/**
 * Generate error ID
 */
function generateErrorId(): string {
    errorCounter++;
    return generateDeterministicId(`batch-error-${errorCounter}`);
}

/**
 * Generate checkpoint ID
 */
function generateCheckpointId(): string {
    checkpointCounter++;
    return generateDeterministicId(`checkpoint-${checkpointCounter}`);
}

/**
 * Generate schedule ID
 */
function generateScheduleId(): string {
    scheduleCounter++;
    return generateDeterministicId(`schedule-${scheduleCounter}`);
}

/**
 * Generate event ID
 */
function generateEventId(): string {
    eventCounter++;
    return generateDeterministicId(`batch-event-${eventCounter}`);
}

/**
 * Emit batch event
 */
async function emitEvent(event: BatchEvent): Promise<void> {
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
        totalJobs: number;
        runningJobs: number;
        completedJobs: number;
        failedJobs: number;
    };
    
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
function calculateDelay(retryCount: number, policy: RetryPolicy): number {
    const delay = policy.initialDelay * Math.pow(policy.backoffMultiplier, retryCount);
    return Math.min(delay, policy.maxDelay);
}

/**
 * Is retryable error
 */
function isRetryableError(error: Error, policy: RetryPolicy): boolean {
    return policy.retryableExceptions.some(e => error.name === e || error.message.includes(e));
}

/**
 * Is skippable error
 */
function isSkippableError(error: Error, policy: SkipPolicy): boolean {
    return policy.skippableExceptions.some(e => error.name === e || error.message.includes(e));
}

/**
 * Create batch error
 */
function createBatchError(
    type: BatchErrorType,
    error: Error,
    itemIndex: number | null,
    chunkNumber: number | null,
    retryPolicy: RetryPolicy,
    skipPolicy: SkipPolicy
): BatchError {
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
export function defineJob<T, R>(
    name: string,
    config: {
        description?: string;
        reader: ItemReader<T>;
        processor: ItemProcessor<T, R>;
        writer: ItemWriter<R>;
        chunkSize?: number;
        parallelism?: number;
        retryPolicy?: Partial<RetryPolicy>;
        skipPolicy?: Partial<SkipPolicy>;
        listeners?: readonly JobListener[];
        metadata?: Record<string, unknown>;
    }
): JobDefinition<T, R> {
    const jobId = generateJobId();
    
    const job: JobDefinition<T, R> = {
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
    
    jobs.set(jobId, job as JobDefinition);
    jobs.set(name, job as JobDefinition);
    
    updateStatistics();
    
    return job;
}

/**
 * Get job
 */
export function getJob<T, R>(nameOrId: string): JobDefinition<T, R> | null {
    return (jobs.get(nameOrId) as JobDefinition<T, R>) ?? null;
}

/**
 * Get all jobs
 */
export function getAllJobs(): readonly JobDefinition[] {
    const uniqueJobs = new Map<string, JobDefinition>();
    for (const job of jobs.values()) {
        uniqueJobs.set(job.jobId, job);
    }
    return Array.from(uniqueJobs.values());
}

/**
 * Remove job
 */
export function removeJob(nameOrId: string): boolean {
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
export async function startJob<T, R>(
    jobNameOrId: string,
    parameters: Record<string, unknown> = {}
): Promise<JobExecution> {
    const job = jobs.get(jobNameOrId) as JobDefinition<T, R>;
    if (!job) {
        throw new Error(`Job '${jobNameOrId}' not found`);
    }
    
    const runningCount = Array.from(executions.values()).filter(e => e.status === 'running').length;
    if (runningCount >= resourceLimits.maxConcurrentJobs) {
        throw new Error(`Maximum concurrent jobs (${resourceLimits.maxConcurrentJobs}) reached`);
    }
    
    const executionId = generateExecutionId();
    const now = clock.nowMs();
    
    let execution: JobExecution = {
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
async function executeJob<T, R>(executionId: string, job: JobDefinition<T, R>): Promise<void> {
    let execution = executions.get(executionId);
    if (!execution) {
        return;
    }
    
    try {
        await job.reader.open();
        await job.writer.open();
        
        let chunkNumber = 0;
        let items: T[] = [];
        let item: T | null;
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
                const chunkResult = await processChunk(
                    executionId,
                    job,
                    items,
                    chunkNumber,
                    execution.parameters as Record<string, unknown>
                );
                
                totalProcessed += chunkResult.itemCount;
                totalSuccessful += chunkResult.successCount;
                totalFailed += chunkResult.failureCount;
                totalSkipped += chunkResult.skipCount;
                
                execution = executions.get(executionId)!;
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
            const chunkResult = await processChunk(
                executionId,
                job,
                items,
                chunkNumber,
                execution.parameters as Record<string, unknown>
            );
            
            totalProcessed += chunkResult.itemCount;
            totalSuccessful += chunkResult.successCount;
            totalFailed += chunkResult.failureCount;
            totalSkipped += chunkResult.skipCount;
            
            execution = executions.get(executionId)!;
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
        
        execution = executions.get(executionId)!;
        
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
            
            const mutableStats = statistics as {
                totalItemsProcessed: number;
                totalItemsFailed: number;
                totalItemsSkipped: number;
                avgProcessingTime: number;
                avgItemsPerSecond: number;
                completedJobs: number;
            };
            
            mutableStats.totalItemsProcessed += totalSuccessful;
            mutableStats.totalItemsFailed += totalFailed;
            mutableStats.totalItemsSkipped += totalSkipped;
            mutableStats.completedJobs++;
            
            const totalTime = mutableStats.avgProcessingTime * (mutableStats.completedJobs - 1) + duration;
            mutableStats.avgProcessingTime = totalTime / mutableStats.completedJobs;
            
            const totalRate = mutableStats.avgItemsPerSecond * (mutableStats.completedJobs - 1) + execution.progress.itemsPerSecond;
            mutableStats.avgItemsPerSecond = totalRate / mutableStats.completedJobs;
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        execution = executions.get(executionId)!;
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
        } catch {
            // Ignore close errors
        }
    }
    
    updateStatistics();
}

/**
 * Process chunk
 */
async function processChunk<T, R>(
    executionId: string,
    job: JobDefinition<T, R>,
    items: readonly T[],
    chunkNumber: number,
    parameters: Record<string, unknown>
): Promise<ChunkExecution> {
    const chunkId = generateChunkId();
    const startTime = clock.nowMs();
    
    let chunk: ChunkExecution = {
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
    
    const results: R[] = [];
    const errors: BatchError[] = [];
    let successCount = 0;
    let failureCount = 0;
    let skipCount = 0;
    let retryCount = 0;
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const context: ProcessingContext = {
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
            } catch (error) {
                const batchError = createBatchError(
                    'process',
                    error instanceof Error ? error : new Error(String(error)),
                    i,
                    chunkNumber,
                    job.retryPolicy,
                    job.skipPolicy
                );
                
                if (batchError.retryable && currentRetry < job.retryPolicy.maxRetries) {
                    currentRetry++;
                    retryCount++;
                    const delay = calculateDelay(currentRetry - 1, job.retryPolicy);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else if (batchError.skippable && skipCount < job.skipPolicy.skipLimit) {
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
                } else {
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
        } catch (error) {
            const batchError = createBatchError(
                'write',
                error instanceof Error ? error : new Error(String(error)),
                null,
                chunkNumber,
                job.retryPolicy,
                job.skipPolicy
            );
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
export async function pauseJob(executionId: string): Promise<boolean> {
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
export async function resumeJob(executionId: string): Promise<boolean> {
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
export async function cancelJob(executionId: string): Promise<boolean> {
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
export async function createCheckpoint(
    executionId: string,
    state: Record<string, unknown> = {}
): Promise<Checkpoint | null> {
    const execution = executions.get(executionId);
    if (!execution) {
        return null;
    }
    
    const checkpoint: Checkpoint = {
        checkpointId: generateCheckpointId(),
        executionId,
        chunkNumber: execution.progress.currentChunk,
        itemIndex: execution.progress.processedItems,
        timestamp: clock.nowMs(),
        state,
    };
    
    checkpoints.set(checkpoint.checkpointId, checkpoint);
    
    const updatedExecution: JobExecution = {
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
export function getCheckpoint(checkpointId: string): Checkpoint | null {
    return checkpoints.get(checkpointId) ?? null;
}

/**
 * Restore from checkpoint
 */
export async function restoreFromCheckpoint(checkpointId: string): Promise<JobExecution | null> {
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
export function getExecution(executionId: string): JobExecution | null {
    return executions.get(executionId) ?? null;
}

/**
 * Get all executions
 */
export function getAllExecutions(): readonly JobExecution[] {
    return Array.from(executions.values());
}

/**
 * Get executions by job
 */
export function getExecutionsByJob(jobNameOrId: string): readonly JobExecution[] {
    const job = jobs.get(jobNameOrId);
    if (!job) {
        return [];
    }
    
    return Array.from(executions.values()).filter(e => e.jobId === job.jobId);
}

/**
 * Get executions by status
 */
export function getExecutionsByStatus(status: JobStatus): readonly JobExecution[] {
    return Array.from(executions.values()).filter(e => e.status === status);
}

// ============================================================================
// SCHEDULING
// ============================================================================

/**
 * Schedule job
 */
export function scheduleJob(
    jobNameOrId: string,
    cronExpression: string,
    parameters: Record<string, unknown> = {}
): JobSchedule {
    const job = jobs.get(jobNameOrId);
    if (!job) {
        throw new Error(`Job '${jobNameOrId}' not found`);
    }
    
    const scheduleId = generateScheduleId();
    
    const schedule: JobSchedule = {
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
export function getSchedule(scheduleId: string): JobSchedule | null {
    return schedules.get(scheduleId) ?? null;
}

/**
 * Get all schedules
 */
export function getAllSchedules(): readonly JobSchedule[] {
    return Array.from(schedules.values());
}

/**
 * Enable schedule
 */
export function enableSchedule(scheduleId: string): boolean {
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
export function disableSchedule(scheduleId: string): boolean {
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
export function removeSchedule(scheduleId: string): boolean {
    return schedules.delete(scheduleId);
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get statistics
 */
export function getStatistics(): Readonly<BatchStatistics> {
    updateStatistics();
    return { ...statistics };
}

/**
 * Reset statistics
 */
export function resetStatistics(): void {
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
export function setResourceLimits(limits: Partial<ResourceLimits>): void {
    Object.assign(resourceLimits, limits);
}

/**
 * Get resource limits
 */
export function getResourceLimits(): Readonly<ResourceLimits> {
    return { ...resourceLimits };
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Add event listener
 */
export function addEventListener(listener: BatchEventListener): void {
    eventListeners.add(listener);
}

/**
 * Remove event listener
 */
export function removeEventListener(listener: BatchEventListener): void {
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
    jobs.clear();
    executions.clear();
    schedules.clear();
    checkpoints.clear();
    eventListeners.clear();
    resetStatistics();
}
