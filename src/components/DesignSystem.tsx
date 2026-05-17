import Link from 'next/link';
import { LIMITS, PRICE_KRW } from '@/lib/constants';

export const productFlow = [
  ['1', '안전 확인', '기기와 현재 위치가 안전한지 먼저 확인합니다.'],
  ['2', '생존 계산', '재정 입력값은 서버에 저장하지 않고 이 기기에서 계산합니다.'],
  ['3', '자료 정리', '필요한 자료만 업로드하고 자동 정리 초안을 만듭니다.'],
  ['4', '확인·공유', '사용자가 확인한 카드만 리포트와 보안 링크로 정리합니다.']
] as const;

export const routeCards = [
  { href: '/simulator', title: '생존 시뮬레이터', body: '0.5개월 단위로 보수적으로 계산하고 생활비 지원 시나리오를 비교합니다.' },
  { href: '/evidence/start', title: '자료 정리', body: '업로드, 동의, 결제, 자동 정리, 사용자 확인까지 한 흐름으로 진행합니다.' },
  { href: '/pricing', title: '가격·환불', body: `자료 묶음 1건 ${PRICE_KRW.toLocaleString('ko-KR')}원, 환불 기준과 포함 범위를 먼저 확인합니다.` },
  { href: '/help', title: '도움말', body: '안전 사용, 자료 준비, 삭제와 고객지원 안내를 한곳에서 확인합니다.' }
] as const;

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 font-black tracking-tight text-ink">
      <span className="grid h-9 w-9 place-items-center rounded-2xl bg-teal text-white shadow-soft" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3 5 6v5c0 4.5 2.9 8.2 7 10 4.1-1.8 7-5.5 7-10V6l-7-3Z" />
          <path d="m9.5 12 1.7 1.7 3.5-4" />
        </svg>
      </span>
      {!compact && <span>독립 세이프플랜</span>}
    </span>
  );
}

export function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link className="inline-flex items-center justify-center rounded-2xl bg-teal px-5 py-3 font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-tealDark focus-ring" href={href}>{children}</Link>;
}

export function SecondaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link className="inline-flex items-center justify-center rounded-2xl border border-line bg-white px-5 py-3 font-bold text-teal transition hover:-translate-y-0.5 hover:border-teal/40 hover:bg-tealSoft focus-ring" href={href}>{children}</Link>;
}

export function ProductFlowPreview({ compact = false }: { compact?: boolean }) {
  return (
    <section className="surface-panel p-5 md:p-6" aria-label="제품 흐름 미리보기">
      <h2 className="text-xl font-black tracking-tight">제품 흐름 미리보기</h2>
      <ol className={`mt-5 grid gap-4 ${compact ? 'md:grid-cols-4' : 'sm:grid-cols-2 xl:grid-cols-4'}`}>
        {productFlow.map(([number, title, body], index) => (
          <li key={title} className="relative rounded-3xl border border-line bg-white p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-tealSoft font-black text-teal">{number}</span>
              {index < productFlow.length - 1 && <span className="hidden h-px flex-1 border-t border-dashed border-teal/40 xl:block" aria-hidden="true" />}
            </div>
            <h3 className="mt-4 font-bold">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
          </li>
        ))}
      </ol>
      {!compact && <p className="mt-5 rounded-2xl bg-tealSoft p-4 text-sm leading-6 text-tealDark">업로드부터 삭제까지 전 구간에서 사용자 확인과 최소 정보 처리를 기본값으로 둡니다.</p>}
    </section>
  );
}

export function GuardrailGrid() {
  return (
    <section className="grid gap-4 md:grid-cols-3" aria-label="안전과 프라이버시 원칙">
      {[
        ['서버 저장 없는 계산', '생존 시뮬레이터 재정 입력값은 서버로 보내지 않습니다.'],
        ['확인한 카드만 포함', '자동 정리 결과는 초안이며 사용자가 확인해야 리포트에 들어갑니다.'],
        ['보안 링크 관리', `${LIMITS.shareUrlTtlDays}일 만료 링크, 비밀번호 옵션, 폐기와 전체 삭제를 지원합니다.`]
      ].map(([title, body]) => (
        <article key={title} className="surface-card">
          <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-tealSoft text-teal" aria-hidden="true">✓</div>
          <h3 className="text-lg font-black">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
        </article>
      ))}
    </section>
  );
}

export function RouteCards() {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="주요 화면 바로가기">
      {routeCards.map((card) => (
        <Link key={card.href} className="surface-card group block transition hover:-translate-y-1 hover:border-teal/40" href={card.href}>
          <h3 className="font-black">{card.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{card.body}</p>
          <span className="mt-4 inline-flex text-sm font-bold text-teal group-hover:text-tealDark">바로가기 →</span>
        </Link>
      ))}
    </section>
  );
}

export function PageHero({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return (
    <section className="surface-panel p-7 md:p-9">
      <h1 className="max-w-4xl text-3xl font-black leading-tight tracking-tight text-ink md:text-5xl">{title}</h1>
      <p className="mt-4 max-w-3xl text-base leading-8 text-muted md:text-lg">{description}</p>
      {children && <div className="mt-6 flex flex-wrap gap-3">{children}</div>}
    </section>
  );
}
