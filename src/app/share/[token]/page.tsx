import type { Metadata } from 'next';
import { LEGAL_CAUTION_COPY } from '@/lib/constants';
import { readDb } from '@/server/db/local-store';
import { resolveShareToken } from '@/server/reports/report-service';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: '보안 리포트 | 독립 세이프플랜'
};

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resolved = await resolveShareToken(token);
  if (resolved.status !== 'ok') {
    return (
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold">만료되었거나 폐기된 링크입니다</h1>
        <p className="mt-3">리포트 내용은 노출되지 않습니다. 필요한 경우 소유자가 새 링크를 생성해야 합니다.</p>
      </section>
    );
  }
  const db = await readDb();
  const cards = db.evidenceCards.filter((card) => card.caseId === resolved.report.caseId && card.deletedAt === null && card.userConfirmed && card.includeInReport);
  const files = db.evidenceFiles.filter((file) => file.caseId === resolved.report.caseId && file.deletedAt === null);
  return (
    <article className="space-y-6 rounded-3xl bg-white p-6 shadow-sm" data-testid="share-report">
      <div>
        <p className="text-sm font-semibold text-clay">14일 만료 보안 링크</p>
        <h1 className="mt-2 text-3xl font-bold">독립 세이프플랜 자료 타임라인</h1>
        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-stone-700">{LEGAL_CAUTION_COPY}</p>
      </div>
      <section>
        <h2 className="text-xl font-bold">요약</h2>
        <p className="mt-2">확인된 자료 {cards.length}개 · 원본 파일 {files.length}개</p>
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
