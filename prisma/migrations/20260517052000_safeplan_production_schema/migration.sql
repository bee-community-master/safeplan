-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "safeplan_user" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "authProvider" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "safeplan_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safeplan_case" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "retentionUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "safeplan_case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safeplan_consent_record" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "consentType" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL,
    "ipHash" TEXT,
    "userAgentHash" TEXT,

    CONSTRAINT "safeplan_consent_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safeplan_evidence_file" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "gcsBucket" TEXT NOT NULL,
    "gcsObject" TEXT NOT NULL,
    "encryptedDek" TEXT NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "materialType" TEXT NOT NULL,
    "processingStatus" TEXT NOT NULL,
    "userMemo" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "safeplan_evidence_file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safeplan_extraction_result" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "rawJson" JSONB NOT NULL,
    "normalizedText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "safeplan_extraction_result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safeplan_evidence_card" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summaryKo" TEXT NOT NULL,
    "materialType" TEXT NOT NULL,
    "dateCandidate" TEXT,
    "dateSource" TEXT,
    "peopleJson" JSONB NOT NULL,
    "locationsJson" JSONB NOT NULL,
    "tagsJson" JSONB NOT NULL,
    "confidenceLevel" INTEGER NOT NULL,
    "includeInReport" BOOLEAN NOT NULL DEFAULT false,
    "userConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "userMemo" TEXT,
    "aiDraftJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "safeplan_evidence_card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safeplan_payment_intent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "amountKrw" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "providerPaymentKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "safeplan_payment_intent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safeplan_report" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "pdfBucket" TEXT NOT NULL,
    "pdfObject" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "safeplan_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safeplan_share_link" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "passwordHash" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "accessCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "safeplan_share_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safeplan_audit_event" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "caseId" TEXT,
    "type" TEXT NOT NULL,
    "metadataJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "safeplan_audit_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safeplan_processing_job" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "fileId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "safeplan_processing_job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "safeplan_case_sessionId_idx" ON "safeplan_case"("sessionId");

-- CreateIndex
CREATE INDEX "safeplan_case_userId_idx" ON "safeplan_case"("userId");

-- CreateIndex
CREATE INDEX "safeplan_consent_record_caseId_idx" ON "safeplan_consent_record"("caseId");

-- CreateIndex
CREATE INDEX "safeplan_evidence_file_caseId_idx" ON "safeplan_evidence_file"("caseId");

-- CreateIndex
CREATE INDEX "safeplan_extraction_result_fileId_idx" ON "safeplan_extraction_result"("fileId");

-- CreateIndex
CREATE INDEX "safeplan_evidence_card_caseId_idx" ON "safeplan_evidence_card"("caseId");

-- CreateIndex
CREATE INDEX "safeplan_evidence_card_fileId_idx" ON "safeplan_evidence_card"("fileId");

-- CreateIndex
CREATE INDEX "safeplan_payment_intent_caseId_idx" ON "safeplan_payment_intent"("caseId");

-- CreateIndex
CREATE INDEX "safeplan_report_caseId_idx" ON "safeplan_report"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "safeplan_share_link_tokenHash_key" ON "safeplan_share_link"("tokenHash");

-- CreateIndex
CREATE INDEX "safeplan_share_link_reportId_idx" ON "safeplan_share_link"("reportId");

-- CreateIndex
CREATE INDEX "safeplan_audit_event_caseId_idx" ON "safeplan_audit_event"("caseId");

-- CreateIndex
CREATE INDEX "safeplan_audit_event_userId_idx" ON "safeplan_audit_event"("userId");

-- CreateIndex
CREATE INDEX "safeplan_processing_job_caseId_idx" ON "safeplan_processing_job"("caseId");

-- AddForeignKey
ALTER TABLE "safeplan_case" ADD CONSTRAINT "safeplan_case_userId_fkey" FOREIGN KEY ("userId") REFERENCES "safeplan_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safeplan_consent_record" ADD CONSTRAINT "safeplan_consent_record_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "safeplan_case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safeplan_evidence_file" ADD CONSTRAINT "safeplan_evidence_file_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "safeplan_case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safeplan_extraction_result" ADD CONSTRAINT "safeplan_extraction_result_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "safeplan_evidence_file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safeplan_evidence_card" ADD CONSTRAINT "safeplan_evidence_card_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "safeplan_case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safeplan_evidence_card" ADD CONSTRAINT "safeplan_evidence_card_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "safeplan_evidence_file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safeplan_payment_intent" ADD CONSTRAINT "safeplan_payment_intent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "safeplan_case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safeplan_report" ADD CONSTRAINT "safeplan_report_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "safeplan_case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safeplan_share_link" ADD CONSTRAINT "safeplan_share_link_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "safeplan_report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safeplan_processing_job" ADD CONSTRAINT "safeplan_processing_job_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "safeplan_case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
