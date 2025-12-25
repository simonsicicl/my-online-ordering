# Development Progress

> Last Updated: 2025-12-25  
> Current: **v0.1.0 Phase 1 Complete** → Starting Phase 2  
> SDP Reference: [SOFTWARE_DEVELOPMENT_PLAN.md](doc/SOFTWARE_DEVELOPMENT_PLAN.md)

---

## 🎯 Next Steps

### Phase 2 Prerequisites (Deferred from Phase 1, ~2-3 hours)
1. [ ] **API Gateway** (30-45 min) - HTTP + WebSocket APIs
2. [ ] **ElastiCache Redis** (45-60 min) - cache.t2.micro, VPC config
3. [ ] **Test Lambda** (1 hour) - Hello World + RDS connection test

### Phase 2 Core Tasks (SDP Week 5-8)
4. [ ] Cognito User Pool setup
5. [ ] Authorization Service (3 Lambda functions)
6. [ ] Store Service (3 Lambda functions)
7. [ ] API Gateway routes + authorizers

---

## 📊 Current Status

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

#### ⏸️ Deferred to Phase 2 (3/3 from SDP Extended)

| Item | Why Deferred | When Needed |
|------|--------------|-------------|
| API Gateway | No Lambda handlers yet | Before Authorization Service |
| ElastiCache Redis | No caching use cases yet | Before Store Service |
| Lambda Deployment | No code to deploy | With first Lambda function |

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
