import { createApp } from './app.js';
import { config } from './config.js';
import { pool } from './db.js';

const app = await createApp();
const server = app.listen(config.port, () => {
  console.log(`SkillPass API listening on port ${config.port} (${config.env})`);
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
