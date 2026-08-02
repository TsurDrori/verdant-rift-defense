import { expect, test, type Page } from '@playwright/test';

async function begin(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();
  await page.getByRole('button', { name: /CALL WAVE/ }).waitFor();
}

async function overlapArea(page: Page, first: string, second: string): Promise<number> {
  return page.evaluate(([aSelector, bSelector]) => {
    const a = document.querySelector(aSelector ?? '')?.getBoundingClientRect();
    const b = document.querySelector(bSelector ?? '')?.getBoundingClientRect();
    if (!a || !b) return Number.POSITIVE_INFINITY;
    return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
      * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  }, [first, second]);
}

async function visibleOverlapArea(page: Page, first: string, second: string): Promise<number> {
  return page.evaluate(([aSelector, bSelector]) => {
    const aElement = document.querySelector<HTMLElement>(aSelector ?? '');
    const bElement = document.querySelector<HTMLElement>(bSelector ?? '');
    if (!aElement || !bElement) return Number.POSITIVE_INFINITY;
    const isVisible = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0;
    };
    if (!isVisible(aElement) || !isVisible(bElement)) return 0;
    const a = aElement.getBoundingClientRect();
    const b = bElement.getBoundingClientRect();
    return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
      * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  }, [first, second]);
}

for (const viewport of [{ width: 430, height: 932 }, { width: 390, height: 844 }]) {
  test(`portrait boss HUD does not collide with map controls at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await begin(page);
    await page.evaluate(() => {
      const controller = window.__VERDANT_RIFT__!;
      const simulation = controller.simulation as unknown as { waveIndex: number; spawnEnemy(type: 'bloomlord', wave: number): void };
      simulation.waveIndex = 12;
      simulation.spawnEnemy('bloomlord', 12);
      controller.update(0);
    });
    await expect(page.getByLabel('Boss health')).toBeVisible();
    await expect(page.getByLabel('Map view controls')).toBeVisible();
    expect(await overlapArea(page, '.boss-strip', '.view-controls')).toBe(0);
  });
}

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 740, height: 360 },
  { width: 430, height: 932 },
  { width: 390, height: 844 },
]) {
  test(`hero level, numeric HP, XP and milestones stay visibly boxed at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await begin(page);
    for (const card of await page.locator('[data-hero-card]').all()) {
      for (const selector of ['[data-hero-level]', '[data-hero-hp]', '[data-hero-xp]', '.hero-xp-track']) {
        const box = await card.locator(selector).boundingBox();
        expect(box, `${selector} at ${viewport.width}×${viewport.height}`).not.toBeNull();
        expect(box!.width).toBeGreaterThan(0);
        expect(box!.height).toBeGreaterThanOrEqual(selector === '.hero-xp-track' ? 7 : 11);
      }
      const hpBar = await card.locator('.hero-health').boundingBox();
      expect(hpBar).not.toBeNull();
      expect(hpBar!.height).toBeGreaterThanOrEqual(8);
      const pips = await card.locator('.hero-milestone').all();
      expect(pips).toHaveLength(3);
      for (const pip of pips) {
        const box = await pip.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.width).toBeGreaterThanOrEqual(9);
        expect(box!.height).toBeGreaterThanOrEqual(9);
      }
    }
  });
}

test('740×360 briefing exposes its CTA without hidden scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 740, height: 360 });
  await page.goto('/');
  const button = page.getByRole('button', { name: /ENTER THE RIFT/ });
  const box = await button.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(354);
  expect(await page.locator('.front-end-content').evaluate((content) => content.scrollTop)).toBe(0);
});

test('740×360 tower details pause safely and expose an operative scroll cue', async ({ page }) => {
  await page.setViewportSize({ width: 740, height: 360 });
  await begin(page);
  await page.keyboard.press('KeyE');
  await page.getByRole('button', { name: /Thornwatch/ }).click();
  await expect(page.getByText('TACTICAL PAUSE')).toBeVisible();
  expect(await page.evaluate(() => window.__VERDANT_RIFT__!.snapshot().phase)).toBe('paused');
  const cue = page.getByRole('button', { name: 'Show more tower controls' });
  await expect(cue).toBeVisible();
  // The affordance now occupies a reserved footer outside the clipped
  // scrollport, rather than floating over actionable panel content.
  expect(await overlapArea(page, '.panel-scroll-affordance', '.selection-panel')).toBe(0);
  const before = await page.locator('.selection-panel').evaluate((panel) => panel.scrollTop);
  await cue.click();
  await expect.poll(() => page.locator('.selection-panel').evaluate((panel) => panel.scrollTop)).toBeGreaterThan(before);
  await expect(page.getByRole('button', { name: /Dismantle/ })).toBeInViewport();
  expect(await page.evaluate(() => window.__VERDANT_RIFT__!.snapshot().phase)).toBe('paused');
});

test('740×360 rank-three final oaths are immediately visible and retain a safe tactical pause', async ({ page }) => {
  await page.setViewportSize({ width: 740, height: 360 });
  await begin(page);
  await page.evaluate(() => { (window.__VERDANT_RIFT__!.simulation as unknown as { gold: number }).gold = 1000; window.__VERDANT_RIFT__!.update(0); });
  await page.keyboard.press('KeyE');
  await page.getByRole('button', { name: /Thornwatch/ }).click();
  await page.getByRole('button', { name: /RAISE TO RANK 2/ }).click();
  await page.getByRole('button', { name: /RAISE TO RANK 3/ }).click();
  await expect(page.getByText('CHOOSE FINAL OATH')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show more tower controls' })).toBeHidden();
  expect(await overlapArea(page, '.panel-scroll-affordance', '.branch-option')).toBe(0);
  const panel = await page.locator('.selection-panel').boundingBox();
  expect(panel).not.toBeNull();
  for (const name of ['Gale Talon', 'Briar Oath']) {
    const option = page.getByRole('button', { name: new RegExp(name) });
    await expect(option).toBeVisible();
    await expect(option).toBeEnabled();
    const box = await option.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(panel!.y);
    expect(box!.y + box!.height).toBeLessThanOrEqual(panel!.y + panel!.height + 1);
  }
  expect(await page.evaluate(() => window.__VERDANT_RIFT__!.snapshot().phase)).toBe('paused');
  await page.getByRole('button', { name: /Gale Talon/ }).click();
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.snapshot().towers[0]?.branch)).toBe('left');
  expect(await page.evaluate(() => window.__VERDANT_RIFT__!.snapshot().phase)).toBe('paused');
});

for (const viewport of [{ width: 740, height: 360 }, { width: 390, height: 844 }]) {
  test(`audio sliders expose 44px touch boxes at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await begin(page);
    await page.getByRole('button', { name: 'Pause' }).click();
    for (const slider of await page.getByRole('slider').all()) {
      const box = await slider.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });
}

test('briefing, pause, and end dialogs are modal, inert the HUD, and contain keyboard focus', async ({ page }) => {
  await page.goto('/');
  const assertContained = async (modalSelector: string, cycles: number) => {
    for (let index = 0; index < cycles; index += 1) {
      await page.keyboard.press('Tab');
      const state = await page.evaluate((selector) => ({
        inside: Boolean(document.activeElement?.closest(selector)),
        active: document.activeElement?.outerHTML.slice(0, 180),
        open: [...document.querySelectorAll('.modal-layer.is-open')].map((element) => (element as HTMLElement).dataset),
      }), modalSelector);
      expect(state.inside, `cycle ${index}: ${JSON.stringify(state)}`).toBe(true);
    }
    await page.keyboard.press('Shift+Tab');
    expect(await page.evaluate((selector) => Boolean(document.activeElement?.closest(selector)), modalSelector)).toBe(true);
  };

  await expect(page.locator('[data-briefing]')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('.hud')).toHaveAttribute('inert', '');
  await expect(page.locator('[data-pause-modal]')).toHaveAttribute('inert', '');
  await assertContained('[data-briefing]', 10);

  await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();
  await expect(page.locator('[data-briefing]')).toHaveAttribute('inert', '');
  await expect(page.locator('.hud')).not.toHaveAttribute('inert', '');
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.locator('[data-pause-modal]')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('.hud')).toHaveAttribute('inert', '');
  await assertContained('[data-pause-modal]', 14);

  await page.getByRole('button', { name: /RETURN TO BATTLE/ }).click();
  await expect(page.locator('.hud')).not.toHaveAttribute('inert', '');
  await page.evaluate(() => {
    (window.__VERDANT_RIFT__!.simulation as unknown as { phase: 'defeat' }).phase = 'defeat';
    window.__VERDANT_RIFT__!.update(0);
  });
  await expect(page.locator('[data-end-modal]')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('.hud')).toHaveAttribute('inert', '');
  await assertContained('[data-end-modal]', 6);
});

test('the world hero-health bar exposes the first authoritative hit without lagging the card', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await begin(page);
  await page.getByRole('button', { name: /Select Kael/ }).click();
  await page.getByRole('button', { name: /CALL WAVE/ }).click();

  const hit = await page.evaluate(() => {
    const controller = window.__VERDANT_RIFT__!;
    const simulation = controller.simulation as unknown as {
      heroes: Array<{ id: string; hp: number; maxHp: number; attackCooldown: number; alive: boolean }>;
      enemies: Array<{ alive: boolean }>;
      spawnQueue: Array<{ at: number; enemy: 'skitter'; wave: number }>;
      waveActive: boolean;
      waveTime: number;
      spawnEnemy(type: 'brute', wave: number): void;
      update(dt: number): void;
      drainEvents(): Array<{ type: string; amount?: number; hp?: number }>;
    };
    const hero = simulation.heroes.find((candidate) => candidate.id === 'kael')!;
    simulation.enemies = [];
    simulation.spawnQueue = [{ at: 999, enemy: 'skitter', wave: 1 }];
    simulation.waveActive = true;
    simulation.waveTime = 0;
    hero.attackCooldown = 999;
    simulation.spawnEnemy('brute', 1);
    const enemy = simulation.enemies[0] as unknown as {
      x: number; y: number; progress: number; laneOffset: number; laneTarget: number; attackCooldown: number; alive: boolean;
    };
    const heroPosition = hero as unknown as { x: number; y: number };
    enemy.progress = 0.45;
    enemy.laneOffset = -2.4;
    enemy.laneTarget = -2.4;
    enemy.x = heroPosition.x;
    enemy.y = heroPosition.y;
    enemy.attackCooldown = 0;
    simulation.drainEvents();
    for (let tick = 0; tick < 3; tick += 1) simulation.update(1 / 60);
    const event = simulation.drainEvents().find((candidate) => candidate.type === 'ally-hit');
    enemy.alive = false;
    return { hp: hero.hp, maxHp: hero.maxHp, event };
  });

  expect(hit.hp).toBeCloseTo(385.44, 2);
  expect(hit.event).toMatchObject({ type: 'ally-hit', amount: 34.56, hp: 385.44 });
  await expect(page.locator('[data-hero-card="kael"] [data-hero-hp]')).toHaveText('HP 386 / 420');

  const bar = await expect.poll(() => page.evaluate(() => {
    const game = window.__VERDANT_RIFT_GAME__!;
    const scene = game.scene.getScenes(true).find((candidate) => 'heroViews' in candidate) as unknown as {
      heroViews: Map<string, { getData(key: string): { displayWidth: number; width: number; alpha: number; fillAlpha: number } }>;
    };
    const view = scene.heroViews.get('kael')!;
    const hp = view.getData('hp');
    const back = view.getData('hpBack');
    return { displayWidth: hp.displayWidth, width: hp.width, alpha: hp.alpha, backAlpha: back.fillAlpha };
  })).toMatchObject({ alpha: 1, backAlpha: 0.94 });
  void bar;

  const rendered = await page.evaluate(() => {
    const game = window.__VERDANT_RIFT_GAME__!;
    const scene = game.scene.getScenes(true).find((candidate) => 'heroViews' in candidate) as unknown as {
      heroViews: Map<string, { getData(key: string): { displayWidth: number; width: number; alpha: number } }>;
    };
    const hp = scene.heroViews.get('kael')!.getData('hp');
    return { displayWidth: hp.displayWidth, width: hp.width, alpha: hp.alpha };
  });
  expect(rendered.displayWidth).toBeCloseTo(rendered.width * hit.hp / hit.maxHp, 4);

  await page.evaluate(() => {
    const hero = (window.__VERDANT_RIFT__!.simulation as unknown as {
      heroes: Array<{ id: string; hp: number; maxHp: number; alive: boolean }>;
    }).heroes.find((candidate) => candidate.id === 'kael')!;
    hero.hp = hero.maxHp;
  });
  await expect.poll(() => page.evaluate(() => {
    const scene = window.__VERDANT_RIFT_GAME__!.scene.getScenes(true).find((candidate) => 'heroViews' in candidate) as unknown as {
      heroViews: Map<string, { getData(key: string): { alpha: number } }>;
    };
    return scene.heroViews.get('kael')!.getData('hp').alpha;
  })).toBe(0);
});

test('left and right tower panels never intersect visible hero cards across desktop breakpoints', async ({ browser }) => {
  test.setTimeout(90_000);
  for (const viewport of [{ width: 1600, height: 900 }, { width: 1366, height: 768 }, { width: 1024, height: 768 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await begin(page);
    await page.evaluate(() => { (window.__VERDANT_RIFT__!.simulation as unknown as { gold: number }).gold = 9999; });

    for (const [side, pad] of [['left', 2], ['right', 0]] as const) {
      await page.evaluate((padIndex) => window.__VERDANT_RIFT__!.selectPad(padIndex), pad);
      await expect(page.locator('.selection-panel')).toHaveAttribute('data-side', side);
      await expect(page.getByRole('button', { name: /Thornwatch/ })).toBeVisible();
      expect(await visibleOverlapArea(page, '.selection-panel', '.hero-dock')).toBe(0);

      await page.getByRole('button', { name: /Thornwatch/ }).click();
      await expect(page.locator('.selection-panel')).toHaveAttribute('data-side', side);
      await expect(page.getByRole('button', { name: /RAISE TO RANK 2/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /Dismantle/ })).toBeVisible();
      expect(await visibleOverlapArea(page, '.selection-panel', '.hero-dock')).toBe(0);
      await page.getByRole('button', { name: /Close tower controls/ }).click();
    }

    if (viewport.width <= 1100) {
      await page.evaluate(() => window.__VERDANT_RIFT__!.selectPad(2));
      await expect(page.locator('.hero-dock')).toBeHidden();
      await expect(page.getByRole('button', { name: /RAISE TO RANK 2/ })).toBeVisible();
    }
    await context.close();
  }
});
