import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const viewports = [
  [1920, 1080],
  [1366, 768],
  [740, 360],
  [430, 932],
  [390, 844],
];
const runName = process.argv[2] || 'current';
const outputDirectory = `artifacts/ui-ux/${runName}`;
await mkdir(outputDirectory, { recursive: true });

const selectors = {
  statusValue: '.resource b',
  statusLabel: '.resource small',
  controlHint: '.icon-button small',
  waveEyebrow: '.wave-intel small',
  waveTitle: '.wave-intel b',
  waveAction: '.call-wave span:nth-child(2)',
  panelEyebrow: '.selection-panel header small',
  panelTitle: '.selection-panel h3',
  towerName: '.tower-option b',
  towerRole: '.tower-option small',
  towerCost: '.tower-option em',
  toast: '.toast p',
  viewAction: '.view-mode-button b',
  viewHint: '.view-mode-button small',
  contextLabel: '.context-pause-banner b',
  contextHint: '.context-pause-banner small',
};

function px(value) {
  return Math.round(Number.parseFloat(value) * 10) / 10;
}

const browser = await chromium.launch();
const report = [];
for (const [width, height] of viewports) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto('http://127.0.0.1:4173/');
  await page.getByRole('heading', { name: 'Hold the Verdant Rift' }).waitFor();
  const briefingMetrics = await page.evaluate(() => {
    const query = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const style = getComputedStyle(element);
      return { fontSize: style.fontSize, lineHeight: style.lineHeight };
    };
    return {
      kicker: query('.kicker'),
      lead: query('.lead'),
      cardTitle: query('.briefing-grid b'),
      cardBody: query('.briefing-grid small'),
      difficultyTitle: query('.difficulty-picker b'),
      difficultyBody: query('.difficulty-picker small'),
      insightLabel: query('.insight-board header small'),
      insightBody: query('.insight-node small'),
      primaryAction: query('.primary-button'),
    };
  });
  await page.screenshot({ path: `${outputDirectory}/${width}x${height}-briefing.png` });
  await page.getByRole('button', { name: /ENTER THE RIFT/ }).click();
  await page.getByRole('button', { name: /CALL WAVE/ }).waitFor();
  await page.keyboard.press('KeyE');
  await page.getByRole('heading', { name: 'Choose a covenant' }).waitFor();
  const metrics = await page.evaluate((requestedSelectors) => {
    const measured = {};
    for (const [name, selector] of Object.entries(requestedSelectors)) {
      const element = document.querySelector(selector);
      if (!element) { measured[name] = null; continue; }
      const style = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      measured[name] = {
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        color: style.color,
        width: bounds.width,
        height: bounds.height,
        clipped: element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1,
      };
    }
    const panel = document.querySelector('.selection-panel');
    const panelBounds = panel?.getBoundingClientRect();
    return {
      measured,
      panel: panelBounds ? { width: panelBounds.width, height: panelBounds.height } : null,
      documentOverflow: {
        x: document.documentElement.scrollWidth - innerWidth,
        y: document.documentElement.scrollHeight - innerHeight,
      },
    };
  }, selectors);
  await page.screenshot({ path: `${outputDirectory}/${width}x${height}-panel.png` });
  await page.getByRole('button', { name: /Thornwatch/ }).click();
  await page.getByRole('heading', { name: 'Thornwatch' }).waitFor();
  await page.screenshot({ path: `${outputDirectory}/${width}x${height}-upgrade.png` });
  await page.getByRole('button', { name: /Close tower controls/ }).click();
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('heading', { name: 'The forest holds its breath.' }).waitFor();
  await page.screenshot({ path: `${outputDirectory}/${width}x${height}-pause.png` });
  report.push({ viewport: `${width}x${height}`, briefing: briefingMetrics, ...metrics });
  await page.close();
}
await browser.close();

const normalized = report.map((entry) => ({
  ...entry,
  briefing: Object.fromEntries(Object.entries(entry.briefing).map(([name, value]) => [name, value && { fontSize: px(value.fontSize), lineHeight: value.lineHeight === 'normal' ? 'normal' : px(value.lineHeight) }])),
  measured: Object.fromEntries(Object.entries(entry.measured).map(([name, value]) => [name, value && { ...value, fontSize: px(value.fontSize), lineHeight: value.lineHeight === 'normal' ? 'normal' : px(value.lineHeight), width: px(value.width), height: px(value.height) }])),
}));
await writeFile(`${outputDirectory}/metrics.json`, `${JSON.stringify(normalized, null, 2)}\n`);
console.log(JSON.stringify(normalized, null, 2));
