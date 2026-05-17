import { SafetyPopup } from '@/components/SafetyPopup';
import { SafetyNotice } from '@/components/SafetyNotice';

export default function LandingPage() {
  return (
    <div className="space-y-8">
      <SafetyPopup />
      <section className="rounded-3xl bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-clay">한국어 B2C · 상담 전 자료 정리</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">독립 준비, 생활 가능 기간 계산, 상담 전 자료 정리</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-stone-700">
          독립 세이프플랜은 재정 입력값을 서버에 저장하지 않는 생존 시뮬레이터와, 사용자가 확인한 자료만 리포트/보안 링크로 정리하는 서비스입니다. 법률 자문이나 이혼 결정, 승소 가능성 예측을 제공하지 않습니다.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a className="rounded-xl bg-ink px-5 py-3 font-semibold text-white" href="/safety">안전 확인 시작</a>
          <a className="rounded-xl border border-stone-300 px-5 py-3 font-semibold" href="/simulator">무료 시뮬레이터</a>
        </div>
      </section>
      <SafetyNotice />
      <section className="grid gap-4 md:grid-cols-3">
        {['0.5개월 단위 보수적 계산', '자료 단위 자동 정리 초안', '14일 만료 보안 링크'].map((item) => (
          <div key={item} className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="font-bold">{item}</h2><p className="mt-2 text-sm leading-6 text-stone-600">안전·프라이버시·사용자 확인을 기본값으로 둡니다.</p></div>
        ))}
      </section>
    </div>
  );
}
