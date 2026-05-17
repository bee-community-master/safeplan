import 'server-only';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { PDFDocument, type PDFFont, rgb } from 'pdf-lib';
import { LEGAL_CAUTION_COPY } from '@/lib/constants';
import type { CaseRecord, EvidenceCardRecord, EvidenceFileRecord } from '@/server/db/types';

export function koreanPdfFontCandidates(): string[] {
  const candidates: string[] = [];
  if (process.env.SAFEPLAN_PDF_FONT_PATH) candidates.push(process.env.SAFEPLAN_PDF_FONT_PATH);
  candidates.push(
    path.join(process.cwd(), 'src/server/reports/fonts/GothicA1_400Regular.ttf'),
    '/System/Library/Fonts/Supplemental/AppleGothic.ttf',
    '/Library/Fonts/AppleGothic.ttf',
    '/usr/share/fonts/truetype/noto/NotoSansKR-Regular.ttf',
    '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
    '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
    '/usr/share/fonts/opentype/noto/NotoSansCJKkr-Regular.otf'
  );
  return candidates;
}

async function loadKoreanFont(doc: PDFDocument) {
  const require = createRequire(import.meta.url);
  const fontkit = require('@pdf-lib/fontkit');
  doc.registerFontkit((fontkit.default ?? fontkit) as Parameters<typeof doc.registerFontkit>[0]);
  const candidates = koreanPdfFontCandidates();
  for (const candidate of candidates) {
    try {
      return await doc.embedFont(new Uint8Array(await readFile(candidate)), { subset: false });
    } catch (error) {
      if (process.env.SAFEPLAN_DEBUG_PDF_FONT === '1') console.error('pdf_font_load_failed', candidate, error);
    }
  }
  throw new Error('pdf_korean_font_unavailable');
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${bytes}B`;
}

function displayFileType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '이미지';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType === 'text/plain') return '텍스트';
  if (mimeType.startsWith('audio/')) return '음성';
  return '파일';
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const normalized = text.replace(/\r/g, '').split('\n');
  const lines: string[] = [];
  for (const paragraph of normalized) {
    let line = '';
    for (const char of paragraph) {
      const candidate = `${line}${char}`;
      if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        lines.push(line.trimEnd());
        line = char.trimStart();
      } else {
        line = candidate;
      }
    }
    lines.push(line || ' ');
  }
  return lines;
}

export const PDF_SECTION_HEADINGS = [
  '1. 표지',
  '2. 법률 자문 아님 고지',
  '3. 요약',
  '4. 자료 수, 기간, 주요 태그, confidence 분포',
  '5. 자료 타임라인',
  '6. 음성 전사',
  '7. 카카오톡/문자 구조화',
  '8. 문서/계좌/진단서 추출 텍스트',
  '9. 확인 필요 자료',
  '10. 원본 파일 목록',
  '11. 주의 문구'
] as const;

export async function generateReportPdf(input: { caseRecord: CaseRecord; cards: EvidenceCardRecord[]; files: EvidenceFileRecord[] }): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await loadKoreanFont(doc);
  let page = doc.addPage([595, 842]);
  const margin = 48;
  const maxTextWidth = page.getWidth() - margin * 2;
  let y = 790;
  const draw = (text: string, size = 11, color = rgb(0.1, 0.12, 0.14)) => {
    for (const line of wrapText(text, font, size, maxTextWidth)) {
      if (y < 70) {
        page = doc.addPage([595, 842]);
        y = 790;
      }
      page.drawText(line, { x: margin, y, size, font, color });
      y -= size + 8;
    }
  };

  draw('독립 세이프플랜 자료 정리 리포트', 20, rgb(0.16, 0.26, 0.22));
  draw(`생성일: ${new Date().toLocaleString('ko-KR')}`);
  draw(PDF_SECTION_HEADINGS[0]);
  draw(PDF_SECTION_HEADINGS[1], 15);
  draw(LEGAL_CAUTION_COPY);
  draw(PDF_SECTION_HEADINGS[2], 15);
  draw('사용자가 확인하고 리포트 포함을 선택한 자료만 정리했습니다. 모든 자동 정리 결과는 초안입니다.');
  draw(PDF_SECTION_HEADINGS[3], 15);
  draw(`자료 수: ${input.cards.length}개 / 원본 파일: ${input.files.length}개`);
  const tags = input.cards.flatMap((card) => (Array.isArray(card.tagsJson) ? card.tagsJson : []) as Array<{ tag?: string }>).map((tag) => tag.tag).filter(Boolean);
  draw(`주요 태그: ${tags.join(', ') || '검토 필요'}`);
  draw(`confidence 분포: ${[1, 2, 3, 4, 5].map((level) => `${level}:${input.cards.filter((card) => card.confidenceLevel === level).length}`).join(' / ')}`);
  draw(PDF_SECTION_HEADINGS[4], 15);
  for (const card of input.cards) {
    draw(`- ${card.dateCandidate || '날짜 미상'} | ${card.title} | 추출 신뢰도 ${card.confidenceLevel}단계`);
    draw(card.summaryKo);
    if (card.userMemo) draw(`사용자 메모: ${card.userMemo}`);
  }
  draw(PDF_SECTION_HEADINGS[5], 15);
  draw('음성 자료가 있는 경우 사용자가 확인한 전사 초안을 자료 카드 기준으로 검토하세요.');
  draw(PDF_SECTION_HEADINGS[6], 15);
  draw('카카오톡/문자 구조화는 자료 카드의 날짜, 인물, 요약 초안을 기준으로 하며 법적 판단을 포함하지 않습니다.');
  draw(PDF_SECTION_HEADINGS[7], 15);
  draw('문서, 계좌, 진단서 추출 텍스트는 자동 정리 초안입니다. 원본과 대조해 확인하세요.');
  draw(PDF_SECTION_HEADINGS[8], 15);
  for (const card of input.cards.filter((item) => item.confidenceLevel <= 3)) draw(`- ${card.title}: 사용자의 추가 확인 필요`);
  draw(PDF_SECTION_HEADINGS[9], 15);
  for (const file of input.files) draw(`- ${file.originalName} (${displayFileType(file.mimeType)}, ${formatBytes(file.sizeBytes)})`);
  draw(PDF_SECTION_HEADINGS[10], 15);
  draw(LEGAL_CAUTION_COPY);

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
