<!-- @document_id DOC-HA-DOMENA02-001 -->
<!-- @version 1.0.0 -->
<!-- @domain ZALEDNI_SISTEMI -->
<!-- @requirement ZAH-HA-001 HA design mora definirati arhitekturo visoke razpolozljivosti -->
<!-- @design DSN-HA-001 Strukturiran pristop k visoki razpolozljivosti z domensko-specificnimi elementi -->
<!-- @test TST-HA-001 Verifikacija implementacije vseh HA zahtev -->
<!-- @hazard_id HAZ-HA-001 -->
<!-- Generated: {{DATUM_GENERACIJE}} -->
# Nacrt visoke razpolozljivosti zalednega sistema

**Domena:** Zaledni sistemi (ZALEDNI_SISTEMI)
**Skladnost:** DO-178C, IEC-61508, ISO-26262, MIL-STD-882E

## 1. Pregled

### 1.1 Namen
Ta dokument opisuje arhitekturo visoke razpolozljivosti (HA) za zaledni sistem NexGen.

### 1.2 SLA cilji
| Tier | Razpolozljivost | Max izpad/leto | RTO | RPO |
|------|-----------------|----------------|-----|-----|
| PLATINUM | 99.99% | 52.56 min | 5 min | 1 min |
| GOLD | 99.9% | 8.76 ur | 30 min | 5 min |
| SILVER | 99.5% | 43.8 ur | 2 uri | 15 min |

## 2. Arhitektura HA

### 2.1 Multi-AZ deployment
```
┌─────────────────────────────────────────────────────────────────┐
│                         REGIJA                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │      AZ-1       │  │      AZ-2       │  │      AZ-3       │ │
│  │  ┌───────────┐  │  │  ┌───────────┐  │  │  ┌───────────┐  │ │
│  │  │ API (3x)  │  │  │  │ API (3x)  │  │  │  │ API (3x)  │  │ │
│  │  └───────────┘  │  │  └───────────┘  │  │  └───────────┘  │ │
│  │  ┌───────────┐  │  │  ┌───────────┐  │  │  ┌───────────┐  │ │
│  │  │ Worker(2x)│  │  │  │ Worker(2x)│  │  │  │ Worker(2x)│  │ │
│  │  └───────────┘  │  │  └───────────┘  │  │  └───────────┘  │ │
│  │  ┌───────────┐  │  │  ┌───────────┐  │  │  ┌───────────┐  │ │
│  │  │ DB Replica│  │  │  │ DB Primary│  │  │  │ DB Replica│  │ │
│  │  └───────────┘  │  │  └───────────┘  │  │  └───────────┘  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Komponente HA

#### 2.2.1 Load Balancer
| Lastnost | Vrednost |
|----------|----------|
| Tip | Application Load Balancer |
| Zdravstvena preverjanja | /health vsakih 10s |
| Failover cas | < 30s |
| Funkcija | FN_02_LOAD_BALANCE |

#### 2.2.2 API storitve
| Lastnost | Vrednost |
|----------|----------|
| Min replik | 3 (1 per AZ) |
| Max replik | 100 |
| Skaliranje | HPA na CPU/Memory |
| Funkcija | FN_02_HEALTH_CHECK |

#### 2.2.3 Podatkovna baza
| Lastnost | Vrednost |
|----------|----------|
| Tip | PostgreSQL z streaming replikacijo |
| Primary | 1 |
| Replike | 2 (sync) |
| Failover | Avtomatski < 30s |
| Funkcija | FN_02_DB_POOL_HEALTH |

#### 2.2.4 Cache
| Lastnost | Vrednost |
|----------|----------|
| Tip | Redis Cluster |
| Vozlisca | 6 (3 primary, 3 replica) |
| Failover | Avtomatski < 10s |
| Funkcija | FN_02_CACHE_DISTRIBUTED |

#### 2.2.5 Message Queue
| Lastnost | Vrednost |
|----------|----------|
| Tip | RabbitMQ Cluster |
| Vozlisca | 3 |
| Mirroring | Quorum queues |
| Funkcija | FN_02_QUEUE_PUBLISH |

## 3. Failover strategije

### 3.1 Avtomatski failover
| Komponenta | Detekcija | Failover cas | Funkcija |
|------------|-----------|--------------|----------|
| API | Health check | < 30s | FN_02_LIVENESS_PROBE |
| Database | Heartbeat | < 30s | FN_02_DB_POOL_HEALTH |
| Cache | Sentinel | < 10s | FN_02_CACHE_DISTRIBUTED |
| Queue | Cluster | < 15s | FN_02_QUEUE_RETRY |

### 3.2 Circuit breaker
| Parameter | Vrednost |
|-----------|----------|
| Failure threshold | 5 napak v 10s |
| Recovery timeout | 30s |
| Half-open requests | 3 |
| Funkcija | FN_02_CIRCUIT_BREAKER |

### 3.3 Bulkhead izolacija
| Komponenta | Pool size | Timeout |
|------------|-----------|---------|
| Database | 20 | 5s |
| Cache | 50 | 1s |
| External API | 10 | 10s |
| Funkcija | FN_02_BULKHEAD |

## 4. Zdravstvena preverjanja

### 4.1 Liveness probe
```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: {{PORT}}
  initialDelaySeconds: 10
  periodSeconds: 10
  failureThreshold: 3
```
Funkcija: FN_02_LIVENESS_PROBE

### 4.2 Readiness probe
```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: {{PORT}}
  initialDelaySeconds: 5
  periodSeconds: 5
  failureThreshold: 3
```
Funkcija: FN_02_READINESS_PROBE

### 4.3 Startup probe
```yaml
startupProbe:
  httpGet:
    path: /health/startup
    port: {{PORT}}
  initialDelaySeconds: 0
  periodSeconds: 5
  failureThreshold: 30
```

## 5. Skaliranje

### 5.1 Horizontalno skaliranje (HPA)
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend-api
  minReplicas: {{MIN_REPLICAS}}
  maxReplicas: {{MAX_REPLICAS}}
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```
Funkcija: FN_02_WORKER_SCALE

### 5.2 Vertikalno skaliranje (VPA)
| Tier | CPU Request | CPU Limit | Memory Request | Memory Limit |
|------|-------------|-----------|----------------|--------------|
| PLATINUM | 2 | 4 | 4Gi | 8Gi |
| GOLD | 1 | 2 | 2Gi | 4Gi |
| SILVER | 0.5 | 1 | 1Gi | 2Gi |

## 6. Monitoring in alerting

### 6.1 Kljucne metrike
| Metrika | Prag opozorila | Prag kriticno | Funkcija |
|---------|----------------|---------------|----------|
| Razpolozljivost | < 99.95% | < 99.9% | FN_02_METRIC_GAUGE |
| Latentnost P99 | > 80ms | > 100ms | FN_02_METRIC_HISTOGRAM |
| Napake | > 0.5% | > 1% | FN_02_METRIC_COUNTER |
| CPU | > 70% | > 85% | FN_02_METRIC_GAUGE |
| Memory | > 75% | > 90% | FN_02_METRIC_GAUGE |

### 6.2 Alerting
| Resnost | Odzivni cas | Eskalacija |
|---------|-------------|------------|
| P1 - Kriticno | 5 min | Takojsnja |
| P2 - Visoko | 15 min | 30 min |
| P3 - Srednje | 1 ura | 4 ure |
| P4 - Nizko | 24 ur | Brez |

## 7. Testiranje HA

### 7.1 Chaos engineering
| Test | Opis | Frekvenca |
|------|------|-----------|
| Pod kill | Naklucno ubijanje podov | Dnevno |
| AZ failure | Simulacija izpada AZ | Tedensko |
| Network partition | Omrezna particija | Mesecno |
| DB failover | Prisilni failover baze | Mesecno |

### 7.2 Game days
| Scenarij | Trajanje | Frekvenca |
|----------|----------|-----------|
| Popoln izpad regije | 4 ure | Letno |
| DDoS napad | 2 uri | Polletno |
| Ransomware | 8 ur | Letno |

## 8. Skladnost

| Standard | Zahteva | Implementacija |
|----------|---------|----------------|
| DO-178C | Redundanca | Multi-AZ, replikacija |
| IEC-61508 | Diagnostika | Health checks, monitoring |
| ISO-26262 | Failover | Avtomatski < 30s |
| MIL-STD-882E | Odpornost | Circuit breaker, bulkhead |
