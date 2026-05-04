# Events Spec — My Online Ordering System
> Single source of truth for EventBridge events. All publishers and consumers MUST comply.
> Full detail: [EVENT_CONTRACT.md](../EVENT_CONTRACT.md)

---

## Global Rules

**Event Bus**: `my-ordering-system-event-bus` (primary: `us-east-1`)

**All events MUST**:
- Use idempotency check before processing: `GET idempotency:event:{eventId}` (Redis, TTL 24h)
- Include required metadata fields
- Retry: SQS consumers max 3 retries (1s/2s/4s backoff), DLQ: `event-processing-dlq`

### Event Envelope Structure
```json
{
  "version": "0",
  "detail-type": "Order.Created",
  "source": "com.myorderingsystem.order",
  "detail": {
    "eventVersion": "1.0",
    "eventId": "uuid",
    "timestamp": "ISO8601",
    "aggregateId": "entity-id",
    "aggregateType": "Order",
    "eventData": { },
    "metadata": {
      "userId": "uuid-or-null",
      "storeId": "uuid-or-null",
      "correlationId": "related-entity-id",
      "causationId": "parent-event-id",
      "source": "lambda-function-name"
    }
  }
}
```

### Naming Convention: `{Domain}.{Entity}{Action}`

---

## Menu Service Events (`source: com.myorderingsystem.menu`)

| Event | Publisher Lambda | Consumers |
|-------|-----------------|-----------|
| `Menu.ItemCreated` | `menu-create-handler` | Delivery Platform, Report Service |
| `Menu.ItemUpdated` | `menu-update-handler` | Delivery Platform, Notification Service |
| `Menu.ItemDeleted` | `menu-delete-handler` | Delivery Platform, Inventory Service |
| `Item.SoldOut` | `menu-availability-handler` | Delivery Platform, Notification Service |
| `Item.BackInStock` | `menu-availability-handler` | Delivery Platform, Notification Service |

### `Menu.ItemCreated` eventData
```json
{ "id", "storeId", "categoryId", "name", "description", "price", "imageUrl", "isAvailable", "customizations", "allergens", "tags" }
```

### `Menu.ItemUpdated` eventData
```json
{
  "id", "storeId",
  "changes": { "price": { "old": 12.99, "new": 13.99 } },
  "updatedFields": ["price", "name"],
  "currentData": { "id", "name", "price", "isAvailable" }
}
```

### `Menu.ItemDeleted` eventData
```json
{ "id", "storeId", "name", "deletedAt" }
```

### `Item.SoldOut` eventData
```json
{ "id", "storeId", "name", "isAvailable": false, "reason" }
```

### `Item.BackInStock` eventData
```json
{ "id", "storeId", "name", "isAvailable": true }
```

---

## Order Service Events (`source: com.myorderingsystem.order`)

| Event | Publisher Lambda | Consumers |
|-------|-----------------|-----------|
| `Order.Created` | `order-create-handler` | Notification, Inventory, CRM, Report, Device |
| `Order.StatusChanged` | `order-update-status-handler` | Notification, KDS, Report, Inventory (COMPLETED), CRM (COMPLETED) |
| `Order.Paid` | `order-update-status-handler` | Notification, Report, Store Service |
| `Order.Cancelled` | `order-cancel-handler` | Notification, Inventory, Payment, CRM |

### `Order.Created` eventData
```json
{
  "id", "orderNumber", "storeId", "userId",
  "orderSource", "orderType", "status": "PENDING",
  "items": [{ "menuItemId", "menuItemName", "quantity", "unitPrice", "subtotal", "customizations", "specialInstructions" }],
  "subtotal", "tax", "total", "scheduledPickupTime", "notes"
}
```

### `Order.StatusChanged` eventData
```json
{
  "orderId", "orderNumber", "storeId", "userId",
  "previousStatus", "newStatus",
  "statusChangedAt", "changedBy", "notes"
}
```
Valid statuses: `PENDING | PAID | PREPARING | READY | COMPLETED | CANCELLED`

### `Order.Paid` eventData
```json
{ "orderId", "orderNumber", "storeId", "userId", "total", "paymentId", "paymentMethod", "paidAt" }
```
metadata.causationId = `evt-payment-success-{id}`

### `Order.Cancelled` eventData
```json
{ "orderId", "orderNumber", "storeId", "userId", "previousStatus", "cancelReason", "cancelledBy", "cancelledAt", "refundRequired": true }
```

---

## Inventory Service Events (`source: com.myorderingsystem.inventory`)

| Event | Publisher Lambda | Consumers |
|-------|-----------------|-----------|
| `Stock.Reserved` | `inventory-reserve-handler` | Order Service, Report Service |
| `Stock.Committed` | `inventory-commit-handler` | Report Service |
| `Stock.ManuallyUpdated` | `inventory-update-handler` | Report Service |
| `Stock.LowAlert` | `inventory-update-handler` | Notification Service, Report Service |
| `Stock.Depleted` | `inventory-commit-handler` | Menu Service, Notification Service, Delivery Platform |

### `Stock.Reserved` eventData
```json
{
  "reservationId", "orderId",
  "items": [{ "itemId", "itemName", "quantity", "stockBefore", "stockAfter", "reservedCount" }],
  "expiresAt"
}
```

### `Stock.ManuallyUpdated` eventData
```json
{ "itemId", "itemName", "storeId", "stockBefore", "stockAfter", "quantityChange", "reason", "changedBy", "updatedAt" }
```

### `Stock.Committed` eventData
```json
{
  "reservationId", "orderId",
  "items": [{ "itemId", "itemName", "quantity", "stockBefore", "stockAfter" }],
  "committedAt"
}
```

### `Stock.LowAlert` eventData
```json
{ "itemId", "itemName", "storeId", "currentStock", "lowStockThreshold", "recommendedRestock" }
```

### `Stock.Depleted` eventData
```json
{ "itemId", "itemName", "storeId", "currentStock": 0, "depletedAt" }
```

---

## Payment Service Events (`source: com.myorderingsystem.payment`)

| Event | Publisher Lambda | Consumers |
|-------|-----------------|-----------|
| `Payment.Success` | `payment-webhook-handler` | Order Service, Notification, Report |
| `Payment.Failed` | `payment-webhook-handler` | Order Service, Notification |
| `Payment.Refunded` | `payment-refund-handler` | Order Service, Notification, CRM, Report |

### `Payment.Success` eventData
```json
{ "paymentId", "orderId", "storeId", "userId", "amount", "currency", "paymentMethod", "last4", "stripePaymentIntentId", "paidAt" }
```

### `Payment.Failed` eventData
```json
{ "paymentId", "orderId", "storeId", "userId", "amount", "currency", "paymentMethod", "failureReason", "failureMessage", "stripePaymentIntentId", "failedAt" }
```

### `Payment.Refunded` eventData
```json
{ "refundId", "paymentId", "orderId", "storeId", "userId", "amount", "currency", "reason", "stripeRefundId", "refundedAt" }
```
metadata.causationId = `evt-order-cancelled-{id}`

---

## Store Service Events (`source: com.myorderingsystem.store`)

| Event | Publisher Lambda | Consumers |
|-------|-----------------|-----------|
| `Store.Created` | `store-create-handler` | Report Service, Delivery Platform |
| `Store.StatusChanged` | `store-update-status-handler` | Notification, Delivery Platform |
| `Store.ConfigUpdated` | `store-update-handler` | Delivery Platform |

### `Store.Created` eventData
```json
{ "storeId", "name", "address", "phone", "email", "businessHours", "createdAt" }
```

### `Store.StatusChanged` eventData
```json
{
  "storeId", "storeName",
  "previousStatus": { "isOpen": true, "acceptingOrders": true },
  "newStatus": { "isOpen": true, "acceptingOrders": false },
  "reason", "changedBy", "changedAt"
}
```

### `Store.ConfigUpdated` eventData
```json
{ "storeId", "storeName", "updatedFields": ["businessHours"], "businessHours": [...] }
```

---

## Device Service Events (`source: com.myorderingsystem.device`)

| Event | Publisher Lambda | Consumers |
|-------|-----------------|-----------|
| `Device.Registered` | `device-register-handler` | Report, Notification |
| `Device.Offline` | `device-health-monitor` | Notification |
| `PrintJob.Completed` | `device-iot-consumer` | Report |

### `Device.Registered` eventData
```json
{ "deviceId", "storeId", "deviceType", "name", "iotEndpoint", "status": "OFFLINE", "registeredAt" }
```

### `Device.Offline` eventData
```json
{ "deviceId", "storeId", "deviceType", "name", "status": "OFFLINE", "lastSeen", "offlineSince" }
```

### `PrintJob.Completed` eventData
```json
{ "jobId", "deviceId", "storeId", "jobType", "orderId", "status": "COMPLETED", "completedAt" }
```

---

## EventBridge Routing Rules

```
Rule 1: Order events → Notification
  source: com.myorderingsystem.order
  detail-type: [Order.Created, Order.StatusChanged, Order.Paid, Order.Cancelled]
  target: notification-dispatcher Lambda

Rule 2: Payment.Success → Order Service
  source: com.myorderingsystem.payment
  detail-type: [Payment.Success]
  target: order-payment-update Lambda

Rule 3: Stock.Depleted → Menu Service
  source: com.myorderingsystem.inventory
  detail-type: [Stock.Depleted]
  target: menu-availability-handler Lambda

Rule 4: Device.Offline → Notification
  source: com.myorderingsystem.device
  detail-type: [Device.Offline]
  target: notification-send-handler Lambda
```

---

## Out of Scope (v0.2.0)

- **CRM Events**: `Points.Earned`, `Points.Redeemed`, `Coupon.*`, `Tier.Updated`
- **Delivery Platform Events**: `ExternalOrder.Received`, `Menu.Synced`, `Platform.SyncFailed`
