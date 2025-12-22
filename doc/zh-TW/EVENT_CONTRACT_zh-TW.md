# 事件契約規範

**文件版本**: 1.0  
**最後更新**: 2025 年 12 月 21 日  
**負責人**: Simon Chou  
**狀態**: 單一資料來源 (MVP + 庫存 + POS 範圍)

---

## 目的

本文件定義了 **所有 EventBridge 事件**，這些事件在 12 個後端微服務之間發布和消費。它作為非同步事件驅動通訊的權威契約。

**重要**: 這是事件架構的 **單一資料來源**。所有事件發布者和訂閱者 **必須** 遵守此規範。

**目標受眾**: 實作服務的 AI 助理、後端開發人員、整合工程師

---

## 目錄

1. [全域事件標準](#全域事件標準)
2. [菜單服務事件](#菜單服務事件)
3. [訂單服務事件](#訂單服務事件)
4. [庫存服務事件](#庫存服務事件)
5. [付款服務事件](#付款服務事件)
6. [店家服務事件](#店家服務事件)
7. [裝置服務事件](#裝置服務事件)
8. [CRM 服務事件](#crm-服務事件)
9. [外送平台事件](#外送平台事件)
10. [事件路由規則](#事件路由規則)

---

## 全域事件標準

### 事件匯流排

**事件匯流排名稱**: `my-ordering-system-event-bus`

**區域**: 
- 主要: `us-east-1`
- DR: `us-west-2`

### 事件結構

所有事件遵循 AWS EventBridge 標準格式：

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
      // 事件特定的資料載體
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

### 事件命名慣例

**格式**: `{Domain}.{Entity}{Action}`

**範例**:
- `Menu.ItemCreated`
- `Order.StatusChanged`
- `Payment.Success`
- `Stock.LowAlert`

### 事件版本控制

**事件版本**: 包含在 `detail.eventVersion` 中（例如 "1.0", "1.1"）

**破壞性變更**: 使用版本後綴建立新事件類型（例如 `Order.Created` → `Order.CreatedV2`）

### 中繼資料標準

所有事件 **必須** 包含以下中繼資料欄位：

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `eventId` | UUID | 是 | 唯一事件識別碼 |
| `timestamp` | ISO 8601 | 是 | 事件建立時間戳記 |
| `aggregateId` | String | 是 | 實體 ID（例如訂單 ID、項目 ID） |
| `aggregateType` | String | 是 | 實體類型（例如 Order、MenuItem） |
| `userId` | UUID | 適用時 | 觸發事件的使用者 |
| `storeId` | UUID | 適用時 | 店家上下文 |
| `correlationId` | String | 適用時 | 追蹤相關事件的 ID（例如 orderId） |
| `causationId` | UUID | 適用時 | 導致此事件的父事件 ID |
| `source` | String | 是 | 發布事件的 Lambda 函數名稱 |

### 事件重試策略

**SQS 消費者**:
- 最大重試次數: 3
- 退避策略: 指數退避（1s, 2s, 4s）
- 死信佇列 (DLQ): `event-processing-dlq`

**Lambda 消費者**:
- 最大重試次數: 2（AWS Lambda 非同步呼叫預設值）
- DLQ: Lambda 專用 DLQ

### 冪等性

**消費者要求**: 所有事件消費者 **必須** 是冪等的

**冪等性金鑰**: 使用 `detail.eventId` 作為冪等性金鑰

**Redis 檢查**:
```
Key: idempotency:event:{eventId}
TTL: 24 小時
Value: "processed"
```

---

## 菜單服務事件

### Menu.ItemCreated

**詳細類型**: `Menu.ItemCreated`  
**來源**: `com.myorderingsystem.menu`

**發布者**: `menu-create-handler` Lambda

**消費者**:
- 外送平台 Webhooks 服務（同步菜單至 UberEats/Foodpanda）
- 報表服務（更新分析數據）

**事件架構**:
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

**詳細類型**: `Menu.ItemUpdated`  
**來源**: `com.myorderingsystem.menu`

**發布者**: `menu-update-handler` Lambda

**消費者**:
- 外送平台 Webhooks 服務（同步更新至平台）
- 通知服務（若有重大變更，通知訂閱的顧客）

**事件架構**:
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

**詳細類型**: `Menu.ItemDeleted`  
**來源**: `com.myorderingsystem.menu`

**發布者**: `menu-delete-handler` Lambda

**消費者**:
- 外送平台 Webhooks 服務（從平台移除）
- 庫存服務（標記庫存為非活躍）

**事件架構**:
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

**詳細類型**: `Item.SoldOut`  
**來源**: `com.myorderingsystem.menu`

**發布者**: `menu-availability-handler` Lambda

**消費者**:
- 外送平台 Webhooks 服務（在平台上標記為不可用）
- 通知服務（通知將商品加入我的最愛的顧客）

**事件架構**:
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

**詳細類型**: `Item.BackInStock`  
**來源**: `com.myorderingsystem.menu`

**發布者**: `menu-availability-handler` Lambda

**消費者**:
- 外送平台 Webhooks 服務（在平台上標記為可用）
- 通知服務（通知訂閱的顧客）

**事件架構**:
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

## 訂單服務事件

### Order.Created

**詳細類型**: `Order.Created`  
**來源**: `com.myorderingsystem.order`

**發布者**: `order-create-handler` Lambda

**消費者**:
- 通知服務（發送訂單確認）
- 庫存服務（保留庫存）
- CRM 服務（計算忠誠度點數資格）
- 報表服務（更新分析數據）
- 裝置服務（排隊廚房標籤列印工作）

**事件架構**:
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

**詳細類型**: `Order.StatusChanged`  
**來源**: `com.myorderingsystem.order`

**發布者**: `order-update-status-handler` Lambda

**消費者**:
- 通知服務（向顧客推送狀態更新）
- KDS（更新廚房顯示系統）
- 報表服務（追蹤訂單生命週期）
- 庫存服務（COMPLETED 時提交庫存）
- CRM 服務（COMPLETED 時獎勵點數）

**事件架構**:
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

**狀態值**: `PENDING`, `PAID`, `PREPARING`, `READY`, `COMPLETED`, `CANCELLED`

---

### Order.Paid

**詳細類型**: `Order.Paid`  
**來源**: `com.myorderingsystem.order`

**發布者**: `order-update-status-handler` Lambda（由 Payment.Success 觸發）

**消費者**:
- 通知服務（發送付款確認）
- 報表服務（記錄收入）
- 店家服務（通知商家新的已付款訂單）

**事件架構**:
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

**詳細類型**: `Order.Cancelled`  
**來源**: `com.myorderingsystem.order`

**發布者**: `order-cancel-handler` Lambda

**消費者**:
- 通知服務（通知顧客和商家）
- 庫存服務（釋放保留的庫存）
- 付款服務（若已付款則處理退款）
- CRM 服務（若已獎勵則撤銷忠誠度點數）

**事件架構**:
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

## 庫存服務事件

### Stock.Reserved

**詳細類型**: `Stock.Reserved`  
**來源**: `com.myorderingsystem.inventory`

**發布者**: `inventory-reserve-handler` Lambda

**消費者**:
- 訂單服務（確認保留）
- 報表服務（追蹤保留模式）

**事件架構**:
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

**詳細類型**: `Stock.Committed`  
**來源**: `com.myorderingsystem.inventory`

**發布者**: `inventory-commit-handler` Lambda

**消費者**:
- 報表服務（更新庫存移動分析）

**事件架構**:
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

**詳細類型**: `Stock.LowAlert`  
**來源**: `com.myorderingsystem.inventory`

**發布者**: `inventory-update-handler` Lambda（PostgreSQL 觸發器）

**消費者**:
- 通知服務（警示商家）
- 報表服務（追蹤缺貨模式）

**事件架構**:
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

**詳細類型**: `Stock.Depleted`  
**來源**: `com.myorderingsystem.inventory`

**發布者**: `inventory-commit-handler` Lambda

**消費者**:
- 菜單服務（設定商品為不可用）
- 通知服務（向商家發送緊急警示）
- 外送平台 Webhooks 服務（在平台上標記為不可用）

**事件架構**:
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

## 付款服務事件

### Payment.Success

**詳細類型**: `Payment.Success`  
**來源**: `com.myorderingsystem.payment`

**發布者**: `payment-webhook-handler` Lambda（Stripe webhook）

**消費者**:
- 訂單服務（更新狀態為 PAID）
- 通知服務（發送付款確認）
- 報表服務（記錄收入）

**事件架構**:
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

**詳細類型**: `Payment.Failed`  
**來源**: `com.myorderingsystem.payment`

**發布者**: `payment-webhook-handler` Lambda（Stripe webhook）

**消費者**:
- 訂單服務（保持狀態為 PENDING，釋放保留計時器）
- 通知服務（通知顧客付款失敗）

**事件架構**:
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

**詳細類型**: `Payment.Refunded`  
**來源**: `com.myorderingsystem.payment`

**發布者**: `payment-refund-handler` Lambda

**消費者**:
- 訂單服務（標記為已退款）
- 通知服務（通知顧客）
- CRM 服務（撤銷忠誠度點數）
- 報表服務（更新收入分析）

**事件架構**:
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

## 店家服務事件

### Store.StatusChanged

**詳細類型**: `Store.StatusChanged`  
**來源**: `com.myorderingsystem.store`

**發布者**: `store-update-status-handler` Lambda

**消費者**:
- 通知服務（通知有待處理訂單的顧客）
- 外送平台 Webhooks 服務（在平台上更新店家狀態）

**事件架構**:
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

**詳細類型**: `Store.ConfigUpdated`  
**來源**: `com.myorderingsystem.store`

**發布者**: `store-update-handler` Lambda

**消費者**:
- 外送平台 Webhooks 服務（同步營業時間至平台）

**事件架構**:
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

## 裝置服務事件

### Device.Registered

**詳細類型**: `Device.Registered`  
**來源**: `com.myorderingsystem.device`

**發布者**: `device-register-handler` Lambda

**消費者**:
- 報表服務（追蹤裝置庫存）
- 通知服務（通知管理員）

**事件架構**:
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

**詳細類型**: `Device.Offline`  
**來源**: `com.myorderingsystem.device`

**發布者**: `device-health-monitor` Lambda（IoT Core 斷線）

**消費者**:
- 通知服務（警示管理員）

**事件架構**:
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

**詳細類型**: `PrintJob.Completed`  
**來源**: `com.myorderingsystem.device`

**發布者**: `device-iot-consumer` Lambda（IoT Core 訊息）

**消費者**:
- 報表服務（追蹤列印工作成功率）

**事件架構**:
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

## CRM 服務事件

**狀態**: v0.2.0（MVP + 庫存 + POS）範圍外

**未來事件**:
- `Points.Earned` - 顧客獲得忠誠度點數
- `Points.Redeemed` - 顧客兌換忠誠度點數
- `Coupon.Created` - 建立新優惠券
- `Coupon.Validated` - 優惠券驗證結果
- `Coupon.Redeemed` - 優惠券應用於訂單
- `Tier.Updated` - 顧客等級變更

**擴充性**: 事件匯流排和消費者基礎設施已為未來 CRM 事件整合做好準備。

---

## 外送平台事件

**狀態**: v0.2.0（MVP + 庫存 + POS）範圍外

**未來事件**:
- `ExternalOrder.Received` - 從 UberEats/Foodpanda 收到訂單
- `Menu.Synced` - 菜單同步至外部平台
- `Platform.SyncFailed` - 外部平台同步失敗

**擴充性**: Webhook 處理器可在未來版本中新增，以處理外部平台事件。

---

## 事件路由規則

### EventBridge 規則設定

**規則 1: 將訂單事件路由至通知服務**
```json
{
  "source": ["com.myorderingsystem.order"],
  "detail-type": ["Order.Created", "Order.StatusChanged", "Order.Paid", "Order.Cancelled"]
}
→ 目標: notification-dispatcher Lambda
```

**規則 2: 將付款成功事件路由至訂單服務**
```json
{
  "source": ["com.myorderingsystem.payment"],
  "detail-type": ["Payment.Success"]
}
→ 目標: order-payment-update Lambda
```

**規則 3: 將庫存事件路由至菜單服務**
```json
{
  "source": ["com.myorderingsystem.inventory"],
  "detail-type": ["Stock.Depleted"]
}
→ 目標: menu-availability-handler Lambda
```

**規則 4: 將裝置離線事件路由至通知服務**
```json
{
  "source": ["com.myorderingsystem.device"],
  "detail-type": ["Device.Offline"]
}
→ 目標: notification-send-handler Lambda
```

---

## 版本歷史

| 版本 | 日期 | 作者 | 變更內容 |
|------|------|------|----------|
| 1.0 | 2025-12-21 | Simon Chou | 初始基準（範圍：v0.2.0 MVP + 庫存 + POS） |

---

## AI 實作注意事項

1. **事件發布**: 使用 AWS SDK EventBridge `putEvents()` API
2. **冪等性**: 處理前檢查 Redis：`GET idempotency:event:{eventId}`
3. **錯誤處理**: 失敗的事件會進入 DLQ 供人工審查
4. **事件重播**: DLQ 訊息可在修復錯誤後重播
5. **架構驗證**: 發布前驗證事件結構
6. **中繼資料**: 適用時務必包含 userId、storeId、correlationId
7. **因果鏈**: 使用 causationId 追蹤事件譜系
8. **時間戳記**: 使用 ISO 8601 格式搭配 UTC 時區
9. **事件版本控制**: 在 detail 中包含 eventVersion，架構變更時遞增版本號
10. **測試**: 使用 EventBridge 測試事件進行整合測試

