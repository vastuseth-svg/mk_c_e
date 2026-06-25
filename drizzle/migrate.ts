import { db } from '../lib/db';
import { migrate as vercelMigrate } from 'drizzle-orm/vercel-postgres/migrator';
import { migrate as pgliteMigrate } from 'drizzle-orm/pglite/migrator';
import path from 'path';

async function main() {
  const migrationsFolder = path.join(__dirname, 'migrations');
  console.log('Running migrations from:', migrationsFolder);
  
  if (process.env.POSTGRES_URL) {
    console.log('Migrating Vercel Postgres...');
    await vercelMigrate(db, { migrationsFolder });
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
