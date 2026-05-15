<!-- @document_id DOC-RELEASE-DOMENA02-001 -->
<!-- @version 1.0.0 -->
<!-- @domain ZALEDNI_SISTEMI -->
<!-- @requirement ZAH-REL-001 Dnevnik izdaj mora dokumentirati vse spremembe in verzije -->
<!-- @design DSN-REL-001 Strukturiran dnevnik izdaj s sledljivostjo -->
<!-- @test TST-REL-001 Verifikacija popolnosti dnevnika izdaj -->
<!-- @hazard_id HAZ-REL-001 -->
<!-- Generated: {{DATUM_GENERACIJE}} -->

# DNEVNIK IZDAJ - DOMENA_02 (ZALEDNI_SISTEMI)

**Projekt:** NexGen
**Verzija:** 1.0.0
**Domena:** Zaledni sistemi
**Datum:** 2024-12-24
**Avtor:** MIA BUILD

---

## 1. NAMEN

Ta dokument vsebuje popoln dnevnik izdaj za DOMENA_02 (Zaledni sistemi) z vsemi spremembami, verzijami in sledljivostnimi povezavami.

---

## 2. OBSEG

Dnevnik pokriva vse izdaje DOMENA_02 vkljucno z:
- Funkcionalnimi spremembami
- Varnostnimi popravki
- Skladnostnimi posodobitvami
- Infrastrukturnimi spremembami

---

## 3. VSEBINA

### 3.1 Verzija 1.0.0 (2024-12-24)

#### 3.1.1 Dodano

**Kategorije (10):**
- CAT_02_API: REST in GraphQL API operacije
- CAT_02_MIDDLEWARE: Avtentikacija, validacija, transformacija
- CAT_02_DATABASE: Povezave, poizvedbe, transakcije, migracije
- CAT_02_CACHE: Predpomnjenje in distribuirano predpomnjenje
- CAT_02_QUEUE: Sporocilne vrste in asinhrona obdelava
- CAT_02_SECURITY: RBAC, omejevanje hitrosti, vhodna varnost
- CAT_02_JOBS: Razporejanje opravil in delavci
- CAT_02_GATEWAY: Usmerjanje, odkrivanje storitev, odpornost
- CAT_02_OBSERVABILITY: Belezenje, metrike, sledenje, zdravje
- CAT_02_COMPLIANCE: Revizija, GDPR, sifriranje

**Funkcije (152):**
- FN_02_CREATE, FN_02_READ, FN_02_UPDATE, FN_02_DELETE, FN_02_LIST
- FN_02_PATCH, FN_02_BULK_CREATE, FN_02_BULK_UPDATE, FN_02_BULK_DELETE
- FN_02_SEARCH, FN_02_AGGREGATE, FN_02_VERSION_ROUTE, FN_02_VERSION_NEGOTIATE
- FN_02_VERSION_DEPRECATE, FN_02_QUERY, FN_02_MUTATION, FN_02_SUBSCRIPTION
- FN_02_RESOLVER, FN_02_DIRECTIVE, FN_02_FEDERATE_SCHEMA, FN_02_ENTITY_RESOLVE
- FN_02_SIGN, FN_02_VERIFY, FN_02_DECODE, FN_02_REFRESH, FN_02_REVOKE
- FN_02_OAUTH_AUTHORIZE, FN_02_OAUTH_TOKEN, FN_02_OAUTH_INTROSPECT, FN_02_OAUTH_REVOKE
- FN_02_APIKEY_GENERATE, FN_02_APIKEY_VALIDATE, FN_02_APIKEY_ROTATE
- FN_02_VALIDATE_BODY, FN_02_VALIDATE_PARAMS, FN_02_VALIDATE_QUERY, FN_02_VALIDATE_HEADERS
- FN_02_TRANSFORM_REQUEST, FN_02_TRANSFORM_RESPONSE, FN_02_SERIALIZE, FN_02_DESERIALIZE
- FN_02_DB_CONNECT, FN_02_DB_DISCONNECT, FN_02_DB_POOL_ACQUIRE, FN_02_DB_POOL_RELEASE
- FN_02_DB_POOL_HEALTH, FN_02_DB_QUERY, FN_02_DB_QUERY_BATCH, FN_02_DB_QUERY_STREAM
- FN_02_DB_QUERY_PREPARED, FN_02_DB_TX_BEGIN, FN_02_DB_TX_COMMIT, FN_02_DB_TX_ROLLBACK
- FN_02_DB_TX_SAVEPOINT, FN_02_DB_MIGRATE_UP, FN_02_DB_MIGRATE_DOWN, FN_02_DB_MIGRATE_STATUS
- FN_02_DB_SEED, FN_02_DB_BACKUP, FN_02_DB_RESTORE, FN_02_DB_BACKUP_VERIFY
- FN_02_CACHE_GET, FN_02_CACHE_SET, FN_02_CACHE_DELETE, FN_02_CACHE_EXISTS
- FN_02_CACHE_TTL, FN_02_CACHE_INVALIDATE, FN_02_CACHE_WARM, FN_02_CACHE_DISTRIBUTED
- FN_02_CACHE_STATS, FN_02_QUEUE_PUBLISH, FN_02_QUEUE_CONSUME, FN_02_QUEUE_ACK
- FN_02_QUEUE_NACK, FN_02_QUEUE_RETRY, FN_02_QUEUE_DLQ, FN_02_QUEUE_PRIORITY
- FN_02_QUEUE_BATCH, FN_02_QUEUE_DELAY, FN_02_QUEUE_FANOUT, FN_02_RBAC_CHECK
- FN_02_RBAC_ASSIGN, FN_02_RBAC_REVOKE, FN_02_RBAC_LIST_PERMS, FN_02_RATE_LIMIT
- FN_02_RATE_LIMIT_DISTRIBUTED, FN_02_RATE_LIMIT_ADAPTIVE, FN_02_INPUT_SANITIZE
- FN_02_SQL_INJECTION_PREVENT, FN_02_XSS_PREVENT, FN_02_CORS_CONFIG, FN_02_HELMET_HEADERS
- FN_02_CSP_CONFIG, FN_02_JOB_SCHEDULE, FN_02_JOB_EXECUTE, FN_02_JOB_CANCEL
- FN_02_JOB_RETRY, FN_02_JOB_MONITOR, FN_02_CRON_PARSE, FN_02_WORKER_POOL
- FN_02_WORKER_SCALE, FN_02_ROUTE_MATCH, FN_02_LOAD_BALANCE, FN_02_SERVICE_DISCOVERY
- FN_02_CIRCUIT_BREAKER, FN_02_RETRY_POLICY, FN_02_TIMEOUT_CONFIG, FN_02_BULKHEAD
- FN_02_LOG_STRUCTURED, FN_02_LOG_CONTEXT, FN_02_LOG_ROTATE, FN_02_METRIC_COUNTER
- FN_02_METRIC_HISTOGRAM, FN_02_METRIC_GAUGE, FN_02_METRIC_EXPORT, FN_02_TRACE_SPAN
- FN_02_TRACE_PROPAGATE, FN_02_TRACE_SAMPLE, FN_02_HEALTH_CHECK, FN_02_READINESS_PROBE
- FN_02_LIVENESS_PROBE, FN_02_AUDIT_LOG, FN_02_AUDIT_QUERY, FN_02_AUDIT_EXPORT
- FN_02_GDPR_EXPORT, FN_02_GDPR_DELETE, FN_02_DATA_RETENTION, FN_02_CONSENT_MANAGE
- FN_02_PCI_ENCRYPT, FN_02_HIPAA_MASK, FN_02_KEY_ROTATE
- FN_02_JWT_BLACKLIST, FN_02_POOL_HEALTH, FN_02_POOL_RESIZE, FN_02_METRIC_ALERT
- FN_02_AUDIT_ARCHIVE, FN_02_ENDPOINT_HEALTH, FN_02_SCHEMA_VALIDATE, FN_02_VALIDATE_DEEP
- FN_02_TRANSFORM_BATCH, FN_02_QUERY_OPTIMIZE, FN_02_TX_SAVEPOINT, FN_02_CACHE_WARM
- FN_02_QUEUE_PEEK, FN_02_CRON_VALIDATE, FN_02_ROUTE_CANARY, FN_02_LOG_AGGREGATE
- FN_02_TRACE_CORRELATE, FN_02_RATE_LIMIT_QUOTA, FN_02_INPUT_VALIDATE_SCHEMA
- FN_02_HSTS_CONFIG, FN_02_WORKER_HEALTH

**Produkti (43):**
- 1 integriran produkt (ENTERPRISE_BACKEND_PLATFORM)
- 10 kategorijskih paketov
- 10 scenarijskih produktov
- 3 SLA paketi (PLATINUM, GOLD, SILVER)
- 19 modularnih produktov

**Predloge (301+):**
- 152 funkcijskih predlog
- 43 produktnih meta.json predlog
- 15 dokumentacijskih predlog
- 91+ dodatnih predlog (testi, konfiguracija, infrastruktura)

**Dokazni artefakti:**
- sbom.spdx.json.predloga (SPDX 2.3)
- provenance.json.predloga (SLSA Level 3)
- compliance-report.json.predloga
- traceability-map.json.predloga
- test-traceability-map.json.predloga
- function_matrix.json.predloga
- hazard-log.json.predloga
- fta.json.predloga
- fmea.json.predloga
- stride.json.predloga
- cia.json.predloga

**OCI paketi:**
- oci-manifest.json.predloga za vsak produkt
- digest.txt.predloga za vsak produkt
- *.sig.predloga za vsak produkt

#### 3.1.2 Spremenjeno

Ni sprememb (zacetna izdaja).

#### 3.1.3 Odstranjeno

Ni odstranitev (zacetna izdaja).

#### 3.1.4 Varnostni popravki

Ni varnostnih popravkov (zacetna izdaja).

#### 3.1.5 Znane tezave

Ni znanih tezav.

---

## 4. SKLICI

- DO-178C: Software Considerations in Airborne Systems and Equipment Certification
- IEC-61508: Functional Safety of Electrical/Electronic/Programmable Electronic Safety-related Systems
- ISO-26262: Road vehicles - Functional safety
- MIL-STD-882E: System Safety
- SLSA Level 3: Supply-chain Levels for Software Artifacts
- SPDX 2.3: Software Package Data Exchange

---

## 5. KONTROLA

### 5.1 Verzija dokumenta

| Verzija | Datum | Avtor | Opis spremembe |
|---------|-------|-------|----------------|
| 1.0.0 | 2024-12-24 | MIA BUILD | Zacetna izdaja |

### 5.2 Odobritve

| Vloga | Ime | Datum | Podpis |
|-------|-----|-------|--------|
| Avtor | MIA BUILD | 2024-12-24 | {{PODPIS_AVTOR}} |
| Pregledovalec | {{PREGLEDOVALEC}} | 2024-12-24 | {{PODPIS_PREGLEDOVALEC}} |
| Odobritelj | {{ODOBRITELJ}} | 2024-12-24 | {{PODPIS_ODOBRITELJ}} |

### 5.3 Verifikacija

- Digest: {{RELEASE_LOG_DIGEST}}
- Podpis: {{RELEASE_LOG_SIGNATURE}}
- Casovni zig: {{TIMESTAMP}}
