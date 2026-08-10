import { expect, test } from '@playwright/test';

test('normal play hides map guides while debug mode exposes synchronized Tiled geometry', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.snapshot().phase)).toBe('playing');
  expect(await page.evaluate(() => {
    const road = window.__VERDANT_RIFT_GAME__!.scene.getScene('battle').children.getByName('authoritative-road-corridor') as unknown as { visible: boolean };
    return road.visible;
  })).toBe(false);

  await page.goto('/?debugMap=1');
  await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.snapshot().phase)).toBe('playing');
  const geometry = await page.evaluate(() => {
    const scene = window.__VERDANT_RIFT_GAME__!.scene.getScene('battle');
    const road = scene.children.getByName('authoritative-road-corridor') as unknown as { visible: boolean; getData(key: string): unknown };
    const pads = Array.from({ length: 11 }, (_, index) => {
      const pad = scene.children.getByName(`build-pad-hit-${index}`) as unknown as { x: number; y: number };
      return { x: pad.x, y: pad.y };
    });
    return { visible: road.visible, source: road.getData('source'), halfWidth: road.getData('halfWidth'), pads };
  });
  expect(geometry).toMatchObject({ visible: true, source: 'TILED_MAP', halfWidth: 36 });
  expect(geometry.pads).toHaveLength(11);
  await page.screenshot({ path: 'test-results/map-authoring/debug-overlay.png' });
});
