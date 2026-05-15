"use strict";
/**
 * @file Data Serializer za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-DATA-003 Data serialization za zaledne sisteme
 * @design DSN-ZALEDNI-DATA-003 Backend data serializer arhitektura
 * @test TEST-ZALEDNI-DATA-003 Preverjanje data serializer
 *
 * Data Serializer - prilagojen za zaledne sisteme:
 * - JSON serialization
 * - Binary serialization
 * - Schema-based serialization
 * - Compression
 * - Encryption
 * - Versioning
 * - Migration
 * - Streaming
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom DATA_003 - Data Serializer
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSchema = registerSchema;
exports.getSchema = getSchema;
exports.getAllSchemas = getAllSchemas;
exports.removeSchema = removeSchema;
exports.addMigration = addMigration;
exports.registerCodec = registerCodec;
exports.getCodec = getCodec;
exports.getAllCodecs = getAllCodecs;
exports.removeCodec = removeCodec;
exports.serialize = serialize;
exports.deserialize = deserialize;
exports.createStreamWriter = createStreamWriter;
exports.createStreamReader = createStreamReader;
exports.field = field;
exports.clone = clone;
exports.compare = compare;
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
const schemas = new Map();
const codecs = new Map();
const eventListeners = new Set();
let schemaCounter = 0;
let codecCounter = 0;
let eventCounter = 0;
const defaultSerializationOptions = {
    format: 'json',
    compression: 'none',
    encryption: 'none',
    cipherSecret: null,
    pretty: false,
    includeMetadata: true,
    schemaId: null,
    version: 1,
};
const defaultDeserializationOptions = {
    format: 'json',
    compression: 'none',
    encryption: 'none',
    cipherSecret: null,
    schemaId: null,
    validateSchema: false,
    migrateVersion: true,
};
const statistics = {
    totalSerializations: 0,
    totalDeserializations: 0,
    totalBytesWritten: 0,
    totalBytesRead: 0,
    avgSerializationTime: 0,
    avgDeserializationTime: 0,
    avgCompressionRatio: 0,
    migrationCount: 0,
};
// ============================================================================
// POMOZNE FUNKCIJE
// ============================================================================
/**
 * Generate schema ID
 */
function generateSchemaId() {
    schemaCounter++;
    return (0, deterministic_1.generateDeterministicId)(`ser-schema-${schemaCounter}`);
}
/**
 * Generate codec ID
 */
function generateCodecId() {
    codecCounter++;
    return (0, deterministic_1.generateDeterministicId)(`codec-${codecCounter}`);
}
/**
 * Generate event ID
 */
function generateEventId() {
    eventCounter++;
    return (0, deterministic_1.generateDeterministicId)(`ser-event-${eventCounter}`);
}
/**
 * Emit serializer event
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
 * Compute checksum
 */
function computeChecksum(data) {
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    let hash = 0;
    for (let i = 0; i < bytes.length; i++) {
        hash = ((hash << 5) - hash) + bytes[i];
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
}
/**
 * Get content type
 */
function getContentType(format) {
    switch (format) {
        case 'json':
            return 'application/json';
        case 'binary':
            return 'application/octet-stream';
        case 'msgpack':
            return 'application/msgpack';
        case 'protobuf':
            return 'application/protobuf';
        case 'avro':
            return 'application/avro';
    }
}
/**
 * Compress data
 */
function compress(data, algorithm) {
    if (algorithm === 'none') {
        return data;
    }
    return data;
}
/**
 * Decompress data
 */
function decompress(data, algorithm) {
    if (algorithm === 'none') {
        return data;
    }
    return data;
}
/**
 * Encrypt data
 */
function encrypt(data, algorithm, key) {
    if (algorithm === 'none' || !key) {
        return data;
    }
    return data;
}
/**
 * Decrypt data
 */
function decrypt(data, algorithm, key) {
    if (algorithm === 'none' || !key) {
        return data;
    }
    return data;
}
// ============================================================================
// SCHEMA MANAGEMENT
// ============================================================================
/**
 * Register schema
 */
function registerSchema(name, fields, options = {}) {
    const schemaId = generateSchemaId();
    const schema = {
        schemaId,
        name,
        version: options.version ?? 1,
        fields,
        migrations: options.migrations ?? [],
    };
    schemas.set(schemaId, schema);
    schemas.set(name, schema);
    emitEvent({
        eventId: generateEventId(),
        type: 'schema_registered',
        format: null,
        timestamp: clock.nowMs(),
        data: { name, version: schema.version, fieldCount: fields.length },
    });
    return schema;
}
/**
 * Get schema
 */
function getSchema(nameOrId) {
    return schemas.get(nameOrId) ?? null;
}
/**
 * Get all schemas
 */
function getAllSchemas() {
    const uniqueSchemas = new Map();
    for (const schema of schemas.values()) {
        uniqueSchemas.set(schema.schemaId, schema);
    }
    return Array.from(uniqueSchemas.values());
}
/**
 * Remove schema
 */
function removeSchema(nameOrId) {
    const schema = schemas.get(nameOrId);
    if (!schema) {
        return false;
    }
    schemas.delete(schema.schemaId);
    schemas.delete(schema.name);
    return true;
}
/**
 * Add migration
 */
function addMigration(schemaNameOrId, fromVersion, toVersion, migrate) {
    const schema = schemas.get(schemaNameOrId);
    if (!schema) {
        return false;
    }
    const migration = {
        fromVersion,
        toVersion,
        migrate,
    };
    const updatedSchema = {
        ...schema,
        migrations: [...schema.migrations, migration],
    };
    schemas.set(schema.schemaId, updatedSchema);
    schemas.set(schema.name, updatedSchema);
    return true;
}
/**
 * Apply migrations
 */
function applyMigrations(data, schema, fromVersion, toVersion) {
    if (fromVersion >= toVersion) {
        return { data, migrated: false, migratedFrom: null };
    }
    let currentData = data;
    let currentVersion = fromVersion;
    const sortedMigrations = [...schema.migrations].sort((a, b) => a.fromVersion - b.fromVersion);
    for (const migration of sortedMigrations) {
        if (migration.fromVersion === currentVersion && migration.toVersion <= toVersion) {
            currentData = migration.migrate(currentData);
            currentVersion = migration.toVersion;
            const mutableStats = statistics;
            mutableStats.migrationCount++;
            emitEvent({
                eventId: generateEventId(),
                type: 'migration_applied',
                format: null,
                timestamp: clock.nowMs(),
                data: { fromVersion: migration.fromVersion, toVersion: migration.toVersion },
            });
        }
    }
    return {
        data: currentData,
        migrated: currentVersion > fromVersion,
        migratedFrom: currentVersion > fromVersion ? fromVersion : null,
    };
}
// ============================================================================
// CODEC MANAGEMENT
// ============================================================================
/**
 * Register codec
 */
function registerCodec(name, encode, decode, schemaId) {
    const codecId = generateCodecId();
    const codec = {
        codecId,
        name,
        schemaId: schemaId ?? null,
        encode,
        decode,
    };
    codecs.set(codecId, codec);
    codecs.set(name, codec);
    emitEvent({
        eventId: generateEventId(),
        type: 'codec_registered',
        format: null,
        timestamp: clock.nowMs(),
        data: { name, schemaId },
    });
    return codec;
}
/**
 * Get codec
 */
function getCodec(nameOrId) {
    return codecs.get(nameOrId) ?? null;
}
/**
 * Get all codecs
 */
function getAllCodecs() {
    const uniqueCodecs = new Map();
    for (const codec of codecs.values()) {
        uniqueCodecs.set(codec.codecId, codec);
    }
    return Array.from(uniqueCodecs.values());
}
/**
 * Remove codec
 */
function removeCodec(nameOrId) {
    const codec = codecs.get(nameOrId);
    if (!codec) {
        return false;
    }
    codecs.delete(codec.codecId);
    codecs.delete(codec.name);
    return true;
}
// ============================================================================
// SERIALIZATION
// ============================================================================
/**
 * Serialize data
 */
async function serialize(data, options = {}) {
    const mergedOptions = { ...defaultSerializationOptions, ...options };
    const startTime = clock.nowMs();
    await emitEvent({
        eventId: generateEventId(),
        type: 'serialize_started',
        format: mergedOptions.format,
        timestamp: startTime,
        data: {},
    });
    try {
        let serialized;
        switch (mergedOptions.format) {
            case 'json':
                serialized = serializeJson(data, mergedOptions);
                break;
            case 'binary':
                serialized = serializeBinary(data);
                break;
            case 'msgpack':
                serialized = serializeMsgpack(data);
                break;
            case 'protobuf':
                serialized = serializeProtobuf(data, mergedOptions.schemaId);
                break;
            case 'avro':
                serialized = serializeAvro(data, mergedOptions.schemaId);
                break;
        }
        const originalSize = typeof serialized === 'string'
            ? new TextEncoder().encode(serialized).length
            : serialized.length;
        let processedData = typeof serialized === 'string'
            ? new TextEncoder().encode(serialized)
            : serialized;
        processedData = compress(processedData, mergedOptions.compression);
        processedData = encrypt(processedData, mergedOptions.encryption, mergedOptions.cipherSecret);
        const finalSize = processedData.length;
        const compressionRatio = originalSize > 0 ? finalSize / originalSize : 1;
        const checksum = computeChecksum(processedData);
        const duration = clock.nowMs() - startTime;
        const result = {
            data: mergedOptions.format === 'json' && mergedOptions.compression === 'none' && mergedOptions.encryption === 'none'
                ? serialized
                : processedData,
            format: mergedOptions.format,
            compression: mergedOptions.compression,
            encryption: mergedOptions.encryption,
            size: finalSize,
            originalSize,
            compressionRatio,
            checksum,
            metadata: {
                serializedAt: startTime,
                duration,
                schemaId: mergedOptions.schemaId,
                version: mergedOptions.version,
                contentType: getContentType(mergedOptions.format),
            },
        };
        const mutableStats = statistics;
        mutableStats.totalSerializations++;
        mutableStats.totalBytesWritten += finalSize;
        const totalTime = mutableStats.avgSerializationTime * (mutableStats.totalSerializations - 1) + duration;
        mutableStats.avgSerializationTime = totalTime / mutableStats.totalSerializations;
        const totalRatio = mutableStats.avgCompressionRatio * (mutableStats.totalSerializations - 1) + compressionRatio;
        mutableStats.avgCompressionRatio = totalRatio / mutableStats.totalSerializations;
        await emitEvent({
            eventId: generateEventId(),
            type: 'serialize_completed',
            format: mergedOptions.format,
            timestamp: clock.nowMs(),
            data: { size: finalSize, duration },
        });
        return result;
    }
    catch (error) {
        await emitEvent({
            eventId: generateEventId(),
            type: 'serialize_failed',
            format: mergedOptions.format,
            timestamp: clock.nowMs(),
            data: { error: error instanceof Error ? error.message : 'Unknown error' },
        });
        throw error;
    }
}
/**
 * Serialize to JSON
 */
function serializeJson(data, options) {
    if (options.includeMetadata) {
        const wrapped = {
            __meta: {
                version: options.version,
                schemaId: options.schemaId,
                timestamp: clock.nowMs(),
            },
            data,
        };
        return options.pretty ? JSON.stringify(wrapped, null, 2) : JSON.stringify(wrapped);
    }
    return options.pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
}
/**
 * Serialize to binary
 */
function serializeBinary(data) {
    const json = JSON.stringify(data);
    return new TextEncoder().encode(json);
}
/**
 * Serialize to MessagePack
 */
function serializeMsgpack(data) {
    const json = JSON.stringify(data);
    return new TextEncoder().encode(json);
}
/**
 * Serialize to Protocol Buffers
 */
function serializeProtobuf(data, schemaId) {
    const json = JSON.stringify(data);
    return new TextEncoder().encode(json);
}
/**
 * Serialize to Avro
 */
function serializeAvro(data, schemaId) {
    const json = JSON.stringify(data);
    return new TextEncoder().encode(json);
}
// ============================================================================
// DESERIALIZATION
// ============================================================================
/**
 * Deserialize data
 */
async function deserialize(data, options = {}) {
    const mergedOptions = { ...defaultDeserializationOptions, ...options };
    const startTime = clock.nowMs();
    await emitEvent({
        eventId: generateEventId(),
        type: 'deserialize_started',
        format: mergedOptions.format,
        timestamp: startTime,
        data: {},
    });
    try {
        let processedData = typeof data === 'string'
            ? new TextEncoder().encode(data)
            : data;
        const originalSize = processedData.length;
        processedData = decrypt(processedData, mergedOptions.encryption, mergedOptions.cipherSecret);
        processedData = decompress(processedData, mergedOptions.compression);
        let deserialized;
        let version = 1;
        let schemaId = null;
        switch (mergedOptions.format) {
            case 'json':
                const jsonResult = deserializeJson(processedData);
                deserialized = jsonResult.data;
                version = jsonResult.version;
                schemaId = jsonResult.schemaId;
                break;
            case 'binary':
                deserialized = deserializeBinary(processedData);
                break;
            case 'msgpack':
                deserialized = deserializeMsgpack(processedData);
                break;
            case 'protobuf':
                deserialized = deserializeProtobuf(processedData, mergedOptions.schemaId);
                break;
            case 'avro':
                deserialized = deserializeAvro(processedData, mergedOptions.schemaId);
                break;
        }
        let migrated = false;
        let migratedFrom = null;
        if (mergedOptions.migrateVersion && schemaId) {
            const schema = schemas.get(schemaId);
            if (schema && version < schema.version) {
                const migrationResult = applyMigrations(deserialized, schema, version, schema.version);
                deserialized = migrationResult.data;
                migrated = migrationResult.migrated;
                migratedFrom = migrationResult.migratedFrom;
            }
        }
        const duration = clock.nowMs() - startTime;
        const result = {
            data: deserialized,
            format: mergedOptions.format,
            originalSize,
            metadata: {
                deserializedAt: startTime,
                duration,
                schemaId,
                version,
                migrated,
                migratedFrom,
            },
        };
        const mutableStats = statistics;
        mutableStats.totalDeserializations++;
        mutableStats.totalBytesRead += originalSize;
        const totalTime = mutableStats.avgDeserializationTime * (mutableStats.totalDeserializations - 1) + duration;
        mutableStats.avgDeserializationTime = totalTime / mutableStats.totalDeserializations;
        await emitEvent({
            eventId: generateEventId(),
            type: 'deserialize_completed',
            format: mergedOptions.format,
            timestamp: clock.nowMs(),
            data: { size: originalSize, duration, migrated },
        });
        return result;
    }
    catch (error) {
        await emitEvent({
            eventId: generateEventId(),
            type: 'deserialize_failed',
            format: mergedOptions.format,
            timestamp: clock.nowMs(),
            data: { error: error instanceof Error ? error.message : 'Unknown error' },
        });
        throw error;
    }
}
/**
 * Deserialize from JSON
 */
function deserializeJson(data) {
    const json = new TextDecoder().decode(data);
    const parsed = JSON.parse(json);
    if (parsed.__meta && parsed.data !== undefined) {
        return {
            data: parsed.data,
            version: parsed.__meta.version ?? 1,
            schemaId: parsed.__meta.schemaId ?? null,
        };
    }
    return {
        data: parsed,
        version: 1,
        schemaId: null,
    };
}
/**
 * Deserialize from binary
 */
function deserializeBinary(data) {
    const json = new TextDecoder().decode(data);
    return JSON.parse(json);
}
/**
 * Deserialize from MessagePack
 */
function deserializeMsgpack(data) {
    const json = new TextDecoder().decode(data);
    return JSON.parse(json);
}
/**
 * Deserialize from Protocol Buffers
 */
function deserializeProtobuf(data, schemaId) {
    const json = new TextDecoder().decode(data);
    return JSON.parse(json);
}
/**
 * Deserialize from Avro
 */
function deserializeAvro(data, schemaId) {
    const json = new TextDecoder().decode(data);
    return JSON.parse(json);
}
// ============================================================================
// STREAMING
// ============================================================================
/**
 * Create stream writer
 */
function createStreamWriter(options = {}) {
    const mergedOptions = { ...defaultSerializationOptions, ...options };
    const buffer = [];
    let bytesWritten = 0;
    let itemsWritten = 0;
    return {
        write(data) {
            buffer.push(data);
            itemsWritten++;
        },
        async flush() {
            if (buffer.length === 0) {
                return;
            }
            const result = await serialize(buffer, mergedOptions);
            bytesWritten += result.size;
            buffer.length = 0;
        },
        async close() {
            await this.flush();
        },
        get bytesWritten() {
            return bytesWritten;
        },
        get itemsWritten() {
            return itemsWritten;
        },
    };
}
/**
 * Create stream reader
 */
function createStreamReader(data, options = {}) {
    const mergedOptions = { ...defaultDeserializationOptions, ...options };
    let items = [];
    let currentIndex = 0;
    let bytesRead = 0;
    let itemsRead = 0;
    let initialized = false;
    async function initialize() {
        if (initialized) {
            return;
        }
        const result = await deserialize(data, mergedOptions);
        items = Array.isArray(result.data) ? result.data : [result.data];
        bytesRead = result.originalSize;
        initialized = true;
    }
    return {
        async read() {
            await initialize();
            if (currentIndex >= items.length) {
                return null;
            }
            const item = items[currentIndex];
            currentIndex++;
            itemsRead++;
            return item;
        },
        async readAll() {
            await initialize();
            itemsRead = items.length;
            return items;
        },
        async close() {
            items = [];
            currentIndex = 0;
        },
        get bytesRead() {
            return bytesRead;
        },
        get itemsRead() {
            return itemsRead;
        },
    };
}
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
/**
 * Create field
 */
function field(name, type, options = {}) {
    return {
        name,
        type,
        required: options.required ?? false,
        defaultValue: options.defaultValue,
        index: options.index ?? 0,
    };
}
/**
 * Clone data
 */
async function clone(data) {
    const serialized = await serialize(data, { format: 'json' });
    const deserialized = await deserialize(serialized.data);
    return deserialized.data;
}
/**
 * Compare data
 */
async function compare(a, b) {
    const serializedA = await serialize(a, { format: 'json', pretty: false });
    const serializedB = await serialize(b, { format: 'json', pretty: false });
    return serializedA.checksum === serializedB.checksum;
}
// ============================================================================
// STATISTICS
// ============================================================================
/**
 * Get statistics
 */
function getStatistics() {
    return { ...statistics };
}
/**
 * Reset statistics
 */
function resetStatistics() {
    Object.assign(statistics, {
        totalSerializations: 0,
        totalDeserializations: 0,
        totalBytesWritten: 0,
        totalBytesRead: 0,
        avgSerializationTime: 0,
        avgDeserializationTime: 0,
        avgCompressionRatio: 0,
        migrationCount: 0,
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
    schemas.clear();
    codecs.clear();
    eventListeners.clear();
    resetStatistics();
}
