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

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI ZA WORKFLOW ENGINE
// ============================================================================

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
export type HistoryEntryType =
    | 'workflow_started'
    | 'workflow_completed'
    | 'workflow_failed'
    | 'workflow_cancelled'
    | 'workflow_paused'
    | 'workflow_resumed'
    | 'step_started'
    | 'step_completed'
    | 'step_failed'
    | 'step_skipped'
    | 'step_retried'
    | 'compensation_started'
    | 'compensation_completed'
    | 'variable_changed'
    | 'signal_received';

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
export type WorkflowEventType =
    | 'instance_created'
    | 'instance_started'
    | 'instance_completed'
    | 'instance_failed'
    | 'instance_cancelled'
    | 'instance_paused'
    | 'instance_resumed'
    | 'step_started'
    | 'step_completed'
    | 'step_failed'
    | 'step_skipped'
    | 'step_retried'
    | 'compensation_started'
    | 'compensation_completed'
    | 'signal_sent'
    | 'signal_received';

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

// ============================================================================
// STANJE
// ============================================================================

const definitions: Map<string, WorkflowDefinition> = new Map();
const instances: Map<string, WorkflowInstance> = new Map();
const stepHandlers: Map<string, StepHandler> = new Map();
const eventListeners: Set<WorkflowEventListener> = new Set();
const pendingSignals: Map<string, { resolve: (data: Record<string, unknown>) => void; timeout: NodeJS.Timeout | null }> = new Map();

let workflowCounter = 0;
let instanceCounter = 0;
let stepCounter = 0;
let triggerCounter = 0;
let historyCounter = 0;
let eventCounter = 0;

const statistics: WorkflowStatistics = {
    totalInstances: 0,
    runningInstances: 0,
    completedInstances: 0,
    failedInstances: 0,
    cancelledInstances: 0,
    avgExecutionTime: 0,
    totalStepsExecuted: 0,
    totalRetries: 0,
    totalCompensations: 0,
};

// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================

/**
 * Generate workflow ID
 */
function generateWorkflowId(): string {
    workflowCounter++;
    return generateDeterministicId(`workflow-${workflowCounter}`);
}

/**
 * Generate instance ID
 */
function generateInstanceId(): string {
    instanceCounter++;
    return generateDeterministicId(`wf-instance-${instanceCounter}`);
}

/**
 * Generate step ID
 */
function generateStepId(): string {
    stepCounter++;
    return generateDeterministicId(`wf-step-${stepCounter}`);
}

/**
 * Generate trigger ID
 */
function generateTriggerId(): string {
    triggerCounter++;
    return generateDeterministicId(`wf-trigger-${triggerCounter}`);
}

/**
 * Generate history ID
 */
function generateHistoryId(): string {
    historyCounter++;
    return generateDeterministicId(`wf-history-${historyCounter}`);
}

/**
 * Generate event ID
 */
function generateEventId(): string {
    eventCounter++;
    return generateDeterministicId(`wf-event-${eventCounter}`);
}

/**
 * Emit workflow event
 */
async function emitEvent(event: WorkflowEvent): Promise<void> {
    for (const listener of eventListeners) {
        try {
            await listener(event);
        } catch {
            // Ignore listener errors
        }
    }
}

/**
 * Add history entry
 */
function addHistoryEntry(
    instance: WorkflowInstance,
    type: HistoryEntryType,
    stepId: string | null,
    data: Record<string, unknown>
): WorkflowInstance {
    const entry: WorkflowHistoryEntry = {
        entryId: generateHistoryId(),
        type,
        stepId,
        timestamp: clock.nowMs(),
        data,
    };
    
    return {
        ...instance,
        history: [...instance.history, entry],
    };
}

/**
 * Update statistics
 */
function updateStatistics(): void {
    const mutableStats = statistics as {
        totalInstances: number;
        runningInstances: number;
        completedInstances: number;
        failedInstances: number;
        cancelledInstances: number;
    };
    
    mutableStats.totalInstances = instances.size;
    mutableStats.runningInstances = 0;
    mutableStats.completedInstances = 0;
    mutableStats.failedInstances = 0;
    mutableStats.cancelledInstances = 0;
    
    for (const instance of instances.values()) {
        switch (instance.status) {
            case 'running':
                mutableStats.runningInstances++;
                break;
            case 'completed':
                mutableStats.completedInstances++;
                break;
            case 'failed':
                mutableStats.failedInstances++;
                break;
            case 'cancelled':
                mutableStats.cancelledInstances++;
                break;
        }
    }
}

/**
 * Evaluate condition
 */
function evaluateCondition(condition: StepCondition, variables: Record<string, unknown>): boolean {
    for (const varName of condition.variables) {
        if (!(varName in variables)) {
            return false;
        }
    }
    
    return true;
}

/**
 * Resolve input mappings
 */
function resolveInputs(
    mappings: Record<string, InputMapping>,
    variables: Record<string, unknown>
): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    
    for (const [key, mapping] of Object.entries(mappings)) {
        let value = variables[mapping.source];
        
        if (value === undefined) {
            value = mapping.defaultValue;
        }
        
        result[key] = value;
    }
    
    return result;
}

/**
 * Apply output mappings
 */
function applyOutputs(
    mappings: Record<string, OutputMapping>,
    output: Record<string, unknown>,
    variables: Record<string, unknown>
): Record<string, unknown> {
    const result = { ...variables };
    
    for (const [key, mapping] of Object.entries(mappings)) {
        if (key in output) {
            result[mapping.target] = output[key];
        }
    }
    
    return result;
}

/**
 * Calculate delay with backoff
 */
function calculateDelay(retryCount: number, policy: RetryPolicy): number {
    const delay = policy.initialDelay * Math.pow(policy.backoffMultiplier, retryCount);
    return Math.min(delay, policy.maxDelay);
}

/**
 * Create workflow services
 */
function createServices(instanceId: string): WorkflowServices {
    const logs: Array<{ level: string; message: string; data?: Record<string, unknown>; timestamp: number }> = [];
    const storage = new Map<string, unknown>();
    
    return {
        logger: {
            debug(message: string, data?: Record<string, unknown>): void {
                logs.push({ level: 'debug', message, data, timestamp: clock.nowMs() });
            },
            info(message: string, data?: Record<string, unknown>): void {
                logs.push({ level: 'info', message, data, timestamp: clock.nowMs() });
            },
            warn(message: string, data?: Record<string, unknown>): void {
                logs.push({ level: 'warn', message, data, timestamp: clock.nowMs() });
            },
            error(message: string, data?: Record<string, unknown>): void {
                logs.push({ level: 'error', message, data, timestamp: clock.nowMs() });
            },
        },
        storage: {
            async get(key: string): Promise<unknown> {
                return storage.get(`${instanceId}:${key}`);
            },
            async set(key: string, value: unknown): Promise<void> {
                storage.set(`${instanceId}:${key}`, value);
            },
            async delete(key: string): Promise<void> {
                storage.delete(`${instanceId}:${key}`);
            },
        },
        events: {
            async emit(event: string, data: Record<string, unknown>): Promise<void> {
                await emitEvent({
                    eventId: generateEventId(),
                    type: 'signal_sent',
                    instanceId,
                    workflowId: '',
                    stepId: null,
                    timestamp: clock.nowMs(),
                    data: { event, ...data },
                });
            },
            async wait(event: string, timeout?: number): Promise<Record<string, unknown>> {
                return new Promise((resolve, reject) => {
                    const signalKey = `${instanceId}:${event}`;
                    
                    let timeoutHandle: NodeJS.Timeout | null = null;
                    
                    if (timeout) {
                        timeoutHandle = setTimeout(() => {
                            pendingSignals.delete(signalKey);
                            reject(new Error(`Signal timeout: ${event}`));
                        }, timeout);
                    }
                    
                    pendingSignals.set(signalKey, { resolve, timeout: timeoutHandle });
                });
            },
        },
    };
}

// ============================================================================
// WORKFLOW DEFINITION
// ============================================================================

/**
 * Define workflow
 */
export function defineWorkflow(
    name: string,
    steps: readonly Omit<StepDefinition, 'stepId'>[],
    options: {
        version?: string;
        description?: string;
        triggers?: readonly Omit<WorkflowTrigger, 'triggerId'>[];
        variables?: Record<string, VariableDefinition>;
        timeout?: number;
        retryPolicy?: RetryPolicy;
        compensationPolicy?: CompensationPolicy;
        metadata?: Record<string, unknown>;
    } = {}
): WorkflowDefinition {
    const workflowId = generateWorkflowId();
    
    const stepsWithIds: StepDefinition[] = steps.map(step => ({
        ...step,
        stepId: generateStepId(),
    }));
    
    const triggersWithIds: WorkflowTrigger[] = (options.triggers ?? []).map(trigger => ({
        ...trigger,
        triggerId: generateTriggerId(),
    }));
    
    const definition: WorkflowDefinition = {
        workflowId,
        name,
        version: options.version ?? '1.0.0',
        description: options.description ?? '',
        steps: stepsWithIds,
        triggers: triggersWithIds,
        variables: options.variables ?? {},
        timeout: options.timeout ?? null,
        retryPolicy: options.retryPolicy ?? null,
        compensationPolicy: options.compensationPolicy ?? null,
        metadata: options.metadata ?? {},
    };
    
    definitions.set(workflowId, definition);
    definitions.set(name, definition);
    
    return definition;
}

/**
 * Get workflow definition
 */
export function getDefinition(nameOrId: string): WorkflowDefinition | null {
    return definitions.get(nameOrId) ?? null;
}

/**
 * Get all definitions
 */
export function getAllDefinitions(): readonly WorkflowDefinition[] {
    const uniqueDefinitions = new Map<string, WorkflowDefinition>();
    for (const definition of definitions.values()) {
        uniqueDefinitions.set(definition.workflowId, definition);
    }
    return Array.from(uniqueDefinitions.values());
}

/**
 * Remove workflow definition
 */
export function removeDefinition(nameOrId: string): boolean {
    const definition = definitions.get(nameOrId);
    if (!definition) {
        return false;
    }
    
    definitions.delete(definition.workflowId);
    definitions.delete(definition.name);
    
    return true;
}

// ============================================================================
// STEP HANDLERS
// ============================================================================

/**
 * Register step handler
 */
export function registerStepHandler(name: string, handler: StepHandler): void {
    stepHandlers.set(name, handler);
}

/**
 * Get step handler
 */
export function getStepHandler(name: string): StepHandler | null {
    return stepHandlers.get(name) ?? null;
}

/**
 * Remove step handler
 */
export function removeStepHandler(name: string): boolean {
    return stepHandlers.delete(name);
}

// ============================================================================
// WORKFLOW EXECUTION
// ============================================================================

/**
 * Start workflow
 */
export async function startWorkflow(
    workflowNameOrId: string,
    input: Record<string, unknown> = {},
    options: {
        metadata?: Record<string, unknown>;
    } = {}
): Promise<WorkflowInstance> {
    const definition = definitions.get(workflowNameOrId);
    if (!definition) {
        throw new Error(`Workflow '${workflowNameOrId}' not found`);
    }
    
    const instanceId = generateInstanceId();
    const now = clock.nowMs();
    
    const variables: Record<string, unknown> = {};
    for (const [name, varDef] of Object.entries(definition.variables)) {
        variables[name] = input[name] ?? varDef.defaultValue;
    }
    
    const stepStates: Record<string, StepState> = {};
    for (const step of definition.steps) {
        stepStates[step.stepId] = {
            stepId: step.stepId,
            status: 'pending',
            startedAt: null,
            completedAt: null,
            retryCount: 0,
            input: {},
            output: {},
            error: null,
        };
    }
    
    let instance: WorkflowInstance = {
        instanceId,
        workflowId: definition.workflowId,
        status: 'pending',
        currentStep: definition.steps.length > 0 ? definition.steps[0].stepId : null,
        variables,
        stepStates,
        history: [],
        startedAt: now,
        completedAt: null,
        error: null,
        metadata: options.metadata ?? {},
    };
    
    instance = addHistoryEntry(instance, 'workflow_started', null, { input });
    
    instances.set(instanceId, instance);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'instance_created',
        instanceId,
        workflowId: definition.workflowId,
        stepId: null,
        timestamp: now,
        data: { input },
    });
    
    updateStatistics();
    
    executeWorkflow(instanceId);
    
    return instance;
}

/**
 * Execute workflow
 */
async function executeWorkflow(instanceId: string): Promise<void> {
    let instance = instances.get(instanceId);
    if (!instance) {
        return;
    }
    
    const definition = definitions.get(instance.workflowId);
    if (!definition) {
        return;
    }
    
    instance = {
        ...instance,
        status: 'running',
    };
    instances.set(instanceId, instance);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'instance_started',
        instanceId,
        workflowId: definition.workflowId,
        stepId: null,
        timestamp: clock.nowMs(),
        data: {},
    });
    
    try {
        while (instance.currentStep && instance.status === 'running') {
            const step = definition.steps.find(s => s.stepId === instance!.currentStep);
            if (!step) {
                break;
            }
            
            instance = await executeStep(instance, step, definition);
            instances.set(instanceId, instance);
            
            if (instance.status !== 'running') {
                break;
            }
            
            const nextStepId = determineNextStep(instance, step, definition);
            instance = {
                ...instance,
                currentStep: nextStepId,
            };
            instances.set(instanceId, instance);
        }
        
        if (instance.status === 'running') {
            instance = {
                ...instance,
                status: 'completed',
                completedAt: clock.nowMs(),
            };
            instance = addHistoryEntry(instance, 'workflow_completed', null, {});
            instances.set(instanceId, instance);
            
            await emitEvent({
                eventId: generateEventId(),
                type: 'instance_completed',
                instanceId,
                workflowId: definition.workflowId,
                stepId: null,
                timestamp: clock.nowMs(),
                data: { variables: instance.variables },
            });
            
            const mutableStats = statistics as { avgExecutionTime: number; completedInstances: number };
            const duration = instance.completedAt! - instance.startedAt;
            const totalTime = mutableStats.avgExecutionTime * mutableStats.completedInstances + duration;
            mutableStats.completedInstances++;
            mutableStats.avgExecutionTime = totalTime / mutableStats.completedInstances;
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        instance = {
            ...instance,
            status: 'failed',
            completedAt: clock.nowMs(),
            error: {
                code: 'WORKFLOW_ERROR',
                message: errorMessage,
                stepId: instance.currentStep,
                details: {},
            },
        };
        instance = addHistoryEntry(instance, 'workflow_failed', instance.currentStep, { error: errorMessage });
        instances.set(instanceId, instance);
        
        await emitEvent({
            eventId: generateEventId(),
            type: 'instance_failed',
            instanceId,
            workflowId: definition.workflowId,
            stepId: instance.currentStep,
            timestamp: clock.nowMs(),
            data: { error: errorMessage },
        });
        
        if (definition.compensationPolicy?.enabled) {
            await runCompensation(instanceId);
        }
    }
    
    updateStatistics();
}

/**
 * Execute step
 */
async function executeStep(
    instance: WorkflowInstance,
    step: StepDefinition,
    definition: WorkflowDefinition
): Promise<WorkflowInstance> {
    if (step.condition && !evaluateCondition(step.condition, instance.variables as Record<string, unknown>)) {
        const stepState: StepState = {
            ...instance.stepStates[step.stepId],
            status: 'skipped',
            completedAt: clock.nowMs(),
        };
        
        instance = {
            ...instance,
            stepStates: {
                ...instance.stepStates,
                [step.stepId]: stepState,
            },
        };
        instance = addHistoryEntry(instance, 'step_skipped', step.stepId, {});
        
        await emitEvent({
            eventId: generateEventId(),
            type: 'step_skipped',
            instanceId: instance.instanceId,
            workflowId: definition.workflowId,
            stepId: step.stepId,
            timestamp: clock.nowMs(),
            data: {},
        });
        
        return instance;
    }
    
    const now = clock.nowMs();
    const input = resolveInputs(step.inputs as Record<string, InputMapping>, instance.variables as Record<string, unknown>);
    
    let stepState: StepState = {
        ...instance.stepStates[step.stepId],
        status: 'running',
        startedAt: now,
        input,
    };
    
    instance = {
        ...instance,
        stepStates: {
            ...instance.stepStates,
            [step.stepId]: stepState,
        },
    };
    instance = addHistoryEntry(instance, 'step_started', step.stepId, { input });
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'step_started',
        instanceId: instance.instanceId,
        workflowId: definition.workflowId,
        stepId: step.stepId,
        timestamp: now,
        data: { input },
    });
    
    const retryPolicy = step.retryPolicy ?? definition.retryPolicy;
    let lastError: string | null = null;
    let result: StepResult | null = null;
    
    const maxRetries = retryPolicy?.maxRetries ?? 0;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            if (attempt > 0) {
                const delay = calculateDelay(attempt - 1, retryPolicy!);
                await new Promise(resolve => setTimeout(resolve, delay));
                
                stepState = {
                    ...stepState,
                    retryCount: attempt,
                };
                
                instance = {
                    ...instance,
                    stepStates: {
                        ...instance.stepStates,
                        [step.stepId]: stepState,
                    },
                };
                instance = addHistoryEntry(instance, 'step_retried', step.stepId, { attempt });
                
                await emitEvent({
                    eventId: generateEventId(),
                    type: 'step_retried',
                    instanceId: instance.instanceId,
                    workflowId: definition.workflowId,
                    stepId: step.stepId,
                    timestamp: clock.nowMs(),
                    data: { attempt },
                });
                
                const mutableStats = statistics as { totalRetries: number };
                mutableStats.totalRetries++;
            }
            
            if (step.type === 'parallel' && step.parallel) {
                result = await executeParallelSteps(instance, step.parallel, definition);
            } else if (step.type === 'loop' && step.loop) {
                result = await executeLoopStep(instance, step, definition);
            } else if (step.handler) {
                const context: StepContext = {
                    instanceId: instance.instanceId,
                    workflowId: definition.workflowId,
                    stepId: step.stepId,
                    variables: instance.variables,
                    input,
                    retryCount: attempt,
                    services: createServices(instance.instanceId),
                };
                
                result = await step.handler(context);
            } else {
                const handler = stepHandlers.get(step.name);
                if (handler) {
                    const context: StepContext = {
                        instanceId: instance.instanceId,
                        workflowId: definition.workflowId,
                        stepId: step.stepId,
                        variables: instance.variables,
                        input,
                        retryCount: attempt,
                        services: createServices(instance.instanceId),
                    };
                    
                    result = await handler(context);
                } else {
                    result = {
                        success: true,
                        output: {},
                        error: null,
                        nextStep: null,
                    };
                }
            }
            
            if (result.success) {
                break;
            }
            
            lastError = result.error;
        } catch (error) {
            lastError = error instanceof Error ? error.message : 'Unknown error';
            result = {
                success: false,
                output: {},
                error: lastError,
                nextStep: null,
            };
        }
    }
    
    const mutableStats = statistics as { totalStepsExecuted: number };
    mutableStats.totalStepsExecuted++;
    
    if (result?.success) {
        const newVariables = applyOutputs(
            step.outputs as Record<string, OutputMapping>,
            result.output as Record<string, unknown>,
            instance.variables as Record<string, unknown>
        );
        
        stepState = {
            ...stepState,
            status: 'completed',
            completedAt: clock.nowMs(),
            output: result.output,
        };
        
        instance = {
            ...instance,
            variables: newVariables,
            stepStates: {
                ...instance.stepStates,
                [step.stepId]: stepState,
            },
        };
        instance = addHistoryEntry(instance, 'step_completed', step.stepId, { output: result.output });
        
        await emitEvent({
            eventId: generateEventId(),
            type: 'step_completed',
            instanceId: instance.instanceId,
            workflowId: definition.workflowId,
            stepId: step.stepId,
            timestamp: clock.nowMs(),
            data: { output: result.output },
        });
    } else {
        stepState = {
            ...stepState,
            status: 'failed',
            completedAt: clock.nowMs(),
            error: lastError,
        };
        
        instance = {
            ...instance,
            stepStates: {
                ...instance.stepStates,
                [step.stepId]: stepState,
            },
        };
        instance = addHistoryEntry(instance, 'step_failed', step.stepId, { error: lastError });
        
        await emitEvent({
            eventId: generateEventId(),
            type: 'step_failed',
            instanceId: instance.instanceId,
            workflowId: definition.workflowId,
            stepId: step.stepId,
            timestamp: clock.nowMs(),
            data: { error: lastError },
        });
        
        if (step.onError) {
            instance = await handleStepError(instance, step, definition, lastError);
        } else {
            instance = {
                ...instance,
                status: 'failed',
                error: {
                    code: 'STEP_FAILED',
                    message: lastError ?? 'Step failed',
                    stepId: step.stepId,
                    details: {},
                },
            };
        }
    }
    
    return instance;
}

/**
 * Execute parallel steps
 */
async function executeParallelSteps(
    instance: WorkflowInstance,
    steps: readonly StepDefinition[],
    definition: WorkflowDefinition
): Promise<StepResult> {
    const results = await Promise.all(
        steps.map(async step => {
            const updatedInstance = await executeStep(instance, step, definition);
            return updatedInstance.stepStates[step.stepId];
        })
    );
    
    const allSucceeded = results.every(r => r.status === 'completed');
    const outputs: Record<string, unknown> = {};
    
    for (const result of results) {
        Object.assign(outputs, result.output);
    }
    
    return {
        success: allSucceeded,
        output: outputs,
        error: allSucceeded ? null : 'One or more parallel steps failed',
        nextStep: null,
    };
}

/**
 * Execute loop step
 */
async function executeLoopStep(
    instance: WorkflowInstance,
    step: StepDefinition,
    definition: WorkflowDefinition
): Promise<StepResult> {
    const loop = step.loop!;
    const outputs: unknown[] = [];
    let iteration = 0;
    
    if (loop.type === 'foreach' && loop.collection) {
        const collection = instance.variables[loop.collection] as unknown[];
        
        if (Array.isArray(collection)) {
            for (const item of collection) {
                if (iteration >= loop.maxIterations) {
                    break;
                }
                
                const iterationVariables = {
                    ...instance.variables,
                    __item: item,
                    __index: iteration,
                };
                
                const iterationInstance = {
                    ...instance,
                    variables: iterationVariables,
                };
                
                if (step.handler) {
                    const context: StepContext = {
                        instanceId: instance.instanceId,
                        workflowId: definition.workflowId,
                        stepId: step.stepId,
                        variables: iterationVariables,
                        input: { item, index: iteration },
                        retryCount: 0,
                        services: createServices(instance.instanceId),
                    };
                    
                    const result = await step.handler(context);
                    outputs.push(result.output);
                }
                
                iteration++;
            }
        }
    } else if (loop.type === 'times') {
        for (let i = 0; i < loop.maxIterations; i++) {
            if (step.handler) {
                const context: StepContext = {
                    instanceId: instance.instanceId,
                    workflowId: definition.workflowId,
                    stepId: step.stepId,
                    variables: { ...instance.variables, __index: i },
                    input: { index: i },
                    retryCount: 0,
                    services: createServices(instance.instanceId),
                };
                
                const result = await step.handler(context);
                outputs.push(result.output);
            }
            
            iteration++;
        }
    }
    
    return {
        success: true,
        output: { results: outputs, iterations: iteration },
        error: null,
        nextStep: null,
    };
}

/**
 * Handle step error
 */
async function handleStepError(
    instance: WorkflowInstance,
    step: StepDefinition,
    definition: WorkflowDefinition,
    error: string | null
): Promise<WorkflowInstance> {
    const errorHandler = step.onError!;
    
    switch (errorHandler.type) {
        case 'skip':
            return instance;
        case 'goto':
            if (errorHandler.target) {
                return {
                    ...instance,
                    currentStep: errorHandler.target,
                };
            }
            break;
        case 'compensate':
            if (step.compensation) {
                await executeStep(instance, step.compensation, definition);
            }
            break;
        case 'fail':
        default:
            return {
                ...instance,
                status: 'failed',
                error: {
                    code: 'STEP_FAILED',
                    message: error ?? 'Step failed',
                    stepId: step.stepId,
                    details: {},
                },
            };
    }
    
    return instance;
}

/**
 * Determine next step
 */
function determineNextStep(
    instance: WorkflowInstance,
    currentStep: StepDefinition,
    definition: WorkflowDefinition
): string | null {
    const stepState = instance.stepStates[currentStep.stepId];
    
    if (stepState.status === 'completed' && currentStep.next.length > 0) {
        for (const nextStepId of currentStep.next) {
            const nextStep = definition.steps.find(s => s.stepId === nextStepId);
            if (nextStep) {
                if (!nextStep.condition || evaluateCondition(nextStep.condition, instance.variables as Record<string, unknown>)) {
                    return nextStepId;
                }
            }
        }
    }
    
    const currentIndex = definition.steps.findIndex(s => s.stepId === currentStep.stepId);
    if (currentIndex >= 0 && currentIndex < definition.steps.length - 1) {
        return definition.steps[currentIndex + 1].stepId;
    }
    
    return null;
}

/**
 * Run compensation
 */
async function runCompensation(instanceId: string): Promise<void> {
    let instance = instances.get(instanceId);
    if (!instance) {
        return;
    }
    
    const definition = definitions.get(instance.workflowId);
    if (!definition || !definition.compensationPolicy?.enabled) {
        return;
    }
    
    instance = {
        ...instance,
        status: 'compensating',
    };
    instance = addHistoryEntry(instance, 'compensation_started', null, {});
    instances.set(instanceId, instance);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'compensation_started',
        instanceId,
        workflowId: definition.workflowId,
        stepId: null,
        timestamp: clock.nowMs(),
        data: {},
    });
    
    const completedSteps = definition.steps.filter(
        step => instance!.stepStates[step.stepId].status === 'completed' && step.compensation
    ).reverse();
    
    for (const step of completedSteps) {
        if (step.compensation) {
            await executeStep(instance, step.compensation, definition);
            
            const stepState = instance.stepStates[step.stepId];
            instance = {
                ...instance,
                stepStates: {
                    ...instance.stepStates,
                    [step.stepId]: {
                        ...stepState,
                        status: 'compensated',
                    },
                },
            };
            instances.set(instanceId, instance);
        }
    }
    
    instance = addHistoryEntry(instance, 'compensation_completed', null, {});
    instances.set(instanceId, instance);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'compensation_completed',
        instanceId,
        workflowId: definition.workflowId,
        stepId: null,
        timestamp: clock.nowMs(),
        data: {},
    });
    
    const mutableStats = statistics as { totalCompensations: number };
    mutableStats.totalCompensations++;
}

// ============================================================================
// WORKFLOW CONTROL
// ============================================================================

/**
 * Pause workflow
 */
export async function pauseWorkflow(instanceId: string): Promise<boolean> {
    let instance = instances.get(instanceId);
    if (!instance || instance.status !== 'running') {
        return false;
    }
    
    instance = {
        ...instance,
        status: 'paused',
    };
    instance = addHistoryEntry(instance, 'workflow_paused', instance.currentStep, {});
    instances.set(instanceId, instance);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'instance_paused',
        instanceId,
        workflowId: instance.workflowId,
        stepId: instance.currentStep,
        timestamp: clock.nowMs(),
        data: {},
    });
    
    updateStatistics();
    
    return true;
}

/**
 * Resume workflow
 */
export async function resumeWorkflow(instanceId: string): Promise<boolean> {
    let instance = instances.get(instanceId);
    if (!instance || instance.status !== 'paused') {
        return false;
    }
    
    instance = {
        ...instance,
        status: 'running',
    };
    instance = addHistoryEntry(instance, 'workflow_resumed', instance.currentStep, {});
    instances.set(instanceId, instance);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'instance_resumed',
        instanceId,
        workflowId: instance.workflowId,
        stepId: instance.currentStep,
        timestamp: clock.nowMs(),
        data: {},
    });
    
    executeWorkflow(instanceId);
    
    return true;
}

/**
 * Cancel workflow
 */
export async function cancelWorkflow(instanceId: string): Promise<boolean> {
    let instance = instances.get(instanceId);
    if (!instance || (instance.status !== 'running' && instance.status !== 'paused')) {
        return false;
    }
    
    instance = {
        ...instance,
        status: 'cancelled',
        completedAt: clock.nowMs(),
    };
    instance = addHistoryEntry(instance, 'workflow_cancelled', instance.currentStep, {});
    instances.set(instanceId, instance);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'instance_cancelled',
        instanceId,
        workflowId: instance.workflowId,
        stepId: instance.currentStep,
        timestamp: clock.nowMs(),
        data: {},
    });
    
    updateStatistics();
    
    return true;
}

/**
 * Send signal to workflow
 */
export async function sendSignal(instanceId: string, signal: string, data: Record<string, unknown> = {}): Promise<boolean> {
    const signalKey = `${instanceId}:${signal}`;
    const pending = pendingSignals.get(signalKey);
    
    if (pending) {
        if (pending.timeout) {
            clearTimeout(pending.timeout);
        }
        pending.resolve(data);
        pendingSignals.delete(signalKey);
        
        let instance = instances.get(instanceId);
        if (instance) {
            instance = addHistoryEntry(instance, 'signal_received', null, { signal, data });
            instances.set(instanceId, instance);
        }
        
        await emitEvent({
            eventId: generateEventId(),
            type: 'signal_received',
            instanceId,
            workflowId: instance?.workflowId ?? '',
            stepId: null,
            timestamp: clock.nowMs(),
            data: { signal, ...data },
        });
        
        return true;
    }
    
    return false;
}

// ============================================================================
// INSTANCE MANAGEMENT
// ============================================================================

/**
 * Get workflow instance
 */
export function getInstance(instanceId: string): WorkflowInstance | null {
    return instances.get(instanceId) ?? null;
}

/**
 * Get all instances
 */
export function getAllInstances(): readonly WorkflowInstance[] {
    return Array.from(instances.values());
}

/**
 * Get instances by workflow
 */
export function getInstancesByWorkflow(workflowNameOrId: string): readonly WorkflowInstance[] {
    const definition = definitions.get(workflowNameOrId);
    if (!definition) {
        return [];
    }
    
    return Array.from(instances.values()).filter(i => i.workflowId === definition.workflowId);
}

/**
 * Get instances by status
 */
export function getInstancesByStatus(status: WorkflowStatus): readonly WorkflowInstance[] {
    return Array.from(instances.values()).filter(i => i.status === status);
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get statistics
 */
export function getStatistics(): Readonly<WorkflowStatistics> {
    updateStatistics();
    return { ...statistics };
}

/**
 * Reset statistics
 */
export function resetStatistics(): void {
    Object.assign(statistics, {
        totalInstances: 0,
        runningInstances: 0,
        completedInstances: 0,
        failedInstances: 0,
        cancelledInstances: 0,
        avgExecutionTime: 0,
        totalStepsExecuted: 0,
        totalRetries: 0,
        totalCompensations: 0,
    });
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Add event listener
 */
export function addEventListener(listener: WorkflowEventListener): void {
    eventListeners.add(listener);
}

/**
 * Remove event listener
 */
export function removeEventListener(listener: WorkflowEventListener): void {
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
    definitions.clear();
    instances.clear();
    stepHandlers.clear();
    eventListeners.clear();
    pendingSignals.clear();
    resetStatistics();
}
