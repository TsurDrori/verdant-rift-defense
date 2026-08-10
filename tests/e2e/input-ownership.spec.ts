import { expect, test, type Page } from '@playwright/test';

async function enterBattle(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.snapshot().phase)).toBe('playing');
}

async function expandHero(page: Page, hero: 'Kael' | 'Lyra'): Promise<void> {
  const card = page.locator(`[data-hero-card="${hero.toLowerCase()}"]`);
  if (!(await card.evaluate((node) => node.classList.contains('is-expanded')))) {
    await card.getByRole('button', { name: new RegExp(`Select and expand ${hero}`) }).click();
  }
}

async function clickWorld(page: Page, x: number, y: number): Promise<void> {
  const bounds = await page.locator('canvas').boundingBox();
  if (!bounds) throw new Error('Battlefield canvas did not receive a layout box.');
  await page.mouse.click(bounds.x + bounds.width * (x / 1600), bounds.y + bounds.height * (y / 900));
}

test('hero card body is one reliable selection target', async ({ page }) => {
  await enterBattle(page);
  const card = await page.locator('[data-hero-card="lyra"]').boundingBox();
  if (!card) throw new Error('Lyra card did not receive a layout box.');
  await page.mouse.click(card.x + card.width * 0.58, card.y + card.height * 0.5);
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.selection)).toEqual({ kind: 'hero', heroId: 'lyra' });
});

test('spell control survives a deliberate pointer hold while cooldown state renders', async ({ page }) => {
  await enterBattle(page);
  await expandHero(page, 'Kael');
  await page.evaluate(() => {
    const controller = window.__VERDANT_RIFT__!;
    const lyra = (controller.simulation as unknown as { heroes: Array<{ id: string; spellCooldowns: Record<string, number> }> }).heroes.find((hero) => hero.id === 'lyra')!;
    lyra.spellCooldowns.starfall = 12;
    controller.update(0);
  });
  const spell = page.locator('[data-spell="rift-quake"]');
  await expect(spell).toHaveAttribute('aria-label', /Cast Rift Quake.*Kael/);
  const bounds = await spell.boundingBox();
  if (!bounds) throw new Error('Rift Quake did not receive a layout box.');

  await page.evaluate(() => {
    (window as typeof window & { __SPELL_NODE__?: Element }).__SPELL_NODE__ = document.querySelector('[data-spell="rift-quake"]') ?? undefined;
  });
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(140);
  expect(await page.evaluate(() => (
    (window as typeof window & { __SPELL_NODE__?: Element }).__SPELL_NODE__ === document.querySelector('[data-spell="rift-quake"]')
  ))).toBe(true);
  await page.mouse.up();

  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.armedSpell)).toEqual({
    heroId: 'kael', spellId: 'rift-quake', targeting: 'point',
  });
});

test('armed spell button becomes the cancel button in place', async ({ page }) => {
  await enterBattle(page);
  await expandHero(page, 'Kael');
  const spell = page.locator('[data-spell="rift-quake"]');
  await expect(spell).toHaveAttribute('aria-label', /Cast Rift Quake.*Kael/);
  await spell.click();
  await expect(spell).toHaveAttribute('aria-label', /Cancel Rift Quake targeting/);
  await expect(spell).toContainText('CANCEL');
  await spell.click();
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.armedSpell)).toBeUndefined();
  await expect(spell).toHaveAttribute('aria-label', /Cast Rift Quake.*Kael/);
});

test('invisible tower tolerance never steals a selected hero road command', async ({ page }) => {
  await enterBattle(page);
  await page.evaluate(() => {
    const controller = window.__VERDANT_RIFT__!;
    controller.simulation.buildTower(7, 'thorn');
    controller.update(0);
  });
  const card = await page.locator('[data-hero-card="kael"]').boundingBox();
  if (!card) throw new Error('Kael card did not receive a layout box.');
  await page.mouse.click(card.x + card.width * 0.58, card.y + card.height * 0.5);
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.selection)).toEqual({ kind: 'hero', heroId: 'kael' });

  // This is on the authoritative road and inside pad 8's oversized tolerance,
  // but outside the deliberately painted foundation center.
  await clickWorld(page, 1168, 700);
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.selection)).toEqual({ kind: 'hero', heroId: 'kael' });
  const road = await page.evaluate(() => {
    const object = window.__VERDANT_RIFT_GAME__!.scene.getScene('battle').children.getByName('authoritative-road-corridor') as unknown as { getData(key: string): unknown };
    return { halfWidth: object.getData('halfWidth'), source: object.getData('source') };
  });
  expect(road).toEqual({ halfWidth: 36, source: 'PATH_POINTS' });
  await page.screenshot({ path: 'test-results/input-ownership/road-and-command-rail.png' });
});

for (const viewport of [{ width: 390, height: 844 }, { width: 740, height: 360 }]) {
  test(`expanded hero spell controls remain touch-sized and clear at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await enterBattle(page);
    await page.evaluate(() => {
      const controller = window.__VERDANT_RIFT__!;
      const heroes = (controller.simulation as unknown as { heroes: Array<{ id: string; level: number; unlockedSpells: string[] }> }).heroes;
      const kael = heroes.find((hero) => hero.id === 'kael')!;
      const lyra = heroes.find((hero) => hero.id === 'lyra')!;
      kael.level = 4; kael.unlockedSpells = ['rift-quake', 'riftbrand', 'warden-pulse'];
      lyra.level = 4; lyra.unlockedSpells = ['starfall', 'astral-echo', 'falling-constellation'];
      controller.update(0);
    });
    for (const hero of ['Kael', 'Lyra'] as const) {
      await expandHero(page, hero);
      const card = page.locator(`[data-hero-card="${hero.toLowerCase()}"]`);
      const buttons = card.locator('[data-spell]');
      await expect(buttons).toHaveCount(2);
      const cardBox = await card.boundingBox();
      if (!cardBox) throw new Error(`${hero} expanded card did not receive a layout box.`);
      for (const button of await buttons.all()) {
        const box = await button.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
      const wave = await page.locator('[data-wave-card]').boundingBox();
      if (wave) {
        const overlap = Math.max(0, Math.min(cardBox.x + cardBox.width, wave.x + wave.width) - Math.max(cardBox.x, wave.x))
          * Math.max(0, Math.min(cardBox.y + cardBox.height, wave.y + wave.height) - Math.max(cardBox.y, wave.y));
        expect(overlap).toBe(0);
      }
    }
  });
}
