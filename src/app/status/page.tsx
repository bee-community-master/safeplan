import { PageHero } from '@/components/DesignSystem';
import { isProductionApp } from '@/lib/runtime';
import { productionReadiness } from '@/server/ops/readiness';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: '서비스 상태 | 독립 세이프플랜',
  description: '독립 세이프플랜 공개 서비스 상태 안내'
};

export default function StatusPage() {
  const readiness = productionReadiness();
  const isProduction = isProductionApp();
  const available = !isProduction || readiness.ready;
  return (
    <div className="space-y-8">
      <PageHero
        title={available ? '기본 서비스 이용 가능' : '일부 기능 점검 필요'}
        description="이 페이지는 사용자에게 필요한 수준의 서비스 상태만 안내합니다. 긴급 위험이 있으면 서비스 상태와 관계없이 112 또는 1366 등 공적 지원기관 연락을 우선하세요."
      />
      <section className="grid gap-4 md:grid-cols-3">
        {[
          ['생존 시뮬레이터', '브라우저 안에서 계산되어 서버 저장 없이 사용할 수 있습니다.', true],
          ['자료 정리', available ? '업로드, 동의, 결제, 자료 정리 흐름을 사용할 수 있습니다.' : '현재 운영 설정 확인이 필요합니다. 잠시 후 다시 시도해 주세요.', available],
          ['보안 링크', '만료 또는 폐기된 링크는 리포트 내용을 노출하지 않습니다.', true]
        ].map(([title, body, ok]) => (
          <article key={String(title)} className="surface-card">
            <div className={`mb-4 inline-flex rounded-full px-3 py-1 text-xs font-bold ${ok ? 'bg-tealSoft text-tealDark' : 'bg-amber-50 text-amber-900'}`}>{ok ? '정상' : '점검'}</div>
            <h2 className="text-lg font-black">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
