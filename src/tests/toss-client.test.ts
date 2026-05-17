import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadTossPayments, requestTossStandardPayment } from '@/components/evidence-upload-client';

describe('Toss standard checkout client', () => {
  afterEach(() => {
    document.head.innerHTML = '';
    delete window.TossPayments;
    vi.restoreAllMocks();
  });

  it('loads the Toss Payments v2 standard SDK', async () => {
    const pending = loadTossPayments();
    const script = document.querySelector<HTMLScriptElement>('script[data-safeplan-toss="true"]');
    expect(script).not.toBeNull();
    expect(script?.src).toBe('https://js.tosspayments.com/v2/standard');
    script?.dispatchEvent(new Event('load'));
    await expect(pending).resolves.toBeUndefined();
  });

  it('requests a card payment with the documented v2 standard payload shape', async () => {
    const requestPayment = vi.fn().mockResolvedValue(undefined);
    const payment = vi.fn(() => ({ requestPayment }));
    window.TossPayments = vi.fn(() => ({ payment }));

    await requestTossStandardPayment({
      paymentId: 'pay_123',
      provider: 'toss',
      amountKrw: 9900,
      clientKey: 'test_ck',
      orderId: 'pay_123',
      orderName: '독립 세이프플랜 자료 정리 리포트',
      successUrl: 'https://safeplan.example.com/success',
      failUrl: 'https://safeplan.example.com/fail'
    });

    expect(payment).toHaveBeenCalledWith({ customerKey: 'ANONYMOUS' });
    expect(requestPayment).toHaveBeenCalledWith({
      method: 'CARD',
      amount: { currency: 'KRW', value: 9900 },
      orderId: 'pay_123',
      orderName: '독립 세이프플랜 자료 정리 리포트',
      successUrl: 'https://safeplan.example.com/success',
      failUrl: 'https://safeplan.example.com/fail'
    });
  });
});
