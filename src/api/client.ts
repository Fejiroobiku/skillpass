/**
 * Thin wrapper around fetch for the SkillPass API.
 * It adds the sign-in token, turns failures into readable messages, and signs the person out if the server says
 * their session is no longer valid.
 */
const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const TOKEN_KEY = 'skillpass.token';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

let token: string | null = null;
try {
  token = window.localStorage.getItem(TOKEN_KEY);
} catch {
  token = null;
}

let onUnauthorized: (() => void) | null = null;

export const getToken = () => token;
export const demoMode = import.meta.env.VITE_DEMO_MODE === 'true';

export function setToken(next: string | null) {
  token = next;
  try {
    if (next) window.localStorage.setItem(TOKEN_KEY, next);else
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {

    /* storage unavailable: the session lasts until the tab closes */}
}

export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

async function request<T>(method: string, path: string, body?: unknown, form?: FormData): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  let payload: BodyInit | undefined;
  if (form) payload = form;else
  if (body !== undefined) {
    headers['content-type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  } catch {
    throw new ApiError(0, 'Cannot reach the SkillPass server. Check your connection and try again.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token && onUnauthorized) onUnauthorized();
    throw new ApiError(res.status, data?.error ?? 'Something went wrong. Please try again.');
  }
  return data as T;
}

export const api = {
  get: <T,>(path: string) => request<T>('GET', path),
  post: <T,>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T,>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  upload: <T,>(path: string, form: FormData) => request<T>('POST', path, undefined, form)
};

export const messageOf = (e: unknown) => e instanceof ApiError ? e.message : 'Something went wrong. Please try again.';
