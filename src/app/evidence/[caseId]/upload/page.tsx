import { SafetyNotice } from '@/components/SafetyNotice';
import { EvidenceUploadFlow } from '@/components/EvidenceUploadFlow';

export default async function EvidenceUploadPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  return (
    <div className="space-y-6">
      <SafetyNotice compact />
      <EvidenceUploadFlow caseId={caseId} />
    </div>
  );
}
