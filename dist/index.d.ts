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
/**
 * Domensko-specificne konstante za Zaledni sistemi
 * @requirement ZAH-DOMENA-02-002
 * @design DSN-DOMENA-02-002
 */
export declare const DOMENA_INFO: {
    readonly ime: "Zaledni sistemi";
    readonly templateDir: "ZALEDNI_SISTEMI";
    readonly opis: "Strezniška logika in API-ji";
    readonly kljucneBesede: readonly ["REST", "GraphQL", "gRPC", "middleware", "controller"];
    readonly verzija: "1.0.0";
    readonly domena_id: "DOMENA_02";
    readonly kategorije: readonly ["CAT_02_API", "CAT_02_MIDDLEWARE", "CAT_02_DATABASE", "CAT_02_CACHE", "CAT_02_QUEUE", "CAT_02_SECURITY", "CAT_02_JOBS", "CAT_02_GATEWAY", "CAT_02_OBSERVABILITY", "CAT_02_COMPLIANCE"];
};
/**
 * Varnostne konstante za Zaledni sistemi
 * @requirement ZAH-DOMENA-02-004
 * @design DSN-DOMENA-02-004
 */
export declare const VARNOST_KONSTANTE: {
    readonly sifriranje: "AES-256-GCM";
    readonly hashAlgoritem: "SHA-256";
    readonly tlsVerzija: "1.3";
    readonly jwtAlgoritem: "RS256";
    readonly rbacNivoji: readonly ["admin", "operator", "viewer", "auditor"];
};
/**
 * SLA konstante za Zaledni sistemi
 * @requirement ZAH-DOMENA-02-005
 * @design DSN-DOMENA-02-005
 */
export declare const SLA_KONSTANTE: {
    readonly platinum: {
        readonly razpolozljivost: 99.99;
        readonly latenca: 10;
    };
    readonly gold: {
        readonly razpolozljivost: 99.9;
        readonly latenca: 50;
    };
    readonly silver: {
        readonly razpolozljivost: 99.5;
        readonly latenca: 100;
    };
};
/**
 * Skladnostni standardi za Zaledni sistemi
 * @requirement ZAH-DOMENA-02-006
 * @design DSN-DOMENA-02-006
 */
export declare const SKLADNOST_STANDARDI: {
    readonly aviation: "DO-178C";
    readonly safety: "IEC-61508";
    readonly automotive: "ISO-26262";
    readonly military: "MIL-STD-882E";
};
/**
 * Privzeti izvoz za ZALEDNI_SISTEMI
 * @requirement ZAH-DOMENA-02-003
 * @design DSN-DOMENA-02-003
 * @test TST-DOMENA-02-003
 */
declare const _default: {
    DOMENA_INFO: {
        readonly ime: "Zaledni sistemi";
        readonly templateDir: "ZALEDNI_SISTEMI";
        readonly opis: "Strezniška logika in API-ji";
        readonly kljucneBesede: readonly ["REST", "GraphQL", "gRPC", "middleware", "controller"];
        readonly verzija: "1.0.0";
        readonly domena_id: "DOMENA_02";
        readonly kategorije: readonly ["CAT_02_API", "CAT_02_MIDDLEWARE", "CAT_02_DATABASE", "CAT_02_CACHE", "CAT_02_QUEUE", "CAT_02_SECURITY", "CAT_02_JOBS", "CAT_02_GATEWAY", "CAT_02_OBSERVABILITY", "CAT_02_COMPLIANCE"];
    };
    DOMENA_KONSTANTE: any;
    inicializirajJedro: typeof import("./jedro").inicializirajJedro;
    izvediOperacijo: typeof import("./jedro").izvediOperacijo;
    pridobiStanje: typeof import("./jedro").pridobiStanje;
    PRIVZETA_KONFIGURACIJA: typeof PRIVZETA_KONFIGURACIJA;
};
export default _default;
