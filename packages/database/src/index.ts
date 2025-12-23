// src/index.ts
// Database connection and client export

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

// Database connection options
export interface DatabaseOptions {
  connectionString?: string;
  max?: number;
  idleTimeout?: number;
  connectionTimeoutMillis?: number;
}

// Create database connection
export function createDatabase(options: DatabaseOptions = {}) {
  const connectionString = options.connectionString || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined. Please set it in your environment variables.');
  }

  // Create postgres client
  const client = postgres(connectionString, {
    max: options.max || 10,
    idle_timeout: options.idleTimeout || 20,
    connect_timeout: options.connectionTimeoutMillis || 10,
  });

  // Create drizzle instance with schema
  return drizzle(client, { schema });
}

// Export schema for use in other packages
export { schema };

// Export types
export type Database = ReturnType<typeof createDatabase>;

// Default database instance (can be overridden)
let defaultDb: Database | null = null;

export function getDatabase(options?: DatabaseOptions): Database {
  if (!defaultDb) {
    defaultDb = createDatabase(options);
  }
  return defaultDb;
}

// Export for migrations
export { sql } from 'drizzle-orm';
