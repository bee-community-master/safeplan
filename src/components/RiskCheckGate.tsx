'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const RISK_CHECK_KEY = 'safeplan_risk_checked';

export function markRiskCheckDone() {
  if (typeof window !== 'undefined') window.localStorage.setItem(RISK_CHECK_KEY, 'yes');
}

export function RiskCheckGate() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(window.localStorage.getItem(RISK_CHECK_KEY) !== 'yes');
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="risk-check-title">
      <div className="max-w-xl surface-panel p-6 shadow-2xl">
        <h2 id="risk-check-title" className="text-3xl font-black">위험 체크를 먼저 확인하세요</h2>
        <p className="mt-4 leading-7 text-muted">생존 시뮬레이터는 재정 입력값을 서버에 저장하지 않지만, 사용 전 현재 기기와 주변 상황이 안전한지 먼저 확인하는 것을 권장합니다.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="button-primary" href="/safety">위험 체크로 이동</Link>
          <button
            className="button-secondary"
            onClick={() => {
              markRiskCheckDone();
              setOpen(false);
            }}
          >
            위험 체크 건너뛰고 계속
          </button>
        </div>
      </div>
    </div>
  );
}
