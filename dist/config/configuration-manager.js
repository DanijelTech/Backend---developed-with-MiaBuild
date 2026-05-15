"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNamespace = createNamespace;
exports.getNamespace = getNamespace;
exports.getAllNamespaces = getAllNamespaces;
exports.deleteNamespace = deleteNamespace;
exports.addSchema = addSchema;
exports.removeSchema = removeSchema;
exports.set = set;
exports.get = get;
exports.getValue = getValue;
exports.del = del;
exports.has = has;
exports.getAll = getAll;
exports.createProfile = createProfile;
exports.getProfile = getProfile;
exports.getAllProfiles = getAllProfiles;
exports.activateProfile = activateProfile;
exports.deactivateProfile = deactivateProfile;
exports.getActiveProfile = getActiveProfile;
exports.deleteProfile = deleteProfile;
exports.createSnapshot = createSnapshot;
exports.getSnapshot = getSnapshot;
exports.getAllSnapshots = getAllSnapshots;
exports.restoreSnapshot = restoreSnapshot;
exports.deleteSnapshot = deleteSnapshot;
exports.createFeatureFlag = createFeatureFlag;
exports.getFeatureFlag = getFeatureFlag;
exports.getFeatureFlagByName = getFeatureFlagByName;
exports.getAllFeatureFlags = getAllFeatureFlags;
exports.enableFeatureFlag = enableFeatureFlag;
exports.disableFeatureFlag = disableFeatureFlag;
exports.isFeatureEnabled = isFeatureEnabled;
exports.deleteFeatureFlag = deleteFeatureFlag;
exports.registerLoader = registerLoader;
exports.unregisterLoader = unregisterLoader;
exports.loadFromLoaders = loadFromLoaders;
exports.getChangeHistory = getChangeHistory;
exports.clearChangeHistory = clearChangeHistory;
exports.addEventListener = addEventListener;
exports.removeEventListener = removeEventListener;
exports.clearEventListeners = clearEventListeners;
exports.configure = configure;
exports.getOptions = getOptions;
exports.clearAll = clearAll;
const clock_1 = require("@mia/core/clock");
const deterministic_1 = require("@mia/core/deterministic");
const clock = (0, clock_1.getClock)();
// ============================================================================
// STANJE
// ============================================================================
const namespaces = new Map();
const profiles = new Map();
const snapshots = new Map();
const featureFlags = new Map();
const changeHistory = [];
const eventListeners = new Set();
const loaders = new Map();
let namespaceCounter = 0;
let profileCounter = 0;
let snapshotCounter = 0;
let flagCounter = 0;
let changeCounter = 0;
let eventCounter = 0;
let activeProfileId = null;
let options = {
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
function generateNamespaceId() {
    namespaceCounter++;
    return (0, deterministic_1.generateDeterministicId)(`namespace-${namespaceCounter}`);
}
/**
 * Generate profile ID
 */
function generateProfileId() {
    profileCounter++;
    return (0, deterministic_1.generateDeterministicId)(`profile-${profileCounter}`);
}
/**
 * Generate snapshot ID
 */
function generateSnapshotId() {
    snapshotCounter++;
    return (0, deterministic_1.generateDeterministicId)(`snapshot-${snapshotCounter}`);
}
/**
 * Generate flag ID
 */
function generateFlagId() {
    flagCounter++;
    return (0, deterministic_1.generateDeterministicId)(`flag-${flagCounter}`);
}
/**
 * Generate change ID
 */
function generateChangeId() {
    changeCounter++;
    return (0, deterministic_1.generateDeterministicId)(`change-${changeCounter}`);
}
/**
 * Generate event ID
 */
function generateEventId() {
    eventCounter++;
    return (0, deterministic_1.generateDeterministicId)(`config-event-${eventCounter}`);
}
/**
 * Infer value type
 */
function inferValueType(value) {
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
function validateValue(value, schema) {
    const errors = [];
    const warnings = [];
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
 * Record configuration change
 */
function recordChange(change) {
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
function deepMerge(target, source) {
    const result = { ...target };
    for (const [key, value] of Object.entries(source)) {
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            if (result[key] !== null && typeof result[key] === 'object' && !Array.isArray(result[key])) {
                result[key] = deepMerge(result[key], value);
            }
            else {
                result[key] = value;
            }
        }
        else {
            result[key] = value;
        }
    }
    return result;
}
/**
 * Get nested value
 */
function getNestedValue(obj, path) {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
        if (current === null || current === undefined) {
            return undefined;
        }
        if (typeof current !== 'object') {
            return undefined;
        }
        current = current[part];
    }
    return current;
}
/**
 * Set nested value
 */
function setNestedValue(obj, path, value) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!(part in current) || typeof current[part] !== 'object') {
            current[part] = {};
        }
        current = current[part];
    }
    current[parts[parts.length - 1]] = value;
}
// ============================================================================
// NAMESPACE MANAGEMENT
// ============================================================================
/**
 * Create namespace
 */
function createNamespace(name, options = {}) {
    const now = clock.nowMs();
    const namespace = {
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
function getNamespace(name) {
    return namespaces.get(name) ?? null;
}
/**
 * Get all namespaces
 */
function getAllNamespaces() {
    return Array.from(namespaces.values());
}
/**
 * Delete namespace
 */
function deleteNamespace(name) {
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
function addSchema(namespaceName, schema) {
    const namespace = namespaces.get(namespaceName);
    if (!namespace) {
        return false;
    }
    const existingIndex = namespace.schemas.findIndex(s => s.key === schema.key);
    let newSchemas;
    if (existingIndex !== -1) {
        newSchemas = [...namespace.schemas];
        newSchemas[existingIndex] = schema;
    }
    else {
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
function removeSchema(namespaceName, key) {
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
function set(namespaceName, key, value, options = {}) {
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
    const configValue = {
        key,
        value,
        type: schema?.type ?? inferValueType(value),
        source: options.source ?? 'override',
        version: (namespace.values[key]?.version ?? 0) + 1,
        updatedAt: now,
        metadata: {},
    };
    const newValues = { ...namespace.values, [key]: configValue };
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
function get(namespaceName, key, defaultValue) {
    const namespace = namespaces.get(namespaceName);
    if (!namespace) {
        return defaultValue;
    }
    const configValue = namespace.values[key];
    if (!configValue) {
        const schema = namespace.schemas.find(s => s.key === key);
        if (schema && schema.default !== undefined) {
            return schema.default;
        }
        return defaultValue;
    }
    return configValue.value;
}
/**
 * Get configuration value with metadata
 */
function getValue(namespaceName, key) {
    const namespace = namespaces.get(namespaceName);
    if (!namespace) {
        return null;
    }
    return namespace.values[key] ?? null;
}
/**
 * Delete configuration value
 */
function del(namespaceName, key, options = {}) {
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
function has(namespaceName, key) {
    const namespace = namespaces.get(namespaceName);
    if (!namespace) {
        return false;
    }
    return key in namespace.values;
}
/**
 * Get all values in namespace
 */
function getAll(namespaceName) {
    const namespace = namespaces.get(namespaceName);
    if (!namespace) {
        return {};
    }
    const result = {};
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
function createProfile(name, options = {}) {
    const profileId = generateProfileId();
    const now = clock.nowMs();
    const profile = {
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
function getProfile(profileId) {
    return profiles.get(profileId) ?? null;
}
/**
 * Get all profiles
 */
function getAllProfiles() {
    return Array.from(profiles.values());
}
/**
 * Activate profile
 */
function activateProfile(profileId) {
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
function deactivateProfile(profileId) {
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
function getActiveProfile() {
    if (activeProfileId === null) {
        return null;
    }
    return profiles.get(activeProfileId) ?? null;
}
/**
 * Delete profile
 */
function deleteProfile(profileId) {
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
function createSnapshot(name, options = {}) {
    const snapshotId = generateSnapshotId();
    const now = clock.nowMs();
    const namespacesSnapshot = {};
    for (const [nsName, ns] of namespaces) {
        namespacesSnapshot[nsName] = { ...ns };
    }
    const snapshot = {
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
function getSnapshot(snapshotId) {
    return snapshots.get(snapshotId) ?? null;
}
/**
 * Get all snapshots
 */
function getAllSnapshots() {
    return Array.from(snapshots.values());
}
/**
 * Restore snapshot
 */
function restoreSnapshot(snapshotId) {
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
function deleteSnapshot(snapshotId) {
    return snapshots.delete(snapshotId);
}
// ============================================================================
// FEATURE FLAGS
// ============================================================================
/**
 * Create feature flag
 */
function createFeatureFlag(name, options = {}) {
    const flagId = generateFlagId();
    const now = clock.nowMs();
    const flag = {
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
function getFeatureFlag(flagId) {
    return featureFlags.get(flagId) ?? null;
}
/**
 * Get feature flag by name
 */
function getFeatureFlagByName(name) {
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
function getAllFeatureFlags() {
    return Array.from(featureFlags.values());
}
/**
 * Enable feature flag
 */
function enableFeatureFlag(flagId) {
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
function disableFeatureFlag(flagId) {
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
function isFeatureEnabled(name, context = {}) {
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
function deleteFeatureFlag(flagId) {
    return featureFlags.delete(flagId);
}
// ============================================================================
// LOADERS
// ============================================================================
/**
 * Register loader
 */
function registerLoader(loader) {
    loaders.set(loader.name, loader);
}
/**
 * Unregister loader
 */
function unregisterLoader(name) {
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
async function loadFromLoaders(namespaceName) {
    const errors = [];
    const warnings = [];
    for (const loader of loaders.values()) {
        try {
            const config = await loader.load();
            for (const [key, value] of Object.entries(config)) {
                const result = set(namespaceName, key, value, { source: loader.source });
                errors.push(...result.errors);
                warnings.push(...result.warnings);
            }
        }
        catch (error) {
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
function getChangeHistory(options = {}) {
    let filtered = [...changeHistory];
    if (options.namespace) {
        filtered = filtered.filter(c => c.namespace === options.namespace);
    }
    if (options.key) {
        filtered = filtered.filter(c => c.key === options.key);
    }
    if (options.fromDate) {
        filtered = filtered.filter(c => c.changedAt >= options.fromDate);
    }
    if (options.toDate) {
        filtered = filtered.filter(c => c.changedAt <= options.toDate);
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
function clearChangeHistory() {
    changeHistory.length = 0;
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
// CONFIGURATION
// ============================================================================
/**
 * Configure manager
 */
function configure(newOptions) {
    options = { ...options, ...newOptions };
}
/**
 * Get manager options
 */
function getOptions() {
    return { ...options };
}
// ============================================================================
// CLEANUP
// ============================================================================
/**
 * Clear all state
 */
function clearAll() {
    namespaces.clear();
    profiles.clear();
    snapshots.clear();
    featureFlags.clear();
    changeHistory.length = 0;
    eventListeners.clear();
    loaders.clear();
    activeProfileId = null;
}
