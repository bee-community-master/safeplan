'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LIMITS, PRICE_KRW, SUPPORTED_MIME_TYPES } from '@/lib/constants';
import { SafetyNotice } from '@/components/SafetyNotice';

export default function EvidenceStartPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function createCase() {
    setLoading(true);
    const response = await fetch('/api/cases', { method: 'POST' });
    const data = await response.json();
    router.push(`/evidence/${data.case.id}/upload`);
  }
  return (
    <div className="space-y-6">
      <SafetyNotice />
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold">상담자료 준비 시작</h1>
        <p className="mt-3 leading-7 text-stone-700">증거 정리, 자료 타임라인, 상담자료 준비를 위한 유료 흐름입니다. 결제 전 자료 부족 경고와 외부 AI/OCR/STT 처리 동의를 확인합니다.</p>
        <dl className="mt-5 grid gap-3 text-sm md:grid-cols-2">
          <div className="rounded-xl bg-calm p-3"><dt className="font-bold">가격</dt><dd>{PRICE_KRW.toLocaleString('ko-KR')}원</dd></div>
          <div className="rounded-xl bg-calm p-3"><dt className="font-bold">파일 제한</dt><dd>최대 {LIMITS.maxFilesPerCase}개 / 총 {LIMITS.maxTotalUploadMb}MB</dd></div>
          <div className="rounded-xl bg-calm p-3"><dt className="font-bold">개별 제한</dt><dd>이미지·PDF {LIMITS.maxImageOrPdfMb}MB / 음성 {LIMITS.maxAudioMb}MB</dd></div>
          <div className="rounded-xl bg-calm p-3"><dt className="font-bold">지원 형식</dt><dd>{SUPPORTED_MIME_TYPES.join(', ')}</dd></div>
        </dl>
        <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          자료가 너무 적거나 날짜·출처가 불분명하면 리포트 품질이 낮을 수 있습니다. 자료의 취득 경위, 제출 가능성, 법적 효력은 변호사에게 확인해야 합니다.
        </div>
        <button className="mt-6 rounded-xl bg-ink px-5 py-3 font-semibold text-white" onClick={createCase} disabled={loading}>{loading ? '생성 중…' : '안전 확인 후 업로드 시작'}</button>
      </section>
    </div>
  );
}
