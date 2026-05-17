import { jsonOk } from '@/server/http';

export async function GET() {
  return jsonOk({ ok: true, service: 'safeplan-web' });
}
