# Notifications Service

An event-driven microservice that delivers multi-channel notifications (email, SMS, in-app) for the booking platform — consumes domain events from Kafka, applies per-user preferences, and fans them out via Resend, Twilio, or a real-time in-app feed.

> **Status:** Core pipeline (Kafka → outbox → channels → feed) is built and covered by unit/integration/e2e tests. Observability and CI/CD are the next milestones — see [Roadmap](#roadmap--possible-improvements).

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Architecture Decisions](#architecture-decisions)
- [Notification Lifecycle](#notification-lifecycle)
- [In-App Feed (SSE + Cursor Pagination)](#in-app-feed-sse--cursor-pagination)
- [Modules](#modules)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Running Tests](#running-tests)
- [Roadmap / Possible Improvements](#roadmap--possible-improvements)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22 + Fastify v5 |
| Language | TypeScript |
| Database | PostgreSQL + Kysely (type-safe SQL, no ORM magic) |
| Messaging | Apache Kafka (KafkaJS / confluent-kafka-javascript) |
| Cache / Pub-Sub | Redis (ioredis) |
| Realtime transport | Server-Sent Events (`@fastify/sse`) |
| Email | Resend |
| SMS | Twilio |
| Rate limiting | `rate-limiter-flexible` (HTTP + Kafka) |
| Logging | Pino (+ pino-pretty in dev) |
| Observability | OpenTelemetry SDK, prom-client |
| Containerization | Docker (multi-stage build) |

---

## Architecture

The service follows a lightweight **DDD** layering — a single bounded context (`notifications`) with a real domain aggregate, but without full CQRS, since most use cases here are "react to an event, deliver a message" rather than complex reads/writes:

```
src/modules/notifications/
├── domain/
│   ├── aggregate/       # UserNotification (aggregate root), AggregateRoot base
│   ├── VO/               # Email, UserSettings (immutable value objects)
│   ├── TypedId/          # Branded UserId
│   └── events/           # NotificationAccountCreatedEvent, PhoneNumberChangedEvent
├── application/
│   ├── useCases/         # AccountCreatedUseCase, DefaultMessageUseCase
│   ├── handlers/         # Incoming Kafka → outbox handlers (Single/Dual recipient, AccountCreated)
│   ├── services/         # UseCaseDispatcher, FanOutService
│   ├── policies/         # NotificationSend (settings-gated delivery policy)
│   └── abstractions/     # Repository + UoW interfaces
└── infrastructure/
    ├── http/              # Fastify routes, pre-handlers, SSE + feed ports
    ├── kafka/             # Consumers per topic, DLQ producer, EventDispatcher
    ├── redis/              # Pub/sub fan-out implementation
    ├── repositories/      # Kysely repos: outbox, inbox, feed, user_notifications, UoW
    ├── notification-strategies/  # Email / SMS / In-app channel strategies + templates
    └── rateLimiter/        # HTTP + Kafka rate limit configs
```

Shared, module-agnostic pieces live outside `modules/`:

```
src/
├── app/             # Fastify bootstrap, plugin registration, graceful shutdown
├── common/          # Errors (Retryable/NonRetryable), env schema, constants
└── infrastructure/  # Kafka client, Redis client, Kysely/Postgres client
```

---

## Architecture Decisions

### Why Outbox + Inbox instead of "just consume and send"

**Context:** Kafka guarantees at-least-once delivery, and an HTTP call to Resend/Twilio is a side effect that isn't transactional with anything. Naively sending inside the consumer risks either double-sending on a redelivered message, or losing the "we promised to notify this user" guarantee if the process crashes mid-send.

**Decision:** incoming domain events never trigger a send directly. A Kafka consumer's only job is to write an **outbox** row per `(eventId, channel)` — `SingleRecipientHandler` / `DualRecipientHandler` insert one row per channel (and per recipient role for booking events: host/guest), inside a Postgres transaction (`UoW`). A separate `OutboxPoller` claims `PENDING` rows (`SELECT ... FOR UPDATE SKIP LOCKED`, batches of 50, 30s lease) and runs the actual `DefaultMessageUseCase`, which first inserts into an **inbox** table keyed by `eventId` as a second idempotency guard before talking to any channel.

**Consequences:** a crashed poller or a redelivered Kafka message just re-claims/re-checks the same row — the unique constraint on `outbox.event_id` and `inbox.event_id` makes retries safe by construction, not by convention. The cost is an extra polling hop (current interval: 1s) instead of sending synchronously from the consumer.

### Why a Retryable / NonRetryable error split

**Context:** failures during delivery are not all equal — a malformed payload or a 4xx from Twilio/Resend will never succeed no matter how many times it's retried, while a 5xx or a network blip usually will. Treating them the same either retries forever on a hopeless message or gives up too early on a transient one.

**Decision:** every failure point (Kafka message validation, channel strategy `send()`, outbox processing) throws either a `RetryableException` or a `NonRetryableException` (`src/common/errors/`). The `OutboxPoller` and the Kafka consumer pipeline (`processKafkaMessage.ts`) branch on this: retryable errors get exponential backoff with jitter (50ms → 25s, max 5 attempts) and stay `PENDING`; non-retryable errors are routed straight to a **DLQ** (`notification.dlq` for outbox failures, `notification.incoming.dlq` for consumer-side validation errors) and the row is marked `DEAD`.

**Consequences:** a bad message can't jam a topic's processing or burn retry budget pointlessly, and an on-call engineer inspecting the DLQ can tell at a glance "this needed a code/data fix" vs. "this was a blip, just replay it." The cost is that every channel strategy has to correctly classify its own errors (e.g. Twilio 4xx vs 5xx) for the split to be meaningful.

### Why notification preferences live on the domain aggregate, not as flags on a DTO

**Context:** whether a given message should actually be delivered depends on several independent toggles (global on/off, per-channel, message importance) that need to be checked consistently across every channel — getting this wrong either spams a user who opted out or silently drops something they wanted.

**Decision:** `UserNotification` is a proper aggregate root owning a `UserSettings` value object (5 boolean flags, immutable, replaced rather than mutated on every `enable`/`disable` call). The decision of *whether* to send is centralized in `NotificationSend.isAbleToSend(settings, channel)`, a static policy consulted once per delivery attempt — not duplicated per channel strategy.

**Consequences:** adding a new preference or channel means touching one policy and one value object, not every place a send happens. In-app notifications deliberately bypass the channel-preference gate (always delivered to the feed) since they're the lowest-friction channel and the in-app surface itself is opt-in by virtue of the user being logged in.

---

## Notification Lifecycle

The high-level pipeline, block by block — every notification, regardless of channel, passes through the same five stages before branching by strategy:

```mermaid
%%{init: {'theme':'base', 'themeVariables': {'primaryColor':'#e3f2fd','primaryTextColor':'#102a43','primaryBorderColor':'#1565c0','lineColor':'#37474f','fontSize':'16px'}, 'flowchart': {'useMaxWidth': false}}}%%
flowchart LR
    K["Kafka<br/>(booking.* topics)"] --> C["Consumer<br/>(validate + dispatch)"]
    C --> O["Outbox<br/>(per event+channel row)"]
    O --> P["Poller<br/>(claim batch, lease)"]
    P --> D["Dispatcher<br/>(EventType → UseCase)"]
    D --> U["Use Case<br/>(settings policy + inbox guard)"]
    U --> S{"Strategy"}
    S -->|email| E["Resend"]
    S -->|sms| T["Twilio"]
    S -->|in-app| F["Feed table + Redis pub/sub → SSE"]

    classDef stage fill:#bbdefb,stroke:#0d47a1,stroke-width:2px,color:#0d2436,font-weight:bold;
    classDef branch fill:#fff9c4,stroke:#f57f17,stroke-width:1.5px,color:#3e2723;
    class K,C,O,P,D,U stage;
    class S,E,T,F branch;
```

The detailed sequence below shows the same pipeline with the retry/DLQ branching at each checkpoint:

```mermaid
%%{init: {'theme':'base', 'themeVariables': {'primaryColor':'#e3f2fd','primaryTextColor':'#102a43','primaryBorderColor':'#1565c0','lineColor':'#37474f','fontSize':'16px'}}}%%
sequenceDiagram
    autonumber
    participant Kafka as "Kafka (booking.* topics)"
    participant Consumer as "Topic consumer"
    participant Outbox as "outbox table"
    participant Poller as "OutboxPoller"
    participant Inbox as "inbox table"
    participant UseCase as "DefaultMessageUseCase"
    participant Strategy as "Channel strategy"
    participant DLQ as "DLQ topics"

    Kafka->>Consumer: booking_confirmed / account_created / ...
    Consumer->>Consumer: validate envelope + payload (Zod)

    alt invalid message
        Consumer->>DLQ: notification.incoming.dlq
    else valid
        Consumer->>Outbox: INSERT (eventId:channel), tx via UoW
        Consumer->>Kafka: commit offset
    end

    loop every 1s
        Poller->>Outbox: claim batch (FOR UPDATE SKIP LOCKED, limit 50)
        Poller->>Inbox: INSERT eventId (idempotency guard)
        Poller->>UseCase: process(payload)
        UseCase->>UseCase: NotificationSend.isAbleToSend(settings, channel)

        alt allowed
            UseCase->>Strategy: send(context)
            Strategy-->>UseCase: ok / RetryableException / NonRetryableException
        else blocked by user settings
            UseCase-->>Poller: skip, mark inbox success
        end

        alt success
            Poller->>Outbox: markSucceed
            Poller->>Inbox: markSuccess
        else non-retryable
            Poller->>DLQ: notification.dlq, markDead
        else retryable
            Poller->>Outbox: retry(nextAttemptAt = now + jitter)
        end
    end
```

### Channels

| Channel | Strategy | Provider | Notes |
|---|---|---|---|
| Email | `EmailNotificationsStrategy` | Resend | Idempotency via Resend's native `idempotencyKey` |
| SMS | `SMSNotificationsStrategy` | Twilio | Twilio `RestException` 4xx → non-retryable |
| In-app | `InAppNotificationsStrategy` | Redis pub/sub + Postgres `notifications` table | Always allowed regardless of settings; powers the SSE feed below |

Each strategy renders its own template (`infrastructure/notification-strategies/templates/{email,sms,inapp}/`) for both a generic message and the account-created welcome notification.

---

## In-App Feed (SSE + Cursor Pagination)

In-app delivery writes to a `notifications` table (the durable feed) **and** publishes to Redis pub/sub for clients currently connected via SSE — so a user gets it instantly if online, and can still page through it later if not.

| Route | Method | Description |
|---|---|---|
| `GET /notifications` | SSE | Live stream; subscribes to the user's Redis channel, dedupes by idempotency key (LRU, 500 keys) |
| `GET /notifications/feed` | GET | Paginated history — `cursor` (keyset, `created_at DESC, id DESC`) and `isRead` query params, 20 items/page |
| `PATCH /notifications/read` | PATCH | Bulk mark-as-read, max 100 ids per request → `204` |
| `GET /health/live` / `GET /health/ready` | GET | Liveness (event loop / heap via `@fastify/under-pressure`) and readiness (DB, Redis, Kafka consumer health, DLQ producer) |

**Pre-handlers** (`registerPreHandler.ts`) run on every route except health checks:
1. Read `x-user-id` / `x-user-role` headers into `request.user`, or `401` if missing.
2. Apply a per-user HTTP rate limit (100 req/60s, Redis-backed) — `429` on overflow.

Keyset pagination (rather than `OFFSET`) was chosen so the feed stays correct and fast even as new notifications keep arriving while a user scrolls — an offset-based page would shift under writes.

---

## Modules

| Module | Responsibility |
|---|---|
| `notifications` | Everything in this README — domain aggregate, Kafka consumers, outbox/inbox, channel strategies, feed/SSE |
| `healthchecks` | `/health/live` and `/health/ready` endpoints, used by the readiness/liveness probes |

Shared (non-module) infrastructure: Kafka client + consumer health tracking, Redis client, Kysely/Postgres client, error taxonomy, env schema (`src/common/`, `src/infrastructure/`).

---

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) + Docker Compose (Kafka, Postgres, Redis are typically run via the parent [`docker-compose.yml`](../docker-compose.yml))
- Node.js 22+ for local development outside Docker

### Local Development

```bash
npm install

# copy/fill env vars — see Environment Variables below
cp .env.example .env

# apply database migrations
npm run db:migrate

npm run dev
```

> Requires a running Postgres, Redis, and Kafka broker — either via the root `docker-compose.yml` or pointed at via env vars.

### Build & Run

```bash
npm run build
npm start
```

### Docker

```bash
docker build -t notifications-service .
docker run --env-file .env notifications-service
```

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Environment — controls log transport (pretty vs. JSON) | `dev` / `production` |
| `PORT` | Fastify listen port | `3000` |
| `DATABASE_URL` | Postgres connection string (Kysely) | `postgresql://user:pass@localhost:5432/notifications` |
| `DATABASE_MAX_POOLS` | Max Postgres pool connections | `10` |
| `REDIS_URL` | Redis connection string (pub/sub + rate limiting) | `redis://localhost:6379` |
| `KAFKA_BROKERS` | Comma-separated Kafka broker list | `localhost:9092` |
| `KAFKA_CLIENT_ID` | Kafka client identifier | `notification-service` |
| `RESEND_PASSWORD` | Resend API key | `re_xxxxx` |
| `RESEND_EMAIL` | Verified "from" email address | `noreply@booking.com` |
| `TWILIO_SID` | Twilio account SID | `ACxxxxx` |
| `TWILIO_TOKEN` | Twilio auth token | *(secret)* |
| `TWILIO_FROM_NUMBER` | Twilio sender phone number | `+1234567890` |

---

## Project Structure

```
notifications/
├── database/
│   └── migrations/        # Kysely migrations (outbox, inbox, feed, indexes)
├── src/
│   ├── app/                # appBuilder (Fastify + plugins), main.ts (bootstrap, shutdown)
│   ├── common/
│   │   ├── consts/         # Kafka topics, outbox/feed/pub-sub tuning constants
│   │   ├── errors/         # Retryable / NonRetryable exception taxonomy
│   │   └── secrets/        # env.ts — validated environment schema
│   ├── infrastructure/
│   │   ├── database/       # Kysely client + generated types
│   │   ├── kafka/           # Client factory, consumer health tracking
│   │   └── redis/            # Redis client factory
│   └── modules/
│       ├── healthchecks/
│       └── notifications/   # see Architecture above
└── test/
    ├── integration/         # Repositories, Kafka consumers, HTTP routes (testcontainers)
    └── e2e/                  # Full Kafka → feed pipeline, SSE behavior
```

---

## Database Schema

Four tables, each mapping to one stage of the [lifecycle](#notification-lifecycle) above.

### `user_notifications`

The notification side of a user account — contact info plus the five preference flags that back the `UserSettings` value object.

| Column | Type | Notes |
|---|---|---|
| `user_id` | UUID, PK | Same id as the user in the auth/user service |
| `email` | VARCHAR(256), UNIQUE NOT NULL | Required for account creation; email channel target |
| `phone_number` | VARCHAR(256), nullable | SMS channel target; absent until the user adds one |
| `receive_notifications` | BOOLEAN, default `true` | Global master switch |
| `receive_email_notifications` | BOOLEAN, default `true` | Per-channel toggle, checked by `NotificationSend` for email |
| `receive_phone_notifications` | BOOLEAN, default `true` | Per-channel toggle, checked by `NotificationSend` for SMS |
| `receive_important_messages` | BOOLEAN, default `true` | Message-importance filter |
| `receive_not_important_messages` | BOOLEAN, default `true` | Message-importance filter |
| `updated_at` | TIMESTAMPTZ | Auto-set by `trg_user_notifications_updated_at` on every `UPDATE` |

### `outbox`

One row per `(event, channel)` to deliver — written by the Kafka consumer inside the same transaction as nothing else (it's the transactional boundary itself), claimed and processed by the `OutboxPoller`.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID, PK, default `gen_random_uuid()` | Internal row id (originally the column the events lived under — see evolution below) |
| `event_id` | VARCHAR(255), UNIQUE NOT NULL | Composite key written by the handler — `${kafkaEventId}:${channel}` for single-recipient events, `${kafkaEventId}:${role}:${channel}` (`host`/`guest`) for dual-recipient booking events; the same Kafka event fans out into one outbox row per channel (and per recipient for dual events), each with its own `userId` in `payload` — the uniqueness constraint is what makes a Kafka redelivery a no-op instead of a duplicate row |
| `payload` | JSONB, NOT NULL | Everything the use case needs to act — `userId`, `channel`, `message`, `type` |
| `status` | ENUM `PENDING \| SUCCESS \| DEAD`, default `PENDING` | `PENDING` → claimable; `SUCCESS` → delivered; `DEAD` → exhausted retries / non-retryable, routed to `notification.dlq` |
| `retries` | SMALLINT, default `0` | Incremented on every retryable failure; poller gives up at 5 |
| `next_attempt_at` | TIMESTAMPTZ, nullable | Backoff target (jittered exponential); also the poller's claim lease — partial index `idx_outbox_unprocessed` on this column `WHERE status = 'PENDING'` keeps claiming cheap as the table grows |
| `created_at` | TIMESTAMPTZ, default `now()` | |

### `inbox`

The second idempotency checkpoint — guarantees `DefaultMessageUseCase` (and thus the channel call) runs at most once per outbox row, independent of how many times the poller might re-claim it.

| Column | Type | Notes |
|---|---|---|
| `event_id` | UUID, PK | FK → `outbox.id`, `ON DELETE CASCADE` |
| `success` | BOOLEAN, default `false` | Set once the use case completes (including "skipped — blocked by user settings") |
| `stage` | VARCHAR(256), nullable | Debug breadcrumb — which step of the use case last ran, useful when triaging a stuck row |
| `processed_at` | TIMESTAMPTZ, nullable | Set on completion |
| `created_at` | TIMESTAMPTZ, default `now()` | |

### `notifications`

The durable in-app feed — the source of truth for `GET /notifications/feed`, written in parallel with the Redis pub/sub publish for live SSE delivery.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID, PK, default `gen_random_uuid()` | Feed item id, also what's returned to SSE clients to dedupe |
| `idempotency_key` | VARCHAR(255), UNIQUE | Same composite key family as `outbox.event_id`; prevents a redelivered/retried in-app send from duplicating a feed entry |
| `user_id` | UUID, FK → `user_notifications.user_id`, `ON DELETE CASCADE` | |
| `payload` | JSONB, nullable | Rendered notification content shown in the feed |
| `is_read` | BOOLEAN, default `false` | Flipped by `PATCH /notifications/read` |
| `created_at` | TIMESTAMPTZ, default `now()` | Indexed (`idx_notifications_created_at`) — paired with `id` for the feed's keyset pagination (`created_at DESC, id DESC`) |

**Schema evolution worth knowing about:** the column now called `outbox.id` was originally `event_id` (the Kafka event's own id) until the "one row per channel" requirement showed up — at that point a single Kafka event needed *multiple* outbox rows (one per channel, sometimes per recipient role), so the Kafka event id was demoted to a non-unique `payload` reference and a fresh UUID `id` took over as the primary key, with a new `event_id` column holding the `${eventId}:${channel}` composite string under its own unique constraint. The same rename happened on `notifications.event_id` → `idempotency_key` for the same reason.

---

## Running Tests

```bash
npm test               # all tests
npm run test:unit       # unit tests (src/**/*.spec.ts)
npm run test:integration # Postgres + Kafka testcontainers
npm run test:e2e        # full pipeline, including SSE
```

Integration and e2e tests spin up real Postgres, Kafka, and Redis via `@testcontainers/*` rather than mocking the infra — the outbox/inbox idempotency guarantees and Kafka consumer error routing are exactly the kind of logic that's easy to get wrong against a mock and only surfaces against the real thing.

---

## Roadmap / Possible Improvements

### Observability

The pipeline has several asynchronous hops (`Kafka consumer → outbox → poller → channel strategy`), and right now there's no way to trace one event end-to-end once it leaves the HTTP/Kafka boundary.

- Correlation IDs propagated from the originating domain event through outbox/inbox rows to the final channel call.
- OpenTelemetry traces (the SDK dependency is already present) wired through the consumer → outbox → poller chain.
- Metrics: outbox queue depth, DLQ rate per topic, poller claim/retry latency — the numbers worth alerting on.

### Deployment & delivery

- CI pipeline: lint → unit → integration (testcontainers) → build, as a required check before merge.
- Secrets management beyond `.env` for production (Resend/Twilio keys, DB credentials).

### Messaging contracts

- **Schema registry** (`@kafkajs/confluent-schema-registry` is already a dependency but not yet wired in) — Kafka messages are currently validated ad hoc with Zod inside each consumer after `JSON.parse`. Registering Avro/JSON schemas per topic would catch a malformed/incompatible payload at the broker boundary instead of inside a consumer, and give producers (other services emitting `booking.*` events) a compile-time-checkable contract instead of an implicit one.

### Other

- DLQ replay tooling — a way to inspect `DEAD` outbox rows / DLQ topic messages and manually re-drive them after a fix, instead of only observing them.
- Push notifications as a fourth channel, following the same `IChannelStrategy` contract as email/SMS/in-app.

---

## License

UNLICENSED — private project.
