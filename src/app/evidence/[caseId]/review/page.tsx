import { ReviewCards } from '@/components/ReviewCards';

export default async function EvidenceReviewPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  return <ReviewCards caseId={caseId} />;
}
