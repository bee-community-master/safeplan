import { PageHero } from '@/components/DesignSystem';
import { PRICE_KRW } from '@/lib/constants';

export const metadata = {
  title: '환불 안내 | 독립 세이프플랜',
  description: '독립 세이프플랜 결제 취소와 환불 기준'
};

export default function RefundPolicyPage() {
  return (
    <div className="space-y-8">
      <PageHero title="환불 안내" description={`자료 묶음 1건 기준 ${PRICE_KRW.toLocaleString('ko-KR')}원 결제에 대한 취소와 환불 기준입니다.`} />
      <article className="surface-panel p-6 md:p-8">
        <ol className="grid gap-3 leading-7 text-muted md:grid-cols-2">
          <li className="muted-panel">1. 결제 후 자료 정리를 시작하기 전에는 고객지원으로 취소를 요청할 수 있습니다.</li>
          <li className="muted-panel">2. 자료 정리가 시작된 뒤에는 처리 비용이 발생할 수 있어 전액 환불이 제한될 수 있습니다.</li>
          <li className="muted-panel">3. 서비스 장애로 리포트가 생성되지 않으면 재처리를 먼저 안내하고, 재처리가 어려운 경우 환불 절차를 안내합니다.</li>
          <li className="muted-panel">4. 리포트 내용은 법률 자문이나 결과 예측이 아니므로 상담 결과, 제출 가능성, 법적 효력은 환불 보장 범위에 포함되지 않습니다.</li>
        </ol>
      </article>
    </div>
  );
}
