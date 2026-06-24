# Minimal Booking Service

NestJS booking microservice built incrementally through focused milestones.

## PR 1: Project Bootstrap

This first milestone includes the application scaffold, tooling, CI, Docker skeleton, and a basic health endpoint.

## Requirements

- Node.js 22 LTS
- pnpm 11+

## Local Commands

```sh
pnpm install
pnpm lint
pnpm format:check
pnpm test
pnpm build
pnpm start:dev
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

## Docker

```sh
docker compose up --build
```
