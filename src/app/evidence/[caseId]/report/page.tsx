import { ReportActions } from '@/components/ReportActions';

export const metadata = {
  robots: { index: false, follow: false },
  title: '리포트 생성 | 독립 세이프플랜'
};

export default async function EvidenceReportPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  return <ReportActions caseId={caseId} />;
}
