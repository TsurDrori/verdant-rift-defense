import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const defaultViewports = [
  [1920, 1080],
  [1600, 900],
  [1366, 768],
  [1280, 720],
  [1024, 768],
  [844, 390],
  [740, 360],
  [430, 932],
  [390, 844],
];
const requestedViewports = process.argv.slice(2).map((value) => value.split('x').map(Number)).filter(([width, height]) => width > 0 && height > 0);
const viewports = requestedViewports.length ? requestedViewports : defaultViewports;

// Keep the visual QA contact sheet outside Playwright's test-results directory:
// Playwright clears that directory when another agent starts an E2E run.
const outputDirectory = 'artifacts/responsive';
await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch();
const report = [];

async function captureViewport(width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.setDefaultTimeout(60_000);
  try {
    await page.goto('http://127.0.0.1:4173/');
    const slug = `${width}x${height}`;
    await page.getByRole('heading', { name: 'Hold the Verdant Rift' }).waitFor();
    await page.screenshot({ path: `${outputDirectory}/${slug}-briefing.png` });
    await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();
    await page.getByRole('button', { name: /CALL WAVE/ }).waitFor();
    await page.locator('[data-briefing]').waitFor({ state: 'hidden' });
    await page.screenshot({ path: `${outputDirectory}/${slug}.png` });
    if (width <= 620) {
      await page.getByRole('button', { name: 'Show battlefield overview' }).click();
      await page.waitForFunction((viewportWidth) => Math.abs((document.querySelector('canvas')?.getBoundingClientRect().width ?? 0) - viewportWidth) < 2, width);
      await page.screenshot({ path: `${outputDirectory}/${slug}-overview.png` });
      await page.getByRole('button', { name: 'Focus battlefield for touch play' }).click();
      await page.waitForFunction(() => Math.abs((document.querySelector('canvas')?.getBoundingClientRect().width ?? 0) - 900) < 2);
    }
    const metrics = await page.evaluate(({ width: viewportWidth, height: viewportHeight }) => {
      const box = (selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return {
          left: Math.round(rect.left * 10) / 10,
          top: Math.round(rect.top * 10) / 10,
          right: Math.round(rect.right * 10) / 10,
          bottom: Math.round(rect.bottom * 10) / 10,
          width: Math.round(rect.width * 10) / 10,
          height: Math.round(rect.height * 10) / 10,
        };
      };
      const canvas = document.querySelector('canvas');
      const shell = document.querySelector('#game-shell');
      return {
        viewport: `${viewportWidth}x${viewportHeight}`,
        canvas: box('canvas'),
        resource: box('.resource-ribbon'),
        controls: box('.battle-controls'),
        heroes: box('.hero-dock'),
        wave: box('.wave-card'),
        shellOverflow: shell ? {
          x: shell.scrollWidth - shell.clientWidth,
          y: shell.scrollHeight - shell.clientHeight,
        } : null,
        canvasIntrinsic: canvas ? { width: canvas.width, height: canvas.height } : null,
      };
    }, { width, height });
    await page.keyboard.press('KeyE');
    await page.getByRole('heading', { name: 'Choose a covenant' }).waitFor();
    await page.screenshot({ path: `${outputDirectory}/${slug}-panel.png` });
    await page.getByRole('button', { name: /Close tower controls/ }).click();
    await page.getByRole('button', { name: 'Pause' }).click();
    await page.getByRole('heading', { name: 'The forest holds its breath.' }).waitFor();
    await page.screenshot({ path: `${outputDirectory}/${slug}-pause.png` });
    return metrics;
  } finally {
    await page.close();
  }
}

for (const [width, height] of viewports) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      report.push(await captureViewport(width, height));
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  if (lastError) throw lastError;
}

await browser.close();
const metricsName = requestedViewports.length ? `metrics-${requestedViewports.map(([width, height]) => `${width}x${height}`).join('-')}.json` : 'metrics.json';
await writeFile(`${outputDirectory}/${metricsName}`, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
