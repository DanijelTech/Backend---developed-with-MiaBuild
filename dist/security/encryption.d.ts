/**
 * @file Encryption modul za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-SEC-003 Šifriranje podatkov za zaledne sisteme
 * @design DSN-ZALEDNI-SEC-003 Backend encryption arhitektura
 * @test TEST-ZALEDNI-SEC-003 Preverjanje šifriranja in dešifriranja
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom SEC_003 - Encryption at Rest
 */
/**
 * Konfiguracija sifriranja
 */
export interface EncryptionConfig {
    /** Algoritem */
    readonly algorithm: 'aes-256-gcm' | 'aes-256-cbc';
    /** Dolzina kljuca v bajtih */
    readonly keyLength: number;
    /** Dolzina IV v bajtih */
    readonly ivLength: number;
    /** Dolzina auth tag-a v bajtih (za GCM) */
    readonly authTagLength: number;
}
/**
 * Sifrirani podatki
 */
export interface EncryptedData {
    /** Sifrirani podatki (base64) */
    readonly ciphertext: string;
    /** Initialization vector (base64) */
    readonly iv: string;
    /** Authentication tag (base64, za GCM) */
    readonly authTag: string | null;
    /** Algoritem */
    readonly algorithm: string;
}
/**
 * Kljuc za sifriranje
 */
export interface EncryptionKey {
    /** ID kljuca */
    readonly keyId: string;
    /** Kljuc (buffer) */
    readonly key: Buffer;
    /** Cas ustvarjanja */
    readonly createdAt: number;
    /** Cas poteka */
    readonly expiresAt: number | null;
}
/**
 * Nastavi konfiguracijo sifriranja
 */
export declare function configureEncryption(newConfig: Partial<EncryptionConfig>): void;
export declare function generateKey(): Buffer;
/**
 * Registriraj kljuc
 */
export declare function registerKey(keyId: string, key: Buffer, expiresAt?: number | null): void;
/**
 * Pridobi kljuc
 */
export declare function getKey(keyId: string): Buffer | null;
/**
 * Sifriraj podatke
 */
export declare function encrypt(plaintext: string, key: Buffer): EncryptedData;
/**
 * Desifriraj podatke
 */
export declare function decrypt(encrypted: EncryptedData, key: Buffer): string;
/**
 * Sifriraj z registriranim kljucem
 */
export declare function encryptWithKeyId(plaintext: string, keyId: string): EncryptedData & {
    keyId: string;
};
/**
 * Desifriraj z registriranim kljucem
 */
export declare function decryptWithKeyId(encrypted: EncryptedData & {
    keyId: string;
}): string;
export declare function hashPassword(password: string, salt?: string): {
    hash: string;
    salt: string;
};
/**
 * Preveri geslo
 */
export declare function verifyPassword(password: string, hash: string, salt: string): boolean;
export declare const Encryption: {
    configure: typeof configureEncryption;
    generateKey: typeof generateKey;
    registerKey: typeof registerKey;
    getKey: typeof getKey;
    encrypt: typeof encrypt;
    decrypt: typeof decrypt;
    encryptWithKeyId: typeof encryptWithKeyId;
    decryptWithKeyId: typeof decryptWithKeyId;
    hashPassword: typeof hashPassword;
    verifyPassword: typeof verifyPassword;
};
