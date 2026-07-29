import { describe, expect, it } from 'vitest';
import { HERO_LEVEL_THRESHOLDS, HERO_XP_BY_ENEMY, heroXpProgress } from '../src/game/content/heroProgression';
import type { DamageType, EnemyId, HeroId } from '../src/game/content/types';
import { GameSimulation } from '../src/game/simulation/GameSimulation';
import { PATH_LENGTH, pointOnPath, projectPointToPath, type Vec2 } from '../src/game/simulation/geometry';
import type { DamageOwner, EnemyState, HeroState, ProjectileStyle } from '../src/game/simulation/state';

type ProgressionInternals = {
  waveIndex: number;
  spawnEnemy(type: EnemyId, wave: number): void;
  hitEnemy(enemy: EnemyState, damage: number, damageType: DamageType, source: Vec2, splash: number, color: number, style: ProjectileStyle, owner: DamageOwner): boolean;
  resolveHeroBasicAttack(hero: HeroState, target: EnemyState): void;
};

function harness(): { simulation: GameSimulation; internal: ProgressionInternals; kael: HeroState; lyra: HeroState } {
  const simulation = new GameSimulation();
  simulation.begin();
  const internal = simulation as unknown as ProgressionInternals;
  internal.waveIndex = 1;
  const kael = simulation.getSnapshot().heroes.find((hero) => hero.id === 'kael')!;
  const lyra = simulation.getSnapshot().heroes.find((hero) => hero.id === 'lyra')!;
  simulation.drainEvents();
  return { simulation, internal, kael, lyra };
}

function spawnAt(internal: ProgressionInternals, simulation: GameSimulation, type: EnemyId, point: Vec2): EnemyState {
  internal.spawnEnemy(type, 1);
  const enemy = simulation.getSnapshot().enemies.at(-1)!;
  enemy.progress = projectPointToPath(point).progress;
  const routePoint = pointOnPath(enemy.progress);
  enemy.x = routePoint.x;
  enemy.y = routePoint.y;
  return enemy;
}

function lethal(internal: ProgressionInternals, enemy: EnemyState, owner: DamageOwner): boolean {
  enemy.hp = 1;
  return internal.hitEnemy(enemy, 10_000, 'true', enemy, 0, 0xffffff, owner.kind === 'hero' ? owner.heroId : 'impact', owner);
}

function heroOwner(heroId: HeroId, channel: 'basic' | 'ultimate' | 'magic' = 'basic'): DamageOwner {
  return { kind: 'hero', heroId, channel };
}

describe('last-hit-only hero mastery', () => {
  it('credits only the hero attached to the lethal command, never the selected or nearby hero', () => {
    const { simulation, internal, kael, lyra } = harness();
    const enemy = spawnAt(internal, simulation, 'marauder', kael);
    expect(lethal(internal, enemy, heroOwner('kael'))).toBe(true);
    expect({ xp: kael.xp, kills: kael.ownKills }).toEqual({ xp: HERO_XP_BY_ENEMY.marauder, kills: 1 });
    expect({ xp: lyra.xp, kills: lyra.ownKills }).toEqual({ xp: 0, kills: 0 });
    expect(simulation.drainEvents()).toContainEqual({ type: 'hero-xp', hero: 'kael', enemyUid: enemy.uid, amount: HERO_XP_BY_ENEMY.marauder, xp: HERO_XP_BY_ENEMY.marauder, ownKills: 1 });
  });

  it('pays each enemy at most once under duplicate lethal and queued-hit resolution', () => {
    const { simulation, internal, kael } = harness();
    const enemy = spawnAt(internal, simulation, 'skitter', kael);
    expect(lethal(internal, enemy, heroOwner('kael'))).toBe(true);
    expect(lethal(internal, enemy, heroOwner('kael', 'magic'))).toBe(false);
    expect(kael.xp).toBe(HERO_XP_BY_ENEMY.skitter);
    expect(kael.ownKills).toBe(1);
    expect(simulation.drainEvents().filter((event) => event.type === 'hero-xp')).toHaveLength(1);
  });

  it.each([
    [{ kind: 'tower', towerUid: 17 } as const, 'tower'],
    [{ kind: 'defender', defenderUid: 9 } as const, 'defender'],
    [{ kind: 'environment' } as const, 'environment'],
  ])('awards zero XP for a %s lethal', (owner, _label) => {
    const { simulation, internal, kael, lyra } = harness();
    const enemy = spawnAt(internal, simulation, 'brute', kael);
    lethal(internal, enemy, owner);
    expect([kael.xp, kael.ownKills, lyra.xp, lyra.ownKills]).toEqual([0, 0, 0, 0]);
    expect(simulation.drainEvents().some((event) => event.type === 'hero-xp')).toBe(false);
  });

  it('carries hero ownership through ultimates and Lyra Astral Echo chain kills', () => {
    const ability = harness();
    const kaelTarget = spawnAt(ability.internal, ability.simulation, 'skitter', ability.kael);
    kaelTarget.hp = 1;
    expect(ability.simulation.useAbility('kael', ability.kael)).toBe(true);
    expect(ability.kael.xp).toBe(HERO_XP_BY_ENEMY.skitter);
    expect(ability.lyra.xp).toBe(0);

    const echo = harness();
    // A Brute execution unlocks Astral Echo without mutating the other hero.
    lethal(echo.internal, spawnAt(echo.internal, echo.simulation, 'brute', echo.lyra), heroOwner('lyra'));
    expect(echo.lyra.level).toBe(2);
    echo.lyra.basicStrikeCount = 2;
    const primary = spawnAt(echo.internal, echo.simulation, 'brute', echo.lyra);
    const chained = spawnAt(echo.internal, echo.simulation, 'wisp', echo.lyra);
    primary.hp = primary.maxHp;
    chained.hp = 1;
    echo.internal.resolveHeroBasicAttack(echo.lyra, primary);
    expect(chained.alive).toBe(false);
    expect(echo.lyra.xp).toBe(HERO_XP_BY_ENEMY.brute + HERO_XP_BY_ENEMY.wisp);
    expect(echo.lyra.ownKills).toBe(2);
    expect(echo.kael.xp).toBe(0);
  });
});

describe('hero levels and milestone bounds', () => {
  it('crosses cumulative thresholds exactly and applies five bounded stat steps', () => {
    const { simulation, internal, kael } = harness();
    const base = { hp: kael.maxHp, damage: kael.damage, speed: kael.speed };
    for (let index = 0; index < 15; index += 1) lethal(internal, spawnAt(internal, simulation, 'bloomlord', kael), heroOwner('kael'));
    expect(kael.level).toBe(6);
    expect(kael.xp).toBe(HERO_LEVEL_THRESHOLDS.at(-1));
    expect(kael.maxHp).toBeCloseTo(base.hp * 1.05 ** 5, 8);
    expect(kael.damage).toBeCloseTo(base.damage * 1.07 ** 5, 8);
    expect(kael.speed).toBeCloseTo(base.speed * 1.075, 8);
    expect(kael.hp).toBeLessThanOrEqual(kael.maxHp);
    expect(kael.milestones).toEqual(['riftbrand', 'warden-pulse', 'living-bulwark']);
    expect(heroXpProgress(3, 300)).toEqual({ floor: 220, next: 500, current: 80, required: 280, ratio: 2 / 7 });
  });

  it('preserves XP, levels, milestones and own kills through defeat and respawn', () => {
    const { simulation, internal, kael } = harness();
    lethal(internal, spawnAt(internal, simulation, 'brute', kael), heroOwner('kael'));
    const mastery = { level: kael.level, xp: kael.xp, kills: kael.ownKills, milestones: [...kael.milestones] };
    kael.alive = false;
    kael.hp = 0;
    kael.respawnTime = 1 / 60;
    simulation.update(1 / 60);
    expect(kael.alive).toBe(true);
    expect(kael.hp).toBe(kael.maxHp);
    expect({ level: kael.level, xp: kael.xp, kills: kael.ownKills, milestones: kael.milestones }).toEqual(mastery);
  });

  it('bounds level-six kill healing and cooldown reductions under a multi-kill ultimate', () => {
    const { simulation, internal, lyra } = harness();
    for (let index = 0; index < 15; index += 1) lethal(internal, spawnAt(internal, simulation, 'bloomlord', lyra), heroOwner('lyra'));
    expect(lyra.level).toBe(6);
    lyra.ultimateCooldown = 12;
    const killsBefore = lyra.ownKills;
    for (let index = 0; index < 5; index += 1) {
      const enemy = spawnAt(internal, simulation, 'skitter', lyra);
      enemy.hp = 1;
    }
    // Reset only the activation gate; kill reductions occur after activation.
    lyra.ultimateCooldown = 0;
    expect(simulation.useAbility('lyra', lyra)).toBe(true);
    expect(lyra.ownKills).toBe(killsBefore + 5);
    expect(lyra.ultimateCooldown).toBeCloseTo(lyra.ultimateMax - 5 * 0.85, 8);
    expect(lyra.starseedPrimed).toBe(true);
    expect(lyra.hp).toBeLessThanOrEqual(lyra.maxHp);
  });

  it('unlocks stronger level-four ultimate footprints without bypassing the air domain', () => {
    const { simulation, internal, kael } = harness();
    for (let index = 0; index < 5; index += 1) lethal(internal, spawnAt(internal, simulation, 'bloomlord', kael), heroOwner('kael'));
    expect(kael.level).toBe(4);
    const origin = pointOnPath(projectPointToPath(kael).progress);
    const ground = spawnAt(internal, simulation, 'skitter', pointOnPath(Math.min(1, projectPointToPath(origin).progress + 145 / PATH_LENGTH)));
    const flying = spawnAt(internal, simulation, 'wisp', origin);
    ground.hp = 170;
    const groundBefore = ground.hp;
    const flyingBefore = flying.hp;
    simulation.useAbility('kael', origin);
    expect(ground.hp).toBeLessThan(groundBefore);
    expect(flying.hp).toBe(flyingBefore);
    expect(flying.engagedAllyUid).toBeNull();
  });
});
