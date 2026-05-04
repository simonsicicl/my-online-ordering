# Project Structure Spec — My Online Ordering System
> Defines monorepo layout, naming conventions, and file placement rules.
> All code generation MUST follow this structure.

---

## Monorepo Root Layout

```
my-online-ordering/
├── services/                  # Backend microservices (one folder per service)
├── packages/                  # Shared libraries
├── frontend/                  # Frontend applications
├── infrastructure/            # IaC (AWS SAM templates)
├── scripts/                   # Dev/ops utility scripts
├── doc/                       # Documentation
│   └── spec/                  # AI-optimized spec files (read these first)
├── .github/workflows/         # CI/CD (GitHub Actions)
├── .env.example               # Template for local dev env vars
├── package.json               # Root workspace config (npm workspaces)
└── tsconfig.base.json         # Shared TypeScript base config
```

---

## Backend Services (`services/`)

### Per-Service Folder Structure

```
services/<service-name>/
├── src/
│   ├── handlers/              # One file per Lambda function
│   │   ├── get.ts
│   │   ├── create.ts
│   │   ├── update.ts
│   │   └── delete.ts
│   ├── db/
│   │   └── schema.ts          # Drizzle schema (service-scoped tables only)
│   ├── lib/                   # Shared logic within the service
│   │   ├── db.ts              # Drizzle client singleton
│   │   ├── redis.ts           # Redis client singleton
│   │   └── eventbridge.ts     # EventBridge publish helpers
│   ├── types/                 # Service-local types (if not in shared-types)
│   └── utils/                 # Pure utility functions
├── tests/
│   ├── unit/
│   └── integration/
├── template.yaml              # AWS SAM template for this service
├── package.json
└── tsconfig.json
```

### Service Folder Names

| Service | Folder Name |
| --- | --- |
| Authorization Service | `services/auth-service` |
| Store Service | `services/store-service` |
| Menu Service | `services/menu-service` |
| Order Service | `services/order-service` |
| Inventory Service | `services/inventory-service` |
| Payment Service | `services/payment-service` |
| User Profile Service | `services/user-profile-service` |
| Device Service | `services/device-service` |
| Notification Service | `services/notification-service` |

### Handler File Naming Rules

- One Lambda function = one file in `src/handlers/`
- File name reflects the **action**, not the HTTP method
- Examples:

| Lambda Function Name | Handler File |
| --- | --- |
| `menu-get-handler` | `services/menu-service/src/handlers/get.ts` |
| `menu-create-handler` | `services/menu-service/src/handlers/create.ts` |
| `menu-update-handler` | `services/menu-service/src/handlers/update.ts` |
| `menu-delete-handler` | `services/menu-service/src/handlers/delete.ts` |
| `order-create-handler` | `services/order-service/src/handlers/create.ts` |
| `order-update-status-handler` | `services/order-service/src/handlers/update-status.ts` |
| `order-cancel-handler` | `services/order-service/src/handlers/cancel.ts` |
| `inventory-reserve-handler` | `services/inventory-service/src/handlers/reserve.ts` |
| `inventory-commit-handler` | `services/inventory-service/src/handlers/commit.ts` |
| `payment-webhook-handler` | `services/payment-service/src/handlers/webhook.ts` |
| `notification-websocket-connect` | `services/notification-service/src/handlers/ws-connect.ts` |
| `notification-websocket-disconnect` | `services/notification-service/src/handlers/ws-disconnect.ts` |

### Handler Export Convention

Every handler file MUST export a `handler` named export:

```typescript
// src/handlers/create.ts
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  // ...
};
```

SAM template references it as: `Handler: src/handlers/create.handler`

---

## Shared Packages (`packages/`)

```
packages/
└── shared-types/              # @myordering/shared-types
    ├── src/
    │   ├── order.types.ts     # TypeScript interfaces + Zod schemas for orders
    │   ├── menu.types.ts      # TypeScript interfaces + Zod schemas for menu
    │   ├── payment.types.ts   # TypeScript interfaces + Zod schemas for payments
    │   ├── inventory.types.ts # TypeScript interfaces + Zod schemas for inventory
    │   ├── store.types.ts     # TypeScript interfaces + Zod schemas for stores
    │   ├── user.types.ts      # TypeScript interfaces + Zod schemas for users
    │   ├── device.types.ts    # TypeScript interfaces + Zod schemas for devices
    │   ├── notification.types.ts # TypeScript interfaces + Zod schemas for notifications
    │   ├── common.types.ts    # UUID, ISODateString, Pagination, etc.
    │   └── index.ts           # Re-exports everything
    ├── package.json           # name: "@myordering/shared-types"
    └── tsconfig.json
```

**Import rule**: All services MUST import domain types from `@myordering/shared-types`, never define their own duplicates.

```typescript
// ✅ Correct
import { Order, OrderStatus, CreateOrderRequest } from '@myordering/shared-types';

// ❌ Wrong — never redefine types locally
interface Order { ... }
```

---

## Frontend Applications (`frontend/`)

```
frontend/
├── user-client/               # PWA (React 18 + Vite)
├── merchant-dashboard/        # Web App (React 18 + Vite)
├── kiosk/                     # Electron + React 18
├── pos/                       # Electron + React 18
└── kds/                       # Web App (React 18 + Vite)
```

### Per-App Folder Structure

```
frontend/<app-name>/
├── src/
│   ├── pages/                 # Route-level components
│   ├── components/            # Reusable UI components
│   ├── store/                 # Redux Toolkit slices
│   ├── hooks/                 # Custom React hooks
│   ├── services/              # API call functions (Axios)
│   ├── types/                 # App-local types (extend shared-types)
│   └── utils/
├── public/
├── index.html
├── vite.config.ts
├── package.json
└── tsconfig.json
```

---

## Infrastructure (`infrastructure/`)

```
infrastructure/
├── samconfig.toml             # SAM CLI config (dev / staging / prod)
├── template.yaml              # Root SAM template (imports nested stacks)
├── stacks/
│   ├── vpc.yaml               # VPC, Security Groups
│   ├── database.yaml          # RDS PostgreSQL
│   ├── cache.yaml             # ElastiCache Redis
│   ├── cognito.yaml           # Cognito User Pool
│   ├── eventbridge.yaml       # Event bus + rules
│   └── api-gateway.yaml       # HTTP + WebSocket API
└── params/
    ├── dev.json               # Parameter overrides for dev
    ├── staging.json
    └── prod.json
```

---

## TypeScript Config Inheritance

```
tsconfig.base.json             # Root: strict, ES2022, paths aliases
    └── services/*/tsconfig.json        # extends ../../tsconfig.base.json
    └── packages/*/tsconfig.json        # extends ../../tsconfig.base.json
    └── frontend/*/tsconfig.json        # extends ../../tsconfig.base.json
```

### Path Aliases (configured in tsconfig.base.json)

```json
{
  "paths": {
    "@myordering/shared-types": ["packages/shared-types/src/index.ts"],
    "@lib/*": ["src/lib/*"],
    "@utils/*": ["src/utils/*"]
  }
}
```

---

## Naming Conventions Summary

| Item | Convention | Example |
| --- | --- | --- |
| Service folders | `kebab-case-service` | `order-service` |
| Lambda function names | `<service>-<action>-handler` | `order-create-handler` |
| Handler files | `kebab-case.ts` | `update-status.ts` |
| DB schema files | `schema.ts` (single file per service) | `src/db/schema.ts` |
| Env var names | `SCREAMING_SNAKE_CASE` | `DATABASE_URL` |
| SSM Parameter paths | `/myordering/{env}/{service}/{key}` | `/myordering/prod/db/password` |
| EventBridge source | `com.myorderingsystem.{domain}` | `com.myorderingsystem.order` |
| Redis keys | `{entity}:{id}` or `{action}:{entity}:{id}` | `menu:store-uuid` |
