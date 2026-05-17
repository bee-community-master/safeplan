'use client';

import { useMemo, useState } from 'react';
import { calculateRunwayScenarios } from '@/lib/runway';
import type { RunwayInput } from '@/lib/types';
import { formatKrw, formatRunway } from '@/lib/format';

const defaultInput: RunwayInput = {
  availableCash: 3000000,
  monthlyIncome: 1200000,
  partnerSupportMonthly: 800000,
  partnerSupportRisk: 'partial',
  partialSupportRatio: 0.5,
  essentialExpenses: 1200000,
  adjustableExpenses: 300000,
  debtRepayment: 100000,
  childCosts: 300000,
  currentHousingCost: 500000,
  futureHousingCost: 600000,
  depositLockedAmount: 0,
  movingCost: 1000000,
  legalAdminCost: 500000,
  emergencyCost: 500000
};

const fields: Array<{ key: keyof RunwayInput; label: string; step?: number }> = [
  { key: 'availableCash', label: '사용 가능한 현금' },
  { key: 'monthlyIncome', label: '월 소득' },
  { key: 'partnerSupportMonthly', label: '현재 생활비 지원 월액' },
  { key: 'partialSupportRatio', label: '일부 수령 비율(0~1)', step: 0.1 },
  { key: 'essentialExpenses', label: '필수 생활비' },
  { key: 'adjustableExpenses', label: '조정 가능한 지출' },
  { key: 'debtRepayment', label: '채무 상환' },
  { key: 'childCosts', label: '자녀 관련 비용' },
  { key: 'currentHousingCost', label: '현재 주거비' },
  { key: 'futureHousingCost', label: '예상 독립 후 주거비' },
  { key: 'depositLockedAmount', label: '묶여 있는 보증금/예치금' },
  { key: 'movingCost', label: '이사 비용' },
  { key: 'legalAdminCost', label: '행정·상담 준비 비용' },
  { key: 'emergencyCost', label: '비상 예비비' }
];

export function RunwaySimulator() {
  const [input, setInput] = useState<RunwayInput>(() => defaultInput);
  const [saved, setSaved] = useState(false);
  const scenarios = useMemo(() => calculateRunwayScenarios(input), [input]);
  const lowRunway = scenarios.some((scenario) => typeof scenario.runwayMonths === 'number' && scenario.runwayMonths < 1);

  function updateNumber(key: keyof RunwayInput, value: string) {
    setInput((prev) => ({ ...prev, [key]: Number(value) || 0 }));
  }

  function saveLocal() {
    window.localStorage.setItem('safeplan_runway_input', JSON.stringify(input));
    setSaved(true);
  }

  function loadLocal() {
    const raw = window.localStorage.getItem('safeplan_runway_input');
    if (raw) setInput(JSON.parse(raw) as RunwayInput);
  }

  function clearLocal() {
    window.localStorage.removeItem('safeplan_runway_input');
    setSaved(false);
  }

  return (
    <section className="surface-panel p-6 md:p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row">
        <div>
          <h1 className="text-3xl font-black">생존 시뮬레이터</h1>
          <p className="mt-2 max-w-3xl leading-7 text-muted">계산은 이 기기 안에서만 수행되며 서버로 전송되지 않습니다. 저장은 사용자가 “이 기기에 저장”을 누른 뒤에만 이 브라우저에 남습니다.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <button className="button-secondary px-4 py-2" onClick={loadLocal}>이 기기 값 불러오기</button>
          <button className="button-primary px-4 py-2" onClick={saveLocal}>이 기기에 저장</button>
          <button className="button-danger px-4 py-2" onClick={clearLocal}>이 기기 데이터 삭제</button>
        </div>
      </div>
      {saved && <p className="mt-4 rounded-2xl bg-tealSoft p-4 text-sm text-tealDark" role="status">이 기기에만 저장했습니다. 서버에는 저장되지 않았습니다.</p>}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <label key={String(field.key)} className="block text-sm font-semibold">
            {field.label}
            <input
              aria-label={field.label}
              className="field-input"
              type="number"
              step={field.step ?? 10000}
              value={String(input[field.key])}
              onChange={(event) => updateNumber(field.key, event.currentTarget.value)}
            />
          </label>
        ))}
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3" aria-label="생활비 수령 시나리오">
        {scenarios.map((scenario) => (
          <article key={scenario.key} className="rounded-3xl border border-line bg-white p-5 shadow-soft">
            <h2 className="font-bold">{scenario.label}</h2>
            <p className="mt-3 text-3xl font-black" data-testid={`runway-${scenario.key}`}>{formatRunway(scenario.runwayMonths)}</p>
            <p className="mt-2 text-sm leading-6 text-muted">사용 가능 현금 {formatKrw(scenario.usableCash)} · 월 순현금흐름 {formatKrw(scenario.monthlyNet)}</p>
          </article>
        ))}
      </div>
      {lowRunway && (
        <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5" role="alert">
          <h2 className="font-bold">1개월 미만 결과가 있습니다</h2>
          <p className="mt-2">고금리 대출·카드론·사금융을 권하지 않습니다. 주민센터, 가족센터, 여성긴급전화 1366, 긴급복지지원 등 공적 지원기관 정보를 먼저 확인하세요.</p>
        </div>
      )}
      <a className="button-primary mt-6 inline-flex" href="/evidence/start">자료 정리 흐름으로 이동</a>
    </section>
  );
}
