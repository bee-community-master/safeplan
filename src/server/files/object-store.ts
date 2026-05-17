import 'server-only';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Storage } from '@google-cloud/storage';
import { dataDir } from '@/server/db/local-store';

let storageClient: Storage | null = null;

export function storageProvider(): 'local' | 'gcs' {
  return process.env.STORAGE_PROVIDER === 'gcs' ? 'gcs' : 'local';
}

function storage(): Storage {
  storageClient ??= new Storage();
  return storageClient;
}

function localObjectPath(bucket: string, objectName: string): string {
  return path.join(dataDir(), 'objects', bucket, objectName.replaceAll('/', '__'));
}

export async function writeObject(bucket: string, objectName: string, data: Buffer, contentType = 'application/octet-stream'): Promise<void> {
  if (storageProvider() === 'gcs') {
    await storage()
      .bucket(bucket)
      .file(objectName)
      .save(data, {
        resumable: false,
        contentType,
        metadata: { cacheControl: 'private, no-store, max-age=0' }
      });
    return;
  }
  const target = localObjectPath(bucket, objectName);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, data);
}

export async function readObject(bucket: string, objectName: string): Promise<Buffer> {
  if (storageProvider() === 'gcs') {
    const [data] = await storage().bucket(bucket).file(objectName).download();
    return data;
  }
  return readFile(localObjectPath(bucket, objectName));
}

export async function deleteObject(bucket: string, objectName: string): Promise<void> {
  if (storageProvider() === 'gcs') {
    await storage().bucket(bucket).file(objectName).delete({ ignoreNotFound: true });
    return;
  }
  await rm(localObjectPath(bucket, objectName), { force: true });
}
