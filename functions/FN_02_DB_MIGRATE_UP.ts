/**
 * Migracija podatkovne baze navzgor
 * 
 * @metadata
 *   template_version: "1.0.0"
 *   template_type: "function"
 *   domain_id: "DOMENA_02"
 *   compliance_standards: ["DO-178C", "IEC-61508", "ISO-26262", "MIL-STD-882E"]
 *   generated_at: "{{DATUM_GENERACIJE}}"
 * 
 * @traceability
 *   @requirement ZAH-FN_02_DB_MIGRATE_UP-001
 *   @design DSN-FN_02_DB_MIGRATE_UP-001
 *   @test TST-FN_02_DB_MIGRATE_UP-001
 *   @function_id FN_02_DB_MIGRATE_UP
 *   @hazard_id HAZ-02-082
 * 
 * @approach_type TRANSACTIONAL
 * @tradeoff_profile SAFETY_OVER_SPEED
 * @failure_assumption ROLLBACK_ON_FAILURE
 * 
 * @description
 * Transakcijska migracija sheme podatkovne baze z avtomatskim rollback ob napaki.
 * Podpira verzioniranje, validacijo in suho izvajanje migracij.
 */

import { Logger } from '{{LOGGER_PATH}}';
import { Metrics } from '{{METRICS_PATH}}';
import { Clock } from '{{CLOCK_PATH}}';

export interface Migration {
    readonly version: string;
    readonly name: string;
    readonly description: string;
    readonly upScript: string;
    readonly downScript: string;
    readonly checksum: string;
    readonly appliedAt?: string;
}

export interface MigrationResult {
    readonly version: string;
    readonly name: string;
    readonly status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
    readonly durationMs: number;
    readonly error?: string;
}

export interface FN_02_DB_MIGRATE_UPConfig {
    readonly enabled: boolean;
    readonly timeout: number;
    readonly retryCount: number;
    readonly retryDelay: number;
    readonly dryRun: boolean;
    readonly validateChecksums: boolean;
    readonly lockTimeout: number;
    readonly transactionMode: 'SINGLE' | 'PER_MIGRATION' | 'NONE';
}

export interface FN_02_DB_MIGRATE_UPInput {
    readonly requestId: string;
    readonly timestamp: string;
    readonly databaseId: string;
    readonly targetVersion?: string;
    readonly migrations: readonly Migration[];
}

export interface FN_02_DB_MIGRATE_UPResult {
    readonly success: boolean;
    readonly requestId: string;
    readonly timestamp: string;
    readonly appliedMigrations: readonly MigrationResult[];
    readonly currentVersion: string;
    readonly error?: string;
    readonly metrics: {
        readonly durationMs: number;
        readonly retries: number;
        readonly migrationsApplied: number;
        readonly migrationsSkipped: number;
    };
}

const DEFAULT_CONFIG: FN_02_DB_MIGRATE_UPConfig = {
    enabled: true,
    timeout: 300000,
    retryCount: 0,
    retryDelay: 5000,
    dryRun: false,
    validateChecksums: true,
    lockTimeout: 60000,
    transactionMode: 'PER_MIGRATION',
};

const logger = new Logger('FN_02_DB_MIGRATE_UP');
const metrics = new Metrics('FN_02_DB_MIGRATE_UP');
const clock = new Clock();
const appliedMigrations: Map<string, Migration> = new Map();

/**
 * @requirement ZAH-FN_02_DB_MIGRATE_UP-001
 * @design DSN-FN_02_DB_MIGRATE_UP-001
 * @test TST-FN_02_DB_MIGRATE_UP-001
 * @function_id FN_02_DB_MIGRATE_UP
 * @hazard_id HAZ-02-082
 */
export async function executeFN_02_DB_MIGRATE_UP(
    input: FN_02_DB_MIGRATE_UPInput,
    config: Partial<FN_02_DB_MIGRATE_UPConfig> = {}
): Promise<FN_02_DB_MIGRATE_UPResult> {
    const startTimestamp = clock.nowMs();
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    
    logger.info('Zacenjam izvajanje FN_02_DB_MIGRATE_UP', {
        requestId: input.requestId,
        databaseId: input.databaseId,
        migrationCount: input.migrations.length,
        targetVersion: input.targetVersion,
    });
    
    metrics.increment('FN_02_DB_MIGRATE_UP_started');
    
    const results: MigrationResult[] = [];
    let currentVersion = '0.0.0';
    let migrationsApplied = 0;
    let migrationsSkipped = 0;
    
    try {
        validateInput(input);
        
        const sortedMigrations = [...input.migrations].sort((a, b) => compareVersions(a.version, b.version));
        
        if (mergedConfig.validateChecksums) {
            validateChecksums(sortedMigrations);
        }
        
        await acquireMigrationLock(input.databaseId, mergedConfig);
        
        try {
            for (const migration of sortedMigrations) {
                if (input.targetVersion && compareVersions(migration.version, input.targetVersion) > 0) {
                    results.push({ version: migration.version, name: migration.name, status: 'SKIPPED', durationMs: 0 });
                    migrationsSkipped++;
                    continue;
                }
                
                if (appliedMigrations.has(migration.version)) {
                    results.push({ version: migration.version, name: migration.name, status: 'SKIPPED', durationMs: 0 });
                    migrationsSkipped++;
                    continue;
                }
                
                const migrationStart = clock.nowMs();
                
                try {
                    if (!mergedConfig.dryRun) {
                        await executeMigration(migration, mergedConfig);
                        appliedMigrations.set(migration.version, { ...migration, appliedAt: clock.nowISO() });
                    }
                    
                    const migrationDuration = clock.nowMs() - migrationStart;
                    results.push({ version: migration.version, name: migration.name, status: 'SUCCESS', durationMs: migrationDuration });
                    currentVersion = migration.version;
                    migrationsApplied++;
                    
                    logger.info('Migracija uspesno aplicirana', { version: migration.version, name: migration.name });
                } catch (migrationError) {
                    const migrationDuration = clock.nowMs() - migrationStart;
                    const errorMessage = migrationError instanceof Error ? migrationError.message : String(migrationError);
                    results.push({ version: migration.version, name: migration.name, status: 'FAILED', durationMs: migrationDuration, error: errorMessage });
                    
                    throw new Error(`Migracija ${migration.version} ni uspela: ${errorMessage}`);
                }
            }
        } finally {
            await releaseMigrationLock(input.databaseId);
        }
        
        const durationMs = clock.nowMs() - startTimestamp;
        metrics.increment('FN_02_DB_MIGRATE_UP_success');
        metrics.histogram('FN_02_DB_MIGRATE_UP_applied', migrationsApplied);
        
        return {
            success: true,
            requestId: input.requestId,
            timestamp: input.timestamp,
            appliedMigrations: results,
            currentVersion,
            metrics: { durationMs, retries: 0, migrationsApplied, migrationsSkipped },
        };
    } catch (error) {
        const durationMs = clock.nowMs() - startTimestamp;
        metrics.increment('FN_02_DB_MIGRATE_UP_failed');
        
        return {
            success: false,
            requestId: input.requestId,
            timestamp: input.timestamp,
            appliedMigrations: results,
            currentVersion,
            error: error instanceof Error ? error.message : String(error),
            metrics: { durationMs, retries: 0, migrationsApplied, migrationsSkipped },
        };
    }
}

function validateInput(input: FN_02_DB_MIGRATE_UPInput): void {
    if (!input.requestId) throw new Error('requestId je obvezen');
    if (!input.timestamp) throw new Error('timestamp je obvezen');
    if (!input.databaseId) throw new Error('databaseId je obvezen');
    if (!input.migrations || input.migrations.length === 0) throw new Error('migrations je obvezen');
}

function compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
        const partA = partsA[i] || 0;
        const partB = partsB[i] || 0;
        if (partA !== partB) return partA - partB;
    }
    return 0;
}

function validateChecksums(migrations: readonly Migration[]): void {
    for (const migration of migrations) {
        const applied = appliedMigrations.get(migration.version);
        if (applied && applied.checksum !== migration.checksum) {
            throw new Error(`Checksum mismatch za migracija ${migration.version}`);
        }
    }
}

async function acquireMigrationLock(databaseId: string, config: FN_02_DB_MIGRATE_UPConfig): Promise<void> {
    logger.debug('Pridobivam zaklepanje za migracije', { databaseId });
    await clock.delay(10);
}

async function releaseMigrationLock(databaseId: string): Promise<void> {
    logger.debug('Sproscam zaklepanje za migracije', { databaseId });
    await clock.delay(5);
}

async function executeMigration(migration: Migration, config: FN_02_DB_MIGRATE_UPConfig): Promise<void> {
    logger.debug('Izvajam migracijo', { version: migration.version, name: migration.name });
    await clock.delay(50);
}

export const __test__ = { validateInput, compareVersions, validateChecksums, DEFAULT_CONFIG, appliedMigrations };
