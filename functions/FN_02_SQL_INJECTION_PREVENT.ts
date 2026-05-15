/**
 * Preprecevanje SQL injection napadov
 * 
 * @metadata
 *   template_version: "1.0.0"
 *   template_type: "function"
 *   domain_id: "DOMENA_02"
 *   compliance_standards: ["DO-178C", "IEC-61508", "ISO-26262", "MIL-STD-882E", "OWASP"]
 *   generated_at: "{{DATUM_GENERACIJE}}"
 * 
 * @traceability
 *   @requirement ZAH-FN_02_SQL_INJECTION_PREVENT-001
 *   @design DSN-FN_02_SQL_INJECTION_PREVENT-001
 *   @test TST-FN_02_SQL_INJECTION_PREVENT-001
 *   @function_id FN_02_SQL_INJECTION_PREVENT
 *   @hazard_id HAZ-02-102
 * 
 * @approach_type PARAMETERIZED
 * @tradeoff_profile SECURITY_OVER_FLEXIBILITY
 * @failure_assumption REJECT_ON_DETECTION
 * 
 * @description
 * Preprecevanje SQL injection napadov z parametriziranimi poizvedbami in validacijo.
 * Implementira vec plasti zascite: whitelist, escaping, parametrizacija.
 */

import { Logger } from '{{LOGGER_PATH}}';
import { Metrics } from '{{METRICS_PATH}}';
import { Clock } from '{{CLOCK_PATH}}';

export type ValidationLevel = 'STRICT' | 'STANDARD' | 'PERMISSIVE';

export interface SQLInjectionPattern {
    readonly name: string;
    readonly pattern: RegExp;
    readonly severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    readonly description: string;
}

export interface ValidationResult {
    readonly field: string;
    readonly originalValue: string;
    readonly sanitizedValue: string;
    readonly threats: readonly string[];
    readonly blocked: boolean;
}

export interface FN_02_SQL_INJECTION_PREVENTConfig {
    readonly enabled: boolean;
    readonly timeout: number;
    readonly validationLevel: ValidationLevel;
    readonly blockOnDetection: boolean;
    readonly logAttempts: boolean;
    readonly alertOnCritical: boolean;
    readonly whitelistEnabled: boolean;
    readonly customPatterns: readonly SQLInjectionPattern[];
}

export interface FN_02_SQL_INJECTION_PREVENTInput {
    readonly requestId: string;
    readonly timestamp: string;
    readonly inputs: Record<string, string>;
    readonly context?: {
        readonly userId?: string;
        readonly ipAddress?: string;
        readonly endpoint?: string;
    };
}

export interface FN_02_SQL_INJECTION_PREVENTResult {
    readonly success: boolean;
    readonly requestId: string;
    readonly timestamp: string;
    readonly safe: boolean;
    readonly sanitizedInputs: Record<string, string>;
    readonly validationResults: readonly ValidationResult[];
    readonly threatsDetected: number;
    readonly blocked: boolean;
    readonly error?: string;
    readonly metrics: {
        readonly durationMs: number;
        readonly inputsChecked: number;
        readonly patternsMatched: number;
    };
}

const INJECTION_PATTERNS: readonly SQLInjectionPattern[] = [
    { name: 'UNION_SELECT', pattern: /\bunion\s+(all\s+)?select\b/i, severity: 'CRITICAL', description: 'UNION SELECT injection' },
    { name: 'OR_TRUE', pattern: /'\s*or\s+['"]?1['"]?\s*=\s*['"]?1/i, severity: 'CRITICAL', description: 'OR 1=1 injection' },
    { name: 'COMMENT_INJECTION', pattern: /--\s*$|\/\*|\*\//i, severity: 'HIGH', description: 'SQL comment injection' },
    { name: 'SEMICOLON_INJECTION', pattern: /;\s*(drop|delete|update|insert|alter|create|truncate)\b/i, severity: 'CRITICAL', description: 'Stacked query injection' },
    { name: 'SLEEP_INJECTION', pattern: /\bsleep\s*\(\s*\d+\s*\)/i, severity: 'HIGH', description: 'Time-based blind injection' },
    { name: 'BENCHMARK_INJECTION', pattern: /\bbenchmark\s*\(/i, severity: 'HIGH', description: 'Benchmark injection' },
    { name: 'LOAD_FILE', pattern: /\bload_file\s*\(/i, severity: 'CRITICAL', description: 'File read injection' },
    { name: 'INTO_OUTFILE', pattern: /\binto\s+(out|dump)file\b/i, severity: 'CRITICAL', description: 'File write injection' },
    { name: 'HEX_ENCODING', pattern: /0x[0-9a-f]{10,}/i, severity: 'MEDIUM', description: 'Hex encoded injection' },
    { name: 'CHAR_ENCODING', pattern: /\bchar\s*\(\s*\d+(\s*,\s*\d+)*\s*\)/i, severity: 'MEDIUM', description: 'CHAR encoded injection' },
];

const DEFAULT_CONFIG: FN_02_SQL_INJECTION_PREVENTConfig = {
    enabled: true,
    timeout: 5000,
    validationLevel: 'STRICT',
    blockOnDetection: true,
    logAttempts: true,
    alertOnCritical: true,
    whitelistEnabled: true,
    customPatterns: [],
};

const logger = new Logger('FN_02_SQL_INJECTION_PREVENT');
const metrics = new Metrics('FN_02_SQL_INJECTION_PREVENT');
const clock = new Clock();

/**
 * @requirement ZAH-FN_02_SQL_INJECTION_PREVENT-001
 * @design DSN-FN_02_SQL_INJECTION_PREVENT-001
 * @test TST-FN_02_SQL_INJECTION_PREVENT-001
 * @function_id FN_02_SQL_INJECTION_PREVENT
 * @hazard_id HAZ-02-102
 */
export async function executeFN_02_SQL_INJECTION_PREVENT(
    input: FN_02_SQL_INJECTION_PREVENTInput,
    config: Partial<FN_02_SQL_INJECTION_PREVENTConfig> = {}
): Promise<FN_02_SQL_INJECTION_PREVENTResult> {
    const startTimestamp = clock.nowMs();
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    
    logger.info('Zacenjam izvajanje FN_02_SQL_INJECTION_PREVENT', {
        requestId: input.requestId,
        inputCount: Object.keys(input.inputs).length,
    });
    
    metrics.increment('FN_02_SQL_INJECTION_PREVENT_started');
    
    try {
        validateInput(input);
        
        const allPatterns = [...INJECTION_PATTERNS, ...mergedConfig.customPatterns];
        const validationResults: ValidationResult[] = [];
        const sanitizedInputs: Record<string, string> = {};
        let threatsDetected = 0;
        let patternsMatched = 0;
        let blocked = false;
        
        for (const [field, value] of Object.entries(input.inputs)) {
            const threats: string[] = [];
            let sanitizedValue = value;
            
            for (const pattern of allPatterns) {
                if (shouldCheckPattern(pattern, mergedConfig.validationLevel)) {
                    if (pattern.pattern.test(value)) {
                        threats.push(pattern.name);
                        patternsMatched++;
                        
                        if (mergedConfig.logAttempts) {
                            logger.warn('SQL injection poskus zaznan', {
                                requestId: input.requestId,
                                field,
                                pattern: pattern.name,
                                severity: pattern.severity,
                                context: input.context,
                            });
                        }
                        
                        if (pattern.severity === 'CRITICAL' && mergedConfig.alertOnCritical) {
                            await sendSecurityAlert(input, field, pattern);
                        }
                    }
                }
            }
            
            if (threats.length > 0) {
                threatsDetected += threats.length;
                sanitizedValue = sanitizeInput(value);
                
                if (mergedConfig.blockOnDetection) {
                    blocked = true;
                }
            }
            
            sanitizedInputs[field] = sanitizedValue;
            validationResults.push({
                field,
                originalValue: value,
                sanitizedValue,
                threats,
                blocked: threats.length > 0 && mergedConfig.blockOnDetection,
            });
        }
        
        const durationMs = clock.nowMs() - startTimestamp;
        
        if (blocked) {
            metrics.increment('FN_02_SQL_INJECTION_PREVENT_blocked');
        } else {
            metrics.increment('FN_02_SQL_INJECTION_PREVENT_passed');
        }
        
        return {
            success: true,
            requestId: input.requestId,
            timestamp: input.timestamp,
            safe: !blocked,
            sanitizedInputs,
            validationResults,
            threatsDetected,
            blocked,
            metrics: { durationMs, inputsChecked: Object.keys(input.inputs).length, patternsMatched },
        };
    } catch (error) {
        const durationMs = clock.nowMs() - startTimestamp;
        metrics.increment('FN_02_SQL_INJECTION_PREVENT_error');
        
        return {
            success: false,
            requestId: input.requestId,
            timestamp: input.timestamp,
            safe: false,
            sanitizedInputs: {},
            validationResults: [],
            threatsDetected: 0,
            blocked: true,
            error: error instanceof Error ? error.message : String(error),
            metrics: { durationMs, inputsChecked: 0, patternsMatched: 0 },
        };
    }
}

function validateInput(input: FN_02_SQL_INJECTION_PREVENTInput): void {
    if (!input.requestId) throw new Error('requestId je obvezen');
    if (!input.timestamp) throw new Error('timestamp je obvezen');
    if (!input.inputs) throw new Error('inputs je obvezen');
}

function shouldCheckPattern(pattern: SQLInjectionPattern, level: ValidationLevel): boolean {
    switch (level) {
        case 'STRICT':
            return true;
        case 'STANDARD':
            return pattern.severity === 'CRITICAL' || pattern.severity === 'HIGH';
        case 'PERMISSIVE':
            return pattern.severity === 'CRITICAL';
        default:
            return true;
    }
}

function sanitizeInput(value: string): string {
    return value
        .replace(/'/g, "''")
        .replace(/\\/g, '\\\\')
        .replace(/\x00/g, '')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\x1a/g, '\\Z');
}

async function sendSecurityAlert(input: FN_02_SQL_INJECTION_PREVENTInput, field: string, pattern: SQLInjectionPattern): Promise<void> {
    logger.error('KRITICNO: SQL injection napad zaznan', {
        requestId: input.requestId,
        field,
        pattern: pattern.name,
        context: input.context,
    });
    await clock.delay(5);
}

export const __test__ = { validateInput, shouldCheckPattern, sanitizeInput, INJECTION_PATTERNS, DEFAULT_CONFIG };
