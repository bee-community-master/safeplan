'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LEGAL_CAUTION_COPY, PRICE_KRW } from '@/lib/constants';

type Stage = 'idle' | 'uploaded' | 'consented' | 'paid' | 'processed';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function EvidenceUploadFlow({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [files, setFiles] = useState<FileList | null>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [message, setMessage] = useState('');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [consents, setConsents] = useState({ sensitive: false, original: false, ai: false, overseas: false, payment: false });
  const allConsents = Object.values(consents).every(Boolean);

  async function upload() {
    if (!files?.length) return setMessage('업로드할 파일을 선택하세요.');
    setMessage('암호화 저장 중…');
    const payload = await Promise.all(
      Array.from(files).map(async (file) => ({
        name: file.name,
        mimeType: file.type || 'text/plain',
        sizeBytes: file.size,
        contentBase64: await fileToBase64(file),
        userMemo: ''
      }))
    );
    const response = await fetch('/api/uploads/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, files: payload })
    });
    if (!response.ok) throw new Error((await response.json()).error || 'upload_failed');
    setStage('uploaded');
    setMessage('업로드가 완료되었습니다. 결제 전 자료 부족 가능성을 확인하세요.');
  }

  async function acceptConsents() {
    const response = await fetch('/api/consents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, consentTypes: ['sensitive_data', 'original_evidence', 'ai_processing', 'overseas_transfer', 'payment'] })
    });
    if (!response.ok) throw new Error((await response.json()).error || 'consent_failed');
    setStage('consented');
    setMessage('동의가 기록되었습니다. IP와 사용자 에이전트는 해시로만 저장됩니다.');
  }

  async function pay() {
    const create = await fetch('/api/payments/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caseId }) });
    const created = await create.json();
    if (!create.ok) throw new Error(created.error || 'payment_create_failed');
    setPaymentId(created.payment.paymentId);
    const complete = await fetch('/api/payments/mock-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, paymentId: created.payment.paymentId })
    });
    if (!complete.ok) throw new Error((await complete.json()).error || 'payment_failed');
    setStage('paid');
    setMessage('9,900원 mock 결제가 완료되었습니다. 이제 AI 초안 처리를 시작할 수 있습니다.');
  }

  async function process() {
    await fetch('/api/jobs/enqueue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caseId }) });
    const response = await fetch('/api/jobs/process', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caseId }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'process_failed');
    setStage('processed');
    setMessage(`AI 초안 카드 ${data.cardCount}개가 생성되었습니다.${data.providerDegraded ? ' 일부 provider는 mock fallback입니다.' : ''}`);
    router.push(`/evidence/${caseId}/review`);
  }

  async function run(action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <h1 className="text-3xl font-bold">자료 업로드 · 동의 · 결제</h1>
      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-stone-700">{LEGAL_CAUTION_COPY}</p>
      <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4">자료 부족 시 리포트 품질이 낮을 수 있습니다. 결제 전 파일 수, 날짜, 출처 메모를 확인하세요.</div>
      <label className="mt-6 block font-semibold">
        증거 정리 자료 선택
        <input data-testid="file-input" className="mt-2 block w-full rounded-xl border p-3" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf,text/plain,audio/mpeg,audio/mp4,audio/wav,audio/flac,audio/webm" onChange={(event) => setFiles(event.currentTarget.files)} />
      </label>
      <button className="mt-4 rounded-xl bg-ink px-5 py-3 font-semibold text-white" onClick={() => run(upload)}>암호화 업로드 완료</button>

      <fieldset className="mt-8 space-y-3 rounded-2xl border border-stone-200 p-4">
        <legend className="px-2 font-bold">AI 처리 전 명시 동의</legend>
        {[
          ['sensitive', '민감정보 처리에 동의합니다.'],
          ['original', '원본 자료 처리에 동의합니다.'],
          ['ai', '외부 AI/OCR/STT provider 처리에 동의합니다.'],
          ['overseas', '가능한 해외/제3자 처리에 동의합니다.'],
          ['payment', `${PRICE_KRW.toLocaleString('ko-KR')}원 결제에 동의합니다.`]
        ].map(([key, label]) => (
          <label key={key} className="flex gap-3 text-sm">
            <input type="checkbox" checked={consents[key as keyof typeof consents]} onChange={(event) => { const checked = event.currentTarget.checked; setConsents((prev) => ({ ...prev, [key]: checked })); }} /> {label}
          </label>
        ))}
        <button className="rounded-xl border px-4 py-2 font-semibold disabled:opacity-50" disabled={!allConsents || stage === 'idle'} onClick={() => run(acceptConsents)}>동의 기록</button>
      </fieldset>

      <div className="mt-6 flex flex-wrap gap-3">
        <button className="rounded-xl bg-clay px-5 py-3 font-semibold text-white disabled:opacity-50" disabled={stage !== 'consented'} onClick={() => run(pay)}>9,900원 mock 결제</button>
        <button className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white disabled:opacity-50" disabled={stage !== 'paid'} onClick={() => run(process)}>OCR/STT/AI 초안 처리</button>
      </div>
      {paymentId && <p className="mt-2 text-xs text-stone-500">결제 ID: {paymentId}</p>}
      {message && <p className="mt-4 rounded-xl bg-calm p-3" role="status">{message}</p>}
    </section>
  );
}
