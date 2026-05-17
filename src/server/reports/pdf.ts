import 'server-only';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { LEGAL_CAUTION_COPY } from '@/lib/constants';
import type { CaseRecord, EvidenceCardRecord, EvidenceFileRecord } from '@/server/db/types';

async function loadKoreanFont(doc: PDFDocument) {
  const require = createRequire(import.meta.url);
  const fontkit = require('@pdf-lib/fontkit');
  doc.registerFontkit((fontkit.default ?? fontkit) as Parameters<typeof doc.registerFontkit>[0]);
  const candidates = [
    path.join(process.cwd(), 'node_modules/@fontsource/noto-sans-kr/files/noto-sans-kr-korean-400-normal.woff2'),
    path.join(process.cwd(), 'node_modules/@fontsource/noto-sans-kr/files/noto-sans-kr-korean-400-normal.woff'),
    path.join(process.cwd(), 'node_modules/@fontsource/noto-sans-kr/files/noto-sans-kr-kr-400-normal.woff2')
  ];
  for (const candidate of candidates) {
    try {
      return await doc.embedFont(new Uint8Array(await readFile(candidate)));
    } catch (error) {
      if (process.env.SAFEPLAN_DEBUG_PDF_FONT === '1') console.error('pdf_font_load_failed', candidate, error);
    }
  }
  return doc.embedStandardFont(StandardFonts.Helvetica);
}

function wrapText(text: string, width = 58): string[] {
  const normalized = text.replace(/\r/g, '').split('\n');
  const lines: string[] = [];
  for (const paragraph of normalized) {
    let line = '';
    for (const char of paragraph) {
      if (line.length >= width) {
        lines.push(line);
        line = '';
      }
      line += char;
    }
    lines.push(line || ' ');
  }
  return lines;
}

export async function generateReportPdf(input: { caseRecord: CaseRecord; cards: EvidenceCardRecord[]; files: EvidenceFileRecord[] }): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await loadKoreanFont(doc);
  let page = doc.addPage([595, 842]);
  const margin = 48;
  let y = 790;
  const draw = (text: string, size = 11, color = rgb(0.1, 0.12, 0.14)) => {
    for (const line of wrapText(text, size >= 16 ? 36 : 66)) {
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
  draw('1. 표지');
  draw('2. 법률 자문 아님 고지');
  draw(LEGAL_CAUTION_COPY);
  draw('3. 요약', 15);
  draw(`자료 수: ${input.cards.length}개 / 원본 파일: ${input.files.length}개`);
  const tags = input.cards.flatMap((card) => (Array.isArray(card.tagsJson) ? card.tagsJson : []) as Array<{ tag?: string }>).map((tag) => tag.tag).filter(Boolean);
  draw(`주요 태그: ${tags.join(', ') || '검토 필요'}`);
  draw(`Confidence 분포: ${[1, 2, 3, 4, 5].map((level) => `${level}:${input.cards.filter((card) => card.confidenceLevel === level).length}`).join(' / ')}`);
  draw('4. 자료 타임라인', 15);
  for (const card of input.cards) {
    draw(`- ${card.dateCandidate || '날짜 미상'} | ${card.title} | confidence ${card.confidenceLevel}`);
    draw(card.summaryKo);
    if (card.userMemo) draw(`사용자 메모: ${card.userMemo}`);
  }
  draw('5. 음성 전사 / 6. 카카오톡·문자 구조화 / 7. 문서·계좌·진단서 추출 텍스트', 15);
  draw('이 섹션은 사용자가 확인한 자료 카드의 초안 텍스트를 기준으로 구성됩니다. 원본 자료 취득 경위와 제출 가능성은 별도 법률 검토가 필요합니다.');
  draw('8. 확인 필요 자료', 15);
  for (const card of input.cards.filter((item) => item.confidenceLevel <= 3)) draw(`- ${card.title}: 사용자의 추가 확인 필요`);
  draw('9. 원본 파일 목록', 15);
  for (const file of input.files) draw(`- ${file.originalName} (${file.mimeType}, ${file.sizeBytes} bytes)`);
  draw('10. 주의 문구', 15);
  draw(LEGAL_CAUTION_COPY);

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
