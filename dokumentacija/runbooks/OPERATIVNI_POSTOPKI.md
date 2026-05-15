# Operativni postopki: NexGen

**Verzija:** 1.0.0  
**Datum:** 2024-12-24  
**Avtor:** MIA BUILD  
**Domena:** Zaledni sistemi

---

## 1. Namen dokumenta

Ta dokument opisuje operativne postopke za upravljanje sistema NexGen. Dokument je skladen z DO-178C, IEC-61508, ISO-26262 in MIL-STD-882E standardi.

---

## 2. Zagon sistema

### 2.1 Predpogoji

| Korak | Opis | Preverjanje |
|-------|------|-------------|
| 1 | Infrastruktura je pripravljena | `kubectl get nodes` |
| 2 | Konfiguracija je naložena | `kubectl get configmaps` |
| 3 | Secrets so nastavljeni | `kubectl get secrets` |
| 4 | Database je dostopna | `./skripta/health-check.sh --db` |

### 2.2 Postopek zagona

**Korak 1:** Preveri stanje infrastrukture
```bash
./skripta/startup.sh --check-infrastructure
```

**Korak 2:** Zaženi podporne storitve
```bash
./skripta/startup.sh --start-dependencies
```

**Korak 3:** Zaženi glavno aplikacijo
```bash
./skripta/startup.sh --start-application
```

**Korak 4:** Preveri zdravje sistema
```bash
./skripta/startup.sh --health-check
```

### 2.3 Verifikacija uspešnega zagona

| Metrika | Pričakovana vrednost |
|---------|---------------------|
| Health endpoint | 200 OK |
| Ready pods | 3/3 |
| Error rate | 0% |
| Latency P50 | < 100ms |

---

## 3. Ustavitev sistema

### 3.1 Graceful shutdown

**Korak 1:** Ustavi sprejem novega prometa
```bash
./skripta/shutdown.sh --drain-traffic
```

**Korak 2:** Počakaj na zaključek aktivnih zahtev
```bash
./skripta/shutdown.sh --wait-active-requests --timeout=60
```

**Korak 3:** Ustavi aplikacijo
```bash
./skripta/shutdown.sh --stop-application
```

**Korak 4:** Ustavi podporne storitve (opcijsko)
```bash
./skripta/shutdown.sh --stop-dependencies
```

### 3.2 Emergency shutdown

**OPOZORILO:** Uporabi samo v nujnih primerih!

```bash
./skripta/shutdown.sh --emergency --confirm
```

---

## 4. Restart sistema

### 4.1 Rolling restart

```bash
# Korak 1: Izvedi rolling restart
kubectl rollout restart deployment/NexGen

# Korak 2: Spremljaj napredek
kubectl rollout status deployment/NexGen

# Korak 3: Preveri zdravje
./skripta/health-check.sh --full
```

### 4.2 Full restart

```bash
# Korak 1: Ustavi sistem
./skripta/shutdown.sh --graceful

# Korak 2: Počakaj 30 sekund
sleep 30

# Korak 3: Zaženi sistem
./skripta/startup.sh --full
```

---

## 5. Monitoring in alerting

### 5.1 Ključne metrike

| Metrika | Normalna vrednost | Alert prag |
|---------|-------------------|------------|
| CPU usage | < 70% | > 85% |
| Memory usage | < 80% | > 90% |
| Error rate | < 0.1% | > 1% |
| Latency P99 | < 500ms | > 2s |
| Active connections | < 1000 | > 5000 |

### 5.2 Pregled logov

```bash
# Zadnjih 100 vrstic
kubectl logs deployment/NexGen --tail=100

# Sledenje v realnem času
kubectl logs deployment/NexGen -f

# Filtriranje napak
kubectl logs deployment/NexGen | grep -i error
```

### 5.3 Pregled metrik

```bash
# Prometheus query
./skripta/metrics.sh --query="rate(http_requests_total[5m])"

# Dashboard URL
./skripta/metrics.sh --dashboard-url
```

---

## 6. Skaliranje

### 6.1 Horizontalno skaliranje

```bash
# Korak 1: Povečaj število replik
kubectl scale deployment/NexGen --replicas=5

# Korak 2: Preveri status
kubectl get pods -l app=NexGen

# Korak 3: Preveri load balancing
./skripta/health-check.sh --load-distribution
```

### 6.2 Vertikalno skaliranje

```bash
# Korak 1: Posodobi resource limits
kubectl set resources deployment/NexGen \
  --limits=cpu=2,memory=4Gi \
  --requests=cpu=1,memory=2Gi

# Korak 2: Izvedi rolling restart
kubectl rollout restart deployment/NexGen
```

---

## 7. Backup in restore

### 7.1 Ročni backup

```bash
# Korak 1: Ustvari backup
./skripta/backup.sh --type=full --tag=manual-$(date +%Y%m%d)

# Korak 2: Preveri backup
./skripta/backup.sh --verify --tag=manual-$(date +%Y%m%d)

# Korak 3: Kopiraj na offsite lokacijo
./skripta/backup.sh --sync-offsite
```

### 7.2 Restore iz backup-a

```bash
# Korak 1: Seznam backup-ov
./skripta/restore.sh --list

# Korak 2: Preveri backup
./skripta/restore.sh --verify --backup-id=<backup-id>

# Korak 3: Izvedi restore
./skripta/restore.sh --execute --backup-id=<backup-id> --confirm
```

---

## 8. Troubleshooting

### 8.1 Pogosti problemi

| Problem | Simptom | Rešitev |
|---------|---------|---------|
| Pod crashloop | CrashLoopBackOff status | Preveri loge, povečaj resources |
| High latency | P99 > 2s | Preveri DB queries, skaliraj |
| Memory leak | OOMKilled | Restart, preveri kodo |
| Connection refused | 503 errors | Preveri health checks |

### 8.2 Diagnostični ukazi

```bash
# Status podov
kubectl get pods -o wide

# Opis poda
kubectl describe pod <pod-name>

# Logi
kubectl logs <pod-name> --previous

# Exec v pod
kubectl exec -it <pod-name> -- /bin/sh
```

---

## 9. Vzdrževalna okna

### 9.1 Planiranje

| Aktivnost | Frekvenca | Trajanje | Vpliv |
|-----------|-----------|----------|-------|
| Security patches | Tedensko | 30 min | Minimalen |
| Minor updates | Mesečno | 1 ura | Nizek |
| Major updates | Četrtletno | 4 ure | Srednji |
| Infrastructure | Letno | 8 ur | Visok |

### 9.2 Postopek vzdrževanja

1. Obvesti uporabnike 48 ur vnaprej
2. Pripravi rollback plan
3. Izvedi backup
4. Izvedi vzdrževanje
5. Preveri sistem
6. Obvesti o zaključku

---

## 10. Spremembe in zgodovina

| Datum | Verzija | Sprememba | Avtor |
|-------|---------|-----------|-------|
| 2024-12-24 | 1.0.0 | Začetna verzija | MIA BUILD |

---

*Ta dokument je del NexGen in je zaščiten z avtorskimi pravicami.*
