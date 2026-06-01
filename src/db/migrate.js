import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await client.query(sql);
  await client.end();
  console.log('Database migrated successfully');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
