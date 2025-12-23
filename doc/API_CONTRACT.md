# API Contract Specification

**Document Version**: 1.0  
**Last Updated**: December 21, 2025  
**Owner**: Simon Chou  
**Status**: Single Source of Truth (MVP + Inventory + POS Scope)

---

## Purpose

This document defines **ALL REST API endpoints** across the 12 backend microservices. It serves as the authoritative contract for API communication between frontend applications and backend services.

**Critical**: This is the **single source of truth** for API interfaces. All implementations MUST comply with this specification.

**Target Audience**: AI assistants implementing services, frontend developers, backend developers, QA engineers

---

## Table of Contents

1. [Global Standards](#global-standards)
2. [Authentication & Authorization](#authentication--authorization)
3. [Menu Service API](#menu-service-api)
4. [Order Service API](#order-service-api)
5. [Inventory Service API](#inventory-service-api)
6. [Payment Service API](#payment-service-api)
7. [Authorization Service API](#authorization-service-api)
8. [User Profile Service API](#user-profile-service-api)
9. [Store Service API](#store-service-api)
10. [Device Service API](#device-service-api)
11. [Notification Service API](#notification-service-api)
12. [CRM Service API](#crm-service-api)
13. [Report Service API](#report-service-api)
14. [Delivery Platform Webhooks API](#delivery-platform-webhooks-api)

---

## Global Standards

### Base URL

**Production**: `https://api.myonlineordering.com`  
**Staging**: `https://api-staging.myonlineordering.com`  
**Development**: `http://localhost:3000` (local API Gateway)

### API Versioning

All endpoints are versioned with `/api/v1/` prefix.

**Example**: `https://api.myonlineordering.com/api/v1/stores/123`

### Authentication

**Header**: `Authorization: Bearer {JWT_TOKEN}`

**JWT Token**:
- Issued by AWS Cognito
- Algorithm: RS256
- Expiration: 1 hour
- Refresh token: 30 days

**Example**:
```
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Request Format

**Content-Type**: `application/json`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {JWT_TOKEN}
X-Request-ID: {UUID} (optional, for tracing)
```

### Response Format

**Success Response**:
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2025-12-17T10:30:00Z"
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid order items",
    "details": [
      {
        "field": "items[0].quantity",
        "message": "Quantity must be greater than 0"
      }
    ]
  },
  "timestamp": "2025-12-17T10:30:00Z"
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PATCH, DELETE |
| 201 | Created | Successful POST (resource created) |
| 204 | No Content | Successful DELETE (no response body) |
| 400 | Bad Request | Validation error, malformed request |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Resource conflict (e.g., duplicate order) |
| 422 | Unprocessable Entity | Business logic error (e.g., out of stock) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Error Codes

Standard error codes used across all services:

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `OUT_OF_STOCK` | 422 | Item not available |
| `PAYMENT_FAILED` | 422 | Payment processing failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

### Pagination

**Query Parameters**:
```
GET /api/v1/orders?page=1&limit=20&sortBy=createdAt&sortOrder=desc
```

**Response**:
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrevious": false
  },
  "timestamp": "2025-12-17T10:30:00Z"
}
```

**Default Values**:
- `page`: 1
- `limit`: 20 (max: 100)
- `sortBy`: Primary key or `createdAt`
- `sortOrder`: `desc`

### Rate Limiting

**API Gateway Throttling**:
- **Burst**: 100 requests per second per IP
- **Sustained**: 50 requests per second per IP

**Headers**:
```
X-RateLimit-Limit: 50
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1702809600 (Unix timestamp)
```

---

## Authentication & Authorization

### Role-Based Access Control (RBAC)

| Role | Description | Access Level |
|------|-------------|-------------|
| `User` | Customer | Read menu, create orders, view own orders |
| `Cashier` | POS operator | Create orders, process payments, view store orders |
| `Manager` | Store manager | Full store management, reports, staff management |
| `Merchant` | Store owner | Full access to owned stores |
| `Admin` | System admin | System-wide access (internal only) |

### Permission Matrix

| Endpoint | User | Cashier | Manager | Merchant | Admin |
|----------|------|---------|---------|----------|-------|
| `GET /menu/:storeId` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /menu/items` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `POST /orders` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /orders/:id` | ✅ (own) | ✅ (store) | ✅ (store) | ✅ (owned stores) | ✅ |
| `PATCH /orders/:id/status` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `POST /stores` | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## Menu Service API

### Get Store Menu

**Endpoint**: `GET /api/v1/menu/:storeId`

**Description**: Retrieve the full menu for a specific store

**Authentication**: Optional (public endpoint)

**Path Parameters**:
- `storeId` (string, UUID): Store identifier

**Query Parameters**:
- `includeUnavailable` (boolean, optional): Include unavailable items (default: false)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "storeId": "550e8400-e29b-41d4-a716-446655440000",
    "storeName": "Joe's Pizza",
    "categories": [
      {
        "id": "cat-1",
        "name": "Pizza",
        "displayOrder": 1,
        "items": [
          {
            "id": "item-1",
            "name": "Margherita Pizza",
            "description": "Classic tomato, mozzarella, basil",
            "price": 12.99,
            "imageUrl": "https://cdn.example.com/menu/margherita.jpg",
            "isAvailable": true,
            "customizations": [
              {
                "id": "custom-1",
                "name": "Size",
                "type": "single_choice",
                "required": true,
                "options": [
                  { "id": "opt-1", "name": "Small (10\")", "priceModifier": 0 },
                  { "id": "opt-2", "name": "Medium (12\")", "priceModifier": 2.00 },
                  { "id": "opt-3", "name": "Large (14\")", "priceModifier": 4.00 }
                ]
              }
            ],
            "allergens": ["gluten", "dairy"],
            "tags": ["vegetarian", "popular"]
          }
        ]
      }
    ]
  },
  "timestamp": "2025-12-17T10:30:00Z"
}
```

**Caching**: Redis cache, TTL 5 minutes

---

### Create Menu Item

**Endpoint**: `POST /api/v1/menu/items`

**Description**: Add a new menu item

**Authentication**: Required (Manager, Merchant, Admin)

**Request Body**:
```json
{
  "storeId": "550e8400-e29b-41d4-a716-446655440000",
  "categoryId": "cat-1",
  "name": "Pepperoni Pizza",
  "description": "Tomato sauce, mozzarella, pepperoni",
  "price": 14.99,
  "imageUrl": "https://cdn.example.com/menu/pepperoni.jpg",
  "isAvailable": true,
  "customizations": [ ... ],
  "allergens": ["gluten", "dairy"],
  "tags": ["popular"]
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "item-2",
    "storeId": "550e8400-e29b-41d4-a716-446655440000",
    "categoryId": "cat-1",
    "name": "Pepperoni Pizza",
    "description": "Tomato sauce, mozzarella, pepperoni",
    "price": 14.99,
    "imageUrl": "https://cdn.example.com/menu/pepperoni.jpg",
    "isAvailable": true,
    "customizations": [ ... ],
    "allergens": ["gluten", "dairy"],
    "tags": ["popular"],
    "createdAt": "2025-12-17T10:30:00Z",
    "updatedAt": "2025-12-17T10:30:00Z"
  },
  "timestamp": "2025-12-17T10:30:00Z"
}
```

**Events Published**: `Menu.ItemCreated`

---

### Update Menu Item

**Endpoint**: `PATCH /api/v1/menu/items/:itemId`

**Description**: Update an existing menu item

**Authentication**: Required (Manager, Merchant, Admin)

**Path Parameters**:
- `itemId` (string, UUID): Item identifier

**Request Body** (partial update):
```json
{
  "name": "Pepperoni Pizza (New Recipe)",
  "price": 15.99,
  "isAvailable": false
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "item-2",
    "name": "Pepperoni Pizza (New Recipe)",
    "price": 15.99,
    "isAvailable": false,
    "updatedAt": "2025-12-17T11:00:00Z"
  },
  "timestamp": "2025-12-17T11:00:00Z"
}
```

**Events Published**: `Menu.ItemUpdated`

**Side Effects**: Invalidates Redis cache for `menu:{storeId}`

---

### Delete Menu Item

**Endpoint**: `DELETE /api/v1/menu/items/:itemId`

**Description**: Soft delete a menu item (sets isDeleted = true)

**Authentication**: Required (Manager, Merchant, Admin)

**Path Parameters**:
- `itemId` (string, UUID): Item identifier

**Response** (204 No Content)

**Events Published**: `Menu.ItemDeleted`

---

### Update Item Availability

**Endpoint**: `PATCH /api/v1/menu/items/:itemId/availability`

**Description**: Quickly toggle item availability (for sold-out scenarios)

**Authentication**: Required (Cashier, Manager, Merchant, Admin)

**Path Parameters**:
- `itemId` (string, UUID): Item identifier

**Request Body**:
```json
{
  "isAvailable": false
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "item-2",
    "isAvailable": false,
    "updatedAt": "2025-12-17T11:15:00Z"
  },
  "timestamp": "2025-12-17T11:15:00Z"
}
```

**Events Published**: `Item.SoldOut` or `Item.BackInStock`

---

## Order Service API

### Create Order

**Endpoint**: `POST /api/v1/orders`

**Description**: Create a new order

**Authentication**: Required (User, Cashier, Manager, Merchant, Admin)

**Request Body**:
```json
{
  "storeId": "550e8400-e29b-41d4-a716-446655440000",
  "orderSource": "USER_CLIENT",
  "orderType": "DELIVERY",
  "items": [
    {
      "menuItemId": "item-1",
      "quantity": 2,
      "customizations": [
        {
          "customizationId": "custom-1",
          "selectedOptions": ["opt-3"]
        }
      ],
      "specialInstructions": "Extra cheese"
    }
  ],
  "deliveryAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "phone": "+1234567890"
  },
  "scheduledPickupTime": "2025-12-17T12:00:00Z",
  "notes": "Please ring doorbell"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "order-123",
    "orderNumber": "ORD-20251217-001",
    "storeId": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user-456",
    "orderSource": "USER_CLIENT",
    "orderType": "DELIVERY",
    "status": "PENDING",
    "items": [ ... ],
    "subtotal": 29.98,
    "tax": 2.40,
    "deliveryFee": 3.00,
    "discount": 0.00,
    "discountReason": null,
    "total": 35.38,
    "deliveryAddress": { ... },
    "scheduledPickupTime": "2025-12-17T12:00:00Z",
    "notes": "Please ring doorbell",
    "createdAt": "2025-12-17T10:45:00Z",
    "updatedAt": "2025-12-17T10:45:00Z"
  },
  "timestamp": "2025-12-17T10:45:00Z"
}
```

**Validation**:
- All menu items must exist and be available
- Inventory must be sufficient (checked via Inventory Service)
- Delivery address required for DELIVERY orders
- Scheduled pickup time must be in future

**Events Published**: `Order.Created`

**Side Effects**: 
- Inventory reservation (Redis lock, 10-minute TTL)

**Notes**:
- For v0.2.0: Discounts are applied manually through POS/Manager override (stored in `discount` and `discountReason` fields)
- Future versions: Automated coupon validation will be integrated

---

### Get Order by ID

**Endpoint**: `GET /api/v1/orders/:orderId`

**Description**: Retrieve order details

**Authentication**: Required

**Authorization**:
- **User**: Can only view own orders
- **Cashier/Manager**: Can view store orders
- **Merchant**: Can view orders for owned stores
- **Admin**: Can view all orders

**Path Parameters**:
- `orderId` (string, UUID): Order identifier

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "order-123",
    "orderNumber": "ORD-20251217-001",
    "storeId": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user-456",
    "orderSource": "USER_CLIENT",
    "orderType": "DELIVERY",
    "status": "PREPARING",
    "items": [
      {
        "id": "order-item-1",
        "menuItemId": "item-1",
        "menuItemName": "Margherita Pizza",
        "quantity": 2,
        "unitPrice": 16.99,
        "subtotal": 33.98,
        "customizations": [ ... ],
        "specialInstructions": "Extra cheese"
      }
    ],
    "subtotal": 33.98,
    "tax": 2.72,
    "deliveryFee": 3.00,
    "total": 39.70,
    "payment": {
      "id": "payment-789",
      "status": "PAID",
      "method": "CARD",
      "last4": "4242",
      "paidAt": "2025-12-17T10:46:00Z"
    },
    "deliveryAddress": { ... },
    "scheduledPickupTime": "2025-12-17T12:00:00Z",
    "statusHistory": [
      { "status": "PENDING", "timestamp": "2025-12-17T10:45:00Z" },
      { "status": "PAID", "timestamp": "2025-12-17T10:46:00Z" },
      { "status": "PREPARING", "timestamp": "2025-12-17T10:50:00Z" }
    ],
    "createdAt": "2025-12-17T10:45:00Z",
    "updatedAt": "2025-12-17T10:50:00Z"
  },
  "timestamp": "2025-12-17T11:00:00Z"
}
```

---

### List Orders

**Endpoint**: `GET /api/v1/orders`

**Description**: List orders with pagination and filters

**Authentication**: Required

**Query Parameters**:
- `storeId` (string, UUID, optional): Filter by store
- `userId` (string, UUID, optional): Filter by user
- `status` (string, optional): Filter by status (PENDING, PAID, PREPARING, READY, COMPLETED, CANCELLED)
- `orderSource` (string, optional): Filter by source (USER_CLIENT, KIOSK, POS, UBEREATS, FOODPANDA)
- `startDate` (ISO 8601, optional): Filter orders after this date
- `endDate` (ISO 8601, optional): Filter orders before this date
- `page` (number, optional, default: 1)
- `limit` (number, optional, default: 20, max: 100)
- `sortBy` (string, optional, default: createdAt)
- `sortOrder` (string, optional, default: desc)

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "order-123",
      "orderNumber": "ORD-20251217-001",
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "storeName": "Joe's Pizza",
      "userId": "user-456",
      "customerName": "John Doe",
      "status": "PREPARING",
      "total": 39.70,
      "orderType": "DELIVERY",
      "orderSource": "USER_CLIENT",
      "createdAt": "2025-12-17T10:45:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrevious": false
  },
  "timestamp": "2025-12-17T11:00:00Z"
}
```

---

### Update Order Status

**Endpoint**: `PATCH /api/v1/orders/:orderId/status`

**Description**: Update order status (state machine transition)

**Authentication**: Required (Cashier, Manager, Merchant, Admin)

**Path Parameters**:
- `orderId` (string, UUID): Order identifier

**Request Body**:
```json
{
  "status": "PREPARING",
  "notes": "Started cooking at 11:00 AM"
}
```

**Valid Status Transitions**:
```
PENDING → PAID → PREPARING → READY → COMPLETED
        ↘ CANCELLED (from any status except COMPLETED)
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "order-123",
    "status": "PREPARING",
    "statusHistory": [
      { "status": "PENDING", "timestamp": "2025-12-17T10:45:00Z" },
      { "status": "PAID", "timestamp": "2025-12-17T10:46:00Z" },
      { "status": "PREPARING", "timestamp": "2025-12-17T11:00:00Z", "notes": "Started cooking at 11:00 AM" }
    ],
    "updatedAt": "2025-12-17T11:00:00Z"
  },
  "timestamp": "2025-12-17T11:00:00Z"
}
```

**Events Published**: `Order.StatusChanged`

**Side Effects**: 
- Status PREPARING → triggers kitchen label print job
- Status COMPLETED → commits inventory deduction, awards loyalty points

---

### Cancel Order

**Endpoint**: `POST /api/v1/orders/:orderId/cancel`

**Description**: Cancel an order (with optional refund)

**Authentication**: Required

**Authorization**:
- **User**: Can cancel own orders if status is PENDING or PAID
- **Cashier/Manager/Merchant**: Can cancel store orders

**Path Parameters**:
- `orderId` (string, UUID): Order identifier

**Request Body**:
```json
{
  "reason": "Customer requested cancellation",
  "refund": true
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "order-123",
    "status": "CANCELLED",
    "cancelledAt": "2025-12-17T11:05:00Z",
    "cancelReason": "Customer requested cancellation",
    "refundStatus": "REFUNDED"
  },
  "timestamp": "2025-12-17T11:05:00Z"
}
```

**Events Published**: `Order.Cancelled`

**Side Effects**: 
- Release inventory reservation
- Process refund (if paid)
- Reverse loyalty points (if awarded)

---

## Inventory Service API

### Get Inventory Status

**Endpoint**: `GET /api/v1/inventory/:itemId`

**Description**: Get current stock level for a menu item

**Authentication**: Required (Cashier, Manager, Merchant, Admin)

**Path Parameters**:
- `itemId` (string, UUID): Menu item identifier

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "itemId": "item-1",
    "itemName": "Margherita Pizza",
    "stockCount": 25,
    "reservedCount": 5,
    "availableCount": 20,
    "lowStockThreshold": 10,
    "isLowStock": false,
    "lastUpdated": "2025-12-17T10:30:00Z"
  },
  "timestamp": "2025-12-17T11:00:00Z"
}
```

---

### Update Inventory

**Endpoint**: `PATCH /api/v1/inventory/:itemId`

**Description**: Update stock count (manual adjustment)

**Authentication**: Required (Manager, Merchant, Admin)

**Path Parameters**:
- `itemId` (string, UUID): Menu item identifier

**Request Body**:
```json
{
  "stockCount": 50,
  "lowStockThreshold": 10,
  "reason": "Daily stock replenishment"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "itemId": "item-1",
    "stockCount": 50,
    "lowStockThreshold": 10,
    "updatedAt": "2025-12-17T11:10:00Z"
  },
  "timestamp": "2025-12-17T11:10:00Z"
}
```

**Events Published**: `Stock.Updated`, potentially `Item.BackInStock`

**Side Effects**: Inventory history log created

---

### Reserve Inventory (Internal)

**Endpoint**: `POST /api/v1/inventory/reserve`

**Description**: Reserve stock for an order (internal use, called by Order Service)

**Authentication**: Required (Service-to-service)

**Request Body**:
```json
{
  "orderId": "order-123",
  "items": [
    {
      "itemId": "item-1",
      "quantity": 2
    }
  ]
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "reservationId": "res-456",
    "orderId": "order-123",
    "items": [
      {
        "itemId": "item-1",
        "quantity": 2,
        "reserved": true
      }
    ],
    "expiresAt": "2025-12-17T11:20:00Z"
  },
  "timestamp": "2025-12-17T11:10:00Z"
}
```

**Error** (422 Unprocessable Entity - Out of Stock):
```json
{
  "success": false,
  "error": {
    "code": "OUT_OF_STOCK",
    "message": "Insufficient inventory",
    "details": [
      {
        "itemId": "item-1",
        "requested": 2,
        "available": 1
      }
    ]
  },
  "timestamp": "2025-12-17T11:10:00Z"
}
```

**Events Published**: `Stock.Reserved`

**Side Effects**: 
- Redis lock: `lock:inventory:{itemId}` (TTL 10 minutes)
- Temporary stock reservation

---

### Commit Inventory Reservation (Internal)

**Endpoint**: `POST /api/v1/inventory/commit`

**Description**: Permanently deduct reserved stock (called when order is completed)

**Authentication**: Required (Service-to-service)

**Request Body**:
```json
{
  "reservationId": "res-456",
  "orderId": "order-123"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "reservationId": "res-456",
    "committed": true,
    "timestamp": "2025-12-17T12:30:00Z"
  },
  "timestamp": "2025-12-17T12:30:00Z"
}
```

**Events Published**: `Stock.Committed`

**Side Effects**: 
- Release Redis lock
- Permanent stock deduction in PostgreSQL
- Check low stock threshold → publish `Stock.LowAlert` if needed

---

## Payment Service API

### Create Payment Intent

**Endpoint**: `POST /api/v1/payments/create-intent`

**Description**: Create a Stripe PaymentIntent for client-side payment processing

**Authentication**: Required (User, Cashier, Manager, Merchant, Admin)

**Request Body**:
```json
{
  "orderId": "order-123",
  "amount": 3970,
  "currency": "usd"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "paymentIntentId": "pi_1234567890",
    "clientSecret": "pi_1234567890_secret_abcdefg",
    "amount": 3970,
    "currency": "usd",
    "orderId": "order-123",
    "createdAt": "2025-12-17T11:15:00Z"
  },
  "timestamp": "2025-12-17T11:15:00Z"
}
```

**Side Effects**: Stripe PaymentIntent created

---

### Process Payment (POS)

**Endpoint**: `POST /api/v1/payments/charge`

**Description**: Directly charge a payment (for POS cash/card terminal)

**Authentication**: Required (Cashier, Manager, Merchant, Admin)

**Request Body**:
```json
{
  "orderId": "order-123",
  "amount": 3970,
  "currency": "usd",
  "paymentMethod": "CASH",
  "metadata": {
    "cashReceived": 5000,
    "changeGiven": 1030
  }
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "payment-789",
    "orderId": "order-123",
    "amount": 3970,
    "currency": "usd",
    "paymentMethod": "CASH",
    "status": "PAID",
    "paidAt": "2025-12-17T11:20:00Z"
  },
  "timestamp": "2025-12-17T11:20:00Z"
}
```

**Events Published**: `Payment.Success`

---

### Refund Payment

**Endpoint**: `POST /api/v1/payments/:paymentId/refund`

**Description**: Refund a payment (full or partial)

**Authentication**: Required (Manager, Merchant, Admin)

**Path Parameters**:
- `paymentId` (string, UUID): Payment identifier

**Request Body**:
```json
{
  "amount": 3970,
  "reason": "Customer cancellation"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "refund-101",
    "paymentId": "payment-789",
    "amount": 3970,
    "status": "REFUNDED",
    "reason": "Customer cancellation",
    "refundedAt": "2025-12-17T11:25:00Z"
  },
  "timestamp": "2025-12-17T11:25:00Z"
}
```

**Events Published**: `Payment.Refunded`

---

## Authorization Service API

### Register User

**Endpoint**: `POST /api/v1/auth/register`

**Description**: Register a new user (Cognito User Pool + PostgreSQL user record)

**Authentication**: None (public endpoint)

**Request Body**:
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "phone": "+1234567890"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "userId": "user-456",
    "email": "john@example.com",
    "name": "John Doe",
    "emailVerified": false,
    "createdAt": "2025-12-17T11:30:00Z"
  },
  "timestamp": "2025-12-17T11:30:00Z"
}
```

**Side Effects**: 
- Cognito user created
- PostgreSQL user record created (via Cognito pre-signup trigger)
- Verification email sent

---

### Login

**Endpoint**: `POST /api/v1/auth/login`

**Description**: Authenticate user and obtain JWT tokens

**Authentication**: None (public endpoint)

**Request Body**:
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "idToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "tokenType": "Bearer",
    "user": {
      "id": "user-456",
      "email": "john@example.com",
      "name": "John Doe",
      "role": "User"
    }
  },
  "timestamp": "2025-12-17T11:35:00Z"
}
```

---

### Refresh Token

**Endpoint**: `POST /api/v1/auth/refresh`

**Description**: Refresh access token using refresh token

**Authentication**: None (uses refresh token)

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "tokenType": "Bearer"
  },
  "timestamp": "2025-12-17T11:40:00Z"
}
```

---

### Logout

**Endpoint**: `POST /api/v1/auth/logout`

**Description**: Invalidate tokens

**Authentication**: Required

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  },
  "timestamp": "2025-12-17T11:45:00Z"
}
```

---

## User Profile Service API

### Get User Profile

**Endpoint**: `GET /api/v1/users/:userId`

**Description**: Retrieve user profile

**Authentication**: Required

**Authorization**: User can only view own profile, staff can view all

**Path Parameters**:
- `userId` (string, UUID): User identifier

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "user-456",
    "email": "john@example.com",
    "name": "John Doe",
    "phone": "+1234567890",
    "savedAddresses": [
      {
        "id": "addr-1",
        "label": "Home",
        "street": "123 Main St",
        "city": "New York",
        "state": "NY",
        "zipCode": "10001",
        "isDefault": true
      }
    ],
    "preferences": {
      "notifications": {
        "email": true,
        "sms": false,
        "push": true
      },
      "language": "en"
    },
    "createdAt": "2025-12-17T11:30:00Z",
    "updatedAt": "2025-12-17T11:30:00Z"
  },
  "timestamp": "2025-12-17T12:00:00Z"
}
```

---

### Update User Profile

**Endpoint**: `PATCH /api/v1/users/:userId`

**Description**: Update user profile

**Authentication**: Required

**Authorization**: User can only update own profile

**Path Parameters**:
- `userId` (string, UUID): User identifier

**Request Body**:
```json
{
  "name": "John Michael Doe",
  "phone": "+1234567891",
  "preferences": {
    "notifications": {
      "email": true,
      "sms": true,
      "push": true
    }
  }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "user-456",
    "name": "John Michael Doe",
    "phone": "+1234567891",
    "updatedAt": "2025-12-17T12:05:00Z"
  },
  "timestamp": "2025-12-17T12:05:00Z"
}
```

---

### Get User Order History

**Endpoint**: `GET /api/v1/users/:userId/orders`

**Description**: Retrieve user's order history

**Authentication**: Required

**Authorization**: User can only view own orders

**Path Parameters**:
- `userId` (string, UUID): User identifier

**Query Parameters**:
- `page` (number, optional, default: 1)
- `limit` (number, optional, default: 20)
- `status` (string, optional): Filter by order status

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "order-123",
      "orderNumber": "ORD-20251217-001",
      "storeName": "Joe's Pizza",
      "status": "COMPLETED",
      "total": 39.70,
      "orderType": "DELIVERY",
      "createdAt": "2025-12-17T10:45:00Z",
      "completedAt": "2025-12-17T12:15:00Z"
    }
  ],
  "pagination": { ... },
  "timestamp": "2025-12-17T12:10:00Z"
}
```

---

## Store Service API

### Get Store Details

**Endpoint**: `GET /api/v1/stores/:storeId`

**Description**: Retrieve store information

**Authentication**: Optional (public endpoint)

**Path Parameters**:
- `storeId` (string, UUID): Store identifier

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Joe's Pizza",
    "description": "Best pizza in town",
    "address": {
      "street": "456 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10002",
      "coordinates": {
        "lat": 40.7128,
        "lng": -74.0060
      }
    },
    "phone": "+1234567890",
    "email": "contact@joespizza.com",
    "businessHours": [
      {
        "day": "monday",
        "open": "10:00",
        "close": "22:00",
        "isOpen": true
      }
    ],
    "deliveryZones": [
      {
        "id": "zone-1",
        "name": "Downtown",
        "radius": 5.0,
        "deliveryFee": 3.00
      }
    ],
    "isOpen": true,
    "acceptingOrders": true,
    "imageUrl": "https://cdn.example.com/stores/joes-pizza.jpg",
    "rating": 4.7,
    "totalReviews": 234,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-12-17T10:00:00Z"
  },
  "timestamp": "2025-12-17T12:15:00Z"
}
```

**Caching**: Redis cache, TTL 10 minutes

---

### Create Store

**Endpoint**: `POST /api/v1/stores`

**Description**: Create a new store

**Authentication**: Required (Merchant, Admin)

**Request Body**:
```json
{
  "name": "Joe's Pizza",
  "description": "Best pizza in town",
  "address": {
    "street": "456 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10002",
    "coordinates": {
      "lat": 40.7128,
      "lng": -74.0060
    }
  },
  "phone": "+1234567890",
  "email": "contact@joespizza.com",
  "businessHours": [ ... ],
  "deliveryZones": [ ... ]
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Joe's Pizza",
    "createdAt": "2025-12-17T12:20:00Z"
  },
  "timestamp": "2025-12-17T12:20:00Z"
}
```

**Events Published**: `Store.Created`

---

### Update Store Status

**Endpoint**: `PATCH /api/v1/stores/:storeId/status`

**Description**: Update store online/offline status

**Authentication**: Required (Manager, Merchant, Admin)

**Path Parameters**:
- `storeId` (string, UUID): Store identifier

**Request Body**:
```json
{
  "acceptingOrders": false,
  "reason": "Temporary closure for maintenance"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "acceptingOrders": false,
    "updatedAt": "2025-12-17T12:25:00Z"
  },
  "timestamp": "2025-12-17T12:25:00Z"
}
```

**Events Published**: `Store.StatusChanged`

---

## Device Service API

### Register Device

**Endpoint**: `POST /api/v1/devices`

**Description**: Register a new hardware device (printer, card reader, etc.)

**Authentication**: Required (Manager, Merchant, Admin)

**Request Body**:
```json
{
  "storeId": "550e8400-e29b-41d4-a716-446655440000",
  "deviceType": "RECEIPT_PRINTER",
  "name": "Kitchen Printer",
  "iotEndpoint": "a1b2c3d4e5f6g7.iot.us-east-1.amazonaws.com",
  "certificateId": "cert-123456"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "device-789",
    "storeId": "550e8400-e29b-41d4-a716-446655440000",
    "deviceType": "RECEIPT_PRINTER",
    "name": "Kitchen Printer",
    "status": "ONLINE",
    "createdAt": "2025-12-17T12:30:00Z"
  },
  "timestamp": "2025-12-17T12:30:00Z"
}
```

**Events Published**: `Device.Registered`

---

### Create Print Job

**Endpoint**: `POST /api/v1/devices/:deviceId/print-jobs`

**Description**: Queue a print job for a device

**Authentication**: Required (Service-to-service or Manager/Merchant/Admin)

**Path Parameters**:
- `deviceId` (string, UUID): Device identifier

**Request Body**:
```json
{
  "jobType": "KITCHEN_LABEL",
  "orderId": "order-123",
  "content": {
    "orderNumber": "ORD-20251217-001",
    "items": [
      {
        "name": "Margherita Pizza (Large)",
        "quantity": 2,
        "specialInstructions": "Extra cheese"
      }
    ],
    "pickupTime": "2025-12-17T12:00:00Z",
    "orderSource": "USER_CLIENT"
  }
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "job-456",
    "deviceId": "device-789",
    "jobType": "KITCHEN_LABEL",
    "status": "QUEUED",
    "createdAt": "2025-12-17T12:35:00Z"
  },
  "timestamp": "2025-12-17T12:35:00Z"
}
```

**Side Effects**: SQS message queued for device

---

## Notification Service API

### Send Notification

**Endpoint**: `POST /api/v1/notifications/send`

**Description**: Send notification via multiple channels

**Authentication**: Required (Service-to-service or Manager/Merchant/Admin)

**Request Body**:
```json
{
  "userId": "user-456",
  "channels": ["EMAIL", "PUSH", "WEBSOCKET"],
  "template": "ORDER_CONFIRMATION",
  "data": {
    "orderNumber": "ORD-20251217-001",
    "total": 39.70,
    "estimatedTime": "30 minutes"
  }
}
```

**Response** (202 Accepted):
```json
{
  "success": true,
  "data": {
    "notificationId": "notif-789",
    "userId": "user-456",
    "channels": ["EMAIL", "PUSH", "WEBSOCKET"],
    "status": "QUEUED",
    "createdAt": "2025-12-17T12:40:00Z"
  },
  "timestamp": "2025-12-17T12:40:00Z"
}
```

**Side Effects**: 
- Email sent via SES
- Push notification sent via SNS Mobile
- WebSocket message pushed to connected clients

---

## CRM Service API

**Status**: Out of scope for v0.2.0 (MVP + Inventory + POS)

**Future Features**:
- Loyalty Points Management
- Coupon Creation and Validation
- Customer Tier Tracking
- Referral System

**Extensibility**: Order schema includes `discount` and `discountReason` fields as integration hooks for future automated coupon system.

---

## Report Service API

**Status**: Out of scope for v0.2.0 (MVP + Inventory + POS)

**Future Features**:
- Sales Analytics and Dashboards
- Inventory Reports
- Customer Behavior Analysis
- Z-Reports for daily reconciliation

**Current Approach**: Basic reporting through direct database queries on Orders table with `startDate`, `endDate`, `status` filters.

---

## Delivery Platform Webhooks API

**Status**: Out of scope for v0.2.0 (MVP + Inventory + POS)

**Future Features**:
- UberEats Order Import
- Foodpanda Order Import
- Menu Synchronization
- Real-time Status Updates

**Extensibility**: OrderSource enum can be extended to include `UBEREATS` and `FOODPANDA` in future versions.

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-21 | Simon Chou | Initial Baseline (Scope: v0.2.0 MVP + Inventory + POS) |

---

## Notes for AI Implementation

1. **Validation**: All request bodies MUST be validated against JSON schemas
2. **Error Handling**: Use standard error codes from Global Standards section
3. **Idempotency**: All POST endpoints should support idempotency keys (header: `Idempotency-Key`)
4. **Rate Limiting**: Respect API Gateway throttling limits
5. **Caching**: Use Redis for GET endpoints where specified
6. **Events**: Publish EventBridge events as documented
7. **Authorization**: Check permissions against RBAC matrix
8. **Tracing**: Include X-Ray tracing for all Lambda functions
9. **Logging**: Log all requests/responses in structured JSON format
10. **OpenAPI**: This specification should be converted to OpenAPI 3.0 YAML for Swagger documentation
