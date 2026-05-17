import { SafetyPopup } from '@/components/SafetyPopup';
import { SafetyNotice } from '@/components/SafetyNotice';
import { GuardrailGrid, PageHero, PrimaryLink, ProductFlowPreview, RouteCards, SecondaryLink } from '@/components/DesignSystem';

export default function LandingPage() {
  return (
    <div className="space-y-8">
      <SafetyPopup />
      <section className="grid items-stretch gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <PageHero
          title="지금의 선택이 내일의 안전을 만듭니다"
          description="독립 세이프플랜은 재정 입력값을 서버에 저장하지 않는 생존 시뮬레이터와, 사용자가 확인한 자료만 리포트와 보안 링크로 정리하는 서비스입니다."
        >
          <PrimaryLink href="/simulator">생존 시뮬레이터 시작</PrimaryLink>
          <SecondaryLink href="/evidence/start">자료 정리 시작</SecondaryLink>
        </PageHero>
        <ProductFlowPreview />
      </section>

      <SafetyNotice />
      <GuardrailGrid />

      <section className="surface-panel p-6 md:p-8">
        <h2 className="text-2xl font-black tracking-tight">한 번에 이어지는 준비 흐름</h2>
        <p className="mt-3 max-w-3xl leading-7 text-muted">무료 계산으로 현재 생활 가능 기간을 확인하고, 필요한 경우 자료 업로드·동의·결제·검토·리포트 생성까지 이어갑니다. 자료 정리는 상담자료 준비를 돕는 초안 생성 흐름입니다.</p>
        <div className="mt-6"><RouteCards /></div>
      </section>
    </div>
  );
}
