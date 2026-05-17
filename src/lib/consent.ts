import type { ConsentType } from './types';

export const CURRENT_CONSENT_VERSION = 'safeplan-consent-2026-05-17';

export const REQUIRED_AI_CONSENT_TYPES = ['sensitive_data', 'original_evidence', 'ai_processing', 'overseas_transfer', 'payment'] as const satisfies readonly ConsentType[];

type ConsentRecordLike = { caseId: string; consentType: ConsentType; version: string };

export function hasCurrentConsent(records: ConsentRecordLike[], caseId: string, consentType: ConsentType): boolean {
  return records.some((record) => record.caseId === caseId && record.consentType === consentType && record.version === CURRENT_CONSENT_VERSION);
}

export function hasCurrentConsents(records: ConsentRecordLike[], caseId: string, consentTypes: readonly ConsentType[]): boolean {
  return consentTypes.every((consentType) => hasCurrentConsent(records, caseId, consentType));
}
