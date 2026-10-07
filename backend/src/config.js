import path from 'node:path';
import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}. Copy .env.example to .env and fill it in.`);
  return value;
}

// The sample values in .env.example are public, so they must never be accepted as real secrets.
const PLACEHOLDER = /change-?me|replace-?me/i;

function secret(name) {
  const value = required(name);
  if (value.length < 32) throw new Error(`${name} must be at least 32 characters long.`);
  if (PLACEHOLDER.test(value)) {
    throw new Error(`${name} is still the placeholder from .env.example. Generate a real one with:\n  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`);
  }
  return value;
}

const flag = (value) => ['1', 'true', 'yes'].includes(String(value ?? '').toLowerCase());
const port = Number(process.env.PORT ?? 4000);

const jwtSecret = secret('JWT_SECRET');
const signingKey = secret('SIGNING_KEY');
if (jwtSecret === signingKey) throw new Error('JWT_SECRET and SIGNING_KEY must be two different values.');

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port,
  databaseUrl: required('DATABASE_URL'),
  databaseSsl: flag(process.env.DATABASE_SSL),
  jwtSecret,
  signingKey,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 12),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(',').map((s) => s.trim()).filter(Boolean),
  uploadDir: path.resolve(process.env.UPLOAD_DIR ?? 'uploads'),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 40),
  // Lets the demo build upload generated sample evidence marked source=demo. Never enable with real participants.
  allowDemoEvidence: flag(process.env.ALLOW_DEMO_EVIDENCE),
  publicUrl: (process.env.PUBLIC_URL ?? `http://localhost:${port}`).replace(/\/$/, ''),
  // "Today" for the daily issuing limit means today in Lagos, not UTC.
  timezone: 'Africa/Lagos',
};
