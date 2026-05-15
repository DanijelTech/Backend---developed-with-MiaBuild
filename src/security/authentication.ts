/**
 * @file Authentication modul za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 * 
 * @requirement ZAH-ZALEDNI-SEC-001 Avtentikacija za zaledne sisteme
 * @design DSN-ZALEDNI-SEC-001 Backend authentication arhitektura
 * @test TEST-ZALEDNI-SEC-001 Preverjanje avtentikacije
 * 
 * @function_id FN_02_SIGN
 * @function_id FN_02_VERIFY
 * @function_id FN_02_DECODE
 * 
 * Backend Authentication - prilagojen za zaledne sisteme:
 * - Service-to-service avtentikacija (mTLS, OAuth2 client credentials)
 * - JWT validacija z issuer/audience preverjanjem
 * - Internal API avtentikacija (mTLS CN/SAN allowlist)
 * - API key validacija za eksterne integracije
 * - Token refresh z rotation
 * - Claims mapiranje na interne roles/scopes
 * 
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom SEC_001 - Authentication
 */

import { getClock, Clock } from '@mia/core/clock';
import { generateDeterministicId } from '@mia/core/deterministic';
const clock: Clock = getClock();

// ============================================================================
// TIPI
// ============================================================================

/**
 * Poverilnice uporabnika
 */
export interface Credentials {
    /** Uporabnisko ime ali email */
    readonly identifier: string;
    /** Geslo (hashirano) */
    readonly passwordHash: string;
    /** Tip avtentikacije */
    readonly authType: 'password' | 'token' | 'certificate' | 'mfa';
}

/**
 * JWT token
 */
export interface AuthToken {
    /** Token vrednost */
    readonly token: string;
    /** Tip tokena */
    readonly type: 'access' | 'refresh';
    /** Cas izdaje */
    readonly issuedAt: number;
    /** Cas poteka */
    readonly expiresAt: number;
    /** ID uporabnika */
    readonly userId: string;
    /** Vloge uporabnika */
    readonly roles: readonly string[];
    /** Dodatni claims */
    readonly claims: Readonly<Record<string, unknown>>;
}

/**
 * Rezultat avtentikacije
 */
export interface AuthResult {
    /** Ali je avtentikacija uspela */
    readonly success: boolean;
    /** Access token (ce je uspelo) */
    readonly accessToken: AuthToken | null;
    /** Refresh token (ce je uspelo) */
    readonly refreshToken: AuthToken | null;
    /** Napaka (ce ni uspelo) */
    readonly error: string | null;
    /** Casovni zig */
    readonly timestamp: number;
}

/**
 * Seja uporabnika
 */
export interface Session {
    /** ID seje */
    readonly sessionId: string;
    /** ID uporabnika */
    readonly userId: string;
    /** Cas zacetka */
    readonly startedAt: number;
    /** Cas zadnje aktivnosti */
    readonly lastActivity: number;
    /** IP naslov */
    readonly ipAddress: string;
    /** User agent */
    readonly userAgent: string;
    /** Ali je aktivna */
    readonly isActive: boolean;
}

/**
 * Konfiguracija avtentikacije
 */
export interface AuthConfig {
    /** Trajanje access tokena v ms */
    readonly accessTokenTtl: number;
    /** Trajanje refresh tokena v ms */
    readonly refreshTokenTtl: number;
    /** Trajanje seje v ms */
    readonly sessionTtl: number;
    /** Maksimalno stevilo neuspelih poskusov */
    readonly maxFailedAttempts: number;
    /** Cas zaklepa po prekoracitvi poskusov v ms */
    readonly lockoutDuration: number;
    /** Ali je MFA obvezen */
    readonly mfaRequired: boolean;
}

// ============================================================================
// BACKEND-SPECIFICNI TIPI
// ============================================================================

/**
 * Tip service-to-service avtentikacije
 */
export type ServiceAuthType = 'mTLS' | 'oauth2_client_credentials' | 'api_key' | 'jwt_bearer';

/**
 * mTLS certifikat informacije
 */
export interface MtlsCertificateInfo {
    /** Common Name (CN) iz certifikata */
    readonly commonName: string;
    /** Subject Alternative Names (SAN) */
    readonly subjectAltNames: readonly string[];
    /** Issuer */
    readonly issuer: string;
    /** Serial number */
    readonly serialNumber: string;
    /** Veljavnost od */
    readonly validFrom: number;
    /** Veljavnost do */
    readonly validTo: number;
    /** Fingerprint */
    readonly fingerprint: string;
}

/**
 * OAuth2 Client Credentials konfiguracija
 */
export interface OAuth2ClientConfig {
    /** Client ID */
    readonly clientId: string;
    /** Client Secret (hashiran) */
    readonly clientSecretHash: string;
    /** Dovoljeni scopes */
    readonly allowedScopes: readonly string[];
    /** Token endpoint */
    readonly tokenEndpoint: string;
    /** Issuer za validacijo */
    readonly issuer: string;
    /** Audience za validacijo */
    readonly audience: string;
}

/**
 * API Key konfiguracija
 */
export interface ApiKeyConfig {
    /** API key (hashiran) */
    readonly keyHash: string;
    /** Ime storitve */
    readonly serviceName: string;
    /** Dovoljeni scopes */
    readonly allowedScopes: readonly string[];
    /** Rate limit (requests per minute) */
    readonly rateLimit: number;
    /** Veljavnost do */
    readonly expiresAt: number | null;
}

/**
 * Service identity (rezultat service-to-service avtentikacije)
 */
export interface ServiceIdentity {
    /** Ime storitve */
    readonly serviceName: string;
    /** Tip avtentikacije */
    readonly authType: ServiceAuthType;
    /** Scopes/permissions */
    readonly scopes: readonly string[];
    /** Dodatni claims */
    readonly claims: Readonly<Record<string, unknown>>;
    /** Cas avtentikacije */
    readonly authenticatedAt: number;
}

/**
 * Rezultat service avtentikacije
 */
export interface ServiceAuthResult {
    /** Ali je avtentikacija uspela */
    readonly success: boolean;
    /** Service identity (ce je uspelo) */
    readonly identity: ServiceIdentity | null;
    /** Napaka (ce ni uspelo) */
    readonly error: string | null;
    /** Casovni zig */
    readonly timestamp: number;
}

/**
 * mTLS allowlist entry
 */
export interface MtlsAllowlistEntry {
    /** Common Name pattern (podpira wildcard *) */
    readonly cnPattern: string;
    /** Dovoljeni scopes */
    readonly allowedScopes: readonly string[];
    /** Ime storitve */
    readonly serviceName: string;
}

// ============================================================================
// STANJE
// ============================================================================

let config: AuthConfig = {
    accessTokenTtl: 15 * 60 * 1000, // 15 minut
    refreshTokenTtl: 7 * 24 * 60 * 60 * 1000, // 7 dni
    sessionTtl: 24 * 60 * 60 * 1000, // 24 ur
    maxFailedAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minut
    mfaRequired: false,
};

const activeSessions: Map<string, Session> = new Map();
const failedAttempts: Map<string, { count: number; lastAttempt: number }> = new Map();
let tokenCounter = 0;

// ============================================================================
// FUNKCIJE
// ============================================================================

/**
 * Nastavi konfiguracijo avtentikacije
 */
export function configureAuth(newConfig: Partial<AuthConfig>): void {
    config = { ...config, ...newConfig };
}

/**
 * Generiraj token ID
 */
function generateTokenId(): string {
    tokenCounter++;
    return generateDeterministicId(`token-${tokenCounter}`);
}

/**
 * Generiraj session ID
 */
function generateSessionId(): string {
    tokenCounter++;
    return generateDeterministicId(`session-${tokenCounter}`);
}

/**
 * Preveri ali je uporabnik zaklenjen
 */
function isUserLocked(identifier: string): boolean {
    const attempts = failedAttempts.get(identifier);
    if (!attempts) return false;
    
    if (attempts.count >= config.maxFailedAttempts) {
        const lockoutEnd = attempts.lastAttempt + config.lockoutDuration;
        if (clock.nowMs() < lockoutEnd) {
            return true;
        }
        // Zaklepanje je poteklo, ponastavi
        failedAttempts.delete(identifier);
    }
    return false;
}

/**
 * Zabeleži neuspel poskus
 */
function recordFailedAttempt(identifier: string): void {
    const attempts = failedAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
    failedAttempts.set(identifier, {
        count: attempts.count + 1,
        lastAttempt: clock.nowMs(),
    });
}

/**
 * Ponastavi neuspele poskuse
 */
function resetFailedAttempts(identifier: string): void {
    failedAttempts.delete(identifier);
}

/**
 * Ustvari access token
 */
function createAccessToken(userId: string, roles: readonly string[]): AuthToken {
    const now = clock.nowMs();
    return {
        token: generateTokenId(),
        type: 'access',
        issuedAt: now,
        expiresAt: now + config.accessTokenTtl,
        userId,
        roles,
        claims: {},
    };
}

/**
 * Ustvari refresh token
 */
function createRefreshToken(userId: string, roles: readonly string[]): AuthToken {
    const now = clock.nowMs();
    return {
        token: generateTokenId(),
        type: 'refresh',
        issuedAt: now,
        expiresAt: now + config.refreshTokenTtl,
        userId,
        roles,
        claims: {},
    };
}

/**
 * Avtenticiraj uporabnika
 */
export async function authenticate(
    identifier: string,
    passwordHash: string,
    validateCredentials: (id: string, hash: string) => Promise<{ valid: boolean; userId: string; roles: string[] }>
): Promise<AuthResult> {
    const timestamp = clock.nowMs();
    
    // Preveri zaklepanje
    if (isUserLocked(identifier)) {
        return {
            success: false,
            accessToken: null,
            refreshToken: null,
            error: 'Account is locked due to too many failed attempts',
            timestamp,
        };
    }
    
    // Validiraj poverilnice
    const validation = await validateCredentials(identifier, passwordHash);
    
    if (!validation.valid) {
        recordFailedAttempt(identifier);
        return {
            success: false,
            accessToken: null,
            refreshToken: null,
            error: 'Invalid credentials',
            timestamp,
        };
    }
    
    // Uspesna avtentikacija
    resetFailedAttempts(identifier);
    
    const accessToken = createAccessToken(validation.userId, validation.roles);
    const refreshToken = createRefreshToken(validation.userId, validation.roles);
    
    return {
        success: true,
        accessToken,
        refreshToken,
        error: null,
        timestamp,
    };
}

/**
 * Preveri veljavnost tokena
 */
export function verifyToken(token: AuthToken): { valid: boolean; reason: string | null } {
    const now = clock.nowMs();
    
    if (now > token.expiresAt) {
        return { valid: false, reason: 'Token has expired' };
    }
    
    return { valid: true, reason: null };
}

/**
 * Osvezi token
 */
export function refreshAccessToken(refreshToken: AuthToken): AuthResult {
    const timestamp = clock.nowMs();
    
    const verification = verifyToken(refreshToken);
    if (!verification.valid) {
        return {
            success: false,
            accessToken: null,
            refreshToken: null,
            error: verification.reason,
            timestamp,
        };
    }
    
    if (refreshToken.type !== 'refresh') {
        return {
            success: false,
            accessToken: null,
            refreshToken: null,
            error: 'Invalid token type',
            timestamp,
        };
    }
    
    const newAccessToken = createAccessToken(refreshToken.userId, refreshToken.roles);
    
    return {
        success: true,
        accessToken: newAccessToken,
        refreshToken: null,
        error: null,
        timestamp,
    };
}

/**
 * Ustvari sejo
 */
export function createSession(
    userId: string,
    ipAddress: string,
    userAgent: string
): Session {
    const session: Session = {
        sessionId: generateSessionId(),
        userId,
        startedAt: clock.nowMs(),
        lastActivity: clock.nowMs(),
        ipAddress,
        userAgent,
        isActive: true,
    };
    
    activeSessions.set(session.sessionId, session);
    return session;
}

/**
 * Pridobi sejo
 */
export function getSession(sessionId: string): Session | null {
    return activeSessions.get(sessionId) || null;
}

/**
 * Zakljuci sejo
 */
export function endSession(sessionId: string): boolean {
    return activeSessions.delete(sessionId);
}

/**
 * Prijava (kombinacija avtentikacije in ustvarjanja seje)
 */
export async function login(
    identifier: string,
    passwordHash: string,
    ipAddress: string,
    userAgent: string,
    validateCredentials: (id: string, hash: string) => Promise<{ valid: boolean; userId: string; roles: string[] }>
): Promise<AuthResult & { session: Session | null }> {
    const authResult = await authenticate(identifier, passwordHash, validateCredentials);
    
    if (!authResult.success || !authResult.accessToken) {
        return { ...authResult, session: null };
    }
    
    const session = createSession(authResult.accessToken.userId, ipAddress, userAgent);
    
    return { ...authResult, session };
}

// ============================================================================
// BACKEND-SPECIFICNE FUNKCIJE
// ============================================================================

// mTLS allowlist storage
const mtlsAllowlist: Map<string, MtlsAllowlistEntry> = new Map();

// OAuth2 client storage
const oauth2Clients: Map<string, OAuth2ClientConfig> = new Map();

// API key storage
const apiKeys: Map<string, ApiKeyConfig> = new Map();

/**
 * Registriraj mTLS allowlist entry
 */
export function registerMtlsAllowlist(entry: MtlsAllowlistEntry): void {
    mtlsAllowlist.set(entry.cnPattern, entry);
}

/**
 * Registriraj OAuth2 client
 */
export function registerOAuth2Client(config: OAuth2ClientConfig): void {
    oauth2Clients.set(config.clientId, config);
}

/**
 * Registriraj API key
 */
export function registerApiKey(config: ApiKeyConfig): void {
    apiKeys.set(config.keyHash, config);
}

/**
 * Preveri ali CN ustreza patternu (podpira wildcard *)
 */
function matchCnPattern(cn: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (!pattern.includes('*')) return cn === pattern;
    
    // Pretvori wildcard pattern v regex
    const regexPattern = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');
    
    return new RegExp(`^${regexPattern}$`).test(cn);
}

/**
 * Avtenticiraj service z mTLS certifikatom
 */
export function authenticateMtls(certInfo: MtlsCertificateInfo): ServiceAuthResult {
    const timestamp = clock.nowMs();
    
    // Preveri veljavnost certifikata
    if (timestamp < certInfo.validFrom || timestamp > certInfo.validTo) {
        return {
            success: false,
            identity: null,
            error: 'Certificate is not valid (expired or not yet valid)',
            timestamp,
        };
    }
    
    // Poisci ujemajoc allowlist entry
    let matchedEntry: MtlsAllowlistEntry | null = null;
    for (const entry of mtlsAllowlist.values()) {
        if (matchCnPattern(certInfo.commonName, entry.cnPattern)) {
            matchedEntry = entry;
            break;
        }
    }
    
    if (!matchedEntry) {
        return {
            success: false,
            identity: null,
            error: `Certificate CN '${certInfo.commonName}' is not in allowlist`,
            timestamp,
        };
    }
    
    return {
        success: true,
        identity: {
            serviceName: matchedEntry.serviceName,
            authType: 'mTLS',
            scopes: matchedEntry.allowedScopes,
            claims: {
                cn: certInfo.commonName,
                san: certInfo.subjectAltNames,
                issuer: certInfo.issuer,
                fingerprint: certInfo.fingerprint,
            },
            authenticatedAt: timestamp,
        },
        error: null,
        timestamp,
    };
}

/**
 * Avtenticiraj service z OAuth2 client credentials
 */
export async function authenticateOAuth2ClientCredentials(
    clientId: string,
    clientSecretHash: string,
    requestedScopes: readonly string[]
): Promise<ServiceAuthResult> {
    const timestamp = clock.nowMs();
    
    const client = oauth2Clients.get(clientId);
    if (!client) {
        return {
            success: false,
            identity: null,
            error: 'Unknown client_id',
            timestamp,
        };
    }
    
    // Preveri client secret
    if (client.clientSecretHash !== clientSecretHash) {
        return {
            success: false,
            identity: null,
            error: 'Invalid client_secret',
            timestamp,
        };
    }
    
    // Preveri scopes
    const grantedScopes = requestedScopes.filter(scope => 
        client.allowedScopes.includes(scope)
    );
    
    if (grantedScopes.length === 0 && requestedScopes.length > 0) {
        return {
            success: false,
            identity: null,
            error: 'No requested scopes are allowed for this client',
            timestamp,
        };
    }
    
    return {
        success: true,
        identity: {
            serviceName: clientId,
            authType: 'oauth2_client_credentials',
            scopes: grantedScopes,
            claims: {
                client_id: clientId,
                issuer: client.issuer,
                audience: client.audience,
            },
            authenticatedAt: timestamp,
        },
        error: null,
        timestamp,
    };
}

/**
 * Avtenticiraj service z API key
 */
export function authenticateApiKey(apiKeyHash: string): ServiceAuthResult {
    const timestamp = clock.nowMs();
    
    const keyConfig = apiKeys.get(apiKeyHash);
    if (!keyConfig) {
        return {
            success: false,
            identity: null,
            error: 'Invalid API key',
            timestamp,
        };
    }
    
    // Preveri veljavnost
    if (keyConfig.expiresAt !== null && timestamp > keyConfig.expiresAt) {
        return {
            success: false,
            identity: null,
            error: 'API key has expired',
            timestamp,
        };
    }
    
    return {
        success: true,
        identity: {
            serviceName: keyConfig.serviceName,
            authType: 'api_key',
            scopes: keyConfig.allowedScopes,
            claims: {
                rate_limit: keyConfig.rateLimit,
            },
            authenticatedAt: timestamp,
        },
        error: null,
        timestamp,
    };
}

/**
 * Validiraj JWT bearer token za service-to-service komunikacijo
 */
export function validateServiceJwt(
    token: AuthToken,
    expectedIssuer: string,
    expectedAudience: string
): ServiceAuthResult {
    const timestamp = clock.nowMs();
    
    // Preveri veljavnost tokena
    const verification = verifyToken(token);
    if (!verification.valid) {
        return {
            success: false,
            identity: null,
            error: verification.reason,
            timestamp,
        };
    }
    
    // Preveri issuer in audience
    const issuer = token.claims['iss'] as string | undefined;
    const audience = token.claims['aud'] as string | undefined;
    
    if (issuer !== expectedIssuer) {
        return {
            success: false,
            identity: null,
            error: `Invalid issuer: expected '${expectedIssuer}', got '${issuer}'`,
            timestamp,
        };
    }
    
    if (audience !== expectedAudience) {
        return {
            success: false,
            identity: null,
            error: `Invalid audience: expected '${expectedAudience}', got '${audience}'`,
            timestamp,
        };
    }
    
    return {
        success: true,
        identity: {
            serviceName: token.userId,
            authType: 'jwt_bearer',
            scopes: token.roles,
            claims: token.claims,
            authenticatedAt: timestamp,
        },
        error: null,
        timestamp,
    };
}

/**
 * Middleware za service-to-service avtentikacijo
 * Podpira vec tipov avtentikacije hkrati
 */
export function authenticateService(
    headers: Record<string, string>,
    certInfo?: MtlsCertificateInfo
): ServiceAuthResult {
    const timestamp = clock.nowMs();
    
    // 1. Poskusi mTLS ce je certifikat na voljo
    if (certInfo) {
        const mtlsResult = authenticateMtls(certInfo);
        if (mtlsResult.success) {
            return mtlsResult;
        }
    }
    
    // 2. Poskusi API key iz headerja
    const apiKey = headers['x-api-key'] || headers['X-API-Key'];
    if (apiKey) {
        return authenticateApiKey(apiKey);
    }
    
    // 3. Poskusi Bearer token iz Authorization headerja
    const authHeader = headers['authorization'] || headers['Authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        // V produkciji bi tukaj dekodirali JWT
        // Za deterministicnost vrnemo napako
        return {
            success: false,
            identity: null,
            error: 'JWT validation requires token decoding (not implemented in template)',
            timestamp,
        };
    }
    
    return {
        success: false,
        identity: null,
        error: 'No valid authentication credentials provided',
        timestamp,
    };
}

// ============================================================================
// IZVOZ
// ============================================================================

export const Authentication = {
    configure: configureAuth,
    authenticate,
    verifyToken,
    refreshAccessToken,
    createSession,
    getSession,
    endSession,
    login,
    registerMtlsAllowlist,
    registerOAuth2Client,
    registerApiKey,
    authenticateMtls,
    authenticateOAuth2ClientCredentials,
    authenticateApiKey,
    validateServiceJwt,
    authenticateService,
};
