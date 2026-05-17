import { describe, expect, it } from 'vitest';
import { basetenResponseSchema } from '@/server/ai/providers/schema';
import { mockClassify, mockOcr, mockStt } from '@/server/ai/providers/mock';

describe('provider mocks and parsing', () => {
  it('produces deterministic mock OCR/STT/classification drafts', async () => {
    const ocr = await mockOcr({ originalName: 'sample.txt', mimeType: 'text/plain', content: Buffer.from('생활비를 주지 않겠다는 문자') });
    const stt = await mockStt({ originalName: 'voice.webm' });
    const card = await mockClassify({
      caseId: 'case_1',
      fileId: 'file_1',
      guardrailPolicy: 'test guardrail',
      materialType: 'text_note',
      ocrMarkdown: ocr.markdown,
      transcript: stt.transcript,
      userMemo: null,
      fileMetadata: { originalName: 'sample.txt', mimeType: 'text/plain', uploadedAt: new Date().toISOString() },
      allowedTags: ['경제적 통제']
    });
    expect(card.summaryKo).toContain('자동 정리 초안');
    expect(card.tags[0]?.tag).toBe('경제적 통제');
    expect(basetenResponseSchema.parse(card).confidenceLevel).toBeGreaterThanOrEqual(3);
  });

  it('does not invent capture dates for visual mock files without filename or metadata dates', async () => {
    const ocr = await mockOcr({ originalName: 'capture.png', mimeType: 'image/png', content: Buffer.from('mock image') });
    const card = await mockClassify({
      caseId: 'case_visual',
      fileId: 'file_visual',
      guardrailPolicy: 'test guardrail',
      materialType: 'capture',
      ocrMarkdown: ocr.markdown,
      transcript: null,
      userMemo: null,
      fileMetadata: {
        originalName: 'capture.png',
        mimeType: 'image/png',
        uploadedAt: '2026-05-17T00:00:00.000Z',
        captureDateCandidate: null,
        dateInferencePolicy: 'visual_capture_date_from_title_or_metadata_only'
      },
      allowedTags: ['기타/검토 필요']
    });

    expect(card.dateCandidates).toEqual([]);
  });

  it('uses visual filename or metadata capture date candidates in mock classification', async () => {
    const card = await mockClassify({
      caseId: 'case_visual_meta',
      fileId: 'file_visual_meta',
      guardrailPolicy: 'test guardrail',
      materialType: 'photo',
      ocrMarkdown: '# IMG_20240418.jpg\n\n상담 전 자료 정리 초안',
      transcript: null,
      userMemo: null,
      fileMetadata: {
        originalName: 'IMG_20240418.jpg',
        mimeType: 'image/jpeg',
        uploadedAt: '2026-05-17T00:00:00.000Z',
        captureDateCandidate: { date: '2024-04-18', source: 'metadata', confidence: 0.68, sourceDetail: 'filename' },
        dateInferencePolicy: 'visual_capture_date_from_title_or_metadata_only'
      },
      allowedTags: ['기타/검토 필요']
    });

    expect(card.dateCandidates).toEqual([{ date: '2024-04-18', source: 'metadata', confidence: 0.68 }]);
  });

  it('rejects classifier output containing prohibited legal or outcome claims', () => {
    expect(() =>
      basetenResponseSchema.parse({
        title: '법적으로 유효한 증거',
        summaryKo: '승소 가능성을 높입니다.',
        materialType: 'text_note',
        dateCandidates: [],
        people: [],
        locations: [],
        tags: [{ tag: '기타/검토 필요', confidence: 0.5, rationale: '이혼해야 합니다.' }],
        confidenceLevel: 4,
        includeInReportDefault: false,
        needsUserReview: true,
        legalCaution: '법원에서 인정됩니다.'
      })
    ).toThrow();
    for (const phrase of ['이혼을 권합니다', '진단됩니다', '진짜 증거입니다', '법원 제출 가능', '몰래 설치해 위치추적']) {
      expect(() =>
        basetenResponseSchema.parse({
          title: '검토 필요 초안',
          summaryKo: phrase,
          materialType: 'text_note',
          dateCandidates: [],
          people: [],
          locations: [],
          tags: [{ tag: '기타/검토 필요', confidence: 0.5, rationale: '사용자 확인 필요' }],
          confidenceLevel: 3,
          includeInReportDefault: false,
          needsUserReview: true,
          legalCaution: '자료 취득 경위 및 제출 가능성은 변호사 검토 필요'
        })
      ).toThrow();
    }
  });
});
