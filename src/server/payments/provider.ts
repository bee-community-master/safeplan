import 'server-only';
import { PRICE_KRW } from '@/lib/constants';
import { appUrl } from '@/lib/url';
import type { PaymentIntentRecord } from '@/server/db/types';
import { readDb, updateDb } from '@/server/db/local-store';
import { id } from '@/server/security/crypto';

export interface PaymentIntentResult {
  paymentId: string;
  provider: 'mock' | 'toss';
  amountKrw: number;
  status: PaymentIntentRecord['status'];
  checkoutUrl: string | null;
  clientKey?: string;
  orderId?: string;
  orderName?: string;
  successUrl?: string;
  failUrl?: string;
}

export interface TossConfirmInput {
  caseId: string;
  paymentId: string;
  paymentKey: string;
  orderId: string;
  amount: number;
}

export function paymentProvider(): 'mock' | 'toss' {
  if (process.env.PAYMENT_PROVIDER === 'toss' && process.env.TOSS_CLIENT_KEY && process.env.TOSS_SECRET_KEY) return 'toss';
  return 'mock';
}

function assertTossConfigured(): { clientKey: string; secretKey: string } {
  const clientKey = process.env.TOSS_CLIENT_KEY;
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!clientKey || !secretKey) throw new Error('toss_credentials_missing');
  return { clientKey, secretKey };
}

function tossAuthHeader(secretKey: string): string {
  return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;
}

async function confirmWithToss(secretKey: string, input: { paymentKey: string; orderId: string; amount: number }): Promise<unknown> {
  const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      Authorization: tossAuthHeader(secretKey),
      'Content-Type': 'application/json',
      'Idempotency-Key': input.orderId
    },
    body: JSON.stringify(input)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const category = typeof data === 'object' && data && 'code' in data ? String((data as { code?: unknown }).code) : 'toss_confirm_failed';
    throw new Error(category);
  }
  return data;
}

async function retrieveTossPayment(secretKey: string, paymentKey: string): Promise<{ orderId?: string; totalAmount?: number; status?: string; paymentKey?: string }> {
  const response = await fetch(`https://api.tosspayments.com/v1/payments/${encodeURIComponent(paymentKey)}`, {
    headers: { Authorization: tossAuthHeader(secretKey) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error('toss_retrieve_failed');
  return data as { orderId?: string; totalAmount?: number; status?: string; paymentKey?: string };
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

  if (record.provider === 'toss') {
    const { clientKey } = assertTossConfigured();
    const successUrl = appUrl(`/evidence/${caseId}/upload?payment=success&paymentId=${record.id}`);
    const failUrl = appUrl(`/evidence/${caseId}/upload?payment=failed&paymentId=${record.id}`);
    return {
      paymentId: record.id,
      provider: record.provider,
      amountKrw: record.amountKrw,
      status: record.status,
      checkoutUrl: null,
      clientKey,
      orderId: record.id,
      orderName: '독립 세이프플랜 자료 정리 리포트',
      successUrl,
      failUrl
    };
  }

  return {
    paymentId: record.id,
    provider: record.provider,
    amountKrw: record.amountKrw,
    status: record.status,
    checkoutUrl: null
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

async function markTossPaid(caseId: string, paymentId: string, paymentKey: string): Promise<PaymentIntentRecord> {
  const now = new Date().toISOString();
  return updateDb((db) => {
    const payment = db.paymentIntents.find((item) => item.id === paymentId && item.caseId === caseId);
    if (!payment) throw new Error('payment_not_found');
    if (payment.provider !== 'toss') throw new Error('toss_payment_required');
    if (payment.amountKrw !== PRICE_KRW) throw new Error('payment_amount_mismatch');
    payment.status = 'paid';
    payment.providerPaymentKey = paymentKey;
    payment.paidAt = now;
    const caseRecord = db.cases.find((item) => item.id === caseId);
    if (caseRecord) {
      caseRecord.status = 'paid';
      caseRecord.updatedAt = now;
    }
    db.auditEvents.push({ id: id('audit'), userId: caseRecord?.userId ?? null, caseId, type: 'payment.paid', metadataJson: { provider: 'toss', amountKrw: payment.amountKrw }, createdAt: now });
    return payment;
  });
}

export async function confirmTossPayment(input: TossConfirmInput): Promise<PaymentIntentRecord> {
  if (input.amount !== PRICE_KRW) throw new Error('payment_amount_mismatch');
  if (input.orderId !== input.paymentId) throw new Error('payment_order_mismatch');
  const { secretKey } = assertTossConfigured();
  await confirmWithToss(secretKey, { paymentKey: input.paymentKey, orderId: input.orderId, amount: input.amount });
  return markTossPaid(input.caseId, input.paymentId, input.paymentKey);
}

export async function handleTossWebhook(body: unknown): Promise<{ ok: boolean; ignored?: boolean }> {
  assertTossConfigured();
  const event = body as { eventType?: string; data?: { paymentKey?: string; orderId?: string; status?: string; totalAmount?: number } };
  if (event.eventType !== 'PAYMENT_STATUS_CHANGED' || !event.data?.paymentKey || !event.data.orderId) return { ok: true, ignored: true };
  const { secretKey } = assertTossConfigured();
  const payment = await retrieveTossPayment(secretKey, event.data.paymentKey);
  if (payment.status !== 'DONE' || payment.orderId !== event.data.orderId || payment.totalAmount !== PRICE_KRW) return { ok: true, ignored: true };
  const db = await readDb();
  const record = db.paymentIntents.find((item) => item.id === event.data?.orderId && item.provider === 'toss');
  if (!record) return { ok: true, ignored: true };
  await markTossPaid(record.caseId, record.id, event.data.paymentKey);
  return { ok: true };
}
