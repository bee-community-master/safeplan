import { describe, expect, it } from 'vitest';
import { PDF_SECTION_HEADINGS } from '@/server/reports/pdf';

describe('report PDF contract', () => {
  it('keeps the required report sections explicit and ordered', () => {
    expect(PDF_SECTION_HEADINGS).toEqual([
      '1. 표지',
      '2. 법률 자문 아님 고지',
      '3. 요약',
      '4. 자료 수, 기간, 주요 태그, confidence 분포',
      '5. 자료 타임라인',
      '6. 음성 전사',
      '7. 카카오톡/문자 구조화',
      '8. 문서/계좌/진단서 추출 텍스트',
      '9. 확인 필요 자료',
      '10. 원본 파일 목록',
      '11. 주의 문구'
    ]);
  });
});
