import { expect, test } from '@playwright/test';

const staticPages = [
  '/',
  '/safety',
  '/simulator',
  '/evidence/start',
  '/pricing',
  '/help',
  '/legal/privacy',
  '/legal/terms',
  '/legal/ai-consent',
  '/legal/refund',
  '/status',
  '/account'
];

function stripIntentionalKorean(text: string) {
  return text.replaceAll('한국어', '').replaceAll('KO', '');
}

test('toggles static site chrome between Korean and English', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('safeplan_safety_seen', 'yes');
    window.localStorage.setItem('safeplan_risk_checked', 'yes');
  });

  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
  await expect(page.getByRole('heading', { name: '지금의 선택이 내일의 안전을 만듭니다' })).toBeVisible();

  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: 'Today’s choices can protect tomorrow’s safety' })).toBeVisible();
  await expect(page).toHaveTitle('SafePlan Independence');

  for (const path of staticPages) {
    await page.goto(path);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect.poll(async () => stripIntentionalKorean(await page.locator('body').innerText()), { message: `English page should not expose Korean UI copy at ${path}` }).not.toMatch(/[가-힣]/);
  }

  await page.goto('/');
  await page.getByRole('button', { name: '한국어' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
  await expect(page.getByRole('heading', { name: '지금의 선택이 내일의 안전을 만듭니다' })).toBeVisible();
});
