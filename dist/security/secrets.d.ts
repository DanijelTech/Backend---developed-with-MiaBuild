/**
 * @file Secrets management modul za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @domain Zaledni sistemi
 *
 * @requirement ZAH-ZALEDNI-SEC-005 Secrets management za zaledne sisteme
 * @design DSN-ZALEDNI-SEC-005 Backend secrets management arhitektura
 * @test TEST-ZALEDNI-SEC-005 Preverjanje secrets management funkcionalnosti
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @meta_atom SEC_005 - Secrets Management
 */
/**
 * Vir skrivnosti
 */
export type SecretSource = 'env' | 'config' | 'vault' | 'file';
/**
 * Skrivnost
 */
export interface Secret {
    /** Ime skrivnosti */
    readonly name: string;
    /** Vrednost */
    readonly value: string;
    /** Vir */
    readonly source: SecretSource;
    /** Cas nalaganja */
    readonly loadedAt: number;
    /** Cas poteka */
    readonly expiresAt: number | null;
}
/**
 * Konfiguracija secrets managerja
 */
export interface SecretsConfig {
    /** Privzeti vir */
    readonly defaultSource: SecretSource;
    /** Pot do config datoteke */
    readonly configPath: string | null;
    /** Vault URL */
    readonly vaultUrl: string | null;
    /** Vault token */
    readonly vaultToken: string | null;
    /** Ali naj se skrivnosti cachirajo */
    readonly cacheEnabled: boolean;
    /** Trajanje cache-a v ms */
    readonly cacheTtl: number;
}
/**
 * Nastavi konfiguracijo
 */
export declare function configureSecrets(newConfig: Partial<SecretsConfig>): void;
/**
 * Pridobi skrivnost
 */
export declare function getSecret(name: string, source?: SecretSource): Promise<string | null>;
/**
 * Pridobi skrivnost sinhrono (samo iz env ali cache)
 */
export declare function getSecretSync(name: string): string | null;
/**
 * Nalozi vec skrivnosti
 */
export declare function loadSecrets(names: readonly string[]): Promise<Map<string, string>>;
/**
 * Pocisti cache
 */
export declare function clearSecretsCache(): void;
/**
 * Preveri ali skrivnost obstaja
 */
export declare function hasSecret(name: string): Promise<boolean>;
/**
 * Nastavi skrivnost (samo za testiranje)
 */
export declare function setSecret(name: string, value: string, source?: SecretSource): void;
export declare const Secrets: {
    configure: typeof configureSecrets;
    getSecret: typeof getSecret;
    getSecretSync: typeof getSecretSync;
    loadSecrets: typeof loadSecrets;
    clearSecretsCache: typeof clearSecretsCache;
    hasSecret: typeof hasSecret;
    setSecret: typeof setSecret;
};
