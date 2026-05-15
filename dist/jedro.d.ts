/**
 * @file Jedro sistema NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @project NexGen
 * @domain Zaledni sistemi
 *
 * @description
 * MIA BUILD project: NexGen
 *
 * Domena: Zaledni sistemi
 * Opis: Strezniška logika in API-ji
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @integrity SIL-2
 */
/**
 * Domensko-specificni tipi za Zaledni sistemi
 * Domena: BACKEND_SYSTEMS
 */
export interface ZALEDNISISTEMIKonfiguracija {
    readonly domena: 'BACKEND_SYSTEMS';
    readonly kategorije: readonly ['API razvoj', 'Vmesna programska oprema'];
    readonly moduli: readonly ['Koncne tocke', 'Shema', 'JWT'];
    readonly funkcije: readonly ['Ustvari', 'Preberi', 'Posodobi', 'Izbrisi', 'Poizvedba'];
    readonly kljucniBesede: readonly ['REST', 'GraphQL', 'gRPC', 'middleware', 'controller'];
}
export declare const BACKEND_SYSTEMS_CONSTANTS: {
    readonly IME: "Zaledni sistemi";
    readonly OPIS: "Strezniška logika in API-ji";
    readonly KATEGORIJE: readonly ["API razvoj", "Vmesna programska oprema"];
    readonly MODULI: readonly ["Koncne tocke", "Shema", "JWT"];
    readonly FUNKCIJE: readonly ["Ustvari", "Preberi", "Posodobi", "Izbrisi", "Poizvedba"];
    readonly KLJUCNE_BESEDE: readonly ["REST", "GraphQL", "gRPC", "middleware", "controller"];
};
/**
 * Konfiguracija jedra sistema za domeno Zaledni sistemi
 *
 * @requirement ZAH-FUNK-001
 * @design DSN-001
 */
export interface KonfiguracijaJedra {
    readonly projectName: string;
    readonly verzija: string;
    readonly domena: 'BACKEND_SYSTEMS';
    readonly moduli: readonly string[];
    readonly funkcije: readonly string[];
    readonly deterministicMode: boolean;
    readonly domainData: typeof BACKEND_SYSTEMS_CONSTANTS;
}
/**
 * Rezultat operacije jedra za Zaledni sistemi
 *
 * @requirement ZAH-FUNK-003
 * @design DSN-003
 */
export interface RezultatOperacije {
    readonly uspesno: boolean;
    readonly sporocilo: string;
    readonly podatki: Readonly<Record<string, unknown>>;
    readonly casIzvajanja: number;
    readonly domena: 'BACKEND_SYSTEMS';
}
/**
 * Privzeta konfiguracija jedra za Zaledni sistemi
 *
 * @requirement ZAH-FUNK-001
 */
export declare const DEFAULT_CONFIG: CoreConfig;
/**
 * Inicializiraj jedro sistema za domeno Zaledni sistemi
 *
 * @param konfiguracija - Konfiguracija jedra
 * @returns Rezultat inicializacije
 *
 * @requirement ZAH-FUNK-001
 * @design DSN-001
 * @test TEST-001
 */
export declare function inicializirajJedro(konfiguracija?: KonfiguracijaJedra): RezultatOperacije;
/**
 * Izvedi operacijo v jedru za Zaledni sistemi
 *
 * @param operacija - Ime operacije
 * @param parametri - Parametri operacije
 * @returns Rezultat operacije
 *
 * @requirement ZAH-FUNK-002
 * @design DSN-002
 * @test TEST-002
 */
export declare function izvediOperacijo(operacija: string, parametri?: Readonly<Record<string, unknown>>): RezultatOperacije;
/**
 * Pridobi stanje jedra za Zaledni sistemi
 *
 * @returns Trenutno stanje jedra
 *
 * @requirement ZAH-FUNK-003
 * @design DSN-003
 * @test TEST-003
 */
export declare function pridobiStanje(): RezultatOperacije;
export type JedroMehanizem = {
    readonly inicializirajJedro: typeof inicializirajJedro;
    readonly izvediOperacijo: typeof izvediOperacijo;
    readonly pridobiStanje: typeof pridobiStanje;
    readonly PRIVZETA_KONFIGURACIJA: typeof PRIVZETA_KONFIGURACIJA;
    readonly DOMENA_KONSTANTE: typeof BACKEND_SYSTEMS_CONSTANTS;
};
export declare const JEDRO_MEHANIZEM: JedroMehanizem;
