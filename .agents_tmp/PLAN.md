# 1. OBJECTIVE

Izvaja celovitega implementacijskega načrta za projekt Backend z naslednjimi glavnimi cilji:

1. **Popolna analiza stanja** - Preverjanje trenutnega stanja kode, odvisnosti in manjkajočih komponent
2. **Implementacija @mia/core** - Jedro sistema (Clock, Logger, Metrics, Hash) ker trenutno manjka
3. **Zamenjava placeholder-jev** - Popolna zamenjava vseh `{{...}}` placeholder-jev v kodi
4. **Implementacija packages** - API strežnik, UI in Workers komponente
5. **Docker testiranje** - Lokalno testiranje z Docker Compose
6. **Testna coverage** - Unit, integration in E2E testi
7. **Security in CI/CD** - Varnostni pregled, avtomatizacija
8. **Dokumentacija** - Popolna tehnična dokumentacija

**Glavni problem**: Projekt ima odvisnost na `@mia/core` paket (Clock, Logger, Metrics, Hash), ki ni implementiran, kar povzroča napake ob prevajanju. Prav tako obstaja veliko placeholder-jev, ki jih je potrebno zamenjati z dejanskimi vrednostmi.

---

# 2. CONTEXT SUMMARY

## Projektna struktura
```
Backend---developed-with-MiaBuild/
├── src/                    # Glavni strežniški kod (~50+ modulov)
│   ├── api/              # REST/GraphQL krmilniki
│   ├── security/         # Varnostni moduli (7 datotek)
│   ├── observability/   # Logging, metrics, tracing
│   ├── resilience/      # Circuit breaker, retry, failover
│   ├── reliability/    # Error handling
│   ├── monitoring/     # Health checks
│   ├── cache/          # Cache manager
│   ├── database/       # Repository, query optimizer
│   └── ...
├── packages/
│   ├── api/            # API strežnik (index.js + Docker)
│   ├── ui/             # React UI
│   └── workers/         # Background workers
├── functions/          # Serverless funkcije (~100+ datotek)
├── products/            # Generirani produkti
├── dokumentacija/        # Tehnična dokumentacija
├── docker-compose.yml     # Docker Compose konfiguracija
└── package.json        # Glavna konfiguracija
```

## Trenutno stanje
- **Odvisnost**: `@mia/core": "^1.0.0"` v package.json - **NE Obstaja!**
- **Placeholder-ji**: ~100+ datotek z `{{...}}` vzorci
- **Packages**: So samo skeleton strukture (index.js, Dockerfile)
- **Testi**: Ne obstajajo
- **CI/CD**: Ni konfiguriran

## Ključne komponente za implementacijo
1. `@mia/core` paket (Clock, Logger, Metrics, Hash)
2. API strežnik (`packages/api`)
3. UI komponenta (`packages/ui`)
4. Workers (`packages/workers`)
5. Docker konfiguracija

---

# 3. APPROACH OVERVIEW

## Izbrani pristop: FAZA-FAZA Implementacija

Zaradi odvisnosti med komponentami (npr. @mia/core mora obstajati preden ga lahko drugi moduli uvozijo), bomo implementacijo izvedli po fazah:

1. **FAZA 1-2**: Analiza in popis placeholder-jev (priprava)
2. **FAZA 3**: Implementacija @mia/core jedra (PREDNOSTNO)
3. **FAZA 4**: Zamenjava placeholder-jev (enostavna zamenjava)
4. **FAZA 5-7**: Implementacija packages (API, UI, Workers)
5. **FAZA 8-10**: Testi in Docker
6. **FAZA 11-17**: Dokumentacija, Security, CI/CD, K8s

**Alternativa**: vzporedna implementacija - ni mogoča zaradi odvisnosti (@mia/core mora biti implementiran pred uporabo)

**Zakaj ta pristop**:
- Logična odvisnost: @mia/core je jedro, ki ga drugi moduli potrebujejo
- Minimiziranje tveganja: fazno izvajanje omogoča stabilne checkpoint-e
- Testiranje: vsaka faza omogoča preverjanje preden nadaljujemo

---

# 4. IMPLEMENTATION STEPS

## FAZA 1: Analiza stanja - Popolni pregled

**Cilj**: Dokumentiranje trenutnega stanja projekta

**Metoda**: Pregled kode, odvisnosti, strukture

- [x] Pregled glavnega package.json
- [x] Preverjanje strukture projekta
- [x] Identifikacija odvisnosti (@mia/core)
- [x] Popis funkcij (~100+ datotek)
- [x] Identifikacija placeholder-jev

**Referenca**: package.json, src/, functions/

---

## FAZA 2: Popis in kategorizacija placeholder-jev

**Cilj**: Popis vseh placeholder-jev za enotno zamenjavo

**Metoda**: Iskanje in kategorizacija `{{...}}` vzorcev

**Metoda**: Iskanje `\{\{.*\}\}` vzorcev

**Rezultat pregleda - Kategorije placeholder-jev**:

| Kategorija | Primer | Datotek |
|-----------|--------|--------|
| Ime projekta | `{{IME_PROJEKTA_SLUG}}` | package.json, Docker |
| Datumi | `{{DATUM}}`, `{{DATUM_YYYY}}` | reports, documentation |
| Verzije | `{{VERZIJA}}`, `{{VERZIJA_ZADNJega}}` | products, evidence |
| Hash vrednosti | `{{HASH_VALUE}}`, `{{CHECKSUM}}` | products, reports |
| Podpisi | `{{SIGNATURE}}`, `{{DIGEST}}` | products |
| Funkcijski ID | `{{FUNKCIJA_ID}}` | functions/ |

**Naslednji korak**: Zbirni seznam vseh datotek z placeholder-ji

**Referenca**: Vse datoteke s `{{...}}`

---

## FAZA 3: Jedro - @mia/core implementacija

**Cilj**: Implementirati manjkajoč jedro sistema @mia/core

**Metoda**: Ustvariti nov paket z moduli Clock, Logger, Metrics, Hash

**Metoda**: Kreirati novo `packages/core/` mapo in implementirati module

### Koraki:

**3.1 Clock modul** (`packages/core/src/clock.ts`)
- Funkcija: `getClock(): Clock`
- Metode: `nowMs()`, `nowUs()`, `now()`, `sleep(ms)`
- Tip: `Clock` interface

**3.2 Logger modul** (`packages/core/src/logger.ts`)
- Funkcija: `createLogger(config): Logger`
- Metode: `debug()`, `info()`, `warn()`, `error()`, `fatal()`
- Strukturirano logiranje z JSON

**3.3 Metrics modul** (`packages/core/src/metrics.ts`)
- Funkcija: `createMetrics(name): Metrics`
- Metode: `increment()`, `decrement()`, `gauge()`, `timing()`, `histogram()`

**3.4 Hash modul** (`packages/core/src/hash.ts`)
- Funkcija: `createHash(alg): Hash`
- Metode: `hash(data)`, `verify(data, hash)`, `generateIdempotencyKey(data)`
- Podprti algoritmi: SHA-256, SHA-512, BLAKE3

**3.5 Package.json** (`packages/core/package.json`)
```json
{
  "name": "@mia/core",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./clock": "./dist/clock.js",
    "./logger": "./dist/logger.js",
    "./metrics": "./dist/metrics.js",
    "./hash": "./dist/hash.js"
  }
}
```

**3.6 Glavni izvoz** (`packages/core/src/index.ts`)
```typescript
export { getClock, type Clock } from './clock';
export { createLogger, type Logger, type LoggerConfig } from './logger';
export { createMetrics, type Metrics, type MetricSample } from './metrics';
export { createHash, type Hasher, type HashAlgorithm } from './hash';
```

**Referenca**: src/jedro.ts (kjer import-a @mia/core), src/index.ts

---

## FAZA 4: Popravka placeholder-jev

**Cilj**: Zamenjati vse placeholder-je z ustreznimi vrednostmi

**Metoda**: Programatska zamenjava v vseh datotekah

### Koraki:

**4.1 Določitev vrednosti za placeholder-je**
- `{{IME_PROJEKTA_SLUG}}` → `nexgen-backend`
- `{{DATUM}}` → `2024-12-24` (iz analize)
- `{{DATUM_YYYY}}` → `2024`
- `{{VERZIJA}}` → `1.0.0`
- `{{CHECKSUM}}` → Izračun SHA-256
- itd.

**4.2 Izvedba zamenjave**
- Script: `scripts/replace-placeholders.sh`
- Kategorije po prioriteti:
  1. package.json (kritično za build)
  2. evidence/ datoteke
  3. products/ datoteke
  4. ostalo

**4.3 Preverjanje**
- Po zamenjavi preveriti število preostalih placeholder-jev
- Cilj: 0 preostalih placeholder-jev

**Referenca**: Vse datoteke s `{{...}}`

---

## FAZA 5: API strežnik - packages/api

**Cilj**: Implementirati polno delujoč API strežnik

**Metoda**: Dopolniti skeleton kodo

### Koraki:

**5.1 Dopolnitev package.json** (`packages/api/package.json`)
- Popravi ime, verzije, odvisnosti
- Dodaj scripts (start, build, dev)

**5.2 Glavna aplikacija** (`packages/api/src/index.js`)
```javascript
import express from 'express';
import { requestLogger } from './middleware/logger.js';
import { errorHandler } from './middleware/error.js';
import routes from './routes/index.js';

const app = express();
app.use(express.json());
app.use(requestLogger);
app.use('/api', routes);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API server listening on port ${PORT}`));
```

**5.3 Routes in middleware**
- Dodaj osnovne poti (CRUD)
- Dodaj middleware (auth, validation, rate limiting)

**5.4 Dockerfile** (`packages/api/Dockerfile`)
- Optimiziraj za produkcijo
- Dodaj health check

**5.5 Preizkus**
- Testni zagon: `docker build packages/api && docker run`
- Preverjanje health endpoint-a

**Referenca**: packages/api/src/index.js, docker-compose.yml

---

## FAZA 6: UI - packages/ui

**Cilj**: Implementirati uporabniški vmesnik

**Metoda**: Dopolniti React komponento

### Koraki:

**6.1 Dopolnitev package.json** (`packages/ui/package.json`)
- Popravi ime, odvisnosti (React 18)
- Dodaj build scripts

**6.2 Glavna aplikacija** (`packages/ui/src/App.jsx`)
```jsx
import { useState, useEffect } from 'react';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);
  
  if (loading) return <div>Loading...</div>;
  return <div>{JSON.stringify(data)}</div>;
}

export default App;
```

**6.3 Dodatne komponente**
- Dashboard
- Status prikaz
- Configuration form

**6.4 Dockerfile in nginx**
- Multi-stage build
- Nginx konfiguracija za API proxy

**6.5 Testiranje**
- Zagon: `docker build packages/ui && docker run`
- Preverjanje dostopa do UI-ja

**Referenca**: packages/ui/src/main.jsx, packages/ui/nginx.conf

---

## FAZA 7: Workers - packages/workers

**Cilj**: Implementirati background workers

**Metoda**: Dopolniti worker logiko

### Koraki:

**7.1 Dopolnitev package.json** (`packages/workers/package.json`)
- Dodaj odvisnosti (bull, agenda)
- Dodaj worker scripts

**7.2 Worker implementacija** (`packages/workers/src/index.js`)
```javascript
import { Worker } from 'bullmq';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

const worker = new Worker('default', async job => {
  console.log(`Processing job ${job.id}`);
  // Job processing logic
}, { connection: redis });

worker.on('completed', job => console.log(`Job ${job.id} completed`));
worker.on('failed', job => console.log(`Job ${job.id} failed`));

console.log('Worker started');
```

**7.3 Job procesorji**
- Email worker
- Report worker
- Cleanup worker

**7.4 Dockerfile**
- Dodaj Redis odvisnost
- Health check

**7.5 Testiranje**
- Zagon: `docker build packages/workers && docker run`
- Preverjanje job procesiranja

**Referenca**: packages/workers/src/index.js, docker-compose.yml

---

## FAZA 8: Docker - Lokalno testiranje

**Cilj**: Delujoč Docker Compose stack

**Metoda**: Zagon vseh komponent

### Koraki:

**8.1 Preverjanje docker-compose.yml**
-API servis
- UI servis
- Workers servis
- Redis servis
- PostgreSQL (opcijsko)

**8.2 Zagon stack-a**
```bash
docker-compose build
docker-compose up -d
```

**8.3 Preverjanje storitev**
```bash
curl http://localhost:3000/health  # API
curl http://localhost:8080         # UI
```

**8.4 Testni scenariji**
- API → UI komunikacija
- Worker job oddaja
- Logging output

**8.5 Čiščenje**
```bash
docker-compose down
```

**Referenca**: docker-compose.yml

---

## FAZA 9: Testi - Enotni testi

**Cilj**: Unit in integration testi za glavne komponente

**Metoda**: Pisanje testov s test framework-om

### Koraki:

**9.1 Test framework setup**
- Namesti: jest, @testing-library/react
- Konfiguriraj: jest.config.js

**9.2 @mia/core testi** (prioritetno)
- clock.test.ts: testiranje časa
- logger.test.ts: testiranje logiranja
- metrics.test.ts: testiranje metrik
- hash.test.ts: testiranje hash funkcij

**9.3 API testi**
- routes/ testi
- middleware testi
- integration testi

**9.4 Coverage cilj**
- Coverage: >80%
- критиčne funkcije: 100%

### Primer testa:
```typescript
// packages/core/src/clock.test.ts
import { getClock } from './clock';

describe('Clock', () => {
  it('should return current timestamp in milliseconds', () => {
    const clock = getClock();
    const now = clock.nowMs();
    expect(typeof now).toBe('number');
    expect(now).toBeGreaterThan(0);
  });
});
```

**9.5 Zagon testov**
```bash
npm test
npm test -- --coverage
```

**Referenca**: packages/core/, packages/api/

---

## FAZA 10: E2E testi

**Cilj**: End-to-end testni scenariji

**Metoda**: Uporaba Playwright ali Cypress

### Koraki:

**10.1 Setup**
- Namesti: @playwright/test
- Konfiguriraj: playwright.config.ts

**10.2 Testni scenariji**
- Uporabniški tok: Login → Dashboard → Podatki
- Admin tok: Login → API → Worker Jobs
- Error handling: Napaka → Log → Alert

**10.3 CI integracija**
- Dodaj v CI/CD pipeline
- paralelno izvajanje

**10.4 Reporting**
- HTML report
- Video posnetki obnapak

### Primer:
```typescript
// e2e/app.spec.ts
import { test, expect } from '@playwright/test';

test('dashboard loads', async ({ page }) => {
  await page.goto('http://localhost:8080');
  await expect(page.locator('h1')).toContainText('Dashboard');
});
```

**10.5 Zagon**
```bash
npx playwright test
```

**Referenca**: e2e/ (novi direktorij)

---

## FAZA 11: Evidence - Popolni dokazi

**Cilj**: Izpolnjevanje evidence datotek

**Metoda**: Generiranje dokazov

### Koraki:

**11.1 Deterministic hash proof**
- Izračun : SHA-256 vseh komponent
- Shranjevanje: evidence/deterministic-hash-proof.json

**11.2 Compliance snapshot**
- Stanje: Skladnost s standardi
- Shranjevanje: evidence/compliance-snapshot.json

**11.3 Provenance**
- Izvor: Source code
- Proces: Build pipeline
- Shranjevanje: evidence/provenance.json

**11.4 SBOM**
- Seznam: Vse odvisnosti
- Formati: SPDX, CycloneDX, JSON

**11.5 Produktske signature**
- Podpisovanje: Cosign
- Shranjevanje: evidence/products-signatures.json

**Referenca**: evidence/ (obstoječe datoteke za dopolnitev)

---

## FAZA 12: Security - Varnostni pregled

**Cilj**: Varnostni pregled in utrditev

**Metoda**: SAST, dependency scan, penetration test

### Koraki:

**12.1 Dependency scan**
```bash
npm audit
trivy fs .
syft . -o cyclonedx-json
```

**12.2 SAST pregled**
```bash
npm run security:scan  # trivy
# Pregled rezultatov
```

**12.3 Secrets scanning**
```bash
trivy secret
# Preverjanje, da ni skritihgesel
```

**12.4 Hardening**
- TLS 1.3 konfiguracija
- CSP headerji
- CORS konfiguracija
- Rate limiting

**12.5 Security report**
- Poročilo: findings
- Priporočila: ukrepi

**Referenca**: konfiguracija/security-scan.json, dokumentacija/SECURITY_HARDENING_GUIDE.md

---

## FAZA 13: CI/CD - Avtomatizacija

**Cilj**: Konfiguracija CI/CD pipeline

**Metoda**: GitHub Actions ali podobno

### Koraki:

**13.1 GitHub Actions**
- `.github/workflows/ci.yml`
- `.github/workflows/security.yml`
- `.github/workflows/release.yml`

**13.2 CI Pipeline**
```yaml
# Zagon ob PR
- Checkout
- Setup Node
- Install
- Lint
- Typecheck
- Test
- Build
- Security Scan
```

**13.3 CD Pipeline**
```yaml
# Zagon ob push na main
- Build Docker images
- Push to registry
- Deploy to K8s
```

**13.4 Badge-ji**
- Build status
- Coverage
- Version

**Referenca**: .github/workflows/ (novi direktorij)

---

## FAZA 14: Infrastructure as Code

**Cilj**: Terraform konfiguracija

**Metoda**: Infrastrukturni kod

### Koraki:

**14.1 Provider konfiguracija**
- Cloud: AWS/GCP/Azure
- K8s: EKS/GKE/AKS

**14.2 Resursi**
- VPC
- Subnets
- Security groups
- RDS (PostgreSQL)
- ElastiCache (Redis)
- S3 bucketi

**14.3 Outputs**
- Endpointi
- Connection strings

**14.4 Variables**
- Dev/Staging/Prod
- Region

### Primer: `terraform/main.tf`
```hcl
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_rds_cluster" "main" {
  cluster_identifier = "nexgen-db"
  engine = "postgres"
  engine_version = "15"
  cluster_instance_class = "db.t3.medium"
}
```

**14.5 Dokumentacija**
- README.md
- State management

**Referenca**: terraform/ (novi direktorij)

---

## FAZA 15: K8s - Produkcija

**Cilj**: Kubernetes deployment

**Metoda**: K8s manifesti

### Koraki:

**15.1 Namespace**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: nexgen-backend
```

**15.2 Deployments**
- API Deployment
- UI Deployment
- Workers Deployment

**15.3 Services**
- API Service (ClusterIP)
- UI Service (LoadBalancer)

**15.4 ConfigMaps in Secrets**
- Environment config
- Secrets (iz vault-a)

**15.5 Ingress**
- TLS terminacija
- Routing
- Rate limiting ( nginx-ingress)

**15.6 Horizontal Pod Autoscaler**
- Autoskaliranje glede na CPU/memory

### Primer: `k8s/api-deployment.yaml`
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    spec:
      containers:
      - name: api
        image: nexgen-backend-api:latest
        ports:
        - containerPort: 3000
```

**15.7 Preverjanje**
```bash
kubectl apply -f k8s/
kubectl get pods -n nexgen-backend
```

**Referenca**: k8s/ (novi direktorij)

---

## FAZA 16: Dokumentacija - Končna

**Cilj**: Popolna tehnična dokumentacija

**Metoda**: Dopolnitev obstoječe dokumentacije

### Koraki:

**16.1 README.md**
- Overview
- Quick start
- Architecture
- API reference

**16.2 API Documentation**
- OpenAPI/Swagger
- Postman collection

**16.3 Runbook**
- Operativni postopki
- Troubleshooting

**16.4 Architecture decision records**
- ADR dokumentacija
- Tehnične odločitve

**16.5 Changelog**
- Release notes
- Migration guide

**16.6 Configuration reference**
- Vse konfiguracijske možnosti
- Environment variables

**16.7 Diagrams**
- Arhitektura
- Data flow
- Deployment

**Referenca**: dokumentacija/ (obstoječe datoteke za dopolnitev)

---

## FAZA 17: Verifikacija - Končna

**Cilj**: Končna verifikacija implementacije

**Metoda**: Preverjanje vseh komponent

### Koraki:

**17.1 Build verification**
```bash
npm run build
# Uspešen build?
```

**17.2 Test verification**
```bash
npm test
# Vsi testi pass?
# Coverage > 80%?
```

**17.3 Docker verification**
```bash
docker-compose up -d
curl http://localhost:3000/health
curl http://localhost:8080
# Vse storitve delujejo?
```

**17.4 E2E verification**
```bash
npx playwright test
# Vsi scenariji pass?
```

**17.5 Security verification**
```bash
npm audit
trivy fs .
# Ni kritičnih findingov?
```

**17.6 Final report**
- Seznam izvedenih faz
- Preostale known issues
- Priporočila za nadaljnji razvoj

---

# 5. TESTING AND VALIDATION

## Uspešna implementacija pomeni:

| Faza | Merilo uspeha |
|------|---------------|
| Faza 1-2 | Dokumentiral stanje |
| Faza 3 | @mia/core se uvozi brez napak |
| Faza 4 | Ni več placeholder-jev v kodi |
| Faza 5 | API strežnik odgovarja na /health |
| Faza 6 | UI dostopen na portu 8080 |
| Faza 7 | Workers procesirajo job-e |
| Faza 8 | Docker Compose stack dela |
| Faza 9 | Unit testi >80% coverage |
| Faza 10 | E2E testi pass |
| Faza 11 | Evidence datoteke izpolnjene |
| Faza 12 | Ni kritičnih security findingov |
| Faza 13 | CI/CD pipeline deluje |
| Faza 14 | Terraform apply uspešen |
| Faza 15 | K8s deployment deluje |
| Faza 16 | Dokumentacija popolna |
| Faza 17 | Končna verifikacija USPEŠNA |

## Validation koraki:
1. `npm run typecheck` - brez napak tipov
2. `npm run lint` - brez lint napak
3. `npm test` - vsi testi pass
4. `docker-compose up -d` - vse storitve delujejo
5. `curl localhost:3000/health` - API health OK
6. `curl localhost:8080` - UI dostopna

---

**Plan pripravljen**: Za izvedbo kliknite **Build** ali ročno preklopite na code agent.
