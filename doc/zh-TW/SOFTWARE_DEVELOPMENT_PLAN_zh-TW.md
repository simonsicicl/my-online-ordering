# 線上點餐系統 - 軟體開發計畫 (Software Development Plan)

## 文件資訊
- **版本**: 1.5
- **日期**: 2025年12月23日
- **狀態**: 主路線圖 (與 v1.1 設計規範一致)
- **負責人**: Simon Chou
- **相關文件**: [CONCEPT.md](../CONCEPT.md), [ARCHITECTURE_OVERVIEW_zh-TW.md](./ARCHITECTURE_OVERVIEW_zh-TW.md)

---

## 1. 技術參考文件 (Technical References)

本計畫基於以下主要文件中的技術規範。請參閱這些文件以獲取詳細定義。

- **架構與技術堆疊**: [ARCHITECTURE_OVERVIEW_zh-TW.md](./ARCHITECTURE_OVERVIEW_zh-TW.md)  
  *(定義系統概觀、微服務職責、通訊模式與技術堆疊)*

- **資料庫架構**: [DATABASE_SCHEMA_zh-TW.md](./DATABASE_SCHEMA_zh-TW.md)  
  *(定義資料表、欄位、關聯、索引與 Drizzle ORM Schema)*

- **API 合約**: [API_CONTRACT_zh-TW.md](./API_CONTRACT_zh-TW.md)  
  *(定義語意化 REST API 端點、請求/回應格式)*

- **事件合約**: [EVENT_CONTRACT_zh-TW.md](./EVENT_CONTRACT_zh-TW.md)  
  *(定義 EventBridge 模式與事件 Schema)*

---

## 2. 開發階段 (AI 輔助獨立開發)

**概觀**: 本開發計畫專為使用 AI 輔助的獨立開發者設計，總時間表約為 44-64 週 (11-16 個月)。每個版本皆可獨立運作並提供完整價值。

**開發方法**:
- AI 輔助程式碼生成以加速開發
- 增量交付 - 每個版本皆達到生產就緒狀態 (Production-ready)
- 優先專注核心功能，逐步增加複雜度
- 每週進度里程碑以追蹤狀況

**版本編號**:
- **v0.x.x**: Beta 版本 (開發階段)
- **v1.0.0**: 正式發布版 (公開上線)

---

### 版本 0.1.0: MVP - 核心點餐系統 (第 1-16 週)

**目標**: 建立基礎線上點餐系統，讓顧客可以點餐，商家可以管理。

---

#### 階段 1: 基礎設施與環境建置 (第 1-4 週)

**目標**: AWS 環境設定、資料庫設計、CI/CD 流程

**任務**:
- AWS 帳號設定 (Lambda, API Gateway, RDS PostgreSQL, ElastiCache)
- **RDS 實例建立**:
  - 實例類型: **db.t3.micro** (2 vCPU, 1GB RAM) 或 **db.t4g.micro** (ARM)
  - 儲存空間: **20GB 一般用途 SSD (gp2)**
  - 網路: **Public Subnet** 搭配 **Security Group 白名單** (Lambda SG + 開發 IP)
  - 設定: **Single-AZ**, **Publicly Accessible = true**, **SSL Required** (rds.force_ssl = 1)
  - 參數群組: 自訂參數群組，設定 **max_connections = 87**
- GitHub 儲存庫初始化
- CI/CD 流程設定 (GitHub Actions)
  - Lint 與測試自動化
  - 部署至開發環境
- 資料庫 Schema 設計 (Drizzle ORM)
  - 資料表: stores, menu_items, categories, orders, order_items, payments, users
  - 索引最佳化
  - **連線池設定**: 應用層級 (Drizzle ORM, 每個 Lambda 實例最多 10 個連線)
- API Gateway 設定 (HTTP + WebSocket)
- CloudWatch 監控設定
  - **新警報**: 資料庫連線數 > 70 (max_connections 的 80%), 剩餘空間 < 2GB, CPU > 80%
- SSM Parameter Store 設定 (Standard tier, SecureString 用於資料庫憑證、API 金鑰)
- Lambda 併發設定: 為所有連接 DB 的 Lambda 設定 ReservedConcurrentExecutions = 50

**交付項目**:
- [ ] AWS 基礎設施配置完成 (RDS 實例建立並設定)
- [ ] 資料庫 Schema 定案 (Drizzle schema 檔案)
- [ ] CI/CD 流程運作正常
- [ ] 開發環境準備就緒
- [ ] 安全群組與連線池設定完成

**里程碑**:
- 第 2 週: AWS 設定完成，建立 RDS 實例 (db.t3.micro, public subnet, SSL enabled)
- 第 4 週: CI/CD 運作中，可部署直接連線 RDS 的 Lambda 函數

---

#### 階段 2: 授權與門市服務 (第 5-8 週)

**目標**: 使用者認證與門市管理

**需建置服務**:
- **Authorization Service (授權服務)**
  - Cognito User Pool 設定
  - JWT Token 驗證 (Lambda Authorizer)
  - 使用者註冊/登入端點
  - 密碼重設流程
  - Cognito 群組 (User, Merchant, Cashier, Manager, Admin)
  
- **Store Service (門市服務)**
  - 門市 CRUD 操作
  - 營業時間管理 (JSONB)
  - 外送區域設定
  - 門市狀態切換 (接單中/休息中)
  - Redis 快取 (10 分鐘 TTL)

**Lambda 函數**:
- `auth-pre-signup-trigger`, `auth-post-confirmation`, `auth-token-validator`
- `store-get-handler`, `store-update-handler`, `store-delivery-zones-handler`

**交付項目**:
- [ ] 使用者註冊與登入功能正常
- [ ] JWT 認證流程完成
- [ ] 門市管理 API 就緒
- [ ] Redis 快取整合完成

**里程碑**:
- 第 6 週: Cognito 設定完成，認證 API 可用
- 第 8 週: 門市服務完成並包含快取

---

#### 階段 3: 菜單與訂單服務 (第 9-12 週)

**目標**: 菜單管理與訂單處理

**需建置服務**:
- **Menu Service (菜單服務)**
  - 菜單品項 CRUD
  - 分類管理
  - 上架/下架切換
  - 圖片上傳 (S3 + CloudFront)
  - Redis 快取 (5 分鐘 TTL, 更新時清除)
  
- **Order Service (訂單服務)**
  - 訂單建立與驗證
  - 訂單狀態機 (PENDING → PAID → CONFIRMED → PREPARING → READY → COMPLETED)
  - 訂單歷史查詢
  - EventBridge 事件發布 (Order.Created, Order.StatusChanged)

**Lambda 函數**:
- `menu-get-handler`, `menu-create-handler`, `menu-update-handler`, `menu-delete-handler`
- `order-create-handler`, `order-get-handler`, `order-update-status-handler`, `order-list-handler`

**交付項目**:
- [ ] 菜單管理 API 完成
- [ ] 訂單建立與狀態更新功能正常
- [ ] 事件驅動架構 (EventBridge)
- [ ] 圖片儲存 (S3 + CloudFront CDN)

**里程碑**:
- 第 10 週: 菜單服務完成 (含圖片上傳)
- 第 12 週: 訂單服務完成 (含狀態機)

---

#### 階段 4: 支付、通知與前端應用 (第 13-16 週)

**目標**: 支付整合與使用者介面應用程式

**需建置服務**:
- **Payment Service (支付服務)**
  - Stripe 整合 (信用卡支付)
  - Payment Intent 建立
  - Webhook 處理 (支付確認)
  - 退款處理
  
- **Notification Service (通知服務)**
  - WebSocket 連線管理 (API Gateway WebSocket)
  - Redis 連線 ID 儲存
  - 即時推播通知
  - Email 通知 (SES)
  - EventBridge 事件訂閱

**前端應用程式**:
- **User Client (顧客端 PWA - React 18 + TypeScript + Vite)**
  - 頁面: 瀏覽菜單、購物車、結帳、訂單追蹤
  - Redux Toolkit 狀態管理
  - PWA 設定 (Service Worker, Manifest)
  - 響應式設計 (Mobile-first)
  - WebSocket 整合 (即時更新)
  
- **Merchant Dashboard (商家後台 - React 18 + TypeScript + Vite)**
  - 頁面: 訂單管理、菜單編輯、基本設定
  - 即時訂單列表 (WebSocket)
  - 每日銷售摘要

**Lambda 函數**:
- `payment-create-intent`, `payment-webhook-handler`, `payment-refund-handler`
- `notification-websocket-connect`, `notification-websocket-disconnect`, `notification-send-handler`

**交付項目**:
- [ ] Stripe 支付整合運作正常
- [ ] 即時 WebSocket 通知
- [ ] User Client PWA (可安裝、響應式)
- [ ] Merchant Dashboard 功能正常
- [ ] 端對端訂單流程完成

**里程碑**:
- 第 14 週: 支付服務完成，Stripe 測試模式運作中
- 第 15 週: User Client MVP 完成
- 第 16 週: Merchant Dashboard 完成，全系統測試

**版本 0.1.0 成功標準**:
- 顧客可瀏覽菜單、下單並使用信用卡付款
- 商家可即時查看訂單、管理菜單
- 提供基礎每日銷售報表
- 系統部署至生產環境 (Beta)

---

### 版本 0.2.0: 庫存與 POS 系統 (第 17-28 週)

**目標**: 加入庫存管理與櫃台 POS 功能

---

#### 階段 1: 庫存服務 (第 17-20 週)

**目標**: 建立基於配方的成分級庫存追蹤與即時扣庫

**需建置服務**:
- **Inventory Service (庫存服務)**
  - **配方驅動庫存系統 (Recipe-Driven Inventory)**: 
    - 成分級追蹤 (咖啡豆、牛奶、糖等)
    - 配方定義: 將菜單品項 + 變體 映射到成分扣減
    - 配方條件: 根據客製化選項 (糖/冰) 觸發特定配方
    - 訂單成立時透過配方即時扣減
  - **集中式變體註冊表 (Centralized Variant Registry)**:
    - 門市範圍變體 (尺寸、溫度、甜度等級)
    - 新門市應用層級種子資料 (Seeding)
    - 程式碼自動生成 (僅供內部使用)
  - 低庫存警報 (EventBridge 事件)
  - 原子庫存鎖定 (PostgreSQL `SELECT FOR UPDATE`)
  - 庫存批次調整
  - 庫存歷史記錄
  - 多租戶: 所有庫存資料依 `storeId` 隔離

**資料庫 Schema 更新**:
- 資料表: `inventory_items` (成分), `variants` (門市範圍), `recipes`, `recipe_conditions`, `inventory_logs`
- PostgreSQL Triggers 用於自動警報
- 在 Schema 層級強制執行門市隔離

**Lambda 函數**:
- `inventory-get-handler`, `inventory-update-handler`, `inventory-deduct-handler` (基於配方), `inventory-alert-handler`
- `recipe-create-handler`, `recipe-condition-handler`

**交付項目**:
- [ ] 配方驅動的成分級庫存追蹤
- [ ] 集中式變體註冊表 (門市範圍)
- [ ] 低庫存警報 (EventBridge → Email)
- [ ] 訂單確認時透過配方扣減庫存
- [ ] 後台庫存管理 UI (成分 + 配方)

**里程碑**:
- 第 18 週: 庫存服務完成 (含配方系統)
- 第 20 週: 低庫存警報運作中，儀表板 UI 整合完成

---

#### 階段 2: 使用者資料與裝置服務 (第 21-24 週)

**目標**: 顧客資料與裝置註冊

**需建置服務**:
- **User Profile Service (使用者資料服務)**
  - 顧客資料 CRUD
  - 訂單歷史 (與 orders 表 JOIN)
  - 儲存地址 (JSONB 陣列)
  - 通知偏好設定
  
- **Device Service (軟體層)**
  - 裝置註冊 (POS 終端機、印表機)
  - 裝置狀態追蹤
  - 列印工作佇列 (SQS)
  - 基礎工作日誌 (尚未整合硬體)

**資料庫 Schema 更新**:
- 資料表: `user_profiles` (userId, addresses, preferences)
- 資料表: `devices` (deviceId, storeId, deviceType, status)
- 資料表: `print_jobs` (jobId, deviceId, status, payload)

**Lambda 函數**:
- `profile-get-handler`, `profile-update-handler`, `profile-orders-handler`
- `device-register-handler`, `device-update-status-handler`, `device-print-job-handler`

**交付項目**:
- [ ] 顧客資料包含訂單歷史
- [ ] 裝置註冊系統
- [ ] 列印工作佇列 (僅軟體)
- [ ] 增強版 User Client (儲存地址)

**里程碑**:
- 第 22 週: 使用者資料服務完成
- 第 24 週: 裝置服務軟體層就緒

---

#### 階段 3: POS 應用程式 (第 25-28 週)

**目標**: 櫃台點餐用桌面 POS 應用程式，具備角色權限控管

**前端應用程式**:
- **POS Application (Electron + React 18 + TypeScript + Vite)**
  - 快速點餐 (鍵盤快捷鍵)
  - 支援現金與信用卡支付
  - **手動折扣 (Manual Discounts)**: POS 員工可套用手動折扣並記錄原因代碼
  - 訂單修改 (新增/移除品項)
  - 分拆付款
  - **員工角色管理 (Staff Role Management)**:
    - 員工登入 (Cognito 角色驗證)
    - 角色存取控制 (RBAC): Cashier, Lead, Manager, Merchant
    - 基於權限的 UI 渲染 (Cashier: 僅 POS 操作, Lead: + 班次報告, Manager: + 菜單編輯, Merchant: + 門市設定)
  - 每日結帳報告 (Z-Report) 列印預覽
  - 離線模式與本地佇列

**功能**:
- 條碼掃描器支援 (未來硬體整合)
- 顧客顯示器 (選用，未來功能)
- 收據預覽 (目前列印為 PDF)
- 折扣與折扣原因欄位儲存於訂單資料表

**資料庫 Schema 更新**:
- Orders 表: 已存在 `discount` (decimal), `discountReason` (text) 欄位
- StoreStaff 表: 映射使用者至門市並包含 StaffRole Enum

**交付項目**:
- [ ] POS Electron App 完成
- [ ] 現金支付支援
- [ ] 手動折扣功能 (含原因追蹤)
- [ ] 具 RBAC 的員工認證 (Cashier/Lead/Manager/Merchant 角色)
- [ ] 快速點餐與鍵盤快捷鍵
- [ ] 訂單修改功能

**里程碑**:
- 第 26 週: POS App 基礎架構完成
- 第 28 週: 完整 POS 功能 (含 RBAC)，員工培訓教材就緒

**版本 0.2.0 成功標準**:
- 配方驅動的即時庫存追蹤運作中
- POS 系統上線運作，支援手動折扣
- 員工可處理櫃台現金/信用卡訂單
- RBAC 強制執行 (Cashier/Lead/Manager/Merchant 角色)
- 低庫存警報通知商家

---

### 版本 0.3.0: 分析與 CRM (第 29-36 週)

**目標**: 商業智慧與顧客關係管理

---

#### 階段 1: 報表服務 (第 29-32 週)

**目標**: 綜合分析與報表

**需建置服務**:
- **Report Service (報表服務)**
  - 日/週/月銷售報表
  - 依時段熱銷商品
  - 員工績效指標
  - 異常偵測 (卡單、詐欺模式)
  - 自動 Z-Report 生成 (EventBridge 排程)
  - PostgreSQL Materialized Views (每小時更新)
  - 直接在 RDS 執行 SQL 查詢 (MVP 不使用 Glue/Athena)

**資料庫 Schema 更新**:
- Materialized Views: `mv_daily_sales`, `mv_best_sellers`, `mv_staff_performance`
- 透過 EventBridge 排程 Lambda 更新 (每小時)

**Lambda 函數**:
- `report-sales-handler`, `report-bestsellers-handler`, `report-anomalies-handler`
- `report-z-report-generator`, `report-anomaly-scanner`

**交付項目**:
- [ ] 銷售分析 API
- [ ] 自動每日 Z-Report (PDF 生成)
- [ ] 熱銷商品報表
- [ ] 異常偵測警報
- [ ] 分析儀表板 (Recharts 整合)

**里程碑**:
- 第 30 週: 報表服務完成 (含 Materialized Views)
- 第 32 週: 儀表板分析 UI 完成

---

#### 階段 2: CRM 服務 (第 33-36 週)

**目標**: 顧客忠誠度與行銷

**需建置服務**:
- **CRM Service (客戶關係管理服務)**
  - **注意**: 此處將引入 CRM 資料表 (目前已從 v1.0 Schema 移除)
  - 連結 `Users` 表至 `LoyaltyPoints` 與 `Coupons` 表
  - 點數系統 (累積規則、兌換)
  - 分級會員 (銅、銀、金、白金)
  - 優惠券管理 (建立、驗證、兌換)
  - 顧客分眾 (頻率、花費、RFM 分析)
  - 推薦追蹤與獎勵
  - 多租戶: 所有 CRM 資料依 `storeId` 隔離

**資料庫 Schema 更新**:
- **新資料表**: `loyalty_points`, `coupons`, `coupon_redemptions`, `customer_tiers`, `referrals`
- PostgreSQL Triggers 用於分級計算
- Redis 快取用於優惠券驗證 (快速查找)
- Foreign Keys: 透過 `userId` 連結至 `users` 表

**Lambda 函數**:
- `crm-points-handler`, `crm-coupon-create-handler`, `crm-coupon-validate-handler`
- `crm-tier-calculate-handler`, `crm-referral-handler`

**交付項目**:
- [ ] 點數累積與兌換
- [ ] 優惠券系統 (折扣碼)
- [ ] 顧客分眾
- [ ] 分級會員與自動升級
- [ ] CRM 儀表板 UI

**里程碑**:
- 第 34 週: CRM 服務完成 (含點數與優惠券)
- 第 36 週: 儀表板 CRM UI 完成，顧客分眾功能運作中

**版本 0.3.0 成功標準**:
- 提供綜合銷售報表
- 忠誠度計畫運作中 (CRM 資料表導入生產環境)
- 商家可建立並管理優惠券
- 提供顧客分眾洞察

---

### 版本 0.4.0: Kiosk 與硬體整合 (第 37-44 週)

**目標**: 自助點餐機 (Kiosk) 與實體硬體週邊整合

---

#### 階段 1: Kiosk 應用程式 (第 37-40 週)

**目標**: 觸控最佳化的自助點餐介面

**前端應用程式**:
- **Kiosk Application (Electron + React 18 + TypeScript + Vite)**
  - 觸控最佳化 UI (大按鈕, 解析度至少 1920×1080)
  - 圖片式菜單瀏覽
  - 購物車與結帳流程
  - 刷卡支付整合 (軟體層)
  - 閒置 60 秒自動重置
  - 多語言支援 (英文、繁體中文)
  - 無障礙功能 (語音輔助、高對比)
  - 離線模式 (IndexedDB 快取)

**功能**:
- QR Code 掃描器支援 (會員查詢)
- 顧客收據預覽
- 訂單確認畫面

**交付項目**:
- [ ] Kiosk App 完成 (僅軟體)
- [ ] 觸控最佳化介面
- [ ] 自動重置功能
- [ ] 多語言支援
- [ ] 離線佇列與重試機制

**里程碑**:
- 第 38 週: Kiosk UI 完成
- 第 40 週: 完整 Kiosk 流程測試 (無硬體)

---

#### 階段 2: 硬體整合 (第 41-44 週)

**目標**: 實體裝置整合

**硬體週邊**:
- 收據印表機 (Star TSP654II 透過 AWS IoT Core)
- 廚房標籤機
- 讀卡機 (PAX A920 SDK 整合)
- 錢箱 (RJ11 觸發)
- QR Code 掃描器

**Device Service 增強**:
- AWS IoT Core 設定 (MQTT 通訊)
- 印表機 SDK 整合 (ESC/POS 指令)
- 讀卡機 SDK 整合
- 列印工作樣板 (收據、廚房標籤)
- 裝置健康監控

**Lambda 函數**:
- `device-iot-consumer`, `device-health-monitor`, `device-print-job-processor`

**交付項目**:
- [ ] 收據印表機功能正常
- [ ] 廚房標籤機運作中 (訂單號、品項、備註、取餐時間)
- [ ] 刷卡機整合完成
- [ ] 錢箱觸發功能正常
- [ ] QR Code 掃描器可運作

**硬體採購**:
- 1x Kiosk 觸控螢幕 (1920×1080 或更高)
- 1x Star TSP654II 收據印表機
- 1x 廚房標籤機
- 1x PAX A920 刷卡機
- 1x 錢箱 (RJ11 介面)
- 1x QR Code 掃描器

**里程碑**:
- 第 42 週: 印表機整合完成
- 第 44 週: 完整硬體設定測試，示範 Kiosk 安裝完成

**版本 0.4.0 成功標準**:
- Kiosk 與所有硬體運作正常
- 顧客可自行在 Kiosk 點餐並付款
- 收據與廚房標籤正確列印
- 系統能優雅地從硬體故障中恢復

---

### 版本 0.5.0: 廚房顯示系統 (KDS) (第 45-48 週)

**目標**: 廚房作業數位化與即時訂單顯示

---

#### 階段 1: 廚房顯示系統 (第 45-48 週)

**目標**: 即時廚房訂單管理

**前端應用程式**:
- **KDS Application (React 18 + TypeScript + Vite)**
  - 即時訂單顯示 (WebSocket)
  - 訂單卡片依時間排序
  - 顏色編碼優先級
    - 綠色: 正常
    - 黃色: 預約單 (顯示取餐時間)
    - 橘色: 快延遲 (>15 min)
    - 紅色: 已延質 (>30 min)
  - 工作站過濾 (熱廚、冷臺、飲料、甜點)
  - 出餐功能 (Bump - 標記品項完成)
  - 音效提示 (HTML5 Audio API)
  - 多螢幕支援 (URL 參數選擇工作站)
  - 每 2 秒自動重新整理

**功能**:
- 訂單詳情: 訂單號、品項、數量、備註、訂單來源
- 備餐時間追蹤
- 廚房績效指標
- 排程訂單完成時自動出餐 (Auto-bump)

**Lambda 函數**:
- `kds-order-consumer` (EventBridge → WebSocket push)
- `kds-bump-handler` (更新訂單品項狀態)

**交付項目**:
- [ ] KDS 應用程式完成
- [ ] 即時 WebSocket 整合
- [ ] 工作站過濾運作正常
- [ ] 音效提示功能正常
- [ ] 多螢幕支援 (2+ 顯示器)

**硬體**:
- 2x 43" 電視顯示器
- 廚房環境壁掛架
- HDMI 線材

**里程碑**:
- 第 46 週: KDS App 完成 (含 WebSocket)
- 第 48 週: 廚房硬體架設，員工培訓完成

**版本 0.5.0 成功標準**:
- 訂單即時顯示於 KDS
- 廚房員工可點擊出餐標記完成
- 多個工作站可獨立運作
- 音效提示通知廚房新訂單

---

### 版本 0.6.0: 外送平台整合 (第 49-60 週)

**目標**: 整合第三方外送平台 (UberEats 與 Foodpanda) 進行多通路訂單管理

---

#### 階段 1: UberEats 整合 (第 49-52 週)

**目標**: UberEats 訂單匯入、菜單同步與雙向狀態更新

**需建置服務**:
- **Delivery Platform Webhooks Service (UberEats)**
  - 訂單通知 Webhook 端點
  - HMAC-SHA256 簽章驗證
  - 訂單匯入 PostgreSQL
  - 冪等性處理 (Redis, 24 小時 TTL)
  - 狀態更新 API (已確認、準備中、準備就緒)
  - 菜單同步至 UberEats 平台
  - 透過 SQS 與 DLQ 進行重試邏輯
  - 多租戶: 平台訂單依 `storeId` 隔離

**資料庫 Schema 更新**:
- **新資料表**: `platform_orders`, `platform_sync_logs`
- Redis: `platform:idempotency:{orderId}` 快取
- OrderSource Enum: 新增 `UBEREATS` 值

**Lambda 函數**:
- `webhook-ubereats-handler`, `webhook-signature-validator`
- `platform-status-sync-ubereats`, `platform-order-mapper`
- `platform-menu-sync-ubereats`

**交付項目**:
- [ ] UberEats Webhook 端點運作正常
- [ ] 訂單自動匯入至系統
- [ ] 雙向狀態同步
- [ ] 菜單同步至 UberEats
- [ ] 重複訂單防護 (冪等性)
- [ ] 錯誤處理與重試

**里程碑**:
- 第 50 週: UberEats Webhook 整合完成
- 第 52 週: 狀態同步與菜單同步運作中，沙箱測試通過

---

#### 階段 2: Foodpanda 整合 (第 53-56 週)

**目標**: Foodpanda 訂單匯入、菜單同步與雙向狀態更新

**服務增強**:
- **Delivery Platform Webhooks Service (Foodpanda)**
  - Foodpanda Webhook 端點
  - Partner API 整合
  - 訂單匯入 (含平台特定映射)
  - Foodpanda 狀態同步
  - 菜單同步至 Foodpanda 平台
  - 多租戶: 平台訂單依 `storeId` 隔離

**資料庫 Schema 更新**:
- OrderSource Enum: 新增 `FOODPANDA` 值
- 擴充 `platform_orders` 與 `platform_sync_logs` 支援 Foodpanda

**Lambda 函數**:
- `webhook-foodpanda-handler`, `platform-status-sync-foodpanda`
- `platform-menu-sync-foodpanda`

**交付項目**:
- [ ] Foodpanda Webhook 端點運作正常
- [ ] 訂單自動匯入
- [ ] 雙向狀態同步
- [ ] 菜單同步至 Foodpanda
- [ ] 儀表板多平台訂單檢視

**里程碑**:
- 第 54 週: Foodpanda 整合完成
- 第 56 週: 多平台儀表板運作中

---

#### 階段 3: 菜單同步與優化 (第 57-60 週)

**目標**: 自動化菜單同步與平台管理

**建立功能**:
- 自動化菜單同步至平台 (EventBridge 排程)
- 庫存同步至平台 (標記品項無法供應)
- 平台特定定價規則
- 平台菜單映射介面 UI
- 平台分析 (依來源: USER_CLIENT, KIOSK, POS, UBEREATS, FOODPANDA)
- 菜單同步衝突解決
- 多租戶: 所有平台設定依 `storeId` 隔離

**Lambda 函數**:
- `platform-menu-sync`, `platform-inventory-sync`, `platform-analytics-handler`

**儀表板增強**:
- 平台訂單分析 (UberEats vs Foodpanda 比較)
- 菜單映射介面 (映射內部菜單品項至平台 Item ID)
- 平台狀態監控
- 同步日誌與錯誤報告

**交付項目**:
- [ ] 自動化菜單同步至 UberEats 與 Foodpanda
- [ ] 庫存同步 (品項無法供應)
- [ ] 儀表板平台映射 UI
- [ ] 平台分析儀表板
- [ ] 統一訂單檢視 (所有通路)

**里程碑**:
- 第 58 週: 菜單同步自動化完成
- 第 60 週: 完整多平台管理功能運作中

**版本 0.6.0 成功標準**:
- UberEats 與 Foodpanda 訂單自動匯入
- 狀態更新同步至雙平台
- 菜單與庫存自動同步
- 商家可從單一儀表板管理雙平台
- 提供平台特定分析數據

---

### 版本 1.0.0: 正式發布 (第 61-64 週)

**目標**: 品質保證、安全性驗證、公開生產環境發布

---

#### 階段 1: 最終測試與發布 (第 61-64 週)

**目標**: 綜合測試、安全稽核、生產環境部署

**測試活動**:

**第 61 週: 負載與效能測試**
- 使用 k6/JMeter 進行負載測試
  - 500 併發使用者
  - 每小時 1000+ 訂單
  - API 回應時間 < 200ms (p95)
- 壓力測試 (2倍正常負載)
- 資料庫查詢最佳化
- Lambda Cold Start 最佳化
- CloudFront 快取命中率驗證

**第 62 週: 安全稽核**
- OWASP Top 10 弱點掃描 (OWASP ZAP)
- 依賴套件弱點掃描 (Snyk)
- PCI DSS Level 1 合規驗證 (Stripe)
- 滲透測試 (第三方或自行稽核)
- 安全修補部署
- 憑證輪替驗證 (Secrets Rotation)

**第 63 週: 使用者驗收測試 (UAT)**
- 試營運 (Pilot Launch) 1 間餐廳 (2 週 Beta)
- 員工培訓與導入
- 收集回饋與錯誤回報
- 效能監控 (CloudWatch Dashboards)
- 修復關鍵 Bug
- 使用者滿意度調查

**第 64 週: 正式發布 (Production Launch)**
- 生產環境部署
- DNS 切換 (Route 53)
- 行銷活動啟動
- 客戶支援設置
- 24/7 監控啟用
- 操作手冊 (Runbooks) 文件化
- 備份與災難復原驗證

**交付項目**:
- [ ] 負載測試通過 (500+ 併發使用者)
- [ ] 安全稽核完成 (無關鍵弱點)
- [ ] PCI DSS 合規驗證
- [ ] 試營運餐廳 UAT 成功
- [ ] 生產環境部署完成
- [ ] 文件發布 (API Docs, User Guides, Runbooks)
- [ ] 監控儀表板啟用 (CloudWatch, X-Ray)

**測試檢查表**:
- [ ] 負載測試: 500 併發使用者, 1000+ 訂單/小時
- [ ] 壓力測試: 2倍峰值負載, 系統保持穩定
- [ ] 故障轉移測試: RDS 實例復原, Lambda 擴展
- [ ] 安全掃描: OWASP ZAP 自動掃描, 無關鍵問題
- [ ] 依賴掃描: Snyk, 所有弱點已修補
- [ ] 支付安全: PCI DSS 驗證, Stripe 合規
- [ ] UAT: 1 間試營運餐廳, 2 週, 使用者滿意度 > 4.5/5
- [ ] 滲透測試: 第三方稽核 (選用) 或自我稽核
- [ ] 備份/還原: 資料庫備份與還原測試
- [ ] 災難復原: 多區域故障轉移測試 (選用)

**效能目標**:
- API 回應 < 200ms (p95)
- 支援 500 併發使用者
- 99.9% 正常運行時間 (月度 SLA)
- 資料庫查詢 < 50ms (p95)
- Lambda Cold Start < 1s

**成功指標**:
- 系統穩定性: 試營運期間零嚴重中斷
- 訂單完成率 > 98%
- 客戶滿意度 > 4.5/5
- 商家採用: 首月 5+ 間餐廳導入
- 支付成功率 > 99%

**發布計畫**:
- 第 63 週: 軟性發布 (Soft Launch) - 1 間試營運餐廳
- 第 64 週: 公開發布
  - 行銷活動 (社群媒體、廣告)
  - 新商家導入支援
  - 客戶支援時間 (Email, Chat)
  - 部落格文章與新聞稿

**發布後 (第 65 週+)**:
- 持續監控 (CloudWatch, X-Ray, Error Tracking)
- Bug 修復優先順序佇列
- 功能請求收集
- 月度效能審查
- 季度安全稽核
- 成本最佳化審查

**版本 1.0.0 成功標準**:
- 公開生產環境發布完成
- 5+ 間餐廳導入
- 首月 99.9% 正常運行時間
- 零關鍵安全弱點
- 正面使用者回饋 (> 4.5/5)
- 系統能處理峰值負載 (500+ 併發使用者)

---

## 文件歷史

| 版本 | 日期 | 作者 | 變更 |
|---------|------|--------|---------|
| 1.0 | 2025-12-17 | Simon Chou | 初稿 |
| 1.1 | 2025-12-22 | Simon Chou | 與 v1.1 設計規範對齊：配方驅動庫存、集中式變體註冊表、Lead 角色、v0.2.0 手動折扣、僅支援 UberEats & Foodpanda、強調多租戶 |
| 1.2 | 2025-12-22 | Simon Chou | 資料庫架構更新：RDS PostgreSQL (db.t3.micro), 連線模型：Lambda 直連應用層級連線池 |
| 1.3 | 2025-12-23 | Simon Chou | 針對可讀性最佳化：移除重複的架構、Schema 與技術堆疊定義 (移至專屬文件)。重點聚焦於執行路線圖 (Roadmap)。 |
| 1.4 | 2025-12-23 | Simon Chou | 進一步精簡：移除開發標準 (Section 5)。Git 工作流已在 GIT_WORKFLOW.md 詳細定義。其他標準視為隱含知識或在參考文件中定義。 |
| **1.5** | **2025-12-23** | **Simon Chou** | **移除測試策略 (Section 3) 與部署策略 (Section 4)。相關技術指標與標準已整合至 ARCHITECTURE_OVERVIEW_zh-TW.md。SDP 現僅專注於交付時程與里程碑。** |
