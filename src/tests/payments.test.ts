import { afterEach, describe, expect, it, vi } from 'vitest';
import { hmacSha256Hex } from '@/server/security/crypto';
import { verifyTossWebhookSignature } from '@/server/payments/provider';

describe('payment webhook verification', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('accepts a valid Toss-style HMAC signature and rejects missing signatures', () => {
    vi.stubEnv('TOSS_WEBHOOK_SECRET', 'webhook-secret-for-test');
    const rawBody = JSON.stringify({ eventType: 'PAYMENT_STATUS_CHANGED', data: { orderId: 'pay_1' } });
    const now = new Date('2026-05-17T00:00:00.000Z');
    const timestamp = String(Math.floor(now.getTime() / 1000));
    const signature = `v1=${hmacSha256Hex('webhook-secret-for-test', `${timestamp}.${rawBody}`)}`;

    expect(() => verifyTossWebhookSignature({ rawBody, timestampHeader: timestamp, signatureHeader: signature, now })).not.toThrow();
    expect(() => verifyTossWebhookSignature({ rawBody, timestampHeader: timestamp, signatureHeader: null, now })).toThrow('toss_webhook_signature_invalid');
  });
});
