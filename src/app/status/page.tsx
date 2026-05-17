import { productionReadiness } from '@/server/ops/readiness';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: '서비스 상태 | 독립 세이프플랜',
  description: '독립 세이프플랜 공개 서비스 상태 안내'
};

export default function StatusPage() {
  const readiness = productionReadiness();
  const isProduction = process.env.APP_ENV === 'production';
  const available = !isProduction || readiness.ready;
  return (
    <section className="rounded-3xl bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold text-clay">서비스 상태</p>
      <h1 className="mt-2 text-3xl font-bold">{available ? '기본 서비스 이용 가능' : '일부 기능 점검 필요'}</h1>
      <p className="mt-4 max-w-3xl leading-7 text-stone-700">
        이 페이지는 사용자에게 필요한 수준의 서비스 상태만 안내합니다. 긴급 위험이 있으면 서비스 상태와 관계없이 112 또는 1366 등 공적 지원기관 연락을 우선하세요.
      </p>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {[
          ['생존 시뮬레이터', '브라우저 안에서 계산되어 서버 저장 없이 사용할 수 있습니다.'],
          ['자료 정리', available ? '업로드, 동의, 결제, 자료 정리 흐름을 사용할 수 있습니다.' : '현재 운영 설정 확인이 필요합니다. 잠시 후 다시 시도해 주세요.'],
          ['보안 링크', '만료 또는 폐기된 링크는 리포트 내용을 노출하지 않습니다.']
        ].map(([title, body]) => (
          <article key={title} className="rounded-2xl bg-calm p-4">
            <h2 className="font-bold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-stone-700">{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
