import { mkdtemp, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { beforeEach, describe, expect, it } from 'vitest';
import { CURRENT_CONSENT_VERSION } from '@/lib/consent';
import { bytesFromMb } from '@/lib/evidence';
import { createAnonymousCase } from '@/server/db/cases';
import { updateDb, resetLocalDbCache, readDb, dataDir } from '@/server/db/local-store';
import { storeEvidenceFiles, toEvidenceFileUploadSummary } from '@/server/files/local';
import { createPaymentIntent, completeMockPayment, toPaymentStatusDto } from '@/server/payments/provider';
import { enqueueProcessingJob, processCaseTimeline } from '@/server/ai/timeline-orchestrator';
import { generateReport, createShareLink, resolveShareToken, revokeShareLink, readReportPdf, toShareLinkSummary, toReportSummary } from '@/server/reports/report-service';
import { buildSharedReportPayload } from '@/server/reports/share-payload';
import { deleteCaseDeep } from '@/server/db/deletion';
import { sha256Hex } from '@/server/security/crypto';

let dir: string;

beforeEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
  dir = await mkdtemp(path.join(tmpdir(), 'safeplan-test-'));
  process.env.SAFEPLAN_DATA_DIR = dir;
  process.env.AI_PROVIDER_MODE = 'mock';
  delete process.env.SAFEPLAN_TEST_REPORT_PERSIST_DELAY_MS;
  delete process.env.SAFEPLAN_TEST_UPLOAD_PERSIST_DELAY_MS;
  resetLocalDbCache();
});

async function recordConsents(caseId: string, consentTypes: Array<'sensitive_data' | 'original_evidence' | 'ai_processing' | 'overseas_transfer' | 'payment'> = ['sensitive_data', 'original_evidence', 'ai_processing', 'overseas_transfer', 'payment']) {
  await updateDb((db) => {
    for (const consentType of consentTypes) {
      db.consentRecords.push({ id: `consent_${consentType}_${db.consentRecords.length}`, caseId, consentType, version: CURRENT_CONSENT_VERSION, acceptedAt: new Date().toISOString(), ipHash: sha256Hex('ip'), userAgentHash: sha256Hex('ua') });
    }
  });
}

async function payCase(caseId: string) {
  const payment = await createPaymentIntent(caseId);
  return completeMockPayment(caseId, payment.paymentId);
}

async function listLocalObjectFiles(root = path.join(dataDir(), 'objects')): Promise<string[]> {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map((entry) => {
        const fullPath = path.join(root, entry.name);
        return entry.isDirectory() ? listLocalObjectFiles(fullPath) : Promise.resolve([fullPath]);
      })
    );
    return nested.flat();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

describe('local happy path services', () => {
  it('rejects uploads when declared size does not match actual decoded bytes', async () => {
    const caseRecord = await createAnonymousCase('session-upload-size');
    await expect(
      storeEvidenceFiles(caseRecord.id, [
        {
          name: 'forged.txt',
          mimeType: 'text/plain',
          sizeBytes: 1,
          contentBase64: Buffer.from('실제 업로드 내용은 더 깁니다.').toString('base64')
        }
      ])
    ).rejects.toThrow('파일 크기 정보가 실제 업로드와 일치하지 않습니다.');
  });

  it('gates processing by consent/payment, creates report/share, then deletes deeply', async () => {
    const caseRecord = await createAnonymousCase('session-test');
    const sampleContent = Buffer.from('생활비를 끊겠다는 메시지와 날짜 2026-05-01');
    const stored = await storeEvidenceFiles(caseRecord.id, [
      { name: 'sample.txt', mimeType: 'text/plain', sizeBytes: sampleContent.byteLength, contentBase64: sampleContent.toString('base64') }
    ]);
    expect(toEvidenceFileUploadSummary(stored[0]!)).not.toHaveProperty('encryptedDek');
    expect(toEvidenceFileUploadSummary(stored[0]!)).not.toHaveProperty('gcsObject');
    await enqueueProcessingJob(caseRecord.id);
    await expect(processCaseTimeline(caseRecord.id)).rejects.toThrow('payment_required');
    await recordConsents(caseRecord.id);
    const paid = await payCase(caseRecord.id);
    expect(toPaymentStatusDto(paid)).not.toHaveProperty('providerPaymentKey');
    const paidAgain = await completeMockPayment(caseRecord.id, paid.id);
    expect(paidAgain.paidAt).toBe(paid.paidAt);
    const processed = await processCaseTimeline(caseRecord.id);
    expect(processed.cardCount).toBe(1);
    await updateDb((db) => {
      const card = db.evidenceCards[0]!;
      card.userConfirmed = true;
      card.includeInReport = true;
    });
    const report = await generateReport(caseRecord.id);
    expect(toReportSummary(report)).not.toHaveProperty('pdfObject');
    expect(toReportSummary(report)).not.toHaveProperty('snapshotJson');
    const pdf = await readReportPdf(report.id);
    expect(pdf.pdf.subarray(0, 4).toString()).toBe('%PDF');
    const share = await createShareLink(report.id);
    const resolved = await resolveShareToken(share.token);
    expect(resolved.status).toBe('ok');
    const protectedShare = await createShareLink(report.id, 'safe-pass-123');
    expect(toShareLinkSummary(protectedShare.share)).not.toHaveProperty('tokenHash');
    expect(toShareLinkSummary(protectedShare.share)).not.toHaveProperty('passwordHash');
    expect((await resolveShareToken(protectedShare.token)).status).toBe('password_required');
    expect((await resolveShareToken(protectedShare.token, 'wrong-pass')).status).toBe('password_invalid');
    expect((await resolveShareToken(protectedShare.token, 'safe-pass-123')).status).toBe('ok');
    await revokeShareLink(share.share.id);
    expect((await resolveShareToken(share.token)).status).toBe('not_found');
    const deleted = await deleteCaseDeep(caseRecord.id);
    expect(deleted.deletedFiles).toBe(1);
    expect(deleted.deletedCards).toBe(1);
    expect(deleted.deletedReports).toBe(1);
    expect(deleted.revokedShares).toBe(1);
    expect((await resolveShareToken(protectedShare.token, 'safe-pass-123')).status).toBe('not_found');
    const afterDelete = await readDb();
    const deletedJson = JSON.stringify({
      files: afterDelete.evidenceFiles,
      cards: afterDelete.evidenceCards,
      reports: afterDelete.reports,
      extractions: afterDelete.extractionResults,
      shares: afterDelete.shareLinks
    });
    expect(deletedJson).not.toContain('sample.txt');
    expect(deletedJson).not.toContain('생활비를 끊겠다는 메시지');
    expect(deletedJson).not.toContain('자료 초안');
    expect(deletedJson).not.toContain('safe-pass-123');
  });

  it('enforces cumulative upload limits for a case', async () => {
    const caseRecord = await createAnonymousCase('session-upload-limit');
    const files = Array.from({ length: 20 }, (_, index) => {
      const content = Buffer.from(`자료 ${index}`);
      return { name: `sample-${index}.txt`, mimeType: 'text/plain', sizeBytes: content.byteLength, contentBase64: content.toString('base64') };
    });
    await storeEvidenceFiles(caseRecord.id, files);
    const extra = Buffer.from('추가 자료');
    await expect(storeEvidenceFiles(caseRecord.id, [{ name: 'extra.txt', mimeType: 'text/plain', sizeBytes: extra.byteLength, contentBase64: extra.toString('base64') }])).rejects.toThrow('최대 20개');

    const secondCase = await createAnonymousCase('session-upload-bytes');
    await updateDb((db) => {
      db.evidenceFiles.push({
        id: 'file_existing_large',
        caseId: secondCase.id,
        originalName: 'existing.txt',
        mimeType: 'text/plain',
        sizeBytes: bytesFromMb(100),
        gcsBucket: 'local-originals',
        gcsObject: 'existing',
        encryptedDek: 'not-used-in-test',
        checksumSha256: 'not-used-in-test',
        materialType: 'text_note',
        processingStatus: 'uploaded',
        userMemo: null,
        uploadedAt: new Date().toISOString(),
        deletedAt: null
      });
    });
    const tiny = Buffer.from('초과');
    await expect(storeEvidenceFiles(secondCase.id, [{ name: 'tiny.txt', mimeType: 'text/plain', sizeBytes: tiny.byteLength, contentBase64: tiny.toString('base64') }])).rejects.toThrow('총 업로드 용량');
  });

  it('requires payment consent before payment creation and all AI consents before processing', async () => {
    const caseRecord = await createAnonymousCase('session-consent-gate');
    const sampleContent = Buffer.from('2026-05-01 자료');
    await storeEvidenceFiles(caseRecord.id, [{ name: 'sample.txt', mimeType: 'text/plain', sizeBytes: sampleContent.byteLength, contentBase64: sampleContent.toString('base64') }]);
    await expect(createPaymentIntent(caseRecord.id)).rejects.toThrow('payment_consent_required');
    await updateDb((db) => {
      db.consentRecords.push({ id: 'stale_payment_consent', caseId: caseRecord.id, consentType: 'payment', version: 'old-version', acceptedAt: new Date().toISOString(), ipHash: null, userAgentHash: null });
    });
    await expect(createPaymentIntent(caseRecord.id)).rejects.toThrow('payment_consent_required');

    await recordConsents(caseRecord.id, ['sensitive_data', 'original_evidence', 'ai_processing', 'payment']);
    await payCase(caseRecord.id);
    await expect(processCaseTimeline(caseRecord.id)).rejects.toThrow('consent_required');
  });

  it('uses photo file title dates instead of upload or today fallback dates', async () => {
    const caseRecord = await createAnonymousCase('session-photo-date');
    const content = Buffer.from('mock jpeg body without exif date');
    await storeEvidenceFiles(caseRecord.id, [
      { name: 'KakaoTalk_20240418_101010.jpg', mimeType: 'image/jpeg', sizeBytes: content.byteLength, contentBase64: content.toString('base64') }
    ]);
    await recordConsents(caseRecord.id);
    await payCase(caseRecord.id);
    await processCaseTimeline(caseRecord.id);

    const db = await readDb();
    const card = db.evidenceCards.find((item) => item.caseId === caseRecord.id)!;
    expect(card.dateCandidate).toBe('2024-04-18');
    expect(card.dateSource).toBe('metadata');
    expect(JSON.stringify(card.aiDraftJson)).toContain('"sourceDetail":"filename"');
    expect(card.dateCandidate).not.toBe(new Date().toISOString().slice(0, 10));
  });

  it('serves share links from an immutable report snapshot', async () => {
    const caseRecord = await createAnonymousCase('session-report-snapshot');
    const firstContent = Buffer.from('2026-05-01 생활비 자료');
    const secondContent = Buffer.from('2026-05-02 제외할 메모');
    const files = await storeEvidenceFiles(caseRecord.id, [
      { name: 'included.txt', mimeType: 'text/plain', sizeBytes: firstContent.byteLength, contentBase64: firstContent.toString('base64') },
      { name: 'excluded.txt', mimeType: 'text/plain', sizeBytes: secondContent.byteLength, contentBase64: secondContent.toString('base64') }
    ]);
    await recordConsents(caseRecord.id);
    await payCase(caseRecord.id);
    await processCaseTimeline(caseRecord.id);
    await updateDb((db) => {
      const cards = db.evidenceCards.filter((card) => card.caseId === caseRecord.id);
      const included = cards.find((card) => card.fileId === files[0]!.id)!;
      included.userConfirmed = true;
      included.includeInReport = true;
      included.title = '처음 생성한 제목';
      const excluded = cards.find((card) => card.fileId === files[1]!.id)!;
      excluded.userConfirmed = true;
      excluded.includeInReport = false;
    });
    const report = await generateReport(caseRecord.id);
    expect(report.snapshotJson.cards).toHaveLength(1);
    expect(report.snapshotJson.fileCount).toBe(1);
    expect(report.snapshotJson.includedFileIds).toEqual([files[0]!.id]);

    await updateDb((db) => {
      for (const card of db.evidenceCards.filter((item) => item.caseId === caseRecord.id)) {
        card.title = '나중에 수정한 제목';
        card.includeInReport = true;
      }
    });
    const payload = await buildSharedReportPayload(report);
    expect(payload.cards).toHaveLength(1);
    expect(payload.cards[0]?.title).toBe('처음 생성한 제목');
    await expect(buildSharedReportPayload({ ...report, snapshotJson: { malformed: true } as never })).rejects.toThrow('report_snapshot_unavailable');
  });

  it('rejects report persistence when reviewed cards change during PDF generation', async () => {
    const caseRecord = await createAnonymousCase('session-report-race');
    const content = Buffer.from('리포트 race 자료');
    await storeEvidenceFiles(caseRecord.id, [{ name: 'race.txt', mimeType: 'text/plain', sizeBytes: content.byteLength, contentBase64: content.toString('base64') }]);
    await recordConsents(caseRecord.id);
    await payCase(caseRecord.id);
    await processCaseTimeline(caseRecord.id);
    await updateDb((db) => {
      const card = db.evidenceCards.find((item) => item.caseId === caseRecord.id)!;
      card.userConfirmed = true;
      card.includeInReport = true;
      card.updatedAt = new Date().toISOString();
    });
    process.env.SAFEPLAN_TEST_REPORT_PERSIST_DELAY_MS = '25';
    const pending = generateReport(caseRecord.id);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await updateDb((db) => {
      const card = db.evidenceCards.find((item) => item.caseId === caseRecord.id)!;
      card.title = '변경된 제목';
      card.updatedAt = new Date().toISOString();
    });
    await expect(pending).rejects.toThrow('report_input_changed');
    delete process.env.SAFEPLAN_TEST_REPORT_PERSIST_DELAY_MS;
    const db = await readDb();
    expect(db.reports.filter((report) => report.caseId === caseRecord.id && report.deletedAt === null)).toHaveLength(0);
  });

  it('keeps object keys unique and processing idempotent', async () => {
    const caseRecord = await createAnonymousCase('session-idempotent');
    const first = Buffer.from('동일 파일명 첫 번째');
    const second = Buffer.from('동일 파일명 두 번째');
    const files = await storeEvidenceFiles(caseRecord.id, [
      { name: 'same.txt', mimeType: 'text/plain', sizeBytes: first.byteLength, contentBase64: first.toString('base64') },
      { name: 'same.txt', mimeType: 'text/plain', sizeBytes: second.byteLength, contentBase64: second.toString('base64') }
    ]);
    expect(new Set(files.map((file) => file.gcsObject)).size).toBe(2);
    expect(files.every((file) => !file.gcsObject.includes('same.txt'))).toBe(true);
    await recordConsents(caseRecord.id);
    await payCase(caseRecord.id);
    await Promise.all([processCaseTimeline(caseRecord.id), processCaseTimeline(caseRecord.id)]);
    const db = await readDb();
    expect(db.evidenceCards.filter((card) => card.caseId === caseRecord.id && card.deletedAt === null)).toHaveLength(2);
  });

  it('does not persist processing results after a case is deleted', async () => {
    const caseRecord = await createAnonymousCase('session-delete-race');
    const content = Buffer.from('삭제 race 자료');
    await storeEvidenceFiles(caseRecord.id, [{ name: 'race.txt', mimeType: 'text/plain', sizeBytes: content.byteLength, contentBase64: content.toString('base64') }]);
    await recordConsents(caseRecord.id);
    await payCase(caseRecord.id);
    await enqueueProcessingJob(caseRecord.id);
    await deleteCaseDeep(caseRecord.id);
    await expect(processCaseTimeline(caseRecord.id)).rejects.toThrow('case_not_found');
    const db = await readDb();
    expect(db.evidenceCards.filter((card) => card.caseId === caseRecord.id && card.deletedAt === null)).toHaveLength(0);
    expect(db.extractionResults.some((extraction) => extraction.normalizedText?.includes('삭제 race 자료'))).toBe(false);
  });

  it('cleans up encrypted upload objects when deletion wins before upload persistence', async () => {
    const caseRecord = await createAnonymousCase('session-upload-delete-race');
    const content = Buffer.from('삭제 중 업로드된 자료');
    process.env.SAFEPLAN_TEST_UPLOAD_PERSIST_DELAY_MS = '25';
    const pendingUpload = storeEvidenceFiles(caseRecord.id, [{ name: 'race-upload.txt', mimeType: 'text/plain', sizeBytes: content.byteLength, contentBase64: content.toString('base64') }]);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await deleteCaseDeep(caseRecord.id);

    await expect(pendingUpload).rejects.toThrow('case_not_found');
    delete process.env.SAFEPLAN_TEST_UPLOAD_PERSIST_DELAY_MS;
    const db = await readDb();
    expect(db.evidenceFiles.filter((file) => file.caseId === caseRecord.id && file.deletedAt === null)).toHaveLength(0);
    expect(await listLocalObjectFiles()).toHaveLength(0);
  });

  it('rejects payment and job mutations after a case is deleted', async () => {
    const caseRecord = await createAnonymousCase('session-mutator-delete');
    await recordConsents(caseRecord.id);
    const payment = await createPaymentIntent(caseRecord.id);
    await deleteCaseDeep(caseRecord.id);

    await expect(completeMockPayment(caseRecord.id, payment.paymentId)).rejects.toThrow('case_not_found');
    await expect(createPaymentIntent(caseRecord.id)).rejects.toThrow('case_not_found');
    await expect(enqueueProcessingJob(caseRecord.id)).rejects.toThrow('case_not_found');

    const db = await readDb();
    expect(db.cases.find((item) => item.id === caseRecord.id)?.status).toBe('deleted');
    expect(db.paymentIntents.find((item) => item.id === payment.paymentId)?.status).toBe('created');
  });
});
