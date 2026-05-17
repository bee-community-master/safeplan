import { z } from 'zod';
import { assertOwnsCase } from '@/server/auth/ownership';
import { updateDb } from '@/server/db/local-store';
import { jsonError, jsonOk } from '@/server/http';
import { id } from '@/server/security/crypto';

const schema = z.object({
  title: z.string().min(1).max(120).optional(),
  summaryKo: z.string().min(1).max(2000).optional(),
  userMemo: z.string().max(1000).nullable().optional(),
  includeInReport: z.boolean().optional(),
  userConfirmed: z.boolean().optional(),
  dateCandidate: z.string().nullable().optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ cardId: string }> }) {
  try {
    const { cardId } = await params;
    const body = schema.parse(await request.json());
    const card = await updateDb(async (db) => {
      const record = db.evidenceCards.find((item) => item.id === cardId && item.deletedAt === null);
      if (!record) throw new Error('card_not_found');
      await assertOwnsCase(record.caseId);
      Object.assign(record, body, { updatedAt: new Date().toISOString() });
      db.auditEvents.push({ id: id('audit'), userId: db.cases.find((item) => item.id === record.caseId)?.userId ?? null, caseId: record.caseId, type: 'card.updated', metadataJson: { cardId: record.id, includeInReport: record.includeInReport, userConfirmed: record.userConfirmed }, createdAt: record.updatedAt });
      return record;
    });
    return jsonOk({ card });
  } catch (error) {
    return jsonError(error, 400);
  }
}
