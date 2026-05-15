<!-- @document_id DOC-DR-DOMENA02-001 -->
<!-- @version 1.0.0 -->
<!-- @domain ZALEDNI_SISTEMI -->
<!-- @requirement ZAH-DR-001 Disaster recovery plan mora definirati postopke za obnovo sistema -->
<!-- @design DSN-DR-001 Strukturiran pristop k obnovi sistema z domensko-specificnimi elementi -->
<!-- @test TST-DR-001 Verifikacija implementacije vseh DR postopkov -->
<!-- @hazard_id HAZ-DR-001 -->
<!-- Generated: {{DATUM_GENERACIJE}} -->
# Disaster Recovery Plan: NexGen

**Verzija:** 1.0.0  
**Datum:** 2024-12-24  
**Avtor:** MIA BUILD  
**Domena:** Zaledni sistemi (ZALEDNI_SISTEMI)

---

## 1. NAMEN

### 1.1 Namen dokumenta

Ta dokument opisuje postopke za obnovo backend sistema NexGen v primeru katastrofe. Dokument je skladen z DO-178C, IEC-61508, ISO-26262 in MIL-STD-882E standardi.

### Backend-specifične DR komponente
- **Database Recovery**: PostgreSQL PITR (Point-in-Time Recovery) z WAL arhiviranjem
- **Message Queue Recovery**: RabbitMQ cluster failover z mirrored queues
- **Cache Warmup**: Redis cache preload strategija po obnovi
- **Job Queue Drain**: Graceful shutdown za background workers
- **Service Discovery**: DNS failover za service-to-service komunikacijo

---

## 2. Definicije

### 2.1 RTO (Recovery Time Objective)

**Cilj:** Sistem mora biti obnovljen v **4 urah** od začetka incidenta.

| Prioriteta | Komponenta | RTO |
|------------|------------|-----|
| P1 | Jedro sistema | 1 ura |
| P2 | API storitve | 2 uri |
| P3 | Podporne storitve | 4 ure |

### 2.2 RPO (Recovery Point Objective)

**Cilj:** Maksimalna izguba podatkov je **15 minut**.

| Tip podatkov | RPO | Metoda backup |
|--------------|-----|---------------|
| Transakcijski | 5 min | Sinhronizirana replikacija |
| Konfiguracijski | 15 min | Periodični backup |
| Logi | 1 ura | Asinhroni backup |

---

## 3. Scenariji katastrofe

### 3.1 Izpad podatkovnega centra

**Opis:** Popoln izpad primarnega podatkovnega centra.

**Postopek:**
1. Aktiviraj sekundarni podatkovni center
2. Preusmeri DNS na sekundarno lokacijo
3. Preveri integriteto podatkov
4. Obvesti uporabnike o statusu

**Odgovorna oseba:** DevOps Lead

### 3.2 Korupcija podatkov

**Opis:** Nepričakovana korupcija podatkov v produkcijski bazi.

**Postopek:**
1. Ustavi vse pisalne operacije
2. Identificiraj obseg korupcije
3. Obnovi iz zadnjega veljavnega backup-a
4. Preveri integriteto obnovljenih podatkov
5. Ponovno zaženi storitve

**Odgovorna oseba:** Database Administrator

### 3.3 Varnostni incident

**Opis:** Vdor v sistem ali ransomware napad.

**Postopek:**
1. Izoliraj prizadete sisteme
2. Aktiviraj incident response team
3. Obnovi iz čistega backup-a
4. Izvedi forenzično analizo
5. Implementiraj dodatne varnostne ukrepe

**Odgovorna oseba:** Security Lead

### 3.4 Database failure

**Opis:** Izpad primarne PostgreSQL instance ali korupcija podatkov.

**Postopek:**
1. Preveri status replikacije
2. Če je replica zdrava, izvedi failover na repliko
3. Če ni zdrave replike, obnovi iz WAL arhiva (PITR)
4. Preveri integriteto podatkov z checksums
5. Ponovno zaženi aplikacijske storitve

**Ukazi:**
```bash
# Preveri replication status
kubectl exec -it postgres-0 -n NexGen -- psql -c "SELECT * FROM pg_stat_replication;"

# Failover na repliko (Patroni)
kubectl exec -it postgres-0 -n NexGen -- patronictl failover

# PITR restore
kubectl exec -it postgres-0 -n NexGen -- pg_restore --target-time="YYYY-MM-DD HH:MM:SS" --target-action=promote
```

**Odgovorna oseba:** Database Administrator

### 3.5 Message Queue failure

**Opis:** Izpad RabbitMQ cluster-ja ali izguba sporočil.

**Postopek:**
1. Preveri cluster status
2. Če je en node zdrav, sync queues
3. Če je cluster popolnoma down, restore iz backup-a
4. Preveri mirrored queues status
5. Ponovno zaženi consumer-je

**Ukazi:**
```bash
# Preveri cluster status
kubectl exec -it rabbitmq-0 -n NexGen -- rabbitmqctl cluster_status

# Sync queues
kubectl exec -it rabbitmq-0 -n NexGen -- rabbitmqctl sync_queue NexGen.main

# Force boot cluster
kubectl exec -it rabbitmq-0 -n NexGen -- rabbitmqctl force_boot
```

**Odgovorna oseba:** DevOps Lead

### 3.6 Cache failure

**Opis:** Izpad Redis cluster-ja ali izguba session podatkov.

**Postopek:**
1. Preveri sentinel status
2. Če je replica zdrava, izvedi failover
3. Če ni zdrave replike, restore iz RDB/AOF backup-a
4. Izvedi cache warmup za kritične podatke
5. Preveri session persistence

**Ukazi:**
```bash
# Preveri sentinel status
kubectl exec -it redis-sentinel-0 -n NexGen -- redis-cli -p 26379 SENTINEL masters

# Manual failover
kubectl exec -it redis-sentinel-0 -n NexGen -- redis-cli -p 26379 SENTINEL failover NexGen

# Cache warmup
kubectl exec -it <app-pod> -n NexGen -- npm run cache:warmup
```

**Odgovorna oseba:** DevOps Lead

---

## 4. Backup strategija

### 4.1 Tipi backup-ov

| Tip | Frekvenca | Retencija | Lokacija |
|-----|-----------|-----------|----------|
| Polni backup | Dnevno | 30 dni | Offsite |
| Inkrementalni | Vsako uro | 7 dni | Onsite + Offsite |
| Transakcijski log | Vsake 5 min | 24 ur | Onsite |

### 4.2 Backup procedure

**Dnevni backup:**
```bash
./skripta/backup.sh --type=full --destination=offsite
```

**Inkrementalni backup:**
```bash
./skripta/backup.sh --type=incremental --destination=both
```

---

## 5. Restore procedure

### 5.1 Polna obnova

**Korak 1:** Priprava okolja
```bash
./skripta/restore.sh --prepare-environment
```

**Korak 2:** Obnova podatkov
```bash
./skripta/restore.sh --type=full --source=offsite --timestamp=YYYY-MM-DD
```

**Korak 3:** Verifikacija
```bash
./skripta/restore.sh --verify-integrity
```

### 5.2 Point-in-time obnova

```bash
./skripta/restore.sh --type=point-in-time --target-time="YYYY-MM-DD HH:MM:SS"
```

---

## 6. Failover procedure

### 6.1 Avtomatski failover

Sistem podpira avtomatski failover z naslednjimi parametri:

| Parameter | Vrednost |
|-----------|----------|
| Health check interval | 10 sekund |
| Failure threshold | 3 zaporedne napake |
| Failover timeout | 30 sekund |

### 6.2 Ročni failover

**Korak 1:** Preveri status sekundarnega sistema
```bash
./skripta/failover.sh --check-secondary
```

**Korak 2:** Izvedi failover
```bash
./skripta/failover.sh --execute --confirm
```

**Korak 3:** Preveri uspešnost
```bash
./skripta/failover.sh --verify
```

---

## 7. Testiranje DR plana

### 7.1 Urnik testiranja

| Test | Frekvenca | Trajanje | Tip |
|------|-----------|----------|-----|
| Backup restore | Mesečno | 2 uri | Avtomatizirano |
| Failover | Četrtletno | 4 ure | Ročno |
| Polna DR vaja | Letno | 8 ur | Ročno |

### 7.2 Dokumentacija testov

Vsak test mora vključevati:
- Datum in čas izvedbe
- Udeleženci
- Scenarij
- Rezultati
- Ugotovljene pomanjkljivosti
- Korektivni ukrepi

---

## 8. Kontaktne informacije

### 8.1 Eskalacijska veriga

| Nivo | Vloga | Kontakt | Odzivni čas |
|------|-------|---------|-------------|
| L1 | On-call engineer | oncall@NexGen.si | 15 min |
| L2 | DevOps Lead | devops@NexGen.si | 30 min |
| L3 | CTO | cto@NexGen.si | 1 ura |

### 8.2 Zunanji kontakti

| Storitev | Kontakt | Namen |
|----------|---------|-------|
| Cloud provider | support@provider.com | Infrastruktura |
| Security vendor | security@vendor.com | Varnostni incidenti |

---

## 9. Spremembe in zgodovina

| Datum | Verzija | Sprememba | Avtor |
|-------|---------|-----------|-------|
| 2024-12-24 | 1.0.0 | Začetna verzija | MIA BUILD |

---

*Ta dokument je del NexGen in je zaščiten z avtorskimi pravicami.*
