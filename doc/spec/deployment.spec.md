# Deployment Spec — My Online Ordering System

> Defines the complete, repeatable deployment process for any AWS account.
> Follow this spec when setting up a new account or re-deploying from scratch.
> All infrastructure is code — no manual console clicks required after Step 1.

---

## Guiding Principle

**Everything must be reproducible from a fresh AWS account.**  
Manual console operations are forbidden except for the one-time IAM bootstrap in Step 1.  
All other operations are scripted so switching accounts = run scripts in order.

---

## Prerequisites (Local Machine)

```text
Node.js 20.x
AWS CLI v2           (aws --version)
AWS SAM CLI          (sam --version)
Docker Desktop       (required for sam build)
Git
```

---

## Deployment Order (Critical — Do Not Skip Steps)

```text
Step 1: AWS Account Bootstrap (one-time, manual)
Step 2: GitHub Secrets Setup (one-time, manual)
Step 3: Foundation Stack Deploy (RDS, Redis, Cognito, EventBridge, CloudFront)
Step 4: SSM Parameters Bootstrap
Step 5: DB Migration
Step 6: Services Deploy (each service's SAM stack)
Step 7: Verify
Step 8: Frontend Deploy (build + S3 sync + CloudFront invalidation)
```

---

## Step 1: AWS Account Bootstrap (One-Time Manual)

> This is the ONLY step that cannot be scripted. Do it in the AWS Console.

1. Create AWS account / log in as root
2. Create an IAM user `deployer` with **AdministratorAccess** policy
3. Generate Access Key for `deployer`
4. Configure local AWS CLI:

    ```powershell
    aws configure --profile myordering-dev
    # AWS Access Key ID: <from step 3>
    # AWS Secret Access Key: <from step 3>
    # Default region: us-east-1
    # Default output format: json
    ```

5. Verify: `aws sts get-caller-identity --profile myordering-dev`

---

## Step 2: GitHub Secrets Setup (One-Time Manual)

> Set these in GitHub → Repository → Settings → Secrets and variables → Actions

| Secret Name | Value |
| --- | --- |
| `AWS_ACCESS_KEY_ID` | IAM deployer user access key |
| `AWS_SECRET_ACCESS_KEY` | IAM deployer user secret key |
| `AWS_REGION` | `us-east-1` |

---

## Step 3: Foundation Stack Deploy

The foundation stack provisions all shared infrastructure:

- VPC + Security Groups
- RDS PostgreSQL 15 (db.t3.micro)
- ElastiCache Redis 7 (cache.t3.micro)
- Cognito User Pool + App Client
- EventBridge Custom Bus
- S3 Bucket (assets)
- S3 Bucket (frontend — hosts user-client, merchant-dashboard, kds)
- CloudFront Distribution (serves frontend bucket via OAC, HTTPS only)

```powershell
# Run from repo root
.\scripts\deploy-foundation.ps1 -Env dev -Profile myordering-dev
```

**What this script does:**

1. Runs `sam build` on `infrastructure/foundation/template.yaml`
2. Runs `sam deploy` with guided=false using `infrastructure/samconfig.toml`
3. Captures CloudFormation outputs (DB endpoint, Redis endpoint, Cognito Pool ID, etc.)
4. Writes outputs to `infrastructure/params/{env}.outputs.json` (gitignored)

**After this step you will have:**

- A running RDS instance (empty DB)
- A running Redis cluster
- A Cognito User Pool with its Pool ID
- An EventBridge bus named `my-ordering-system-event-bus-{env}`
- A CloudFront distribution (domain recorded in `{env}.outputs.json`)
- An empty frontend S3 bucket (content deployed separately in Step 8)

---

## Step 4: SSM Parameters Bootstrap

Populates all SSM Parameter Store values that SAM templates reference at deploy time.

```powershell
# Run from repo root — fill in the actual secret values when prompted
.\scripts\bootstrap-ssm.ps1 -Env dev -Profile myordering-dev
```

The script reads the foundation stack outputs automatically for non-secret values (DB host, Redis host, etc.) and prompts for secrets (DB password, Stripe keys).

> **Rule**: Never write secrets to any file. Only enter them at the interactive prompt.

---

## Step 5: DB Migration

Runs Drizzle migrations against the newly provisioned RDS instance.

```powershell
.\scripts\migrate.ps1 -Env dev -Profile myordering-dev
```

**What this script does:**

1. Fetches DB connection details from SSM
2. Runs `npx drizzle-kit push` targeting the dev RDS
3. Logs a summary of tables created

---

## Step 6: Services Deploy

Deploy each service's SAM stack. Services can be deployed in parallel except auth-service (must come first because other services reference the Authorizer ARN).

```powershell
# Deploy all services in correct order
.\scripts\deploy-services.ps1 -Env dev -Profile myordering-dev
```

**Deployment order (enforced by the script):**

1. `auth-service` — must be first (exports Authorizer ARN)
2. `store-service`
3. `menu-service`
4. `inventory-service`
5. `order-service` (depends on inventory + menu service URLs)
6. `payment-service`
7. `user-profile-service`
8. `device-service`
9. `notification-service`

---

## Step 7: Verify

```powershell
.\scripts\verify-deployment.ps1 -Env dev -Profile myordering-dev
```

Checks:

- All Lambda functions exist and are Active
- API Gateway endpoints respond with 401 (expected — no JWT)
- DB connection reachable (via a test Lambda invoke)
- Redis connection reachable

---

## Step 8: Frontend Deploy

> **When to run**: Only after Step 6 (services) is complete and API Gateway URL is recorded in `{env}.outputs.json`.
> Not required in Phase 1-3 (no frontend apps exist yet). First needed in v0.1.0 Phase 4 (Weeks 13-16).

Deploy each web app individually:

```powershell
# Deploy user-client (customer PWA)
.\scripts\deploy-frontend.ps1 -App user-client -Env dev -Profile myordering-dev

# Deploy merchant-dashboard
.\scripts\deploy-frontend.ps1 -App merchant-dashboard -Env dev -Profile myordering-dev

# Deploy kds (kitchen display)
.\scripts\deploy-frontend.ps1 -App kds -Env dev -Profile myordering-dev
```

> **Note**: `kiosk` and `pos` are Electron apps — they are packaged and distributed separately, not deployed to CloudFront.

**What this script does:**

1. Reads `FrontendBucketName`, `CloudFrontDistributionId`, `CloudFrontDomain` from `{env}.outputs.json`
2. Runs `npm ci && npm run build` inside `frontend/{app}/`
3. Syncs `dist/` to `s3://frontend-bucket/{app}/` (with `--delete`)
4. Uploads `index.html` separately with `no-cache` headers (SPA routing requirement)
5. Creates a CloudFront invalidation for `/{app}/*`
6. Prints the live URL: `https://{cloudfront-domain}/{app}/`

**After this step you will have:**

- All three web apps accessible via CloudFront HTTPS URLs
- `index.html` always fresh (no stale SPA shell)
- Static assets (JS/CSS) cached for 1 year (content-hashed filenames)

---

## Switching AWS Accounts (Free Tier Reset)

When you need to move to a new AWS account:

```powershell
# 1. Set up new AWS credentials (Step 1 above)
aws configure --profile myordering-dev-new

# 2. Update the profile name in scripts or set as default
$env:AWS_PROFILE = "myordering-dev-new"

# 3. Run all steps in order
.\scripts\deploy-foundation.ps1  -Env dev -Profile myordering-dev-new
.\scripts\bootstrap-ssm.ps1     -Env dev -Profile myordering-dev-new
.\scripts\migrate.ps1            -Env dev -Profile myordering-dev-new
.\scripts\deploy-services.ps1    -Env dev -Profile myordering-dev-new
.\scripts\verify-deployment.ps1  -Env dev -Profile myordering-dev-new
# Run Step 8 only if frontend apps have been built (v0.1.0 Phase 4+)
.\scripts\deploy-frontend.ps1    -App user-client         -Env dev -Profile myordering-dev-new
.\scripts\deploy-frontend.ps1    -App merchant-dashboard  -Env dev -Profile myordering-dev-new
.\scripts\deploy-frontend.ps1    -App kds                 -Env dev -Profile myordering-dev-new
```

> ⚠️ After switching accounts, update GitHub Secrets (Step 2) with the new account's credentials.

---

## Environment-Specific Notes

| Env | AWS Account | Branch | Notes |
| --- | --- | --- | --- |
| `dev` | Free Tier account | `feature/*`, `fix/*` | Manual deploy OK |
| `staging` | Same or separate | `develop` | Auto-deploy via CI/CD |
| `prod` | Separate account | `main` | Auto-deploy via CI/CD, requires approval |

---

## What Is NOT Scripted (Must Document Manually If Changed)

| Item | Where to record |
| --- | --- |
| Custom domain name setup | Comment in `infrastructure/foundation/template.yaml` |
| SSL certificate ARN | `infrastructure/params/{env}.json` |
| Stripe webhook endpoint registration | Comment in `services/payment-service/template.yaml` |
| Cognito custom email template | `infrastructure/foundation/template.yaml` resource |
