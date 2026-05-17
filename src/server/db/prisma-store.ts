import 'server-only';
import { Prisma } from '@prisma/client';
import type {
  AuditEventRecord,
  CaseRecord,
  ConsentRecord,
  EvidenceCardRecord,
  EvidenceFileRecord,
  ExtractionResultRecord,
  PaymentIntentRecord,
  ProcessingJobRecord,
  ReportRecord,
  SafeplanDb,
  ShareLinkRecord,
  UserRecord
} from './types';
import { prismaClient } from './prisma';

function date(value: string): Date {
  return new Date(value);
}

function maybeDate(value: string | null): Date | null {
  return value ? new Date(value) : null;
}

function iso(value: Date): string {
  return value.toISOString();
}

function maybeIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function mapUser(record: Awaited<ReturnType<ReturnType<typeof prismaClient>['user']['findMany']>>[number]): UserRecord {
  return {
    id: record.id,
    email: record.email,
    authProvider: record.authProvider as UserRecord['authProvider'],
    createdAt: iso(record.createdAt)
  };
}

function mapCase(record: Awaited<ReturnType<ReturnType<typeof prismaClient>['case']['findMany']>>[number]): CaseRecord {
  return {
    id: record.id,
    userId: record.userId,
    sessionId: record.sessionId,
    title: record.title,
    status: record.status as CaseRecord['status'],
    retentionUntil: iso(record.retentionUntil),
    createdAt: iso(record.createdAt),
    updatedAt: iso(record.updatedAt),
    deletedAt: maybeIso(record.deletedAt)
  };
}

function mapConsent(record: Awaited<ReturnType<ReturnType<typeof prismaClient>['consentRecord']['findMany']>>[number]): ConsentRecord {
  return {
    id: record.id,
    caseId: record.caseId,
    consentType: record.consentType as ConsentRecord['consentType'],
    version: record.version,
    acceptedAt: iso(record.acceptedAt),
    ipHash: record.ipHash,
    userAgentHash: record.userAgentHash
  };
}

function mapEvidenceFile(record: Awaited<ReturnType<ReturnType<typeof prismaClient>['evidenceFile']['findMany']>>[number]): EvidenceFileRecord {
  return {
    id: record.id,
    caseId: record.caseId,
    originalName: record.originalName,
    mimeType: record.mimeType,
    sizeBytes: record.sizeBytes,
    gcsBucket: record.gcsBucket,
    gcsObject: record.gcsObject,
    encryptedDek: record.encryptedDek,
    checksumSha256: record.checksumSha256,
    materialType: record.materialType as EvidenceFileRecord['materialType'],
    processingStatus: record.processingStatus as EvidenceFileRecord['processingStatus'],
    userMemo: record.userMemo,
    uploadedAt: iso(record.uploadedAt),
    deletedAt: maybeIso(record.deletedAt)
  };
}

function mapExtraction(record: Awaited<ReturnType<ReturnType<typeof prismaClient>['extractionResult']['findMany']>>[number]): ExtractionResultRecord {
  return {
    id: record.id,
    fileId: record.fileId,
    provider: record.provider as ExtractionResultRecord['provider'],
    kind: record.kind as ExtractionResultRecord['kind'],
    rawJson: record.rawJson,
    normalizedText: record.normalizedText,
    createdAt: iso(record.createdAt),
    deletedAt: maybeIso(record.deletedAt)
  };
}

function mapCard(record: Awaited<ReturnType<ReturnType<typeof prismaClient>['evidenceCard']['findMany']>>[number]): EvidenceCardRecord {
  return {
    id: record.id,
    caseId: record.caseId,
    fileId: record.fileId,
    title: record.title,
    summaryKo: record.summaryKo,
    materialType: record.materialType as EvidenceCardRecord['materialType'],
    dateCandidate: record.dateCandidate,
    dateSource: record.dateSource,
    peopleJson: record.peopleJson,
    locationsJson: record.locationsJson,
    tagsJson: record.tagsJson,
    confidenceLevel: record.confidenceLevel as EvidenceCardRecord['confidenceLevel'],
    includeInReport: record.includeInReport,
    userConfirmed: record.userConfirmed,
    userMemo: record.userMemo,
    aiDraftJson: record.aiDraftJson,
    createdAt: iso(record.createdAt),
    updatedAt: iso(record.updatedAt),
    deletedAt: maybeIso(record.deletedAt)
  };
}

function mapPayment(record: Awaited<ReturnType<ReturnType<typeof prismaClient>['paymentIntent']['findMany']>>[number]): PaymentIntentRecord {
  return {
    id: record.id,
    caseId: record.caseId,
    provider: record.provider as PaymentIntentRecord['provider'],
    amountKrw: record.amountKrw,
    status: record.status as PaymentIntentRecord['status'],
    providerPaymentKey: record.providerPaymentKey,
    createdAt: iso(record.createdAt),
    paidAt: maybeIso(record.paidAt)
  };
}

function mapReport(record: Awaited<ReturnType<ReturnType<typeof prismaClient>['report']['findMany']>>[number]): ReportRecord {
  return {
    id: record.id,
    caseId: record.caseId,
    version: record.version,
    pdfBucket: record.pdfBucket,
    pdfObject: record.pdfObject,
    generatedAt: iso(record.generatedAt),
    deletedAt: maybeIso(record.deletedAt)
  };
}

function mapShare(record: Awaited<ReturnType<ReturnType<typeof prismaClient>['shareLink']['findMany']>>[number]): ShareLinkRecord {
  return {
    id: record.id,
    reportId: record.reportId,
    tokenHash: record.tokenHash,
    passwordHash: record.passwordHash,
    expiresAt: iso(record.expiresAt),
    revokedAt: maybeIso(record.revokedAt),
    accessCount: record.accessCount
  };
}

function mapAudit(record: Awaited<ReturnType<ReturnType<typeof prismaClient>['auditEvent']['findMany']>>[number]): AuditEventRecord {
  return {
    id: record.id,
    userId: record.userId,
    caseId: record.caseId,
    type: record.type,
    metadataJson: record.metadataJson,
    createdAt: iso(record.createdAt)
  };
}

function mapJob(record: Awaited<ReturnType<ReturnType<typeof prismaClient>['processingJob']['findMany']>>[number]): ProcessingJobRecord {
  return {
    id: record.id,
    caseId: record.caseId,
    fileId: record.fileId,
    type: record.type as ProcessingJobRecord['type'],
    status: record.status as ProcessingJobRecord['status'],
    attempts: record.attempts,
    lastError: record.lastError,
    createdAt: iso(record.createdAt),
    updatedAt: iso(record.updatedAt)
  };
}

export async function readPrismaDb(): Promise<SafeplanDb> {
  const prisma = prismaClient();
  const [users, cases, consentRecords, evidenceFiles, extractionResults, evidenceCards, paymentIntents, reports, shareLinks, auditEvents, processingJobs] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.case.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.consentRecord.findMany({ orderBy: { acceptedAt: 'asc' } }),
    prisma.evidenceFile.findMany({ orderBy: { uploadedAt: 'asc' } }),
    prisma.extractionResult.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.evidenceCard.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.paymentIntent.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.report.findMany({ orderBy: { generatedAt: 'asc' } }),
    prisma.shareLink.findMany({ orderBy: { expiresAt: 'asc' } }),
    prisma.auditEvent.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.processingJob.findMany({ orderBy: { createdAt: 'asc' } })
  ]);

  return {
    users: users.map(mapUser),
    cases: cases.map(mapCase),
    consentRecords: consentRecords.map(mapConsent),
    evidenceFiles: evidenceFiles.map(mapEvidenceFile),
    extractionResults: extractionResults.map(mapExtraction),
    evidenceCards: evidenceCards.map(mapCard),
    paymentIntents: paymentIntents.map(mapPayment),
    reports: reports.map(mapReport),
    shareLinks: shareLinks.map(mapShare),
    auditEvents: auditEvents.map(mapAudit),
    processingJobs: processingJobs.map(mapJob)
  };
}

export async function writePrismaDb(db: SafeplanDb): Promise<void> {
  const prisma = prismaClient();
  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext('safeplan_db_replace'))");

      await tx.shareLink.deleteMany();
      await tx.report.deleteMany();
      await tx.evidenceCard.deleteMany();
      await tx.extractionResult.deleteMany();
      await tx.evidenceFile.deleteMany();
      await tx.consentRecord.deleteMany();
      await tx.paymentIntent.deleteMany();
      await tx.processingJob.deleteMany();
      await tx.case.deleteMany();
      await tx.user.deleteMany();
      await tx.auditEvent.deleteMany();

      if (db.users.length) {
        await tx.user.createMany({
          data: db.users.map((record) => ({
            id: record.id,
            email: record.email,
            authProvider: record.authProvider,
            createdAt: date(record.createdAt)
          }))
        });
      }

      if (db.cases.length) {
        await tx.case.createMany({
          data: db.cases.map((record) => ({
            id: record.id,
            userId: record.userId,
            sessionId: record.sessionId,
            title: record.title,
            status: record.status,
            retentionUntil: date(record.retentionUntil),
            createdAt: date(record.createdAt),
            updatedAt: date(record.updatedAt),
            deletedAt: maybeDate(record.deletedAt)
          }))
        });
      }

      if (db.consentRecords.length) {
        await tx.consentRecord.createMany({
          data: db.consentRecords.map((record) => ({
            id: record.id,
            caseId: record.caseId,
            consentType: record.consentType,
            version: record.version,
            acceptedAt: date(record.acceptedAt),
            ipHash: record.ipHash,
            userAgentHash: record.userAgentHash
          }))
        });
      }

      if (db.evidenceFiles.length) {
        await tx.evidenceFile.createMany({
          data: db.evidenceFiles.map((record) => ({
            id: record.id,
            caseId: record.caseId,
            originalName: record.originalName,
            mimeType: record.mimeType,
            sizeBytes: record.sizeBytes,
            gcsBucket: record.gcsBucket,
            gcsObject: record.gcsObject,
            encryptedDek: record.encryptedDek,
            checksumSha256: record.checksumSha256,
            materialType: record.materialType,
            processingStatus: record.processingStatus,
            userMemo: record.userMemo,
            uploadedAt: date(record.uploadedAt),
            deletedAt: maybeDate(record.deletedAt)
          }))
        });
      }

      if (db.extractionResults.length) {
        await tx.extractionResult.createMany({
          data: db.extractionResults.map((record) => ({
            id: record.id,
            fileId: record.fileId,
            provider: record.provider,
            kind: record.kind,
            rawJson: json(record.rawJson),
            normalizedText: record.normalizedText,
            createdAt: date(record.createdAt),
            deletedAt: maybeDate(record.deletedAt)
          }))
        });
      }

      if (db.evidenceCards.length) {
        await tx.evidenceCard.createMany({
          data: db.evidenceCards.map((record) => ({
            id: record.id,
            caseId: record.caseId,
            fileId: record.fileId,
            title: record.title,
            summaryKo: record.summaryKo,
            materialType: record.materialType,
            dateCandidate: record.dateCandidate,
            dateSource: record.dateSource,
            peopleJson: json(record.peopleJson),
            locationsJson: json(record.locationsJson),
            tagsJson: json(record.tagsJson),
            confidenceLevel: record.confidenceLevel,
            includeInReport: record.includeInReport,
            userConfirmed: record.userConfirmed,
            userMemo: record.userMemo,
            aiDraftJson: json(record.aiDraftJson),
            createdAt: date(record.createdAt),
            updatedAt: date(record.updatedAt),
            deletedAt: maybeDate(record.deletedAt)
          }))
        });
      }

      if (db.paymentIntents.length) {
        await tx.paymentIntent.createMany({
          data: db.paymentIntents.map((record) => ({
            id: record.id,
            caseId: record.caseId,
            provider: record.provider,
            amountKrw: record.amountKrw,
            status: record.status,
            providerPaymentKey: record.providerPaymentKey,
            createdAt: date(record.createdAt),
            paidAt: maybeDate(record.paidAt)
          }))
        });
      }

      if (db.reports.length) {
        await tx.report.createMany({
          data: db.reports.map((record) => ({
            id: record.id,
            caseId: record.caseId,
            version: record.version,
            pdfBucket: record.pdfBucket,
            pdfObject: record.pdfObject,
            generatedAt: date(record.generatedAt),
            deletedAt: maybeDate(record.deletedAt)
          }))
        });
      }

      if (db.shareLinks.length) {
        await tx.shareLink.createMany({
          data: db.shareLinks.map((record) => ({
            id: record.id,
            reportId: record.reportId,
            tokenHash: record.tokenHash,
            passwordHash: record.passwordHash,
            expiresAt: date(record.expiresAt),
            revokedAt: maybeDate(record.revokedAt),
            accessCount: record.accessCount
          }))
        });
      }

      if (db.auditEvents.length) {
        await tx.auditEvent.createMany({
          data: db.auditEvents.map((record) => ({
            id: record.id,
            userId: record.userId,
            caseId: record.caseId,
            type: record.type,
            metadataJson: json(record.metadataJson),
            createdAt: date(record.createdAt)
          }))
        });
      }

      if (db.processingJobs.length) {
        await tx.processingJob.createMany({
          data: db.processingJobs.map((record) => ({
            id: record.id,
            caseId: record.caseId,
            fileId: record.fileId,
            type: record.type,
            status: record.status,
            attempts: record.attempts,
            lastError: record.lastError,
            createdAt: date(record.createdAt),
            updatedAt: date(record.updatedAt)
          }))
        });
      }
    },
    { timeout: 30_000, maxWait: 10_000 }
  );
}
