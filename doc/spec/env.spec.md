# Environment & Configuration Spec — My Online Ordering System
> Defines all environment variables, SSM Parameter Store paths, and runtime config.
> All Lambda handlers MUST read config from these names only.

---

## Runtime Environments

| Environment | AWS Account Stage | Branch |
| --- | --- | --- |
| `dev` | Development | `feature/*`, `fix/*` |
| `staging` | Staging | `develop` |
| `prod` | Production | `main` |

---

## SSM Parameter Store — Naming Convention

**Pattern**: `/myordering/{env}/{service}/{key}`

All secrets are stored as **SecureString** (KMS encrypted).  
Non-secret config stored as **String**.

### Database

| SSM Path | Type | Value Example |
| --- | --- | --- |
| `/myordering/{env}/db/host` | String | `mydb.xxxx.us-east-1.rds.amazonaws.com` |
| `/myordering/{env}/db/port` | String | `5432` |
| `/myordering/{env}/db/name` | String | `myordering` |
| `/myordering/{env}/db/username` | SecureString | `dbadmin` |
| `/myordering/{env}/db/password` | SecureString | `••••••••` |

### Redis

| SSM Path | Type | Value Example |
| --- | --- | --- |
| `/myordering/{env}/redis/host` | String | `myordering.xxxx.cache.amazonaws.com` |
| `/myordering/{env}/redis/port` | String | `6379` |

### Cognito

| SSM Path | Type | Value Example |
| --- | --- | --- |
| `/myordering/{env}/cognito/user-pool-id` | String | `us-east-1_XXXXXXXXX` |
| `/myordering/{env}/cognito/client-id` | String | `xxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `/myordering/{env}/cognito/region` | String | `us-east-1` |

### Stripe

| SSM Path | Type | Value Example |
| --- | --- | --- |
| `/myordering/{env}/stripe/secret-key` | SecureString | `sk_live_••••••••` |
| `/myordering/{env}/stripe/webhook-secret` | SecureString | `whsec_••••••••` |
| `/myordering/{env}/stripe/publishable-key` | String | `pk_live_••••••••` |

### EventBridge

| SSM Path | Type | Value Example |
| --- | --- | --- |
| `/myordering/{env}/eventbridge/bus-name` | String | `my-ordering-system-event-bus` |
| `/myordering/{env}/eventbridge/region` | String | `us-east-1` |

### S3 / CloudFront

| SSM Path | Type | Value Example |
| --- | --- | --- |
| `/myordering/{env}/s3/bucket-name` | String | `myordering-assets-prod` |
| `/myordering/{env}/cloudfront/domain` | String | `dxxxxxxxxxxxx.cloudfront.net` |

---

## Lambda Environment Variables

All Lambda functions receive environment variables injected via SAM template.  
Variables are resolved from SSM at **deploy time** (not runtime).

### Common (all services)

```
NODE_ENV=production|staging|development
APP_ENV=prod|staging|dev
AWS_REGION=us-east-1
LOG_LEVEL=info|debug|error
```

### Database-connected Lambdas

```
DATABASE_HOST          # from SSM /myordering/{env}/db/host
DATABASE_PORT          # from SSM /myordering/{env}/db/port
DATABASE_NAME          # from SSM /myordering/{env}/db/name
DATABASE_USER          # from SSM /myordering/{env}/db/username
DATABASE_PASSWORD      # from SSM /myordering/{env}/db/password
DATABASE_SSL=true
DB_MAX_CONNECTIONS=10  # per Lambda instance pool limit
```

### Cache-connected Lambdas

```
REDIS_HOST             # from SSM /myordering/{env}/redis/host
REDIS_PORT             # from SSM /myordering/{env}/redis/port
```

### Auth Service / Lambda Authorizer

```
COGNITO_USER_POOL_ID   # from SSM /myordering/{env}/cognito/user-pool-id
COGNITO_CLIENT_ID      # from SSM /myordering/{env}/cognito/client-id
COGNITO_REGION         # from SSM /myordering/{env}/cognito/region
```

### Payment Service

```
STRIPE_SECRET_KEY      # from SSM /myordering/{env}/stripe/secret-key
STRIPE_WEBHOOK_SECRET  # from SSM /myordering/{env}/stripe/webhook-secret
```

### Event-publishing Lambdas

```
EVENTBRIDGE_BUS_NAME   # from SSM /myordering/{env}/eventbridge/bus-name
```

### Notification Service

```
WEBSOCKET_API_ENDPOINT # API Gateway WebSocket endpoint, e.g. https://xxxx.execute-api.us-east-1.amazonaws.com/prod
SES_FROM_EMAIL         # e.g. noreply@myonlineordering.com
SNS_PUSH_TOPIC_ARN     # SNS topic ARN for push notifications
```

### Device Service

```
IOT_ENDPOINT           # AWS IoT Core endpoint, e.g. xxxx.iot.us-east-1.amazonaws.com
SQS_PRINT_JOB_QUEUE_URL  # SQS queue URL for print jobs
```

---

## Development Workflow

This is a **serverless project — there is no local stack.**
All development is done against the real AWS `dev` environment.

- Deploy changes: `sam deploy` via `scripts/deploy-services.ps1 -Env dev`
- View logs: AWS Console → CloudWatch, or `sam logs -n <FunctionName> --stack-name <stack> --tail`
- Test endpoints: use the API Gateway URL output from the deployed stack
- DB access: connect directly to RDS dev instance using credentials from SSM

For environment bootstrap and first-time setup, see `doc/spec/deployment.spec.md`.

---

## Config Access Pattern in Lambda

**Rule**: Never hardcode values. Always read from `process.env`.

```typescript
// src/lib/config.ts  (create this file in every service)
export const config = {
  db: {
    host:     requireEnv('DATABASE_HOST'),
    port:     parseInt(requireEnv('DATABASE_PORT'), 10),
    name:     requireEnv('DATABASE_NAME'),
    user:     requireEnv('DATABASE_USER'),
    password: requireEnv('DATABASE_PASSWORD'),
    ssl:      process.env.DATABASE_SSL === 'true',
  },
  redis: {
    host: requireEnv('REDIS_HOST'),
    port: parseInt(requireEnv('REDIS_PORT'), 10),
  },
  eventbridge: {
    busName: requireEnv('EVENTBRIDGE_BUS_NAME'),
  },
  app: {
    env:      process.env.APP_ENV ?? 'dev',
    logLevel: process.env.LOG_LEVEL ?? 'info',
    region:   requireEnv('AWS_REGION'),
  },
} as const;

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}
```
