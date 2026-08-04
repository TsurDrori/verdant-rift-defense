import { expect, test } from '@playwright/test';

const menuRoutes = [
  { button: /Campaign/, heading: 'Choose the next stand' },
  { button: /Heroes/, heading: 'Champion hall' },
  { button: /Insight/, heading: 'The Insight Grove' },
  { button: /Field guide/, heading: 'Learn the defense' },
  { button: /Settings/, heading: 'Settings' },
] as const;

test('front end exposes campaign, hero, progression, guide, and settings surfaces', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  for (const route of menuRoutes) {
    await page.getByRole('button', { name: route.button }).click();
    await expect(page.getByRole('heading', { name: route.heading })).toBeVisible();
  }

  await page.getByRole('button', { name: /Heroes/ }).click();
  await page.locator('[data-menu-hero="lyra"]').click();
  await expect(page.getByRole('heading', { name: 'Lyra' })).toBeVisible();
  await expect(page.locator('.hero-ability').getByText('Starfall', { exact: true })).toBeVisible();
  await expect(page.locator('.hero-mastery').getByText('Falling Constellation', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /Campaign/ }).click();
  await page.getByRole('button', { name: /Stage 2: Rootbound Crossing/ }).click();
  await expect(page.getByText('ROUTE SEALED')).toBeVisible();
  await expect(page.getByRole('button', { name: /ENTER THE RIFT/ })).toBeHidden();
  await page.getByRole('button', { name: /Stage 1: The Sunken Way/ }).click();
  await expect(page.getByRole('button', { name: /ENTER THE RIFT/ })).toBeVisible();
});

test('mobile menu keeps its navigation dock visible while campaign content scrolls independently', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main menu' });
  await expect(nav).toBeVisible();
  const before = await nav.boundingBox();
  expect(before!.y + before!.height).toBeLessThanOrEqual(844);
  expect(before?.height).toBeGreaterThanOrEqual(60);

  await page.getByRole('button', { name: /ENTER THE RIFT/ }).scrollIntoViewIfNeeded();
  const after = await nav.boundingBox();
  expect(after?.y).toBeCloseTo(before!.y, 0);
  await page.getByRole('button', { name: /Field guide/ }).click();
  await expect(page.getByRole('heading', { name: 'Learn the defense' })).toBeVisible();
  await expect(page.getByText('Ground defenders cannot block or strike flying enemies.')).toBeVisible();
});

test('shallow landscape keeps the campaign launch decision in the initial viewport', async ({ page }) => {
  await page.setViewportSize({ width: 740, height: 360 });
  await page.goto('/');
  const launch = page.getByRole('button', { name: /ENTER THE RIFT/ });
  await expect(launch).toBeVisible();
  const bounds = await launch.boundingBox();
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(360);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(740);
});

test('legacy progression migrates and Insight selections persist through reload', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('verdant-rift:first-clear', 'true');
    localStorage.setItem('verdant-rift:insight', '3');
    localStorage.setItem('verdant-rift:insight-loadout', JSON.stringify(['gate']));
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Insight/ }).click();
  await expect(page.getByRole('button', { name: /Living Gate/ })).toContainText('EQUIPPED');
  await page.getByRole('button', { name: /Twin Oath/ }).click();
  await page.reload();
  await page.getByRole('button', { name: /Insight/ }).click();
  await expect(page.getByRole('button', { name: /Twin Oath/ })).toContainText('EQUIPPED');
});
