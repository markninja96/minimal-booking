# Minimal Booking Service

NestJS booking microservice built incrementally through focused milestones.

## Requirements

- Node.js 22 LTS
- pnpm 11+

## Local Commands

```sh
pnpm install
pnpm prisma:generate
pnpm lint
pnpm format:check
pnpm test
pnpm build
pnpm start:dev
```

## Environment

Copy `.env.example` to `.env` for local development and adjust values if needed.

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

## Authentication

This service does not implement login or registration. JWTs are assumed to be issued by an identity provider or dedicated auth service.

For local testing, generate sample JWTs:

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

- provider users can create, list, and get only bookings where `providerId` equals their JWT `sub`
- admin users can create, list, and get bookings for any provider

## API Docs

Swagger docs are available at:

```txt
GET /docs
```

Use the Swagger `Authorize` button to provide a bearer token.

## Database

Start PostgreSQL and Redis:

```sh
docker compose up -d postgres postgres_test redis
```

Run migrations:

```sh
pnpm prisma:migrate
```

Generate Prisma Client:

```sh
pnpm prisma:generate
```

Open the local development database in Prisma Studio:

```sh
pnpm prisma:studio
```

Open the test database in Prisma Studio:

```sh
pnpm prisma:studio:test
```

## Health Check

```txt
GET /health
```

Response:

```json
{
  "status": "ok"
}
```

## Metrics

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

## Booking API

Create a booking:

```txt
POST /bookings
```

```json
{
  "providerId": "11111111-1111-1111-1111-111111111111",
  "customerName": "Jane Doe",
  "customerEmail": "jane@example.com",
  "startTime": "2027-06-22T10:00:00.000Z",
  "endTime": "2027-06-22T10:30:00.000Z"
}
```

Get a booking:

```txt
GET /bookings/:id
```

List bookings:

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

Rules:

- all times must be UTC ISO 8601 strings
- `startTime` must be in the future
- `endTime` must be after `startTime`
- overlapping confirmed bookings for the same provider are rejected
- provider users can only create bookings for their own provider ID
- admin users can create bookings for any provider

Creating a booking publishes a `booking.created` event to Redis after the database write succeeds.

## gRPC

The app also exposes an internal unauthenticated gRPC `CreateBooking` method on `GRPC_URL`, defaulting to `0.0.0.0:50051`. Docker Compose binds the gRPC port to `127.0.0.1:50051` for local testing only; non-local deployments should keep gRPC on private networking or add authenticated TLS protection.

The gRPC method calls the same booking creation service used by REST, so persisted gRPC bookings use the same time validation, overlap prevention, Redis event publishing, reminder scheduling, and metrics behavior.

Test it locally with `grpcurl` after PostgreSQL, Redis, and the app are running:

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

## Background Jobs

Creating a booking also enqueues a BullMQ reminder job after the database write succeeds.

Reminder rules:

- reminder jobs are scheduled for 10 minutes before `startTime`
- bookings starting in less than 10 minutes get a zero-delay reminder job
- the worker logs a structured reminder payload instead of sending email, SMS, or push notifications
- Redis-backed events and jobs can be disabled locally with `REDIS_ENABLED=false`

## WebSockets

Authenticated Socket.IO clients can receive `booking.created` events.

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

- provider sockets join `provider:{sub}` and receive only their own provider's bookings
- admin sockets join `admins` and receive all booking-created events
- unauthenticated sockets are disconnected

Run the local interactive WebSocket smoke test after PostgreSQL, Redis, and the app are running:

```sh
docker compose up -d postgres redis
pnpm prisma:migrate
pnpm start:dev
pnpm websocket:smoke
```

The smoke test creates real Socket.IO clients for a provider, another provider, and an admin. It prints the expected server rooms and provider IDs to use in Bruno or Swagger, and keeps listening for live `booking.created` events until you stop it with `Ctrl+C`.

While the script is running, create bookings through Bruno or Swagger to confirm:

- provider sockets receive only their own provider's bookings
- admin sockets receive all booking-created events
- the unrelated provider socket does not receive events for the primary provider

If a REST request fails in Bruno or Swagger, for example because the bearer token is mistyped, the smoke script will not log anything for that request. Failed booking requests do not publish `booking.created`, so there is no Redis/WebSocket event to receive.

## API Client

This repo includes a Bruno collection under `bruno/` for lightweight local API testing.

Open the `bruno/` folder in Bruno, select the `Local` environment, and run requests against:

```txt
http://localhost:3000
```

Current requests include:

- `GET /health`
- `POST /bookings`
- `GET /bookings/:id`
- `GET /bookings?type=upcoming&page=1&limit=10`
- `GET /bookings?type=past&page=1&limit=10`

After creating a booking, copy the response `id` into the `bookingId` environment variable to use the get-by-id request.

Paste generated JWTs into the `providerToken` and `adminToken` Bruno environment variables. Keep the Bruno `providerId` value aligned with the provider JWT `sub` because existing booking requests use `{{providerId}}` and `{{providerToken}}` by default. Switch the header to `{{adminToken}}` only when testing admin access.

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

The booking e2e happy path creates a booking with a provider JWT, fetches it by ID, and verifies `/metrics` reports the created booking.

## Docker

```sh
JWT_SECRET=dev-secret docker compose up --build
```
