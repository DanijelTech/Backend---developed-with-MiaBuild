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
export type StateMachineEventType = 'machine_created' | 'machine_started' | 'machine_stopped' | 'state_entered' | 'state_exited' | 'transition_started' | 'transition_completed' | 'transition_failed' | 'event_sent' | 'event_processed' | 'context_updated' | 'error_occurred';
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
/**
 * Define machine
 */
export declare function defineMachine(name: string, config: {
    version?: string;
    description?: string;
    initial: string;
    context?: Record<string, unknown>;
    states: Record<string, Omit<StateDefinition, 'stateId'>>;
    metadata?: Record<string, unknown>;
}): MachineDefinition;
/**
 * Get machine definition
 */
export declare function getMachine(nameOrId: string): MachineDefinition | null;
/**
 * Get all machines
 */
export declare function getAllMachines(): readonly MachineDefinition[];
/**
 * Remove machine
 */
export declare function removeMachine(nameOrId: string): boolean;
/**
 * Register action handler
 */
export declare function registerActionHandler(name: string, handler: ActionHandler): void;
/**
 * Get action handler
 */
export declare function getActionHandler(name: string): ActionHandler | null;
/**
 * Remove action handler
 */
export declare function removeActionHandler(name: string): boolean;
/**
 * Register guard condition
 */
export declare function registerGuardCondition(name: string, condition: GuardCondition): void;
/**
 * Get guard condition
 */
export declare function getGuardCondition(name: string): GuardCondition | null;
/**
 * Remove guard condition
 */
export declare function removeGuardCondition(name: string): boolean;
/**
 * Create instance
 */
export declare function createInstance(machineNameOrId: string, initialContext?: Record<string, unknown>): Promise<MachineInstance>;
/**
 * Start instance
 */
export declare function startInstance(instanceId: string): Promise<MachineInstance>;
/**
 * Stop instance
 */
export declare function stopInstance(instanceId: string): Promise<MachineInstance>;
/**
 * Get instance
 */
export declare function getInstance(instanceId: string): MachineInstance | null;
/**
 * Get all instances
 */
export declare function getAllInstances(): readonly MachineInstance[];
/**
 * Get instances by machine
 */
export declare function getInstancesByMachine(machineNameOrId: string): readonly MachineInstance[];
/**
 * Remove instance
 */
export declare function removeInstance(instanceId: string): boolean;
/**
 * Send event
 */
export declare function send(instanceId: string, eventType: string, data?: Record<string, unknown>): Promise<TransitionResult>;
/**
 * Get current state
 */
export declare function getCurrentState(instanceId: string): string | null;
/**
 * Get context
 */
export declare function getContext(instanceId: string): Readonly<Record<string, unknown>> | null;
/**
 * Is in state
 */
export declare function isInState(instanceId: string, stateId: string): boolean;
/**
 * Can transition
 */
export declare function canTransition(instanceId: string, eventType: string): boolean;
/**
 * Get available events
 */
export declare function getAvailableEvents(instanceId: string): readonly string[];
/**
 * Create snapshot
 */
export declare function createSnapshot(instanceId: string): StateSnapshot | null;
/**
 * Get snapshots
 */
export declare function getSnapshots(instanceId: string): readonly StateSnapshot[];
/**
 * Restore snapshot
 */
export declare function restoreSnapshot(snapshotId: string): MachineInstance | null;
/**
 * Get statistics
 */
export declare function getStatistics(): Readonly<StateMachineStatistics>;
/**
 * Reset statistics
 */
export declare function resetStatistics(): void;
/**
 * Add event listener
 */
export declare function addEventListener(listener: StateMachineEventListener): void;
/**
 * Remove event listener
 */
export declare function removeEventListener(listener: StateMachineEventListener): void;
/**
 * Clear event listeners
 */
export declare function clearEventListeners(): void;
/**
 * Clear all state
 */
export declare function clearAll(): void;
