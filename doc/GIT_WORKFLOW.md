# Git Workflow & CI/CD Development Guide

This document defines the Git branching strategy, workflows, and CI/CD integration standards for the My Online Ordering System project.

---

## Table of Contents

1. [Branch Architecture](#branch-architecture)
2. [Branch Types Explained](#branch-types-explained)
3. [Version & Phase Management Strategy](#version--phase-management-strategy)
4. [Complete Workflow Examples](#complete-workflow-examples)
5. [CI/CD Integration](#cicd-integration)
6. [Branch Protection Rules](#branch-protection-rules)
7. [Commit Message Conventions](#commit-message-conventions)
8. [Quick Command Reference](#quick-command-reference)

---

## Branch Architecture

```
main (Production environment, permanent branch)
  └─ develop (Development mainline, permanent branch)
       ├─ feature/inventory-service (Feature branch, temporary)
       ├─ feature/payment-integration (Feature branch, temporary)
       ├─ fix/eslint-warnings (Bugfix branch, temporary)
       └─ release/v0.1.0 (Release branch, temporary)
```

### Branch Naming Conventions

| Branch Type | Naming Format | Example |
|------------|---------------|---------|
| Permanent | `main`, `develop` | - |
| Feature Development | `feature/<description>` | `feature/auth-service` |
| Bug Fix | `fix/<description>` | `fix/database-connection-pool` |
| Release | `release/v<version>` | `release/v0.1.0` |
| Hotfix | `hotfix/<description>` | `hotfix/payment-crash` |

---

## Branch Types Explained

### Permanent Branches (2 total)

#### 1. `main` - Production Environment

- **Purpose**: Production-ready stable code at all times
- **Protection**: Highest level, all changes must go through PR
- **Source**: Only accepts merges from `release/*` or `hotfix/*`
- **Tags**: Every merge gets a Git tag (`v0.1.0`, `v0.2.0`)
- **Deployment**: Auto-deploys to AWS Production environment

#### 2. `develop` - Development Mainline

- **Purpose**: Integration branch for all new features
- **Protection**: High level, all changes must go through PR
- **Source**: Accepts merges from `feature/*`, `fix/*`, `release/*`
- **Characteristics**: All Phase development integrates here
- **Deployment**: Auto-deploys to AWS Staging environment

### Temporary Branches (created as needed)

#### Feature Development: `feature/<description>`

```bash
# Example: Developing Store Service
git checkout develop
git pull origin develop
git checkout -b feature/store-service
# After completion, PR to develop
```

**Purpose**: New feature development  
**Lifecycle**: Branch from develop, merge back to develop after completion, then delete  
**Naming Examples**:
- `feature/auth-service`
- `feature/menu-crud-api`
- `feature/websocket-notifications`

#### Bug Fix: `fix/<description>`

```bash
# Example: Fix database connection pool issue
git checkout develop
git pull origin develop
git checkout -b fix/database-connection-pool
# After fix, PR to develop
```

**Purpose**: Fix bugs in develop branch  
**Lifecycle**: Branch from develop, merge back to develop after fix, then delete  
**Naming Examples**:
- `fix/eslint-warnings`
- `fix/redis-cache-invalidation`
- `fix/order-status-transition`

#### Release: `release/v<version>`

```bash
# Example: Preparing v0.1.0 release
git checkout develop
git pull origin develop
git checkout -b release/v0.1.0
# Test, bug fixes, version updates
# After completion, merge to both main and develop
```

**Purpose**: Final preparation before version release  
**Lifecycle**: Branch from develop, merge to main and develop after completion, then delete  
**Allowed Changes**:
- ✅ Version number updates (`package.json`, `CHANGELOG.md`)
- ✅ Critical bug fixes
- ✅ Documentation updates
- ❌ No new features

#### Hotfix: `hotfix/<description>`

```bash
# Example: Fix production payment system crash
git checkout main
git pull origin main
git checkout -b hotfix/payment-crash
# After fix, merge to both main and develop
```

**Purpose**: Emergency fixes for critical production issues  
**Lifecycle**: Branch from main, merge to main and develop after fix, then delete  
**Note**: Only branch type that can be created from main

---

## Version & Phase Management Strategy

### Recommended Approach: Feature Branch Per Task

For **v0.1.0: MVP (Weeks 1-16)** development:

#### Phase 1: Foundation & Infrastructure (Weeks 1-4)

```bash
git checkout develop
git checkout -b feature/phase1-aws-setup
git checkout -b feature/phase1-database-schema
git checkout -b feature/phase1-cicd-pipeline
```

**Branch-to-Task Mapping**:
- `feature/phase1-aws-setup`: AWS environment setup, RDS creation, SSM configuration
- `feature/phase1-database-schema`: Drizzle ORM schema design and migration
- `feature/phase1-cicd-pipeline`: GitHub Actions workflow configuration

#### Phase 2: Authorization & Store Services (Weeks 5-8)

```bash
git checkout develop
git checkout -b feature/auth-service
git checkout -b feature/store-service
```

**Branch-to-Task Mapping**:
- `feature/auth-service`: Cognito setup, JWT validation, Lambda authorizer
- `feature/store-service`: Store CRUD, business hours management, Redis caching

#### Phase 3: Menu & Order Services (Weeks 9-12)

```bash
git checkout develop
git checkout -b feature/menu-service
git checkout -b feature/order-service
```

**Branch-to-Task Mapping**:
- `feature/menu-service`: Menu CRUD, category management, S3 image upload
- `feature/order-service`: Order creation, state machine, EventBridge integration

#### Phase 4: Payment, Notification & Frontend (Weeks 13-16)

```bash
git checkout develop
git checkout -b feature/payment-service
git checkout -b feature/notification-service
git checkout -b feature/user-client-pwa
git checkout -b feature/merchant-dashboard
```

**Branch-to-Task Mapping**:
- `feature/payment-service`: Stripe integration, webhook handling
- `feature/notification-service`: WebSocket connection management, real-time push
- `feature/user-client-pwa`: React PWA user interface
- `feature/merchant-dashboard`: React merchant backend

### Advantages

- ✅ Each feature developed and tested independently
- ✅ Small, focused PRs, easier code review
- ✅ Enables parallel development (facilitates future collaboration)
- ✅ Clear development history
- ✅ Easy to rollback specific features

### Alternative: Phase Branch (Not Recommended)

If you want to simplify, one branch per Phase:

```bash
git checkout -b phase/v0.1.0-phase1-foundation
git checkout -b phase/v0.1.0-phase2-auth-store
git checkout -b phase/v0.1.0-phase3-menu-order
git checkout -b phase/v0.1.0-phase4-payment-frontend
```

**Disadvantages**:
- ❌ Large PRs, difficult to review
- ❌ Cannot develop features in parallel
- ❌ Higher merge conflict probability
- ❌ Cannot test individual features independently

---

## Complete Workflow Examples

### Scenario 1: Developing v0.1.0 Phase 2 - Authorization Service

#### Step 1: Create Feature Branch

```bash
# 1. Ensure develop is up to date
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/auth-service
```

#### Step 2: Develop Feature

```bash
# Create Lambda function directory structure
mkdir -p services/auth-service/src/handlers

# Develop Cognito setup
# ... write code ...

# Commit frequently (small incremental commits)
git add services/auth-service/cognito-setup.ts
git commit -m "feat(auth): add Cognito user pool setup"

# Implement JWT token validator
# ... write code ...

git add services/auth-service/src/handlers/token-validator.ts
git commit -m "feat(auth): implement JWT token validator"

# Add Lambda authorizer
# ... write code ...

git add services/auth-service/src/handlers/lambda-authorizer.ts
git commit -m "feat(auth): add Lambda authorizer for API Gateway"

# Write tests
# ... write tests ...

git add services/auth-service/__tests__/
git commit -m "test(auth): add unit tests for JWT validation"
```

#### Step 3: Push to Remote

```bash
git push origin feature/auth-service
```

#### Step 4: Open Pull Request on GitHub

1. Navigate to GitHub repository
2. Click "Pull requests" → "New pull request"
3. Configure:
   - **Base**: `develop`
   - **Compare**: `feature/auth-service`
4. Fill in PR information:
   ```markdown
   ## Description
   Implement Authorization Service (Phase 2)
   
   ## Changes
   - ✅ Cognito User Pool setup
   - ✅ JWT token validation logic
   - ✅ Lambda authorizer implementation
   - ✅ Unit test coverage > 85%
   
   ## Testing
   - [x] Local tests passed
   - [x] JWT validation flow tested
   - [x] Cognito Groups permission tested
   
   ## Related Issues
   Closes #12
   ```
5. Click "Create pull request"

#### Step 5: CI/CD Automatic Checks

GitHub Actions automatically runs:
1. ✅ **Lint**: ESLint code style check
2. ✅ **Build**: TypeScript compilation
3. ✅ **Test**: Run unit tests

**If CI fails**:
```bash
# After fixing errors
git add .
git commit -m "fix(auth): resolve ESLint warnings"
git push origin feature/auth-service
# CI will automatically re-run
```

#### Step 6: Code Review (Optional)

If you have team members, wait for code review.  
Solo developers can skip this step.

#### Step 7: Merge Pull Request

1. After CI passes, click "Merge pull request"
2. Select "Squash and merge" (combines multiple commits into one)
3. Confirm commit message:
   ```
   feat(auth): implement Authorization Service (#12)
   
   - Add Cognito user pool setup
   - Implement JWT token validator
   - Add Lambda authorizer
   - Add unit tests (coverage > 85%)
   ```
4. Click "Confirm squash and merge"
5. GitHub prompts "Delete branch", click to delete

#### Step 8: Local Cleanup

```bash
# Switch back to develop
git checkout develop

# Pull latest develop (including just-merged feature)
git pull origin develop

# Delete local feature branch
git branch -d feature/auth-service

# Verify branch is deleted
git branch -a
```

---

### Scenario 2: Releasing v0.1.0

When Phase 1-4 are all completed and merged to develop:

#### Step 1: Create Release Branch

```bash
git checkout develop
git pull origin develop
git checkout -b release/v0.1.0
```

#### Step 2: Update Version and Documentation

```bash
# Update package.json
# Change "version": "0.0.1" to "0.1.0"

# Update CHANGELOG.md
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

#### Step 3: Final Testing and Bug Fixes

```bash
# Run complete tests
pnpm test
pnpm build

# If critical bugs found, fix and commit
git add .
git commit -m "fix(release): resolve payment webhook timeout issue"

# No new features allowed! Only bug fixes
```

#### Step 4: Push Release Branch

```bash
git push origin release/v0.1.0
```

#### Step 5: Open PR to main

1. GitHub → New pull request
2. **Base**: `main` ← **Compare**: `release/v0.1.0`
3. Title: `Release v0.1.0 - MVP`
4. Description:
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
5. Create pull request → Merge (Squash and merge)

#### Step 6: Create Git Tag

```bash
# Switch to main
git checkout main
git pull origin main

# Create annotated tag
git tag -a v0.1.0 -m "Release version 0.1.0 - MVP

Features:
- Core ordering system
- Payment integration
- Real-time notifications
- Merchant dashboard

Tested with 500 concurrent users
Production-ready deployment"

# Push tag to remote
git push origin v0.1.0
```

#### Step 7: Merge Back to develop

```bash
# Keep develop in sync with main
git checkout develop
git pull origin develop
git merge main
git push origin develop
```

#### Step 8: Delete Release Branch

```bash
# Delete locally
git branch -d release/v0.1.0

# Delete remotely
git push origin --delete release/v0.1.0
```

#### Step 9: Deploy to Production

```bash
# GitHub Actions automatically triggers deploy-production job
# Or manually execute deployment script

# Verify deployment
curl https://api.myordering.com/health
# Expected: {"status": "healthy", "version": "0.1.0"}
```

---

### Scenario 3: Emergency Production Fix

#### Situation: Payment system crashes in production

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/payment-crash

# 2. Quick fix
# ... fix code ...

git add services/payment-service
git commit -m "fix(payment): handle null webhook payload"

# 3. Test fix
pnpm test services/payment-service

# 4. Push hotfix
git push origin hotfix/payment-crash

# 5. Open PR to main (urgent, high priority)
# Base: main ← Compare: hotfix/payment-crash

# 6. Merge immediately after CI passes
# 7. Create emergency version tag
git checkout main
git pull origin main
git tag -a v0.1.1 -m "Hotfix: Payment webhook null handling"
git push origin v0.1.1

# 8. Merge back to develop (keep in sync)
git checkout develop
git merge main
git push origin develop

# 9. Delete hotfix branch
git branch -d hotfix/payment-crash
git push origin --delete hotfix/payment-crash
```

---

## CI/CD Integration

### Current GitHub Actions Workflow

Current `.github/workflows/ci.yml`:

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

### Recommended Enhancement: Auto-deployment

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  # Run tests for all branches
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

  # Auto-deploy to Staging only for develop branch
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
          # Deploy Lambda functions
          # Update API Gateway
          # Run database migrations
          echo "Deploying to staging..."
      
      - name: Run smoke tests
        run: |
          # Verify staging environment
          curl https://staging.myordering.com/health

  # Auto-deploy to Production only for main branch
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
          # Deploy Lambda functions
          # Update API Gateway
          # Run database migrations
          echo "Deploying to production..."
      
      - name: Run smoke tests
        run: |
          # Verify production environment
          curl https://myordering.com/health
      
      - name: Notify deployment success
        run: |
          # Send Slack notification or email
          echo "Production deployment successful"
```

### CI/CD Trigger Matrix

| Event | Branch | Jobs Executed |
|-------|--------|---------------|
| Pull Request opened | Any → `main`/`develop` | `lint-and-test` |
| Pull Request updated | Any → `main`/`develop` | `lint-and-test` |
| Push | `develop` | `lint-and-test` + `deploy-staging` |
| Push | `main` | `lint-and-test` + `deploy-production` |
| Pull Request merged | `feature/*` → `develop` | `lint-and-test` + `deploy-staging` |
| Pull Request merged | `release/*` → `main` | `lint-and-test` + `deploy-production` |

### CI/CD Best Practices

1. **Fail Fast**: Stop immediately on lint failure, don't execute subsequent steps
2. **Parallel Execution**: Independent tests can run in parallel for speed
3. **Cache Dependencies**: Use `actions/cache` to cache `node_modules`
4. **Environment Isolation**: Staging and Production use different AWS credentials
5. **Manual Approval**: Add manual approval step before Production deployment (`environment` protection rules)

---

## Branch Protection Rules

### GitHub Repository Settings

**Path**: `Settings` → `Branches` → `Branch protection rules`

### Protect `main` Branch

Click "Add branch protection rule", Branch name pattern: `main`

**Required rules to enable**:
- ✅ **Require a pull request before merging**
  - ✅ Require approvals: 1 (if team exists)
  - ✅ Dismiss stale pull request approvals when new commits are pushed
  - ✅ Require review from Code Owners (optional)
  
- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - Select required checks:
    - `lint-and-test` (CI job name)
  
- ✅ **Require conversation resolution before merging**
  - All PR comments must be resolved before merge
  
- ✅ **Require signed commits** (optional)
  - Ensure commit source is trusted
  
- ✅ **Require linear history**
  - Force squash merge or rebase, maintain clean Git history
  
- ✅ **Do not allow bypassing the above settings**
  - Even repository owner must follow rules
  
- ✅ **Restrict who can push to matching branches**
  - Can set specific people who can push (recommend leaving empty to force everyone through PR)

**Save rule**: Click "Create"

### Protect `develop` Branch

Branch name pattern: `develop`

**Required rules to enable**:
- ✅ **Require a pull request before merging**
- ✅ **Require status checks to pass before merging**
  - Select `lint-and-test`
- ✅ **Require conversation resolution before merging**
- ✅ **Require linear history**

**Note**: `develop` can be less strict than `main`, e.g., no signed commits required

### Branch Protection Effects

**After setup**:
- ❌ Cannot `git push origin main` directly
- ❌ PRs with failing CI cannot be merged (button disabled)
- ❌ Cannot merge with unresolved comments
- ✅ All code must go through PR process
- ✅ Ensures `main` branch is always deployable

---

## Commit Message Conventions

### Conventional Commits Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type Categories

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(auth): add JWT token validation` |
| `fix` | Bug fix | `fix(payment): handle Stripe webhook timeout` |
| `docs` | Documentation update | `docs(readme): update Phase 1 setup guide` |
| `style` | Code formatting (no functional change) | `style(menu): fix ESLint indentation warnings` |
| `refactor` | Refactoring (not a feature or bug fix) | `refactor(order): extract state machine logic` |
| `perf` | Performance optimization | `perf(db): add index on orders.createdAt` |
| `test` | Test-related | `test(auth): add JWT validation unit tests` |
| `chore` | Tooling/configuration changes | `chore(ci): add ESLint configuration` |
| `build` | Build system | `build(deps): upgrade drizzle-orm to 0.30.0` |
| `ci` | CI/CD changes | `ci(actions): add staging deployment job` |
| `revert` | Revert previous commit | `revert: feat(payment): add refund feature` |

### Scope (Optional)

Common scopes:
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

### Subject Line

- Use imperative mood ("add" not "added")
- Don't capitalize first letter (unless proper noun)
- No period at the end
- Limit to 50 characters
- Clearly describe the change

### Body (Optional)

- Explain why the change was made
- Describe previous behavior vs. new behavior
- Wrap at 72 characters

### Footer (Optional)

- **Breaking Changes**: `BREAKING CHANGE: <description>`
- **Issue Links**: `Closes #123`, `Fixes #456`, `Refs #789`

### Complete Examples

```bash
# Simple example
git commit -m "feat(auth): add Cognito user pool setup"

# Detailed example
git commit -m "feat(payment): implement Stripe webhook handler

Add webhook endpoint to handle payment confirmation events.
Implements idempotency using Redis with 24-hour TTL.
Updates order status to PAID on successful payment.

Closes #45"

# Breaking change example
git commit -m "refactor(api): change order status enum values

BREAKING CHANGE: Order status enum values changed from
SNAKE_CASE to UPPER_CASE for consistency with TypeScript
conventions.

Migration guide in docs/MIGRATION.md

Refs #67"

# Bug fix example
git commit -m "fix(inventory): prevent negative stock values

Add validation to ensure stock quantity cannot go below zero.
Returns 400 error with clear message if attempted.

Fixes #89"
```

### Git Commit Hook (Optional)

Use `commitlint` to automatically validate commit message format:

```bash
# Install
pnpm add -D @commitlint/cli @commitlint/config-conventional

# Create commitlint.config.js
echo "module.exports = { extends: ['@commitlint/config-conventional'] };" > commitlint.config.js

# Setup commit-msg hook with husky
pnpm add -D husky
npx husky install
npx husky add .husky/commit-msg 'npx --no-install commitlint --edit "$1"'
```

---

## Quick Command Reference

### Branch Operations

```bash
# List all branches
git branch -a

# List remote branches
git branch -r

# Create and switch to new branch
git checkout -b feature/new-feature

# Switch branches
git checkout develop

# Delete local branch
git branch -d feature/completed-feature

# Force delete local branch (with unmerged commits)
git branch -D feature/abandoned-feature

# Delete remote branch
git push origin --delete feature/completed-feature

# Rename current branch
git branch -m new-branch-name
```

### Sync Operations

```bash
# Update local develop
git checkout develop
git pull origin develop

# Fetch remote changes (without merging)
git fetch origin

# View remote changes
git log origin/develop..HEAD

# Merge remote branch
git merge origin/develop
```

### Start New Feature

```bash
# 1. Ensure develop is up to date
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/your-feature

# 3. Commit regularly during development
git add .
git commit -m "feat(scope): description"

# 4. Push to remote
git push origin feature/your-feature

# 5. Open Pull Request on GitHub
```

### Fix Bug

```bash
# 1. Create fix branch from develop
git checkout develop
git pull origin develop
git checkout -b fix/bug-description

# 2. Fix bug
git add .
git commit -m "fix(scope): description"

# 3. Push and open PR
git push origin fix/bug-description
```

### Release Version

```bash
# 1. Create release branch
git checkout develop
git pull origin develop
git checkout -b release/v0.1.0

# 2. Update version number
# Edit package.json, CHANGELOG.md
git commit -m "chore(release): bump version to 0.1.0"

# 3. Push and open PR to main
git push origin release/v0.1.0

# 4. After merge, create tag
git checkout main
git pull origin main
git tag -a v0.1.0 -m "Release version 0.1.0"
git push origin v0.1.0

# 5. Merge back to develop
git checkout develop
git merge main
git push origin develop

# 6. Delete release branch
git branch -d release/v0.1.0
git push origin --delete release/v0.1.0
```

### Emergency Fix

```bash
# 1. Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug

# 2. Fix and commit
git add .
git commit -m "fix(scope): critical bug description"

# 3. Push and open PR to main
git push origin hotfix/critical-bug

# 4. After merge, create hotfix tag
git checkout main
git pull origin main
git tag -a v0.1.1 -m "Hotfix: critical bug"
git push origin v0.1.1

# 5. Merge back to develop
git checkout develop
git merge main
git push origin develop

# 6. Delete hotfix branch
git branch -d hotfix/critical-bug
git push origin --delete hotfix/critical-bug
```

### View Status and History

```bash
# View working directory status
git status

# View commit history
git log --oneline --graph --all

# View last 10 commits
git log -10 --oneline

# View file change history
git log --follow -- path/to/file.ts

# View branch merge graph
git log --graph --oneline --all --decorate

# View differences between branches
git diff develop..feature/your-feature

# View specific commit changes
git show <commit-hash>
```

### Stash Changes

```bash
# Stash current changes
git stash

# Stash with message
git stash save "WIP: implementing auth feature"

# List stashes
git stash list

# Apply latest stash
git stash pop

# Apply specific stash
git stash apply stash@{0}

# Delete stash
git stash drop stash@{0}

# Clear all stashes
git stash clear
```

### Rebase & Cherry-pick

```bash
# Rebase current branch onto develop (keep history linear)
git checkout feature/your-feature
git rebase develop

# Interactive rebase (clean up commits)
git rebase -i HEAD~3

# Cherry-pick specific commit
git cherry-pick <commit-hash>

# Abort rebase
git rebase --abort

# Continue rebase (after resolving conflicts)
git rebase --continue
```

### Tag Management

```bash
# List all tags
git tag

# Create lightweight tag
git tag v0.1.0

# Create annotated tag (recommended)
git tag -a v0.1.0 -m "Release version 0.1.0"

# Push tag to remote
git push origin v0.1.0

# Push all tags
git push origin --tags

# Delete local tag
git tag -d v0.1.0

# Delete remote tag
git push origin --delete v0.1.0

# View tag details
git show v0.1.0
```

---

## Summary: Key Principles

### ✅ DO (Should Do)

1. **All changes through PR**
   - Even for solo development, open PRs
   - Build good habits for future collaboration

2. **Small, focused commits**
   - One commit does one thing
   - Easy to review, easy to rollback

3. **Clear commit messages**
   - Follow Conventional Commits format
   - Future you will thank present you

4. **Sync develop regularly**
   - `git pull origin develop` before starting work each day
   - Avoid large-scale merge conflicts

5. **Merge only when CI passes**
   - Green ✅ means ready to merge
   - Red ❌ must be fixed

6. **Delete branches after merge**
   - Keep repository clean
   - Avoid confusion

### ❌ DON'T (Should Not Do)

1. **Direct push to main**
   - Never `git push origin main`
   - Use branch protection to enforce PR workflow

2. **Add features in release branch**
   - Release only fixes bugs, no new features
   - New features go to develop

3. **Long-lived feature branches**
   - Feature branches older than 2 weeks prone to conflicts
   - Consider splitting into smaller features

4. **Ignore CI failures**
   - Don't ignore red CI status
   - Fix immediately or revert

5. **Vague commit messages**
   - ❌ `git commit -m "fix"`
   - ❌ `git commit -m "update"`
   - ✅ `git commit -m "fix(payment): handle webhook timeout"`

6. **Force push to shared branches**
   - Don't `git push -f origin develop`
   - Only use `--force-with-lease` on your own feature branches

---

## Further Reading

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Semantic Versioning](https://semver.org/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

**Version History**:
- v1.0 (2025-12-23): Initial version, complete Git workflow and CI/CD integration standards defined
