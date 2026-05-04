# Git Workflow & CI/CD Development Guide

This document defines the Git branching strategy, workflows, and CI/CD integration standards for the My Online Ordering System project.

---

## Table of Contents

1. [Branch Architecture](#branch-architecture)
2. [Branch Types Explained](#branch-types-explained)
3. [CI/CD Integration](#cicd-integration)
4. [Branch Protection Rules](#branch-protection-rules)
5. [Commit Message Conventions](#commit-message-conventions)

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

**Purpose**: New feature development
**Lifecycle**: Branch from develop, merge back to develop after completion, then delete  
**Naming Examples**:
- `feature/auth-service`
- `feature/menu-crud-api`
- `feature/websocket-notifications`

#### Bug Fix: `fix/<description>`

**Purpose**: Fix bugs in develop branch
**Lifecycle**: Branch from develop, merge back to develop after fix, then delete  
**Naming Examples**:
- `fix/eslint-warnings`
- `fix/redis-cache-invalidation`
- `fix/order-status-transition`

#### Release: `release/v<version>`

**Purpose**: Final preparation before version release
**Lifecycle**: Branch from develop, merge to main and develop after completion, then delete  
**Allowed Changes**:
- ✅ Version number updates (`package.json`, `CHANGELOG.md`)
- ✅ Critical bug fixes
- ✅ Documentation updates
- ❌ No new features

#### Hotfix: `hotfix/<description>`

**Purpose**: Emergency fixes for critical production issues
**Lifecycle**: Branch from main, merge to main and develop after fix, then delete  
**Note**: Only branch type that can be created from main

---

## CI/CD Integration

### Standard GitHub Actions Workflow

Please refer to the actual configuration file: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

The workflow handles automated testing for all branches and auto-deployment for `develop` (staging) and `main` (production).

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

Configure the following rules for both `main` and `develop` branches:

#### Protection Rules Matrix

| Rule | main (Production) | develop (Staging) | Description |
|------|-------------------|-------------------|-------------|
| **Require pull request** | ✅ | ✅ | Prevent direct pushes |
| └─ Approvals required | 1 (minimum) | 0 (optional) | Code review enforcement |
| **Require status checks** | ✅ | ✅ | CI must pass (`lint-and-test`) |
| **Require conversation resolution** | ✅ | ✅ | All comments resolved |
| **Require linear history** | ✅ | ✅ | Squash merging enforced |
| **Require signed commits** | ✅ | - | Security verification |
| **Do not allow bypassing** | ✅ | ✅ | Admins subject to rules |

#### Effect
- ❌ Direct `git push` denied
- ❌ Merging disabled if CI fails
- ✅ Forces "Squash and Merge" strategy

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

---

**Version History**:
- v1.0 (2025-12-23): Initial version, complete Git workflow and CI/CD integration standards defined
