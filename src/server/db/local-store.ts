import 'server-only';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { LIMITS } from '@/lib/constants';
import type { SafeplanDb } from './types';
import { readPrismaDb, updatePrismaDb, writePrismaDb } from './prisma-store';

const defaultDb = (): SafeplanDb => ({
  users: [],
  cases: [],
  consentRecords: [],
  evidenceFiles: [],
  extractionResults: [],
  evidenceCards: [],
  paymentIntents: [],
  reports: [],
  shareLinks: [],
  auditEvents: [],
  processingJobs: []
});

let queue = Promise.resolve();
let cachedPath = '';
let cachedDb: SafeplanDb | null = null;

export function dbBackend(): 'local' | 'prisma' {
  return process.env.SAFEPLAN_DB_BACKEND === 'prisma' ? 'prisma' : 'local';
}

export function dataDir(): string {
  return process.env.SAFEPLAN_DATA_DIR || path.join(process.cwd(), '.safeplan-data');
}

function dbPath(): string {
  return path.join(dataDir(), 'db.json');
}

export function retentionUntil(from = new Date()): string {
  const date = new Date(from);
  date.setDate(date.getDate() + LIMITS.evidenceRetentionDays);
  return date.toISOString();
}

export async function readDb(): Promise<SafeplanDb> {
  if (dbBackend() === 'prisma') return readPrismaDb();
  const currentPath = dbPath();
  if (cachedDb && cachedPath === currentPath) return structuredClone(cachedDb);
  await mkdir(path.dirname(currentPath), { recursive: true });
  try {
    const raw = await readFile(currentPath, 'utf8');
    const parsed = JSON.parse(raw) as SafeplanDb;
    cachedPath = currentPath;
    cachedDb = { ...defaultDb(), ...parsed };
    return structuredClone(cachedDb);
  } catch (error) {
    const maybe = error as NodeJS.ErrnoException;
    if (maybe.code !== 'ENOENT') throw error;
    const fresh = defaultDb();
    cachedPath = currentPath;
    cachedDb = fresh;
    await writeDb(fresh);
    return structuredClone(fresh);
  }
}

async function writeDb(db: SafeplanDb): Promise<void> {
  if (dbBackend() === 'prisma') {
    await writePrismaDb(db);
    return;
  }
  const currentPath = dbPath();
  await mkdir(path.dirname(currentPath), { recursive: true });
  const tempPath = `${currentPath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempPath, JSON.stringify(db, null, 2));
  await rename(tempPath, currentPath);
  cachedPath = currentPath;
  cachedDb = structuredClone(db);
}

export async function updateDb<T>(mutator: (db: SafeplanDb) => T | Promise<T>): Promise<T> {
  if (dbBackend() === 'prisma') return updatePrismaDb(mutator);

  const run = async () => {
    const db = await readDb();
    const result = await mutator(db);
    await writeDb(db);
    return result;
  };
  const next = queue.then(run, run);
  queue = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

export function resetLocalDbCache(): void {
  cachedDb = null;
  cachedPath = '';
}
