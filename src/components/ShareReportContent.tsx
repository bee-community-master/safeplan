import { LEGAL_CAUTION_COPY } from '@/lib/constants';
import type { SharedReportCard } from '@/lib/share';

export function ShareReportContent({ cards, fileCount }: { cards: SharedReportCard[]; fileCount: number }) {
  return (
    <article className="surface-panel space-y-6 p-6 md:p-8" data-testid="share-report">
      <div>
        <p className="text-sm font-bold text-teal">14일 만료 보안 링크</p>
        <h1 className="mt-2 text-3xl font-black">독립 세이프플랜 자료 타임라인</h1>
        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted">{LEGAL_CAUTION_COPY}</p>
      </div>
      <section className="muted-panel">
        <h2 className="text-xl font-black">요약</h2>
        <p className="mt-2 text-muted">확인된 자료 {cards.length}개 · 원본 파일 {fileCount}개</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-black">자료 타임라인</h2>
        {cards.map((card) => (
          <div key={card.id} className="rounded-3xl border border-line bg-white p-5 shadow-soft">
            <h3 className="font-black">{card.title}</h3>
            <p className="mt-2 text-sm text-teal">{card.dateCandidate || '날짜 미상'} · 추출 신뢰도 {card.confidenceLevel}단계</p>
            <p className="mt-2 leading-7 text-muted">{card.summaryKo}</p>
          </div>
        ))}
      </section>
    </article>
  );
}
