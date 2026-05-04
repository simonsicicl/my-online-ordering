# 架構概觀

**文件版本**: 1.1
**最後更新**: 2025 年 12 月 22 日
**負責人**: Simon Chou
**狀態**: 活文件 (MVP + 庫存 + POS 範圍)

---

## 目的

本文件提供「我的線上點餐系統」架構的高階概觀。它作為理解系統結構、設計原則和組件互動的入口點。

**目標受眾**: 開發人員、AI 助理、架構師、技術利害關係人

---

## 目錄

1. [系統概述](#系統概述)
2. [架構原則](#架構原則)
3. [系統組件](#系統組件)
4. [通訊模式](#通訊模式)
5. [技術堆疊](#技術堆疊)
6. [部署架構](#部署架構)
7. [安全架構](#安全架構)
8. [資料流圖](#資料流圖)

---

## 系統概述

### 高階描述

「我的線上點餐系統」是一個 **無伺服器、事件驅動、基於微服務** 的平台，使餐廳能夠管理多通道點餐業務（行動網頁、自助服務機、POS、第三方平台）。

### 關鍵特性

- **架構風格**: 無伺服器微服務搭配事件驅動通訊
- **雲端供應商**: AWS
- **運算模型**: AWS Lambda (Node.js 20.x)
- **資料庫**: PostgreSQL (Amazon RDS)
- **快取**: Redis (ElastiCache)
- **API 閘道**: AWS API Gateway (HTTP + WebSocket)
- **事件匯流排**: AWS EventBridge
- **訊息佇列**: SQS + SNS
- **前端**: React 18 + TypeScript + Vite (5 個應用程式)

---

## 架構原則

### 1. 無伺服器優先 (Serverless-First)
- 優先選擇託管服務而非自行管理的基礎設施
- 使用 Lambda 函數進行運算（自動擴展、按使用付費）
- 使用 RDS PostgreSQL 作為資料庫
- 最小化營運開銷

### 2. 事件驅動架構 (Event-Driven Architecture)
- 透過 EventBridge 實現鬆散耦合
- 非阻塞操作的非同步處理
- 用於稽核追蹤的事件溯源
- 用於扇出場景的發布/訂閱模式

### 3. API 優先設計 (API-First Design)
- 所有服務公開 RESTful API
- 使用 OpenAPI 規範作為契約
- 版本化 API (/api/v1/)
- 一致的請求/回應格式

### 4. 領域驅動設計 (Domain-Driven Design)
- 微服務與業務領域對齊
- 清晰的服務邊界
- 每個服務擁有自己的資料
- 服務之間不直接存取資料庫

### 5. 彈性和容錯能力 (Resilience and Fault Tolerance)
- 具有指數退避的重試機制
- 失敗訊息的死信佇列 (DLQ)
- 外部相依性的斷路器
- 冪等操作（使用 Redis 冪等性金鑰）
- **注意**: 單一可用區 (Single-AZ) RDS 代表沒有自動容錯移轉（對於 MVP 而言可接受）

### 6. 設計安全性 (Security by Design)
- **身分優先**: 對所有使用者和服務進行集中式身分管理
- **零信任**: 驗證每個請求，加密傳輸中和靜態的所有資料
- **最小權限**: 為所有角色和服務提供精細的權限範圍
- **縱深防禦**: 多層安全控制（網路、應用程式、資料）
- **合規性**: 付款資料遵守 PCI DSS 標準
- *(詳見 [安全架構](#安全架構) 章節)*

### 7. 可觀察性 (Observability)
- 集中式日誌記錄 (CloudWatch Logs)
- 分散式追蹤 (X-Ray)
- 指標和監控 (CloudWatch)
- 結構化日誌記錄 (JSON 格式)

---

## 系統組件

### 後端微服務 (9 個服務)

> **標準堆疊**: 所有後端服務使用 **AWS Lambda** 進行運算，**Drizzle ORM** 進行資料存取，以及 **PostgreSQL** 作為主要資料存儲。下表列出了額外的服務特定技術。

#### 核心業務服務

| 服務 | 職責 | 額外技術 |
|---------|---------------|------------------------|
| **Menu Service (菜單服務)** | 產品目錄、定價、圖片、可用性 | Redis, S3 |
| **Order Service (訂單服務)** | 訂單生命週期、狀態機、協調 | Step Functions |
| **Inventory Service (庫存服務)** | 庫存追蹤、保留、警示 | Redis |
| **Payment Service (付款服務)** | 付款處理、對帳 | Stripe SDK, SSM Parameter Store |

#### 使用者與存取管理

| 服務 | 職責 | 額外技術 |
|---------|---------------|------------------------|
| **Authorization Service (授權服務)** | 驗證、RBAC、會話管理 | AWS Cognito, SSM Parameter Store |
| **User Profile Service (使用者檔案服務)** | 顧客資料、偏好設定、訂單歷史 | Redis |

#### 營運服務

| 服務 | 職責 | 額外技術 |
|---------|---------------|------------------------|
| **Store Service (店家服務)** | 餐廳設定、營業時間、外送規則 | Redis |
| **Device Service (裝置服務)** | 硬體註冊表、列印工作、健康監控 | AWS IoT Core, SQS |
| **Notification Service (通知服務)** | 多通道訊息傳遞、即時推送 | Redis, WebSocket, SES, SNS |

### 前端應用程式 (5 個應用程式)

| 應用程式 | 類型 | 目的 |
|------------|------|---------|
| **User Client (使用者客戶端)** | PWA | 供顧客點餐的行動優先網頁應用程式 |
| **Merchant Dashboard (商家儀表板)** | Web App | 餐廳管理主控台 |
| **Kiosk (自助服務機)** | Electron | 自助點餐終端機 |
| **POS** | Electron | 櫃檯點餐銷售點系統 |
| **KDS** | Web App | 訂單準備用的廚房顯示系統 |

---

## 通訊模式

### 1. 同步通訊 (REST API)

**模式**: 請求-回應 (Request-Response)
**技術**: API Gateway (HTTP API) → Lambda
**使用案例**: CRUD 操作、查詢、立即回應

**流程**:
```
客戶端 (Client) → API Gateway → Lambda 授權者 (JWT 驗證)
                              → Lambda 處理器 → PostgreSQL 連線 (Drizzle ORM)
                                             → 回應 (Response)
```

**API 結構**:
- Base URL: `https://api.example.com`
- Version: `/api/v1/`
- Resources: `/stores`, `/menu`, `/orders`, etc.

**連線管理**:
- 透過 Drizzle ORM 進行直接 Lambda-to-RDS 連線
- 在應用程式層級處理連線池 (Drizzle client)
- RDS max_connections 受限於執行個體大小
- Lambda 並發限制以避免連線耗盡

### 2. 非同步通訊 (Event-Driven)

**模式**: 發布/訂閱 (Pub/Sub)
**技術**: EventBridge → Lambda/SQS/SNS
**使用案例**: 領域事件、跨服務通訊、扇出 (Fan-out)

**流程**:
```
服務 A (Service A) → EventBridge 事件匯流排 → EventBridge 規則
                                             → Lambda 函數 (服務 B)
                                             → SQS 佇列 (服務 C)
                                             → SNS 主題 → 多個訂閱者
```

**事件範例**:
- `Order.Created` → Notification Service + Inventory Service
- `Payment.Success` → Order Service
- `Stock.LowAlert` → Notification Service

### 3. 即時通訊 (WebSocket)

**模式**: 持久連接 (Persistent Connection)
**技術**: API Gateway WebSocket API
**使用案例**: 訂單追蹤、KDS 更新、即時通知

**流程**:
```
客戶端 (Client) → WebSocket 連線 → API Gateway → Lambda ($connect)
                                                → 將 connectionId 存於 Redis
      ← WebSocket 訊息 ← Lambda → API Gateway @connections
```

**路由**:
- `$connect`: 驗證並儲存連接 ID
- `$disconnect`: 清理連接 ID
- `$default`: 處理傳入訊息

### 4. 訊息佇列模式 (Message Queue Pattern)

**模式**: 工作佇列 (Work Queue)
**技術**: SQS (Standard/FIFO)
**使用案例**: 列印工作、Webhook 重試、批次處理

**流程**:
```
生產者 (Producer) → SQS 佇列 → Lambda 消費者 (長輪詢)
                             → 無法處理信件佇列 (若重試 3 次後失敗)
```

---

## 技術堆疊

### 後端層 (Backend Layer)

| 類別 | 技術 | 版本 | 目的 |
|----------|-----------|---------|---------|
| **Runtime** | Node.js | 20.x | Lambda 執行環境 |
| **Language** | TypeScript | 5.x | 型別安全後端開發 |
| **ORM** | Drizzle ORM | 0.30.x | 輕量級資料庫存取 (~5KB, 針對 Serverless 最佳化) |
| **API Framework** | AWS Lambda | - | 無伺服器運算 |
| **Secrets Management** | SSM Parameter Store (Standard, SecureString) | - | 免費層級憑證儲存 |
| **Authentication** | AWS Cognito | - | 使用者管理與 JWT |
| **Database** | Amazon RDS for PostgreSQL | 15.x | 主要資料存儲 |
| **Cache** | ElastiCache Redis | 7.x | 快取與暫存資料 |
| **Event Bus** | EventBridge | - | 事件驅動通訊 |
| **Message Queue** | SQS + SNS | - | 非同步處理 |
| **State Machine** | Step Functions | - | 訂單工作流程編排 |
| **Object Storage** | S3 + CloudFront | - | 圖片儲存與 CDN |
| **Analytics** | PostgreSQL (Direct SQL queries) | - | 資料湖與 SQL 分析 |

### 前端層 (Frontend Layer)

| 類別 | 技術 | 版本 | 目的 |
|----------|-----------|---------|---------|
| **Framework** | React | 18.x | UI 函式庫 |
| **Language** | TypeScript | 5.x | 型別安全前端開發 |
| **Build Tool** | Vite | 5.x | 快速開發伺服器與打包工具 |
| **State Management** | Redux Toolkit | 2.x | 全域狀態管理 |
| **Styling** | SCSS (Sass) | - | 具變數與巢狀結構的 CSS |
| **CSS Architecture** | CSS Modules + BEM | - | 組件範圍樣式 |
| **HTTP Client** | Axios | 1.x | API 請求 |
| **Desktop Runtime** | Electron | 28.x | Kiosk 與 POS 應用程式 |

### DevOps 與基礎設施 (DevOps & Infrastructure)

| 類別 | 技術 | 目的 |
|----------|-----------|---------|
| **IaC** | AWS SAM / CDK | 基礎設施即程式碼 |
| **CI/CD** | GitHub Actions | 自動化測試與部署 |
| **Monitoring** | CloudWatch | 指標、日誌、警報 |
| **Tracing** | X-Ray | 分散式追蹤 |
| **Secrets** | SSM Parameter Store (Standard, SecureString) | API 金鑰與憑證 (免費層級) |
| **DNS** | Route 53 | 網域管理 |
| **Security** | Security Groups + API Gateway Throttling | 網路防火牆、速率限制 |

---

## 部署架構

### AWS 服務拓撲 (AWS Services Topology)

```
┌─────────────────────────────────────────────────────────────┐
│                        CloudFront CDN                       │
│                   （靜態資產、圖片交付）                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     Route 53 (DNS)                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│               API Gateway (HTTP + WebSocket)                │
│              - Lambda Authorizer (JWT)                      │
│              - 速率限制與節流                                │
│              - CORS 設定                                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Lambda Functions                       │
│         　　  　   (9 個後端服務，40+ 個函數)                 │
│      　　　　     直接資料庫連線 (無需 VPC)       　　　　　   │
└─────────────────────────────────────────────────────────────┘
         ↓                     ↓                     ↓
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   EventBridge   │   │   SQS + SNS     │   │   S3 + CF       │
│   (事件匯流排)   │   │ (訊息佇列)       │   │ (圖片儲存)       │
└─────────────────┘   └─────────────────┘   └─────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│              Amazon RDS for PostgreSQL                      │
│                                                             │
│  - 部署: 單一可用區 (Single-AZ)                              │
│  - 網路: 公有子網 (PUBLIC SUBNET)                            │
│  - 存取: 安全群組 (IP 允許清單)                               │
│  - 連線: 直接來自 Lambda (無 RDS Proxy)                      │
│  - 備份: 自動化備份                                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│         ElastiCache Redis (快取層)                          │
│              - 快取 (菜單、店家、使用者檔案)                  │
│              - WebSocket 連線                               │
│              - 冪等性金鑰                                    │
│              - 庫存鎖定                                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 AWS IoT Core (MQTT)                         │
│              - 收據印表機                                    │
│              - 廚房標籤印表機                                │
│              - 讀卡機                                       │
└─────────────────────────────────────────────────────────────┘
```

### 網路架構 (Network Architecture)

```
┌─────────────────────────── VPC ───────────────────────────┐
│                                                           │
│  ┌────────────────── Public Subnet ────────────────────┐  │
│  │                                                     │  │
│  │  ┌─────────────────────────────────────────────┐    │  │
│  │  │   RDS PostgreSQL 執行個體                    │    │  │
│  │  │  - 可公開存取                                │    │  │
│  │  │  - 安全群組:                                 │    │  │
│  │  │    * 傳入: Port 5432 來自 Lambda             │    │  │
│  │  │    * 傳入: Port 5432 來自 開發 IP            │    │  │
│  │  │    * 傳出: 全部 (針對 AWS 服務)              │    │  │
│  │  └─────────────────────────────────────────────┘    │  │
│  │                                                     │  │
│  │   直接網際網路閘道 (Internet Gateway) 用於傳出流量    │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  Lambda 函數:                                             │
│  - 不在 VPC 中 (透過公有端點存取 RDS)                       │
│  - 或在 VPC 中搭配網際網路閘道                              │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

**注意**: 關於詳細的安全控制 (SSL/TLS, IAM, Security Groups)，請參閱 [安全架構](#安全架構) 章節。

---

## 安全架構

### 驗證流程 (Authentication Flow)

```
使用者 (User) → Cognito 使用者集區 → JWT 權杖 (RS256)
                                   → Lambda 授權者 (API Gateway)
                                   → 驗證 JWT 簽章
                                   → 檢查使用者權限 (PostgreSQL)
                                   → 允許/拒絕 請求
```

### 授權模型 (Authorization Model - RBAC)

**角色**:
- **User** (顧客): 瀏覽菜單、下訂單、查看訂單歷史
- **Merchant** (擁有者): 店家管理的完整存取權限
- **Manager** (經理): 訂單管理、報表、員工管理
- **Cashier** (收銀員): POS 操作、基本訂單管理
- **Admin** (系統管理員): 系統全域存取權限 (僅內部使用)

**權限矩陣**: 請參閱 `API_CONTRACT.md` 以了解端點層級權限

### 資料保護 (Data Protection)

**傳輸中加密**:
- 所有 HTTPS 流量使用 TLS 1.3
- WebSocket Secure (WSS)
- **PostgreSQL SSL 強制連線**

**靜態加密**:
- RDS: AWS KMS 加密
- S3: AES-256 伺服器端加密
- ElastiCache: 已啟用靜態加密

**PCI DSS 合規性**:
- Payment Service 使用 Stripe (PCI DSS Level 1 認證)
- 我們的資料庫中不存儲信用卡資料
- 已保存的付款方式使用代幣化

**網路安全**:
- Security Group: 嚴格的傳入規則 (僅限 Lambda + 開發 IP)
- Public RDS: 所有連線強制要求 SSL
- Security Groups 提供主要保護

---

## 資料流圖

### 訂單建立流程 (Happy Path)

```
1. 使用者客戶端 (PWA)
   ↓ POST /api/v1/orders
   
2. API Gateway
   ↓ Lambda 授權者 (驗證 JWT)
   
3. 訂單服務 (order-create-handler)
   ↓ 對照菜單服務驗證訂單項目 (快取)
   ↓ 預留庫存 (庫存服務，透過 EventBridge)
   ↓ 建立訂單記錄 (PostgreSQL 連線，透過 Drizzle ORM)
   ↓ 發布事件: Order.Created
   
4. EventBridge
   ↓ 將事件路由至多個目標
   
5a. 通知服務
    ↓ 發送確認郵件 (SES)
    ↓ 推送 WebSocket 訊息給使用者
    
5b. 庫存服務
    ↓ 提交預留庫存 (PostgreSQL，透過 Drizzle ORM)
    
6. 付款服務 (非同步)
   ↓ 透過 Stripe 處理付款
   ↓ 發布事件: Payment.Success
   
7. 訂單服務
   ↓ 更新訂單狀態: PENDING → PAID (PostgreSQL)
   ↓ 發布事件: Order.StatusChanged
   
8. KDS (廚房顯示系統)
   ↓ 接收 WebSocket 推送
   ↓ 在廚房螢幕上顯示訂單
```

### 菜單更新流程 (Menu Update Flow)

```
1. 店家儀表板 (Merchant Dashboard)
   ↓ PATCH /api/v1/menu/items/:id
   
2. API Gateway
   ↓ Lambda 授權者 (驗證 Merchant 角色)
   
3. 菜單服務 (menu-update-handler)
   ↓ 更新 PostgreSQL 記錄 (連線透過 Drizzle ORM)
   ↓ 使 Redis 快取失效: menu:{storeId}
   ↓ 發布事件: Menu.Updated
   
4. EventBridge
   ↓ 路由事件
   
5. 通知服務
    ↓ 通知已訂閱使用者 (選用)
```

---

## 服務相依性

### 相依性圖 (Dependency Graph)

```
授權服務 (Authorization Service) - (獨立)
    ↓ (提供 JWT 驗證)
    ↓
店家服務 (Store Service) - (獨立)
    ↓
菜單服務 (Menu Service)
    ↓ (相依於 店家服務)
    ↓
訂單服務 (Order Service) ← 付款服務 (Payment Service)
    ↓                         ↓
    ↓ (相依於 菜單、庫存、付款)
    ↓
庫存服務 (Inventory Service)
    ↓
通知服務 (Notification Service) - (訂閱所有事件)

使用者設定檔服務 (User Profile Service) - (相依於 授權)

裝置服務 (Device Service) - (相依於 店家)

// v0.2.0 範圍外:
// CRM 服務 (相依於 使用者設定檔, 訂單)
// 報表服務 (相依於 訂單, 使用者設定檔, CRM)
// 外送平台 Webhooks (相依於 訂單, 菜單, 庫存)
```

---

## 相關文件

- **[API_CONTRACT.md](./API_CONTRACT.md)**: 完整的 REST API 規範 (OpenAPI)
- **[EVENT_CONTRACT.md](./EVENT_CONTRACT.md)**: EventBridge 事件架構
- **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)**: 完整的 Drizzle ORM 架構和 ER 圖
- **[SHARED_TYPES.md](./SHARED_TYPES.md)**: TypeScript 型別定義
- **[SOFTWARE_DEVELOPMENT_PLAN.md](./SOFTWARE_DEVELOPMENT_PLAN.md)**: 詳細開發計畫

---

## 版本歷史

| 版本 | 日期 | 作者 | 變更內容 |
|---------|------|--------|---------|
| 1.0 | 2025-12-21 | Simon Chou | 初始基準 (範圍：v0.2.0 MVP + 庫存 + POS) |
| **1.1** | **2025-12-22** | **Simon Chou** | **更新資料庫架構：從 Aurora Serverless v2 變更為 RDS PostgreSQL (db.t3.micro, 單一可用區, 公有子網)，連線模式：從 RDS Proxy 變更為直接 Lambda 連線** |

---

## 聯絡方式

**架構負責人**: Simon Chou  
**問題諮詢**: 請參閱內嵌註解或透過專案儲存庫聯絡

