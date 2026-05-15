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
export type BatchEventType = 'job_started' | 'job_completed' | 'job_failed' | 'job_cancelled' | 'job_paused' | 'job_resumed' | 'chunk_started' | 'chunk_completed' | 'chunk_failed' | 'item_processed' | 'item_failed' | 'item_skipped' | 'checkpoint_created' | 'checkpoint_restored';
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
/**
 * Define job
 */
export declare function defineJob<T, R>(name: string, config: {
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
}): JobDefinition<T, R>;
/**
 * Get job
 */
export declare function getJob<T, R>(nameOrId: string): JobDefinition<T, R> | null;
/**
 * Get all jobs
 */
export declare function getAllJobs(): readonly JobDefinition[];
/**
 * Remove job
 */
export declare function removeJob(nameOrId: string): boolean;
/**
 * Start job
 */
export declare function startJob<T, R>(jobNameOrId: string, parameters?: Record<string, unknown>): Promise<JobExecution>;
/**
 * Pause job
 */
export declare function pauseJob(executionId: string): Promise<boolean>;
/**
 * Resume job
 */
export declare function resumeJob(executionId: string): Promise<boolean>;
/**
 * Cancel job
 */
export declare function cancelJob(executionId: string): Promise<boolean>;
/**
 * Create checkpoint
 */
export declare function createCheckpoint(executionId: string, state?: Record<string, unknown>): Promise<Checkpoint | null>;
/**
 * Get checkpoint
 */
export declare function getCheckpoint(checkpointId: string): Checkpoint | null;
/**
 * Restore from checkpoint
 */
export declare function restoreFromCheckpoint(checkpointId: string): Promise<JobExecution | null>;
/**
 * Get execution
 */
export declare function getExecution(executionId: string): JobExecution | null;
/**
 * Get all executions
 */
export declare function getAllExecutions(): readonly JobExecution[];
/**
 * Get executions by job
 */
export declare function getExecutionsByJob(jobNameOrId: string): readonly JobExecution[];
/**
 * Get executions by status
 */
export declare function getExecutionsByStatus(status: JobStatus): readonly JobExecution[];
/**
 * Schedule job
 */
export declare function scheduleJob(jobNameOrId: string, cronExpression: string, parameters?: Record<string, unknown>): JobSchedule;
/**
 * Get schedule
 */
export declare function getSchedule(scheduleId: string): JobSchedule | null;
/**
 * Get all schedules
 */
export declare function getAllSchedules(): readonly JobSchedule[];
/**
 * Enable schedule
 */
export declare function enableSchedule(scheduleId: string): boolean;
/**
 * Disable schedule
 */
export declare function disableSchedule(scheduleId: string): boolean;
/**
 * Remove schedule
 */
export declare function removeSchedule(scheduleId: string): boolean;
/**
 * Get statistics
 */
export declare function getStatistics(): Readonly<BatchStatistics>;
/**
 * Reset statistics
 */
export declare function resetStatistics(): void;
/**
 * Set resource limits
 */
export declare function setResourceLimits(limits: Partial<ResourceLimits>): void;
/**
 * Get resource limits
 */
export declare function getResourceLimits(): Readonly<ResourceLimits>;
/**
 * Add event listener
 */
export declare function addEventListener(listener: BatchEventListener): void;
/**
 * Remove event listener
 */
export declare function removeEventListener(listener: BatchEventListener): void;
/**
 * Clear event listeners
 */
export declare function clearEventListeners(): void;
/**
 * Clear all state
 */
export declare function clearAll(): void;
