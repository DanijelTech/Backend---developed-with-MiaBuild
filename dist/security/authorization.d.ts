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
/**
 * Registriraj dovoljenje
 */
export declare function registerPermission(permission: Permission): void;
/**
 * Registriraj vlogo
 */
export declare function registerRole(role: Role): void;
/**
 * Registriraj politiko
 */
export declare function registerPolicy(policy: Policy): void;
/**
 * Dodeli vlogo uporabniku
 */
export declare function assignRole(userId: string, roleId: string): void;
/**
 * Odstrani vlogo uporabniku
 */
export declare function revokeRole(userId: string, roleId: string): void;
/**
 * Preveri ali uporabnik ima dovoljenje
 */
export declare function hasPermission(userId: string, permissionId: string): boolean;
/**
 * Preveri ali uporabnik ima vlogo
 */
export declare function hasRole(userId: string, roleId: string): boolean;
/**
 * Avtoriziraj zahtevo
 */
export declare function authorize(request: AuthorizationRequest): AuthorizationResult;
/**
 * Preveri dovoljenje (poenostavljena funkcija)
 */
export declare function checkPermission(userId: string, resource: string, action: string, context?: Record<string, unknown>): boolean;
export declare const Authorization: {
    registerPermission: typeof registerPermission;
    registerRole: typeof registerRole;
    registerPolicy: typeof registerPolicy;
    assignRole: typeof assignRole;
    revokeRole: typeof revokeRole;
    hasPermission: typeof hasPermission;
    hasRole: typeof hasRole;
    authorize: typeof authorize;
    checkPermission: typeof checkPermission;
};
