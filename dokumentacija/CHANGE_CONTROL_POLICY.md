<!-- @document_id DOC-CCP-DOMENA02-001 -->
<!-- @version 1.0.0 -->
<!-- @domain ZALEDNI_SISTEMI -->
<!-- @requirement ZAH-CCP-001 Change control policy mora definirati postopke za nadzor sprememb -->
<!-- @design DSN-CCP-001 Strukturiran pristop k nadzoru sprememb z domensko-specificnimi elementi -->
<!-- @test TST-CCP-001 Verifikacija implementacije vseh change control postopkov -->
<!-- @hazard_id HAZ-CCP-001 -->
<!-- Generated: {{DATUM_GENERACIJE}} -->
# Politika nadzora sprememb

**Domena:** Zaledni sistemi (ZALEDNI_SISTEMI)
**Skladnost:** DO-178C, IEC-61508, ISO-26262, MIL-STD-882E

## 1. Pregled

### 1.1 Namen
Ta dokument definira politiko in postopke za nadzor sprememb v sistemu NexGen.

### 1.2 Obseg
- Spremembe kode
- Spremembe konfiguracije
- Spremembe infrastrukture
- Spremembe podatkovne sheme

## 2. Klasifikacija sprememb

### 2.1 Kategorije sprememb
| Kategorija | Opis | Odobritev | Cas izvedbe |
|------------|------|-----------|-------------|
| EMERGENCY | Kriticna varnostna ranljivost, izpad produkcije | 1 odobritelj | Takoj |
| HIGH | Varnostna popravka, kriticna napaka | 2 odobritelja | < 24h |
| MEDIUM | Nova funkcionalnost, izboljsave | CAB | Naslednje okno |
| LOW | Dokumentacija, manjsi popravki | 1 odobritelj | Naslednje okno |

### 2.2 Okna za spremembe
| Tip | Dan | Cas (UTC) | Trajanje |
|-----|-----|-----------|----------|
| Standardno | Torek, Cetrtek | 10:00-14:00 | 4 ure |
| Vzdrzevalno | Nedelja | 02:00-06:00 | 4 ure |
| Nujno | Kadarkoli | Kadarkoli | Po potrebi |

## 3. Postopek spremembe

### 3.1 Zahtevek za spremembo (RFC)
```yaml
# Funkcija: FN_02_AUDIT_LOG
rfc:
  id: "RFC-{{ZAPOREDNA}}"
  title: "{{NASLOV}}"
  requester: "{{ZAHTEVNIK}}"
  date_submitted: "2024-12-24"
  category: "{{KATEGORIJA}}"
  priority: "{{PRIORITETA}}"
  description: "MIA BUILD project: NexGen"
  justification: "{{UTEMELJITEV}}"
  impact_analysis:
    affected_systems: ["{{SISTEMI}}"]
    affected_users: "{{STEVILO_UPORABNIKOV}}"
    downtime_required: "{{DA/NE}}"
    downtime_duration: "{{TRAJANJE}}"
  risk_assessment:
    risk_level: "{{NIZKO/SREDNJE/VISOKO}}"
    mitigation: "{{MITIGACIJA}}"
    rollback_plan: "{{ROLLBACK}}"
  testing:
    test_plan: "{{TESTNI_NACRT}}"
    test_results: "{{REZULTATI}}"
  approvals:
    - role: "{{VLOGA}}"
      name: "{{IME}}"
      date: "2024-12-24"
      status: "{{ODOBRENO/ZAVRNJENO}}"
```

### 3.2 Diagram poteka
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Zahteva   │────▶│   Analiza   │────▶│  Odobritev  │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Zaprtje   │◀────│  Izvedba    │◀────│ Nacrtovanje │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 3.3 Faze spremembe
| Faza | Aktivnosti | Odgovorni |
|------|------------|-----------|
| Zahteva | Oddaja RFC, klasifikacija | Zahtevnik |
| Analiza | Ocena vpliva, tveganj | Tehnicni vodja |
| Odobritev | Pregled, odobritev | CAB / Odobritelji |
| Nacrtovanje | Testni nacrt, rollback | Razvojna ekipa |
| Izvedba | Deployment, testiranje | DevOps |
| Zaprtje | Verifikacija, dokumentacija | Zahtevnik |

## 4. Odobritveni postopek

### 4.1 Change Advisory Board (CAB)
| Vloga | Odgovornost |
|-------|-------------|
| Predsednik CAB | Vodenje sestankov, koncna odlocitev |
| Tehnicni vodja | Tehnicna ocena |
| Varnostni inzenir | Varnostna ocena |
| Operativni vodja | Operativna ocena |
| Predstavnik uporabnikov | Vpliv na uporabnike |

### 4.2 Matrika odobritev
| Kategorija | Odobritelji | Kvorum |
|------------|-------------|--------|
| EMERGENCY | Tehnicni vodja ALI Varnostni inzenir | 1 |
| HIGH | Tehnicni vodja IN Varnostni inzenir | 2 |
| MEDIUM | CAB | 3/5 |
| LOW | Tehnicni vodja | 1 |

### 4.3 Kriteriji odobritve
- Popolna dokumentacija RFC
- Uspesno testiranje v staging okolju
- Dokumentiran rollback nacrt
- Ocena tveganja sprejemljiva
- Ustrezno okno za spremembo

## 5. Izvedba spremembe

### 5.1 Pre-deployment checklist
```yaml
# Funkcija: FN_02_HEALTH_CHECK
pre_deployment:
  - item: "RFC odobren"
    status: "{{DA/NE}}"
  - item: "Testi uspesni v staging"
    status: "{{DA/NE}}"
  - item: "Rollback nacrt pripravljen"
    status: "{{DA/NE}}"
  - item: "Monitoring alarmi nastavljeni"
    status: "{{DA/NE}}"
  - item: "Komunikacija poslana"
    status: "{{DA/NE}}"
  - item: "Backup ustvarjen"
    status: "{{DA/NE}}"
```

### 5.2 Deployment postopek
```yaml
# Funkcija: FN_02_READINESS_PROBE, FN_02_LIVENESS_PROBE
deployment:
  strategy: "rolling"
  max_unavailable: "25%"
  max_surge: "25%"
  health_check_interval: 10
  health_check_timeout: 5
  rollback_on_failure: true
  canary:
    enabled: true
    percentage: 10
    duration_minutes: 30
```

### 5.3 Post-deployment checklist
```yaml
# Funkcija: FN_02_METRIC_COUNTER
post_deployment:
  - item: "Health checks uspesni"
    status: "{{DA/NE}}"
  - item: "Metrike normalne"
    status: "{{DA/NE}}"
  - item: "Napake v logih"
    status: "{{DA/NE}}"
  - item: "Uporabniska potrditev"
    status: "{{DA/NE}}"
  - item: "Dokumentacija posodobljena"
    status: "{{DA/NE}}"
```

## 6. Rollback postopek

### 6.1 Rollback kriteriji
| Kriterij | Prag | Akcija |
|----------|------|--------|
| Error rate | > 1% | Avtomatski rollback |
| Latentnost P99 | > 2x baseline | Rocni pregled |
| Health checks | < 80% uspesnih | Avtomatski rollback |
| Kriticna napaka | 1 | Takojsnji rollback |

### 6.2 Rollback postopek
```yaml
# Funkcija: FN_02_DB_TX_ROLLBACK
rollback:
  steps:
    - name: "Ustavi deployment"
      command: "kubectl rollout pause"
    - name: "Rollback na prejsnjo verzijo"
      command: "kubectl rollout undo"
    - name: "Preveri zdravje"
      command: "kubectl rollout status"
    - name: "Rollback migracije (ce potrebno)"
      command: "npm run migrate:down"
    - name: "Obvesti ekipo"
      command: "notify --channel=#incidents"
  timeout_minutes: 15
  verification:
    - "Health checks uspesni"
    - "Error rate < 0.1%"
    - "Latentnost normalna"
```

## 7. Nujne spremembe

### 7.1 Postopek nujne spremembe
1. Identifikacija nujnosti (varnostna ranljivost, izpad)
2. Takojsnja eskalacija na dezurnega
3. Odobritev enega odobritelja
4. Izvedba spremembe
5. Naknadna dokumentacija RFC (< 24h)
6. Post-mortem analiza

### 7.2 Kriteriji za nujno spremembo
- Aktivna varnostna ranljivost z izkoriščanjem
- Popoln izpad produkcije
- Izguba podatkov v teku
- Kriticna skladnostna krsitev

## 8. Revizija in porocanje

### 8.1 Metrike sprememb
| Metrika | Cilj | Frekvenca |
|---------|------|-----------|
| Uspesnost sprememb | > 95% | Mesecno |
| Povprecni cas izvedbe | < 2 uri | Mesecno |
| Stevilo rollbackov | < 5% | Mesecno |
| Stevilo nujnih sprememb | < 2/mesec | Mesecno |

### 8.2 Revizija sprememb
```yaml
# Funkcija: FN_02_AUDIT_QUERY
audit:
  frequency: "monthly"
  scope:
    - "Vse spremembe v obdobju"
    - "Nujne spremembe"
    - "Neuspele spremembe"
    - "Rollbacki"
  report_recipients:
    - "{{VODSTVO}}"
    - "{{VARNOST}}"
    - "{{SKLADNOST}}"
```

## 9. Skladnost

| Standard | Zahteva | Implementacija |
|----------|---------|----------------|
| DO-178C | Nadzor konfiguracije | RFC postopek |
| IEC-61508 | Upravljanje sprememb | CAB odobritev |
| ISO-26262 | Sledljivost | Audit log |
| MIL-STD-882E | Varnostna ocena | Analiza tveganj |
| SOC 2 | Nadzor sprememb | Dokumentiran postopek |
| ISO 27001 | Upravljanje sprememb | Politika in postopki |

## 10. Priloge

### 10.1 Obrazec RFC
[Povezava do obrazca]

### 10.2 Checklist predloge
[Povezava do checklistov]

### 10.3 Kontakti
| Vloga | Ime | Kontakt |
|-------|-----|---------|
| Predsednik CAB | {{IME}} | {{EMAIL}} |
| Dezurni | {{IME}} | {{TELEFON}} |
| Varnostni inzenir | {{IME}} | {{EMAIL}} |
