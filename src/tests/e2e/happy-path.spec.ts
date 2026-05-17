import { expect, test } from '@playwright/test';

test('safeplan local mock happy path', async ({ page, context }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '안전합니다' }).click();
  await page.getByRole('link', { name: '생존 시뮬레이터 시작' }).click();
  await page.getByRole('link', { name: '위험 체크 완료 또는 건너뛰고 계속' }).click();
  await expect(page.getByTestId('runway-stopped')).toContainText('0.5개월');
  await page.getByRole('link', { name: '자료 정리 흐름으로 이동' }).click();
  await page.getByRole('button', { name: '안전 확인 후 업로드 시작' }).click();
  await page.getByRole('button', { name: '안전합니다' }).click();
  await expect(page.getByText('자료 업로드 · 동의 · 결제')).toBeVisible();

  await page.getByTestId('file-input').setInputFiles([
    { name: 'sample.txt', mimeType: 'text/plain', buffer: Buffer.from('2026-05-01 생활비를 끊겠다는 문자와 상담 전 자료 메모입니다.') },
    { name: 'capture.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=', 'base64') },
    { name: 'voice.webm', mimeType: 'audio/webm', buffer: Buffer.from('mock audio content') }
  ]);
  await page.getByRole('button', { name: '암호화 업로드 완료' }).click();
  await expect(page.getByRole('status')).toContainText('업로드가 완료');

  for (const label of ['민감정보 처리에 동의합니다.', '원본 자료 처리에 동의합니다.', '자료 정리를 위한 외부 분석 서비스 처리에 동의합니다.', '가능한 해외/제3자 처리에 동의합니다.', '9,900원 결제에 동의합니다.']) {
    await page.getByLabel(label).check();
  }
  await page.getByRole('button', { name: '동의 기록' }).click();
  await expect(page.getByRole('status')).toContainText('동의가 안전하게 저장');
  await page.getByRole('button', { name: '9,900원 결제' }).click();
  await expect(page.getByRole('status')).toContainText('결제가 완료');
  await page.getByRole('button', { name: '자료 정리 시작' }).click();
  await expect(page.getByRole('heading', { name: '자료 카드 검토' })).toBeVisible();

  const cards = page.getByTestId('evidence-card');
  await expect(cards.first()).toBeVisible();
  await expect(cards.first()).toContainText('원본 파일');
  await expect(cards.first()).toContainText('자동 태그 초안');
  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(3);
  for (let index = 0; index < count; index += 1) {
    const card = cards.nth(index);
    const revealVeryLow = card.getByRole('button', { name: '이 자료 열어 검토' });
    if (await revealVeryLow.count()) await revealVeryLow.click();
    const confirm = card.getByLabel('사용자가 확인했습니다');
    if (!(await confirm.isVisible().catch(() => false))) {
      const summary = card.getByText('중간 신뢰도 자료 펼쳐 검토');
      if (await summary.count()) await summary.click();
    }
    await card.getByLabel('사용자가 확인했습니다').check();
    await card.getByLabel('리포트에 포함').check();
    await card.getByRole('button', { name: '카드 저장' }).click();
  }
  await page.getByRole('button', { name: '리포트 생성으로 이동' }).click();
  await expect(page).toHaveURL(/\/report$/);
  await page.getByRole('button', { name: '리포트 생성', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('리포트가 생성');
  await page.getByLabel('공유 링크 비밀번호').fill('safe-pass-123');
  await page.getByRole('button', { name: '보안 링크 생성' }).click();
  await expect(page.getByRole('status')).toContainText('보안 링크');
  const shareUrl = await page.getByRole('link', { name: /\/share\// }).textContent();
  expect(shareUrl).toContain('/share/');

  const sharePage = await context.newPage();
  await sharePage.goto(shareUrl!);
  await expect(sharePage.getByText('비밀번호 확인')).toBeVisible();
  await sharePage.getByLabel('공유 링크 비밀번호').fill('safe-pass-123');
  await sharePage.getByRole('button', { name: '리포트 열기' }).click();
  await expect(sharePage.getByTestId('share-report')).toContainText('자료 타임라인');
  await sharePage.close();

  await page.goto('/account');
  await expect(page.getByRole('heading', { name: '내 자료 묶음' })).toBeVisible();
  await page.getByLabel(/이 자료 묶음의 원본/).check();
  await page.getByRole('button', { name: '전체 삭제' }).click();
  await expect(page.getByRole('status')).toContainText('삭제');

  const deletedSharePage = await context.newPage();
  await deletedSharePage.goto(shareUrl!);
  await expect(deletedSharePage.getByText('만료되었거나 폐기된 링크입니다')).toBeVisible();
  await deletedSharePage.close();
});
