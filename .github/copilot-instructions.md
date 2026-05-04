# GitHub Copilot Instructions — My Online Ordering System

## Project Context

Serverless, event-driven, microservices-based restaurant ordering platform.
Solo developer project. Prioritize correctness and consistency over cleverness.

**Stack**: AWS Lambda (Node.js 20.x, arm64) · TypeScript · Drizzle ORM · PostgreSQL 15 · Redis · EventBridge · AWS SAM  
**Frontend**: React 18 + Vite (5 apps: `user-client`, `merchant-dashboard`, `kiosk`, `pos`, `kds`)  
**Auth**: AWS Cognito · JWT RS256 · 1hr expiry  
**Monorepo**: npm workspaces

---

## Spec Files — Read These Before Coding

| Task | Read First |
|------|-----------|
| Any API endpoint | `doc/spec/api.spec.md` |
| DB schema / queries / migrations | `doc/spec/db.spec.md` |
| Lambda handler structure / SAM template | `doc/spec/lambda.spec.md` |
| Code patterns / templates | `doc/spec/patterns.spec.md` |
| EventBridge events | `doc/spec/events.spec.md` |
| TypeScript types / Zod schemas | `doc/spec/types.spec.md` |
| File placement / naming | `doc/spec/project-structure.spec.md` |
| Environment variables | `doc/spec/env.spec.md` |
| Frontend React apps | `doc/spec/frontend.spec.md` |
| Order number / tax / cost calculations | `doc/spec/business-rules.spec.md` |
| Git branches / commits | `doc/spec/git.spec.md` |
| Deploy to AWS / switch accounts / migration | `doc/spec/deployment.spec.md` |

---

## Hard Rules — Always Apply

### Money & Data
- All monetary values stored as **integer cents** (e.g. `1299` = $12.99)
- All timestamps as **ISO 8601 UTC** string
- Inventory quantities as `decimal(10,3)`

### Multi-tenancy
- Every table with store data MUST include `storeId`
- Scope all queries with `storeId` — never return cross-store data

### Database
- ORM: **Drizzle ORM only** — never raw SQL strings, never Prisma
- **Soft delete only**: set `isDeleted = true`, never `DELETE FROM`
- Use `db.transaction()` for any multi-table write
- Max 10 DB connections per Lambda instance (`DB_MAX_CONNECTIONS=10`)

### Lambda
- `ReservedConcurrentExecutions: 50` on ALL DB-connected functions
- Never hardcode env vars — always read via `src/lib/config.ts`
- Handler export must be named `handler` (not `default`)

### Types
- Import ALL types from `@myordering/shared-types`
- **Never redefine** types locally that exist in shared-types

### Services
- **No direct DB cross-service access** — never query another service's tables
- Synchronous cross-service data → REST API call
- Async side effects → EventBridge `publishEvent()`

### API
- Base prefix: `/api/v1/`
- Response envelope: `{ success, data, timestamp }` / `{ success, error, timestamp }`
- Pagination default: `page=1, limit=20, max=100`

---

## Project Structure (Quick Reference)

```
services/<service-name>/src/
  handlers/     # One file per Lambda (named by action: get.ts, create.ts…)
  db/schema.ts  # Drizzle schema (this service's tables only)
  lib/          # db.ts · redis.ts · eventbridge.ts · config.ts · response.ts
  types/        # Service-local types only (prefer shared-types)
  utils/

packages/shared-types/src/   # @myordering/shared-types
frontend/<app-name>/src/     # pages/ components/ store/ hooks/ services/
infrastructure/              # AWS SAM templates
```

---

## What NOT to Suggest

- ❌ Prisma (we use Drizzle ORM)
- ❌ RDS Proxy (not provisioned, cost reason)
- ❌ Hard delete (`DELETE FROM`)
- ❌ Defining types locally instead of importing from `@myordering/shared-types`
- ❌ Direct DB access across service boundaries
- ❌ Plain `console.log('message', var)` — always use structured JSON: `console.log(JSON.stringify({ level: 'info', message: '...', ...context }))`
- ❌ `any` type in TypeScript
- ❌ Hardcoded credentials or URLs
- ❌ `import { redis } from '../lib/redis'` — always use `import { getRedis } from '../lib/redis'` and call `const redis = await getRedis()` inside the handler function (top-level await is not supported in Lambda CommonJS bundles)
- ❌ Docker Compose or `sam local` for local development — this project deploys directly to AWS dev environment; there is no local stack
