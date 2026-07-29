import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await page.goto('http://127.0.0.1:4173/');
await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();
await page.evaluate(() => {
  const controller = window.__VERDANT_RIFT__;
  if (!controller) throw new Error('Review controller is unavailable.');
  controller.simulation.gold = 2800;
  const builds = [
    [0, 'thorn', 'left'],
    [1, 'ember', 'right'],
    [2, 'astral', 'left'],
    [3, 'aegis', 'left'],
  ];
  for (const [pad, type, branch] of builds) {
    controller.selectPad(pad);
    controller.build(type);
    controller.upgrade();
    controller.upgrade();
    controller.branch(branch);
  }
  controller.clearSelection();
  const simulation = controller.simulation;
  simulation.drainEvents();
  simulation.waveIndex = 5;
  simulation.waveActive = true;
  simulation.spawnQueue = [];
  simulation.enemies = [];
  const types = ['skitter','marauder','wisp','brute','skitter','marauder','wisp','skitter','brute','marauder','wisp','skitter','skitter'];
  for (const type of types) simulation.spawnEnemy(type);
  simulation.enemies.forEach((enemy, index) => {
    enemy.progress = 0.08 + index * 0.038;
    enemy.hp = 2400;
    enemy.maxHp = 2400;
  });
  simulation.updateEnemies(0);
  simulation.spawnQueue = [{ at: 999, enemy: 'skitter', wave: 5 }];
  simulation.nextWaveReady = false;
  simulation.intermission = 0;
});
await page.waitForTimeout(100);
await page.evaluate(() => {
  const simulation = window.__VERDANT_RIFT__?.simulation;
  if (!simulation) return;
  const shots = [
    ['thorn', { x: 333, y: 147 }, 0xb7dc69, 0],
    ['ember', { x: 575, y: 327 }, 0xffa24c, 54],
    ['astral', { x: 1025, y: 207 }, 0xcf9eff, 0],
    ['aegis', { x: 1244, y: 263 }, 0xbde5d8, 0],
  ];
  const showcaseTargets = [simulation.enemies[4], simulation.enemies[6], simulation.enemies[9], simulation.enemies[12]];
  shots.forEach(([style, source, color, splash], index) => {
    const target = showcaseTargets[index];
    if (target) simulation.hitEnemy(target, 1, style === 'astral' ? 'arcane' : 'physical', source, splash, color, style);
  });
});
const lyraCast = await page.evaluate(() => {
  const controller = window.__VERDANT_RIFT__;
  controller?.castAtFrontline('lyra');
  return controller?.snapshot().heroes.find((hero) => hero.id === 'lyra')?.ultimateCooldown ?? 0;
});
if (lyraCast <= 0) throw new Error('Lyra review cast did not fire.');
await page.waitForTimeout(105);
await page.evaluate(() => document.querySelector('[data-toast-stack]')?.replaceChildren());
await page.evaluate(() => window.__VERDANT_RIFT_GAME__?.loop.sleep());
await mkdir('test-results/screenshots', { recursive: true });
await page.screenshot({ path: 'test-results/screenshots/combat-pass-2.png' });
await page.evaluate(() => window.__VERDANT_RIFT_GAME__?.loop.wake());
await page.waitForTimeout(1150);
await page.evaluate(() => {
  const simulation = window.__VERDANT_RIFT__?.simulation;
  if (!simulation) return;
  simulation.enemies = [];
  simulation.waveIndex = 12;
  simulation.waveActive = true;
  simulation.spawnQueue = [{ at: 999, enemy: 'skitter', wave: 12 }];
  simulation.spawnEnemy('bloomlord');
  const boss = simulation.enemies[0];
  boss.maxHp = 6800;
  boss.hp = 4600;
  boss.progress = 0.53;
  boss.bossPhase = 0;
  simulation.updateEnemies(0);
  simulation.towers.forEach((tower) => { tower.cooldown = 0; tower.disabledTime = 0; });
  simulation.updateBossStrikes();
});
await page.waitForTimeout(130);
await page.evaluate(() => document.querySelector('[data-toast-stack]')?.replaceChildren());
await page.evaluate(() => window.__VERDANT_RIFT_GAME__?.loop.sleep());
await page.screenshot({ path: 'test-results/screenshots/boss-pass-2.png' });
await page.evaluate(() => {
  window.__VERDANT_RIFT_GAME__?.loop.wake();
  const simulation = window.__VERDANT_RIFT__?.simulation;
  if (!simulation) return;
  simulation.pendingBossStrikes.forEach((strike) => { strike.at = simulation.time; });
  simulation.updateBossStrikes();
});
await page.waitForTimeout(120);
await page.evaluate(() => document.querySelector('[data-toast-stack]')?.replaceChildren());
await page.evaluate(() => window.__VERDANT_RIFT_GAME__?.loop.sleep());
await page.screenshot({ path: 'test-results/screenshots/boss-disabled.png' });
await browser.close();
