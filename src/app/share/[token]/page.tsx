import type { Metadata } from 'next';
import { SharePasswordGate } from '@/components/SharePasswordGate';
import { ShareReportContent } from '@/components/ShareReportContent';
import { readDb } from '@/server/db/local-store';
import { resolveShareToken } from '@/server/reports/report-service';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: '보안 리포트 | 독립 세이프플랜'
};

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resolved = await resolveShareToken(token);
  if (resolved.status === 'password_required') {
    return <SharePasswordGate token={token} />;
  }
  if (resolved.status !== 'ok') {
    return (
      <section className="surface-panel p-6 md:p-8">
        <h1 className="text-3xl font-black">만료되었거나 폐기된 링크입니다</h1>
        <p className="mt-3 leading-7 text-muted">리포트 내용은 노출되지 않습니다. 필요한 경우 소유자가 새 링크를 생성해야 합니다.</p>
      </section>
    );
  }
  const db = await readDb();
  const cards = db.evidenceCards
    .filter((card) => card.caseId === resolved.report.caseId && card.deletedAt === null && card.userConfirmed && card.includeInReport)
    .map((card) => ({ id: card.id, title: card.title, dateCandidate: card.dateCandidate, confidenceLevel: card.confidenceLevel, summaryKo: card.summaryKo }));
  const fileCount = db.evidenceFiles.filter((file) => file.caseId === resolved.report.caseId && file.deletedAt === null).length;
  return <ShareReportContent cards={cards} fileCount={fileCount} />;
}
