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
    readonly range?: {
        start: number;
        end: number;
    };
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
    readonly contentRange: {
        start: number;
        end: number;
        total: number;
    } | null;
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
export type StorageEventType = 'file_created' | 'file_updated' | 'file_deleted' | 'file_restored' | 'file_archived' | 'file_copied' | 'file_moved' | 'version_created' | 'version_deleted' | 'multipart_initiated' | 'multipart_completed' | 'multipart_aborted' | 'lifecycle_transition' | 'lifecycle_expiration';
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
/**
 * Create bucket
 */
export declare function createBucket(name: string, options?: {
    region?: string;
    storageClass?: StorageClass;
    versioningEnabled?: boolean;
    encryptionEnabled?: boolean;
    encryptionAlgorithm?: string;
}): BucketConfig;
/**
 * Get bucket
 */
export declare function getBucket(name: string): BucketConfig | null;
/**
 * Get all buckets
 */
export declare function getAllBuckets(): readonly BucketConfig[];
/**
 * Delete bucket
 */
export declare function deleteBucket(name: string, force?: boolean): boolean;
/**
 * Update bucket configuration
 */
export declare function updateBucket(name: string, updates: Partial<Pick<BucketConfig, 'versioningEnabled' | 'encryptionEnabled' | 'encryptionAlgorithm'>>): BucketConfig | null;
/**
 * Add lifecycle rule
 */
export declare function addLifecycleRule(bucketName: string, rule: LifecycleRule): boolean;
/**
 * Remove lifecycle rule
 */
export declare function removeLifecycleRule(bucketName: string, ruleId: string): boolean;
/**
 * Add CORS rule
 */
export declare function addCorsRule(bucketName: string, rule: CorsRule): boolean;
/**
 * Set access policy
 */
export declare function setAccessPolicy(bucketName: string, policy: AccessPolicy): boolean;
/**
 * Upload file
 */
export declare function uploadFile(bucketName: string, path: string, data: Uint8Array, options?: UploadOptions): Promise<FileMetadata>;
/**
 * Download file
 */
export declare function downloadFile(bucketName: string, path: string, options?: DownloadOptions): Promise<DownloadResult>;
/**
 * Delete file
 */
export declare function deleteFile(bucketName: string, path: string, options?: {
    versionId?: string;
    permanent?: boolean;
}): Promise<boolean>;
/**
 * Copy file
 */
export declare function copyFile(sourceBucket: string, sourcePath: string, destBucket: string, destPath: string, options?: CopyOptions): Promise<FileMetadata>;
/**
 * Move file
 */
export declare function moveFile(sourceBucket: string, sourcePath: string, destBucket: string, destPath: string, options?: CopyOptions): Promise<FileMetadata>;
/**
 * Get file metadata
 */
export declare function getFileMetadata(bucketName: string, path: string): FileMetadata | null;
/**
 * Update file metadata
 */
export declare function updateFileMetadata(bucketName: string, path: string, updates: {
    tags?: Record<string, string>;
    customMetadata?: Record<string, string>;
    accessLevel?: AccessLevel;
    storageClass?: StorageClass;
}): Promise<FileMetadata | null>;
/**
 * List files
 */
export declare function listFiles(bucketName: string, options?: ListOptions): ListResult;
/**
 * Get file versions
 */
export declare function getFileVersions(bucketName: string, path: string): readonly FileMetadata[];
/**
 * Initiate multipart upload
 */
export declare function initiateMultipartUpload(bucketName: string, path: string, options?: {
    contentType?: string;
    storageClass?: StorageClass;
}): MultipartUpload;
/**
 * Upload part
 */
export declare function uploadPart(uploadId: string, partNumber: number, data: Uint8Array): UploadPart;
/**
 * Complete multipart upload
 */
export declare function completeMultipartUpload(bucketName: string, uploadId: string, parts: readonly {
    partNumber: number;
    checksum: string;
}[]): Promise<FileMetadata>;
/**
 * Abort multipart upload
 */
export declare function abortMultipartUpload(uploadId: string): boolean;
/**
 * List multipart uploads
 */
export declare function listMultipartUploads(bucketName: string): readonly MultipartUpload[];
/**
 * Generate presigned URL for download
 */
export declare function generatePresignedDownloadUrl(bucketName: string, path: string, options: PresignedUrlOptions): string;
/**
 * Generate presigned URL for upload
 */
export declare function generatePresignedUploadUrl(bucketName: string, path: string, options: PresignedUrlOptions): string;
/**
 * Get storage statistics
 */
export declare function getStatistics(): Readonly<StorageStatistics>;
/**
 * Reset statistics
 */
export declare function resetStatistics(): void;
/**
 * Add event listener
 */
export declare function addEventListener(listener: StorageEventListener): void;
/**
 * Remove event listener
 */
export declare function removeEventListener(listener: StorageEventListener): void;
/**
 * Clear event listeners
 */
export declare function clearEventListeners(): void;
/**
 * Clear all state
 */
export declare function clearAll(): void;
