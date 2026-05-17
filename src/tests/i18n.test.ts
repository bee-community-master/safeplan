import { describe, expect, it } from 'vitest';
import { translateText } from '@/lib/i18n';

describe('language toggle translations', () => {
  it('keeps Korean as the default source language', () => {
    expect(translateText('독립 세이프플랜', 'ko')).toBe('독립 세이프플랜');
    expect(translateText('자료 카드 2개가 준비되었습니다.', 'ko')).toBe('자료 카드 2개가 준비되었습니다.');
  });

  it('translates core static and dynamic service copy to English', () => {
    expect(translateText('독립 세이프플랜', 'en')).toBe('SafePlan Independence');
    expect(translateText('지금의 선택이 내일의 안전을 만듭니다', 'en')).toBe('Today’s choices can protect tomorrow’s safety');
    expect(translateText('자료 카드 2개가 준비되었습니다.', 'en')).toBe('Prepared 2 evidence cards.');
    expect(translateText('사용 가능 현금 3,000,000원 · 월 순현금흐름 -100,000원', 'en')).toBe('Usable cash ₩3,000,000 · Monthly net cash flow -₩100,000');
    expect(translateText('0.5개월', 'en')).toBe('0.5 months');
  });
});
