import { describe, expect, it } from 'vitest';
import { validateUploadCandidates, shouldIncludeByConfidence, inferMaterialType } from '@/lib/evidence';
import { chooseImageAnalysisMode, hasOcrImageNameSignal } from '@/lib/image-analysis';

describe('evidence policies', () => {
  it('validates supported upload types and limits', () => {
    expect(validateUploadCandidates([{ name: 'a.txt', mimeType: 'text/plain', sizeBytes: 10 }])).toEqual({ ok: true });
    const invalid = validateUploadCandidates([{ name: 'movie.mp4', mimeType: 'video/mp4', sizeBytes: 10 }]);
    expect(invalid.ok).toBe(false);
  });

  it('keeps PDF inclusion behind user confirmation', () => {
    expect(shouldIncludeByConfidence(5, false, true)).toBe(false);
    expect(shouldIncludeByConfidence(5, true, false)).toBe(true);
    expect(shouldIncludeByConfidence(3, true, false)).toBe(false);
    expect(shouldIncludeByConfidence(3, true, true)).toBe(true);
  });

  it('infers material types without legal judgments', () => {
    expect(inferMaterialType('audio/webm', 'memo.webm')).toBe('audio');
    expect(inferMaterialType('text/plain', 'note.txt')).toBe('text_note');
    expect(inferMaterialType('application/pdf', 'bank.pdf')).toBe('bank_or_payment_record');
    expect(inferMaterialType('image/png', 'receipt_table.png')).toBe('document');
  });

  it('routes document-like images to OCR and ordinary photos to description', () => {
    expect(hasOcrImageNameSignal('receipt_table.png')).toBe(true);
    expect(chooseImageAnalysisMode({ mimeType: 'image/png', materialType: 'document', originalName: 'receipt_table.png' })).toBe('ocr');
    expect(chooseImageAnalysisMode({ mimeType: 'image/jpeg', materialType: 'photo', originalName: 'family_photo.jpg' })).toBe('description');
    expect(chooseImageAnalysisMode({ mimeType: 'application/pdf', materialType: 'document', originalName: 'report.pdf' })).toBeNull();
  });
});
