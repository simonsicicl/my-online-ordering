# Git 工作流程與 CI/CD 開發指南

本文件定義了「線上點餐系統 (My Online Ordering System)」專案的 Git 分支策略、工作流程以及 CI/CD 整合標準。

---

## 目錄

1. [分支架構](#分支架構)
2. [分支類型說明](#分支類型說明)
3. [CI/CD 整合](#cicd-整合)
4. [分支保護規則](#分支保護規則)
5. [Commit 訊息規範](#commit-訊息規範)

---

## 分支架構

```
main (生產環境，永久分支)
  └─ develop (開發主線，永久分支)
       ├─ feature/inventory-service (功能分支，臨時)
       ├─ feature/payment-integration (功能分支，臨時)
       ├─ fix/eslint-warnings (修復分支，臨時)
       └─ release/v0.1.0 (發布分支，臨時)
```

### 分支命名規範

| 分支類型 | 命名格式 | 範例 |
|------------|---------------|---------|
| 永久分支 | `main`, `develop` | - |
| 功能開發 | `feature/<描述>` | `feature/auth-service` |
| Bug 修復 | `fix/<描述>` | `fix/database-connection-pool` |
| 版本發布 | `release/v<版本>` | `release/v0.1.0` |
| 緊急修復 | `hotfix/<描述>` | `hotfix/payment-crash` |

---

## 分支類型說明

### 永久分支 (共 2 個)

#### 1. `main` - 生產環境 (Production)

- **用途**: 隨時保持可部署的穩定代碼
- **保護**: 最高等級，所有變更必須透過 PR
- **來源**: 僅接受來自 `release/*` 或 `hotfix/*` 的合併
- **標籤**: 每次合併都會打上 Git Tag (`v0.1.0`, `v0.2.0`)
- **部署**: 自動部署至 AWS Production 環境

#### 2. `develop` - 開發主線 (Development)

- **用途**: 新功能的整合分支
- **保護**: 高等級，所有變更必須透過 PR
- **來源**: 接受來自 `feature/*`, `fix/*`, `release/*` 的合併
- **特點**: 所有階段的開發都在此整合
- **部署**: 自動部署至 AWS Staging 環境

### 臨時分支 (按需建立)

#### 功能開發: `feature/<描述>`

**用途**: 開發新功能
**生命週期**: 從 develop 分支出來，完成後合併回 develop，然後刪除
**命名範例**:
- `feature/auth-service`
- `feature/menu-crud-api`
- `feature/websocket-notifications`

#### Bug 修復: `fix/<描述>`

**用途**: 修復 develop 分支中的 bug
**生命週期**: 從 develop 分支出來，修復後合併回 develop，然後刪除
**命名範例**:
- `fix/eslint-warnings`
- `fix/redis-cache-invalidation`
- `fix/order-status-transition`

#### 版本發布: `release/v<版本>`

**用途**: 版本發布前的最終準備
**生命週期**: 從 develop 分支出來，完成後合併至 main 與 develop，然後刪除
**允許的變更**:
- ✅ 版本號更新 (`package.json`, `CHANGELOG.md`)
- ✅ 關鍵 Bug 修復
- ✅ 文件更新
- ❌ 禁止新功能開發

#### 緊急修復: `hotfix/<描述>`

**用途**: 生產環境嚴重問題的緊急修復
**生命週期**: 從 main 分支出來，修復後合併至 main 與 develop，然後刪除
**注意**: 這是唯一可以從 main 分支出來的分支類型

---

## CI/CD 整合

### 標準 GitHub Actions 工作流程

請參考實際配置檔案：[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)

該工作流程處理所有分支的自動化測試，以及 `develop` (Staging) 和 `main` (Production) 的自動部署。

### CI/CD 觸發矩陣

| 事件 | 分支 | 執行的 Job |
|-------|--------|---------------|
| Pull Request 開啟 | 任意 → `main`/`develop` | `lint-and-test` |
| Pull Request 更新 | 任意 → `main`/`develop` | `lint-and-test` |
| Push | `develop` | `lint-and-test` + `deploy-staging` |
| Push | `main` | `lint-and-test` + `deploy-production` |
| Pull Request 合併 | `feature/*` → `develop` | `lint-and-test` + `deploy-staging` |
| Pull Request 合併 | `release/*` → `main` | `lint-and-test` + `deploy-production` |

### CI/CD 最佳實踐

1. **快速失敗 (Fail Fast)**: Lint 失敗立即停止，不執行後續步驟
2. **並行執行**: 獨立的測試可以並行運行以提高速度
3. **依賴緩存**: 使用 `actions/cache` 緩存 `node_modules`
4. **環境隔離**: Staging 和 Production 使用不同的 AWS 憑證
5. **人工批准**: Production 部署前增加人工批准步驟 (`environment` 保護規則)

---

## 分支保護規則

### GitHub Repository 設定

**路徑**: `Settings` → `Branches` → `Branch protection rules`

為 `main` 和 `develop` 分支配置以下規則：

#### 保護規則矩陣

| 規則 | main (Production) | develop (Staging) | 說明 |
|------|-------------------|-------------------|-------------|
| **Require pull request** | ✅ | ✅ | 防止直接 push |
| └─ Approvals required | 1 (minimum) | 0 (optional) | 強制代碼審查 |
| **Require status checks** | ✅ | ✅ | CI 必須通過 (`lint-and-test`) |
| **Require conversation resolution** | ✅ | ✅ | 必須解決所有評論 |
| **Require linear history** | ✅ | ✅ | 強制 Squash merging |
| **Require signed commits** | ✅ | - | 安全驗證 |
| **Do not allow bypassing** | ✅ | ✅ | 管理員也受規則限制 |

#### 效果
- ❌ 拒絕直接 `git push`
- ❌ 若 CI 失敗則禁止合併
- ✅ 強制使用 "Squash and Merge" 策略

---

## Commit 訊息規範

### Conventional Commits 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 類別

| Type | 說明 | 範例 |
|------|-------------|---------|
| `feat` | 新功能 | `feat(auth): add JWT token validation` |
| `fix` | Bug 修復 | `fix(payment): handle Stripe webhook timeout` |
| `docs` | 文件更新 | `docs(readme): update Phase 1 setup guide` |
| `style` | 代碼格式 (不影響功能) | `style(menu): fix ESLint indentation warnings` |
| `refactor` | 重構 (非新功能或修復) | `refactor(order): extract state machine logic` |
| `perf` | 效能優化 | `perf(db): add index on orders.createdAt` |
| `test` | 測試相關 | `test(auth): add JWT validation unit tests` |
| `chore` | 工具/配置變更 | `chore(ci): add ESLint configuration` |
| `build` | 建置系統 | `build(deps): upgrade drizzle-orm to 0.30.0` |
| `ci` | CI/CD 變更 | `ci(actions): add staging deployment job` |
| `revert` | 還原先前的 commit | `revert: feat(payment): add refund feature` |

### Scope (可選)

常見 Scope:
- `auth` - 認證服務
- `store` - 店家服務
- `menu` - 菜單服務
- `order` - 訂單服務
- `payment` - 支付服務
- `notification` - 通知服務
- `inventory` - 庫存服務
- `db` - 資料庫
- `ci` - CI/CD
- `docs` - 文件

### Subject 主題

- 使用祈使語氣 ("add" 而非 "added")
- 首字母小寫 (除非專有名詞)
- 結尾不加句號
- 限制在 50 個字元以內
- 清楚描述變更內容

### Body 內文 (可選)

- 解釋為什麼做此變更
- 描述修改前與修改後的行為差異
- 於 72 個字元處換行

### Footer 結尾 (可選)

- **破壞性變更 (Breaking Changes)**: `BREAKING CHANGE: <描述>`
- **Issue 連結**: `Closes #123`, `Fixes #456`, `Refs #789`

---

**版本歷史**:
- v1.0 (2025-12-23): 初始版本，定義完整的 Git 工作流程與 CI/CD 整合標準
