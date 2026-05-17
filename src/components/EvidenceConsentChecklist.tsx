'use client';

import { PRICE_KRW } from '@/lib/constants';

export type ConsentKey = 'sensitive' | 'original' | 'ai' | 'overseas' | 'payment';
export type ConsentState = Record<ConsentKey, boolean>;

export const INITIAL_CONSENTS: ConsentState = {
  sensitive: false,
  original: false,
  ai: false,
  overseas: false,
  payment: false
};

const CONSENT_OPTIONS: Array<{ key: ConsentKey; label: string }> = [
  { key: 'sensitive', label: '민감정보 처리에 동의합니다.' },
  { key: 'original', label: '원본 자료 처리에 동의합니다.' },
  { key: 'ai', label: '자료 정리를 위한 외부 분석 서비스 처리에 동의합니다.' },
  { key: 'overseas', label: '가능한 해외/제3자 처리에 동의합니다.' },
  { key: 'payment', label: `${PRICE_KRW.toLocaleString('ko-KR')}원 결제에 동의합니다.` }
];

export function EvidenceConsentChecklist({
  consents,
  canRecord,
  onToggle,
  onRecord
}: {
  consents: ConsentState;
  canRecord: boolean;
  onToggle: (key: ConsentKey, checked: boolean) => void;
  onRecord: () => void;
}) {
  return (
    <fieldset className="mt-8 space-y-3 rounded-3xl border border-line bg-white/80 p-5">
      <legend className="px-2 font-bold">자료 정리 전 명시 동의</legend>
      {CONSENT_OPTIONS.map(({ key, label }) => (
        <label key={key} className="flex gap-3 text-sm">
          <input type="checkbox" checked={consents[key]} onChange={(event) => onToggle(key, event.currentTarget.checked)} /> {label}
        </label>
      ))}
      <button className="button-secondary px-4 py-2" disabled={!canRecord} onClick={onRecord}>동의 기록</button>
    </fieldset>
  );
}
