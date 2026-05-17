import { describe, expect, it } from 'vitest';
import { koreanPdfFontCandidates, generateReportPdf, PDF_SECTION_HEADINGS } from '@/server/reports/pdf';
import type { CaseRecord, EvidenceCardRecord, EvidenceFileRecord } from '@/server/db/types';

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

  it('uses PDF-renderable Korean font files instead of webfont containers', () => {
    const candidates = koreanPdfFontCandidates();
    expect(candidates.some((candidate) => candidate.endsWith('GothicA1_400Regular.ttf'))).toBe(true);
    expect(candidates.every((candidate) => !candidate.endsWith('.woff') && !candidate.endsWith('.woff2'))).toBe(true);
  });

  it('generates a Korean PDF with an embedded TrueType font', async () => {
    const now = '2026-05-17T10:00:00.000Z';
    const caseRecord: CaseRecord = {
      id: 'case_pdf_test',
      userId: 'user_pdf_test',
      sessionId: 'session_pdf_test',
      title: 'PDF 점검',
      status: 'reported',
      retentionUntil: now,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };
    const card: EvidenceCardRecord = {
      id: 'card_pdf_test',
      caseId: caseRecord.id,
      fileId: 'file_pdf_test',
      title: '카카오톡 캡처 자료 초안',
      summaryKo: '자동 정리 초안: 한글 리포트 렌더링 회귀 테스트입니다.',
      materialType: 'capture',
      dateCandidate: '2024-04-18',
      dateSource: 'metadata',
      peopleJson: [],
      locationsJson: [],
      tagsJson: [{ tag: '경제적 통제' }],
      confidenceLevel: 4,
      includeInReport: true,
      userConfirmed: true,
      userMemo: '사용자 메모도 한글로 표시되어야 합니다.',
      aiDraftJson: { imageDescriptionKo: '일반 이미지 설명 초안도 리포트에 표시되어야 합니다.' },
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };
    const file: EvidenceFileRecord = {
      id: 'file_pdf_test',
      caseId: caseRecord.id,
      originalName: 'KakaoTalk_20240418_101010.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 123456,
      gcsBucket: 'local',
      gcsObject: 'object',
      encryptedDek: 'encrypted',
      checksumSha256: 'checksum',
      materialType: 'capture',
      processingStatus: 'processed',
      userMemo: null,
      uploadedAt: now,
      deletedAt: null
    };

    const pdf = await generateReportPdf({ caseRecord, cards: [card], files: [file] });
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(pdf.length).toBeGreaterThan(10_000);
  });
});
