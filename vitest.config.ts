import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// These tests talk to the REAL backend. globalSetup resets a test database and starts the API on port 4100.
export default defineConfig({
  plugins: [react()],
  test: {
    globalSetup: ['./src/test/globalSetup.ts'],
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/test/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    environmentMatchGlobs: [['src/test/**/*.node.test.ts', 'node']],
    env: { VITE_API_URL: 'http://127.0.0.1:4100', VITE_DEMO_MODE: 'false' },
    testTimeout: 20000,
    hookTimeout: 60000,
    fileParallelism: false
  }
});
