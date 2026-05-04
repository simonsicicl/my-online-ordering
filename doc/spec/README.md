# AI Quick Reference — My Online Ordering System

## When to read which spec

| Task | Read |
| --- | --- |
| Implement any API endpoint | [api.spec.md](api.spec.md) |
| Write DB schema / queries / migrations | [db.spec.md](db.spec.md) |
| Lambda handler structure / SAM template | [lambda.spec.md](lambda.spec.md) |
| Code templates (handler / db / redis / errors) | [patterns.spec.md](patterns.spec.md) |
| Publish or consume EventBridge events | [events.spec.md](events.spec.md) |
| Use TypeScript types / interfaces / Zod schemas | [types.spec.md](types.spec.md) |
| File placement / naming conventions | [project-structure.spec.md](project-structure.spec.md) |
| Environment variables / SSM paths | [env.spec.md](env.spec.md) |
| Frontend React apps (state, auth, RTK Query) | [frontend.spec.md](frontend.spec.md) |
| Order number format / tax calc / cost snapshot | [business-rules.spec.md](business-rules.spec.md) |
| Architecture decisions, infra setup | [../ARCHITECTURE_OVERVIEW.md](../ARCHITECTURE_OVERVIEW.md) |
| Development phases / milestones | [../SOFTWARE_DEVELOPMENT_PLAN.md](../SOFTWARE_DEVELOPMENT_PLAN.md) |
| Git branching / CI/CD | [git.spec.md](git.spec.md) |
| Deploy to AWS / switch accounts / migration | [deployment.spec.md](deployment.spec.md) |

## System at a Glance

- **Stack**: AWS Lambda (Node.js 20) + TypeScript + Drizzle ORM + PostgreSQL 15 + Redis + EventBridge
- **Frontend**: React 18 + Vite (5 apps: User Client, Merchant Dashboard, Kiosk, POS, KDS)
- **Auth**: AWS Cognito (JWT RS256, 1hr)
- **API prefix**: `/api/v1/`
- **Scope**: v0.2.0 — MVP + Inventory + POS

## Key Constraints (Always Apply)

1. All monetary values in **cents** (integer), e.g. 1299 = $12.99
2. All timestamps in **ISO 8601 UTC**
3. Every table with store data MUST include `storeId` (multi-tenant isolation)
4. `COMBO_PARENT` order items do **NOT** consume inventory — only `REGULAR` and `COMBO_CHILD` do
5. Soft delete only (`isDeleted = true`) — never hard delete menu items
6. Recipe evaluation uses **AND logic** — all `recipeConditions` must match
7. Snapshot `priceAtOrder` and `costAtOrder` on order creation — never recalculate from current prices
8. Lambda max concurrency: 50 (prevents DB connection exhaustion, max_connections = 87)
9. Import all types from `@myordering/shared-types`
