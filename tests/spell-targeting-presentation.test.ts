import { describe, expect, it } from 'vitest';
import { GameController } from '../src/phaser/adapters/GameController';

describe('authoritative hero spell presentation metrics', () => {
  it('delegates Far-Star Lens scaling for Starfall and Falling Constellation without renderer math', () => {
    const controller = new GameController();
    expect(controller.setHeroArtifactLoadout({ lyra: 'far-star-lens' })).toBe(true);

    const starfall = controller.getHeroSpellTargeting('lyra', 'starfall');
    expect(starfall).toEqual({ targeting: 'point', castRange: 185.6, effectRadius: 185.6 });

    const hero = (controller.simulation as unknown as {
      heroes: Array<{ id: string; level: number; unlockedSpells: string[] }>;
    }).heroes.find((candidate) => candidate.id === 'lyra')!;
    hero.level = 4;
    hero.unlockedSpells = ['starfall', 'astral-echo', 'falling-constellation'];

    const constellation = controller.getHeroSpellTargeting('lyra', 'falling-constellation');
    expect(constellation?.targeting).toBe('point');
    expect(constellation?.castRange).toBeCloseTo(218.08, 8);
    expect(constellation?.effectRadius).toBeCloseTo(129.92, 8);
    expect(constellation?.castRange).not.toBe(constellation?.effectRadius);
  });
});
