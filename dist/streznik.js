"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRIVZETA_KONFIGURACIJA = void 0;
exports.zazeniStreznik = zazeniStreznik;
exports.obdelajZahtevo = obdelajZahtevo;
const clock_1 = require("@mia/core/clock");
const clock = (0, clock_1.getClock)();
const http_1 = require("http");
// ============================================================================
// KONSTANTE
// ============================================================================
const PRIVZETA_KONFIGURACIJA = {
    vrata: 3000,
    gostitelj: '0.0.0.0',
    casOvitka: 30000,
};
exports.PRIVZETA_KONFIGURACIJA = PRIVZETA_KONFIGURACIJA;
// ============================================================================
// FUNKCIJE
// ============================================================================
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
function obdelajZahtevo(zahteva, odgovor) {
    const zacetek = clock.nowMs();
    const pot = zahteva.url ?? '/';
    const metoda = zahteva.method ?? 'GET';
    // Zdravstvena pot
    if (pot === '/zdravje') {
        const podatki = {
            status: 'zdrav',
            verzija: '1.0.0',
            domena: 'Zaledni sistemi',
            cas: '2024-12-24',
        };
        odgovor.writeHead(200, { 'Content-Type': 'application/json' });
        odgovor.end(JSON.stringify(podatki));
        return {
            uspesno: true,
            statusnaKoda: 200,
            podatki,
            casObdelave: clock.nowMs() - zacetek,
        };
    }
    // Metapodatki
    if (pot === '/metapodatki') {
        const podatki = {
            ime: 'NexGen',
            verzija: '1.0.0',
            avtor: 'MIA BUILD',
            opis: 'MIA BUILD project: NexGen',
            domena: 'Zaledni sistemi',
            datum: '2024-12-24',
            leto: '2024',
            skladnost: ['DO-178C', 'IEC-61508', 'ISO-26262', 'MIL-STD-882E'],
        };
        odgovor.writeHead(200, { 'Content-Type': 'application/json' });
        odgovor.end(JSON.stringify(podatki));
        return {
            uspesno: true,
            statusnaKoda: 200,
            podatki,
            casObdelave: clock.nowMs() - zacetek,
        };
    }
    // Privzeta pot
    const podatki = {
        sporocilo: 'Dobrodosli v NexGen',
        pot,
        metoda,
    };
    odgovor.writeHead(200, { 'Content-Type': 'application/json' });
    odgovor.end(JSON.stringify(podatki));
    return {
        uspesno: true,
        statusnaKoda: 200,
        podatki,
        casObdelave: clock.nowMs() - zacetek,
    };
}
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
function zazeniStreznik(konfiguracija = PRIVZETA_KONFIGURACIJA) {
    return new Promise((razresi, zavrni) => {
        const streznik = (0, http_1.createServer)((zahteva, odgovor) => {
            try {
                obdelajZahtevo(zahteva, odgovor);
            }
            catch (napaka) {
                odgovor.writeHead(500, { 'Content-Type': 'application/json' });
                odgovor.end(JSON.stringify({
                    napaka: napaka instanceof Error ? napaka.message : 'Neznana napaka',
                }));
            }
        });
        streznik.timeout = konfiguracija.casOvitka;
        streznik.listen(konfiguracija.vrata, konfiguracija.gostitelj, () => {
            console.log(`Streznik tece na http://${konfiguracija.gostitelj}:${konfiguracija.vrata}`);
            razresi();
        });
        streznik.on('error', (napaka) => {
            zavrni(napaka);
        });
    });
}
