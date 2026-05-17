import 'server-only';
import { cookies } from 'next/headers';
import { randomToken } from '@/server/security/crypto';

const COOKIE_NAME = 'safeplan_session';

export async function getSessionId(): Promise<string | null> {
  return (await cookies()).get(COOKIE_NAME)?.value ?? null;
}

export async function getOrCreateSessionId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(COOKIE_NAME)?.value;
  if (existing) return existing;
  const sessionId = randomToken(24);
  cookieStore.set(COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365
  });
  return sessionId;
}
