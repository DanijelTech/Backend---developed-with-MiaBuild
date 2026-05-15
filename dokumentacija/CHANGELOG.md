<!-- @document_id DOC-CHANGELOG-DOMENA02-001 -->
<!-- @version 1.0.0 -->
<!-- @domain ZALEDNI_SISTEMI -->
<!-- @requirement ZAH-CHANGELOG-001 Changelog mora dokumentirati vse spremembe projekta -->
<!-- @design DSN-CHANGELOG-001 Strukturiran pristop k dokumentiranju sprememb -->
<!-- @test TST-CHANGELOG-001 Verifikacija popolnosti changelog zapisov -->
<!-- @hazard_id HAZ-CHANGELOG-001 -->
<!-- Generated: {{DATUM_GENERACIJE}} -->
# Changelog: NexGen

**Domena:** Zaledni sistemi (ZALEDNI_SISTEMI)

Vse pomembne spremembe tega projekta so dokumentirane v tej datoteki.

Format temelji na [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
in ta projekt sledi [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2024-12-24

### Dodano
- Začetna verzija projekta NexGen
- Implementacija osnovne API strukture
- Health check endpoints (/health, /health/live, /health/ready)
- Strukturirano logiranje (OBS_001)
- Metrike in Prometheus endpoint (OBS_002)
- Distribuirano sledenje (OBS_003)
- Health check sistem (OBS_004)
- Alerting sistem (OBS_005)
- Error handling z AppError razredom (REL_001)
- Retry mehanizem z exponential backoff (REL_002)
- Circuit breaker vzorec (REL_002)
- High availability konfiguracija (REL_003)
- Disaster recovery skripte (REL_004)
- Graceful degradation (REL_005)
- JWT avtentikacija (SEC_001)
- RBAC avtorizacija (SEC_002)
- AES-256-GCM šifriranje (SEC_003)
- TLS konfiguracija (SEC_004)
- Secrets management (SEC_005)
- Audit logging (SEC_006)
- Input validacija (SEC_007)
- Security scanning konfiguracija (SEC_008)
- Unit testi (TST_001)
- Integration testi (TST_002)
- E2E testi (TST_003)
- Security testi (TST_004)
- Performance testi (TST_005)
- Code coverage konfiguracija (TST_006)
- Dockerfile in docker-compose (DEP_001)
- CI/CD pipeline (DEP_002)
- Terraform IaC (DEP_003)
- GitOps z ArgoCD (DEP_004)
- Rollback skripta (DEP_005)
- OpenAPI dokumentacija (DOC_001)
- Arhitekturni opis (DOC_002)
- Runbook (DOC_003)
- Ta changelog (DOC_004)

### Compliance
- DO-178C kompatibilnost
- IEC-61508 kompatibilnost
- ISO-26262 kompatibilnost
- MIL-STD-882E kompatibilnost

---

## [Unreleased]

### Načrtovano
- Dodatne domensko-specifične funkcionalnosti
- Razširjena integracija z zunanjimi sistemi
- Napredne analitične zmožnosti

---

## Tipi sprememb

- **Dodano** za nove funkcionalnosti
- **Spremenjeno** za spremembe obstoječih funkcionalnosti
- **Zastarelo** za funkcionalnosti, ki bodo kmalu odstranjene
- **Odstranjeno** za odstranjene funkcionalnosti
- **Popravljeno** za popravke napak
- **Varnost** za varnostne popravke

---

*Ta dokument je del NexGen in je zaščiten z avtorskimi pravicami.*
