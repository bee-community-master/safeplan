export const metadata = {
  title: '자료 정리 동의 정책 | 독립 세이프플랜',
  description: '민감자료와 외부 분석 서비스 이용 동의 안내'
};

export default function AiConsentPage() {
  return (
    <article className="rounded-3xl bg-white p-6 shadow-sm">
      <h1 className="text-3xl font-bold">자료 정리 동의 정책</h1>
      <div className="mt-4 space-y-4 leading-7 text-stone-700">
        <p>자료 정리를 시작하기 전 민감정보 처리, 원본 자료 처리, 외부 분석 서비스 이용, 가능한 해외 또는 제3자 처리, 결제 동의를 명시적으로 확인합니다.</p>
        <p>동의와 결제가 완료되기 전에는 자료 정리를 시작하지 않습니다. 자동 정리 결과는 초안이며, 사용자가 확인한 카드만 리포트에 포함됩니다.</p>
      </div>
    </article>
  );
}
