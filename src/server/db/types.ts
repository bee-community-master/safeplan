import type { ConsentType, ExtractionKind, MaterialType, ProviderName } from '@/lib/types';
import type { ReportSnapshot } from '@/lib/share';

export interface UserRecord {
  id: string;
  email: string | null;
  authProvider: 'anonymous' | 'email';
  createdAt: string;
}

export interface CaseRecord {
  id: string;
  userId: string;
  sessionId: string;
  title: string;
  status: 'draft' | 'uploaded' | 'paid' | 'processing' | 'review' | 'reported' | 'deleted';
  retentionUntil: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ConsentRecord {
  id: string;
  caseId: string;
  consentType: ConsentType;
  version: string;
  acceptedAt: string;
  ipHash: string | null;
  userAgentHash: string | null;
}

export interface EvidenceFileRecord {
  id: string;
  caseId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  gcsBucket: string;
  gcsObject: string;
  encryptedDek: string;
  checksumSha256: string;
  materialType: MaterialType;
  processingStatus: 'uploaded' | 'processing' | 'processed' | 'provider_degraded' | 'failed' | 'deleted';
  userMemo: string | null;
  uploadedAt: string;
  deletedAt: string | null;
}

export interface ExtractionResultRecord {
  id: string;
  fileId: string;
  provider: ProviderName;
  kind: ExtractionKind;
  rawJson: unknown;
  normalizedText: string | null;
  createdAt: string;
  deletedAt: string | null;
}

export interface EvidenceCardRecord {
  id: string;
  caseId: string;
  fileId: string;
  title: string;
  summaryKo: string;
  materialType: MaterialType;
  dateCandidate: string | null;
  dateSource: string | null;
  peopleJson: unknown;
  locationsJson: unknown;
  tagsJson: unknown;
  confidenceLevel: 1 | 2 | 3 | 4 | 5;
  includeInReport: boolean;
  userConfirmed: boolean;
  userMemo: string | null;
  aiDraftJson: unknown;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PaymentIntentRecord {
  id: string;
  caseId: string;
  provider: 'mock' | 'toss';
  amountKrw: number;
  status: 'created' | 'paid' | 'failed' | 'cancelled';
  providerPaymentKey: string | null;
  createdAt: string;
  paidAt: string | null;
}

export interface ReportRecord {
  id: string;
  caseId: string;
  version: number;
  pdfBucket: string;
  pdfObject: string;
  snapshotJson: ReportSnapshot;
  generatedAt: string;
  deletedAt: string | null;
}

export interface ShareLinkRecord {
  id: string;
  reportId: string;
  tokenHash: string;
  passwordHash: string | null;
  expiresAt: string;
  revokedAt: string | null;
  accessCount: number;
}

export interface AuditEventRecord {
  id: string;
  userId: string | null;
  caseId: string | null;
  type: string;
  metadataJson: unknown;
  createdAt: string;
}

export interface ProcessingJobRecord {
  id: string;
  caseId: string;
  fileId: string | null;
  type: 'timeline';
  status: 'queued' | 'processing' | 'succeeded' | 'failed' | 'provider_degraded';
  attempts: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SafeplanDb {
  users: UserRecord[];
  cases: CaseRecord[];
  consentRecords: ConsentRecord[];
  evidenceFiles: EvidenceFileRecord[];
  extractionResults: ExtractionResultRecord[];
  evidenceCards: EvidenceCardRecord[];
  paymentIntents: PaymentIntentRecord[];
  reports: ReportRecord[];
  shareLinks: ShareLinkRecord[];
  auditEvents: AuditEventRecord[];
  processingJobs: ProcessingJobRecord[];
}
