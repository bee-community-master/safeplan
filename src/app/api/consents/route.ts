import { CURRENT_CONSENT_VERSION, consentRequestSchema } from '@/lib/consent';
import { assertOwnsCase } from '@/server/auth/ownership';
import { updateDb } from '@/server/db/local-store';
import { jsonError, jsonOk } from '@/server/http';
import { id, safeMetadataHash } from '@/server/security/crypto';

export async function POST(request: Request) {
  try {
    const body = consentRequestSchema.parse(await request.json());
    await assertOwnsCase(body.caseId);
    const now = new Date().toISOString();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
    const ua = request.headers.get('user-agent');
    const records = await updateDb((db) => {
      const created = [];
      for (const consentType of body.consentTypes) {
        if (db.consentRecords.some((item) => item.caseId === body.caseId && item.consentType === consentType && item.version === CURRENT_CONSENT_VERSION)) continue;
        const record = {
          id: id('consent'),
          caseId: body.caseId,
          consentType,
          version: CURRENT_CONSENT_VERSION,
          acceptedAt: now,
          ipHash: safeMetadataHash(ip),
          userAgentHash: safeMetadataHash(ua)
        };
        db.consentRecords.push(record);
        created.push(record);
      }
      const caseRecord = db.cases.find((item) => item.id === body.caseId);
      db.auditEvents.push({ id: id('audit'), userId: caseRecord?.userId ?? null, caseId: body.caseId, type: 'consent.accepted', metadataJson: { consentTypes: body.consentTypes, version: CURRENT_CONSENT_VERSION }, createdAt: now });
      return created;
    });
    return jsonOk({
      consents: records.map((record) => ({
        id: record.id,
        consentType: record.consentType,
        version: record.version,
        acceptedAt: record.acceptedAt
      }))
    });
  } catch (error) {
    return jsonError(error, 400);
  }
}
