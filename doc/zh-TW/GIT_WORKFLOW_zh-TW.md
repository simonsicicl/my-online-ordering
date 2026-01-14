# Git Workflow & CI/CD 開發指南

本文件定義 My Online Ordering System 專案的 Git 分支策略、工作流程與 CI/CD 整合規範。

---

## 目錄

1. [分支架構](#分支架構)
2. [分支類型說明](#分支類型說明)
3. [Version & Phase 管理策略](#version--phase-管理策略)
4. [完整工作流程範例](#完整工作流程範例)
5. [CI/CD 整合](#cicd-整合)
6. [分支保護規則](#分支保護規則)
7. [Commit Message 規範](#commit-message-規範)
8. [常用指令快速參考](#常用指令快速參考)

---

## 分支架構

```
main (生產環境，永久分支)
  └─ develop (開發主線，永久分支)
       ├─ feature/inventory-service (功能分支，臨時)
       ├─ feature/payment-integration (功能分支，臨時)
       ├─ fix/eslint-warnings (修復分支，臨時)
       └─ release/v0.1.0 (版本發布分支，臨時)
```

### 分支命名規則

| 分支類型 | 命名格式 | 範例 |
|---------|---------|------|
| 永久分支 | `main`, `develop` | - |
| 功能開發 | `feature/<描述>` | `feature/auth-service` |
| Bug 修復 | `fix/<描述>` | `fix/database-connection-pool` |
| 版本發布 | `release/v<版本號>` | `release/v0.1.0` |
| 緊急修復 | `hotfix/<描述>` | `hotfix/payment-crash` |

---

## 分支類型說明

### 永久分支（2個）

#### 1. `main` - 生產環境

- **用途**: 隨時可部署的穩定程式碼
- **保護**: 最高級別，所有變更必須透過 PR
- **來源**: 只接受來自 `release/*` 或 `hotfix/*` 的合併
- **標籤**: 每次合併都打 Git tag（`v0.1.0`, `v0.2.0`）
- **部署**: 自動部署到 AWS Production 環境

#### 2. `develop` - 開發主線

- **用途**: 所有新功能的整合分支
- **保護**: 高級別，所有變更必須透過 PR
- **來源**: 接受來自 `feature/*`, `fix/*`, `release/*` 的合併
- **特點**: Phase 開發都在這裡進行整合
- **部署**: 自動部署到 AWS Staging 環境

### 臨時分支（依需求建立）

#### 功能開發：`feature/<描述>`

```bash
# 範例：開發 Store Service
git checkout develop
git pull origin develop
git checkout -b feature/store-service
# 開發完成後 PR 到 develop
```

**用途**: 新功能開發  
**生命週期**: 從 develop 分出，開發完成後合併回 develop，然後刪除  
**命名範例**:
- `feature/auth-service`
- `feature/menu-crud-api`
- `feature/websocket-notifications`

#### Bug 修復：`fix/<描述>`

```bash
# 範例：修復資料庫連線池問題
git checkout develop
git pull origin develop
git checkout -b fix/database-connection-pool
# 修復後 PR 到 develop
```

**用途**: 修復 develop 分支的 bug  
**生命週期**: 從 develop 分出，修復完成後合併回 develop，然後刪除  
**命名範例**:
- `fix/eslint-warnings`
- `fix/redis-cache-invalidation`
- `fix/order-status-transition`

#### 版本發布：`release/v<版本號>`

```bash
# 範例：準備發布 v0.1.0
git checkout develop
git pull origin develop
git checkout -b release/v0.1.0
# 測試、bug 修復、版本號更新
# 完成後合併到 main 和 develop
```

**用途**: 版本發布前的最後準備  
**生命週期**: 從 develop 分出，完成後合併到 main 和 develop，然後刪除  
**允許變更**:
- ✅ 版本號更新（`package.json`, `CHANGELOG.md`）
- ✅ 關鍵 bug 修復
- ✅ 文件更新
- ❌ 不允許新功能

#### 緊急修復：`hotfix/<描述>`

```bash
# 範例：修復生產環境支付系統崩潰
git checkout main
git pull origin main
git checkout -b hotfix/payment-crash
# 修復後合併到 main 和 develop
```

**用途**: 緊急修復生產環境的嚴重問題  
**生命週期**: 從 main 分出，修復完成後合併到 main 和 develop，然後刪除  
**特點**: 唯一可以從 main 分支建立的分支

---

## Version & Phase 管理策略

### 推薦方案：Feature Branch Per Task

針對 **v0.1.0: MVP (Weeks 1-16)** 的開發：

#### Phase 1: Foundation & Infrastructure (Weeks 1-4)

```bash
git checkout develop
git checkout -b feature/phase1-aws-setup
git checkout -b feature/phase1-database-schema
git checkout -b feature/phase1-cicd-pipeline
```

**分支對應任務**:
- `feature/phase1-aws-setup`: AWS 環境設置、RDS 建立、SSM 配置
- `feature/phase1-database-schema`: Drizzle ORM schema 設計與 migration
- `feature/phase1-cicd-pipeline`: GitHub Actions workflow 設定

#### Phase 2: Authorization & Store Services (Weeks 5-8)

```bash
git checkout develop
git checkout -b feature/auth-service
git checkout -b feature/store-service
```

**分支對應任務**:
- `feature/auth-service`: Cognito 設定、JWT 驗證、Lambda authorizer
- `feature/store-service`: Store CRUD、營業時間管理、Redis 快取

#### Phase 3: Menu & Order Services (Weeks 9-12)

```bash
git checkout develop
git checkout -b feature/menu-service
git checkout -b feature/order-service
```

**分支對應任務**:
- `feature/menu-service`: Menu CRUD、分類管理、S3 圖片上傳
- `feature/order-service`: 訂單建立、狀態機、EventBridge 整合

#### Phase 4: Payment, Notification & Frontend (Weeks 13-16)

```bash
git checkout develop
git checkout -b feature/payment-service
git checkout -b feature/notification-service
git checkout -b feature/user-client-pwa
git checkout -b feature/merchant-dashboard
```

**分支對應任務**:
- `feature/payment-service`: Stripe 整合、webhook 處理
- `feature/notification-service`: WebSocket 連線管理、即時推送
- `feature/user-client-pwa`: React PWA 使用者介面
- `feature/merchant-dashboard`: React 商家後台

### 優點

- ✅ 每個 feature 獨立開發、獨立測試
- ✅ PR 小而專注，容易 code review
- ✅ 可以並行開發（方便未來協作）
- ✅ 清晰的開發歷史記錄
- ✅ 容易回滾特定功能

### 替代方案：Phase Branch（不推薦）

如果想簡化，可以每個 Phase 一個分支：

```bash
git checkout -b phase/v0.1.0-phase1-foundation
git checkout -b phase/v0.1.0-phase2-auth-store
git checkout -b phase/v0.1.0-phase3-menu-order
git checkout -b phase/v0.1.0-phase4-payment-frontend
```

**缺點**:
- ❌ PR 會很大，難以 review
- ❌ 無法並行開發不同功能
- ❌ 合併衝突機率高
- ❌ 無法獨立測試單一功能

---

## 完整工作流程範例

### 場景 1: 開發 v0.1.0 Phase 2 - Authorization Service

#### 步驟 1: 建立 Feature Branch

```bash
# 1. 確保 develop 是最新的
git checkout develop
git pull origin develop

# 2. 建立 feature branch
git checkout -b feature/auth-service
```

#### 步驟 2: 開發功能

```bash
# 建立 Lambda 函式目錄結構
mkdir -p services/auth-service/src/handlers

# 開發 Cognito setup
# ... 寫程式 ...

# 定期 commit（小步快跑）
git add services/auth-service/cognito-setup.ts
git commit -m "feat(auth): add Cognito user pool setup"

# 實作 JWT token validator
# ... 寫程式 ...

git add services/auth-service/src/handlers/token-validator.ts
git commit -m "feat(auth): implement JWT token validator"

# 新增 Lambda authorizer
# ... 寫程式 ...

git add services/auth-service/src/handlers/lambda-authorizer.ts
git commit -m "feat(auth): add Lambda authorizer for API Gateway"

# 撰寫測試
# ... 寫測試 ...

git add services/auth-service/__tests__/
git commit -m "test(auth): add unit tests for JWT validation"
```

#### 步驟 3: Push 到遠端

```bash
git push origin feature/auth-service
```

#### 步驟 4: 在 GitHub 開 Pull Request

1. 前往 GitHub repository
2. 點擊「Pull requests」→「New pull request」
3. 設定：
   - **Base**: `develop`
   - **Compare**: `feature/auth-service`
4. 填寫 PR 資訊：
   ```markdown
   ## Description
   實作 Authorization Service (Phase 2)
   
   ## Changes
   - ✅ Cognito User Pool 設定
   - ✅ JWT token 驗證邏輯
   - ✅ Lambda authorizer 實作
   - ✅ 單元測試覆蓋率 > 85%
   
   ## Testing
   - [x] 本地測試通過
   - [x] JWT 驗證流程測試
   - [x] Cognito Groups 權限測試
   
   ## Related Issues
   Closes #12
   ```
5. 點擊「Create pull request」

#### 步驟 5: CI/CD 自動檢查

GitHub Actions 自動執行：
1. ✅ **Lint**: ESLint 檢查程式碼風格
2. ✅ **Build**: TypeScript 編譯
3. ✅ **Test**: 執行單元測試

**如果 CI 失敗**:
```bash
# 修正錯誤後
git add .
git commit -m "fix(auth): resolve ESLint warnings"
git push origin feature/auth-service
# CI 會自動重新執行
```

#### 步驟 6: Code Review（可選）

如果有團隊成員，等待 code review。  
Solo 開發可跳過此步驟。

#### 步驟 7: Merge Pull Request

1. CI 通過後，點擊「Merge pull request」
2. 選擇「Squash and merge」（將多個 commit 合併為一個）
3. 確認 commit message：
   ```
   feat(auth): implement Authorization Service (#12)
   
   - Add Cognito user pool setup
   - Implement JWT token validator
   - Add Lambda authorizer
   - Add unit tests (coverage > 85%)
   ```
4. 點擊「Confirm squash and merge」
5. GitHub 自動提示「Delete branch」，點擊刪除

#### 步驟 8: 本地清理

```bash
# 切回 develop
git checkout develop

# 拉取最新的 develop（包含剛合併的 feature）
git pull origin develop

# 刪除本地 feature branch
git branch -d feature/auth-service

# 確認分支已刪除
git branch -a
```

---

### 場景 2: 發布 v0.1.0 版本

當 Phase 1-4 都完成並合併到 develop 後：

#### 步驟 1: 建立 Release Branch

```bash
git checkout develop
git pull origin develop
git checkout -b release/v0.1.0
```

#### 步驟 2: 更新版本號與文件

```bash
# 更新 package.json
# 將 "version": "0.0.1" 改為 "0.1.0"

# 更新 CHANGELOG.md
cat >> CHANGELOG.md << EOF

## [0.1.0] - 2025-12-23

### Added
- Authorization Service (Cognito + JWT)
- Store Service (CRUD + Redis cache)
- Menu Service (CRUD + S3 image upload)
- Order Service (State machine + EventBridge)
- Payment Service (Stripe integration)
- Notification Service (WebSocket)
- User Client PWA (React 18)
- Merchant Dashboard (React 18)

### Infrastructure
- AWS Lambda + API Gateway setup
- RDS PostgreSQL (db.t3.micro)
- ElastiCache Redis
- S3 + CloudFront
- CI/CD pipeline (GitHub Actions)
EOF

git add package.json CHANGELOG.md
git commit -m "chore(release): bump version to 0.1.0"
```

#### 步驟 3: 最後測試與 Bug 修復

```bash
# 執行完整測試
pnpm test
pnpm build

# 如果發現關鍵 bug，修復後 commit
git add .
git commit -m "fix(release): resolve payment webhook timeout issue"

# 不允許新增功能！只修 bug
```

#### 步驟 4: Push Release Branch

```bash
git push origin release/v0.1.0
```

#### 步驟 5: 開 PR 到 main

1. GitHub → New pull request
2. **Base**: `main` ← **Compare**: `release/v0.1.0`
3. 標題：`Release v0.1.0 - MVP`
4. 描述：
   ```markdown
   ## Version 0.1.0 - MVP Release
   
   ### Features Delivered
   - ✅ Phase 1: Foundation & Infrastructure
   - ✅ Phase 2: Authorization & Store Services
   - ✅ Phase 3: Menu & Order Services
   - ✅ Phase 4: Payment, Notification & Frontend
   
   ### Testing Results
   - Load test: 500 concurrent users ✅
   - Unit test coverage: 87% ✅
   - Integration tests: All passed ✅
   
   ### Deployment Plan
   - Deploy to production: 2025-12-24 09:00 UTC
   - Rollback plan: Available
   ```
5. Create pull request → Merge（Squash and merge）

#### 步驟 6: 打 Git Tag

```bash
# 切到 main
git checkout main
git pull origin main

# 建立 annotated tag
git tag -a v0.1.0 -m "Release version 0.1.0 - MVP

Features:
- Core ordering system
- Payment integration
- Real-time notifications
- Merchant dashboard

Tested with 500 concurrent users
Production-ready deployment"

# Push tag 到遠端
git push origin v0.1.0
```

#### 步驟 7: 合併回 develop

```bash
# 保持 develop 與 main 同步
git checkout develop
git pull origin develop
git merge main
git push origin develop
```

#### 步驟 8: 刪除 Release Branch

```bash
# 本地刪除
git branch -d release/v0.1.0

# 遠端刪除
git push origin --delete release/v0.1.0
```

#### 步驟 9: 部署到生產環境

```bash
# GitHub Actions 自動觸發 deploy-production job
# 或手動執行部署腳本

# 驗證部署
curl https://api.myordering.com/health
# Expected: {"status": "healthy", "version": "0.1.0"}
```

---

### 場景 3: 緊急修復生產環境問題

#### 假設：支付系統在生產環境崩潰

```bash
# 1. 從 main 建立 hotfix branch
git checkout main
git pull origin main
git checkout -b hotfix/payment-crash

# 2. 快速修復問題
# ... 修正程式碼 ...

git add services/payment-service
git commit -m "fix(payment): handle null webhook payload"

# 3. 測試修復
pnpm test services/payment-service

# 4. Push hotfix
git push origin hotfix/payment-crash

# 5. 開 PR 到 main（緊急，優先處理）
# Base: main ← Compare: hotfix/payment-crash

# 6. CI 通過後立即合併
# 7. 打緊急版本 tag
git checkout main
git pull origin main
git tag -a v0.1.1 -m "Hotfix: Payment webhook null handling"
git push origin v0.1.1

# 8. 合併回 develop（保持同步）
git checkout develop
git merge main
git push origin develop

# 9. 刪除 hotfix branch
git branch -d hotfix/payment-crash
git push origin --delete hotfix/payment-crash
```

---

## CI/CD 整合

### GitHub Actions Workflow 配置

當前 `.github/workflows/ci.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Lint
        run: pnpm lint
      
      - name: Build
        run: pnpm build
      
      - name: Test
        run: pnpm test
```

### 建議增強：自動部署

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  # 所有分支都執行測試
  lint-and-test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Lint
        run: pnpm lint
      
      - name: Build
        run: pnpm build
      
      - name: Test
        run: pnpm test
      
      - name: Generate coverage report
        run: pnpm test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  # 只有 develop 分支自動部署到 Staging
  deploy-staging:
    if: github.ref == 'refs/heads/develop' && github.event_name == 'push'
    needs: lint-and-test
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.myordering.com
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Deploy to AWS Lambda (Staging)
        run: |
          # 部署 Lambda functions
          # 更新 API Gateway
          # 執行資料庫 migration
          echo "Deploying to staging..."
      
      - name: Run smoke tests
        run: |
          # 驗證 staging 環境
          curl https://staging.myordering.com/health

  # 只有 main 分支自動部署到 Production
  deploy-production:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    needs: lint-and-test
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://myordering.com
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID_PROD }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY_PROD }}
          aws-region: us-east-1
      
      - name: Deploy to AWS Lambda (Production)
        run: |
          # 部署 Lambda functions
          # 更新 API Gateway
          # 執行資料庫 migration
          echo "Deploying to production..."
      
      - name: Run smoke tests
        run: |
          # 驗證 production 環境
          curl https://myordering.com/health
      
      - name: Notify deployment success
        run: |
          # 發送 Slack 通知或 email
          echo "Production deployment successful"
```

### CI/CD 觸發時機

| 事件 | 分支 | 執行 Jobs |
|-----|------|----------|
| Pull Request 開啟 | 任何 → `main`/`develop` | `lint-and-test` |
| Pull Request 更新 | 任何 → `main`/`develop` | `lint-and-test` |
| Push | `develop` | `lint-and-test` + `deploy-staging` |
| Push | `main` | `lint-and-test` + `deploy-production` |
| Pull Request 合併 | `feature/*` → `develop` | `lint-and-test` + `deploy-staging` |
| Pull Request 合併 | `release/*` → `main` | `lint-and-test` + `deploy-production` |

### CI/CD 最佳實踐

1. **快速失敗**: Lint 失敗立即停止，不執行後續步驟
2. **並行執行**: 獨立的測試可以並行加速
3. **快取依賴**: 使用 `actions/cache` 快取 `node_modules`
4. **環境隔離**: Staging 和 Production 使用不同的 AWS credentials
5. **手動批准**: Production 部署前可加入手動批准步驟（`environment` protection rules）

---

## 分支保護規則

### GitHub Repository Settings 設定

**路徑**: `Settings` → `Branches` → `Branch protection rules`

### 保護 `main` 分支

點擊「Add branch protection rule」，Branch name pattern: `main`

**必須啟用的規則**:
- ✅ **Require a pull request before merging**
  - ✅ Require approvals: 1（如果有團隊）
  - ✅ Dismiss stale pull request approvals when new commits are pushed
  - ✅ Require review from Code Owners（可選）
  
- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - 選擇必須通過的 checks:
    - `lint-and-test` (CI job 名稱)
  
- ✅ **Require conversation resolution before merging**
  - 所有 PR comments 必須 resolve 才能合併
  
- ✅ **Require signed commits**（可選）
  - 確保 commit 來源可信
  
- ✅ **Require linear history**
  - 強制使用 squash merge 或 rebase，保持乾淨的 Git history
  
- ✅ **Do not allow bypassing the above settings**
  - 連 repository owner 也必須遵守規則
  
- ✅ **Restrict who can push to matching branches**
  - 可設定只有特定人員可以 push（建議空白，強制所有人透過 PR）

**儲存規則**: 點擊「Create」

### 保護 `develop` 分支

Branch name pattern: `develop`

**必須啟用的規則**:
- ✅ **Require a pull request before merging**
- ✅ **Require status checks to pass before merging**
  - 選擇 `lint-and-test`
- ✅ **Require conversation resolution before merging**
- ✅ **Require linear history**

**注意**: `develop` 可以比 `main` 寬鬆，例如不需要簽署 commit

### 分支保護效果

**設定後**:
- ❌ 無法直接 `git push origin main`
- ❌ CI 沒通過的 PR 無法合併（按鈕會 disabled）
- ❌ 有未解決的 comments 時無法合併
- ✅ 所有程式碼必須經過 PR 流程
- ✅ 確保 `main` 分支隨時可部署

---

## Commit Message 規範

### Conventional Commits 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 類型

| Type | 說明 | 範例 |
|------|-----|------|
| `feat` | 新功能 | `feat(auth): add JWT token validation` |
| `fix` | Bug 修復 | `fix(payment): handle Stripe webhook timeout` |
| `docs` | 文件更新 | `docs(readme): update Phase 1 setup guide` |
| `style` | 程式碼格式（不影響功能） | `style(menu): fix ESLint indentation warnings` |
| `refactor` | 重構（不是新功能或修 bug） | `refactor(order): extract state machine logic` |
| `perf` | 效能優化 | `perf(db): add index on orders.createdAt` |
| `test` | 測試相關 | `test(auth): add JWT validation unit tests` |
| `chore` | 工具/設定變更 | `chore(ci): add ESLint configuration` |
| `build` | 建置系統 | `build(deps): upgrade drizzle-orm to 0.30.0` |
| `ci` | CI/CD 變更 | `ci(actions): add staging deployment job` |
| `revert` | 回復先前的 commit | `revert: feat(payment): add refund feature` |

### Scope 範圍（可選）

常用的 scope:
- `auth` - Authorization Service
- `store` - Store Service
- `menu` - Menu Service
- `order` - Order Service
- `payment` - Payment Service
- `notification` - Notification Service
- `inventory` - Inventory Service
- `db` - Database
- `ci` - CI/CD
- `docs` - Documentation

### Subject 主旨

- 使用祈使句（"add" 而非 "added"）
- 不要大寫開頭（除非是專有名詞）
- 不要結尾加句號
- 限制在 50 字元內
- 清楚描述改變的內容

### Body 內文（可選）

- 詳細說明為什麼做這個變更
- 說明之前的行為與現在的差異
- 72 字元換行

### Footer 頁腳（可選）

- **Breaking Changes**: `BREAKING CHANGE: <description>`
- **Issue 關聯**: `Closes #123`, `Fixes #456`, `Refs #789`

### 完整範例

```bash
# 簡單範例
git commit -m "feat(auth): add Cognito user pool setup"

# 詳細範例
git commit -m "feat(payment): implement Stripe webhook handler

Add webhook endpoint to handle payment confirmation events.
Implements idempotency using Redis with 24-hour TTL.
Updates order status to PAID on successful payment.

Closes #45"

# Breaking change 範例
git commit -m "refactor(api): change order status enum values

BREAKING CHANGE: Order status enum values changed from
SNAKE_CASE to UPPER_CASE for consistency with TypeScript
conventions.

Migration guide in docs/MIGRATION.md

Refs #67"

# 修復 bug 範例
git commit -m "fix(inventory): prevent negative stock values

Add validation to ensure stock quantity cannot go below zero.
Returns 400 error with clear message if attempted.

Fixes #89"
```

### Git Commit Hook（可選）

使用 `commitlint` 自動驗證 commit message 格式：

```bash
# 安裝
pnpm add -D @commitlint/cli @commitlint/config-conventional

# 建立 commitlint.config.js
echo "module.exports = { extends: ['@commitlint/config-conventional'] };" > commitlint.config.js

# 使用 husky 設定 commit-msg hook
pnpm add -D husky
npx husky install
npx husky add .husky/commit-msg 'npx --no-install commitlint --edit "$1"'
```

---

## 常用指令快速參考

### 分支操作

```bash
# 查看所有分支
git branch -a

# 查看遠端分支
git branch -r

# 建立並切換到新分支
git checkout -b feature/new-feature

# 切換分支
git checkout develop

# 刪除本地分支
git branch -d feature/completed-feature

# 強制刪除本地分支（有未合併的 commit）
git branch -D feature/abandoned-feature

# 刪除遠端分支
git push origin --delete feature/completed-feature

# 重新命名當前分支
git branch -m new-branch-name
```

### 同步操作

```bash
# 更新本地 develop
git checkout develop
git pull origin develop

# Fetch 遠端變更（不合併）
git fetch origin

# 查看遠端變更
git log origin/develop..HEAD

# 合併遠端分支
git merge origin/develop
```

### 開始新功能

```bash
# 1. 確保 develop 最新
git checkout develop
git pull origin develop

# 2. 建立 feature branch
git checkout -b feature/your-feature

# 3. 開發過程中定期 commit
git add .
git commit -m "feat(scope): description"

# 4. Push 到遠端
git push origin feature/your-feature

# 5. 在 GitHub 開 Pull Request
```

### 修復 Bug

```bash
# 1. 從 develop 建立 fix branch
git checkout develop
git pull origin develop
git checkout -b fix/bug-description

# 2. 修復 bug
git add .
git commit -m "fix(scope): description"

# 3. Push 並開 PR
git push origin fix/bug-description
```

### 發布版本

```bash
# 1. 建立 release branch
git checkout develop
git pull origin develop
git checkout -b release/v0.1.0

# 2. 更新版本號
# 編輯 package.json, CHANGELOG.md
git commit -m "chore(release): bump version to 0.1.0"

# 3. Push 並開 PR 到 main
git push origin release/v0.1.0

# 4. Merge 後打 tag
git checkout main
git pull origin main
git tag -a v0.1.0 -m "Release version 0.1.0"
git push origin v0.1.0

# 5. 合併回 develop
git checkout develop
git merge main
git push origin develop

# 6. 刪除 release branch
git branch -d release/v0.1.0
git push origin --delete release/v0.1.0
```

### 緊急修復

```bash
# 1. 從 main 建立 hotfix
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug

# 2. 修復並 commit
git add .
git commit -m "fix(scope): critical bug description"

# 3. Push 並開 PR 到 main
git push origin hotfix/critical-bug

# 4. Merge 後打 hotfix tag
git checkout main
git pull origin main
git tag -a v0.1.1 -m "Hotfix: critical bug"
git push origin v0.1.1

# 5. 合併回 develop
git checkout develop
git merge main
git push origin develop

# 6. 刪除 hotfix branch
git branch -d hotfix/critical-bug
git push origin --delete hotfix/critical-bug
```

### 查看狀態與歷史

```bash
# 查看工作區狀態
git status

# 查看 commit 歷史
git log --oneline --graph --all

# 查看最近 10 個 commit
git log -10 --oneline

# 查看特定檔案的變更歷史
git log --follow -- path/to/file.ts

# 查看分支合併圖
git log --graph --oneline --all --decorate

# 查看兩個分支的差異
git diff develop..feature/your-feature

# 查看特定 commit 的變更
git show <commit-hash>
```

### Stash 暫存變更

```bash
# 暫存當前變更
git stash

# 暫存並加上訊息
git stash save "WIP: implementing auth feature"

# 查看 stash 列表
git stash list

# 恢復最新的 stash
git stash pop

# 恢復特定 stash
git stash apply stash@{0}

# 刪除 stash
git stash drop stash@{0}

# 清空所有 stash
git stash clear
```

### Rebase 與 Cherry-pick

```bash
# Rebase 當前分支到 develop（保持 history 線性）
git checkout feature/your-feature
git rebase develop

# 互動式 rebase（整理 commit）
git rebase -i HEAD~3

# Cherry-pick 特定 commit
git cherry-pick <commit-hash>

# 終止 rebase
git rebase --abort

# 繼續 rebase（解決衝突後）
git rebase --continue
```

### Tag 管理

```bash
# 列出所有 tag
git tag

# 建立 lightweight tag
git tag v0.1.0

# 建立 annotated tag（推薦）
git tag -a v0.1.0 -m "Release version 0.1.0"

# Push tag 到遠端
git push origin v0.1.0

# Push 所有 tag
git push origin --tags

# 刪除本地 tag
git tag -d v0.1.0

# 刪除遠端 tag
git push origin --delete v0.1.0

# 查看 tag 詳細資訊
git show v0.1.0
```

---

## 總結：關鍵原則

### ✅ DO（應該做）

1. **所有變更透過 PR**
   - 即使是 solo 開發，也要開 PR
   - 養成良好習慣，方便未來協作

2. **小而專注的 commit**
   - 一個 commit 做一件事
   - 容易 review、容易回滾

3. **清楚的 commit message**
   - 遵循 Conventional Commits 格式
   - 未來你會感謝現在的自己

4. **定期同步 develop**
   - 每天開始工作前 `git pull origin develop`
   - 避免大規模合併衝突

5. **CI 通過才合併**
   - 綠色的 ✅ 才點 Merge
   - 紅色的 ❌ 必須修正

6. **合併後刪除分支**
   - 保持 repository 乾淨
   - 避免混淆

### ❌ DON'T（不應該做）

1. **直接 push 到 main**
   - 永遠不要 `git push origin main`
   - 使用 branch protection 強制 PR 流程

2. **在 release branch 加新功能**
   - Release 只修 bug，不加功能
   - 新功能要回 develop

3. **長期不合併的 feature branch**
   - 超過 2 週的 feature branch 容易衝突
   - 考慮拆分成更小的 feature

4. **忽略 CI 失敗**
   - CI 紅色不要視而不見
   - 立即修正或 revert

5. **模糊的 commit message**
   - ❌ `git commit -m "fix"`
   - ❌ `git commit -m "update"`
   - ✅ `git commit -m "fix(payment): handle webhook timeout"`

6. **強制 push 到共享分支**
   - 不要 `git push -f origin develop`
   - 只在自己的 feature branch 使用 `--force-with-lease`

---

## 延伸閱讀

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Semantic Versioning](https://semver.org/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

**版本歷史**:
- v1.0 (2025-12-23): 初始版本，定義完整 Git workflow 與 CI/CD 整合規範
