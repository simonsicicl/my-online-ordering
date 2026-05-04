# Lambda Functions Spec — My Online Ordering System

> Defines naming, handler conventions, SAM template patterns, and inter-service communication rules.
> All Lambda implementations MUST follow this spec.

---

## Function Naming Convention

**Pattern**: `{service-short-name}-{action}-handler`

| Service | Short Name |
| --- | --- |
| auth-service | `auth` |
| store-service | `store` |
| menu-service | `menu` |
| order-service | `order` |
| inventory-service | `inventory` |
| payment-service | `payment` |
| user-profile-service | `profile` |
| device-service | `device` |
| notification-service | `notification` |

---

## Complete Lambda Function Registry

### Auth Service

| Function Name | Trigger | Handler File |
| --- | --- | --- |
| `auth-pre-signup-trigger` | Cognito Pre-SignUp | `src/handlers/pre-signup.ts` |
| `auth-post-confirmation-trigger` | Cognito PostConfirmation | `src/handlers/post-confirmation.ts` |
| `auth-token-validator` | API GW Lambda Authorizer | `src/handlers/token-validator.ts` |
| `auth-register-handler` | API GW POST /auth/register | `src/handlers/register.ts` |
| `auth-login-handler` | API GW POST /auth/login | `src/handlers/login.ts` |
| `auth-refresh-handler` | API GW POST /auth/refresh | `src/handlers/refresh.ts` |
| `auth-logout-handler` | API GW POST /auth/logout | `src/handlers/logout.ts` |

### Store Service

| Function Name | Trigger | Handler File |
| --- | --- | --- |
| `store-get-handler` | API GW GET /stores/:storeId | `src/handlers/get.ts` |
| `store-create-handler` | API GW POST /stores | `src/handlers/create.ts` |
| `store-update-status-handler` | API GW PATCH /stores/:storeId/status | `src/handlers/update-status.ts` |
| `store-update-handler` | API GW PATCH /stores/:storeId | `src/handlers/update.ts` |

### Menu Service

| Function Name | Trigger | Handler File |
| --- | --- | --- |
| `menu-get-handler` | API GW GET /menu/:storeId | `src/handlers/get.ts` |
| `menu-create-handler` | API GW POST /menu/items | `src/handlers/create.ts` |
| `menu-update-handler` | API GW PATCH /menu/items/:itemId | `src/handlers/update.ts` |
| `menu-delete-handler` | API GW DELETE /menu/items/:itemId | `src/handlers/delete.ts` |
| `menu-availability-handler` | API GW PATCH /menu/items/:itemId/availability | `src/handlers/availability.ts` |

### Order Service

| Function Name | Trigger | Handler File |
| --- | --- | --- |
| `order-create-handler` | API GW POST /orders | `src/handlers/create.ts` |
| `order-get-handler` | API GW GET /orders/:orderId | `src/handlers/get.ts` |
| `order-list-handler` | API GW GET /orders | `src/handlers/list.ts` |
| `order-update-status-handler` | API GW PATCH /orders/:orderId/status | `src/handlers/update-status.ts` |
| `order-cancel-handler` | API GW POST /orders/:orderId/cancel | `src/handlers/cancel.ts` |
| `order-payment-update` | EventBridge Payment.Success | `src/handlers/payment-update.ts` |

### Inventory Service

| Function Name | Trigger | Handler File |
| --- | --- | --- |
| `inventory-get-handler` | API GW GET /inventory/:itemId | `src/handlers/get.ts` |
| `inventory-update-handler` | API GW PATCH /inventory/:itemId | `src/handlers/update.ts` |
| `inventory-reserve-handler` | API GW POST /inventory/reserve | `src/handlers/reserve.ts` |
| `inventory-commit-handler` | API GW POST /inventory/commit | `src/handlers/commit.ts` |

### Payment Service

| Function Name | Trigger | Handler File |
| --- | --- | --- |
| `payment-create-intent` | API GW POST /payments/create-intent | `src/handlers/create-intent.ts` |
| `payment-charge-handler` | API GW POST /payments/charge | `src/handlers/charge.ts` |
| `payment-refund-handler` | API GW POST /payments/:paymentId/refund | `src/handlers/refund.ts` |
| `payment-webhook-handler` | API GW POST /webhooks/stripe | `src/handlers/webhook.ts` |

### User Profile Service

| Function Name | Trigger | Handler File |
| --- | --- | --- |
| `profile-get-handler` | API GW GET /users/:userId | `src/handlers/get.ts` |
| `profile-update-handler` | API GW PATCH /users/:userId | `src/handlers/update.ts` |
| `profile-orders-handler` | API GW GET /users/:userId/orders | `src/handlers/orders.ts` |

### Device Service

| Function Name | Trigger | Handler File |
| --- | --- | --- |
| `device-register-handler` | API GW POST /devices | `src/handlers/register.ts` |
| `device-print-job-handler` | API GW POST /devices/:deviceId/print-jobs | `src/handlers/print-job.ts` |
| `device-health-monitor` | EventBridge Scheduled (5 min) | `src/handlers/health-monitor.ts` |
| `device-iot-consumer` | AWS IoT Rule / SQS | `src/handlers/iot-consumer.ts` |

### Notification Service

| Function Name | Trigger | Handler File |
| --- | --- | --- |
| `notification-send-handler` | API GW POST /notifications/send | `src/handlers/send.ts` |
| `notification-dispatcher` | EventBridge Order/Payment events | `src/handlers/dispatcher.ts` |
| `notification-websocket-connect` | API GW WebSocket $connect | `src/handlers/ws-connect.ts` |
| `notification-websocket-disconnect` | API GW WebSocket $disconnect | `src/handlers/ws-disconnect.ts` |
| `notification-websocket-default` | API GW WebSocket $default | `src/handlers/ws-default.ts` |

---

## SAM Template Pattern

Each service has its own `template.yaml`. All services are nested stacks imported by the root `infrastructure/template.yaml`.

### Complete Service Template (menu-service as canonical example)

```yaml
# services/menu-service/template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Globals:
  Function:
    Runtime: nodejs20.x
    Architectures: [arm64]
    Timeout: 30
    MemorySize: 512
    ReservedConcurrentExecutions: 50    # CRITICAL: prevents DB connection exhaustion
    Environment:
      Variables:
        NODE_ENV: !Ref NodeEnv
        APP_ENV: !Ref AppEnv
        DATABASE_HOST: !Ref DatabaseHost
        DATABASE_PORT: !Ref DatabasePort
        DATABASE_NAME: !Ref DatabaseName
        DATABASE_USER: !Ref DatabaseUser
        DATABASE_PASSWORD: !Ref DatabasePassword
        DATABASE_SSL: "true"
        DB_MAX_CONNECTIONS: "10"
        REDIS_HOST: !Ref RedisHost
        REDIS_PORT: !Ref RedisPort
        EVENTBRIDGE_BUS_NAME: !Ref EventBridgeBusName
    Layers:
      - !Ref SharedDepsLayer

Parameters:
  NodeEnv:          { Type: String }
  AppEnv:           { Type: String }
  AuthorizerArn:    { Type: String }   # ARN of auth-token-validator Lambda (passed from root stack)
  DatabaseHost:     { Type: AWS::SSM::Parameter::Value<String>,       Default: /myordering/dev/db/host }
  DatabasePort:     { Type: AWS::SSM::Parameter::Value<String>,       Default: /myordering/dev/db/port }
  DatabaseName:     { Type: AWS::SSM::Parameter::Value<String>,       Default: /myordering/dev/db/name }
  DatabaseUser:     { Type: AWS::SSM::Parameter::Value<String>,       Default: /myordering/dev/db/username }
  DatabasePassword: { Type: AWS::SSM::Parameter::Value<SecureString>, Default: /myordering/dev/db/password }
  RedisHost:        { Type: AWS::SSM::Parameter::Value<String>,       Default: /myordering/dev/redis/host }
  RedisPort:        { Type: AWS::SSM::Parameter::Value<String>,       Default: /myordering/dev/redis/port }
  EventBridgeBusName: { Type: AWS::SSM::Parameter::Value<String>,    Default: /myordering/dev/eventbridge/bus-name }

Resources:

  # ── API GATEWAY ────────────────────────────────────────────────────────────
  # One HttpApi per service. Lambda Authorizer is attached here.
  MenuApi:
    Type: AWS::Serverless::HttpApi
    Properties:
      StageName: !Ref AppEnv
      Auth:
        DefaultAuthorizer: LambdaAuthorizer
        Authorizers:
          LambdaAuthorizer:
            FunctionArn: !Ref AuthorizerArn
            FunctionInvokeRole: !GetAtt AuthorizerInvokeRole.Arn
            Identity:
              Headers: [Authorization]
            AuthorizerPayloadFormatVersion: "2.0"
            EnableSimpleResponses: false

  # IAM role allowing API GW to invoke the shared Lambda Authorizer
  AuthorizerInvokeRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal: { Service: apigateway.amazonaws.com }
            Action: sts:AssumeRole
      Policies:
        - PolicyName: InvokeAuthorizerPolicy
          PolicyDocument:
            Version: "2012-10-17"
            Statement:
              - Effect: Allow
                Action: lambda:InvokeFunction
                Resource: !Ref AuthorizerArn

  # ── LAMBDA FUNCTIONS ───────────────────────────────────────────────────────
  MenuGetFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub "menu-get-handler-${AppEnv}"
      Handler: src/handlers/get.handler
      CodeUri: .
      Events:
        ApiEvent:
          Type: HttpApi
          Properties:
            ApiId: !Ref MenuApi
            Path: /api/v1/menu/{storeId}
            Method: GET
    Metadata:
      BuildMethod: esbuild
      BuildProperties:
        Minify: true
        Target: es2022
        EntryPoints: [src/handlers/get.ts]

  MenuCreateFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub "menu-create-handler-${AppEnv}"
      Handler: src/handlers/create.handler
      CodeUri: .
      Events:
        ApiEvent:
          Type: HttpApi
          Properties:
            ApiId: !Ref MenuApi
            Path: /api/v1/menu/items
            Method: POST
    Metadata:
      BuildMethod: esbuild
      BuildProperties:
        Minify: true
        Target: es2022
        EntryPoints: [src/handlers/create.ts]

Outputs:
  MenuApiUrl:
    Description: Menu Service API Gateway URL
    Value: !Sub "https://${MenuApi}.execute-api.${AWS::Region}.amazonaws.com/${AppEnv}"
    Export:
      Name: !Sub "MenuApiUrl-${AppEnv}"
```

### EventBridge Consumer (SQS trigger)

For Lambdas triggered by EventBridge via SQS (e.g. `order-payment-update` in order-service):

```yaml
  # ── SQS QUEUE (receives EventBridge events) ───────────────────────────────
  OrderEventQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: !Sub "order-event-queue-${AppEnv}"
      VisibilityTimeout: 90        # must be >= Lambda Timeout (30s) × 3 retries
      RedrivePolicy:
        deadLetterTargetArn: !GetAtt OrderEventDLQ.Arn
        maxReceiveCount: 3         # 3 retries before DLQ

  OrderEventDLQ:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: !Sub "order-event-dlq-${AppEnv}"
      MessageRetentionPeriod: 1209600   # 14 days

  # Allow EventBridge to send to this SQS queue
  OrderEventQueuePolicy:
    Type: AWS::SQS::QueuePolicy
    Properties:
      Queues: [!Ref OrderEventQueue]
      PolicyDocument:
        Statement:
          - Effect: Allow
            Principal: { Service: events.amazonaws.com }
            Action: sqs:SendMessage
            Resource: !GetAtt OrderEventQueue.Arn

  # ── EVENTBRIDGE RULE → SQS ────────────────────────────────────────────────
  PaymentSuccessRule:
    Type: AWS::Events::Rule
    Properties:
      EventBusName: !Ref EventBridgeBusName
      EventPattern:
        source: ["com.myorderingsystem.payment"]
        detail-type: ["Payment.Success"]
      Targets:
        - Id: OrderEventQueueTarget
          Arn: !GetAtt OrderEventQueue.Arn

  # ── CONSUMER LAMBDA ───────────────────────────────────────────────────────
  OrderPaymentUpdateFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub "order-payment-update-${AppEnv}"
      Handler: src/handlers/payment-update.handler
      CodeUri: .
      ReservedConcurrentExecutions: 10   # lower for background work
      Events:
        SQSEvent:
          Type: SQS
          Properties:
            Queue: !GetAtt OrderEventQueue.Arn
            BatchSize: 1                 # process one event at a time for simplicity
            FunctionResponseTypes: [ReportBatchItemFailures]
    Metadata:
      BuildMethod: esbuild
      BuildProperties:
        Minify: true
        Target: es2022
        EntryPoints: [src/handlers/payment-update.ts]
```

### New Service Checklist

When creating a new service, the `template.yaml` MUST have:

- [ ] `Globals.Function` with `ReservedConcurrentExecutions: 50` (DB-connected) or `10` (event consumer)
- [ ] All env vars listed (DATABASE_*, REDIS_*, EVENTBRIDGE_BUS_NAME)
- [ ] `AWS::Serverless::HttpApi` resource with `LambdaAuthorizer` attached (for API-facing services)
- [ ] `ApiId: !Ref <ServiceApi>` on every function's HttpApi event (so functions share one API GW)
- [ ] `esbuild` Metadata block on every function
- [ ] Outputs block exporting the API URL

---

## Inter-Service Communication Rules

### Rule 1: No direct DB cross-service access

Services MUST NOT query another service's tables directly.

```typescript
// ❌ Wrong — order-service querying menu tables directly
const item = await db.select().from(menuItems).where(eq(menuItems.id, itemId));

// ✅ Correct — call Menu Service API or read from shared Redis cache
const item = await getMenuItemFromCache(itemId) ?? await callMenuApi(itemId);
```

### Rule 2: Synchronous calls → REST API via internal URL

For real-time data needed in request scope, call the target service's API Gateway endpoint.
Use native `fetch` (Node 20 built-in — no extra dependencies). Forward the caller's JWT so the downstream Lambda Authorizer can validate identity and RBAC.

```typescript
// src/lib/service-client.ts  ← canonical implementation (same as patterns.spec.md Section 12)
import { AppError } from './errors';

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
    success: boolean; data?: T;
    error?: { code: string; message: string };
  };
  if (!response.ok || !json.success) {
    const code    = json.error?.code    ?? 'INTERNAL_ERROR';
    const message = json.error?.message ?? `Upstream service error (${response.status})`;
    throw new AppError(code, message, response.status >= 500 ? 502 : response.status);
  }
  return json.data as T;
}
```

**Usage in a handler** (e.g. order-service calling inventory-service):

```typescript
const jwt = event.headers['authorization'];  // forward caller's token
const url = `${process.env.INVENTORY_SERVICE_URL}/api/v1/inventory/${itemId}`;
const item = await callService<InventoryItem>(url, jwt);
```

**Service URL env vars** — add to SAM template + `config.ts` as needed:

| Env Var | Points to |
| --- | --- |
| `INVENTORY_SERVICE_URL` | inventory-service API GW URL |
| `MENU_SERVICE_URL` | menu-service API GW URL |
| `STORE_SERVICE_URL` | store-service API GW URL |
| `USER_SERVICE_URL` | user-profile-service API GW URL |

### Rule 3: Async cross-service side effects → EventBridge

For operations that don't need an immediate response, publish an event.

```typescript
// src/lib/eventbridge.ts
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const client = new EventBridgeClient({ region: config.app.region });

export async function publishEvent(detailType: string, detail: object): Promise<void> {
  await client.send(new PutEventsCommand({
    Entries: [{
      EventBusName: config.eventbridge.busName,
      Source:       `com.myorderingsystem.${getServiceDomain()}`,
      DetailType:   detailType,
      Detail:       JSON.stringify(detail),
    }]
  }));
}
```

### Rule 4: Internal-only endpoints still use JWT

`POST /inventory/reserve` and `POST /inventory/commit` are called only by other services (e.g. order-service).  
They are still behind the Lambda Authorizer — the calling service forwards the original user's JWT via `callService()`.  
RBAC is enforced normally: the caller's role must have permission to reach the endpoint.

---

## Standard Handler Structure

Every API handler MUST follow this pattern:

```typescript
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { db } from '@lib/db';
import { getRedis } from '@lib/redis';
import { publishEvent } from '@lib/eventbridge';
import { successResponse, errorResponse } from '@lib/response';
import { validateBody } from '@lib/validation';
import { CreateOrderRequest, OrderStatus, createOrderSchema } from '@myordering/shared-types';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const redis = await getRedis();

    // 1. Parse & validate input
    const body = validateBody<CreateOrderRequest>(event.body, createOrderSchema);

    // 2. Check idempotency (POST endpoints)
    const idempotencyKey = event.headers['idempotency-key'];
    if (idempotencyKey) {
      const cached = await redis.get(`idempotency:${idempotencyKey}`);
      if (cached) return successResponse(JSON.parse(cached), 200);
    }

    // 3. Business logic (use db.transaction() for multi-table ops)
    const result = await db.transaction(async (tx) => {
      // ...
    });

    // 4. Publish events
    await publishEvent('Order.Created', { /* eventData */ });

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

### Standard Response Helpers

```typescript
// src/lib/response.ts
export function successResponse(data: unknown, statusCode = 200) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true, data, timestamp: new Date().toISOString() }),
  };
}

export function errorResponse(error: unknown) {
  const appError = toAppError(error);    // normalize to { code, message, statusCode }
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
```

---

## Lambda Concurrency Limits

**ALL DB-connected Lambdas**: `ReservedConcurrentExecutions: 50`  
Reason: RDS db.t3.micro max_connections = 87; each Lambda instance uses up to 10 connections → max 8 concurrent instances safe, 50 is a hard cap applied at function level.

**Notification WebSocket Lambdas**: No reserved concurrency (use account default burst).

**EventBridge consumer Lambdas**: `ReservedConcurrentExecutions: 10` (lower priority background work).
