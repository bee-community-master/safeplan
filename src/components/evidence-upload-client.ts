type TossPaymentClient = { requestPayment: (method: string, options: Record<string, unknown>) => Promise<void> };

export type PaymentProvider = 'mock' | 'toss';

export interface PaymentCreateResponse {
  payment: {
    paymentId: string;
    provider: PaymentProvider;
    clientKey?: string;
    orderId?: string;
    orderName?: string;
    amountKrw: number;
    successUrl?: string;
    failUrl?: string;
  };
}

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => TossPaymentClient;
  }
}

export function friendlyClientError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/sdk|toss|payment_config|confirm|failed|_/.test(message)) return '결제 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
  return message;
}

export async function expectJson<T extends { error?: string }>(response: Response, fallbackError: string): Promise<T> {
  const data = (await response.json()) as T;
  if (!response.ok) throw new Error(data.error || fallbackError);
  return data;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function uploadPayload(files: FileList) {
  return Promise.all(
    Array.from(files).map(async (file) => ({
      name: file.name,
      mimeType: file.type || 'text/plain',
      sizeBytes: file.size,
      contentBase64: await fileToBase64(file),
      userMemo: ''
    }))
  );
}

export function loadTossPayments(): Promise<void> {
  if (window.TossPayments) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-safeplan-toss="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('toss_sdk_load_failed')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.tosspayments.com/v1/payment';
    script.async = true;
    script.dataset.safeplanToss = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('toss_sdk_load_failed'));
    document.head.appendChild(script);
  });
}
