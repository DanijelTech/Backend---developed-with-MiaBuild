<!-- @document_id DOC-DBGUIDE-DOMENA02-001 -->
<!-- @version 1.0.0 -->
<!-- @domain ZALEDNI_SISTEMI -->
<!-- @requirement ZAH-DBGUIDE-001 Database design guide mora definirati standarde za nacrtovanje podatkovnih baz -->
<!-- @design DSN-DBGUIDE-001 Strukturiran pristop k nacrtovanju podatkovnih baz z domensko-specificnimi elementi -->
<!-- @test TST-DBGUIDE-001 Verifikacija implementacije vseh database standardov -->
<!-- @hazard_id HAZ-DBGUIDE-001 -->
<!-- Generated: {{DATUM_GENERACIJE}} -->
# Vodic za nacrtovanje podatkovnih baz

**Domena:** Zaledni sistemi (ZALEDNI_SISTEMI)
**Skladnost:** DO-178C, IEC-61508, ISO-26262, MIL-STD-882E

## 1. Pregled

### 1.1 Namen
Ta dokument definira standarde in smernice za nacrtovanje podatkovnih baz v sistemu NexGen.

### 1.2 Podprte baze
| Baza | Namen | Funkcije |
|------|-------|----------|
| PostgreSQL | Primarna relacijska | FN_02_DB_QUERY, FN_02_DB_TX_* |
| Redis | Cache, session | FN_02_CACHE_* |
| Elasticsearch | Iskanje, logi | FN_02_SEARCH, FN_02_LOG_* |

## 2. Shema standardi

### 2.1 Poimenovanje
```sql
-- Funkcija: FN_02_DB_MIGRATE_UP
-- Tabele: mnozina, snake_case
CREATE TABLE users (...);
CREATE TABLE order_items (...);

-- Stolpci: ednina, snake_case
id, user_id, created_at, is_active

-- Indeksi: idx_{tabela}_{stolpci}
CREATE INDEX idx_users_email ON users(email);

-- Tuji kljuci: fk_{tabela}_{referenca}
CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id)

-- Omejitve: chk_{tabela}_{opis}
CONSTRAINT chk_orders_amount CHECK (amount > 0)
```

### 2.2 Obvezni stolpci
```sql
-- Funkcija: FN_02_CREATE, FN_02_UPDATE, FN_02_DELETE
CREATE TABLE {{tabela}} (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,  -- Soft delete
    version INTEGER NOT NULL DEFAULT 1,  -- Optimistic locking
    tenant_id UUID NOT NULL,  -- Multi-tenancy
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id)
);
```

### 2.3 Podatkovni tipi
| Tip podatka | PostgreSQL tip | Opombe |
|-------------|----------------|--------|
| ID | UUID | gen_random_uuid() |
| Cas | TIMESTAMPTZ | Vedno z UTC |
| Denar | NUMERIC(19,4) | Nikoli FLOAT |
| JSON | JSONB | Ne JSON |
| Tekst | TEXT | Ne VARCHAR brez omejitve |
| Boolean | BOOLEAN | Ne INTEGER |
| Enum | ENUM ali CHECK | Definiraj tip |

## 3. Indeksiranje

### 3.1 Strategija indeksiranja
```sql
-- Funkcija: FN_02_DB_QUERY
-- Primarni kljuc (avtomatski)
PRIMARY KEY (id)

-- Tuji kljuci
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Pogosti filtri
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;

-- Sestavljeni indeksi
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Pokrivni indeksi
CREATE INDEX idx_users_email_name ON users(email) INCLUDE (name);

-- Delni indeksi
CREATE INDEX idx_orders_pending ON orders(created_at) 
  WHERE status = 'pending';

-- GIN za JSONB
CREATE INDEX idx_users_metadata ON users USING GIN (metadata);

-- Full-text search
CREATE INDEX idx_products_search ON products 
  USING GIN (to_tsvector('slovenian', name || ' ' || description));
```

### 3.2 Analiza poizvedb
```sql
-- Funkcija: FN_02_DB_QUERY
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM users WHERE email = 'test@example.com';

-- Preveri uporabo indeksov
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

## 4. Transakcije

### 4.1 Izolacijski nivoji
```sql
-- Funkcija: FN_02_DB_TX_BEGIN
-- READ COMMITTED (privzeto)
BEGIN;
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- REPEATABLE READ (za porocila)
BEGIN;
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;

-- SERIALIZABLE (za kriticne operacije)
BEGIN;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
```

### 4.2 Optimistic locking
```sql
-- Funkcija: FN_02_UPDATE
UPDATE users 
SET name = 'Novo ime', version = version + 1, updated_at = CURRENT_TIMESTAMP
WHERE id = '{{id}}' AND version = {{trenutna_verzija}};

-- Preveri, ce je bila vrstica posodobljena
IF NOT FOUND THEN
    RAISE EXCEPTION 'Concurrent modification detected';
END IF;
```

### 4.3 Savepoints
```sql
-- Funkcija: FN_02_DB_TX_SAVEPOINT
BEGIN;
INSERT INTO orders (...) VALUES (...);

SAVEPOINT before_items;
INSERT INTO order_items (...) VALUES (...);

-- Ce pride do napake
ROLLBACK TO SAVEPOINT before_items;

COMMIT;
```

## 5. Migracije

### 5.1 Struktura migracij
```
migrations/
├── 20240101000000_create_users.sql
├── 20240101000001_create_orders.sql
├── 20240102000000_add_users_email_index.sql
└── 20240103000000_add_orders_status.sql
```

### 5.2 Format migracije
```sql
-- Funkcija: FN_02_DB_MIGRATE_UP, FN_02_DB_MIGRATE_DOWN
-- Migration: 20240101000000_create_users
-- Description: Ustvari tabelo users

-- +migrate Up
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- +migrate Down
DROP TABLE IF EXISTS users;
```

### 5.3 Varne migracije
```sql
-- Funkcija: FN_02_DB_MIGRATE_UP
-- Dodajanje stolpca (varno)
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Dodajanje indeksa (brez zaklepanja)
CREATE INDEX CONCURRENTLY idx_users_phone ON users(phone);

-- Preimenovanje stolpca (v dveh korakih)
-- Korak 1: Dodaj nov stolpec
ALTER TABLE users ADD COLUMN new_name VARCHAR(255);
UPDATE users SET new_name = old_name;
-- Korak 2: (po deployu) Odstrani star stolpec
ALTER TABLE users DROP COLUMN old_name;
ALTER TABLE users RENAME COLUMN new_name TO name;
```

## 6. Varnostne kopije

### 6.1 Strategija varnostnih kopij
```yaml
# Funkcija: FN_02_DB_BACKUP, FN_02_DB_RESTORE
backup:
  full:
    frequency: daily
    retention_days: 30
    time: "02:00 UTC"
  incremental:
    frequency: hourly
    retention_days: 7
  wal_archiving:
    enabled: true
    retention_days: 7
  point_in_time_recovery:
    enabled: true
    retention_days: 7
```

### 6.2 Backup ukazi
```bash
# Funkcija: FN_02_DB_BACKUP
# Polna varnostna kopija
pg_dump -Fc -f backup_$(date +%Y%m%d_%H%M%S).dump {{DATABASE}}

# Obnova
pg_restore -d {{DATABASE}} backup.dump

# Verifikacija
pg_restore --list backup.dump
```

## 7. Connection pooling

### 7.1 Konfiguracija
```yaml
# Funkcija: FN_02_DB_POOL_ACQUIRE, FN_02_DB_POOL_RELEASE
pool:
  min_connections: 5
  max_connections: 20
  idle_timeout_ms: 30000
  connection_timeout_ms: 5000
  max_lifetime_ms: 1800000
  health_check_interval_ms: 30000
```

### 7.2 Zdravstvena preverjanja
```sql
-- Funkcija: FN_02_DB_POOL_HEALTH
SELECT 1;

-- Naprednejse preverjanje
SELECT 
    count(*) as active_connections,
    max_conn as max_connections,
    (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle') as idle
FROM pg_stat_database, (SELECT setting::int as max_conn FROM pg_settings WHERE name = 'max_connections') s
WHERE datname = current_database();
```

## 8. Multi-tenancy

### 8.1 Row-level security
```sql
-- Funkcija: FN_02_DB_QUERY
-- Omogoci RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Ustvari politiko
CREATE POLICY tenant_isolation ON users
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Nastavi tenant v seji
SET app.tenant_id = '{{TENANT_ID}}';
```

### 8.2 Schema-based tenancy
```sql
-- Funkcija: FN_02_DB_CONNECT
-- Ustvari shemo za vsakega tenanta
CREATE SCHEMA tenant_{{TENANT_ID}};

-- Nastavi search_path
SET search_path TO tenant_{{TENANT_ID}}, public;
```

## 9. Monitoring

### 9.1 Kljucne metrike
```sql
-- Funkcija: FN_02_METRIC_GAUGE
-- Aktivne povezave
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- Pocasne poizvedbe
SELECT query, calls, mean_time, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Velikost tabel
SELECT 
    relname as table,
    pg_size_pretty(pg_total_relation_size(relid)) as total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

### 9.2 Alarmi
| Metrika | Prag opozorila | Prag kriticno |
|---------|----------------|---------------|
| Povezave | > 80% | > 95% |
| Replikacijski lag | > 1s | > 10s |
| Deadlocks | > 1/min | > 10/min |
| Pocasne poizvedbe | > 1s | > 5s |

## 10. Skladnost

| Standard | Zahteva | Implementacija |
|----------|---------|----------------|
| DO-178C | Sledljivost | Audit stolpci |
| IEC-61508 | Integriteta | Transakcije, omejitve |
| ISO-26262 | Varnostne kopije | Dnevne kopije, PITR |
| MIL-STD-882E | Varnost | RLS, sifriranje |
| GDPR | Brisanje | Soft delete, anonimizacija |
| PCI-DSS | Sifriranje | pgcrypto, TDE |
