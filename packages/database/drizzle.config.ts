// drizzle.config.ts
// Drizzle Kit configuration for migrations

/// <reference types="node" />

import type { Config } from 'drizzle-kit';

export default {
  schema: './dist/schema/*.js',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/myordering',
  },
  verbose: true,
  strict: true,
} satisfies Config;
