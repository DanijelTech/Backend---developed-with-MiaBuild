<!-- @document_id DOC-SLA-DOMENA02-001 -->
<!-- @version 1.0.0 -->
<!-- @domain ZALEDNI_SISTEMI -->
<!-- @requirement ZAH-SLA-001 SLA policy mora definirati ravni storitev -->
<!-- @design DSN-SLA-001 Strukturiran pristop k definiranju SLA z domensko-specificnimi elementi -->
<!-- @test TST-SLA-001 Verifikacija implementacije vseh SLA zahtev -->
<!-- @hazard_id HAZ-SLA-001 -->
<!-- Generated: {{DATUM_GENERACIJE}} -->
# Politika ravni storitev (SLA)

**Domena:** Zaledni sistemi (ZALEDNI_SISTEMI)
**Skladnost:** DO-178C, IEC-61508, ISO-26262, MIL-STD-882E

## 1. Pregled

### 1.1 Namen
Ta dokument definira ravni storitev (SLA) za zaledni sistem NexGen.

### 1.2 Obseg
- Razpolozljivost
- Zmogljivost
- Podpora
- Varnost

## 2. Ravni storitev

### 2.1 Pregled ravni
| Raven | Razpolozljivost | Latentnost P99 | Podpora | Cena |
|-------|-----------------|----------------|---------|------|
| PLATINUM | 99.99% | < 10ms | 24/7/365 | Premium |
| GOLD | 99.9% | < 50ms | 24/7 | Standard |
| SILVER | 99.5% | < 100ms | Delovni cas | Osnovna |

### 2.2 PLATINUM raven
```yaml
# Funkcija: FN_02_HEALTH_CHECK, FN_02_METRIC_GAUGE
platinum:
  availability:
    target: 99.99%
    max_downtime_year: "52.56 min"
    measurement_period: "monthly"
  performance:
    latency_p50: "< 5ms"
    latency_p99: "< 10ms"
    throughput: "> 50,000 RPS"
    error_rate: "< 0.01%"
  recovery:
    rto: "5 min"
    rpo: "1 min"
  support:
    response_time_critical: "15 min"
    response_time_high: "30 min"
    response_time_medium: "2 hours"
    response_time_low: "8 hours"
    availability: "24/7/365"
    dedicated_tam: true
  features:
    - "Multi-AZ deployment"
    - "Geo-redundancy"
    - "Dedicated resources"
    - "Priority support queue"
    - "Custom SLA reporting"
    - "Quarterly business reviews"
```

### 2.3 GOLD raven
```yaml
# Funkcija: FN_02_HEALTH_CHECK, FN_02_METRIC_GAUGE
gold:
  availability:
    target: 99.9%
    max_downtime_year: "8.76 hours"
    measurement_period: "monthly"
  performance:
    latency_p50: "< 20ms"
    latency_p99: "< 50ms"
    throughput: "> 20,000 RPS"
    error_rate: "< 0.1%"
  recovery:
    rto: "30 min"
    rpo: "5 min"
  support:
    response_time_critical: "30 min"
    response_time_high: "1 hour"
    response_time_medium: "4 hours"
    response_time_low: "24 hours"
    availability: "24/7"
    dedicated_tam: false
  features:
    - "Multi-AZ deployment"
    - "Standard redundancy"
    - "Shared resources"
    - "Standard support queue"
    - "Monthly SLA reporting"
```

### 2.4 SILVER raven
```yaml
# Funkcija: FN_02_HEALTH_CHECK, FN_02_METRIC_GAUGE
silver:
  availability:
    target: 99.5%
    max_downtime_year: "43.8 hours"
    measurement_period: "monthly"
  performance:
    latency_p50: "< 50ms"
    latency_p99: "< 100ms"
    throughput: "> 5,000 RPS"
    error_rate: "< 0.5%"
  recovery:
    rto: "2 hours"
    rpo: "15 min"
  support:
    response_time_critical: "1 hour"
    response_time_high: "4 hours"
    response_time_medium: "8 hours"
    response_time_low: "48 hours"
    availability: "Business hours (9-17 CET)"
    dedicated_tam: false
  features:
    - "Single-AZ deployment"
    - "Basic redundancy"
    - "Shared resources"
    - "Standard support queue"
    - "Quarterly SLA reporting"
```

## 3. Metrike in merjenje

### 3.1 Razpolozljivost
```yaml
# Funkcija: FN_02_METRIC_GAUGE, FN_02_HEALTH_CHECK
availability_calculation:
  formula: "(total_minutes - downtime_minutes) / total_minutes * 100"
  excluded_from_downtime:
    - "Scheduled maintenance (with 72h notice)"
    - "Force majeure events"
    - "Customer-caused issues"
    - "Third-party service outages (documented)"
  measurement:
    tool: "Prometheus + Grafana"
    interval: "1 minute"
    endpoints:
      - "/health/live"
      - "/health/ready"
```

### 3.2 Latentnost
```yaml
# Funkcija: FN_02_METRIC_HISTOGRAM
latency_measurement:
  percentiles: [50, 90, 95, 99, 99.9]
  measurement_point: "API Gateway ingress"
  excluded:
    - "Batch operations"
    - "File uploads > 10MB"
    - "Long-running reports"
  tool: "Prometheus histogram"
```

### 3.3 Error rate
```yaml
# Funkcija: FN_02_METRIC_COUNTER
error_rate_calculation:
  formula: "5xx_errors / total_requests * 100"
  excluded:
    - "4xx client errors"
    - "Rate limited requests (429)"
    - "Cancelled requests"
  measurement:
    tool: "Prometheus counter"
    window: "5 minutes rolling"
```

## 4. Incidenti in eskalacija

### 4.1 Klasifikacija incidentov
| Resnost | Opis | Primer | Odzivni cas |
|---------|------|--------|-------------|
| P1 - Kriticno | Popoln izpad, izguba podatkov | Produkcija nedostopna | 15 min |
| P2 - Visoko | Delna degradacija, kriticna funkcija | Placila ne delujejo | 30 min |
| P3 - Srednje | Manjsa degradacija | Pocasnost, manjse napake | 2 uri |
| P4 - Nizko | Kozmeticne napake | UI napake, dokumentacija | 24 ur |

### 4.2 Eskalacijska matrika
| Cas | P1 | P2 | P3 | P4 |
|-----|----|----|----|----|
| 0 min | On-call inzenir | On-call inzenir | - | - |
| 15 min | Tehnicni vodja | - | On-call inzenir | - |
| 30 min | Direktor | Tehnicni vodja | - | On-call inzenir |
| 1 ura | CTO | Direktor | Tehnicni vodja | - |
| 4 ure | CEO | CTO | Direktor | Tehnicni vodja |

### 4.3 Komunikacija med incidentom
```yaml
# Funkcija: FN_02_LOG_STRUCTURED
incident_communication:
  p1:
    initial_update: "15 min"
    ongoing_updates: "30 min"
    channels: ["status page", "email", "slack", "phone"]
  p2:
    initial_update: "30 min"
    ongoing_updates: "1 hour"
    channels: ["status page", "email", "slack"]
  p3:
    initial_update: "2 hours"
    ongoing_updates: "4 hours"
    channels: ["status page", "email"]
  p4:
    initial_update: "24 hours"
    ongoing_updates: "as needed"
    channels: ["email"]
```

## 5. Vzdrzevanje

### 5.1 Nacrtvano vzdrzevanje
```yaml
scheduled_maintenance:
  notification_period: "72 hours"
  preferred_windows:
    - day: "Sunday"
      time: "02:00-06:00 UTC"
  max_duration: "4 hours"
  max_frequency: "1x per month"
  communication:
    - "Email notification"
    - "Status page update"
    - "In-app banner"
```

### 5.2 Nujno vzdrzevanje
```yaml
emergency_maintenance:
  notification_period: "Best effort"
  criteria:
    - "Critical security vulnerability"
    - "Data integrity risk"
    - "Imminent system failure"
  communication:
    - "Immediate status page update"
    - "Email notification"
    - "Phone call (PLATINUM)"
```

## 6. Krediti in kompenzacije

### 6.1 Kreditna tabela
| Razpolozljivost | PLATINUM kredit | GOLD kredit | SILVER kredit |
|-----------------|-----------------|-------------|---------------|
| < 99.99% | 10% | - | - |
| < 99.9% | 25% | 10% | - |
| < 99.5% | 50% | 25% | 10% |
| < 99.0% | 100% | 50% | 25% |
| < 95.0% | 100% | 100% | 50% |

### 6.2 Postopek zahtevka
```yaml
credit_request:
  submission_deadline: "30 days after incident"
  required_information:
    - "Incident date and time"
    - "Affected services"
    - "Impact description"
    - "Supporting evidence"
  processing_time: "10 business days"
  credit_application: "Next billing cycle"
  max_credit: "100% of monthly fee"
```

### 6.3 Izkljucitve
- Nacrtvano vzdrzevanje z ustreznim obvestilom
- Napake povzrocene s strani stranke
- Izpadi tretjih strank izven nasega nadzora
- Visja sila (naravne nesrece, vojna, ...)
- Presezena kvota uporabe

## 7. Porocanje

### 7.1 SLA porocila
```yaml
# Funkcija: FN_02_AUDIT_EXPORT
sla_reporting:
  platinum:
    frequency: "weekly"
    format: "PDF + API"
    contents:
      - "Availability metrics"
      - "Performance metrics"
      - "Incident summary"
      - "Trend analysis"
  gold:
    frequency: "monthly"
    format: "PDF"
    contents:
      - "Availability metrics"
      - "Performance metrics"
      - "Incident summary"
  silver:
    frequency: "quarterly"
    format: "PDF"
    contents:
      - "Availability summary"
      - "Major incidents"
```

### 7.2 Dostop do metrik
```yaml
metrics_access:
  platinum:
    - "Real-time dashboard"
    - "API access"
    - "Custom alerts"
    - "Raw data export"
  gold:
    - "Real-time dashboard"
    - "Standard alerts"
  silver:
    - "Monthly summary dashboard"
```

## 8. Pregled in revizija

### 8.1 Redni pregledi
| Raven | Frekvenca | Udelezenci |
|-------|-----------|------------|
| PLATINUM | Mesecno | TAM, Stranka, Tehnicni vodja |
| GOLD | Kvartalno | Account manager, Stranka |
| SILVER | Letno | Account manager, Stranka |

### 8.2 Revizija SLA
```yaml
sla_review:
  frequency: "annually"
  triggers:
    - "Significant service changes"
    - "Customer request"
    - "Regulatory changes"
  notice_period: "90 days for changes"
```

## 9. Skladnost

| Standard | Zahteva | Implementacija |
|----------|---------|----------------|
| DO-178C | Razpolozljivost | 99.99% za kriticne sisteme |
| IEC-61508 | Zanesljivost | SIL 4 za PLATINUM |
| ISO-26262 | Varnost | ASIL D za PLATINUM |
| MIL-STD-882E | Varnost | Kriticne funkcije |
| SOC 2 | Razpolozljivost | Dokumentirani SLA |
| ISO 27001 | Kontinuiteta | RTO/RPO cilji |

## 10. Kontakti

### 10.1 Podpora
| Raven | Kanal | Kontakt |
|-------|-------|---------|
| PLATINUM | Telefon 24/7 | {{TELEFON}} |
| PLATINUM | Email | platinum-support@{{DOMENA}} |
| GOLD | Email | gold-support@{{DOMENA}} |
| SILVER | Email | support@{{DOMENA}} |

### 10.2 Eskalacija
| Vloga | Ime | Kontakt |
|-------|-----|---------|
| TAM (PLATINUM) | {{IME}} | {{EMAIL}} |
| Vodja podpore | {{IME}} | {{EMAIL}} |
| Direktor | {{IME}} | {{EMAIL}} |
