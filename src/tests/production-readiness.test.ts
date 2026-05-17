import { afterEach, describe, expect, it, vi } from 'vitest';
import { productionReadiness } from '@/server/ops/readiness';
import { signValue, verifySignedValue } from '@/server/security/crypto';

describe('production readiness gates', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('blocks production when persistent runtime services are missing', () => {
    vi.stubEnv('APP_ENV', 'production');
    vi.stubEnv('APP_URL', 'http://localhost:3000');
    vi.stubEnv('SAFEPLAN_DB_BACKEND', 'local');
    vi.stubEnv('STORAGE_PROVIDER', 'local');
    vi.stubEnv('SESSION_SECRET', 'change-me');
    vi.stubEnv('PAYMENT_PROVIDER', 'mock');
    vi.stubEnv('AI_PROVIDER_MODE', 'mock');

    const report = productionReadiness();

    expect(report.ready).toBe(false);
    expect(report.checks.filter((check) => !check.ok).map((check) => check.name)).toEqual(
      expect.arrayContaining(['app_url_https', 'session_secret_strength', 'database_backend', 'object_storage', 'kms_configuration', 'ai_provider_mode', 'payment_provider', 'public_support_channel'])
    );
  });

  it('passes when production env uses Prisma, GCS, real AI, Toss, and HTTPS', () => {
    vi.stubEnv('APP_ENV', 'production');
    vi.stubEnv('APP_URL', 'https://safeplan.example.com');
    vi.stubEnv('SESSION_SECRET', 'a-production-secret-with-more-than-32-characters');
    vi.stubEnv('SAFEPLAN_DB_BACKEND', 'prisma');
    vi.stubEnv('DATABASE_URL', 'postgresql://safeplan:test@localhost:5432/safeplan');
    vi.stubEnv('STORAGE_PROVIDER', 'gcs');
    vi.stubEnv('GCS_BUCKET_ORIGINALS', 'safeplan-originals');
    vi.stubEnv('GCS_BUCKET_DERIVED', 'safeplan-derived');
    vi.stubEnv('GCS_BUCKET_REPORTS', 'safeplan-reports');
    vi.stubEnv('KMS_KEY_NAME', 'projects/p/locations/l/keyRings/r/cryptoKeys/k');
    vi.stubEnv('ENVELOPE_MASTER_KEY_BASE64', Buffer.alloc(32, 7).toString('base64'));
    vi.stubEnv('AI_PROVIDER_MODE', 'real');
    vi.stubEnv('MISTRAL_API_KEY', 'mistral');
    vi.stubEnv('GROQ_API_KEY', 'groq');
    vi.stubEnv('BASETEN_API_KEY', 'baseten');
    vi.stubEnv('BASETEN_CLASSIFIER_URL', 'https://model.example.com');
    vi.stubEnv('BASETEN_IMAGE_DESCRIPTION_URL', 'https://image-description.example.com');
    vi.stubEnv('PAYMENT_PROVIDER', 'toss');
    vi.stubEnv('TOSS_CLIENT_KEY', 'client');
    vi.stubEnv('TOSS_SECRET_KEY', 'secret');
    vi.stubEnv('NEXT_PUBLIC_SUPPORT_EMAIL', 'support@safeplan.example.com');

    expect(productionReadiness().ready).toBe(true);
  });
});

describe('signed session helpers', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('rejects tampered signatures', () => {
    vi.stubEnv('SESSION_SECRET', 'test-secret-with-more-than-32-characters');
    const signature = signValue('session-a');
    expect(verifySignedValue('session-a', signature)).toBe(true);
    expect(verifySignedValue('session-b', signature)).toBe(false);
  });
});
