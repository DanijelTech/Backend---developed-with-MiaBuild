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

import { getClock, Clock } from '@mia/core/clock';
const clock: Clock = getClock();

// ============================================================================
// TIPI
// ============================================================================

/**
 * Dovoljenje
 */
export interface Permission {
    /** ID dovoljenja */
    readonly id: string;
    /** Ime dovoljenja */
    readonly name: string;
    /** Opis */
    readonly description: string;
    /** Vir (resource) */
    readonly resource: string;
    /** Akcija */
    readonly action: 'create' | 'read' | 'update' | 'delete' | 'execute' | '*';
}

/**
 * Vloga
 */
export interface Role {
    /** ID vloge */
    readonly id: string;
    /** Ime vloge */
    readonly name: string;
    /** Opis */
    readonly description: string;
    /** Dovoljenja */
    readonly permissions: readonly string[];
    /** Nadrejena vloga (dedovanje) */
    readonly parentRole: string | null;
    /** Ali je sistemska vloga */
    readonly isSystem: boolean;
}

/**
 * Politika
 */
export interface Policy {
    /** ID politike */
    readonly id: string;
    /** Ime politike */
    readonly name: string;
    /** Opis */
    readonly description: string;
    /** Pogoj (condition) */
    readonly condition: PolicyCondition;
    /** Efekt */
    readonly effect: 'allow' | 'deny';
    /** Prioriteta (visja = pomembnejsa) */
    readonly priority: number;
}

/**
 * Pogoj politike
 */
export interface PolicyCondition {
    /** Tip pogoja */
    readonly type: 'role' | 'permission' | 'attribute' | 'time' | 'ip' | 'custom';
    /** Operator */
    readonly operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'matches' | 'in' | 'notIn';
    /** Vrednost */
    readonly value: string | readonly string[];
    /** Atribut (za attribute tip) */
    readonly attribute?: string;
}

/**
 * Zahteva za avtorizacijo
 */
export interface AuthorizationRequest {
    /** ID uporabnika */
    readonly userId: string;
    /** Vloge uporabnika */
    readonly roles: readonly string[];
    /** Vir */
    readonly resource: string;
    /** Akcija */
    readonly action: string;
    /** Kontekst */
    readonly context: Readonly<Record<string, unknown>>;
}

/**
 * Rezultat avtorizacije
 */
export interface AuthorizationResult {
    /** Ali je dovoljeno */
    readonly allowed: boolean;
    /** Razlog */
    readonly reason: string;
    /** Politika, ki je odlocila */
    readonly decidingPolicy: string | null;
    /** Casovni zig */
    readonly timestamp: number;
}

// ============================================================================
// STANJE
// ============================================================================

const roles: Map<string, Role> = new Map();
const permissions: Map<string, Permission> = new Map();
const policies: Map<string, Policy> = new Map();
const userRoles: Map<string, Set<string>> = new Map();

// ============================================================================
// FUNKCIJE
// ============================================================================

/**
 * Registriraj dovoljenje
 */
export function registerPermission(permission: Permission): void {
    permissions.set(permission.id, permission);
}

/**
 * Registriraj vlogo
 */
export function registerRole(role: Role): void {
    roles.set(role.id, role);
}

/**
 * Registriraj politiko
 */
export function registerPolicy(policy: Policy): void {
    policies.set(policy.id, policy);
}

/**
 * Dodeli vlogo uporabniku
 */
export function assignRole(userId: string, roleId: string): void {
    if (!userRoles.has(userId)) {
        userRoles.set(userId, new Set());
    }
    userRoles.get(userId)!.add(roleId);
}

/**
 * Odstrani vlogo uporabniku
 */
export function revokeRole(userId: string, roleId: string): void {
    const roles = userRoles.get(userId);
    if (roles) {
        roles.delete(roleId);
    }
}

/**
 * Pridobi vse vloge uporabnika (vkljucno z dedevanimi)
 */
function getAllUserRoles(userId: string): Set<string> {
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
function getAllUserPermissions(userId: string): Set<string> {
    const userRoleIds = getAllUserRoles(userId);
    const allPermissions = new Set<string>();
    
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
export function hasPermission(userId: string, permissionId: string): boolean {
    const userPermissions = getAllUserPermissions(userId);
    return userPermissions.has(permissionId) || userPermissions.has('*');
}

/**
 * Preveri ali uporabnik ima vlogo
 */
export function hasRole(userId: string, roleId: string): boolean {
    const userRoleIds = getAllUserRoles(userId);
    return userRoleIds.has(roleId);
}

/**
 * Evalviraj pogoj politike
 */
function evaluateCondition(
    condition: PolicyCondition,
    request: AuthorizationRequest
): boolean {
    let targetValue: unknown;
    
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
                return Array.from(targetValue).includes(conditionValue as string);
            }
            return String(targetValue).includes(conditionValue as string);
        case 'in':
            if (Array.isArray(conditionValue)) {
                return conditionValue.includes(targetValue as string);
            }
            return false;
        case 'notIn':
            if (Array.isArray(conditionValue)) {
                return !conditionValue.includes(targetValue as string);
            }
            return true;
        default:
            return false;
    }
}

/**
 * Avtoriziraj zahtevo
 */
export function authorize(request: AuthorizationRequest): AuthorizationResult {
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
export function checkPermission(
    userId: string,
    resource: string,
    action: string,
    context: Record<string, unknown> = {}
): boolean {
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

export const Authorization = {
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
