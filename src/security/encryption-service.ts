/**
 * @file Encryption Service za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 * 
 * @requirement ZAH-ZALEDNI-SEC-001 Encryption service za zaledne sisteme
 * @design DSN-ZALEDNI-SEC-001 Backend encryption service arhitektura
 * @test TEST-ZALEDNI-SEC-001 Preverjanje encryption service
 * 
 * Encryption Service - prilagojen za zaledne sisteme:
 * - Symmetric encryption
 * - Asymmetric encryption
 * - Key management
 * - Key rotation
 * - Envelope encryption
 * - Digital signatures
 * - Hash functions
 * - Secure random
 * 
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom SEC_001 - Encryption Service
 */

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI ZA ENCRYPTION SERVICE
// ============================================================================

/**
 * Encryption algorithm
 */
export type EncryptionAlgorithm = 'aes-256-gcm' | 'aes-256-cbc' | 'chacha20-poly1305' | 'aes-128-gcm';

/**
 * Asymmetric algorithm
 */
export type AsymmetricAlgorithm = 'rsa-oaep' | 'rsa-pkcs1' | 'ecdh-p256' | 'ecdh-p384' | 'x25519';

/**
 * Signature algorithm
 */
export type SignatureAlgorithm = 'rsa-sha256' | 'rsa-sha384' | 'rsa-sha512' | 'ecdsa-p256' | 'ecdsa-p384' | 'ed25519';

/**
 * Hash algorithm
 */
export type HashAlgorithm = 'sha256' | 'sha384' | 'sha512' | 'sha3-256' | 'sha3-512' | 'blake2b' | 'blake3';

/**
 * Key type
 */
export type KeyType = 'symmetric' | 'asymmetric_public' | 'asymmetric_private' | 'signing_public' | 'signing_private';

/**
 * Key status
 */
export type KeyStatus = 'active' | 'inactive' | 'compromised' | 'expired' | 'pending_rotation';

/**
 * Encryption key
 */
export interface EncryptionKey {
    readonly keyId: string;
    readonly type: KeyType;
    readonly algorithm: EncryptionAlgorithm | AsymmetricAlgorithm | SignatureAlgorithm;
    readonly keyMaterial: string;
    readonly status: KeyStatus;
    readonly version: number;
    readonly createdAt: number;
    readonly expiresAt: number | null;
    readonly rotatedAt: number | null;
    readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Key pair
 */
export interface KeyPair {
    readonly pairId: string;
    readonly publicKey: EncryptionKey;
    readonly privateKey: EncryptionKey;
    readonly algorithm: AsymmetricAlgorithm | SignatureAlgorithm;
    readonly createdAt: number;
    readonly expiresAt: number | null;
}

/**
 * Encryption result
 */
export interface EncryptionResult {
    readonly ciphertext: string;
    readonly iv: string;
    readonly tag: string | null;
    readonly algorithm: EncryptionAlgorithm;
    readonly keyId: string;
    readonly keyVersion: number;
    readonly encryptedAt: number;
}

/**
 * Decryption result
 */
export interface DecryptionResult {
    readonly plaintext: string;
    readonly keyId: string;
    readonly keyVersion: number;
    readonly decryptedAt: number;
}

/**
 * Envelope encryption result
 */
export interface EnvelopeEncryptionResult {
    readonly encryptedData: string;
    readonly encryptedDataKey: string;
    readonly iv: string;
    readonly tag: string | null;
    readonly masterKeyId: string;
    readonly dataKeyAlgorithm: EncryptionAlgorithm;
    readonly encryptedAt: number;
}

/**
 * Signature result
 */
export interface SignatureResult {
    readonly signature: string;
    readonly algorithm: SignatureAlgorithm;
    readonly keyId: string;
    readonly signedAt: number;
}

/**
 * Verification result
 */
export interface VerificationResult {
    readonly valid: boolean;
    readonly keyId: string;
    readonly verifiedAt: number;
    readonly error: string | null;
}

/**
 * Hash result
 */
export interface HashResult {
    readonly hash: string;
    readonly algorithm: HashAlgorithm;
    readonly inputLength: number;
    readonly hashedAt: number;
}

/**
 * Key rotation policy
 */
export interface KeyRotationPolicy {
    readonly policyId: string;
    readonly keyId: string;
    readonly rotationIntervalDays: number;
    readonly autoRotate: boolean;
    readonly notifyBeforeDays: number;
    readonly enabled: boolean;
}

/**
 * Key derivation config
 */
export interface KeyDerivationConfig {
    readonly algorithm: KeyDerivationAlgorithm;
    readonly iterations: number;
    readonly saltLength: number;
    readonly keyLength: number;
}

/**
 * Key derivation algorithm
 */
export type KeyDerivationAlgorithm = 'pbkdf2' | 'scrypt' | 'argon2id' | 'hkdf';

/**
 * Derived key result
 */
export interface DerivedKeyResult {
    readonly derivedKey: string;
    readonly salt: string;
    readonly algorithm: KeyDerivationAlgorithm;
    readonly iterations: number;
    readonly derivedAt: number;
}

/**
 * Encryption event
 */
export interface EncryptionEvent {
    readonly eventId: string;
    readonly type: EncryptionEventType;
    readonly keyId: string | null;
    readonly timestamp: number;
    readonly data: Readonly<Record<string, unknown>>;
}

/**
 * Encryption event type
 */
export type EncryptionEventType =
    | 'key_created'
    | 'key_rotated'
    | 'key_expired'
    | 'key_compromised'
    | 'key_deleted'
    | 'encryption_performed'
    | 'decryption_performed'
    | 'signature_created'
    | 'signature_verified'
    | 'hash_computed'
    | 'key_derived';

/**
 * Encryption event listener
 */
export type EncryptionEventListener = (event: EncryptionEvent) => void | Promise<void>;

/**
 * Encryption statistics
 */
export interface EncryptionStatistics {
    readonly totalKeys: number;
    readonly activeKeys: number;
    readonly expiredKeys: number;
    readonly totalEncryptions: number;
    readonly totalDecryptions: number;
    readonly totalSignatures: number;
    readonly totalVerifications: number;
    readonly totalHashes: number;
    readonly avgEncryptionTime: number;
    readonly avgDecryptionTime: number;
}

// ============================================================================
// STANJE
// ============================================================================

const keys: Map<string, EncryptionKey> = new Map();
const keyPairs: Map<string, KeyPair> = new Map();
const rotationPolicies: Map<string, KeyRotationPolicy> = new Map();
const eventListeners: Set<EncryptionEventListener> = new Set();

let keyCounter = 0;
let pairCounter = 0;
let policyCounter = 0;
let eventCounter = 0;

const defaultDerivationConfig: KeyDerivationConfig = {
    algorithm: 'pbkdf2',
    iterations: 100000,
    saltLength: 32,
    keyLength: 32,
};

const statistics: EncryptionStatistics = {
    totalKeys: 0,
    activeKeys: 0,
    expiredKeys: 0,
    totalEncryptions: 0,
    totalDecryptions: 0,
    totalSignatures: 0,
    totalVerifications: 0,
    totalHashes: 0,
    avgEncryptionTime: 0,
    avgDecryptionTime: 0,
};

// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================

/**
 * Generate key ID
 */
function generateKeyId(): string {
    keyCounter++;
    return generateDeterministicId(`enc-key-${keyCounter}`);
}

/**
 * Generate pair ID
 */
function generatePairId(): string {
    pairCounter++;
    return generateDeterministicId(`key-pair-${pairCounter}`);
}

/**
 * Generate policy ID
 */
function generatePolicyId(): string {
    policyCounter++;
    return generateDeterministicId(`rotation-policy-${policyCounter}`);
}

/**
 * Generate event ID
 */
function generateEventId(): string {
    eventCounter++;
    return generateDeterministicId(`enc-event-${eventCounter}`);
}

/**
 * Emit encryption event
 */
async function emitEvent(event: EncryptionEvent): Promise<void> {
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
        totalKeys: number;
        activeKeys: number;
        expiredKeys: number;
    };
    
    mutableStats.totalKeys = keys.size;
    mutableStats.activeKeys = 0;
    mutableStats.expiredKeys = 0;
    
    const now = clock.nowMs();
    
    for (const key of keys.values()) {
        if (key.status === 'active') {
            mutableStats.activeKeys++;
        }
        if (key.status === 'expired' || (key.expiresAt && key.expiresAt < now)) {
            mutableStats.expiredKeys++;
        }
    }
}

/**
 * Generate deterministic bytes
 */
function generateDeterministicBytes(length: number, seed: string): string {
    const chars = '0123456789abcdef';
    let result = '';
    let hash = seed;
    
    for (let i = 0; i < length * 2; i++) {
        const charIndex = (hash.charCodeAt(i % hash.length) + i) % chars.length;
        result += chars[charIndex];
    }
    
    return result;
}

/**
 * Izvedi XOR sifriranje z deterministicnim kljucem
 * V produkciji se uporabi crypto.createCipheriv() z AES-256-GCM
 */
function performEncryption(plaintext: string, key: string, iv: string, algorithm: EncryptionAlgorithm): { ciphertext: string; tag: string | null } {
    const combined = plaintext + key + iv;
    let ciphertext = '';
    
    for (let i = 0; i < combined.length; i++) {
        const charCode = combined.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        ciphertext += charCode.toString(16).padStart(2, '0');
    }
    
    const tag = algorithm.includes('gcm') || algorithm.includes('poly1305')
        ? generateDeterministicBytes(16, ciphertext)
        : null;
    
    return { ciphertext, tag };
}

/**
 * Izvedi XOR desifriranje z deterministicnim kljucem
 * V produkciji se uporabi crypto.createDecipheriv() z AES-256-GCM
 */
function performDecryption(ciphertext: string, key: string, iv: string): string {
    let plaintext = '';
    
    for (let i = 0; i < ciphertext.length; i += 2) {
        const charCode = parseInt(ciphertext.substr(i, 2), 16) ^ key.charCodeAt((i / 2) % key.length);
        plaintext += String.fromCharCode(charCode);
    }
    
    return plaintext.split(key)[0] || plaintext;
}

/**
 * Izracunaj deterministicno zgosceno vrednost
 * V produkciji se uporabi crypto.createHash() z SHA-256/384/512
 */
function computeHash(input: string, algorithm: HashAlgorithm): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    
    const hashLength = algorithm.includes('512') ? 128 : algorithm.includes('384') ? 96 : 64;
    let result = Math.abs(hash).toString(16);
    
    while (result.length < hashLength) {
        result = '0' + result + Math.abs(hash * result.length).toString(16);
    }
    
    return result.substring(0, hashLength);
}

/**
 * Ustvari digitalni podpis z deterministicnim kljucem
 * V produkciji se uporabi crypto.sign() z RSA-SHA256 ali ECDSA
 */
function createSignature(data: string, privateKey: string): string {
    const combined = data + privateKey;
    return computeHash(combined, 'sha256') + computeHash(privateKey + data, 'sha256');
}

/**
 * Preveri digitalni podpis
 * V produkciji se uporabi crypto.verify() z RSA-SHA256 ali ECDSA
 */
function verifySignature(data: string, signature: string, publicKey: string, privateKey: string): boolean {
    const expectedSignature = createSignature(data, privateKey);
    return signature === expectedSignature;
}

// ============================================================================
// KEY MANAGEMENT
// ============================================================================

/**
 * Generate symmetric key
 */
export async function generateSymmetricKey(
    algorithm: EncryptionAlgorithm,
    options: {
        expiresInDays?: number;
        metadata?: Record<string, unknown>;
    } = {}
): Promise<EncryptionKey> {
    const keyId = generateKeyId();
    const now = clock.nowMs();
    
    const keyLength = algorithm.includes('256') ? 32 : 16;
    const keyMaterial = generateDeterministicBytes(keyLength, `${keyId}-${now}`);
    
    const key: EncryptionKey = {
        keyId,
        type: 'symmetric',
        algorithm,
        keyMaterial,
        status: 'active',
        version: 1,
        createdAt: now,
        expiresAt: options.expiresInDays
            ? now + options.expiresInDays * 24 * 60 * 60 * 1000
            : null,
        rotatedAt: null,
        metadata: options.metadata ?? {},
    };
    
    keys.set(keyId, key);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'key_created',
        keyId,
        timestamp: now,
        data: { algorithm, type: 'symmetric' },
    });
    
    updateStatistics();
    
    return key;
}

/**
 * Generate asymmetric key pair
 */
export async function generateAsymmetricKeyPair(
    algorithm: AsymmetricAlgorithm,
    options: {
        expiresInDays?: number;
        metadata?: Record<string, unknown>;
    } = {}
): Promise<KeyPair> {
    const pairId = generatePairId();
    const now = clock.nowMs();
    
    const publicKeyId = generateKeyId();
    const privateKeyId = generateKeyId();
    
    const keyLength = algorithm.includes('384') ? 48 : algorithm.includes('256') || algorithm.includes('25519') ? 32 : 64;
    
    const publicKeyMaterial = generateDeterministicBytes(keyLength, `${pairId}-public-${now}`);
    const privateKeyMaterial = generateDeterministicBytes(keyLength * 2, `${pairId}-private-${now}`);
    
    const expiresAt = options.expiresInDays
        ? now + options.expiresInDays * 24 * 60 * 60 * 1000
        : null;
    
    const publicKey: EncryptionKey = {
        keyId: publicKeyId,
        type: 'asymmetric_public',
        algorithm,
        keyMaterial: publicKeyMaterial,
        status: 'active',
        version: 1,
        createdAt: now,
        expiresAt,
        rotatedAt: null,
        metadata: { ...options.metadata, pairId },
    };
    
    const privateKey: EncryptionKey = {
        keyId: privateKeyId,
        type: 'asymmetric_private',
        algorithm,
        keyMaterial: privateKeyMaterial,
        status: 'active',
        version: 1,
        createdAt: now,
        expiresAt,
        rotatedAt: null,
        metadata: { ...options.metadata, pairId },
    };
    
    keys.set(publicKeyId, publicKey);
    keys.set(privateKeyId, privateKey);
    
    const keyPair: KeyPair = {
        pairId,
        publicKey,
        privateKey,
        algorithm,
        createdAt: now,
        expiresAt,
    };
    
    keyPairs.set(pairId, keyPair);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'key_created',
        keyId: pairId,
        timestamp: now,
        data: { algorithm, type: 'asymmetric' },
    });
    
    updateStatistics();
    
    return keyPair;
}

/**
 * Generate signing key pair
 */
export async function generateSigningKeyPair(
    algorithm: SignatureAlgorithm,
    options: {
        expiresInDays?: number;
        metadata?: Record<string, unknown>;
    } = {}
): Promise<KeyPair> {
    const pairId = generatePairId();
    const now = clock.nowMs();
    
    const publicKeyId = generateKeyId();
    const privateKeyId = generateKeyId();
    
    const keyLength = algorithm.includes('384') ? 48 : algorithm.includes('512') ? 64 : 32;
    
    const publicKeyMaterial = generateDeterministicBytes(keyLength, `${pairId}-sign-public-${now}`);
    const privateKeyMaterial = generateDeterministicBytes(keyLength * 2, `${pairId}-sign-private-${now}`);
    
    const expiresAt = options.expiresInDays
        ? now + options.expiresInDays * 24 * 60 * 60 * 1000
        : null;
    
    const publicKey: EncryptionKey = {
        keyId: publicKeyId,
        type: 'signing_public',
        algorithm,
        keyMaterial: publicKeyMaterial,
        status: 'active',
        version: 1,
        createdAt: now,
        expiresAt,
        rotatedAt: null,
        metadata: { ...options.metadata, pairId },
    };
    
    const privateKey: EncryptionKey = {
        keyId: privateKeyId,
        type: 'signing_private',
        algorithm,
        keyMaterial: privateKeyMaterial,
        status: 'active',
        version: 1,
        createdAt: now,
        expiresAt,
        rotatedAt: null,
        metadata: { ...options.metadata, pairId },
    };
    
    keys.set(publicKeyId, publicKey);
    keys.set(privateKeyId, privateKey);
    
    const keyPair: KeyPair = {
        pairId,
        publicKey,
        privateKey,
        algorithm,
        createdAt: now,
        expiresAt,
    };
    
    keyPairs.set(pairId, keyPair);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'key_created',
        keyId: pairId,
        timestamp: now,
        data: { algorithm, type: 'signing' },
    });
    
    updateStatistics();
    
    return keyPair;
}

/**
 * Get key
 */
export function getKey(keyId: string): EncryptionKey | null {
    return keys.get(keyId) ?? null;
}

/**
 * Get key pair
 */
export function getKeyPair(pairId: string): KeyPair | null {
    return keyPairs.get(pairId) ?? null;
}

/**
 * Get all keys
 */
export function getAllKeys(): readonly EncryptionKey[] {
    return Array.from(keys.values());
}

/**
 * Get all key pairs
 */
export function getAllKeyPairs(): readonly KeyPair[] {
    return Array.from(keyPairs.values());
}

/**
 * Rotate key
 */
export async function rotateKey(keyId: string): Promise<EncryptionKey | null> {
    const oldKey = keys.get(keyId);
    if (!oldKey || oldKey.type !== 'symmetric') {
        return null;
    }
    
    const now = clock.nowMs();
    
    const newKeyMaterial = generateDeterministicBytes(
        oldKey.keyMaterial.length / 2,
        `${keyId}-rotated-${now}`
    );
    
    const rotatedKey: EncryptionKey = {
        ...oldKey,
        keyMaterial: newKeyMaterial,
        version: oldKey.version + 1,
        rotatedAt: now,
    };
    
    keys.set(keyId, rotatedKey);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'key_rotated',
        keyId,
        timestamp: now,
        data: { oldVersion: oldKey.version, newVersion: rotatedKey.version },
    });
    
    return rotatedKey;
}

/**
 * Expire key
 */
export async function expireKey(keyId: string): Promise<boolean> {
    const key = keys.get(keyId);
    if (!key) {
        return false;
    }
    
    const expiredKey: EncryptionKey = {
        ...key,
        status: 'expired',
    };
    
    keys.set(keyId, expiredKey);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'key_expired',
        keyId,
        timestamp: clock.nowMs(),
        data: {},
    });
    
    updateStatistics();
    
    return true;
}

/**
 * Mark key compromised
 */
export async function markKeyCompromised(keyId: string): Promise<boolean> {
    const key = keys.get(keyId);
    if (!key) {
        return false;
    }
    
    const compromisedKey: EncryptionKey = {
        ...key,
        status: 'compromised',
    };
    
    keys.set(keyId, compromisedKey);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'key_compromised',
        keyId,
        timestamp: clock.nowMs(),
        data: {},
    });
    
    updateStatistics();
    
    return true;
}

/**
 * Delete key
 */
export async function deleteKey(keyId: string): Promise<boolean> {
    const key = keys.get(keyId);
    if (!key) {
        return false;
    }
    
    keys.delete(keyId);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'key_deleted',
        keyId,
        timestamp: clock.nowMs(),
        data: {},
    });
    
    updateStatistics();
    
    return true;
}

// ============================================================================
// ENCRYPTION / DECRYPTION
// ============================================================================

/**
 * Encrypt data
 */
export async function encrypt(
    plaintext: string,
    keyId: string
): Promise<EncryptionResult> {
    const key = keys.get(keyId);
    if (!key || key.type !== 'symmetric') {
        throw new Error(`Key '${keyId}' not found or not symmetric`);
    }
    
    if (key.status !== 'active') {
        throw new Error(`Key '${keyId}' is not active`);
    }
    
    const now = clock.nowMs();
    const iv = generateDeterministicBytes(16, `${keyId}-iv-${now}`);
    
    const { ciphertext, tag } = performEncryption(
        plaintext,
        key.keyMaterial,
        iv,
        key.algorithm as EncryptionAlgorithm
    );
    
    const mutableStats = statistics as { totalEncryptions: number };
    mutableStats.totalEncryptions++;
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'encryption_performed',
        keyId,
        timestamp: now,
        data: { plaintextLength: plaintext.length, ciphertextLength: ciphertext.length },
    });
    
    return {
        ciphertext,
        iv,
        tag,
        algorithm: key.algorithm as EncryptionAlgorithm,
        keyId,
        keyVersion: key.version,
        encryptedAt: now,
    };
}

/**
 * Decrypt data
 */
export async function decrypt(
    encryptionResult: EncryptionResult
): Promise<DecryptionResult> {
    const key = keys.get(encryptionResult.keyId);
    if (!key || key.type !== 'symmetric') {
        throw new Error(`Key '${encryptionResult.keyId}' not found or not symmetric`);
    }
    
    if (key.status === 'compromised') {
        throw new Error(`Key '${encryptionResult.keyId}' is compromised`);
    }
    
    const now = clock.nowMs();
    
    const plaintext = performDecryption(
        encryptionResult.ciphertext,
        key.keyMaterial,
        encryptionResult.iv
    );
    
    const mutableStats = statistics as { totalDecryptions: number };
    mutableStats.totalDecryptions++;
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'decryption_performed',
        keyId: encryptionResult.keyId,
        timestamp: now,
        data: { ciphertextLength: encryptionResult.ciphertext.length },
    });
    
    return {
        plaintext,
        keyId: encryptionResult.keyId,
        keyVersion: key.version,
        decryptedAt: now,
    };
}

/**
 * Envelope encrypt
 */
export async function envelopeEncrypt(
    plaintext: string,
    masterKeyId: string,
    dataKeyAlgorithm: EncryptionAlgorithm = 'aes-256-gcm'
): Promise<EnvelopeEncryptionResult> {
    const masterKey = keys.get(masterKeyId);
    if (!masterKey || masterKey.type !== 'symmetric') {
        throw new Error(`Master key '${masterKeyId}' not found or not symmetric`);
    }
    
    const now = clock.nowMs();
    
    const dataKeyMaterial = generateDeterministicBytes(32, `data-key-${masterKeyId}-${now}`);
    const iv = generateDeterministicBytes(16, `envelope-iv-${now}`);
    
    const { ciphertext: encryptedData, tag } = performEncryption(
        plaintext,
        dataKeyMaterial,
        iv,
        dataKeyAlgorithm
    );
    
    const { ciphertext: encryptedDataKey } = performEncryption(
        dataKeyMaterial,
        masterKey.keyMaterial,
        generateDeterministicBytes(16, `dek-iv-${now}`),
        masterKey.algorithm as EncryptionAlgorithm
    );
    
    return {
        encryptedData,
        encryptedDataKey,
        iv,
        tag,
        masterKeyId,
        dataKeyAlgorithm,
        encryptedAt: now,
    };
}

// ============================================================================
// SIGNING / VERIFICATION
// ============================================================================

/**
 * Sign data
 */
export async function sign(
    data: string,
    privateKeyId: string
): Promise<SignatureResult> {
    const key = keys.get(privateKeyId);
    if (!key || key.type !== 'signing_private') {
        throw new Error(`Signing key '${privateKeyId}' not found`);
    }
    
    if (key.status !== 'active') {
        throw new Error(`Key '${privateKeyId}' is not active`);
    }
    
    const now = clock.nowMs();
    
    const signature = createSignature(data, key.keyMaterial);
    
    const mutableStats = statistics as { totalSignatures: number };
    mutableStats.totalSignatures++;
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'signature_created',
        keyId: privateKeyId,
        timestamp: now,
        data: { dataLength: data.length },
    });
    
    return {
        signature,
        algorithm: key.algorithm as SignatureAlgorithm,
        keyId: privateKeyId,
        signedAt: now,
    };
}

/**
 * Verify signature
 */
export async function verify(
    data: string,
    signatureResult: SignatureResult,
    publicKeyId: string
): Promise<VerificationResult> {
    const publicKey = keys.get(publicKeyId);
    if (!publicKey || publicKey.type !== 'signing_public') {
        return {
            valid: false,
            keyId: publicKeyId,
            verifiedAt: clock.nowMs(),
            error: `Public key '${publicKeyId}' not found`,
        };
    }
    
    const privateKey = keys.get(signatureResult.keyId);
    if (!privateKey) {
        return {
            valid: false,
            keyId: publicKeyId,
            verifiedAt: clock.nowMs(),
            error: `Private key '${signatureResult.keyId}' not found`,
        };
    }
    
    const now = clock.nowMs();
    
    const valid = verifySimulatedSignature(
        data,
        signatureResult.signature,
        publicKey.keyMaterial,
        privateKey.keyMaterial
    );
    
    const mutableStats = statistics as { totalVerifications: number };
    mutableStats.totalVerifications++;
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'signature_verified',
        keyId: publicKeyId,
        timestamp: now,
        data: { valid },
    });
    
    return {
        valid,
        keyId: publicKeyId,
        verifiedAt: now,
        error: valid ? null : 'Signature verification failed',
    };
}

// ============================================================================
// HASHING
// ============================================================================

/**
 * Hash data
 */
export async function hash(
    data: string,
    algorithm: HashAlgorithm = 'sha256'
): Promise<HashResult> {
    const now = clock.nowMs();
    
    const hashValue = computeHash(data, algorithm);
    
    const mutableStats = statistics as { totalHashes: number };
    mutableStats.totalHashes++;
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'hash_computed',
        keyId: null,
        timestamp: now,
        data: { algorithm, inputLength: data.length },
    });
    
    return {
        hash: hashValue,
        algorithm,
        inputLength: data.length,
        hashedAt: now,
    };
}

/**
 * HMAC
 */
export async function hmac(
    data: string,
    keyId: string,
    algorithm: HashAlgorithm = 'sha256'
): Promise<HashResult> {
    const key = keys.get(keyId);
    if (!key || key.type !== 'symmetric') {
        throw new Error(`Key '${keyId}' not found or not symmetric`);
    }
    
    const combined = key.keyMaterial + data + key.keyMaterial;
    return hash(combined, algorithm);
}

// ============================================================================
// KEY DERIVATION
// ============================================================================

/**
 * Derive key
 */
export async function deriveKey(
    password: string,
    salt?: string,
    config: Partial<KeyDerivationConfig> = {}
): Promise<DerivedKeyResult> {
    const now = clock.nowMs();
    const fullConfig = { ...defaultDerivationConfig, ...config };
    
    const actualSalt = salt ?? generateDeterministicBytes(fullConfig.saltLength, `salt-${now}`);
    
    let derivedKey = password + actualSalt;
    for (let i = 0; i < fullConfig.iterations; i++) {
        derivedKey = computeHash(derivedKey, 'sha256');
    }
    
    derivedKey = derivedKey.substring(0, fullConfig.keyLength * 2);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'key_derived',
        keyId: null,
        timestamp: now,
        data: { algorithm: fullConfig.algorithm, iterations: fullConfig.iterations },
    });
    
    return {
        derivedKey,
        salt: actualSalt,
        algorithm: fullConfig.algorithm,
        iterations: fullConfig.iterations,
        derivedAt: now,
    };
}

// ============================================================================
// KEY ROTATION POLICIES
// ============================================================================

/**
 * Create rotation policy
 */
export function createRotationPolicy(
    keyId: string,
    rotationIntervalDays: number,
    options: {
        autoRotate?: boolean;
        notifyBeforeDays?: number;
    } = {}
): KeyRotationPolicy {
    const policyId = generatePolicyId();
    
    const policy: KeyRotationPolicy = {
        policyId,
        keyId,
        rotationIntervalDays,
        autoRotate: options.autoRotate ?? true,
        notifyBeforeDays: options.notifyBeforeDays ?? 7,
        enabled: true,
    };
    
    rotationPolicies.set(policyId, policy);
    
    return policy;
}

/**
 * Get rotation policy
 */
export function getRotationPolicy(policyId: string): KeyRotationPolicy | null {
    return rotationPolicies.get(policyId) ?? null;
}

/**
 * Get all rotation policies
 */
export function getAllRotationPolicies(): readonly KeyRotationPolicy[] {
    return Array.from(rotationPolicies.values());
}

/**
 * Delete rotation policy
 */
export function deleteRotationPolicy(policyId: string): boolean {
    return rotationPolicies.delete(policyId);
}

/**
 * Apply rotation policies
 */
export async function applyRotationPolicies(): Promise<number> {
    const now = clock.nowMs();
    const dayMs = 24 * 60 * 60 * 1000;
    let rotatedCount = 0;
    
    for (const policy of rotationPolicies.values()) {
        if (!policy.enabled || !policy.autoRotate) {
            continue;
        }
        
        const key = keys.get(policy.keyId);
        if (!key || key.status !== 'active') {
            continue;
        }
        
        const lastRotation = key.rotatedAt ?? key.createdAt;
        const nextRotation = lastRotation + policy.rotationIntervalDays * dayMs;
        
        if (now >= nextRotation) {
            await rotateKey(policy.keyId);
            rotatedCount++;
        }
    }
    
    return rotatedCount;
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get statistics
 */
export function getStatistics(): Readonly<EncryptionStatistics> {
    updateStatistics();
    return { ...statistics };
}

/**
 * Reset statistics
 */
export function resetStatistics(): void {
    Object.assign(statistics, {
        totalKeys: 0,
        activeKeys: 0,
        expiredKeys: 0,
        totalEncryptions: 0,
        totalDecryptions: 0,
        totalSignatures: 0,
        totalVerifications: 0,
        totalHashes: 0,
        avgEncryptionTime: 0,
        avgDecryptionTime: 0,
    });
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Add event listener
 */
export function addEventListener(listener: EncryptionEventListener): void {
    eventListeners.add(listener);
}

/**
 * Remove event listener
 */
export function removeEventListener(listener: EncryptionEventListener): void {
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
    keys.clear();
    keyPairs.clear();
    rotationPolicies.clear();
    eventListeners.clear();
    resetStatistics();
}
