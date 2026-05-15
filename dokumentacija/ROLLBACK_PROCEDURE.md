<!-- @document_id DOC-ROLL-DOMENA02-001 -->
<!-- @version 1.0.0 -->
<!-- @domain ZALEDNI_SISTEMI -->
<!-- @requirement ZAH-ROLL-001 Rollback procedure mora definirati postopke za vrnitev na prejšnjo verzijo -->
<!-- @design DSN-ROLL-001 Strukturiran pristop k rollback postopkom z domensko-specificnimi elementi -->
<!-- @test TST-ROLL-001 Verifikacija implementacije vseh rollback postopkov -->
<!-- @hazard_id HAZ-ROLL-001 -->
<!-- Generated: {{DATUM_GENERACIJE}} -->
# Rollback Procedure: NexGen

**Verzija:** 1.0.0  
**Datum:** 2024-12-24  
**Avtor:** MIA BUILD  
**Domena:** Zaledni sistemi (ZALEDNI_SISTEMI)

---

## 1. NAMEN

### 1.1 Namen dokumenta

Ta dokument opisuje postopke za rollback backend sistema NexGen na prejšnjo verzijo. Dokument je skladen z DO-178C, IEC-61508, ISO-26262 in MIL-STD-882E standardi.

### Backend-specifični rollback elementi
- **Database Migration Rollback**: Reverzne migracije z down() metodami
- **Message Queue Drain**: Graceful drain pred rollbackom
- **Cache Invalidation**: Redis/Memcached flush strategija
- **Background Job Completion**: Čakanje na dokončanje aktivnih jobov
- **Service Discovery Update**: DNS/Consul deregistracija starih instanc

---

## 2. Kdaj izvesti rollback

### 2.1 Indikatorji za rollback

| Indikator | Prag | Akcija |
|-----------|------|--------|
| Error rate | > 5% | Avtomatski rollback |
| Latency P99 | > 2s | Ročni rollback |
| Health check failures | > 3 zaporedne | Avtomatski rollback |
| Critical bug | Potrjen | Takojšnji rollback |

### 2.2 Odločitveno drevo

1. Ali je napaka kritična za varnost? → Takojšnji rollback
2. Ali napaka vpliva na > 10% uporabnikov? → Rollback v 15 min
3. Ali obstaja workaround? → Oceni in odloči
4. Ali je fix preprost? → Hotfix namesto rollback

---

## 3. Rollback procedure

### 3.1 Avtomatski rollback

Sistem podpira avtomatski rollback z naslednjimi koraki:

**Korak 1:** Detekcija anomalije
- Monitoring sistem zazna presežen prag
- Alert se sproži

**Korak 2:** Verifikacija
- Sistem preveri, da ni lažni alarm
- Potrdi z več metrikami

**Korak 3:** Izvršitev
```bash
./skripta/rollback.sh --auto --version=previous
```

**Korak 4:** Notifikacija
- Obvesti on-call ekipo
- Zabeleži v audit log

### 3.2 Ročni rollback

**Korak 1:** Identifikacija ciljne verzije
```bash
./skripta/rollback.sh --list-versions
```

**Korak 2:** Preveri kompatibilnost
```bash
./skripta/rollback.sh --check-compatibility --version=X.Y.Z
```

**Korak 3:** Izvedi rollback
```bash
./skripta/rollback.sh --execute --version=X.Y.Z --confirm
```

**Korak 4:** Verifikacija
```bash
./skripta/rollback.sh --verify
```

---

## 4. Rollback po komponentah

### 4.1 Backend rollback

```bash
# Korak 1: Ustavi promet
kubectl scale deployment backend --replicas=0

# Korak 2: Rollback
kubectl rollout undo deployment/backend --to-revision=N

# Korak 3: Zaženi
kubectl scale deployment backend --replicas=3

# Korak 4: Preveri
kubectl rollout status deployment/backend
```

### 4.2 Message Queue rollback

```bash
# Korak 1: Ustavi consumer-je (graceful drain)
kubectl scale deployment NexGen-worker -n NexGen --replicas=0

# Korak 2: Počakaj da se queue izprazni
kubectl exec -it rabbitmq-0 -n NexGen -- rabbitmqctl list_queues name messages

# Korak 3: Rollback worker verzije
kubectl rollout undo deployment/NexGen-worker --to-revision=N

# Korak 4: Zaženi consumer-je
kubectl scale deployment NexGen-worker -n NexGen --replicas=5

# Korak 5: Preveri queue processing
kubectl exec -it rabbitmq-0 -n NexGen -- rabbitmqctl list_queues name messages consumers
```

### 4.3 Cache rollback

```bash
# Korak 1: Identificiraj cache keys za rollback
kubectl exec -it redis-0 -n NexGen -- redis-cli KEYS "NexGen:*" | wc -l

# Korak 2: Flush application cache (ne session cache)
kubectl exec -it redis-0 -n NexGen -- redis-cli KEYS "NexGen:cache:*" | xargs redis-cli DEL

# Korak 3: Preveri cache status
kubectl exec -it redis-0 -n NexGen -- redis-cli INFO memory

# Korak 4: Warmup kritičnih cache keys
kubectl exec -it <app-pod> -n NexGen -- npm run cache:warmup
```

### 4.4 Database rollback

**OPOZORILO:** Database rollback je destruktiven in zahteva posebno pozornost.

```bash
# Korak 1: Ustavi aplikacijo
./skripta/rollback.sh --stop-application

# Korak 2: Backup trenutnega stanja
./skripta/backup.sh --type=full --tag=pre-rollback

# Korak 3: Rollback migracije
./skripta/rollback.sh --component=database --migration=YYYYMMDDHHMMSS

# Korak 4: Verifikacija
./skripta/rollback.sh --verify-database

# Korak 5: Zaženi aplikacijo
./skripta/rollback.sh --start-application
```

---

## 5. Verifikacija po rollback

### 5.1 Kontrolni seznam

| Korak | Opis | Status |
|-------|------|--------|
| 1 | Health check vrača 200 | [ ] |
| 2 | Error rate < 1% | [ ] |
| 3 | Latency P99 < 500ms | [ ] |
| 4 | Vsi kritični endpointi delujejo | [ ] |
| 5 | Logi ne kažejo napak | [ ] |
| 6 | Metrike so normalne | [ ] |

### 5.2 Smoke testi

```bash
# Izvedi smoke teste
./skripta/rollback.sh --smoke-test

# Preveri rezultate
./skripta/rollback.sh --smoke-test-report
```

---

## 6. Komunikacija

### 6.1 Interna komunikacija

| Faza | Kanal | Sporočilo |
|------|-------|-----------|
| Začetek | Slack #incidents | "Rollback v teku za verzijo X.Y.Z" |
| Zaključek | Slack #incidents | "Rollback zaključen, sistem stabilen" |
| Post-mortem | Email | Podroben report |

### 6.2 Eksterna komunikacija

| Faza | Kanal | Sporočilo |
|------|-------|-----------|
| Začetek | Status page | "Izvajamo vzdrževanje" |
| Zaključek | Status page | "Sistem normalno deluje" |

---

## 7. Post-rollback aktivnosti

### 7.1 Takojšnje aktivnosti

1. Dokumentiraj incident
2. Zberi loge in metrike
3. Identificiraj root cause
4. Obvesti stakeholderje

### 7.2 Dolgoročne aktivnosti

1. Izvedi post-mortem
2. Implementiraj preventivne ukrepe
3. Posodobi teste
4. Izboljšaj monitoring

---

## 8. Rollback metrike

### 8.1 SLI/SLO

| Metrika | SLO | Meritev |
|---------|-----|---------|
| Rollback čas | < 5 min | Čas od odločitve do zaključka |
| Uspešnost | > 99% | Delež uspešnih rollbackov |
| Downtime | < 1 min | Čas nedostopnosti |

### 8.2 Sledenje

Vsak rollback mora biti zabeležen z:
- Timestamp začetka in konca
- Verzija iz/na
- Razlog
- Izvajalec
- Rezultat

---

## 9. Spremembe in zgodovina

| Datum | Verzija | Sprememba | Avtor |
|-------|---------|-----------|-------|
| 2024-12-24 | 1.0.0 | Začetna verzija | MIA BUILD |

---

*Ta dokument je del NexGen in je zaščiten z avtorskimi pravicami.*
