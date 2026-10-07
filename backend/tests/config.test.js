/**
 * The server must refuse to start with secrets anyone could know.
 * Each case runs config.js in a fresh process, with no .env file in play.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, it } from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const GOOD_A = 'a'.repeat(20) + 'k3y-one-' + 'b'.repeat(10);
const GOOD_B = 'z'.repeat(20) + 'k3y-two-' + 'y'.repeat(10);

function load(env) {
  return spawnSync(process.execPath, ['--input-type=module', '-e', "await import('./src/config.js')"], {
    cwd: root,
    encoding: 'utf8',
    env: { PATH: process.env.PATH, DOTENV_CONFIG_PATH: '/nonexistent', DATABASE_URL: 'postgres://u:p@localhost/db', JWT_SECRET: GOOD_A, SIGNING_KEY: GOOD_B, ...env },
  });
}

describe('startup secrets', () => {
  it('starts with two different real secrets', () => {
    assert.equal(load({}).status, 0);
  });

  it('refuses the placeholder JWT_SECRET from .env.example', () => {
    const r = load({ JWT_SECRET: 'change-me-to-a-long-random-string-1' });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /JWT_SECRET is still the placeholder/);
  });

  it('refuses the placeholder SIGNING_KEY from .env.example', () => {
    const r = load({ SIGNING_KEY: 'change-me-to-a-different-long-random-string-2' });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /SIGNING_KEY is still the placeholder/);
  });

  it('refuses the same value for both secrets', () => {
    const r = load({ SIGNING_KEY: GOOD_A });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /must be two different values/);
  });

  it('refuses a short secret', () => {
    const r = load({ JWT_SECRET: 'too-short' });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /at least 32 characters/);
  });
});
