import 'server-only';
import type { ReportSnapshot } from '@/lib/share';
import { deleteEvidenceObject } from '@/server/files/local';
import { deleteReportObject } from '@/server/reports/report-service';
import { id } from '@/server/security/crypto';
import { updateDb } from './local-store';

export async function deleteCaseDeep(caseId: string): Promise<{
  deletedFiles: number;
  deletedExtractions: number;
  deletedCards: number;
  revokedShares: number;
  deletedReports: number;
}> {
  const now = new Date().toISOString();
  const deletedSnapshot = (reportId: string): ReportSnapshot => ({
    version: 0,
    generatedAt: now,
    includedFileIds: [],
    pdfSha256: `deleted:${reportId}`,
    fileCount: 0,
    cards: []
  });
  const deleted = await updateDb((db) => {
    const caseRecord = db.cases.find((item) => item.id === caseId);
    if (caseRecord) {
      caseRecord.status = 'deleted';
      caseRecord.deletedAt = now;
      caseRecord.updatedAt = now;
    }
    const files = db.evidenceFiles.filter((file) => file.caseId === caseId);
    const activeFiles = files.filter((file) => file.deletedAt === null);
    const filesToDelete = activeFiles.map((file) => ({ ...file }));
    const fileIdsToScrubObjectRefs = filesToDelete.map((file) => file.id);
    const fileIds = new Set(files.map((file) => file.id));
    const reports = db.reports.filter((item) => item.caseId === caseId);
    const activeReports = reports.filter((report) => report.deletedAt === null);
    const reportsToDelete = activeReports.map((report) => ({ ...report }));
    const reportIdsToScrubObjectRefs = reportsToDelete.map((report) => report.id);
    let deletedExtractions = 0;
    let deletedCards = 0;
    let deletedReports = 0;
    let revokedShares = 0;
    for (const file of files) {
      if (!file.deletedAt) file.deletedAt = now;
      file.processingStatus = 'deleted';
      file.originalName = '삭제된 자료';
      file.encryptedDek = '';
      file.checksumSha256 = '';
      file.userMemo = null;
      file.materialType = 'unknown';
    }
    for (const result of db.extractionResults.filter((item) => fileIds.has(item.fileId))) {
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
    for (const report of reports) {
      if (!report.deletedAt) {
        report.deletedAt = now;
        deletedReports += 1;
      }
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
      metadataJson: { fileCount: activeFiles.length, reportCount: activeReports.length },
      createdAt: now
    });
    return {
      result: { deletedFiles: activeFiles.length, deletedExtractions, deletedCards, revokedShares, deletedReports },
      filesToDelete,
      reportsToDelete,
      fileIdsToScrubObjectRefs,
      reportIdsToScrubObjectRefs
    };
  });
  await Promise.all(deleted.filesToDelete.map((file) => deleteEvidenceObject(file)));
  await Promise.all(deleted.reportsToDelete.map((report) => deleteReportObject(report)));
  await updateDb((db) => {
    for (const file of db.evidenceFiles.filter((item) => deleted.fileIdsToScrubObjectRefs.includes(item.id))) {
      file.gcsBucket = '';
      file.gcsObject = '';
    }
    for (const report of db.reports.filter((item) => deleted.reportIdsToScrubObjectRefs.includes(item.id))) {
      report.pdfBucket = '';
      report.pdfObject = '';
    }
  });
  return deleted.result;
}
