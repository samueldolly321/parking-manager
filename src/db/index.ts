import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _pgPool: Pool | undefined;
}

export function isPostgresConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
}

export function getPool(): Pool | null {
  if (!isPostgresConfigured()) {
    return null;
  }

  if (!global._pgPool) {
    global._pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      connectionTimeoutMillis: 10000,
    });

    global._pgPool.on('error', (err) => {
      console.error('PostgreSQL pool idle error:', err);
    });
  }

  return global._pgPool;
}

export function getDb(): NodePgDatabase<typeof schema> | null {
  const pool = getPool();
  if (!pool) return null;
  return drizzle(pool, { schema });
}

export { schema };
