/**
 * @file Zaledni streznik za NexGen
 * @author MIA BUILD
 * @version 1.0.0
 * @date 2024-12-24
 * @project NexGen
 * @domain Zaledni sistemi
 *
 * @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
 * @integrity SIL-2
 */
import { IncomingMessage, ServerResponse } from 'http';
/**
 * Konfiguracija streznika
 *
 * @requirement ZAH-FUNK-001
 * @design DSN-001
 */
interface KonfiguracijaStreznika {
    readonly vrata: number;
    readonly gostitelj: string;
    readonly casOvitka: number;
}
/**
 * Rezultat zahteve
 *
 * @requirement ZAH-FUNK-002
 * @design DSN-002
 */
interface RezultatZahteve {
    readonly uspesno: boolean;
    readonly statusnaKoda: number;
    readonly podatki: Readonly<Record<string, unknown>>;
    readonly casObdelave: number;
}
declare const PRIVZETA_KONFIGURACIJA: KonfiguracijaStreznika;
/**
 * Obdelaj zahtevo
 *
 * @param zahteva - Vhodna zahteva
 * @param odgovor - Izhodni odgovor
 * @returns Rezultat zahteve
 *
 * @requirement ZAH-FUNK-002
 * @design DSN-002
 * @test TEST-002
 */
declare function obdelajZahtevo(zahteva: IncomingMessage, odgovor: ServerResponse): RezultatZahteve;
/**
 * Zazeni streznik
 *
 * @param konfiguracija - Konfiguracija streznika
 * @returns Promise ki se razresi ko streznik tece
 *
 * @requirement ZAH-FUNK-001
 * @design DSN-001
 * @test TEST-001
 */
export declare function zazeniStreznik(konfiguracija?: KonfiguracijaStreznika): Promise<void>;
export type { KonfiguracijaStreznika, RezultatZahteve };
export { PRIVZETA_KONFIGURACIJA, obdelajZahtevo };
