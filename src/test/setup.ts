import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { setToken } from '../api/client';

afterEach(() => {
  cleanup();
  setToken(null);
  try {window.localStorage.clear();} catch {/* node environment has no storage */}
});
