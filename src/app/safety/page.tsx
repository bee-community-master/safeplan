'use client';

import { useState } from 'react';
import { PageHero, PrimaryLink } from '@/components/DesignSystem';
import { SafetyNotice } from '@/components/SafetyNotice';

export default function SafetyPage() {
  const [highRisk, setHighRisk] = useState(false);
  return (
    <div className="space-y-8">
      <PageHero title="사용 전 안전을 먼저 확인하세요" description="아래 항목은 스스로 현재 상황을 점검하기 위한 안내입니다. 답변은 서버에 저장되지 않고, 고위험 상황에서도 사용자가 계속 진행할지 선택할 수 있습니다." />
      <SafetyNotice compact />
      <section className="surface-panel p-6 md:p-8">
        <h1 className="text-3xl font-black">위험 체크</h1>
        <div className="mt-6 grid gap-3">
          <label className="muted-panel flex gap-3"><input type="checkbox" onChange={(event) => setHighRisk(event.currentTarget.checked)} /> 상대방이 같은 공간에 있거나 휴대폰/브라우저를 볼 수 있습니다.</label>
          <label className="muted-panel flex gap-3"><input type="checkbox" onChange={(event) => { const checked = event.currentTarget.checked; setHighRisk((prev) => prev || checked); }} /> 긴급한 위협이나 폭력이 현재 진행 중입니다.</label>
        </div>
        {highRisk && (
          <div className="mt-5 notice-safe" role="alert">
            <h2 className="text-xl font-black">112 · 1366 먼저 확인</h2>
            <p className="mt-2">긴급 위험이 있으면 서비스 이용보다 112 또는 여성긴급전화 1366 등 공적 지원기관 연락을 우선하세요. 이 화면은 자동 신고나 전화를 하지 않습니다.</p>
          </div>
        )}
        <div className="mt-6"><PrimaryLink href="/simulator">계속 진행</PrimaryLink></div>
      </section>
    </div>
  );
}
