"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Encryption = void 0;
exports.configureEncryption = configureEncryption;
exports.generateKey = generateKey;
exports.registerKey = registerKey;
exports.getKey = getKey;
exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.encryptWithKeyId = encryptWithKeyId;
exports.decryptWithKeyId = decryptWithKeyId;
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
const crypto = __importStar(require("crypto"));
const clock_1 = require("@mia/core/clock");
const deterministic_1 = require("@mia/core/deterministic");
const clock = (0, clock_1.getClock)();
// ============================================================================
// KONSTANTE
// ============================================================================
const DEFAULT_CONFIG = {
    algorithm: 'aes-256-gcm',
    keyLength: 32, // 256 bitov
    ivLength: 16,
    authTagLength: 16,
};
// ============================================================================
// STANJE
// ============================================================================
let config = DEFAULT_CONFIG;
const keyStore = new Map();
// ============================================================================
// FUNKCIJE
// ============================================================================
/**
 * Nastavi konfiguracijo sifriranja
 */
function configureEncryption(newConfig) {
    config = { ...config, ...newConfig };
}
/**
 * Generiraj deterministicni IV na podlagi konteksta
 * Uporablja SHA-256 hash namesto nakljucnih bajtov za reproducibilnost
 */
let ivCounter = 0;
function generateIv() {
    ivCounter++;
    const seed = `iv-${ivCounter}-${clock.nowMs()}`;
    const hash = (0, deterministic_1.computeSHA256)(seed);
    return Buffer.from(hash.slice(0, config.ivLength * 2), 'hex');
}
/**
 * Generiraj deterministicni kljuc na podlagi konteksta
 * Uporablja SHA-256 hash namesto nakljucnih bajtov za reproducibilnost
 */
let keyCounter = 0;
function generateKey() {
    keyCounter++;
    const seed = `key-${keyCounter}-${clock.nowMs()}`;
    const hash = (0, deterministic_1.computeSHA256)(seed);
    return Buffer.from(hash.slice(0, config.keyLength * 2), 'hex');
}
/**
 * Registriraj kljuc
 */
function registerKey(keyId, key, expiresAt = null) {
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
function getKey(keyId) {
    const encKey = keyStore.get(keyId);
    if (!encKey)
        return null;
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
function encryptGcm(plaintext, key) {
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
function decryptGcm(encrypted, key) {
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
function encryptCbc(plaintext, key) {
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
function decryptCbc(encrypted, key) {
    const iv = Buffer.from(encrypted.iv, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let plaintext = decipher.update(encrypted.ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');
    return plaintext;
}
/**
 * Sifriraj podatke
 */
function encrypt(plaintext, key) {
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
function decrypt(encrypted, key) {
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
function encryptWithKeyId(plaintext, keyId) {
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
function decryptWithKeyId(encrypted) {
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
function hashPassword(password, salt) {
    let actualSalt = salt;
    if (!actualSalt) {
        saltCounter++;
        const seed = `salt-${saltCounter}-${clock.nowMs()}`;
        actualSalt = (0, deterministic_1.computeSHA256)(seed).slice(0, 32);
    }
    const hash = crypto.pbkdf2Sync(password, actualSalt, 100000, 64, 'sha512').toString('hex');
    return { hash, salt: actualSalt };
}
/**
 * Preveri geslo
 */
function verifyPassword(password, hash, salt) {
    const result = hashPassword(password, salt);
    return result.hash === hash;
}
// ============================================================================
// IZVOZ
// ============================================================================
exports.Encryption = {
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
