// Shared setup for the module tests: environment, server start, and small request helpers.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgres://skillpass:skillpass@localhost:5432/skillpass_test';
process.env.JWT_SECRET = 'test-jwt-secret-test-jwt-secret-test-jwt-secret';
process.env.SIGNING_KEY = 'test-signing-key-test-signing-key-test-signing-key';
process.env.BCRYPT_ROUNDS = '4';
process.env.PUBLIC_URL = 'http://api.test';
process.env.UPLOAD_DIR = path.join(os.tmpdir(), `skillpass-test-uploads-${process.pid}`);
assert.match(process.env.DATABASE_URL, /test/, 'Refusing to wipe a database whose URL does not contain "test".');

const { createApp } = await import('../src/app.js');
export const { pool } = await import('../src/db.js');
const { reset } = await import('../scripts/db.js');

let server;
let base;

export async function start() {
  await reset();
  server = (await createApp()).listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
}

export async function stop() {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
  await rm(process.env.UPLOAD_DIR, { recursive: true, force: true });
}

export async function api(method, url, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['content-type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(base + url, { method, headers, body: payload });
  return { status: res.status, body: await res.json().catch(() => null) };
}

export async function login(email, password = 'demo1234') {
  const r = await api('POST', '/api/auth/login', { body: { email, password } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.token;
}

export const jpeg = () => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), randomBytes(48)]);
export const mp4 = () => Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypmp42'), randomBytes(48)]);

export function upload(token, buffer, fields = {}) {
  const form = new FormData();
  form.append('file', new Blob([buffer]), 'evidence.bin');
  for (const [k, v] of Object.entries(fields)) form.append(k, String(v));
  return api('POST', '/api/evidence', { token, form });
}
