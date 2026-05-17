'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CURRENT_CONSENT_VERSION } from '@/lib/consent';
import { LEGAL_CAUTION_COPY, SUPPORTED_MIME_TYPES } from '@/lib/constants';
import { validateUploadCandidates } from '@/lib/evidence';
import { EvidenceConsentChecklist, INITIAL_CONSENTS, type ConsentState } from './EvidenceConsentChecklist';
import { expectJson, friendlyClientError, loadTossPayments, uploadPayload, type PaymentCreateResponse } from './evidence-upload-client';

type Stage = 'idle' | 'uploaded' | 'consented' | 'paid' | 'processed';
export function EvidenceUploadFlow({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [files, setFiles] = useState<FileList | null>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [message, setMessage] = useState('');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [consents, setConsents] = useState<ConsentState>(INITIAL_CONSENTS);
  const confirmationStarted = useRef(false);
  const allConsents = Object.values(consents).every(Boolean);

  useEffect(() => {
    async function confirmReturnedTossPayment(params: URLSearchParams) {
      const paymentKey = params.get('paymentKey');
      const orderId = params.get('orderId');
      const amount = Number(params.get('amount'));
      const returnedPaymentId = params.get('paymentId') || orderId;
      if (!paymentKey || !orderId || !returnedPaymentId || !amount) {
        setMessage('결제 승인 정보가 부족합니다. 다시 시도하세요.');
        return;
      }
      confirmationStarted.current = true;
      await run(async () => {
        const response = await fetch('/api/payments/toss-confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caseId, paymentId: returnedPaymentId, paymentKey, orderId, amount })
        });
        await expectJson(response, 'toss_confirm_failed');
        setPaymentId(returnedPaymentId);
        setStage('paid');
        setMessage('결제가 승인되었습니다. 이제 자료 정리를 시작할 수 있습니다.');
        window.history.replaceState(null, '', window.location.pathname);
      });
    }

    if (confirmationStarted.current || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'failed') {
      setMessage('결제가 완료되지 않았습니다. 결제창에서 다시 시도해 주세요.');
      return;
    }
    if (params.get('payment') !== 'success') return;
    void confirmReturnedTossPayment(params);
  }, [caseId]);

  async function upload() {
    if (!files?.length) return setMessage('업로드할 파일을 선택하세요.');
    const validation = validateUploadCandidates(Array.from(files).map((file) => ({ name: file.name, mimeType: file.type || 'text/plain', sizeBytes: file.size })));
    if (!validation.ok) return setMessage(validation.errors.join('\n'));
    setMessage('암호화 저장 중…');
    const response = await fetch('/api/uploads/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, files: await uploadPayload(files) })
    });
    await expectJson(response, 'upload_failed');
    setStage('uploaded');
    setMessage('업로드가 완료되었습니다. 결제 전 자료 부족 가능성을 확인하세요.');
  }

  async function acceptConsents() {
    const response = await fetch('/api/consents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, consentTypes: ['sensitive_data', 'original_evidence', 'ai_processing', 'overseas_transfer', 'payment'], version: CURRENT_CONSENT_VERSION })
    });
    await expectJson(response, 'consent_failed');
    setStage('consented');
    setMessage('동의가 안전하게 저장되었습니다. 이제 결제를 진행할 수 있습니다.');
  }

  async function pay() {
    const create = await fetch('/api/payments/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caseId }) });
    const { payment } = await expectJson<PaymentCreateResponse & { error?: string }>(create, 'payment_create_failed');
    setPaymentId(payment.paymentId);

    if (payment.provider === 'toss') {
      await requestTossPayment(payment);
      return;
    }

    const complete = await fetch('/api/payments/mock-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, paymentId: payment.paymentId })
    });
    await expectJson(complete, 'payment_failed');
    setStage('paid');
    setMessage('결제가 완료되었습니다. 이제 자료 정리를 시작할 수 있습니다.');
  }

  async function requestTossPayment(payment: PaymentCreateResponse['payment']) {
    if (!payment.clientKey || !payment.orderId || !payment.successUrl || !payment.failUrl) throw new Error('결제 준비가 완료되지 않았습니다. 잠시 후 다시 시도해 주세요.');
    await loadTossPayments();
    if (!window.TossPayments) throw new Error('결제창을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    await window.TossPayments(payment.clientKey).requestPayment('카드', {
      amount: payment.amountKrw,
      orderId: payment.orderId,
      orderName: payment.orderName || '독립 세이프플랜 자료 정리 리포트',
      successUrl: payment.successUrl,
      failUrl: payment.failUrl
    });
  }

  async function processEvidence() {
    await fetch('/api/jobs/enqueue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caseId }) });
    const response = await fetch('/api/jobs/process', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caseId }) });
    const data = await expectJson<{ cardCount: number; providerDegraded?: boolean; error?: string }>(response, 'process_failed');
    setStage('processed');
    setMessage(`자료 카드 ${data.cardCount}개가 준비되었습니다.${data.providerDegraded ? ' 일부 자료는 자동 정리가 완전하지 않아 확인이 필요합니다.' : ''}`);
    router.push(`/evidence/${caseId}/review`);
  }

  async function run(action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      setMessage(friendlyClientError(error));
    }
  }

  return (
    <section className="surface-panel p-6 md:p-8">
      <h1 className="text-3xl font-black">자료 업로드 · 동의 · 결제</h1>
      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted">{LEGAL_CAUTION_COPY}</p>
      <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-5 leading-7 text-amber-950">자료 부족 시 리포트 품질이 낮을 수 있습니다. 결제 전 파일 수, 날짜, 출처 메모를 확인하세요.</div>
      <label className="mt-6 block font-semibold">
        증거 정리 자료 선택
        <input data-testid="file-input" className="field-input" type="file" multiple accept={SUPPORTED_MIME_TYPES.join(',')} onChange={(event) => setFiles(event.currentTarget.files)} />
      </label>
      <button className="button-primary mt-4" onClick={() => run(upload)}>암호화 업로드 완료</button>

      <EvidenceConsentChecklist
        consents={consents}
        canRecord={allConsents && stage !== 'idle'}
        onToggle={(key, checked) => setConsents((prev) => ({ ...prev, [key]: checked }))}
        onRecord={() => run(acceptConsents)}
      />

      <div className="mt-6 flex flex-wrap gap-3">
        <button className="button-primary" disabled={stage !== 'consented'} onClick={() => run(pay)}>9,900원 결제</button>
        <button className="button-primary" disabled={stage !== 'paid'} onClick={() => run(processEvidence)}>자료 정리 시작</button>
      </div>
      {paymentId && <p className="mt-3 text-xs text-muted">결제 접수가 확인되었습니다.</p>}
      {message && <p className="mt-4 whitespace-pre-line rounded-2xl bg-tealSoft p-4 text-tealDark" role="status">{message}</p>}
    </section>
  );
}
