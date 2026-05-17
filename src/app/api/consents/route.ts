import { z } from 'zod';
import { assertOwnsCase } from '@/server/auth/ownership';
import { updateDb } from '@/server/db/local-store';
import { jsonError, jsonOk } from '@/server/http';
import { id, safeMetadataHash } from '@/server/security/crypto';

const schema = z.object({
  caseId: z.string(),
  consentTypes: z.array(z.enum(['ai_processing', 'sensitive_data', 'overseas_transfer', 'payment', 'original_evidence'])),
  version: z.string().default('2026-05-17')
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    await assertOwnsCase(body.caseId);
    const now = new Date().toISOString();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
    const ua = request.headers.get('user-agent');
    const records = await updateDb((db) => {
      const created = [];
      for (const consentType of body.consentTypes) {
        if (db.consentRecords.some((item) => item.caseId === body.caseId && item.consentType === consentType)) continue;
        const record = {
          id: id('consent'),
          caseId: body.caseId,
          consentType,
          version: body.version,
          acceptedAt: now,
          ipHash: safeMetadataHash(ip),
          userAgentHash: safeMetadataHash(ua)
        };
        db.consentRecords.push(record);
        created.push(record);
      }
      const caseRecord = db.cases.find((item) => item.id === body.caseId);
      db.auditEvents.push({ id: id('audit'), userId: caseRecord?.userId ?? null, caseId: body.caseId, type: 'consent.accepted', metadataJson: { consentTypes: body.consentTypes, version: body.version }, createdAt: now });
      return created;
    });
    return jsonOk({ consents: records });
  } catch (error) {
    return jsonError(error, 400);
  }
}
