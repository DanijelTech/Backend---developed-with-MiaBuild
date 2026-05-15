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
export type FieldType = 'string' | 'int32' | 'int64' | 'float32' | 'float64' | 'boolean' | 'bytes' | 'timestamp' | 'array' | 'map' | 'object';
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
export type SerializerEventType = 'serialize_started' | 'serialize_completed' | 'serialize_failed' | 'deserialize_started' | 'deserialize_completed' | 'deserialize_failed' | 'schema_registered' | 'codec_registered' | 'migration_applied';
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
/**
 * Register schema
 */
export declare function registerSchema(name: string, fields: readonly SchemaField[], options?: {
    version?: number;
    migrations?: readonly SchemaMigration[];
}): SerializationSchema;
/**
 * Get schema
 */
export declare function getSchema(nameOrId: string): SerializationSchema | null;
/**
 * Get all schemas
 */
export declare function getAllSchemas(): readonly SerializationSchema[];
/**
 * Remove schema
 */
export declare function removeSchema(nameOrId: string): boolean;
/**
 * Add migration
 */
export declare function addMigration(schemaNameOrId: string, fromVersion: number, toVersion: number, migrate: MigrationFunction): boolean;
/**
 * Register codec
 */
export declare function registerCodec<T>(name: string, encode: (data: T) => Uint8Array, decode: (data: Uint8Array) => T, schemaId?: string): Codec<T>;
/**
 * Get codec
 */
export declare function getCodec<T>(nameOrId: string): Codec<T> | null;
/**
 * Get all codecs
 */
export declare function getAllCodecs(): readonly Codec[];
/**
 * Remove codec
 */
export declare function removeCodec(nameOrId: string): boolean;
/**
 * Serialize data
 */
export declare function serialize<T>(data: T, options?: Partial<SerializationOptions>): Promise<SerializationResult>;
/**
 * Deserialize data
 */
export declare function deserialize<T>(data: Uint8Array | string, options?: Partial<DeserializationOptions>): Promise<DeserializationResult<T>>;
/**
 * Create stream writer
 */
export declare function createStreamWriter<T>(options?: Partial<SerializationOptions>): StreamWriter<T>;
/**
 * Create stream reader
 */
export declare function createStreamReader<T>(data: Uint8Array | string, options?: Partial<DeserializationOptions>): StreamReader<T>;
/**
 * Create field
 */
export declare function field(name: string, type: FieldType, options?: {
    required?: boolean;
    defaultValue?: unknown;
    index?: number;
}): SchemaField;
/**
 * Clone data
 */
export declare function clone<T>(data: T): Promise<T>;
/**
 * Compare data
 */
export declare function compare<T>(a: T, b: T): Promise<boolean>;
/**
 * Get statistics
 */
export declare function getStatistics(): Readonly<SerializerStatistics>;
/**
 * Reset statistics
 */
export declare function resetStatistics(): void;
/**
 * Add event listener
 */
export declare function addEventListener(listener: SerializerEventListener): void;
/**
 * Remove event listener
 */
export declare function removeEventListener(listener: SerializerEventListener): void;
/**
 * Clear event listeners
 */
export declare function clearEventListeners(): void;
/**
 * Clear all state
 */
export declare function clearAll(): void;
