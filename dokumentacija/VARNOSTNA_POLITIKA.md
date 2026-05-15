<!-- @document_id DOC-SEC-DOMENA02-001 -->
<!-- @version 1.0.0 -->
<!-- @domain ZALEDNI_SISTEMI -->
<!-- @requirement ZAH-SEC-001 Varnostna politika mora definirati vse varnostne zahteve -->
<!-- @design DSN-SEC-001 Strukturirana varnostna politika z domensko-specificnimi elementi -->
<!-- @test TST-SEC-001 Verifikacija implementacije vseh varnostnih zahtev -->
<!-- @hazard_id HAZ-SEC-001 -->
<!-- Generated: {{DATUM_GENERACIJE}} -->
# Varnostna politika: NexGen

**Verzija:** 1.0.0  
**Datum:** 2024-12-24  
**Avtor:** MIA BUILD  
**Domena:** Zaledni sistemi (ZALEDNI_SISTEMI)

---

## 1. NAMEN

### 1.1 Namen dokumenta

Ta dokument opisuje varnostno politiko za backend sistem NexGen. Dokument je skladen z DO-178C, IEC-61508, ISO-26262 in MIL-STD-882E standardi.

### Backend-specifični varnostni elementi
- **Service-to-Service Authentication**: mTLS za interno komunikacijo
- **Database Security**: Connection encryption, row-level security
- **Message Queue Security**: TLS, SASL avtentikacija
- **Secrets Management**: HashiCorp Vault integracija
- **API Security**: OAuth2 client credentials, rate limiting

---

## 2. Avtentikacija

### 2.1 Politika gesel

| Parameter | Zahteva |
|-----------|---------|
| Minimalna dolžina | 12 znakov |
| Kompleksnost | Velike, male črke, številke, posebni znaki |
| Zgodovina | Zadnjih 12 gesel ni dovoljeno ponovno uporabiti |
| Veljavnost | 90 dni |
| Zaklepanje | Po 5 neuspelih poskusih |

### 2.2 Večfaktorska avtentikacija (MFA)

| Vloga | MFA zahtevana |
|-------|---------------|
| Administrator | Da (obvezno) |
| Developer | Da (obvezno) |
| Uporabnik | Da (priporočeno) |
| API dostop | Da (service account) |

### 2.3 Implementacija

Avtentikacija je implementirana v `src/security/authentication.ts`:
- JWT tokeni z RS256 podpisom
- Refresh token rotacija
- Session management
- Brute force zaščita

---

## 3. Avtorizacija

### 3.1 Model RBAC

| Vloga | Pravice |
|-------|---------|
| admin | Vse operacije |
| editor | Branje, pisanje, brisanje lastnih virov |
| viewer | Samo branje |
| api | Omejene API operacije |

### 3.2 Principi

- **Least Privilege:** Uporabniki imajo minimalne potrebne pravice
- **Separation of Duties:** Kritične operacije zahtevajo več odobritev
- **Need to Know:** Dostop do podatkov samo ko je potrebno

### 3.3 Implementacija

Avtorizacija je implementirana v `src/security/authorization.ts`:
- Role-based access control (RBAC)
- Permission checking middleware
- Resource-level permissions
- Audit logging vseh dostopov

---

## 4. Šifriranje

### 4.1 Šifriranje v mirovanju (At Rest)

| Podatki | Algoritem | Dolžina ključa |
|---------|-----------|----------------|
| Database | AES-256-GCM | 256 bit |
| Datoteke | AES-256-GCM | 256 bit |
| Backup | AES-256-GCM | 256 bit |
| Logi | AES-256-CBC | 256 bit |

### 4.2 Šifriranje v prenosu (In Transit)

| Povezava | Protokol | Minimalna verzija |
|----------|----------|-------------------|
| HTTPS | TLS | 1.2 |
| Database | TLS | 1.2 |
| Internal | mTLS | 1.2 |
| API | TLS | 1.3 (priporočeno) |

### 4.3 Prepovedani algoritmi

- LEGACY_BLOCK_V1, LEGACY_BLOCK_V3
- LEGACY_STREAM_V4
- LEGACY_HASH_V5 (za kriptografske namene)
- SHA-1 (za podpise)
- SSLv3, TLS 1.0, TLS 1.1

### 4.4 Implementacija

Šifriranje je implementirano v `src/security/encryption.ts`:
- AES-256-GCM za občutljive podatke
- Key rotation podpora
- Secure key storage

---

## 5. Upravljanje skrivnosti

### 5.1 Tipi skrivnosti

| Tip | Shramba | Rotacija |
|-----|---------|----------|
| API ključi | Vault | 90 dni |
| Database credentials | Vault | 30 dni |
| JWT signing keys | Vault | 7 dni |
| Encryption keys | HSM | Letno |

### 5.2 Prepovedane prakse

- Hardcoded credentials v kodi
- Credentials v git repozitoriju
- Credentials v logih
- Deljenje credentials med okolji

### 5.3 Implementacija

Upravljanje skrivnosti je implementirano v `src/security/secrets.ts`:
- HashiCorp Vault integracija
- Environment variable fallback
- Automatic rotation support

---

## 6. Audit logging

### 6.1 Beleženi dogodki

| Dogodek | Nivo | Retencija |
|---------|------|-----------|
| Prijava/odjava | INFO | 1 leto |
| Neuspela prijava | WARN | 2 leti |
| Sprememba pravic | INFO | 5 let |
| Dostop do podatkov | INFO | 1 leto |
| Administrativne akcije | INFO | 5 let |
| Varnostni incidenti | ALERT | 7 let |

### 6.2 Format zapisa

```json
{
  "timestamp": "ISO8601",
  "userId": "string",
  "action": "string",
  "resource": "string",
  "result": "success|failure",
  "ipAddress": "string",
  "userAgent": "string",
  "details": {}
}
```

### 6.3 Implementacija

Audit logging je implementiran v `src/security/audit.ts`:
- Strukturirani JSON logi
- Tamper-evident storage
- Real-time alerting

---

## 7. Validacija vhodov

### 7.1 Principi

- Vsi vhodi so nezaupanja vredni
- Whitelist pristop (dovoli samo znano)
- Sanitizacija pred uporabo
- Encoding pri izpisu

### 7.2 Zaščita pred napadi

| Napad | Zaščita |
|-------|---------|
| SQL Injection | Parametrizirane poizvedbe |
| XSS | Output encoding, CSP |
| CSRF | Token validacija |
| Path Traversal | Whitelist poti |
| Command Injection | Izogibanje shell ukazom |

### 7.3 Implementacija

Validacija je implementirana v `src/security/validation.ts`:
- Schema-based validation
- Input sanitization
- Output encoding

---

## 8. Varnostno skeniranje

### 8.1 Tipi skeniranja

| Tip | Frekvenca | Orodje |
|-----|-----------|--------|
| SAST | Vsak commit | SonarQube |
| DAST | Tedensko | OWASP ZAP |
| Dependency scan | Dnevno | Snyk/Trivy |
| Container scan | Ob gradnji | Trivy |
| Infrastructure scan | Tedensko | Checkov |

### 8.2 Ravnanje z ranljivostmi

| Resnost | SLA za popravek |
|---------|-----------------|
| Critical | 24 ur |
| High | 7 dni |
| Medium | 30 dni |
| Low | 90 dni |

---

## 9. Incident response

### 9.1 Klasifikacija incidentov

| Nivo | Opis | Odzivni čas |
|------|------|-------------|
| P1 | Kritičen vdor, data breach | 15 min |
| P2 | Aktiven napad | 1 ura |
| P3 | Potencialna ranljivost | 4 ure |
| P4 | Varnostno opozorilo | 24 ur |

### 9.2 Postopek odziva

1. **Detekcija:** Identificiraj incident
2. **Analiza:** Oceni obseg in vpliv
3. **Zadrževanje:** Omeji škodo
4. **Izkoreninjenje:** Odstrani grožnjo
5. **Obnova:** Vzpostavi normalno delovanje
6. **Poučki:** Dokumentiraj in izboljšaj

---

## 10. Compliance

### 10.1 Standardi

| Standard | Status | Zadnja revizija |
|----------|--------|-----------------|
| DO-178C | Skladen | 2024-12-24 |
| IEC 61508 | Skladen | 2024-12-24 |
| ISO 26262 | Skladen | 2024-12-24 |
| MIL-STD-882E | Skladen | 2024-12-24 |

### 10.2 Periodične aktivnosti

| Aktivnost | Frekvenca |
|-----------|-----------|
| Varnostni pregled | Četrtletno |
| Penetration test | Letno |
| Compliance audit | Letno |
| Security training | Letno |

---

## 11. Spremembe in zgodovina

| Datum | Verzija | Sprememba | Avtor |
|-------|---------|-----------|-------|
| 2024-12-24 | 1.0.0 | Začetna verzija | MIA BUILD |

---

*Ta dokument je del NexGen in je zaščiten z avtorskimi pravicami.*
