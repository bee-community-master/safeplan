import { PageHero, SecondaryLink } from '@/components/DesignSystem';
import { REQUIRED_SAFETY_COPY } from '@/lib/constants';

export const metadata = {
  title: '도움말 | 독립 세이프플랜',
  description: '안전 사용, 자료 준비, 결제와 삭제에 대한 도움말'
};

export default function HelpPage() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  return (
    <div className="space-y-8">
      <PageHero
        title="안전하게 사용하고, 필요한 만큼만 정리하세요"
        description="자료를 많이 모으는 것보다 안전한 환경에서 필요한 자료만 정리하는 것이 우선입니다. 긴급 위험이 있으면 서비스 이용보다 공적 지원기관 연락을 먼저 고려하세요."
      >
        <SecondaryLink href="/pricing">가격 확인</SecondaryLink>
        <SecondaryLink href="/status">서비스 상태</SecondaryLink>
      </PageHero>

      <section className="notice-safe">
        <h2 className="mb-2 text-lg font-black">먼저 안전을 확인하세요</h2>
        <p className="whitespace-pre-line">{REQUIRED_SAFETY_COPY}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {[
          ['무엇을 올리면 좋나요?', '상담 전에 참고할 수 있는 사진, 캡처, 문서, 진단서, 결제 기록, 음성, 메모 등을 자료 단위로 올릴 수 있습니다. 불법적으로 수집한 자료나 무단 접근 자료는 안내하지 않습니다.'],
          ['자동 정리 결과는 어떤 의미인가요?', '요약, 태그, 날짜, 인물 정보는 초안입니다. 추출 신뢰도는 법적 강도가 아니라 정리 과정의 확실성입니다.'],
          ['결제 전 무엇을 확인해야 하나요?', '자료가 너무 적거나 날짜·출처가 불분명하면 리포트 품질이 낮을 수 있습니다. 결제 전에 업로드 제한과 동의 항목을 확인합니다.'],
          ['삭제하면 어떻게 되나요?', '원본, 정리 초안, 자료 카드, 리포트, 공유 링크를 삭제하거나 더 이상 열 수 없게 처리합니다. 서비스 운영에 필요한 최소 기록만 남깁니다.']
        ].map(([question, answer]) => (
          <article key={question} className="surface-card">
            <h2 className="text-lg font-black">{question}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{answer}</p>
          </article>
        ))}
      </section>

      <section className="surface-panel p-6 md:p-8">
        <h2 className="text-2xl font-black">고객지원</h2>
        <p className="mt-3 max-w-3xl leading-7 text-muted">결제 취소, 리포트 생성 실패, 삭제 요청 확인이 필요하면 아래 주소로 문의하세요. 원본 자료나 민감한 개인정보는 이메일 본문에 직접 붙여넣지 마세요.</p>
        {supportEmail ? (
          <a className="button-secondary mt-5 inline-flex" href={`mailto:${supportEmail}`}>{supportEmail}</a>
        ) : (
          <p className="mt-5 rounded-2xl bg-tealSoft p-4 text-sm leading-6 text-tealDark">고객지원 연락처는 운영 배포 전 공개됩니다. 긴급 위험이 있으면 112 또는 1366 등 공적 지원기관 연락을 우선하세요.</p>
        )}
      </section>
    </div>
  );
}
