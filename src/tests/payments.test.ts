import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CURRENT_CONSENT_VERSION } from '@/lib/consent';
import { createAnonymousCase } from '@/server/db/cases';
import { readDb, resetLocalDbCache, updateDb } from '@/server/db/local-store';
import { deleteCaseDeep } from '@/server/db/deletion';
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

async function createTossIntent(sessionId: string) {
  const caseRecord = await createAnonymousCase(sessionId);
  await updateDb((db) => {
    db.consentRecords.push({
      id: `consent_payment_${sessionId}`,
      caseId: caseRecord.id,
      consentType: 'payment',
      version: CURRENT_CONSENT_VERSION,
      acceptedAt: new Date().toISOString(),
      ipHash: null,
      userAgentHash: null
    });
  });
  return { caseRecord, intent: await createPaymentIntent(caseRecord.id) };
}

function stubTossRetrieve(payment: { paymentKey: string; orderId: string; totalAmount: number; status: string }) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => payment });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('Toss webhook handling', () => {
  it('verifies general payment webhooks by retrieving the payment before marking paid', async () => {
    const { intent } = await createTossIntent('session-payment-webhook');
    const fetchMock = stubTossRetrieve({ paymentKey: 'toss_payment_key', orderId: intent.paymentId, totalAmount: 9900, status: 'DONE' });

    await expect(handleTossWebhook({ eventType: 'PAYMENT_STATUS_CHANGED', data: { paymentKey: 'toss_payment_key', orderId: intent.paymentId } })).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.tosspayments.com/v1/payments/toss_payment_key',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: expect.stringMatching(/^Basic /) }) })
    );
    const db = await readDb();
    const paid = db.paymentIntents.find((item) => item.id === intent.paymentId);
    expect(paid?.status).toBe('paid');
    expect(paid?.providerPaymentKey).toBe('toss_payment_key');
  });

  it('ignores webhook bodies when the Toss retrieve result is not a completed matching payment', async () => {
    const mismatchCases = [
      { paymentKey: 'toss_canceled', status: 'CANCELED', orderId: 'same', totalAmount: 9900 },
      { paymentKey: 'toss_wrong_order', status: 'DONE', orderId: 'other_order', totalAmount: 9900 },
      { paymentKey: 'toss_wrong_amount', status: 'DONE', orderId: 'same', totalAmount: 100 }
    ];

    for (const mismatch of mismatchCases) {
      const { intent } = await createTossIntent(`session-${mismatch.paymentKey}`);
      stubTossRetrieve({ ...mismatch, orderId: mismatch.orderId === 'same' ? intent.paymentId : mismatch.orderId });

      await expect(
        handleTossWebhook({
          eventType: 'PAYMENT_STATUS_CHANGED',
          data: { paymentKey: mismatch.paymentKey, orderId: intent.paymentId, status: 'DONE', totalAmount: 9900 }
        })
      ).resolves.toEqual({ ok: true, ignored: true });

      const db = await readDb();
      expect(db.paymentIntents.find((item) => item.id === intent.paymentId)?.status).toBe('created');
    }
  });

  it('ignores verified Toss webhook events after a case has been deleted', async () => {
    const { caseRecord, intent } = await createTossIntent('session-payment-delete');
    await deleteCaseDeep(caseRecord.id);
    const fetchMock = stubTossRetrieve({ paymentKey: 'toss_after_delete', orderId: intent.paymentId, totalAmount: 9900, status: 'DONE' });

    await expect(handleTossWebhook({ eventType: 'PAYMENT_STATUS_CHANGED', data: { paymentKey: 'toss_after_delete', orderId: intent.paymentId } })).resolves.toEqual({ ok: true, ignored: true });

    expect(fetchMock).not.toHaveBeenCalled();
    const db = await readDb();
    expect(db.paymentIntents.find((item) => item.id === intent.paymentId)?.status).toBe('created');
  });
});
