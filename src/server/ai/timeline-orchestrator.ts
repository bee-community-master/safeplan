import 'server-only';
import { AI_TAGS } from '@/lib/constants';
import { isRealAiProviderMode } from '@/lib/runtime';
import type { BasetenClassifierResponse } from '@/lib/types';
import type { EvidenceFileRecord, ProcessingJobRecord } from '@/server/db/types';
import { readDb, updateDb } from '@/server/db/local-store';
import { readEvidencePlain } from '@/server/files/local';
import { id } from '@/server/security/crypto';
import { basetenClassify } from './providers/baseten-classifier';
import { groqStt } from './providers/groq-stt';
import { mistralOcr } from './providers/mistral-ocr';
import { mockClassify, mockOcr, mockStt } from './providers/mock';
import { isProviderMissingCredentialError } from './providers/schema';

function warnProviderDegraded(provider: 'baseten' | 'groq' | 'mistral', error: unknown): void {
  if (isProviderMissingCredentialError(error)) return;
  console.warn('safeplan provider degraded', { provider, category: error instanceof Error ? error.message : String(error) });
}

function hasRequiredConsents(caseId: string, db: Awaited<ReturnType<typeof readDb>>): boolean {
  const accepted = new Set(db.consentRecords.filter((item) => item.caseId === caseId).map((item) => item.consentType));
  return accepted.has('ai_processing') && accepted.has('sensitive_data') && accepted.has('original_evidence');
}

function isPaid(caseId: string, db: Awaited<ReturnType<typeof readDb>>): boolean {
  return db.paymentIntents.some((payment) => payment.caseId === caseId && payment.status === 'paid');
}

async function classifyWithFallback(input: Parameters<typeof mockClassify>[0]): Promise<{ result: BasetenClassifierResponse; provider: 'baseten' | 'mock'; degraded: boolean; raw: unknown }> {
  if (isRealAiProviderMode()) {
    try {
      const result = await basetenClassify(input);
      return { result, provider: 'baseten', degraded: false, raw: result };
    } catch (error) {
      warnProviderDegraded('baseten', error);
    }
  }
  const result = await mockClassify(input);
  return { result, provider: 'mock', degraded: isRealAiProviderMode(), raw: result };
}

async function extractText(file: EvidenceFileRecord): Promise<{ ocrMarkdown: string | null; transcript: string | null; degraded: boolean; extractionRaw: Array<{ provider: 'mistral' | 'groq' | 'mock'; kind: 'ocr' | 'stt'; raw: unknown; text: string }> }> {
  const content = await readEvidencePlain(file);
  if (file.mimeType === 'text/plain') {
    const text = content.toString('utf8');
    return { ocrMarkdown: text, transcript: null, degraded: false, extractionRaw: [{ provider: 'mock', kind: 'ocr', raw: { textMode: true }, text }] };
  }
  if (file.mimeType.startsWith('audio/')) {
    if (isRealAiProviderMode()) {
      try {
        const result = await groqStt({ content, mimeType: file.mimeType, originalName: file.originalName });
        return { ocrMarkdown: null, transcript: result.transcript, degraded: false, extractionRaw: [{ provider: 'groq', kind: 'stt', raw: result.raw, text: result.transcript }] };
      } catch (error) {
        warnProviderDegraded('groq', error);
      }
    }
    const mock = await mockStt({ originalName: file.originalName });
    return { ocrMarkdown: null, transcript: mock.transcript, degraded: isRealAiProviderMode(), extractionRaw: [{ provider: 'mock', kind: 'stt', raw: mock.raw, text: mock.transcript }] };
  }
  if (isRealAiProviderMode()) {
    try {
      const result = await mistralOcr({ content, mimeType: file.mimeType, originalName: file.originalName });
      return { ocrMarkdown: result.markdown, transcript: null, degraded: false, extractionRaw: [{ provider: 'mistral', kind: 'ocr', raw: result.raw, text: result.markdown }] };
    } catch (error) {
      warnProviderDegraded('mistral', error);
    }
  }
  const mock = await mockOcr({ content, mimeType: file.mimeType, originalName: file.originalName });
  return { ocrMarkdown: mock.markdown, transcript: null, degraded: isRealAiProviderMode(), extractionRaw: [{ provider: 'mock', kind: 'ocr', raw: mock.raw, text: mock.markdown }] };
}

export async function enqueueProcessingJob(caseId: string): Promise<ProcessingJobRecord> {
  const now = new Date().toISOString();
  return updateDb((db) => {
    const existing = db.processingJobs.find((job) => job.caseId === caseId && ['queued', 'processing'].includes(job.status));
    if (existing) return existing;
    const job: ProcessingJobRecord = {
      id: id('job'),
      caseId,
      fileId: null,
      type: 'timeline',
      status: 'queued',
      attempts: 0,
      lastError: null,
      createdAt: now,
      updatedAt: now
    };
    db.processingJobs.push(job);
    db.auditEvents.push({ id: id('audit'), userId: db.cases.find((item) => item.id === caseId)?.userId ?? null, caseId, type: 'job.queued', metadataJson: { type: 'timeline' }, createdAt: now });
    return job;
  });
}

export async function processCaseTimeline(caseId: string): Promise<{ job: ProcessingJobRecord; cardCount: number; providerDegraded: boolean }> {
  const before = await readDb();
  const files = before.evidenceFiles.filter((file) => file.caseId === caseId && file.deletedAt === null);
  const job = before.processingJobs.find((item) => item.caseId === caseId && ['queued', 'processing'].includes(item.status)) ?? (await enqueueProcessingJob(caseId));
  if (!isPaid(caseId, before)) throw new Error('payment_required');
  if (!hasRequiredConsents(caseId, before)) throw new Error('consent_required');
  let providerDegraded = false;
  let cardCount = 0;

  await updateDb((db) => {
    const mutableJob = db.processingJobs.find((item) => item.id === job.id);
    if (mutableJob) {
      mutableJob.status = 'processing';
      mutableJob.attempts += 1;
      mutableJob.updatedAt = new Date().toISOString();
    }
    const caseRecord = db.cases.find((item) => item.id === caseId);
    if (caseRecord) {
      caseRecord.status = 'processing';
      caseRecord.updatedAt = new Date().toISOString();
    }
  });

  for (const file of files) {
    const existing = (await readDb()).evidenceCards.some((card) => card.fileId === file.id && card.deletedAt === null);
    if (existing) continue;
    const extracted = await extractText(file);
    providerDegraded = providerDegraded || extracted.degraded;
    const classification = await classifyWithFallback({
      caseId,
      fileId: file.id,
      materialType: file.materialType,
      ocrMarkdown: extracted.ocrMarkdown,
      transcript: extracted.transcript,
      userMemo: file.userMemo,
      fileMetadata: { originalName: file.originalName, mimeType: file.mimeType, uploadedAt: file.uploadedAt },
      allowedTags: AI_TAGS
    });
    providerDegraded = providerDegraded || classification.degraded;
    const now = new Date().toISOString();
    await updateDb((db) => {
      const mutableFile = db.evidenceFiles.find((item) => item.id === file.id);
      if (mutableFile) mutableFile.processingStatus = providerDegraded ? 'provider_degraded' : 'processed';
      for (const raw of extracted.extractionRaw) {
        db.extractionResults.push({
          id: id('extract'),
          fileId: file.id,
          provider: raw.provider,
          kind: raw.kind,
          rawJson: raw.raw,
          normalizedText: raw.text,
          createdAt: now,
          deletedAt: null
        });
      }
      db.extractionResults.push({
        id: id('extract'),
        fileId: file.id,
        provider: classification.provider,
        kind: 'classification',
        rawJson: classification.raw,
        normalizedText: classification.result.summaryKo,
        createdAt: now,
        deletedAt: null
      });
      const firstDate = classification.result.dateCandidates[0];
      db.evidenceCards.push({
        id: id('card'),
        caseId,
        fileId: file.id,
        title: classification.result.title,
        summaryKo: classification.result.summaryKo,
        materialType: classification.result.materialType,
        dateCandidate: firstDate?.date ?? null,
        dateSource: firstDate?.source ?? null,
        peopleJson: classification.result.people,
        locationsJson: classification.result.locations,
        tagsJson: classification.result.tags,
        confidenceLevel: classification.result.confidenceLevel,
        includeInReport: classification.result.includeInReportDefault,
        userConfirmed: false,
        userMemo: file.userMemo,
        aiDraftJson: { ...classification.result, draft: true, provider: classification.provider, providerDegraded: classification.degraded },
        createdAt: now,
        updatedAt: now,
        deletedAt: null
      });
    });
    cardCount += 1;
  }

  const finalJob = await updateDb((db) => {
    const mutableJob = db.processingJobs.find((item) => item.id === job.id)!;
    mutableJob.status = providerDegraded ? 'provider_degraded' : 'succeeded';
    mutableJob.lastError = providerDegraded ? 'provider_degraded_fallback_to_mock' : null;
    mutableJob.updatedAt = new Date().toISOString();
    const caseRecord = db.cases.find((item) => item.id === caseId);
    if (caseRecord) {
      caseRecord.status = 'review';
      caseRecord.updatedAt = mutableJob.updatedAt;
    }
    db.auditEvents.push({ id: id('audit'), userId: caseRecord?.userId ?? null, caseId, type: 'job.processed', metadataJson: { cardCount, providerDegraded }, createdAt: mutableJob.updatedAt });
    return mutableJob;
  });
  return { job: finalJob, cardCount, providerDegraded };
}
