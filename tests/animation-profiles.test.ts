import { describe, expect, it } from 'vitest';
import {
  DEFENDER_MOTION,
  ENEMY_MOTION,
  HERO_MOTION,
  TOWER_MOTION,
  canInterruptAnimation,
  phaseFrame,
  presentationSeed,
} from '../src/phaser/view/AnimationProfiles';

describe('animation direction', () => {
  it('gives each enemy archetype a distinct action signature', () => {
    const signatures = Object.values(ENEMY_MOTION).map(({ combat }) =>
      [combat.windup, combat.impact, combat.recovery, combat.travel, combat.hitWeight].join(':'),
    );
    expect(new Set(signatures).size).toBe(signatures.length);
    expect(ENEMY_MOTION.skitter.combat.windup).toBeLessThan(ENEMY_MOTION.brute.combat.windup);
    expect(ENEMY_MOTION.bloomlord.combat.hitWeight).toBeGreaterThan(ENEMY_MOTION.marauder.combat.hitWeight);
  });

  it('separates hero, defender, and tower personalities', () => {
    expect(HERO_MOTION.kael.combat).not.toEqual(HERO_MOTION.lyra.combat);
    expect(DEFENDER_MOTION.combat.windup).toBeLessThan(HERO_MOTION.lyra.combat.windup);
    expect(new Set(Object.values(TOWER_MOTION).map((motion) => motion.windup)).size).toBe(4);
    expect(TOWER_MOTION.ember.chargeScale).toBeGreaterThan(TOWER_MOTION.thorn.chargeScale);
  });

  it('uses stable desynchronization without touching simulation randomness', () => {
    expect(presentationSeed('enemy:41')).toBe(presentationSeed('enemy:41'));
    expect(presentationSeed('enemy:41')).not.toBe(presentationSeed('enemy:42'));
    expect(presentationSeed('hero:kael')).toBeGreaterThanOrEqual(0);
    expect(presentationSeed('hero:kael')).toBeLessThanOrEqual(1);
  });

  it('alternates locomotion poses across a stride', () => {
    expect(phaseFrame(Math.PI / 2)).toBe(2);
    expect(phaseFrame(Math.PI * 1.5)).toBe(3);
  });

  it('enforces death > hit > attack > locomotion > idle interruption priority', () => {
    const now = 10;
    expect(canInterruptAnimation('attack', 'hit', 11, now)).toBe(true);
    expect(canInterruptAnimation('hit', 'attack', 11, now)).toBe(false);
    expect(canInterruptAnimation('locomotion', 'attack', 11, now)).toBe(true);
    expect(canInterruptAnimation('death', 'hit', Number.POSITIVE_INFINITY, now)).toBe(false);
    expect(canInterruptAnimation('death', 'respawn', Number.POSITIVE_INFINITY, now)).toBe(true);
    expect(canInterruptAnimation('hit', 'idle', 9, now)).toBe(true);
  });
});
