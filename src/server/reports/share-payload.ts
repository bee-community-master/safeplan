import 'server-only';
import { isReportSnapshot, type SharedReportPayload } from '@/lib/share';
import type { ReportRecord } from '@/server/db/types';

export async function buildSharedReportPayload(report: ReportRecord): Promise<SharedReportPayload> {
  if (isReportSnapshot(report.snapshotJson)) {
    return { cards: report.snapshotJson.cards, fileCount: report.snapshotJson.fileCount };
  }
  throw new Error('report_snapshot_unavailable');
}
