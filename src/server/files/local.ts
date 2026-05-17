import 'server-only';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { inferMaterialType, validateUploadCandidates } from '@/lib/evidence';
import type { EvidenceFileRecord } from '@/server/db/types';
import { dataDir, updateDb } from '@/server/db/local-store';
import { decryptBuffer, encryptBuffer, id } from '@/server/security/crypto';

export interface UploadInputFile {
  name: string;
  mimeType: string;
  sizeBytes: number;
  contentBase64: string;
  userMemo?: string | null;
}

function originalsDir(): string {
  return path.join(dataDir(), 'originals');
}

export function localObjectPath(objectName: string): string {
  return path.join(originalsDir(), objectName);
}

export async function storeEvidenceFiles(caseId: string, files: UploadInputFile[]): Promise<EvidenceFileRecord[]> {
  const validation = validateUploadCandidates(files.map(({ name, mimeType, sizeBytes }) => ({ name, mimeType, sizeBytes })));
  if (!validation.ok) throw new Error(validation.errors.join('\n'));
  await mkdir(originalsDir(), { recursive: true });
  const now = new Date().toISOString();
  const records: EvidenceFileRecord[] = [];

  for (const file of files) {
    const plain = Buffer.from(file.contentBase64, 'base64');
    const encrypted = encryptBuffer(plain);
    const record: EvidenceFileRecord = {
      id: id('file'),
      caseId,
      originalName: file.name,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes || plain.byteLength,
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
    await writeFile(localObjectPath(record.gcsObject.replaceAll('/', '__')), encrypted.cipher);
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
  const payload = await readFile(localObjectPath(file.gcsObject.replaceAll('/', '__')));
  return decryptBuffer(payload, file.encryptedDek);
}

export async function deleteEvidenceObject(file: EvidenceFileRecord): Promise<void> {
  await rm(localObjectPath(file.gcsObject.replaceAll('/', '__')), { force: true });
}
