import { expect, test } from '@playwright/test';

test('normal play hides canonical geometry while debug mode exposes the active content package', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.snapshot().phase)).toBe('playing');
  expect(await page.evaluate(() => {
    const road = window.__VERDANT_RIFT_GAME__!.scene.getScene('battle').children.getByName('authoritative-road-corridor') as unknown as { visible: boolean };
    return road.visible;
  })).toBe(false);

  await page.goto('/?stage=rootbound-crossing&debugMap=1');
  await expect(page.locator('.stage-dossier h2')).toContainText('Break the Briar Host');
  await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.snapshot().phase)).toBe('playing');
  const geometry = await page.evaluate(() => {
    const scene = window.__VERDANT_RIFT_GAME__!.scene.getScene('battle');
    const road = scene.children.getByName('authoritative-road-corridor') as unknown as { visible: boolean; getData(key: string): unknown };
    const pads = Array.from({ length: 12 }, (_, index) => {
      const pad = scene.children.getByName(`build-pad-hit-${index}`) as unknown as { x: number; y: number };
      return { x: pad.x, y: pad.y };
    });
    return {
      stageId: window.__VERDANT_RIFT__!.run.stageId,
      visual: window.__VERDANT_RIFT__!.run.map.visual.kind,
      visible: road.visible,
      source: road.getData('source'),
      routeCount: road.getData('routeCount'),
      pads,
    };
  });
  expect(geometry).toMatchObject({ stageId: 'rootbound-crossing', visual: 'procedural', visible: true, source: 'CONTENT_PACKAGE', routeCount: 2 });
  expect(geometry.pads).toHaveLength(12);
  await page.screenshot({ path: 'test-results/map-authoring/debug-overlay.png' });
});

test('route-specific waves spawn on both authored routes at 2x without stalling', async ({ page }) => {
  await page.goto('/?stage=rootbound-crossing');
  await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.snapshot().phase)).toBe('playing');
  await page.evaluate(() => {
    window.__VERDANT_RIFT__!.toggleSpeed();
    window.__VERDANT_RIFT__!.startWave();
  });
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.snapshot().enemies.some((enemy) => enemy.routeId === 'north'))).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.snapshot().canCallWave), { timeout: 12_000 }).toBe(true);
  expect(await page.evaluate(() => window.__VERDANT_RIFT__!.startWave())).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.snapshot().enemies.some((enemy) => enemy.routeId === 'south'))).toBe(true);
  const timing = await page.evaluate(() => window.__VERDANT_RIFT__!.simulation.getTimingDiagnostics());
  expect(timing.totalFixedTicks).toBeGreaterThan(100);
  expect(timing.accumulator).toBeLessThan(0.05);
});
