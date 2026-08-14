import { expect, test, type Page } from '@playwright/test';

async function enterBattle(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.snapshot().phase)).toBe('playing');
}

async function worldToScreen(page: Page, point: { x: number; y: number }): Promise<{ x: number; y: number }> {
  const bounds = await page.locator('canvas').boundingBox();
  if (!bounds) throw new Error('Battlefield canvas did not receive a layout box.');
  return { x: bounds.x + bounds.width * point.x / 1600, y: bounds.y + bounds.height * point.y / 900 };
}

async function clickWorld(page: Page, point: { x: number; y: number }): Promise<void> {
  const screen = await worldToScreen(page, point);
  await page.mouse.click(screen.x, screen.y);
}

test('world hero selection expands its compact card automatically', async ({ page }) => {
  await enterBattle(page);
  const point = await page.evaluate(() => {
    const hero = window.__VERDANT_RIFT__!.snapshot().heroes.find((candidate) => candidate.id === 'kael')!;
    return { x: hero.x, y: hero.y };
  });
  await clickWorld(page, point);
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.selection)).toEqual({ kind: 'hero', heroId: 'kael' });
  await expect(page.locator('[data-hero-card="kael"]')).toHaveClass(/is-expanded/);
});

test('a selected hero owns the road under a tower while its crown stays selectable', async ({ page }) => {
  await enterBattle(page);
  const tower = await page.evaluate(() => {
    const controller = window.__VERDANT_RIFT__!;
    const geometry = controller.simulation.geometry;
    const candidate = geometry.buildPads
      .map((pad, padIndex) => ({ pad, padIndex, projection: geometry.project(pad) }))
      .sort((a, b) => a.projection.distance - b.projection.distance)[0]!;
    (controller.simulation as unknown as { gold: number }).gold = 9999;
    controller.selectPad(candidate.padIndex);
    controller.build('thorn');
    const built = controller.snapshot().towers.find((item) => item.padIndex === candidate.padIndex)!;
    controller.clearSelection();
    return {
      uid: built.uid,
      pad: { x: candidate.pad.x, y: candidate.pad.y },
      road: { x: candidate.projection.point.x, y: candidate.projection.point.y },
      distance: candidate.projection.distance,
    };
  });
  expect(tower.distance).toBeLessThanOrEqual(92);

  await page.locator('[data-hero-card="kael"] .hero-card-toggle').click();
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.selection.kind)).toBe('hero');
  await clickWorld(page, tower.road);
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.selection)).toEqual({ kind: 'hero', heroId: 'kael' });

  await clickWorld(page, { x: tower.pad.x, y: tower.pad.y - 76 });
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.selection)).toEqual({ kind: 'tower', towerUid: tower.uid });
});

test('world hover is sustained for heroes, tower crowns, and enemies without idle enemy tweens', async ({ page }) => {
  await enterBattle(page);
  const entities = await page.evaluate(() => {
    const controller = window.__VERDANT_RIFT__!;
    (controller.simulation as unknown as { gold: number }).gold = 9999;
    controller.selectPad(0);
    controller.build('thorn');
    controller.clearSelection();
    const simulation = controller.simulation as unknown as {
      waveIndex: number;
      spawnEnemy(type: 'marauder', wave: number): void;
      update(delta: number): void;
      enemies: Array<{ progress: number; routeId: string; laneOffset: number; x: number; y: number; slow: number; slowTime: number }>;
    };
    simulation.waveIndex = 1;
    simulation.spawnEnemy('marauder', 1);
    const enemy = simulation.enemies[0]!;
    enemy.progress = 0.08;
    Object.assign(enemy, controller.simulation.geometry.lanePoint(enemy.progress, enemy.laneOffset, enemy.routeId));
    enemy.slow = 0.65;
    enemy.slowTime = 100;
    simulation.update = () => {};
    const tower = controller.snapshot().towers[0]!;
    const pad = controller.simulation.geometry.buildPads[tower.padIndex]!;
    return { tower: { x: pad.x, y: pad.y - 76 }, towerUid: tower.uid };
  });
  await expect.poll(() => page.evaluate(() => {
    const scene = window.__VERDANT_RIFT_GAME__!.scene.getScene('battle') as unknown as {
      enemyViews: Map<number, { x: number; y: number }>;
    };
    return scene.enemyViews.size;
  })).toBe(1);

  const heroPoint = await page.evaluate(() => {
    const scene = window.__VERDANT_RIFT_GAME__!.scene.getScene('battle') as unknown as {
      heroViews: Map<string, { x: number; y: number }>;
    };
    const view = scene.heroViews.get('kael')!;
    return { x: view.x, y: view.y };
  });
  const heroScreen = await worldToScreen(page, heroPoint);
  await page.mouse.move(heroScreen.x, heroScreen.y);
  await expect.poll(() => page.evaluate(() => {
    const scene = window.__VERDANT_RIFT_GAME__!.scene.getScene('battle') as unknown as {
      heroViews: Map<string, { getData(key: string): unknown }>;
    };
    const view = scene.heroViews.get('kael')!;
    return { hovered: view.getData('isHovered'), visible: (view.getData('worldHoverHalo') as { visible: boolean }).visible };
  })).toEqual({ hovered: true, visible: true });
  await page.waitForTimeout(900);
  expect(await page.evaluate(() => {
    const scene = window.__VERDANT_RIFT_GAME__!.scene.getScene('battle') as unknown as { heroViews: Map<string, { getData(key: string): unknown }> };
    return (scene.heroViews.get('kael')!.getData('worldHoverHalo') as { visible: boolean }).visible;
  })).toBe(true);

  const towerScreen = await worldToScreen(page, entities.tower);
  await page.mouse.move(towerScreen.x, towerScreen.y);
  await expect.poll(() => page.evaluate((uid) => {
    const scene = window.__VERDANT_RIFT_GAME__!.scene.getScene('battle') as unknown as { towerViews: Map<number, { getData(key: string): unknown }> };
    const view = scene.towerViews.get(uid)!;
    return { hovered: view.getData('isHovered'), visible: (view.getData('worldHoverHalo') as { visible: boolean }).visible };
  }, entities.towerUid)).toEqual({ hovered: true, visible: true });

  const enemy = await page.evaluate(() => {
    const scene = window.__VERDANT_RIFT_GAME__!.scene.getScene('battle') as unknown as { enemyViews: Map<number, { x: number; y: number }> };
    const [uid, view] = [...scene.enemyViews.entries()][0]!;
    return { uid, point: { x: view.x, y: view.y } };
  });
  const enemyScreen = await worldToScreen(page, enemy.point);
  await page.mouse.move(enemyScreen.x, enemyScreen.y);
  await page.waitForTimeout(80);
  expect(await page.evaluate((uid) => {
    const scene = window.__VERDANT_RIFT_GAME__!.scene.getScene('battle') as unknown as { enemyViews: Map<number, { getData(key: string): unknown }> };
    const view = scene.enemyViews.get(uid)!;
    return { hovered: view.getData('isHovered'), visible: (view.getData('worldHoverHalo') as { visible: boolean }).visible };
  }, enemy.uid)).toEqual({ hovered: true, visible: true });
  await page.screenshot({ path: 'test-results/entity-interaction/enemy-hover.png' });

  await page.mouse.move(10, 400);
  await expect.poll(() => page.evaluate(() => {
    const scene = window.__VERDANT_RIFT_GAME__!.scene.getScene('battle') as unknown as { tweens: { getTweens(): unknown[] } };
    return scene.tweens.getTweens().filter((tween) => (tween as { isPlaying(): boolean }).isPlaying()).length;
  })).toBeLessThan(40);
});

test('enemies open a compact live inspector, but become road commands for a selected hero', async ({ page }) => {
  await enterBattle(page);
  const enemy = await page.evaluate(() => {
    const controller = window.__VERDANT_RIFT__!;
    const simulation = controller.simulation as unknown as {
      waveIndex: number;
      spawnEnemy(type: 'marauder', wave: number): void;
      update(delta: number): void;
      enemies: Array<{ uid: number; hp: number; maxHp: number; progress: number; routeId: string; laneOffset: number; x: number; y: number; slow: number; slowTime: number }>;
    };
    simulation.waveIndex = 1;
    simulation.spawnEnemy('marauder', 1);
    const enemy = simulation.enemies[0]!;
    enemy.progress = 0.08;
    Object.assign(enemy, controller.simulation.geometry.lanePoint(enemy.progress, enemy.laneOffset, enemy.routeId));
    enemy.slow = 0.65;
    enemy.slowTime = 100;
    simulation.update = () => {};
    return enemy.uid;
  });
  await expect.poll(() => page.evaluate((uid) => {
    const scene = window.__VERDANT_RIFT_GAME__!.scene.getScene('battle') as unknown as { enemyViews: Map<number, { x: number; y: number }> };
    const view = scene.enemyViews.get(uid);
    return view ? { x: view.x, y: view.y } : null;
  }, enemy)).not.toBeNull();
  const enemyPoint = await page.evaluate((uid) => {
    const scene = window.__VERDANT_RIFT_GAME__!.scene.getScene('battle') as unknown as { enemyViews: Map<number, { x: number; y: number }> };
    const view = scene.enemyViews.get(uid)!;
    return { x: view.x, y: view.y };
  }, enemy);

  await clickWorld(page, enemyPoint);
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.selection)).toEqual({ kind: 'enemy', enemyUid: enemy });
  const inspector = page.locator('[data-enemy-inspector]');
  await expect(inspector).toHaveClass(/is-visible/);
  await expect(inspector.locator('[data-enemy-name]')).toHaveText('Thorn Marauder');
  await expect(inspector.locator('[data-enemy-role]')).toContainText('GROUND');
  await expect(inspector.locator('[data-enemy-hp]')).toHaveText(/\d+ \/ \d+/);

  const injuredHp = await page.evaluate((uid) => {
    const controller = window.__VERDANT_RIFT__!;
    const enemyState = (controller.simulation as unknown as { enemies: Array<{ uid: number; hp: number; maxHp: number }> }).enemies.find((item) => item.uid === uid)!;
    enemyState.hp = enemyState.maxHp * 0.37;
    controller.update(0);
    return `${Math.ceil(enemyState.hp)} / ${Math.ceil(enemyState.maxHp)}`;
  }, enemy);
  await expect(inspector.locator('[data-enemy-hp]')).toHaveText(injuredHp);
  await page.screenshot({ path: 'test-results/entity-interaction/enemy-inspector.png' });

  await page.locator('[data-hero-card="kael"] .hero-card-toggle').click();
  await clickWorld(page, enemyPoint);
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT__!.selection)).toEqual({ kind: 'hero', heroId: 'kael' });
  await expect(inspector).not.toHaveClass(/is-visible/);
});

test('spell hover reveals semantic details without replacing the button', async ({ page }) => {
  await enterBattle(page);
  await page.locator('[data-hero-card="kael"] .hero-card-toggle').click();
  const spell = page.locator('[data-spell="rift-quake"]');
  const tooltip = page.locator('#spell-tip-kael-rift-quake');
  await spell.hover();
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText('Rift Quake');
  await expect(tooltip).toContainText(/recharge/);
  await expect(tooltip).toContainText(/cast/);
  await page.screenshot({ path: 'test-results/entity-interaction/spell-tooltip.png' });
});
