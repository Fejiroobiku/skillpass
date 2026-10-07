import { createReadStream } from 'node:fs';
import { mkdir, open, rename, rm } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { config } from '../config.js';

/**
 * Evidence storage: local disk for now.
 *
 * To move to cloud storage (Supabase Storage or Cloudinary, as in the deployment plan), replace
 * storeFile() so it uploads the temp file and returns the public URL. Nothing else needs to change,
 * because the SHA-256 and the file type are worked out here before the file is stored.
 */
export const tempDir = () => path.join(config.uploadDir, '.tmp');

export async function ensureDirs() {
  await mkdir(tempDir(), { recursive: true });
}

export function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

/** Work out what a file really is from its first bytes. The browser's claimed type is not trusted. */
export async function sniffFile(filePath) {
  const handle = await open(filePath, 'r');
  const buf = Buffer.alloc(16);
  try {
    await handle.read(buf, 0, 16, 0);
  } finally {
    await handle.close();
  }
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg', kind: 'photo' };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: 'png', kind: 'photo' };
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return { mime: 'image/webp', ext: 'webp', kind: 'photo' };
  if (buf.subarray(4, 8).toString('latin1') === 'ftyp') return { mime: 'video/mp4', ext: 'mp4', kind: 'video' };
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return { mime: 'video/webm', ext: 'webm', kind: 'video' };
  return null;
}

/** Move a verified temp file into permanent storage under an unguessable name. */
export async function storeFile(tempPath, ext) {
  const key = `${randomUUID()}.${ext}`;
  await rename(tempPath, path.join(config.uploadDir, key));
  return { key, url: `/uploads/${key}` };
}

export const removeFile = (filePath) => rm(filePath, { force: true }).catch(() => {});
export const removeStored = (key) => removeFile(path.join(config.uploadDir, key));
