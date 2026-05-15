"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPermission = createPermission;
exports.getPermission = getPermission;
exports.getAllPermissions = getAllPermissions;
exports.deletePermission = deletePermission;
exports.createRole = createRole;
exports.getRole = getRole;
exports.getAllRoles = getAllRoles;
exports.updateRole = updateRole;
exports.deleteRole = deleteRole;
exports.createPrincipal = createPrincipal;
exports.getPrincipal = getPrincipal;
exports.getAllPrincipals = getAllPrincipals;
exports.updatePrincipal = updatePrincipal;
exports.deletePrincipal = deletePrincipal;
exports.createPolicy = createPolicy;
exports.getPolicy = getPolicy;
exports.getAllPolicies = getAllPolicies;
exports.deletePolicy = deletePolicy;
exports.checkAccess = checkAccess;
exports.hasPermission = hasPermission;
exports.hasRole = hasRole;
exports.createSession = createSession;
exports.getSession = getSession;
exports.validateSession = validateSession;
exports.refreshSession = refreshSession;
exports.terminateSession = terminateSession;
exports.cleanupExpiredSessions = cleanupExpiredSessions;
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
const permissions = new Map();
const roles = new Map();
const principals = new Map();
const policies = new Map();
const sessions = new Map();
const eventListeners = new Set();
let permissionCounter = 0;
let roleCounter = 0;
let principalCounter = 0;
let policyCounter = 0;
let conditionCounter = 0;
let sessionCounter = 0;
let requestCounter = 0;
let decisionCounter = 0;
let eventCounter = 0;
const statistics = {
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
function generatePermissionId() {
    permissionCounter++;
    return (0, deterministic_1.generateDeterministicId)(`perm-${permissionCounter}`);
}
/**
 * Generate role ID
 */
function generateRoleId() {
    roleCounter++;
    return (0, deterministic_1.generateDeterministicId)(`role-${roleCounter}`);
}
/**
 * Generate principal ID
 */
function generatePrincipalId() {
    principalCounter++;
    return (0, deterministic_1.generateDeterministicId)(`principal-${principalCounter}`);
}
/**
 * Generate policy ID
 */
function generatePolicyId() {
    policyCounter++;
    return (0, deterministic_1.generateDeterministicId)(`policy-${policyCounter}`);
}
/**
 * Generate condition ID
 */
function generateConditionId() {
    conditionCounter++;
    return (0, deterministic_1.generateDeterministicId)(`condition-${conditionCounter}`);
}
/**
 * Generate session ID
 */
function generateSessionId() {
    sessionCounter++;
    return (0, deterministic_1.generateDeterministicId)(`session-${sessionCounter}`);
}
/**
 * Generate request ID
 */
function generateRequestId() {
    requestCounter++;
    return (0, deterministic_1.generateDeterministicId)(`access-req-${requestCounter}`);
}
/**
 * Generate decision ID
 */
function generateDecisionId() {
    decisionCounter++;
    return (0, deterministic_1.generateDeterministicId)(`access-dec-${decisionCounter}`);
}
/**
 * Generate event ID
 */
function generateEventId() {
    eventCounter++;
    return (0, deterministic_1.generateDeterministicId)(`access-event-${eventCounter}`);
}
/**
 * Emit access event
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
function getAllPermissionsForPrincipal(principalId) {
    const principal = principals.get(principalId);
    if (!principal) {
        return new Set();
    }
    const allPermissions = new Set(principal.directPermissions);
    const processedRoles = new Set();
    const rolesToProcess = [...principal.roles];
    while (rolesToProcess.length > 0) {
        const roleId = rolesToProcess.pop();
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
function evaluateCondition(condition, context) {
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
            return typeof value === 'number' && value > condition.value;
        case 'less_than':
            return typeof value === 'number' && value < condition.value;
        case 'in':
            return Array.isArray(condition.value) && condition.value.includes(value);
        case 'not_in':
            return Array.isArray(condition.value) && !condition.value.includes(value);
        case 'between':
            if (Array.isArray(condition.value) && condition.value.length === 2 && typeof value === 'number') {
                return value >= condition.value[0] && value <= condition.value[1];
            }
            return false;
        case 'matches':
            if (typeof value === 'string' && typeof condition.value === 'string') {
                try {
                    return new RegExp(condition.value).test(value);
                }
                catch {
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
async function createPermission(name, type, resource, resourceType, actions, options = {}) {
    const permissionId = generatePermissionId();
    const permission = {
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
function getPermission(nameOrId) {
    return permissions.get(nameOrId) ?? null;
}
/**
 * Get all permissions
 */
function getAllPermissions() {
    const uniquePermissions = new Map();
    for (const permission of permissions.values()) {
        uniquePermissions.set(permission.permissionId, permission);
    }
    return Array.from(uniquePermissions.values());
}
/**
 * Delete permission
 */
async function deletePermission(nameOrId) {
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
async function createRole(name, permissionIds, options = {}) {
    const roleId = generateRoleId();
    const now = clock.nowMs();
    const role = {
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
function getRole(nameOrId) {
    return roles.get(nameOrId) ?? null;
}
/**
 * Get all roles
 */
function getAllRoles() {
    const uniqueRoles = new Map();
    for (const role of roles.values()) {
        uniqueRoles.set(role.roleId, role);
    }
    return Array.from(uniqueRoles.values());
}
/**
 * Update role
 */
async function updateRole(nameOrId, updates) {
    const role = roles.get(nameOrId);
    if (!role) {
        return null;
    }
    const updatedRole = {
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
async function deleteRole(nameOrId) {
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
async function createPrincipal(userId, username, roleIds, options = {}) {
    const principalId = generatePrincipalId();
    const now = clock.nowMs();
    const principal = {
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
function getPrincipal(idOrUserId) {
    return principals.get(idOrUserId) ?? null;
}
/**
 * Get all principals
 */
function getAllPrincipals() {
    const uniquePrincipals = new Map();
    for (const principal of principals.values()) {
        uniquePrincipals.set(principal.principalId, principal);
    }
    return Array.from(uniquePrincipals.values());
}
/**
 * Update principal
 */
async function updatePrincipal(idOrUserId, updates) {
    const principal = principals.get(idOrUserId);
    if (!principal) {
        return null;
    }
    const updatedPrincipal = {
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
async function deletePrincipal(idOrUserId) {
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
async function createPolicy(name, effect, principals, resources, actions, options = {}) {
    const policyId = generatePolicyId();
    const conditions = (options.conditions ?? []).map(c => ({
        ...c,
        conditionId: generateConditionId(),
    }));
    const policy = {
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
function getPolicy(nameOrId) {
    return policies.get(nameOrId) ?? null;
}
/**
 * Get all policies
 */
function getAllPolicies() {
    const uniquePolicies = new Map();
    for (const policy of policies.values()) {
        uniquePolicies.set(policy.policyId, policy);
    }
    return Array.from(uniquePolicies.values());
}
/**
 * Delete policy
 */
async function deletePolicy(nameOrId) {
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
async function checkAccess(principalId, resource, action, context = {}) {
    const requestId = generateRequestId();
    const decisionId = generateDecisionId();
    const now = clock.nowMs();
    const fullContext = {
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
        sessionId: context.sessionId ?? null,
        tenantId: context.tenantId ?? null,
        attributes: context.attributes ?? {},
    };
    const principal = principals.get(principalId);
    if (!principal || !principal.active) {
        const decision = {
            decisionId,
            requestId,
            effect: 'deny',
            matchedPolicies: [],
            reason: 'Principal not found or inactive',
            timestamp: now,
        };
        const mutableStats = statistics;
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
            const decision = {
                decisionId,
                requestId,
                effect: 'allow',
                matchedPolicies: [],
                reason: `Permission '${permission.name}' grants access`,
                timestamp: now,
            };
            const mutableStats = statistics;
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
    const matchingPolicies = [];
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
            const decision = {
                decisionId,
                requestId,
                effect: 'deny',
                matchedPolicies: [policy.policyId],
                reason: `Policy '${policy.name}' denies access`,
                timestamp: now,
            };
            const mutableStats = statistics;
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
            const decision = {
                decisionId,
                requestId,
                effect: 'allow',
                matchedPolicies: [policy.policyId],
                reason: `Policy '${policy.name}' allows access`,
                timestamp: now,
            };
            const mutableStats = statistics;
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
    const decision = {
        decisionId,
        requestId,
        effect: 'deny',
        matchedPolicies: [],
        reason: 'No matching policy found (default deny)',
        timestamp: now,
    };
    const mutableStats = statistics;
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
function hasPermission(principalId, permissionNameOrId) {
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
function hasRole(principalId, roleNameOrId) {
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
async function createSession(principalId, expiresInMinutes = 60, options = {}) {
    const sessionId = generateSessionId();
    const now = clock.nowMs();
    const session = {
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
function getSession(sessionId) {
    return sessions.get(sessionId) ?? null;
}
/**
 * Validate session
 */
function validateSession(sessionId) {
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
function refreshSession(sessionId) {
    const session = sessions.get(sessionId);
    if (!session || !session.active) {
        return null;
    }
    const now = clock.nowMs();
    if (now > session.expiresAt) {
        return null;
    }
    const refreshedSession = {
        ...session,
        lastActivityAt: now,
    };
    sessions.set(sessionId, refreshedSession);
    return refreshedSession;
}
/**
 * Terminate session
 */
async function terminateSession(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) {
        return false;
    }
    const terminatedSession = {
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
async function cleanupExpiredSessions() {
    const now = clock.nowMs();
    let cleanedCount = 0;
    for (const [sessionId, session] of sessions) {
        if (session.active && now > session.expiresAt) {
            const expiredSession = {
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
function getStatistics() {
    updateStatistics();
    return { ...statistics };
}
/**
 * Reset statistics
 */
function resetStatistics() {
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
    permissions.clear();
    roles.clear();
    principals.clear();
    policies.clear();
    sessions.clear();
    eventListeners.clear();
    resetStatistics();
}
