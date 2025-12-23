# API 合約規範

**文件版本**：1.0  
**最後更新**：2025 年 12 月 21 日  
**負責人**：Simon Chou  
**狀態**：唯一真實來源（MVP + 庫存 + POS 範圍）

---

## 目的

本文件定義橫跨 12 個後端微服務的**所有 REST API 端點**。它作為前端應用程式和後端服務之間 API 通訊的權威合約。

**重要**：這是 API 介面的**唯一真實來源**。所有實作必須遵守本規範。

**目標受眾**：實作服務的 AI 助手、前端開發者、後端開發者、QA 工程師

---

## 目錄

1. [全球標準](#全球標準)
2. [認證與授權](#認證與授權)
3. [菜單服務 API](#菜單服務-api)
4. [訂單服務 API](#訂單服務-api)
5. [庫存服務 API](#庫存服務-api)
6. [付款服務 API](#付款服務-api)
7. [授權服務 API](#授權服務-api)
8. [使用者檔案服務 API](#使用者檔案服務-api)
9. [店家服務 API](#店家服務-api)
10. [裝置服務 API](#裝置服務-api)
11. [通知服務 API](#通知服務-api)
12. [CRM 服務 API](#crm-服務-api)
13. [報表服務 API](#報表服務-api)
14. [外送平台 Webhooks API](#外送平台-webhooks-api)

---

## 全球標準

### 基礎 URL

**正式環境**：`https://api.myonlineordering.com`  
**測試環境**：`https://api-staging.myonlineordering.com`  
**開發環境**：`http://localhost:3000`（本地 API Gateway）

### API 版本控制

所有端點都使用 `/api/v1/` 前綴進行版本控制。

**範例**：`https://api.myonlineordering.com/api/v1/stores/123`

### 認證

**標頭**：`Authorization: Bearer {JWT_TOKEN}`

**JWT Token**：
- 由 AWS Cognito 發行
- 演算法：RS256
- 過期時間：1 小時
- 更新令牌：30 天

**範例**：
```
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 請求格式

**Content-Type**：`application/json`

**標頭**：
```
Content-Type: application/json
Authorization: Bearer {JWT_TOKEN}
X-Request-ID: {UUID}（可選，用於追蹤）
```

### 回應格式

**成功回應**：
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2025-12-17T10:30:00Z"
}
```

**錯誤回應**：
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

### HTTP 狀態碼

| 代碼 | 意義 | 使用情境 |
|------|------|----------|
| 200 | OK | 成功的 GET、PATCH、DELETE |
| 201 | Created | 成功的 POST（資源已建立） |
| 204 | No Content | 成功的 DELETE（無回應主體） |
| 400 | Bad Request | 驗證錯誤、格式錯誤的請求 |
| 401 | Unauthorized | 缺少或無效的 JWT 令牌 |
| 403 | Forbidden | 有效令牌但權限不足 |
| 404 | Not Found | 資源不存在 |
| 409 | Conflict | 資源衝突（例如重複訂單） |
| 422 | Unprocessable Entity | 業務邏輯錯誤（例如缺貨） |
| 429 | Too Many Requests | 超過速率限制 |
| 500 | Internal Server Error | 伺服器端錯誤 |
| 503 | Service Unavailable | 服務暫時無法使用 |

### 錯誤代碼

所有服務使用的標準錯誤代碼：

| 代碼 | HTTP 狀態 | 描述 |
|------|-----------|------|
| `VALIDATION_ERROR` | 400 | 請求驗證失敗 |
| `UNAUTHORIZED` | 401 | 需要驗證 |
| `FORBIDDEN` | 403 | 權限不足 |
| `NOT_FOUND` | 404 | 找不到資源 |
| `CONFLICT` | 409 | 資源已存在 |
| `OUT_OF_STOCK` | 422 | 品項不可用 |
| `PAYMENT_FAILED` | 422 | 付款處理失敗 |
| `RATE_LIMIT_EXCEEDED` | 429 | 請求過多 |
| `INTERNAL_ERROR` | 500 | 伺服器錯誤 |

### 分頁

**查詢參數**：
```
GET /api/v1/orders?page=1&limit=20&sortBy=createdAt&sortOrder=desc
```

**回應**：
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

**預設值**：
- `page`：1
- `limit`：20（最大：100）
- `sortBy`：主鍵或 `createdAt`
- `sortOrder`：`desc`

### 速率限制

**API Gateway 節流**：
- **突發**：每秒每個 IP 100 個請求
- **持續**：每秒每個 IP 50 個請求

**標頭**：
```
X-RateLimit-Limit: 50
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1702809600（Unix 時間戳）
```

---

## 認證與授權

### 基於角色的存取控制（RBAC）

| 角色 | 描述 | 存取層級 |
|------|------|----------|
| `User` | 客戶 | 讀取菜單、建立訂單、查看自己的訂單 |
| `Cashier` | POS 操作員 | 建立訂單、處理付款、查看店家訂單 |
| `Manager` | 店家經理 | 完整店家管理、報表、員工管理 |
| `Merchant` | 店家擁有者 | 完整存取所擁有的店家 |
| `Admin` | 系統管理員 | 系統範圍存取（僅限內部） |

### 權限矩陣

| 端點 | User | Cashier | Manager | Merchant | Admin |
|------|------|---------|---------|----------|-------|
| `GET /menu/:storeId` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /menu/items` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `POST /orders` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /orders/:id` | ✅（自己） | ✅（店家） | ✅（店家） | ✅（擁有的店家） | ✅ |
| `PATCH /orders/:id/status` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `POST /stores` | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## 菜單服務 API

### 取得店家菜單

**端點**：`GET /api/v1/menu/:storeId`

**描述**：取得特定店家的完整菜單

**認證**：可選（公開端點）

**路徑參數**：
- `storeId`（字串，UUID）：店家識別碼

**查詢參數**：
- `includeUnavailable`（布林值，可選）：包含不可用的品項（預設：false）

**回應**（200 OK）：
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

**快取**：Redis 快取，TTL 5 分鐘

---

### 建立菜單品項

**端點**：`POST /api/v1/menu/items`

**描述**：新增菜單品項

**認證**：必要（Manager、Merchant、Admin）

**請求主體**：
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

**回應**（201 Created）：
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

**發布事件**：`Menu.ItemCreated`

---

### 更新菜單品項

**端點**：`PATCH /api/v1/menu/items/:itemId`

**描述**：更新現有菜單品項

**認證**：必要（Manager、Merchant、Admin）

**路徑參數**：
- `itemId`（字串，UUID）：品項識別碼

**請求主體**（部分更新）：
```json
{
  "name": "Pepperoni Pizza (New Recipe)",
  "price": 15.99,
  "isAvailable": false
}
```

**回應**（200 OK）：
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

**發布事件**：`Menu.ItemUpdated`

**副作用**：使 `menu:{storeId}` 的 Redis 快取失效

---

### 刪除菜單品項

**端點**：`DELETE /api/v1/menu/items/:itemId`

**描述**：軟刪除菜單品項（設定 isDeleted = true）

**認證**：必要（Manager、Merchant、Admin）

**路徑參數**：
- `itemId`（字串，UUID）：品項識別碼

**回應**（204 No Content）

**發布事件**：`Menu.ItemDeleted`

---

### 更新品項可用性

**端點**：`PATCH /api/v1/menu/items/:itemId/availability`

**描述**：快速切換品項可用性（用於售完情境）

**認證**：必要（Cashier、Manager、Merchant、Admin）

**路徑參數**：
- `itemId`（字串，UUID）：品項識別碼

**請求主體**：
```json
{
  "isAvailable": false
}
```

**回應**（200 OK）：
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

**發布事件**：`Item.SoldOut` 或 `Item.BackInStock`

---

## 訂單服務 API

### 建立訂單

**端點**：`POST /api/v1/orders`

**描述**：建立新訂單

**認證**：必要（User、Cashier、Manager、Merchant、Admin）

**請求主體**：
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

**回應**（201 Created）：
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

**驗證**：
- 所有菜單品項必須存在且可用
- 庫存必須足夠（透過庫存服務檢查）
- 外送訂單需要外送地址
- 預約取貨時間必須在未來

**發布事件**：`Order.Created`

**副作用**： 
- 庫存保留（Redis 鎖定，10 分鐘 TTL）

**備註**：
- 對於 v0.2.0：折扣透過 POS/Manager 覆寫手動應用（儲存在 `discount` 和 `discountReason` 欄位）
- 未來版本：將整合自動化優惠券驗證

---

### 依 ID 取得訂單

**端點**：`GET /api/v1/orders/:orderId`

**描述**：取得訂單詳情

**認證**：必要

**授權**：
- **User**：只能查看自己的訂單
- **Cashier/Manager**：可以查看店家訂單
- **Merchant**：可以查看擁有店家的訂單
- **Admin**：可以查看所有訂單

**路徑參數**：
- `orderId`（字串，UUID）：訂單識別碼

**回應**（200 OK）：
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

### 列出訂單

**端點**：`GET /api/v1/orders`

**描述**：列出訂單，含分頁和篩選

**認證**：必要

**查詢參數**：
- `storeId`（字串，UUID，可選）：依店家篩選
- `userId`（字串，UUID，可選）：依使用者篩選
- `status`（字串，可選）：依狀態篩選（PENDING、PAID、PREPARING、READY、COMPLETED、CANCELLED）
- `orderSource`（字串，可選）：依來源篩選（USER_CLIENT、KIOSK、POS、UBEREATS、FOODPANDA）
- `startDate`（ISO 8601，可選）：篩選此日期之後的訂單
- `endDate`（ISO 8601，可選）：篩選此日期之前的訂單
- `page`（數字，可選，預設：1）
- `limit`（數字，可選，預設：20，最大：100）
- `sortBy`（字串，可選，預設：createdAt）
- `sortOrder`（字串，可選，預設：desc）

**回應**（200 OK）：
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

### 更新訂單狀態

**端點**：`PATCH /api/v1/orders/:orderId/status`

**描述**：更新訂單狀態（狀態機轉換）

**認證**：必要（Cashier、Manager、Merchant、Admin）

**路徑參數**：
- `orderId`（字串，UUID）：訂單識別碼

**請求主體**：
```json
{
  "status": "PREPARING",
  "notes": "Started cooking at 11:00 AM"
}
```

**有效狀態轉換**：
```
PENDING → PAID → PREPARING → READY → COMPLETED
        ↘ CANCELLED（從任何狀態除了 COMPLETED）
```

**回應**（200 OK）：
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

**發布事件**：`Order.StatusChanged`

**副作用**： 
- 狀態 PREPARING → 觸發廚房標籤列印工作
- 狀態 COMPLETED → 提交庫存扣減、授予忠誠度點數

---

### 取消訂單

**端點**：`POST /api/v1/orders/:orderId/cancel`

**描述**：取消訂單（可選擇退款）

**認證**：必要

**授權**：
- **User**：如果狀態是 PENDING 或 PAID，可以取消自己的訂單
- **Cashier/Manager/Merchant**：可以取消店家訂單

**路徑參數**：
- `orderId`（字串，UUID）：訂單識別碼

**請求主體**：
```json
{
  "reason": "Customer requested cancellation",
  "refund": true
}
```

**回應**（200 OK）：
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

**發布事件**：`Order.Cancelled`

**副作用**： 
- 釋放庫存保留
- 處理退款（如果已付款）
- 撤銷忠誠度點數（如果已授予）

---

## 庫存服務 API

### 取得庫存狀態

**端點**：`GET /api/v1/inventory/:itemId`

**描述**：取得菜單品項的目前庫存量

**認證**：必要（Cashier、Manager、Merchant、Admin）

**路徑參數**：
- `itemId`（字串，UUID）：菜單品項識別碼

**回應**（200 OK）：
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

### 更新庫存

**端點**：`PATCH /api/v1/inventory/:itemId`

**描述**：更新庫存量（手動調整）

**認證**：必要（Manager、Merchant、Admin）

**路徑參數**：
- `itemId`（字串，UUID）：菜單品項識別碼

**請求主體**：
```json
{
  "stockCount": 50,
  "lowStockThreshold": 10,
  "reason": "Daily stock replenishment"
}
```

**回應**（200 OK）：
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

**發布事件**：`Stock.Updated`，可能還有 `Item.BackInStock`

**副作用**：建立庫存歷史記錄

---

### 保留庫存（內部）

**端點**：`POST /api/v1/inventory/reserve`

**描述**：為訂單保留庫存（內部使用，由訂單服務呼叫）

**認證**：必要（服務間）

**請求主體**：
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

**回應**（200 OK）：
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

**錯誤**（422 Unprocessable Entity - 缺貨）：
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

**發布事件**：`Stock.Reserved`

**副作用**： 
- Redis 鎖定：`lock:inventory:{itemId}`（TTL 10 分鐘）
- 臨時庫存保留

---

### 提交庫存保留（內部）

**端點**：`POST /api/v1/inventory/commit`

**描述**：永久扣除保留的庫存（訂單完成時呼叫）

**認證**：必要（服務間）

**請求主體**：
```json
{
  "reservationId": "res-456",
  "orderId": "order-123"
}
```

**回應**（200 OK）：
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

**發布事件**：`Stock.Committed`

**副作用**： 
- 釋放 Redis 鎖定
- PostgreSQL 中的永久庫存扣除
- 檢查低庫存閾值 → 如有需要發布 `Stock.LowAlert`

---

## 付款服務 API

### 建立付款意圖

**端點**：`POST /api/v1/payments/create-intent`

**描述**：為客戶端付款處理建立 Stripe PaymentIntent

**認證**：必要（User、Cashier、Manager、Merchant、Admin）

**請求主體**：
```json
{
  "orderId": "order-123",
  "amount": 3970,
  "currency": "usd"
}
```

**回應**（201 Created）：
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

**副作用**：建立 Stripe PaymentIntent

---

### 處理付款（POS）

**端點**：`POST /api/v1/payments/charge`

**描述**：直接進行付款（用於 POS 現金/刷卡終端機）

**認證**：必要（Cashier、Manager、Merchant、Admin）

**請求主體**：
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

**回應**（201 Created）：
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

**發布事件**：`Payment.Success`

---

### 退款

**端點**：`POST /api/v1/payments/:paymentId/refund`

**描述**：退款（全額或部分）

**認證**：必要（Manager、Merchant、Admin）

**路徑參數**：
- `paymentId`（字串，UUID）：付款識別碼

**請求主體**：
```json
{
  "amount": 3970,
  "reason": "Customer cancellation"
}
```

**回應**（200 OK）：
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

**發布事件**：`Payment.Refunded`

---

## 授權服務 API

### 註冊使用者

**端點**：`POST /api/v1/auth/register`

**描述**：註冊新使用者（Cognito User Pool + PostgreSQL 使用者記錄）

**認證**：無（公開端點）

**請求主體**：
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "phone": "+1234567890"
}
```

**回應**（201 Created）：
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

**副作用**： 
- 建立 Cognito 使用者
- 建立 PostgreSQL 使用者記錄（透過 Cognito pre-signup 觸發器）
- 發送驗證郵件

---

### 登入

**端點**：`POST /api/v1/auth/login`

**描述**：驗證使用者並取得 JWT 令牌

**認證**：無（公開端點）

**請求主體**：
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**回應**（200 OK）：
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

### 更新令牌

**端點**：`POST /api/v1/auth/refresh`

**描述**：使用更新令牌更新存取令牌

**認證**：無（使用更新令牌）

**請求主體**：
```json
{
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**回應**（200 OK）：
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

### 登出

**端點**：`POST /api/v1/auth/logout`

**描述**：使令牌失效

**認證**：必要

**回應**（200 OK）：
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

## 使用者檔案服務 API

### 取得使用者檔案

**端點**：`GET /api/v1/users/:userId`

**描述**：取得使用者檔案

**認證**：必要

**授權**：使用者只能查看自己的檔案，員工可以查看所有檔案

**路徑參數**：
- `userId`（字串，UUID）：使用者識別碼

**回應**（200 OK）：
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

### 更新使用者檔案

**端點**：`PATCH /api/v1/users/:userId`

**描述**：更新使用者檔案

**認證**：必要

**授權**：使用者只能更新自己的檔案

**路徑參數**：
- `userId`（字串，UUID）：使用者識別碼

**請求主體**：
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

**回應**（200 OK）：
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

### 取得使用者訂單歷史

**端點**：`GET /api/v1/users/:userId/orders`

**描述**：取得使用者的訂單歷史

**認證**：必要

**授權**：使用者只能查看自己的訂單

**路徑參數**：
- `userId`（字串，UUID）：使用者識別碼

**查詢參數**：
- `page`（數字，可選，預設：1）
- `limit`（數字，可選，預設：20）
- `status`（字串，可選）：依訂單狀態篩選

**回應**（200 OK）：
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

## 店家服務 API

### 取得店家詳情

**端點**：`GET /api/v1/stores/:storeId`

**描述**：取得店家資訊

**認證**：可選（公開端點）

**路徑參數**：
- `storeId`（字串，UUID）：店家識別碼

**回應**（200 OK）：
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

**快取**：Redis 快取，TTL 10 分鐘

---

### 建立店家

**端點**：`POST /api/v1/stores`

**描述**：建立新店家

**認證**：必要（Merchant、Admin）

**請求主體**：
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

**回應**（201 Created）：
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

**發布事件**：`Store.Created`

---

### 更新店家狀態

**端點**：`PATCH /api/v1/stores/:storeId/status`

**描述**：更新店家線上/離線狀態

**認證**：必要（Manager、Merchant、Admin）

**路徑參數**：
- `storeId`（字串，UUID）：店家識別碼

**請求主體**：
```json
{
  "acceptingOrders": false,
  "reason": "Temporary closure for maintenance"
}
```

**回應**（200 OK）：
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

**發布事件**：`Store.StatusChanged`

---

## 裝置服務 API

### 註冊裝置

**端點**：`POST /api/v1/devices`

**描述**：註冊新硬體裝置（印表機、讀卡機等）

**認證**：必要（Manager、Merchant、Admin）

**請求主體**：
```json
{
  "storeId": "550e8400-e29b-41d4-a716-446655440000",
  "deviceType": "RECEIPT_PRINTER",
  "name": "Kitchen Printer",
  "iotEndpoint": "a1b2c3d4e5f6g7.iot.us-east-1.amazonaws.com",
  "certificateId": "cert-123456"
}
```

**回應**（201 Created）：
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

**發布事件**：`Device.Registered`

---

### 建立列印工作

**端點**：`POST /api/v1/devices/:deviceId/print-jobs`

**描述**：為裝置排隊列印工作

**認證**：必要（服務間或 Manager/Merchant/Admin）

**路徑參數**：
- `deviceId`（字串，UUID）：裝置識別碼

**請求主體**：
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

**回應**（201 Created）：
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

**副作用**：為裝置排隊 SQS 訊息

---

## 通知服務 API

### 發送通知

**端點**：`POST /api/v1/notifications/send`

**描述**：透過多個通路發送通知

**認證**：必要（服務間或 Manager/Merchant/Admin）

**請求主體**：
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

**回應**（202 Accepted）：
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

**副作用**： 
- 透過 SES 發送電子郵件
- 透過 SNS Mobile 發送推播通知
- 將 WebSocket 訊息推送給已連線的客戶端

---

## CRM 服務 API

**狀態**：v0.2.0（MVP + 庫存 + POS）範圍外

**未來功能**：
- 忠誠度點數管理
- 優惠券建立和驗證
- 客戶等級追蹤
- 推薦系統

**可擴充性**：訂單架構包含 `discount` 和 `discountReason` 欄位作為未來自動化優惠券系統的整合掛鉤。

---

## 報表服務 API

**狀態**：v0.2.0（MVP + 庫存 + POS）範圍外

**未來功能**：
- 銷售分析和儀表板
- 庫存報表
- 客戶行為分析
- 每日對帳 Z 報表

**目前方法**：透過訂單表的直接資料庫查詢進行基本報表，使用 `startDate`、`endDate`、`status` 篩選器。

---

## 外送平台 Webhooks API

**狀態**：v0.2.0（MVP + 庫存 + POS）範圍外

**未來功能**：
- UberEats 訂單匯入
- Foodpanda 訂單匯入
- 菜單同步
- 即時狀態更新

**可擴充性**：OrderSource 列舉可在未來版本中擴充以包含 `UBEREATS` 和 `FOODPANDA`。

---

## 版本歷史

| 版本 | 日期 | 作者 | 變更 |
|------|------|--------|------|
| 1.0 | 2025-12-21 | Simon Chou | 初始基準（範圍：v0.2.0 MVP + 庫存 + POS） |

---

## AI 實作注意事項

1. **驗證**：所有請求主體必須依照 JSON schemas 進行驗證
2. **錯誤處理**：使用全球標準章節的標準錯誤代碼
3. **冪等性**：所有 POST 端點應支援冪等性金鑰（標頭：`Idempotency-Key`）
4. **速率限制**：遵守 API Gateway 節流限制
5. **快取**：在指定位置對 GET 端點使用 Redis
6. **事件**：依照文件發布 EventBridge 事件
7. **授權**：依照 RBAC 矩陣檢查權限
8. **追蹤**：為所有 Lambda 函數包含 X-Ray 追蹤
9. **記錄**：以結構化 JSON 格式記錄所有請求/回應
10. **OpenAPI**：本規範應轉換為 OpenAPI 3.0 YAML 以用於 Swagger 文件
