import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const backend = path.resolve(__dirname, '../../backend');
const PORT = 4100;

const env = {
  ...process.env,
  NODE_ENV: 'test', // switches off rate limits
  PORT: String(PORT),
  DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://skillpass:skillpass@localhost:5432/skillpass_test',
  JWT_SECRET: 'frontend-test-jwt-secret-frontend-test-jwt-secret',
  SIGNING_KEY: 'frontend-test-signing-key-frontend-test-signing-key',
  BCRYPT_ROUNDS: '4',
  PUBLIC_URL: `http://127.0.0.1:${PORT}`,
  UPLOAD_DIR: path.join(os.tmpdir(), `skillpass-ui-test-uploads-${process.pid}`),
  ALLOW_DEMO_EVIDENCE: 'true',
  DOTENV_CONFIG_PATH: '/nonexistent' // never pick up a developer's .env
};

if (!/test/.test(env.DATABASE_URL)) throw new Error('Refusing to wipe a database whose URL does not contain "test".');

let server: ChildProcess | undefined;

export async function setup() {
  const reset = spawnSync(process.execPath, ['scripts/db.js', 'reset'], { cwd: backend, env, encoding: 'utf8' });
  if (reset.status !== 0) throw new Error(`Could not reset the test database:\n${reset.stdout}\n${reset.stderr}`);

  server = spawn(process.execPath, ['src/server.js'], { cwd: backend, env, stdio: ['ignore', 'ignore', 'inherit'] });
  const deadline = Date.now() + 20000;
  for (;;) {
    try {
      if ((await fetch(`http://127.0.0.1:${PORT}/api/health`)).ok) return;
    } catch {/* not up yet */}
    if (Date.now() > deadline) throw new Error('The backend did not start in time.');
    await new Promise((r) => setTimeout(r, 200));
  }
}

export async function teardown() {
  server?.kill('SIGTERM');
}
