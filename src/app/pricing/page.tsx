import { PRICE_KRW, LIMITS } from '@/lib/constants';

export const metadata = {
  title: '가격 안내 | 독립 세이프플랜',
  description: '독립 세이프플랜 자료 정리 가격, 포함 범위, 환불 기준 안내'
};

export default function PricingPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-clay">가격 안내</p>
        <h1 className="mt-2 text-3xl font-bold">자료 묶음 1건 기준 {PRICE_KRW.toLocaleString('ko-KR')}원</h1>
        <p className="mt-4 max-w-3xl leading-7 text-stone-700">결제 후 사용자가 올린 자료를 자동 정리 초안으로 만들고, 사용자가 확인한 카드만 리포트와 보안 링크로 정리합니다. 구독이 아니며 추가 결제는 새 자료 묶음을 시작할 때만 필요합니다.</p>
        <a className="mt-6 inline-block rounded-xl bg-ink px-5 py-3 font-semibold text-white" href="/evidence/start">자료 정리 시작</a>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ['포함 범위', `최대 ${LIMITS.maxFilesPerCase}개, 총 ${LIMITS.maxTotalUploadMb}MB까지 업로드할 수 있습니다.`],
          ['사용자 확인 우선', '자동 정리 결과는 초안이며, 사용자가 확인하고 포함한 카드만 리포트에 들어갑니다.'],
          ['보안 링크', `${LIMITS.shareUrlTtlDays}일 뒤 만료되는 링크를 만들 수 있고, 선택적으로 비밀번호를 설정할 수 있습니다.`]
        ].map(([title, body]) => (
          <article key={title} className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="font-bold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-stone-700">{body}</p>
          </article>
        ))}
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold">환불·취소 기준</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 leading-7 text-stone-700">
          <li>결제 후 자료 정리를 시작하기 전에는 고객지원으로 취소를 요청할 수 있습니다.</li>
          <li>자료 정리가 시작된 뒤에는 외부 분석 비용과 처리 비용이 발생할 수 있어 전액 환불이 제한될 수 있습니다.</li>
          <li>서비스 장애로 리포트 생성이 완료되지 않은 경우에는 재처리 또는 환불 절차를 안내합니다.</li>
          <li>자료의 법적 효력이나 상담 결과는 환불 기준이 아니며, 이 서비스는 법률 자문을 제공하지 않습니다.</li>
        </ul>
        <a className="mt-5 inline-block underline" href="/legal/refund">자세한 환불 안내 보기</a>
      </section>
    </div>
  );
}
