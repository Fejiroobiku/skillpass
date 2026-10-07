import { useCallback, useEffect, useState } from 'react';
import { api, messageOf } from './client';
import type { PublicCredential, PublicPassportData } from './types';

type Status = 'idle' | 'loading' | 'found' | 'missing' | 'error';

function usePublicResource<T>(path: string | null, pick: (r: any) => T, nonce = 0) {
  const [state, setState] = useState<{status: Status;data: T | null;error: string | null;}>({ status: 'idle', data: null, error: null });

  const load = useCallback(async () => {
    if (!path) return setState({ status: 'idle', data: null, error: null });
    setState((s) => ({ ...s, status: 'loading' }));
    try {
      setState({ status: 'found', data: pick(await api.get(path)), error: null });
    } catch (e) {
      const missing = (e as {status?: number;}).status === 404;
      setState({ status: missing ? 'missing' : 'error', data: null, error: missing ? null : messageOf(e) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  useEffect(() => {void load();}, [load, nonce]);
  return { ...state, reload: load };
}

/** The public view of a credential, from the server. Works without signing in. */
export const useVerifiedCredential = (id: string | null, nonce = 0) =>
usePublicResource<PublicCredential>(id ? `/api/verify/${encodeURIComponent(id)}` : null, (r) => r.credential, nonce);

export const usePassport = (id: string | null) =>
usePublicResource<PublicPassportData>(id ? `/api/passport/${encodeURIComponent(id)}` : null, (r) => r.passport);
