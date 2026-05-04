# API Spec — My Online Ordering System
> Single source of truth for REST API. All implementations MUST comply.
> Full detail: [API_CONTRACT.md](../API_CONTRACT.md)

---

## Global Rules

**Base URL**: `http://localhost:3000` (dev) | `https://api.myonlineordering.com` (prod)  
**Prefix**: `/api/v1/`  
**Auth Header**: `Authorization: Bearer {JWT}` (Cognito RS256, 1hr expiry)  
**Content-Type**: `application/json`

### Response Envelope
```json
// Success
{ "success": true, "data": {...}, "timestamp": "ISO8601" }

// Error
{ "success": false, "error": { "code": "ERROR_CODE", "message": "...", "details": [...] }, "timestamp": "ISO8601" }

// Paginated
{ "success": true, "data": [...], "pagination": { "page": 1, "limit": 20, "total": 150, "totalPages": 8, "hasNext": true, "hasPrevious": false }, "timestamp": "ISO8601" }
```

### HTTP Status Codes
| Code | When |
|------|------|
| 200 | GET/PATCH/DELETE success |
| 201 | POST (resource created) |
| 204 | DELETE (no body) |
| 400 | Validation error |
| 401 | Missing/invalid JWT |
| 403 | Valid JWT, insufficient permission |
| 404 | Resource not found |
| 409 | Conflict / duplicate |
| 422 | Business logic error (out of stock, payment failed) |
| 429 | Rate limit exceeded |
| 500 | Server error |

### Error Codes
| Code | HTTP |
|------|------|
| `VALIDATION_ERROR` | 400 |
| `UNAUTHORIZED` | 401 |
| `FORBIDDEN` | 403 |
| `NOT_FOUND` | 404 |
| `CONFLICT` | 409 |
| `OUT_OF_STOCK` | 422 |
| `PAYMENT_FAILED` | 422 |
| `RATE_LIMIT_EXCEEDED` | 429 |
| `INTERNAL_ERROR` | 500 |

### Pagination Defaults
- `page`: 1, `limit`: 20 (max 100), `sortBy`: `createdAt`, `sortOrder`: `desc`

### Rate Limits
- Burst: 100 req/s per IP, Sustained: 50 req/s per IP

---

## RBAC

| Role | Scope |
|------|-------|
| `User` | Read menu, create/view own orders |
| `Cashier` | Create orders, process payments, view store orders |
| `Lead` | All Cashier permissions + toggle item availability, view inventory, view reports |
| `Manager` | Full store management, reports, staff |
| `Merchant` | Full access to owned stores |
| `Admin` | System-wide |

| Endpoint | User | Cashier | Lead | Manager | Merchant | Admin |
|----------|:----:|:-------:|:----:|:-------:|:--------:|:-----:|
| `GET /menu/:storeId` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /menu/items` | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| `PATCH /menu/items/:id/availability` | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /orders` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /orders/:id` | own | store | store | store | owned | ✅ |
| `PATCH /orders/:id/status` | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /inventory/:itemId` | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| `PATCH /inventory/:itemId` | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| `POST /stores` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `PATCH /stores/:id/status` | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |

---

## JWT Claims & Handler Auth Context

The `auth-token-validator` Lambda Authorizer validates the Cognito JWT and injects a context object into every request. Handlers read identity from `event.requestContext.authorizer.lambda` — **never decode the JWT themselves**.

### Cognito ID Token Claims (relevant subset)
```json
{
  "sub": "<user-uuid>",
  "email": "user@example.com",
  "cognito:groups": ["MANAGER"],
  "custom:globalRole": "MANAGER"
}
```

### Authorizer Context (what the Lambda Authorizer injects)
```typescript
// auth-service/src/handlers/token-validator.ts returns:
{
  userId: string,    // = JWT "sub"
  email:  string,    // = JWT "email"
  role:   UserRole,  // = JWT "custom:globalRole" cast to UserRole enum
}
```

### Reading Auth Context in a Handler
```typescript
import { APIGatewayProxyHandlerV2WithLambdaAuthorizer } from 'aws-lambda';
import { UserRole } from '@myordering/shared-types';

type AuthContext = { userId: string; email: string; role: UserRole };

export const handler: APIGatewayProxyHandlerV2WithLambdaAuthorizer<AuthContext> = async (event) => {
  const { userId, role } = event.requestContext.authorizer.lambda;

  // RBAC guard example:
  if (role !== UserRole.MANAGER && role !== UserRole.MERCHANT && role !== UserRole.ADMIN) {
    return errorResponse(new AppError('FORBIDDEN', 'Insufficient permissions', 403));
  }

  // storeId always comes from path parameter — never from JWT
  const storeId = event.pathParameters?.storeId;
  // ...
};
```

### Public Endpoints (no JWT required)
Set `Auth: Optional` in api.spec routes (e.g. `GET /menu/:storeId`, `POST /auth/login`).  
For these, the handler type is plain `APIGatewayProxyHandlerV2` and `event.requestContext.authorizer` will be `undefined`.

---

## Menu Service

### `GET /api/v1/menu/:storeId`
- **Auth**: Optional (public)
- **Query**: `includeUnavailable` (bool, default false)
- **Cache**: Redis TTL 5 min
- **Response 200**: `{ storeId, storeName, categories: [{ id, name, displayOrder, items: [{ id, name, price, isAvailable, customizations: [{ id, name, type, required, options: [{ id, name, priceDelta }] }], allergens, tags }] }] }`

### `POST /api/v1/menu/items`
- **Auth**: Manager, Merchant, Admin
- **Body**: `{ storeId, categoryId, name, description, price, imageUrl, isAvailable, customizations, allergens, tags }`
- **Response 201**: Created item
- **Event**: `Menu.ItemCreated`

### `PATCH /api/v1/menu/items/:itemId`
- **Auth**: Manager, Merchant, Admin
- **Body**: Partial item fields
- **Response 200**: Updated item
- **Event**: `Menu.ItemUpdated`
- **Side Effect**: Invalidates `menu:{storeId}` Redis cache

### `DELETE /api/v1/menu/items/:itemId`
- **Auth**: Manager, Merchant, Admin
- **Response 204**
- **Event**: `Menu.ItemDeleted`
- **Note**: Soft delete (sets `isDeleted = true`)

### `PATCH /api/v1/menu/items/:itemId/availability`
- **Auth**: Cashier, Manager, Merchant, Admin
- **Body**: `{ "isAvailable": false }`
- **Response 200**: `{ id, isAvailable, updatedAt }`
- **Event**: `Item.SoldOut` or `Item.BackInStock`

---

## Order Service

### `POST /api/v1/orders`
- **Auth**: All roles
- **Body**:
```json
{
  "storeId": "uuid",
  "orderSource": "USER_CLIENT|KIOSK|POS",
  "orderType": "DINE_IN|TAKEOUT",
  "items": [{ "menuItemId": "uuid", "quantity": 2, "customizations": [{ "customizationId": "uuid", "selectedOptionIds": ["opt-uuid"] }], "specialInstructions": "..." }],
  "scheduledPickupTime": "ISO8601",
  "notes": "...",
  "discount": 0,
  "discountReason": null
}
```
- **Validation**: Items exist & available; inventory sufficient; scheduledPickupTime in future
- **Response 201**: Full order object (status: PENDING)
- **Event**: `Order.Created`
- **Side Effect**: Inventory reservation (Redis lock, 10-min TTL)
- **Note**: `discount` / `discountReason` are manual POS override fields (v0.2.0)

### `GET /api/v1/orders/:orderId`
- **Auth**: Required (scoped by role)
- **Response 200**: Full order with items, payment, statusHistory

### `GET /api/v1/orders`
- **Auth**: Required
- **Query**: `storeId`, `userId`, `status`, `orderSource`, `startDate`, `endDate`, `page`, `limit`, `sortBy`, `sortOrder`
- **Response 200**: Paginated order list (summary objects)

### `PATCH /api/v1/orders/:orderId/status`
- **Auth**: Cashier, Manager, Merchant, Admin
- **Body**: `{ "status": "PREPARING", "notes": "..." }`
- **Valid Transitions**:
  ```
  PENDING → PAID → PREPARING → READY → COMPLETED
                ↘ CANCELLED (any status except COMPLETED)
  ```
- **Response 200**: `{ id, status, statusHistory, updatedAt }`
- **Event**: `Order.StatusChanged`
- **Side Effects**:
  - `PREPARING` → queue kitchen label print job
  - `COMPLETED` → commit inventory, award loyalty points

### `POST /api/v1/orders/:orderId/cancel`
- **Auth**: User (own, PENDING/PAID only) | Cashier/Manager/Merchant (store orders)
- **Body**: `{ "reason": "...", "refund": true }`
- **Response 200**: `{ id, status: "CANCELLED", cancelledAt, cancelReason, refundStatus }`
- **Event**: `Order.Cancelled`
- **Side Effects**: Release inventory reservation; process refund if paid; reverse loyalty points

---

## Inventory Service

### `GET /api/v1/inventory/:itemId`
- **Auth**: Cashier, Manager, Merchant, Admin
- **Response 200**: `{ itemId, itemName, stockCount, reservedCount, availableCount, lowStockThreshold, isLowStock, lastUpdated }`

### `PATCH /api/v1/inventory/:itemId`
- **Auth**: Manager, Merchant, Admin
- **Body**: `{ "stockCount": 50, "lowStockThreshold": 10, "reason": "..." }`
- **Response 200**: Updated stock
- **Event**: `Stock.ManuallyUpdated`, possibly `Item.BackInStock`
- **Side Effect**: Inventory log created

### `POST /api/v1/inventory/reserve` *(Internal — service-to-service)*
- **Body**: `{ "orderId": "uuid", "items": [{ "itemId": "uuid", "quantity": 2 }] }`
- **Response 200**: `{ reservationId, orderId, items, expiresAt }`
- **Error 422**: `OUT_OF_STOCK` with `{ itemId, requested, available }`
- **Event**: `Stock.Reserved`
- **Side Effect**: Redis lock `lock:inventory:{itemId}` TTL 10 min

### `POST /api/v1/inventory/commit` *(Internal — service-to-service)*
- **Body**: `{ "reservationId": "uuid", "orderId": "uuid" }`
- **Response 200**: `{ reservationId, committed: true }`
- **Event**: `Stock.Committed`
- **Side Effects**: Release Redis lock; permanent DB deduction; if stock ≤ minStock → `Stock.LowAlert`

---

## Payment Service

### `POST /api/v1/payments/create-intent`
- **Auth**: All roles
- **Body**: `{ "orderId": "uuid", "amount": 3970, "currency": "TWD" }`
- **Response 201**: `{ paymentIntentId, clientSecret, amount, currency, orderId }`
- **Side Effect**: Stripe PaymentIntent created

### `POST /api/v1/payments/charge` *(POS)*
- **Auth**: Cashier, Manager, Merchant, Admin
- **Body**: `{ "orderId": "uuid", "amount": 3970, "currency": "TWD", "paymentMethod": "CASH", "metadata": { "cashReceived": 5000, "changeGiven": 1030 } }`
- **Response 201**: `{ id, orderId, amount, paymentMethod, status: "PAID", paidAt }`
- **Event**: `Payment.Success`

### `POST /api/v1/payments/:paymentId/refund`
- **Auth**: Manager, Merchant, Admin
- **Body**: `{ "amount": 3970, "reason": "..." }`
- **Response 200**: `{ id, paymentId, amount, status: "REFUNDED", refundedAt }`
- **Event**: `Payment.Refunded`

---

## Authorization Service

### `POST /api/v1/auth/register` *(Public)*
- **Body**: `{ "email", "password", "name", "phone" }`
- **Response 201**: `{ userId, email, name, emailVerified: false }`
- **Side Effects**: Cognito user created; verification email sent

### `POST /api/v1/auth/login` *(Public)*
- **Body**: `{ "email", "password" }`
- **Response 200**: `{ accessToken, refreshToken, idToken, expiresIn: 3600, tokenType: "Bearer", user: { id, email, name, role } }`

### `POST /api/v1/auth/refresh` *(Public)*
- **Body**: `{ "refreshToken": "..." }`
- **Response 200**: `{ accessToken, expiresIn, tokenType }`

### `POST /api/v1/auth/logout`
- **Auth**: Required
- **Response 200**: `{ message: "Logged out successfully" }`

---

## User Profile Service

### `GET /api/v1/users/:userId`
- **Auth**: Required (User: own only; Staff: all)
- **Response 200**: `{ id, email, name, phone, preferences: { notifications: { email, sms, push }, language }, createdAt, updatedAt }`

### `PATCH /api/v1/users/:userId`
- **Auth**: Required (User: own only)
- **Body**: Partial `{ name, phone, preferences }`
- **Response 200**: Updated fields

### `GET /api/v1/users/:userId/orders`
- **Auth**: Required (User: own only)
- **Query**: `page`, `limit`, `status`
- **Response 200**: Paginated order history

---

## Store Service

### `GET /api/v1/stores/:storeId` *(Public)*
- **Cache**: Redis TTL 10 min
- **Response 200**: `{ id, name, description, address, phone, email, businessHours, isOpen, acceptingOrders, imageUrl, rating, totalReviews }`

### `POST /api/v1/stores`
- **Auth**: Merchant, Admin
- **Body**: `{ name, description, address, phone, email, businessHours }`
- **Response 201**: `{ id, name, createdAt }`
- **Event**: `Store.Created`

### `PATCH /api/v1/stores/:storeId`
- **Auth**: Manager, Merchant, Admin
- **Body**: Partial `{ name, description, address, phone, email, businessHours, imageUrl }`
- **Response 200**: Updated store object
- **Side Effect**: Invalidates `store:{storeId}` Redis cache
- **Event**: `Store.Updated`

### `PATCH /api/v1/stores/:storeId/status`
- **Auth**: Manager, Merchant, Admin
- **Body**: `{ "acceptingOrders": false, "reason": "..." }`
- **Response 200**: `{ id, acceptingOrders, updatedAt }`
- **Event**: `Store.StatusChanged`

---

## Device Service

### `POST /api/v1/devices`
- **Auth**: Manager, Merchant, Admin
- **Body**: `{ storeId, deviceType, name, iotEndpoint, certificateId }`
- **Response 201**: `{ id, storeId, deviceType, name, status: "OFFLINE" }`
- **Event**: `Device.Registered`

### `POST /api/v1/devices/:deviceId/print-jobs`
- **Auth**: Service-to-service or Manager/Merchant/Admin
- **Body**: `{ "jobType": "KITCHEN_LABEL|RECEIPT|REPORT", "orderId": "uuid", "content": { orderNumber, items, pickupTime, orderSource } }`
- **Response 201**: `{ id, deviceId, jobType, status: "QUEUED" }`
- **Side Effect**: SQS message queued for device

---

## Notification Service

### `POST /api/v1/notifications/send`
- **Auth**: Service-to-service or Manager/Merchant/Admin
- **Body**: `{ "userId": "uuid", "channels": ["EMAIL","PUSH","WEBSOCKET"], "template": "ORDER_CONFIRMATION", "data": { orderNumber, total, estimatedTime } }`
- **Response 202**: `{ notificationId, userId, channels, status: "QUEUED" }`
- **Side Effects**: SES (email), SNS (push), WebSocket (real-time)

---

## Out of Scope (v0.2.0)

- **CRM Service**: Loyalty points, coupons, tiers — hooks in `orders.discount` / `orders.discountReason`
- **Report Service**: Direct DB queries on `orders` for basic reporting
- **Delivery Platform Webhooks**: `orderSource` enum extensible for UBEREATS/FOODPANDA

---

## Implementation Constraints

1. All POST endpoints support `Idempotency-Key` header
2. All GET endpoints use Redis cache where documented
3. Publish EventBridge events as documented for each endpoint
4. Check RBAC matrix before processing any request
5. Return structured error with `code` + `message` + `details[]`
6. All monetary values in **cents** (integer)
7. All timestamps in **ISO 8601 UTC**
