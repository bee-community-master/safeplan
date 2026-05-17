'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EvidenceCardReviewDto, EvidenceCardReviewPatch } from '@/lib/evidence-card-dto';
import { confidencePolicyLabel } from '@/lib/evidence';

export function ReviewCards({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [cards, setCards] = useState<EvidenceCardReviewDto[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`/api/evidence/${caseId}/cards`).then((response) => response.json()).then((data) => setCards(data.cards || []));
  }, [caseId]);

  function updateLocal(cardId: string, patch: Partial<EvidenceCardReviewDto>) {
    setCards((prev) => prev.map((card) => (card.id === cardId ? { ...card, ...patch } : card)));
  }

  async function save(card: EvidenceCardReviewDto) {
    const response = await fetch(`/api/evidence/cards/${card.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: card.title, summaryKo: card.summaryKo, userMemo: card.userMemo, includeInReport: card.includeInReport, userConfirmed: card.userConfirmed, dateCandidate: card.dateCandidate } satisfies EvidenceCardReviewPatch)
    });
    if (!response.ok) setMessage((await response.json()).error || '저장 실패');
    else setMessage('사용자 확인 사항을 저장했습니다.');
  }

  return (
    <section className="surface-panel p-6 md:p-8">
      <h1 className="text-3xl font-black">자료 카드 검토</h1>
      <p className="mt-3 max-w-3xl leading-7 text-muted">요약, 태그, 날짜, 인물 정보는 자동 정리 초안입니다. 리포트에는 사용자가 확인하고 포함한 카드만 들어갑니다.</p>
      <div className="mt-6 space-y-5">
        {cards.map((card, index) => (
          <article key={card.id} className="rounded-3xl border border-line bg-white p-5 shadow-soft" data-testid="evidence-card">
            <p className="text-sm font-bold text-teal">자료 {index + 1} · 추출 신뢰도 {card.confidenceLevel}단계 · {confidencePolicyLabel(card.confidenceLevel)}</p>
            <label className="mt-3 block text-sm font-bold">제목
              <input className="field-input" value={card.title} onChange={(event) => updateLocal(card.id, { title: event.currentTarget.value })} />
            </label>
            <label className="mt-3 block text-sm font-bold">자동 정리 초안
              <textarea className="field-input min-h-28" value={card.summaryKo} onChange={(event) => updateLocal(card.id, { summaryKo: event.currentTarget.value })} />
            </label>
            <label className="mt-3 block text-sm font-bold">사용자 메모
              <textarea className="field-input" value={card.userMemo || ''} onChange={(event) => updateLocal(card.id, { userMemo: event.currentTarget.value })} />
            </label>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <label className="flex gap-2"><input type="checkbox" checked={card.userConfirmed} onChange={(event) => updateLocal(card.id, { userConfirmed: event.currentTarget.checked })} /> 사용자가 확인했습니다</label>
              <label className="flex gap-2"><input type="checkbox" checked={card.includeInReport} onChange={(event) => updateLocal(card.id, { includeInReport: event.currentTarget.checked })} /> 리포트에 포함</label>
            </div>
            <button className="button-primary mt-4 px-4 py-2" onClick={() => save(card)}>카드 저장</button>
          </article>
        ))}
      </div>
      {cards.length === 0 && <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-amber-950">아직 준비된 자료 카드가 없습니다. 업로드 화면에서 자료 정리를 시작하세요.</p>}
      {message && <p className="mt-4 rounded-2xl bg-tealSoft p-4 text-tealDark" role="status">{message}</p>}
      <button className="button-primary mt-6" onClick={() => router.push(`/evidence/${caseId}/report`)}>리포트 생성으로 이동</button>
    </section>
  );
}
