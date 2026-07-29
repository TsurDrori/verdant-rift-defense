import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
await page.goto('http://127.0.0.1:4173/');
await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();
await page.evaluate(() => {
  const controller = window.__VERDANT_RIFT__;
  if (!controller) throw new Error('Review controller is unavailable.');
  controller.simulation.gold = 12000;
  const branches = [
    [0, 'thorn', 'left'], [1, 'thorn', 'right'],
    [2, 'ember', 'left'], [3, 'ember', 'right'],
    [4, 'aegis', 'left'], [5, 'aegis', 'right'],
    [6, 'astral', 'left'], [7, 'astral', 'right'],
  ];
  for (const [pad, type, branch] of branches) {
    controller.selectPad(pad);
    controller.build(type);
    controller.upgrade();
    controller.upgrade();
    controller.branch(branch);
  }
  controller.clearSelection();
  controller.simulation.waveActive = false;
  controller.simulation.enemies = [];
  controller.simulation.spawnQueue = [];
});
await page.waitForTimeout(700);
await page.evaluate(() => {
  document.querySelector('[data-toast-stack]')?.replaceChildren();
  window.__VERDANT_RIFT_GAME__?.loop.sleep();
});
await mkdir('test-results/screenshots', { recursive: true });
await page.screenshot({ path: 'test-results/screenshots/branch-silhouettes.png' });
await browser.close();
