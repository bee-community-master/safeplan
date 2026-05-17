import 'server-only';
import { getSessionId } from './session';
import { readDb } from '@/server/db/local-store';

export async function assertOwnsCase(caseId: string): Promise<{ sessionId: string; userId: string }> {
  const sessionId = await getSessionId();
  if (!sessionId) throw new Error('UNAUTHORIZED');
  const db = await readDb();
  const record = db.cases.find((item) => item.id === caseId && item.deletedAt === null);
  if (!record || record.sessionId !== sessionId) throw new Error('FORBIDDEN');
  return { sessionId, userId: record.userId };
}

export async function assertOwnsReport(reportId: string): Promise<{ caseId: string; userId: string }> {
  const db = await readDb();
  const report = db.reports.find((item) => item.id === reportId && item.deletedAt === null);
  if (!report) throw new Error('NOT_FOUND');
  const ownership = await assertOwnsCase(report.caseId);
  return { caseId: report.caseId, userId: ownership.userId };
}
