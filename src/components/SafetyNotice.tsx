import { LEGAL_CAUTION_COPY, REQUIRED_SAFETY_COPY } from '@/lib/constants';

export function SafetyNotice({ compact = false }: { compact?: boolean }) {
  return (
    <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6" aria-label="안전 안내">
      <h2 className="mb-2 text-lg font-bold text-red-950">먼저 안전을 확인하세요</h2>
      <p className="whitespace-pre-line">{REQUIRED_SAFETY_COPY}</p>
      {!compact && <p className="mt-3 whitespace-pre-line text-stone-700">{LEGAL_CAUTION_COPY}</p>}
    </section>
  );
}
