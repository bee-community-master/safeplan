import 'server-only';
import { LIMITS } from '@/lib/constants';
import type { CaseRecord, SafeplanDb, UserRecord } from './types';
import { retentionUntil, updateDb } from './local-store';
import { id } from '@/server/security/crypto';

export async function createAnonymousCase(sessionId: string): Promise<CaseRecord> {
  const now = new Date().toISOString();
  return updateDb((db) => {
    let user = db.users.find((candidate) => candidate.authProvider === 'anonymous' && candidate.id === `anon_${sessionId.slice(0, 16)}`);
    if (!user) {
      user = {
        id: `anon_${sessionId.slice(0, 16)}`,
        email: null,
        authProvider: 'anonymous',
        createdAt: now
      } satisfies UserRecord;
      db.users.push(user);
    }
    const record: CaseRecord = {
      id: id('case'),
      userId: user.id,
      sessionId,
      title: '독립 세이프플랜 상담자료 준비',
      status: 'draft',
      retentionUntil: retentionUntil(new Date()),
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };
    db.cases.push(record);
    db.auditEvents.push({
      id: id('audit'),
      userId: user.id,
      caseId: record.id,
      type: 'case.created',
      metadataJson: { retentionDays: LIMITS.evidenceRetentionDays },
      createdAt: now
    });
    return record;
  });
}

export function toCaseSummary(caseRecord: CaseRecord) {
  return {
    id: caseRecord.id,
    title: caseRecord.title,
    status: caseRecord.status,
    retentionUntil: caseRecord.retentionUntil,
    createdAt: caseRecord.createdAt,
    updatedAt: caseRecord.updatedAt
  };
}

export function activeCaseOrThrow(db: SafeplanDb, caseId: string): CaseRecord {
  const caseRecord = db.cases.find((item) => item.id === caseId && item.deletedAt === null);
  if (!caseRecord) throw new Error('case_not_found');
  return caseRecord;
}
