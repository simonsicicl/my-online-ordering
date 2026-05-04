# git.spec.md — Source: [../GIT_WORKFLOW.md](../GIT_WORKFLOW.md)

## Branch Naming

| Type | Format | Example |
| --- | --- | --- |
| Permanent | `main`, `develop` | — |
| Feature | `feature/<desc>` | `feature/auth-service` |
| Bug fix | `fix/<desc>` | `fix/redis-cache-invalidation` |
| Release | `release/v<ver>` | `release/v0.2.0` |
| Hotfix | `hotfix/<desc>` | `hotfix/payment-crash` |

## Branch Rules

| Branch | Source | Merges into | Auto-deploy |
| --- | --- | --- | --- |
| `main` | `release/*`, `hotfix/*` | — | Production |
| `develop` | `feature/*`, `fix/*`, `release/*` | — | Staging |
| `feature/*` | `develop` | `develop` | — |
| `fix/*` | `develop` | `develop` | — |
| `release/*` | `develop` | `main` + `develop` | — |
| `hotfix/*` | `main` | `main` + `develop` | — |

- `release/*` allows: version bump, critical fixes, docs. ❌ No new features.
- `hotfix/*` is the **only** branch type cut from `main`.

## CI/CD Trigger Matrix

| Event | Branch | Jobs |
| --- | --- | --- |
| PR opened / updated | any → `main`/`develop` | `lint-and-test` |
| Push | `develop` | `lint-and-test` + `deploy-staging` |
| Push | `main` | `lint-and-test` + `deploy-production` |
| PR merged | `feature/*` → `develop` | `lint-and-test` + `deploy-staging` |
| PR merged | `release/*` → `main` | `lint-and-test` + `deploy-production` |

## Branch Protection (`main` / `develop`)

- PR required — no direct push
- `lint-and-test` must pass before merge
- All review conversations must be resolved
- Squash and Merge enforced (linear history)
- `main` only: 1 approval required + signed commits

## Commit Format (Conventional Commits)

```
<type>(<scope>): <subject>   ← max 50 chars, imperative, no period

[body — 72 char wrap, explain why]

[footer: BREAKING CHANGE: … | Closes #<n>]
```

### Types

| Type | Use |
| --- | --- |
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Docs only |
| `style` | Formatting, no logic change |
| `refactor` | Restructure, not feat/fix |
| `perf` | Performance |
| `test` | Tests |
| `chore` | Tooling / config |
| `build` | Build system / deps |
| `ci` | CI/CD pipeline |
| `revert` | Revert a commit |

### Common Scopes

`auth` · `store` · `menu` · `order` · `payment` · `inventory` · `notification` · `db` · `ci` · `docs`
