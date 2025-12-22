# My Online Ordering System - 軟體開發計畫

## 文件資訊
- **版本**: 1.1
- **日期**: 2025年12月22日
- **狀態**: 總體藍圖（與 v1.0 設計規格對齊）
- **負責人**: Simon Chou
- **相關文件**: [CONCEPT.md](./CONCEPT.md)

---

## 1. 技術架構

### 1.1 系統概述

本系統採用 **AWS 無伺服器架構**，利用 Lambda 函數進行運算，透過事件驅動通訊和託管服務實現可擴展性和成本優化。

**架構原則：**
- 無伺服器優先方法（AWS Lambda）
- 函數獨立性與鬆散耦合
- API 優先設計（API Gateway）
- 事件驅動通訊（EventBridge、SQS、SNS）
- 託管資料庫服務（Aurora PostgreSQL、Redis）
- 自動擴展與按使用付費
- 內建重試機制的容錯能力

### 1.2 後端微服務

#### 核心業務服務

**1. 菜單服務（Menu Service）**
- **職責**：產品目錄、定價、圖片、客製化選項
- **技術堆疊**：TypeScript（Node.js 20.x Lambda Runtime）+ Drizzle ORM
- **資料庫**：Aurora Serverless v2 PostgreSQL（關聯式資料）+ ElastiCache Redis（快取）+ S3（圖片儲存）
- **Lambda 函數**：
  - `menu-get-handler` - GET /api/v1/menu/:storeId（Redis 快取，5 分鐘 TTL）
  - `menu-create-handler` - POST /api/v1/menu/items
  - `menu-update-handler` - PUT /api/v1/menu/items/:id（清除快取）
  - `menu-availability-handler` - PATCH /api/v1/menu/items/:id/availability（清除快取）
- **連線**：RDS Proxy（Lambda 連線池）
- **事件**：EventBridge 事件 → `Menu.Updated`、`Item.SoldOut`、`Item.BackInStock`

**2. 訂單服務（Order Service）**
- **職責**：訂單生命週期、狀態機、交易協調
- **技術堆疊**：TypeScript（Node.js 20.x Lambda Runtime）+ Drizzle ORM + Step Functions（狀態機）
- **資料庫**：Aurora Serverless v2 PostgreSQL（訂單的 ACID 交易）
- **狀態機**：AWS Step Functions
  ```
  待處理 → 已付款 → 已確認 → 準備中 → 完成 → 已完成
           ↓                    ↓
        已取消              已拒絕
  ```
- **Lambda 函數**：
  - `order-create-handler` - POST /api/v1/orders（與庫存鎖定的交易）
  - `order-get-handler` - GET /api/v1/orders/:id
  - `order-update-status-handler` - PATCH /api/v1/orders/:id/status
  - `order-cancel-handler` - POST /api/v1/orders/:id/cancel（回滾交易）
- **連線**：RDS Proxy（連線池）
- **事件**：EventBridge → `Order.Created`、`Order.Paid`、`Order.StatusChanged`、`Order.Cancelled`

**3. 庫存服務（Inventory Service）**
- **職責**：配方驅動的食材追蹤、庫存預留、自動警報
- **技術堆疊**：TypeScript（Node.js 20.x Lambda Runtime）+ Drizzle ORM
- **資料庫**： 
  - Aurora Serverless v2 PostgreSQL（基於配方扣減的食材庫存）
  - ElastiCache Redis（臨時預留鎖定，TTL）
- **核心功能**：
  - **配方驅動庫存**：庫存扣減透過配方進行（食材級追蹤）
  - **集中式變體註冊表**：主變體 + 上下文覆寫（尺寸、溫度、甜度）
  - Redis 中的庫存預留鎖定（10 分鐘 TTL）
  - PostgreSQL 行級鎖定用於原子更新
  - EventBridge 排程規則用於鎖定清理
  - 多租戶：所有庫存資料按 `storeId` 隔離
- **Lambda 函數**：
  - `inventory-reserve-handler` - POST /api/v1/inventory/reserve（Redis 鎖定 + DB 檢查）
  - `inventory-commit-handler` - POST /api/v1/inventory/commit（透過配方在 PostgreSQL 中原子遞減）
  - `inventory-release-handler` - POST /api/v1/inventory/release（移除 Redis 鎖定）
  - `inventory-check-handler` - GET /api/v1/inventory/:itemId（Redis 快取）
  - `inventory-cleanup-cron` - EventBridge 觸發器（每分鐘清理過期鎖定）
- **連線**：RDS Proxy
- **事件**：EventBridge → `Stock.Reserved`、`Stock.Committed`、`Stock.LowAlert`、`Stock.Depleted`

**4. 付款服務（Payment Service）**
- **職責**：付款閘道抽象、對帳
- **技術堆疊**：TypeScript（Node.js 20.x Lambda Runtime）+ Drizzle ORM + AWS SDK v3
- **資料庫**：Aurora Serverless v2 PostgreSQL（付款記錄，ACID 關鍵）+ ElastiCache Redis（冪等性金鑰）
- **整合**：Stripe SDK、LinePay API、AWS Secrets Manager（憑證）
- **Lambda 函數**：
  - `payment-charge-handler` - POST /api/v1/payments/charge（與訂單更新的交易）
  - `payment-refund-handler` - POST /api/v1/payments/refund（原子退款記錄）
  - `payment-status-handler` - GET /api/v1/payments/:orderId/status
  - `payment-webhook-handler` - Stripe/LinePay webhooks（冪等處理）
- **安全性**： 
  - PCI DSS Level 1 合規性
  - 代幣化（無卡片儲存）
  - Redis 冪等性（24 小時 TTL）
  - PostgreSQL 交易確保付款一致性
  - Secrets Manager 儲存 API 金鑰
- **連線**：RDS Proxy
- **事件**：EventBridge → `Payment.Success`、`Payment.Failed`、`Payment.Refunded`

#### 使用者與存取管理

**5. 授權服務（Authorization Service）**
- **職責**：驗證、RBAC、會話管理
- **技術堆疊**：AWS Cognito（託管驗證）+ TypeScript Lambda（自訂流程）+ Drizzle ORM
- **資料庫**：Cognito User Pools（驗證）+ Aurora Serverless v2 PostgreSQL（使用者元資料、權限）
- **角色**：User、Cashier、Lead（班次主管）、Manager、Merchant、Admin（Cognito Groups + PostgreSQL 角色表）
- **RBAC 模型**：基於角色的存取控制，與設計規格對齊的細粒度權限
- **Lambda 函數**：
  - `auth-pre-signup-trigger` - Cognito 註冊前驗證，在 PostgreSQL 中建立使用者記錄
  - `auth-post-confirmation` - 註冊後動作，同步到資料庫
  - `auth-custom-message` - 自訂郵件模板
  - `auth-token-validator` - API Gateway 授權器（驗證 Cognito JWT + 檢查 PostgreSQL 權限）
- **連線**：RDS Proxy
- **安全性**：Cognito 密碼策略、JWT（RS256）、MFA 支援、令牌刷新

**6. 使用者檔案服務（User Profile Service）**
- **職責**：客戶資料、偏好設定、已儲存付款方式
- **技術堆疊**：TypeScript（Node.js 20.x Lambda Runtime）+ Drizzle ORM
- **資料庫**：Aurora Serverless v2 PostgreSQL（使用者檔案，關聯式資料）
- **Lambda 函數**：
  - `profile-get-handler` - GET /api/v1/users/:id（Redis 快取）
  - `profile-update-handler` - PUT /api/v1/users/:id（清除快取）
  - `profile-payment-methods-handler` - POST /api/v1/users/:id/payment-methods（加密）
  - `profile-orders-handler` - GET /api/v1/users/:id/orders（與訂單表 JOIN）
- **連線**：RDS Proxy

#### 營運服務

**7. 店家服務（Store Service）**
- **職責**：餐廳配置、營業時間、外送規則
- **技術堆疊**：TypeScript（Node.js 20.x Lambda Runtime）+ Drizzle ORM
- **資料庫**：Aurora Serverless v2 PostgreSQL（店家配置）+ ElastiCache Redis（快取）+ CloudFront（邊緣快取）
- **Lambda 函數**：
  - `store-get-handler` - GET /api/v1/stores/:id（Redis 快取，10 分鐘 TTL）
  - `store-update-hours-handler` - PUT /api/v1/stores/:id/hours（清除快取）
  - `store-status-handler` - PATCH /api/v1/stores/:id/status（清除快取，通知 WebSocket）
  - `store-delivery-zones-handler` - PUT /api/v1/stores/:id/delivery-zones（JSONB 欄位）
- **連線**：RDS Proxy
- **事件**：EventBridge → `Store.StatusChanged`、`Store.ConfigUpdated`

**8. 裝置服務（Device Service）**
- **職責**：硬體註冊表、列印工作、健康監控
- **技術堆疊**：TypeScript（Node.js 20.x Lambda Runtime）+ Drizzle ORM + AWS IoT Core（裝置通訊）
- **資料庫**：Aurora Serverless v2 PostgreSQL（裝置註冊表、狀態日誌）+ SQS（工作佇列）
- **支援裝置**：
  - 收據印表機（ESC/POS、StarPRNT 透過 IoT）
  - 讀卡機（PAX、Verifone）
  - 收銀機抽屜（RJ11）
  - KDS 顯示器
- **Lambda 函數**：
  - `device-register-handler` - POST /api/v1/devices（儲存至 PostgreSQL）
  - `device-print-job-handler` - POST /api/v1/devices/:id/print → SQS（工作佇列）
  - `device-status-handler` - GET /api/v1/devices/:id/status（來自 IoT Core 的即時資料 + PostgreSQL 的歷史資料）
  - `device-iot-consumer` - 處理 IoT Core 訊息，記錄至 PostgreSQL
- **連線**：RDS Proxy
- **協定**：AWS IoT Core（MQTT）、乙太網路、藍牙
- **事件**：EventBridge → `Device.Registered`、`Device.Offline`、`PrintJob.Completed`

**9. 通知服務（Notification Service）**
- **職責**：多通道訊息傳遞、即時推播
- **技術堆疊**：TypeScript（Node.js 20.x Lambda Runtime）+ Drizzle ORM + API Gateway WebSocket API
- **資料庫**：Aurora Serverless v2 PostgreSQL（通知歷史）+ ElastiCache Redis（WebSocket 連線 ID）
- **通道**：WebSocket（API Gateway）、郵件（SES）、簡訊（SNS）、推播（SNS Mobile）
- **Lambda 函數**：
  - `notification-send-handler` - POST /api/v1/notifications/send（記錄至 PostgreSQL）
  - `websocket-connect` - WebSocket $connect 路由（將 connectionId 儲存至 Redis）
  - `websocket-disconnect` - WebSocket $disconnect 路由（從 Redis 移除）
  - `notification-dispatcher` - EventBridge 消費者 → 扇出至各通道
- **連線**：RDS Proxy
- **訂閱事件**：透過 EventBridge 規則訂閱所有網域事件

#### 商業智慧

**10. CRM 服務（CRM Service）**
- **職責**：忠誠度、優惠券、客戶分群
- **技術堆疊**：TypeScript（Node.js 20.x Lambda Runtime）+ Drizzle ORM + SageMaker（ML 推薦）
- **資料庫**：Aurora Serverless v2 PostgreSQL（點數、優惠券、交易）+ ElastiCache Redis（優惠券驗證快取）
- **Lambda 函數**：
  - `crm-points-handler` - GET /api/v1/crm/users/:id/points（Redis 快取）
  - `crm-coupon-create-handler` - POST /api/v1/crm/coupons（PostgreSQL 含到期日）
  - `crm-coupon-validate-handler` - POST /api/v1/crm/coupons/:code/validate（先檢查 Redis 快取）
  - `crm-recommendation-handler` - SageMaker 推論端點（從 PostgreSQL 查詢）
- **功能**： 
  - 分級會員制（PostgreSQL 觸發器計算等級）
  - 生日獎勵（EventBridge 排程規則 + PostgreSQL 查詢）
  - 推薦獎金（關聯式追蹤）
- **連線**：RDS Proxy
- **事件**：EventBridge → `Points.Earned`、`Coupon.Applied`、`Tier.Upgraded`

**11. 報表服務（Report Service）**
- **職責**：分析、儀表板、異常偵測
- **技術堆疊**：TypeScript（Node.js 20.x Lambda Runtime）+ Drizzle ORM + AWS Glue（ETL）+ Athena（SQL 分析）
- **資料庫**： 
  - Aurora Serverless v2 PostgreSQL（即時查詢，報表的物化檢視）
  - S3（透過 Glue 從 PostgreSQL 匯出的歷史資料）
  - Athena（查詢 S3 進行長期分析）
  - QuickSight（儀表板，連接至 PostgreSQL + Athena）
- **報表**：
  - 每日 Z 報表（來自 PostgreSQL 的銷售摘要）
  - 按小時/天/週的暢銷商品（PostgreSQL 聚合）
  - 員工績效（跨訂單、使用者表的 JOIN）
  - 異常警報（卡住的訂單、詐欺模式）
- **Lambda 函數**：
  - `report-sales-handler` - GET /api/v1/reports/sales/daily（PostgreSQL 查詢，已快取）
  - `report-bestsellers-handler` - GET /api/v1/reports/items/best-sellers（物化檢視）
  - `report-anomalies-handler` - GET /api/v1/reports/anomalies（PostgreSQL 查詢）
  - `report-z-report-generator` - EventBridge 排程（每日凌晨 2 點，生成 PDF）
  - `report-anomaly-scanner` - EventBridge 排程（每 5 分鐘，檢查訂單狀態）
- **連線**：RDS Proxy
- **ETL**：AWS Glue 每日將 PostgreSQL 資料匯出至 S3 以進行長期儲存

#### 整合層

**12. 外送平台 Webhooks（Delivery Platform Webhooks）**
- **職責**：UberEats/Foodpanda 整合、訂單匯入與菜單同步
- **技術堆疊**：TypeScript（Node.js 20.x Lambda Runtime）+ Drizzle ORM + axios/node-fetch
- **資料庫**：Aurora Serverless v2 PostgreSQL（訂單對應、同步日誌）+ ElastiCache Redis（去重，1 小時 TTL）
- **多租戶**：所有平台訂單和同步資料按 `storeId` 隔離
- **支援平台**：
  - UberEats Webhook API
  - Foodpanda Partner API
- **Lambda 函數**：
  - `webhook-ubereats-handler` - POST /webhooks/ubereats/order（Redis 冪等）
  - `webhook-foodpanda-handler` - POST /webhooks/foodpanda/order（Redis 冪等）
  - `webhook-signature-validator` - HMAC-SHA256 驗證
  - `platform-status-sync` - 出站狀態更新（記錄至 PostgreSQL）
  - `platform-menu-sync` - 菜單/庫存同步（EventBridge 排程，從 PostgreSQL 讀取）
- **連線**：RDS Proxy
- **重試邏輯**：SQS 指數退避，DLQ 處理失敗
- **事件**：EventBridge → `ExternalOrder.Received`、`Platform.SyncFailed`

### 1.3 前端應用程式

**通用前端技術堆疊**

所有前端應用程式都採用統一的技術堆疊，以確保一致性和程式碼可重用性：

- **UI 框架**：React 18 + TypeScript
  - 基於元件的架構
  - 型別安全的 props 和狀態管理
  - 跨所有應用程式的共享元件庫
  
- **開發環境**：Node.js 20.x + Vite
  - **Node.js**：開發工具的執行環境（Vite、ESLint、建置腳本）
  - **Vite**：閃電般快速的建置工具和開發伺服器
    - 熱模組替換（HMR）< 100ms
    - 透過 esbuild 編譯 TypeScript
    - 開發伺服器啟動 < 2 秒
    - 使用 Rollup 進行生產打包（樹搖、程式碼分割、壓縮）
  
- **語言**：TypeScript（編譯為 JavaScript）
  - 所有元件使用 `.tsx` 檔案
  - 啟用嚴格模式（`strict: true`）
  - 前端和後端之間共享型別定義
  
- **樣式**：SCSS（Sass）with CSS Modules
  - 元件範圍樣式
  - 變數、混合和巢狀
  - BEM 命名慣例以提高清晰度

**注意**：雖然所有應用程式都使用 React + TypeScript，但它們會被編譯為 JavaScript 並在各自的環境中執行：
- **Web 應用程式**（User Client、Merchant Dashboard、KDS）：在瀏覽器中執行
- **桌面應用程式**（Kiosk、POS）：在 Electron（Chromium + Node.js）中執行

**開發工作流程**：
```bash
# 所有前端應用程式都遵循此模式
npm run dev      # Vite 開發伺服器（由 Node.js 驅動）
npm run build    # Vite 生產建置（TypeScript → JavaScript）
npm run preview  # 在本地預覽生產建置
```

---

**1. 使用者客戶端（行動網頁 PWA）**
- **框架**：React 18 + TypeScript + Vite
- **狀態管理**：Redux Toolkit
- **樣式**：SCSS（Sass）with CSS Modules
- **核心功能**：
  - 響應式設計（行動優先）
  - 離線支援（Service Worker）
  - PWA 可安裝
  - 圖片優化（CloudFront + S3，延遲載入）
  - 即時訂單追蹤（API Gateway WebSocket）
- **API 整合**：AWS Amplify / Axios（REST API + WebSocket）
- **頁面**：
  - `/` - 店家選擇
  - `/menu` - 瀏覽菜單
  - `/cart` - 購物車
  - `/checkout` - 付款
  - `/orders/:id` - 訂單追蹤
  - `/profile` - 使用者設定

**2. 商家儀表板（Merchant Dashboard）**
- **框架**：React 18 + TypeScript + Vite
- **狀態管理**：Redux Toolkit
- **樣式**：SCSS 基於元件的架構
- **UI 元件**：自訂元件 + Ant Design（可選）
- **圖表**：Recharts / Chart.js
- **API 整合**：AWS Amplify（驗證 + API）+ Axios
- **頁面**：
  - `/dashboard` - 概覽指標（QuickSight 嵌入）
  - `/orders` - 訂單管理
  - `/menu` - 菜單編輯器
  - `/inventory` - 庫存管理
  - `/staff` - 使用者角色（Cognito 整合）
  - `/reports` - 分析
  - `/settings` - 店家配置
- **即時更新**：API Gateway WebSocket 用於即時訂單提要

**3. Kiosk（自助服務）**
- **框架**：Electron + React 18 + TypeScript + Vite
- **狀態管理**：Redux Toolkit
- **樣式**：SCSS（觸控優化，大型 UI 元素）
- **顯示器**：觸控優化（最小 1920×1080）
- **周邊設備**：
  - 讀卡機 SDK 整合
  - 收據印表機（透過 AWS IoT Core）
  - QR 碼掃描器
- **API 整合**：AWS SDK for JavaScript（API 呼叫至 Lambda）
- **無障礙功能**：大按鈕、語音協助、多語言
- **自動重置**：閒置 60 秒後返回首頁
- **離線模式**：IndexedDB 快取，SQS 佇列用於重試

**4. POS（收銀系統）**
- **框架**：Electron + React 18 + TypeScript + Vite
- **狀態管理**：Redux Toolkit
- **樣式**：SCSS（桌面優化）
- **周邊設備**：
  - 收銀機抽屜（RJ11 觸發）
  - 條碼掃描器
  - 收據印表機（透過 AWS IoT Core）
  - 顧客顯示器（可選）
- **API 整合**：AWS SDK for JavaScript + Cognito（員工驗證）
- **功能**：
  - 快速訂單輸入（鍵盤快捷鍵）
  - 拆分付款
  - 訂單修改
  - 員工打卡（PostgreSQL 記錄）
  - 日結報表列印
- **安全性**：Cognito 員工登入，CloudWatch 動作記錄

**5. KDS（廚房顯示系統）**
- **框架**：React 18 + TypeScript + Vite（基於網頁，大螢幕電視）
- **狀態管理**：Redux Toolkit（最小化，主要是即時 WebSocket 資料）
- **樣式**：SCSS（大文字，廚房環境的高對比）
- **顯示器**：40 吋以上電視，每 2 秒自動重新整理（WebSocket 更新）
- **API 整合**：API Gateway WebSocket（即時訂單更新）
- **佈局**：
  - 訂單卡片按時間排序
  - 顏色編碼優先級（緊急、排程、延遲）
  - 工作站篩選（熱食、冷食、飲料）
- **音訊**：HTML5 Audio API 用於訂單到達提示音
- **Bump**：觸控/點擊標記完成（Lambda 更新）
- **多螢幕**：透過 URL 參數支援多個工作站

### 1.4 資料庫設計

**Aurora Serverless v2 PostgreSQL（主要資料庫）**

**架構設計（Drizzle ORM）**
```typescript
// 核心表（範例）
import { pgTable, uuid, text, decimal, boolean, timestamp, json, index } from 'drizzle-orm/pg-core';
import { pgEnum } from 'drizzle-orm/pg-core';

export const orderStatus = pgEnum('OrderStatus', ['PENDING', 'PAID', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED', 'REJECTED']);
export const orderSource = pgEnum('OrderSource', ['USER_CLIENT', 'KIOSK', 'POS', 'UBER_EATS', 'FOODPANDA']);

export const stores = pgTable('Store', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  businessHours: json('businessHours'), // JSONB 欄位用於彈性的營業時間
  deliveryZones: json('deliveryZones'), // JSONB 用於地理圍欄資料
  acceptingOrders: boolean('acceptingOrders').default(true).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull()
});

export const menuItems = pgTable('MenuItem', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('storeId').notNull().references(() => stores.id),
  categoryId: uuid('categoryId').notNull(),
  name: text('name').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  imageUrl: text('imageUrl'),
  isAvailable: boolean('isAvailable').default(true).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull()
}, (table) => ({
  storeAvailableIdx: index('MenuItem_storeId_isAvailable_idx').on(table.storeId, table.isAvailable)
}));

export const inventory = pgTable('Inventory', {
  itemId: uuid('itemId').primaryKey().references(() => menuItems.id),
  stockCount: decimal('stockCount').default('0').notNull(),
  lowThreshold: decimal('lowThreshold').default('10').notNull(),
  lastUpdated: timestamp('lastUpdated').defaultNow().notNull()
});

export const orders = pgTable('Order', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('storeId').notNull().references(() => stores.id),
  userId: uuid('userId'),
  status: orderStatus('status').default('PENDING').notNull(),
  source: orderSource('source').default('USER_CLIENT').notNull(),
  totalAmount: decimal('totalAmount', { precision: 10, scale: 2 }).notNull(),
  scheduledPickup: timestamp('scheduledPickup'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull()
}, (table) => ({
  storeStatusCreatedIdx: index('Order_storeId_status_createdAt_idx').on(table.storeId, table.status, table.createdAt),
  userCreatedIdx: index('Order_userId_createdAt_idx').on(table.userId, table.createdAt)
}));
```

**連線管理**
- **RDS Proxy**：Lambda 的連線池（解決冷啟動連線問題）
- **最大連線數**：基於 Lambda 並發的自動擴展
- **Drizzle Client**：每個 Lambda 熱啟動的輕量級實例（~5KB vs Prisma 的 ~20MB）

**ElastiCache Redis（快取與臨時資料）**
- **菜單快取**：`menu:{storeId}`（TTL 5 分鐘，更新時清除）
- **店家配置快取**：`store:{storeId}`（TTL 10 分鐘）
- **使用者檔案快取**：`user:{userId}`（TTL 15 分鐘）
- **庫存鎖定**：`lock:inventory:{itemId}`（TTL 10 分鐘）
- **優惠券快取**：`coupon:{code}`（TTL 直到到期）
- **WebSocket 連線**：`ws:connection:{userId}`（活動連線）
- **冪等性金鑰**：`idempotency:{key}`（TTL 24 小時）
- **速率限制**：`rate:{ip}:{endpoint}`（滑動視窗）

**S3 + Athena（長期分析的資料湖）**
- **每日匯出**：AWS Glue 工作將 PostgreSQL 資料匯出至 S3（Parquet 格式）
- **分區**：`s3://bucket/year=2025/month=12/day=17/orders.parquet`
- **Athena 查詢**：歷史分析（> 3 個月的舊資料）
- **成本優化**：僅在 Aurora 中保留 3 個月，其餘存放在 S3

**關鍵設計模式**
- **Drizzle Kit 遷移**：版本控制的架構變更
- **JSONB 欄位**：彈性資料（營業時間、外送區域）
- **物化檢視**：預先計算的報表（每小時重新整理）
- **行級鎖定**：庫存原子更新（Drizzle 支援原始 SQL 的 `SELECT FOR UPDATE`）
- **PostgreSQL 觸發器**：自動更新 `updatedAt`、庫存警報
- **索引策略**：常見查詢模式的複合索引
- **Cache-Aside 模式**：檢查 Redis → 未命中 → 查詢 PostgreSQL → 更新 Redis

### 1.5 通訊模式

**同步（REST API）**
- **API Gateway（HTTP API）**：路由至 Lambda 函數
- **授權器**：Lambda 授權器（Cognito JWT 驗證）
- **速率限制**：API Gateway 節流（每個 IP 每秒 100 個請求）
- **CORS**：按路由配置

**非同步（事件驅動）**
- **EventBridge**：網域事件的事件匯流排
  - 規則將事件路由到目標（Lambda、SQS、SNS）
  - 範例：`Order.Created` → [通知 Lambda、庫存 Lambda、CRM Lambda]
- **SQS**：列印工作、webhook 重試的工作佇列
  - 標準佇列用於高吞吐量
  - FIFO 佇列用於訂單處理
  - 失敗訊息的死信佇列（DLQ）
- **SNS**：多通道通知的扇出
- **重試策略**：SQS 指數退避（3 次嘗試）

**即時（WebSocket）**
- **API Gateway WebSocket API**：持久連線
- **連線管理**：Redis（connectionId 儲存）
- **路由**： 
  - `$connect` - Lambda 將 connectionId 儲存至 Redis
  - `$disconnect` - Lambda 從 Redis 移除 connectionId
  - `$default` - Lambda 處理訊息
- **推播**：Lambda 呼叫 `@connections` API 發送訊息
- **驗證**：查詢字串中的 Cognito 令牌

---

## 2. 技術堆疊詳情

### 2.1 後端技術

| 元件 | 技術 | 理由 |
|-----------|-----------|---------------|
| **運算** | AWS Lambda（Node.js 20.x） | 無伺服器、自動擴展、按使用付費、非同步 I/O 效能 |
| **語言** | TypeScript | 型別安全、與前端一致、更好的開發體驗、減少執行階段錯誤 |
| **ORM** | Drizzle ORM | 型別安全查詢、輕量級（~5KB vs Prisma 的 ~20MB）、針對無伺服器冷啟動優化 |
| **API Gateway** | AWS API Gateway（HTTP + WebSocket） | 託管服務、節流、驗證、WebSocket 支援 |
| **驗證** | AWS Cognito | 託管使用者池、OAuth2、MFA、無需自訂驗證程式碼 |
| **資料庫（主要）** | Aurora Serverless v2 PostgreSQL | ACID 合規性、關聯式資料、自動擴展、熟悉的 SQL |
| **連線池** | RDS Proxy | 管理 Lambda 連線、減少冷啟動影響 |
| **快取** | ElastiCache Redis | 記憶體內速度、TTL、發布/訂閱、會話儲存 |
| **事件匯流排** | EventBridge | 事件驅動架構、規則引擎、架構註冊表 |
| **訊息佇列** | SQS + SNS | 可靠、解耦、DLQ、扇出 |
| **工作流程** | Step Functions | 狀態機編排、視覺化工作流程 |
| **物件儲存** | S3 + CloudFront | 圖片儲存、CDN、低成本 |
| **資料湖** | S3 + Athena + Glue | 歷史分析、S3 上的 SQL、從 PostgreSQL 匯出 |
| **ML** | SageMaker | 託管 ML、推論端點 |

### 2.2 前端技術

| 元件 | 技術 | 理由 |
|-----------|-----------|---------------|
| **Web 框架** | React 18 | 元件可重用性、生態系統、虛擬 DOM |
| **行動框架** | React（PWA） | 程式碼共享、離線支援、可安裝 |
| **桌面（Kiosk/POS）** | Electron + React | 硬體存取、原生感覺、跨平台 |
| **狀態管理** | Redux Toolkit | 可預測的狀態、開發工具、非同步處理 |
| **樣式** | **SCSS（Sass）** | 變數、巢狀、混合、可維護的 CSS |
| **CSS 架構** | CSS Modules + BEM | 元件隔離、命名慣例 |
| **建置工具** | Vite | 快速 HMR、現代打包、優化建置 |
| **TypeScript** | 是 | 型別安全、更好的開發體驗、提早捕獲錯誤 |
| **AWS 整合** | AWS Amplify | 驗證、API、儲存 SDK |
| **HTTP 客戶端** | Axios | 基於 Promise、攔截器、錯誤處理 |

### 2.3 DevOps 與基礎設施

| 元件 | 技術 | 目的 |
|-----------|-----------|---------|
| **基礎設施即程式碼** | AWS SAM / Serverless Framework | Lambda 部署、API Gateway 配置 |
| **替代 IaC** | AWS CDK（TypeScript） | 型別安全的基礎設施、與後端相同的語言 |
| **CI/CD** | GitHub Actions + AWS CodePipeline | 自動化測試、部署 |
| **監控** | CloudWatch | 指標、日誌、警報、儀表板 |
| **日誌記錄** | CloudWatch Logs + Insights | 集中式日誌、日誌查詢 |
| **追蹤** | X-Ray | 分散式追蹤、服務映射 |
| **密鑰管理** | AWS Secrets Manager + Parameter Store | API 金鑰、資料庫憑證 |
| **CDN** | CloudFront | 資產交付、DDoS 防護、邊緣快取 |
| **DNS** | Route 53 | 網域管理、健康檢查 |
| **安全性** | WAF + Shield | DDoS 防護、速率限制 |
| **成本管理** | Cost Explorer + Budgets | 成本追蹤、警報 |

### 2.4 安全性堆疊

| 層級 | 實作 |
|-------|----------------|
| **驗證** | JWT（RS256）、OAuth2、bcrypt |
| **授權** | 具有策略引擎的 RBAC |
| **API 安全性** | 速率限制、CORS、CSRF 令牌 |
| **資料加密** | TLS 1.3、靜態 AES-256 |
| **付款安全性** | PCI DSS Level 1、代幣化 |
| **密鑰** | Vault、環境變數 |
| **漏洞掃描** | Snyk、OWASP ZAP |
| **滲透測試** | 年度第三方稽核 |

---

## 3. 開發階段（獨立開發者搭配 AI 協助）

**概述**：本開發計畫專為使用 AI 協助的獨立開發者設計，總時程約 44-64 週（11-16 個月）。每個版本都可以獨立運作並提供完整價值。

**開發方法**：
- AI 輔助程式碼生成以加快開發速度
- 漸進式交付 - 每個版本都已準備好上線
- 優先關注核心功能，逐步增加複雜性
- 每週進度里程碑用於追蹤

**版本編號**：
- **v0.x.x**：測試版本（開發階段）
- **v1.0.0**：正式版本（公開上線）

---

### Version 0.1.0：MVP - 核心訂餐系統（第 1-16 週）

**目標**：建立基礎線上訂餐系統，讓客戶可以訂餐，商家可以管理

---

#### 階段 1：基礎與基礎設施（第 1-4 週）

**目標**：AWS 環境設定、資料庫設計、CI/CD 管線

**任務**：
- AWS 帳戶設定（Lambda、API Gateway、Aurora、RDS Proxy、ElastiCache）
- GitHub 儲存庫初始化
- CI/CD 管線設定（GitHub Actions）
  - 語法檢查與測試自動化
  - 部署到開發環境
- 資料庫架構設計（Drizzle ORM）
  - 表：stores、menu_items、categories、orders、order_items、payments、users
  - 索引優化
- API Gateway 配置（HTTP + WebSocket）
- CloudWatch 監控設定
- Secrets Manager 配置（資料庫憑證、API 金鑰）

**交付成果**：
- ✅ AWS 基礎設施已佈建
- ✅ 資料庫架構已定案（Drizzle 架構檔案）
- ✅ CI/CD 管線運作正常
- ✅ 開發環境就緒

**里程碑**：
- 第 2 週：AWS 設定完成，資料庫已建立
- 第 4 週：CI/CD 運作中，可以部署 Lambda 函數

---

#### 階段 2：授權與店家服務（第 5-8 週）

**目標**：使用者驗證和店家管理

**要建立的服務**：
- **授權服務（Authorization Service）**
  - Cognito User Pool 設定
  - JWT 令牌驗證（Lambda 授權器）
  - 使用者註冊/登入端點
  - 密碼重設流程
  - Cognito Groups（User、Merchant、Cashier、Manager、Admin）
  
- **店家服務（Store Service）**
  - 店家 CRUD 操作
  - 營業時間管理（JSONB）
  - 外送區域配置
  - 店家狀態切換（接受訂單）
  - Redis 快取（10 分鐘 TTL）

**Lambda 函數**：
- `auth-pre-signup-trigger`、`auth-post-confirmation`、`auth-token-validator`
- `store-get-handler`、`store-update-handler`、`store-delivery-zones-handler`

**交付成果**：
- ✅ 使用者註冊和登入運作正常
- ✅ JWT 驗證流程完成
- ✅ 店家管理 API 就緒
- ✅ Redis 快取整合

**里程碑**：
- 第 6 週：Cognito 設定完成，驗證端點運作中
- 第 8 週：店家服務完成，含快取功能

**測試**：驗證邏輯的單元測試、JWT 驗證測試

---

#### 階段 3：菜單與訂單服務（第 9-12 週）

**目標**：菜單管理和訂單處理

**要建立的服務**：
- **菜單服務（Menu Service）**
  - 菜單項目 CRUD
  - 類別管理
  - 可用性切換
  - 圖片上傳（S3 + CloudFront）
  - Redis 快取（5 分鐘 TTL，更新時清除）
  
- **訂單服務（Order Service）**
  - 訂單建立與驗證
  - 訂單狀態機（PENDING → PAID → CONFIRMED → PREPARING → READY → COMPLETED）
  - 訂單歷史查詢
  - EventBridge 事件發布（Order.Created、Order.StatusChanged）

**Lambda 函數**：
- `menu-get-handler`、`menu-create-handler`、`menu-update-handler`、`menu-delete-handler`
- `order-create-handler`、`order-get-handler`、`order-update-status-handler`、`order-list-handler`

**交付成果**：
- ✅ 菜單管理 API 完成
- ✅ 訂單建立和狀態更新運作正常
- ✅ 事件驅動架構（EventBridge）
- ✅ 圖片儲存（S3 + CloudFront CDN）

**里程碑**：
- 第 10 週：菜單服務完成，含圖片上傳
- 第 12 週：訂單服務完成，含狀態機

**測試**：訂單狀態機測試、事件發布驗證

---

#### 階段 4：付款、通知與前端（第 13-16 週）

**目標**：付款整合和面向使用者的應用程式

**要建立的服務**：
- **付款服務（Payment Service）**
  - Stripe 整合（信用卡付款）
  - 付款意圖建立
  - Webhook 處理（付款確認）
  - 退款處理
  
- **通知服務（Notification Service）**
  - WebSocket 連線管理（API Gateway WebSocket）
  - Redis 連線 ID 儲存
  - 即時推播通知
  - 郵件通知（SES）
  - EventBridge 事件訂閱

**前端應用程式**：
- **使用者客戶端（PWA - React 18 + TypeScript + Vite）**
  - 頁面：菜單瀏覽、購物車、結帳、訂單追蹤
  - Redux Toolkit 狀態管理
  - PWA 設定（Service Worker、manifest）
  - 響應式設計（行動優先）
  - WebSocket 整合用於即時更新
  
- **商家儀表板（React 18 + TypeScript + Vite）**
  - 頁面：訂單管理、菜單編輯器、基本設定
  - 即時訂單提要（WebSocket）
  - 每日銷售摘要

**Lambda 函數**：
- `payment-create-intent`、`payment-webhook-handler`、`payment-refund-handler`
- `notification-websocket-connect`、`notification-websocket-disconnect`、`notification-send-handler`

**交付成果**：
- ✅ Stripe 付款整合運作正常
- ✅ 即時 WebSocket 通知
- ✅ 使用者客戶端 PWA（可安裝、響應式）
- ✅ 商家儀表板運作正常
- ✅ 端到端訂單流程完成

**里程碑**：
- 第 14 週：付款服務完成，Stripe 測試模式運作中
- 第 15 週：使用者客戶端 MVP 完成
- 第 16 週：商家儀表板完成，完整系統測試

**測試**： 
- 付款 webhook 測試（Stripe CLI）
- WebSocket 連線穩定性
- 端到端訂單流程：瀏覽 → 購物車 → 結帳 → 付款 → 通知

**Version 0.1.0 成功標準**：
- 客戶可以瀏覽菜單、下訂單、刷卡付款
- 商家可以即時查看訂單、管理菜單
- 提供基本的每日銷售報表
- 系統已部署到正式環境（測試版）

---

### Version 0.2.0：庫存與 POS 系統（第 17-28 週）

**目標**：新增櫃檯營運的庫存管理和收銀系統功能

---

#### 階段 1：庫存服務（第 17-20 週）

**目標**：配方驅動的食材級庫存追蹤與即時扣減

**要建立的服務**：
- **庫存服務（Inventory Service）**
  - **配方驅動庫存系統**： 
    - 食材級追蹤（咖啡豆、牛奶、糖等）
    - 配方定義：將菜單項目 + 變體對應到食材扣減
    - 配方條件：根據客製化選項觸發特定配方
    - 下訂單時透過配方即時扣減
  - **集中式變體註冊表**：
    - 店家範圍的變體（尺寸、溫度、甜度級別）
    - 新店家的應用層播種
    - 程式碼自動生成（僅供內部使用）
  - 低庫存警報（EventBridge 事件）
  - 原子庫存鎖定（PostgreSQL `SELECT FOR UPDATE`）
  - 批量庫存調整
  - 庫存歷史記錄
  - 多租戶：所有庫存資料按 `storeId` 隔離

**資料庫架構更新**：
- 表：`inventory_items`（食材）、`variants`（店家範圍）、`recipes`、`recipe_conditions`、`inventory_logs`
- PostgreSQL 觸發器用於自動警報
- 在架構層級強制執行店家隔離

**Lambda 函數**：
- `inventory-get-handler`、`inventory-update-handler`、`inventory-deduct-handler`（基於配方）、`inventory-alert-handler`
- `recipe-create-handler`、`recipe-condition-handler`

**交付成果**：
- ✅ 配方驅動的庫存追蹤，含食材級扣減
- ✅ 集中式變體註冊表（店家範圍）
- ✅ 低庫存警報（EventBridge → 郵件）
- ✅ 訂單確認時透過配方進行庫存扣減
- ✅ 儀表板中的庫存管理 UI（食材 + 配方）

**里程碑**：
- 第 18 週：庫存服務完成，含配方系統
- 第 20 週：低庫存警報運作中，儀表板 UI 已整合

**測試**： 
- 配方扣減準確性測試
- 基於變體的配方觸發
- 並發測試（10+ 個同時訂單的競爭條件）
- 鎖定逾時情境

---

#### 階段 2：使用者檔案與裝置服務（第 21-24 週）

**目標**：客戶檔案和裝置註冊表

**要建立的服務**：
- **使用者檔案服務（User Profile Service）**
  - 客戶檔案 CRUD
  - 訂單歷史（與訂單表 JOIN）
  - 已儲存地址（JSONB 陣列）
  - 通知偏好設定
  
- **裝置服務（軟體層）**
  - 裝置註冊（POS 終端機、印表機）
  - 裝置狀態追蹤
  - 列印工作佇列（SQS）
  - 基本工作記錄（尚未整合硬體）

**資料庫架構更新**：
- 表：`user_profiles`（userId、addresses、preferences）
- 表：`devices`（deviceId、storeId、deviceType、status）
- 表：`print_jobs`（jobId、deviceId、status、payload）

**Lambda 函數**：
- `profile-get-handler`、`profile-update-handler`、`profile-orders-handler`
- `device-register-handler`、`device-update-status-handler`、`device-print-job-handler`

**交付成果**：
- ✅ 客戶檔案含訂單歷史
- ✅ 裝置註冊系統
- ✅ 列印工作佇列（僅軟體）
- ✅ 增強的使用者客戶端（已儲存地址）

**里程碑**：
- 第 22 週：使用者檔案服務完成
- 第 24 週：裝置服務軟體層就緒

**測試**：檔案資料驗證、裝置註冊流程

---

#### 階段 3：POS 應用程式（第 25-28 週）

**目標**：具備基於角色存取的櫃檯訂單桌面 POS 應用程式

**前端應用程式**：
- **POS 應用程式（Electron + React 18 + TypeScript + Vite）**
  - 快速訂單輸入（鍵盤快捷鍵）
  - 現金和信用卡付款支援
  - **手動折扣**：POS 員工可以應用含原因代碼的手動折扣
  - 訂單修改（新增/移除項目）
  - 拆分付款
  - **員工角色管理**：
    - 員工登入（Cognito 含角色驗證）
    - 基於角色的存取控制（RBAC）：Cashier、Lead、Manager、Merchant
    - 基於權限的 UI 渲染（Cashier：僅 POS 操作，Lead：+ 班次報表，Manager：+ 菜單編輯，Merchant：+ 店家設定）
  - 日結 Z 報表列印預覽
  - 離線模式含本地佇列

**功能**：
- 條碼掃描器支援（未來硬體整合）
- 顧客顯示器（可選，未來）
- 收據預覽（目前列印為 PDF）
- 折扣/折扣原因欄位儲存在訂單表中

**資料庫架構更新**：
- 訂單表：`discount`（decimal）、`discountReason`（text）欄位已存在
- StoreStaff 表：使用 StaffRole 列舉將使用者對應到店家

**交付成果**：
- ✅ POS Electron 應用程式完成
- ✅ 現金付款支援
- ✅ 手動折扣功能含原因追蹤
- ✅ 員工驗證含 RBAC（Cashier/Lead/Manager/Merchant 角色）
- ✅ 快速訂單輸入含鍵盤快捷鍵
- ✅ 訂單修改功能

**里程碑**：
- 第 26 週：POS 應用程式基本結構完成
- 第 28 週：完整 POS 功能含 RBAC，員工培訓材料就緒

**測試**： 
- POS 訂單流程測試
- 手動折扣驗證
- 員工角色權限測試（確保 Cashier 無法存取 Manager 功能）
- 離線佇列測試

**Version 0.2.0 成功標準**：
- 配方驅動的即時庫存追蹤運作中
- POS 系統運作，支援手動折扣
- 員工可以用現金/信用卡處理櫃檯訂單
- 強制執行 RBAC（Cashier/Lead/Manager/Merchant 角色）
- 低庫存警報通知商家

---

### Version 0.3.0：分析與 CRM（第 29-36 週）

**目標**：商業智慧和客戶關係管理

---

#### 階段 1：報表服務（第 29-32 週）

**目標**：全面的分析和報表

**要建立的服務**：
- **報表服務（Report Service）**
  - 每日/每週/每月銷售報表
  - 按時間段的暢銷商品
  - 員工績效指標
  - 異常偵測（卡住的訂單、詐欺模式）
  - 自動 Z 報表生成（EventBridge 排程）
  - PostgreSQL 物化檢視（每小時重新整理）
  - Athena 整合用於歷史資料（透過 Glue 從 S3 匯出）

**資料庫架構更新**：
- 物化檢視：`mv_daily_sales`、`mv_best_sellers`、`mv_staff_performance`
- AWS Glue 工作用於每日 PostgreSQL → S3 匯出
- Athena 表用於長期分析

**Lambda 函數**：
- `report-sales-handler`、`report-bestsellers-handler`、`report-anomalies-handler`
- `report-z-report-generator`、`report-anomaly-scanner`

**交付成果**：
- ✅ 銷售分析 API
- ✅ 自動每日 Z 報表（PDF 生成）
- ✅ 暢銷商品報表
- ✅ 異常偵測警報
- ✅ 分析儀表板（Recharts 整合）

**里程碑**：
- 第 30 週：報表服務完成，含物化檢視
- 第 32 週：儀表板分析 UI 完成，Athena 設定

**測試**：報表準確性驗證、大資料集效能測試

---

#### 階段 2：CRM 服務（第 33-36 週）

**目標**：客戶忠誠度和行銷

**要建立的服務**：
- **CRM 服務（CRM Service）**
  - **注意**：這是將引入 CRM 表（目前從 v1.0 架構中移除）的地方
  - 將 `Users` 表連結到 `LoyaltyPoints` 和 `Coupons` 表
  - 忠誠度點數系統（賺取規則、兌換）
  - 分級會員制（Bronze、Silver、Gold、Platinum）
  - 優惠券管理（建立、驗證、兌換）
  - 客戶分群（頻率、消費、RFM 分析）
  - 推薦追蹤和獎金
  - 多租戶：所有 CRM 資料按 `storeId` 隔離

**資料庫架構更新**：
- **新表**：`loyalty_points`、`coupons`、`coupon_redemptions`、`customer_tiers`、`referrals`
- PostgreSQL 觸發器用於等級計算
- Redis 快取用於優惠券驗證（快速查找）
- 外鍵：透過 `userId` 連結到 `users` 表

**Lambda 函數**：
- `crm-points-handler`、`crm-coupon-create-handler`、`crm-coupon-validate-handler`
- `crm-tier-calculate-handler`、`crm-referral-handler`

**交付成果**：
- ✅ 忠誠度點數賺取和兌換
- ✅ 優惠券系統（折扣碼）
- ✅ 客戶分群
- ✅ 分級會員制含自動升級
- ✅ CRM 儀表板 UI

**里程碑**：
- 第 34 週：CRM 服務完成，含點數和優惠券
- 第 36 週：儀表板 CRM UI 完成，客戶分群運作中

**測試**：點數計算測試、優惠券驗證測試、等級升級邏輯

**Version 0.3.0 成功標準**：
- 提供全面的銷售報表
- 忠誠度計畫運作中（CRM 表現在已在正式架構中）
- 商家可以建立和管理優惠券
- 提供客戶分群見解

---

### Version 0.4.0：Kiosk 與硬體整合（第 37-44 週）

**目標**：自助服務 Kiosk 與實體硬體週邊設備

---

#### 階段 1：Kiosk 應用程式（第 37-40 週）

**目標**：觸控優化的自助訂購

**前端應用程式**：
- **Kiosk 應用程式（Electron + React 18 + TypeScript + Vite）**
  - 觸控優化 UI（大型按鈕，最低 1920×1080）
  - 附圖片的菜單瀏覽
  - 購物車和結帳流程
  - 信用卡付款整合（軟體層）
  - 閒置 60 秒後自動重置
  - 多語言支援（英文、中文）
  - 無障礙功能（語音輔助、高對比度）
  - 離線模式含 IndexedDB 快取

**功能**：
- QR code 掃描器支援（忠誠度查詢）
- 顧客收據預覽
- 訂單確認畫面

**交付成果**：
- ✅ Kiosk 應用程式完成（僅軟體）
- ✅ 觸控優化介面
- ✅ 自動重置功能
- ✅ 多語言支援
- ✅ 離線佇列含重試

**里程碑**：
- 第 38 週：Kiosk UI 完成
- 第 40 週：完整 kiosk 流程測試完畢（不含硬體）

**測試**：觸控互動測試、自動重置計時器、離線模式

---

#### 階段 2：硬體整合（第 41-44 週）

**目標**：實體裝置整合

**硬體週邊設備**：
- 收據印表機（Star TSP654II 透過 AWS IoT Core）
- 廚房標籤印表機
- 讀卡機（PAX A920 SDK 整合）
- 收銀錢櫃（RJ11 觸發）
- QR code 掃描器

**裝置服務增強**：
- AWS IoT Core 設定（MQTT 通訊）
- 印表機 SDK 整合（ESC/POS 指令）
- 讀卡機 SDK 整合
- 列印工作範本（收據、廚房標籤）
- 裝置健康監控

**Lambda 函數**：
- `device-iot-consumer`、`device-health-monitor`、`device-print-job-processor`

**交付成果**：
- ✅ 收據印表機運作正常
- ✅ 廚房標籤印表機運作中（訂單編號、品項、備註、取貨時間）
- ✅ 信用卡付款終端機已整合
- ✅ 收銀錢櫃觸發運作中
- ✅ QR code 掃描器運作正常

**硬體採購**：
- 1x Kiosk 觸控螢幕（1920×1080 或更高）
- 1x Star TSP654II 收據印表機
- 1x 廚房標籤印表機
- 1x PAX A920 刷卡終端機
- 1x 含 RJ11 的收銀錢櫃
- 1x QR code 掃描器

**里程碑**：
- 第 42 週：印表機整合完成
- 第 44 週：完整硬體設定測試完畢，試點 kiosk 已安裝

**測試**： 
- 硬體故障情境
- 列印品質驗證
- 付款終端機認證
- 含硬體的端到端 kiosk 流程

**Version 0.4.0 成功標準**：
- Kiosk 搭配所有硬體運作正常
- 客戶可以在 kiosk 自助訂餐和付款
- 收據和廚房標籤列印正確
- 系統能優雅地從硬體故障中恢復

---

### Version 0.5.0：廚房顯示系統（第 45-48 週）

**目標**：透過即時訂單顯示數位化廚房營運

---

#### 階段 1：廚房顯示系統（第 45-48 週）

**目標**：即時廚房訂單管理

**前端應用程式**：
- **KDS 應用程式（React 18 + TypeScript + Vite）**
  - 即時訂單顯示（WebSocket）
  - 訂單卡片依時間排序
  - 顏色編碼優先度
    - 綠色：正常
    - 黃色：預約單（顯示取貨時間）
    - 橘色：即將遲到（>15 分鐘）
    - 紅色：遲到（>30 分鐘）
  - 站點篩選（熱廚、冷台、飲料、甜點）
  - Bump 功能（標記品項完成）
  - 音訊警報（HTML5 Audio API）
  - 多螢幕支援（URL 參數用於站點選擇）
  - 每 2 秒自動重新整理

**功能**：
- 訂單詳情：訂單編號、品項、數量、特殊備註、訂單來源
- 準備時間追蹤
- 廚房績效指標
- 已完成預約單的自動 bump

**Lambda 函數**：
- `kds-order-consumer`（EventBridge → WebSocket 推送）
- `kds-bump-handler`（更新訂單品項狀態）

**交付成果**：
- ✅ KDS 應用程式完成
- ✅ 即時 WebSocket 整合
- ✅ 站點篩選運作中
- ✅ 音訊警報運作正常
- ✅ 多螢幕支援（2+ 個顯示器）

**硬體**：
- 2x 43 吋 TV 顯示器
- 廚房環境用壁掛架
- HDMI 線材

**里程碑**：
- 第 46 週：含 WebSocket 的 KDS 應用程式完成
- 第 48 週：廚房硬體設定完成，員工培訓完畢

**測試**： 
- WebSocket 連線穩定性（重新連線邏輯）
- 訂單流程：使用者客戶端 → 付款 → KDS 顯示
- 廚房員工使用者驗收測試
- 多螢幕同步測試

**Version 0.5.0 成功標準**：
- 訂單即時出現在 KDS 上
- 廚房員工可以 bump 品項標記完成
- 多個站點可以獨立運作
- 音訊警報通知廚房新訂單

---

### Version 0.6.0：外送平台整合（第 49-60 週）

**目標**：來自第三方外送平台（UberEats 與 Foodpanda）的多通路訂單管理

---

#### 階段 1：UberEats 整合（第 49-52 週）

**目標**：UberEats 訂單匯入、菜單同步和雙向狀態更新

**要建立的服務**：
- **外送平台 Webhooks 服務（UberEats）**
  - 訂單通知的 Webhook 端點
  - HMAC-SHA256 簽章驗證
  - 訂單匯入到 PostgreSQL
  - 冪等性處理（Redis，24 小時 TTL）
  - 狀態更新 API（已確認、準備中、已完成）
  - 菜單同步到 UberEats 平台
  - 含 SQS 和 DLQ 的重試邏輯
  - 多租戶：平台訂單按 `storeId` 隔離

**資料庫架構更新**：
- **新表**：`platform_orders`、`platform_sync_logs`
- Redis：`platform:idempotency:{orderId}` 快取
- OrderSource 列舉：新增 `UBEREATS` 值

**Lambda 函數**：
- `webhook-ubereats-handler`、`webhook-signature-validator`
- `platform-status-sync-ubereats`、`platform-order-mapper`
- `platform-menu-sync-ubereats`

**交付成果**：
- ✅ UberEats webhook 端點運作中
- ✅ 訂單自動匯入系統
- ✅ 雙向狀態同步
- ✅ 菜單同步到 UberEats
- ✅ 重複訂單防止（冪等性）
- ✅ 含重試的錯誤處理

**里程碑**：
- 第 50 週：UberEats webhook 整合完成
- 第 52 週：狀態同步和菜單同步運作中，沙盒測試通過

**測試**： 
- Webhook 簽章驗證
- 重複訂單防止
- 含 DLQ 的重試邏輯
- UberEats 沙盒環境測試

---

#### 階段 2：Foodpanda 整合（第 53-56 週）

**目標**：Foodpanda 訂單匯入、菜單同步和雙向狀態更新

**服務增強**：
- **外送平台 Webhooks 服務（Foodpanda）**
  - Foodpanda webhook 端點
  - Partner API 整合
  - 含平台特定對應的訂單匯入
  - Foodpanda 的狀態同步
  - 菜單同步到 Foodpanda 平台
  - 多租戶：平台訂單按 `storeId` 隔離

**資料庫架構更新**：
- OrderSource 列舉：新增 `FOODPANDA` 值
- 擴充 `platform_orders` 和 `platform_sync_logs` 用於 Foodpanda

**Lambda 函數**：
- `webhook-foodpanda-handler`、`platform-status-sync-foodpanda`
- `platform-menu-sync-foodpanda`

**交付成果**：
- ✅ Foodpanda webhook 端點運作中
- ✅ 訂單自動匯入
- ✅ 雙向狀態同步
- ✅ 菜單同步到 Foodpanda
- ✅ 儀表板中的多平台訂單檢視

**里程碑**：
- 第 54 週：Foodpanda 整合完成
- 第 56 週：多平台儀表板運作中

**測試**： 
- Foodpanda API 測試
- 多平台訂單合併
- 平台特定的訂單來源（標籤）

---

#### 階段 3：菜單同步與最佳化（第 57-60 週）

**目標**：自動化菜單同步與平台管理

**要建立的功能**：
- 自動菜單同步到平台（EventBridge 排程）
- 庫存同步到平台（標記品項為不可用）
- 平台特定定價規則
- 平台菜單對應 UI
- 平台分析（依來源的訂單：USER_CLIENT、KIOSK、POS、UBEREATS、FOODPANDA）
- 菜單同步衝突解決
- 多租戶：所有平台配置按 `storeId` 隔離

**Lambda 函數**：
- `platform-menu-sync`、`platform-inventory-sync`、`platform-analytics-handler`

**儀表板增強**：
- 平台訂單分析（UberEats vs Foodpanda 比較）
- 菜單對應介面（將內部菜單項目對應到平台品項 ID）
- 平台狀態監控
- 同步記錄和錯誤報告

**交付成果**：
- ✅ 自動菜單同步到 UberEats 和 Foodpanda
- ✅ 庫存同步（不可用品項）
- ✅ 儀表板中的平台對應 UI
- ✅ 平台分析儀表板
- ✅ 統一訂單檢視（所有通路）

**里程碑**：
- 第 58 週：菜單同步自動化完成
- 第 60 週：完整多平台管理運作中

**測試**： 
- 菜單同步準確性驗證
- 庫存同步時機測試
- 平台分析準確性
- 端到端多平台訂單流程（UberEats + Foodpanda + 內部通路）

**Version 0.6.0 成功標準**：
- UberEats 和 Foodpanda 訂單自動匯入
- 狀態更新同步到兩個平台
- 菜單和庫存自動同步
- 商家可以從一個儀表板管理兩個平台
- 提供平台特定分析

---

### Version 1.0.0：正式上線（第 61-64 週）

**目標**：品質保證、安全性驗證、公開正式上線

---

#### 階段 1：最終測試與上線（第 61-64 週）

**目標**：全面測試、安全性稽核、正式部署

**測試活動**：

**第 61 週：負載與效能測試**
- 使用 k6/JMeter 進行負載測試
  - 500 個並發使用者
  - 每小時 1000+ 筆訂單
  - API 回應時間 < 200ms（p95）
- 壓力測試（2 倍正常負載）
- 資料庫查詢優化
- Lambda 冷啟動優化
- CloudFront 快取命中率驗證

**第 62 週：安全性稽核**
- OWASP Top 10 弱點掃描（OWASP ZAP）
- 相依套件弱點掃描（Snyk）
- PCI DSS Level 1 合規性驗證（Stripe）
- 滲透測試（第三方或自我稽核）
- 安全性修復部署
- 金鑰輪替驗證

**第 63 週：使用者驗收測試（UAT）**
- 與 1 間餐廳進行試點上線（2 週測試版）
- 員工培訓和導入
- 收集回饋和錯誤報告
- 效能監控（CloudWatch 儀表板）
- 修復重大錯誤
- 使用者滿意度調查

**第 64 週：正式上線**
- 正式部署
- DNS 切換（Route 53）
- 行銷活動啟動
- 客戶支援設定
- 啟動 24/7 監控
- Runbook 文件
- 備份和災難恢復驗證

**交付成果**：
- ✅ 負載測試通過（500+ 個並發使用者）
- ✅ 安全性稽核完成（無重大弱點）
- ✅ PCI DSS 合規性已驗證
- ✅ 與試點餐廳的 UAT 成功
- ✅ 正式部署完成
- ✅ 文件已發布（API 文件、使用者指南、runbooks）
- ✅ 監控儀表板啟動（CloudWatch、X-Ray）

**測試檢查清單**：
- [ ] 負載測試：500 個並發使用者，每小時 1000+ 筆訂單
- [ ] 壓力測試：2 倍尖峰負載，系統保持穩定
- [ ] 容錯移轉測試：Aurora 容錯移轉、Lambda 擴展
- [ ] 安全性掃描：OWASP ZAP 自動掃描，無重大問題
- [ ] 相依套件掃描：Snyk，所有弱點已修補
- [ ] 付款安全性：PCI DSS 驗證、Stripe 合規
- [ ] UAT：1 間試點餐廳，2 週，使用者滿意度 > 4.5/5
- [ ] 滲透測試：第三方稽核（可選）或自我稽核
- [ ] 備份/還原：資料庫備份和還原已測試
- [ ] 災難恢復：多區域容錯移轉已測試（可選）

**效能目標**：
- API 回應 < 200ms（p95）
- 支援 500 個並發使用者
- 99.9% 正常運作時間（每月 SLA）
- 資料庫查詢 < 50ms（p95）
- Lambda 冷啟動 < 1 秒

**成功指標**：
- 系統穩定性：試點期間零重大中斷
- 訂單完成率 > 98%
- 客戶滿意度 > 4.5/5
- 商家採用率：第一個月導入 5+ 間餐廳
- 付款成功率 > 99%

**上線計畫**：
- 第 63 週：軟啟動（1 間試點餐廳）
- 第 64 週：公開上線
  - 行銷活動（社群媒體、廣告）
  - 新商家的導入支援
  - 客戶支援時段（電子郵件、即時聊天）
  - 部落格文章和新聞稿

**上線後（第 65 週以後）**：
- 持續監控（CloudWatch、X-Ray、錯誤追蹤）
- 錯誤修復優先佇列
- 功能需求收集
- 每月效能審查
- 每季安全性稽核
- 成本優化審查

**Version 1.0.0 成功標準**：
- 公開正式上線完成
- 導入 5+ 間餐廳
- 第一個月 99.9% 正常運作時間
- 零重大安全性弱點
- 正面的使用者回饋（> 4.5/5）
- 系統處理尖峰負載（500+ 個並發使用者）

---

## 4. 測試策略

### 4.1 測試金字塔

**單元測試（70%）**
- 每個服務函數
- 模擬外部相依性
- 工具：Jest、JUnit
- 目標：90% 程式碼覆蓋率

**整合測試（20%）**
- 服務間通訊
- 資料庫互動
- 工具：Supertest、Testcontainers
- 目標：涵蓋所有關鍵路徑

**端到端測試（10%）**
- 完整使用者旅程
- 工具：Playwright、Cypress
- 情境：
  - 行動訂單 → 付款 → 廚房 → 取貨
  - Kiosk 訂單 → 列印收據
  - 平台訂單匯入 → 同步

### 4.2 效能測試

**負載測試**
- 工具：k6、JMeter
- 情境：
  - 正常：500 個並發使用者
  - 尖峰：1000 個並發使用者
  - 激增：2000 個突發
- 指標：回應時間、吞吐量、錯誤率

**壓力測試**
- 找出崩潰點
- 測試自動擴展
- 資料庫連線池限制

**耐久測試**
- 24 小時持續負載
- 檢查記憶體洩漏
- 連線洩漏

### 4.3 安全性測試

**靜態分析**
- SonarQube 用於程式碼品質
- Snyk 用於相依套件弱點
- ESLint 安全性規則

**動態測試**
- OWASP ZAP 自動掃描
- SQL 注入、XSS、CSRF 測試
- 驗證繞過嘗試

**滲透測試**
- 年度第三方稽核
- 付款流程安全性審查
- PCI DSS 合規性驗證

### 4.4 使用者驗收測試（UAT）

**試點計畫（3 間餐廳）**
- 第 1 週：培訓、導入
- 第 2 週：實際營運、回饋收集
- 指標：
  - 系統穩定性（正常運作時間）
  - 訂單準確性
  - 使用者滿意度調查

**測試版測試**
- 10 間餐廳，4 週
- 收集功能需求
- 識別邊緣案例

---

## 5. 部署策略

### 5.1 基礎設施架構

**雲端供應商**：AWS（多區域用於 DR）
- **主要區域**：us-east-1
- **DR 區域**：us-west-2

**Kubernetes 叢集（EKS）**
- **節點群組**：
  - 通用（t3.large，3-10 個節點，自動擴展）
  - 記憶體優化（r5.xlarge 用於 Redis）
  - 運算優化（c5.2xlarge 用於分析）
- **命名空間**：dev、staging、production

**資料庫部署**
- **RDS PostgreSQL**：多可用區、自動備份
- **MongoDB Atlas**：副本集（M10 層級）
- **ElastiCache Redis**：啟用叢集模式

**儲存**
- **S3 Buckets**： 
  - `prod-images`（菜單相片）
  - `prod-receipts`（PDF 封存）
  - `prod-backups`（資料庫傾印）

### 5.2 CI/CD 管線

**GitHub Actions 工作流程**：
```yaml
觸發：推送到 main/develop
步驟：
1. 語法檢查與程式碼品質（ESLint、Prettier、SonarQube）
2. 單元測試（Jest、覆蓋率報告）
3. 建置 Docker 映像（標籤：{commit-sha}）
4. 推送到 ECR
5. 整合測試（Testcontainers）
6. 部署到 Staging（Kubernetes）
7. E2E 測試（在 staging 上使用 Playwright）
8. 安全性掃描（Trivy）
9. 手動核准（用於正式環境）
10. 部署到正式環境（藍綠部署）
11. 煙霧測試
12. 失敗時回滾
```

**部署策略**：
- **Staging**：合併到 develop 時自動部署
- **正式環境**：藍綠部署含手動核准
- **回滾**：一鍵還原到前一個版本

### 5.3 監控與警報

**指標（Prometheus + Grafana）**
- **服務指標**：請求速率、延遲、錯誤率
- **基礎設施**：CPU、記憶體、磁碟、網路
- **業務指標**：每分鐘訂單數、每小時營收、轉換率

**儀表板**：
- 概覽（所有服務健康狀態）
- 訂單服務（狀態機流程）
- 付款服務（成功率）
- 基礎設施（資源使用率）

**警報（PagerDuty）**
- **P1（嚴重）**：服務中斷、付款失敗激增
- **P2（高）**：高錯誤率、回應緩慢
- **P3（中）**：低庫存、裝置離線
- **P4（低）**：偵測到異常

**記錄（ELK Stack）**
- 來自所有服務的集中式記錄
- 結構化記錄（JSON）
- 記錄保留：30 天熱存取、1 年封存

**分散式追蹤（Jaeger）**
- 跨微服務追蹤請求
- 識別瓶頸
- 除錯複雜故障

### 5.4 災難恢復

**備份策略**
- **資料庫**：每日快照、30 天保留、時間點恢復
- **配置**：GitOps（所有配置都在 Git 中）
- **映像**：多區域複製（S3）

**RTO/RPO 目標**
- **恢復時間目標（RTO）**：4 小時
- **恢復點目標（RPO）**：1 小時

**DR 程序**：
1. 偵測中斷（自動健康檢查）
2. 通知值班工程師（PagerDuty）
3. 嘗試自動恢復（Kubernetes 重啟）
4. 如果區域性故障：容錯移轉到 DR 區域
5. 更新 DNS（Route53）
6. 驗證功能
7. 48 小時內進行事後檢討

---

## 6. 團隊結構與角色

### 開發團隊（第 1-9 個月）

**工程（6 FTE）**
- **技術主管**（1）：架構、程式碼審查、指導
- **後端工程師**（3）：微服務開發（Node.js、Java、Python）
- **前端工程師**（2）：React、Electron、UI/UX 實作

**品質與營運（2 FTE）**
- **DevOps 工程師**（1）：基礎設施、CI/CD、監控
- **QA 工程師**（1）：測試自動化、負載測試

**產品與設計（2 FTE）**
- **產品經理**（1）：需求、待辦事項、利害關係人溝通
- **UI/UX 設計師**（1）：線框圖、視覺設計、使用者研究

**總計**：10 FTE

### 維護團隊（第 2 年以後）

**核心團隊（3 FTE）**
- **全端工程師**（1）：功能開發
- **DevOps/SRE**（1）：營運、效能
- **支援工程師**（0.5）：客戶支援、錯誤修復
- **產品經理**（0.5）：路線圖、優先順序排定

---

## 7. 開發標準

### 7.1 程式碼標準

**TypeScript（後端與前端）**
- **ESLint**：Airbnb TypeScript 配置 + 嚴格規則
- **Prettier**：程式碼格式化、一致風格
- **tsconfig.json**：啟用嚴格模式
  - `strict: true`
  - `noImplicitAny: true`
  - `strictNullChecks: true`
- **命名慣例**：
  - 變數/函數：camelCase
  - 類別/介面：PascalCase
  - 常數：UPPER_SNAKE_CASE
  - 私有成員：以底線為前綴 `_private`
- **Async/Await**：優於 callbacks 和 promise 鏈
- **錯誤處理**： 
  - 非同步操作務必使用 try/catch
  - 領域錯誤使用自訂錯誤類別
  - 明確的錯誤類型
- **匯出**：具名匯出優於預設匯出
- **註解**：公開 API 使用 JSDoc

### 7.2 API 設計

**REST 原則**
- URL 中的版本控制：`/api/v1/`
- 資源命名：複數名詞（`/orders`、`/items`）
- HTTP 方法：GET（讀取）、POST（建立）、PUT（取代）、PATCH（更新）、DELETE
- 狀態碼：200（OK）、201（Created）、400（Bad Request）、401（Unauthorized）、404（Not Found）、500（Server Error）

**請求/回應格式**
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "timestamp": "2025-12-17T10:30:00Z"
}
```

**分頁**
```
GET /api/v1/orders?page=1&limit=20
回應：{ data: [...], pagination: { total, page, limit } }
```

**驗證**：`Authorization` 標頭中的 Bearer 令牌

### 7.3 資料庫標準

**命名慣例**
- 表：snake_case、複數（`orders`、`order_items`）
- 欄位：snake_case（`created_at`、`user_id`）
- 索引：`idx_{table}_{column}`
- 外鍵：`fk_{table}_{ref_table}`

**遷移**
- 使用 Flyway/Liquibase 進行版本控制
- 永不修改現有遷移
- 務必向後相容

**查詢優化**
- 為所有外鍵建立索引
- 避免 SELECT *
- 對複雜查詢使用 EXPLAIN
- 限制結果集

### 7.4 Git 工作流程

**分支策略**
- `main` - 準備好上線的程式碼
- `develop` - 整合分支
- `feature/{ticket}-{description}` - 功能分支
- `hotfix/{issue}` - 緊急修復

**提交訊息**
```
<type>(<scope>): <subject>

<body>

<footer>
```
類型：feat、fix、docs、refactor、test、chore

**Pull Requests**
- 必要條件：2 個核准、CI 通過
- Squash 合併到 main
- 合併後刪除分支

---

## 8. 風險緩解

### 技術風險

**風險 1：第三方 API 停機**
- **緩解**：斷路器模式、後備佇列、多供應商支援
- **監控**：錯誤率升高時發出警報

**風險 2：資料庫瓶頸**
- **緩解**：讀取副本、快取（Redis）、查詢優化、連線池
- **監控**：查詢效能追蹤、慢查詢記錄

**風險 3：WebSocket 連線問題**
- **緩解**：自動重新連線、心跳/ping-pong、回退到輪詢
- **監控**：連線中斷率

**風險 4：付款閘道故障**
- **緩解**：多閘道支援、冪等重試、詳細記錄
- **監控**：付款成功率、對帳警報

### 營運風險

**風險 5：部署失敗**
- **緩解**：藍綠部署、自動煙霧測試、即時回滾
- **監控**：部署成功追蹤、錯誤激增偵測

**風險 6：資料遺失**
- **緩解**：自動備份、時間點恢復、多區域複製
- **監控**：備份成功驗證、完整性檢查

**風險 7：安全性漏洞**
- **緩解**：定期安全性稽核、相依套件掃描、WAF、速率限制
- **監控**：入侵偵測、異常存取模式

---

## 9. 成功標準

### 技術 KPI

| 指標 | 目標 | 測量方式 |
|------|------|----------|
| API 回應時間（p95） | < 300ms | Prometheus |
| 系統正常運作時間 | > 99.5% | 正常運作時間監控 |
| 訂單處理成功率 | > 99% | 應用程式記錄 |
| 資料庫查詢時間（p95） | < 50ms | 資料庫監控 |
| 付款成功率 | > 98% | 付款服務指標 |
| WebSocket 連線穩定性 | > 95% | 連線追蹤 |

### 程式碼品質 KPI

| 指標 | 目標 |
|------|------|
| 單元測試覆蓋率 | > 85% |
| 程式碼審查週轉時間 | < 24 小時 |
| 正式環境重大錯誤 | < 1 個/衝刺 |
| 安全性弱點（高/嚴重） | 0 |

### 部署 KPI

| 指標 | 目標 |
|------|------|
| 部署頻率 | 每日（staging）、每週（正式環境） |
| 部署成功率 | > 95% |
| 平均恢復時間（MTTR） | < 1 小時 |
| 變更失敗率 | < 15% |

---

## 10. 文件需求

### 技術文件
- [ ] API 文件（OpenAPI/Swagger）
- [ ] 架構決策記錄（ADR）
- [ ] 資料庫架構文件
- [ ] 部署 Runbook
- [ ] 災難恢復 Playbook
- [ ] 安全性與合規指南

### 使用者文件
- [ ] 商家導入指南
- [ ] 使用者手冊（行動/Kiosk/POS）
- [ ] 管理員儀表板指南
- [ ] FAQ 與疑難排解
- [ ] 影片教學

### 開發者文件
- [ ] 設定與安裝指南
- [ ] 貢獻指南
- [ ] 程式碼風格指南
- [ ] 測試指南
- [ ] 發布流程

---

## 11. 上線後支援

### 維護計畫

**每月**
- 安全性修補
- 相依套件更新
- 效能審查
- 成本優化

**每季**
- 功能發布
- 基礎設施審查
- 容量規劃
- 安全性稽核

**每年**
- 主要版本升級
- 滲透測試
- 架構審查
- 技術債務清理

### 支援層級

**第 1 層（客戶支援）**
- 電子郵件/即時聊天支援
- 基本疑難排解
- FAQ 與文件

**第 2 層（技術支援）**
- 進階疑難排解
- 資料分析
- 系統配置

**第 3 層（工程）**
- 錯誤修復
- 熱修補
- 根本原因分析

**SLA 目標**
- **嚴重**：1 小時回應、4 小時解決
- **高**：4 小時回應、24 小時解決
- **中**：24 小時回應、3 天解決
- **低**：3 天回應、1 週解決

---

## 12. 附錄

### A. 技術決策理由

**為什麼所有後端服務都使用 TypeScript？**
- **類型安全**：在編譯時而非執行時捕捉錯誤
- **前端-後端一致性**：相同語言減少上下文切換，前後端共享類型
- **更好的 IDE 支援**：IntelliSense、自動完成、重構工具
- **可維護性**：自我記錄的程式碼、更容易團隊導入
- **AWS Lambda 效能**：Node.js 有快速的冷啟動時間（~300ms）
- **豐富的生態系**：npm 套件滿足每種整合需求
- **非同步 I/O**：非常適合 I/O 密集型操作（API 呼叫、資料庫查詢）

**為什麼使用無伺服器（AWS Lambda）？**
- **成本效率**：僅為實際執行時間付費（相對於 24/7 伺服器成本）
- **自動擴展**：自動處理流量激增（幾秒內從 0 → 1000 並發）
- **無伺服器管理**：專注於業務邏輯，無需修補作業系統
- **內建高可用性**：預設多可用區部署、自動容錯移轉
- **快速迭代**：部署個別函數而無需完整系統重啟

**為什麼使用 Aurora Serverless PostgreSQL 作為主要資料庫？**
- **開發者熟悉度**：SQL 是通用的，學習曲線低於 NoSQL 查詢語言
- **關聯式資料**：餐廳系統有自然的關係（訂單 ↔ 品項 ↔ 使用者）
- **ACID 交易**：對訂單、付款、庫存至關重要（原子性保證）
- **靈活的查詢**：無需預先設計存取模式的即時分析
- **Drizzle ORM**：輕量級（~5KB）、類型安全查詢、針對無伺服器冷啟動優化
- **JSONB 支援**：兩全其美（結構化 + 配置資料的靈活架構）
- **成熟的生態系**：pgAdmin、DataGrip、無數工具和擴充功能
- **成本效益**：Aurora Serverless v2 閒置時自動暫停、擴展至零

**為什麼使用 Redis 作為快取？**
- **速度**：熱資料的亞毫秒延遲（菜單、店家配置）
- **TTL 管理**：快取失效的自動過期
- **多功能性**：快取、會話儲存、分散式鎖、發布/訂閱
- **Lambda 相容**：ElastiCache 與 VPC Lambda 無縫協作

**為什麼使用 RDS Proxy？**
- **連線池**：解決 Lambda 的連線限制問題（PostgreSQL 最大連線數）
- **減少冷啟動**：跨 Lambda 呼叫重複使用資料庫連線
- **容錯移轉**：資料庫故障時自動重新導向
- **IAM 驗證**：無硬編碼資料庫密碼

**何時會使用 DynamoDB？**
- **極端規模**：如果達到 100K+ TPS（每秒交易數）
- **僅鍵值**：具有簡單存取模式的資料（單鍵查找）
- **全球表**：多區域主動-主動（餐廳系統不需要）
- **事件溯源**：當 DynamoDB Streams 對架構至關重要時

**對於這個餐廳系統**：Aurora PostgreSQL + Redis 是 99% 餐廳（甚至是擁有 100+ 分店的連鎖店）的最佳選擇。

### B. 第三方服務

| 服務 | 供應商 | 用途 | 成本 |
|------|--------|------|------|
| 付款 | Stripe | 信用卡處理 | 2.9% + $0.30/交易 |
| 簡訊 | Twilio | 訂單通知 | $0.0075/則 |
| 電子郵件 | SendGrid | 交易郵件 | $0.0002/封 |
| 推播 | Firebase Cloud Messaging | 應用程式推播通知 | 免費 |
| 地圖 | Google Maps API | 店家定位器、外送區域 | $7/1000 請求 |
| 監控 | Datadog（替代方案） | APM、記錄、指標 | $15/主機/月 |

### C. 硬體建議

**建議裝置**
- **收據印表機**：Star TSP654II（$400）
- **刷卡終端機**：PAX A920（$600）
- **Kiosk 螢幕**：Elo 22" 觸控螢幕（$1,200）
- **KDS 顯示器**：Samsung 43" 商用 TV（$600）
- **收銀錢櫃**：APG Vasario（$200）

### D. 合規檢查清單

- [ ] **PCI DSS Level 1**：支付卡產業資料安全
- [ ] **GDPR**：歐盟資料保護（如果服務歐盟客戶）
- [ ] **PDPA**：個人資料保護法（當地法規）
- [ ] **ADA**：Kiosk 無障礙標準
- [ ] **SOC 2 Type II**：安全性稽核（用於企業客戶）

---

## 文件歷史

| 版本 | 日期 | 作者 | 變更 |
|------|------|------|------|
| 1.0 | 2025-12-17 | 技術團隊 | 初始草稿 |
| 1.1 | 2025-12-22 | Simon Chou | 將技術概念與 v1.0 設計規格對齊：配方驅動庫存（食材與變體）、集中式變體註冊表、含 LEAD 角色的 RBAC、v0.2.0 中的手動折扣、外送平台整合限制為 UberEats 與 Foodpanda（移除 Deliveroo）、強調多租戶 |

---

**後續步驟**：
1. 由技術主管與 CTO 審查和核准
2. 根據團隊回饋精煉估計
3. 開始基礎設施設定（階段 1，第 1 週）
4. 安排雙週架構審查會議

**聯絡方式**：
- **技術主管**：[姓名、電子郵件]
- **DevOps 主管**：[姓名、電子郵件]
- **產品經理**：[姓名、電子郵件]
