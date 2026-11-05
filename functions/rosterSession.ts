import type { Env } from './types';

export const ROSTER_COOKIE = 'padel_roster';
const SESSION_DAYS = 30;

const encoder = new TextEncoder();

const bytesToHex = (bytes: Uint8Array): string =>
  [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');

const sha256 = async (value: string): Promise<Uint8Array> =>
  new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));

/** Fixed-length compare so the password check does not leak timing. */
const equalBytes = (a: Uint8Array, b: Uint8Array): boolean => {
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
};

export const passwordMatches = async (provided: string, expected: string): Promise<boolean> =>
  equalBytes(await sha256(provided), await sha256(expected));

const hmac = async (secret: string, message: string): Promise<string> => {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return bytesToHex(new Uint8Array(sig));
};

export const sessionCookie = async (password: string, request: Request): Promise<string> => {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60;
  const payload = `v1.${exp}`;
  const sig = await hmac(password, payload);
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${ROSTER_COOKIE}=${payload}.${sig}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_DAYS * 24 * 60 * 60}${secure}`;
};

export const clearedSessionCookie = (request: Request): string => {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${ROSTER_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`;
};

const readCookie = (request: Request, name: string): string | null => {
  const header = request.headers.get('Cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (rawKey === name) return rest.join('=');
  }
  return null;
};

export const isRosterAuthed = async (request: Request, env: Env): Promise<boolean> => {
  const password = env.ROSTER_PASSWORD;
  if (!password) return false;
  const token = readCookie(request, ROSTER_COOKIE);
  if (!token) return false;
  const match = token.match(/^v1\.(\d+)\.([0-9a-f]+)$/);
  if (!match) return false;
  const exp = Number(match[1]);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
  const expected = await hmac(password, `v1.${match[1]}`);
  return equalBytes(await sha256(expected), await sha256(match[2]));
};
