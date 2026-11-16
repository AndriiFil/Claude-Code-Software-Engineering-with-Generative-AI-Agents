import type { Cell, Dataset } from './types';

/**
 * Self-contained share links.
 *
 * The whole snapshot is deflate-compressed and base64url-encoded into the URL
 * *fragment* (after "#"). Browsers never send the fragment to a server, so the
 * link works without a backend and the data never touches one. The trade-off:
 * a link can't be revoked — it can only expire (the expiry is checked by the viewer).
 */

export interface SharePayload {
  v: 1;
  title: string;
  subtitle: string;
  columns: string[];
  currencyColumns: number[];
  rows: Cell[][];
  highlights: { label: string; value: string }[];
  createdAt: string;
  expiresAt: string | null;
  redacted: boolean;
  /** Optional note from the sender. */
  note?: string;
}

/** Replace free-text descriptions with a placeholder so a link can be shared without personal details. */
export function redactDataset(ds: Dataset): Dataset {
  const textCols = ds.columns
    .map((c, i) => (/description|largest expense/i.test(c) ? i : -1))
    .filter((i) => i >= 0);
  return {
    ...ds,
    rows: ds.rows.map((row) => row.map((cell, i) => (textCols.includes(i) && typeof cell === 'string' && cell && !/subtotal|items?$/i.test(cell) ? '•••' : cell))),
  };
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

export async function encodeSharePayload(payload: SharePayload): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(payload));
  if (typeof CompressionStream === 'undefined') return 'j.' + toBase64Url(json);
  return 'z.' + toBase64Url(await pipe(json, new CompressionStream('deflate-raw')));
}

export async function decodeSharePayload(fragment: string): Promise<SharePayload> {
  const [kind, data] = fragment.replace(/^#/, '').split('.', 2);
  if (!data) throw new Error('This link is incomplete.');
  let bytes = fromBase64Url(data);
  if (kind === 'z') bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
  else if (kind !== 'j') throw new Error('Unsupported link format.');
  const payload = JSON.parse(new TextDecoder().decode(bytes)) as SharePayload;
  if (payload.v !== 1 || !Array.isArray(payload.rows)) throw new Error('Unsupported link version.');
  return payload;
}

export function buildShareUrl(origin: string, encoded: string): string {
  return `${origin}/shared#${encoded}`;
}

/** QR codes become unreadable for phone cameras well before the spec's ~2.9 KB limit. */
export const QR_MAX_URL_LENGTH = 1800;
