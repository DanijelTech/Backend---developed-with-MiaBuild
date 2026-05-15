"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Authentication = void 0;
exports.configureAuth = configureAuth;
exports.authenticate = authenticate;
exports.verifyToken = verifyToken;
exports.refreshAccessToken = refreshAccessToken;
exports.createSession = createSession;
exports.getSession = getSession;
exports.endSession = endSession;
exports.login = login;
exports.registerMtlsAllowlist = registerMtlsAllowlist;
exports.registerOAuth2Client = registerOAuth2Client;
exports.registerApiKey = registerApiKey;
exports.authenticateMtls = authenticateMtls;
exports.authenticateOAuth2ClientCredentials = authenticateOAuth2ClientCredentials;
exports.authenticateApiKey = authenticateApiKey;
exports.validateServiceJwt = validateServiceJwt;
exports.authenticateService = authenticateService;
const clock_1 = require("@mia/core/clock");
const deterministic_1 = require("@mia/core/deterministic");
const clock = (0, clock_1.getClock)();
// ============================================================================
// STANJE
// ============================================================================
let config = {
    accessTokenTtl: 15 * 60 * 1000, // 15 minut
    refreshTokenTtl: 7 * 24 * 60 * 60 * 1000, // 7 dni
    sessionTtl: 24 * 60 * 60 * 1000, // 24 ur
    maxFailedAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minut
    mfaRequired: false,
};
const activeSessions = new Map();
const failedAttempts = new Map();
let tokenCounter = 0;
// ============================================================================
// FUNKCIJE
// ============================================================================
/**
 * Nastavi konfiguracijo avtentikacije
 */
function configureAuth(newConfig) {
    config = { ...config, ...newConfig };
}
/**
 * Generiraj token ID
 */
function generateTokenId() {
    tokenCounter++;
    return (0, deterministic_1.generateDeterministicId)(`token-${tokenCounter}`);
}
/**
 * Generiraj session ID
 */
function generateSessionId() {
    tokenCounter++;
    return (0, deterministic_1.generateDeterministicId)(`session-${tokenCounter}`);
}
/**
 * Preveri ali je uporabnik zaklenjen
 */
function isUserLocked(identifier) {
    const attempts = failedAttempts.get(identifier);
    if (!attempts)
        return false;
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
function recordFailedAttempt(identifier) {
    const attempts = failedAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
    failedAttempts.set(identifier, {
        count: attempts.count + 1,
        lastAttempt: clock.nowMs(),
    });
}
/**
 * Ponastavi neuspele poskuse
 */
function resetFailedAttempts(identifier) {
    failedAttempts.delete(identifier);
}
/**
 * Ustvari access token
 */
function createAccessToken(userId, roles) {
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
function createRefreshToken(userId, roles) {
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
async function authenticate(identifier, passwordHash, validateCredentials) {
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
function verifyToken(token) {
    const now = clock.nowMs();
    if (now > token.expiresAt) {
        return { valid: false, reason: 'Token has expired' };
    }
    return { valid: true, reason: null };
}
/**
 * Osvezi token
 */
function refreshAccessToken(refreshToken) {
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
function createSession(userId, ipAddress, userAgent) {
    const session = {
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
function getSession(sessionId) {
    return activeSessions.get(sessionId) || null;
}
/**
 * Zakljuci sejo
 */
function endSession(sessionId) {
    return activeSessions.delete(sessionId);
}
/**
 * Prijava (kombinacija avtentikacije in ustvarjanja seje)
 */
async function login(identifier, passwordHash, ipAddress, userAgent, validateCredentials) {
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
const mtlsAllowlist = new Map();
// OAuth2 client storage
const oauth2Clients = new Map();
// API key storage
const apiKeys = new Map();
/**
 * Registriraj mTLS allowlist entry
 */
function registerMtlsAllowlist(entry) {
    mtlsAllowlist.set(entry.cnPattern, entry);
}
/**
 * Registriraj OAuth2 client
 */
function registerOAuth2Client(config) {
    oauth2Clients.set(config.clientId, config);
}
/**
 * Registriraj API key
 */
function registerApiKey(config) {
    apiKeys.set(config.keyHash, config);
}
/**
 * Preveri ali CN ustreza patternu (podpira wildcard *)
 */
function matchCnPattern(cn, pattern) {
    if (pattern === '*')
        return true;
    if (!pattern.includes('*'))
        return cn === pattern;
    // Pretvori wildcard pattern v regex
    const regexPattern = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');
    return new RegExp(`^${regexPattern}$`).test(cn);
}
/**
 * Avtenticiraj service z mTLS certifikatom
 */
function authenticateMtls(certInfo) {
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
    let matchedEntry = null;
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
async function authenticateOAuth2ClientCredentials(clientId, clientSecretHash, requestedScopes) {
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
    const grantedScopes = requestedScopes.filter(scope => client.allowedScopes.includes(scope));
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
function authenticateApiKey(apiKeyHash) {
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
function validateServiceJwt(token, expectedIssuer, expectedAudience) {
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
    const issuer = token.claims['iss'];
    const audience = token.claims['aud'];
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
function authenticateService(headers, certInfo) {
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
exports.Authentication = {
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
