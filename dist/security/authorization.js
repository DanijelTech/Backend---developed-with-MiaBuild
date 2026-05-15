"use strict";
/**
 * @file Authorization modul za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-SEC-002 Avtorizacija za zaledne sisteme
 * @design DSN-ZALEDNI-SEC-002 Backend authorization arhitektura
 * @test TEST-ZALEDNI-SEC-002 Preverjanje avtorizacije in politik
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom SEC_002 - Authorization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Authorization = void 0;
exports.registerPermission = registerPermission;
exports.registerRole = registerRole;
exports.registerPolicy = registerPolicy;
exports.assignRole = assignRole;
exports.revokeRole = revokeRole;
exports.hasPermission = hasPermission;
exports.hasRole = hasRole;
exports.authorize = authorize;
exports.checkPermission = checkPermission;
const clock_1 = require("@mia/core/clock");
const clock = (0, clock_1.getClock)();
// ============================================================================
// STANJE
// ============================================================================
const roles = new Map();
const permissions = new Map();
const policies = new Map();
const userRoles = new Map();
// ============================================================================
// FUNKCIJE
// ============================================================================
/**
 * Registriraj dovoljenje
 */
function registerPermission(permission) {
    permissions.set(permission.id, permission);
}
/**
 * Registriraj vlogo
 */
function registerRole(role) {
    roles.set(role.id, role);
}
/**
 * Registriraj politiko
 */
function registerPolicy(policy) {
    policies.set(policy.id, policy);
}
/**
 * Dodeli vlogo uporabniku
 */
function assignRole(userId, roleId) {
    if (!userRoles.has(userId)) {
        userRoles.set(userId, new Set());
    }
    userRoles.get(userId).add(roleId);
}
/**
 * Odstrani vlogo uporabniku
 */
function revokeRole(userId, roleId) {
    const roles = userRoles.get(userId);
    if (roles) {
        roles.delete(roleId);
    }
}
/**
 * Pridobi vse vloge uporabnika (vkljucno z dedevanimi)
 */
function getAllUserRoles(userId) {
    const directRoles = userRoles.get(userId) || new Set();
    const allRoles = new Set(directRoles);
    // Dodaj dedovane vloge
    for (const roleId of directRoles) {
        const role = roles.get(roleId);
        if (role?.parentRole) {
            allRoles.add(role.parentRole);
            // Rekurzivno dodaj nadrejene vloge
            let parentId = role.parentRole;
            while (parentId) {
                allRoles.add(parentId);
                const parentRole = roles.get(parentId);
                parentId = parentRole?.parentRole || null;
            }
        }
    }
    return allRoles;
}
/**
 * Pridobi vsa dovoljenja uporabnika
 */
function getAllUserPermissions(userId) {
    const userRoleIds = getAllUserRoles(userId);
    const allPermissions = new Set();
    for (const roleId of userRoleIds) {
        const role = roles.get(roleId);
        if (role) {
            for (const permId of role.permissions) {
                allPermissions.add(permId);
            }
        }
    }
    return allPermissions;
}
/**
 * Preveri ali uporabnik ima dovoljenje
 */
function hasPermission(userId, permissionId) {
    const userPermissions = getAllUserPermissions(userId);
    return userPermissions.has(permissionId) || userPermissions.has('*');
}
/**
 * Preveri ali uporabnik ima vlogo
 */
function hasRole(userId, roleId) {
    const userRoleIds = getAllUserRoles(userId);
    return userRoleIds.has(roleId);
}
/**
 * Evalviraj pogoj politike
 */
function evaluateCondition(condition, request) {
    let targetValue;
    switch (condition.type) {
        case 'role':
            targetValue = request.roles;
            break;
        case 'permission':
            targetValue = getAllUserPermissions(request.userId);
            break;
        case 'attribute':
            targetValue = condition.attribute ? request.context[condition.attribute] : null;
            break;
        default:
            return false;
    }
    const conditionValue = condition.value;
    switch (condition.operator) {
        case 'equals':
            return targetValue === conditionValue;
        case 'contains':
            if (Array.isArray(targetValue) || targetValue instanceof Set) {
                return Array.from(targetValue).includes(conditionValue);
            }
            return String(targetValue).includes(conditionValue);
        case 'in':
            if (Array.isArray(conditionValue)) {
                return conditionValue.includes(targetValue);
            }
            return false;
        case 'notIn':
            if (Array.isArray(conditionValue)) {
                return !conditionValue.includes(targetValue);
            }
            return true;
        default:
            return false;
    }
}
/**
 * Avtoriziraj zahtevo
 */
function authorize(request) {
    const timestamp = clock.nowMs();
    // Pridobi vse politike, sortirane po prioriteti
    const sortedPolicies = Array.from(policies.values())
        .sort((a, b) => b.priority - a.priority);
    // Evalviraj politike
    for (const policy of sortedPolicies) {
        const conditionMet = evaluateCondition(policy.condition, request);
        if (conditionMet) {
            return {
                allowed: policy.effect === 'allow',
                reason: `Policy '${policy.name}' ${policy.effect === 'allow' ? 'granted' : 'denied'} access`,
                decidingPolicy: policy.id,
                timestamp,
            };
        }
    }
    // Privzeto: preveri dovoljenja
    const permissionId = `${request.resource}:${request.action}`;
    if (hasPermission(request.userId, permissionId)) {
        return {
            allowed: true,
            reason: `User has permission '${permissionId}'`,
            decidingPolicy: null,
            timestamp,
        };
    }
    // Privzeto zavrni
    return {
        allowed: false,
        reason: 'No matching policy or permission found',
        decidingPolicy: null,
        timestamp,
    };
}
/**
 * Preveri dovoljenje (poenostavljena funkcija)
 */
function checkPermission(userId, resource, action, context = {}) {
    const result = authorize({
        userId,
        roles: Array.from(getAllUserRoles(userId)),
        resource,
        action,
        context,
    });
    return result.allowed;
}
// ============================================================================
// IZVOZ
// ============================================================================
exports.Authorization = {
    registerPermission,
    registerRole,
    registerPolicy,
    assignRole,
    revokeRole,
    hasPermission,
    hasRole,
    authorize,
    checkPermission,
};
