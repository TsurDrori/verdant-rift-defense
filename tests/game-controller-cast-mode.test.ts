import { describe, expect, it } from 'vitest';
import { GameController } from '../src/phaser/adapters/GameController';

function playingController(): GameController {
  const controller = new GameController();
  controller.markRuntimeReady();
  controller.begin();
  expect(controller.snapshot().phase).toBe('playing');
  return controller;
}

describe('GameController exclusive spell-cast lifecycle', () => {
  it('preserves the armed spell, cooldown, and hero selection after an invalid world target', () => {
    const controller = playingController();
    let invalidTargets = 0;
    controller.addEventListener('spell-target-invalid', () => { invalidTargets += 1; });

    controller.armSpell('kael', 'rift-quake');
    controller.selectPad(0);
    controller.selectHero('lyra');
    controller.nudgeSelectedHero(50, 50);
    controller.worldAction({ x: 1600, y: 0 });

    expect(controller.armedSpell).toEqual({ heroId: 'kael', spellId: 'rift-quake', targeting: 'point' });
    expect(controller.selection).toEqual({ kind: 'hero', heroId: 'kael' });
    expect(controller.snapshot().heroes.find((hero) => hero.id === 'kael')?.spellCooldowns['rift-quake']).toBe(0);
    expect(invalidTargets).toBe(1);
  });

  it('commits a valid world cast exactly once and disarms before normal world input resumes', () => {
    const controller = playingController();
    const hero = controller.snapshot().heroes.find((candidate) => candidate.id === 'kael')!;
    const target = { x: hero.x, y: hero.y };

    controller.armSpell('kael', 'rift-quake');
    controller.worldAction(target);
    const firstEvents = controller.drainEvents().filter((event) => event.type === 'hero-spell-cast');

    expect(controller.armedSpell).toBeUndefined();
    expect(controller.snapshot().heroes.find((candidate) => candidate.id === 'kael')?.spellCooldowns['rift-quake']).toBeGreaterThan(0);
    expect(firstEvents).toHaveLength(1);

    controller.worldAction(target);
    const repeatedEvents = controller.drainEvents().filter((event) => event.type === 'hero-spell-cast');
    expect(repeatedEvents).toHaveLength(0);
  });

  it('provides one idempotent cancellation path for Escape and secondary-click adapters', () => {
    const controller = playingController();
    let castModeChanges = 0;
    controller.addEventListener('cast-mode-change', () => { castModeChanges += 1; });

    controller.armSpell('kael', 'rift-quake');
    expect(controller.cancelSpellCast()).toBe(true);
    expect(controller.cancelSpellCast()).toBe(false);
    expect(controller.armedSpell).toBeUndefined();
    expect(controller.spellTargetPreview).toBeUndefined();
    expect(castModeChanges).toBe(2);
  });

  it('cancels targeting when paused, when the caster dies, or when battle leaves play', () => {
    const paused = playingController();
    paused.armSpell('kael', 'rift-quake');
    paused.togglePause();
    expect(paused.armedSpell).toBeUndefined();
    expect(paused.snapshot().phase).toBe('paused');

    const defeatedCaster = playingController();
    defeatedCaster.armSpell('kael', 'rift-quake');
    const mutableHero = (defeatedCaster.simulation as unknown as { heroes: Array<{ id: string; alive: boolean }> }).heroes.find((hero) => hero.id === 'kael')!;
    mutableHero.alive = false;
    defeatedCaster.update(0);
    expect(defeatedCaster.armedSpell).toBeUndefined();

    const endedBattle = playingController();
    endedBattle.armSpell('kael', 'rift-quake');
    (endedBattle.simulation as unknown as { phase: 'defeat' }).phase = 'defeat';
    endedBattle.update(0);
    expect(endedBattle.armedSpell).toBeUndefined();
  });
});
