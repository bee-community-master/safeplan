import 'server-only';
import type { SharedReportPayload } from '@/lib/share';
import { readDb } from '@/server/db/local-store';
import type { ReportRecord } from '@/server/db/types';

export async function buildSharedReportPayload(report: ReportRecord): Promise<SharedReportPayload> {
  const db = await readDb();
  const cards = db.evidenceCards
    .filter((card) => card.caseId === report.caseId && card.deletedAt === null && card.userConfirmed && card.includeInReport)
    .map((card) => ({
      id: card.id,
      title: card.title,
      dateCandidate: card.dateCandidate,
      confidenceLevel: card.confidenceLevel,
      summaryKo: card.summaryKo
    }));
  const fileCount = db.evidenceFiles.filter((file) => file.caseId === report.caseId && file.deletedAt === null).length;
  return { cards, fileCount };
}
