import { jsonError, jsonOk } from '@/server/http';
import { readDb } from '@/server/db/local-store';
import { resolveShareToken } from '@/server/reports/report-service';

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

    const db = await readDb();
    const cards = db.evidenceCards
      .filter((card) => card.caseId === resolved.report.caseId && card.deletedAt === null && card.userConfirmed && card.includeInReport)
      .map((card) => ({
        id: card.id,
        title: card.title,
        dateCandidate: card.dateCandidate,
        confidenceLevel: card.confidenceLevel,
        summaryKo: card.summaryKo
      }));
    const fileCount = db.evidenceFiles.filter((file) => file.caseId === resolved.report.caseId && file.deletedAt === null).length;
    return jsonOk({ report: { cards, fileCount } });
  } catch (error) {
    return jsonError(error, 400);
  }
}
