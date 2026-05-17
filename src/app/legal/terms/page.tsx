import { PageHero } from '@/components/DesignSystem';

export const metadata = {
  title: '이용약관 | 독립 세이프플랜',
  description: '독립 세이프플랜 이용 범위와 금지 행위 안내'
};

export default function TermsPage() {
  return (
    <div className="space-y-8">
      <PageHero title="이용약관" description="독립 세이프플랜의 이용 범위와 금지 행위를 안내합니다." />
      <article className="surface-panel p-6 md:p-8">
        <div className="space-y-4 leading-8 text-muted">
          <p>이 서비스는 생활 가능 기간 계산과 상담 전 자료 정리를 돕기 위한 도구입니다. 법률 자문, 승소 가능성 예측, 변호사 또는 직업 매칭, 이혼 여부 판단을 제공하지 않습니다.</p>
          <p>사용자는 자료의 취득 경위, 제출 가능성, 법적 효력, 상담 전략을 전문가와 별도로 확인해야 합니다. 불법 자료 수집, 무단 접근, 위치추적, 몰래 설치형 기능은 안내하지 않습니다.</p>
          <p>결제, 환불, 삭제, 보안 링크 이용 기준은 각 안내 페이지를 함께 따릅니다. 긴급 위험이 있으면 서비스 이용보다 112 또는 1366 등 공적 지원기관 연락을 우선하세요.</p>
        </div>
      </article>
    </div>
  );
}
