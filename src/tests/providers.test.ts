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
  });
});
