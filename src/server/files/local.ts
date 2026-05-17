import 'server-only';
import { inferMaterialType, validateUploadCandidates } from '@/lib/evidence';
import type { EvidenceFileRecord } from '@/server/db/types';
import { updateDb } from '@/server/db/local-store';
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

function prepareUploadFiles(files: UploadInputFile[]): PreparedUploadFile[] {
  const prepared = files.map((file) => {
    const plain = Buffer.from(file.contentBase64, 'base64');
    return { ...file, plain, actualSizeBytes: plain.byteLength };
  });
  const validation = validateUploadCandidates(prepared.map(({ name, mimeType, actualSizeBytes }) => ({ name, mimeType, sizeBytes: actualSizeBytes })));
  const declaredSizeErrors = prepared
    .filter((file) => Number.isFinite(file.sizeBytes) && file.sizeBytes !== file.actualSizeBytes)
    .map((file) => `${file.name}: 파일 크기 정보가 실제 업로드와 일치하지 않습니다.`);
  const errors = [...(validation.ok ? [] : validation.errors), ...declaredSizeErrors];
  if (errors.length) throw new Error(errors.join('\n'));
  return prepared;
}

export async function storeEvidenceFiles(caseId: string, files: UploadInputFile[]): Promise<EvidenceFileRecord[]> {
  const preparedFiles = prepareUploadFiles(files);
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

  await updateDb((db) => {
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
  return records;
}

export async function readEvidencePlain(file: EvidenceFileRecord): Promise<Buffer> {
  const payload = await readObject(file.gcsBucket, file.gcsObject);
  return decryptBuffer(payload, file.encryptedDek);
}

export async function deleteEvidenceObject(file: EvidenceFileRecord): Promise<void> {
  await deleteObject(file.gcsBucket, file.gcsObject);
}
