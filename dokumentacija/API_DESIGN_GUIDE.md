<!-- @document_id DOC-APIGUIDE-DOMENA02-001 -->
<!-- @version 1.0.0 -->
<!-- @domain ZALEDNI_SISTEMI -->
<!-- @requirement ZAH-APIGUIDE-001 API design guide mora definirati standarde za nacrtovanje API-jev -->
<!-- @design DSN-APIGUIDE-001 Strukturiran pristop k nacrtovanju API-jev z domensko-specificnimi elementi -->
<!-- @test TST-APIGUIDE-001 Verifikacija implementacije vseh API standardov -->
<!-- @hazard_id HAZ-APIGUIDE-001 -->
<!-- Generated: {{DATUM_GENERACIJE}} -->
# Vodic za nacrtovanje API-jev

**Domena:** Zaledni sistemi (ZALEDNI_SISTEMI)
**Skladnost:** DO-178C, IEC-61508, ISO-26262, MIL-STD-882E

## 1. Pregled

### 1.1 Namen
Ta dokument definira standarde in smernice za nacrtovanje API-jev v sistemu NexGen.

### 1.2 Obseg
- REST API
- GraphQL API
- Verzioniranje
- Dokumentacija

## 2. REST API standardi

### 2.1 URL struktura
```
# Funkcija: FN_02_CREATE, FN_02_READ, FN_02_UPDATE, FN_02_DELETE
https://api.{{DOMENA}}/v1.0.0/{{VIRE}}

Primeri:
GET    /v1/users           # Seznam uporabnikov (FN_02_LIST)
GET    /v1/users/:id       # Posamezen uporabnik (FN_02_READ)
POST   /v1/users           # Ustvari uporabnika (FN_02_CREATE)
PUT    /v1/users/:id       # Posodobi uporabnika (FN_02_UPDATE)
PATCH  /v1/users/:id       # Delna posodobitev (FN_02_PATCH)
DELETE /v1/users/:id       # Brisi uporabnika (FN_02_DELETE)
```

### 2.2 HTTP metode
| Metoda | Namen | Idempotentna | Funkcija |
|--------|-------|--------------|----------|
| GET | Branje | Da | FN_02_READ, FN_02_LIST |
| POST | Ustvarjanje | Ne | FN_02_CREATE |
| PUT | Zamenjava | Da | FN_02_UPDATE |
| PATCH | Delna posodobitev | Ne | FN_02_PATCH |
| DELETE | Brisanje | Da | FN_02_DELETE |

### 2.3 HTTP statusne kode
| Koda | Pomen | Uporaba |
|------|-------|---------|
| 200 | OK | Uspesna zahteva |
| 201 | Created | Uspesno ustvarjeno |
| 204 | No Content | Uspesno brisanje |
| 400 | Bad Request | Napacna zahteva |
| 401 | Unauthorized | Manjkajoca avtentikacija |
| 403 | Forbidden | Manjkajoca avtorizacija |
| 404 | Not Found | Vir ne obstaja |
| 409 | Conflict | Konflikt (npr. duplikat) |
| 422 | Unprocessable | Validacijska napaka |
| 429 | Too Many Requests | Rate limit |
| 500 | Internal Error | Strezniška napaka |
| 503 | Service Unavailable | Storitev nedostopna |

### 2.4 Format odgovora
```json
// Funkcija: FN_02_SERIALIZE
{
  "data": {
    "id": "{{ID}}",
    "type": "{{TIP}}",
    "attributes": {
      "name": "{{IME}}",
      "created_at": "2024-12-24"
    },
    "relationships": {
      "owner": {
        "data": { "id": "{{OWNER_ID}}", "type": "user" }
      }
    }
  },
  "meta": {
    "request_id": "{{REQUEST_ID}}",
    "timestamp": "{{TIMESTAMP}}"
  }
}
```

### 2.5 Format napake
```json
{
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "title": "Validacijska napaka",
      "detail": "Polje 'email' ni veljavno",
      "source": {
        "pointer": "/data/attributes/email"
      },
      "meta": {
        "request_id": "{{REQUEST_ID}}"
      }
    }
  ]
}
```

### 2.6 Paginacija
```json
// Funkcija: FN_02_LIST
// Zahteva: GET /v1/users?page[number]=2&page[size]=20

{
  "data": [...],
  "meta": {
    "total_count": 150,
    "page_count": 8,
    "current_page": 2,
    "per_page": 20
  },
  "links": {
    "self": "/v1/users?page[number]=2&page[size]=20",
    "first": "/v1/users?page[number]=1&page[size]=20",
    "prev": "/v1/users?page[number]=1&page[size]=20",
    "next": "/v1/users?page[number]=3&page[size]=20",
    "last": "/v1/users?page[number]=8&page[size]=20"
  }
}
```

### 2.7 Filtriranje in iskanje
```
# Funkcija: FN_02_SEARCH
GET /v1/users?filter[status]=active&filter[role]=admin
GET /v1/users?search=john
GET /v1/users?sort=-created_at,name
GET /v1/users?include=profile,roles
GET /v1/users?fields[user]=id,name,email
```

## 3. GraphQL standardi

### 3.1 Shema
```graphql
# Funkcija: FN_02_QUERY, FN_02_MUTATION, FN_02_SUBSCRIPTION
type Query {
  user(id: ID!): User
  users(filter: UserFilter, pagination: Pagination): UserConnection!
}

type Mutation {
  createUser(input: CreateUserInput!): CreateUserPayload!
  updateUser(id: ID!, input: UpdateUserInput!): UpdateUserPayload!
  deleteUser(id: ID!): DeleteUserPayload!
}

type Subscription {
  userCreated: User!
  userUpdated(id: ID!): User!
}
```

### 3.2 Input tipi
```graphql
# Funkcija: FN_02_VALIDATE_BODY
input CreateUserInput {
  email: String! @constraint(format: "email")
  name: String! @constraint(minLength: 2, maxLength: 100)
  password: String! @constraint(minLength: 8)
}

input UserFilter {
  status: UserStatus
  role: UserRole
  createdAfter: DateTime
}

input Pagination {
  first: Int @constraint(min: 1, max: 100)
  after: String
}
```

### 3.3 Payload tipi
```graphql
type CreateUserPayload {
  user: User
  errors: [UserError!]!
}

type UserError {
  code: String!
  message: String!
  field: String
}
```

### 3.4 Direktive
```graphql
# Funkcija: FN_02_DIRECTIVE
directive @auth(requires: Role!) on FIELD_DEFINITION
directive @rateLimit(max: Int!, window: Int!) on FIELD_DEFINITION
directive @deprecated(reason: String) on FIELD_DEFINITION

type Query {
  adminUsers: [User!]! @auth(requires: ADMIN) @rateLimit(max: 10, window: 60)
}
```

## 4. Verzioniranje

### 4.1 URL verzioniranje
```
# Funkcija: FN_02_VERSION_ROUTE
/v1/users  # Verzija 1
/v2/users  # Verzija 2
```

### 4.2 Header verzioniranje
```
# Funkcija: FN_02_VERSION_NEGOTIATE
Accept: application/vnd.api+json; version=1
Accept: application/vnd.api+json; version=2
```

### 4.3 Deprecation
```yaml
# Funkcija: FN_02_VERSION_DEPRECATE
deprecation:
  sunset_header: true
  sunset_date: "{{SUNSET_DATE}}"
  deprecation_notice: true
  migration_guide_url: "{{MIGRATION_URL}}"
```

## 5. Validacija

### 5.1 Request validacija
```yaml
# Funkcija: FN_02_VALIDATE_BODY, FN_02_VALIDATE_PARAMS, FN_02_VALIDATE_QUERY
validation:
  body:
    schema: "json-schema"
    strict: true
  params:
    uuid_format: true
  query:
    max_page_size: 100
    allowed_sort_fields: ["created_at", "name"]
  headers:
    required: ["Authorization", "Content-Type"]
```

### 5.2 Response validacija
```yaml
# Funkcija: FN_02_SERIALIZE
response_validation:
  enabled: true
  schema_validation: true
  strip_unknown_fields: true
```

## 6. Dokumentacija

### 6.1 OpenAPI specifikacija
```yaml
openapi: "3.1.0"
info:
  title: "NexGen API"
  version: "1.0.0"
  description: "API za MIA BUILD project: NexGen"
servers:
  - url: "https://api.{{DOMENA}}/v1"
    description: "Produkcija"
  - url: "https://api.staging.{{DOMENA}}/v1"
    description: "Staging"
paths:
  /users:
    get:
      operationId: listUsers
      summary: Seznam uporabnikov
      tags: [Users]
      parameters:
        - $ref: '#/components/parameters/PageNumber'
        - $ref: '#/components/parameters/PageSize'
      responses:
        '200':
          description: Uspesno
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserListResponse'
```

### 6.2 Primeri
```yaml
examples:
  CreateUserRequest:
    value:
      data:
        type: user
        attributes:
          email: "user@example.com"
          name: "Jan Novak"
  CreateUserResponse:
    value:
      data:
        id: "123e4567-e89b-12d3-a456-426614174000"
        type: user
        attributes:
          email: "user@example.com"
          name: "Jan Novak"
          created_at: "2024-01-01T00:00:00Z"
```

## 7. Varnost

### 7.1 Avtentikacija
```yaml
# Funkcija: FN_02_SIGN, FN_02_VERIFY
security:
  - bearerAuth: []
  - apiKeyAuth: []

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    apiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
```

### 7.2 Rate limiting
```yaml
# Funkcija: FN_02_RATE_LIMIT
x-rate-limit:
  requests: 1000
  window: 60
  headers:
    - X-RateLimit-Limit
    - X-RateLimit-Remaining
    - X-RateLimit-Reset
```

## 8. Skladnost

| Standard | Zahteva | Implementacija |
|----------|---------|----------------|
| DO-178C | Sledljivost | Vsaka koncna tocka ima function_id |
| IEC-61508 | Validacija | Stroga validacija vnosov |
| ISO-26262 | Dokumentacija | OpenAPI specifikacija |
| MIL-STD-882E | Varnost | Avtentikacija, avtorizacija |
