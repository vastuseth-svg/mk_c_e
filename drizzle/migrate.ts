import { migrate as vercelMigrate } from 'drizzle-orm/vercel-postgres/migrator';
import { migrate as pgliteMigrate } from 'drizzle-orm/pglite/migrator';
import { migrate as nodePostgresMigrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle as nodePostgresDrizzle } from 'drizzle-orm/node-postgres';
import { db } from '../lib/db';
import { Client } from 'pg';
import path from 'path';
import dns from 'dns';
import { promisify } from 'util';

const lookupPromise = promisify(dns.lookup);

async function createPgClient(connectionString: string) {
  const parsed = new URL(connectionString);
  const hostname = parsed.hostname;
  const lookup = await lookupPromise(hostname, { family: 4 });
  const ipAddress = lookup.address;
  
  return new Client({
    host: ipAddress,
    port: parsed.port ? parseInt(parsed.port) : 5432,
    user: parsed.username,
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.substring(1),
    ssl: {
      rejectUnauthorized: false,
      servername: hostname
    }
  });
}

async function main() {
  const migrationsFolder = path.join(__dirname, 'migrations');
  console.log('Running migrations from:', migrationsFolder);
  
  if (process.env.POSTGRES_URL) {
    console.log('Migrating Vercel Postgres using TCP connection...');
    const client = await createPgClient(process.env.POSTGRES_URL);
    await client.connect();
    const dbInstance = nodePostgresDrizzle(client);
    // Use node-postgres migrator
    await nodePostgresMigrate(dbInstance, { migrationsFolder });
    await client.end();
  } else {
    console.log('Migrating local PGlite...');
    await pgliteMigrate(db, { migrationsFolder });
  }
  console.log('Migrations complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

