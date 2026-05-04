# 第一階段實作計畫：基礎架構 (Foundation & Infrastructure) (Version 1)

**版本**: 1.1  
**日期**: 2026年1月14日  
**狀態**: 等待執行  
**依據**: [SOFTWARE_DEVELOPMENT_PLAN_zh-TW.md](../SOFTWARE_DEVELOPMENT_PLAN_zh-TW.md)

---

## 🎯 階段目標
建立 "My Online Ordering System" (v0.1.0 MVP) 的基石，包含設定 Monorepo 架構、實作共用型別系統 (Shared Types)、定義嚴格的資料庫 Schema (Drizzle ORM)，以及配置核心 AWS 基礎建設 (RDS)。

---

## 📋 任務細節分解

### 📦 任務 1: Monorepo 初始化
**目標**: 建立一個支援共用套件與微服務的強健 TurboRepo + PNPM workspace。

- [ ] **1.1 Workspace 設定**
  - 初始化包含 PNPM workspaces 的 `package.json`。
  - 建立 `pnpm-workspace.yaml` 定義 `packages/*`, `services/*`, `apps/*`。
  - 設定 `turbo.json` 用於建置流程 (build pipelines)。
- [ ] **1.2 開發者體驗 (Developer Experience)**
  - 設定根目錄 `tsconfig.json` (基礎設定)。
  - 設定 `prettier` 與 `eslint` 以確保程式碼風格一致。
  - 建立正確的 `.gitignore`。

### 📚 任務 2: 共用型別套件 (`@myordering/shared-types`)
**目標**: 依據 [SHARED_TYPES_zh-TW.md](../SHARED_TYPES_zh-TW.md) 實作 TypeScript 定義的單一真理來源 (Single Source of Truth)。

- [ ] **2.1 套件架構搭建**
  - 初始化 `packages/shared-types`。
  - 設定 `tsconfig.json` 與建置腳本 (build scripts)。
- [ ] **2.2 Domain Types 實作**
  - 實作 `domain/menu.types.ts`
  - 實作 `domain/order.types.ts`
  - 實作 `domain/payment.types.ts`
  - 實作 `domain/user.types.ts` (身分與角色)
  - 實作 `domain/store.types.ts`
  - 實作 `domain/inventory.types.ts`
  - 實作 `domain/device.types.ts`
  - 實作 `domain/notification.types.ts`
  - 實作 `domain/crm.types.ts`
- [ ] **2.3 API 與 Event Types**
  - 實作 `api/*.types.ts` (請求/回應標準)。
  - 實作 `events/eventbridge.types.ts` (事件 Schema)。
- [ ] **2.4 匯出設定 (Export Configuration)**
  - 確保所有型別皆透過 `index.ts` 正確匯出。

### 🗄️ 任務 3: 資料庫套件 (`@myordering/database`)
**目標**: 實作完全符合 [DATABASE_SCHEMA_zh-TW.md](../DATABASE_SCHEMA_zh-TW.md) 的 Drizzle ORM Schema。

- [ ] **3.1 套件架構搭建**
  - 初始化 `packages/database`。
  - 安裝 `drizzle-orm`, `drizzle-kit`, `postgres` (驅動程式)。
- [ ] **3.2 Schema 定義 (嚴格遵守 `snake_case`)**
  - 定義 Enums (`enums.ts`) 符合文件規範。
  - 定義資料表 (`schema/*.ts`):
    - `stores` (店家)
    - `users`, `user_profiles`, `store_staff` (使用者與員工)
    - `menu_categories`, `menu_items`, `menu_item_customizations`, `combo_groups`, `combo_group_items` (菜單與套餐)
    - `variants`, `customization_options` (變體與客製化選項)
    - `recipes`, `recipe_conditions` (配方與條件)
    - `orders`, `order_items` (訂單)
    - `payments`, `refunds` (支付與退款)
    - `inventory_items`, `inventory_logs` (庫存與紀錄)
    - `devices`, `print_jobs` (裝置與列印任務)
    - `notifications` (通知)
- [ ] **3.3 遷移工具 (Migration Tooling)**
  - 設定 `drizzle.config.ts`。
  - 建立 `src/migrate.ts` 腳本供 Lambda 執行。
  - 建立本機開發用的遷移執行器 (migration runner)。

### ☁️ 任務 4: AWS 基礎建設 (核心)
**目標**: 供應持久層 (Persistence Layer) 與安全憑證管理。

- [ ] **4.1 RDS PostgreSQL 設定**
  - 啟動 `db.t3.micro` 實例 (Dev 環境)。
  - 設定 Security Groups (允許 Dev 公開存取, 限制 IP)。
  - 建立資料庫 `myordering`。
- [ ] **4.2 SSM Parameter Store**
  - 安全地儲存資料庫憑證 (`/myordering/dev/database-url`)。
  - 儲存設定標記 (configuration flags)。
- [ ] **4.3 連線測試**
  - 驗證本機連線至 RDS。
  - 驗證 Drizzle migration 是否能對 RDS 執行成功。

### 🚀 任務 5: CI/CD Pipeline 基礎
**目標**: 自動化品質檢查。

- [ ] **5.1 GitHub Actions**
  - 建立 `.github/workflows/ci.yml`。
  - 實作 `lint`, `build` 與 `type-check` 工作 (jobs)。

---

## 📝 執行順序與 Git 分支策略

我們將遵循 `doc/GIT_WORKFLOW_zh-TW.md` 中定義的 **Git Workflow**。

1. **初始狀態**: `develop` 分支目​​前是乾淨的。
2. **分支**: `feature/phase1-foundation`
   - 執行 任務 1 & 任務 2。
3. **分支**: `feature/phase1-database`
   - 執行 任務 3。
4. **分支**: `feature/phase1-aws-infra`
   - 執行 任務 4。
5. **合併**: 隨著任務完成，將 PR 合併回 `develop`。

---

## ⚠️ 關鍵品質檢查 (Dos & Don'ts)

- **DO** 所有資料庫欄位使用 `snake_case` (例如: `is_open`, `created_at`)。
- **DO NOT** 在 import 中使用絕對路徑；請使用套件名稱 (package names)。
- **DO** 持續參照設計文件；不要自行發明新欄位。
- **DO** 頻繁提交 (Commit) 並使用 conventional commit messages (例如: `feat(db): implement menu schema`)。
