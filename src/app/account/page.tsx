import { SafetyNotice } from '@/components/SafetyNotice';

export default function AccountPage() {
  return (
    <div className="space-y-6">
      <SafetyNotice compact />
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold">보관·삭제 안내</h1>
        <p className="mt-3 leading-7 text-stone-700">각 자료 묶음의 리포트 화면에서 전체 삭제를 실행할 수 있습니다. 삭제하면 업로드한 원본, 정리 초안, 자료 카드, 리포트, 공유 링크가 삭제되거나 더 이상 열 수 없게 처리됩니다. 서비스 운영에 필요한 최소 기록만 남깁니다.</p>
      </section>
    </div>
  );
}
