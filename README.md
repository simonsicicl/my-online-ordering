# My Online Ordering System

A serverless restaurant ordering platform built with AWS Lambda, TypeScript, and React.

## Project Overview

This is a monorepo containing all components of the My Online Ordering System, including:
- Shared type definitions
- Backend microservices (Lambda functions)
- Frontend applications (User Client, Merchant Dashboard, POS, Kiosk, KDS)

## Technology Stack

- **Monorepo**: pnpm + Turborepo
- **Language**: TypeScript
- **Backend**: AWS Lambda (Node.js 20.x)
- **Frontend**: React 18 + Vite
- **Database**: Amazon RDS for PostgreSQL (db.t3.micro, 20GB, Single-AZ)
- **ORM**: Drizzle ORM
- **Infrastructure**: AWS (Lambda, API Gateway, EventBridge, S3, CloudFront)

## Project Structure

```
my-online-ordering/
├── packages/
│   ├── shared-types/          # Shared TypeScript types (✅ COMPLETED)
│   └── database/              # Drizzle ORM database layer (✅ COMPLETED)
├── services/                  # Backend microservices (Lambda functions)
│   ├── menu-service/
│   ├── order-service/
│   ├── payment-service/
│   └── ... (more services)
├── apps/                      # Frontend applications
│   ├── user-client/           # Customer-facing PWA
│   ├── merchant-dashboard/    # Merchant management portal
│   ├── pos/                   # Point of Sale (Electron)
│   ├── kiosk/                 # Self-service kiosk (Electron)
│   └── kds/                   # Kitchen Display System
├── doc/                       # Design documentation
├── package.json               # Root package configuration
├── pnpm-workspace.yaml        # pnpm workspace configuration
└── turbo.json                 # Turborepo configuration
```

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0

### Installation

```bash
# Install pnpm if you haven't already
npm install -g pnpm

# Install all dependencies
pnpm install

# Build all packages
pnpm build
```

### Development

```bash
# Run all packages in development mode
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint all packages
pnpm lint

# Format code
pnpm format
```

## Packages

### @myordering/shared-types

Shared TypeScript type definitions for the entire system. See [packages/shared-types/README.md](packages/shared-types/README.md) for details.

**Status**: ✅ Completed

### @myordering/database

Database layer with Drizzle ORM for PostgreSQL. Includes complete schema definitions, migrations, and type-safe query builder. See [packages/database/README.md](packages/database/README.md) for details.

**Status**: ✅ Completed  
**Tables**: 22 tables, 18 enums, 50+ indexes  
**Migration**: Initial migration generated (636 lines SQL)

## Development Phases

This project follows a phased development approach:

- **Phase 1**: Foundation & Infrastructure (Weeks 1-4) - ✅ **COMPLETED**
  - ✅ Monorepo setup (pnpm + Turborepo)
  - ✅ Shared types package
  - ✅ Database schema with Drizzle ORM
  - ✅ Initial migration generated

- **Phase 2**: Authorization & Store Services (Weeks 5-8) - 🚧 **IN PROGRESS**
  - AWS Cognito setup
  - Lambda functions for auth and store management
  - Direct RDS connection setup (no RDS Proxy)

- **Version 0.1.0**: MVP - Core Ordering System (Weeks 1-16)
- **Version 0.2.0**: Inventory & POS System (Weeks 17-28)
- **Version 1.0.0**: Production Release

See [SOFTWARE_DEVELOPMENT_PLAN.md](doc/SOFTWARE_DEVELOPMENT_PLAN.md) for the complete roadmap.

## Documentation

- [Software Development Plan](doc/SOFTWARE_DEVELOPMENT_PLAN.md) - Complete development roadmap
- [Architecture Overview](doc/ARCHITECTURE_OVERVIEW.md) - System architecture and design principles
- [Database Schema](doc/DATABASE_SCHEMA.md) - Complete database schema with Drizzle ORM
- [API Contract](doc/API_CONTRACT.md) - REST API specifications
- [Shared Types](doc/SHARED_TYPES.md) - TypeScript type definitions
- [Implementation Logs](IMPLEMENTATION_LOG.md) - Shared types implementation details
- [Database Implementation](DATABASE_IMPLEMENTATION_LOG.md) - Database layer implementation details

## License

MIT

## Author

Simon Chou
