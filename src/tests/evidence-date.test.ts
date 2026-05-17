import { describe, expect, it } from 'vitest';
import { extractDateCandidateFromFileName, sanitizeEvidenceDateCandidates } from '@/lib/evidence-date';

describe('evidence date inference policy', () => {
  it('extracts likely capture dates from photo file names', () => {
    expect(extractDateCandidateFromFileName('KakaoTalk_20240418_102030.jpg')).toMatchObject({
      date: '2024-04-18',
      source: 'metadata',
      sourceDetail: 'filename'
    });
    expect(extractDateCandidateFromFileName('상담자료_2024년 2월 29일.png')?.date).toBe('2024-02-29');
    expect(extractDateCandidateFromFileName('IMG_2024-02-30.jpg')).toBeNull();
  });

  it('drops visual evidence dates that are only upload date or today fallbacks', () => {
    const result = sanitizeEvidenceDateCandidates({
      providerCandidates: [
        { date: '2026-05-17', source: 'inferred', confidence: 0.61 },
        { date: '2026-05-17', source: 'metadata', confidence: 0.59 }
      ],
      fileDateCandidate: null,
      context: {
        originalName: 'photo.jpg',
        mimeType: 'image/jpeg',
        materialType: 'photo',
        uploadedAt: '2026-05-17T08:00:00.000Z',
        now: new Date('2026-05-17T10:00:00.000Z')
      }
    });

    expect(result).toEqual([]);
  });

  it('uses title/metadata capture dates before provider fallback dates for photos', () => {
    const fileDateCandidate = extractDateCandidateFromFileName('IMG_2024-04-18_101010.jpg');
    const result = sanitizeEvidenceDateCandidates({
      providerCandidates: [
        { date: '2026-05-17', source: 'inferred', confidence: 0.61 },
        { date: '2024-04-18', source: 'metadata', confidence: 0.7 }
      ],
      fileDateCandidate,
      context: {
        originalName: 'IMG_2024-04-18_101010.jpg',
        mimeType: 'image/jpeg',
        materialType: 'photo',
        uploadedAt: '2026-05-17T08:00:00.000Z',
        now: new Date('2026-05-17T10:00:00.000Z')
      }
    });

    expect(result[0]).toEqual({ date: '2024-04-18', source: 'metadata', confidence: 0.68 });
    expect(result).not.toContainEqual(expect.objectContaining({ date: '2026-05-17' }));
  });

  it('keeps non-visual inferred dates unchanged', () => {
    const result = sanitizeEvidenceDateCandidates({
      providerCandidates: [{ date: '2026-05-17', source: 'inferred', confidence: 0.61 }],
      fileDateCandidate: null,
      context: {
        originalName: 'memo.txt',
        mimeType: 'text/plain',
        materialType: 'text_note',
        uploadedAt: '2026-05-17T08:00:00.000Z',
        now: new Date('2026-05-17T10:00:00.000Z')
      }
    });

    expect(result).toEqual([{ date: '2026-05-17', source: 'inferred', confidence: 0.61 }]);
  });
});
