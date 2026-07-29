import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

const baseURL = process.env.VERDANT_AUDIO_URL ?? 'http://127.0.0.1:4173';
const outputDir = 'artifacts/audio-evidence';
mkdirSync(outputDir, { recursive: true });

async function responds() {
  try {
    return (await fetch(baseURL)).ok;
  } catch {
    return false;
  }
}

let server;
if (!(await responds())) {
  server = spawn('pnpm', ['dev'], { stdio: 'inherit' });
  for (let attempt = 0; attempt < 80 && !(await responds()); attempt += 1) await wait(250);
  if (!(await responds())) throw new Error(`Vite did not become ready at ${baseURL}`);
}

const chunks = [];
const diagnostics = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.exposeFunction('__appendVerdantAudioChunk', (base64) => {
  chunks.push(Buffer.from(base64, 'base64'));
});

try {
  await page.goto(baseURL);
  await page.getByRole('button', { name: /enter the rift/i }).click();
  await page.waitForFunction(() => window.__VERDANT_RIFT_AUDIO__?.diagnostics().assetsLoaded === true);

  await page.evaluate(() => {
    const director = window.__VERDANT_RIFT_AUDIO__;
    if (!director) throw new Error('AudioDirector was not exposed.');
    const internals = director;
    const context = internals.context;
    const limiter = internals.limiter;
    if (!context || !limiter) throw new Error('Audio graph is not ready.');
    const destination = context.createMediaStreamDestination();
    limiter.connect(destination);
    const preferred = 'audio/webm;codecs=opus';
    const recorder = new MediaRecorder(
      destination.stream,
      MediaRecorder.isTypeSupported(preferred) ? { mimeType: preferred, audioBitsPerSecond: 192_000 } : undefined,
    );
    let pending = Promise.resolve();
    recorder.ondataavailable = (event) => {
      if (event.data.size === 0) return;
      pending = pending.then(async () => {
        const bytes = new Uint8Array(await event.data.arrayBuffer());
        let binary = '';
        for (let offset = 0; offset < bytes.length; offset += 0x8000) {
          binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
        }
        await window.__appendVerdantAudioChunk(btoa(binary));
      });
    };
    window.__VERDANT_AUDIO_CAPTURE__ = {
      stop: () => new Promise((resolve) => {
        recorder.onstop = () => void pending.then(resolve);
        recorder.stop();
      }),
    };
    recorder.start(5_000);
  });

  const sample = async (state) => {
    diagnostics.push({
      state,
      wallClock: new Date().toISOString(),
      ...(await page.evaluate(() => window.__VERDANT_RIFT_AUDIO__.diagnostics())),
    });
  };

  await sample('calm-start');
  await wait(20_000);
  await page.evaluate(() => {
    const controller = window.__VERDANT_RIFT__;
    const simulation = controller.simulation;
    simulation.gold = 20_000;
    const types = ['thorn', 'ember', 'aegis', 'astral', 'thorn', 'ember'];
    types.forEach((type, padIndex) => {
      controller.selectPad(padIndex);
      controller.build(type);
    });
    controller.startWave();
  });
  await sample('active-start');
  await wait(25_000);

  await page.evaluate(() => {
    const controller = window.__VERDANT_RIFT__;
    const simulation = controller.simulation;
    simulation.lives = 1;
    simulation.nextWaveReady = true;
    controller.startWave();
    simulation.nextWaveReady = true;
    controller.startWave();
    controller.update(0);
  });
  await sample('crisis-start');
  await wait(20_000);

  await page.evaluate(() => {
    const controller = window.__VERDANT_RIFT__;
    const simulation = controller.simulation;
    const boss = simulation.enemies.findLast((enemy) => enemy.alive);
    if (boss) {
      boss.type = 'bloomlord';
      boss.hp = Number.MAX_SAFE_INTEGER;
      boss.maxHp = Number.MAX_SAFE_INTEGER;
      boss.progress = 0;
    }
    controller.update(0);
    controller.dispatchEvent(new CustomEvent('game-event', {
      detail: {
        type: 'boss-telegraph',
        source: { x: 800, y: 280 },
        point: { x: 800, y: 450 },
        radius: 130,
        duration: 1.2,
        label: 'Hollow Bloom',
      },
    }));
  });
  await sample('boss-start');
  await wait(25_000);
  await sample('boss-end');
  await page.evaluate(() => window.__VERDANT_AUDIO_CAPTURE__.stop());
} finally {
  await browser.close();
  if (server) server.kill('SIGTERM');
}

const webm = `${outputDir}/adaptive-90s.webm`;
const wav = `${outputDir}/adaptive-90s.wav`;
const spectrogram = `${outputDir}/adaptive-90s-spectrogram.png`;
const report = `${outputDir}/adaptive-90s-loudness.txt`;
writeFileSync(webm, Buffer.concat(chunks));
writeFileSync(`${outputDir}/adaptive-90s-diagnostics.json`, `${JSON.stringify(diagnostics, null, 2)}\n`);

const decode = spawnSync('ffmpeg', ['-y', '-hide_banner', '-i', webm, '-ar', '48000', '-c:a', 'pcm_s24le', wav], { encoding: 'utf8' });
if (decode.status !== 0) throw new Error(decode.stderr);
const plot = spawnSync('ffmpeg', [
  '-y', '-hide_banner', '-i', wav,
  '-lavfi', 'showspectrumpic=s=1920x1080:legend=1:color=fiery:scale=cbrt',
  spectrogram,
], { encoding: 'utf8' });
if (plot.status !== 0) throw new Error(plot.stderr);
const loudness = spawnSync('ffmpeg', [
  '-hide_banner', '-i', wav,
  '-filter_complex', 'ebur128=peak=true',
  '-f', 'null', '-',
], { encoding: 'utf8' });
writeFileSync(report, `${loudness.stdout}\n${loudness.stderr}`);
if (loudness.status !== 0) throw new Error(loudness.stderr);

console.log(`Captured ${webm}`);
console.log(`Decoded ${wav}`);
console.log(`Rendered ${spectrogram}`);
console.log(`Measured ${report}`);
