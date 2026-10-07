import { ZodError } from 'zod';
import { HttpError } from '../lib/errors.js';

export function notFound(req, res) {
  res.status(404).json({ error: 'Not found.' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: err.issues[0]?.message ?? 'Invalid request.',
      details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...(err.details ? { details: err.details } : {}) });
  }
  if (err?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'That file is too large.' });
  if (err?.name === 'MulterError') return res.status(400).json({ error: 'The upload could not be read. Send one file in the "file" field.' });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'The request body is not valid JSON.' });
  if (err?.code === '23505') return res.status(409).json({ error: 'That record already exists.' });
  if (err?.code === '23503') return res.status(400).json({ error: 'A related record was not found.' });

  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
}
