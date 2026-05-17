import 'server-only';
import type { MaterialType } from '@/lib/types';
import { imageDescriptionResponseSchema, ProviderMissingCredentialError } from './schema';

const IMAGE_DESCRIPTION_GUARDRAIL_POLICY =
  '한국어 상담자료 준비용 일반 이미지 설명 초안만 생성합니다. 문서/표/캡처는 OCR 경로로 처리되므로 이 경로에서는 장면·대상·상황을 조심스럽게 묘사하되 법률 자문, 승소/패소 예측, 이혼 권유, 진정성 판단, 증거능력/법적 효력 판단을 하지 마세요. 촬영일은 오늘 날짜나 업로드일로 추정하지 말고 파일명/메타데이터로 확인된 경우에만 별도 날짜 후보가 다뤄진다고 전제하세요. 모든 설명은 사용자가 확인해야 하는 초안이라고 표현하세요.';

export interface ImageDescriptionInput {
  content: Buffer;
  mimeType: string;
  originalName: string;
  materialType: MaterialType;
  userMemo: string | null;
}

export interface ImageDescriptionResult {
  descriptionKo: string;
  confidence: number;
  raw: unknown;
}

export async function basetenDescribeImage(input: ImageDescriptionInput): Promise<ImageDescriptionResult> {
  const apiKey = process.env.BASETEN_API_KEY;
  const url = process.env.BASETEN_IMAGE_DESCRIPTION_URL;
  if (!apiKey || !url) throw new ProviderMissingCredentialError('baseten_image_description');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Api-Key ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      guardrailPolicy: IMAGE_DESCRIPTION_GUARDRAIL_POLICY,
      originalName: input.originalName,
      mimeType: input.mimeType,
      materialType: input.materialType,
      userMemo: input.userMemo,
      imageBase64: input.content.toString('base64')
    })
  });
  if (!response.ok) throw new Error(`baseten_image_description_failed_${response.status}`);
  const raw = await response.json();
  const candidate = raw?.output ?? raw?.result ?? raw;
  const parsed = imageDescriptionResponseSchema.parse(candidate);
  return { descriptionKo: parsed.descriptionKo, confidence: parsed.confidence, raw: candidate };
}
