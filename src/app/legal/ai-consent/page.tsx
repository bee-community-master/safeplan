import { PageHero } from '@/components/DesignSystem';

export const metadata = {
  title: '자료 정리 동의 정책 | 독립 세이프플랜',
  description: '민감자료와 외부 분석 서비스 이용 동의 안내'
};

export default function AiConsentPage() {
  return (
    <div className="space-y-8">
      <PageHero title="자료 정리 동의 정책" description="민감자료와 외부 분석 서비스 이용은 명시 동의와 결제 완료 후에만 시작합니다." />
      <article className="surface-panel p-6 md:p-8">
        <div className="space-y-4 leading-8 text-muted">
          <p>자료 정리를 시작하기 전 민감정보 처리, 원본 자료 처리, 외부 분석 서비스 이용, 가능한 해외 또는 제3자 처리, 결제 동의를 명시적으로 확인합니다.</p>
          <p>동의와 결제가 완료되기 전에는 자료 정리를 시작하지 않습니다. 자동 정리 결과는 초안이며, 사용자가 확인한 카드만 리포트에 포함됩니다.</p>
        </div>
      </article>
    </div>
  );
}
