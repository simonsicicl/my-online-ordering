# 架構概觀

**文件版本**: 1.0  
**最後更新**: 2025 年 12 月 21 日  
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

- **架構風格**: 具有事件驅動通訊的無伺服器微服務
- **雲端供應商**: AWS（主要：us-east-1，DR：us-west-2）
- **運算模型**: AWS Lambda（Node.js 20.x）
- **資料庫**: Aurora Serverless v2 PostgreSQL（主要）+ ElastiCache Redis（快取）
- **API 閘道**: AWS API Gateway（HTTP + WebSocket）
- **事件匯流排**: AWS EventBridge
- **訊息佇列**: SQS + SNS
- **前端**: React 18 + TypeScript + Vite（5 個應用程式）

### 系統邊界

**範圍內（v0.2.0 - MVP + 庫存 + POS）**:
- 訂單管理（建立、追蹤、履行）
- 菜單和庫存管理
- 付款處理（Stripe 整合）
- 使用者驗證和授權（AWS Cognito）
- 廚房營運（KDS）
- POS 和自助服務機操作

**v0.2.0 範圍外**（未來版本）:
- 多通道訂單匯總（UberEats、Foodpanda）
- CRM 和分析
- 外送物流（由第三方平台處理）
- 會計和稅務計算（僅匯出資料）
- 供應鏈管理
- 人力資源管理

---

## 架構原則

### 1. 無伺服器優先
- 優先選擇託管服務而非自行管理的基礎設施
- Lambda 函數用於運算（自動擴展、按使用付費）
- Aurora Serverless v2 用於資料庫（自動擴展容量）
- 最小化營運開銷

### 2. 事件驅動架構
- 透過 EventBridge 實現鬆散耦合
- 非阻塞操作的非同步處理
- 用於稽核追蹤的事件溯源
- 用於扇出場景的發布/訂閱模式

### 3. API 優先設計
- 所有服務公開 RESTful API
- OpenAPI 規範作為契約
- 版本化 API（/api/v1/）
- 一致的請求/回應格式

### 4. 領域驅動設計
- 微服務與業務領域對齊
- 清晰的服務邊界
- 每個服務擁有自己的資料
- 服務之間不直接存取資料庫

### 5. 彈性和容錯能力
- 具有指數退避的重試機制
- 失敗訊息的死信佇列（DLQ）
- 外部相依性的斷路器
- 冪等操作（使用 Redis 冪等性金鑰）

### 6. 設計安全性
- 透過 AWS Cognito 進行驗證（JWT 令牌）
- 透過 RBAC（基於角色的存取控制）進行授權
- 傳輸中加密（TLS 1.3）和靜態加密（AES-256）
- PCI DSS Level 1 合規性用於付款處理
- 透過 AWS Secrets Manager 管理密鑰

### 7. 可觀察性
- 集中式日誌記錄（CloudWatch Logs）
- 分散式追蹤（X-Ray）
- 指標和監控（CloudWatch）
- 結構化日誌記錄（JSON 格式）

---

## 系統組件

### 後端微服務（9 個服務）

#### 核心業務服務

| 服務 | 職責 | 關鍵技術 |
|------|------|---------|
| **菜單服務** | 產品目錄、定價、圖片、可用性 | Lambda、Drizzle ORM、PostgreSQL、Redis、S3 |
| **訂單服務** | 訂單生命週期、狀態機、協調 | Lambda、Drizzle ORM、PostgreSQL、Step Functions |
| **庫存服務** | 庫存追蹤、保留、警示 | Lambda、Drizzle ORM、PostgreSQL、Redis |
| **付款服務** | 付款處理、對帳 | Lambda、Drizzle ORM、PostgreSQL、Stripe SDK |

#### 使用者與存取管理

| 服務 | 職責 | 關鍵技術 |
|------|------|---------|
| **授權服務** | 驗證、RBAC、會話管理 | Cognito、Lambda、Drizzle ORM、PostgreSQL |
| **使用者檔案服務** | 顧客資料、偏好設定、訂單歷史 | Lambda、Drizzle ORM、PostgreSQL、Redis |

#### 營運服務

| 服務 | 職責 | 關鍵技術 |
|------|------|---------|
| **店家服務** | 餐廳設定、營業時間、外送規則 | Lambda、Drizzle ORM、PostgreSQL、Redis |
| **裝置服務** | 硬體註冊表、列印工作、健康監控 | Lambda、Drizzle ORM、PostgreSQL、AWS IoT Core、SQS |
| **通知服務** | 多通道訊息傳遞、即時推送 | Lambda、Drizzle ORM、PostgreSQL、Redis、WebSocket、SES、SNS |

#### 商業智慧

**狀態**: v0.2.0（MVP + 庫存 + POS）範圍外

**未來服務**:
- CRM 服務（忠誠度、優惠券、客戶分群）
- 報表服務（分析、儀表板、異常檢測）

**擴充性**: 訂單架構包含 discount/discountReason 欄位，以供未來 CRM 整合使用。

#### 整合層

**狀態**: v0.2.0（MVP + 庫存 + POS）範圍外

**未來服務**:
- 外送平台 Webhooks（UberEats/Foodpanda 整合、同步）

**擴充性**: OrderSource 列舉可在未來版本中擴展以包含 UBEREATS/FOODPANDA。

### 前端應用程式（5 個應用程式）

| 應用程式 | 類型 | 目的 | 關鍵技術 |
|----------|------|------|---------|
| **使用者客戶端** | PWA | 行動優先的網頁應用程式，供顧客點餐 | React 18、TypeScript、Vite、Redux Toolkit、SCSS |
| **商家儀表板** | 網頁應用程式 | 餐廳管理主控台 | React 18、TypeScript、Vite、Redux Toolkit、Recharts |
| **自助服務機** | Electron | 自助點餐終端機 | Electron、React 18、TypeScript、Vite |
| **POS** | Electron | 櫃檯點餐的銷售點系統 | Electron、React 18、TypeScript、Vite |
| **KDS** | 網頁應用程式 | 用於訂單準備的廚房顯示系統 | React 18、TypeScript、Vite、WebSocket |

---

## 通訊模式

### 1. 同步通訊（REST API）

**模式**: 請求-回應  
**技術**: API Gateway（HTTP API）→ Lambda  
**使用案例**: CRUD 操作、查詢、立即回應

**流程**:
```
客戶端 → API Gateway → Lambda Authorizer（JWT 驗證）
                    → Lambda Handler → RDS Proxy → PostgreSQL
                                    → 回應
```

**API 結構**:
- Base URL: `https://api.example.com`
- 版本: `/api/v1/`
- 資源: `/stores`、`/menu`、`/orders` 等

### 2. 非同步通訊（事件驅動）

**模式**: 發布/訂閱  
**技術**: EventBridge → Lambda/SQS/SNS  
**使用案例**: 領域事件、跨服務通訊、扇出

**流程**:
```
服務 A → EventBridge 事件匯流排 → EventBridge 規則
                                → Lambda 函數（服務 B）
                                → SQS 佇列（服務 C）
                                → SNS 主題 → 多個訂閱者
```

**事件範例**:
- `Order.Created` → 通知服務 + 庫存服務
- `Payment.Success` → 訂單服務
- `Stock.LowAlert` → 通知服務

### 3. 即時通訊（WebSocket）

**模式**: 持久連接  
**技術**: API Gateway WebSocket API  
**使用案例**: 訂單追蹤、KDS 更新、即時通知

**流程**:
```
客戶端 → WebSocket 連接 → API Gateway → Lambda ($connect)
                                      → 將 connectionId 存入 Redis
      ← WebSocket 訊息 ← Lambda → API Gateway @connections
```

**路由**:
- `$connect`: 驗證並存儲連接 ID
- `$disconnect`: 清理連接 ID
- `$default`: 處理傳入訊息

### 4. 訊息佇列模式

**模式**: 工作佇列  
**技術**: SQS（標準/FIFO）  
**使用案例**: 列印工作、webhook 重試、批次處理

**流程**:
```
生產者 → SQS 佇列 → Lambda 消費者（長輪詢）
                → 死信佇列（如果 3 次重試後失敗）
```

---

## 技術堆疊

### 後端層

| 類別 | 技術 | 版本 | 目的 |
|------|------|------|------|
| **執行環境** | Node.js | 20.x | Lambda 執行環境 |
| **語言** | TypeScript | 5.x | 型別安全的後端開發 |
| **ORM** | Drizzle ORM | 0.30.x | 輕量級資料庫存取（~5KB，針對無伺服器最佳化） |
| **API 框架** | AWS Lambda | - | 無伺服器運算 |
| **驗證** | AWS Cognito | - | 使用者管理和 JWT |
| **資料庫** | Aurora Serverless v2 PostgreSQL | 15.x | 主要資料存儲 |
| **快取** | ElastiCache Redis | 7.x | 快取和臨時資料 |
| **事件匯流排** | EventBridge | - | 事件驅動通訊 |
| **訊息佇列** | SQS + SNS | - | 非同步處理 |
| **狀態機** | Step Functions | - | 訂單工作流程編排 |
| **物件存儲** | S3 + CloudFront | - | 圖片存儲和 CDN |
| **分析** | Glue + Athena | - | 資料湖和 SQL 分析 |

### 前端層

| 類別 | 技術 | 版本 | 目的 |
|------|------|------|------|
| **框架** | React | 18.x | UI 函式庫 |
| **語言** | TypeScript | 5.x | 型別安全的前端開發 |
| **建置工具** | Vite | 5.x | 快速開發伺服器和打包工具 |
| **狀態管理** | Redux Toolkit | 2.x | 全域狀態管理 |
| **樣式** | SCSS (Sass) | - | 具有變數和巢狀的 CSS |
| **CSS 架構** | CSS Modules + BEM | - | 組件範圍樣式 |
| **HTTP 客戶端** | Axios | 1.x | API 請求 |
| **桌面執行環境** | Electron | 28.x | 自助服務機和 POS 應用程式 |

### DevOps 與基礎設施

| 類別 | 技術 | 目的 |
|------|------|------|
| **IaC** | AWS SAM / CDK | 基礎設施即程式碼 |
| **CI/CD** | GitHub Actions | 自動化測試和部署 |
| **監控** | CloudWatch | 指標、日誌、警報 |
| **追蹤** | X-Ray | 分散式追蹤 |
| **密鑰** | Secrets Manager | API 金鑰和憑證 |
| **DNS** | Route 53 | 網域管理 |
| **安全** | WAF + Shield | DDoS 防護 |

---

## 部署架構

### AWS 服務拓撲

```
┌─────────────────────────────────────────────────────────────┐
│                        CloudFront CDN                        │
│                  (靜態資產、圖片交付)                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     Route 53 (DNS)                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  AWS WAF + Shield                            │
│                  (DDoS 防護、速率限制)                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│               API Gateway (HTTP + WebSocket)                 │
│              - Lambda Authorizer (JWT)                       │
│              - 節流（每個 IP 100 req/s）                       │
│              - CORS 設定                                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Lambda 函數                                │
│         (12 個後端服務，50+ 個函數)                            │
└─────────────────────────────────────────────────────────────┘
         ↓                    ↓                    ↓
┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  RDS Proxy  │    │   EventBridge    │    │   SQS + SNS     │
│ (連接池管理) │    │   (事件匯流排)    │    │ (訊息佇列)       │
└─────────────┘    └──────────────────┘    └─────────────────┘
       ↓                     ↓
┌─────────────────────────────────────────────────────────────┐
│        Aurora Serverless v2 PostgreSQL (多可用區)             │
│              - 自動擴展容量                                    │
│              - ACID 合規性                                    │
│              - 時間點復原                                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│         ElastiCache Redis (已啟用叢集模式)                     │
│              - 快取（菜單、店家、使用者檔案）                   │
│              - WebSocket 連接                                 │
│              - 冪等性金鑰                                      │
│              - 庫存鎖定                                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    S3 + CloudFront                           │
│              - 圖片存儲（菜單照片）                            │
│              - 資料湖（歷史分析）                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 AWS IoT Core (MQTT)                          │
│              - 收據印表機                                     │
│              - 廚房標籤印表機                                  │
│              - 讀卡機                                         │
└─────────────────────────────────────────────────────────────┘
```

### 多區域架構

**主要區域**: us-east-1  
**DR 區域**: us-west-2

**容錯移轉策略**:
- Route 53 健康檢查
- Aurora Global Database（跨區域複寫）
- S3 跨區域複寫
- Lambda 部署在兩個區域（DR 中處於休眠狀態）
- RTO: 4 小時
- RPO: 1 小時

---

## 安全架構

### 驗證流程

```
使用者 → Cognito User Pool → JWT Token (RS256)
                           → Lambda Authorizer (API Gateway)
                           → 驗證 JWT 簽章
                           → 檢查使用者權限（PostgreSQL）
                           → 允許/拒絕請求
```

### 授權模型（RBAC）

**角色**:
- **User**（顧客）: 瀏覽菜單、下訂單、查看訂單歷史
- **Merchant**（擁有者）: 店家管理的完整存取權限
- **Manager**（經理）: 訂單管理、報表、員工管理
- **Cashier**（收銀員）: POS 操作、基本訂單管理
- **Admin**（系統管理員）: 系統全域存取權限（僅內部使用）

**權限矩陣**: 請參閱 `API_CONTRACT.md` 以了解端點層級權限

### 資料保護

**傳輸中加密**:
- 所有 HTTPS 流量使用 TLS 1.3
- WebSocket Secure (WSS)

**靜態加密**:
- Aurora: AWS KMS 加密
- S3: AES-256 伺服器端加密
- ElastiCache: 已啟用靜態加密

**PCI DSS 合規性**:
- 付款服務使用 Stripe（PCI DSS Level 1 認證）
- 我們的資料庫中不存儲信用卡資料
- 已保存的付款方式使用代幣化

---

## 資料流圖

### 訂單建立流程（正常路徑）

```
1. 使用者客戶端（PWA）
   ↓ POST /api/v1/orders
   
2. API Gateway
   ↓ Lambda Authorizer（驗證 JWT）
   
3. 訂單服務（order-create-handler）
   ↓ 根據菜單服務驗證訂單項目（快取）
   ↓ 保留庫存（透過 EventBridge 呼叫庫存服務）
   ↓ 建立訂單記錄（透過 Drizzle ORM 存入 PostgreSQL）
   ↓ 發布事件：Order.Created
   
4. EventBridge
   ↓ 將事件路由至多個目標
   
5a. 通知服務
    ↓ 發送確認電子郵件（SES）
    ↓ 推送 WebSocket 訊息給使用者
    
5b. 庫存服務
    ↓ 提交保留的庫存
    
6. 付款服務（非同步）
   ↓ 透過 Stripe 處理付款
   ↓ 發布事件：Payment.Success
   
7. 訂單服務
   ↓ 更新訂單狀態：PENDING → PAID
   ↓ 發布事件：Order.StatusChanged
   
8. KDS（廚房顯示系統）
   ↓ 接收 WebSocket 推送
   ↓ 在廚房螢幕上顯示訂單
```

### 菜單更新流程

```
1. 商家儀表板
   ↓ PATCH /api/v1/menu/items/:id
   
2. API Gateway
   ↓ Lambda Authorizer（驗證 Merchant 角色）
   
3. 菜單服務（menu-update-handler）
   ↓ 更新 PostgreSQL 記錄
   ↓ 使 Redis 快取失效：menu:{storeId}
   ↓ 發布事件：Menu.Updated
   
4. EventBridge
   ↓ 路由事件
   
5. 通知服務
    ↓ 通知訂閱的使用者（可選）
```

---

## 服務相依性

### 相依性圖

```
授權服務（獨立）
    ↓（提供 JWT 驗證）
    ↓
店家服務（獨立）
    ↓
菜單服務
    ↓（相依於店家）
    ↓
訂單服務 ← 付款服務
    ↓              ↓
    ↓（相依於菜單、庫存、付款）
    ↓
庫存服務
    ↓
通知服務（訂閱所有事件）

使用者檔案服務（相依於授權）

裝置服務（相依於店家）

// v0.2.0 範圍外：
// CRM 服務（相依於使用者檔案、訂單）
// 報表服務（相依於訂單、使用者檔案、CRM）
// 外送平台 Webhooks（相依於訂單、菜單、庫存）
```

### 關鍵路徑服務

**第 1 層（基本點餐必須可用）**:
- 授權服務
- 店家服務
- 菜單服務
- 訂單服務
- 付款服務

**第 2 層（增強功能）**:
- 庫存服務
- 通知服務
- 使用者檔案服務
- 裝置服務

**第 3 層（未來 - v0.2.0 範圍外）**:
- CRM 服務
- 報表服務
- 外送平台 Webhooks 服務

---

## 效能目標

### API 效能

| 指標 | 目標 | 測量方式 |
|------|------|---------|
| API 回應時間（p95） | < 200ms | CloudWatch |
| API 回應時間（p99） | < 500ms | CloudWatch |
| 資料庫查詢時間（p95） | < 50ms | PostgreSQL 日誌 |
| 快取命中率 | > 80% | Redis 指標 |
| Lambda 冷啟動 | < 1s | X-Ray |

### 系統容量

| 指標 | 目標 |
|------|------|
| 並行使用者 | 500+ |
| 每小時訂單數 | 1000+ |
| WebSocket 連接數 | 10,000+ |
| 系統正常運作時間 | 99.9%（每月 SLA） |

### 可擴展性

- **Lambda**: 每個區域自動擴展至 1,000 個並行執行
- **Aurora**: 從 0.5 ACU 自動擴展至 128 ACU
- **Redis**: 叢集模式，5 個分片，每個分片 1 個副本
- **API Gateway**: 每秒 10,000 個請求（區域限制）

---

## 相關文件

- **[API_CONTRACT.md](./API_CONTRACT.md)**: 完整的 REST API 規範（OpenAPI）
- **[EVENT_CONTRACT.md](./EVENT_CONTRACT.md)**: EventBridge 事件架構
- **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)**: 完整的 Drizzle ORM 架構和 ER 圖
- **[SHARED_TYPES.md](./SHARED_TYPES.md)**: TypeScript 型別定義
- **[SOFTWARE_DEVELOPMENT_PLAN.md](./SOFTWARE_DEVELOPMENT_PLAN.md)**: 詳細開發計畫

---

## 版本歷史

| 版本 | 日期 | 作者 | 變更內容 |
|------|------|------|----------|
| 1.0 | 2025-12-21 | Simon Chou | 初始基準（範圍：v0.2.0 MVP + 庫存 + POS） |

---

## 聯絡方式

**架構負責人**: Simon Chou  
**問題諮詢**: 請參閱內嵌註解或透過專案儲存庫聯絡

