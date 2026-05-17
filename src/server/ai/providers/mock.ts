import 'server-only';
import { AI_TAGS } from '@/lib/constants';
import type { BasetenClassifierInput, BasetenClassifierResponse, MaterialType } from '@/lib/types';

export async function mockOcr(input: { originalName: string; mimeType: string; content: Buffer }): Promise<{ markdown: string; raw: unknown }> {
  const text = input.mimeType === 'text/plain' ? input.content.toString('utf8') : '';
  const markdown = text.trim()
    ? `# ${input.originalName}\n\n${text.trim()}`
    : `# ${input.originalName}\n\n모의 OCR 결과입니다. 날짜: 2026-05-01. 상담 전 자료 정리를 위한 초안 텍스트입니다.`;
  return { markdown, raw: { provider: 'mock', markdown, degraded: false } };
}

export async function mockStt(input: { originalName: string }): Promise<{ transcript: string; raw: unknown }> {
  const transcript = `A: ${input.originalName}에서 추출한 모의 음성 전사 초안입니다.\nB: 실제 판단이 아니라 사용자가 확인해야 하는 자료 정리용 텍스트입니다.`;
  return { transcript, raw: { provider: 'mock', transcript, degraded: false } };
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

export async function mockClassify(input: BasetenClassifierInput): Promise<BasetenClassifierResponse> {
  const normalized = [input.ocrMarkdown, input.transcript, input.userMemo].filter(Boolean).join('\n');
  const tag = detectTag(normalized || input.fileMetadata.originalName);
  const confidenceLevel = normalized.length > 30 ? 4 : 3;
  return {
    title: `${input.fileMetadata.originalName} 자료 초안`,
    summaryKo: normalized
      ? `AI 초안: ${normalized.slice(0, 220)}${normalized.length > 220 ? '…' : ''}`
      : 'AI 초안: 파일명과 메타데이터를 기준으로 생성한 검토 필요 자료입니다.',
    materialType: input.materialType as MaterialType,
    dateCandidates: [{ date: '2026-05-01', source: 'inferred', confidence: 0.55 }],
    people: [{ label: '미상', rawMention: '자료 내 인물', confidence: 0.3 }],
    locations: [],
    tags: [{ tag, confidence: 0.72, rationale: '모의 분류기는 키워드와 파일 내용을 기준으로 태그 초안을 선택합니다.' }],
    confidenceLevel,
    includeInReportDefault: confidenceLevel >= 5,
    needsUserReview: true,
    legalCaution: '자료 취득 경위 및 제출 가능성은 변호사 검토 필요'
  };
}
