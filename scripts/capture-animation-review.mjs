import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const browserErrors = [];
page.on('pageerror', (error) => browserErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') browserErrors.push(message.text());
});

await page.goto('http://127.0.0.1:4173/');
await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();
await page.evaluate(() => {
  const controller = window.__VERDANT_RIFT__;
  if (!controller) throw new Error('Animation review controller is unavailable.');
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
  for (const type of ['marauder', 'brute', 'marauder', 'brute', 'marauder', 'brute', 'marauder']) {
    simulation.spawnEnemy(type, 7);
  }
  for (const enemy of simulation.enemies) {
    enemy.x = origin.x;
    enemy.y = origin.y;
    enemy.progress = 0.37;
    enemy.hp = 12000;
    enemy.maxHp = 12000;
  }
  for (let frame = 0; frame < 180; frame += 1) simulation.update(1 / 60);
  simulation.spawnQueue = [{ at: 999, enemy: 'skitter', wave: 7 }];
  simulation.waveActive = true;
  simulation.speed = 1;
  simulation.drainEvents();
});

await mkdir('tmp/animation-review', { recursive: true });
await page.waitForTimeout(350);
for (let frame = 0; frame < 8; frame += 1) {
  await page.screenshot({ path: `tmp/animation-review/frame-${String(frame).padStart(2, '0')}.png` });
  await page.waitForTimeout(90);
}

const state = await page.evaluate(() => {
  const snapshot = window.__VERDANT_RIFT__?.snapshot();
  return snapshot ? {
    enemies: snapshot.enemies.filter((enemy) => enemy.alive).length,
    engagedEnemies: snapshot.enemies.filter((enemy) => enemy.engagedAllyUid).length,
    engagedHeroes: snapshot.heroes.filter((hero) => hero.engagedEnemyUid !== null).length,
    engagedDefenders: snapshot.defenders.filter((defender) => defender.engagedEnemyUid !== null).length,
  } : null;
});

await browser.close();
if (browserErrors.length) throw new Error(`Browser errors:\n${browserErrors.join('\n')}`);
console.log(JSON.stringify(state));
