import { ReviewCards } from '@/components/ReviewCards';

export const metadata = {
  robots: { index: false, follow: false },
  title: '자료 카드 검토 | 독립 세이프플랜'
};

export default async function EvidenceReviewPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  return <ReviewCards caseId={caseId} />;
}
