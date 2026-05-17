import 'server-only';
import { LIMITS } from '@/lib/constants';
import { bytesFromMb, inferMaterialType, validateUploadCandidates } from '@/lib/evidence';
import type { EvidenceFileRecord, SafeplanDb } from '@/server/db/types';
import { readDb, updateDb } from '@/server/db/local-store';
import { decryptBuffer, encryptBuffer, id } from '@/server/security/crypto';
import { deleteObject, readObject, writeObject } from './object-store';

export interface UploadInputFile {
  name: string;
  mimeType: string;
  sizeBytes: number;
  contentBase64: string;
  userMemo?: string | null;
}

interface PreparedUploadFile extends UploadInputFile {
  plain: Buffer;
  actualSizeBytes: number;
}

function normalizedBase64(value: string): string {
  const normalized = value.replace(/\s/g, '');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) throw new Error('업로드 파일 인코딩을 확인할 수 없습니다. 다시 선택해 주세요.');
  return normalized;
}

function estimatedDecodedBytes(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function validatePreparedSizes(files: Array<UploadInputFile & { normalizedContentBase64: string; estimatedSizeBytes: number }>): void {
  const validation = validateUploadCandidates(files.map(({ name, mimeType, estimatedSizeBytes }) => ({ name, mimeType, sizeBytes: estimatedSizeBytes })));
  const declaredSizeErrors = files
    .filter((file) => Number.isFinite(file.sizeBytes) && file.sizeBytes !== file.estimatedSizeBytes)
    .map((file) => `${file.name}: 파일 크기 정보가 실제 업로드와 일치하지 않습니다.`);
  const errors = [...(validation.ok ? [] : validation.errors), ...declaredSizeErrors];
  if (errors.length) throw new Error(errors.join('\n'));
}

function prepareUploadFiles(files: UploadInputFile[]): PreparedUploadFile[] {
  const withEstimates = files.map((file) => {
    const normalizedContentBase64 = normalizedBase64(file.contentBase64);
    return { ...file, normalizedContentBase64, estimatedSizeBytes: estimatedDecodedBytes(normalizedContentBase64) };
  });
  validatePreparedSizes(withEstimates);
  return withEstimates.map((file) => {
    const plain = Buffer.from(file.normalizedContentBase64, 'base64');
    if (plain.byteLength !== file.estimatedSizeBytes) throw new Error(`${file.name}: 파일 크기 정보가 실제 업로드와 일치하지 않습니다.`);
    return { ...file, plain, actualSizeBytes: plain.byteLength };
  });
}

function assertCaseUploadBudget(db: SafeplanDb, caseId: string, incoming: Array<{ sizeBytes: number }>): void {
  const existing = db.evidenceFiles.filter((file) => file.caseId === caseId && file.deletedAt === null);
  const nextCount = existing.length + incoming.length;
  if (nextCount > LIMITS.maxFilesPerCase) throw new Error(`자료는 한 묶음당 최대 ${LIMITS.maxFilesPerCase}개까지 업로드할 수 있습니다.`);

  const existingBytes = existing.reduce((sum, file) => sum + file.sizeBytes, 0);
  const incomingBytes = incoming.reduce((sum, file) => sum + file.sizeBytes, 0);
  if (existingBytes + incomingBytes > bytesFromMb(LIMITS.maxTotalUploadMb)) throw new Error(`한 자료 묶음의 총 업로드 용량은 ${LIMITS.maxTotalUploadMb}MB를 넘을 수 없습니다.`);
}

export async function storeEvidenceFiles(caseId: string, files: UploadInputFile[]): Promise<EvidenceFileRecord[]> {
  const preparedFiles = prepareUploadFiles(files);
  assertCaseUploadBudget(await readDb(), caseId, preparedFiles.map((file) => ({ sizeBytes: file.actualSizeBytes })));
  const now = new Date().toISOString();
  const records: EvidenceFileRecord[] = [];

  for (const file of preparedFiles) {
    const encrypted = encryptBuffer(file.plain);
    const record: EvidenceFileRecord = {
      id: id('file'),
      caseId,
      originalName: file.name,
      mimeType: file.mimeType,
      sizeBytes: file.actualSizeBytes,
      gcsBucket: process.env.GCS_BUCKET_ORIGINALS || 'local-originals',
      gcsObject: `${caseId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9가-힣._-]/g, '_')}.enc`,
      encryptedDek: encrypted.encryptedDek,
      checksumSha256: encrypted.checksumSha256,
      materialType: inferMaterialType(file.mimeType, file.name),
      processingStatus: 'uploaded',
      userMemo: file.userMemo ?? null,
      uploadedAt: now,
      deletedAt: null
    };
    await writeObject(record.gcsBucket, record.gcsObject, encrypted.cipher);
    records.push(record);
  }

  try {
    await updateDb((db) => {
      assertCaseUploadBudget(db, caseId, records);
      db.evidenceFiles.push(...records);
      const caseRecord = db.cases.find((item) => item.id === caseId);
      if (caseRecord) {
        caseRecord.status = 'uploaded';
        caseRecord.updatedAt = now;
      }
      db.auditEvents.push({
        id: id('audit'),
        userId: caseRecord?.userId ?? null,
        caseId,
        type: 'evidence.uploaded',
        metadataJson: { fileCount: records.length, totalBytes: records.reduce((sum, item) => sum + item.sizeBytes, 0) },
        createdAt: now
      });
    });
  } catch (error) {
    await Promise.allSettled(records.map((record) => deleteObject(record.gcsBucket, record.gcsObject)));
    throw error;
  }
  return records;
}

export async function readEvidencePlain(file: EvidenceFileRecord): Promise<Buffer> {
  const payload = await readObject(file.gcsBucket, file.gcsObject);
  return decryptBuffer(payload, file.encryptedDek);
}

export async function deleteEvidenceObject(file: EvidenceFileRecord): Promise<void> {
  await deleteObject(file.gcsBucket, file.gcsObject);
}
