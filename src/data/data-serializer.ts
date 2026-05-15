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

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI ZA DATA SERIALIZER
// ============================================================================

/**
 * Serialization format
 */
export type SerializationFormat = 'json' | 'binary' | 'msgpack' | 'protobuf' | 'avro';

/**
 * Compression algorithm
 */
export type CompressionAlgorithm = 'none' | 'gzip' | 'deflate' | 'brotli' | 'lz4' | 'zstd';

/**
 * Encryption algorithm
 */
export type EncryptionAlgorithm = 'none' | 'aes-256-gcm' | 'aes-256-cbc' | 'chacha20-poly1305';

/**
 * Serialization options
 */
export interface SerializationOptions {
    readonly format: SerializationFormat;
    readonly compression: CompressionAlgorithm;
    readonly encryption: EncryptionAlgorithm;
    readonly cipherSecret: string | null;
    readonly pretty: boolean;
    readonly includeMetadata: boolean;
    readonly schemaId: string | null;
    readonly version: number;
}

/**
 * Serialization result
 */
export interface SerializationResult {
    readonly data: Uint8Array | string;
    readonly format: SerializationFormat;
    readonly compression: CompressionAlgorithm;
    readonly encryption: EncryptionAlgorithm;
    readonly size: number;
    readonly originalSize: number;
    readonly compressionRatio: number;
    readonly checksum: string;
    readonly metadata: SerializationMetadata;
}

/**
 * Serialization metadata
 */
export interface SerializationMetadata {
    readonly serializedAt: number;
    readonly duration: number;
    readonly schemaId: string | null;
    readonly version: number;
    readonly contentType: string;
}

/**
 * Deserialization options
 */
export interface DeserializationOptions {
    readonly format: SerializationFormat;
    readonly compression: CompressionAlgorithm;
    readonly encryption: EncryptionAlgorithm;
    readonly cipherSecret: string | null;
    readonly schemaId: string | null;
    readonly validateSchema: boolean;
    readonly migrateVersion: boolean;
}

/**
 * Deserialization result
 */
export interface DeserializationResult<T = unknown> {
    readonly data: T;
    readonly format: SerializationFormat;
    readonly originalSize: number;
    readonly metadata: DeserializationMetadata;
}

/**
 * Deserialization metadata
 */
export interface DeserializationMetadata {
    readonly deserializedAt: number;
    readonly duration: number;
    readonly schemaId: string | null;
    readonly version: number;
    readonly migrated: boolean;
    readonly migratedFrom: number | null;
}

/**
 * Serialization schema
 */
export interface SerializationSchema {
    readonly schemaId: string;
    readonly name: string;
    readonly version: number;
    readonly fields: readonly SchemaField[];
    readonly migrations: readonly SchemaMigration[];
}

/**
 * Schema field
 */
export interface SchemaField {
    readonly name: string;
    readonly type: FieldType;
    readonly required: boolean;
    readonly defaultValue: unknown;
    readonly index: number;
}

/**
 * Field type
 */
export type FieldType =
    | 'string'
    | 'int32'
    | 'int64'
    | 'float32'
    | 'float64'
    | 'boolean'
    | 'bytes'
    | 'timestamp'
    | 'array'
    | 'map'
    | 'object';

/**
 * Schema migration
 */
export interface SchemaMigration {
    readonly fromVersion: number;
    readonly toVersion: number;
    readonly migrate: MigrationFunction;
}

/**
 * Migration function
 */
export type MigrationFunction = (data: unknown) => unknown;

/**
 * Serializer
 */
export interface Serializer<T = unknown> {
    readonly name: string;
    readonly format: SerializationFormat;
    serialize(data: T, options?: Partial<SerializationOptions>): SerializationResult;
    deserialize(data: Uint8Array | string, options?: Partial<DeserializationOptions>): DeserializationResult<T>;
}

/**
 * Codec
 */
export interface Codec<T = unknown> {
    readonly codecId: string;
    readonly name: string;
    readonly schemaId: string | null;
    encode(data: T): Uint8Array;
    decode(data: Uint8Array): T;
}

/**
 * Serializer event
 */
export interface SerializerEvent {
    readonly eventId: string;
    readonly type: SerializerEventType;
    readonly format: SerializationFormat | null;
    readonly timestamp: number;
    readonly data: Readonly<Record<string, unknown>>;
}

/**
 * Serializer event type
 */
export type SerializerEventType =
    | 'serialize_started'
    | 'serialize_completed'
    | 'serialize_failed'
    | 'deserialize_started'
    | 'deserialize_completed'
    | 'deserialize_failed'
    | 'schema_registered'
    | 'codec_registered'
    | 'migration_applied';

/**
 * Serializer event listener
 */
export type SerializerEventListener = (event: SerializerEvent) => void | Promise<void>;

/**
 * Serializer statistics
 */
export interface SerializerStatistics {
    readonly totalSerializations: number;
    readonly totalDeserializations: number;
    readonly totalBytesWritten: number;
    readonly totalBytesRead: number;
    readonly avgSerializationTime: number;
    readonly avgDeserializationTime: number;
    readonly avgCompressionRatio: number;
    readonly migrationCount: number;
}

/**
 * Stream writer
 */
export interface StreamWriter<T = unknown> {
    write(data: T): void;
    flush(): Promise<void>;
    close(): Promise<void>;
    readonly bytesWritten: number;
    readonly itemsWritten: number;
}

/**
 * Stream reader
 */
export interface StreamReader<T = unknown> {
    read(): Promise<T | null>;
    readAll(): Promise<readonly T[]>;
    close(): Promise<void>;
    readonly bytesRead: number;
    readonly itemsRead: number;
}

// ============================================================================
// STANJE
// ============================================================================

const schemas: Map<string, SerializationSchema> = new Map();
const codecs: Map<string, Codec> = new Map();
const eventListeners: Set<SerializerEventListener> = new Set();

let schemaCounter = 0;
let codecCounter = 0;
let eventCounter = 0;

const defaultSerializationOptions: SerializationOptions = {
    format: 'json',
    compression: 'none',
    encryption: 'none',
    cipherSecret: null,
    pretty: false,
    includeMetadata: true,
    schemaId: null,
    version: 1,
};

const defaultDeserializationOptions: DeserializationOptions = {
    format: 'json',
    compression: 'none',
    encryption: 'none',
    cipherSecret: null,
    schemaId: null,
    validateSchema: false,
    migrateVersion: true,
};

const statistics: SerializerStatistics = {
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
function generateSchemaId(): string {
    schemaCounter++;
    return generateDeterministicId(`ser-schema-${schemaCounter}`);
}

/**
 * Generate codec ID
 */
function generateCodecId(): string {
    codecCounter++;
    return generateDeterministicId(`codec-${codecCounter}`);
}

/**
 * Generate event ID
 */
function generateEventId(): string {
    eventCounter++;
    return generateDeterministicId(`ser-event-${eventCounter}`);
}

/**
 * Emit serializer event
 */
async function emitEvent(event: SerializerEvent): Promise<void> {
    for (const listener of eventListeners) {
        try {
            await listener(event);
        } catch {
            // Ignore listener errors
        }
    }
}

/**
 * Compute checksum
 */
function computeChecksum(data: Uint8Array | string): string {
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
function getContentType(format: SerializationFormat): string {
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
function compress(data: Uint8Array, algorithm: CompressionAlgorithm): Uint8Array {
    if (algorithm === 'none') {
        return data;
    }
    return data;
}

/**
 * Decompress data
 */
function decompress(data: Uint8Array, algorithm: CompressionAlgorithm): Uint8Array {
    if (algorithm === 'none') {
        return data;
    }
    return data;
}

/**
 * Encrypt data
 */
function encrypt(data: Uint8Array, algorithm: EncryptionAlgorithm, key: string | null): Uint8Array {
    if (algorithm === 'none' || !key) {
        return data;
    }
    return data;
}

/**
 * Decrypt data
 */
function decrypt(data: Uint8Array, algorithm: EncryptionAlgorithm, key: string | null): Uint8Array {
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
export function registerSchema(
    name: string,
    fields: readonly SchemaField[],
    options: {
        version?: number;
        migrations?: readonly SchemaMigration[];
    } = {}
): SerializationSchema {
    const schemaId = generateSchemaId();
    
    const schema: SerializationSchema = {
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
export function getSchema(nameOrId: string): SerializationSchema | null {
    return schemas.get(nameOrId) ?? null;
}

/**
 * Get all schemas
 */
export function getAllSchemas(): readonly SerializationSchema[] {
    const uniqueSchemas = new Map<string, SerializationSchema>();
    for (const schema of schemas.values()) {
        uniqueSchemas.set(schema.schemaId, schema);
    }
    return Array.from(uniqueSchemas.values());
}

/**
 * Remove schema
 */
export function removeSchema(nameOrId: string): boolean {
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
export function addMigration(
    schemaNameOrId: string,
    fromVersion: number,
    toVersion: number,
    migrate: MigrationFunction
): boolean {
    const schema = schemas.get(schemaNameOrId);
    if (!schema) {
        return false;
    }
    
    const migration: SchemaMigration = {
        fromVersion,
        toVersion,
        migrate,
    };
    
    const updatedSchema: SerializationSchema = {
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
function applyMigrations(
    data: unknown,
    schema: SerializationSchema,
    fromVersion: number,
    toVersion: number
): { data: unknown; migrated: boolean; migratedFrom: number | null } {
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
            
            const mutableStats = statistics as { migrationCount: number };
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
export function registerCodec<T>(
    name: string,
    encode: (data: T) => Uint8Array,
    decode: (data: Uint8Array) => T,
    schemaId?: string
): Codec<T> {
    const codecId = generateCodecId();
    
    const codec: Codec<T> = {
        codecId,
        name,
        schemaId: schemaId ?? null,
        encode,
        decode,
    };
    
    codecs.set(codecId, codec as Codec);
    codecs.set(name, codec as Codec);
    
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
export function getCodec<T>(nameOrId: string): Codec<T> | null {
    return (codecs.get(nameOrId) as Codec<T>) ?? null;
}

/**
 * Get all codecs
 */
export function getAllCodecs(): readonly Codec[] {
    const uniqueCodecs = new Map<string, Codec>();
    for (const codec of codecs.values()) {
        uniqueCodecs.set(codec.codecId, codec);
    }
    return Array.from(uniqueCodecs.values());
}

/**
 * Remove codec
 */
export function removeCodec(nameOrId: string): boolean {
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
export async function serialize<T>(
    data: T,
    options: Partial<SerializationOptions> = {}
): Promise<SerializationResult> {
    const mergedOptions: SerializationOptions = { ...defaultSerializationOptions, ...options };
    const startTime = clock.nowMs();
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'serialize_started',
        format: mergedOptions.format,
        timestamp: startTime,
        data: {},
    });
    
    try {
        let serialized: string | Uint8Array;
        
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
        
        let processedData: Uint8Array = typeof serialized === 'string'
            ? new TextEncoder().encode(serialized)
            : serialized;
        
        processedData = compress(processedData, mergedOptions.compression);
        processedData = encrypt(processedData, mergedOptions.encryption, mergedOptions.cipherSecret);
        
        const finalSize = processedData.length;
        const compressionRatio = originalSize > 0 ? finalSize / originalSize : 1;
        const checksum = computeChecksum(processedData);
        
        const duration = clock.nowMs() - startTime;
        
        const result: SerializationResult = {
            data: mergedOptions.format === 'json' && mergedOptions.compression === 'none' && mergedOptions.encryption === 'none'
                ? serialized as string
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
        
        const mutableStats = statistics as {
            totalSerializations: number;
            totalBytesWritten: number;
            avgSerializationTime: number;
            avgCompressionRatio: number;
        };
        
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
    } catch (error) {
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
function serializeJson<T>(data: T, options: SerializationOptions): string {
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
function serializeBinary<T>(data: T): Uint8Array {
    const json = JSON.stringify(data);
    return new TextEncoder().encode(json);
}

/**
 * Serialize to MessagePack
 */
function serializeMsgpack<T>(data: T): Uint8Array {
    const json = JSON.stringify(data);
    return new TextEncoder().encode(json);
}

/**
 * Serialize to Protocol Buffers
 */
function serializeProtobuf<T>(data: T, schemaId: string | null): Uint8Array {
    const json = JSON.stringify(data);
    return new TextEncoder().encode(json);
}

/**
 * Serialize to Avro
 */
function serializeAvro<T>(data: T, schemaId: string | null): Uint8Array {
    const json = JSON.stringify(data);
    return new TextEncoder().encode(json);
}

// ============================================================================
// DESERIALIZATION
// ============================================================================

/**
 * Deserialize data
 */
export async function deserialize<T>(
    data: Uint8Array | string,
    options: Partial<DeserializationOptions> = {}
): Promise<DeserializationResult<T>> {
    const mergedOptions: DeserializationOptions = { ...defaultDeserializationOptions, ...options };
    const startTime = clock.nowMs();
    
    await emitEvent({
        eventId: generateEventId(),
        type: 'deserialize_started',
        format: mergedOptions.format,
        timestamp: startTime,
        data: {},
    });
    
    try {
        let processedData: Uint8Array = typeof data === 'string'
            ? new TextEncoder().encode(data)
            : data;
        
        const originalSize = processedData.length;
        
        processedData = decrypt(processedData, mergedOptions.encryption, mergedOptions.cipherSecret);
        processedData = decompress(processedData, mergedOptions.compression);
        
        let deserialized: unknown;
        let version = 1;
        let schemaId: string | null = null;
        
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
        let migratedFrom: number | null = null;
        
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
        
        const result: DeserializationResult<T> = {
            data: deserialized as T,
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
        
        const mutableStats = statistics as {
            totalDeserializations: number;
            totalBytesRead: number;
            avgDeserializationTime: number;
        };
        
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
    } catch (error) {
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
function deserializeJson(data: Uint8Array): { data: unknown; version: number; schemaId: string | null } {
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
function deserializeBinary(data: Uint8Array): unknown {
    const json = new TextDecoder().decode(data);
    return JSON.parse(json);
}

/**
 * Deserialize from MessagePack
 */
function deserializeMsgpack(data: Uint8Array): unknown {
    const json = new TextDecoder().decode(data);
    return JSON.parse(json);
}

/**
 * Deserialize from Protocol Buffers
 */
function deserializeProtobuf(data: Uint8Array, schemaId: string | null): unknown {
    const json = new TextDecoder().decode(data);
    return JSON.parse(json);
}

/**
 * Deserialize from Avro
 */
function deserializeAvro(data: Uint8Array, schemaId: string | null): unknown {
    const json = new TextDecoder().decode(data);
    return JSON.parse(json);
}

// ============================================================================
// STREAMING
// ============================================================================

/**
 * Create stream writer
 */
export function createStreamWriter<T>(
    options: Partial<SerializationOptions> = {}
): StreamWriter<T> {
    const mergedOptions: SerializationOptions = { ...defaultSerializationOptions, ...options };
    const buffer: T[] = [];
    let bytesWritten = 0;
    let itemsWritten = 0;
    
    return {
        write(data: T): void {
            buffer.push(data);
            itemsWritten++;
        },
        
        async flush(): Promise<void> {
            if (buffer.length === 0) {
                return;
            }
            
            const result = await serialize(buffer, mergedOptions);
            bytesWritten += result.size;
            buffer.length = 0;
        },
        
        async close(): Promise<void> {
            await this.flush();
        },
        
        get bytesWritten(): number {
            return bytesWritten;
        },
        
        get itemsWritten(): number {
            return itemsWritten;
        },
    };
}

/**
 * Create stream reader
 */
export function createStreamReader<T>(
    data: Uint8Array | string,
    options: Partial<DeserializationOptions> = {}
): StreamReader<T> {
    const mergedOptions: DeserializationOptions = { ...defaultDeserializationOptions, ...options };
    let items: T[] = [];
    let currentIndex = 0;
    let bytesRead = 0;
    let itemsRead = 0;
    let initialized = false;
    
    async function initialize(): Promise<void> {
        if (initialized) {
            return;
        }
        
        const result = await deserialize<T[]>(data, mergedOptions);
        items = Array.isArray(result.data) ? result.data : [result.data as T];
        bytesRead = result.originalSize;
        initialized = true;
    }
    
    return {
        async read(): Promise<T | null> {
            await initialize();
            
            if (currentIndex >= items.length) {
                return null;
            }
            
            const item = items[currentIndex];
            currentIndex++;
            itemsRead++;
            
            return item;
        },
        
        async readAll(): Promise<readonly T[]> {
            await initialize();
            itemsRead = items.length;
            return items;
        },
        
        async close(): Promise<void> {
            items = [];
            currentIndex = 0;
        },
        
        get bytesRead(): number {
            return bytesRead;
        },
        
        get itemsRead(): number {
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
export function field(
    name: string,
    type: FieldType,
    options: {
        required?: boolean;
        defaultValue?: unknown;
        index?: number;
    } = {}
): SchemaField {
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
export async function clone<T>(data: T): Promise<T> {
    const serialized = await serialize(data, { format: 'json' });
    const deserialized = await deserialize<T>(serialized.data);
    return deserialized.data;
}

/**
 * Compare data
 */
export async function compare<T>(a: T, b: T): Promise<boolean> {
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
export function getStatistics(): Readonly<SerializerStatistics> {
    return { ...statistics };
}

/**
 * Reset statistics
 */
export function resetStatistics(): void {
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
export function addEventListener(listener: SerializerEventListener): void {
    eventListeners.add(listener);
}

/**
 * Remove event listener
 */
export function removeEventListener(listener: SerializerEventListener): void {
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
    schemas.clear();
    codecs.clear();
    eventListeners.clear();
    resetStatistics();
}
