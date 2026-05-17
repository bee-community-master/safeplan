import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { beforeEach, describe, expect, it } from 'vitest';
import { createAnonymousCase } from '@/server/db/cases';
import { updateDb, resetLocalDbCache } from '@/server/db/local-store';
import { storeEvidenceFiles } from '@/server/files/local';
import { createPaymentIntent, completeMockPayment } from '@/server/payments/provider';
import { enqueueProcessingJob, processCaseTimeline } from '@/server/ai/timeline-orchestrator';
import { generateReport, createShareLink, resolveShareToken, revokeShareLink, readReportPdf } from '@/server/reports/report-service';
import { deleteCaseDeep } from '@/server/db/deletion';
import { sha256Hex } from '@/server/security/crypto';

let dir: string;

beforeEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
  dir = await mkdtemp(path.join(tmpdir(), 'safeplan-test-'));
  process.env.SAFEPLAN_DATA_DIR = dir;
  process.env.AI_PROVIDER_MODE = 'mock';
  resetLocalDbCache();
});

describe('local happy path services', () => {
  it('gates processing by consent/payment, creates report/share, then deletes deeply', async () => {
    const caseRecord = await createAnonymousCase('session-test');
    await storeEvidenceFiles(caseRecord.id, [
      { name: 'sample.txt', mimeType: 'text/plain', sizeBytes: 40, contentBase64: Buffer.from('생활비를 끊겠다는 메시지와 날짜 2026-05-01').toString('base64') }
    ]);
    await enqueueProcessingJob(caseRecord.id);
    await expect(processCaseTimeline(caseRecord.id)).rejects.toThrow('payment_required');
    await updateDb((db) => {
      for (const consentType of ['sensitive_data', 'original_evidence', 'ai_processing', 'overseas_transfer', 'payment'] as const) {
        db.consentRecords.push({ id: `consent_${consentType}`, caseId: caseRecord.id, consentType, version: 'test', acceptedAt: new Date().toISOString(), ipHash: sha256Hex('ip'), userAgentHash: sha256Hex('ua') });
      }
    });
    const payment = await createPaymentIntent(caseRecord.id);
    await completeMockPayment(caseRecord.id, payment.paymentId);
    const processed = await processCaseTimeline(caseRecord.id);
    expect(processed.cardCount).toBe(1);
    await updateDb((db) => {
      const card = db.evidenceCards[0]!;
      card.userConfirmed = true;
      card.includeInReport = true;
    });
    const report = await generateReport(caseRecord.id);
    const pdf = await readReportPdf(report.id);
    expect(pdf.pdf.subarray(0, 4).toString()).toBe('%PDF');
    const share = await createShareLink(report.id);
    const resolved = await resolveShareToken(share.token);
    expect(resolved.status).toBe('ok');
    const protectedShare = await createShareLink(report.id, 'safe-pass-123');
    expect((await resolveShareToken(protectedShare.token)).status).toBe('password_required');
    expect((await resolveShareToken(protectedShare.token, 'wrong-pass')).status).toBe('password_invalid');
    expect((await resolveShareToken(protectedShare.token, 'safe-pass-123')).status).toBe('ok');
    await revokeShareLink(share.share.id);
    expect((await resolveShareToken(share.token)).status).toBe('not_found');
    const deleted = await deleteCaseDeep(caseRecord.id);
    expect(deleted.deletedFiles).toBe(1);
    expect(deleted.deletedCards).toBe(1);
    expect(deleted.deletedReports).toBe(1);
  });
});
