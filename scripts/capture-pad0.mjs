import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await page.goto('http://127.0.0.1:4173/');
await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();
const result = await page.evaluate(() => {
  const controller = window.__VERDANT_RIFT__;
  if (!controller) throw new Error('Review controller is unavailable.');
  controller.simulation.gold = 3000;
  controller.selectPad(0);
  controller.build('thorn');
  controller.upgrade();
  controller.upgrade();
  controller.branch('left');
  controller.clearSelection();
  document.querySelector('[data-toast-stack]')?.replaceChildren();
  const ribbon = document.querySelector('.resource-ribbon')?.getBoundingClientRect();
  return ribbon ? { left: ribbon.left, right: ribbon.right, top: ribbon.top, bottom: ribbon.bottom } : null;
});
await page.waitForTimeout(500);
await page.evaluate(() => window.__VERDANT_RIFT_GAME__?.loop.sleep());
await mkdir('test-results/screenshots', { recursive: true });
await page.screenshot({ path: 'test-results/screenshots/pad0-1280.png' });
console.log(JSON.stringify(result));
await browser.close();
