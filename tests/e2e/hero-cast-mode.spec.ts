import { expect, test, type Page } from '@playwright/test';

const FIRST_PAD = { x: 394, y: 154 } as const;

async function enterBattle(page: Page): Promise<void> {
  await page.goto('/');
  const enter = page.getByRole('button', { name: /ENTER THE RIFT/ });
  await expect(enter).toBeEnabled();
  await enter.click();
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.snapshot().phase)).toBe('playing');
  await expect(page.locator('canvas')).toBeVisible();
}

async function clickWorld(page: Page, x: number, y: number, button: 'left' | 'right' = 'left'): Promise<void> {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('Battlefield canvas did not receive a layout box.');
  await page.mouse.click(box.x + box.width * (x / 1600), box.y + box.height * (y / 900), { button });
}

test('armed hero spell owns the world pointer instead of selecting an underlying foundation', async ({ page }) => {
  await enterBattle(page);
  await page.getByRole('button', { name: /Cast Rift Quake.*Kael/ }).click();

  await expect(page.locator('[data-spell="rift-quake"]')).toHaveClass(/is-armed/);
  await expect(page.locator('[data-cast-command]')).toBeVisible();
  await expect(page.locator('html')).toHaveClass(/spell-cast-mode/);
  const canvas = await page.locator('canvas').boundingBox();
  if (!canvas) throw new Error('Battlefield canvas did not receive a layout box.');
  await page.mouse.move(canvas.x + canvas.width * (FIRST_PAD.x / 1600), canvas.y + canvas.height * (FIRST_PAD.y / 900));
  await expect(page.locator('[data-cast-reticle]')).toHaveClass(/is-invalid/);
  await page.screenshot({ path: 'test-results/cast-mode/armed-invalid-desktop.png' });
  await clickWorld(page, FIRST_PAD.x, FIRST_PAD.y);

  await expect.poll(() => page.evaluate(() => ({
    armedAbility: window.__VERDANT_RIFT__!.armedAbility,
    selection: window.__VERDANT_RIFT__!.selection,
  }))).toEqual({ armedAbility: 'kael', selection: { kind: 'hero', heroId: 'kael' } });
  await expect(page.getByRole('heading', { name: 'Choose a covenant' })).toHaveCount(0);
});

test('a valid cast passes through an interactive hero without selecting or moving it', async ({ page }) => {
  await enterBattle(page);
  const before = await page.evaluate(() => {
    const hero = window.__VERDANT_RIFT__!.snapshot().heroes.find((candidate) => candidate.id === 'kael')!;
    return { x: hero.x, y: hero.y, target: hero.target };
  });
  await page.getByRole('button', { name: /Cast Rift Quake.*Kael/ }).click();

  const canvas = await page.locator('canvas').boundingBox();
  if (!canvas) throw new Error('Battlefield canvas did not receive a layout box.');
  await page.mouse.move(canvas.x + canvas.width * (before.x / 1600), canvas.y + canvas.height * (before.y / 900));
  await expect(page.locator('[data-cast-reticle]')).toHaveClass(/is-valid/);
  await clickWorld(page, before.x, before.y);

  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.armedSpell)).toBeUndefined();
  const after = await page.evaluate(() => {
    const controller = window.__VERDANT_RIFT__!;
    const hero = controller.snapshot().heroes.find((candidate) => candidate.id === 'kael')!;
    return { selection: controller.selection, x: hero.x, y: hero.y, target: hero.target, cooldown: hero.spellCooldowns['rift-quake'] };
  });
  expect(after.selection).toEqual({ kind: 'hero', heroId: 'kael' });
  expect(after.target).toEqual(before.target);
  expect(after.x).toBe(before.x);
  expect(after.y).toBe(before.y);
  expect(after.cooldown).toBeGreaterThan(0);
  await expect(page.locator('[data-cast-command]')).toBeHidden();
});

test('Escape and secondary click cancel targeting and restore normal world selection', async ({ page }) => {
  await enterBattle(page);
  const cast = page.locator('[data-spell="rift-quake"]');

  await cast.click();
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.armedSpell)).toBeUndefined();

  await cast.click();
  await clickWorld(page, FIRST_PAD.x, FIRST_PAD.y, 'right');
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.armedSpell)).toBeUndefined();

  await clickWorld(page, FIRST_PAD.x, FIRST_PAD.y);
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.selection)).toEqual({ kind: 'pad', padIndex: 0 });
});

test('cast controls stay explicit and touch-sized on a portrait viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enterBattle(page);
  const castButtons = page.locator('[data-action="spell"]');
  await expect(castButtons).toHaveCount(2);
  for (const button of await castButtons.all()) {
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }

  const kaelCast = page.locator('[data-spell="rift-quake"]');
  await kaelCast.click();
  await expect(kaelCast).toHaveAttribute('aria-pressed', 'true');
  const cancel = page.getByRole('button', { name: 'Cancel spell targeting' });
  await expect(cancel).toBeVisible();
  await page.screenshot({ path: 'test-results/cast-mode/armed-portrait.png' });
  const cancelBox = await cancel.boundingBox();
  expect(cancelBox!.width).toBeGreaterThanOrEqual(44);
  expect(cancelBox!.height).toBeGreaterThanOrEqual(44);
  await cancel.click();
  await expect(kaelCast).toHaveAttribute('aria-pressed', 'false');
});

test('hero artifacts expose one persisted pre-battle tradeoff per hero', async ({ page }) => {
  await page.goto('/');
  const kaelSelect = page.getByRole('combobox', { name: 'Kael mission artifact' });
  await expect(kaelSelect).toBeVisible();
  await kaelSelect.selectOption('bastion-seal');
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.snapshot().heroes.find((hero) => hero.id === 'kael')?.artifact)).toBe('bastion-seal');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('verdant-rift:hero-artifacts') ?? '{}'))).toEqual({
    version: 1,
    loadout: { kael: 'bastion-seal', lyra: null },
  });

  await page.getByRole('button', { name: /Heroes/ }).click();
  const equipped = page.getByRole('button', { name: /Bastion Seal/ });
  await expect(equipped).toHaveAttribute('aria-pressed', 'true');
  const artifactButtons = page.locator('[data-action="hero-artifact"]');
  await expect(artifactButtons).toHaveCount(3);
  for (const button of await artifactButtons.all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

test('level-four heroes expose a second active spell without turning the HUD into an inventory bar', async ({ page }) => {
  await enterBattle(page);
  await page.evaluate(() => {
    const controller = window.__VERDANT_RIFT__!;
    const hero = (controller.simulation as unknown as { heroes: Array<{ id: string; level: number; unlockedSpells: string[] }> }).heroes.find((candidate) => candidate.id === 'kael')!;
    hero.level = 4;
    hero.unlockedSpells = ['rift-quake', 'riftbrand', 'warden-pulse'];
    controller.update(0);
  });

  const commandBar = page.locator('[data-hero-command-bar]');
  await expect(commandBar.locator('[data-hero="kael"][data-spell]')).toHaveCount(2);
  await expect(commandBar.locator('[data-spell="rift-quake"]')).toBeVisible();
  const pulse = commandBar.locator('[data-spell="warden-pulse"]');
  await expect(pulse).toBeVisible();
  expect((await pulse.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await pulse.click();
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.snapshot().heroes.find((hero) => hero.id === 'kael')!.spellCooldowns['warden-pulse'])).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__VERDANT_RIFT__!.armedSpell)).toBeUndefined();
});
