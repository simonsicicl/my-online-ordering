import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../db/schema';
import { config } from './config';

// Module-level singleton — reused across warm Lambda invocations
let client: ReturnType<typeof postgres> | undefined;

export function getDb() {
  if (!client) {
    client = postgres({
      host:     config.dbHost,
      port:     config.dbPort,
      database: config.dbName,
      username: config.dbUser,
      password: config.dbPassword,
      ssl:      config.dbSsl ? 'require' : false,
      max:      config.dbMaxConnections,
    });
  }
  return drizzle(client, { schema });
}

export const db = getDb();
