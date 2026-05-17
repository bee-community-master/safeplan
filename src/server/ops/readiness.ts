import 'server-only';
import { dbBackend } from '@/server/db/local-store';
import { storageProvider } from '@/server/files/object-store';

export interface ReadinessCheck {
  name: string;
  ok: boolean;
  severity: 'blocker' | 'warning';
  detail: string;
}

export interface ReadinessReport {
  appEnv: string;
  ready: boolean;
  checks: ReadinessCheck[];
}

function present(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

function add(checks: ReadinessCheck[], check: ReadinessCheck): void {
  checks.push(check);
}

export function productionReadiness(): ReadinessReport {
  const appEnv = process.env.APP_ENV || 'local';
  const production = appEnv === 'production';
  const checks: ReadinessCheck[] = [];
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || '';
  const sessionSecret = process.env.SESSION_SECRET || '';

  add(checks, {
    name: 'app_url_https',
    ok: !production || appUrl.startsWith('https://'),
    severity: 'blocker',
    detail: production ? 'APP_URL/NEXT_PUBLIC_APP_URL must be HTTPS in production.' : 'Non-production may use localhost HTTP.'
  });
  add(checks, {
    name: 'session_secret_strength',
    ok: !production || (sessionSecret.length >= 32 && !sessionSecret.includes('change-me')),
    severity: 'blocker',
    detail: 'SESSION_SECRET must be a unique 32+ character secret.'
  });
  add(checks, {
    name: 'database_backend',
    ok: !production || (dbBackend() === 'prisma' && present('DATABASE_URL')),
    severity: 'blocker',
    detail: 'Production must use SAFEPLAN_DB_BACKEND=prisma with DATABASE_URL.'
  });
  add(checks, {
    name: 'object_storage',
    ok: !production || (storageProvider() === 'gcs' && present('GCS_BUCKET_ORIGINALS') && present('GCS_BUCKET_DERIVED') && present('GCS_BUCKET_REPORTS')),
    severity: 'blocker',
    detail: 'Production must use STORAGE_PROVIDER=gcs with originals/reports buckets.'
  });
  add(checks, {
    name: 'kms_configuration',
    ok: !production || (present('KMS_KEY_NAME') && present('ENVELOPE_MASTER_KEY_BASE64')),
    severity: 'blocker',
    detail: 'KMS_KEY_NAME and a 32-byte ENVELOPE_MASTER_KEY_BASE64 secret are required for production envelope-key configuration.'
  });
  add(checks, {
    name: 'ai_provider_mode',
    ok: !production || (process.env.AI_PROVIDER_MODE === 'real' && present('MISTRAL_API_KEY') && present('GROQ_API_KEY') && present('BASETEN_API_KEY') && present('BASETEN_CLASSIFIER_URL')),
    severity: 'blocker',
    detail: 'Production evidence processing must use real Mistral/Groq/Baseten credentials.'
  });
  add(checks, {
    name: 'payment_provider',
    ok: !production || (process.env.PAYMENT_PROVIDER === 'toss' && present('TOSS_CLIENT_KEY') && present('TOSS_SECRET_KEY') && present('TOSS_WEBHOOK_SECRET')),
    severity: 'blocker',
    detail: 'Production payment must use Toss credentials; mock payment is local/test only.'
  });
  add(checks, {
    name: 'public_support_channel',
    ok: !production || present('NEXT_PUBLIC_SUPPORT_EMAIL'),
    severity: 'blocker',
    detail: 'Production must expose a public support email for refunds, deletion, and incident follow-up.'
  });

  return {
    appEnv,
    ready: checks.filter((check) => check.severity === 'blocker').every((check) => check.ok),
    checks
  };
}
