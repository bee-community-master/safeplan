import type { MaterialType } from './types';

export type ImageAnalysisMode = 'ocr' | 'description';

const OCR_IMAGE_MATERIAL_TYPES = new Set<MaterialType>([
  'capture',
  'document',
  'medical_document',
  'bank_or_payment_record',
  'police_or_institution_record'
]);

const OCR_IMAGE_NAME_PATTERNS = [
  /capture/i,
  /screenshot/i,
  /screen[\s_-]?shot/i,
  /캡처/,
  /스크린샷/,
  /카카오톡|카톡|kakao/i,
  /문자|message|sms/i,
  /document|doc/i,
  /문서/,
  /table/i,
  /표/,
  /receipt/i,
  /영수증/,
  /invoice/i,
  /청구서/,
  /statement/i,
  /명세/,
  /거래/,
  /bank/i,
  /계좌/,
  /payment/i,
  /결제/,
  /진단|medical|hospital|clinic/i,
  /경찰|기관|police/i
] as const;

export function isImageMimeType(mimeType: string): boolean {
  return mimeType.toLowerCase().startsWith('image/');
}

export function hasOcrImageNameSignal(originalName: string): boolean {
  const normalized = originalName.normalize('NFKC');
  return OCR_IMAGE_NAME_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isOcrPreferredImage(input: { mimeType: string; materialType?: MaterialType | null; originalName?: string | null }): boolean {
  if (!isImageMimeType(input.mimeType)) return false;
  if (input.materialType && OCR_IMAGE_MATERIAL_TYPES.has(input.materialType)) return true;
  return hasOcrImageNameSignal(input.originalName ?? '');
}

export function chooseImageAnalysisMode(input: { mimeType: string; materialType?: MaterialType | null; originalName?: string | null }): ImageAnalysisMode | null {
  if (!isImageMimeType(input.mimeType)) return null;
  return isOcrPreferredImage(input) ? 'ocr' : 'description';
}
