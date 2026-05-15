/**
 * @file Data Validator za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-DATA-002 Data validation za zaledne sisteme
 * @design DSN-ZALEDNI-DATA-002 Backend data validator arhitektura
 * @test TEST-ZALEDNI-DATA-002 Preverjanje data validator
 *
 * Data Validator - prilagojen za zaledne sisteme:
 * - Schema validation
 * - Type checking
 * - Constraint validation
 * - Custom validators
 * - Async validation
 * - Conditional validation
 * - Error formatting
 * - Validation caching
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom DATA_002 - Data Validator
 */
/**
 * Validation result
 */
export interface ValidationResult {
    readonly valid: boolean;
    readonly errors: readonly ValidationError[];
    readonly warnings: readonly ValidationWarning[];
    readonly metadata: ValidationMetadata;
}
/**
 * Validation error
 */
export interface ValidationError {
    readonly path: string;
    readonly message: string;
    readonly code: string;
    readonly value: unknown;
    readonly constraint: string | null;
    readonly expected: unknown;
    readonly actual: unknown;
}
/**
 * Validation warning
 */
export interface ValidationWarning {
    readonly path: string;
    readonly message: string;
    readonly code: string;
    readonly suggestion: string | null;
}
/**
 * Validation metadata
 */
export interface ValidationMetadata {
    readonly validatedAt: number;
    readonly duration: number;
    readonly rulesApplied: number;
    readonly fieldsValidated: number;
    readonly cacheHit: boolean;
}
/**
 * Validation schema
 */
export interface ValidationSchema {
    readonly schemaId: string;
    readonly name: string;
    readonly version: string;
    readonly fields: Readonly<Record<string, FieldSchema>>;
    readonly rules: readonly SchemaRule[];
    readonly metadata: Readonly<Record<string, unknown>>;
}
/**
 * Field schema
 */
export interface FieldSchema {
    readonly type: FieldType;
    readonly required: boolean;
    readonly nullable: boolean;
    readonly defaultValue: unknown;
    readonly constraints: readonly FieldConstraint[];
    readonly nested: ValidationSchema | null;
    readonly arrayOf: FieldSchema | null;
    readonly description: string;
}
/**
 * Field type
 */
export type FieldType = 'string' | 'number' | 'integer' | 'boolean' | 'date' | 'datetime' | 'email' | 'url' | 'uuid' | 'array' | 'object' | 'any';
/**
 * Field constraint
 */
export interface FieldConstraint {
    readonly type: ConstraintType;
    readonly value: unknown;
    readonly message: string | null;
}
/**
 * Constraint type
 */
export type ConstraintType = 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'enum' | 'format' | 'unique' | 'custom';
/**
 * Schema rule
 */
export interface SchemaRule {
    readonly ruleId: string;
    readonly name: string;
    readonly type: RuleType;
    readonly condition: RuleCondition | null;
    readonly validator: RuleValidator;
    readonly message: string;
    readonly severity: RuleSeverity;
}
/**
 * Rule type
 */
export type RuleType = 'field' | 'cross_field' | 'conditional' | 'async' | 'custom';
/**
 * Rule condition
 */
export interface RuleCondition {
    readonly field: string;
    readonly operator: ConditionOperator;
    readonly value: unknown;
}
/**
 * Condition operator
 */
export type ConditionOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'notIn' | 'contains' | 'startsWith' | 'endsWith' | 'matches' | 'isNull' | 'isNotNull';
/**
 * Rule validator
 */
export type RuleValidator = (value: unknown, context: ValidationContext) => boolean | Promise<boolean>;
/**
 * Rule severity
 */
export type RuleSeverity = 'error' | 'warning' | 'info';
/**
 * Validation context
 */
export interface ValidationContext {
    readonly data: Readonly<Record<string, unknown>>;
    readonly path: string;
    readonly schema: ValidationSchema;
    readonly options: ValidationOptions;
    readonly cache: Map<string, unknown>;
}
/**
 * Validation options
 */
export interface ValidationOptions {
    readonly abortEarly: boolean;
    readonly stripUnknown: boolean;
    readonly allowUnknown: boolean;
    readonly recursive: boolean;
    readonly coerce: boolean;
    readonly context: Readonly<Record<string, unknown>>;
    readonly cache: boolean;
    readonly timeout: number;
}
/**
 * Custom validator
 */
export interface CustomValidator {
    readonly validatorId: string;
    readonly name: string;
    readonly description: string;
    readonly validate: ValidatorFunction;
    readonly async: boolean;
}
/**
 * Validator function
 */
export type ValidatorFunction = (value: unknown, params: Readonly<Record<string, unknown>>, context: ValidationContext) => boolean | string | Promise<boolean | string>;
/**
 * Validation event
 */
export interface ValidationEvent {
    readonly eventId: string;
    readonly type: ValidationEventType;
    readonly schemaId: string | null;
    readonly path: string | null;
    readonly timestamp: number;
    readonly data: Readonly<Record<string, unknown>>;
}
/**
 * Validation event type
 */
export type ValidationEventType = 'validation_started' | 'validation_completed' | 'validation_failed' | 'field_validated' | 'rule_applied' | 'schema_registered' | 'validator_registered';
/**
 * Validation event listener
 */
export type ValidationEventListener = (event: ValidationEvent) => void | Promise<void>;
/**
 * Validator statistics
 */
export interface ValidatorStatistics {
    readonly totalValidations: number;
    readonly successfulValidations: number;
    readonly failedValidations: number;
    readonly totalErrors: number;
    readonly totalWarnings: number;
    readonly avgValidationTime: number;
    readonly cacheHits: number;
    readonly cacheMisses: number;
}
/**
 * Format validator
 */
export interface FormatValidator {
    readonly name: string;
    readonly pattern: RegExp;
    readonly message: string;
}
/**
 * Register schema
 */
export declare function registerSchema(name: string, fields: Record<string, FieldSchema>, options?: {
    version?: string;
    rules?: readonly Omit<SchemaRule, 'ruleId'>[];
    metadata?: Record<string, unknown>;
}): ValidationSchema;
/**
 * Get schema
 */
export declare function getSchema(nameOrId: string): ValidationSchema | null;
/**
 * Get all schemas
 */
export declare function getAllSchemas(): readonly ValidationSchema[];
/**
 * Remove schema
 */
export declare function removeSchema(nameOrId: string): boolean;
/**
 * Register custom validator
 */
export declare function registerCustomValidator(name: string, validate: ValidatorFunction, options?: {
    description?: string;
    async?: boolean;
}): CustomValidator;
/**
 * Get custom validator
 */
export declare function getCustomValidator(name: string): CustomValidator | null;
/**
 * Get all custom validators
 */
export declare function getAllCustomValidators(): readonly CustomValidator[];
/**
 * Remove custom validator
 */
export declare function removeCustomValidator(name: string): boolean;
/**
 * Register format validator
 */
export declare function registerFormatValidator(name: string, pattern: RegExp, message: string): FormatValidator;
/**
 * Get format validator
 */
export declare function getFormatValidator(name: string): FormatValidator | null;
/**
 * Get all format validators
 */
export declare function getAllFormatValidators(): readonly FormatValidator[];
/**
 * Validate data against schema
 */
export declare function validate(data: unknown, schemaNameOrId: string, options?: Partial<ValidationOptions>): Promise<ValidationResult>;
/**
 * Validate with custom validator
 */
export declare function validateWithCustom(value: unknown, validatorName: string, params?: Record<string, unknown>, context?: Partial<ValidationContext>): Promise<boolean | string>;
/**
 * Create field schema
 */
export declare function field(type: FieldType, options?: {
    required?: boolean;
    nullable?: boolean;
    defaultValue?: unknown;
    constraints?: readonly FieldConstraint[];
    nested?: ValidationSchema;
    arrayOf?: FieldSchema;
    description?: string;
}): FieldSchema;
/**
 * Create constraint
 */
export declare function constraint(type: ConstraintType, value: unknown, message?: string): FieldConstraint;
/**
 * Create rule
 */
export declare function rule(name: string, validator: RuleValidator, options?: {
    type?: RuleType;
    condition?: RuleCondition;
    message?: string;
    severity?: RuleSeverity;
}): Omit<SchemaRule, 'ruleId'>;
/**
 * Clear validation cache
 */
export declare function clearCache(): void;
/**
 * Get statistics
 */
export declare function getStatistics(): Readonly<ValidatorStatistics>;
/**
 * Reset statistics
 */
export declare function resetStatistics(): void;
/**
 * Add event listener
 */
export declare function addEventListener(listener: ValidationEventListener): void;
/**
 * Remove event listener
 */
export declare function removeEventListener(listener: ValidationEventListener): void;
/**
 * Clear event listeners
 */
export declare function clearEventListeners(): void;
/**
 * Clear all state
 */
export declare function clearAll(): void;
