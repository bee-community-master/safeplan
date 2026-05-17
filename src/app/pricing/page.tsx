import { GuardrailGrid, PageHero, PrimaryLink, SecondaryLink } from '@/components/DesignSystem';
import { PRICE_KRW, LIMITS } from '@/lib/constants';

export const metadata = {
  title: '가격 안내 | 독립 세이프플랜',
  description: '독립 세이프플랜 자료 정리 가격, 포함 범위, 환불 기준 안내'
};

export default function PricingPage() {
  return (
    <div className="space-y-8">
      <PageHero
        title={`자료 묶음 1건 ${PRICE_KRW.toLocaleString('ko-KR')}원`}
        description="구독이 아니라 필요한 자료 묶음마다 결제하는 방식입니다. 결제 전 업로드 제한, 동의 항목, 자료 부족 가능성을 먼저 확인합니다."
      >
        <PrimaryLink href="/evidence/start">자료 정리 시작</PrimaryLink>
        <SecondaryLink href="/legal/refund">환불 기준 보기</SecondaryLink>
      </PageHero>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ['포함 범위', `최대 ${LIMITS.maxFilesPerCase}개, 총 ${LIMITS.maxTotalUploadMb}MB까지 업로드할 수 있습니다.`],
          ['리포트 포함 범위', '사용자가 확인하고 포함한 자료 카드만 리포트와 PDF 다운로드에 들어갑니다.'],
          ['보안 공유', `${LIMITS.shareUrlTtlDays}일 뒤 만료되는 링크를 만들 수 있고, 비밀번호를 선택할 수 있습니다.`]
        ].map(([title, body]) => (
          <article key={title} className="surface-card">
            <h2 className="text-lg font-black">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
          </article>
        ))}
      </section>

      <section className="surface-panel p-6 md:p-8">
        <h2 className="text-2xl font-black">환불·취소 기준</h2>
        <ul className="mt-4 grid gap-3 leading-7 text-muted md:grid-cols-2">
          <li className="muted-panel">결제 후 자료 정리를 시작하기 전에는 고객지원으로 취소를 요청할 수 있습니다.</li>
          <li className="muted-panel">자료 정리가 시작된 뒤에는 처리 비용이 발생할 수 있어 전액 환불이 제한될 수 있습니다.</li>
          <li className="muted-panel">서비스 장애로 리포트 생성이 완료되지 않으면 재처리 또는 환불 절차를 안내합니다.</li>
          <li className="muted-panel">자료의 법적 효력이나 상담 결과는 환불 기준이 아니며, 법률 자문을 제공하지 않습니다.</li>
        </ul>
      </section>

      <GuardrailGrid />
    </div>
  );
}
