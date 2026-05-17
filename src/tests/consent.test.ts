import { describe, expect, it } from 'vitest';
import { CURRENT_CONSENT_VERSION, consentRequestSchema } from '@/lib/consent';

describe('consent request contract', () => {
  it('requires the server-owned current consent version', () => {
    const valid = {
      caseId: 'case_1',
      consentTypes: ['sensitive_data', 'original_evidence', 'ai_processing', 'overseas_transfer', 'payment'],
      version: CURRENT_CONSENT_VERSION
    };

    expect(consentRequestSchema.parse(valid).version).toBe(CURRENT_CONSENT_VERSION);
    expect(() => consentRequestSchema.parse({ ...valid, version: 'old-version' })).toThrow();
    expect(() => consentRequestSchema.parse({ caseId: valid.caseId, consentTypes: valid.consentTypes })).toThrow();
  });
});
