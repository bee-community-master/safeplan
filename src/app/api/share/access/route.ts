import { jsonError, jsonOk } from '@/server/http';
import { resolveShareToken } from '@/server/reports/report-service';
import { buildSharedReportPayload } from '@/server/reports/share-payload';

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { token?: unknown; password?: unknown };
    if (typeof body.token !== 'string' || body.token.length < 16) throw new Error('share_not_found');
    const password = typeof body.password === 'string' ? body.password : null;
    const resolved = await resolveShareToken(body.token, password);
    if (resolved.status === 'password_required') return jsonError(new Error('share_password_required'), 401);
    if (resolved.status === 'password_invalid') return jsonError(new Error('share_password_invalid'), 401);
    if (resolved.status === 'expired') return jsonError(new Error('share_expired'), 410);
    if (resolved.status !== 'ok') return jsonError(new Error('share_not_found'), 404);

    return jsonOk({ report: await buildSharedReportPayload(resolved.report) });
  } catch (error) {
    return jsonError(error, 400);
  }
}
