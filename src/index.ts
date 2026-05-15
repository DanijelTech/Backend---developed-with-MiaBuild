/**
 * @file Vstopna tocka za Zaledni sistemi
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @project NexGen
 * @domain ZALEDNI_SISTEMI
 * 
 * @description
 * MIA BUILD project: NexGen
 * 
 * Domena: Zaledni sistemi
 * Opis: Strezniška logika in API-ji
 * 
 * @traceability
 *   @requirement ZAH-DOMENA-02-001
 *   @design DSN-DOMENA-02-001
 *   @test TST-DOMENA-02-001
 *   @function_id FN_02_CREATE
 *   @hazard_id HAZ-BACKEND-001
 * 
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @integrity SIL-4
 */

export * from './jedro';

import { JEDRO_MEHANIZEM, DOMENA_ZALEDNI_SISTEMI_KONSTANTE } from './jedro';

/**
 * Domensko-specificne konstante za Zaledni sistemi
 * @requirement ZAH-DOMENA-02-002
 * @design DSN-DOMENA-02-002
 */
export const DOMENA_INFO = {
    ime: 'Zaledni sistemi',
    templateDir: 'ZALEDNI_SISTEMI',
    opis: 'Strezniška logika in API-ji',
    kljucneBesede: ['REST', 'GraphQL', 'gRPC', 'middleware', 'controller'] as const,
    verzija: '1.0.0',
    domena_id: 'DOMENA_02',
    kategorije: ['CAT_02_API', 'CAT_02_MIDDLEWARE', 'CAT_02_DATABASE', 'CAT_02_CACHE', 'CAT_02_QUEUE', 'CAT_02_SECURITY', 'CAT_02_JOBS', 'CAT_02_GATEWAY', 'CAT_02_OBSERVABILITY', 'CAT_02_COMPLIANCE'] as const,
} as const;

/**
 * Varnostne konstante za Zaledni sistemi
 * @requirement ZAH-DOMENA-02-004
 * @design DSN-DOMENA-02-004
 */
export const VARNOST_KONSTANTE = {
    sifriranje: 'AES-256-GCM',
    hashAlgoritem: 'SHA-256',
    tlsVerzija: '1.3',
    jwtAlgoritem: 'RS256',
    rbacNivoji: ['admin', 'operator', 'viewer', 'auditor'] as const,
} as const;

/**
 * SLA konstante za Zaledni sistemi
 * @requirement ZAH-DOMENA-02-005
 * @design DSN-DOMENA-02-005
 */
export const SLA_KONSTANTE = {
    platinum: { razpolozljivost: 99.99, latenca: 10 },
    gold: { razpolozljivost: 99.9, latenca: 50 },
    silver: { razpolozljivost: 99.5, latenca: 100 },
} as const;

/**
 * Skladnostni standardi za Zaledni sistemi
 * @requirement ZAH-DOMENA-02-006
 * @design DSN-DOMENA-02-006
 */
export const SKLADNOST_STANDARDI = {
    aviation: 'DO-178C',
    safety: 'IEC-61508',
    automotive: 'ISO-26262',
    military: 'MIL-STD-882E',
} as const;

/**
 * Privzeti izvoz za ZALEDNI_SISTEMI
 * @requirement ZAH-DOMENA-02-003
 * @design DSN-DOMENA-02-003
 * @test TST-DOMENA-02-003
 */
export default {
    ...JEDRO_MEHANIZEM,
    DOMENA_INFO,
    DOMENA_KONSTANTE: DOMENA_ZALEDNI_SISTEMI_KONSTANTE,
};
