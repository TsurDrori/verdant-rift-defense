import { expect, test } from '@playwright/test';

const hostedCI = Boolean((globalThis as typeof globalThis & {
  process?: { env?: { CI?: string } };
}).process?.env?.CI);

async function clickWorld(page: import('@playwright/test').Page, x: number, y: number): Promise<void> {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('Battlefield canvas did not receive a layout box.');
  await page.mouse.click(box.x + box.width * (x / 1600), box.y + box.height * (y / 900));
}

async function tapWorld(page: import('@playwright/test').Page, x: number, y: number): Promise<void> {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('Battlefield canvas did not receive a layout box.');
  await page.touchscreen.tap(box.x + box.width * (x / 1600), box.y + box.height * (y / 900));
}

test('boots, enters battle, builds a tower, and starts combat', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Hold the Verdant Rift' })).toBeVisible();
  await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();
  await expect(page.getByText('First Rustle')).toBeVisible();

  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Battlefield canvas did not receive a layout box.');
  await page.mouse.click(box.x + box.width * (333 / 1600), box.y + box.height * (147 / 900));
  await expect(page.getByRole('heading', { name: 'Choose a covenant' })).toBeVisible();
  await page.getByRole('button', { name: /Thornwatch/ }).click();
  await expect(page.getByRole('heading', { name: 'Thornwatch' })).toBeVisible();
  const builtPad = await page.evaluate(() => window.__VERDANT_RIFT__?.snapshot().towers[0]?.padIndex);
  expect(builtPad).toBe(0);
  await page.getByRole('button', { name: /CALL WAVE/ }).click();
  await expect(page.getByText('WAVE 1 IN MOTION')).toBeVisible();
});

test('tower crowns select exact identities and repeated upgrades stay on their owning tower', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Wanderer/ }).click();
  await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();

  await clickWorld(page, 333, 147);
  await page.getByRole('button', { name: /Thornwatch/ }).click();
  await clickWorld(page, 575, 327);
  await page.getByRole('button', { name: /Thornwatch/ }).click();

  const towers = await page.evaluate(() => window.__VERDANT_RIFT__?.snapshot().towers.map((tower) => ({ uid: tower.uid, padIndex: tower.padIndex })) ?? []);
  const first = towers.find((tower) => tower.padIndex === 0);
  const second = towers.find((tower) => tower.padIndex === 1);
  expect(first).toBeDefined();
  expect(second).toBeDefined();

  // The first tower's crown is far above the old centered container hit-area.
  await clickWorld(page, 333, 68);
  await expect.poll(() => page.evaluate(() => {
    const selection = window.__VERDANT_RIFT__?.selection;
    return selection?.kind === 'tower' ? selection.towerUid : undefined;
  })).toBe(first!.uid);
  await expect(page.getByText('RANK 1 • RAPID PHYSICAL')).toBeVisible();

  await page.getByRole('button', { name: /RAISE TO RANK 2/ }).click();
  await expect.poll(() => page.evaluate((uid) => window.__VERDANT_RIFT__?.snapshot().towers.find((tower) => tower.uid === uid)?.level, first!.uid)).toBe(2);
  expect(await page.evaluate((uid) => window.__VERDANT_RIFT__?.snapshot().towers.find((tower) => tower.uid === uid)?.level, second!.uid)).toBe(1);
  await expect.poll(() => page.evaluate(() => {
    const selection = window.__VERDANT_RIFT__?.selection;
    return selection?.kind === 'tower' ? selection.towerUid : undefined;
  })).toBe(first!.uid);

  // The panel is re-rendered after rank two; its new button must retain UID ownership.
  await page.getByRole('button', { name: /RAISE TO RANK 3/ }).click();
  await expect.poll(() => page.evaluate((uid) => window.__VERDANT_RIFT__?.snapshot().towers.find((tower) => tower.uid === uid)?.level, first!.uid)).toBe(3);
  expect(await page.evaluate((uid) => window.__VERDANT_RIFT__?.snapshot().towers.find((tower) => tower.uid === uid)?.level, second!.uid)).toBe(1);

  await clickWorld(page, 575, 246);
  await expect.poll(() => page.evaluate(() => {
    const selection = window.__VERDANT_RIFT__?.selection;
    return selection?.kind === 'tower' ? selection.towerUid : undefined;
  })).toBe(second!.uid);
  await expect(page.getByText('RANK 1 • RAPID PHYSICAL')).toBeVisible();
});

test('keeps primary controls visible at a phone landscape viewport', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/');
  await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();
  await expect(page.getByLabel('Battle status')).toBeVisible();
  await expect(page.getByRole('button', { name: /CALL WAVE/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Select Kael • Rift Warden' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Toggle battle speed' })).toBeVisible();
  const viewportProof = await page.evaluate(() => {
    const selectors = ['[aria-label="Battle status"]', '[aria-label="Toggle battle speed"]', '[data-wave-card]'];
    return selectors.map((selector) => {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      return rect ? { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right } : null;
    });
  });
  for (const rect of viewportProof) {
    expect(rect).not.toBeNull();
    expect(rect!.top).toBeGreaterThanOrEqual(0);
    expect(rect!.bottom).toBeLessThanOrEqual(390);
    expect(rect!.right).toBeGreaterThan(0);
    expect(rect!.left).toBeLessThan(844);
  }
  expect(await page.locator('#app').evaluate((element) => element.scrollTop)).toBe(0);
});

test('provides a touch-sized portrait focus with one-action overview recovery', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByLabel('Map view controls')).toBeHidden();
  await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();
  const layout = await page.evaluate(() => {
    const rect = (selector: string) => {
      const target = document.querySelector(selector);
      if (!target) return null;
      const bounds = target.getBoundingClientRect();
      return { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom, width: bounds.width, height: bounds.height };
    };
    return {
      canvas: rect('canvas'),
      heroes: rect('[data-hero-dock]'),
      wave: rect('[data-wave-card]'),
      root: rect('#game-root'),
      scrollWidth: document.querySelector<HTMLElement>('#game-root')?.scrollWidth,
      scrollLeft: document.querySelector<HTMLElement>('#game-root')?.scrollLeft,
      documentWidth: document.documentElement.scrollWidth,
      documentHeight: document.documentElement.scrollHeight,
    };
  });
  expect(layout.canvas).not.toBeNull();
  expect(layout.canvas!.width).toBeGreaterThanOrEqual(899);
  expect(layout.canvas!.height).toBeGreaterThanOrEqual(505);
  expect(layout.canvas!.width / layout.canvas!.height).toBeCloseTo(16 / 9, 2);
  expect(layout.scrollWidth).toBeGreaterThan(800);
  expect(layout.scrollLeft).toBeGreaterThan(200);
  expect(layout.documentWidth).toBe(390);
  expect(layout.documentHeight).toBe(844);
  expect(layout.heroes!.right).toBeLessThan(layout.wave!.left);
  await expect(page.getByRole('button', { name: 'Show battlefield overview' })).toBeVisible();
  await page.getByRole('button', { name: 'Show battlefield overview' }).click();
  await expect.poll(() => page.locator('canvas').evaluate((canvas) => canvas.getBoundingClientRect().width)).toBeCloseTo(390, 0);
  await expect(page.getByRole('button', { name: 'Focus battlefield for touch play' })).toBeVisible();
  await expect(page.getByRole('button', { name: /CALL WAVE/ })).toBeVisible();
});

const responsiveViewports = [
  { width: 1920, height: 1080 },
  { width: 1600, height: 900 },
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
  { width: 1024, height: 768 },
  { width: 844, height: 390 },
  { width: 740, height: 360 },
  { width: 430, height: 932 },
  { width: 390, height: 844 },
] as const;

for (const viewport of responsiveViewports) {
  test(`responsive HUD and tower controls stay usable at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    test.setTimeout(45_000);
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();

    const layout = await page.evaluate(({ width, height }) => {
      const rect = (selector: string) => {
        const target = document.querySelector(selector);
        if (!target) return null;
        const bounds = target.getBoundingClientRect();
        return { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom, width: bounds.width, height: bounds.height };
      };
      const overlaps = (a: ReturnType<typeof rect>, b: ReturnType<typeof rect>) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
      const canvas = rect('canvas');
      const status = rect('[aria-label="Battle status"]');
      const controls = rect('[aria-label="Battle controls"]');
      const heroes = rect('[data-hero-dock]');
      const wave = rect('[data-wave-card]');
      return {
        width,
        height,
        canvas,
        status,
        controls,
        heroes,
        wave,
        statusControlsOverlap: overlaps(status, controls),
        heroesWaveOverlap: overlaps(heroes, wave),
        documentWidth: document.documentElement.scrollWidth,
        documentHeight: document.documentElement.scrollHeight,
      };
    }, viewport);

    for (const box of [layout.status, layout.controls, layout.heroes, layout.wave]) {
      expect(box).not.toBeNull();
      expect(box!.left).toBeGreaterThanOrEqual(-1);
      expect(box!.top).toBeGreaterThanOrEqual(-1);
      expect(box!.right).toBeLessThanOrEqual(viewport.width + 1);
      expect(box!.bottom).toBeLessThanOrEqual(viewport.height + 1);
    }
    if (viewport.width <= 620) {
      expect(layout.canvas!.width).toBeGreaterThanOrEqual(899);
      expect(layout.canvas!.height).toBeGreaterThanOrEqual(505);
    } else {
      expect(layout.canvas!.left).toBeGreaterThanOrEqual(-1);
      expect(layout.canvas!.top).toBeGreaterThanOrEqual(-1);
      expect(layout.canvas!.right).toBeLessThanOrEqual(viewport.width + 1);
      expect(layout.canvas!.bottom).toBeLessThanOrEqual(viewport.height + 1);
    }
    expect(layout.canvas!.width / layout.canvas!.height).toBeCloseTo(16 / 9, 2);
    expect(layout.statusControlsOverlap).toBe(false);
    expect(layout.heroesWaveOverlap).toBe(false);
    expect(layout.documentWidth).toBe(viewport.width);
    expect(layout.documentHeight).toBe(viewport.height);

    for (const control of [
      page.getByRole('button', { name: 'Pause' }),
      page.getByRole('button', { name: 'Toggle battle speed' }),
      page.getByRole('button', { name: /CALL WAVE/ }),
      page.getByRole('button', { name: 'Select Kael • Rift Warden' }),
    ]) {
      const bounds = await control.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.width).toBeGreaterThanOrEqual(44);
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
    }

    await page.keyboard.press('KeyE');
    const panel = page.locator('[data-selection-panel]');
    await expect(page.getByRole('heading', { name: 'Choose a covenant' })).toBeVisible();
    await expect(panel).toHaveCSS('transform', 'none');
    const panelBounds = await panel.boundingBox();
    expect(panelBounds).not.toBeNull();
    expect(panelBounds!.x).toBeGreaterThanOrEqual(-1);
    expect(panelBounds!.y).toBeGreaterThanOrEqual(-1);
    expect(panelBounds!.x + panelBounds!.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(panelBounds!.y + panelBounds!.height).toBeLessThanOrEqual(viewport.height + 1);
    const optionBounds = await page.evaluate(() => {
      const element = document.querySelector<HTMLElement>('[data-action="build"][data-tower="thorn"]');
      if (!element) return null;
      const bounds = element.getBoundingClientRect();
      return { width: bounds.width, height: bounds.height };
    });
    expect(optionBounds).not.toBeNull();
    expect(optionBounds!.height).toBeGreaterThanOrEqual(44);
    const closeBounds = await page.getByRole('button', { name: /Close tower controls/ }).boundingBox();
    expect(closeBounds).not.toBeNull();
    expect(closeBounds!.width).toBeGreaterThanOrEqual(44);
    expect(closeBounds!.height).toBeGreaterThanOrEqual(44);
    if (viewport.width <= 620) {
      await expect(page.getByText('TACTICAL PAUSE')).toBeVisible();
      expect(await page.evaluate(() => window.__VERDANT_RIFT__?.snapshot().phase)).toBe('paused');
    }
  });
}

test('world touch proxies remain at least 44px at constrained landscape and portrait focus scales', async ({ browser }) => {
  for (const viewport of [{ width: 740, height: 360 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, hasTouch: true });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173/');
    await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();
    const diagnostics = await page.evaluate(() => {
      const scene = window.__VERDANT_RIFT_GAME__?.scene.getScene('battle');
      const canvasWidth = document.querySelector('canvas')?.getBoundingClientRect().width ?? 0;
      const proxy = (name: string) => {
        const object = scene?.children.getByName(name) as unknown as { input?: { hitArea?: { width?: number; height?: number } } } | undefined;
        return { width: object?.input?.hitArea?.width ?? 0, height: object?.input?.hitArea?.height ?? 0 };
      };
      return { scale: canvasWidth / 1600, pad: proxy('build-pad-hit-0'), hero: proxy('hero-hit-kael') };
    });
    expect(diagnostics.pad.width * diagnostics.scale).toBeGreaterThanOrEqual(44);
    expect(diagnostics.pad.height * diagnostics.scale).toBeGreaterThanOrEqual(44);
    expect(diagnostics.hero.width * diagnostics.scale).toBeGreaterThanOrEqual(44);
    expect(diagnostics.hero.height * diagnostics.scale).toBeGreaterThanOrEqual(44);

    if (viewport.width <= 620) {
      await page.getByRole('button', { name: 'Pan battlefield left' }).click();
      await expect.poll(() => page.locator('#game-root').evaluate((root) => root.scrollLeft)).toBe(0);
    }
    if (viewport.width <= 620) await tapWorld(page, 333, 147);
    else await clickWorld(page, 333, 147);
    await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__?.selection)).toEqual({ kind: 'pad', padIndex: 0 });
    await page.getByRole('button', { name: /Thornwatch/ }).click();
    await expect.poll(() => page.evaluate(() => {
      const tower = window.__VERDANT_RIFT__?.snapshot().towers[0];
      const scene = window.__VERDANT_RIFT_GAME__?.scene.getScene('battle');
      const view = tower ? scene?.children.getByName(`tower-view-${tower.uid}`) as unknown as { getByName?: (name: string) => unknown } | undefined : undefined;
      const object = tower ? view?.getByName?.(`tower-crown-hit-${tower.uid}`) as { input?: { hitArea?: { width?: number; height?: number } } } | undefined : undefined;
      const scale = (document.querySelector('canvas')?.getBoundingClientRect().width ?? 0) / 1600;
      return Math.min(object?.input?.hitArea?.width ?? 0, object?.input?.hitArea?.height ?? 0) * scale;
    })).toBeGreaterThanOrEqual(44);
    await context.close();
  }
});

test('portrait focus pans, preserves touch mapping, recovers overview, and survives rotation', async ({ browser }) => {
  test.setTimeout(45_000);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();
  await expect.poll(() => page.locator('#game-root').evaluate((root) => root.scrollLeft)).toBeGreaterThan(200);
  await page.getByRole('button', { name: 'Pan battlefield left' }).click();
  await expect.poll(() => page.locator('#game-root').evaluate((root) => root.scrollLeft)).toBe(0);
  await tapWorld(page, 333, 147);
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__?.selection)).toEqual({ kind: 'pad', padIndex: 0 });
  await expect(page.getByText('TACTICAL PAUSE')).toBeVisible();
  expect(await page.evaluate(() => window.__VERDANT_RIFT__?.snapshot().phase)).toBe('paused');
  await page.getByRole('button', { name: /Close tower controls/ }).click();
  expect(await page.evaluate(() => window.__VERDANT_RIFT__?.snapshot().phase)).toBe('playing');

  await page.getByRole('button', { name: 'Show battlefield overview' }).click();
  await expect.poll(() => page.locator('canvas').evaluate((canvas) => Math.round(canvas.getBoundingClientRect().width))).toBe(390);
  await page.getByRole('button', { name: 'Focus battlefield for touch play' }).click();
  await expect.poll(() => page.locator('canvas').evaluate((canvas) => Math.round(canvas.getBoundingClientRect().width))).toBe(900);
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.getByLabel('Map view controls')).toBeHidden();
  await expect.poll(() => page.locator('canvas').evaluate((canvas) => Math.round(canvas.getBoundingClientRect().width))).toBe(693);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel('Map view controls')).toBeVisible();
  await expect.poll(() => page.locator('canvas').evaluate((canvas) => Math.round(canvas.getBoundingClientRect().width))).toBe(900);
  await context.close();
});

test('constrained left panel never overlaps hero controls and all hero actions remain 44px', async ({ page }) => {
  await page.setViewportSize({ width: 740, height: 360 });
  await page.goto('/');
  await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();
  await clickWorld(page, 1025, 207);
  await expect(page.getByRole('heading', { name: 'Choose a covenant' })).toBeVisible();
  await expect(page.locator('[data-selection-panel]')).toHaveAttribute('data-side', 'left');
  await expect(page.locator('[data-selection-panel]')).toBeVisible();
  await expect(page.locator('[data-hero-dock]')).toBeHidden();
  await page.getByRole('button', { name: /Close tower controls/ }).click();
  await expect(page.locator('[data-hero-dock]')).toBeVisible();
  for (const ability of await page.locator('.ability-button').all()) {
    const box = await ability.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});

test('portrait build and branch panels explicitly pause any canvas overlap and close resumes', async ({ page }) => {
  test.setTimeout(45_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();
  await page.getByRole('button', { name: 'Pan battlefield left' }).click();
  await expect.poll(() => page.locator('#game-root').evaluate((root) => root.scrollLeft)).toBe(0);
  await clickWorld(page, 333, 147);
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT_AUDIO__?.diagnostics().context)).toBe('suspended');
  await page.evaluate(() => {
    (window as typeof window & { __TACTICAL_PHASES__?: string[] }).__TACTICAL_PHASES__ = [];
    window.__VERDANT_RIFT__?.addEventListener('state', () => {
      (window as typeof window & { __TACTICAL_PHASES__?: string[] }).__TACTICAL_PHASES__?.push(window.__VERDANT_RIFT__?.snapshot().phase ?? 'missing');
    });
  });
  await page.getByRole('button', { name: /Thornwatch/ }).click();
  await page.getByRole('button', { name: /RAISE TO RANK 2/ }).click();
  await page.getByRole('button', { name: /RAISE TO RANK 3/ }).click();
  await expect(page.getByText('CHOOSE FINAL OATH')).toBeVisible();
  const overlap = await page.evaluate(() => {
    const panel = document.querySelector('[data-selection-panel]')?.getBoundingClientRect();
    const canvas = document.querySelector('canvas')?.getBoundingClientRect();
    if (!panel || !canvas) return 0;
    return Math.max(0, Math.min(panel.right, canvas.right) - Math.max(panel.left, canvas.left)) * Math.max(0, Math.min(panel.bottom, canvas.bottom) - Math.max(panel.top, canvas.top));
  });
  expect(overlap).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__VERDANT_RIFT__?.snapshot().phase)).toBe('paused');
  expect(await page.evaluate(() => (window as typeof window & { __TACTICAL_PHASES__?: string[] }).__TACTICAL_PHASES__?.every((phase) => phase === 'paused'))).toBe(true);
  expect(await page.evaluate(() => window.__VERDANT_RIFT_AUDIO__?.diagnostics().context)).toBe('suspended');
  await expect(page.getByText('TACTICAL PAUSE')).toBeVisible();
  await expect(page.getByLabel('Battle controls')).toBeHidden();
  await expect(page.getByLabel('Map view controls')).toBeHidden();

  // Even a synthetic activation of the hidden global Pause button must not
  // produce "playing" combat under a still-open tactical panel.
  await page.evaluate(() => document.querySelector<HTMLButtonElement>('.battle-controls [data-action="pause"]')?.click());
  await expect(page.getByText('TACTICAL PAUSE')).toBeHidden();
  await expect(page.locator('[data-selection-panel]')).toBeHidden();
  expect(await page.evaluate(() => window.__VERDANT_RIFT__?.snapshot().phase)).toBe('playing');

  // Reopen once to retain coverage of the explicit close affordance.
  await page.getByRole('button', { name: 'Pan battlefield left' }).click();
  await clickWorld(page, 333, 147);
  await expect(page.getByText('TACTICAL PAUSE')).toBeVisible();
  await page.getByRole('button', { name: /Close tower controls/ }).click();
  expect(await page.evaluate(() => window.__VERDANT_RIFT__?.snapshot().phase)).toBe('playing');
});

test('persists and dispatches the responsive four-channel audio mix', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('heading', { name: 'The forest holds its breath.' })).toBeVisible();
  await expect(page.getByLabel('Battle controls')).toBeHidden();
  await expect(page.getByLabel('Map view controls')).toBeHidden();
  await page.evaluate(() => {
    (window as typeof window & { __AUDIO_EVENTS__?: unknown[] }).__AUDIO_EVENTS__ = [];
    document.querySelector('#ui-root')?.addEventListener('audio-settings', (event) => {
      (window as typeof window & { __AUDIO_EVENTS__?: unknown[] }).__AUDIO_EVENTS__?.push((event as CustomEvent).detail);
    });
  });

  const mixer = page.getByLabel('Audio mix');
  const mixerBounds = await mixer.boundingBox();
  expect(mixerBounds).not.toBeNull();
  expect(mixerBounds!.x).toBeGreaterThanOrEqual(0);
  expect(mixerBounds!.x + mixerBounds!.width).toBeLessThanOrEqual(390);
  const music = page.getByRole('slider', { name: 'Music volume' });
  await music.fill('0.37');
  await expect(mixer.getByText('37%')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('verdant-rift:audio-mix') ?? '{}').music)).toBe(0.37);
  expect(await page.evaluate(() => (window as typeof window & { __AUDIO_EVENTS__?: Array<{ music?: number }> }).__AUDIO_EVENTS__?.at(-1)?.music)).toBe(0.37);
});

test('provides keyboard-only build, hero movement, and smart-cast commands', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();
  await page.keyboard.press('KeyE');
  await expect(page.getByText('FOUNDATION 1')).toBeVisible();
  await page.getByRole('button', { name: /Thornwatch/ }).click();
  await page.keyboard.press('KeyZ');
  const before = await page.evaluate(() => window.__VERDANT_RIFT__?.snapshot().heroes.find((hero) => hero.id === 'kael')?.y);
  await page.keyboard.press('KeyW');
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__?.snapshot().heroes.find((hero) => hero.id === 'kael')?.y), { timeout: 2000 }).toBeLessThan(before ?? Number.POSITIVE_INFINITY);
  await page.keyboard.press('Digit1');
  const cooldown = await page.evaluate(() => window.__VERDANT_RIFT__?.snapshot().heroes.find((hero) => hero.id === 'kael')?.ultimateCooldown);
  expect(cooldown).toBeGreaterThan(0);
});

test('stays responsive through three compressed waves at 2x with bounded presentation effects', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();

  await page.evaluate(() => {
    const controller = window.__VERDANT_RIFT__!;
    const simulation = controller.simulation as unknown as {
      gold: number;
      spawnQueue: Array<{ at: number }>;
      buildTower(padIndex: number, type: 'thorn' | 'ember' | 'aegis' | 'astral'): boolean;
      upgradeTower(uid: number): boolean;
      chooseBranch(uid: number, branch: 'left' | 'right'): boolean;
      startWave(): boolean;
      getSnapshot(): ReturnType<typeof controller.snapshot>;
    };
    simulation.gold = 99_999;
    const types = ['thorn', 'ember', 'aegis', 'astral'] as const;
    // Four fully specialized towers create sustained projectile pressure while
    // staying representative of the economy during the opening three waves.
    for (let padIndex = 0; padIndex < 4; padIndex += 1) {
      simulation.buildTower(padIndex, types[padIndex % types.length]!);
      const tower = simulation.getSnapshot().towers.at(-1)!;
      simulation.upgradeTower(tower.uid);
      simulation.upgradeTower(tower.uid);
      simulation.chooseBranch(tower.uid, padIndex % 2 === 0 ? 'left' : 'right');
    }
    controller.toggleSpeed();
    // Reproduce three early calls without the unrealistic artifact of spawning
    // every actor on the exact same render frame. The first two schedules are
    // shortened, advanced at the reported 2x/100 ms pressure point, and wave
    // three starts while their surviving actors are still on the road.
    for (let wave = 0; wave < 2; wave += 1) {
      if (!simulation.startWave()) throw new Error(`Wave ${wave + 1} was not callable during burst setup.`);
      simulation.spawnQueue.forEach((order) => { order.at *= 0.25; });
      let pressureFrames = 0;
      while (!simulation.getSnapshot().canCallWave && pressureFrames < 30) {
        (simulation as unknown as { update(delta: number): void }).update(0.1);
        pressureFrames += 1;
      }
    }
    if (!simulation.startWave()) throw new Error('Wave 3 was not callable during burst setup.');
    simulation.spawnQueue.forEach((order) => { order.at *= 0.25; });
  });

  expect(await page.evaluate(() => window.__VERDANT_RIFT__!.snapshot().wave)).toBe(3);

  const before = await page.evaluate(() => {
    const simulation = window.__VERDANT_RIFT__!.simulation as unknown as { time: number };
    return simulation.time;
  });
  await page.waitForTimeout(2_500);
  const pressure = await page.evaluate(() => {
    const controller = window.__VERDANT_RIFT__!;
    const simulation = controller.simulation as unknown as { time: number; accumulator: number; events: unknown[] };
    const scene = window.__VERDANT_RIFT_GAME__!.scene.getScene('battle') as unknown as {
      getPerformanceDiagnostics(): {
        activeProjectiles: number;
        peakProjectiles: number;
        enemyViews: number;
        displayObjects: number;
        tweens: number;
        reducedEnemyFx: boolean;
      };
    };
    return {
      elapsedSimulation: simulation.time,
      accumulator: simulation.accumulator,
      queuedEvents: simulation.events.length,
      phase: controller.snapshot().phase,
      wave: controller.snapshot().wave,
      ...scene.getPerformanceDiagnostics(),
    };
  });

  // Local GPU-backed Chromium must sustain at least 90% of requested 2× time.
  // GitHub's SwiftShader-only runner is a validation appliance, not supported
  // player hardware; it must still exceed real time and prove forward progress.
  expect(pressure.elapsedSimulation - before).toBeGreaterThanOrEqual(hostedCI ? 3.5 : 4.5);
  expect(pressure.accumulator).toBeLessThan(1 / 60);
  expect(pressure.queuedEvents).toBeLessThan(40);
  expect(pressure.phase).toBe('playing');
  expect(pressure.wave).toBe(3);
  expect(pressure.activeProjectiles).toBeLessThanOrEqual(32);
  expect(pressure.peakProjectiles).toBeLessThanOrEqual(32);
  expect(pressure.enemyViews).toBeLessThanOrEqual(38);
  expect(pressure.displayObjects).toBeLessThan(800);
  expect(pressure.tweens).toBeLessThan(500);
  expect(pressure.reducedEnemyFx).toBe(true);

  // A real DOM interaction after peak combat pressure proves the main thread
  // and controller event bridge remain responsive, not merely numerically live.
  await page.getByRole('button', { name: 'Toggle battle speed' }).click();
  await expect(page.getByRole('button', { name: 'Toggle battle speed' })).toContainText('1×');
});

test('keeps the early-call button attached while enemies die at 2x', async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto('/');
  await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();
  await page.evaluate(() => {
    const simulation = window.__VERDANT_RIFT__!.simulation as unknown as {
      gold: number;
      buildTower(padIndex: number, type: 'thorn' | 'ember' | 'aegis' | 'astral'): boolean;
      upgradeTower(uid: number): boolean;
      chooseBranch(uid: number, branch: 'left' | 'right'): boolean;
      getSnapshot(): { towers: Array<{ uid: number }> };
    };
    simulation.gold = 99_999;
    const types = ['thorn', 'ember', 'aegis', 'astral', 'thorn', 'ember'] as const;
    types.forEach((type, padIndex) => {
      simulation.buildTower(padIndex, type);
      const tower = simulation.getSnapshot().towers.at(-1)!;
      simulation.upgradeTower(tower.uid);
      simulation.upgradeTower(tower.uid);
      simulation.chooseBranch(tower.uid, padIndex % 2 === 0 ? 'left' : 'right');
    });
  });
  await page.getByRole('button', { name: 'Toggle battle speed' }).click();
  await page.getByRole('button', { name: /CALL WAVE/ }).click();
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.snapshot().canCallWave), { timeout: 10_000 }).toBe(true);

  const callWave = page.getByRole('button', { name: /CALL WAVE/ });
  await expect(callWave).toBeVisible();
  await callWave.evaluate((button) => {
    (window as typeof window & { __CALL_WAVE_NODE__?: Element }).__CALL_WAVE_NODE__ = button;
  });
  // Alive count, bonus and simulation state all change during this window.
  // The actionable node itself must remain mounted beneath the pointer.
  await page.waitForTimeout(1_200);
  expect(await page.evaluate(() => document.querySelector('[data-action="wave"]')
    === (window as typeof window & { __CALL_WAVE_NODE__?: Element }).__CALL_WAVE_NODE__)).toBe(true);
  await callWave.click({ timeout: 5_000 });
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.snapshot().wave)).toBe(2);
});

test('settles a stale delayed impact after another hit removes its enemy view', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.stack ?? error.message));
  await page.goto('/');
  await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();

  await page.evaluate(() => {
    const simulation = window.__VERDANT_RIFT__!.simulation as unknown as {
      waveIndex: number;
      spawnEnemy(type: 'skitter', wave: number): void;
    };
    simulation.waveIndex = 1;
    simulation.spawnEnemy('skitter', 1);
  });
  await expect.poll(() => page.evaluate(() => {
    const scene = window.__VERDANT_RIFT_GAME__!.scene.getScene('battle') as unknown as {
      getPerformanceDiagnostics(): { enemyViews: number };
    };
    return scene.getPerformanceDiagnostics().enemyViews;
  })).toBe(1);

  const before = await page.evaluate(() => window.__VERDANT_RIFT__!.simulation.getTimingDiagnostics().simulationTime);
  await page.evaluate(() => {
    const controller = window.__VERDANT_RIFT__!;
    const enemy = controller.snapshot().enemies.find((candidate) => candidate.alive)!;
    const scene = window.__VERDANT_RIFT_GAME__!.scene.getScene('battle') as unknown as {
      handleEvent(event: {
        type: 'enemy-hit'; enemyUid: number; source: { x: number; y: number };
        damageType: 'physical'; amount: number; splash: number; color: number;
        style: 'thorn' | 'impact'; lethal: boolean; bounty: number;
        owner: { kind: 'environment' };
      }): void;
    };
    const hit = {
      type: 'enemy-hit' as const,
      enemyUid: enemy.uid,
      source: { x: 0, y: 0 },
      damageType: 'physical' as const,
      amount: enemy.maxHp,
      splash: 0,
      color: 0xffe6ae,
      lethal: true,
      bounty: 0,
      owner: { kind: 'environment' as const },
    };
    // The flight captures the original view. The synchronous impact removes
    // that view first, reproducing the dense-wave double-impact race exactly.
    scene.handleEvent({ ...hit, style: 'thorn' });
    scene.handleEvent({ ...hit, style: 'impact' });
  });

  await page.waitForTimeout(1_000);
  const after = await page.evaluate(() => ({
    phase: window.__VERDANT_RIFT__!.snapshot().phase,
    time: window.__VERDANT_RIFT__!.simulation.getTimingDiagnostics().simulationTime,
    diagnostics: (window.__VERDANT_RIFT_GAME__!.scene.getScene('battle') as unknown as {
      getPerformanceDiagnostics(): { activeProjectiles: number; pendingLethals: number; watchdogHealthy: boolean };
    }).getPerformanceDiagnostics(),
  }));
  expect(pageErrors).toEqual([]);
  expect(after.phase).toBe('playing');
  expect(after.time - before).toBeGreaterThan(0.75);
  expect(after.diagnostics.activeProjectiles).toBe(0);
  expect(after.diagnostics.pendingLethals).toBe(0);
  expect(after.diagnostics.watchdogHealthy).toBe(true);
});

test('renderer disposal returns near baseline after flying-enemy and tower/defender churn', async ({ page }) => {
  test.setTimeout(hostedCI ? 120_000 : 45_000);
  await page.goto('/');
  await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const scene = window.__VERDANT_RIFT_GAME__!.scene.getScene('battle') as unknown as {
      tweens: { timeScale: number };
      time: { timeScale: number };
    };
    // This is a lifecycle stress test, not an animation-duration test. Advance
    // renderer-owned exits quickly so cleanup assertions do not depend on the
    // host's GPU/frame cadence; every resource count is still checked exactly.
    scene.tweens.timeScale = 8;
    scene.time.timeScale = 8;
  });

  const diagnostics = () => page.evaluate(() => {
    const scene = window.__VERDANT_RIFT_GAME__!.scene.getScene('battle') as unknown as {
      getPerformanceDiagnostics(): {
        enemyViews: number;
        defenderViews: number;
        towerViews: number;
        displayObjects: number;
        tweens: number;
        timers: number;
        watchdogHealthy: boolean;
      };
    };
    return scene.getPerformanceDiagnostics();
  });
  const baseline = await diagnostics();

  await page.evaluate(() => {
    const controller = window.__VERDANT_RIFT__!;
    const simulation = controller.simulation as unknown as {
      waveIndex: number;
      spawnEnemy(type: 'wisp', wave: number): void;
    };
    simulation.waveIndex = 1;
    for (let index = 0; index < 40; index += 1) simulation.spawnEnemy('wisp', 1);
  });
  await expect.poll(async () => (await diagnostics()).enemyViews).toBe(40);
  expect((await diagnostics()).tweens).toBeGreaterThanOrEqual(baseline.tweens + 40);
  await page.evaluate(() => {
    const snapshot = window.__VERDANT_RIFT__!.snapshot();
    snapshot.enemies.forEach((enemy) => { enemy.alive = false; });
  });
  await expect.poll(async () => (await diagnostics()).enemyViews).toBe(0);
  await expect.poll(async () => {
    const current = await diagnostics();
    return current.tweens <= baseline.tweens + 2
      && current.timers <= baseline.timers + 2;
  }, { timeout: hostedCI ? 20_000 : 5_000 }).toBe(true);
  const afterWisps = await diagnostics();
  expect(afterWisps.tweens).toBeLessThanOrEqual(baseline.tweens + 2);
  expect(afterWisps.timers).toBeLessThanOrEqual(baseline.timers + 2);

  for (let cycle = 0; cycle < 30; cycle += 1) {
    await page.evaluate((iteration) => {
      const controller = window.__VERDANT_RIFT__!;
      const simulation = controller.simulation as unknown as {
        gold: number;
        buildTower(padIndex: number, type: 'thorn' | 'ember' | 'aegis' | 'astral'): boolean;
        upgradeTower(uid: number): boolean;
        chooseBranch(uid: number, branch: 'left' | 'right'): boolean;
      };
      simulation.gold = 99_999;
      const types = ['thorn', 'ember', 'aegis', 'astral'] as const;
      const type = types[iteration % types.length]!;
      if (!simulation.buildTower(0, type)) throw new Error(`Build failed on churn cycle ${iteration}.`);
      const tower = controller.snapshot().towers[0]!;
      simulation.upgradeTower(tower.uid);
      simulation.upgradeTower(tower.uid);
      simulation.chooseBranch(tower.uid, iteration % 2 === 0 ? 'left' : 'right');
    }, cycle);
    await expect.poll(async () => (await diagnostics()).towerViews).toBe(1);
    if (cycle === 0) {
      const apparatus = await page.evaluate(() => {
        const tower = window.__VERDANT_RIFT__!.snapshot().towers[0]!;
        const scene = window.__VERDANT_RIFT_GAME__!.scene.getScene('battle');
        const view = scene.children.getByName(`tower-view-${tower.uid}`) as unknown as { getData(key: string): { getData(key: string): unknown } };
        const left = view.getData('leftApp');
        const right = view.getData('rightApp');
        return { leftActive: Boolean(left.getData('apparatusActive')), rightActive: Boolean(right.getData('apparatusActive')) };
      });
      expect(apparatus).toEqual({ leftActive: true, rightActive: false });
    }
    await page.evaluate(() => {
      const controller = window.__VERDANT_RIFT__!;
      const simulation = controller.simulation;
      const tower = controller.snapshot().towers[0]!;
      simulation.sellTower(tower.uid);
    });
    await expect.poll(async () => (await diagnostics()).towerViews).toBe(0);
  }

  if (hostedCI) {
    await page.evaluate(() => {
      const scene = window.__VERDANT_RIFT_GAME__!.scene.getScene('battle') as unknown as {
        tweens: { getTweens(): Array<{ totalDuration: number; complete(): unknown }> };
      };
      // SwiftShader can leave finite exit tweens pending despite an accelerated
      // clock. Complete only finite presentation work; infinite ambient loops
      // remain active and are accounted for by the captured baseline.
      scene.tweens.getTweens()
        .filter((tween) => Number.isFinite(tween.totalDuration))
        .forEach((tween) => tween.complete());
    });
  }

  // Cleanup is frame-driven. Poll the actual bounded baseline so software
  // rendering cannot fail merely because a fixed wall-clock sleep elapsed
  // before its final disposal frame. Return structured deltas so CI failures
  // identify the exact leaking resource instead of an opaque boolean.
  await expect.poll(async () => {
    const current = await diagnostics();
    return {
      enemyViews: current.enemyViews,
      towerViews: current.towerViews,
      defenderViews: current.defenderViews,
      tweenExcess: Math.max(0, current.tweens - baseline.tweens - 2),
      timerExcess: Math.max(0, current.timers - baseline.timers - 2),
      displayExcess: Math.max(0, current.displayObjects - baseline.displayObjects - 2),
      watchdogHealthy: current.watchdogHealthy,
    };
  }, { timeout: hostedCI ? 20_000 : 5_000 }).toEqual({
    enemyViews: 0,
    towerViews: 0,
    defenderViews: 0,
    tweenExcess: 0,
    timerExcess: 0,
    displayExcess: 0,
    watchdogHealthy: true,
  });
  const settled = await diagnostics();
  expect(settled.enemyViews).toBe(0);
  expect(settled.towerViews).toBe(0);
  expect(settled.defenderViews).toBe(0);
  expect(settled.tweens).toBeLessThanOrEqual(baseline.tweens + 2);
  expect(settled.timers).toBeLessThanOrEqual(baseline.timers + 2);
  expect(settled.displayObjects).toBeLessThanOrEqual(baseline.displayObjects + 2);
  expect(settled.watchdogHealthy).toBe(true);
});
