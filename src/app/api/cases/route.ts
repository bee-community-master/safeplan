import { getOrCreateSessionId, getSessionId } from '@/server/auth/session';
import { createAnonymousCase, toCaseSummary } from '@/server/db/cases';
import { readDb } from '@/server/db/local-store';
import { jsonError, jsonOk } from '@/server/http';

export async function GET() {
  try {
    const sessionId = await getSessionId();
    if (!sessionId) return jsonOk({ cases: [] });
    const db = await readDb();
    const cases = db.cases
      .filter((caseRecord) => caseRecord.sessionId === sessionId && caseRecord.deletedAt === null)
      .map((caseRecord) => {
        const files = db.evidenceFiles.filter((file) => file.caseId === caseRecord.id && file.deletedAt === null);
        const cards = db.evidenceCards.filter((card) => card.caseId === caseRecord.id && card.deletedAt === null);
        const reports = db.reports.filter((report) => report.caseId === caseRecord.id && report.deletedAt === null);
        return {
          id: caseRecord.id,
          title: caseRecord.title,
          status: caseRecord.status,
          createdAt: caseRecord.createdAt,
          updatedAt: caseRecord.updatedAt,
          retentionUntil: caseRecord.retentionUntil,
          fileCount: files.length,
          cardCount: cards.length,
          reportCount: reports.length
        };
      });
    return jsonOk({ cases });
  } catch (error) {
    return jsonError(error, 400);
  }
}

export async function POST() {
  try {
    const caseRecord = await createAnonymousCase(await getOrCreateSessionId());
    return jsonOk({ case: toCaseSummary(caseRecord) });
  } catch (error) {
    return jsonError(error, 500);
  }
}
