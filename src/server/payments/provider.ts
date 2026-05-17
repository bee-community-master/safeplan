import 'server-only';
import { PRICE_KRW } from '@/lib/constants';
import type { PaymentIntentRecord } from '@/server/db/types';
import { updateDb } from '@/server/db/local-store';
import { id } from '@/server/security/crypto';

export interface PaymentIntentResult {
  paymentId: string;
  provider: 'mock' | 'toss';
  amountKrw: number;
  status: PaymentIntentRecord['status'];
  checkoutUrl: string | null;
}

export function paymentProvider(): 'mock' | 'toss' {
  if (process.env.PAYMENT_PROVIDER === 'toss' && process.env.TOSS_CLIENT_KEY && process.env.TOSS_SECRET_KEY) return 'toss';
  return 'mock';
}

export async function createPaymentIntent(caseId: string): Promise<PaymentIntentResult> {
  const provider = paymentProvider();
  const now = new Date().toISOString();
  const record = await updateDb((db) => {
    const existing = db.paymentIntents.find((payment) => payment.caseId === caseId && payment.status !== 'cancelled');
    if (existing) return existing;
    const payment: PaymentIntentRecord = {
      id: id('pay'),
      caseId,
      provider,
      amountKrw: PRICE_KRW,
      status: 'created',
      providerPaymentKey: null,
      createdAt: now,
      paidAt: null
    };
    db.paymentIntents.push(payment);
    db.auditEvents.push({ id: id('audit'), userId: db.cases.find((item) => item.id === caseId)?.userId ?? null, caseId, type: 'payment.created', metadataJson: { provider, amountKrw: PRICE_KRW }, createdAt: now });
    return payment;
  });
  return {
    paymentId: record.id,
    provider: record.provider,
    amountKrw: record.amountKrw,
    status: record.status,
    checkoutUrl: provider === 'toss' ? null : null
  };
}

export async function completeMockPayment(caseId: string, paymentId: string): Promise<PaymentIntentRecord> {
  const now = new Date().toISOString();
  return updateDb((db) => {
    const payment = db.paymentIntents.find((item) => item.id === paymentId && item.caseId === caseId);
    if (!payment) throw new Error('payment_not_found');
    if (payment.provider !== 'mock') throw new Error('mock_payment_only');
    payment.status = 'paid';
    payment.providerPaymentKey = `mock_${payment.id}`;
    payment.paidAt = now;
    const caseRecord = db.cases.find((item) => item.id === caseId);
    if (caseRecord) {
      caseRecord.status = 'paid';
      caseRecord.updatedAt = now;
    }
    db.auditEvents.push({ id: id('audit'), userId: caseRecord?.userId ?? null, caseId, type: 'payment.paid', metadataJson: { provider: 'mock', amountKrw: payment.amountKrw }, createdAt: now });
    return payment;
  });
}

export async function verifyTossWebhook(): Promise<{ ok: boolean; provider: 'toss' }> {
  if (!process.env.TOSS_WEBHOOK_SECRET) throw new Error('toss_webhook_secret_missing');
  return { ok: true, provider: 'toss' };
}
