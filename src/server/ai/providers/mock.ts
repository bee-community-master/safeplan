import 'server-only';
import { AI_TAGS } from '@/lib/constants';
import { extractDateCandidateFromText, isVisualEvidence } from '@/lib/evidence-date';
import type { BasetenClassifierInput, BasetenClassifierResponse, MaterialType } from '@/lib/types';
import type { ImageDescriptionInput, ImageDescriptionResult } from './baseten-image-description';

export async function mockOcr(input: { originalName: string; mimeType: string; content: Buffer }): Promise<{ markdown: string; raw: unknown }> {
  const text = input.mimeType === 'text/plain' ? input.content.toString('utf8') : '';
  const markdown = text.trim()
    ? `# ${input.originalName}\n\n${text.trim()}`
    : `# ${input.originalName}\n\n상담 전 자료 정리를 위한 초안 텍스트입니다.`;
  return { markdown, raw: { provider: 'mock', markdown, degraded: false } };
}

export async function mockStt(input: { originalName: string }): Promise<{ transcript: string; raw: unknown }> {
  const transcript = `A: ${input.originalName}에서 추출한 음성 전사 초안입니다.\nB: 실제 판단이 아니라 사용자가 확인해야 하는 자료 정리용 텍스트입니다.`;
  return { transcript, raw: { provider: 'mock', transcript, degraded: false } };
}

export async function mockDescribeImage(input: Pick<ImageDescriptionInput, 'originalName' | 'materialType' | 'userMemo'>): Promise<ImageDescriptionResult> {
  const memo = input.userMemo?.trim();
  const descriptionKo = [
    `${input.originalName}은 문서/표/캡처로 분류되지 않은 일반 사진 자료입니다.`,
    '사진 속 구체적 인물, 장소, 상황은 사용자가 원본을 보며 확인해야 하며 법적 판단이나 효력 판단을 포함하지 않습니다.',
    memo ? `사용자 메모 참고: ${memo.slice(0, 160)}${memo.length > 160 ? '…' : ''}` : null
  ].filter(Boolean).join(' ');
  return {
    descriptionKo,
    confidence: 0.52,
    raw: { provider: 'mock', descriptionKo, materialType: input.materialType, degraded: false }
  };
}

function detectTag(text: string): (typeof AI_TAGS)[number] {
  if (/협박|위협|죽/.test(text)) return '협박';
  if (/돈|카드|계좌|생활비|경제/.test(text)) return '경제적 통제';
  if (/때렸|상처|폭행|멍/.test(text)) return '폭행/상흔';
  if (/스토킹|따라|위치/.test(text)) return '스토킹';
  if (/아이|양육|학교/.test(text)) return '양육 방해';
  if (/외도|상간/.test(text)) return '외도 정황';
  if (/재산|은닉|명의/.test(text)) return '재산 은닉';
  if (/욕|폭언|소리/.test(text)) return '폭언';
  return '기타/검토 필요';
}

function firstTextDateCandidate(input: BasetenClassifierInput): BasetenClassifierResponse['dateCandidates'][number] | null {
  const sources = [
    { text: input.userMemo, source: 'user' as const, confidence: 0.72 },
    { text: input.ocrMarkdown, source: 'ocr' as const, confidence: 0.66 },
    { text: input.transcript, source: 'inferred' as const, confidence: 0.58 }
  ];
  for (const candidateSource of sources) {
    if (!candidateSource.text) continue;
    const candidate = extractDateCandidateFromText(candidateSource.text, candidateSource.confidence);
    if (candidate) return { date: candidate.date, source: candidateSource.source, confidence: candidate.confidence };
  }
  return null;
}

function mockDateCandidates(input: BasetenClassifierInput): BasetenClassifierResponse['dateCandidates'] {
  const metadataCandidate = input.fileMetadata.captureDateCandidate;
  if (metadataCandidate) {
    return [{ date: metadataCandidate.date, source: 'metadata', confidence: metadataCandidate.confidence }];
  }

  const textCandidate = firstTextDateCandidate(input);
  if (textCandidate) return [textCandidate];

  const visual = isVisualEvidence({ mimeType: input.fileMetadata.mimeType, materialType: input.materialType });
  if (visual || input.fileMetadata.dateInferencePolicy === 'visual_capture_date_from_title_or_metadata_only') {
    return [];
  }

  return [];
}

export async function mockClassify(input: BasetenClassifierInput): Promise<BasetenClassifierResponse> {
  const normalized = [input.ocrMarkdown, input.transcript, input.imageDescriptionKo, input.userMemo].filter(Boolean).join('\n');
  const tag = detectTag(normalized || input.fileMetadata.originalName);
  const confidenceLevel = normalized.length > 30 ? 4 : 3;
  return {
    title: `${input.fileMetadata.originalName} 자료 초안`,
    summaryKo: normalized
      ? `자동 정리 초안: ${normalized.slice(0, 220)}${normalized.length > 220 ? '…' : ''}`
      : '자동 정리 초안: 파일명과 기본 정보를 기준으로 생성한 검토 필요 자료입니다.',
    imageDescriptionKo: input.imageDescriptionKo,
    materialType: input.materialType as MaterialType,
    dateCandidates: mockDateCandidates(input),
    people: [{ label: '미상', rawMention: '자료 내 인물', confidence: 0.3 }],
    locations: [],
    tags: [{ tag, confidence: 0.72, rationale: '키워드와 파일 내용을 기준으로 태그 초안을 선택했습니다.' }],
    confidenceLevel,
    includeInReportDefault: confidenceLevel >= 5,
    needsUserReview: true,
    legalCaution: '자료 취득 경위 및 제출 가능성은 변호사 검토 필요'
  };
}
