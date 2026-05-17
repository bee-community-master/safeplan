'use client';

import { useEffect, useState } from 'react';
import { BrandMark } from '@/components/DesignSystem';
import { REQUIRED_SAFETY_COPY } from '@/lib/constants';

export function SafetyPopup({ storageKey = 'safeplan_safety_seen', title = '안전 확인' }: { storageKey?: string; title?: string }) {
  const [open, setOpen] = useState(false);
  const [risk, setRisk] = useState<'unknown' | 'safe' | 'risky'>('unknown');

  useEffect(() => {
    setOpen(window.localStorage.getItem(storageKey) !== 'yes');
  }, [storageKey]);

  function close(choice: 'safe' | 'risky' | 'continue') {
    window.localStorage.setItem(storageKey, 'yes');
    setRisk(choice === 'risky' ? 'risky' : 'safe');
    setOpen(false);
  }

  if (!open) {
    return risk === 'risky' ? (
      <div className="notice-safe" role="status">
        긴급 위험이 있으면 서비스 이용보다 112 또는 1366 연락을 우선하세요. 계속 진행은 사용자가 선택할 수 있습니다.
      </div>
    ) : null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="safety-title">
      <div className="max-w-xl surface-panel p-6 shadow-2xl">
        <BrandMark />
        <h2 id="safety-title" className="mt-5 text-3xl font-black">{title}</h2>
        <p className="mt-4 whitespace-pre-line leading-7 text-muted">{REQUIRED_SAFETY_COPY}</p>
        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          <button className="button-primary" onClick={() => close('safe')}>안전합니다</button>
          <button className="button-danger bg-red-50" onClick={() => close('risky')}>위험할 수 있습니다</button>
          <button className="button-secondary" onClick={() => close('continue')}>그래도 계속 진행합니다</button>
        </div>
      </div>
    </div>
  );
}
