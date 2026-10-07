import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { pool } from './db.js';
import { ensureDirs } from './lib/storage.js';
import { errorHandler, notFound } from './middleware/errors.js';
import adminRoutes from './routes/admin.js';
import attemptRoutes from './routes/attempts.js';
import bootstrapRoutes from './routes/bootstrap.js';
import feedbackRoutes from './routes/feedback.js';
import jobRoutes from './routes/jobs.js';
import passportRoutes from './routes/passport.js';
import skillRoutes from './routes/skills.js';
import susRoutes from './routes/sus.js';
import authRoutes from './routes/auth.js';
import credentialRoutes from './routes/credentials.js';
import evidenceRoutes from './routes/evidence.js';
import notificationRoutes from './routes/notifications.js';
import referenceRoutes from './routes/reference.js';
import reportRoutes from './routes/reports.js';
import trainerRoutes from './routes/trainer.js';
import verifyRoutes from './routes/verify.js';

const limiter = (windowMs, limit) => rateLimit({ windowMs, limit, standardHeaders: 'draft-7', legacyHeaders: false, skip: () => config.env === 'test' });

export async function createApp() {
  await ensureDirs();
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // one proxy hop (Render), so rate limits see the real client IP

  // The frontend lives on another origin, so uploaded evidence must be embeddable cross-origin.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', async (req, res) => {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  });

  app.use('/uploads', express.static(config.uploadDir, {
    index: false,
    dotfiles: 'deny',
    maxAge: '7d',
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  }));

  app.use('/api/auth/login', limiter(15 * 60 * 1000, 20));
  app.use('/api/auth/register', limiter(60 * 60 * 1000, 10));

  app.use('/api/auth', authRoutes);
  app.use('/api', referenceRoutes);
  app.use('/api/verify', verifyRoutes);
  app.use('/api/passport', passportRoutes);
  app.use('/api/bootstrap', bootstrapRoutes);
  app.use('/api/feedback', feedbackRoutes);
  app.use('/api/skills', skillRoutes);
  app.use('/api/sus', susRoutes);
  app.use('/api', jobRoutes);
  app.use('/api/evidence', evidenceRoutes);
  app.use('/api/credentials', credentialRoutes);
  app.use('/api/attempts', attemptRoutes);
  app.use('/api/trainer', trainerRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
