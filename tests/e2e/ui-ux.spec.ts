import { expect, test, type Page } from '@playwright/test';

const viewports = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 740, height: 360 },
  { width: 430, height: 932 },
  { width: 390, height: 844 },
] as const;

async function expectReadableType(page: Page, selector: string, minimum: number): Promise<void> {
  const locator = page.locator(selector).first();
  // Structural UI renders can attach text one frame before layout. Playwright's
  // visibility assertion waits for a non-zero box, then the measurements below
  // still enforce the real typography/clipping contract.
  await expect(locator).toBeVisible();
  const result = await locator.evaluate((element, min) => {
    const style = getComputedStyle(element);
    const bounds = element.getBoundingClientRect();
    return {
      size: Number.parseFloat(style.fontSize),
      visible: bounds.width > 0 && bounds.height > 0 && style.visibility !== 'hidden',
      clipped: element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1,
      minimum: min,
    };
  }, minimum);
  expect(result.visible).toBe(true);
  expect(result.size).toBeGreaterThanOrEqual(result.minimum);
  expect(result.clipped).toBe(false);
}

for (const viewport of viewports) {
  test(`decision text is readable and unclipped at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Hold the Verdant Rift' })).toBeVisible();

    await expectReadableType(page, '.kicker', 11);
    await expectReadableType(page, '.lead', 13);
    await expectReadableType(page, '.briefing-grid b', viewport.height <= 620 ? 13 : 15);
    await expectReadableType(page, '.briefing-grid small', 11);
    await expectReadableType(page, '.difficulty-picker b', 14);
    await expectReadableType(page, '.difficulty-picker small', 11);
    await expectReadableType(page, '.primary-button', 14);
    await expect(page.getByText('UNLOCKS AFTER YOUR FIRST CLEAR')).toBeVisible();

    await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();
    await page.getByRole('button', { name: /CALL WAVE/ }).waitFor();
    await page.keyboard.press('KeyE');
    await expect(page.getByRole('heading', { name: 'Choose a covenant' })).toBeVisible();

    await expectReadableType(page, '.selection-panel header small', 11);
    await expectReadableType(page, '.selection-panel h3', 23);
    await expectReadableType(page, '.tower-option b', 14);
    await expectReadableType(page, '.tower-option small', 11);
    await expectReadableType(page, '.tower-option em', 12);

    const panel = await page.locator('.selection-panel').boundingBox();
    expect(panel).not.toBeNull();
    expect(panel!.x).toBeGreaterThanOrEqual(-1);
    expect(panel!.y).toBeGreaterThanOrEqual(-1);
    expect(panel!.x + panel!.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(panel!.y + panel!.height).toBeLessThanOrEqual(viewport.height + 1);
    expect(await page.evaluate(() => ({ x: document.documentElement.scrollWidth - innerWidth, y: document.documentElement.scrollHeight - innerHeight }))).toEqual({ x: 0, y: 0 });

    for (const option of await page.locator('.tower-option').all()) {
      const box = await option.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(88);
    }

    await page.getByRole('button', { name: /Thornwatch/ }).click();
    await expect(page.getByRole('heading', { name: 'Thornwatch' })).toBeVisible();
    await expectReadableType(page, '.tower-description', 13);
    await expectReadableType(page, '.tower-stats i', 10);
    await expectReadableType(page, '.wide-upgrade b', 13);
    await expectReadableType(page, '.wide-upgrade small', 11);
    await expectReadableType(page, '.priority-button', 12);
    await expectReadableType(page, '.sell-button', 11);

    for (const selector of ['.close-button', '.wide-upgrade', '.priority-button', '.sell-button']) {
      const box = await page.locator(selector).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });
}
