import { LEGAL_CAUTION_COPY } from '@/lib/constants';

export type SharedReportCard = {
  id: string;
  title: string;
  dateCandidate: string | null;
  confidenceLevel: number;
  summaryKo: string;
};

export function ShareReportContent({ cards, fileCount }: { cards: SharedReportCard[]; fileCount: number }) {
  return (
    <article className="space-y-6 rounded-3xl bg-white p-6 shadow-sm" data-testid="share-report">
      <div>
        <p className="text-sm font-semibold text-clay">14일 만료 보안 링크</p>
        <h1 className="mt-2 text-3xl font-bold">독립 세이프플랜 자료 타임라인</h1>
        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-stone-700">{LEGAL_CAUTION_COPY}</p>
      </div>
      <section>
        <h2 className="text-xl font-bold">요약</h2>
        <p className="mt-2">확인된 자료 {cards.length}개 · 원본 파일 {fileCount}개</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-bold">자료 타임라인</h2>
        {cards.map((card) => (
          <div key={card.id} className="rounded-2xl border border-stone-200 p-4">
            <h3 className="font-bold">{card.title}</h3>
            <p className="mt-2 text-sm">{card.dateCandidate || '날짜 미상'} · 추출 신뢰도 {card.confidenceLevel}단계</p>
            <p className="mt-2 leading-7">{card.summaryKo}</p>
          </div>
        ))}
      </section>
    </article>
  );
}
