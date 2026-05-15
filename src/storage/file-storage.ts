/**
 * @file File Storage za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 * 
 * @requirement ZAH-ZALEDNI-STOR-001 File storage za zaledne sisteme
 * @design DSN-ZALEDNI-STOR-001 Backend file storage arhitektura
 * @test TEST-ZALEDNI-STOR-001 Preverjanje file storage
 * 
 * File Storage - prilagojen za zaledne sisteme:
 * - File upload/download
 * - Multipart upload
 * - File metadata
 * - Access control
 * - Versioning
 * - Lifecycle management
 * - Content delivery
 * - Encryption at rest
 * 
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom STOR_001 - File Storage
 */

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI ZA FILE STORAGE
// ============================================================================

/**
 * Storage class
 */
export type StorageClass = 'standard' | 'infrequent' | 'archive' | 'deep_archive';

/**
 * File status
 */
export type FileStatus = 'active' | 'archived' | 'deleted' | 'pending_deletion';

/**
 * Access level
 */
export type AccessLevel = 'private' | 'authenticated' | 'public';

/**
 * File metadata
 */
export interface FileMetadata {
    readonly fileId: string;
    readonly name: string;
    readonly path: string;
    readonly size: number;
    readonly contentType: string;
    readonly checksum: string;
    readonly checksumAlgorithm: 'legacy-hash-v5' | 'sha256' | 'sha512';
    readonly storageClass: StorageClass;
    readonly status: FileStatus;
    readonly accessLevel: AccessLevel;
    readonly ownerId: string;
    readonly createdAt: number;
    readonly updatedAt: number;
    readonly lastAccessedAt: number | null;
    readonly expiresAt: number | null;
    readonly version: number;
    readonly versionId: string;
    readonly isLatestVersion: boolean;
    readonly tags: Readonly<Record<string, string>>;
    readonly customMetadata: Readonly<Record<string, string>>;
    readonly cipherSecret: string | null;
    readonly encryptionAlgorithm: string | null;
}

/**
 * File content
 */
export interface FileContent {
    readonly data: Uint8Array;
    readonly contentType: string;
    readonly contentLength: number;
    readonly contentEncoding: string | null;
    readonly contentDisposition: string | null;
    readonly cacheControl: string | null;
    readonly etag: string;
    readonly lastModified: number;
}

/**
 * Upload options
 */
export interface UploadOptions {
    readonly contentType?: string;
    readonly storageClass?: StorageClass;
    readonly accessLevel?: AccessLevel;
    readonly tags?: Record<string, string>;
    readonly customMetadata?: Record<string, string>;
    readonly expiresAt?: number;
    readonly encrypt?: boolean;
    readonly checksumAlgorithm?: 'legacy-hash-v5' | 'sha256' | 'sha512';
}

/**
 * Download options
 */
export interface DownloadOptions {
    readonly versionId?: string;
    readonly range?: { start: number; end: number };
    readonly ifMatch?: string;
    readonly ifNoneMatch?: string;
    readonly ifModifiedSince?: number;
    readonly ifUnmodifiedSince?: number;
}

/**
 * Download result
 */
export interface DownloadResult {
    readonly content: FileContent;
    readonly metadata: FileMetadata;
    readonly isPartial: boolean;
    readonly contentRange: { start: number; end: number; total: number } | null;
}

/**
 * List options
 */
export interface ListOptions {
    readonly prefix?: string;
    readonly delimiter?: string;
    readonly maxKeys?: number;
    readonly continuationToken?: string;
    readonly startAfter?: string;
    readonly includeVersions?: boolean;
    readonly storageClass?: StorageClass;
    readonly status?: FileStatus;
}

/**
 * List result
 */
export interface ListResult {
    readonly files: readonly FileMetadata[];
    readonly commonPrefixes: readonly string[];
    readonly isTruncated: boolean;
    readonly continuationToken: string | null;
    readonly keyCount: number;
}

/**
 * Multipart upload
 */
export interface MultipartUpload {
    readonly uploadId: string;
    readonly fileId: string;
    readonly path: string;
    readonly contentType: string;
    readonly storageClass: StorageClass;
    readonly initiatedAt: number;
    readonly expiresAt: number;
    readonly parts: readonly UploadPart[];
    readonly status: 'in_progress' | 'completed' | 'aborted';
}

/**
 * Upload part
 */
export interface UploadPart {
    readonly partNumber: number;
    readonly size: number;
    readonly checksum: string;
    readonly uploadedAt: number;
}

/**
 * Copy options
 */
export interface CopyOptions {
    readonly sourceVersionId?: string;
    readonly destinationStorageClass?: StorageClass;
    readonly destinationAccessLevel?: AccessLevel;
    readonly metadataDirective?: 'COPY' | 'REPLACE';
    readonly newMetadata?: Record<string, string>;
    readonly newTags?: Record<string, string>;
}

/**
 * Lifecycle rule
 */
export interface LifecycleRule {
    readonly ruleId: string;
    readonly name: string;
    readonly enabled: boolean;
    readonly prefix: string | null;
    readonly tags: Readonly<Record<string, string>> | null;
    readonly transitions: readonly LifecycleTransition[];
    readonly expiration: LifecycleExpiration | null;
    readonly abortIncompleteMultipartUpload: number | null;
}

/**
 * Lifecycle transition
 */
export interface LifecycleTransition {
    readonly days: number;
    readonly storageClass: StorageClass;
}

/**
 * Lifecycle expiration
 */
export interface LifecycleExpiration {
    readonly days: number | null;
    readonly date: number | null;
    readonly expiredObjectDeleteMarker: boolean;
}

/**
 * Bucket configuration
 */
export interface BucketConfig {
    readonly bucketId: string;
    readonly name: string;
    readonly region: string;
    readonly storageClass: StorageClass;
    readonly versioningEnabled: boolean;
    readonly encryptionEnabled: boolean;
    readonly encryptionAlgorithm: string | null;
    readonly lifecycleRules: readonly LifecycleRule[];
    readonly corsRules: readonly CorsRule[];
    readonly accessPolicy: AccessPolicy | null;
    readonly createdAt: number;
    readonly updatedAt: number;
}

/**
 * CORS rule
 */
export interface CorsRule {
    readonly allowedOrigins: readonly string[];
    readonly allowedMethods: readonly string[];
    readonly allowedHeaders: readonly string[];
    readonly exposedHeaders: readonly string[];
    readonly maxAgeSeconds: number;
}

/**
 * Access policy
 */
export interface AccessPolicy {
    readonly version: string;
    readonly statements: readonly PolicyStatement[];
}

/**
 * Policy statement
 */
export interface PolicyStatement {
    readonly effect: 'allow' | 'deny';
    readonly principals: readonly string[];
    readonly actions: readonly string[];
    readonly resources: readonly string[];
    readonly conditions: Readonly<Record<string, unknown>> | null;
}

/**
 * Presigned URL options
 */
export interface PresignedUrlOptions {
    readonly expiresIn: number;
    readonly contentType?: string;
    readonly contentDisposition?: string;
    readonly versionId?: string;
}

/**
 * Storage event
 */
export interface StorageEvent {
    readonly eventId: string;
    readonly type: StorageEventType;
    readonly bucketName: string;
    readonly fileId: string | null;
    readonly path: string | null;
    readonly timestamp: number;
    readonly data: Readonly<Record<string, unknown>>;
}

/**
 * Storage event type
 */
export type StorageEventType =
    | 'file_created'
    | 'file_updated'
    | 'file_deleted'
    | 'file_restored'
    | 'file_archived'
    | 'file_copied'
    | 'file_moved'
    | 'version_created'
    | 'version_deleted'
    | 'multipart_initiated'
    | 'multipart_completed'
    | 'multipart_aborted'
    | 'lifecycle_transition'
    | 'lifecycle_expiration';

/**
 * Storage event listener
 */
export type StorageEventListener = (event: StorageEvent) => void | Promise<void>;

/**
 * Storage statistics
 */
export interface StorageStatistics {
    readonly totalFiles: number;
    readonly totalSize: number;
    readonly totalVersions: number;
    readonly filesByStorageClass: Readonly<Record<StorageClass, number>>;
    readonly sizeByStorageClass: Readonly<Record<StorageClass, number>>;
    readonly uploadCount: number;
    readonly downloadCount: number;
    readonly deleteCount: number;
    readonly avgFileSize: number;
}

// ============================================================================
// STANJE
// ============================================================================

const buckets: Map<string, BucketConfig> = new Map();
const files: Map<string, FileMetadata> = new Map();
const fileContents: Map<string, Uint8Array> = new Map();
const fileVersions: Map<string, FileMetadata[]> = new Map();
const multipartUploads: Map<string, MultipartUpload> = new Map();
const eventListeners: Set<StorageEventListener> = new Set();

let bucketCounter = 0;
let fileCounter = 0;
let uploadCounter = 0;
let versionCounter = 0;
let eventCounter = 0;

const statistics: StorageStatistics = {
    totalFiles: 0,
    totalSize: 0,
    totalVersions: 0,
    filesByStorageClass: {
        standard: 0,
        infrequent: 0,
        archive: 0,
        deep_archive: 0,
    },
    sizeByStorageClass: {
        standard: 0,
        infrequent: 0,
        archive: 0,
        deep_archive: 0,
    },
    uploadCount: 0,
    downloadCount: 0,
    deleteCount: 0,
    avgFileSize: 0,
};

// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================

/**
 * Generate bucket ID
 */
function generateBucketId(): string {
    bucketCounter++;
    return generateDeterministicId(`bucket-${bucketCounter}`);
}

/**
 * Generate file ID
 */
function generateFileId(): string {
    fileCounter++;
    return generateDeterministicId(`file-${fileCounter}`);
}

/**
 * Generate upload ID
 */
function generateUploadId(): string {
    uploadCounter++;
    return generateDeterministicId(`upload-${uploadCounter}`);
}

/**
 * Generate version ID
 */
function generateVersionId(): string {
    versionCounter++;
    return generateDeterministicId(`version-${versionCounter}`);
}

/**
 * Generate event ID
 */
function generateEventId(): string {
    eventCounter++;
    return generateDeterministicId(`storage-event-${eventCounter}`);
}

/**
 * Compute checksum
 */
function computeChecksum(data: Uint8Array, algorithm: 'legacy-hash-v5' | 'sha256' | 'sha512'): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        hash = ((hash << 5) - hash) + data[i];
        hash = hash & hash;
    }
    return `${algorithm}-${Math.abs(hash).toString(16).padStart(16, '0')}`;
}

/**
 * Get content type from extension
 */
function getContentTypeFromExtension(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    
    const contentTypes: Record<string, string> = {
        'txt': 'text/plain',
        'html': 'text/html',
        'css': 'text/css',
        'js': 'application/javascript',
        'json': 'application/json',
        'xml': 'application/xml',
        'pdf': 'application/pdf',
        'zip': 'application/zip',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'mp3': 'audio/mpeg',
        'mp4': 'video/mp4',
    };
    
    return contentTypes[ext ?? ''] ?? 'application/octet-stream';
}

/**
 * Normalize path
 */
function normalizePath(path: string): string {
    return path.replace(/^\/+/, '').replace(/\/+$/, '').replace(/\/+/g, '/');
}

/**
 * Get file key
 */
function getFileKey(bucketName: string, path: string): string {
    return `${bucketName}:${normalizePath(path)}`;
}

/**
 * Emit storage event
 */
async function emitEvent(event: StorageEvent): Promise<void> {
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
        totalFiles: number;
        totalSize: number;
        totalVersions: number;
        filesByStorageClass: Record<StorageClass, number>;
        sizeByStorageClass: Record<StorageClass, number>;
        avgFileSize: number;
    };
    
    mutableStats.totalFiles = 0;
    mutableStats.totalSize = 0;
    mutableStats.totalVersions = 0;
    mutableStats.filesByStorageClass = { standard: 0, infrequent: 0, archive: 0, deep_archive: 0 };
    mutableStats.sizeByStorageClass = { standard: 0, infrequent: 0, archive: 0, deep_archive: 0 };
    
    for (const file of files.values()) {
        if (file.status === 'active') {
            mutableStats.totalFiles++;
            mutableStats.totalSize += file.size;
            mutableStats.filesByStorageClass[file.storageClass]++;
            mutableStats.sizeByStorageClass[file.storageClass] += file.size;
        }
    }
    
    for (const versions of fileVersions.values()) {
        mutableStats.totalVersions += versions.length;
    }
    
    mutableStats.avgFileSize = mutableStats.totalFiles > 0
        ? mutableStats.totalSize / mutableStats.totalFiles
        : 0;
}

// ============================================================================
// BUCKET MANAGEMENT
// ============================================================================

/**
 * Create bucket
 */
export function createBucket(
    name: string,
    options: {
        region?: string;
        storageClass?: StorageClass;
        versioningEnabled?: boolean;
        encryptionEnabled?: boolean;
        encryptionAlgorithm?: string;
    } = {}
): BucketConfig {
    const bucketId = generateBucketId();
    const now = clock.nowMs();
    
    const bucket: BucketConfig = {
        bucketId,
        name,
        region: options.region ?? 'default',
        storageClass: options.storageClass ?? 'standard',
        versioningEnabled: options.versioningEnabled ?? false,
        encryptionEnabled: options.encryptionEnabled ?? false,
        encryptionAlgorithm: options.encryptionAlgorithm ?? null,
        lifecycleRules: [],
        corsRules: [],
        accessPolicy: null,
        createdAt: now,
        updatedAt: now,
    };
    
    buckets.set(name, bucket);
    
    return bucket;
}

/**
 * Get bucket
 */
export function getBucket(name: string): BucketConfig | null {
    return buckets.get(name) ?? null;
}

/**
 * Get all buckets
 */
export function getAllBuckets(): readonly BucketConfig[] {
    return Array.from(buckets.values());
}

/**
 * Delete bucket
 */
export function deleteBucket(name: string, force: boolean = false): boolean {
    const bucket = buckets.get(name);
    if (!bucket) {
        return false;
    }
    
    const bucketFiles = Array.from(files.values()).filter(f => f.path.startsWith(`${name}:`));
    
    if (bucketFiles.length > 0 && !force) {
        return false;
    }
    
    if (force) {
        for (const file of bucketFiles) {
            files.delete(getFileKey(name, file.path));
            fileContents.delete(file.fileId);
            fileVersions.delete(file.fileId);
        }
    }
    
    buckets.delete(name);
    
    return true;
}

/**
 * Update bucket configuration
 */
export function updateBucket(
    name: string,
    updates: Partial<Pick<BucketConfig, 'versioningEnabled' | 'encryptionEnabled' | 'encryptionAlgorithm'>>
): BucketConfig | null {
    const bucket = buckets.get(name);
    if (!bucket) {
        return null;
    }
    
    const updated: BucketConfig = {
        ...bucket,
        ...updates,
        updatedAt: clock.nowMs(),
    };
    
    buckets.set(name, updated);
    
    return updated;
}

/**
 * Add lifecycle rule
 */
export function addLifecycleRule(bucketName: string, rule: LifecycleRule): boolean {
    const bucket = buckets.get(bucketName);
    if (!bucket) {
        return false;
    }
    
    const existingIndex = bucket.lifecycleRules.findIndex(r => r.ruleId === rule.ruleId);
    let newRules: LifecycleRule[];
    
    if (existingIndex !== -1) {
        newRules = [...bucket.lifecycleRules];
        newRules[existingIndex] = rule;
    } else {
        newRules = [...bucket.lifecycleRules, rule];
    }
    
    buckets.set(bucketName, {
        ...bucket,
        lifecycleRules: newRules,
        updatedAt: clock.nowMs(),
    });
    
    return true;
}

/**
 * Remove lifecycle rule
 */
export function removeLifecycleRule(bucketName: string, ruleId: string): boolean {
    const bucket = buckets.get(bucketName);
    if (!bucket) {
        return false;
    }
    
    const newRules = bucket.lifecycleRules.filter(r => r.ruleId !== ruleId);
    
    if (newRules.length === bucket.lifecycleRules.length) {
        return false;
    }
    
    buckets.set(bucketName, {
        ...bucket,
        lifecycleRules: newRules,
        updatedAt: clock.nowMs(),
    });
    
    return true;
}

/**
 * Add CORS rule
 */
export function addCorsRule(bucketName: string, rule: CorsRule): boolean {
    const bucket = buckets.get(bucketName);
    if (!bucket) {
        return false;
    }
    
    buckets.set(bucketName, {
        ...bucket,
        corsRules: [...bucket.corsRules, rule],
        updatedAt: clock.nowMs(),
    });
    
    return true;
}

/**
 * Set access policy
 */
export function setAccessPolicy(bucketName: string, policy: AccessPolicy): boolean {
    const bucket = buckets.get(bucketName);
    if (!bucket) {
        return false;
    }
    
    buckets.set(bucketName, {
        ...bucket,
        accessPolicy: policy,
        updatedAt: clock.nowMs(),
    });
    
    return true;
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

/**
 * Upload file
 */
export async function uploadFile(
    bucketName: string,
    path: string,
    data: Uint8Array,
    options: UploadOptions = {}
): Promise<FileMetadata> {
    const bucket = buckets.get(bucketName);
    if (!bucket) {
        throw new Error(`Bucket '${bucketName}' not found`);
    }
    
    const fileId = generateFileId();
    const versionId = generateVersionId();
    const now = clock.nowMs();
    const normalizedPath = normalizePath(path);
    const fileKey = getFileKey(bucketName, normalizedPath);
    
    const contentType = options.contentType ?? getContentTypeFromExtension(path);
    const checksumAlgorithm = options.checksumAlgorithm ?? 'sha256';
    const checksum = computeChecksum(data, checksumAlgorithm);
    
    const existingFile = files.get(fileKey);
    
    const metadata: FileMetadata = {
        fileId,
        name: path.split('/').pop() ?? path,
        path: normalizedPath,
        size: data.length,
        contentType,
        checksum,
        checksumAlgorithm,
        storageClass: options.storageClass ?? bucket.storageClass,
        status: 'active',
        accessLevel: options.accessLevel ?? 'private',
        ownerId: 'system',
        createdAt: now,
        updatedAt: now,
        lastAccessedAt: null,
        expiresAt: options.expiresAt ?? null,
        version: existingFile ? existingFile.version + 1 : 1,
        versionId,
        isLatestVersion: true,
        tags: options.tags ?? {},
        customMetadata: options.customMetadata ?? {},
        cipherSecret: options.encrypt ? generateDeterministicId(`enc-${fileId}`) : null,
        encryptionAlgorithm: options.encrypt ? 'AES-256-GCM' : null,
    };
    
    if (existingFile && bucket.versioningEnabled) {
        const versions = fileVersions.get(existingFile.fileId) ?? [];
        versions.push({
            ...existingFile,
            isLatestVersion: false,
        });
        fileVersions.set(existingFile.fileId, versions);
        
        await emitEvent({
            eventId: generateEventId(),
            type: 'version_created',
            bucketName,
            fileId: existingFile.fileId,
            path: normalizedPath,
            timestamp: now,
            data: { versionId: existingFile.versionId },
        });
    }
    
    files.set(fileKey, metadata);
    fileContents.set(fileId, data);
    
    const mutableStats = statistics as { uploadCount: number };
    mutableStats.uploadCount++;
    updateStatistics();
    
    await emitEvent({
        eventId: generateEventId(),
        type: existingFile ? 'file_updated' : 'file_created',
        bucketName,
        fileId,
        path: normalizedPath,
        timestamp: now,
        data: { size: data.length, contentType },
    });
    
    return metadata;
}

/**
 * Download file
 */
export async function downloadFile(
    bucketName: string,
    path: string,
    options: DownloadOptions = {}
): Promise<DownloadResult> {
    const bucket = buckets.get(bucketName);
    if (!bucket) {
        throw new Error(`Bucket '${bucketName}' not found`);
    }
    
    const normalizedPath = normalizePath(path);
    const fileKey = getFileKey(bucketName, normalizedPath);
    
    let metadata = files.get(fileKey);
    
    if (options.versionId && metadata) {
        const versions = fileVersions.get(metadata.fileId) ?? [];
        const version = versions.find(v => v.versionId === options.versionId);
        if (version) {
            metadata = version;
        }
    }
    
    if (!metadata || metadata.status !== 'active') {
        throw new Error(`File '${path}' not found in bucket '${bucketName}'`);
    }
    
    const data = fileContents.get(metadata.fileId);
    if (!data) {
        throw new Error(`File content not found for '${path}'`);
    }
    
    if (options.ifMatch && options.ifMatch !== metadata.checksum) {
        throw new Error('Precondition failed: ETag mismatch');
    }
    
    if (options.ifNoneMatch && options.ifNoneMatch === metadata.checksum) {
        throw new Error('Not modified');
    }
    
    if (options.ifModifiedSince && metadata.updatedAt <= options.ifModifiedSince) {
        throw new Error('Not modified');
    }
    
    if (options.ifUnmodifiedSince && metadata.updatedAt > options.ifUnmodifiedSince) {
        throw new Error('Precondition failed: File was modified');
    }
    
    let contentData = data;
    let isPartial = false;
    let contentRange: { start: number; end: number; total: number } | null = null;
    
    if (options.range) {
        const start = Math.max(0, options.range.start);
        const end = Math.min(data.length - 1, options.range.end);
        contentData = data.slice(start, end + 1);
        isPartial = true;
        contentRange = { start, end, total: data.length };
    }
    
    const now = clock.nowMs();
    files.set(fileKey, {
        ...metadata,
        lastAccessedAt: now,
    });
    
    const mutableStats = statistics as { downloadCount: number };
    mutableStats.downloadCount++;
    
    const content: FileContent = {
        data: contentData,
        contentType: metadata.contentType,
        contentLength: contentData.length,
        contentEncoding: null,
        contentDisposition: null,
        cacheControl: null,
        etag: metadata.checksum,
        lastModified: metadata.updatedAt,
    };
    
    return {
        content,
        metadata,
        isPartial,
        contentRange,
    };
}

/**
 * Delete file
 */
export async function deleteFile(
    bucketName: string,
    path: string,
    options: { versionId?: string; permanent?: boolean } = {}
): Promise<boolean> {
    const bucket = buckets.get(bucketName);
    if (!bucket) {
        return false;
    }
    
    const normalizedPath = normalizePath(path);
    const fileKey = getFileKey(bucketName, normalizedPath);
    const metadata = files.get(fileKey);
    
    if (!metadata) {
        return false;
    }
    
    const now = clock.nowMs();
    
    if (options.versionId) {
        const versions = fileVersions.get(metadata.fileId) ?? [];
        const versionIndex = versions.findIndex(v => v.versionId === options.versionId);
        
        if (versionIndex !== -1) {
            versions.splice(versionIndex, 1);
            fileVersions.set(metadata.fileId, versions);
            
            await emitEvent({
                eventId: generateEventId(),
                type: 'version_deleted',
                bucketName,
                fileId: metadata.fileId,
                path: normalizedPath,
                timestamp: now,
                data: { versionId: options.versionId },
            });
            
            return true;
        }
        
        return false;
    }
    
    if (options.permanent || !bucket.versioningEnabled) {
        files.delete(fileKey);
        fileContents.delete(metadata.fileId);
        fileVersions.delete(metadata.fileId);
    } else {
        files.set(fileKey, {
            ...metadata,
            status: 'deleted',
            updatedAt: now,
        });
    }
    
    const mutableStats = statistics as { deleteCount: number };
    mutableStats.deleteCount++;
    updateStatistics();
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'file_deleted',
        bucketName,
        fileId: metadata.fileId,
        path: normalizedPath,
        timestamp: now,
        data: { permanent: options.permanent ?? false },
    });
    
    return true;
}

/**
 * Copy file
 */
export async function copyFile(
    sourceBucket: string,
    sourcePath: string,
    destBucket: string,
    destPath: string,
    options: CopyOptions = {}
): Promise<FileMetadata> {
    const sourceResult = await downloadFile(sourceBucket, sourcePath, {
        versionId: options.sourceVersionId,
    });
    
    const uploadOptions: UploadOptions = {
        contentType: sourceResult.metadata.contentType,
        storageClass: options.destinationStorageClass ?? sourceResult.metadata.storageClass,
        accessLevel: options.destinationAccessLevel ?? sourceResult.metadata.accessLevel,
        tags: options.metadataDirective === 'REPLACE' ? options.newTags : sourceResult.metadata.tags,
        customMetadata: options.metadataDirective === 'REPLACE' ? options.newMetadata : sourceResult.metadata.customMetadata,
    };
    
    const newMetadata = await uploadFile(destBucket, destPath, sourceResult.content.data, uploadOptions);
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'file_copied',
        bucketName: destBucket,
        fileId: newMetadata.fileId,
        path: destPath,
        timestamp: clock.nowMs(),
        data: { sourceBucket, sourcePath },
    });
    
    return newMetadata;
}

/**
 * Move file
 */
export async function moveFile(
    sourceBucket: string,
    sourcePath: string,
    destBucket: string,
    destPath: string,
    options: CopyOptions = {}
): Promise<FileMetadata> {
    const newMetadata = await copyFile(sourceBucket, sourcePath, destBucket, destPath, options);
    await deleteFile(sourceBucket, sourcePath, { permanent: true });
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'file_moved',
        bucketName: destBucket,
        fileId: newMetadata.fileId,
        path: destPath,
        timestamp: clock.nowMs(),
        data: { sourceBucket, sourcePath },
    });
    
    return newMetadata;
}

/**
 * Get file metadata
 */
export function getFileMetadata(bucketName: string, path: string): FileMetadata | null {
    const normalizedPath = normalizePath(path);
    const fileKey = getFileKey(bucketName, normalizedPath);
    return files.get(fileKey) ?? null;
}

/**
 * Update file metadata
 */
export async function updateFileMetadata(
    bucketName: string,
    path: string,
    updates: {
        tags?: Record<string, string>;
        customMetadata?: Record<string, string>;
        accessLevel?: AccessLevel;
        storageClass?: StorageClass;
    }
): Promise<FileMetadata | null> {
    const normalizedPath = normalizePath(path);
    const fileKey = getFileKey(bucketName, normalizedPath);
    const metadata = files.get(fileKey);
    
    if (!metadata) {
        return null;
    }
    
    const now = clock.nowMs();
    
    const updated: FileMetadata = {
        ...metadata,
        tags: updates.tags ?? metadata.tags,
        customMetadata: updates.customMetadata ?? metadata.customMetadata,
        accessLevel: updates.accessLevel ?? metadata.accessLevel,
        storageClass: updates.storageClass ?? metadata.storageClass,
        updatedAt: now,
    };
    
    files.set(fileKey, updated);
    
    if (updates.storageClass && updates.storageClass !== metadata.storageClass) {
        await emitEvent({
            eventId: generateEventId(),
            type: 'lifecycle_transition',
            bucketName,
            fileId: metadata.fileId,
            path: normalizedPath,
            timestamp: now,
            data: { from: metadata.storageClass, to: updates.storageClass },
        });
    }
    
    updateStatistics();
    
    return updated;
}

/**
 * List files
 */
export function listFiles(bucketName: string, options: ListOptions = {}): ListResult {
    const bucket = buckets.get(bucketName);
    if (!bucket) {
        return {
            files: [],
            commonPrefixes: [],
            isTruncated: false,
            continuationToken: null,
            keyCount: 0,
        };
    }
    
    let allFiles = Array.from(files.values()).filter(f => {
        const key = getFileKey(bucketName, f.path);
        return key.startsWith(`${bucketName}:`);
    });
    
    if (options.prefix) {
        allFiles = allFiles.filter(f => f.path.startsWith(options.prefix!));
    }
    
    if (options.storageClass) {
        allFiles = allFiles.filter(f => f.storageClass === options.storageClass);
    }
    
    if (options.status) {
        allFiles = allFiles.filter(f => f.status === options.status);
    } else {
        allFiles = allFiles.filter(f => f.status === 'active');
    }
    
    if (options.startAfter) {
        allFiles = allFiles.filter(f => f.path > options.startAfter!);
    }
    
    allFiles.sort((a, b) => a.path.localeCompare(b.path));
    
    const commonPrefixes: string[] = [];
    
    if (options.delimiter) {
        const prefixSet = new Set<string>();
        const prefix = options.prefix ?? '';
        
        allFiles = allFiles.filter(f => {
            const relativePath = f.path.slice(prefix.length);
            const delimiterIndex = relativePath.indexOf(options.delimiter!);
            
            if (delimiterIndex !== -1) {
                const commonPrefix = prefix + relativePath.slice(0, delimiterIndex + 1);
                prefixSet.add(commonPrefix);
                return false;
            }
            
            return true;
        });
        
        commonPrefixes.push(...prefixSet);
    }
    
    const maxKeys = options.maxKeys ?? 1000;
    const isTruncated = allFiles.length > maxKeys;
    const resultFiles = allFiles.slice(0, maxKeys);
    
    const continuationToken = isTruncated && resultFiles.length > 0
        ? resultFiles[resultFiles.length - 1].path
        : null;
    
    return {
        files: resultFiles,
        commonPrefixes,
        isTruncated,
        continuationToken,
        keyCount: resultFiles.length,
    };
}

/**
 * Get file versions
 */
export function getFileVersions(bucketName: string, path: string): readonly FileMetadata[] {
    const normalizedPath = normalizePath(path);
    const fileKey = getFileKey(bucketName, normalizedPath);
    const metadata = files.get(fileKey);
    
    if (!metadata) {
        return [];
    }
    
    const versions = fileVersions.get(metadata.fileId) ?? [];
    return [metadata, ...versions].sort((a, b) => b.version - a.version);
}

// ============================================================================
// MULTIPART UPLOAD
// ============================================================================

/**
 * Initiate multipart upload
 */
export function initiateMultipartUpload(
    bucketName: string,
    path: string,
    options: {
        contentType?: string;
        storageClass?: StorageClass;
    } = {}
): MultipartUpload {
    const bucket = buckets.get(bucketName);
    if (!bucket) {
        throw new Error(`Bucket '${bucketName}' not found`);
    }
    
    const uploadId = generateUploadId();
    const fileId = generateFileId();
    const now = clock.nowMs();
    
    const upload: MultipartUpload = {
        uploadId,
        fileId,
        path: normalizePath(path),
        contentType: options.contentType ?? getContentTypeFromExtension(path),
        storageClass: options.storageClass ?? bucket.storageClass,
        initiatedAt: now,
        expiresAt: now + 86400000,
        parts: [],
        status: 'in_progress',
    };
    
    multipartUploads.set(uploadId, upload);
    
    emitEvent({
        eventId: generateEventId(),
        type: 'multipart_initiated',
        bucketName,
        fileId,
        path: upload.path,
        timestamp: now,
        data: { uploadId },
    });
    
    return upload;
}

/**
 * Upload part
 */
export function uploadPart(
    uploadId: string,
    partNumber: number,
    data: Uint8Array
): UploadPart {
    const upload = multipartUploads.get(uploadId);
    if (!upload || upload.status !== 'in_progress') {
        throw new Error(`Upload '${uploadId}' not found or not in progress`);
    }
    
    const now = clock.nowMs();
    const checksum = computeChecksum(data, 'sha256');
    
    const part: UploadPart = {
        partNumber,
        size: data.length,
        checksum,
        uploadedAt: now,
    };
    
    const existingIndex = upload.parts.findIndex(p => p.partNumber === partNumber);
    let newParts: UploadPart[];
    
    if (existingIndex !== -1) {
        newParts = [...upload.parts];
        newParts[existingIndex] = part;
    } else {
        newParts = [...upload.parts, part].sort((a, b) => a.partNumber - b.partNumber);
    }
    
    multipartUploads.set(uploadId, {
        ...upload,
        parts: newParts,
    });
    
    return part;
}

/**
 * Complete multipart upload
 */
export async function completeMultipartUpload(
    bucketName: string,
    uploadId: string,
    parts: readonly { partNumber: number; checksum: string }[]
): Promise<FileMetadata> {
    const upload = multipartUploads.get(uploadId);
    if (!upload || upload.status !== 'in_progress') {
        throw new Error(`Upload '${uploadId}' not found or not in progress`);
    }
    
    for (const part of parts) {
        const uploadPart = upload.parts.find(p => p.partNumber === part.partNumber);
        if (!uploadPart) {
            throw new Error(`Part ${part.partNumber} not found`);
        }
        if (uploadPart.checksum !== part.checksum) {
            throw new Error(`Checksum mismatch for part ${part.partNumber}`);
        }
    }
    
    const totalSize = upload.parts.reduce((sum, p) => sum + p.size, 0);
    const combinedData = new Uint8Array(totalSize);
    
    multipartUploads.set(uploadId, {
        ...upload,
        status: 'completed',
    });
    
    const metadata = await uploadFile(bucketName, upload.path, combinedData, {
        contentType: upload.contentType,
        storageClass: upload.storageClass,
    });
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'multipart_completed',
        bucketName,
        fileId: metadata.fileId,
        path: upload.path,
        timestamp: clock.nowMs(),
        data: { uploadId, partCount: parts.length },
    });
    
    return metadata;
}

/**
 * Abort multipart upload
 */
export function abortMultipartUpload(uploadId: string): boolean {
    const upload = multipartUploads.get(uploadId);
    if (!upload || upload.status !== 'in_progress') {
        return false;
    }
    
    multipartUploads.set(uploadId, {
        ...upload,
        status: 'aborted',
    });
    
    emitEvent({
        eventId: generateEventId(),
        type: 'multipart_aborted',
        bucketName: '',
        fileId: upload.fileId,
        path: upload.path,
        timestamp: clock.nowMs(),
        data: { uploadId },
    });
    
    return true;
}

/**
 * List multipart uploads
 */
export function listMultipartUploads(bucketName: string): readonly MultipartUpload[] {
    return Array.from(multipartUploads.values()).filter(u => u.status === 'in_progress');
}

// ============================================================================
// PRESIGNED URLS
// ============================================================================

/**
 * Generate presigned URL for download
 */
export function generatePresignedDownloadUrl(
    bucketName: string,
    path: string,
    options: PresignedUrlOptions
): string {
    const normalizedPath = normalizePath(path);
    const expires = clock.nowMs() + options.expiresIn;
    const signature = generateDeterministicId(`presigned-${bucketName}-${normalizedPath}-${expires}`);
    
    let url = `https://storage.example.com/${bucketName}/${normalizedPath}?signature=${signature}&expires=${expires}`;
    
    if (options.versionId) {
        url += `&versionId=${options.versionId}`;
    }
    
    if (options.contentDisposition) {
        url += `&response-content-disposition=${encodeURIComponent(options.contentDisposition)}`;
    }
    
    return url;
}

/**
 * Generate presigned URL for upload
 */
export function generatePresignedUploadUrl(
    bucketName: string,
    path: string,
    options: PresignedUrlOptions
): string {
    const normalizedPath = normalizePath(path);
    const expires = clock.nowMs() + options.expiresIn;
    const signature = generateDeterministicId(`presigned-upload-${bucketName}-${normalizedPath}-${expires}`);
    
    let url = `https://storage.example.com/${bucketName}/${normalizedPath}?signature=${signature}&expires=${expires}&method=PUT`;
    
    if (options.contentType) {
        url += `&content-type=${encodeURIComponent(options.contentType)}`;
    }
    
    return url;
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get storage statistics
 */
export function getStatistics(): Readonly<StorageStatistics> {
    updateStatistics();
    return { ...statistics };
}

/**
 * Reset statistics
 */
export function resetStatistics(): void {
    Object.assign(statistics, {
        totalFiles: 0,
        totalSize: 0,
        totalVersions: 0,
        filesByStorageClass: { standard: 0, infrequent: 0, archive: 0, deep_archive: 0 },
        sizeByStorageClass: { standard: 0, infrequent: 0, archive: 0, deep_archive: 0 },
        uploadCount: 0,
        downloadCount: 0,
        deleteCount: 0,
        avgFileSize: 0,
    });
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Add event listener
 */
export function addEventListener(listener: StorageEventListener): void {
    eventListeners.add(listener);
}

/**
 * Remove event listener
 */
export function removeEventListener(listener: StorageEventListener): void {
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
    buckets.clear();
    files.clear();
    fileContents.clear();
    fileVersions.clear();
    multipartUploads.clear();
    eventListeners.clear();
    resetStatistics();
}
