export type SharedReportCard = {
  id: string;
  title: string;
  dateCandidate: string | null;
  confidenceLevel: number;
  summaryKo: string;
};

export type SharedReportPayload = {
  cards: SharedReportCard[];
  fileCount: number;
};

export type ReportSnapshot = SharedReportPayload & {
  version: number;
  generatedAt: string;
  includedFileIds: string[];
  pdfSha256: string;
};

export type ShareLinkSummaryDto = {
  id: string;
  expiresAt: string;
  revokedAt: string | null;
  accessCount: number;
  passwordProtected: boolean;
};

export function isReportSnapshot(value: unknown): value is ReportSnapshot {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ReportSnapshot>;
  return Array.isArray(candidate.cards) && Array.isArray(candidate.includedFileIds) && typeof candidate.fileCount === 'number';
}
