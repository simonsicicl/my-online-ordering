# Development Progress

> Last Updated: 2025-12-26  
> Current: **v0.1.0 Phase 2 Prerequisites Complete** → Ready for Phase 2 Core  
> SDP Reference: [SOFTWARE_DEVELOPMENT_PLAN.md](doc/SOFTWARE_DEVELOPMENT_PLAN.md)

---

## 🎯 Next Steps

### Phase 2 Core Tasks (SDP Week 5-8)
4. [ ] Cognito User Pool setup
5. [ ] Authorization Service (3 Lambda functions)
6. [ ] Store Service (3 Lambda functions)
7. [ ] API Gateway routes + authorizers

---

## 📊 Current Status

### Phase 2 Prerequisites: Deferred Infrastructure ✅
**Status**: Complete (100%)  
**Completed**: 2025-12-26 | **Time**: 3 hours

#### ✅ Infrastructure Deliverables (3/3)
- **API Gateway HTTP API**: oq6p23olhh (https://oq6p23olhh.execute-api.us-west-2.amazonaws.com)
  - CORS enabled (all origins/methods)
  - Throttling: 100 req/sec, burst 200
- **API Gateway WebSocket API**: foq4k9coo4 (wss://foq4k9coo4.execute-api.us-west-2.amazonaws.com)
- **ElastiCache Redis**: myordering-redis-dev (cache.t3.micro, available)
  - Endpoint: myordering-redis-dev.p9gfjg.0001.usw2.cache.amazonaws.com:6379
  - Security Group: sg-0216e19ba422dce16 (allows RDS SG + local IP)
- **Test Lambda**: myordering-test-lambda
  - ✅ RDS PostgreSQL connection verified (PostgreSQL 17.6)
  - ✅ Redis connection verified (PING, SET, GET)
  - Runtime: Node.js 20.x, Timeout: 60s, Memory: 512MB
  - IAM Role: myordering-lambda-execution-role (VPC + CloudWatch + SSM access)

#### 📝 SSM Parameters Created
- `/myordering/dev/api-gateway-id` = oq6p23olhh
- `/myordering/dev/websocket-api-id` = foq4k9coo4
- `/myordering/dev/redis-endpoint` = myordering-redis-dev.p9gfjg.0001.usw2.cache.amazonaws.com
- `/myordering/dev/redis-url` = redis://myordering-redis-dev.p9gfjg.0001.usw2.cache.amazonaws.com:6379

#### 🔧 Technical Notes
- Used cache.t3.micro instead of cache.t2.micro (t2 unavailable in us-west-2)
- Lambda uses environment variables instead of SSM runtime calls (faster cold start)
- VPC configuration: 4 subnets across us-west-2a/b/c/d, RDS security group

### Phase 1: Foundation & Infrastructure ✅
**Status**: Complete (100% core tasks)  
**Completed**: 2025-12-25 | **Time**: 7 hours | **Cost**: ~$15/month

#### ✅ Core Deliverables (11/11)
- AWS Account + IAM (ProgrammaticAccess)
- RDS PostgreSQL (myordering-db-dev, db.t3.micro, max_connections=87 ✅)
- Database Schema (22 tables via Drizzle ORM)
- SSM Parameter Store (/myordering/dev/*)
- CloudWatch Alarms (3: connections, storage, CPU)
- Security Group (port 5432)
- CI/CD Pipeline (GitHub Actions, 3 jobs)
- Environment Variables (.env.local)
- Git Workflow Documentation (bilingual)
- Monorepo (pnpm + Turborepo)

---

### Phase 2: Authorization & Store Services
**Status**: Not started  
**SDP Reference**: Week 5-8  
**Estimated Time**: 1-2 weeks

_Progress will be tracked here..._

---

## 📝 Key Decisions

### 2025-12-24: Phase 1 Extended Tasks Deferred
- **Decision**: Move API Gateway, Redis, Lambda to Phase 2
- **Reason**: No code to deploy yet, avoid idle resources
- **Benefit**: Faster Phase 1 completion (7 hours vs. 4 weeks planned)

### 2025-12-20: Database Connection Strategy
- **Decision**: Direct Lambda → RDS (no RDS Proxy)
- **Reason**: Drizzle ORM lightweight, 87 connections sufficient for MVP
- **Future**: Add RDS Proxy if connection exhaustion occurs

### 2025-12-20: IAM Security
- **Current**: Same IAM user for staging/production
- **Future**: Separate Prod IAM (v0.4.0), GitHub OIDC (v1.0.0)

---

## 📅 Timeline

| Phase | SDP Plan | Actual | Status |
|-------|----------|--------|--------|
| Phase 1 | 4 weeks | 7 hours | ✅ Complete |
| Phase 2 | Week 5-8 | TBD | ⏸️ Not Started |

**Progress**: Ahead by ~3.5 weeks 🚀
