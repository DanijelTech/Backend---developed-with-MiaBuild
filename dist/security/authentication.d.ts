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
/**
 * Nastavi konfiguracijo avtentikacije
 */
export declare function configureAuth(newConfig: Partial<AuthConfig>): void;
/**
 * Avtenticiraj uporabnika
 */
export declare function authenticate(identifier: string, passwordHash: string, validateCredentials: (id: string, hash: string) => Promise<{
    valid: boolean;
    userId: string;
    roles: string[];
}>): Promise<AuthResult>;
/**
 * Preveri veljavnost tokena
 */
export declare function verifyToken(token: AuthToken): {
    valid: boolean;
    reason: string | null;
};
/**
 * Osvezi token
 */
export declare function refreshAccessToken(refreshToken: AuthToken): AuthResult;
/**
 * Ustvari sejo
 */
export declare function createSession(userId: string, ipAddress: string, userAgent: string): Session;
/**
 * Pridobi sejo
 */
export declare function getSession(sessionId: string): Session | null;
/**
 * Zakljuci sejo
 */
export declare function endSession(sessionId: string): boolean;
/**
 * Prijava (kombinacija avtentikacije in ustvarjanja seje)
 */
export declare function login(identifier: string, passwordHash: string, ipAddress: string, userAgent: string, validateCredentials: (id: string, hash: string) => Promise<{
    valid: boolean;
    userId: string;
    roles: string[];
}>): Promise<AuthResult & {
    session: Session | null;
}>;
/**
 * Registriraj mTLS allowlist entry
 */
export declare function registerMtlsAllowlist(entry: MtlsAllowlistEntry): void;
/**
 * Registriraj OAuth2 client
 */
export declare function registerOAuth2Client(config: OAuth2ClientConfig): void;
/**
 * Registriraj API key
 */
export declare function registerApiKey(config: ApiKeyConfig): void;
/**
 * Avtenticiraj service z mTLS certifikatom
 */
export declare function authenticateMtls(certInfo: MtlsCertificateInfo): ServiceAuthResult;
/**
 * Avtenticiraj service z OAuth2 client credentials
 */
export declare function authenticateOAuth2ClientCredentials(clientId: string, clientSecretHash: string, requestedScopes: readonly string[]): Promise<ServiceAuthResult>;
/**
 * Avtenticiraj service z API key
 */
export declare function authenticateApiKey(apiKeyHash: string): ServiceAuthResult;
/**
 * Validiraj JWT bearer token za service-to-service komunikacijo
 */
export declare function validateServiceJwt(token: AuthToken, expectedIssuer: string, expectedAudience: string): ServiceAuthResult;
/**
 * Middleware za service-to-service avtentikacijo
 * Podpira vec tipov avtentikacije hkrati
 */
export declare function authenticateService(headers: Record<string, string>, certInfo?: MtlsCertificateInfo): ServiceAuthResult;
export declare const Authentication: {
    configure: typeof configureAuth;
    authenticate: typeof authenticate;
    verifyToken: typeof verifyToken;
    refreshAccessToken: typeof refreshAccessToken;
    createSession: typeof createSession;
    getSession: typeof getSession;
    endSession: typeof endSession;
    login: typeof login;
    registerMtlsAllowlist: typeof registerMtlsAllowlist;
    registerOAuth2Client: typeof registerOAuth2Client;
    registerApiKey: typeof registerApiKey;
    authenticateMtls: typeof authenticateMtls;
    authenticateOAuth2ClientCredentials: typeof authenticateOAuth2ClientCredentials;
    authenticateApiKey: typeof authenticateApiKey;
    validateServiceJwt: typeof validateServiceJwt;
    authenticateService: typeof authenticateService;
};
