import { expect, test } from '@playwright/test';

async function enterAndLoad(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /enter the rift/i }).click();
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT_AUDIO__?.diagnostics().context)).toBe('running');
  await expect.poll(
    () => page.evaluate(() => window.__VERDANT_RIFT_AUDIO__?.diagnostics().assetsLoaded),
    { timeout: 15_000 },
  ).toBe(true);
}

test('owns one measured adaptive engine with no parallel Phaser context', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeAudioContext = window.AudioContext;
    let created = 0;
    const CountingAudioContext = class extends NativeAudioContext {
      constructor(options?: AudioContextOptions) {
        super(options);
        created += 1;
      }
    };
    Object.defineProperty(window, 'AudioContext', { value: CountingAudioContext });
    Object.defineProperty(window, '__AUDIO_CONTEXT_COUNT__', { get: () => created });
  });
  await enterAndLoad(page);

  const result = await page.evaluate(() => ({
    contexts: (window as unknown as { __AUDIO_CONTEXT_COUNT__: number }).__AUDIO_CONTEXT_COUNT__,
    diagnostic: window.__VERDANT_RIFT_AUDIO__!.diagnostics(),
  }));
  expect(result.contexts).toBe(1);
  expect(result.diagnostic.schedulerCount).toBe(1);
  expect(result.diagnostic.ambienceSources).toBe(2);
  expect(result.diagnostic.decodedAssets).toBe(48);
  expect(result.diagnostic.streamedMusicAssets).toBe(3);
  expect(result.diagnostic.decodedMusicBytes).toBe(0);
  expect(result.diagnostic.assetsFailed).toBe(0);
  expect(result.diagnostic.midiPlayback).toBe(false);
  expect(result.diagnostic.currentCue).toBe('battle-theme');
  expect(result.diagnostic.transport.currentDuration).toBeGreaterThanOrEqual(300);
});

test('keeps the score clock independent of 1x and 2x simulation speed', async ({ page }) => {
  await enterAndLoad(page);
  const step = () => page.evaluate(() => window.__VERDANT_RIFT_AUDIO__!.diagnostics().scoreStep);
  const a = await step();
  await page.waitForTimeout(850);
  const b = await step();
  await page.getByRole('button', { name: /toggle battle speed/i }).click();
  const b2 = await step();
  await page.waitForTimeout(850);
  const c = await step();
  const at1x = (b - a + 256) % 256;
  const at2x = (c - b2 + 256) % 256;
  expect(at1x).toBeGreaterThanOrEqual(3);
  expect(at2x).toBeGreaterThanOrEqual(3);
  expect(Math.abs(at1x - at2x)).toBeLessThanOrEqual(2);
});

test('uses separate long-form menu, battle, and boss compositions without MIDI', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /wanderer/i }).click();
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT_AUDIO__?.diagnostics().assetsLoaded), { timeout: 20_000 }).toBe(true);
  const menu = await page.evaluate(() => window.__VERDANT_RIFT_AUDIO__!.diagnostics());
  expect(menu.currentCue).toBe('menu-theme');
  expect(menu.transport.currentDuration).toBeGreaterThan(240);

  await page.getByRole('button', { name: /enter the rift/i }).click();
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT_AUDIO__!.diagnostics().currentCue)).toBe('battle-theme');
  const battle = await page.evaluate(() => window.__VERDANT_RIFT_AUDIO__!.diagnostics());
  expect(battle.transport.currentDuration).toBeGreaterThanOrEqual(300);

  await page.evaluate(() => {
    const controller = window.__VERDANT_RIFT__!;
    const simulation = controller.simulation as unknown as {
      waveIndex: number;
      spawnEnemy(type: 'bloomlord', wave: number): void;
    };
    simulation.waveIndex = 12;
    simulation.spawnEnemy('bloomlord', 12);
    controller.update(0);
  });
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT_AUDIO__!.diagnostics().mode)).toBe('boss');
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT_AUDIO__!.diagnostics().currentCue)).toBe('boss-theme');
  await expect.poll(() => page.evaluate(() => {
    const scene = window.__VERDANT_RIFT_GAME__!.scene.getScene('battle') as unknown as {
      getPerformanceDiagnostics(): { bossArrivalAnnouncements: number };
    };
    return scene.getPerformanceDiagnostics().bossArrivalAnnouncements;
  })).toBe(1);
  const boss = await page.evaluate(() => window.__VERDANT_RIFT_AUDIO__!.diagnostics());
  expect(boss.transport.currentDuration).toBeGreaterThanOrEqual(300);
  expect(boss.transport.programChanges).toBe(2);
  expect(boss.transport.midPhraseRestarts).toBe(0);
  expect(boss.criticalCueCounts.boss).toBeGreaterThanOrEqual(1);
});

test('pressure changes never restart the five-minute battle program', async ({ page }) => {
  await enterAndLoad(page);
  const before = await page.evaluate(() => window.__VERDANT_RIFT_AUDIO__!.diagnostics());
  expect(before.currentCue).toBe('battle-theme');

  await page.evaluate(() => {
    const controller = window.__VERDANT_RIFT__!;
    const simulation = controller.simulation as unknown as {
      enemies: Array<{ uid: number; alive: boolean; type: string }>;
      waveIndex: number;
      spawnEnemy(type: 'skitter', wave: number): void;
    };
    simulation.waveIndex = 1;
    for (let index = 0; index < 20; index += 1) simulation.spawnEnemy('skitter', 1);
    controller.update(0);
  });
  await page.waitForTimeout(240);
  await page.evaluate(() => {
    const controller = window.__VERDANT_RIFT__!;
    const simulation = controller.simulation as unknown as { enemies: Array<{ uid: number; alive: boolean; type: string }> };
    simulation.enemies.length = 19;
    controller.update(0);
  });
  await page.waitForTimeout(240);
  await page.evaluate(() => {
    const controller = window.__VERDANT_RIFT__!;
    const simulation = controller.simulation as unknown as {
      enemies: Array<{ uid: number; alive: boolean; type: string }>;
      spawnEnemy(type: 'skitter', wave: number): void;
    };
    simulation.spawnEnemy('skitter', 1);
    controller.update(0);
  });
  await page.waitForTimeout(240);
  await page.evaluate(() => {
    const controller = window.__VERDANT_RIFT__!;
    const simulation = controller.simulation as unknown as { enemies: Array<{ uid: number; alive: boolean; type: string }> };
    simulation.enemies.length = 19;
    controller.update(0);
  });

  const stable = await page.evaluate(() => window.__VERDANT_RIFT_AUDIO__!.diagnostics());
  expect(stable.currentCue).toBe('battle-theme');
  expect(stable.transport.sourceStarts).toBe(before.transport.sourceStarts);
  expect(stable.transport.programChanges).toBe(before.transport.programChanges);
  expect(stable.transport.midPhraseRestarts).toBe(0);
});

test('keeps battle music alive while a cold boss stream buffers', async ({ page }) => {
  await enterAndLoad(page);
  // A software-rendered CI runner can report the battle cue before the
  // preceding menu -> battle crossfade has finished releasing its old voice.
  // Measure the boss handoff only after transport has exactly one live music
  // source; otherwise that legitimate late menu stop is misattributed to the
  // intentionally buffered boss source.
  await expect.poll(() => page.evaluate(() => {
    const transport = window.__VERDANT_RIFT_AUDIO__!.diagnostics().transport;
    return transport.sourceStarts - transport.sourceStops;
  })).toBe(1);
  const beforeStops = await page.evaluate(() => window.__VERDANT_RIFT_AUDIO__!.diagnostics().transport.sourceStops);
  await page.evaluate(() => {
    const nativePlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function playWithColdBossBuffer(): Promise<void> {
      if (this.src.includes('boss-theme.ogg')) {
        const bossElement = this;
        return new Promise((resolve) => {
          (window as typeof window & { __RELEASE_BOSS_STREAM__?: () => void }).__RELEASE_BOSS_STREAM__ = () => {
            bossElement.dispatchEvent(new Event('playing'));
            resolve();
          };
        });
      }
      return nativePlay.call(this);
    };
    const controller = window.__VERDANT_RIFT__!;
    const simulation = controller.simulation as unknown as {
      waveIndex: number;
      spawnEnemy(type: 'bloomlord', wave: number): void;
    };
    simulation.waveIndex = 12;
    simulation.spawnEnemy('bloomlord', 12);
    controller.update(0);
  });

  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT_AUDIO__!.diagnostics().currentCue)).toBe('boss-theme');
  expect(await page.evaluate(() => window.__VERDANT_RIFT_AUDIO__!.diagnostics().transport.sourceStops)).toBe(beforeStops);
  await page.evaluate(() => {
    const release = (window as typeof window & { __RELEASE_BOSS_STREAM__?: () => void }).__RELEASE_BOSS_STREAM__;
    if (!release) throw new Error('Boss stream release hook was not installed.');
    release();
  });
  await expect.poll(
    () => page.evaluate(() => window.__VERDANT_RIFT_AUDIO__!.diagnostics().transport.sourceStops),
    { timeout: 2_000 },
  ).toBe(beforeStops + 1);
});

test('reserves tactical cues when 48 ordinary voices are saturated', async ({ page }) => {
  await enterAndLoad(page);
  const result = await page.evaluate(() => {
    type DebugDirector = {
      playSample(family: 'body', pan: number, volume: number, rate: number, priority: 1): boolean;
      diagnostics(): ReturnType<NonNullable<typeof window.__VERDANT_RIFT_AUDIO__>['diagnostics']>;
    };
    const director = window.__VERDANT_RIFT_AUDIO__ as unknown as DebugDirector;
    let admitted = 0;
    for (let index = 0; index < 60; index += 1) {
      admitted += Number(director.playSample('body', 0, .01, .55, 1));
    }
    const controller = window.__VERDANT_RIFT__!;
    controller.dispatchEvent(new CustomEvent('game-event', {
      detail: { type: 'enemy-leaked', enemyUid: 991, lives: 1 },
    }));
    controller.dispatchEvent(new CustomEvent('game-event', {
      detail: {
        type: 'boss-telegraph',
        source: { x: 800, y: 300 },
        point: { x: 800, y: 450 },
        radius: 100,
        duration: 1,
        label: 'Test',
      },
    }));
    controller.dispatchEvent(new CustomEvent('game-event', {
      detail: { type: 'wave-started', wave: 2, bonus: 0 },
    }));
    return { admitted, diagnostic: director.diagnostics() };
  });

  expect(result.admitted).toBe(48);
  expect(result.diagnostic.voices.standard).toBe(48);
  expect(result.diagnostic.voices.critical).toBeGreaterThanOrEqual(7);
  expect(result.diagnostic.criticalCueCounts.leak).toBe(1);
  expect(result.diagnostic.criticalCueCounts.boss).toBe(1);
  expect(result.diagnostic.criticalCueCounts.wave).toBe(1);
  expect(result.diagnostic.criticalCuesDropped).toBe(0);
});

test('delays enemy contact and defeat audio to the authored impact frame', async ({ page }) => {
  await enterAndLoad(page);
  const immediate = await page.evaluate(() => {
    const director = window.__VERDANT_RIFT_AUDIO__ as unknown as {
      playSample: (family: string, ...rest: unknown[]) => boolean;
      diagnostics(): ReturnType<NonNullable<typeof window.__VERDANT_RIFT_AUDIO__>['diagnostics']>;
    };
    const played: Array<{ family: string; at: number }> = [];
    const started = performance.now();
    director.playSample = (family: string) => { played.push({ family, at: performance.now() - started }); return true; };
    (window as typeof window & { __IMPACT_AUDIO__?: typeof played }).__IMPACT_AUDIO__ = played;
    const controller = window.__VERDANT_RIFT__!;
    const base = {
      attackId: 9991,
      actor: 'enemy' as const,
      actorUid: 'enemy:991',
      targetUid: 'hero:kael',
      source: { x: 700, y: 300 },
      target: { x: 810, y: 340 },
      delay: .24,
      color: 0xff0000,
      style: 'brute' as const,
    };
    controller.dispatchEvent(new CustomEvent('game-event', { detail: { type: 'attack-impact', ...base } }));
    controller.dispatchEvent(new CustomEvent('game-event', { detail: { type: 'ally-hit', allyUid: 'hero:kael', enemyUid: 991, amount: 999, hp: 0 } }));
    controller.dispatchEvent(new CustomEvent('game-event', { detail: { type: 'ally-defeated', allyUid: 'hero:kael', respawn: 8 } }));
    return { played: played.length, critical: director.diagnostics().criticalCueCounts['hero-defeat'] };
  });
  expect(immediate).toEqual({ played: 0, critical: 0 });
  // The authored delay is measured inside the page. Poll for delivery so a
  // busy multi-worker runner cannot fail merely because its own 310 ms wakeup
  // was serviced before the page's queued timers.
  await expect.poll(() => page.evaluate(() =>
    (window as typeof window & { __IMPACT_AUDIO__?: Array<{ family: string; at: number }> })
      .__IMPACT_AUDIO__?.length ?? 0), { timeout: 2_000 }).toBeGreaterThanOrEqual(2);
  const delayed = await page.evaluate(() => ({
    played: (window as typeof window & { __IMPACT_AUDIO__?: Array<{ family: string; at: number }> }).__IMPACT_AUDIO__,
    critical: window.__VERDANT_RIFT_AUDIO__!.diagnostics().criticalCueCounts['hero-defeat'],
  }));
  expect(delayed.played?.some((entry) => entry.family === 'softBody' && entry.at >= 200)).toBe(true);
  expect(delayed.played?.some((entry) => entry.family === 'heavySoft' && entry.at >= 200)).toBe(true);
  expect(delayed.critical).toBe(1);
});

test('applies four buses, invalid feedback, pause/resume, and full disposal', async ({ page }) => {
  await enterAndLoad(page);
  await page.getByRole('button', { name: /pause/i }).click();
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT_AUDIO__?.diagnostics().context)).toBe('suspended');
  await page.getByLabel('Master volume').fill('0.71');
  await page.getByLabel('Music volume').fill('0.24');
  await page.getByLabel('Combat volume').fill('0.63');
  await page.getByLabel('World volume').fill('0.19');
  const diagnostic = await page.evaluate(() => {
    const controller = window.__VERDANT_RIFT__!;
    controller.clearSelection();
    controller.upgrade();
    return window.__VERDANT_RIFT_AUDIO__!.diagnostics();
  });
  expect(diagnostic.mix).toEqual({ master: .71, music: .24, sfx: .63, ambience: .19 });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('verdant-rift:audio-mix')!))).toEqual(diagnostic.mix);

  await page.getByRole('button', { name: /return to battle/i }).click();
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT_AUDIO__?.diagnostics().context)).toBe('running');
  await page.evaluate(() => window.__VERDANT_RIFT_AUDIO__!.dispose());
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT_AUDIO__!.diagnostics().context)).toBe('closed');
  const disposed = await page.evaluate(() => window.__VERDANT_RIFT_AUDIO__!.diagnostics());
  expect(disposed.disposed).toBe(true);
  expect(disposed.schedulerCount).toBe(0);
  expect(disposed.ambienceSources).toBe(0);
});
