'use client';

import { useState } from 'react';
import { SafetyNotice } from '@/components/SafetyNotice';

export default function SafetyPage() {
  const [highRisk, setHighRisk] = useState(false);
  return (
    <div className="space-y-6">
      <SafetyNotice />
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold">위험 체크</h1>
        <p className="mt-3 text-stone-700">아래 항목은 사용자가 스스로 안전을 점검하기 위한 안내입니다. 답변은 서버에 저장되지 않습니다.</p>
        <div className="mt-5 space-y-3">
          <label className="flex gap-3"><input type="checkbox" onChange={(event) => setHighRisk(event.currentTarget.checked)} /> 상대방이 같은 공간에 있거나 휴대폰/브라우저를 볼 수 있습니다.</label>
          <label className="flex gap-3"><input type="checkbox" onChange={(event) => { const checked = event.currentTarget.checked; setHighRisk((prev) => prev || checked); }} /> 긴급한 위협이나 폭력이 현재 진행 중입니다.</label>
        </div>
        {highRisk && (
          <div className="mt-5 rounded-2xl border border-red-300 bg-red-50 p-4" role="alert">
            <h2 className="text-xl font-bold text-red-950">112 · 1366 먼저 확인</h2>
            <p className="mt-2">긴급 위험이 있으면 서비스 이용보다 112 또는 여성긴급전화 1366 등 공적 지원기관 연락을 우선하세요. 이 화면은 자동 신고나 전화를 하지 않습니다.</p>
          </div>
        )}
        <a className="mt-6 inline-block rounded-xl bg-ink px-5 py-3 font-semibold text-white" href="/simulator">계속 진행</a>
      </section>
    </div>
  );
}
