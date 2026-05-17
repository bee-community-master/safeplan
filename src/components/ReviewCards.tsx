'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { confidencePolicyLabel } from '@/lib/evidence';
import type { EvidenceCardRecord } from '@/server/db/types';

export function ReviewCards({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [cards, setCards] = useState<EvidenceCardRecord[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`/api/evidence/${caseId}/cards`).then((response) => response.json()).then((data) => setCards(data.cards || []));
  }, [caseId]);

  function updateLocal(cardId: string, patch: Partial<EvidenceCardRecord>) {
    setCards((prev) => prev.map((card) => (card.id === cardId ? { ...card, ...patch } : card)));
  }

  async function save(card: EvidenceCardRecord) {
    const response = await fetch(`/api/evidence/cards/${card.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: card.title, summaryKo: card.summaryKo, userMemo: card.userMemo, includeInReport: card.includeInReport, userConfirmed: card.userConfirmed, dateCandidate: card.dateCandidate })
    });
    if (!response.ok) setMessage((await response.json()).error || '저장 실패');
    else setMessage('사용자 확인 사항을 저장했습니다.');
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <h1 className="text-3xl font-bold">AI 초안 카드 검수</h1>
      <p className="mt-3 text-stone-700">모든 요약, 태그, 날짜, 인물 정보는 초안입니다. PDF에는 사용자가 확인하고 포함한 카드만 들어갑니다.</p>
      <div className="mt-6 space-y-5">
        {cards.map((card, index) => (
          <article key={card.id} className="rounded-2xl border border-stone-200 p-4" data-testid="evidence-card">
            <p className="text-sm font-semibold text-clay">자료 {index + 1} · confidence {card.confidenceLevel} · {confidencePolicyLabel(card.confidenceLevel)}</p>
            <label className="mt-3 block text-sm font-bold">제목
              <input className="mt-1 w-full rounded-xl border px-3 py-2" value={card.title} onChange={(event) => updateLocal(card.id, { title: event.currentTarget.value })} />
            </label>
            <label className="mt-3 block text-sm font-bold">AI 초안 요약
              <textarea className="mt-1 min-h-28 w-full rounded-xl border px-3 py-2" value={card.summaryKo} onChange={(event) => updateLocal(card.id, { summaryKo: event.currentTarget.value })} />
            </label>
            <label className="mt-3 block text-sm font-bold">사용자 메모
              <textarea className="mt-1 w-full rounded-xl border px-3 py-2" value={card.userMemo || ''} onChange={(event) => updateLocal(card.id, { userMemo: event.currentTarget.value })} />
            </label>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <label className="flex gap-2"><input type="checkbox" checked={card.userConfirmed} onChange={(event) => updateLocal(card.id, { userConfirmed: event.currentTarget.checked })} /> 사용자가 확인했습니다</label>
              <label className="flex gap-2"><input type="checkbox" checked={card.includeInReport} onChange={(event) => updateLocal(card.id, { includeInReport: event.currentTarget.checked })} /> PDF에 포함</label>
            </div>
            <button className="mt-4 rounded-xl bg-ink px-4 py-2 font-semibold text-white" onClick={() => save(card)}>카드 저장</button>
          </article>
        ))}
      </div>
      {cards.length === 0 && <p className="mt-4 rounded-xl bg-amber-50 p-4">아직 생성된 카드가 없습니다. 업로드 화면에서 AI 초안 처리를 실행하세요.</p>}
      {message && <p className="mt-4 rounded-xl bg-calm p-3" role="status">{message}</p>}
      <button className="mt-6 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white" onClick={() => router.push(`/evidence/${caseId}/report`)}>리포트 생성으로 이동</button>
    </section>
  );
}
