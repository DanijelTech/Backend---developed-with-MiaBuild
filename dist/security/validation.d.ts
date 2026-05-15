/**
 * @file Input validation modul za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-SEC-007 Input validacija za zaledne sisteme
 * @design DSN-ZALEDNI-SEC-007 Backend input validation arhitektura
 * @test TEST-ZALEDNI-SEC-007 Preverjanje input validacije
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom SEC_007 - Input Validation
 */
/**
 * Tip validacije
 */
export type ValidationType = 'string' | 'number' | 'boolean' | 'email' | 'url' | 'uuid' | 'date' | 'array' | 'object' | 'custom';
/**
 * Pravilo validacije
 */
export interface ValidationRule {
    /** Tip */
    readonly type: ValidationType;
    /** Ali je obvezno */
    readonly required: boolean;
    /** Minimalna dolzina/vrednost */
    readonly min?: number;
    /** Maksimalna dolzina/vrednost */
    readonly max?: number;
    /** Regex vzorec */
    readonly pattern?: string;
    /** Dovoljene vrednosti */
    readonly enum?: readonly unknown[];
    /** Sporocilo ob napaki */
    readonly message?: string;
    /** Custom validator */
    readonly customValidator?: (value: unknown) => boolean;
}
/**
 * Shema validacije
 */
export interface ValidationSchema {
    /** Pravila po poljih */
    readonly fields: Readonly<Record<string, ValidationRule>>;
    /** Ali dovoli dodatna polja */
    readonly allowAdditional: boolean;
    /** Ali odstrani dodatna polja */
    readonly stripAdditional: boolean;
}
/**
 * Rezultat validacije
 */
export interface ValidationResult {
    /** Ali je veljavno */
    readonly valid: boolean;
    /** Napake po poljih */
    readonly errors: Readonly<Record<string, string[]>>;
    /** Validirani podatki */
    readonly data: unknown;
}
/**
 * Validiraj objekt proti shemi
 */
export declare function validate(data: unknown, schema: ValidationSchema): ValidationResult;
/**
 * Sanitiziraj string
 */
export declare function sanitize(input: string): string;
/**
 * Sanitiziraj objekt
 */
export declare function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown>;
/**
 * Ustvari validator za shemo
 */
export declare function createValidator(schema: ValidationSchema): (data: unknown) => ValidationResult;
export declare const Validation: {
    validate: typeof validate;
    sanitize: typeof sanitize;
    sanitizeObject: typeof sanitizeObject;
    createValidator: typeof createValidator;
    PATTERNS: {
        email: RegExp;
        url: RegExp;
        uuid: RegExp;
        date: RegExp;
        alphanumeric: RegExp;
        slug: RegExp;
    };
};
