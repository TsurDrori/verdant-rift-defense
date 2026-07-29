import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
await page.goto('http://127.0.0.1:4173/');
await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();
await page.evaluate(() => {
  const controller = window.__VERDANT_RIFT__;
  if (!controller) throw new Error('Review controller is unavailable.');
  const simulation = controller.simulation;
  simulation.gold = 5000;
  simulation.waveIndex = 7;
  controller.selectPad(4);
  controller.build('aegis');
  controller.upgrade();
  controller.upgrade();
  controller.branch('left');
  controller.clearSelection();
  simulation.towers[0].disabledTime = 999;
  const origin = { x: 1258, y: 355 };
  for (const hero of simulation.heroes) {
    hero.x = origin.x;
    hero.y = origin.y;
    hero.target = { ...origin };
  }
  simulation.enemies = [];
  simulation.spawnQueue = [];
  for (let index = 0; index < 7; index += 1) simulation.spawnEnemy('brute', 7);
  for (const enemy of simulation.enemies) {
    enemy.x = origin.x;
    enemy.y = origin.y;
    enemy.progress = 0.37;
    enemy.hp = 10000;
    enemy.maxHp = 10000;
  }
  for (let frame = 0; frame < 150; frame += 1) simulation.update(1 / 60);
  simulation.spawnQueue = [{ at: 999, enemy: 'skitter', wave: 7 }];
  simulation.waveActive = true;
});
await page.waitForTimeout(520);
await page.evaluate(() => {
  document.querySelector('[data-toast-stack]')?.replaceChildren();
  window.__VERDANT_RIFT_GAME__?.loop.sleep();
});
await mkdir('test-results/screenshots', { recursive: true });
await page.screenshot({ path: 'test-results/screenshots/duel-staging.png' });
await browser.close();
