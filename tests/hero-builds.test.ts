import { describe, expect, it } from 'vitest';
import { HERO_ARTIFACTS, HERO_SPELLS, heroArtifactsForHero, heroSpellsForHero } from '../src/game/content/heroProgression';
import type { DamageType, EnemyId, HeroId } from '../src/game/content/types';
import { GameSimulation } from '../src/game/simulation/GameSimulation';
import { pointOnPath, projectPointToPath, type Vec2 } from '../src/game/simulation/geometry';
import type { DamageOwner, EnemyState, HeroState, ProjectileStyle } from '../src/game/simulation/state';

type HeroBuildInternals = {
  waveIndex: number;
  spawnEnemy(type: EnemyId, wave: number): void;
  hitEnemy(enemy: EnemyState, damage: number, damageType: DamageType, source: Vec2, splash: number, color: number, style: ProjectileStyle, owner: DamageOwner): boolean;
};

function harness() {
  const simulation = new GameSimulation();
  simulation.begin();
  const internal = simulation as unknown as HeroBuildInternals;
  internal.waveIndex = 1;
  simulation.drainEvents();
  return { simulation, internal };
}

function hero(simulation: GameSimulation, id: HeroId): HeroState {
  return simulation.getSnapshot().heroes.find((candidate) => candidate.id === id)!;
}

function spawnAt(simulation: GameSimulation, internal: HeroBuildInternals, type: EnemyId, point: Vec2): EnemyState {
  internal.spawnEnemy(type, 1);
  const enemy = simulation.getSnapshot().enemies.at(-1)!;
  enemy.progress = projectPointToPath(point).progress;
  Object.assign(enemy, pointOnPath(enemy.progress));
  return enemy;
}

function personalKill(simulation: GameSimulation, internal: HeroBuildInternals, id: HeroId, type: EnemyId = 'bloomlord'): void {
  const owner: DamageOwner = { kind: 'hero', heroId: id, channel: 'basic' };
  const enemy = spawnAt(simulation, internal, type, hero(simulation, id));
  enemy.hp = 1;
  internal.hitEnemy(enemy, 10_000, 'true', enemy, 0, 0xffffff, id, owner);
}

describe('compact hero spell books', () => {
  it('rejects unknown runtime spell commands without mutating cooldowns or events', () => {
    const { simulation } = harness();
    const kael = hero(simulation, 'kael');
    const before = { ...kael.spellCooldowns };
    const unknown = 'future-unregistered-spell' as Parameters<GameSimulation['useHeroSpell']>[1];
    expect(simulation.getHeroSpellTargeting('kael', unknown)).toBeNull();
    expect(simulation.canUseHeroSpell('kael', unknown, kael)).toBe(false);
    expect(simulation.useHeroSpell('kael', unknown, kael)).toBe(false);
    expect(kael.spellCooldowns).toEqual(before);
    expect(simulation.drainEvents()).toEqual([]);
  });

  it.each(['kael', 'lyra'] as const)('gives %s two actives and two passives with ordered run unlocks', (id) => {
    const spells = heroSpellsForHero(id);
    expect(spells).toHaveLength(4);
    expect(spells.filter((spell) => spell.kind === 'active')).toHaveLength(2);
    expect(spells.filter((spell) => spell.kind === 'passive')).toHaveLength(2);
    expect(spells.map((spell) => spell.unlockLevel).sort((a, b) => a - b)).toEqual([1, 2, 4, 6]);
    expect(spells.every((spell) => spell.description.length >= 45)).toBe(true);
  });

  it('unlocks secondary actives through personal kills and rejects foreign or locked spells', () => {
    const { simulation, internal } = harness();
    const kael = hero(simulation, 'kael');
    expect(simulation.useHeroSpell('kael', 'warden-pulse', kael)).toBe(false);
    expect(simulation.useHeroSpell('kael', 'starfall', kael)).toBe(false);
    for (let index = 0; index < 5; index += 1) personalKill(simulation, internal, 'kael');
    expect(kael.level).toBe(4);
    expect(kael.unlockedSpells).toEqual(['rift-quake', 'riftbrand', 'warden-pulse']);
    kael.hp = kael.maxHp * 0.5;
    const target = spawnAt(simulation, internal, 'brute', kael);
    expect(simulation.useHeroSpell('kael', 'warden-pulse', { x: 0, y: 0 })).toBe(true);
    expect(kael.hp).toBeCloseTo(kael.maxHp * 0.68, 8);
    expect(target.exposed).toBe(0.18);
    expect(simulation.drainEvents()).toContainEqual(expect.objectContaining({ type: 'hero-spell-cast', hero: 'kael', spell: 'warden-pulse', targets: [target.uid] }));
  });

  it('caps Falling Constellation at three deterministic elite-priority marks', () => {
    const { simulation, internal } = harness();
    for (let index = 0; index < 5; index += 1) personalKill(simulation, internal, 'lyra');
    const lyra = hero(simulation, 'lyra');
    const enemies = ['skitter', 'marauder', 'brute', 'wisp']
      .map((type) => spawnAt(simulation, internal, type as EnemyId, lyra));
    expect(simulation.useHeroSpell('lyra', 'falling-constellation', lyra)).toBe(true);
    const marked = enemies.filter((enemy) => enemy.mark === 0.25);
    expect(marked).toHaveLength(HERO_SPELLS['falling-constellation'].maxTargets);
    expect(marked.map((enemy) => enemy.type)).toEqual(['marauder', 'brute', 'wisp']);
  });
});

describe('artifact loadout tradeoffs', () => {
  it.each(['kael', 'lyra'] as const)('offers %s three mutually exclusive, hero-owned artifacts', (id) => {
    const artifacts = heroArtifactsForHero(id);
    expect(artifacts).toHaveLength(3);
    expect(artifacts.every((artifact) => artifact.hero === id && artifact.upside.length > 10 && artifact.tradeoff.length > 10)).toBe(true);
  });

  it('rejects cross-hero artifacts atomically and locks the loadout when combat begins', () => {
    const simulation = new GameSimulation();
    expect(simulation.setHeroArtifactLoadout({ kael: 'far-star-lens', lyra: 'comet-prism' })).toBe(false);
    expect(simulation.setHeroArtifactLoadout({ stranger: null } as unknown as Parameters<GameSimulation['setHeroArtifactLoadout']>[0])).toBe(false);
    expect(simulation.getSnapshot().heroes.map((candidate) => candidate.artifact)).toEqual([null, null]);
    expect(simulation.setHeroArtifactLoadout({ kael: 'bastion-seal', lyra: 'comet-prism' })).toBe(true);
    expect(hero(simulation, 'kael').artifact).toBe('bastion-seal');
    simulation.begin();
    expect(simulation.setHeroArtifactLoadout({ kael: 'riftglass-edge' })).toBe(false);
    expect(hero(simulation, 'kael').artifact).toBe('bastion-seal');
  });

  it('applies bounded upsides and explicit costs rather than universal upgrades', () => {
    const baseline = new GameSimulation();
    const baseKael = hero(baseline, 'kael');
    const baseLyra = hero(baseline, 'lyra');
    const simulation = new GameSimulation();
    simulation.setHeroArtifactLoadout({ kael: 'riftglass-edge', lyra: 'far-star-lens' });
    const kael = hero(simulation, 'kael');
    const lyra = hero(simulation, 'lyra');
    expect(kael.damage).toBeCloseTo(baseKael.damage * HERO_ARTIFACTS['riftglass-edge'].modifiers.damage!, 8);
    expect(kael.armor).toBeLessThan(baseKael.armor);
    expect(lyra.range).toBeGreaterThan(baseLyra.range);
    expect(lyra.maxHp).toBeLessThan(baseLyra.maxHp);
    simulation.begin();
    const extendedPoint = { x: lyra.x + 180, y: lyra.y };
    expect(180).toBeGreaterThan(HERO_SPELLS.starfall.castRange);
    expect(simulation.canUseHeroSpell('lyra', 'starfall', extendedPoint)).toBe(true);
  });

  it('keeps artifact modifiers inside balance guardrails', () => {
    for (const artifact of Object.values(HERO_ARTIFACTS)) {
      const modifiers = artifact.modifiers;
      expect(modifiers.damage ?? 1).toBeGreaterThanOrEqual(0.9);
      expect(modifiers.damage ?? 1).toBeLessThanOrEqual(1.2);
      expect(modifiers.maxHp ?? 1).toBeGreaterThanOrEqual(0.9);
      expect(modifiers.maxHp ?? 1).toBeLessThanOrEqual(1.15);
      expect(modifiers.spellDamage ?? 1).toBeLessThanOrEqual(1.2);
      expect(modifiers.spellCooldown ?? 1).toBeGreaterThanOrEqual(0.8);
      expect(modifiers.spellCooldown ?? 1).toBeLessThanOrEqual(1.15);
    }
  });
});

describe('hero build determinism', () => {
  it('produces identical state and event streams for identical build commands', () => {
    const run = () => {
      const simulation = new GameSimulation();
      simulation.setHeroArtifactLoadout({ kael: 'oathstone-standard', lyra: 'echo-charm' });
      simulation.begin();
      const internal = simulation as unknown as HeroBuildInternals;
      internal.waveIndex = 1;
      simulation.drainEvents();
      for (let index = 0; index < 5; index += 1) personalKill(simulation, internal, 'lyra');
      const lyra = hero(simulation, 'lyra');
      const target = spawnAt(simulation, internal, 'brute', lyra);
      simulation.useHeroSpell('lyra', 'falling-constellation', target);
      simulation.update(1.25);
      return { hero: { ...lyra, spellCooldowns: { ...lyra.spellCooldowns } }, enemy: { ...target }, events: simulation.drainEvents() };
    };
    expect(run()).toEqual(run());
  });
});
