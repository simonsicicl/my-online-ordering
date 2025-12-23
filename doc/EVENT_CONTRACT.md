# Event Contract Specification

**Document Version**: 1.0  
**Last Updated**: December 21, 2025  
**Owner**: Simon Chou  
**Status**: Single Source of Truth (MVP + Inventory + POS Scope)

---

## Purpose

This document defines **ALL EventBridge events** published and consumed across the 12 backend microservices. It serves as the authoritative contract for asynchronous event-driven communication.

**Critical**: This is the **single source of truth** for event schemas. All event publishers and subscribers MUST comply with this specification.

**Target Audience**: AI assistants implementing services, backend developers, integration engineers

---

## Table of Contents

1. [Global Event Standards](#global-event-standards)
2. [Menu Service Events](#menu-service-events)
3. [Order Service Events](#order-service-events)
4. [Inventory Service Events](#inventory-service-events)
5. [Payment Service Events](#payment-service-events)
6. [Store Service Events](#store-service-events)
7. [Device Service Events](#device-service-events)
8. [CRM Service Events](#crm-service-events)
9. [Delivery Platform Events](#delivery-platform-events)
10. [Event Routing Rules](#event-routing-rules)

---

## Global Event Standards

### Event Bus

**Event Bus Name**: `my-ordering-system-event-bus`

**Regions**: 
- Primary: `us-east-1`
- DR: `us-west-2`

### Event Structure

All events follow AWS EventBridge standard format:

```json
{
  "version": "0",
  "id": "unique-event-id",
  "detail-type": "Menu.ItemCreated",
  "source": "com.myorderingsystem.menu",
  "account": "123456789012",
  "time": "2025-12-17T10:30:00Z",
  "region": "us-east-1",
  "resources": [],
  "detail": {
    "eventVersion": "1.0",
    "eventId": "evt-550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2025-12-17T10:30:00Z",
    "aggregateId": "item-123",
    "aggregateType": "MenuItem",
    "eventData": {
      // Event-specific payload
    },
    "metadata": {
      "userId": "user-456",
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "correlationId": "order-789",
      "causationId": "evt-parent-event-id",
      "source": "menu-create-handler"
    }
  }
}
```

### Event Naming Convention

**Format**: `{Domain}.{Entity}{Action}`

**Examples**:
- `Menu.ItemCreated`
- `Order.StatusChanged`
- `Payment.Success`
- `Stock.LowAlert`

### Event Versioning

**Event Version**: Included in `detail.eventVersion` (e.g., "1.0", "1.1")

**Breaking Changes**: New event type with version suffix (e.g., `Order.Created` → `Order.CreatedV2`)

### Metadata Standards

All events MUST include the following metadata fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `eventId` | UUID | Yes | Unique event identifier |
| `timestamp` | ISO 8601 | Yes | Event creation timestamp |
| `aggregateId` | String | Yes | ID of the entity (e.g., order ID, item ID) |
| `aggregateType` | String | Yes | Type of entity (e.g., Order, MenuItem) |
| `userId` | UUID | If applicable | User who triggered the event |
| `storeId` | UUID | If applicable | Store context |
| `correlationId` | String | If applicable | ID to trace related events (e.g., orderId) |
| `causationId` | UUID | If applicable | ID of parent event that caused this event |
| `source` | String | Yes | Lambda function name that published the event |

### Event Retry Policy

**SQS Consumer**:
- Max retries: 3
- Backoff: Exponential (1s, 2s, 4s)
- Dead Letter Queue (DLQ): `event-processing-dlq`

**Lambda Consumer**:
- Max retries: 2 (AWS Lambda async invocation default)
- DLQ: Lambda-specific DLQ

### Idempotency

**Consumer Requirement**: All event consumers MUST be idempotent

**Idempotency Key**: Use `detail.eventId` as idempotency key

**Redis Check**:
```
Key: idempotency:event:{eventId}
TTL: 24 hours
Value: "processed"
```

---

## Menu Service Events

### Menu.ItemCreated

**Detail Type**: `Menu.ItemCreated`  
**Source**: `com.myorderingsystem.menu`

**Published By**: `menu-create-handler` Lambda

**Consumed By**:
- Delivery Platform Webhooks Service (sync menu to UberEats/Foodpanda)
- Report Service (update analytics)

**Event Schema**:
```json
{
  "detail-type": "Menu.ItemCreated",
  "source": "com.myorderingsystem.menu",
  "detail": {
    "eventVersion": "1.0",
    "eventId": "evt-550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2025-12-17T10:30:00Z",
    "aggregateId": "item-123",
    "aggregateType": "MenuItem",
    "eventData": {
      "id": "item-123",
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "categoryId": "cat-1",
      "name": "Margherita Pizza",
      "description": "Classic tomato, mozzarella, basil",
      "price": 12.99,
      "imageUrl": "https://cdn.example.com/menu/margherita.jpg",
      "isAvailable": true,
      "customizations": [ ... ],
      "allergens": ["gluten", "dairy"],
      "tags": ["vegetarian", "popular"]
    },
    "metadata": {
      "userId": "user-manager-123",
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "source": "menu-create-handler"
    }
  }
}
```

---

### Menu.ItemUpdated

**Detail Type**: `Menu.ItemUpdated`  
**Source**: `com.myorderingsystem.menu`

**Published By**: `menu-update-handler` Lambda

**Consumed By**:
- Delivery Platform Webhooks Service (sync updates to platforms)
- Notification Service (notify subscribed customers if major change)

**Event Schema**:
```json
{
  "detail-type": "Menu.ItemUpdated",
  "source": "com.myorderingsystem.menu",
  "detail": {
    "eventVersion": "1.0",
    "eventId": "evt-550e8400-e29b-41d4-a716-446655440001",
    "timestamp": "2025-12-17T11:00:00Z",
    "aggregateId": "item-123",
    "aggregateType": "MenuItem",
    "eventData": {
      "id": "item-123",
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "changes": {
        "price": {
          "old": 12.99,
          "new": 13.99
        },
        "name": {
          "old": "Margherita Pizza",
          "new": "Margherita Pizza (Premium)"
        }
      },
      "updatedFields": ["price", "name"],
      "currentData": {
        "id": "item-123",
        "name": "Margherita Pizza (Premium)",
        "price": 13.99,
        "isAvailable": true
      }
    },
    "metadata": {
      "userId": "user-manager-123",
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "source": "menu-update-handler"
    }
  }
}
```

---

### Menu.ItemDeleted

**Detail Type**: `Menu.ItemDeleted`  
**Source**: `com.myorderingsystem.menu`

**Published By**: `menu-delete-handler` Lambda

**Consumed By**:
- Delivery Platform Webhooks Service (remove from platforms)
- Inventory Service (mark stock as inactive)

**Event Schema**:
```json
{
  "detail-type": "Menu.ItemDeleted",
  "source": "com.myorderingsystem.menu",
  "detail": {
    "eventVersion": "1.0",
    "eventId": "evt-550e8400-e29b-41d4-a716-446655440002",
    "timestamp": "2025-12-17T11:15:00Z",
    "aggregateId": "item-123",
    "aggregateType": "MenuItem",
    "eventData": {
      "id": "item-123",
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Margherita Pizza (Premium)",
      "deletedAt": "2025-12-17T11:15:00Z"
    },
    "metadata": {
      "userId": "user-manager-123",
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "source": "menu-delete-handler"
    }
  }
}
```

---

### Item.SoldOut

**Detail Type**: `Item.SoldOut`  
**Source**: `com.myorderingsystem.menu`

**Published By**: `menu-availability-handler` Lambda

**Consumed By**:
- Delivery Platform Webhooks Service (mark unavailable on platforms)
- Notification Service (notify customers with item in saved favorites)

**Event Schema**:
```json
{
  "detail-type": "Item.SoldOut",
  "source": "com.myorderingsystem.menu",
  "detail": {
    "eventVersion": "1.0",
    "eventId": "evt-550e8400-e29b-41d4-a716-446655440003",
    "timestamp": "2025-12-17T11:30:00Z",
    "aggregateId": "item-123",
    "aggregateType": "MenuItem",
    "eventData": {
      "id": "item-123",
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Margherita Pizza (Premium)",
      "isAvailable": false,
      "reason": "Out of stock"
    },
    "metadata": {
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "source": "menu-availability-handler"
    }
  }
}
```

---

### Item.BackInStock

**Detail Type**: `Item.BackInStock`  
**Source**: `com.myorderingsystem.menu`

**Published By**: `menu-availability-handler` Lambda

**Consumed By**:
- Delivery Platform Webhooks Service (mark available on platforms)
- Notification Service (notify subscribed customers)

**Event Schema**:
```json
{
  "detail-type": "Item.BackInStock",
  "source": "com.myorderingsystem.menu",
  "detail": {
    "eventVersion": "1.0",
    "eventId": "evt-550e8400-e29b-41d4-a716-446655440004",
    "timestamp": "2025-12-17T12:00:00Z",
    "aggregateId": "item-123",
    "aggregateType": "MenuItem",
    "eventData": {
      "id": "item-123",
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Margherita Pizza (Premium)",
      "isAvailable": true
    },
    "metadata": {
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "source": "menu-availability-handler"
    }
  }
}
```

---

## Order Service Events

### Order.Created

**Detail Type**: `Order.Created`  
**Source**: `com.myorderingsystem.order`

**Published By**: `order-create-handler` Lambda

**Consumed By**:
- Notification Service (send order confirmation)
- Inventory Service (reserve stock)
- CRM Service (calculate loyalty points eligibility)
- Report Service (update analytics)
- Device Service (queue kitchen label print job)

**Event Schema**:
```json
{
  "detail-type": "Order.Created",
  "source": "com.myorderingsystem.order",
  "detail": {
    "eventVersion": "1.0",
    "eventId": "evt-order-created-001",
    "timestamp": "2025-12-17T10:45:00Z",
    "aggregateId": "order-123",
    "aggregateType": "Order",
    "eventData": {
      "id": "order-123",
      "orderNumber": "ORD-20251217-001",
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "user-456",
      "orderSource": "USER_CLIENT",
      "orderType": "DELIVERY",
      "status": "PENDING",
      "items": [
        {
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
      "deliveryAddress": { ... },
      "scheduledPickupTime": "2025-12-17T12:00:00Z",
      "notes": "Please ring doorbell"
    },
    "metadata": {
      "userId": "user-456",
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "correlationId": "order-123",
      "source": "order-create-handler"
    }
  }
}
```

---

### Order.StatusChanged

**Detail Type**: `Order.StatusChanged`  
**Source**: `com.myorderingsystem.order`

**Published By**: `order-update-status-handler` Lambda

**Consumed By**:
- Notification Service (push status update to customer)
- KDS (update kitchen display)
- Report Service (track order lifecycle)
- Inventory Service (commit stock on COMPLETED)
- CRM Service (award points on COMPLETED)

**Event Schema**:
```json
{
  "detail-type": "Order.StatusChanged",
  "source": "com.myorderingsystem.order",
  "detail": {
    "eventVersion": "1.0",
    "eventId": "evt-order-status-001",
    "timestamp": "2025-12-17T11:00:00Z",
    "aggregateId": "order-123",
    "aggregateType": "Order",
    "eventData": {
      "orderId": "order-123",
      "orderNumber": "ORD-20251217-001",
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "user-456",
      "previousStatus": "PAID",
      "newStatus": "PREPARING",
      "statusChangedAt": "2025-12-17T11:00:00Z",
      "changedBy": "user-manager-123",
      "notes": "Started cooking at 11:00 AM"
    },
    "metadata": {
      "userId": "user-manager-123",
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "correlationId": "order-123",
      "source": "order-update-status-handler"
    }
  }
}
```

**Status Values**: `PENDING`, `PAID`, `PREPARING`, `READY`, `COMPLETED`, `CANCELLED`

---

### Order.Paid

**Detail Type**: `Order.Paid`  
**Source**: `com.myorderingsystem.order`

**Published By**: `order-update-status-handler` Lambda (triggered by Payment.Success)

**Consumed By**:
- Notification Service (send payment confirmation)
- Report Service (record revenue)
- Store Service (notify merchant of new paid order)

**Event Schema**:
```json
{
  "detail-type": "Order.Paid",
  "source": "com.myorderingsystem.order",
  "detail": {
    "eventVersion": "1.0",
    "eventId": "evt-order-paid-001",
    "timestamp": "2025-12-17T10:46:00Z",
    "aggregateId": "order-123",
    "aggregateType": "Order",
    "eventData": {
      "orderId": "order-123",
      "orderNumber": "ORD-20251217-001",
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "user-456",
      "total": 39.70,
      "paymentId": "payment-789",
      "paymentMethod": "CARD",
      "paidAt": "2025-12-17T10:46:00Z"
    },
    "metadata": {
      "userId": "user-456",
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "correlationId": "order-123",
      "causationId": "evt-payment-success-001",
      "source": "order-update-status-handler"
    }
  }
}
```

---

### Order.Cancelled

**Detail Type**: `Order.Cancelled`  
**Source**: `com.myorderingsystem.order`

**Published By**: `order-cancel-handler` Lambda

**Consumed By**:
- Notification Service (notify customer and merchant)
- Inventory Service (release reserved stock)
- Payment Service (process refund if paid)
- CRM Service (reverse loyalty points if awarded)

**Event Schema**:
```json
{
  "detail-type": "Order.Cancelled",
  "source": "com.myorderingsystem.order",
  "detail": {
    "eventVersion": "1.0",
    "eventId": "evt-order-cancelled-001",
    "timestamp": "2025-12-17T11:05:00Z",
    "aggregateId": "order-123",
    "aggregateType": "Order",
    "eventData": {
      "orderId": "order-123",
      "orderNumber": "ORD-20251217-001",
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "user-456",
      "previousStatus": "PAID",
      "cancelReason": "Customer requested cancellation",
      "cancelledBy": "user-456",
      "cancelledAt": "2025-12-17T11:05:00Z",
      "refundRequired": true
    },
    "metadata": {
      "userId": "user-456",
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "correlationId": "order-123",
      "source": "order-cancel-handler"
    }
  }
}
```

---

## Inventory Service Events

### Stock.Reserved

**Detail Type**: `Stock.Reserved`  
**Source**: `com.myorderingsystem.inventory`

**Published By**: `inventory-reserve-handler` Lambda

**Consumed By**:
- Order Service (confirm reservation)
- Report Service (track reservation patterns)

**Event Schema**:
```json
{
  "detail-type": "Stock.Reserved",
  "source": "com.myorderingsystem.inventory",
  "detail": {
    "eventVersion": "1.0",
    "eventId": "evt-stock-reserved-001",
    "timestamp": "2025-12-17T10:45:00Z",
    "aggregateId": "item-1",
    "aggregateType": "InventoryItem",
    "eventData": {
      "reservationId": "res-456",
      "orderId": "order-123",
      "items": [
        {
          "itemId": "item-1",
          "itemName": "Margherita Pizza",
          "quantity": 2,
          "stockBefore": 25,
          "stockAfter": 25,
          "reservedCount": 2
        }
      ],
      "expiresAt": "2025-12-17T11:00:00Z"
    },
    "metadata": {
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "correlationId": "order-123",
      "causationId": "evt-order-created-001",
      "source": "inventory-reserve-handler"
    }
  }
}
```

---

### Stock.Committed

**Detail Type**: `Stock.Committed`  
**Source**: `com.myorderingsystem.inventory`

**Published By**: `inventory-commit-handler` Lambda

**Consumed By**:
- Report Service (update stock movement analytics)

**Event Schema**:
```json
{
  "detail-type": "Stock.Committed",
  "source": "com.myorderingsystem.inventory",
  "detail": {
    "eventVersion": "1.0",
    "eventId": "evt-stock-committed-001",
    "timestamp": "2025-12-17T12:30:00Z",
    "aggregateId": "item-1",
    "aggregateType": "InventoryItem",
    "eventData": {
      "reservationId": "res-456",
      "orderId": "order-123",
      "items": [
        {
          "itemId": "item-1",
          "itemName": "Margherita Pizza",
          "quantity": 2,
          "stockBefore": 25,
          "stockAfter": 23
        }
      ],
      "committedAt": "2025-12-17T12:30:00Z"
    },
    "metadata": {
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "correlationId": "order-123",
      "causationId": "evt-order-status-completed",
      "source": "inventory-commit-handler"
    }
  }
}
```

---

### Stock.LowAlert

**Detail Type**: `Stock.LowAlert`  
**Source**: `com.myorderingsystem.inventory`

**Published By**: `inventory-update-handler` Lambda (PostgreSQL trigger)

**Consumed By**:
- Notification Service (alert merchant)
- Report Service (track stockout patterns)

**Event Schema**:
```json
{
  "detail-type": "Stock.LowAlert",
  "source": "com.myorderingsystem.inventory",
  "detail": {
    "eventVersion": "1.0",
    "eventId": "evt-stock-low-001",
    "timestamp": "2025-12-17T13:00:00Z",
    "aggregateId": "item-1",
    "aggregateType": "InventoryItem",
    "eventData": {
      "itemId": "item-1",
      "itemName": "Margherita Pizza",
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "currentStock": 8,
      "lowStockThreshold": 10,
      "recommendedRestock": 50
    },
    "metadata": {
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "source": "inventory-update-handler"
    }
  }
}
```

---

### Stock.Depleted

**Detail Type**: `Stock.Depleted`  
**Source**: `com.myorderingsystem.inventory`

**Published By**: `inventory-commit-handler` Lambda

**Consumed By**:
- Menu Service (set item unavailable)
- Notification Service (urgent alert to merchant)
- Delivery Platform Webhooks Service (mark unavailable on platforms)

**Event Schema**:
```json
{
  "detail-type": "Stock.Depleted",
  "source": "com.myorderingsystem.inventory",
  "detail": {
    "eventVersion": "1.0",
    "eventId": "evt-stock-depleted-001",
    "timestamp": "2025-12-17T13:15:00Z",
    "aggregateId": "item-1",
    "aggregateType": "InventoryItem",
    "eventData": {
      "itemId": "item-1",
      "itemName": "Margherita Pizza",
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "currentStock": 0,
      "depletedAt": "2025-12-17T13:15:00Z"
    },
    "metadata": {
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "source": "inventory-commit-handler"
    }
  }
}
```

---

## Payment Service Events

### Payment.Success

**Detail Type**: `Payment.Success`  
**Source**: `com.myorderingsystem.payment`

**Published By**: `payment-webhook-handler` Lambda (Stripe webhook)

**Consumed By**:
- Order Service (update status to PAID)
- Notification Service (send payment confirmation)
- Report Service (record revenue)

**Event Schema**:
```json
{
  "detail-type": "Payment.Success",
  "source": "com.myorderingsystem.payment",
  "detail": {
    "eventVersion": "1.0",
    "eventId": "evt-payment-success-001",
    "timestamp": "2025-12-17T10:46:00Z",
    "aggregateId": "payment-789",
    "aggregateType": "Payment",
    "eventData": {
      "paymentId": "payment-789",
      "orderId": "order-123",
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "user-456",
      "amount": 3970,
      "currency": "usd",
      "paymentMethod": "CARD",
      "last4": "4242",
      "stripePaymentIntentId": "pi_1234567890",
      "paidAt": "2025-12-17T10:46:00Z"
    },
    "metadata": {
      "userId": "user-456",
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "correlationId": "order-123",
      "source": "payment-webhook-handler"
    }
  }
}
```

---

### Payment.Failed

**Detail Type**: `Payment.Failed`  
**Source**: `com.myorderingsystem.payment`

**Published By**: `payment-webhook-handler` Lambda (Stripe webhook)

**Consumed By**:
- Order Service (keep status as PENDING, release reservation timer)
- Notification Service (notify customer of failure)

**Event Schema**:
```json
{
  "detail-type": "Payment.Failed",
  "source": "com.myorderingsystem.payment",
  "detail": {
    "eventVersion": "1.0",
    "eventId": "evt-payment-failed-001",
    "timestamp": "2025-12-17T10:47:00Z",
    "aggregateId": "payment-790",
    "aggregateType": "Payment",
    "eventData": {
      "paymentId": "payment-790",
      "orderId": "order-124",
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "user-457",
      "amount": 2500,
      "currency": "usd",
      "paymentMethod": "CARD",
      "failureReason": "insufficient_funds",
      "failureMessage": "Your card has insufficient funds",
      "stripePaymentIntentId": "pi_9876543210",
      "failedAt": "2025-12-17T10:47:00Z"
    },
    "metadata": {
      "userId": "user-457",
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "correlationId": "order-124",
      "source": "payment-webhook-handler"
    }
  }
}
```

---

### Payment.Refunded

**Detail Type**: `Payment.Refunded`  
**Source**: `com.myorderingsystem.payment`

**Published By**: `payment-refund-handler` Lambda

**Consumed By**:
- Order Service (mark refunded)
- Notification Service (notify customer)
- CRM Service (reverse loyalty points)
- Report Service (update revenue analytics)

**Event Schema**:
```json
{
  "detail-type": "Payment.Refunded",
  "source": "com.myorderingsystem.payment",
  "detail": {
    "eventVersion": "1.0",
    "eventId": "evt-payment-refunded-001",
    "timestamp": "2025-12-17T11:25:00Z",
    "aggregateId": "refund-101",
    "aggregateType": "Refund",
    "eventData": {
      "refundId": "refund-101",
      "paymentId": "payment-789",
      "orderId": "order-123",
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "user-456",
      "amount": 3970,
      "currency": "usd",
      "reason": "Customer cancellation",
      "stripeRefundId": "re_1234567890",
      "refundedAt": "2025-12-17T11:25:00Z"
    },
    "metadata": {
      "userId": "user-456",
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "correlationId": "order-123",
      "causationId": "evt-order-cancelled-001",
      "source": "payment-refund-handler"
    }
  }
}
```

---

## Store Service Events

### Store.StatusChanged

**Detail Type**: `Store.StatusChanged`  
**Source**: `com.myorderingsystem.store`

**Published By**: `store-update-status-handler` Lambda

**Consumed By**:
- Notification Service (notify customers with pending orders)
- Delivery Platform Webhooks Service (update store status on platforms)

**Event Schema**:
```json
{
  "detail-type": "Store.StatusChanged",
  "source": "com.myorderingsystem.store",
  "detail": {
    "eventVersion": "1.0",
    "eventId": "evt-store-status-001",
    "timestamp": "2025-12-17T12:25:00Z",
    "aggregateId": "550e8400-e29b-41d4-a716-446655440000",
    "aggregateType": "Store",
    "eventData": {
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "storeName": "Joe's Pizza",
      "previousStatus": {
        "isOpen": true,
        "acceptingOrders": true
      },
      "newStatus": {
        "isOpen": true,
        "acceptingOrders": false
      },
      "reason": "Temporary closure for maintenance",
      "changedBy": "user-manager-123",
      "changedAt": "2025-12-17T12:25:00Z"
    },
    "metadata": {
      "userId": "user-manager-123",
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "source": "store-update-status-handler"
    }
  }
}
```

---

### Store.ConfigUpdated

**Detail Type**: `Store.ConfigUpdated`  
**Source**: `com.myorderingsystem.store`

**Published By**: `store-update-handler` Lambda

**Consumed By**:
- Delivery Platform Webhooks Service (sync business hours to platforms)

**Event Schema**:
```json
{
  "detail-type": "Store.ConfigUpdated",
  "source": "com.myorderingsystem.store",
  "detail": {
    "eventVersion": "1.0",
    "eventId": "evt-store-config-001",
    "timestamp": "2025-12-17T13:00:00Z",
    "aggregateId": "550e8400-e29b-41d4-a716-446655440000",
    "aggregateType": "Store",
    "eventData": {
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "storeName": "Joe's Pizza",
      "updatedFields": ["businessHours", "deliveryZones"],
      "businessHours": [ ... ],
      "deliveryZones": [ ... ]
    },
    "metadata": {
      "userId": "user-manager-123",
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "source": "store-update-handler"
    }
  }
}
```

---

## Device Service Events

### Device.Registered

**Detail Type**: `Device.Registered`  
**Source**: `com.myorderingsystem.device`

**Published By**: `device-register-handler` Lambda

**Consumed By**:
- Report Service (track device inventory)
- Notification Service (notify manager)

**Event Schema**:
```json
{
  "detail-type": "Device.Registered",
  "source": "com.myorderingsystem.device",
  "detail": {
    "eventVersion": "1.0",
    "eventId": "evt-device-registered-001",
    "timestamp": "2025-12-17T12:30:00Z",
    "aggregateId": "device-789",
    "aggregateType": "Device",
    "eventData": {
      "deviceId": "device-789",
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "deviceType": "RECEIPT_PRINTER",
      "name": "Kitchen Printer",
      "iotEndpoint": "a1b2c3d4e5f6g7.iot.us-east-1.amazonaws.com",
      "status": "ONLINE",
      "registeredAt": "2025-12-17T12:30:00Z"
    },
    "metadata": {
      "userId": "user-manager-123",
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "source": "device-register-handler"
    }
  }
}
```

---

### Device.Offline

**Detail Type**: `Device.Offline`  
**Source**: `com.myorderingsystem.device`

**Published By**: `device-health-monitor` Lambda (IoT Core disconnection)

**Consumed By**:
- Notification Service (alert manager)

**Event Schema**:
```json
{
  "detail-type": "Device.Offline",
  "source": "com.myorderingsystem.device",
  "detail": {
    "eventVersion": "1.0",
    "eventId": "evt-device-offline-001",
    "timestamp": "2025-12-17T13:00:00Z",
    "aggregateId": "device-789",
    "aggregateType": "Device",
    "eventData": {
      "deviceId": "device-789",
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "deviceType": "RECEIPT_PRINTER",
      "name": "Kitchen Printer",
      "status": "OFFLINE",
      "lastSeen": "2025-12-17T12:55:00Z",
      "offlineSince": "2025-12-17T13:00:00Z"
    },
    "metadata": {
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "source": "device-health-monitor"
    }
  }
}
```

---

### PrintJob.Completed

**Detail Type**: `PrintJob.Completed`  
**Source**: `com.myorderingsystem.device`

**Published By**: `device-iot-consumer` Lambda (IoT Core message)

**Consumed By**:
- Report Service (track print job success rate)

**Event Schema**:
```json
{
  "detail-type": "PrintJob.Completed",
  "source": "com.myorderingsystem.device",
  "detail": {
    "eventVersion": "1.0",
    "eventId": "evt-printjob-completed-001",
    "timestamp": "2025-12-17T12:36:00Z",
    "aggregateId": "job-456",
    "aggregateType": "PrintJob",
    "eventData": {
      "jobId": "job-456",
      "deviceId": "device-789",
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "jobType": "KITCHEN_LABEL",
      "orderId": "order-123",
      "status": "COMPLETED",
      "completedAt": "2025-12-17T12:36:00Z"
    },
    "metadata": {
      "storeId": "550e8400-e29b-41d4-a716-446655440000",
      "correlationId": "order-123",
      "source": "device-iot-consumer"
    }
  }
}
```

---

## CRM Service Events

**Status**: Out of scope for v0.2.0 (MVP + Inventory + POS)

**Future Events**:
- `Points.Earned` - Customer earns loyalty points
- `Points.Redeemed` - Customer redeems loyalty points
- `Coupon.Created` - New coupon created
- `Coupon.Validated` - Coupon validation result
- `Coupon.Redeemed` - Coupon applied to order
- `Tier.Updated` - Customer tier level changed

**Extensibility**: Event bus and consumer infrastructure ready for future CRM event integration.

---

## Delivery Platform Events

**Status**: Out of scope for v0.2.0 (MVP + Inventory + POS)

**Future Events**:
- `ExternalOrder.Received` - Order received from UberEats/Foodpanda
- `Menu.Synced` - Menu synchronized to external platform
- `Platform.SyncFailed` - External platform sync failure

**Extensibility**: Webhook handlers can be added to process external platform events in future versions.

---

## Event Routing Rules

### EventBridge Rule Configuration

**Rule 1: Route Order Events to Notification Service**
```json
{
  "source": ["com.myorderingsystem.order"],
  "detail-type": ["Order.Created", "Order.StatusChanged", "Order.Paid", "Order.Cancelled"]
}
→ Target: notification-dispatcher Lambda
```

**Rule 2: Route Payment Success to Order Service**
```json
{
  "source": ["com.myorderingsystem.payment"],
  "detail-type": ["Payment.Success"]
}
→ Target: order-payment-update Lambda
```

**Rule 3: Route Stock Events to Menu Service**
```json
{
  "source": ["com.myorderingsystem.inventory"],
  "detail-type": ["Stock.Depleted"]
}
→ Target: menu-availability-handler Lambda
```

**Rule 4: Route Device Offline to Notification Service**
```json
{
  "source": ["com.myorderingsystem.device"],
  "detail-type": ["Device.Offline"]
}
→ Target: notification-send-handler Lambda
```

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-21 | Simon Chou | Initial Baseline (Scope: v0.2.0 MVP + Inventory + POS) |
---

## Notes for AI Implementation

1. **Event Publishing**: Use AWS SDK EventBridge `putEvents()` API
2. **Idempotency**: Check Redis before processing: `GET idempotency:event:{eventId}`
3. **Error Handling**: Failed events go to DLQ for manual review
4. **Event Replay**: DLQ messages can be replayed after fixing bugs
5. **Schema Validation**: Validate event structure before publishing
6. **Metadata**: Always include userId, storeId, correlationId when applicable
7. **Causation Chain**: Use causationId to trace event lineage
8. **Timestamps**: Use ISO 8601 format with UTC timezone
9. **Event Versioning**: Include eventVersion in detail, increment on schema changes
10. **Testing**: Use EventBridge test events for integration testing
