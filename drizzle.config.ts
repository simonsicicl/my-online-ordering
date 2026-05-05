import type { Config } from 'drizzle-kit';

// drizzle.config.ts — root-level config used by migrate.ps1
// Reads DB connection from environment variables set by the migration script.
// Never hardcode credentials here.

export default {
  schema: './services/*/src/db/schema.ts',   // glob: all service schemas
  out:    './infrastructure/migrations',      // generated migration files
  driver: 'pg',
  dbCredentials: {
    host:     process.env.DATABASE_HOST     ?? 'localhost',
    port:     parseInt(process.env.DATABASE_PORT ?? '5432', 10),
    database: process.env.DATABASE_NAME     ?? 'myordering',
    user:     process.env.DATABASE_USER     ?? 'postgres',
    password: process.env.DATABASE_PASSWORD ?? '',
    ssl:      process.env.DATABASE_SSL === 'true',
  },
  verbose: true,
  strict:  false,   // false = auto-approve in scripts (migrate.ps1 handles confirmation)
} satisfies Config;
