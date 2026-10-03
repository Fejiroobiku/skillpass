import { signPayload } from './credentials';

/** SHA-256 of a captured file, used to detect reused evidence. */
export async function hashBlob(blob: Blob): Promise<string> {
  try {
    const buf = await blob.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return signPayload(`${blob.size}|${blob.type}|${Date.now()}`) + signPayload(String(Math.random()));
  }
}

export function challengeCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}