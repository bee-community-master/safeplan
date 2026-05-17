import 'server-only';
import { imageDescriptionFromDraft } from '@/lib/ai-draft';
import { LIMITS } from '@/lib/constants';
import type { ReportSnapshot, ShareLinkSummaryDto } from '@/lib/share';
import { isProductionApp } from '@/lib/runtime';
import type { ReportRecord, ShareLinkRecord } from '@/server/db/types';
import { readDb, updateDb } from '@/server/db/local-store';
import { deleteObject, readObject, writeObject } from '@/server/files/object-store';
import { hashSecret, id, randomToken, sha256Hex, verifySecret } from '@/server/security/crypto';
import { generateReportPdf } from './pdf';

type ReportInputCardState = {
  id: string;
  fileId: string;
  updatedAt: string;
};

async function waitForReportPersistTestHook(): Promise<void> {
  if (isProductionApp()) return;
  const delayMs = Number(process.env.SAFEPLAN_TEST_REPORT_PERSIST_DELAY_MS || 0);
  if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
}

export async function generateReport(caseId: string): Promise<ReportRecord> {
  const db = await readDb();
  const caseRecord = db.cases.find((item) => item.id === caseId && item.deletedAt === null);
  if (!caseRecord) throw new Error('case_not_found');
  const cards = db.evidenceCards.filter(
    (card) => card.caseId === caseId && card.deletedAt === null && card.userConfirmed && card.includeInReport
  );
  if (cards.length === 0) throw new Error('no_confirmed_cards');
  const includedFileIds = new Set(cards.map((card) => card.fileId));
  const cardStates: ReportInputCardState[] = cards.map((card) => ({ id: card.id, fileId: card.fileId, updatedAt: card.updatedAt }));
  const files = db.evidenceFiles.filter((file) => file.caseId === caseId && file.deletedAt === null && includedFileIds.has(file.id));
  const pdf = await generateReportPdf({ caseRecord, cards, files });
  const now = new Date().toISOString();
  const reportId = id('report');
  const objectName = `${caseId}/${reportId}-safeplan-report.pdf`;
  const pdfBucket = process.env.GCS_BUCKET_REPORTS || 'local-reports';
  const pdfSha256 = sha256Hex(pdf);
  const snapshotCards: ReportSnapshot['cards'] = cards.map((card) => ({
    id: card.id,
    title: card.title,
    dateCandidate: card.dateCandidate,
    confidenceLevel: card.confidenceLevel,
    summaryKo: card.summaryKo,
    imageDescriptionKo: imageDescriptionFromDraft(card.aiDraftJson)
  }));
  await writeObject(pdfBucket, objectName, pdf, 'application/pdf');
  await waitForReportPersistTestHook();
  try {
    return await updateDb((mutableDb) => {
      const currentCase = mutableDb.cases.find((item) => item.id === caseId && item.deletedAt === null);
      if (!currentCase) throw new Error('report_input_changed');
      for (const state of cardStates) {
        const currentCard = mutableDb.evidenceCards.find((card) => card.id === state.id);
        if (!currentCard || currentCard.deletedAt !== null || !currentCard.userConfirmed || !currentCard.includeInReport || currentCard.updatedAt !== state.updatedAt) {
          throw new Error('report_input_changed');
        }
        const currentFile = mutableDb.evidenceFiles.find((file) => file.id === state.fileId);
        if (!currentFile || currentFile.deletedAt !== null || currentFile.caseId !== caseId) throw new Error('report_input_changed');
      }
      const version = mutableDb.reports.filter((item) => item.caseId === caseId).length + 1;
      const snapshot: ReportSnapshot = {
        version,
        generatedAt: now,
        includedFileIds: [...includedFileIds],
        pdfSha256,
        fileCount: files.length,
        cards: snapshotCards
      };
      const record: ReportRecord = {
        id: reportId,
        caseId,
        version,
        pdfBucket,
        pdfObject: objectName,
        snapshotJson: snapshot,
        generatedAt: now,
        deletedAt: null
      };
      mutableDb.reports.push(record);
      currentCase.status = 'reported';
      currentCase.updatedAt = now;
      mutableDb.auditEvents.push({ id: id('audit'), userId: caseRecord.userId, caseId, type: 'report.generated', metadataJson: { cardCount: cards.length }, createdAt: now });
      return record;
    });
  } catch (error) {
    await deleteObject(pdfBucket, objectName).catch(() => undefined);
    throw error;
  }
}

export async function readReportPdf(reportId: string): Promise<{ report: ReportRecord; pdf: Buffer }> {
  const db = await readDb();
  const report = db.reports.find((item) => item.id === reportId && item.deletedAt === null);
  if (!report) throw new Error('report_not_found');
  return { report, pdf: await readObject(report.pdfBucket, report.pdfObject) };
}

export function toReportSummary(report: ReportRecord): { id: string; version: number; generatedAt: string } {
  return { id: report.id, version: report.version, generatedAt: report.generatedAt };
}

export async function deleteReportObject(report: ReportRecord): Promise<void> {
  await deleteObject(report.pdfBucket, report.pdfObject);
}

export async function createShareLink(reportId: string, password?: string | null): Promise<{ share: ShareLinkRecord; token: string }> {
  const token = randomToken(32);
  const tokenHash = sha256Hex(token);
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + LIMITS.shareUrlTtlDays);
  const share = await updateDb((db) => {
    const report = db.reports.find((item) => item.id === reportId && item.deletedAt === null);
    if (!report) throw new Error('report_not_found');
    const caseRecord = db.cases.find((item) => item.id === report.caseId);
    const record: ShareLinkRecord = {
      id: id('share'),
      reportId,
      tokenHash,
      passwordHash: password ? hashSecret(password) : null,
      expiresAt: expiresAt.toISOString(),
      revokedAt: null,
      accessCount: 0
    };
    db.shareLinks.push(record);
    db.auditEvents.push({ id: id('audit'), userId: caseRecord?.userId ?? null, caseId: report.caseId, type: 'share.created', metadataJson: { expiresAt: record.expiresAt, passwordProtected: Boolean(password) }, createdAt: now.toISOString() });
    return record;
  });
  return { share, token };
}

export function toShareLinkSummary(share: ShareLinkRecord): ShareLinkSummaryDto {
  return {
    id: share.id,
    expiresAt: share.expiresAt,
    revokedAt: share.revokedAt,
    accessCount: share.accessCount,
    passwordProtected: Boolean(share.passwordHash)
  };
}

export async function revokeShareLink(shareId: string): Promise<ShareLinkRecord> {
  return updateDb((db) => {
    const share = db.shareLinks.find((item) => item.id === shareId);
    if (!share) throw new Error('share_not_found');
    share.revokedAt = new Date().toISOString();
    const report = db.reports.find((item) => item.id === share.reportId);
    db.auditEvents.push({ id: id('audit'), userId: null, caseId: report?.caseId ?? null, type: 'share.revoked', metadataJson: { shareId }, createdAt: share.revokedAt });
    return share;
  });
}

export async function resolveShareToken(token: string, password?: string | null): Promise<{ status: 'ok'; report: ReportRecord; share: ShareLinkRecord } | { status: 'not_found' | 'expired' | 'password_required' | 'password_invalid' }> {
  const tokenHash = sha256Hex(token);
  return updateDb((db) => {
    const share = db.shareLinks.find((item) => item.tokenHash === tokenHash);
    if (!share || share.revokedAt) return { status: 'not_found' } as const;
    if (new Date(share.expiresAt).getTime() < Date.now()) return { status: 'expired' } as const;
    if (share.passwordHash && !password) return { status: 'password_required' } as const;
    if (share.passwordHash && !verifySecret(password || '', share.passwordHash)) return { status: 'password_invalid' } as const;
    const report = db.reports.find((item) => item.id === share.reportId && item.deletedAt === null);
    if (!report) return { status: 'not_found' } as const;
    share.accessCount += 1;
    db.auditEvents.push({ id: id('audit'), userId: null, caseId: report.caseId, type: 'share.accessed', metadataJson: { shareId: share.id, accessCount: share.accessCount }, createdAt: new Date().toISOString() });
    return { status: 'ok', report, share } as const;
  });
}
