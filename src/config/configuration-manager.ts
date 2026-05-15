/**
 * @file Configuration Manager za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 * 
 * @requirement ZAH-ZALEDNI-CFG-001 Configuration management za zaledne sisteme
 * @design DSN-ZALEDNI-CFG-001 Backend configuration arhitektura
 * @test TEST-ZALEDNI-CFG-001 Preverjanje configuration management
 * 
 * Configuration Manager - prilagojen za zaledne sisteme:
 * - Hierarchical configuration
 * - Environment-based config
 * - Config validation
 * - Hot reload support
 * - Config versioning
 * - Secrets integration
 * - Config auditing
 * - Feature flags
 * 
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom CFG_001 - Configuration Manager
 */

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI ZA CONFIGURATION MANAGER
// ============================================================================

/**
 * Configuration value type
 */
export type ConfigValueType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'secret';

/**
 * Configuration source
 */
export type ConfigSource = 'default' | 'file' | 'environment' | 'remote' | 'override';

/**
 * Configuration value
 */
export interface ConfigValue<T = unknown> {
    readonly key: string;
    readonly value: T;
    readonly type: ConfigValueType;
    readonly source: ConfigSource;
    readonly version: number;
    readonly updatedAt: number;
    readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Configuration schema
 */
export interface ConfigSchema {
    readonly key: string;
    readonly type: ConfigValueType;
    readonly required: boolean;
    readonly default: unknown;
    readonly description: string;
    readonly validator: ConfigValidator | null;
    readonly sensitive: boolean;
    readonly deprecated: boolean;
    readonly deprecationMessage: string | null;
    readonly allowedValues: readonly unknown[] | null;
    readonly minValue: number | null;
    readonly maxValue: number | null;
    readonly pattern: string | null;
}

/**
 * Configuration validator
 */
export type ConfigValidator = (value: unknown, schema: ConfigSchema) => ValidationResult;

/**
 * Validation result
 */
export interface ValidationResult {
    readonly valid: boolean;
    readonly errors: readonly ValidationError[];
    readonly warnings: readonly ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
    readonly key: string;
    readonly message: string;
    readonly code: string;
    readonly expected: unknown;
    readonly actual: unknown;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
    readonly key: string;
    readonly message: string;
    readonly code: string;
}

/**
 * Configuration namespace
 */
export interface ConfigNamespace {
    readonly name: string;
    readonly description: string;
    readonly schemas: readonly ConfigSchema[];
    readonly values: Readonly<Record<string, ConfigValue>>;
    readonly version: number;
    readonly createdAt: number;
    readonly updatedAt: number;
}

/**
 * Configuration profile
 */
export interface ConfigProfile {
    readonly profileId: string;
    readonly name: string;
    readonly description: string;
    readonly environment: string;
    readonly namespaces: readonly string[];
    readonly overrides: Readonly<Record<string, unknown>>;
    readonly active: boolean;
    readonly createdAt: number;
    readonly updatedAt: number;
}

/**
 * Configuration change
 */
export interface ConfigChange {
    readonly changeId: string;
    readonly key: string;
    readonly namespace: string;
    readonly oldValue: unknown;
    readonly newValue: unknown;
    readonly source: ConfigSource;
    readonly changedBy: string;
    readonly changedAt: number;
    readonly reason: string | null;
}

/**
 * Configuration snapshot
 */
export interface ConfigSnapshot {
    readonly snapshotId: string;
    readonly name: string;
    readonly description: string;
    readonly namespaces: Readonly<Record<string, ConfigNamespace>>;
    readonly profiles: readonly ConfigProfile[];
    readonly createdAt: number;
    readonly createdBy: string;
}

/**
 * Feature flag
 */
export interface FeatureFlag {
    readonly flagId: string;
    readonly name: string;
    readonly description: string;
    readonly enabled: boolean;
    readonly percentage: number;
    readonly conditions: readonly FeatureFlagCondition[];
    readonly metadata: Readonly<Record<string, unknown>>;
    readonly createdAt: number;
    readonly updatedAt: number;
}

/**
 * Feature flag condition
 */
export interface FeatureFlagCondition {
    readonly type: 'user' | 'group' | 'environment' | 'custom';
    readonly operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'in' | 'not_in';
    readonly attribute: string;
    readonly value: unknown;
}

/**
 * Configuration event
 */
export interface ConfigEvent {
    readonly eventId: string;
    readonly type: ConfigEventType;
    readonly key: string | null;
    readonly namespace: string | null;
    readonly timestamp: number;
    readonly data: Readonly<Record<string, unknown>>;
}

/**
 * Configuration event type
 */
export type ConfigEventType =
    | 'value_set'
    | 'value_deleted'
    | 'namespace_created'
    | 'namespace_deleted'
    | 'profile_activated'
    | 'profile_deactivated'
    | 'snapshot_created'
    | 'snapshot_restored'
    | 'flag_enabled'
    | 'flag_disabled'
    | 'config_reloaded'
    | 'validation_failed';

/**
 * Configuration event listener
 */
export type ConfigEventListener = (event: ConfigEvent) => void | Promise<void>;

/**
 * Configuration loader
 */
export interface ConfigLoader {
    readonly name: string;
    readonly source: ConfigSource;
    load(): Promise<Record<string, unknown>>;
    watch?(callback: (changes: Record<string, unknown>) => void): void;
    unwatch?(): void;
}

/**
 * Configuration manager options
 */
export interface ConfigManagerOptions {
    readonly validateOnSet: boolean;
    readonly validateOnLoad: boolean;
    readonly enableHotReload: boolean;
    readonly hotReloadInterval: number;
    readonly enableAudit: boolean;
    readonly auditRetention: number;
    readonly enableSnapshots: boolean;
    readonly maxSnapshots: number;
    readonly enableFeatureFlags: boolean;
    readonly defaultEnvironment: string;
}

// ============================================================================
// STANJE
// ============================================================================

const namespaces: Map<string, ConfigNamespace> = new Map();
const profiles: Map<string, ConfigProfile> = new Map();
const snapshots: Map<string, ConfigSnapshot> = new Map();
const featureFlags: Map<string, FeatureFlag> = new Map();
const changeHistory: ConfigChange[] = [];
const eventListeners: Set<ConfigEventListener> = new Set();
const loaders: Map<string, ConfigLoader> = new Map();

let namespaceCounter = 0;
let profileCounter = 0;
let snapshotCounter = 0;
let flagCounter = 0;
let changeCounter = 0;
let eventCounter = 0;

let activeProfileId: string | null = null;

let options: ConfigManagerOptions = {
    validateOnSet: true,
    validateOnLoad: true,
    enableHotReload: false,
    hotReloadInterval: 30000,
    enableAudit: true,
    auditRetention: 604800000,
    enableSnapshots: true,
    maxSnapshots: 100,
    enableFeatureFlags: true,
    defaultEnvironment: 'development',
};

// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================

/**
 * Generate namespace ID
 */
function generateNamespaceId(): string {
    namespaceCounter++;
    return generateDeterministicId(`namespace-${namespaceCounter}`);
}

/**
 * Generate profile ID
 */
function generateProfileId(): string {
    profileCounter++;
    return generateDeterministicId(`profile-${profileCounter}`);
}

/**
 * Generate snapshot ID
 */
function generateSnapshotId(): string {
    snapshotCounter++;
    return generateDeterministicId(`snapshot-${snapshotCounter}`);
}

/**
 * Generate flag ID
 */
function generateFlagId(): string {
    flagCounter++;
    return generateDeterministicId(`flag-${flagCounter}`);
}

/**
 * Generate change ID
 */
function generateChangeId(): string {
    changeCounter++;
    return generateDeterministicId(`change-${changeCounter}`);
}

/**
 * Generate event ID
 */
function generateEventId(): string {
    eventCounter++;
    return generateDeterministicId(`config-event-${eventCounter}`);
}

/**
 * Infer value type
 */
function inferValueType(value: unknown): ConfigValueType {
    if (value === null || value === undefined) {
        return 'string';
    }
    if (typeof value === 'string') {
        return 'string';
    }
    if (typeof value === 'number') {
        return 'number';
    }
    if (typeof value === 'boolean') {
        return 'boolean';
    }
    if (Array.isArray(value)) {
        return 'array';
    }
    if (typeof value === 'object') {
        return 'object';
    }
    return 'string';
}

/**
 * Validate value against schema
 */
function validateValue(value: unknown, schema: ConfigSchema): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    if (schema.required && (value === null || value === undefined)) {
        errors.push({
            key: schema.key,
            message: `Required configuration value '${schema.key}' is missing`,
            code: 'REQUIRED',
            expected: 'non-null value',
            actual: value,
        });
        return { valid: false, errors, warnings };
    }
    
    if (value === null || value === undefined) {
        return { valid: true, errors, warnings };
    }
    
    const actualType = inferValueType(value);
    if (schema.type !== 'secret' && actualType !== schema.type) {
        errors.push({
            key: schema.key,
            message: `Type mismatch for '${schema.key}': expected ${schema.type}, got ${actualType}`,
            code: 'TYPE_MISMATCH',
            expected: schema.type,
            actual: actualType,
        });
    }
    
    if (schema.allowedValues !== null && !schema.allowedValues.includes(value)) {
        errors.push({
            key: schema.key,
            message: `Value '${value}' is not in allowed values for '${schema.key}'`,
            code: 'NOT_ALLOWED',
            expected: schema.allowedValues,
            actual: value,
        });
    }
    
    if (schema.type === 'number' && typeof value === 'number') {
        if (schema.minValue !== null && value < schema.minValue) {
            errors.push({
                key: schema.key,
                message: `Value ${value} is below minimum ${schema.minValue} for '${schema.key}'`,
                code: 'BELOW_MIN',
                expected: `>= ${schema.minValue}`,
                actual: value,
            });
        }
        if (schema.maxValue !== null && value > schema.maxValue) {
            errors.push({
                key: schema.key,
                message: `Value ${value} is above maximum ${schema.maxValue} for '${schema.key}'`,
                code: 'ABOVE_MAX',
                expected: `<= ${schema.maxValue}`,
                actual: value,
            });
        }
    }
    
    if (schema.type === 'string' && typeof value === 'string' && schema.pattern !== null) {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(value)) {
            errors.push({
                key: schema.key,
                message: `Value '${value}' does not match pattern '${schema.pattern}' for '${schema.key}'`,
                code: 'PATTERN_MISMATCH',
                expected: schema.pattern,
                actual: value,
            });
        }
    }
    
    if (schema.deprecated) {
        warnings.push({
            key: schema.key,
            message: schema.deprecationMessage ?? `Configuration '${schema.key}' is deprecated`,
            code: 'DEPRECATED',
        });
    }
    
    if (schema.validator !== null) {
        const customResult = schema.validator(value, schema);
        errors.push(...customResult.errors);
        warnings.push(...customResult.warnings);
    }
    
    return { valid: errors.length === 0, errors, warnings };
}

/**
 * Emit configuration event
 */
async function emitEvent(event: ConfigEvent): Promise<void> {
    for (const listener of eventListeners) {
        try {
            await listener(event);
        } catch {
            // Ignore listener errors
        }
    }
}

/**
 * Record configuration change
 */
function recordChange(change: ConfigChange): void {
    if (!options.enableAudit) {
        return;
    }
    
    changeHistory.push(change);
    
    const cutoff = clock.nowMs() - options.auditRetention;
    while (changeHistory.length > 0 && changeHistory[0].changedAt < cutoff) {
        changeHistory.shift();
    }
}

/**
 * Deep merge objects
 */
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
    const result = { ...target };
    
    for (const [key, value] of Object.entries(source)) {
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            if (result[key] !== null && typeof result[key] === 'object' && !Array.isArray(result[key])) {
                result[key] = deepMerge(result[key] as Record<string, unknown>, value as Record<string, unknown>);
            } else {
                result[key] = value;
            }
        } else {
            result[key] = value;
        }
    }
    
    return result;
}

/**
 * Get nested value
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;
    
    for (const part of parts) {
        if (current === null || current === undefined) {
            return undefined;
        }
        if (typeof current !== 'object') {
            return undefined;
        }
        current = (current as Record<string, unknown>)[part];
    }
    
    return current;
}

/**
 * Set nested value
 */
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!(part in current) || typeof current[part] !== 'object') {
            current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
    }
    
    current[parts[parts.length - 1]] = value;
}

// ============================================================================
// NAMESPACE MANAGEMENT
// ============================================================================

/**
 * Create namespace
 */
export function createNamespace(
    name: string,
    options: {
        description?: string;
        schemas?: readonly ConfigSchema[];
    } = {}
): ConfigNamespace {
    const now = clock.nowMs();
    
    const namespace: ConfigNamespace = {
        name,
        description: options.description ?? '',
        schemas: options.schemas ?? [],
        values: {},
        version: 1,
        createdAt: now,
        updatedAt: now,
    };
    
    namespaces.set(name, namespace);
    
    emitEvent({
        eventId: generateEventId(),
        type: 'namespace_created',
        key: null,
        namespace: name,
        timestamp: now,
        data: {},
    });
    
    return namespace;
}

/**
 * Get namespace
 */
export function getNamespace(name: string): ConfigNamespace | null {
    return namespaces.get(name) ?? null;
}

/**
 * Get all namespaces
 */
export function getAllNamespaces(): readonly ConfigNamespace[] {
    return Array.from(namespaces.values());
}

/**
 * Delete namespace
 */
export function deleteNamespace(name: string): boolean {
    const namespace = namespaces.get(name);
    if (!namespace) {
        return false;
    }
    
    namespaces.delete(name);
    
    emitEvent({
        eventId: generateEventId(),
        type: 'namespace_deleted',
        key: null,
        namespace: name,
        timestamp: clock.nowMs(),
        data: {},
    });
    
    return true;
}

/**
 * Add schema to namespace
 */
export function addSchema(namespaceName: string, schema: ConfigSchema): boolean {
    const namespace = namespaces.get(namespaceName);
    if (!namespace) {
        return false;
    }
    
    const existingIndex = namespace.schemas.findIndex(s => s.key === schema.key);
    let newSchemas: ConfigSchema[];
    
    if (existingIndex !== -1) {
        newSchemas = [...namespace.schemas];
        newSchemas[existingIndex] = schema;
    } else {
        newSchemas = [...namespace.schemas, schema];
    }
    
    namespaces.set(namespaceName, {
        ...namespace,
        schemas: newSchemas,
        updatedAt: clock.nowMs(),
    });
    
    return true;
}

/**
 * Remove schema from namespace
 */
export function removeSchema(namespaceName: string, key: string): boolean {
    const namespace = namespaces.get(namespaceName);
    if (!namespace) {
        return false;
    }
    
    const newSchemas = namespace.schemas.filter(s => s.key !== key);
    
    if (newSchemas.length === namespace.schemas.length) {
        return false;
    }
    
    namespaces.set(namespaceName, {
        ...namespace,
        schemas: newSchemas,
        updatedAt: clock.nowMs(),
    });
    
    return true;
}

// ============================================================================
// VALUE MANAGEMENT
// ============================================================================

/**
 * Set configuration value
 */
export function set<T>(
    namespaceName: string,
    key: string,
    value: T,
    options: {
        source?: ConfigSource;
        changedBy?: string;
        reason?: string;
    } = {}
): ValidationResult {
    const namespace = namespaces.get(namespaceName);
    if (!namespace) {
        return {
            valid: false,
            errors: [{
                key,
                message: `Namespace '${namespaceName}' not found`,
                code: 'NAMESPACE_NOT_FOUND',
                expected: 'existing namespace',
                actual: namespaceName,
            }],
            warnings: [],
        };
    }
    
    const schema = namespace.schemas.find(s => s.key === key);
    
    if (schema && options.validateOnSet !== false) {
        const validationResult = validateValue(value, schema);
        if (!validationResult.valid) {
            emitEvent({
                eventId: generateEventId(),
                type: 'validation_failed',
                key,
                namespace: namespaceName,
                timestamp: clock.nowMs(),
                data: { errors: validationResult.errors },
            });
            return validationResult;
        }
    }
    
    const now = clock.nowMs();
    const oldValue = namespace.values[key]?.value;
    
    const configValue: ConfigValue<T> = {
        key,
        value,
        type: schema?.type ?? inferValueType(value),
        source: options.source ?? 'override',
        version: (namespace.values[key]?.version ?? 0) + 1,
        updatedAt: now,
        metadata: {},
    };
    
    const newValues = { ...namespace.values, [key]: configValue as ConfigValue };
    
    namespaces.set(namespaceName, {
        ...namespace,
        values: newValues,
        version: namespace.version + 1,
        updatedAt: now,
    });
    
    recordChange({
        changeId: generateChangeId(),
        key,
        namespace: namespaceName,
        oldValue,
        newValue: value,
        source: options.source ?? 'override',
        changedBy: options.changedBy ?? 'system',
        changedAt: now,
        reason: options.reason ?? null,
    });
    
    emitEvent({
        eventId: generateEventId(),
        type: 'value_set',
        key,
        namespace: namespaceName,
        timestamp: now,
        data: { oldValue, newValue: value },
    });
    
    return { valid: true, errors: [], warnings: [] };
}

/**
 * Get configuration value
 */
export function get<T>(namespaceName: string, key: string, defaultValue?: T): T | undefined {
    const namespace = namespaces.get(namespaceName);
    if (!namespace) {
        return defaultValue;
    }
    
    const configValue = namespace.values[key];
    if (!configValue) {
        const schema = namespace.schemas.find(s => s.key === key);
        if (schema && schema.default !== undefined) {
            return schema.default as T;
        }
        return defaultValue;
    }
    
    return configValue.value as T;
}

/**
 * Get configuration value with metadata
 */
export function getValue<T>(namespaceName: string, key: string): ConfigValue<T> | null {
    const namespace = namespaces.get(namespaceName);
    if (!namespace) {
        return null;
    }
    
    return (namespace.values[key] as ConfigValue<T>) ?? null;
}

/**
 * Delete configuration value
 */
export function del(
    namespaceName: string,
    key: string,
    options: {
        changedBy?: string;
        reason?: string;
    } = {}
): boolean {
    const namespace = namespaces.get(namespaceName);
    if (!namespace) {
        return false;
    }
    
    if (!(key in namespace.values)) {
        return false;
    }
    
    const now = clock.nowMs();
    const oldValue = namespace.values[key].value;
    
    const newValues = { ...namespace.values };
    delete newValues[key];
    
    namespaces.set(namespaceName, {
        ...namespace,
        values: newValues,
        version: namespace.version + 1,
        updatedAt: now,
    });
    
    recordChange({
        changeId: generateChangeId(),
        key,
        namespace: namespaceName,
        oldValue,
        newValue: undefined,
        source: 'override',
        changedBy: options.changedBy ?? 'system',
        changedAt: now,
        reason: options.reason ?? null,
    });
    
    emitEvent({
        eventId: generateEventId(),
        type: 'value_deleted',
        key,
        namespace: namespaceName,
        timestamp: now,
        data: { oldValue },
    });
    
    return true;
}

/**
 * Check if key exists
 */
export function has(namespaceName: string, key: string): boolean {
    const namespace = namespaces.get(namespaceName);
    if (!namespace) {
        return false;
    }
    
    return key in namespace.values;
}

/**
 * Get all values in namespace
 */
export function getAll(namespaceName: string): Readonly<Record<string, unknown>> {
    const namespace = namespaces.get(namespaceName);
    if (!namespace) {
        return {};
    }
    
    const result: Record<string, unknown> = {};
    for (const [key, configValue] of Object.entries(namespace.values)) {
        result[key] = configValue.value;
    }
    
    return result;
}

// ============================================================================
// PROFILE MANAGEMENT
// ============================================================================

/**
 * Create profile
 */
export function createProfile(
    name: string,
    options: {
        description?: string;
        environment?: string;
        namespaces?: readonly string[];
        overrides?: Record<string, unknown>;
    } = {}
): ConfigProfile {
    const profileId = generateProfileId();
    const now = clock.nowMs();
    
    const profile: ConfigProfile = {
        profileId,
        name,
        description: options.description ?? '',
        environment: options.environment ?? 'development',
        namespaces: options.namespaces ?? [],
        overrides: options.overrides ?? {},
        active: false,
        createdAt: now,
        updatedAt: now,
    };
    
    profiles.set(profileId, profile);
    
    return profile;
}

/**
 * Get profile
 */
export function getProfile(profileId: string): ConfigProfile | null {
    return profiles.get(profileId) ?? null;
}

/**
 * Get all profiles
 */
export function getAllProfiles(): readonly ConfigProfile[] {
    return Array.from(profiles.values());
}

/**
 * Activate profile
 */
export function activateProfile(profileId: string): boolean {
    const profile = profiles.get(profileId);
    if (!profile) {
        return false;
    }
    
    if (activeProfileId !== null) {
        const currentProfile = profiles.get(activeProfileId);
        if (currentProfile) {
            profiles.set(activeProfileId, {
                ...currentProfile,
                active: false,
                updatedAt: clock.nowMs(),
            });
            
            emitEvent({
                eventId: generateEventId(),
                type: 'profile_deactivated',
                key: null,
                namespace: null,
                timestamp: clock.nowMs(),
                data: { profileId: activeProfileId },
            });
        }
    }
    
    profiles.set(profileId, {
        ...profile,
        active: true,
        updatedAt: clock.nowMs(),
    });
    
    activeProfileId = profileId;
    
    for (const [key, value] of Object.entries(profile.overrides)) {
        const parts = key.split('.');
        if (parts.length >= 2) {
            const namespaceName = parts[0];
            const configKey = parts.slice(1).join('.');
            set(namespaceName, configKey, value, { source: 'override' });
        }
    }
    
    emitEvent({
        eventId: generateEventId(),
        type: 'profile_activated',
        key: null,
        namespace: null,
        timestamp: clock.nowMs(),
        data: { profileId },
    });
    
    return true;
}

/**
 * Deactivate profile
 */
export function deactivateProfile(profileId: string): boolean {
    const profile = profiles.get(profileId);
    if (!profile || !profile.active) {
        return false;
    }
    
    profiles.set(profileId, {
        ...profile,
        active: false,
        updatedAt: clock.nowMs(),
    });
    
    if (activeProfileId === profileId) {
        activeProfileId = null;
    }
    
    emitEvent({
        eventId: generateEventId(),
        type: 'profile_deactivated',
        key: null,
        namespace: null,
        timestamp: clock.nowMs(),
        data: { profileId },
    });
    
    return true;
}

/**
 * Get active profile
 */
export function getActiveProfile(): ConfigProfile | null {
    if (activeProfileId === null) {
        return null;
    }
    return profiles.get(activeProfileId) ?? null;
}

/**
 * Delete profile
 */
export function deleteProfile(profileId: string): boolean {
    const profile = profiles.get(profileId);
    if (!profile) {
        return false;
    }
    
    if (profile.active) {
        deactivateProfile(profileId);
    }
    
    profiles.delete(profileId);
    
    return true;
}

// ============================================================================
// SNAPSHOT MANAGEMENT
// ============================================================================

/**
 * Create snapshot
 */
export function createSnapshot(
    name: string,
    options: {
        description?: string;
        createdBy?: string;
    } = {}
): ConfigSnapshot {
    const snapshotId = generateSnapshotId();
    const now = clock.nowMs();
    
    const namespacesSnapshot: Record<string, ConfigNamespace> = {};
    for (const [nsName, ns] of namespaces) {
        namespacesSnapshot[nsName] = { ...ns };
    }
    
    const snapshot: ConfigSnapshot = {
        snapshotId,
        name,
        description: options.description ?? '',
        namespaces: namespacesSnapshot,
        profiles: Array.from(profiles.values()),
        createdAt: now,
        createdBy: options.createdBy ?? 'system',
    };
    
    snapshots.set(snapshotId, snapshot);
    
    if (snapshots.size > options.maxSnapshots) {
        const oldest = Array.from(snapshots.values())
            .sort((a, b) => a.createdAt - b.createdAt)[0];
        if (oldest) {
            snapshots.delete(oldest.snapshotId);
        }
    }
    
    emitEvent({
        eventId: generateEventId(),
        type: 'snapshot_created',
        key: null,
        namespace: null,
        timestamp: now,
        data: { snapshotId, name },
    });
    
    return snapshot;
}

/**
 * Get snapshot
 */
export function getSnapshot(snapshotId: string): ConfigSnapshot | null {
    return snapshots.get(snapshotId) ?? null;
}

/**
 * Get all snapshots
 */
export function getAllSnapshots(): readonly ConfigSnapshot[] {
    return Array.from(snapshots.values());
}

/**
 * Restore snapshot
 */
export function restoreSnapshot(snapshotId: string): boolean {
    const snapshot = snapshots.get(snapshotId);
    if (!snapshot) {
        return false;
    }
    
    namespaces.clear();
    for (const [nsName, ns] of Object.entries(snapshot.namespaces)) {
        namespaces.set(nsName, ns);
    }
    
    profiles.clear();
    for (const profile of snapshot.profiles) {
        profiles.set(profile.profileId, profile);
        if (profile.active) {
            activeProfileId = profile.profileId;
        }
    }
    
    emitEvent({
        eventId: generateEventId(),
        type: 'snapshot_restored',
        key: null,
        namespace: null,
        timestamp: clock.nowMs(),
        data: { snapshotId },
    });
    
    return true;
}

/**
 * Delete snapshot
 */
export function deleteSnapshot(snapshotId: string): boolean {
    return snapshots.delete(snapshotId);
}

// ============================================================================
// FEATURE FLAGS
// ============================================================================

/**
 * Create feature flag
 */
export function createFeatureFlag(
    name: string,
    options: {
        description?: string;
        enabled?: boolean;
        percentage?: number;
        conditions?: readonly FeatureFlagCondition[];
        metadata?: Record<string, unknown>;
    } = {}
): FeatureFlag {
    const flagId = generateFlagId();
    const now = clock.nowMs();
    
    const flag: FeatureFlag = {
        flagId,
        name,
        description: options.description ?? '',
        enabled: options.enabled ?? false,
        percentage: options.percentage ?? 100,
        conditions: options.conditions ?? [],
        metadata: options.metadata ?? {},
        createdAt: now,
        updatedAt: now,
    };
    
    featureFlags.set(flagId, flag);
    
    return flag;
}

/**
 * Get feature flag
 */
export function getFeatureFlag(flagId: string): FeatureFlag | null {
    return featureFlags.get(flagId) ?? null;
}

/**
 * Get feature flag by name
 */
export function getFeatureFlagByName(name: string): FeatureFlag | null {
    for (const flag of featureFlags.values()) {
        if (flag.name === name) {
            return flag;
        }
    }
    return null;
}

/**
 * Get all feature flags
 */
export function getAllFeatureFlags(): readonly FeatureFlag[] {
    return Array.from(featureFlags.values());
}

/**
 * Enable feature flag
 */
export function enableFeatureFlag(flagId: string): boolean {
    const flag = featureFlags.get(flagId);
    if (!flag) {
        return false;
    }
    
    featureFlags.set(flagId, {
        ...flag,
        enabled: true,
        updatedAt: clock.nowMs(),
    });
    
    emitEvent({
        eventId: generateEventId(),
        type: 'flag_enabled',
        key: flag.name,
        namespace: null,
        timestamp: clock.nowMs(),
        data: { flagId },
    });
    
    return true;
}

/**
 * Disable feature flag
 */
export function disableFeatureFlag(flagId: string): boolean {
    const flag = featureFlags.get(flagId);
    if (!flag) {
        return false;
    }
    
    featureFlags.set(flagId, {
        ...flag,
        enabled: false,
        updatedAt: clock.nowMs(),
    });
    
    emitEvent({
        eventId: generateEventId(),
        type: 'flag_disabled',
        key: flag.name,
        namespace: null,
        timestamp: clock.nowMs(),
        data: { flagId },
    });
    
    return true;
}

/**
 * Check if feature is enabled
 */
export function isFeatureEnabled(
    name: string,
    context: Record<string, unknown> = {}
): boolean {
    const flag = getFeatureFlagByName(name);
    if (!flag) {
        return false;
    }
    
    if (!flag.enabled) {
        return false;
    }
    
    if (flag.conditions.length > 0) {
        const conditionsMet = flag.conditions.every(condition => {
            const contextValue = context[condition.attribute];
            
            switch (condition.operator) {
                case 'equals':
                    return contextValue === condition.value;
                case 'not_equals':
                    return contextValue !== condition.value;
                case 'contains':
                    return String(contextValue).includes(String(condition.value));
                case 'not_contains':
                    return !String(contextValue).includes(String(condition.value));
                case 'in':
                    return Array.isArray(condition.value) && condition.value.includes(contextValue);
                case 'not_in':
                    return Array.isArray(condition.value) && !condition.value.includes(contextValue);
                default:
                    return false;
            }
        });
        
        if (!conditionsMet) {
            return false;
        }
    }
    
    if (flag.percentage < 100) {
        const userId = context.userId ?? context.id ?? '';
        const hash = String(userId).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const bucket = hash % 100;
        return bucket < flag.percentage;
    }
    
    return true;
}

/**
 * Delete feature flag
 */
export function deleteFeatureFlag(flagId: string): boolean {
    return featureFlags.delete(flagId);
}

// ============================================================================
// LOADERS
// ============================================================================

/**
 * Register loader
 */
export function registerLoader(loader: ConfigLoader): void {
    loaders.set(loader.name, loader);
}

/**
 * Unregister loader
 */
export function unregisterLoader(name: string): boolean {
    const loader = loaders.get(name);
    if (!loader) {
        return false;
    }
    
    if (loader.unwatch) {
        loader.unwatch();
    }
    
    loaders.delete(name);
    return true;
}

/**
 * Load configuration from all loaders
 */
export async function loadFromLoaders(namespaceName: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    for (const loader of loaders.values()) {
        try {
            const config = await loader.load();
            
            for (const [key, value] of Object.entries(config)) {
                const result = set(namespaceName, key, value, { source: loader.source });
                errors.push(...result.errors);
                warnings.push(...result.warnings);
            }
        } catch (error) {
            errors.push({
                key: '*',
                message: `Failed to load from ${loader.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                code: 'LOADER_ERROR',
                expected: 'successful load',
                actual: 'error',
            });
        }
    }
    
    emitEvent({
        eventId: generateEventId(),
        type: 'config_reloaded',
        key: null,
        namespace: namespaceName,
        timestamp: clock.nowMs(),
        data: { loaderCount: loaders.size },
    });
    
    return { valid: errors.length === 0, errors, warnings };
}

// ============================================================================
// CHANGE HISTORY
// ============================================================================

/**
 * Get change history
 */
export function getChangeHistory(options: {
    namespace?: string;
    key?: string;
    fromDate?: number;
    toDate?: number;
    limit?: number;
} = {}): readonly ConfigChange[] {
    let filtered = [...changeHistory];
    
    if (options.namespace) {
        filtered = filtered.filter(c => c.namespace === options.namespace);
    }
    
    if (options.key) {
        filtered = filtered.filter(c => c.key === options.key);
    }
    
    if (options.fromDate) {
        filtered = filtered.filter(c => c.changedAt >= options.fromDate!);
    }
    
    if (options.toDate) {
        filtered = filtered.filter(c => c.changedAt <= options.toDate!);
    }
    
    filtered.sort((a, b) => b.changedAt - a.changedAt);
    
    if (options.limit) {
        filtered = filtered.slice(0, options.limit);
    }
    
    return filtered;
}

/**
 * Clear change history
 */
export function clearChangeHistory(): void {
    changeHistory.length = 0;
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Add event listener
 */
export function addEventListener(listener: ConfigEventListener): void {
    eventListeners.add(listener);
}

/**
 * Remove event listener
 */
export function removeEventListener(listener: ConfigEventListener): void {
    eventListeners.delete(listener);
}

/**
 * Clear event listeners
 */
export function clearEventListeners(): void {
    eventListeners.clear();
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Configure manager
 */
export function configure(newOptions: Partial<ConfigManagerOptions>): void {
    options = { ...options, ...newOptions };
}

/**
 * Get manager options
 */
export function getOptions(): Readonly<ConfigManagerOptions> {
    return { ...options };
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Clear all state
 */
export function clearAll(): void {
    namespaces.clear();
    profiles.clear();
    snapshots.clear();
    featureFlags.clear();
    changeHistory.length = 0;
    eventListeners.clear();
    loaders.clear();
    activeProfileId = null;
}
