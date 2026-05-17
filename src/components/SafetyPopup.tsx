'use client';

import { useEffect, useState } from 'react';
import { REQUIRED_SAFETY_COPY } from '@/lib/constants';

export function SafetyPopup() {
  const [open, setOpen] = useState(false);
  const [risk, setRisk] = useState<'unknown' | 'safe' | 'risky'>('unknown');

  useEffect(() => {
    setOpen(window.localStorage.getItem('safeplan_safety_seen') !== 'yes');
  }, []);

  function close(choice: 'safe' | 'risky' | 'continue') {
    window.localStorage.setItem('safeplan_safety_seen', 'yes');
    setRisk(choice === 'risky' ? 'risky' : 'safe');
    setOpen(false);
  }

  if (!open) {
    return risk === 'risky' ? (
      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm" role="status">
        긴급 위험이 있으면 서비스 이용보다 112 또는 1366 연락을 우선하세요. 계속 진행은 사용자가 선택할 수 있습니다.
      </div>
    ) : null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="safety-title">
      <div className="max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
        <h2 id="safety-title" className="text-2xl font-bold">안전 확인</h2>
        <p className="mt-4 whitespace-pre-line leading-7">{REQUIRED_SAFETY_COPY}</p>
        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          <button className="focus-ring rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white" onClick={() => close('safe')}>안전합니다</button>
          <button className="focus-ring rounded-xl bg-red-100 px-4 py-3 font-semibold text-red-950" onClick={() => close('risky')}>위험할 수 있습니다</button>
          <button className="focus-ring rounded-xl border border-stone-300 px-4 py-3 font-semibold" onClick={() => close('continue')}>그래도 계속 진행합니다</button>
        </div>
      </div>
    </div>
  );
}
