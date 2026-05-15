# POLITIKA KODIRANJA

**Projekt:** NexGen
**Verzija:** 1.0.0
**Domena:** Zaledni sistemi
**Datum:** 2024-12-24
**Avtor:** MIA BUILD

---

## 1. UVOD

### 1.1 Namen
Ta dokument opisuje politiko kodiranja za projekt NexGen v domeni **Zaledni sistemi** (ZALEDNI_SISTEMI).

### 1.2 Domensko-specificni kontekst
Strezniška logika in API-ji

### 1.3 Kljucni koncepti za ZALEDNI_SISTEMI
- REST
- GraphQL
- gRPC
- middleware
- controller

---

## 2. STANDARDI KODIRANJA ZA Zaledni sistemi

### 2.1 Jezik in orodja
- **Jezik:** TypeScript 5.x
- **Runtime:** Node.js 18+
- **Linter:** ESLint
- **Formatter:** Prettier

### 2.2 Domensko-specificne konvencije za ZALEDNI_SISTEMI
- Vse domensko-specificne konstante morajo biti v DOMENA_ZALEDNI_SISTEMI_KONSTANTE
- Vsi tipi morajo vkljucevati domensko oznako
- Funkcije morajo vracati domensko oznako v rezultatu

### 2.3 Imenovanje za Zaledni sistemi
- **Datoteke:** kebab-case (npr. jedro-zaledni_sistemi.ts)
- **Razredi:** PascalCase (npr. ZALEDNISISTEMIJedro)
- **Funkcije:** camelCase (npr. inicializirajZALEDNISISTEMIJedro)
- **Konstante:** SCREAMING_SNAKE_CASE (npr. DOMENA_ZALEDNI_SISTEMI_KONSTANTE)
- **Vmesniki:** PascalCase z I prefiksom (npr. IZALEDNISISTEMIKonfiguracija)

---

## 3. DETERMINISTICNOST ZA ZALEDNI_SISTEMI

### 3.1 Prepovedane prakse
- **PREPOVEDANO:** Uporaba nekontroliranega casa - uporabi `clock.nowMs()`
- **PREPOVEDANO:** Uporaba nedeterministicne nakljucnosti - uporabi seed-based generator
- **PREPOVEDANO:** Uporaba nekontrolirane kriptografske nakljucnosti - uporabi deterministicni hash
- **PREPOVEDANO:** Omrezni klici med gradnjo

### 3.2 Obvezne prakse za Zaledni sistemi
- Uporabi `@mia/core/clock` za cas
- Uporabi deterministicne ID generatorje
- Vsi testi morajo biti ponovljivi

---

## 4. VARNOST ZA ZALEDNI_SISTEMI

### 4.1 Obvezni varnostni ukrepi
- Vsi artefakti morajo biti podpisani (COSIGN)
- SBOM mora biti generiran (SYFT)
- Varnostno skeniranje mora biti izvedeno (TRIVY)

### 4.2 Prepovedane prakse
- Shranjevanje skrivnosti v kodi
- Uporaba nevarnih funkcij (eval, Function)
- Uporaba nedovoljenih odvisnosti

---

## 5. TEHNICNA SPECIFIKACIJA ZA ZALEDNI SISTEMI

### 5.1 Obvezna dokumentacija
- JSDoc komentarji za vse javne funkcije
- @requirement oznake za sledljivost
- @test oznake za povezavo s testi
- @compliance oznake za skladnost

### 5.2 Domensko-specificna dokumentacija za ZALEDNI_SISTEMI
- Opis domensko-specificnih konceptov
- Primeri uporabe za Zaledni sistemi
- Sledljivost do domenskih zahtev

---

**Domena:** Zaledni sistemi
**Konec dokumenta**
