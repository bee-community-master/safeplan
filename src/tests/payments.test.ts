import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CURRENT_CONSENT_VERSION } from '@/lib/consent';
import { createAnonymousCase } from '@/server/db/cases';
import { readDb, resetLocalDbCache, updateDb } from '@/server/db/local-store';
import { createPaymentIntent, handleTossWebhook } from '@/server/payments/provider';

let dir: string;

beforeEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
  dir = await mkdtemp(path.join(tmpdir(), 'safeplan-payment-test-'));
  process.env.SAFEPLAN_DATA_DIR = dir;
  process.env.APP_ENV = 'local';
  process.env.PAYMENT_PROVIDER = 'toss';
  process.env.TOSS_CLIENT_KEY = 'test-client-key';
  process.env.TOSS_SECRET_KEY = 'test-secret-key';
  resetLocalDbCache();
});

afterEach(async () => {
  vi.unstubAllGlobals();
  delete process.env.SAFEPLAN_DATA_DIR;
  delete process.env.APP_ENV;
  delete process.env.PAYMENT_PROVIDER;
  delete process.env.TOSS_CLIENT_KEY;
  delete process.env.TOSS_SECRET_KEY;
  resetLocalDbCache();
  if (dir) await rm(dir, { recursive: true, force: true });
});

describe('Toss webhook handling', () => {
  it('verifies general payment webhooks by retrieving the payment before marking paid', async () => {
    const caseRecord = await createAnonymousCase('session-payment-webhook');
    await updateDb((db) => {
      db.consentRecords.push({
        id: 'consent_payment',
        caseId: caseRecord.id,
        consentType: 'payment',
        version: CURRENT_CONSENT_VERSION,
        acceptedAt: new Date().toISOString(),
        ipHash: null,
        userAgentHash: null
      });
    });
    const intent = await createPaymentIntent(caseRecord.id);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ paymentKey: 'toss_payment_key', orderId: intent.paymentId, totalAmount: 9900, status: 'DONE' })
      })
    );

    await expect(handleTossWebhook({ eventType: 'PAYMENT_STATUS_CHANGED', data: { paymentKey: 'toss_payment_key', orderId: intent.paymentId } })).resolves.toEqual({ ok: true });

    const db = await readDb();
    const paid = db.paymentIntents.find((item) => item.id === intent.paymentId);
    expect(paid?.status).toBe('paid');
    expect(paid?.providerPaymentKey).toBe('toss_payment_key');
  });
});
