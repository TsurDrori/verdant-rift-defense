import { expect, test, type Page } from '@playwright/test';

async function enterBattle(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.snapshot().phase)).toBe('playing');
}

test('heroes begin as tiny bottom chips and expand one at a time', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await enterBattle(page);
  const dock = page.locator('[data-hero-dock]');
  const dockBox = await dock.boundingBox();
  expect(dockBox).not.toBeNull();
  expect(900 - (dockBox!.y + dockBox!.height)).toBeLessThanOrEqual(24);

  for (const heroId of ['kael', 'lyra']) {
    const card = page.locator(`[data-hero-card="${heroId}"]`);
    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(72);
    expect(box!.height).toBeLessThanOrEqual(72);
    await expect(card.locator('[data-hero-details]')).toBeHidden();
    const hp = await card.locator('[data-hero-health]').boundingBox();
    expect(hp).not.toBeNull();
    expect(hp!.width).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({ path: 'test-results/hero-dock/collapsed-desktop.png' });

  const kael = page.locator('[data-hero-card="kael"]');
  await kael.getByRole('button', { name: /Select and expand Kael/ }).click();
  await expect(kael).toHaveClass(/is-expanded/);
  await expect(kael.locator('[data-hero-details]')).toBeVisible();
  await expect(kael.locator('[data-spell="rift-quake"]')).toBeVisible();
  expect((await kael.boundingBox())!.width).toBeGreaterThanOrEqual(270);
  await expect(page.locator('[data-hero-card="lyra"]')).not.toHaveClass(/is-expanded/);
  await page.screenshot({ path: 'test-results/hero-dock/expanded-desktop.png' });

  await kael.getByRole('button', { name: /Collapse Kael/ }).click();
  await expect(kael).not.toHaveClass(/is-expanded/);
  await expect(kael.locator('[data-hero-details]')).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.selection)).toEqual({ kind: 'hero', heroId: 'kael' });
});

test('collapsed HP remains colored and tracks injury without duplicate meters', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enterBattle(page);
  await page.evaluate(() => {
    const controller = window.__VERDANT_RIFT__!;
    // Freeze passive regeneration so this assertion compares one authoritative
    // snapshot with its rendered health bar instead of measuring runner speed.
    controller.togglePause();
    const hero = (controller.simulation as unknown as { heroes: Array<{ id: string; hp: number; maxHp: number }> }).heroes.find((candidate) => candidate.id === 'kael')!;
    hero.hp = hero.maxHp * 0.42;
    controller.update(0);
  });
  const card = page.locator('[data-hero-card="kael"]');
  await expect(card).toHaveAttribute('data-health-band', 'wounded');
  await expect(card.locator('[data-hero-health]')).toBeVisible();
  const state = await card.evaluate((heroCard) => {
    const bar = heroCard.querySelector<HTMLElement>('[data-hero-health]')!;
    const hero = window.__VERDANT_RIFT__!.snapshot().heroes.find((candidate) => candidate.id === 'kael')!;
    return {
      ratio: getComputedStyle(bar).getPropertyValue('--health').trim(),
      authoritativeRatio: hero.hp / hero.maxHp,
      fill: getComputedStyle(bar, '::after').backgroundImage,
    };
  });
  expect(Math.abs(Number(state.ratio) - state.authoritativeRatio)).toBeLessThan(0.01);
  expect(state.fill).toMatch(/rgb\((220|221|222|223|224|225)/);
  await page.screenshot({ path: 'test-results/hero-dock/injured-collapsed-portrait.png' });
});

test('all four active spells use distinct semantic vector icons', async ({ page }) => {
  await enterBattle(page);
  await page.evaluate(() => {
    const controller = window.__VERDANT_RIFT__!;
    const heroes = (controller.simulation as unknown as { heroes: Array<{ id: string; level: number; unlockedSpells: string[] }> }).heroes;
    heroes.find((hero) => hero.id === 'kael')!.level = 4;
    heroes.find((hero) => hero.id === 'kael')!.unlockedSpells = ['rift-quake', 'riftbrand', 'warden-pulse'];
    heroes.find((hero) => hero.id === 'lyra')!.level = 4;
    heroes.find((hero) => hero.id === 'lyra')!.unlockedSpells = ['starfall', 'astral-echo', 'falling-constellation'];
    controller.update(0);
  });
  const icons = new Set<string>();
  for (const hero of ['Kael', 'Lyra'] as const) {
    await page.getByRole('button', { name: new RegExp(`Select and expand ${hero}`) }).click();
    const card = page.locator(`[data-hero-card="${hero.toLowerCase()}"]`);
    for (const icon of await card.locator('svg[data-icon]').all()) icons.add((await icon.getAttribute('data-icon'))!);
    await page.screenshot({ path: `test-results/hero-dock/${hero.toLowerCase()}-spell-icons.png` });
  }
  expect([...icons].sort()).toEqual(['falling-constellation', 'rift-quake', 'starfall', 'warden-pulse']);
});
