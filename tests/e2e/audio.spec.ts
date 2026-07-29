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
  expect(result.diagnostic.decodedAssets).toBe(55);
  expect(result.diagnostic.assetsFailed).toBe(0);
  expect(result.diagnostic.midiPlayback).toBe(false);
  expect(result.diagnostic.currentCue).toBe('intro-calm');
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

test('re-sequences calm, active, crisis, and boss material without MIDI', async ({ page }) => {
  await enterAndLoad(page);
  expect(await page.evaluate(() => window.__VERDANT_RIFT_AUDIO__!.diagnostics().mode)).toBe('calm');

  await page.evaluate(() => window.__VERDANT_RIFT__!.startWave());
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT_AUDIO__!.diagnostics().mode)).toBe('active');
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT_AUDIO__!.diagnostics().currentCue)).toBe('intro-pressure');

  await page.evaluate(() => {
    const simulation = window.__VERDANT_RIFT__!.simulation as unknown as { lives: number };
    simulation.lives = 1;
    window.__VERDANT_RIFT__!.update(0);
  });
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT_AUDIO__!.diagnostics().mode)).toBe('crisis');
  await page.evaluate(() => {
    const director = window.__VERDANT_RIFT_AUDIO__ as unknown as {
      currentMusic?: { source: AudioBufferSourceNode };
    };
    director.currentMusic?.source.stop();
  });
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT_AUDIO__!.diagnostics().currentCue)).toBe('active-loop');

  await page.evaluate(() => {
    const simulation = window.__VERDANT_RIFT__!.simulation as unknown as {
      enemies: Array<{ alive: boolean; type: string }>;
    };
    simulation.enemies[0]!.type = 'bloomlord';
    window.__VERDANT_RIFT__!.update(0);
  });
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT_AUDIO__!.diagnostics().mode)).toBe('boss');
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT_AUDIO__!.diagnostics().currentCue)).toBe('active-to-boss');
});

test('phase-transfers compound cues and debounces rapid pressure flaps without restarting phrases', async ({ page }) => {
  await enterAndLoad(page);
  await page.evaluate(() => window.__VERDANT_RIFT__!.startWave());
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT_AUDIO__!.diagnostics().mode)).toBe('active');
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT_AUDIO__!.diagnostics().currentCue)).toBe('intro-pressure');

  const transferred = await page.evaluate(() => window.__VERDANT_RIFT_AUDIO__!.diagnostics().transport);
  expect(transferred.phaseTransfers).toBe(1);
  expect(transferred.midPhraseRestarts).toBe(0);
  expect(transferred.recent.some((event) => event.kind === 'phase-transfer'
    && event.fromCue === 'intro-calm'
    && event.cue === 'intro-pressure'
    // Decode speed changes how long the intro has played before the wave is
    // callable. The contract is a non-zero phase transfer, not an arbitrary
    // wall-clock delay on a particular machine.
    && (event.offset ?? 0) > .1)).toBe(true);

  await page.evaluate(() => {
    const controller = window.__VERDANT_RIFT__!;
    const simulation = controller.simulation as unknown as { enemies: Array<{ uid: number; alive: boolean; type: string }> };
    const seed = simulation.enemies.find((enemy) => enemy.alive)!;
    simulation.enemies = Array.from({ length: 20 }, (_, index) => ({ ...seed, uid: 90_000 + index, alive: true }));
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
    const simulation = controller.simulation as unknown as { enemies: Array<{ uid: number; alive: boolean; type: string }> };
    const seed = simulation.enemies[0]!;
    simulation.enemies.push({ ...seed, uid: 90_020, alive: true });
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
  expect(stable.mode).toBe('active');
  expect(stable.transport.modeChanges).toBe(1);
  expect(stable.transport.midPhraseRestarts).toBe(0);

  await page.evaluate(() => {
    const controller = window.__VERDANT_RIFT__!;
    const simulation = controller.simulation as unknown as {
      enemies: unknown[];
      spawnQueue: unknown[];
      waveActive: boolean;
      nextWaveReady: boolean;
      intermission: number;
    };
    simulation.enemies = [];
    simulation.spawnQueue = [];
    simulation.waveActive = false;
    simulation.nextWaveReady = true;
    simulation.intermission = 999;
    controller.update(0);
    const director = window.__VERDANT_RIFT_AUDIO__ as unknown as {
      context: AudioContext;
      modeGate: { candidate: string; candidateSince: number };
    };
    director.modeGate.candidate = 'calm';
    director.modeGate.candidateSince = director.context.currentTime - 10.1;
  });
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT_AUDIO__!.diagnostics().mode)).toBe('calm');
  const boundaryQueued = await page.evaluate(() => window.__VERDANT_RIFT_AUDIO__!.diagnostics().transport);
  expect(boundaryQueued.pending?.cue).toBe('calm-loop');
  expect(boundaryQueued.pending?.in).toBeGreaterThan(0);
  expect(boundaryQueued.pending?.in).toBeLessThanOrEqual(60 / 82 / 2 * 16 + .15);
  expect(boundaryQueued.midPhraseRestarts).toBe(0);

  await page.evaluate(() => {
    const director = window.__VERDANT_RIFT_AUDIO__ as unknown as {
      context: AudioContext;
      pendingMusicTransition?: { at: number };
    };
    if (director.pendingMusicTransition) director.pendingMusicTransition.at = director.context.currentTime + .06;
  });
  await expect.poll(() => page.evaluate(() => window.__VERDANT_RIFT_AUDIO__!.diagnostics().currentCue)).toBe('calm-loop');
  const boundaryCommitted = await page.evaluate(() => window.__VERDANT_RIFT_AUDIO__!.diagnostics().transport);
  expect(boundaryCommitted.safeTransitions).toBe(1);
  expect(boundaryCommitted.midPhraseRestarts).toBe(0);
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
