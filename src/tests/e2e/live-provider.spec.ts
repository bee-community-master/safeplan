import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

test.skip(!process.env.LIVE_E2E, 'Set LIVE_E2E=1 to run paid live provider E2E.');

async function makePdfBuffer(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText('SAFEPLAN LIVE OCR TEST', { x: 72, y: 740, size: 24, font, color: rgb(0.1, 0.1, 0.1) });
  page.drawText('Date: 2026-05-17. Partner support stopped. Evidence organization draft.', {
    x: 72,
    y: 700,
    size: 12,
    font,
    color: rgb(0.1, 0.1, 0.1)
  });
  return Buffer.from(await doc.save());
}

function makeSilentWavBuffer(seconds = 1): Buffer {
  const sampleRate = 16_000;
  const samples = Math.floor(sampleRate * seconds);
  const dataSize = samples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

test('paid live provider e2e hits Mistral OCR and Groq STT without falling back for extraction', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '안전합니다' }).click();
  await page.getByRole('link', { name: '자료 정리' }).click();
  await page.getByRole('button', { name: '안전 확인 후 업로드 시작' }).click();
  await expect(page.getByText('자료 업로드 · 동의 · 결제')).toBeVisible();

  await page.getByTestId('file-input').setInputFiles([
    { name: 'live-ocr.pdf', mimeType: 'application/pdf', buffer: await makePdfBuffer() },
    { name: 'live-audio.wav', mimeType: 'audio/wav', buffer: makeSilentWavBuffer() }
  ]);
  await page.getByRole('button', { name: '암호화 업로드 완료' }).click();
  await expect(page.getByRole('status')).toContainText('업로드가 완료');

  for (const label of [
    '민감정보 처리에 동의합니다.',
    '원본 자료 처리에 동의합니다.',
    '외부 AI/OCR/STT provider 처리에 동의합니다.',
    '가능한 해외/제3자 처리에 동의합니다.',
    '9,900원 결제에 동의합니다.'
  ]) {
    await page.getByLabel(label).check();
  }
  await page.getByRole('button', { name: '동의 기록' }).click();
  await expect(page.getByRole('status')).toContainText('동의가 기록');
  await page.getByRole('button', { name: '9,900원 mock 결제' }).click();
  await expect(page.getByRole('status')).toContainText('mock 결제가 완료');
  await page.getByRole('button', { name: 'OCR/STT/AI 초안 처리' }).click();
  await expect(page.getByText('AI 초안 카드 검수')).toBeVisible({ timeout: 60_000 });
  const cards = page.getByTestId('evidence-card');
  await expect(cards.first()).toBeVisible();
  const cardCount = await cards.count();
  expect(cardCount).toBeGreaterThanOrEqual(2);
  for (let index = 0; index < cardCount; index += 1) {
    const card = cards.nth(index);
    await card.getByLabel('사용자가 확인했습니다').check();
    await card.getByLabel('PDF에 포함').check();
    await card.getByRole('button', { name: '카드 저장' }).click();
  }
  await page.getByRole('button', { name: '리포트 생성으로 이동' }).click();
  await page.getByRole('button', { name: 'PDF 리포트 생성' }).click();
  await expect(page.getByRole('status')).toContainText('PDF 리포트가 생성');
  await page.getByRole('button', { name: '보안 URL 생성' }).click();
  await expect(page.getByRole('status')).toContainText('보안 URL');
  const reportPageUrl = page.url();
  const shareUrl = await page.getByRole('link', { name: /\/share\// }).textContent();
  expect(shareUrl).toContain('/share/');
  await page.goto(shareUrl!);
  await expect(page.getByTestId('share-report')).toContainText('자료 타임라인');

  const dbPath = path.join(process.env.SAFEPLAN_DATA_DIR || '.safeplan-data/live-e2e', 'db.json');
  const db = JSON.parse(await readFile(dbPath, 'utf8')) as {
    extractionResults: Array<{ provider: string; kind: string; normalizedText: string | null }>;
    processingJobs: Array<{ status: string; lastError: string | null }>;
  };
  const providers = new Set(db.extractionResults.map((result) => `${result.kind}:${result.provider}`));
  expect(providers).toContain('ocr:mistral');
  expect(providers).toContain('stt:groq');

  if (process.env.BASETEN_CLASSIFIER_URL) {
    expect(providers).toContain('classification:baseten');
  } else {
    test.info().annotations.push({
      type: 'blocker',
      description: 'BASETEN_CLASSIFIER_URL is empty, so Baseten classifier live call is blocked and classification falls back to mock.'
    });
  }

  await page.goto(reportPageUrl);
  await page.getByRole('button', { name: '케이스 삭제' }).click();
  await expect(page.getByRole('status')).toContainText('삭제 또는 비활성화');
});
