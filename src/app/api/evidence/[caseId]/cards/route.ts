import { assertOwnsCase } from '@/server/auth/ownership';
import { readDb } from '@/server/db/local-store';
import { jsonError, jsonOk } from '@/server/http';

export async function GET(_: Request, { params }: { params: Promise<{ caseId: string }> }) {
  try {
    const { caseId } = await params;
    await assertOwnsCase(caseId);
    const db = await readDb();
    const cards = db.evidenceCards.filter((card) => card.caseId === caseId && card.deletedAt === null);
    return jsonOk({ cards });
  } catch (error) {
    return jsonError(error, 403);
  }
}
