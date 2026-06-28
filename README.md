# Minimal Booking Service

NestJS booking microservice built incrementally through focused milestones.

## PR 1: Project Bootstrap

This first milestone includes the application scaffold, tooling, CI, Docker skeleton, and a basic health endpoint.

## PR 2: Database And Booking Core

This milestone adds PostgreSQL persistence with Prisma and the core booking REST API.

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
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bookings
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/bookings_test
```

## Database

Start PostgreSQL:

```sh
docker compose up -d postgres postgres_test
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
  "startTime": "2026-06-22T10:00:00.000Z",
  "endTime": "2026-06-22T10:30:00.000Z"
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
- auth and provider ownership checks are intentionally added in the next milestone

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

## Docker

```sh
docker compose up --build
```
