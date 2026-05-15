<!-- @document_id DOC-RB-DOMENA02-001 -->
<!-- @version 1.0.0 -->
<!-- @domain ZALEDNI_SISTEMI -->
<!-- @requirement ZAH-RB-001 Runbook mora definirati operativne postopke -->
<!-- @design DSN-RB-001 Strukturiran pristop k operativnim postopkom z domensko-specificnimi elementi -->
<!-- @test TST-RB-001 Verifikacija implementacije vseh operativnih postopkov -->
<!-- @hazard_id HAZ-RB-001 -->
<!-- Generated: {{DATUM_GENERACIJE}} -->
# Runbook: NexGen

**Verzija:** 1.0.0  
**Datum:** 2024-12-24  
**Avtor:** MIA BUILD  
**Domena:** Zaledni sistemi (ZALEDNI_SISTEMI)

---

## 1. NAMEN

### 1.1 Pregled

Ta runbook vsebuje operativne postopke za upravljanje backend sistema NexGen. Namenjen je operativnim ekipam za vsakodnevno upravljanje, odpravljanje težav in odziv na incidente.

### Backend-specifične komponente
- **Database**: PostgreSQL z connection pooling (pgBouncer)
- **Message Queue**: RabbitMQ za async procesiranje
- **Cache**: Redis za session storage in caching
- **Background Jobs**: Worker procesi za dolgotrajna opravila
- **Service Mesh**: Istio za service-to-service komunikacijo

---

## 2. Kontaktne informacije

| Vloga | Kontakt | Eskalacija |
|-------|---------|------------|
| On-call | oncall@example.com | PagerDuty |
| Team Lead | lead@example.com | Slack #NexGen-ops |
| Security | security@example.com | Urgentno: telefon |

---

## 3. Arhitektura sistema

### 3.1 Komponente

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Load Balancer │────▶│   Application   │────▶│    Database     │
│                 │     │   (3 replike)   │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │      Redis      │
                        │     (Cache)     │
                        └─────────────────┘
```

### 3.2 Endpoints

| Endpoint | Namen | Port |
|----------|-------|------|
| /health | Health check | 3000 |
| /health/live | Liveness probe | 3000 |
| /health/ready | Readiness probe | 3000 |
| /metrics | Prometheus metrics | 3000 |

---

## 4. Vsakodnevne operacije

### 4.1 Preverjanje zdravja sistema

```bash
# Preveri health endpoint
curl -s http://localhost:3000/health | jq

# Preveri Kubernetes pods
kubectl get pods -n NexGen -l app=NexGen

# Preveri loge
kubectl logs -n NexGen -l app=NexGen --tail=100
```

### 4.2 Skaliranje

```bash
# Ročno skaliranje
kubectl scale deployment NexGen -n NexGen --replicas=5

# Preveri HPA status
kubectl get hpa -n NexGen
```

### 4.3 Restart storitve

```bash
# Rolling restart
kubectl rollout restart deployment/NexGen -n NexGen

# Počakaj na zaključek
kubectl rollout status deployment/NexGen -n NexGen
```

---

## 5. Odpravljanje težav

### 5.1 Storitev ne odgovarja

**Simptomi:**
- Health check vrača 503
- Povečana latenca
- Timeout napake

**Diagnostika:**
```bash
# Preveri pod status
kubectl get pods -n NexGen -o wide

# Preveri loge
kubectl logs -n NexGen -l app=NexGen --tail=500

# Preveri events
kubectl get events -n NexGen --sort-by='.lastTimestamp'

# Preveri resource usage
kubectl top pods -n NexGen
```

**Rešitev:**
1. Če so podi v CrashLoopBackOff, preveri loge za napake
2. Če je visoka poraba virov, povečaj limite ali skaliraj
3. Če je problem z odvisnostmi (DB, Redis), preveri njihov status

### 5.2 Visoka latenca

**Simptomi:**
- p99 latenca > 1s
- Povečano število timeout napak

**Diagnostika:**
```bash
# Preveri metrike
curl -s http://localhost:3000/metrics | grep request_duration

# Preveri database connections
kubectl exec -it <pod> -n NexGen -- netstat -an | grep 5432
```

**Rešitev:**
1. Preveri database query performance
2. Preveri cache hit rate
3. Povečaj število replik če je potrebno

### 5.3 Out of Memory

**Simptomi:**
- OOMKilled status na podih
- Nenadni restarti

**Diagnostika:**
```bash
# Preveri memory usage
kubectl top pods -n NexGen

# Preveri limits
kubectl describe pod <pod-name> -n NexGen | grep -A5 Limits
```

**Rešitev:**
1. Povečaj memory limite
2. Preveri memory leake v aplikaciji
3. Optimiziraj memory usage

---

## 6. Database operacije

### 6.1 Connection pool monitoring

```bash
# Preveri pgBouncer statistiko
kubectl exec -it pgbouncer-0 -n NexGen -- psql -p 6432 pgbouncer -c "SHOW POOLS;"

# Preveri aktivne povezave
kubectl exec -it pgbouncer-0 -n NexGen -- psql -p 6432 pgbouncer -c "SHOW CLIENTS;"

# Preveri čakajoče poizvedbe
kubectl exec -it postgres-0 -n NexGen -- psql -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
```

### 6.2 Database maintenance

```bash
# Vacuum analyze
kubectl exec -it postgres-0 -n NexGen -- psql -c "VACUUM ANALYZE;"

# Preveri velikost tabel
kubectl exec -it postgres-0 -n NexGen -- psql -c "SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 10;"

# Preveri indekse
kubectl exec -it postgres-0 -n NexGen -- psql -c "SELECT indexrelname, pg_size_pretty(pg_relation_size(indexrelid)) FROM pg_stat_user_indexes ORDER BY pg_relation_size(indexrelid) DESC LIMIT 10;"
```

### 6.3 Database failover

```bash
# Preveri replication status
kubectl exec -it postgres-0 -n NexGen -- psql -c "SELECT * FROM pg_stat_replication;"

# Manual failover (Patroni)
kubectl exec -it postgres-0 -n NexGen -- patronictl failover

# Preveri cluster status
kubectl exec -it postgres-0 -n NexGen -- patronictl list
```

### 6.4 Database migration rollback

```bash
# Prikazi zgodovino migracij
kubectl exec -it <app-pod> -n NexGen -- npm run migration:status

# Rollback zadnje migracije
kubectl exec -it <app-pod> -n NexGen -- npm run migration:revert

# Rollback na specifično verzijo
kubectl exec -it <app-pod> -n NexGen -- npm run migration:revert -- --to=20231201120000
```

---

## 7. Message Queue operacije

### 7.1 RabbitMQ monitoring

```bash
# Preveri queue status
kubectl exec -it rabbitmq-0 -n NexGen -- rabbitmqctl list_queues name messages consumers

# Preveri connections
kubectl exec -it rabbitmq-0 -n NexGen -- rabbitmqctl list_connections

# Preveri channels
kubectl exec -it rabbitmq-0 -n NexGen -- rabbitmqctl list_channels
```

### 7.2 Queue drain

```bash
# Ustavi consumer-je
kubectl scale deployment NexGen-worker -n NexGen --replicas=0

# Počakaj da se queue izprazni
kubectl exec -it rabbitmq-0 -n NexGen -- rabbitmqctl list_queues name messages

# Ko je queue prazen, nadaljuj z operacijo
```

### 7.3 Dead Letter Queue processing

```bash
# Preveri DLQ
kubectl exec -it rabbitmq-0 -n NexGen -- rabbitmqctl list_queues name messages | grep dlq

# Reprocess DLQ sporočila
kubectl exec -it <app-pod> -n NexGen -- npm run dlq:reprocess

# Purge DLQ (POZOR: trajno izbriše sporočila)
kubectl exec -it rabbitmq-0 -n NexGen -- rabbitmqctl purge_queue NexGen.dlq
```

### 7.4 Queue recovery

```bash
# Restart RabbitMQ node
kubectl delete pod rabbitmq-0 -n NexGen

# Sync queues po restartu
kubectl exec -it rabbitmq-0 -n NexGen -- rabbitmqctl sync_queue NexGen.main

# Preveri cluster status
kubectl exec -it rabbitmq-0 -n NexGen -- rabbitmqctl cluster_status
```

---

## 8. Background Jobs operacije

### 8.1 Worker monitoring

```bash
# Preveri worker status
kubectl get pods -n NexGen -l component=worker

# Preveri worker loge
kubectl logs -n NexGen -l component=worker --tail=100

# Preveri job queue backlog
kubectl exec -it <app-pod> -n NexGen -- npm run jobs:status
```

### 8.2 Worker scaling

```bash
# Scale workers
kubectl scale deployment NexGen-worker -n NexGen --replicas=10

# Preveri HPA za worker-je
kubectl get hpa NexGen-worker -n NexGen

# Nastavi HPA limite
kubectl patch hpa NexGen-worker -n NexGen -p '{"spec":{"maxReplicas":20}}'
```

### 8.3 Failed jobs handling

```bash
# Prikazi failed jobs
kubectl exec -it <app-pod> -n NexGen -- npm run jobs:failed

# Retry failed job
kubectl exec -it <app-pod> -n NexGen -- npm run jobs:retry -- --id=<job-id>

# Retry vse failed jobs
kubectl exec -it <app-pod> -n NexGen -- npm run jobs:retry-all

# Izbriši failed job
kubectl exec -it <app-pod> -n NexGen -- npm run jobs:delete -- --id=<job-id>
```

### 8.4 Scheduled jobs

```bash
# Prikazi scheduled jobs
kubectl exec -it <app-pod> -n NexGen -- npm run jobs:scheduled

# Trigger scheduled job manually
kubectl exec -it <app-pod> -n NexGen -- npm run jobs:trigger -- --name=<job-name>

# Disable scheduled job
kubectl exec -it <app-pod> -n NexGen -- npm run jobs:disable -- --name=<job-name>
```

---

## 9. Cache operacije

### 9.1 Redis monitoring

```bash
# Preveri Redis info
kubectl exec -it redis-0 -n NexGen -- redis-cli INFO

# Preveri memory usage
kubectl exec -it redis-0 -n NexGen -- redis-cli INFO memory

# Preveri connected clients
kubectl exec -it redis-0 -n NexGen -- redis-cli CLIENT LIST
```

### 9.2 Cache invalidation

```bash
# Flush specific pattern
kubectl exec -it redis-0 -n NexGen -- redis-cli KEYS "NexGen:cache:*" | xargs redis-cli DEL

# Flush all cache (POZOR: vpliva na performance)
kubectl exec -it redis-0 -n NexGen -- redis-cli FLUSHDB

# Preveri cache hit rate
kubectl exec -it redis-0 -n NexGen -- redis-cli INFO stats | grep keyspace
```

### 9.3 Redis failover

```bash
# Preveri sentinel status
kubectl exec -it redis-sentinel-0 -n NexGen -- redis-cli -p 26379 SENTINEL masters

# Manual failover
kubectl exec -it redis-sentinel-0 -n NexGen -- redis-cli -p 26379 SENTINEL failover NexGen

# Preveri replication
kubectl exec -it redis-0 -n NexGen -- redis-cli INFO replication
```

---

## 10. Service-to-Service komunikacija

### 10.1 mTLS diagnostika

```bash
# Preveri certificate status
kubectl exec -it <app-pod> -n NexGen -- openssl s_client -connect <service>:443 -showcerts

# Preveri Istio proxy status
kubectl exec -it <app-pod> -n NexGen -c istio-proxy -- pilot-agent request GET /certs

# Preveri mTLS mode
kubectl get peerauthentication -n NexGen
```

### 10.2 Service mesh debugging

```bash
# Preveri Envoy config
kubectl exec -it <app-pod> -n NexGen -c istio-proxy -- pilot-agent request GET /config_dump

# Preveri upstream clusters
kubectl exec -it <app-pod> -n NexGen -c istio-proxy -- pilot-agent request GET /clusters

# Preveri Istio proxy logs
kubectl logs <app-pod> -n NexGen -c istio-proxy --tail=100
```

---

## 11. Rollback postopek

### 6.1 Kubernetes rollback

```bash
# Prikazi zgodovino
kubectl rollout history deployment/NexGen -n NexGen

# Rollback na prejšnjo verzijo
kubectl rollout undo deployment/NexGen -n NexGen

# Rollback na specifično revizijo
kubectl rollout undo deployment/NexGen -n NexGen --to-revision=3

# Preveri status
kubectl rollout status deployment/NexGen -n NexGen
```

### 6.2 Uporaba rollback skripte

```bash
# Prikazi razpoložljive revizije
./skripta/rollback.sh -l

# Izvedi rollback
./skripta/rollback.sh

# Rollback na specifično revizijo
./skripta/rollback.sh 3
```

---

## 7. Backup in restore

### 7.1 Ustvarjanje backupa

```bash
# Poln backup
./skripta/backup.sh

# Backup samo konfiguracije
./skripta/backup.sh -c

# Prikazi obstoječe backupe
./skripta/backup.sh -l
```

### 7.2 Restore iz backupa

```bash
# Prikazi razpoložljive backupe
./skripta/restore.sh -l

# Preveri integriteto backupa
./skripta/restore.sh -v backup_file.tar.gz

# Izvedi restore
./skripta/restore.sh backup_file.tar.gz
```

---

## 8. Varnostni incidenti

### 8.1 Postopek odziva

1. **Identifikacija:** Potrdi incident
2. **Izolacija:** Izoliraj prizadete sisteme
3. **Obvestilo:** Obvesti security team
4. **Analiza:** Zberi loge in dokaze
5. **Sanacija:** Odpravi ranljivost
6. **Poročilo:** Dokumentiraj incident

### 8.2 Ukazi za izolacijo

```bash
# Blokiraj zunanji promet
kubectl patch svc NexGen -n NexGen -p '{"spec":{"type":"ClusterIP"}}'

# Skaliraj na 0
kubectl scale deployment NexGen -n NexGen --replicas=0
```

---

## 9. Monitoring in alerting

### 9.1 Dashboardi

| Dashboard | URL | Namen |
|-----------|-----|-------|
| Application | /grafana/d/app | Aplikacijske metrike |
| Infrastructure | /grafana/d/infra | Infrastrukturne metrike |
| SLOs | /grafana/d/slo | Service Level Objectives |

### 9.2 Alarmne ravni

| Raven | Odzivni čas | Akcija |
|-------|-------------|--------|
| Critical | 5 min | Takojšnja eskalacija |
| Warning | 30 min | Preglej in odpravi |
| Info | Naslednji delovni dan | Dokumentiraj |

---

## 10. Changelog

| Datum | Verzija | Sprememba |
|-------|---------|-----------|
| 2024-12-24 | 1.0.0 | Začetna verzija |

---

*Ta dokument je del NexGen in je zaščiten z avtorskimi pravicami.*
