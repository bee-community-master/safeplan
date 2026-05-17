import { SafetyNotice } from '@/components/SafetyNotice';
import { EvidenceUploadFlow } from '@/components/EvidenceUploadFlow';

export const metadata = {
  robots: { index: false, follow: false },
  title: '자료 업로드 | 독립 세이프플랜'
};

export default async function EvidenceUploadPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  return (
    <div className="space-y-6">
      <SafetyNotice compact />
      <EvidenceUploadFlow caseId={caseId} />
    </div>
  );
}
