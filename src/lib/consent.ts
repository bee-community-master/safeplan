import { z } from 'zod';
import type { ConsentType } from './types';

export const CURRENT_CONSENT_VERSION = 'safeplan-consent-2026-05-17';

export const REQUIRED_AI_CONSENT_TYPES = ['sensitive_data', 'original_evidence', 'ai_processing', 'overseas_transfer', 'payment'] as const satisfies readonly ConsentType[];
export const CONSENT_TYPES = ['ai_processing', 'sensitive_data', 'overseas_transfer', 'payment', 'original_evidence'] as const satisfies readonly ConsentType[];

export const consentRequestSchema = z.object({
  caseId: z.string(),
  consentTypes: z.array(z.enum(CONSENT_TYPES)),
  version: z.literal(CURRENT_CONSENT_VERSION)
});

type ConsentRecordLike = { caseId: string; consentType: ConsentType; version: string };

export function hasCurrentConsent(records: ConsentRecordLike[], caseId: string, consentType: ConsentType): boolean {
  return records.some((record) => record.caseId === caseId && record.consentType === consentType && record.version === CURRENT_CONSENT_VERSION);
}

export function hasCurrentConsents(records: ConsentRecordLike[], caseId: string, consentTypes: readonly ConsentType[]): boolean {
  return consentTypes.every((consentType) => hasCurrentConsent(records, caseId, consentType));
}
