# ═══════════════════════════════════════════════════════════════════════════════
# ZALEDNI_SISTEMI - Backend Systems Dockerfile
# ═══════════════════════════════════════════════════════════════════════════════
# Projekt: NexGen
# Verzija: 1.0.0
# Avtor: MIA BUILD
# Datum: 2024-12-24
# Domena: Zaledni sistemi
#
# Domensko-specifična konfiguracija za zaledne sisteme:
# - REST API strežniki
# - GraphQL strežniki
# - gRPC storitve
# - Message Queue porabniki (Kafka, RabbitMQ, Redis)
# - WebSocket strežniki
# - Microservices arhitektura
# - Event-driven sistemi
# - CQRS/Event Sourcing
#
# Skladnost: DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
# ═══════════════════════════════════════════════════════════════════════════════

# Build arguments
ARG NODE_VERSION=20.10.0
ARG ALPINE_VERSION=3.19
ARG BUILD_DATE=2024-12-24
ARG VERSION=1.0.0
ARG VCS_REF=HEAD

# ═══════════════════════════════════════════════════════════════════════════════
# FAZA 1: Bazna slika
# ═══════════════════════════════════════════════════════════════════════════════
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS base

# Varnostni popravki
RUN apk update && \
    apk upgrade --no-cache && \
    apk add --no-cache \
        dumb-init \
        ca-certificates \
        curl \
        tzdata \
        openssl && \
    rm -rf /var/cache/apk/*

# Nastavi časovni pas
ENV TZ=UTC

# Ustvari ne-root uporabnika
RUN addgroup -g 1001 -S backend && \
    adduser -u 1001 -S backend -G backend

WORKDIR /app

# ═══════════════════════════════════════════════════════════════════════════════
# FAZA 2: Namestitev odvisnosti
# ═══════════════════════════════════════════════════════════════════════════════
FROM base AS dependencies

# Namesti build odvisnosti
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Kopiraj package datoteke
COPY package.json package-lock.json* ./

# Namesti vse odvisnosti (vključno z dev za gradnjo)
RUN npm ci --ignore-scripts && \
    npm cache clean --force

# ═══════════════════════════════════════════════════════════════════════════════
# FAZA 3: Gradnja aplikacije
# ═══════════════════════════════════════════════════════════════════════════════
FROM dependencies AS builder

# Kopiraj izvorno kodo
COPY tsconfig.json ./
COPY src/ ./src/

# Kopiraj Prisma shemo če obstaja
COPY prisma/ ./prisma/

# Generiraj Prisma client če obstaja
RUN if [ -f prisma/schema.prisma ]; then \
        npx prisma generate; \
    fi

# Zgradi TypeScript
RUN npm run build

# Odstrani razvojne odvisnosti
RUN npm prune --production

# Preveri gradnjo
RUN test -d dist && \
    test -f dist/index.js && \
    echo "Gradnja uspešna"

# ═══════════════════════════════════════════════════════════════════════════════
# FAZA 4: Produkcijska slika - API Server
# ═══════════════════════════════════════════════════════════════════════════════
FROM base AS production

# Oznake slike
LABEL org.opencontainers.image.title="NexGen"
LABEL org.opencontainers.image.description="Zaledni sistem - Backend API"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.vendor="MiaBuild"
LABEL org.opencontainers.image.source="https://github.com/DanijelTech/Backend---developed-with-MiaBuild"
LABEL org.opencontainers.image.documentation="/docs"
LABEL org.opencontainers.image.licenses="MIT"
LABEL backend.type="api-server"
LABEL backend.framework="express"
LABEL backend.compliance="DO-178C,IEC-61508,ISO-26262,MIL-STD-882E"

# Kopiraj produkcijske odvisnosti
COPY --from=builder /app/node_modules ./node_modules

# Kopiraj zgrajeno aplikacijo
COPY --from=builder --chown=backend:backend /app/dist ./dist
COPY --from=builder --chown=backend:backend /app/package.json ./

# Kopiraj Prisma artefakte če obstajajo
COPY --from=builder /app/prisma ./prisma

# Ustvari direktorije za podatke
RUN mkdir -p /app/logs /app/tmp /app/data /app/uploads && \
    chown -R backend:backend /app

# Nastavi okoljske spremenljivke
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV LOG_LEVEL=info
ENV LOG_FORMAT=json

# API specifične spremenljivke
ENV API_PREFIX=/api
ENV API_VERSION=v1
ENV CORS_ENABLED=true
ENV CORS_ORIGINS=*
ENV RATE_LIMIT_ENABLED=true
ENV RATE_LIMIT_MAX=1000
ENV RATE_LIMIT_WINDOW=60000

# Varnostne spremenljivke
ENV HELMET_ENABLED=true
ENV COMPRESSION_ENABLED=true
ENV REQUEST_TIMEOUT=30000
ENV BODY_LIMIT=10mb

# Metrike in sledenje
ENV METRICS_ENABLED=true
ENV METRICS_PORT=9090
ENV TRACING_ENABLED=true
ENV TRACING_ENDPOINT=http://localhost:9411

# Health check konfiguracija
ENV HEALTH_CHECK_INTERVAL=30000
ENV GRACEFUL_SHUTDOWN_TIMEOUT=30000

# Preklopi na ne-root uporabnika
USER backend

# Izpostavi porte
EXPOSE 3000
EXPOSE 9090

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Uporabi dumb-init za pravilno upravljanje signalov
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Zaženi aplikacijo
CMD ["node", "dist/index.js"]

# ═══════════════════════════════════════════════════════════════════════════════
# FAZA 5: GraphQL Server slika
# ═══════════════════════════════════════════════════════════════════════════════
FROM production AS graphql-server

# Oznake
LABEL backend.type="graphql-server"

# GraphQL specifične spremenljivke
ENV GRAPHQL_PATH=/graphql
ENV GRAPHQL_PLAYGROUND_ENABLED=false
ENV GRAPHQL_INTROSPECTION_ENABLED=false
ENV GRAPHQL_DEPTH_LIMIT=10
ENV GRAPHQL_COMPLEXITY_LIMIT=1000

# Zaženi GraphQL server
CMD ["node", "dist/graphql-server.js"]

# ═══════════════════════════════════════════════════════════════════════════════
# FAZA 6: gRPC Server slika
# ═══════════════════════════════════════════════════════════════════════════════
FROM production AS grpc-server

# Oznake
LABEL backend.type="grpc-server"

# gRPC specifične spremenljivke
ENV GRPC_PORT=50051
ENV GRPC_REFLECTION_ENABLED=false
ENV GRPC_MAX_MESSAGE_SIZE=4194304
ENV GRPC_KEEPALIVE_TIME=7200000
ENV GRPC_KEEPALIVE_TIMEOUT=20000

# Izpostavi gRPC port
EXPOSE 50051

# Health check za gRPC
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD grpc_health_probe -addr=:50051 || exit 1

# Zaženi gRPC server
CMD ["node", "dist/grpc-server.js"]

# ═══════════════════════════════════════════════════════════════════════════════
# FAZA 7: WebSocket Server slika
# ═══════════════════════════════════════════════════════════════════════════════
FROM production AS websocket-server

# Oznake
LABEL backend.type="websocket-server"

# WebSocket specifične spremenljivke
ENV WS_PORT=3001
ENV WS_PATH=/ws
ENV WS_HEARTBEAT_INTERVAL=30000
ENV WS_MAX_CONNECTIONS=10000
ENV WS_MAX_MESSAGE_SIZE=1048576

# Izpostavi WebSocket port
EXPOSE 3001

# Zaženi WebSocket server
CMD ["node", "dist/websocket-server.js"]

# ═══════════════════════════════════════════════════════════════════════════════
# FAZA 8: Kafka Consumer slika
# ═══════════════════════════════════════════════════════════════════════════════
FROM production AS kafka-consumer

# Oznake
LABEL backend.type="kafka-consumer"

# Kafka specifične spremenljivke
ENV KAFKA_BROKERS=localhost:9092
ENV KAFKA_CLIENT_ID=NexGen-consumer
ENV KAFKA_GROUP_ID=NexGen-group
ENV KAFKA_TOPICS=nexgen-topic
ENV KAFKA_AUTO_COMMIT=false
ENV KAFKA_SESSION_TIMEOUT=30000
ENV KAFKA_HEARTBEAT_INTERVAL=3000
ENV KAFKA_MAX_BYTES_PER_PARTITION=1048576
ENV KAFKA_RETRY_INITIAL_DELAY=100
ENV KAFKA_RETRY_MAX_DELAY=30000
ENV KAFKA_RETRY_FACTOR=2

# Health check za Kafka consumer
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health/kafka || exit 1

# Zaženi Kafka consumer
CMD ["node", "dist/kafka-consumer.js"]

# ═══════════════════════════════════════════════════════════════════════════════
# FAZA 9: RabbitMQ Consumer slika
# ═══════════════════════════════════════════════════════════════════════════════
FROM production AS rabbitmq-consumer

# Oznake
LABEL backend.type="rabbitmq-consumer"

# RabbitMQ specifične spremenljivke
ENV RABBITMQ_URL=amqp://localhost
ENV RABBITMQ_QUEUE=nexgen-queue
ENV RABBITMQ_EXCHANGE=nexgen-exchange
ENV RABBITMQ_ROUTING_KEY=nexgen-key
ENV RABBITMQ_PREFETCH_COUNT=10
ENV RABBITMQ_HEARTBEAT=60
ENV RABBITMQ_CONNECTION_TIMEOUT=30000

# Health check za RabbitMQ consumer
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health/rabbitmq || exit 1

# Zaženi RabbitMQ consumer
CMD ["node", "dist/rabbitmq-consumer.js"]

# ═══════════════════════════════════════════════════════════════════════════════
# FAZA 10: Redis Worker slika
# ═══════════════════════════════════════════════════════════════════════════════
FROM production AS redis-worker

# Oznake
LABEL backend.type="redis-worker"

# Redis/BullMQ specifične spremenljivke
ENV REDIS_URL=redis://localhost
ENV REDIS_QUEUE=nexgen-jobs
ENV REDIS_CONCURRENCY=5
ENV REDIS_LIMITER_MAX=100
ENV REDIS_LIMITER_DURATION=1000
ENV REDIS_REMOVE_ON_COMPLETE=1000
ENV REDIS_REMOVE_ON_FAIL=5000

# Health check za Redis worker
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/health/redis || exit 1

# Zaženi Redis worker
CMD ["node", "dist/redis-worker.js"]

# ═══════════════════════════════════════════════════════════════════════════════
# FAZA 11: Scheduler/Cron slika
# ═══════════════════════════════════════════════════════════════════════════════
FROM production AS scheduler

# Oznake
LABEL backend.type="scheduler"

# Scheduler specifične spremenljivke
ENV SCHEDULER_ENABLED=true
ENV SCHEDULER_TIMEZONE=UTC
ENV SCHEDULER_LOCK_DURATION=30000

# Zaženi scheduler
CMD ["node", "dist/scheduler.js"]

# ═══════════════════════════════════════════════════════════════════════════════
# FAZA 12: Migration Runner slika
# ═══════════════════════════════════════════════════════════════════════════════
FROM production AS migration-runner

# Oznake
LABEL backend.type="migration-runner"

# Migration specifične spremenljivke
ENV DATABASE_URL=postgresql://localhost/nexgen

# Zaženi migracije
CMD ["npm", "run", "migrate:deploy"]

# ═══════════════════════════════════════════════════════════════════════════════
# FAZA 13: Seed Runner slika
# ═══════════════════════════════════════════════════════════════════════════════
FROM production AS seed-runner

# Oznake
LABEL backend.type="seed-runner"

# Zaženi seed
CMD ["npm", "run", "seed"]

# ═══════════════════════════════════════════════════════════════════════════════
# FAZA 14: Razvojna slika
# ═══════════════════════════════════════════════════════════════════════════════
FROM dependencies AS development

# Oznake
LABEL stage="development"

# Namesti razvojna orodja
RUN apk add --no-cache \
    git \
    vim \
    curl \
    jq \
    bash \
    postgresql-client \
    redis

# Kopiraj izvorno kodo
COPY . .

# Nastavi okoljske spremenljivke
ENV NODE_ENV=development
ENV PORT=3000
ENV LOG_LEVEL=debug
ENV LOG_FORMAT=pretty

# Izpostavi porte
EXPOSE 3000
EXPOSE 9090
EXPOSE 9229

# Zaženi v razvojnem načinu z debuggerjem
CMD ["npm", "run", "dev"]

# ═══════════════════════════════════════════════════════════════════════════════
# FAZA 15: Testna slika
# ═══════════════════════════════════════════════════════════════════════════════
FROM dependencies AS test

# Oznake
LABEL stage="test"

# Kopiraj izvorno kodo
COPY . .

# Nastavi okoljske spremenljivke
ENV NODE_ENV=test
ENV CI=true

# Zaženi teste
CMD ["npm", "run", "test"]

# ═══════════════════════════════════════════════════════════════════════════════
# FAZA 16: Integration Test slika
# ═══════════════════════════════════════════════════════════════════════════════
FROM dependencies AS integration-test

# Oznake
LABEL stage="integration-test"

# Namesti dodatna orodja za integracijske teste
RUN apk add --no-cache \
    postgresql-client \
    redis

# Kopiraj izvorno kodo
COPY . .

# Nastavi okoljske spremenljivke
ENV NODE_ENV=test
ENV CI=true

# Zaženi integracijske teste
CMD ["npm", "run", "test:integration"]

# ═══════════════════════════════════════════════════════════════════════════════
# FAZA 17: Load Test slika
# ═══════════════════════════════════════════════════════════════════════════════
FROM grafana/k6:latest AS load-test

# Oznake
LABEL stage="load-test"

WORKDIR /app

# Kopiraj k6 skripte
COPY testi/load/ ./

# Zaženi load teste
CMD ["run", "load-test.js"]

# ═══════════════════════════════════════════════════════════════════════════════
# Build navodila
# ═══════════════════════════════════════════════════════════════════════════════
# API Server:
#   docker build --target production -t NexGen:api .
#
# GraphQL Server:
#   docker build --target graphql-server -t NexGen:graphql .
#
# gRPC Server:
#   docker build --target grpc-server -t NexGen:grpc .
#
# WebSocket Server:
#   docker build --target websocket-server -t NexGen:ws .
#
# Kafka Consumer:
#   docker build --target kafka-consumer -t NexGen:kafka .
#
# RabbitMQ Consumer:
#   docker build --target rabbitmq-consumer -t NexGen:rabbitmq .
#
# Redis Worker:
#   docker build --target redis-worker -t NexGen:redis .
#
# Scheduler:
#   docker build --target scheduler -t NexGen:scheduler .
#
# Migration:
#   docker build --target migration-runner -t NexGen:migrate .
#
# Development:
#   docker build --target development -t NexGen:dev .
# ═══════════════════════════════════════════════════════════════════════════════
