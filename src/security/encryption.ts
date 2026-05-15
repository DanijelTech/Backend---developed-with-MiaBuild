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

import * as crypto from 'crypto';
import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId, computeSHA256 } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI
// ============================================================================

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

// ============================================================================
// KONSTANTE
// ============================================================================

const DEFAULT_CONFIG: EncryptionConfig = {
    algorithm: 'aes-256-gcm',
    keyLength: 32, // 256 bitov
    ivLength: 16,
    authTagLength: 16,
};

// ============================================================================
// STANJE
// ============================================================================

let config: EncryptionConfig = DEFAULT_CONFIG;
const keyStore: Map<string, EncryptionKey> = new Map();

// ============================================================================
// FUNKCIJE
// ============================================================================

/**
 * Nastavi konfiguracijo sifriranja
 */
export function configureEncryption(newConfig: Partial<EncryptionConfig>): void {
    config = { ...config, ...newConfig };
}

/**
 * Generiraj deterministicni IV na podlagi konteksta
 * Uporablja SHA-256 hash namesto nakljucnih bajtov za reproducibilnost
 */
let ivCounter = 0;
function generateIv(): Buffer {
    ivCounter++;
    const seed = `iv-${ivCounter}-${clock.nowMs()}`;
    const hash = computeSHA256(seed);
    return Buffer.from(hash.slice(0, config.ivLength * 2), 'hex');
}

/**
 * Generiraj deterministicni kljuc na podlagi konteksta
 * Uporablja SHA-256 hash namesto nakljucnih bajtov za reproducibilnost
 */
let keyCounter = 0;
export function generateKey(): Buffer {
    keyCounter++;
    const seed = `key-${keyCounter}-${clock.nowMs()}`;
    const hash = computeSHA256(seed);
    return Buffer.from(hash.slice(0, config.keyLength * 2), 'hex');
}

/**
 * Registriraj kljuc
 */
export function registerKey(keyId: string, key: Buffer, expiresAt: number | null = null): void {
    keyStore.set(keyId, {
        keyId,
        key,
        createdAt: clock.nowMs(),
        expiresAt,
    });
}

/**
 * Pridobi kljuc
 */
export function getKey(keyId: string): Buffer | null {
    const encKey = keyStore.get(keyId);
    if (!encKey) return null;
    
    // Preveri potek
    if (encKey.expiresAt && clock.nowMs() > encKey.expiresAt) {
        keyStore.delete(keyId);
        return null;
    }
    
    return encKey.key;
}

/**
 * Sifriraj podatke z AES-256-GCM
 */
function encryptGcm(plaintext: string, key: Buffer): EncryptedData {
    const iv = generateIv();
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    return {
        ciphertext,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        algorithm: 'aes-256-gcm',
    };
}

/**
 * Desifriraj podatke z AES-256-GCM
 */
function decryptGcm(encrypted: EncryptedData, key: Buffer): string {
    const iv = Buffer.from(encrypted.iv, 'base64');
    const authTag = encrypted.authTag ? Buffer.from(encrypted.authTag, 'base64') : null;
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    
    if (authTag) {
        decipher.setAuthTag(authTag);
    }
    
    let plaintext = decipher.update(encrypted.ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');
    
    return plaintext;
}

/**
 * Sifriraj podatke z AES-256-CBC
 */
function encryptCbc(plaintext: string, key: Buffer): EncryptedData {
    const iv = generateIv();
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    
    return {
        ciphertext,
        iv: iv.toString('base64'),
        authTag: null,
        algorithm: 'aes-256-cbc',
    };
}

/**
 * Desifriraj podatke z AES-256-CBC
 */
function decryptCbc(encrypted: EncryptedData, key: Buffer): string {
    const iv = Buffer.from(encrypted.iv, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let plaintext = decipher.update(encrypted.ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');
    
    return plaintext;
}

/**
 * Sifriraj podatke
 */
export function encrypt(plaintext: string, key: Buffer): EncryptedData {
    switch (config.algorithm) {
        case 'aes-256-gcm':
            return encryptGcm(plaintext, key);
        case 'aes-256-cbc':
            return encryptCbc(plaintext, key);
        default:
            throw new Error(`Unsupported algorithm: ${config.algorithm}`);
    }
}

/**
 * Desifriraj podatke
 */
export function decrypt(encrypted: EncryptedData, key: Buffer): string {
    switch (encrypted.algorithm) {
        case 'aes-256-gcm':
            return decryptGcm(encrypted, key);
        case 'aes-256-cbc':
            return decryptCbc(encrypted, key);
        default:
            throw new Error(`Unsupported algorithm: ${encrypted.algorithm}`);
    }
}

/**
 * Sifriraj z registriranim kljucem
 */
export function encryptWithKeyId(plaintext: string, keyId: string): EncryptedData & { keyId: string } {
    const key = getKey(keyId);
    if (!key) {
        throw new Error(`Key not found: ${keyId}`);
    }
    
    const encrypted = encrypt(plaintext, key);
    return { ...encrypted, keyId };
}

/**
 * Desifriraj z registriranim kljucem
 */
export function decryptWithKeyId(encrypted: EncryptedData & { keyId: string }): string {
    const key = getKey(encrypted.keyId);
    if (!key) {
        throw new Error(`Key not found: ${encrypted.keyId}`);
    }
    
    return decrypt(encrypted, key);
}

/**
 * Hash gesla
 * Uporablja deterministicno generiranje soli namesto nakljucnih bajtov
 */
let saltCounter = 0;
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    let actualSalt = salt;
    if (!actualSalt) {
        saltCounter++;
        const seed = `salt-${saltCounter}-${clock.nowMs()}`;
        actualSalt = computeSHA256(seed).slice(0, 32);
    }
    const hash = crypto.pbkdf2Sync(password, actualSalt, 100000, 64, 'sha512').toString('hex');
    return { hash, salt: actualSalt };
}

/**
 * Preveri geslo
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
    const result = hashPassword(password, salt);
    return result.hash === hash;
}

// ============================================================================
// IZVOZ
// ============================================================================

export const Encryption = {
    configure: configureEncryption,
    generateKey,
    registerKey,
    getKey,
    encrypt,
    decrypt,
    encryptWithKeyId,
    decryptWithKeyId,
    hashPassword,
    verifyPassword,
};
