<!-- @document_id DOC-SECGUIDE-DOMENA02-001 -->
<!-- @version 1.0.0 -->
<!-- @domain ZALEDNI_SISTEMI -->
<!-- @requirement ZAH-SECGUIDE-001 Security hardening guide mora definirati varnostne ukrepe -->
<!-- @design DSN-SECGUIDE-001 Strukturiran pristop k varnostnemu utrjevanju z domensko-specificnimi elementi -->
<!-- @test TST-SECGUIDE-001 Verifikacija implementacije vseh varnostnih ukrepov -->
<!-- @hazard_id HAZ-SECGUIDE-001 -->
<!-- Generated: {{DATUM_GENERACIJE}} -->
# Vodic za varnostno utrjevanje zalednega sistema

**Domena:** Zaledni sistemi (ZALEDNI_SISTEMI)
**Skladnost:** DO-178C, IEC-61508, ISO-26262, MIL-STD-882E

## 1. Pregled

### 1.1 Namen
Ta dokument definira varnostne ukrepe za utrjevanje zalednega sistema NexGen.

### 1.2 Varnostni cilji
- Zascita pred nepooblascenim dostopom
- Zascita integritete podatkov
- Zagotavljanje razpolozljivosti
- Skladnost z regulativami

## 2. Omrezna varnost

### 2.1 TLS konfiguracija
```yaml
# Funkcija: FN_02_CORS_CONFIG, FN_02_HELMET_HEADERS
tls:
  min_version: "TLS1.3"
  cipher_suites:
    - "TLS_AES_256_GCM_SHA384"
    - "TLS_CHACHA20_POLY1305_SHA256"
    - "TLS_AES_128_GCM_SHA256"
  certificate_rotation_days: 90
  hsts:
    enabled: true
    max_age_seconds: 31536000
    include_subdomains: true
    preload: true
```

### 2.2 Omrezna segmentacija
| Segment | Namen | Dostop |
|---------|-------|--------|
| DMZ | API prehod | Javni |
| APP | Zaledne storitve | Notranji |
| DATA | Podatkovne baze | Omejeni |
| MGMT | Upravljanje | Administratorji |

### 2.3 Firewall pravila
| Vir | Cilj | Port | Protokol | Akcija |
|-----|------|------|----------|--------|
| Internet | DMZ | 443 | HTTPS | ALLOW |
| DMZ | APP | 8080 | HTTP | ALLOW |
| APP | DATA | 5432 | PostgreSQL | ALLOW |
| APP | DATA | 6379 | Redis | ALLOW |
| * | * | * | * | DENY |

## 3. Avtentikacija

### 3.1 JWT konfiguracija
```yaml
# Funkcija: FN_02_SIGN, FN_02_VERIFY
jwt:
  algorithm: "RS256"
  access_token_ttl_minutes: 15
  refresh_token_ttl_days: 7
  issuer: "{{ISSUER}}"
  audience: "{{AUDIENCE}}"
  key_rotation_days: 30
  blacklist_enabled: true
```

### 3.2 OAuth 2.0 konfiguracija
```yaml
# Funkcija: FN_02_OAUTH_AUTHORIZE, FN_02_OAUTH_TOKEN
oauth2:
  authorization_code_ttl_minutes: 10
  pkce_required: true
  allowed_grant_types:
    - "authorization_code"
    - "refresh_token"
  token_endpoint_auth_methods:
    - "client_secret_post"
    - "private_key_jwt"
```

### 3.3 API kljuci
```yaml
# Funkcija: FN_02_APIKEY_GENERATE, FN_02_APIKEY_VALIDATE
api_keys:
  length_bytes: 32
  prefix: "mia_"
  hash_algorithm: "SHA256"
  rotation_reminder_days: 90
  max_keys_per_user: 5
```

## 4. Avtorizacija

### 4.1 RBAC konfiguracija
```yaml
# Funkcija: FN_02_RBAC_CHECK, FN_02_RBAC_ASSIGN
rbac:
  roles:
    - name: "admin"
      permissions: ["*"]
    - name: "operator"
      permissions: ["read:*", "write:own", "execute:jobs"]
    - name: "viewer"
      permissions: ["read:*"]
    - name: "auditor"
      permissions: ["read:*", "read:audit"]
  default_role: "viewer"
  permission_cache_ttl_seconds: 300
```

### 4.2 Row-level security
```sql
-- Funkcija: FN_02_DB_QUERY
CREATE POLICY tenant_isolation ON resources
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

## 5. Vhodna validacija

### 5.1 Request validacija
```yaml
# Funkcija: FN_02_VALIDATE_BODY, FN_02_INPUT_SANITIZE
validation:
  max_body_size_bytes: 1048576
  max_url_length: 2048
  max_header_size_bytes: 8192
  allowed_content_types:
    - "application/json"
    - "application/x-www-form-urlencoded"
  sanitization:
    html_escape: true
    sql_escape: true
    trim_whitespace: true
```

### 5.2 SQL injection preprecevanje
```yaml
# Funkcija: FN_02_SQL_INJECTION_PREVENT
sql_protection:
  parameterized_queries: required
  orm_only: true
  raw_sql_audit: true
  blocked_patterns:
    - "UNION SELECT"
    - "DROP TABLE"
    - "DELETE FROM"
    - "--"
    - "/*"
```

### 5.3 XSS preprecevanje
```yaml
# Funkcija: FN_02_XSS_PREVENT
xss_protection:
  content_security_policy:
    default-src: "'self'"
    script-src: "'self'"
    style-src: "'self' 'unsafe-inline'"
    img-src: "'self' data: https:"
    connect-src: "'self'"
    frame-ancestors: "'none'"
  x_content_type_options: "nosniff"
  x_frame_options: "DENY"
  x_xss_protection: "1; mode=block"
```

## 6. Sifriranje

### 6.1 Sifriranje v mirovanju
```yaml
# Funkcija: FN_02_PCI_ENCRYPT
encryption_at_rest:
  algorithm: "AES-256-GCM"
  key_derivation: "PBKDF2"
  key_iterations: 100000
  key_storage: "HSM"
  key_rotation_days: 365
```

### 6.2 Sifriranje v tranzitu
```yaml
encryption_in_transit:
  external: "TLS 1.3"
  internal: "mTLS"
  database: "TLS 1.2+"
  cache: "TLS 1.2+"
```

### 6.3 Upravljanje kljucev
```yaml
# Funkcija: FN_02_KEY_ROTATE
key_management:
  provider: "HSM"
  master_key_rotation_days: 365
  data_key_rotation_days: 90
  key_backup: true
  key_escrow: false
```

## 7. Rate limiting

### 7.1 Konfiguracija
```yaml
# Funkcija: FN_02_RATE_LIMIT, FN_02_RATE_LIMIT_DISTRIBUTED
rate_limiting:
  global:
    requests_per_second: 10000
    burst: 20000
  per_ip:
    requests_per_minute: 100
    burst: 200
  per_user:
    requests_per_minute: 1000
    burst: 2000
  per_endpoint:
    "/api/auth/login":
      requests_per_minute: 10
      burst: 20
    "/api/auth/register":
      requests_per_minute: 5
      burst: 10
```

### 7.2 DDoS zascita
```yaml
ddos_protection:
  waf_enabled: true
  geo_blocking: false
  ip_reputation: true
  challenge_suspicious: true
  auto_scaling: true
```

## 8. Belezenje in monitoring

### 8.1 Varnostno belezenje
```yaml
# Funkcija: FN_02_AUDIT_LOG, FN_02_LOG_STRUCTURED
security_logging:
  log_level: "INFO"
  sensitive_fields_masked:
    - "password"
    - "token"
    - "api_key"
    - "credit_card"
  events_logged:
    - "authentication_success"
    - "authentication_failure"
    - "authorization_failure"
    - "rate_limit_exceeded"
    - "suspicious_activity"
  retention_days: 2555
  immutable: true
```

### 8.2 Varnostni alarmi
| Dogodek | Prag | Akcija |
|---------|------|--------|
| Neuspele prijave | 5/min/IP | Blokada IP |
| Rate limit | 100% | Opozorilo |
| SQL injection poskus | 1 | Blokada + alarm |
| Privilege escalation | 1 | Alarm + preiskava |

## 9. Varnostno testiranje

### 9.1 SAST (Static Analysis)
| Orodje | Frekvenca | Prag |
|--------|-----------|------|
| SonarQube | Vsak commit | 0 kriticnih |
| Semgrep | Vsak commit | 0 visokih |
| CodeQL | Tedensko | 0 kriticnih |

### 9.2 DAST (Dynamic Analysis)
| Orodje | Frekvenca | Obseg |
|--------|-----------|-------|
| OWASP ZAP | Dnevno | Vse koncne tocke |
| Burp Suite | Tedensko | Kriticne tocke |
| Nuclei | Dnevno | CVE skeniranje |

### 9.3 Penetracijski testi
| Tip | Frekvenca | Izvajalec |
|-----|-----------|-----------|
| Zunanji | Letno | Zunanji |
| Notranji | Polletno | Notranji |
| Red team | Letno | Zunanji |

## 10. Skladnost

| Standard | Zahteva | Implementacija |
|----------|---------|----------------|
| DO-178C | Varnostna analiza | STRIDE, CIA |
| IEC-61508 | Zascita pred napakami | Input validacija |
| ISO-26262 | Varnostni mehanizmi | Avtentikacija, RBAC |
| MIL-STD-882E | Varnostne kontrole | Sifriranje, audit |
| OWASP | Top 10 | Vse kontrole |
| PCI-DSS | Placilni podatki | Sifriranje, tokenizacija |
| GDPR | Osebni podatki | Maskiranje, brisanje |
| HIPAA | Zdravstveni podatki | Sifriranje, audit |
