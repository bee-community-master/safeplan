import 'server-only';
import type { ReportSnapshot } from '@/lib/share';
import { deleteEvidenceObject } from '@/server/files/local';
import { deleteReportObject } from '@/server/reports/report-service';
import { id } from '@/server/security/crypto';
import { readDb, updateDb } from './local-store';

export async function deleteCaseDeep(caseId: string): Promise<{
  deletedFiles: number;
  deletedExtractions: number;
  deletedCards: number;
  revokedShares: number;
  deletedReports: number;
}> {
  const dbBefore = await readDb();
  const files = dbBefore.evidenceFiles.filter((file) => file.caseId === caseId && file.deletedAt === null);
  const reportsBefore = dbBefore.reports.filter((report) => report.caseId === caseId && report.deletedAt === null);
  for (const file of files) await deleteEvidenceObject(file);
  for (const report of reportsBefore) await deleteReportObject(report);

  const now = new Date().toISOString();
  const deletedSnapshot = (reportId: string): ReportSnapshot => ({
    version: 0,
    generatedAt: now,
    includedFileIds: [],
    pdfSha256: `deleted:${reportId}`,
    fileCount: 0,
    cards: []
  });
  return updateDb((db) => {
    const caseRecord = db.cases.find((item) => item.id === caseId);
    if (caseRecord) {
      caseRecord.status = 'deleted';
      caseRecord.deletedAt = now;
      caseRecord.updatedAt = now;
    }
    let deletedExtractions = 0;
    let deletedCards = 0;
    let deletedReports = 0;
    let revokedShares = 0;
    for (const file of db.evidenceFiles.filter((item) => item.caseId === caseId)) {
      if (!file.deletedAt) file.deletedAt = now;
      file.processingStatus = 'deleted';
      file.originalName = '삭제된 자료';
      file.gcsBucket = '';
      file.gcsObject = '';
      file.encryptedDek = '';
      file.checksumSha256 = '';
      file.userMemo = null;
      file.materialType = 'unknown';
    }
    for (const result of db.extractionResults.filter((item) => files.some((file) => file.id === item.fileId))) {
      if (!result.deletedAt) {
        result.deletedAt = now;
        deletedExtractions += 1;
      }
      result.rawJson = { deleted: true };
      result.normalizedText = null;
    }
    for (const card of db.evidenceCards.filter((item) => item.caseId === caseId)) {
      if (!card.deletedAt) {
        card.deletedAt = now;
        deletedCards += 1;
      }
      card.title = '삭제된 자료';
      card.summaryKo = '삭제된 자료입니다.';
      card.dateCandidate = null;
      card.dateSource = null;
      card.userMemo = null;
      card.aiDraftJson = { deleted: true };
      card.peopleJson = [];
      card.locationsJson = [];
      card.tagsJson = [];
    }
    const reports = db.reports.filter((item) => item.caseId === caseId);
    for (const report of reports) {
      if (!report.deletedAt) {
        report.deletedAt = now;
        deletedReports += 1;
      }
      report.pdfBucket = '';
      report.pdfObject = '';
      report.snapshotJson = deletedSnapshot(report.id);
      for (const share of db.shareLinks.filter((item) => item.reportId === report.id)) {
        if (share.revokedAt === null) {
          share.revokedAt = now;
          revokedShares += 1;
        }
        share.tokenHash = `deleted_${share.id}`;
        share.passwordHash = null;
      }
    }
    for (const job of db.processingJobs.filter((item) => item.caseId === caseId)) {
      job.status = 'failed';
      job.lastError = 'case_deleted';
      job.updatedAt = now;
    }
    db.auditEvents.push({
      id: id('audit'),
      userId: caseRecord?.userId ?? null,
      caseId,
      type: 'case.deleted',
      metadataJson: { fileCount: files.length, reportCount: reports.length },
      createdAt: now
    });
    return { deletedFiles: files.length, deletedExtractions, deletedCards, revokedShares, deletedReports };
  });
}
