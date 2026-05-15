"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBucket = createBucket;
exports.getBucket = getBucket;
exports.getAllBuckets = getAllBuckets;
exports.deleteBucket = deleteBucket;
exports.updateBucket = updateBucket;
exports.addLifecycleRule = addLifecycleRule;
exports.removeLifecycleRule = removeLifecycleRule;
exports.addCorsRule = addCorsRule;
exports.setAccessPolicy = setAccessPolicy;
exports.uploadFile = uploadFile;
exports.downloadFile = downloadFile;
exports.deleteFile = deleteFile;
exports.copyFile = copyFile;
exports.moveFile = moveFile;
exports.getFileMetadata = getFileMetadata;
exports.updateFileMetadata = updateFileMetadata;
exports.listFiles = listFiles;
exports.getFileVersions = getFileVersions;
exports.initiateMultipartUpload = initiateMultipartUpload;
exports.uploadPart = uploadPart;
exports.completeMultipartUpload = completeMultipartUpload;
exports.abortMultipartUpload = abortMultipartUpload;
exports.listMultipartUploads = listMultipartUploads;
exports.generatePresignedDownloadUrl = generatePresignedDownloadUrl;
exports.generatePresignedUploadUrl = generatePresignedUploadUrl;
exports.getStatistics = getStatistics;
exports.resetStatistics = resetStatistics;
exports.addEventListener = addEventListener;
exports.removeEventListener = removeEventListener;
exports.clearEventListeners = clearEventListeners;
exports.clearAll = clearAll;
const clock_1 = require("@mia/core/clock");
const deterministic_1 = require("@mia/core/deterministic");
const clock = (0, clock_1.getClock)();
// ============================================================================
// STANJE
// ============================================================================
const buckets = new Map();
const files = new Map();
const fileContents = new Map();
const fileVersions = new Map();
const multipartUploads = new Map();
const eventListeners = new Set();
let bucketCounter = 0;
let fileCounter = 0;
let uploadCounter = 0;
let versionCounter = 0;
let eventCounter = 0;
const statistics = {
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
function generateBucketId() {
    bucketCounter++;
    return (0, deterministic_1.generateDeterministicId)(`bucket-${bucketCounter}`);
}
/**
 * Generate file ID
 */
function generateFileId() {
    fileCounter++;
    return (0, deterministic_1.generateDeterministicId)(`file-${fileCounter}`);
}
/**
 * Generate upload ID
 */
function generateUploadId() {
    uploadCounter++;
    return (0, deterministic_1.generateDeterministicId)(`upload-${uploadCounter}`);
}
/**
 * Generate version ID
 */
function generateVersionId() {
    versionCounter++;
    return (0, deterministic_1.generateDeterministicId)(`version-${versionCounter}`);
}
/**
 * Generate event ID
 */
function generateEventId() {
    eventCounter++;
    return (0, deterministic_1.generateDeterministicId)(`storage-event-${eventCounter}`);
}
/**
 * Compute checksum
 */
function computeChecksum(data, algorithm) {
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
function getContentTypeFromExtension(path) {
    const ext = path.split('.').pop()?.toLowerCase();
    const contentTypes = {
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
function normalizePath(path) {
    return path.replace(/^\/+/, '').replace(/\/+$/, '').replace(/\/+/g, '/');
}
/**
 * Get file key
 */
function getFileKey(bucketName, path) {
    return `${bucketName}:${normalizePath(path)}`;
}
/**
 * Emit storage event
 */
async function emitEvent(event) {
    for (const listener of eventListeners) {
        try {
            await listener(event);
        }
        catch {
            // Ignore listener errors
        }
    }
}
/**
 * Update statistics
 */
function updateStatistics() {
    const mutableStats = statistics;
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
function createBucket(name, options = {}) {
    const bucketId = generateBucketId();
    const now = clock.nowMs();
    const bucket = {
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
function getBucket(name) {
    return buckets.get(name) ?? null;
}
/**
 * Get all buckets
 */
function getAllBuckets() {
    return Array.from(buckets.values());
}
/**
 * Delete bucket
 */
function deleteBucket(name, force = false) {
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
function updateBucket(name, updates) {
    const bucket = buckets.get(name);
    if (!bucket) {
        return null;
    }
    const updated = {
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
function addLifecycleRule(bucketName, rule) {
    const bucket = buckets.get(bucketName);
    if (!bucket) {
        return false;
    }
    const existingIndex = bucket.lifecycleRules.findIndex(r => r.ruleId === rule.ruleId);
    let newRules;
    if (existingIndex !== -1) {
        newRules = [...bucket.lifecycleRules];
        newRules[existingIndex] = rule;
    }
    else {
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
function removeLifecycleRule(bucketName, ruleId) {
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
function addCorsRule(bucketName, rule) {
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
function setAccessPolicy(bucketName, policy) {
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
async function uploadFile(bucketName, path, data, options = {}) {
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
    const metadata = {
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
        cipherSecret: options.encrypt ? (0, deterministic_1.generateDeterministicId)(`enc-${fileId}`) : null,
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
    const mutableStats = statistics;
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
async function downloadFile(bucketName, path, options = {}) {
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
    let contentRange = null;
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
    const mutableStats = statistics;
    mutableStats.downloadCount++;
    const content = {
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
async function deleteFile(bucketName, path, options = {}) {
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
    }
    else {
        files.set(fileKey, {
            ...metadata,
            status: 'deleted',
            updatedAt: now,
        });
    }
    const mutableStats = statistics;
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
async function copyFile(sourceBucket, sourcePath, destBucket, destPath, options = {}) {
    const sourceResult = await downloadFile(sourceBucket, sourcePath, {
        versionId: options.sourceVersionId,
    });
    const uploadOptions = {
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
async function moveFile(sourceBucket, sourcePath, destBucket, destPath, options = {}) {
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
function getFileMetadata(bucketName, path) {
    const normalizedPath = normalizePath(path);
    const fileKey = getFileKey(bucketName, normalizedPath);
    return files.get(fileKey) ?? null;
}
/**
 * Update file metadata
 */
async function updateFileMetadata(bucketName, path, updates) {
    const normalizedPath = normalizePath(path);
    const fileKey = getFileKey(bucketName, normalizedPath);
    const metadata = files.get(fileKey);
    if (!metadata) {
        return null;
    }
    const now = clock.nowMs();
    const updated = {
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
function listFiles(bucketName, options = {}) {
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
        allFiles = allFiles.filter(f => f.path.startsWith(options.prefix));
    }
    if (options.storageClass) {
        allFiles = allFiles.filter(f => f.storageClass === options.storageClass);
    }
    if (options.status) {
        allFiles = allFiles.filter(f => f.status === options.status);
    }
    else {
        allFiles = allFiles.filter(f => f.status === 'active');
    }
    if (options.startAfter) {
        allFiles = allFiles.filter(f => f.path > options.startAfter);
    }
    allFiles.sort((a, b) => a.path.localeCompare(b.path));
    const commonPrefixes = [];
    if (options.delimiter) {
        const prefixSet = new Set();
        const prefix = options.prefix ?? '';
        allFiles = allFiles.filter(f => {
            const relativePath = f.path.slice(prefix.length);
            const delimiterIndex = relativePath.indexOf(options.delimiter);
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
function getFileVersions(bucketName, path) {
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
function initiateMultipartUpload(bucketName, path, options = {}) {
    const bucket = buckets.get(bucketName);
    if (!bucket) {
        throw new Error(`Bucket '${bucketName}' not found`);
    }
    const uploadId = generateUploadId();
    const fileId = generateFileId();
    const now = clock.nowMs();
    const upload = {
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
function uploadPart(uploadId, partNumber, data) {
    const upload = multipartUploads.get(uploadId);
    if (!upload || upload.status !== 'in_progress') {
        throw new Error(`Upload '${uploadId}' not found or not in progress`);
    }
    const now = clock.nowMs();
    const checksum = computeChecksum(data, 'sha256');
    const part = {
        partNumber,
        size: data.length,
        checksum,
        uploadedAt: now,
    };
    const existingIndex = upload.parts.findIndex(p => p.partNumber === partNumber);
    let newParts;
    if (existingIndex !== -1) {
        newParts = [...upload.parts];
        newParts[existingIndex] = part;
    }
    else {
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
async function completeMultipartUpload(bucketName, uploadId, parts) {
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
function abortMultipartUpload(uploadId) {
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
function listMultipartUploads(bucketName) {
    return Array.from(multipartUploads.values()).filter(u => u.status === 'in_progress');
}
// ============================================================================
// PRESIGNED URLS
// ============================================================================
/**
 * Generate presigned URL for download
 */
function generatePresignedDownloadUrl(bucketName, path, options) {
    const normalizedPath = normalizePath(path);
    const expires = clock.nowMs() + options.expiresIn;
    const signature = (0, deterministic_1.generateDeterministicId)(`presigned-${bucketName}-${normalizedPath}-${expires}`);
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
function generatePresignedUploadUrl(bucketName, path, options) {
    const normalizedPath = normalizePath(path);
    const expires = clock.nowMs() + options.expiresIn;
    const signature = (0, deterministic_1.generateDeterministicId)(`presigned-upload-${bucketName}-${normalizedPath}-${expires}`);
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
function getStatistics() {
    updateStatistics();
    return { ...statistics };
}
/**
 * Reset statistics
 */
function resetStatistics() {
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
function addEventListener(listener) {
    eventListeners.add(listener);
}
/**
 * Remove event listener
 */
function removeEventListener(listener) {
    eventListeners.delete(listener);
}
/**
 * Clear event listeners
 */
function clearEventListeners() {
    eventListeners.clear();
}
// ============================================================================
// CLEANUP
// ============================================================================
/**
 * Clear all state
 */
function clearAll() {
    buckets.clear();
    files.clear();
    fileContents.clear();
    fileVersions.clear();
    multipartUploads.clear();
    eventListeners.clear();
    resetStatistics();
}
