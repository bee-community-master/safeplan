import { SafetyNotice } from '@/components/SafetyNotice';

export default function AccountPage() {
  return (
    <div className="space-y-6">
      <SafetyNotice compact />
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold">보관·삭제 안내</h1>
        <p className="mt-3 leading-7 text-stone-700">익명 세션 기반 MVP에서는 각 케이스 리포트 화면에서 삭제를 실행합니다. 삭제는 원본 암호화 파일, OCR/STT, AI 분류, 카드, PDF, 공유 URL을 삭제 또는 비활성화하고 비민감 audit event만 남깁니다.</p>
      </section>
    </div>
  );
}
