// Configuration in the page address (#c=…): the link recreates the same notebook.
import type { NotebookConfig } from './config';
import { normalizeConfig } from './normalize';

const PARAM = 'c';

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function encodeConfig(cfg: NotebookConfig): string {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(cfg)));
}

export function decodeConfig(s: string): NotebookConfig | null {
  try {
    return normalizeConfig(JSON.parse(new TextDecoder().decode(fromBase64Url(s))));
  } catch {
    return null;
  }
}

export function configFromHash(hash: string): NotebookConfig | null {
  const value = new URLSearchParams(hash.replace(/^#/, '')).get(PARAM);
  return value ? decodeConfig(value) : null;
}

export function shareUrl(cfg: NotebookConfig, base: string): string {
  const url = new URL(base);
  url.hash = `${PARAM}=${encodeConfig(cfg)}`;
  return url.toString();
}
