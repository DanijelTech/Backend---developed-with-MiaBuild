"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineMachine = defineMachine;
exports.getMachine = getMachine;
exports.getAllMachines = getAllMachines;
exports.removeMachine = removeMachine;
exports.registerActionHandler = registerActionHandler;
exports.getActionHandler = getActionHandler;
exports.removeActionHandler = removeActionHandler;
exports.registerGuardCondition = registerGuardCondition;
exports.getGuardCondition = getGuardCondition;
exports.removeGuardCondition = removeGuardCondition;
exports.createInstance = createInstance;
exports.startInstance = startInstance;
exports.stopInstance = stopInstance;
exports.getInstance = getInstance;
exports.getAllInstances = getAllInstances;
exports.getInstancesByMachine = getInstancesByMachine;
exports.removeInstance = removeInstance;
exports.send = send;
exports.getCurrentState = getCurrentState;
exports.getContext = getContext;
exports.isInState = isInState;
exports.canTransition = canTransition;
exports.getAvailableEvents = getAvailableEvents;
exports.createSnapshot = createSnapshot;
exports.getSnapshots = getSnapshots;
exports.restoreSnapshot = restoreSnapshot;
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
const machines = new Map();
const instances = new Map();
const actionHandlers = new Map();
const guardConditions = new Map();
const eventListeners = new Set();
const snapshots = new Map();
let machineCounter = 0;
let instanceCounter = 0;
let stateCounter = 0;
let transitionCounter = 0;
let actionCounter = 0;
let guardCounter = 0;
let eventCounter = 0;
let historyCounter = 0;
let snapshotCounter = 0;
const statistics = {
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
function generateMachineId() {
    machineCounter++;
    return (0, deterministic_1.generateDeterministicId)(`machine-${machineCounter}`);
}
/**
 * Generate instance ID
 */
function generateInstanceId() {
    instanceCounter++;
    return (0, deterministic_1.generateDeterministicId)(`sm-instance-${instanceCounter}`);
}
/**
 * Generate state ID
 */
function generateStateId() {
    stateCounter++;
    return (0, deterministic_1.generateDeterministicId)(`state-${stateCounter}`);
}
/**
 * Generate transition ID
 */
function generateTransitionId() {
    transitionCounter++;
    return (0, deterministic_1.generateDeterministicId)(`transition-${transitionCounter}`);
}
/**
 * Generate action ID
 */
function generateActionId() {
    actionCounter++;
    return (0, deterministic_1.generateDeterministicId)(`sm-action-${actionCounter}`);
}
/**
 * Generate guard ID
 */
function generateGuardId() {
    guardCounter++;
    return (0, deterministic_1.generateDeterministicId)(`guard-${guardCounter}`);
}
/**
 * Generate event ID
 */
function generateEventId() {
    eventCounter++;
    return (0, deterministic_1.generateDeterministicId)(`sm-event-${eventCounter}`);
}
/**
 * Generate history ID
 */
function generateHistoryId() {
    historyCounter++;
    return (0, deterministic_1.generateDeterministicId)(`sm-history-${historyCounter}`);
}
/**
 * Generate snapshot ID
 */
function generateSnapshotId() {
    snapshotCounter++;
    return (0, deterministic_1.generateDeterministicId)(`snapshot-${snapshotCounter}`);
}
/**
 * Emit state machine event
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
    mutableStats.totalMachines = machines.size;
    mutableStats.totalInstances = instances.size;
    mutableStats.runningInstances = 0;
    mutableStats.stoppedInstances = 0;
    for (const instance of instances.values()) {
        if (instance.status === 'running') {
            mutableStats.runningInstances++;
        }
        else if (instance.status === 'stopped') {
            mutableStats.stoppedInstances++;
        }
    }
}
/**
 * Get state path
 */
function getStatePath(machine, stateId) {
    const path = [];
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
function getActiveStates(machine, stateId) {
    const active = [stateId];
    const state = machine.states[stateId];
    if (state && state.type === 'compound' && state.initial) {
        active.push(...getActiveStates(machine, state.initial));
    }
    else if (state && state.type === 'parallel') {
        for (const childId of state.children) {
            active.push(...getActiveStates(machine, childId));
        }
    }
    return active;
}
/**
 * Find transition
 */
function findTransition(machine, stateId, eventType, context, event) {
    const statePath = getStatePath(machine, stateId);
    for (let i = statePath.length - 1; i >= 0; i--) {
        const state = machine.states[statePath[i]];
        if (!state)
            continue;
        for (const transition of state.transitions) {
            if (transition.event === eventType) {
                if (transition.guard) {
                    const guardContext = {
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
function getExitStates(machine, fromState, toState) {
    const fromPath = getStatePath(machine, fromState);
    const toPath = getStatePath(machine, toState);
    let commonAncestorIndex = 0;
    while (commonAncestorIndex < fromPath.length &&
        commonAncestorIndex < toPath.length &&
        fromPath[commonAncestorIndex] === toPath[commonAncestorIndex]) {
        commonAncestorIndex++;
    }
    return fromPath.slice(commonAncestorIndex).reverse();
}
/**
 * Get entry states
 */
function getEntryStates(machine, fromState, toState) {
    const fromPath = getStatePath(machine, fromState);
    const toPath = getStatePath(machine, toState);
    let commonAncestorIndex = 0;
    while (commonAncestorIndex < fromPath.length &&
        commonAncestorIndex < toPath.length &&
        fromPath[commonAncestorIndex] === toPath[commonAncestorIndex]) {
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
function defineMachine(name, config) {
    const machineId = generateMachineId();
    const states = {};
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
    const machine = {
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
function getMachine(nameOrId) {
    return machines.get(nameOrId) ?? null;
}
/**
 * Get all machines
 */
function getAllMachines() {
    const uniqueMachines = new Map();
    for (const machine of machines.values()) {
        uniqueMachines.set(machine.machineId, machine);
    }
    return Array.from(uniqueMachines.values());
}
/**
 * Remove machine
 */
function removeMachine(nameOrId) {
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
function registerActionHandler(name, handler) {
    actionHandlers.set(name, handler);
}
/**
 * Get action handler
 */
function getActionHandler(name) {
    return actionHandlers.get(name) ?? null;
}
/**
 * Remove action handler
 */
function removeActionHandler(name) {
    return actionHandlers.delete(name);
}
/**
 * Register guard condition
 */
function registerGuardCondition(name, condition) {
    guardConditions.set(name, condition);
}
/**
 * Get guard condition
 */
function getGuardCondition(name) {
    return guardConditions.get(name) ?? null;
}
/**
 * Remove guard condition
 */
function removeGuardCondition(name) {
    return guardConditions.delete(name);
}
// ============================================================================
// MACHINE INSTANCE
// ============================================================================
/**
 * Create instance
 */
async function createInstance(machineNameOrId, initialContext = {}) {
    const machine = machines.get(machineNameOrId);
    if (!machine) {
        throw new Error(`Machine '${machineNameOrId}' not found`);
    }
    const instanceId = generateInstanceId();
    const now = clock.nowMs();
    const context = { ...machine.context, ...initialContext };
    const instance = {
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
async function startInstance(instanceId) {
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
async function stopInstance(instanceId) {
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
 * Get instances by machine
 */
function getInstancesByMachine(machineNameOrId) {
    const machine = machines.get(machineNameOrId);
    if (!machine) {
        return [];
    }
    return Array.from(instances.values()).filter(i => i.machineId === machine.machineId);
}
/**
 * Remove instance
 */
function removeInstance(instanceId) {
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
async function send(instanceId, eventType, data = {}) {
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
    const event = {
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
    const mutableStats = statistics;
    mutableStats.totalEventsProcessed++;
    return result;
}
/**
 * Process event
 */
async function processEvent(instance, machine, event) {
    const startTime = clock.nowMs();
    const fromState = instance.currentState;
    const found = findTransition(machine, instance.currentState, event.type, instance.context, event);
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
        const mutableStats = statistics;
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
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const mutableStats = statistics;
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
async function executeEntryActions(instance, machine, state) {
    for (const action of state.onEntry) {
        await executeAction(instance, machine, action, null);
    }
}
/**
 * Execute exit actions
 */
async function executeExitActions(instance, machine, state) {
    for (const action of state.onExit) {
        await executeAction(instance, machine, action, null);
    }
}
/**
 * Execute action
 */
async function executeAction(instance, machine, action, event) {
    let contextUpdates = {};
    const pendingEvents = [];
    const actionContext = {
        machineId: machine.machineId,
        instanceId: instance.instanceId,
        state: instance.currentState,
        event,
        context: instance.context,
        params: action.params,
        assign(updates) {
            contextUpdates = { ...contextUpdates, ...updates };
        },
        send(eventType, data = {}) {
            pendingEvents.push({ type: eventType, data, raised: false });
        },
        raise(eventType, data = {}) {
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
        }
        else {
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
function getCurrentState(instanceId) {
    const instance = instances.get(instanceId);
    return instance?.currentState ?? null;
}
/**
 * Get context
 */
function getContext(instanceId) {
    const instance = instances.get(instanceId);
    return instance?.context ?? null;
}
/**
 * Is in state
 */
function isInState(instanceId, stateId) {
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
function canTransition(instanceId, eventType) {
    const instance = instances.get(instanceId);
    if (!instance || instance.status !== 'running') {
        return false;
    }
    const machine = machines.get(instance.machineId);
    if (!machine) {
        return false;
    }
    const event = {
        eventId: '',
        type: eventType,
        data: {},
        timestamp: 0,
    };
    const found = findTransition(machine, instance.currentState, eventType, instance.context, event);
    return found !== null;
}
/**
 * Get available events
 */
function getAvailableEvents(instanceId) {
    const instance = instances.get(instanceId);
    if (!instance || instance.status !== 'running') {
        return [];
    }
    const machine = machines.get(instance.machineId);
    if (!machine) {
        return [];
    }
    const events = new Set();
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
function createSnapshot(instanceId) {
    const instance = instances.get(instanceId);
    if (!instance) {
        return null;
    }
    const snapshot = {
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
function getSnapshots(instanceId) {
    return snapshots.get(instanceId) ?? [];
}
/**
 * Restore snapshot
 */
function restoreSnapshot(snapshotId) {
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
function getStatistics() {
    updateStatistics();
    return { ...statistics };
}
/**
 * Reset statistics
 */
function resetStatistics() {
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
    machines.clear();
    instances.clear();
    actionHandlers.clear();
    guardConditions.clear();
    eventListeners.clear();
    snapshots.clear();
    resetStatistics();
}
