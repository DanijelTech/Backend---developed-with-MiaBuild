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

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI ZA ACCESS CONTROL
// ============================================================================

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
export type AccessEventType =
    | 'permission_created'
    | 'permission_deleted'
    | 'role_created'
    | 'role_updated'
    | 'role_deleted'
    | 'principal_created'
    | 'principal_updated'
    | 'principal_deleted'
    | 'policy_created'
    | 'policy_updated'
    | 'policy_deleted'
    | 'access_granted'
    | 'access_denied'
    | 'session_created'
    | 'session_expired'
    | 'session_terminated';

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

// ============================================================================
// STANJE
// ============================================================================

const permissions: Map<string, Permission> = new Map();
const roles: Map<string, Role> = new Map();
const principals: Map<string, UserPrincipal> = new Map();
const policies: Map<string, AccessPolicy> = new Map();
const sessions: Map<string, Session> = new Map();
const eventListeners: Set<AccessEventListener> = new Set();

let permissionCounter = 0;
let roleCounter = 0;
let principalCounter = 0;
let policyCounter = 0;
let conditionCounter = 0;
let sessionCounter = 0;
let requestCounter = 0;
let decisionCounter = 0;
let eventCounter = 0;

const statistics: AccessStatistics = {
    totalPermissions: 0,
    totalRoles: 0,
    totalPrincipals: 0,
    totalPolicies: 0,
    totalSessions: 0,
    activeSessions: 0,
    accessGranted: 0,
    accessDenied: 0,
};

// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================

/**
 * Generate permission ID
 */
function generatePermissionId(): string {
    permissionCounter++;
    return generateDeterministicId(`perm-${permissionCounter}`);
}

/**
 * Generate role ID
 */
function generateRoleId(): string {
    roleCounter++;
    return generateDeterministicId(`role-${roleCounter}`);
}

/**
 * Generate principal ID
 */
function generatePrincipalId(): string {
    principalCounter++;
    return generateDeterministicId(`principal-${principalCounter}`);
}

/**
 * Generate policy ID
 */
function generatePolicyId(): string {
    policyCounter++;
    return generateDeterministicId(`policy-${policyCounter}`);
}

/**
 * Generate condition ID
 */
function generateConditionId(): string {
    conditionCounter++;
    return generateDeterministicId(`condition-${conditionCounter}`);
}

/**
 * Generate session ID
 */
function generateSessionId(): string {
    sessionCounter++;
    return generateDeterministicId(`session-${sessionCounter}`);
}

/**
 * Generate request ID
 */
function generateRequestId(): string {
    requestCounter++;
    return generateDeterministicId(`access-req-${requestCounter}`);
}

/**
 * Generate decision ID
 */
function generateDecisionId(): string {
    decisionCounter++;
    return generateDeterministicId(`access-dec-${decisionCounter}`);
}

/**
 * Generate event ID
 */
function generateEventId(): string {
    eventCounter++;
    return generateDeterministicId(`access-event-${eventCounter}`);
}

/**
 * Emit access event
 */
async function emitEvent(event: AccessEvent): Promise<void> {
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
        totalPermissions: number;
        totalRoles: number;
        totalPrincipals: number;
        totalPolicies: number;
        totalSessions: number;
        activeSessions: number;
    };
    
    mutableStats.totalPermissions = permissions.size;
    mutableStats.totalRoles = roles.size;
    mutableStats.totalPrincipals = principals.size;
    mutableStats.totalPolicies = policies.size;
    mutableStats.totalSessions = sessions.size;
    mutableStats.activeSessions = Array.from(sessions.values()).filter(s => s.active).length;
}

/**
 * Get all permissions for principal
 */
function getAllPermissionsForPrincipal(principalId: string): Set<string> {
    const principal = principals.get(principalId);
    if (!principal) {
        return new Set();
    }
    
    const allPermissions = new Set<string>(principal.directPermissions);
    
    const processedRoles = new Set<string>();
    const rolesToProcess = [...principal.roles];
    
    while (rolesToProcess.length > 0) {
        const roleId = rolesToProcess.pop()!;
        if (processedRoles.has(roleId)) {
            continue;
        }
        processedRoles.add(roleId);
        
        const role = roles.get(roleId);
        if (role) {
            for (const permId of role.permissions) {
                allPermissions.add(permId);
            }
            rolesToProcess.push(...role.parentRoles);
        }
    }
    
    return allPermissions;
}

/**
 * Evaluate condition
 */
function evaluateCondition(condition: PolicyCondition, context: AccessContext): boolean {
    const value = context.attributes[condition.attribute];
    
    switch (condition.operator) {
        case 'equals':
            return value === condition.value;
        case 'not_equals':
            return value !== condition.value;
        case 'contains':
            return typeof value === 'string' && value.includes(String(condition.value));
        case 'starts_with':
            return typeof value === 'string' && value.startsWith(String(condition.value));
        case 'ends_with':
            return typeof value === 'string' && value.endsWith(String(condition.value));
        case 'greater_than':
            return typeof value === 'number' && value > (condition.value as number);
        case 'less_than':
            return typeof value === 'number' && value < (condition.value as number);
        case 'in':
            return Array.isArray(condition.value) && condition.value.includes(value);
        case 'not_in':
            return Array.isArray(condition.value) && !condition.value.includes(value);
        case 'between':
            if (Array.isArray(condition.value) && condition.value.length === 2 && typeof value === 'number') {
                return value >= (condition.value[0] as number) && value <= (condition.value[1] as number);
            }
            return false;
        case 'matches':
            if (typeof value === 'string' && typeof condition.value === 'string') {
                try {
                    return new RegExp(condition.value).test(value);
                } catch {
                    return false;
                }
            }
            return false;
        default:
            return false;
    }
}

// ============================================================================
// PERMISSION MANAGEMENT
// ============================================================================

/**
 * Create permission
 */
export async function createPermission(
    name: string,
    type: PermissionType,
    resource: string,
    resourceType: ResourceType,
    actions: readonly string[],
    options: {
        description?: string;
        metadata?: Record<string, unknown>;
    } = {}
): Promise<Permission> {
    const permissionId = generatePermissionId();
    
    const permission: Permission = {
        permissionId,
        name,
        type,
        resource,
        resourceType,
        actions,
        description: options.description ?? '',
        metadata: options.metadata ?? {},
    };
    
    permissions.set(permissionId, permission);
    permissions.set(name, permission);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'permission_created',
        principalId: null,
        resource,
        timestamp: clock.nowMs(),
        data: { permissionId, name },
    });
    
    updateStatistics();
    
    return permission;
}

/**
 * Get permission
 */
export function getPermission(nameOrId: string): Permission | null {
    return permissions.get(nameOrId) ?? null;
}

/**
 * Get all permissions
 */
export function getAllPermissions(): readonly Permission[] {
    const uniquePermissions = new Map<string, Permission>();
    for (const permission of permissions.values()) {
        uniquePermissions.set(permission.permissionId, permission);
    }
    return Array.from(uniquePermissions.values());
}

/**
 * Delete permission
 */
export async function deletePermission(nameOrId: string): Promise<boolean> {
    const permission = permissions.get(nameOrId);
    if (!permission) {
        return false;
    }
    
    permissions.delete(permission.permissionId);
    permissions.delete(permission.name);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'permission_deleted',
        principalId: null,
        resource: permission.resource,
        timestamp: clock.nowMs(),
        data: { permissionId: permission.permissionId },
    });
    
    updateStatistics();
    
    return true;
}

// ============================================================================
// ROLE MANAGEMENT
// ============================================================================

/**
 * Create role
 */
export async function createRole(
    name: string,
    permissionIds: readonly string[],
    options: {
        description?: string;
        parentRoles?: readonly string[];
        tenantId?: string;
        metadata?: Record<string, unknown>;
    } = {}
): Promise<Role> {
    const roleId = generateRoleId();
    const now = clock.nowMs();
    
    const role: Role = {
        roleId,
        name,
        description: options.description ?? '',
        permissions: permissionIds,
        parentRoles: options.parentRoles ?? [],
        tenantId: options.tenantId ?? null,
        metadata: options.metadata ?? {},
        createdAt: now,
        updatedAt: now,
    };
    
    roles.set(roleId, role);
    roles.set(name, role);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'role_created',
        principalId: null,
        resource: null,
        timestamp: now,
        data: { roleId, name },
    });
    
    updateStatistics();
    
    return role;
}

/**
 * Get role
 */
export function getRole(nameOrId: string): Role | null {
    return roles.get(nameOrId) ?? null;
}

/**
 * Get all roles
 */
export function getAllRoles(): readonly Role[] {
    const uniqueRoles = new Map<string, Role>();
    for (const role of roles.values()) {
        uniqueRoles.set(role.roleId, role);
    }
    return Array.from(uniqueRoles.values());
}

/**
 * Update role
 */
export async function updateRole(
    nameOrId: string,
    updates: {
        permissions?: readonly string[];
        parentRoles?: readonly string[];
        description?: string;
        metadata?: Record<string, unknown>;
    }
): Promise<Role | null> {
    const role = roles.get(nameOrId);
    if (!role) {
        return null;
    }
    
    const updatedRole: Role = {
        ...role,
        permissions: updates.permissions ?? role.permissions,
        parentRoles: updates.parentRoles ?? role.parentRoles,
        description: updates.description ?? role.description,
        metadata: updates.metadata ?? role.metadata,
        updatedAt: clock.nowMs(),
    };
    
    roles.set(role.roleId, updatedRole);
    roles.set(role.name, updatedRole);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'role_updated',
        principalId: null,
        resource: null,
        timestamp: clock.nowMs(),
        data: { roleId: role.roleId },
    });
    
    return updatedRole;
}

/**
 * Delete role
 */
export async function deleteRole(nameOrId: string): Promise<boolean> {
    const role = roles.get(nameOrId);
    if (!role) {
        return false;
    }
    
    roles.delete(role.roleId);
    roles.delete(role.name);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'role_deleted',
        principalId: null,
        resource: null,
        timestamp: clock.nowMs(),
        data: { roleId: role.roleId },
    });
    
    updateStatistics();
    
    return true;
}

// ============================================================================
// PRINCIPAL MANAGEMENT
// ============================================================================

/**
 * Create principal
 */
export async function createPrincipal(
    userId: string,
    username: string,
    roleIds: readonly string[],
    options: {
        email?: string;
        directPermissions?: readonly string[];
        attributes?: Record<string, unknown>;
        tenantId?: string;
        metadata?: Record<string, unknown>;
    } = {}
): Promise<UserPrincipal> {
    const principalId = generatePrincipalId();
    const now = clock.nowMs();
    
    const principal: UserPrincipal = {
        principalId,
        userId,
        username,
        email: options.email ?? null,
        roles: roleIds,
        directPermissions: options.directPermissions ?? [],
        attributes: options.attributes ?? {},
        tenantId: options.tenantId ?? null,
        active: true,
        createdAt: now,
        updatedAt: now,
    };
    
    principals.set(principalId, principal);
    principals.set(userId, principal);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'principal_created',
        principalId,
        resource: null,
        timestamp: now,
        data: { userId, username },
    });
    
    updateStatistics();
    
    return principal;
}

/**
 * Get principal
 */
export function getPrincipal(idOrUserId: string): UserPrincipal | null {
    return principals.get(idOrUserId) ?? null;
}

/**
 * Get all principals
 */
export function getAllPrincipals(): readonly UserPrincipal[] {
    const uniquePrincipals = new Map<string, UserPrincipal>();
    for (const principal of principals.values()) {
        uniquePrincipals.set(principal.principalId, principal);
    }
    return Array.from(uniquePrincipals.values());
}

/**
 * Update principal
 */
export async function updatePrincipal(
    idOrUserId: string,
    updates: {
        roles?: readonly string[];
        directPermissions?: readonly string[];
        attributes?: Record<string, unknown>;
        active?: boolean;
    }
): Promise<UserPrincipal | null> {
    const principal = principals.get(idOrUserId);
    if (!principal) {
        return null;
    }
    
    const updatedPrincipal: UserPrincipal = {
        ...principal,
        roles: updates.roles ?? principal.roles,
        directPermissions: updates.directPermissions ?? principal.directPermissions,
        attributes: updates.attributes ?? principal.attributes,
        active: updates.active ?? principal.active,
        updatedAt: clock.nowMs(),
    };
    
    principals.set(principal.principalId, updatedPrincipal);
    principals.set(principal.userId, updatedPrincipal);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'principal_updated',
        principalId: principal.principalId,
        resource: null,
        timestamp: clock.nowMs(),
        data: {},
    });
    
    return updatedPrincipal;
}

/**
 * Delete principal
 */
export async function deletePrincipal(idOrUserId: string): Promise<boolean> {
    const principal = principals.get(idOrUserId);
    if (!principal) {
        return false;
    }
    
    principals.delete(principal.principalId);
    principals.delete(principal.userId);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'principal_deleted',
        principalId: principal.principalId,
        resource: null,
        timestamp: clock.nowMs(),
        data: {},
    });
    
    updateStatistics();
    
    return true;
}

// ============================================================================
// POLICY MANAGEMENT
// ============================================================================

/**
 * Create policy
 */
export async function createPolicy(
    name: string,
    effect: PolicyEffect,
    principals: readonly string[],
    resources: readonly string[],
    actions: readonly string[],
    options: {
        description?: string;
        conditions?: readonly Omit<PolicyCondition, 'conditionId'>[];
        priority?: number;
        metadata?: Record<string, unknown>;
    } = {}
): Promise<AccessPolicy> {
    const policyId = generatePolicyId();
    
    const conditions: PolicyCondition[] = (options.conditions ?? []).map(c => ({
        ...c,
        conditionId: generateConditionId(),
    }));
    
    const policy: AccessPolicy = {
        policyId,
        name,
        description: options.description ?? '',
        effect,
        principals,
        resources,
        actions,
        conditions,
        priority: options.priority ?? 0,
        enabled: true,
        metadata: options.metadata ?? {},
    };
    
    policies.set(policyId, policy);
    policies.set(name, policy);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'policy_created',
        principalId: null,
        resource: null,
        timestamp: clock.nowMs(),
        data: { policyId, name },
    });
    
    updateStatistics();
    
    return policy;
}

/**
 * Get policy
 */
export function getPolicy(nameOrId: string): AccessPolicy | null {
    return policies.get(nameOrId) ?? null;
}

/**
 * Get all policies
 */
export function getAllPolicies(): readonly AccessPolicy[] {
    const uniquePolicies = new Map<string, AccessPolicy>();
    for (const policy of policies.values()) {
        uniquePolicies.set(policy.policyId, policy);
    }
    return Array.from(uniquePolicies.values());
}

/**
 * Delete policy
 */
export async function deletePolicy(nameOrId: string): Promise<boolean> {
    const policy = policies.get(nameOrId);
    if (!policy) {
        return false;
    }
    
    policies.delete(policy.policyId);
    policies.delete(policy.name);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'policy_deleted',
        principalId: null,
        resource: null,
        timestamp: clock.nowMs(),
        data: { policyId: policy.policyId },
    });
    
    updateStatistics();
    
    return true;
}

// ============================================================================
// ACCESS CONTROL
// ============================================================================

/**
 * Check access
 */
export async function checkAccess(
    principalId: string,
    resource: string,
    action: string,
    context: Partial<AccessContext> = {}
): Promise<AccessDecision> {
    const requestId = generateRequestId();
    const decisionId = generateDecisionId();
    const now = clock.nowMs();
    
    const fullContext: AccessContext = {
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
        sessionId: context.sessionId ?? null,
        tenantId: context.tenantId ?? null,
        attributes: context.attributes ?? {},
    };
    
    const principal = principals.get(principalId);
    if (!principal || !principal.active) {
        const decision: AccessDecision = {
            decisionId,
            requestId,
            effect: 'deny',
            matchedPolicies: [],
            reason: 'Principal not found or inactive',
            timestamp: now,
        };
        
        const mutableStats = statistics as { accessDenied: number };
        mutableStats.accessDenied++;
        
        await emitEvent({
            eventId: generateEventId(),
            type: 'access_denied',
            principalId,
            resource,
            timestamp: now,
            data: { action, reason: decision.reason },
        });
        
        return decision;
    }
    
    const principalPermissions = getAllPermissionsForPrincipal(principalId);
    
    for (const permId of principalPermissions) {
        const permission = permissions.get(permId);
        if (permission && permission.resource === resource && permission.actions.includes(action)) {
            const decision: AccessDecision = {
                decisionId,
                requestId,
                effect: 'allow',
                matchedPolicies: [],
                reason: `Permission '${permission.name}' grants access`,
                timestamp: now,
            };
            
            const mutableStats = statistics as { accessGranted: number };
            mutableStats.accessGranted++;
            
            await emitEvent({
                eventId: generateEventId(),
                type: 'access_granted',
                principalId,
                resource,
                timestamp: now,
                data: { action, permissionId: permId },
            });
            
            return decision;
        }
    }
    
    const matchingPolicies: AccessPolicy[] = [];
    
    for (const policy of policies.values()) {
        if (!policy.enabled) {
            continue;
        }
        
        const principalMatches = policy.principals.includes('*') || policy.principals.includes(principalId);
        const resourceMatches = policy.resources.includes('*') || policy.resources.includes(resource);
        const actionMatches = policy.actions.includes('*') || policy.actions.includes(action);
        
        if (principalMatches && resourceMatches && actionMatches) {
            let conditionsMatch = true;
            for (const condition of policy.conditions) {
                if (!evaluateCondition(condition, fullContext)) {
                    conditionsMatch = false;
                    break;
                }
            }
            
            if (conditionsMatch) {
                matchingPolicies.push(policy);
            }
        }
    }
    
    matchingPolicies.sort((a, b) => b.priority - a.priority);
    
    for (const policy of matchingPolicies) {
        if (policy.effect === 'deny') {
            const decision: AccessDecision = {
                decisionId,
                requestId,
                effect: 'deny',
                matchedPolicies: [policy.policyId],
                reason: `Policy '${policy.name}' denies access`,
                timestamp: now,
            };
            
            const mutableStats = statistics as { accessDenied: number };
            mutableStats.accessDenied++;
            
            await emitEvent({
                eventId: generateEventId(),
                type: 'access_denied',
                principalId,
                resource,
                timestamp: now,
                data: { action, policyId: policy.policyId },
            });
            
            return decision;
        }
    }
    
    for (const policy of matchingPolicies) {
        if (policy.effect === 'allow') {
            const decision: AccessDecision = {
                decisionId,
                requestId,
                effect: 'allow',
                matchedPolicies: [policy.policyId],
                reason: `Policy '${policy.name}' allows access`,
                timestamp: now,
            };
            
            const mutableStats = statistics as { accessGranted: number };
            mutableStats.accessGranted++;
            
            await emitEvent({
                eventId: generateEventId(),
                type: 'access_granted',
                principalId,
                resource,
                timestamp: now,
                data: { action, policyId: policy.policyId },
            });
            
            return decision;
        }
    }
    
    const decision: AccessDecision = {
        decisionId,
        requestId,
        effect: 'deny',
        matchedPolicies: [],
        reason: 'No matching policy found (default deny)',
        timestamp: now,
    };
    
    const mutableStats = statistics as { accessDenied: number };
    mutableStats.accessDenied++;
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'access_denied',
        principalId,
        resource,
        timestamp: now,
        data: { action, reason: decision.reason },
    });
    
    return decision;
}

/**
 * Has permission
 */
export function hasPermission(principalId: string, permissionNameOrId: string): boolean {
    const allPermissions = getAllPermissionsForPrincipal(principalId);
    
    if (allPermissions.has(permissionNameOrId)) {
        return true;
    }
    
    const permission = permissions.get(permissionNameOrId);
    if (permission && allPermissions.has(permission.permissionId)) {
        return true;
    }
    
    return false;
}

/**
 * Has role
 */
export function hasRole(principalId: string, roleNameOrId: string): boolean {
    const principal = principals.get(principalId);
    if (!principal) {
        return false;
    }
    
    if (principal.roles.includes(roleNameOrId)) {
        return true;
    }
    
    const role = roles.get(roleNameOrId);
    if (role && principal.roles.includes(role.roleId)) {
        return true;
    }
    
    return false;
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Create session
 */
export async function createSession(
    principalId: string,
    expiresInMinutes: number = 60,
    options: {
        ipAddress?: string;
        userAgent?: string;
        metadata?: Record<string, unknown>;
    } = {}
): Promise<Session> {
    const sessionId = generateSessionId();
    const now = clock.nowMs();
    
    const session: Session = {
        sessionId,
        principalId,
        ipAddress: options.ipAddress ?? null,
        userAgent: options.userAgent ?? null,
        createdAt: now,
        expiresAt: now + expiresInMinutes * 60 * 1000,
        lastActivityAt: now,
        active: true,
        metadata: options.metadata ?? {},
    };
    
    sessions.set(sessionId, session);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'session_created',
        principalId,
        resource: null,
        timestamp: now,
        data: { sessionId },
    });
    
    updateStatistics();
    
    return session;
}

/**
 * Get session
 */
export function getSession(sessionId: string): Session | null {
    return sessions.get(sessionId) ?? null;
}

/**
 * Validate session
 */
export function validateSession(sessionId: string): boolean {
    const session = sessions.get(sessionId);
    if (!session || !session.active) {
        return false;
    }
    
    const now = clock.nowMs();
    if (now > session.expiresAt) {
        return false;
    }
    
    return true;
}

/**
 * Refresh session
 */
export function refreshSession(sessionId: string): Session | null {
    const session = sessions.get(sessionId);
    if (!session || !session.active) {
        return null;
    }
    
    const now = clock.nowMs();
    if (now > session.expiresAt) {
        return null;
    }
    
    const refreshedSession: Session = {
        ...session,
        lastActivityAt: now,
    };
    
    sessions.set(sessionId, refreshedSession);
    
    return refreshedSession;
}

/**
 * Terminate session
 */
export async function terminateSession(sessionId: string): Promise<boolean> {
    const session = sessions.get(sessionId);
    if (!session) {
        return false;
    }
    
    const terminatedSession: Session = {
        ...session,
        active: false,
    };
    
    sessions.set(sessionId, terminatedSession);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'session_terminated',
        principalId: session.principalId,
        resource: null,
        timestamp: clock.nowMs(),
        data: { sessionId },
    });
    
    updateStatistics();
    
    return true;
}

/**
 * Cleanup expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
    const now = clock.nowMs();
    let cleanedCount = 0;
    
    for (const [sessionId, session] of sessions) {
        if (session.active && now > session.expiresAt) {
            const expiredSession: Session = {
                ...session,
                active: false,
            };
            
            sessions.set(sessionId, expiredSession);
            cleanedCount++;
            
            await emitEvent({
                eventId: generateEventId(),
                type: 'session_expired',
                principalId: session.principalId,
                resource: null,
                timestamp: now,
                data: { sessionId },
            });
        }
    }
    
    updateStatistics();
    
    return cleanedCount;
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get statistics
 */
export function getStatistics(): Readonly<AccessStatistics> {
    updateStatistics();
    return { ...statistics };
}

/**
 * Reset statistics
 */
export function resetStatistics(): void {
    Object.assign(statistics, {
        totalPermissions: 0,
        totalRoles: 0,
        totalPrincipals: 0,
        totalPolicies: 0,
        totalSessions: 0,
        activeSessions: 0,
        accessGranted: 0,
        accessDenied: 0,
    });
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Add event listener
 */
export function addEventListener(listener: AccessEventListener): void {
    eventListeners.add(listener);
}

/**
 * Remove event listener
 */
export function removeEventListener(listener: AccessEventListener): void {
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
    permissions.clear();
    roles.clear();
    principals.clear();
    policies.clear();
    sessions.clear();
    eventListeners.clear();
    resetStatistics();
}
