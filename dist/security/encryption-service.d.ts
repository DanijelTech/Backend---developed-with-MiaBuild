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
export type EncryptionEventType = 'key_created' | 'key_rotated' | 'key_expired' | 'key_compromised' | 'key_deleted' | 'encryption_performed' | 'decryption_performed' | 'signature_created' | 'signature_verified' | 'hash_computed' | 'key_derived';
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
/**
 * Generate symmetric key
 */
export declare function generateSymmetricKey(algorithm: EncryptionAlgorithm, options?: {
    expiresInDays?: number;
    metadata?: Record<string, unknown>;
}): Promise<EncryptionKey>;
/**
 * Generate asymmetric key pair
 */
export declare function generateAsymmetricKeyPair(algorithm: AsymmetricAlgorithm, options?: {
    expiresInDays?: number;
    metadata?: Record<string, unknown>;
}): Promise<KeyPair>;
/**
 * Generate signing key pair
 */
export declare function generateSigningKeyPair(algorithm: SignatureAlgorithm, options?: {
    expiresInDays?: number;
    metadata?: Record<string, unknown>;
}): Promise<KeyPair>;
/**
 * Get key
 */
export declare function getKey(keyId: string): EncryptionKey | null;
/**
 * Get key pair
 */
export declare function getKeyPair(pairId: string): KeyPair | null;
/**
 * Get all keys
 */
export declare function getAllKeys(): readonly EncryptionKey[];
/**
 * Get all key pairs
 */
export declare function getAllKeyPairs(): readonly KeyPair[];
/**
 * Rotate key
 */
export declare function rotateKey(keyId: string): Promise<EncryptionKey | null>;
/**
 * Expire key
 */
export declare function expireKey(keyId: string): Promise<boolean>;
/**
 * Mark key compromised
 */
export declare function markKeyCompromised(keyId: string): Promise<boolean>;
/**
 * Delete key
 */
export declare function deleteKey(keyId: string): Promise<boolean>;
/**
 * Encrypt data
 */
export declare function encrypt(plaintext: string, keyId: string): Promise<EncryptionResult>;
/**
 * Decrypt data
 */
export declare function decrypt(encryptionResult: EncryptionResult): Promise<DecryptionResult>;
/**
 * Envelope encrypt
 */
export declare function envelopeEncrypt(plaintext: string, masterKeyId: string, dataKeyAlgorithm?: EncryptionAlgorithm): Promise<EnvelopeEncryptionResult>;
/**
 * Sign data
 */
export declare function sign(data: string, privateKeyId: string): Promise<SignatureResult>;
/**
 * Verify signature
 */
export declare function verify(data: string, signatureResult: SignatureResult, publicKeyId: string): Promise<VerificationResult>;
/**
 * Hash data
 */
export declare function hash(data: string, algorithm?: HashAlgorithm): Promise<HashResult>;
/**
 * HMAC
 */
export declare function hmac(data: string, keyId: string, algorithm?: HashAlgorithm): Promise<HashResult>;
/**
 * Derive key
 */
export declare function deriveKey(password: string, salt?: string, config?: Partial<KeyDerivationConfig>): Promise<DerivedKeyResult>;
/**
 * Create rotation policy
 */
export declare function createRotationPolicy(keyId: string, rotationIntervalDays: number, options?: {
    autoRotate?: boolean;
    notifyBeforeDays?: number;
}): KeyRotationPolicy;
/**
 * Get rotation policy
 */
export declare function getRotationPolicy(policyId: string): KeyRotationPolicy | null;
/**
 * Get all rotation policies
 */
export declare function getAllRotationPolicies(): readonly KeyRotationPolicy[];
/**
 * Delete rotation policy
 */
export declare function deleteRotationPolicy(policyId: string): boolean;
/**
 * Apply rotation policies
 */
export declare function applyRotationPolicies(): Promise<number>;
/**
 * Get statistics
 */
export declare function getStatistics(): Readonly<EncryptionStatistics>;
/**
 * Reset statistics
 */
export declare function resetStatistics(): void;
/**
 * Add event listener
 */
export declare function addEventListener(listener: EncryptionEventListener): void;
/**
 * Remove event listener
 */
export declare function removeEventListener(listener: EncryptionEventListener): void;
/**
 * Clear event listeners
 */
export declare function clearEventListeners(): void;
/**
 * Clear all state
 */
export declare function clearAll(): void;
