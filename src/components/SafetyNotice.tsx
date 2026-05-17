import { LEGAL_CAUTION_COPY, REQUIRED_SAFETY_COPY } from '@/lib/constants';

export function SafetyNotice({ compact = false }: { compact?: boolean }) {
  return (
    <section className="notice-safe" aria-label="안전 안내">
      <h2 className="mb-2 text-lg font-black">먼저 안전을 확인하세요</h2>
      <p className="whitespace-pre-line">{REQUIRED_SAFETY_COPY}</p>
      {!compact && <p className="mt-3 whitespace-pre-line text-red-900/80">{LEGAL_CAUTION_COPY}</p>}
    </section>
  );
}
