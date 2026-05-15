/**
 * @file State Machine za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 * 
 * @requirement ZAH-ZALEDNI-WF-002 State machine za zaledne sisteme
 * @design DSN-ZALEDNI-WF-002 Backend state machine arhitektura
 * @test TEST-ZALEDNI-WF-002 Preverjanje state machine
 * 
 * State Machine - prilagojen za zaledne sisteme:
 * - State definition
 * - Transition rules
 * - Guards and actions
 * - Hierarchical states
 * - Parallel states
 * - History states
 * - Event handling
 * - State persistence
 * 
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom WF_002 - State Machine
 */

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI ZA STATE MACHINE
// ============================================================================

/**
 * State type
 */
export type StateType = 'atomic' | 'compound' | 'parallel' | 'final' | 'history';

/**
 * History type
 */
export type HistoryType = 'shallow' | 'deep';

/**
 * State definition
 */
export interface StateDefinition {
    readonly stateId: string;
    readonly name: string;
    readonly type: StateType;
    readonly initial: string | null;
    readonly final: boolean;
    readonly parent: string | null;
    readonly children: readonly string[];
    readonly historyType: HistoryType | null;
    readonly onEntry: readonly StateAction[];
    readonly onExit: readonly StateAction[];
    readonly transitions: readonly TransitionDefinition[];
    readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Transition definition
 */
export interface TransitionDefinition {
    readonly transitionId: string;
    readonly event: string;
    readonly target: string | null;
    readonly guard: TransitionGuard | null;
    readonly actions: readonly TransitionAction[];
    readonly internal: boolean;
}

/**
 * State action
 */
export interface StateAction {
    readonly actionId: string;
    readonly type: ActionType;
    readonly handler: ActionHandler;
    readonly params: Readonly<Record<string, unknown>>;
}

/**
 * Transition action
 */
export interface TransitionAction {
    readonly actionId: string;
    readonly type: ActionType;
    readonly handler: ActionHandler;
    readonly params: Readonly<Record<string, unknown>>;
}

/**
 * Action type
 */
export type ActionType = 'assign' | 'send' | 'raise' | 'log' | 'custom';

/**
 * Action handler
 */
export type ActionHandler = (context: ActionContext) => void | Promise<void>;

/**
 * Action context
 */
export interface ActionContext {
    readonly machineId: string;
    readonly instanceId: string;
    readonly state: string;
    readonly event: MachineEvent | null;
    readonly context: Readonly<Record<string, unknown>>;
    readonly params: Readonly<Record<string, unknown>>;
    assign(updates: Record<string, unknown>): void;
    send(event: string, data?: Record<string, unknown>): void;
    raise(event: string, data?: Record<string, unknown>): void;
}

/**
 * Transition guard
 */
export interface TransitionGuard {
    readonly guardId: string;
    readonly condition: GuardCondition;
    readonly params: Readonly<Record<string, unknown>>;
}

/**
 * Guard condition
 */
export type GuardCondition = (context: GuardContext) => boolean;

/**
 * Guard context
 */
export interface GuardContext {
    readonly machineId: string;
    readonly instanceId: string;
    readonly state: string;
    readonly event: MachineEvent;
    readonly context: Readonly<Record<string, unknown>>;
    readonly params: Readonly<Record<string, unknown>>;
}

/**
 * Machine event
 */
export interface MachineEvent {
    readonly eventId: string;
    readonly type: string;
    readonly data: Readonly<Record<string, unknown>>;
    readonly timestamp: number;
}

/**
 * Machine definition
 */
export interface MachineDefinition {
    readonly machineId: string;
    readonly name: string;
    readonly version: string;
    readonly description: string;
    readonly initial: string;
    readonly context: Readonly<Record<string, unknown>>;
    readonly states: Readonly<Record<string, StateDefinition>>;
    readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Machine instance
 */
export interface MachineInstance {
    readonly instanceId: string;
    readonly machineId: string;
    readonly currentState: string;
    readonly context: Readonly<Record<string, unknown>>;
    readonly history: Readonly<Record<string, string>>;
    readonly eventQueue: readonly MachineEvent[];
    readonly status: MachineStatus;
    readonly startedAt: number;
    readonly updatedAt: number;
    readonly stateHistory: readonly StateHistoryEntry[];
}

/**
 * Machine status
 */
export type MachineStatus = 'idle' | 'running' | 'stopped' | 'error';

/**
 * State history entry
 */
export interface StateHistoryEntry {
    readonly entryId: string;
    readonly fromState: string | null;
    readonly toState: string;
    readonly event: string | null;
    readonly timestamp: number;
    readonly context: Readonly<Record<string, unknown>>;
}

/**
 * Transition result
 */
export interface TransitionResult {
    readonly success: boolean;
    readonly fromState: string;
    readonly toState: string;
    readonly event: MachineEvent;
    readonly actionsExecuted: number;
    readonly error: string | null;
}

/**
 * State machine event
 */
export interface StateMachineEvent {
    readonly eventId: string;
    readonly type: StateMachineEventType;
    readonly instanceId: string;
    readonly machineId: string;
    readonly timestamp: number;
    readonly data: Readonly<Record<string, unknown>>;
}

/**
 * State machine event type
 */
export type StateMachineEventType =
    | 'machine_created'
    | 'machine_started'
    | 'machine_stopped'
    | 'state_entered'
    | 'state_exited'
    | 'transition_started'
    | 'transition_completed'
    | 'transition_failed'
    | 'event_sent'
    | 'event_processed'
    | 'context_updated'
    | 'error_occurred';

/**
 * State machine event listener
 */
export type StateMachineEventListener = (event: StateMachineEvent) => void | Promise<void>;

/**
 * State machine statistics
 */
export interface StateMachineStatistics {
    readonly totalMachines: number;
    readonly totalInstances: number;
    readonly runningInstances: number;
    readonly stoppedInstances: number;
    readonly totalTransitions: number;
    readonly failedTransitions: number;
    readonly totalEventsProcessed: number;
    readonly avgTransitionTime: number;
}

/**
 * State snapshot
 */
export interface StateSnapshot {
    readonly snapshotId: string;
    readonly instanceId: string;
    readonly state: string;
    readonly context: Readonly<Record<string, unknown>>;
    readonly history: Readonly<Record<string, string>>;
    readonly timestamp: number;
}

// ============================================================================
// STANJE
// ============================================================================

const machines: Map<string, MachineDefinition> = new Map();
const instances: Map<string, MachineInstance> = new Map();
const actionHandlers: Map<string, ActionHandler> = new Map();
const guardConditions: Map<string, GuardCondition> = new Map();
const eventListeners: Set<StateMachineEventListener> = new Set();
const snapshots: Map<string, StateSnapshot[]> = new Map();

let machineCounter = 0;
let instanceCounter = 0;
let stateCounter = 0;
let transitionCounter = 0;
let actionCounter = 0;
let guardCounter = 0;
let eventCounter = 0;
let historyCounter = 0;
let snapshotCounter = 0;

const statistics: StateMachineStatistics = {
    totalMachines: 0,
    totalInstances: 0,
    runningInstances: 0,
    stoppedInstances: 0,
    totalTransitions: 0,
    failedTransitions: 0,
    totalEventsProcessed: 0,
    avgTransitionTime: 0,
};

// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================

/**
 * Generate machine ID
 */
function generateMachineId(): string {
    machineCounter++;
    return generateDeterministicId(`machine-${machineCounter}`);
}

/**
 * Generate instance ID
 */
function generateInstanceId(): string {
    instanceCounter++;
    return generateDeterministicId(`sm-instance-${instanceCounter}`);
}

/**
 * Generate state ID
 */
function generateStateId(): string {
    stateCounter++;
    return generateDeterministicId(`state-${stateCounter}`);
}

/**
 * Generate transition ID
 */
function generateTransitionId(): string {
    transitionCounter++;
    return generateDeterministicId(`transition-${transitionCounter}`);
}

/**
 * Generate action ID
 */
function generateActionId(): string {
    actionCounter++;
    return generateDeterministicId(`sm-action-${actionCounter}`);
}

/**
 * Generate guard ID
 */
function generateGuardId(): string {
    guardCounter++;
    return generateDeterministicId(`guard-${guardCounter}`);
}

/**
 * Generate event ID
 */
function generateEventId(): string {
    eventCounter++;
    return generateDeterministicId(`sm-event-${eventCounter}`);
}

/**
 * Generate history ID
 */
function generateHistoryId(): string {
    historyCounter++;
    return generateDeterministicId(`sm-history-${historyCounter}`);
}

/**
 * Generate snapshot ID
 */
function generateSnapshotId(): string {
    snapshotCounter++;
    return generateDeterministicId(`snapshot-${snapshotCounter}`);
}

/**
 * Emit state machine event
 */
async function emitEvent(event: StateMachineEvent): Promise<void> {
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
        totalMachines: number;
        totalInstances: number;
        runningInstances: number;
        stoppedInstances: number;
    };
    
    mutableStats.totalMachines = machines.size;
    mutableStats.totalInstances = instances.size;
    mutableStats.runningInstances = 0;
    mutableStats.stoppedInstances = 0;
    
    for (const instance of instances.values()) {
        if (instance.status === 'running') {
            mutableStats.runningInstances++;
        } else if (instance.status === 'stopped') {
            mutableStats.stoppedInstances++;
        }
    }
}

/**
 * Get state path
 */
function getStatePath(machine: MachineDefinition, stateId: string): readonly string[] {
    const path: string[] = [];
    let current = stateId;
    
    while (current) {
        path.unshift(current);
        const state = machine.states[current];
        if (!state || !state.parent) {
            break;
        }
        current = state.parent;
    }
    
    return path;
}

/**
 * Get active states
 */
function getActiveStates(machine: MachineDefinition, stateId: string): readonly string[] {
    const active: string[] = [stateId];
    const state = machine.states[stateId];
    
    if (state && state.type === 'compound' && state.initial) {
        active.push(...getActiveStates(machine, state.initial));
    } else if (state && state.type === 'parallel') {
        for (const childId of state.children) {
            active.push(...getActiveStates(machine, childId));
        }
    }
    
    return active;
}

/**
 * Find transition
 */
function findTransition(
    machine: MachineDefinition,
    stateId: string,
    eventType: string,
    context: Record<string, unknown>,
    event: MachineEvent
): { state: StateDefinition; transition: TransitionDefinition } | null {
    const statePath = getStatePath(machine, stateId);
    
    for (let i = statePath.length - 1; i >= 0; i--) {
        const state = machine.states[statePath[i]];
        if (!state) continue;
        
        for (const transition of state.transitions) {
            if (transition.event === eventType) {
                if (transition.guard) {
                    const guardContext: GuardContext = {
                        machineId: machine.machineId,
                        instanceId: '',
                        state: stateId,
                        event,
                        context,
                        params: transition.guard.params,
                    };
                    
                    if (!transition.guard.condition(guardContext)) {
                        continue;
                    }
                }
                
                return { state, transition };
            }
        }
    }
    
    return null;
}

/**
 * Get exit states
 */
function getExitStates(
    machine: MachineDefinition,
    fromState: string,
    toState: string
): readonly string[] {
    const fromPath = getStatePath(machine, fromState);
    const toPath = getStatePath(machine, toState);
    
    let commonAncestorIndex = 0;
    while (
        commonAncestorIndex < fromPath.length &&
        commonAncestorIndex < toPath.length &&
        fromPath[commonAncestorIndex] === toPath[commonAncestorIndex]
    ) {
        commonAncestorIndex++;
    }
    
    return fromPath.slice(commonAncestorIndex).reverse();
}

/**
 * Get entry states
 */
function getEntryStates(
    machine: MachineDefinition,
    fromState: string,
    toState: string
): readonly string[] {
    const fromPath = getStatePath(machine, fromState);
    const toPath = getStatePath(machine, toState);
    
    let commonAncestorIndex = 0;
    while (
        commonAncestorIndex < fromPath.length &&
        commonAncestorIndex < toPath.length &&
        fromPath[commonAncestorIndex] === toPath[commonAncestorIndex]
    ) {
        commonAncestorIndex++;
    }
    
    return toPath.slice(commonAncestorIndex);
}

// ============================================================================
// MACHINE DEFINITION
// ============================================================================

/**
 * Define machine
 */
export function defineMachine(
    name: string,
    config: {
        version?: string;
        description?: string;
        initial: string;
        context?: Record<string, unknown>;
        states: Record<string, Omit<StateDefinition, 'stateId'>>;
        metadata?: Record<string, unknown>;
    }
): MachineDefinition {
    const machineId = generateMachineId();
    
    const states: Record<string, StateDefinition> = {};
    
    for (const [stateName, stateConfig] of Object.entries(config.states)) {
        states[stateName] = {
            ...stateConfig,
            stateId: generateStateId(),
            name: stateName,
            transitions: stateConfig.transitions.map(t => ({
                ...t,
                transitionId: generateTransitionId(),
            })),
            onEntry: stateConfig.onEntry.map(a => ({
                ...a,
                actionId: generateActionId(),
            })),
            onExit: stateConfig.onExit.map(a => ({
                ...a,
                actionId: generateActionId(),
            })),
        };
    }
    
    const machine: MachineDefinition = {
        machineId,
        name,
        version: config.version ?? '1.0.0',
        description: config.description ?? '',
        initial: config.initial,
        context: config.context ?? {},
        states,
        metadata: config.metadata ?? {},
    };
    
    machines.set(machineId, machine);
    machines.set(name, machine);
    
    updateStatistics();
    
    return machine;
}

/**
 * Get machine definition
 */
export function getMachine(nameOrId: string): MachineDefinition | null {
    return machines.get(nameOrId) ?? null;
}

/**
 * Get all machines
 */
export function getAllMachines(): readonly MachineDefinition[] {
    const uniqueMachines = new Map<string, MachineDefinition>();
    for (const machine of machines.values()) {
        uniqueMachines.set(machine.machineId, machine);
    }
    return Array.from(uniqueMachines.values());
}

/**
 * Remove machine
 */
export function removeMachine(nameOrId: string): boolean {
    const machine = machines.get(nameOrId);
    if (!machine) {
        return false;
    }
    
    machines.delete(machine.machineId);
    machines.delete(machine.name);
    
    updateStatistics();
    
    return true;
}

// ============================================================================
// ACTION AND GUARD HANDLERS
// ============================================================================

/**
 * Register action handler
 */
export function registerActionHandler(name: string, handler: ActionHandler): void {
    actionHandlers.set(name, handler);
}

/**
 * Get action handler
 */
export function getActionHandler(name: string): ActionHandler | null {
    return actionHandlers.get(name) ?? null;
}

/**
 * Remove action handler
 */
export function removeActionHandler(name: string): boolean {
    return actionHandlers.delete(name);
}

/**
 * Register guard condition
 */
export function registerGuardCondition(name: string, condition: GuardCondition): void {
    guardConditions.set(name, condition);
}

/**
 * Get guard condition
 */
export function getGuardCondition(name: string): GuardCondition | null {
    return guardConditions.get(name) ?? null;
}

/**
 * Remove guard condition
 */
export function removeGuardCondition(name: string): boolean {
    return guardConditions.delete(name);
}

// ============================================================================
// MACHINE INSTANCE
// ============================================================================

/**
 * Create instance
 */
export async function createInstance(
    machineNameOrId: string,
    initialContext: Record<string, unknown> = {}
): Promise<MachineInstance> {
    const machine = machines.get(machineNameOrId);
    if (!machine) {
        throw new Error(`Machine '${machineNameOrId}' not found`);
    }
    
    const instanceId = generateInstanceId();
    const now = clock.nowMs();
    
    const context = { ...machine.context, ...initialContext };
    
    const instance: MachineInstance = {
        instanceId,
        machineId: machine.machineId,
        currentState: machine.initial,
        context,
        history: {},
        eventQueue: [],
        status: 'idle',
        startedAt: now,
        updatedAt: now,
        stateHistory: [{
            entryId: generateHistoryId(),
            fromState: null,
            toState: machine.initial,
            event: null,
            timestamp: now,
            context,
        }],
    };
    
    instances.set(instanceId, instance);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'machine_created',
        instanceId,
        machineId: machine.machineId,
        timestamp: now,
        data: { initialState: machine.initial, context },
    });
    
    updateStatistics();
    
    return instance;
}

/**
 * Start instance
 */
export async function startInstance(instanceId: string): Promise<MachineInstance> {
    let instance = instances.get(instanceId);
    if (!instance) {
        throw new Error(`Instance '${instanceId}' not found`);
    }
    
    const machine = machines.get(instance.machineId);
    if (!machine) {
        throw new Error(`Machine '${instance.machineId}' not found`);
    }
    
    instance = {
        ...instance,
        status: 'running',
        updatedAt: clock.nowMs(),
    };
    instances.set(instanceId, instance);
    
    const initialState = machine.states[instance.currentState];
    if (initialState) {
        await executeEntryActions(instance, machine, initialState);
    }
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'machine_started',
        instanceId,
        machineId: machine.machineId,
        timestamp: clock.nowMs(),
        data: { state: instance.currentState },
    });
    
    updateStatistics();
    
    return instance;
}

/**
 * Stop instance
 */
export async function stopInstance(instanceId: string): Promise<MachineInstance> {
    let instance = instances.get(instanceId);
    if (!instance) {
        throw new Error(`Instance '${instanceId}' not found`);
    }
    
    const machine = machines.get(instance.machineId);
    if (!machine) {
        throw new Error(`Machine '${instance.machineId}' not found`);
    }
    
    const currentState = machine.states[instance.currentState];
    if (currentState) {
        await executeExitActions(instance, machine, currentState);
    }
    
    instance = {
        ...instance,
        status: 'stopped',
        updatedAt: clock.nowMs(),
    };
    instances.set(instanceId, instance);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'machine_stopped',
        instanceId,
        machineId: machine.machineId,
        timestamp: clock.nowMs(),
        data: { state: instance.currentState },
    });
    
    updateStatistics();
    
    return instance;
}

/**
 * Get instance
 */
export function getInstance(instanceId: string): MachineInstance | null {
    return instances.get(instanceId) ?? null;
}

/**
 * Get all instances
 */
export function getAllInstances(): readonly MachineInstance[] {
    return Array.from(instances.values());
}

/**
 * Get instances by machine
 */
export function getInstancesByMachine(machineNameOrId: string): readonly MachineInstance[] {
    const machine = machines.get(machineNameOrId);
    if (!machine) {
        return [];
    }
    
    return Array.from(instances.values()).filter(i => i.machineId === machine.machineId);
}

/**
 * Remove instance
 */
export function removeInstance(instanceId: string): boolean {
    const deleted = instances.delete(instanceId);
    if (deleted) {
        snapshots.delete(instanceId);
        updateStatistics();
    }
    return deleted;
}

// ============================================================================
// EVENT HANDLING
// ============================================================================

/**
 * Send event
 */
export async function send(
    instanceId: string,
    eventType: string,
    data: Record<string, unknown> = {}
): Promise<TransitionResult> {
    let instance = instances.get(instanceId);
    if (!instance) {
        throw new Error(`Instance '${instanceId}' not found`);
    }
    
    const machine = machines.get(instance.machineId);
    if (!machine) {
        throw new Error(`Machine '${instance.machineId}' not found`);
    }
    
    if (instance.status !== 'running') {
        return {
            success: false,
            fromState: instance.currentState,
            toState: instance.currentState,
            event: {
                eventId: generateEventId(),
                type: eventType,
                data,
                timestamp: clock.nowMs(),
            },
            actionsExecuted: 0,
            error: 'Machine is not running',
        };
    }
    
    const event: MachineEvent = {
        eventId: generateEventId(),
        type: eventType,
        data,
        timestamp: clock.nowMs(),
    };
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'event_sent',
        instanceId,
        machineId: machine.machineId,
        timestamp: clock.nowMs(),
        data: { eventType, eventData: data },
    });
    
    const result = await processEvent(instance, machine, event);
    
    const mutableStats = statistics as { totalEventsProcessed: number };
    mutableStats.totalEventsProcessed++;
    
    return result;
}

/**
 * Process event
 */
async function processEvent(
    instance: MachineInstance,
    machine: MachineDefinition,
    event: MachineEvent
): Promise<TransitionResult> {
    const startTime = clock.nowMs();
    const fromState = instance.currentState;
    
    const found = findTransition(
        machine,
        instance.currentState,
        event.type,
        instance.context as Record<string, unknown>,
        event
    );
    
    if (!found) {
        return {
            success: false,
            fromState,
            toState: fromState,
            event,
            actionsExecuted: 0,
            error: `No transition found for event '${event.type}' in state '${fromState}'`,
        };
    }
    
    const { state, transition } = found;
    const toState = transition.target ?? fromState;
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'transition_started',
        instanceId: instance.instanceId,
        machineId: machine.machineId,
        timestamp: clock.nowMs(),
        data: { fromState, toState, event: event.type },
    });
    
    let actionsExecuted = 0;
    
    try {
        if (!transition.internal && toState !== fromState) {
            const exitStates = getExitStates(machine, fromState, toState);
            for (const exitStateId of exitStates) {
                const exitState = machine.states[exitStateId];
                if (exitState) {
                    await executeExitActions(instance, machine, exitState);
                    actionsExecuted += exitState.onExit.length;
                    
                    await emitEvent({
                        eventId: generateEventId(),
                        type: 'state_exited',
                        instanceId: instance.instanceId,
                        machineId: machine.machineId,
                        timestamp: clock.nowMs(),
                        data: { state: exitStateId },
                    });
                }
            }
        }
        
        for (const action of transition.actions) {
            await executeAction(instance, machine, action, event);
            actionsExecuted++;
        }
        
        if (!transition.internal && toState !== fromState) {
            const entryStates = getEntryStates(machine, fromState, toState);
            for (const entryStateId of entryStates) {
                const entryState = machine.states[entryStateId];
                if (entryState) {
                    await executeEntryActions(instance, machine, entryState);
                    actionsExecuted += entryState.onEntry.length;
                    
                    await emitEvent({
                        eventId: generateEventId(),
                        type: 'state_entered',
                        instanceId: instance.instanceId,
                        machineId: machine.machineId,
                        timestamp: clock.nowMs(),
                        data: { state: entryStateId },
                    });
                }
            }
            
            const parentState = machine.states[state.name];
            if (parentState && parentState.parent) {
                instance = {
                    ...instance,
                    history: {
                        ...instance.history,
                        [parentState.parent]: fromState,
                    },
                };
            }
        }
        
        instance = {
            ...instance,
            currentState: toState,
            updatedAt: clock.nowMs(),
            stateHistory: [
                ...instance.stateHistory,
                {
                    entryId: generateHistoryId(),
                    fromState,
                    toState,
                    event: event.type,
                    timestamp: clock.nowMs(),
                    context: instance.context,
                },
            ],
        };
        instances.set(instance.instanceId, instance);
        
        const duration = clock.nowMs() - startTime;
        
        const mutableStats = statistics as {
            totalTransitions: number;
            avgTransitionTime: number;
        };
        mutableStats.totalTransitions++;
        const totalTime = mutableStats.avgTransitionTime * (mutableStats.totalTransitions - 1) + duration;
        mutableStats.avgTransitionTime = totalTime / mutableStats.totalTransitions;
        
        await emitEvent({
            eventId: generateEventId(),
            type: 'transition_completed',
            instanceId: instance.instanceId,
            machineId: machine.machineId,
            timestamp: clock.nowMs(),
            data: { fromState, toState, duration },
        });
        
        await emitEvent({
            eventId: generateEventId(),
            type: 'event_processed',
            instanceId: instance.instanceId,
            machineId: machine.machineId,
            timestamp: clock.nowMs(),
            data: { event: event.type, fromState, toState },
        });
        
        return {
            success: true,
            fromState,
            toState,
            event,
            actionsExecuted,
            error: null,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        const mutableStats = statistics as { failedTransitions: number };
        mutableStats.failedTransitions++;
        
        await emitEvent({
            eventId: generateEventId(),
            type: 'transition_failed',
            instanceId: instance.instanceId,
            machineId: machine.machineId,
            timestamp: clock.nowMs(),
            data: { fromState, toState, error: errorMessage },
        });
        
        return {
            success: false,
            fromState,
            toState: fromState,
            event,
            actionsExecuted,
            error: errorMessage,
        };
    }
}

/**
 * Execute entry actions
 */
async function executeEntryActions(
    instance: MachineInstance,
    machine: MachineDefinition,
    state: StateDefinition
): Promise<void> {
    for (const action of state.onEntry) {
        await executeAction(instance, machine, action, null);
    }
}

/**
 * Execute exit actions
 */
async function executeExitActions(
    instance: MachineInstance,
    machine: MachineDefinition,
    state: StateDefinition
): Promise<void> {
    for (const action of state.onExit) {
        await executeAction(instance, machine, action, null);
    }
}

/**
 * Execute action
 */
async function executeAction(
    instance: MachineInstance,
    machine: MachineDefinition,
    action: StateAction | TransitionAction,
    event: MachineEvent | null
): Promise<void> {
    let contextUpdates: Record<string, unknown> = {};
    const pendingEvents: Array<{ type: string; data: Record<string, unknown>; raised: boolean }> = [];
    
    const actionContext: ActionContext = {
        machineId: machine.machineId,
        instanceId: instance.instanceId,
        state: instance.currentState,
        event,
        context: instance.context,
        params: action.params,
        assign(updates: Record<string, unknown>): void {
            contextUpdates = { ...contextUpdates, ...updates };
        },
        send(eventType: string, data: Record<string, unknown> = {}): void {
            pendingEvents.push({ type: eventType, data, raised: false });
        },
        raise(eventType: string, data: Record<string, unknown> = {}): void {
            pendingEvents.push({ type: eventType, data, raised: true });
        },
    };
    
    await action.handler(actionContext);
    
    if (Object.keys(contextUpdates).length > 0) {
        instance = {
            ...instance,
            context: { ...instance.context, ...contextUpdates },
            updatedAt: clock.nowMs(),
        };
        instances.set(instance.instanceId, instance);
        
        await emitEvent({
            eventId: generateEventId(),
            type: 'context_updated',
            instanceId: instance.instanceId,
            machineId: machine.machineId,
            timestamp: clock.nowMs(),
            data: { updates: contextUpdates },
        });
    }
    
    for (const pendingEvent of pendingEvents) {
        if (pendingEvent.raised) {
            await send(instance.instanceId, pendingEvent.type, pendingEvent.data);
        } else {
            setTimeout(() => {
                send(instance.instanceId, pendingEvent.type, pendingEvent.data);
            }, 0);
        }
    }
}

// ============================================================================
// STATE QUERIES
// ============================================================================

/**
 * Get current state
 */
export function getCurrentState(instanceId: string): string | null {
    const instance = instances.get(instanceId);
    return instance?.currentState ?? null;
}

/**
 * Get context
 */
export function getContext(instanceId: string): Readonly<Record<string, unknown>> | null {
    const instance = instances.get(instanceId);
    return instance?.context ?? null;
}

/**
 * Is in state
 */
export function isInState(instanceId: string, stateId: string): boolean {
    const instance = instances.get(instanceId);
    if (!instance) {
        return false;
    }
    
    const machine = machines.get(instance.machineId);
    if (!machine) {
        return false;
    }
    
    const activeStates = getActiveStates(machine, instance.currentState);
    return activeStates.includes(stateId);
}

/**
 * Can transition
 */
export function canTransition(instanceId: string, eventType: string): boolean {
    const instance = instances.get(instanceId);
    if (!instance || instance.status !== 'running') {
        return false;
    }
    
    const machine = machines.get(instance.machineId);
    if (!machine) {
        return false;
    }
    
    const event: MachineEvent = {
        eventId: '',
        type: eventType,
        data: {},
        timestamp: 0,
    };
    
    const found = findTransition(
        machine,
        instance.currentState,
        eventType,
        instance.context as Record<string, unknown>,
        event
    );
    
    return found !== null;
}

/**
 * Get available events
 */
export function getAvailableEvents(instanceId: string): readonly string[] {
    const instance = instances.get(instanceId);
    if (!instance || instance.status !== 'running') {
        return [];
    }
    
    const machine = machines.get(instance.machineId);
    if (!machine) {
        return [];
    }
    
    const events = new Set<string>();
    const statePath = getStatePath(machine, instance.currentState);
    
    for (const stateId of statePath) {
        const state = machine.states[stateId];
        if (state) {
            for (const transition of state.transitions) {
                events.add(transition.event);
            }
        }
    }
    
    return Array.from(events);
}

// ============================================================================
// SNAPSHOTS
// ============================================================================

/**
 * Create snapshot
 */
export function createSnapshot(instanceId: string): StateSnapshot | null {
    const instance = instances.get(instanceId);
    if (!instance) {
        return null;
    }
    
    const snapshot: StateSnapshot = {
        snapshotId: generateSnapshotId(),
        instanceId,
        state: instance.currentState,
        context: { ...instance.context },
        history: { ...instance.history },
        timestamp: clock.nowMs(),
    };
    
    const instanceSnapshots = snapshots.get(instanceId) ?? [];
    instanceSnapshots.push(snapshot);
    snapshots.set(instanceId, instanceSnapshots);
    
    return snapshot;
}

/**
 * Get snapshots
 */
export function getSnapshots(instanceId: string): readonly StateSnapshot[] {
    return snapshots.get(instanceId) ?? [];
}

/**
 * Restore snapshot
 */
export function restoreSnapshot(snapshotId: string): MachineInstance | null {
    for (const [instanceId, instanceSnapshots] of snapshots) {
        const snapshot = instanceSnapshots.find(s => s.snapshotId === snapshotId);
        if (snapshot) {
            let instance = instances.get(instanceId);
            if (!instance) {
                return null;
            }
            
            instance = {
                ...instance,
                currentState: snapshot.state,
                context: { ...snapshot.context },
                history: { ...snapshot.history },
                updatedAt: clock.nowMs(),
            };
            instances.set(instanceId, instance);
            
            return instance;
        }
    }
    
    return null;
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get statistics
 */
export function getStatistics(): Readonly<StateMachineStatistics> {
    updateStatistics();
    return { ...statistics };
}

/**
 * Reset statistics
 */
export function resetStatistics(): void {
    Object.assign(statistics, {
        totalMachines: 0,
        totalInstances: 0,
        runningInstances: 0,
        stoppedInstances: 0,
        totalTransitions: 0,
        failedTransitions: 0,
        totalEventsProcessed: 0,
        avgTransitionTime: 0,
    });
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Add event listener
 */
export function addEventListener(listener: StateMachineEventListener): void {
    eventListeners.add(listener);
}

/**
 * Remove event listener
 */
export function removeEventListener(listener: StateMachineEventListener): void {
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
    machines.clear();
    instances.clear();
    actionHandlers.clear();
    guardConditions.clear();
    eventListeners.clear();
    snapshots.clear();
    resetStatistics();
}
