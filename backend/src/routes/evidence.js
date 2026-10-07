import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { config } from '../config.js';
import { pool, tx } from '../db.js';
import { HttpError } from '../lib/errors.js';
import { logAudit } from '../lib/audit.js';
import { challengeCode, uid } from '../lib/ids.js';
import { loadTrainerForIssuing } from '../lib/integrity.js';
import { mapEvidence } from '../lib/credentials.js';
import { removeFile, removeStored, sha256File, sniffFile, storeFile, tempDir } from '../lib/storage.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, requireRole('trainer'));

const CHALLENGE_MINUTES = 15;

const upload = multer({
  dest: tempDir(),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 1, fields: 10 },
});

// Multipart fields arrive as strings; an empty string means "not sent".
const optional = (schema) => z.preprocess((v) => (v === '' || v == null ? undefined : v), schema.optional());

const bodySchema = z.object({
  caption: z.string().trim().max(200).default(''),
  locationLabel: z.string().trim().max(120).default(''),
  lat: optional(z.coerce.number().min(-90).max(90)),
  lng: optional(z.coerce.number().min(-180).max(180)),
  durationSec: optional(z.coerce.number().int().min(0).max(600)),
  challengeCode: optional(z.string().trim().regex(/^\d{4}$/, 'The challenge code is four digits.')),
  source: optional(z.enum(['camera', 'demo'])),
});

/** A fresh liveness code. The trainer must show it in the video, and it works once, for 15 minutes. */
router.post('/challenges', async (req, res) => {
  await loadTrainerForIssuing(pool, req.user.id);
  const code = challengeCode();
  const expiresAt = new Date(Date.now() + CHALLENGE_MINUTES * 60 * 1000);
  await pool.query('INSERT INTO evidence_challenges (id, trainer_id, code, expires_at) VALUES ($1, $2, $3, $4)', [uid('ch'), req.user.id, code, expiresAt]);
  res.status(201).json({ code, expiresAt: expiresAt.toISOString() });
});

/** Evidence this trainer uploaded but has not attached to a credential yet (survives a page refresh). */
router.get('/pending', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM evidence WHERE uploaded_by = $1 AND credential_id IS NULL ORDER BY created_at', [req.user.id]);
  res.json({ evidence: rows.map(mapEvidence) });
});

/**
 * Upload one photo or video (multipart, field "file").
 * The server works out the file type from its bytes and computes the SHA-256 itself, so the
 * duplicate-evidence check cannot be bypassed by sending a made-up hash.
 */
router.post('/', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) throw new HttpError(400, 'Attach a photo or video in the "file" field.');
  let storedKey = null;
  let saved = false;
  try {
    const body = bodySchema.parse(req.body);
    if (body.source === 'demo' && !config.allowDemoEvidence) throw new HttpError(403, 'Demo evidence is switched off on this server.');
    const sniffed = await sniffFile(file.path);
    if (!sniffed) throw new HttpError(415, 'Only JPEG, PNG or WebP photos and MP4 or WebM videos are accepted.');
    if (sniffed.kind === 'video' && !body.challengeCode) throw new HttpError(400, 'A video must show the challenge code. Send it as "challengeCode".');
    const hash = await sha256File(file.path);

    const result = await tx(async (db) => {
      await loadTrainerForIssuing(db, req.user.id);

      const dup = (await db.query('SELECT * FROM evidence WHERE sha256 = $1', [hash])).rows[0];
      if (dup) {
        // The same trainer re-sending a file they have not used yet is just a retry: hand the record back.
        if (dup.uploaded_by === req.user.id && !dup.credential_id) return { row: dup, existing: true };
        // Logged here and thrown after commit, otherwise the rollback would erase the log entry.
        await logAudit(db, { actor: req.user, action: 'evidence.duplicate_blocked', target: hash.slice(0, 12), detail: `${req.user.name} tried to reuse evidence already attached to another credential` });
        return { duplicate: true };
      }

      if (sniffed.kind === 'video') {
        const challenge = (await db.query(
          `SELECT id FROM evidence_challenges
            WHERE trainer_id = $1 AND code = $2 AND used_at IS NULL AND expires_at > now()
            ORDER BY issued_at DESC LIMIT 1 FOR UPDATE`,
          [req.user.id, body.challengeCode],
        )).rows[0];
        if (!challenge) throw new HttpError(400, 'That code has expired or was already used. Ask for a new one and record again.');
        await db.query('UPDATE evidence_challenges SET used_at = now() WHERE id = $1', [challenge.id]);
      }

      const stored = await storeFile(file.path, sniffed.ext);
      storedKey = stored.key;
      const { rows } = await db.query(
        `INSERT INTO evidence (id, uploaded_by, kind, url, caption, location_label, lat, lng, sha256, mime_type, size_bytes, challenge_code, duration_sec, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
        [uid('ev'), req.user.id, sniffed.kind, stored.url, body.caption, body.locationLabel, body.lat ?? null, body.lng ?? null,
          hash, sniffed.mime, file.size, sniffed.kind === 'video' ? body.challengeCode : null, body.durationSec ?? null, body.source ?? 'camera'],
      );
      return { row: rows[0] };
    });

    if (result.duplicate) throw new HttpError(409, 'One file matches evidence already used on another credential.');
    saved = true;
    res.status(result.existing ? 200 : 201).json({ evidence: mapEvidence(result.row) });
  } finally {
    await removeFile(file.path);
    if (storedKey && !saved) await removeStored(storedKey);
  }
});

export default router;
