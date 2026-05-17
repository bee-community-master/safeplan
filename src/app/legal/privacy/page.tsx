export const metadata = {
  title: '개인정보 처리방침 | 독립 세이프플랜',
  description: '독립 세이프플랜 개인정보와 자료 보관 원칙'
};

export default function PrivacyPage() {
  return (
    <article className="rounded-3xl bg-white p-6 shadow-sm">
      <h1 className="text-3xl font-bold">개인정보 처리방침</h1>
      <div className="mt-4 space-y-4 leading-7 text-stone-700">
        <p>재정 시뮬레이터 입력값은 서버에 저장하지 않습니다. 사용자가 명시적으로 이 기기에 저장한 값은 사용자의 브라우저에서만 관리됩니다.</p>
        <p>업로드한 원본, 사용자 메모, 추출 텍스트, 정리 초안, 리포트, 공유 링크는 분리해 보관하며 삭제 요청 시 삭제하거나 더 이상 열 수 없게 처리합니다.</p>
        <p>공유 링크는 기본적으로 14일 뒤 만료되며, 사용자가 선택하면 비밀번호를 설정할 수 있습니다. 만료되었거나 폐기된 링크는 리포트 내용을 노출하지 않습니다.</p>
      </div>
    </article>
  );
}
