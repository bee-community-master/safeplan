'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EvidenceCardReviewDto, EvidenceCardReviewPatch } from '@/lib/evidence-card-dto';
import { confidencePolicyLabel } from '@/lib/evidence';

const MATERIAL_LABELS: Record<string, string> = {
  photo: '사진',
  capture: '캡처',
  document: '문서',
  medical_document: '진단서/의료 문서',
  bank_or_payment_record: '계좌/결제 기록',
  audio: '음성',
  text_note: '텍스트 메모',
  police_or_institution_record: '경찰/기관 기록',
  unknown: '유형 확인 필요'
};

const DATE_SOURCE_LABELS: Record<string, string> = {
  ocr: '추출 텍스트 기준',
  metadata: '파일 정보 기준',
  user: '사용자 입력 기준',
  inferred: '자동 추정'
};

function joinOrFallback(items: string[], fallback = '표시할 내용 없음') {
  return items.filter(Boolean).join(', ') || fallback;
}

function ReadOnlyMeta({ card }: { card: EvidenceCardReviewDto }) {
  const people = card.people.map((person) => [person.label, person.rawMention].filter(Boolean).join(': ')).filter(Boolean);
  const tags = card.tags.map((tag) => [tag.tag, tag.rationale].filter(Boolean).join(' · ')).filter(Boolean);
  return (
    <dl className="mt-4 grid gap-3 rounded-3xl border border-line bg-calm p-4 text-sm leading-6 md:grid-cols-2">
      <div>
        <dt className="font-bold text-ink">원본 파일</dt>
        <dd className="text-muted">{card.originalFileName}</dd>
      </div>
      <div>
        <dt className="font-bold text-ink">자료 유형</dt>
        <dd className="text-muted">{MATERIAL_LABELS[card.materialType] ?? card.materialType}</dd>
      </div>
      <div>
        <dt className="font-bold text-ink">날짜 후보·출처</dt>
        <dd className="text-muted">{card.dateCandidate || '날짜 미상'} · {card.dateSource ? DATE_SOURCE_LABELS[card.dateSource] ?? '출처 확인 필요' : '출처 확인 필요'}</dd>
      </div>
      <div>
        <dt className="font-bold text-ink">자동 정리 상태</dt>
        <dd className="text-muted">{card.aiDraftMetadata.providerDegraded ? '일부 자동 처리가 제한되어 기본 정리로 표시' : '자동 정리 초안'} · 사용자 확인 필요</dd>
      </div>
      <div>
        <dt className="font-bold text-ink">인물 초안</dt>
        <dd className="text-muted">{joinOrFallback(people, '인물 표시 없음')}</dd>
      </div>
      <div>
        <dt className="font-bold text-ink">장소 초안</dt>
        <dd className="text-muted">{joinOrFallback(card.locations, '장소 표시 없음')}</dd>
      </div>
      <div className="md:col-span-2">
        <dt className="font-bold text-ink">자동 태그 초안</dt>
        <dd className="text-muted">{joinOrFallback(tags, '태그 검토 필요')}</dd>
      </div>
      {card.imageDescriptionKo && (
        <div className="md:col-span-2">
          <dt className="font-bold text-ink">일반 이미지 설명 초안</dt>
          <dd className="text-muted">{card.imageDescriptionKo}</dd>
        </div>
      )}
    </dl>
  );
}

function ConfidenceNotice({ card }: { card: EvidenceCardReviewDto }) {
  if (card.confidenceLevel === 4) return <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-950">추출 신뢰도는 높지만 검토 필요 자료입니다. 원본과 대조해 확인하세요.</p>;
  if (card.confidenceLevel === 3) return <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-950">중간 신뢰도 자료입니다. 내용을 펼쳐 확인한 뒤 사용자 확인을 선택하세요.</p>;
  if (card.confidenceLevel === 2) return <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-950">낮은 신뢰도 자료입니다. 검토 상자에서만 확인하고 기본적으로 리포트 포함을 권장하지 않습니다.</p>;
  if (card.confidenceLevel === 1) return <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-950">매우 낮은 신뢰도 자료입니다. 사용자가 명시적으로 열고 포함할 때만 리포트에 넣으세요.</p>;
  return <p className="mt-3 rounded-2xl bg-tealSoft p-3 text-sm text-tealDark">사용자 확인 후 기본 포함할 수 있는 자료입니다. 그래도 원본과 대조해 확인하세요.</p>;
}

export function ReviewCards({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [cards, setCards] = useState<EvidenceCardReviewDto[]>([]);
  const [message, setMessage] = useState('');
  const [revealedVeryLow, setRevealedVeryLow] = useState<Record<string, boolean>>({});

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
        {cards.map((card, index) => {
          const hiddenVeryLow = card.confidenceLevel === 1 && !revealedVeryLow[card.id] && !card.includeInReport;
          if (hiddenVeryLow) {
            return (
              <article key={card.id} className="rounded-3xl border border-red-100 bg-red-50 p-5 text-red-950 shadow-soft" data-testid="evidence-card">
                <p className="text-sm font-bold">자료 {index + 1} · 추출 신뢰도 1단계 · {confidencePolicyLabel(card.confidenceLevel)}</p>
                <p className="mt-2 text-sm leading-6">매우 낮은 신뢰도 자료는 내용이 접혀 있습니다. 원본과 대조할 필요가 있을 때만 열어 확인하세요.</p>
                <button className="button-secondary mt-4 px-4 py-2" onClick={() => setRevealedVeryLow((prev) => ({ ...prev, [card.id]: true }))}>이 자료 열어 검토</button>
              </article>
            );
          }

          const body = (
            <>
              <ReadOnlyMeta card={card} />
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
            </>
          );

          return (
          <article key={card.id} className={`rounded-3xl border p-5 shadow-soft ${card.confidenceLevel <= 2 ? 'border-red-100 bg-red-50/60' : 'border-line bg-white'}`} data-testid="evidence-card">
            <p className="text-sm font-bold text-teal">자료 {index + 1} · 추출 신뢰도 {card.confidenceLevel}단계 · {confidencePolicyLabel(card.confidenceLevel)}</p>
            <ConfidenceNotice card={card} />
            {card.confidenceLevel === 3 && !card.userConfirmed ? (
              <details className="mt-4 rounded-3xl border border-line bg-white p-4">
                <summary className="cursor-pointer font-bold">중간 신뢰도 자료 펼쳐 검토</summary>
                {body}
              </details>
            ) : body}
          </article>
          );
        })}
      </div>
      {cards.length === 0 && <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-amber-950">아직 준비된 자료 카드가 없습니다. 업로드 화면에서 자료 정리를 시작하세요.</p>}
      {message && <p className="mt-4 rounded-2xl bg-tealSoft p-4 text-tealDark" role="status">{message}</p>}
      <button className="button-primary mt-6" onClick={() => router.push(`/evidence/${caseId}/report`)}>리포트 생성으로 이동</button>
    </section>
  );
}
