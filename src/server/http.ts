import 'server-only';
import { NextResponse } from 'next/server';

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : String(error);
  const safeMessage = message.includes('secret') ? '요청 처리 중 오류가 발생했습니다.' : message;
  return NextResponse.json({ error: safeMessage }, { status });
}
