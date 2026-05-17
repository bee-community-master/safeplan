import { AUDIO_MIME_TYPES, IMAGE_OR_PDF_MIME_TYPES, LIMITS, MATERIAL_TYPES, SUPPORTED_MIME_TYPES } from './constants';
import { hasOcrImageNameSignal } from './image-analysis';
import type { MaterialType } from './types';

export interface UploadCandidate {
  name: string;
  mimeType: string;
  sizeBytes: number;
}

export function bytesFromMb(mb: number): number {
  return mb * 1024 * 1024;
}

export function inferMaterialType(mimeType: string, originalName = ''): MaterialType {
  const name = originalName.toLowerCase();
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'text/plain') return 'text_note';
  if (name.includes('진단') || name.includes('medical')) return 'medical_document';
  if (name.includes('계좌') || name.includes('bank') || name.includes('payment')) return 'bank_or_payment_record';
  if (name.includes('경찰') || name.includes('기관')) return 'police_or_institution_record';
  if (name.includes('capture') || name.includes('screenshot') || name.includes('캡처')) return 'capture';
  if (hasOcrImageNameSignal(originalName)) return 'document';
  if (mimeType.startsWith('image/')) return 'photo';
  if (mimeType === 'application/pdf') return 'document';
  return MATERIAL_TYPES.includes('unknown') ? 'unknown' : 'unknown';
}

export function validateUploadCandidates(files: UploadCandidate[]): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (files.length === 0) errors.push('업로드할 파일을 선택하세요.');
  if (files.length > LIMITS.maxFilesPerCase) errors.push(`자료는 최대 ${LIMITS.maxFilesPerCase}개까지 업로드할 수 있습니다.`);
  const totalBytes = files.reduce((sum, file) => sum + file.sizeBytes, 0);
  if (totalBytes > bytesFromMb(LIMITS.maxTotalUploadMb)) errors.push(`총 업로드 용량은 ${LIMITS.maxTotalUploadMb}MB를 넘을 수 없습니다.`);

  for (const file of files) {
    if (!SUPPORTED_MIME_TYPES.includes(file.mimeType as (typeof SUPPORTED_MIME_TYPES)[number])) {
      errors.push(`${file.name}: 지원하지 않는 파일 형식입니다.`);
      continue;
    }
    if (AUDIO_MIME_TYPES.includes(file.mimeType as (typeof AUDIO_MIME_TYPES)[number]) && file.sizeBytes > bytesFromMb(LIMITS.maxAudioMb)) {
      errors.push(`${file.name}: 음성 파일은 ${LIMITS.maxAudioMb}MB 이하만 가능합니다.`);
    }
    if (
      IMAGE_OR_PDF_MIME_TYPES.includes(file.mimeType as (typeof IMAGE_OR_PDF_MIME_TYPES)[number]) &&
      file.sizeBytes > bytesFromMb(LIMITS.maxImageOrPdfMb)
    ) {
      errors.push(`${file.name}: 이미지/PDF는 ${LIMITS.maxImageOrPdfMb}MB 이하만 가능합니다.`);
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true };
}

export function shouldIncludeByConfidence(confidenceLevel: number, userConfirmed: boolean, explicitlyIncluded: boolean): boolean {
  if (explicitlyIncluded && userConfirmed) return true;
  if (!userConfirmed) return false;
  return confidenceLevel >= 5;
}

export function confidencePolicyLabel(level: number): string {
  switch (level) {
    case 5:
      return '매우 높음: 사용자 확인 후 기본 포함';
    case 4:
      return '높음: 검토 필요 표시';
    case 3:
      return '중간: 확인 전 접힘';
    case 2:
      return '낮음: 검토 상자';
    default:
      return '매우 낮음: 명시 포함 전 숨김';
  }
}
