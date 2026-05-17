import { PRICE_KRW } from '@/lib/constants';

export const metadata = {
  title: '환불 안내 | 독립 세이프플랜',
  description: '독립 세이프플랜 결제 취소와 환불 기준'
};

export default function RefundPolicyPage() {
  return (
    <article className="rounded-3xl bg-white p-6 shadow-sm">
      <h1 className="text-3xl font-bold">환불 안내</h1>
      <p className="mt-4 leading-7 text-stone-700">독립 세이프플랜 자료 정리 가격은 자료 묶음 1건 기준 {PRICE_KRW.toLocaleString('ko-KR')}원입니다. 아래 기준은 사용자 보호와 외부 분석 비용 발생 시점을 함께 고려합니다.</p>
      <ol className="mt-5 list-decimal space-y-3 pl-5 leading-7 text-stone-700">
        <li>결제 후 자료 정리를 시작하기 전에는 고객지원으로 취소를 요청할 수 있습니다.</li>
        <li>자료 정리가 시작된 뒤에는 처리 비용이 발생할 수 있어 전액 환불이 제한될 수 있습니다.</li>
        <li>서비스 장애로 리포트가 생성되지 않으면 재처리를 먼저 안내하고, 재처리가 어려운 경우 환불 절차를 안내합니다.</li>
        <li>리포트 내용은 법률 자문이나 결과 예측이 아니므로 상담 결과, 제출 가능성, 법적 효력은 환불 보장 범위에 포함되지 않습니다.</li>
      </ol>
    </article>
  );
}
