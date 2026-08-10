import { expect, test } from '@playwright/test';

test('shows exact LV, HP and XP and announces an earned magic milestone', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();

  const card = page.locator('[data-hero-card="kael"]');
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: /Select and expand Kael/ }).click();
  await expect(card.locator('[data-hero-level]')).toHaveText('LV 1');
  await expect(card.locator('[data-hero-hp]')).toHaveText('HP 420 / 420');
  await expect(card.locator('[data-hero-xp]')).toHaveText('0 / 40 XP');

  await page.evaluate(() => {
    const controller = window.__VERDANT_RIFT__!;
    const simulation = controller.simulation as unknown as {
      waveIndex: number;
      spawnEnemy(type: 'brute', wave: number): void;
      hitEnemy(
        enemy: ReturnType<typeof controller.snapshot>['enemies'][number],
        damage: number,
        damageType: 'true',
        source: { x: number; y: number },
        splash: number,
        color: number,
        style: 'kael',
        owner: { kind: 'hero'; heroId: 'kael'; channel: 'basic' },
      ): boolean;
    };
    simulation.waveIndex = 1;
    simulation.spawnEnemy('brute', 1);
    const enemy = controller.snapshot().enemies.at(-1)!;
    const hero = controller.snapshot().heroes.find((candidate) => candidate.id === 'kael')!;
    enemy.hp = 1;
    simulation.hitEnemy(enemy, 10_000, 'true', hero, 0, hero.accent, 'kael', { kind: 'hero', heroId: 'kael', channel: 'basic' });
    const events = controller.drainEvents();
    // This focused fixture bypasses BattleScene's ordinary projectile flight;
    // settle its lethal presentation token explicitly before forcing a result.
    events.filter((event) => event.type === 'enemy-hit' && event.lethal).forEach((event) => controller.present(event));
    controller.update(0);
  });

  await expect(card.locator('[data-hero-level]')).toHaveText('LV 2');
  await expect(card.locator('[data-hero-hp]')).toHaveText('HP 441 / 441');
  await expect(card.locator('[data-hero-xp]')).toHaveText('5 / 180 XP');
  await expect(card.locator('.hero-milestone.is-earned')).toHaveCount(1);
  await expect(page.getByText(/Kael reaches LV 2.*Riftbrand unlocked/)).toBeVisible();
  expect(await page.evaluate(() => window.__VERDANT_RIFT__!.snapshot().heroes.find((hero) => hero.id === 'lyra')?.xp)).toBe(0);

  await page.evaluate(() => {
    const controller = window.__VERDANT_RIFT__!;
    (controller.simulation as unknown as { phase: 'victory' }).phase = 'victory';
    controller.update(0);
  });
  await expect(page.locator('[data-result-hero="kael"]')).toContainText('Kael • LV 2');
  await expect(page.locator('[data-result-hero="kael"]')).toContainText('1 OWN KILLS • 45 XP');
  await expect(page.locator('[data-result-hero="lyra"]')).toContainText('Lyra • LV 1');
  await expect(page.locator('[data-result-hero="lyra"]')).toContainText('0 OWN KILLS • 0 XP');
});
