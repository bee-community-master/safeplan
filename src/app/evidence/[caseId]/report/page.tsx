import { ReportActions } from '@/components/ReportActions';

export default async function EvidenceReportPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  return <ReportActions caseId={caseId} />;
}
