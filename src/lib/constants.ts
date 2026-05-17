export const PRICE_KRW = 9900;

export const LIMITS = {
  maxFilesPerCase: Number(process.env.MAX_FILES_PER_CASE ?? 20),
  maxTotalUploadMb: Number(process.env.MAX_TOTAL_UPLOAD_MB ?? 100),
  maxImageOrPdfMb: Number(process.env.MAX_IMAGE_OR_PDF_MB ?? 20),
  maxAudioMb: Number(process.env.MAX_AUDIO_MB ?? 25),
  shareUrlTtlDays: Number(process.env.SHARE_URL_TTL_DAYS ?? 14),
  evidenceRetentionDays: Number(process.env.EVIDENCE_RETENTION_DAYS ?? 365)
} as const;

export const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/plain',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/flac',
  'audio/webm'
] as const;

export const AUDIO_MIME_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/flac', 'audio/webm'] as const;
export const IMAGE_OR_PDF_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;

export const AI_TAGS = [
  '폭언',
  '폭행/상흔',
  '협박',
  '경제적 통제',
  '양육 방해',
  '외도 정황',
  '재산 은닉',
  '스토킹',
  '기타/검토 필요'
] as const;

export const REQUIRED_SAFETY_COPY =
  '이 서비스를 사용하기 전, 현재 위치와 기기 사용이 안전한지 확인하세요.\n상대방이 같은 공간에 있거나 휴대폰을 볼 수 있다면 사용을 중단하거나 안전한 장소에서 다시 접속하세요.\n긴급 위험이 있는 경우 서비스 이용보다 112 또는 1366 등 공적 지원기관 연락을 우선하세요.';

export const LEGAL_CAUTION_COPY =
  '이 서비스는 법률 자문을 제공하지 않습니다.\nAI가 생성한 요약, 태그, 날짜, 인물 정보는 초안이며 사용자의 확인이 필요합니다.\n자료의 취득 경위, 제출 가능성, 법적 효력은 변호사에게 확인해야 합니다.\n불법적인 자료 수집, 무단 접근, 위치추적, 몰래 설치형 기능은 안내하지 않습니다.\n긴급 위험이 있는 경우 서비스 이용보다 112 또는 1366 등 공적 지원기관 연락을 우선하세요.';

export const MATERIAL_TYPES = [
  'photo',
  'capture',
  'document',
  'medical_document',
  'bank_or_payment_record',
  'audio',
  'text_note',
  'police_or_institution_record',
  'unknown'
] as const;
