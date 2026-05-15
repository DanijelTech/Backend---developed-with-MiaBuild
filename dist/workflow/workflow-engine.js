"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineWorkflow = defineWorkflow;
exports.getDefinition = getDefinition;
exports.getAllDefinitions = getAllDefinitions;
exports.removeDefinition = removeDefinition;
exports.registerStepHandler = registerStepHandler;
exports.getStepHandler = getStepHandler;
exports.removeStepHandler = removeStepHandler;
exports.startWorkflow = startWorkflow;
exports.pauseWorkflow = pauseWorkflow;
exports.resumeWorkflow = resumeWorkflow;
exports.cancelWorkflow = cancelWorkflow;
exports.sendSignal = sendSignal;
exports.getInstance = getInstance;
exports.getAllInstances = getAllInstances;
exports.getInstancesByWorkflow = getInstancesByWorkflow;
exports.getInstancesByStatus = getInstancesByStatus;
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
const definitions = new Map();
const instances = new Map();
const stepHandlers = new Map();
const eventListeners = new Set();
const pendingSignals = new Map();
let workflowCounter = 0;
let instanceCounter = 0;
let stepCounter = 0;
let triggerCounter = 0;
let historyCounter = 0;
let eventCounter = 0;
const statistics = {
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
function generateWorkflowId() {
    workflowCounter++;
    return (0, deterministic_1.generateDeterministicId)(`workflow-${workflowCounter}`);
}
/**
 * Generate instance ID
 */
function generateInstanceId() {
    instanceCounter++;
    return (0, deterministic_1.generateDeterministicId)(`wf-instance-${instanceCounter}`);
}
/**
 * Generate step ID
 */
function generateStepId() {
    stepCounter++;
    return (0, deterministic_1.generateDeterministicId)(`wf-step-${stepCounter}`);
}
/**
 * Generate trigger ID
 */
function generateTriggerId() {
    triggerCounter++;
    return (0, deterministic_1.generateDeterministicId)(`wf-trigger-${triggerCounter}`);
}
/**
 * Generate history ID
 */
function generateHistoryId() {
    historyCounter++;
    return (0, deterministic_1.generateDeterministicId)(`wf-history-${historyCounter}`);
}
/**
 * Generate event ID
 */
function generateEventId() {
    eventCounter++;
    return (0, deterministic_1.generateDeterministicId)(`wf-event-${eventCounter}`);
}
/**
 * Emit workflow event
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
 * Add history entry
 */
function addHistoryEntry(instance, type, stepId, data) {
    const entry = {
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
function updateStatistics() {
    const mutableStats = statistics;
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
function evaluateCondition(condition, variables) {
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
function resolveInputs(mappings, variables) {
    const result = {};
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
function applyOutputs(mappings, output, variables) {
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
function calculateDelay(retryCount, policy) {
    const delay = policy.initialDelay * Math.pow(policy.backoffMultiplier, retryCount);
    return Math.min(delay, policy.maxDelay);
}
/**
 * Create workflow services
 */
function createServices(instanceId) {
    const logs = [];
    const storage = new Map();
    return {
        logger: {
            debug(message, data) {
                logs.push({ level: 'debug', message, data, timestamp: clock.nowMs() });
            },
            info(message, data) {
                logs.push({ level: 'info', message, data, timestamp: clock.nowMs() });
            },
            warn(message, data) {
                logs.push({ level: 'warn', message, data, timestamp: clock.nowMs() });
            },
            error(message, data) {
                logs.push({ level: 'error', message, data, timestamp: clock.nowMs() });
            },
        },
        storage: {
            async get(key) {
                return storage.get(`${instanceId}:${key}`);
            },
            async set(key, value) {
                storage.set(`${instanceId}:${key}`, value);
            },
            async delete(key) {
                storage.delete(`${instanceId}:${key}`);
            },
        },
        events: {
            async emit(event, data) {
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
            async wait(event, timeout) {
                return new Promise((resolve, reject) => {
                    const signalKey = `${instanceId}:${event}`;
                    let timeoutHandle = null;
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
function defineWorkflow(name, steps, options = {}) {
    const workflowId = generateWorkflowId();
    const stepsWithIds = steps.map(step => ({
        ...step,
        stepId: generateStepId(),
    }));
    const triggersWithIds = (options.triggers ?? []).map(trigger => ({
        ...trigger,
        triggerId: generateTriggerId(),
    }));
    const definition = {
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
function getDefinition(nameOrId) {
    return definitions.get(nameOrId) ?? null;
}
/**
 * Get all definitions
 */
function getAllDefinitions() {
    const uniqueDefinitions = new Map();
    for (const definition of definitions.values()) {
        uniqueDefinitions.set(definition.workflowId, definition);
    }
    return Array.from(uniqueDefinitions.values());
}
/**
 * Remove workflow definition
 */
function removeDefinition(nameOrId) {
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
function registerStepHandler(name, handler) {
    stepHandlers.set(name, handler);
}
/**
 * Get step handler
 */
function getStepHandler(name) {
    return stepHandlers.get(name) ?? null;
}
/**
 * Remove step handler
 */
function removeStepHandler(name) {
    return stepHandlers.delete(name);
}
// ============================================================================
// WORKFLOW EXECUTION
// ============================================================================
/**
 * Start workflow
 */
async function startWorkflow(workflowNameOrId, input = {}, options = {}) {
    const definition = definitions.get(workflowNameOrId);
    if (!definition) {
        throw new Error(`Workflow '${workflowNameOrId}' not found`);
    }
    const instanceId = generateInstanceId();
    const now = clock.nowMs();
    const variables = {};
    for (const [name, varDef] of Object.entries(definition.variables)) {
        variables[name] = input[name] ?? varDef.defaultValue;
    }
    const stepStates = {};
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
    let instance = {
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
async function executeWorkflow(instanceId) {
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
            const step = definition.steps.find(s => s.stepId === instance.currentStep);
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
            const mutableStats = statistics;
            const duration = instance.completedAt - instance.startedAt;
            const totalTime = mutableStats.avgExecutionTime * mutableStats.completedInstances + duration;
            mutableStats.completedInstances++;
            mutableStats.avgExecutionTime = totalTime / mutableStats.completedInstances;
        }
    }
    catch (error) {
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
async function executeStep(instance, step, definition) {
    if (step.condition && !evaluateCondition(step.condition, instance.variables)) {
        const stepState = {
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
    const input = resolveInputs(step.inputs, instance.variables);
    let stepState = {
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
    let lastError = null;
    let result = null;
    const maxRetries = retryPolicy?.maxRetries ?? 0;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            if (attempt > 0) {
                const delay = calculateDelay(attempt - 1, retryPolicy);
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
                const mutableStats = statistics;
                mutableStats.totalRetries++;
            }
            if (step.type === 'parallel' && step.parallel) {
                result = await executeParallelSteps(instance, step.parallel, definition);
            }
            else if (step.type === 'loop' && step.loop) {
                result = await executeLoopStep(instance, step, definition);
            }
            else if (step.handler) {
                const context = {
                    instanceId: instance.instanceId,
                    workflowId: definition.workflowId,
                    stepId: step.stepId,
                    variables: instance.variables,
                    input,
                    retryCount: attempt,
                    services: createServices(instance.instanceId),
                };
                result = await step.handler(context);
            }
            else {
                const handler = stepHandlers.get(step.name);
                if (handler) {
                    const context = {
                        instanceId: instance.instanceId,
                        workflowId: definition.workflowId,
                        stepId: step.stepId,
                        variables: instance.variables,
                        input,
                        retryCount: attempt,
                        services: createServices(instance.instanceId),
                    };
                    result = await handler(context);
                }
                else {
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
        }
        catch (error) {
            lastError = error instanceof Error ? error.message : 'Unknown error';
            result = {
                success: false,
                output: {},
                error: lastError,
                nextStep: null,
            };
        }
    }
    const mutableStats = statistics;
    mutableStats.totalStepsExecuted++;
    if (result?.success) {
        const newVariables = applyOutputs(step.outputs, result.output, instance.variables);
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
    }
    else {
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
        }
        else {
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
async function executeParallelSteps(instance, steps, definition) {
    const results = await Promise.all(steps.map(async (step) => {
        const updatedInstance = await executeStep(instance, step, definition);
        return updatedInstance.stepStates[step.stepId];
    }));
    const allSucceeded = results.every(r => r.status === 'completed');
    const outputs = {};
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
async function executeLoopStep(instance, step, definition) {
    const loop = step.loop;
    const outputs = [];
    let iteration = 0;
    if (loop.type === 'foreach' && loop.collection) {
        const collection = instance.variables[loop.collection];
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
                    const context = {
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
    }
    else if (loop.type === 'times') {
        for (let i = 0; i < loop.maxIterations; i++) {
            if (step.handler) {
                const context = {
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
async function handleStepError(instance, step, definition, error) {
    const errorHandler = step.onError;
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
function determineNextStep(instance, currentStep, definition) {
    const stepState = instance.stepStates[currentStep.stepId];
    if (stepState.status === 'completed' && currentStep.next.length > 0) {
        for (const nextStepId of currentStep.next) {
            const nextStep = definition.steps.find(s => s.stepId === nextStepId);
            if (nextStep) {
                if (!nextStep.condition || evaluateCondition(nextStep.condition, instance.variables)) {
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
async function runCompensation(instanceId) {
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
    const completedSteps = definition.steps.filter(step => instance.stepStates[step.stepId].status === 'completed' && step.compensation).reverse();
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
    const mutableStats = statistics;
    mutableStats.totalCompensations++;
}
// ============================================================================
// WORKFLOW CONTROL
// ============================================================================
/**
 * Pause workflow
 */
async function pauseWorkflow(instanceId) {
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
async function resumeWorkflow(instanceId) {
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
async function cancelWorkflow(instanceId) {
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
async function sendSignal(instanceId, signal, data = {}) {
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
function getInstance(instanceId) {
    return instances.get(instanceId) ?? null;
}
/**
 * Get all instances
 */
function getAllInstances() {
    return Array.from(instances.values());
}
/**
 * Get instances by workflow
 */
function getInstancesByWorkflow(workflowNameOrId) {
    const definition = definitions.get(workflowNameOrId);
    if (!definition) {
        return [];
    }
    return Array.from(instances.values()).filter(i => i.workflowId === definition.workflowId);
}
/**
 * Get instances by status
 */
function getInstancesByStatus(status) {
    return Array.from(instances.values()).filter(i => i.status === status);
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
    definitions.clear();
    instances.clear();
    stepHandlers.clear();
    eventListeners.clear();
    pendingSignals.clear();
    resetStatistics();
}
