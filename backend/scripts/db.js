/**
 * Database helper, so you do not need psql installed (handy on Render, Neon or Supabase).
 *
 *   npm run db:schema   create all tables (empty database only)
 *   npm run db:seed     load the demo data and sign every credential with your SIGNING_KEY
 *   npm run db:resign   recompute signatures (after changing SIGNING_KEY)
 *   npm run db:reset    DROP everything, then schema + seed. Development only.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { config } from '../src/config.js';
import { pool } from '../src/db.js';
import { resignAll } from '../src/lib/integrity.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'database');
const sql = (name) => readFile(path.join(dir, name), 'utf8');

export async function applySchema() {
  await pool.query(await sql('schema.sql'));
}

export async function applySeed() {
  await pool.query(await sql('seed.sql'));
  return resignAll(pool);
}

export async function dropEverything() {
  const { rows } = await pool.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`);
  if (rows.length) await pool.query(`DROP TABLE ${rows.map((r) => `"${r.tablename}"`).join(', ')} CASCADE`);
  await pool.query('DROP FUNCTION IF EXISTS audit_log_block_changes() CASCADE');
}

export async function reset() {
  await dropEverything();
  await applySchema();
  return applySeed();
}

async function main() {
  const command = process.argv[2];
  try {
    if (command === 'schema') {
      await applySchema();
      console.log('Schema created.');
    } else if (command === 'seed') {
      console.log(`Seeded demo data and signed ${await applySeed()} credentials.`);
    } else if (command === 'resign') {
      console.log(`Re-signed ${await resignAll(pool)} credentials.`);
    } else if (command === 'reset') {
      if (config.env === 'production') throw new Error('Refusing to reset a production database.');
      console.log(`Database reset. Seeded demo data and signed ${await reset()} credentials.`);
    } else {
      console.log('Usage: node scripts/db.js <schema|seed|resign|reset>');
      process.exitCode = 1;
    }
  } finally {
    await pool.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
