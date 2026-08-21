# Minimal Booking Service

Minimal NestJS bookings microservice built as a reviewer-friendly project. It demonstrates PostgreSQL persistence, JWT authorization, Redis-backed realtime events, reminder jobs, basic metrics, and an internal gRPC booking creation endpoint without introducing unnecessary architecture.

## Architecture

The service is a single NestJS application with clear module boundaries:

- `AuthModule` validates JWTs and applies provider/admin role rules for REST APIs.
- `BookingsModule` owns booking validation, overlap prevention, persistence, event publishing, and reminder scheduling.
- `DatabaseModule` exposes Prisma and PostgreSQL access.
- `RedisModule` wraps Redis pub/sub.
- `JobsModule` schedules and processes BullMQ reminder jobs.
- `WebsocketModule` authenticates Socket.IO handshakes and broadcasts `booking.created` events.
- `MetricsModule` exposes basic JSON metrics.
- `GrpcModule` exposes internal gRPC `CreateBooking` while reusing the same booking service logic.

Request flow:

```txt
REST/gRPC request
-> BookingsService
-> PostgreSQL write
-> Redis publish booking.created
-> BullMQ reminder job scheduled 10 minutes before start
-> WebSocket gateway broadcasts booking.created to authorized provider/admin rooms
```

PostgreSQL is the source of truth. Redis is used for pub/sub and jobs, not durable booking state.

## Tech Stack

- Node.js 22 LTS
- pnpm 11
- NestJS and TypeScript
- Prisma and PostgreSQL
- Redis, BullMQ, and Socket.IO
- JWT with Passport
- gRPC through `@nestjs/microservices`
- Jest and Supertest
- Docker and Docker Compose
- Bruno for local REST API requests

## Requirements

- Node.js 22 LTS
- pnpm 11+
- Docker, for PostgreSQL and Redis

Install dependencies:

```sh
pnpm install
pnpm prisma:generate
```

## Environment

Copy `.env.example` to `.env` for local development:

```sh
cp .env.example .env
```

Example values:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/bookings
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/bookings_test
GRPC_URL=0.0.0.0:50051
JWT_SECRET=dev-secret
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
```

Environment variables:

- `PORT`: HTTP server port. Defaults to `3000`.
- `DATABASE_URL`: Prisma connection string for the local app database.
- `TEST_DATABASE_URL`: Prisma connection string for e2e tests.
- `GRPC_URL`: gRPC bind address. Defaults to `0.0.0.0:50051`.
- `JWT_SECRET`: secret used to validate local sample JWTs.
- `REDIS_ENABLED`: set to `false` to disable Redis-backed events and jobs in local/test runs.
- `REDIS_HOST`: Redis hostname.
- `REDIS_PORT`: Redis port.

Do not commit real secrets.

## Local Setup

Start PostgreSQL and Redis:

```sh
docker compose up -d postgres redis
```

Run migrations:

```sh
pnpm prisma:migrate
```

Start the app:

```sh
pnpm start:dev
```

Local URLs:

- HTTP API: `http://localhost:3000`
- Swagger: `http://localhost:3000/docs`
- gRPC: `localhost:50051`

Useful local commands:

```sh
pnpm lint
pnpm format:check
pnpm test
pnpm build
pnpm prisma:studio
```

## Docker Compose

Start the app, PostgreSQL, and Redis through Docker Compose:

```sh
JWT_SECRET=dev-secret docker compose up --build
```

Compose services:

- `app`: NestJS HTTP, WebSocket, and gRPC application.
- `postgres`: local development PostgreSQL, exposed on host port `5434`.
- `postgres_test`: e2e PostgreSQL, exposed on host port `5433`.
- `redis`: Redis for pub/sub and BullMQ jobs, exposed on host port `6379`.

The app exposes HTTP on `3000`. gRPC is bound to `127.0.0.1:50051` on the host for local testing only.

## Authentication

REST booking endpoints require JWT bearer auth. This service does not implement login or registration; JWTs are assumed to come from an identity provider or dedicated auth service.

Generate local sample tokens:

```sh
pnpm auth:token provider
pnpm auth:token other-provider
pnpm auth:token admin
```

Use the token as a bearer token:

```txt
Authorization: Bearer <token>
```

Local demo identities:

```txt
provider:
  sub: 499c1465-884f-4438-ab54-11e565a90c48
  role: provider

other-provider:
  sub: e1cf3eb2-3702-4296-9436-aea369a1feca
  role: provider

admin:
  sub: 9cddf29f-9b5e-47ed-9bd6-8c334075067f
  role: admin
```

Authorization rules:

- `provider` users can create, list, and get only bookings where `providerId` equals their JWT `sub`.
- `admin` users can create, list, and get bookings for any provider.

## REST API

Swagger docs are available at `GET /docs`. Use the Swagger `Authorize` button with a bearer token before calling protected booking endpoints.

### Health

```txt
GET /health
```

Response:

```json
{
  "status": "ok"
}
```

### Metrics

```txt
GET /metrics
```

Response:

```json
{
  "bookingsCreated": 0,
  "uptimeSeconds": 120
}
```

`bookingsCreated` is read from PostgreSQL and reflects persisted bookings. Failed validation, authorization, and overlap attempts do not create rows and are not counted. Redis publish or reminder scheduling failures can still occur after the booking row is committed, so those persisted bookings remain counted.

### Create Booking

```txt
POST /bookings
```

Requires bearer auth with `provider` or `admin` role.

Request:

```json
{
  "providerId": "499c1465-884f-4438-ab54-11e565a90c48",
  "customerName": "Jane Doe",
  "customerEmail": "jane@example.com",
  "startTime": "2027-06-22T10:00:00.000Z",
  "endTime": "2027-06-22T10:30:00.000Z"
}
```

Rules:

- Times must be UTC ISO 8601 strings ending in `Z`.
- `startTime` must be in the future.
- `endTime` must be after `startTime`.
- Confirmed bookings cannot overlap for the same provider.
- Providers can only create bookings for their own provider ID.
- Admins can create bookings for any provider.

Successful creation also publishes `booking.created` to Redis and schedules a reminder job.

### Get Booking

```txt
GET /bookings/:id
```

Requires bearer auth with `provider` or `admin` role.

Provider users receive `404 Not Found` when requesting another provider's booking.

### List Bookings

```txt
GET /bookings?type=upcoming&page=1&limit=10
GET /bookings?type=past&page=1&limit=10
```

Pagination response shape:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPages": 0,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

Pagination rules:

- `page` defaults to `1`.
- `limit` defaults to `10`.
- Maximum `limit` is `100`.
- Invalid pagination values return `400 Bad Request`.

Expected error responses use NestJS standard HTTP exception shapes for `400`, `401`, `403`, and `404` errors.

## Bruno API Client

This repo includes a Bruno collection under `bruno/` for lightweight REST API testing.

Open the `bruno/` folder in Bruno and select the `Local` environment.

Local variables:

- `baseUrl`: defaults to `http://localhost:3000`.
- `providerId`: should match the provider token `sub`.
- `bookingId`: set this to a created booking ID before running get-by-id requests.
- `providerToken`: paste output from `pnpm auth:token provider`.
- `adminToken`: paste output from `pnpm auth:token admin`.

Included requests:

- `GET /health`
- `POST /bookings`
- `GET /bookings/:id`
- `GET /bookings?type=upcoming&page=1&limit=10`
- `GET /bookings?type=past&page=1&limit=10`

After creating a booking, copy the response `id` into the `bookingId` environment variable.

## WebSockets

Authenticated Socket.IO clients receive `booking.created` events.

```ts
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: '<jwt>',
  },
});

socket.on('booking.created', (booking) => {
  console.log(booking);
});
```

Broadcast rules:

- Provider sockets join `provider:{sub}` and receive only their own provider's bookings.
- Admin sockets join `admins` and receive all booking-created events.
- Unauthenticated sockets are disconnected.
- Clients cannot request arbitrary provider rooms.

Run the local interactive WebSocket smoke test after PostgreSQL, Redis, and the app are running:

```sh
docker compose up -d postgres redis
pnpm prisma:migrate
pnpm start:dev
pnpm websocket:smoke
```

The smoke test creates provider, other-provider, and admin Socket.IO clients and listens for live `booking.created` events while you create bookings through Bruno or Swagger.

## Background Jobs

Creating a booking enqueues a BullMQ reminder job after the database write succeeds.

Reminder rules:

- Reminder jobs are scheduled for 10 minutes before `startTime`.
- Bookings starting in less than 10 minutes get a zero-delay reminder job.
- The worker logs a structured reminder payload instead of sending email, SMS, or push notifications.
- Redis-backed events and jobs can be disabled locally with `REDIS_ENABLED=false`.

## gRPC

The app exposes an internal unauthenticated gRPC `CreateBooking` method on `GRPC_URL`, defaulting to `0.0.0.0:50051`. Docker Compose binds the gRPC port to `127.0.0.1:50051` for local testing only; non-local deployments should keep gRPC on private networking or add authenticated TLS protection.

The gRPC method calls the same booking creation service used by REST, so persisted gRPC bookings use the same time validation, overlap prevention, Redis event publishing, reminder scheduling, and metrics behavior.

Install `grpcurl` if needed:

```sh
brew install grpcurl
```

Test `CreateBooking` after PostgreSQL, Redis, and the app are running:

```sh
grpcurl -plaintext \
  -import-path proto \
  -proto bookings.proto \
  -d '{
    "providerId": "499c1465-884f-4438-ab54-11e565a90c48",
    "customerName": "Jane Doe",
    "customerEmail": "jane@example.com",
    "startTime": "2027-06-22T10:00:00.000Z",
    "endTime": "2027-06-22T10:30:00.000Z"
  }' \
  localhost:50051 bookings.BookingsService/CreateBooking
```

If you repeat the same provider/time request, the shared overlap rule returns a gRPC validation error.

## Tests

Unit tests run without external services:

```sh
pnpm test
```

E2E tests use the dedicated PostgreSQL test database and disable Redis-backed events/jobs through test setup:

```sh
docker compose up -d postgres_test
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/bookings_test pnpm prisma:deploy
pnpm test:e2e
```

Full verification set:

```sh
pnpm lint
pnpm format:check
pnpm test
docker compose up -d postgres_test
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/bookings_test pnpm prisma:deploy
pnpm test:e2e
pnpm build
```

## Database

Prisma schema and migrations live under `prisma/`.

Common commands:

```sh
pnpm prisma:migrate
pnpm prisma:deploy
pnpm prisma:generate
pnpm prisma:studio
pnpm prisma:studio:test
```

Booking fields:

- `id`
- `providerId`
- `customerName`
- `customerEmail`
- `startTime`
- `endTime`
- `status`
- `createdAt`
- `updatedAt`

The booking table is indexed for provider/time queries and rejects overlapping confirmed bookings for the same provider.

## Rate Limiting

Rate limiting is intentionally not implemented for this.

Recommended production approach:

- Apply rate limiting at the API gateway or edge layer.
- Use Redis for distributed counters.
- Rate-limit by user ID, role, and IP address.
- Return `429 Too Many Requests` when exceeded.

## Known Tradeoffs

- No login/register flow because JWTs are assumed to be issued by an identity provider.
- No rate limiting because it belongs at the gateway or edge layer and was not required for this take-home.
- Reminder jobs log notification payloads instead of sending real email, SMS, or push notifications.
- gRPC is internal and unauthenticated for this.
- Redis is not a source of truth; PostgreSQL remains authoritative.
- Metrics are basic JSON, not Prometheus format.
- Redis publish and reminder scheduling happen after the booking transaction, so those side effects are best-effort and logged if they fail.
