/**
 * @file Workflow Engine za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-WF-001 Workflow execution za zaledne sisteme
 * @design DSN-ZALEDNI-WF-001 Backend workflow engine arhitektura
 * @test TEST-ZALEDNI-WF-001 Preverjanje workflow engine
 *
 * Workflow Engine - prilagojen za zaledne sisteme:
 * - Workflow definition
 * - Step execution
 * - Conditional branching
 * - Parallel execution
 * - Error handling
 * - Compensation
 * - State management
 * - Event triggers
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom WF_001 - Workflow Engine
 */
/**
 * Workflow status
 */
export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused' | 'compensating';
/**
 * Step status
 */
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'compensated';
/**
 * Step type
 */
export type StepType = 'task' | 'decision' | 'parallel' | 'loop' | 'wait' | 'signal' | 'subprocess' | 'compensation';
/**
 * Workflow definition
 */
export interface WorkflowDefinition {
    readonly workflowId: string;
    readonly name: string;
    readonly version: string;
    readonly description: string;
    readonly steps: readonly StepDefinition[];
    readonly triggers: readonly WorkflowTrigger[];
    readonly variables: Readonly<Record<string, VariableDefinition>>;
    readonly timeout: number | null;
    readonly retryPolicy: RetryPolicy | null;
    readonly compensationPolicy: CompensationPolicy | null;
    readonly metadata: Readonly<Record<string, unknown>>;
}
/**
 * Step definition
 */
export interface StepDefinition {
    readonly stepId: string;
    readonly name: string;
    readonly type: StepType;
    readonly handler: StepHandler | null;
    readonly condition: StepCondition | null;
    readonly inputs: Readonly<Record<string, InputMapping>>;
    readonly outputs: Readonly<Record<string, OutputMapping>>;
    readonly timeout: number | null;
    readonly retryPolicy: RetryPolicy | null;
    readonly compensation: StepDefinition | null;
    readonly onError: ErrorHandler | null;
    readonly next: readonly string[];
    readonly parallel: readonly StepDefinition[] | null;
    readonly loop: LoopConfig | null;
    readonly metadata: Readonly<Record<string, unknown>>;
}
/**
 * Step handler
 */
export type StepHandler = (context: StepContext) => Promise<StepResult>;
/**
 * Step condition
 */
export interface StepCondition {
    readonly expression: string;
    readonly variables: readonly string[];
}
/**
 * Input mapping
 */
export interface InputMapping {
    readonly source: string;
    readonly transform: string | null;
    readonly defaultValue: unknown;
}
/**
 * Output mapping
 */
export interface OutputMapping {
    readonly target: string;
    readonly transform: string | null;
}
/**
 * Variable definition
 */
export interface VariableDefinition {
    readonly name: string;
    readonly type: string;
    readonly defaultValue: unknown;
    readonly required: boolean;
}
/**
 * Retry policy
 */
export interface RetryPolicy {
    readonly maxRetries: number;
    readonly initialDelay: number;
    readonly maxDelay: number;
    readonly backoffMultiplier: number;
    readonly retryableErrors: readonly string[];
}
/**
 * Compensation policy
 */
export interface CompensationPolicy {
    readonly enabled: boolean;
    readonly strategy: CompensationStrategy;
    readonly timeout: number;
}
/**
 * Compensation strategy
 */
export type CompensationStrategy = 'sequential' | 'parallel' | 'selective';
/**
 * Error handler
 */
export interface ErrorHandler {
    readonly type: ErrorHandlerType;
    readonly target: string | null;
    readonly retryCount: number;
}
/**
 * Error handler type
 */
export type ErrorHandlerType = 'retry' | 'skip' | 'fail' | 'goto' | 'compensate';
/**
 * Loop config
 */
export interface LoopConfig {
    readonly type: LoopType;
    readonly collection: string | null;
    readonly condition: string | null;
    readonly maxIterations: number;
    readonly parallel: boolean;
}
/**
 * Loop type
 */
export type LoopType = 'foreach' | 'while' | 'until' | 'times';
/**
 * Workflow trigger
 */
export interface WorkflowTrigger {
    readonly triggerId: string;
    readonly type: TriggerType;
    readonly config: Readonly<Record<string, unknown>>;
    readonly enabled: boolean;
}
/**
 * Trigger type
 */
export type TriggerType = 'manual' | 'schedule' | 'event' | 'webhook' | 'signal';
/**
 * Workflow instance
 */
export interface WorkflowInstance {
    readonly instanceId: string;
    readonly workflowId: string;
    readonly status: WorkflowStatus;
    readonly currentStep: string | null;
    readonly variables: Readonly<Record<string, unknown>>;
    readonly stepStates: Readonly<Record<string, StepState>>;
    readonly history: readonly WorkflowHistoryEntry[];
    readonly startedAt: number;
    readonly completedAt: number | null;
    readonly error: WorkflowError | null;
    readonly metadata: Readonly<Record<string, unknown>>;
}
/**
 * Step state
 */
export interface StepState {
    readonly stepId: string;
    readonly status: StepStatus;
    readonly startedAt: number | null;
    readonly completedAt: number | null;
    readonly retryCount: number;
    readonly input: Readonly<Record<string, unknown>>;
    readonly output: Readonly<Record<string, unknown>>;
    readonly error: string | null;
}
/**
 * Workflow history entry
 */
export interface WorkflowHistoryEntry {
    readonly entryId: string;
    readonly type: HistoryEntryType;
    readonly stepId: string | null;
    readonly timestamp: number;
    readonly data: Readonly<Record<string, unknown>>;
}
/**
 * History entry type
 */
export type HistoryEntryType = 'workflow_started' | 'workflow_completed' | 'workflow_failed' | 'workflow_cancelled' | 'workflow_paused' | 'workflow_resumed' | 'step_started' | 'step_completed' | 'step_failed' | 'step_skipped' | 'step_retried' | 'compensation_started' | 'compensation_completed' | 'variable_changed' | 'signal_received';
/**
 * Step context
 */
export interface StepContext {
    readonly instanceId: string;
    readonly workflowId: string;
    readonly stepId: string;
    readonly variables: Readonly<Record<string, unknown>>;
    readonly input: Readonly<Record<string, unknown>>;
    readonly retryCount: number;
    readonly services: WorkflowServices;
}
/**
 * Step result
 */
export interface StepResult {
    readonly success: boolean;
    readonly output: Readonly<Record<string, unknown>>;
    readonly error: string | null;
    readonly nextStep: string | null;
}
/**
 * Workflow services
 */
export interface WorkflowServices {
    readonly logger: WorkflowLogger;
    readonly storage: WorkflowStorage;
    readonly events: WorkflowEvents;
}
/**
 * Workflow logger
 */
export interface WorkflowLogger {
    debug(message: string, data?: Record<string, unknown>): void;
    info(message: string, data?: Record<string, unknown>): void;
    warn(message: string, data?: Record<string, unknown>): void;
    error(message: string, data?: Record<string, unknown>): void;
}
/**
 * Workflow storage
 */
export interface WorkflowStorage {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<void>;
}
/**
 * Workflow events
 */
export interface WorkflowEvents {
    emit(event: string, data: Record<string, unknown>): Promise<void>;
    wait(event: string, timeout?: number): Promise<Record<string, unknown>>;
}
/**
 * Workflow error
 */
export interface WorkflowError {
    readonly code: string;
    readonly message: string;
    readonly stepId: string | null;
    readonly details: Readonly<Record<string, unknown>>;
}
/**
 * Workflow event
 */
export interface WorkflowEvent {
    readonly eventId: string;
    readonly type: WorkflowEventType;
    readonly instanceId: string;
    readonly workflowId: string;
    readonly stepId: string | null;
    readonly timestamp: number;
    readonly data: Readonly<Record<string, unknown>>;
}
/**
 * Workflow event type
 */
export type WorkflowEventType = 'instance_created' | 'instance_started' | 'instance_completed' | 'instance_failed' | 'instance_cancelled' | 'instance_paused' | 'instance_resumed' | 'step_started' | 'step_completed' | 'step_failed' | 'step_skipped' | 'step_retried' | 'compensation_started' | 'compensation_completed' | 'signal_sent' | 'signal_received';
/**
 * Workflow event listener
 */
export type WorkflowEventListener = (event: WorkflowEvent) => void | Promise<void>;
/**
 * Workflow statistics
 */
export interface WorkflowStatistics {
    readonly totalInstances: number;
    readonly runningInstances: number;
    readonly completedInstances: number;
    readonly failedInstances: number;
    readonly cancelledInstances: number;
    readonly avgExecutionTime: number;
    readonly totalStepsExecuted: number;
    readonly totalRetries: number;
    readonly totalCompensations: number;
}
/**
 * Define workflow
 */
export declare function defineWorkflow(name: string, steps: readonly Omit<StepDefinition, 'stepId'>[], options?: {
    version?: string;
    description?: string;
    triggers?: readonly Omit<WorkflowTrigger, 'triggerId'>[];
    variables?: Record<string, VariableDefinition>;
    timeout?: number;
    retryPolicy?: RetryPolicy;
    compensationPolicy?: CompensationPolicy;
    metadata?: Record<string, unknown>;
}): WorkflowDefinition;
/**
 * Get workflow definition
 */
export declare function getDefinition(nameOrId: string): WorkflowDefinition | null;
/**
 * Get all definitions
 */
export declare function getAllDefinitions(): readonly WorkflowDefinition[];
/**
 * Remove workflow definition
 */
export declare function removeDefinition(nameOrId: string): boolean;
/**
 * Register step handler
 */
export declare function registerStepHandler(name: string, handler: StepHandler): void;
/**
 * Get step handler
 */
export declare function getStepHandler(name: string): StepHandler | null;
/**
 * Remove step handler
 */
export declare function removeStepHandler(name: string): boolean;
/**
 * Start workflow
 */
export declare function startWorkflow(workflowNameOrId: string, input?: Record<string, unknown>, options?: {
    metadata?: Record<string, unknown>;
}): Promise<WorkflowInstance>;
/**
 * Pause workflow
 */
export declare function pauseWorkflow(instanceId: string): Promise<boolean>;
/**
 * Resume workflow
 */
export declare function resumeWorkflow(instanceId: string): Promise<boolean>;
/**
 * Cancel workflow
 */
export declare function cancelWorkflow(instanceId: string): Promise<boolean>;
/**
 * Send signal to workflow
 */
export declare function sendSignal(instanceId: string, signal: string, data?: Record<string, unknown>): Promise<boolean>;
/**
 * Get workflow instance
 */
export declare function getInstance(instanceId: string): WorkflowInstance | null;
/**
 * Get all instances
 */
export declare function getAllInstances(): readonly WorkflowInstance[];
/**
 * Get instances by workflow
 */
export declare function getInstancesByWorkflow(workflowNameOrId: string): readonly WorkflowInstance[];
/**
 * Get instances by status
 */
export declare function getInstancesByStatus(status: WorkflowStatus): readonly WorkflowInstance[];
/**
 * Get statistics
 */
export declare function getStatistics(): Readonly<WorkflowStatistics>;
/**
 * Reset statistics
 */
export declare function resetStatistics(): void;
/**
 * Add event listener
 */
export declare function addEventListener(listener: WorkflowEventListener): void;
/**
 * Remove event listener
 */
export declare function removeEventListener(listener: WorkflowEventListener): void;
/**
 * Clear event listeners
 */
export declare function clearEventListeners(): void;
/**
 * Clear all state
 */
export declare function clearAll(): void;
