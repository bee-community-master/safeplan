import { assertOwnsCase } from '@/server/auth/ownership';
import { toCaseSummary } from '@/server/db/cases';
import { readDb } from '@/server/db/local-store';
import { deleteCaseDeep } from '@/server/db/deletion';
import { jsonError, jsonOk } from '@/server/http';

export async function GET(_: Request, { params }: { params: Promise<{ caseId: string }> }) {
  try {
    const { caseId } = await params;
    await assertOwnsCase(caseId);
    const db = await readDb();
    const caseRecord = db.cases.find((item) => item.id === caseId && item.deletedAt === null);
    if (!caseRecord) return jsonError(new Error('case_not_found'), 404);
    return jsonOk({ case: toCaseSummary(caseRecord) });
  } catch (error) {
    return jsonError(error, 403);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ caseId: string }> }) {
  try {
    const { caseId } = await params;
    await assertOwnsCase(caseId);
    const result = await deleteCaseDeep(caseId);
    return jsonOk({ deleted: true, result });
  } catch (error) {
    return jsonError(error, 403);
  }
}
