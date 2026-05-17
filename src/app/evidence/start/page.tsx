'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LIMITS, PRICE_KRW } from '@/lib/constants';
import { PageHero, ProductFlowPreview, SecondaryLink } from '@/components/DesignSystem';
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
    <div className="space-y-8">
      <SafetyNotice />
      <PageHero
        title="상담자료 준비를 차분하게 시작합니다"
        description="자료 타임라인과 리포트 생성을 위한 유료 흐름입니다. 결제 전 자료가 충분한지 확인하고, 민감자료 처리와 외부 분석 서비스 이용에 동의합니다."
      >
        <button className="button-primary" onClick={createCase} disabled={loading}>{loading ? '생성 중…' : '안전 확인 후 업로드 시작'}</button>
        <SecondaryLink href="/pricing">가격·환불 확인</SecondaryLink>
      </PageHero>

      <ProductFlowPreview compact />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['가격', `${PRICE_KRW.toLocaleString('ko-KR')}원`],
          ['파일 제한', `최대 ${LIMITS.maxFilesPerCase}개 / 총 ${LIMITS.maxTotalUploadMb}MB`],
          ['개별 제한', `이미지·PDF ${LIMITS.maxImageOrPdfMb}MB / 음성 ${LIMITS.maxAudioMb}MB`],
          ['지원 형식', 'JPG, PNG, WebP, PDF, TXT, MP3, M4A, WAV, FLAC, WebM']
        ].map(([title, body]) => (
          <article key={title} className="surface-card">
            <h2 className="font-black">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
          </article>
        ))}
      </section>

      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 leading-7 text-amber-950">
        자료가 너무 적거나 날짜·출처가 불분명하면 리포트 품질이 낮을 수 있습니다. 자료의 취득 경위, 제출 가능성, 법적 효력은 변호사에게 확인해야 합니다.
      </div>
    </div>
  );
}
