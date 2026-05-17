import type { EvidenceCardReviewDto } from '@/lib/evidence-card-dto';
import { assertOwnsCase } from '@/server/auth/ownership';
import { readDb } from '@/server/db/local-store';
import { jsonError, jsonOk } from '@/server/http';

export async function GET(_: Request, { params }: { params: Promise<{ caseId: string }> }) {
  try {
    const { caseId } = await params;
    await assertOwnsCase(caseId);
    const db = await readDb();
    const cards: EvidenceCardReviewDto[] = db.evidenceCards
      .filter((card) => card.caseId === caseId && card.deletedAt === null)
      .map((card) => ({
        id: card.id,
        title: card.title,
        summaryKo: card.summaryKo,
        dateCandidate: card.dateCandidate,
        userMemo: card.userMemo,
        confidenceLevel: card.confidenceLevel,
        includeInReport: card.includeInReport,
        userConfirmed: card.userConfirmed
      }));
    return jsonOk({ cards });
  } catch (error) {
    return jsonError(error, 403);
  }
}
