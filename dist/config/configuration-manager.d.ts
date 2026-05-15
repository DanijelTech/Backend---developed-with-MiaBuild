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
export type ConfigEventType = 'value_set' | 'value_deleted' | 'namespace_created' | 'namespace_deleted' | 'profile_activated' | 'profile_deactivated' | 'snapshot_created' | 'snapshot_restored' | 'flag_enabled' | 'flag_disabled' | 'config_reloaded' | 'validation_failed';
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
/**
 * Create namespace
 */
export declare function createNamespace(name: string, options?: {
    description?: string;
    schemas?: readonly ConfigSchema[];
}): ConfigNamespace;
/**
 * Get namespace
 */
export declare function getNamespace(name: string): ConfigNamespace | null;
/**
 * Get all namespaces
 */
export declare function getAllNamespaces(): readonly ConfigNamespace[];
/**
 * Delete namespace
 */
export declare function deleteNamespace(name: string): boolean;
/**
 * Add schema to namespace
 */
export declare function addSchema(namespaceName: string, schema: ConfigSchema): boolean;
/**
 * Remove schema from namespace
 */
export declare function removeSchema(namespaceName: string, key: string): boolean;
/**
 * Set configuration value
 */
export declare function set<T>(namespaceName: string, key: string, value: T, options?: {
    source?: ConfigSource;
    changedBy?: string;
    reason?: string;
}): ValidationResult;
/**
 * Get configuration value
 */
export declare function get<T>(namespaceName: string, key: string, defaultValue?: T): T | undefined;
/**
 * Get configuration value with metadata
 */
export declare function getValue<T>(namespaceName: string, key: string): ConfigValue<T> | null;
/**
 * Delete configuration value
 */
export declare function del(namespaceName: string, key: string, options?: {
    changedBy?: string;
    reason?: string;
}): boolean;
/**
 * Check if key exists
 */
export declare function has(namespaceName: string, key: string): boolean;
/**
 * Get all values in namespace
 */
export declare function getAll(namespaceName: string): Readonly<Record<string, unknown>>;
/**
 * Create profile
 */
export declare function createProfile(name: string, options?: {
    description?: string;
    environment?: string;
    namespaces?: readonly string[];
    overrides?: Record<string, unknown>;
}): ConfigProfile;
/**
 * Get profile
 */
export declare function getProfile(profileId: string): ConfigProfile | null;
/**
 * Get all profiles
 */
export declare function getAllProfiles(): readonly ConfigProfile[];
/**
 * Activate profile
 */
export declare function activateProfile(profileId: string): boolean;
/**
 * Deactivate profile
 */
export declare function deactivateProfile(profileId: string): boolean;
/**
 * Get active profile
 */
export declare function getActiveProfile(): ConfigProfile | null;
/**
 * Delete profile
 */
export declare function deleteProfile(profileId: string): boolean;
/**
 * Create snapshot
 */
export declare function createSnapshot(name: string, options?: {
    description?: string;
    createdBy?: string;
}): ConfigSnapshot;
/**
 * Get snapshot
 */
export declare function getSnapshot(snapshotId: string): ConfigSnapshot | null;
/**
 * Get all snapshots
 */
export declare function getAllSnapshots(): readonly ConfigSnapshot[];
/**
 * Restore snapshot
 */
export declare function restoreSnapshot(snapshotId: string): boolean;
/**
 * Delete snapshot
 */
export declare function deleteSnapshot(snapshotId: string): boolean;
/**
 * Create feature flag
 */
export declare function createFeatureFlag(name: string, options?: {
    description?: string;
    enabled?: boolean;
    percentage?: number;
    conditions?: readonly FeatureFlagCondition[];
    metadata?: Record<string, unknown>;
}): FeatureFlag;
/**
 * Get feature flag
 */
export declare function getFeatureFlag(flagId: string): FeatureFlag | null;
/**
 * Get feature flag by name
 */
export declare function getFeatureFlagByName(name: string): FeatureFlag | null;
/**
 * Get all feature flags
 */
export declare function getAllFeatureFlags(): readonly FeatureFlag[];
/**
 * Enable feature flag
 */
export declare function enableFeatureFlag(flagId: string): boolean;
/**
 * Disable feature flag
 */
export declare function disableFeatureFlag(flagId: string): boolean;
/**
 * Check if feature is enabled
 */
export declare function isFeatureEnabled(name: string, context?: Record<string, unknown>): boolean;
/**
 * Delete feature flag
 */
export declare function deleteFeatureFlag(flagId: string): boolean;
/**
 * Register loader
 */
export declare function registerLoader(loader: ConfigLoader): void;
/**
 * Unregister loader
 */
export declare function unregisterLoader(name: string): boolean;
/**
 * Load configuration from all loaders
 */
export declare function loadFromLoaders(namespaceName: string): Promise<ValidationResult>;
/**
 * Get change history
 */
export declare function getChangeHistory(options?: {
    namespace?: string;
    key?: string;
    fromDate?: number;
    toDate?: number;
    limit?: number;
}): readonly ConfigChange[];
/**
 * Clear change history
 */
export declare function clearChangeHistory(): void;
/**
 * Add event listener
 */
export declare function addEventListener(listener: ConfigEventListener): void;
/**
 * Remove event listener
 */
export declare function removeEventListener(listener: ConfigEventListener): void;
/**
 * Clear event listeners
 */
export declare function clearEventListeners(): void;
/**
 * Configure manager
 */
export declare function configure(newOptions: Partial<ConfigManagerOptions>): void;
/**
 * Get manager options
 */
export declare function getOptions(): Readonly<ConfigManagerOptions>;
/**
 * Clear all state
 */
export declare function clearAll(): void;
