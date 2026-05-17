import 'server-only';
import { cookies } from 'next/headers';
import { isProductionApp } from '@/lib/runtime';
import { randomToken, signValue, verifySignedValue } from '@/server/security/crypto';

const COOKIE_NAME = 'safeplan_session';
const COOKIE_VERSION = 'v1';

function packSession(sessionId: string): string {
  return `${COOKIE_VERSION}.${sessionId}.${signValue(sessionId)}`;
}

function unpackSession(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;
  const [version, sessionId, signature] = cookieValue.split('.');
  if (version === COOKIE_VERSION && sessionId && signature && verifySignedValue(sessionId, signature)) return sessionId;
  if (!isProductionApp() && cookieValue && !cookieValue.includes('.')) return cookieValue;
  return null;
}

export async function getSessionId(): Promise<string | null> {
  return unpackSession((await cookies()).get(COOKIE_NAME)?.value);
}

export async function getOrCreateSessionId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = unpackSession(cookieStore.get(COOKIE_NAME)?.value);
  if (existing) return existing;
  const sessionId = randomToken(24);
  cookieStore.set(COOKIE_NAME, packSession(sessionId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365
  });
  return sessionId;
}
