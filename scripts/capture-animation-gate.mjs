import { chromium } from '@playwright/test';
import { mkdir, rename } from 'node:fs/promises';

const outputDir = 'tmp/animation-gate';
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1600, height: 900 },
  deviceScaleFactor: 1,
  recordVideo: { dir: outputDir, size: { width: 1600, height: 900 } },
});
const page = await context.newPage();
const video = page.video();
const browserErrors = [];
page.on('pageerror', (error) => browserErrors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });

await page.goto('http://127.0.0.1:4173/');
await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();
await page.evaluate(() => {
  const controller = window.__VERDANT_RIFT__;
  if (!controller) throw new Error('Animation gate controller is unavailable.');
  window.__ANIMATION_GATE_EVENTS__ = [];
  controller.addEventListener('game-event', (raw) => {
    const event = raw.detail;
    if (event?.type?.startsWith('attack-')) window.__ANIMATION_GATE_EVENTS__.push({ type: event.type, actor: event.actor, delay: event.delay, attackId: event.attackId });
  });
  const simulation = controller.simulation;
  simulation.gold = 12000;
  const builds = [
    [0, 'thorn', 'left'], [2, 'ember', 'right'], [4, 'aegis', 'left'], [6, 'astral', 'right'],
  ];
  for (const [pad, type, branch] of builds) {
    controller.selectPad(pad);
    controller.build(type);
    controller.upgrade();
    controller.upgrade();
    controller.branch(branch);
  }
  controller.clearSelection();
  simulation.waveIndex = 9;
  simulation.waveActive = true;
  simulation.spawnQueue = [{ at: 999, enemy: 'skitter', wave: 9 }];
  simulation.enemies = [];
  const types = ['skitter', 'marauder', 'wisp', 'brute', 'skitter', 'marauder', 'brute', 'wisp', 'skitter', 'marauder'];
  for (const type of types) simulation.spawnEnemy(type, 9);
  simulation.enemies.forEach((enemy, index) => {
    enemy.progress = 0.08 + index * 0.035;
    enemy.hp = Math.max(enemy.hp, 2500);
    enemy.maxHp = Math.max(enemy.maxHp, 2500);
  });
  simulation.updateEnemies(0);
  controller.selectHero('kael');
  controller.worldAction({ x: 1160, y: 350 });
  controller.selectHero('lyra');
  controller.worldAction({ x: 1210, y: 455 });
  controller.clearSelection();
});

// Idle-to-locomotion establishing read.
await page.waitForTimeout(2100);

// Seven reciprocal duels expose hero, defender, marauder, and brute attacks.
await page.evaluate(() => {
  const simulation = window.__VERDANT_RIFT__.simulation;
  const origin = { x: 1258, y: 355 };
  for (const hero of simulation.heroes) { hero.x = origin.x; hero.y = origin.y; hero.target = { ...origin }; }
  simulation.enemies = [];
  for (const type of ['marauder', 'brute', 'marauder', 'brute', 'marauder', 'brute', 'marauder']) simulation.spawnEnemy(type, 9);
  for (const enemy of simulation.enemies) {
    enemy.x = origin.x; enemy.y = origin.y; enemy.progress = 0.37; enemy.hp = 12000; enemy.maxHp = 12000;
  }
  for (let frame = 0; frame < 180; frame += 1) simulation.update(1 / 60);
  simulation.spawnQueue = [{ at: 999, enemy: 'skitter', wave: 9 }];
  simulation.waveActive = true;
});
await page.waitForTimeout(2800);

// Explicit death priority, held defeated pose, and respawn exit.
await page.evaluate(() => {
  const simulation = window.__VERDANT_RIFT__.simulation;
  const kael = simulation.heroes.find((hero) => hero.id === 'kael');
  if (kael) { kael.hp = 0; kael.alive = false; kael.respawnTime = 2; }
  const defender = simulation.defenders[0];
  if (defender) { defender.hp = 0; defender.alive = false; defender.respawnTime = 2; }
});
await page.waitForTimeout(1250);
await page.evaluate(() => {
  const simulation = window.__VERDANT_RIFT__.simulation;
  const kael = simulation.heroes.find((hero) => hero.id === 'kael');
  if (kael) { kael.hp = kael.maxHp; kael.alive = true; kael.respawnTime = 0; }
  const defender = simulation.defenders[0];
  if (defender) { defender.hp = defender.maxHp; defender.alive = true; defender.respawnTime = 0; }
});
await page.waitForTimeout(1000);

// Boss idle/travel/phase cast and all tower families firing at normal speed.
await page.evaluate(() => {
  const simulation = window.__VERDANT_RIFT__.simulation;
  simulation.enemies = [];
  simulation.spawnEnemy('bloomlord', 12);
  const boss = simulation.enemies[0];
  boss.maxHp = 6800; boss.hp = 4300; boss.progress = 0.53;
  simulation.updateEnemies(0);
  simulation.towers.forEach((tower) => { tower.cooldown = 0; tower.disabledTime = 0; });
  simulation.updateBossStrikes();
  simulation.spawnQueue = [{ at: 999, enemy: 'skitter', wave: 12 }];
  simulation.waveActive = true;
});
await page.waitForTimeout(2500);

// 2x timing gate with dense mixed combat and repeated attack cycles.
await page.evaluate(() => {
  const controller = window.__VERDANT_RIFT__;
  const simulation = controller.simulation;
  if (controller.snapshot().speed !== 2) controller.toggleSpeed();
  for (const type of ['skitter', 'marauder', 'wisp', 'brute', 'skitter', 'marauder', 'brute', 'wisp']) simulation.spawnEnemy(type, 12);
  simulation.enemies.forEach((enemy, index) => {
    enemy.progress = 0.42 + index * 0.008;
    enemy.hp = Math.max(enemy.hp, 3200);
    enemy.maxHp = Math.max(enemy.maxHp, 3200);
  });
  simulation.updateEnemies(0);
  simulation.towers.forEach((tower) => { tower.cooldown = 0; tower.disabledTime = 0; });
});
await page.waitForTimeout(3300);

const report = await page.evaluate(() => {
  const events = window.__ANIMATION_GATE_EVENTS__ ?? [];
  const attacks = new Map();
  for (const event of events) {
    const record = attacks.get(event.attackId) ?? [];
    record.push(event.type);
    attacks.set(event.attackId, record);
  }
  return {
    durationTargetSeconds: 12.95,
    eventCount: events.length,
    completeThreePhaseAttacks: [...attacks.values()].filter((phases) => phases.join(',') === 'attack-start,attack-release,attack-impact').length,
    actors: [...new Set(events.map((event) => event.actor))].sort(),
    finalSpeed: window.__VERDANT_RIFT__.snapshot().speed,
  };
});
await page.screenshot({ path: `${outputDir}/final-2x.png` });
await context.close();
await browser.close();
if (video) {
  const recorded = await video.path();
  await rename(recorded, `${outputDir}/animation-gate-1x-2x.webm`);
}
if (browserErrors.length) throw new Error(`Browser errors:\n${browserErrors.join('\n')}`);
console.log(JSON.stringify(report));
