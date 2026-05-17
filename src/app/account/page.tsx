import { PageHero, SecondaryLink } from '@/components/DesignSystem';
import { SafetyNotice } from '@/components/SafetyNotice';

export const metadata = {
  robots: { index: false, follow: false },
  title: '보관·삭제 안내 | 독립 세이프플랜'
};

export default function AccountPage() {
  return (
    <div className="space-y-8">
      <SafetyNotice compact />
      <PageHero title="보관·삭제 안내" description="각 자료 묶음의 리포트 화면에서 전체 삭제를 실행할 수 있습니다. 삭제하면 업로드한 원본, 정리 초안, 자료 카드, 리포트, 공유 링크가 삭제되거나 더 이상 열 수 없게 처리됩니다.">
        <SecondaryLink href="/help">삭제 도움말 보기</SecondaryLink>
      </PageHero>
      <section className="surface-card">
        <h2 className="text-xl font-black">삭제 후 남는 기록</h2>
        <p className="mt-3 leading-7 text-muted">서비스 운영에 필요한 최소 기록만 남깁니다. 운영 지원 화면에서도 원본 자료나 민감한 정리 내용은 노출하지 않는 것을 기본 원칙으로 둡니다.</p>
      </section>
    </div>
  );
}
