import { drizzle as vercelDrizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import { drizzle as pgliteDrizzle } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import * as schema from '../drizzle/schema';
import path from 'path';

let dbInstance: any;

if (process.env.POSTGRES_URL) {
  dbInstance = vercelDrizzle(sql, { schema });
} else {
  // Use a local file-based PGlite instance for persistence
  const dbPath = path.join(process.cwd(), '.local-db');
  const client = new PGlite(dbPath);
  dbInstance = pgliteDrizzle(client, { schema });
}

export const db = dbInstance;
export { schema };
