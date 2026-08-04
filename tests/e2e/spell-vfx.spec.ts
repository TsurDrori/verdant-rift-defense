import { expect, test } from '@playwright/test';

async function enterBattle(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.snapshot().phase)).toBe('playing');
}

async function castPrimary(page: import('@playwright/test').Page, heroId: 'kael' | 'lyra'): Promise<boolean> {
  return page.evaluate((id) => {
    const controller = window.__VERDANT_RIFT__!;
    const hero = controller.snapshot().heroes.find((candidate) => candidate.id === id)!;
    hero.ultimateCooldown = 0;
    hero.spellCooldowns[id === 'kael' ? 'rift-quake' : 'starfall'] = 0;
    return controller.simulation.useAbility(id, { x: hero.x + 62, y: hero.y - 18 });
  }, heroId);
}

async function spellDiagnostics(page: import('@playwright/test').Page): Promise<{
  activeSpellFx: number;
  peakSpellFx: number;
  spellFxObjects: number;
  spellFxCompleted: number;
  spellFxDropped: number;
}> {
  return page.evaluate(() => {
    const scene = window.__VERDANT_RIFT_GAME__!.scene.getScene('battle') as unknown as {
      getPerformanceDiagnostics(): {
        activeSpellFx: number;
        peakSpellFx: number;
        spellFxObjects: number;
        spellFxCompleted: number;
        spellFxDropped: number;
      };
    };
    return scene.getPerformanceDiagnostics();
  });
}

test('gives Kael and Lyra distinct layered primary spell rigs and cleans every object', async ({ page }) => {
  await enterBattle(page);

  expect(await castPrimary(page, 'kael')).toBe(true);
  await expect.poll(() => spellDiagnostics(page).then((result) => result.activeSpellFx)).toBe(1);
  const kaelRig = await page.evaluate(() => {
    const scene = window.__VERDANT_RIFT_GAME__!.scene.getScene('battle');
    const root = scene.children.list.find((child) => child.name.startsWith('spell-fx:rift-quake:')) as unknown as { getData(key: string): unknown; list: unknown[] } | undefined;
    return root ? { spell: root.getData('spell'), hero: root.getData('hero'), phase: root.getData('phase'), children: root.list.length } : null;
  });
  expect(kaelRig).toMatchObject({ spell: 'rift-quake', hero: 'kael' });
  expect(kaelRig?.children).toBeGreaterThanOrEqual(30);
  await expect.poll(() => spellDiagnostics(page).then((result) => result.activeSpellFx), { timeout: 2_500 }).toBe(0);

  expect(await castPrimary(page, 'lyra')).toBe(true);
  await expect.poll(() => spellDiagnostics(page).then((result) => result.activeSpellFx)).toBe(1);
  const lyraRig = await page.evaluate(() => {
    const scene = window.__VERDANT_RIFT_GAME__!.scene.getScene('battle');
    const root = scene.children.list.find((child) => child.name.startsWith('spell-fx:starfall:')) as unknown as { getData(key: string): unknown; list: unknown[] } | undefined;
    return root ? { spell: root.getData('spell'), hero: root.getData('hero'), phase: root.getData('phase'), children: root.list.length } : null;
  });
  expect(lyraRig).toMatchObject({ spell: 'starfall', hero: 'lyra' });
  expect(lyraRig?.children).toBeGreaterThanOrEqual(18);
  expect(lyraRig?.children).not.toBe(kaelRig?.children);
  await expect.poll(() => spellDiagnostics(page).then((result) => result.activeSpellFx), { timeout: 2_500 }).toBe(0);

  const final = await spellDiagnostics(page);
  expect(final.spellFxCompleted).toBe(2);
  expect(final.spellFxObjects).toBe(0);
  expect(final.spellFxDropped).toBe(0);
});

test('spell presentation follows 2x time and reduced-motion cleanup bounds', async ({ page }) => {
  await enterBattle(page);
  await page.getByRole('button', { name: 'Toggle battle speed' }).click();
  expect(await page.evaluate(() => window.__VERDANT_RIFT__!.snapshot().speed)).toBe(2);

  const started = Date.now();
  expect(await castPrimary(page, 'lyra')).toBe(true);
  await expect.poll(() => spellDiagnostics(page).then((result) => result.activeSpellFx)).toBe(1);
  await expect.poll(() => spellDiagnostics(page).then((result) => result.activeSpellFx), { timeout: 1_500 }).toBe(0);
  expect(Date.now() - started).toBeLessThan(1_250);

  await page.evaluate(() => document.documentElement.classList.add('reduce-motion'));
  const reducedStarted = Date.now();
  expect(await castPrimary(page, 'kael')).toBe(true);
  await expect.poll(() => spellDiagnostics(page).then((result) => result.activeSpellFx)).toBe(1);
  await expect.poll(() => spellDiagnostics(page).then((result) => result.activeSpellFx), { timeout: 1_000 }).toBe(0);
  expect(Date.now() - reducedStarted).toBeLessThan(1_000);
  expect((await spellDiagnostics(page)).spellFxObjects).toBe(0);
});

test('level-four actives carry their own ward and brand silhouettes', async ({ page }) => {
  await enterBattle(page);
  const inspect = async (hero: 'kael' | 'lyra', spell: 'warden-pulse' | 'falling-constellation', expectedChild: string): Promise<boolean> => {
    await page.evaluate(({ heroId, spellId }) => {
      const scene = window.__VERDANT_RIFT_GAME__!.scene.getScene('battle') as unknown as { handleEvent(event: unknown): void };
      scene.handleEvent({ type: 'hero-spell-cast', hero: heroId, spell: spellId, point: { x: 800, y: 430 }, radius: 118, targets: [] });
    }, { heroId: hero, spellId: spell });
    await expect.poll(() => spellDiagnostics(page).then((result) => result.activeSpellFx)).toBe(1);
    return page.evaluate(({ spellId, childName }) => {
      const scene = window.__VERDANT_RIFT_GAME__!.scene.getScene('battle');
      const root = scene.children.list.find((child) => child.name.startsWith(`spell-fx:${spellId}:`)) as unknown as { list: Array<{ name: string }> } | undefined;
      return root?.list.some((child) => child.name === childName) ?? false;
    }, { spellId: spell, childName: expectedChild });
  };

  expect(await inspect('kael', 'warden-pulse', 'warden-pulse:ward')).toBe(true);
  await expect.poll(() => spellDiagnostics(page).then((result) => result.activeSpellFx), { timeout: 2_500 }).toBe(0);
  expect(await inspect('lyra', 'falling-constellation', 'falling-constellation:brand')).toBe(true);
  await expect.poll(() => spellDiagnostics(page).then((result) => result.activeSpellFx), { timeout: 2_500 }).toBe(0);
});

test('caps pathological spell bursts without leaking presentation rigs', async ({ page }) => {
  await enterBattle(page);
  await page.evaluate(() => {
    const scene = window.__VERDANT_RIFT_GAME__!.scene.getScene('battle') as unknown as {
      handleEvent(event: unknown): void;
    };
    for (let index = 0; index < 10; index += 1) {
      scene.handleEvent({
        type: 'hero-spell-cast',
        hero: index % 2 ? 'lyra' : 'kael',
        spell: index % 2 ? 'falling-constellation' : 'warden-pulse',
        point: { x: 760 + index * 7, y: 430 + index * 4 },
        radius: 118,
        targets: [],
      });
    }
  });

  const pressure = await spellDiagnostics(page);
  expect(pressure.activeSpellFx).toBeLessThanOrEqual(4);
  expect(pressure.peakSpellFx).toBeLessThanOrEqual(4);
  expect(pressure.spellFxDropped).toBeGreaterThan(0);
  expect(pressure.spellFxObjects).toBeLessThan(260);
  await expect.poll(() => spellDiagnostics(page).then((result) => result.activeSpellFx), { timeout: 3_000 }).toBe(0);
  expect((await spellDiagnostics(page)).spellFxObjects).toBe(0);
});

test('renders authoritative artifact-scaled cast and effect radii for each armed Lyra spell', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Lyra mission artifact' }).selectOption('far-star-lens');
  await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();
  await expect(page.locator('canvas')).toBeVisible();

  const inspectRings = async (): Promise<{
    castRadius: number;
    effectRadius: number;
    castData: number;
    effectData: number;
    castVisible: boolean;
    effectVisible: boolean;
    authoritative: { castRange: number; effectRadius: number } | null;
  }> => page.evaluate(() => {
    const controller = window.__VERDANT_RIFT__!;
    const scene = window.__VERDANT_RIFT_GAME__!.scene.getScene('battle');
    const cast = scene.children.getByName('spell-cast-range-preview') as unknown as { radius: number; visible: boolean; getData(key: string): unknown };
    const effect = scene.children.getByName('spell-effect-radius-preview') as unknown as { radius: number; visible: boolean; getData(key: string): unknown };
    const armed = controller.armedSpell!;
    return {
      castRadius: cast.radius,
      effectRadius: effect.radius,
      castData: cast.getData('authoritativeRadius') as number,
      effectData: effect.getData('authoritativeRadius') as number,
      castVisible: cast.visible,
      effectVisible: effect.visible,
      authoritative: controller.getHeroSpellTargeting(armed.heroId, armed.spellId),
    };
  });

  const moveNearLyra = async (): Promise<void> => {
    const hero = await page.evaluate(() => window.__VERDANT_RIFT__!.snapshot().heroes.find((candidate) => candidate.id === 'lyra')!);
    const canvas = await page.locator('canvas').boundingBox();
    if (!canvas) throw new Error('Battlefield canvas did not receive a layout box.');
    await page.mouse.move(canvas.x + canvas.width * ((hero.x - 42) / 1600), canvas.y + canvas.height * ((hero.y - 28) / 900));
  };

  await page.getByRole('button', { name: /Cast Starfall.*Lyra/ }).click();
  await moveNearLyra();
  await expect.poll(() => inspectRings().then((result) => result.effectVisible)).toBe(true);
  const starfall = await inspectRings();
  expect(starfall.authoritative?.castRange).toBeCloseTo(185.6, 5);
  expect(starfall.authoritative?.effectRadius).toBeCloseTo(185.6, 5);
  expect(starfall.castRadius).toBeCloseTo(starfall.authoritative!.castRange, 5);
  expect(starfall.effectRadius).toBeCloseTo(starfall.authoritative!.effectRadius, 5);
  expect(starfall.castData).toBeCloseTo(starfall.authoritative!.castRange, 5);
  expect(starfall.effectData).toBeCloseTo(starfall.authoritative!.effectRadius, 5);
  expect(starfall.castVisible).toBe(true);
  await page.screenshot({ path: 'test-results/spell-vfx/starfall-lens-radii-desktop.png' });
  await page.getByRole('button', { name: 'Cancel spell targeting' }).click();

  await page.evaluate(() => {
    const controller = window.__VERDANT_RIFT__!;
    const hero = (controller.simulation as unknown as { heroes: Array<{ id: string; level: number; unlockedSpells: string[]; spellCooldowns: Record<string, number> }> }).heroes.find((candidate) => candidate.id === 'lyra')!;
    hero.level = 4;
    hero.unlockedSpells = ['starfall', 'astral-echo', 'falling-constellation'];
    hero.spellCooldowns['falling-constellation'] = 0;
    controller.update(0);
  });
  const constellationButton = page.getByRole('button', { name: /Cast Falling Constellation.*Lyra/ });
  await expect(constellationButton).toBeVisible();
  await constellationButton.click();
  await moveNearLyra();
  await expect.poll(() => inspectRings().then((result) => result.effectVisible)).toBe(true);
  const constellation = await inspectRings();
  expect(constellation.authoritative?.castRange).toBeCloseTo(218.08, 5);
  expect(constellation.authoritative?.effectRadius).toBeCloseTo(129.92, 5);
  expect(constellation.castRadius).toBeCloseTo(constellation.authoritative!.castRange, 5);
  expect(constellation.effectRadius).toBeCloseTo(constellation.authoritative!.effectRadius, 5);
  expect(constellation.effectRadius).not.toBeCloseTo(constellation.castRadius, 1);
  await page.screenshot({ path: 'test-results/spell-vfx/falling-constellation-lens-radii-desktop.png' });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await page.evaluate(() => {
    const controller = window.__VERDANT_RIFT__!;
    const hero = controller.snapshot().heroes.find((candidate) => candidate.id === 'lyra')!;
    controller.previewSpellTarget({ x: hero.x - 42, y: hero.y - 28 });
  });
  await expect.poll(() => inspectRings().then((result) => result.effectVisible)).toBe(true);
  const commandBounds = await page.locator('[data-cast-command]').boundingBox();
  expect(commandBounds).not.toBeNull();
  expect(commandBounds!.x).toBeGreaterThanOrEqual(0);
  expect(commandBounds!.x + commandBounds!.width).toBeLessThanOrEqual(390);
  expect(commandBounds!.y).toBeGreaterThanOrEqual(0);
  await page.screenshot({ path: 'test-results/spell-vfx/falling-constellation-lens-radii-portrait.png' });
});

test('keeps real-wave enemies and health bars above restrained impact decals', async ({ page }) => {
  await enterBattle(page);
  await page.evaluate(() => {
    const controller = window.__VERDANT_RIFT__!;
    controller.simulation.startWave();
    for (let index = 0; index < 40; index += 1) controller.update(1 / 60);
  });
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.snapshot().enemies.filter((enemy) => enemy.alive).length)).toBeGreaterThan(0);
  await page.evaluate(() => {
    const controller = window.__VERDANT_RIFT__!;
    const enemy = controller.snapshot().enemies.find((candidate) => candidate.alive)!;
    enemy.progress = 0.5;
    enemy.laneOffset = 0;
    enemy.laneTarget = 0;
    controller.update(1 / 60);
  });
  await page.waitForTimeout(60);

  const castOnDurableWaveEnemy = async (heroId: 'kael' | 'lyra'): Promise<void> => {
    await page.evaluate((id) => {
      const controller = window.__VERDANT_RIFT__!;
      const enemy = controller.snapshot().enemies.find((candidate) => candidate.alive)!;
      enemy.maxHp = 1_000;
      enemy.hp = 1_000;
      const hero = controller.snapshot().heroes.find((candidate) => candidate.id === id)!;
      hero.x = enemy.x + 54;
      hero.y = enemy.y + 12;
      hero.target = { x: hero.x, y: hero.y };
      hero.alive = true;
      hero.hp = hero.maxHp;
      hero.ultimateCooldown = 0;
      hero.spellCooldowns[id === 'kael' ? 'rift-quake' : 'starfall'] = 0;
    }, heroId);
    // Let the existing real-wave view establish the inflated durability as its
    // baseline; the actual spell hit then exposes the health bar naturally.
    await page.waitForTimeout(60);
    expect(await page.evaluate((id) => {
      const controller = window.__VERDANT_RIFT__!;
      const enemy = controller.snapshot().enemies.find((candidate) => candidate.alive)!;
      return controller.simulation.useAbility(id, { x: enemy.x, y: enemy.y });
    }, heroId)).toBe(true);
  };

  await castOnDurableWaveEnemy('lyra');
  await page.waitForTimeout(650);
  const starfallReadability = await page.evaluate(() => {
    const scene = window.__VERDANT_RIFT_GAME__!.scene.getScene('battle');
    const enemy = window.__VERDANT_RIFT__!.snapshot().enemies.find((candidate) => candidate.alive)!;
    const view = scene.children.getByName(`enemy-view-${enemy.uid}`) as unknown as { depth: number; visible: boolean; getData(key: string): { alpha: number } } | null;
    const decal = scene.children.getByName('spell-ground-decal:starfall') as unknown as { depth: number; alpha: number; getData(key: string): unknown } | null;
    return {
      enemyVisible: view?.visible ?? false,
      enemyDepth: view?.depth ?? 0,
      hpAlpha: view?.getData('hp').alpha ?? 0,
      decalDepth: decal?.depth ?? Number.POSITIVE_INFINITY,
      decalAlpha: decal?.alpha ?? 1,
      layer: decal?.getData('readabilityLayer'),
    };
  });
  expect(starfallReadability.enemyVisible).toBe(true);
  expect(starfallReadability.hpAlpha).toBeGreaterThan(0.8);
  expect(starfallReadability.decalDepth).toBeLessThan(starfallReadability.enemyDepth);
  expect(starfallReadability.decalAlpha).toBeLessThanOrEqual(0.29);
  expect(starfallReadability.layer).toBe('beneath-actors');
  await page.screenshot({ path: 'test-results/spell-vfx/real-wave-starfall-readable.png' });
  await expect.poll(() => spellDiagnostics(page).then((result) => result.activeSpellFx), { timeout: 2_500 }).toBe(0);

  await castOnDurableWaveEnemy('kael');
  await page.waitForTimeout(430);
  const quakeReadability = await page.evaluate(() => {
    const scene = window.__VERDANT_RIFT_GAME__!.scene.getScene('battle');
    const enemy = window.__VERDANT_RIFT__!.snapshot().enemies.find((candidate) => candidate.alive)!;
    const view = scene.children.getByName(`enemy-view-${enemy.uid}`) as unknown as { depth: number; visible: boolean; getData(key: string): { alpha: number } } | null;
    const decal = scene.children.getByName('spell-ground-decal:rift-quake') as unknown as { depth: number; alpha: number; getData(key: string): unknown } | null;
    return {
      enemyVisible: view?.visible ?? false,
      enemyDepth: view?.depth ?? 0,
      hpAlpha: view?.getData('hp').alpha ?? 0,
      decalDepth: decal?.depth ?? Number.POSITIVE_INFINITY,
      decalAlpha: decal?.alpha ?? 1,
      layer: decal?.getData('readabilityLayer'),
    };
  });
  expect(quakeReadability.enemyVisible).toBe(true);
  expect(quakeReadability.hpAlpha).toBeGreaterThan(0.8);
  expect(quakeReadability.decalDepth).toBeLessThan(quakeReadability.enemyDepth);
  expect(quakeReadability.decalAlpha).toBeLessThanOrEqual(0.38);
  expect(quakeReadability.layer).toBe('beneath-actors');
  await page.screenshot({ path: 'test-results/spell-vfx/real-wave-rift-quake-readable.png' });
});
