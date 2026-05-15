/**
 * @file Access Control za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-SEC-002 Access control za zaledne sisteme
 * @design DSN-ZALEDNI-SEC-002 Backend access control arhitektura
 * @test TEST-ZALEDNI-SEC-002 Preverjanje access control
 *
 * Access Control - prilagojen za zaledne sisteme:
 * - Role-based access control (RBAC)
 * - Attribute-based access control (ABAC)
 * - Permission management
 * - Policy enforcement
 * - Resource protection
 * - Session management
 * - Audit logging
 * - Multi-tenancy
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom SEC_002 - Access Control
 */
/**
 * Permission type
 */
export type PermissionType = 'read' | 'write' | 'delete' | 'execute' | 'admin' | 'custom';
/**
 * Resource type
 */
export type ResourceType = 'api' | 'data' | 'file' | 'service' | 'config' | 'system';
/**
 * Policy effect
 */
export type PolicyEffect = 'allow' | 'deny';
/**
 * Permission
 */
export interface Permission {
    readonly permissionId: string;
    readonly name: string;
    readonly type: PermissionType;
    readonly resource: string;
    readonly resourceType: ResourceType;
    readonly actions: readonly string[];
    readonly description: string;
    readonly metadata: Readonly<Record<string, unknown>>;
}
/**
 * Role
 */
export interface Role {
    readonly roleId: string;
    readonly name: string;
    readonly description: string;
    readonly permissions: readonly string[];
    readonly parentRoles: readonly string[];
    readonly tenantId: string | null;
    readonly metadata: Readonly<Record<string, unknown>>;
    readonly createdAt: number;
    readonly updatedAt: number;
}
/**
 * User principal
 */
export interface UserPrincipal {
    readonly principalId: string;
    readonly userId: string;
    readonly username: string;
    readonly email: string | null;
    readonly roles: readonly string[];
    readonly directPermissions: readonly string[];
    readonly attributes: Readonly<Record<string, unknown>>;
    readonly tenantId: string | null;
    readonly active: boolean;
    readonly createdAt: number;
    readonly updatedAt: number;
}
/**
 * Access policy
 */
export interface AccessPolicy {
    readonly policyId: string;
    readonly name: string;
    readonly description: string;
    readonly effect: PolicyEffect;
    readonly principals: readonly string[];
    readonly resources: readonly string[];
    readonly actions: readonly string[];
    readonly conditions: readonly PolicyCondition[];
    readonly priority: number;
    readonly enabled: boolean;
    readonly metadata: Readonly<Record<string, unknown>>;
}
/**
 * Policy condition
 */
export interface PolicyCondition {
    readonly conditionId: string;
    readonly type: ConditionType;
    readonly attribute: string;
    readonly operator: ConditionOperator;
    readonly value: unknown;
}
/**
 * Condition type
 */
export type ConditionType = 'string' | 'number' | 'boolean' | 'date' | 'ip' | 'time' | 'custom';
/**
 * Condition operator
 */
export type ConditionOperator = 'equals' | 'not_equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'between' | 'matches';
/**
 * Access request
 */
export interface AccessRequest {
    readonly requestId: string;
    readonly principalId: string;
    readonly resource: string;
    readonly action: string;
    readonly context: AccessContext;
    readonly timestamp: number;
}
/**
 * Access context
 */
export interface AccessContext {
    readonly ipAddress: string | null;
    readonly userAgent: string | null;
    readonly sessionId: string | null;
    readonly tenantId: string | null;
    readonly attributes: Readonly<Record<string, unknown>>;
}
/**
 * Access decision
 */
export interface AccessDecision {
    readonly decisionId: string;
    readonly requestId: string;
    readonly effect: PolicyEffect;
    readonly matchedPolicies: readonly string[];
    readonly reason: string;
    readonly timestamp: number;
}
/**
 * Session
 */
export interface Session {
    readonly sessionId: string;
    readonly principalId: string;
    readonly ipAddress: string | null;
    readonly userAgent: string | null;
    readonly createdAt: number;
    readonly expiresAt: number;
    readonly lastActivityAt: number;
    readonly active: boolean;
    readonly metadata: Readonly<Record<string, unknown>>;
}
/**
 * Access event
 */
export interface AccessEvent {
    readonly eventId: string;
    readonly type: AccessEventType;
    readonly principalId: string | null;
    readonly resource: string | null;
    readonly timestamp: number;
    readonly data: Readonly<Record<string, unknown>>;
}
/**
 * Access event type
 */
export type AccessEventType = 'permission_created' | 'permission_deleted' | 'role_created' | 'role_updated' | 'role_deleted' | 'principal_created' | 'principal_updated' | 'principal_deleted' | 'policy_created' | 'policy_updated' | 'policy_deleted' | 'access_granted' | 'access_denied' | 'session_created' | 'session_expired' | 'session_terminated';
/**
 * Access event listener
 */
export type AccessEventListener = (event: AccessEvent) => void | Promise<void>;
/**
 * Access statistics
 */
export interface AccessStatistics {
    readonly totalPermissions: number;
    readonly totalRoles: number;
    readonly totalPrincipals: number;
    readonly totalPolicies: number;
    readonly totalSessions: number;
    readonly activeSessions: number;
    readonly accessGranted: number;
    readonly accessDenied: number;
}
/**
 * Create permission
 */
export declare function createPermission(name: string, type: PermissionType, resource: string, resourceType: ResourceType, actions: readonly string[], options?: {
    description?: string;
    metadata?: Record<string, unknown>;
}): Promise<Permission>;
/**
 * Get permission
 */
export declare function getPermission(nameOrId: string): Permission | null;
/**
 * Get all permissions
 */
export declare function getAllPermissions(): readonly Permission[];
/**
 * Delete permission
 */
export declare function deletePermission(nameOrId: string): Promise<boolean>;
/**
 * Create role
 */
export declare function createRole(name: string, permissionIds: readonly string[], options?: {
    description?: string;
    parentRoles?: readonly string[];
    tenantId?: string;
    metadata?: Record<string, unknown>;
}): Promise<Role>;
/**
 * Get role
 */
export declare function getRole(nameOrId: string): Role | null;
/**
 * Get all roles
 */
export declare function getAllRoles(): readonly Role[];
/**
 * Update role
 */
export declare function updateRole(nameOrId: string, updates: {
    permissions?: readonly string[];
    parentRoles?: readonly string[];
    description?: string;
    metadata?: Record<string, unknown>;
}): Promise<Role | null>;
/**
 * Delete role
 */
export declare function deleteRole(nameOrId: string): Promise<boolean>;
/**
 * Create principal
 */
export declare function createPrincipal(userId: string, username: string, roleIds: readonly string[], options?: {
    email?: string;
    directPermissions?: readonly string[];
    attributes?: Record<string, unknown>;
    tenantId?: string;
    metadata?: Record<string, unknown>;
}): Promise<UserPrincipal>;
/**
 * Get principal
 */
export declare function getPrincipal(idOrUserId: string): UserPrincipal | null;
/**
 * Get all principals
 */
export declare function getAllPrincipals(): readonly UserPrincipal[];
/**
 * Update principal
 */
export declare function updatePrincipal(idOrUserId: string, updates: {
    roles?: readonly string[];
    directPermissions?: readonly string[];
    attributes?: Record<string, unknown>;
    active?: boolean;
}): Promise<UserPrincipal | null>;
/**
 * Delete principal
 */
export declare function deletePrincipal(idOrUserId: string): Promise<boolean>;
/**
 * Create policy
 */
export declare function createPolicy(name: string, effect: PolicyEffect, principals: readonly string[], resources: readonly string[], actions: readonly string[], options?: {
    description?: string;
    conditions?: readonly Omit<PolicyCondition, 'conditionId'>[];
    priority?: number;
    metadata?: Record<string, unknown>;
}): Promise<AccessPolicy>;
/**
 * Get policy
 */
export declare function getPolicy(nameOrId: string): AccessPolicy | null;
/**
 * Get all policies
 */
export declare function getAllPolicies(): readonly AccessPolicy[];
/**
 * Delete policy
 */
export declare function deletePolicy(nameOrId: string): Promise<boolean>;
/**
 * Check access
 */
export declare function checkAccess(principalId: string, resource: string, action: string, context?: Partial<AccessContext>): Promise<AccessDecision>;
/**
 * Has permission
 */
export declare function hasPermission(principalId: string, permissionNameOrId: string): boolean;
/**
 * Has role
 */
export declare function hasRole(principalId: string, roleNameOrId: string): boolean;
/**
 * Create session
 */
export declare function createSession(principalId: string, expiresInMinutes?: number, options?: {
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
}): Promise<Session>;
/**
 * Get session
 */
export declare function getSession(sessionId: string): Session | null;
/**
 * Validate session
 */
export declare function validateSession(sessionId: string): boolean;
/**
 * Refresh session
 */
export declare function refreshSession(sessionId: string): Session | null;
/**
 * Terminate session
 */
export declare function terminateSession(sessionId: string): Promise<boolean>;
/**
 * Cleanup expired sessions
 */
export declare function cleanupExpiredSessions(): Promise<number>;
/**
 * Get statistics
 */
export declare function getStatistics(): Readonly<AccessStatistics>;
/**
 * Reset statistics
 */
export declare function resetStatistics(): void;
/**
 * Add event listener
 */
export declare function addEventListener(listener: AccessEventListener): void;
/**
 * Remove event listener
 */
export declare function removeEventListener(listener: AccessEventListener): void;
/**
 * Clear event listeners
 */
export declare function clearEventListeners(): void;
/**
 * Clear all state
 */
export declare function clearAll(): void;
