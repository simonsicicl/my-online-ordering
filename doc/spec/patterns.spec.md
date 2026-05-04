# Code Patterns Spec — My Online Ordering System
> Copy-paste templates for Lambda handlers, DB access, Redis, EventBridge, and error handling.
> All generated code MUST follow these patterns for consistency.

---

## 1. Standard Lambda Handler (API Gateway)

```typescript
// services/<service>/src/handlers/create.ts
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { db } from '../lib/db';
import { getRedis } from '../lib/redis';
import { publishEvent } from '../lib/eventbridge';
import { successResponse, errorResponse } from '../lib/response';
import { validateBody } from '../lib/validation';
import { CreateOrderRequest, createOrderSchema } from '@myordering/shared-types';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const redis = await getRedis();

    // 1. Parse & validate
    const body = validateBody<CreateOrderRequest>(event.body, createOrderSchema);
    const { storeId } = event.pathParameters ?? {};

    // 2. Idempotency check (POST/PATCH only)
    const idempotencyKey = event.headers['idempotency-key'];
    if (idempotencyKey) {
      const cached = await redis.get(`idempotency:${idempotencyKey}`);
      if (cached) return successResponse(JSON.parse(cached), 200);
    }

    // 3. Business logic
    const result = await db.transaction(async (tx) => {
      // multi-table writes go here
    });

    // 4. Publish event (if needed)
    await publishEvent('Order.Created', {
      eventVersion: '1.0',
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      aggregateId: result.id,
      aggregateType: 'Order',
      eventData: result,
      metadata: { storeId, userId: null, correlationId: result.id, causationId: null, source: 'order-create-handler' },
    });

    // 5. Cache idempotency result
    if (idempotencyKey) {
      await redis.setEx(`idempotency:${idempotencyKey}`, 86400, JSON.stringify(result));
    }

    return successResponse(result, 201);
  } catch (error) {
    return errorResponse(error);
  }
};
```

**GET handler** (no idempotency, no event):
```typescript
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const redis = await getRedis();
    const { storeId } = event.pathParameters ?? {};
    if (!storeId) return errorResponse(new AppError('VALIDATION_ERROR', 'storeId required', 400));

    // Check cache first
    const cached = await redis.get(`store:${storeId}`);
    if (cached) return successResponse(JSON.parse(cached));

    const result = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
    if (!result.length) return errorResponse(new AppError('NOT_FOUND', 'Store not found', 404));

    await redis.setEx(`store:${storeId}`, 600, JSON.stringify(result[0]));
    return successResponse(result[0]);
  } catch (error) {
    return errorResponse(error);
  }
};
```

---

## 2. `src/lib/response.ts`

```typescript
import { AppError } from './errors';

export function successResponse(data: unknown, statusCode = 200) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true, data, timestamp: new Date().toISOString() }),
  };
}

export function paginatedResponse(data: unknown[], pagination: {
  page: number; limit: number; total: number;
}) {
  const totalPages = Math.ceil(pagination.total / pagination.limit);
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      success: true,
      data,
      pagination: {
        ...pagination,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrevious: pagination.page > 1,
      },
      timestamp: new Date().toISOString(),
    }),
  };
}

export function errorResponse(error: unknown) {
  const appError = toAppError(error);
  return {
    statusCode: appError.statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      success: false,
      error: { code: appError.code, message: appError.message },
      timestamp: new Date().toISOString(),
    }),
  };
}

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(JSON.stringify({ level: 'error', message, stack: error instanceof Error ? error.stack : undefined }));
  return new AppError('INTERNAL_ERROR', message, 500);
}
```

---

## 3. `src/lib/errors.ts`

```typescript
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Convenience factories
export const Errors = {
  notFound:      (msg = 'Not found')             => new AppError('NOT_FOUND',        msg, 404),
  unauthorized:  (msg = 'Unauthorized')           => new AppError('UNAUTHORIZED',     msg, 401),
  forbidden:     (msg = 'Forbidden')              => new AppError('FORBIDDEN',        msg, 403),
  conflict:      (msg = 'Conflict')               => new AppError('CONFLICT',         msg, 409),
  validation:    (msg: string)                    => new AppError('VALIDATION_ERROR', msg, 400),
  outOfStock:    (msg = 'Item out of stock')      => new AppError('OUT_OF_STOCK',     msg, 422),
  paymentFailed: (msg = 'Payment failed')         => new AppError('PAYMENT_FAILED',   msg, 422),
};
```

---

## 4. `src/lib/config.ts`

```typescript
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const config = {
  db: {
    host:     requireEnv('DATABASE_HOST'),
    port:     parseInt(requireEnv('DATABASE_PORT'), 10),
    name:     requireEnv('DATABASE_NAME'),
    user:     requireEnv('DATABASE_USER'),
    password: requireEnv('DATABASE_PASSWORD'),
    ssl:      process.env.DATABASE_SSL === 'true',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS ?? '10', 10),
  },
  redis: {
    host: requireEnv('REDIS_HOST'),
    port: parseInt(requireEnv('REDIS_PORT'), 10),
  },
  eventbridge: {
    busName: requireEnv('EVENTBRIDGE_BUS_NAME'),
  },
  app: {
    env:      process.env.APP_ENV ?? 'dev',
    region:   requireEnv('AWS_REGION'),
    logLevel: process.env.LOG_LEVEL ?? 'info',
  },
} as const;
```

---

## 5. `src/lib/db.ts`

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { config } from './config';
import * as schema from '../db/schema';

// Module-level singleton — reused across Lambda warm invocations
const pool = new Pool({
  host:     config.db.host,
  port:     config.db.port,
  database: config.db.name,
  user:     config.db.user,
  password: config.db.password,
  ssl:      config.db.ssl ? { rejectUnauthorized: false } : false,
  max:      config.db.maxConnections,
});

export const db = drizzle(pool, { schema });
```

---

## 6. `src/lib/redis.ts`

> ⚠️ **Do NOT use top-level `await` here.** Lambda bundles run as CommonJS by default;
> top-level await is not supported and will cause a cold-start crash.
> Use the lazy-connect pattern below instead.

```typescript
import { createClient, type RedisClientType } from 'redis';
import { config } from './config';

// Module-level singleton — created once, reused across warm invocations
const client: RedisClientType = createClient({
  socket: { host: config.redis.host, port: config.redis.port },
}) as RedisClientType;

client.on('error', (err) =>
  console.error(JSON.stringify({ level: 'error', message: 'Redis client error', err: String(err) }))
);

// Lazy connect — called at the start of each handler invocation.
// Safe to call multiple times: no-ops if already connected.
export async function getRedis(): Promise<RedisClientType> {
  if (!client.isOpen) {
    await client.connect();
  }
  return client;
}
```

**Usage in every handler that needs Redis:**

```typescript
// At the top of the handler function body (not module level)
const redis = await getRedis();
const cached = await redis.get(`menu:${storeId}`);
```

> **Rule**: Import `getRedis`, never import `client` directly.
> Never call `getRedis()` at module level — only inside the handler function.

---

## 7. `src/lib/eventbridge.ts`

```typescript
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { config } from './config';

const client = new EventBridgeClient({ region: config.app.region });

// Derive source from function name, e.g. "order-create-handler" → "com.myorderingsystem.order"
function getSource(): string {
  const fnName = process.env.AWS_LAMBDA_FUNCTION_NAME ?? '';
  const service = fnName.split('-')[0]; // "order", "menu", etc.
  return `com.myorderingsystem.${service}`;
}

export async function publishEvent(detailType: string, detail: object): Promise<void> {
  await client.send(new PutEventsCommand({
    Entries: [{
      EventBusName: config.eventbridge.busName,
      Source:       getSource(),
      DetailType:   detailType,
      Detail:       JSON.stringify(detail),
    }],
  }));
}
```

---

## 8. `src/lib/validation.ts`

```typescript
import { AppError } from './errors';

// Use with zod schemas — throw AppError on validation failure
export function validateBody<T>(body: string | null | undefined, schema: { parse: (v: unknown) => T }): T {
  if (!body) throw new AppError('VALIDATION_ERROR', 'Request body is required', 400);
  try {
    return schema.parse(JSON.parse(body));
  } catch (e) {
    throw new AppError('VALIDATION_ERROR', e instanceof Error ? e.message : 'Invalid request body', 400);
  }
}

export function requirePathParam(params: Record<string, string> | null | undefined, key: string): string {
  const val = params?.[key];
  if (!val) throw new AppError('VALIDATION_ERROR', `Path parameter '${key}' is required`, 400);
  return val;
}

export function parseQueryParams(params: Record<string, string> | null | undefined) {
  const page  = Math.max(1, parseInt(params?.page  ?? '1',  10));
  const limit = Math.min(100, Math.max(1, parseInt(params?.limit ?? '20', 10)));
  const sortOrder = (params?.sortOrder === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';
  const sortBy = params?.sortBy ?? 'createdAt';
  const offset = (page - 1) * limit;
  return { page, limit, offset, sortBy, sortOrder };
}
```

---

## 9. Drizzle Query Patterns

```typescript
import { eq, and, desc, sql, count } from 'drizzle-orm';

// Single record (throw if not found)
const [item] = await db.select().from(menuItems)
  .where(and(eq(menuItems.id, id), eq(menuItems.storeId, storeId), eq(menuItems.isDeleted, false)))
  .limit(1);
if (!item) throw Errors.notFound('Menu item not found');

// Paginated list
const { page = 1, limit = 20 } = queryParams;
const offset = (page - 1) * limit;

const [items, [{ total }]] = await Promise.all([
  db.select().from(menuItems)
    .where(and(eq(menuItems.storeId, storeId), eq(menuItems.isDeleted, false)))
    .orderBy(desc(menuItems.createdAt))
    .limit(limit).offset(offset),
  db.select({ total: count() }).from(menuItems)
    .where(and(eq(menuItems.storeId, storeId), eq(menuItems.isDeleted, false))),
]);

// Transaction (multi-table write)
const result = await db.transaction(async (tx) => {
  const [order] = await tx.insert(orders).values({ ... }).returning();
  await tx.insert(orderItems).values(items.map(i => ({ orderId: order.id, ...i })));
  return order;
});

// Soft delete
await db.update(menuItems)
  .set({ isDeleted: true, updatedAt: new Date().toISOString() })
  .where(and(eq(menuItems.id, id), eq(menuItems.storeId, storeId)));
```

---

## 10. EventBridge Consumer Handler (SQS trigger)

```typescript
import { SQSHandler } from 'aws-lambda';

export const handler: SQSHandler = async (event) => {
  const redis = await getRedis();

  for (const record of event.Records) {
    const envelope = JSON.parse(record.body);
    const detail = envelope.detail;

    // Idempotency check
    const eventId = detail.eventId;
    const idempotencyKey = `idempotency:event:${eventId}`;
    const seen = await redis.get(idempotencyKey);
    if (seen) continue;

    try {
      // Process event
      await handleEvent(detail);
      await redis.setEx(idempotencyKey, 86400, '1');
    } catch (error) {
      // Log and let SQS retry (up to 3 times → DLQ)
      console.error(JSON.stringify({ level: 'error', eventId, error: String(error) }));
      throw error;
    }
  }
};
```

---

## 11. Logging Pattern

No logging library — use structured JSON to stdout (CloudWatch picks it up).

```typescript
// ✅ Correct
console.log(JSON.stringify({ level: 'info', message: 'Order created', orderId, storeId }));
console.error(JSON.stringify({ level: 'error', message: 'DB error', error: String(err) }));

// ❌ Wrong
console.log('Order created:', orderId);
```

---

## 12. Cross-Service HTTP Calls

> Use when one service needs **synchronous** data from another service's API.
> Do NOT query another service's DB directly.

**HTTP client**: native `fetch` (Node 20 built-in) — no extra dependencies.

```typescript
// src/lib/service-client.ts
import { AppError } from './errors';

/**
 * Call another internal service API.
 * Forwards the caller's JWT so the downstream service can authorize the request.
 *
 * @param url    Full URL, e.g. `${process.env.INVENTORY_SERVICE_URL}/api/v1/inventory/${itemId}`
 * @param jwt    Bearer token from the original request (event.headers['authorization'])
 * @param init   Optional fetch options (method, body, etc.)
 */
export async function callService<T>(
  url: string,
  jwt: string | undefined,
  init?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(jwt ? { Authorization: jwt } : {}),
  };

  const response = await fetch(url, { ...init, headers });
  const json = await response.json() as {
    success: boolean;
    data?: T;
    error?: { code: string; message: string };
  };

  if (!response.ok || !json.success) {
    const code    = json.error?.code    ?? 'INTERNAL_ERROR';
    const message = json.error?.message ?? `Upstream service error (${response.status})`;
    const status  = response.status >= 500 ? 502 : response.status;
    throw new AppError(code, message, status);
  }

  return json.data as T;
}
```

### Usage in a handler

```typescript
// e.g. read inventory data from inventory-service inside order-service handler
import { callService } from '../lib/service-client';
import { InventoryItem } from '@myordering/shared-types';

const jwt = event.headers['authorization'];   // forward the caller's token
const url = `${process.env.INVENTORY_SERVICE_URL}/api/v1/inventory/${menuItemId}`;

const inventoryItem = await callService<InventoryItem>(url, jwt);
```

### Service URL env vars (add to SAM template + `config.ts` as needed)

| Env Var | Points to |
|---------|-----------|
| `INVENTORY_SERVICE_URL` | API GW URL for inventory-service |
| `MENU_SERVICE_URL` | API GW URL for menu-service |
| `STORE_SERVICE_URL` | API GW URL for store-service |
| `USER_SERVICE_URL` | API GW URL for user-profile-service |

> **Rule**: Never hardcode service URLs. Always read from env vars via `config.ts`.

---

## 13. Pinned Dependency Versions

> **Rule**: Every service `package.json` MUST use these exact versions.
> Never let AI choose versions freely — version drift across 9 services causes hard-to-debug runtime errors.

### Backend (all services)

```json
{
  "dependencies": {
    "drizzle-orm":            "0.30.10",
    "pg":                     "8.11.5",
    "redis":                  "4.6.14",
    "zod":                    "3.23.8",
    "@aws-sdk/client-eventbridge": "3.600.0",
    "@aws-sdk/client-ssm":    "3.600.0"
  },
  "devDependencies": {
    "typescript":             "5.4.5",
    "@types/aws-lambda":      "8.10.140",
    "@types/pg":              "8.11.6",
    "aws-sam-cli":            "use system install",
    "drizzle-kit":            "0.21.4",
    "esbuild":                "0.21.5"
  }
}
```

### Shared Types package (`packages/shared-types`)

```json
{
  "name": "@myordering/shared-types",
  "version": "1.0.0",
  "main": "src/index.ts",
  "dependencies": {
    "zod": "3.23.8"
  },
  "devDependencies": {
    "typescript": "5.4.5"
  }
}
```

### Frontend (all 5 apps)

```json
{
  "dependencies": {
    "react":                  "18.3.1",
    "react-dom":              "18.3.1",
    "@reduxjs/toolkit":       "2.2.7",
    "react-redux":            "9.1.2",
    "zod":                    "3.23.8",
    "@myordering/shared-types": "*"
  },
  "devDependencies": {
    "vite":                   "5.3.4",
    "@vitejs/plugin-react":   "4.3.1",
    "typescript":             "5.4.5",
    "@types/react":           "18.3.3",
    "@types/react-dom":       "18.3.0"
  }
}
```