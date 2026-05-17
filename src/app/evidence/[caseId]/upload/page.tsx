import { SafetyNotice } from '@/components/SafetyNotice';
import { EvidenceUploadFlow } from '@/components/EvidenceUploadFlow';
import { SafetyPopup } from '@/components/SafetyPopup';

export const metadata = {
  robots: { index: false, follow: false },
  title: '자료 업로드 | 독립 세이프플랜'
};

export default async function EvidenceUploadPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  return (
    <div className="space-y-6">
      <SafetyPopup storageKey={`safeplan_upload_safety_${caseId}`} title="업로드 전 안전 확인" />
      <SafetyNotice compact />
      <EvidenceUploadFlow caseId={caseId} />
    </div>
  );
}
