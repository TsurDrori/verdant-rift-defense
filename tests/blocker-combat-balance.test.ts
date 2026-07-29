import { describe, expect, it } from 'vitest';
import { COMBAT_BALANCE } from '../src/game/content/combatBalance';
import { ENEMIES } from '../src/game/content/enemies';
import { heroAbilitySpec } from '../src/game/content/heroProgression';
import { GameSimulation } from '../src/game/simulation/GameSimulation';
import { distance, PATH_LENGTH, pointInPathLane, projectPointToPath } from '../src/game/simulation/geometry';
import type { DamageOwner, DefenderState, EnemyState, HeroState } from '../src/game/simulation/state';

type Internals = {
  gold: number;
  waveIndex: number;
  spawnEnemy(type: 'skitter' | 'marauder' | 'brute', wave: number): void;
  hitAlly(ally: HeroState | DefenderState, enemy: EnemyState, rawDamage: number): void;
  hitEnemy(enemy: EnemyState, damage: number, damageType: 'true', source: HeroState, splash: number, color: number, style: 'kael', owner: DamageOwner): boolean;
  levelUpHero(hero: HeroState): void;
  contactDistance(ally: HeroState | DefenderState, enemy: EnemyState): number;
};

function setup(): { simulation: GameSimulation; internal: Internals } {
  const simulation = new GameSimulation();
  simulation.begin();
  const internal = simulation as unknown as Internals;
  internal.gold = 10_000;
  internal.waveIndex = 12;
  return { simulation, internal };
}

function place(enemy: EnemyState, progress: number, laneOffset = enemy.laneOffset): void {
  enemy.progress = progress;
  enemy.laneOffset = laneOffset;
  enemy.laneTarget = laneOffset;
  const point = pointInPathLane(progress, laneOffset);
  enemy.x = point.x;
  enemy.y = point.y;
}

function advance(simulation: GameSimulation, seconds: number): void {
  for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += 1 / 60) simulation.update(1 / 60);
}

function disableHeroes(simulation: GameSimulation): void {
  simulation.getSnapshot().heroes.forEach((hero) => { hero.alive = false; hero.respawnTime = 999; });
}

describe('capacity-bounded blocking and lane throughput', () => {
  it('recenters a bypassing creep and allows a downstream post to block it', () => {
    const { simulation, internal } = setup();
    disableHeroes(simulation);
    simulation.buildTower(4, 'aegis');
    simulation.buildTower(7, 'aegis');
    simulation.getSnapshot().towers.forEach((tower) => { tower.disabledTime = 999; });
    const [firstTower, secondTower] = simulation.getSnapshot().towers;
    const firstPost = simulation.getSnapshot().defenders.find((defender) => defender.towerUid === firstTower!.uid && defender.slot === 0)!;
    const firstReserve = simulation.getSnapshot().defenders.find((defender) => defender.towerUid === firstTower!.uid && defender.slot === 1)!;
    const secondPost = simulation.getSnapshot().defenders.find((defender) => defender.towerUid === secondTower!.uid && defender.slot === 0)!;
    const secondReserve = simulation.getSnapshot().defenders.find((defender) => defender.towerUid === secondTower!.uid && defender.slot === 1)!;
    [firstReserve, secondReserve].forEach((defender) => { defender.alive = false; defender.respawnTime = 999; });
    for (let index = 0; index < 2; index += 1) internal.spawnEnemy('brute', 1);
    const [held, follower] = simulation.getSnapshot().enemies;
    [held!, follower!].forEach((enemy) => { enemy.hp = enemy.maxHp = 1_000_000; enemy.attackCooldown = 999; });
    const firstProgress = projectPointToPath(firstPost.home).progress;
    place(held!, firstProgress, -18);
    place(follower!, firstProgress - 52 / PATH_LENGTH, -18);

    let elapsed = 0;
    while (follower!.engagedAllyUid !== secondPost.allyUid && elapsed < 45) {
      simulation.update(1 / 60);
      elapsed += 1 / 60;
    }
    expect(held!.engagedAllyUid).toBe(firstPost.allyUid);
    expect(follower!.engagedAllyUid).toBe(secondPost.allyUid);
    expect(Math.abs(follower!.laneOffset)).toBeLessThanOrEqual(Math.max(...COMBAT_BALANCE.lanes.spawnOffsets.map(Math.abs)) + 1e-9);
    expect((COMBAT_BALANCE.lanes.spawnOffsets as readonly number[]).includes(follower!.laneTarget)).toBe(true);
  });

  it('locks a reserved creep to a reachable band and releases impossible lane/leash reservations', () => {
    const { simulation, internal } = setup();
    disableHeroes(simulation);
    simulation.buildTower(4, 'aegis');
    simulation.getSnapshot().towers[0]!.disabledTime = 999;
    const [defender, reserve] = simulation.getSnapshot().defenders;
    reserve!.alive = false;
    reserve!.respawnTime = 999;
    internal.spawnEnemy('skitter', 1);
    const enemy = simulation.getSnapshot().enemies[0]!;
    enemy.hp = enemy.maxHp = 1_000_000;
    enemy.attackCooldown = 999;
    place(enemy, projectPointToPath(defender!).progress - 20 / PATH_LENGTH, 18);
    simulation.update(1 / 60);
    expect(enemy.engagedAllyUid).toBe(defender!.allyUid);
    enemy.laneTarget = COMBAT_BALANCE.lanes.halfWidth;
    advance(simulation, 1);
    expect(Math.abs(enemy.laneTarget)).toBeLessThanOrEqual(Math.max(...COMBAT_BALANCE.lanes.spawnOffsets.map(Math.abs)));
    expect(enemy.engagedAllyUid).toBe(defender!.allyUid);
    expect(distance(enemy, defender!)).toBeLessThanOrEqual(internal.contactDistance(defender!, enemy) + 0.75);

    enemy.laneOffset = COMBAT_BALANCE.lanes.halfWidth;
    Object.assign(enemy, pointInPathLane(enemy.progress, enemy.laneOffset));
    simulation.update(1 / 60);
    expect(enemy.engagedAllyUid).toBeNull();
    expect(defender!.engagedEnemyUid).toBeNull();

    place(enemy, projectPointToPath(defender!.home).progress, 18);
    simulation.update(1 / 60);
    expect(enemy.engagedAllyUid).toBe(defender!.allyUid);
    place(enemy, projectPointToPath(defender!.home).progress + (112 + 50) / PATH_LENGTH, 18);
    simulation.update(1 / 60);
    expect(enemy.engagedAllyUid).toBeNull();
    expect(defender!.engagedEnemyUid).toBeNull();
  });

  it('lets same-band followers smoothly bypass one indefinitely blocked creep', () => {
    const { simulation, internal } = setup();
    disableHeroes(simulation);
    simulation.buildTower(4, 'aegis');
    simulation.getSnapshot().towers[0]!.disabledTime = 999;
    const [blocker, reserve] = simulation.getSnapshot().defenders;
    reserve!.alive = false;
    reserve!.respawnTime = 999;
    blocker!.armor = 1;
    const post = projectPointToPath(blocker!.home).progress;
    for (let index = 0; index < 3; index += 1) internal.spawnEnemy('brute', 1);
    const [held, firstFollower, secondFollower] = simulation.getSnapshot().enemies;
    [held!, firstFollower!, secondFollower!].forEach((enemy, index) => {
      enemy.hp = enemy.maxHp = 1_000_000;
      enemy.attackCooldown = 999;
      place(enemy, post - index * 52 / PATH_LENGTH, -18);
    });

    let minimumClearance = Number.POSITIVE_INFINITY;
    let minimumClearanceAt: unknown;
    let previous = simulation.getSnapshot().enemies.map((enemy) => ({ x: enemy.x, y: enemy.y }));
    for (let tick = 0; tick < 15 * 60; tick += 1) {
      simulation.update(1 / 60);
      const enemies = simulation.getSnapshot().enemies;
      enemies.forEach((enemy, index) => {
        expect(Math.abs(enemy.laneOffset)).toBeLessThanOrEqual(COMBAT_BALANCE.lanes.halfWidth + 1e-9);
        const maxStep = Math.hypot(ENEMIES[enemy.type].speed, COMBAT_BALANCE.lanes.lateralSpeed) / 60 + 0.15;
        expect(distance(enemy, previous[index]!)).toBeLessThanOrEqual(maxStep);
      });
      for (let left = 0; left < enemies.length; left += 1) {
        for (let right = left + 1; right < enemies.length; right += 1) {
          const bodyClearance = distance(enemies[left]!, enemies[right]!) - ENEMIES[enemies[left]!.type].radius - ENEMIES[enemies[right]!.type].radius;
          if (bodyClearance < minimumClearance) {
            minimumClearance = bodyClearance;
            minimumClearanceAt = { tick, left, right, bodyClearance, a: { p: enemies[left]!.progress, lane: enemies[left]!.laneOffset }, b: { p: enemies[right]!.progress, lane: enemies[right]!.laneOffset } };
          }
        }
      }
      previous = enemies.map((enemy) => ({ x: enemy.x, y: enemy.y }));
    }

    expect(held!.engagedAllyUid).toBe(blocker!.allyUid);
    expect(firstFollower!.progress).toBeGreaterThan(held!.progress + 150 / PATH_LENGTH);
    expect(secondFollower!.progress).toBeGreaterThan(held!.progress + 100 / PATH_LENGTH);
    // Arc-length collision and interpolated corner normals differ by subpixel
    // curvature error; half a pixel is the render-safe geometric epsilon.
    expect(minimumClearance, JSON.stringify(minimumClearanceAt)).toBeGreaterThanOrEqual(-0.5);
  });

  it('allows N defenders to reserve at most N creeps while all N+1 traffic passes', () => {
    const { simulation, internal } = setup();
    disableHeroes(simulation);
    simulation.buildTower(4, 'aegis');
    simulation.upgradeTower(1);
    simulation.getSnapshot().towers[0]!.disabledTime = 999;
    const defenders = simulation.getSnapshot().defenders;
    defenders.forEach((defender) => { defender.armor = 1; });
    for (let index = 0; index < 7; index += 1) internal.spawnEnemy('brute', 1);
    const defenderPosts = defenders.map((defender) => projectPointToPath(defender.home).progress);
    const rearPost = Math.min(...defenderPosts);
    simulation.getSnapshot().enemies.forEach((enemy, index) => {
      enemy.hp = enemy.maxHp = 1_000_000;
      enemy.attackCooldown = 999;
      const progress = index < defenders.length
        ? defenderPosts[index]!
        : rearPost - (index - defenders.length + 1) * 52 / PATH_LENGTH;
      place(enemy, progress, index % 2 === 0 ? -18 : 18);
    });

    let maxEngagements = 0;
    for (let tick = 0; tick < 20 * 60; tick += 1) {
      simulation.update(1 / 60);
      maxEngagements = Math.max(maxEngagements, simulation.getSnapshot().enemies.filter((enemy) => enemy.engagedAllyUid !== null).length);
    }
    const held = simulation.getSnapshot().enemies.filter((enemy) => enemy.engagedAllyUid !== null);
    const passing = simulation.getSnapshot().enemies.filter((enemy) => enemy.engagedAllyUid === null && enemy.alive);
    expect(maxEngagements).toBe(defenders.length);
    expect(held).toHaveLength(defenders.length);
    expect(new Set(held.map((enemy) => enemy.engagedAllyUid)).size).toBe(defenders.length);
    expect(passing.length).toBeGreaterThanOrEqual(3);
    expect(passing.every((enemy) => enemy.progress > Math.max(...held.map((enemy) => enemy.progress)) + 80 / PATH_LENGTH), JSON.stringify({ held: held.map((enemy) => [enemy.progress, enemy.laneOffset]), passing: passing.map((enemy) => [enemy.progress, enemy.laneOffset]) })).toBe(true);
  });
});

describe('armor-adjusted durability, recovery and ability bounds', () => {
  it('applies the tuned ten-second pressure to Kael and a Mirror defender at legal contact', () => {
    const kaelRun = setup();
    const kael = kaelRun.simulation.getSnapshot().heroes.find((hero) => hero.id === 'kael')!;
    kaelRun.simulation.getSnapshot().heroes.find((hero) => hero.id === 'lyra')!.alive = false;
    kaelRun.internal.spawnEnemy('brute', 1);
    const brute = kaelRun.simulation.getSnapshot().enemies[0]!;
    brute.hp = brute.maxHp = 1_000_000;
    place(brute, projectPointToPath(kael).progress, 18);
    const kaelHits: number[] = [];
    for (let tick = 0; tick < 10 * 60; tick += 1) {
      kaelRun.simulation.update(1 / 60);
      kaelHits.push(...kaelRun.simulation.drainEvents().flatMap((event) => (
        event.type === 'ally-hit' && event.allyUid === 'hero:kael' ? [event.amount] : []
      )));
    }
    expect(kaelHits.length).toBeGreaterThanOrEqual(8);
    expect(kaelHits.every((amount) => Math.abs(amount - ENEMIES.brute.attackDamage * (1 - kael.armor)) < 1e-9)).toBe(true);
    expect(kael.hp).toBeCloseTo(kael.maxHp - kaelHits.reduce((sum, amount) => sum + amount, 0), 7);
    expect(distance(kael, brute)).toBeLessThanOrEqual(kaelRun.internal.contactDistance(kael, brute) + 0.75);

    const defenderRun = setup();
    disableHeroes(defenderRun.simulation);
    defenderRun.simulation.buildTower(4, 'aegis');
    defenderRun.simulation.upgradeTower(1);
    defenderRun.simulation.upgradeTower(1);
    defenderRun.simulation.chooseBranch(1, 'right');
    defenderRun.simulation.getSnapshot().towers[0]!.disabledTime = 999;
    const [defender, reserve] = defenderRun.simulation.getSnapshot().defenders;
    reserve!.alive = false;
    reserve!.respawnTime = 999;
    defenderRun.internal.spawnEnemy('marauder', 1);
    const marauder = defenderRun.simulation.getSnapshot().enemies[0]!;
    marauder.hp = marauder.maxHp = 1_000_000;
    place(marauder, projectPointToPath(defender!).progress, -18);
    const hits: number[] = [];
    for (let tick = 0; tick < 10 * 60; tick += 1) {
      defenderRun.simulation.update(1 / 60);
      hits.push(...defenderRun.simulation.drainEvents().flatMap((event) => (
        event.type === 'ally-hit' && event.allyUid === defender!.allyUid ? [event.amount] : []
      )));
    }
    expect(hits.length).toBeGreaterThanOrEqual(10);
    expect(hits.every((amount) => Math.abs(amount - ENEMIES.marauder.attackDamage * (1 - defender!.armor)) < 1e-9)).toBe(true);
    expect(defender!.hp).toBeCloseTo(defender!.maxHp - hits.reduce((sum, amount) => sum + amount, 0), 7);
    expect(distance(defender!, marauder)).toBeLessThanOrEqual(defenderRun.internal.contactDistance(defender!, marauder) + 0.75);
  });

  it('regenerates only after uninterrupted disengagement, at the documented rate, with cap and down-state guards', () => {
    const { simulation, internal } = setup();
    simulation.buildTower(0, 'aegis');
    const defender = simulation.getSnapshot().defenders[0]!;
    defender.hp = 50;
    defender.regenCooldown = COMBAT_BALANCE.recovery.defender.delay;
    advance(simulation, 2.9);
    expect(defender.hp).toBe(50);
    advance(simulation, 0.2);
    expect(defender.hp).toBeGreaterThan(50);

    defender.hp = 50;
    defender.regenCooldown = 0;
    advance(simulation, 1);
    expect(defender.hp).toBeCloseTo(50 + defender.maxHp * COMBAT_BALANCE.recovery.defender.maxHpPerSecond, 6);
    defender.hp = defender.maxHp - 1;
    defender.regenCooldown = 0;
    advance(simulation, 1);
    expect(defender.hp).toBe(defender.maxHp);

    internal.spawnEnemy('skitter', 1);
    const skitter = simulation.getSnapshot().enemies.at(-1)!;
    skitter.alive = false;
    defender.hp = 50;
    defender.regenCooldown = 0;
    internal.hitAlly(defender, skitter, 1);
    const afterHit = defender.hp;
    advance(simulation, 2.9);
    expect(defender.hp).toBe(afterHit);
    defender.alive = false;
    defender.hp = 0;
    defender.respawnTime = 5;
    defender.regenCooldown = 0;
    advance(simulation, 2);
    expect(defender.hp).toBe(0);
  });

  it('gives heroes delayed tactical-withdrawal recovery and interrupts it immediately on damage', () => {
    const { simulation, internal } = setup();
    const lyra = simulation.getSnapshot().heroes.find((hero) => hero.id === 'lyra')!;
    lyra.hp = 100;
    lyra.regenCooldown = 0;
    advance(simulation, 1);
    expect(lyra.hp).toBeCloseTo(100 + lyra.maxHp * COMBAT_BALANCE.recovery.hero.maxHpPerSecond, 6);
    internal.spawnEnemy('skitter', 1);
    const enemy = simulation.getSnapshot().enemies.at(-1)!;
    enemy.alive = false;
    internal.hitAlly(lyra, enemy, 1);
    const afterHit = lyra.hp;
    advance(simulation, 3.9);
    expect(lyra.hp).toBe(afterHit);
    advance(simulation, 0.2);
    expect(lyra.hp).toBeGreaterThan(afterHit);
  });

  it('keeps level-one and level-five Kael mortal under Brute pressure and respawns at full health', () => {
    const timeToDefeat = (level: 1 | 5) => {
      const { simulation, internal } = setup();
      const kael = simulation.getSnapshot().heroes.find((hero) => hero.id === 'kael')!;
      simulation.getSnapshot().heroes.find((hero) => hero.id === 'lyra')!.alive = false;
      if (level === 5) for (let step = 1; step < 5; step += 1) internal.levelUpHero(kael);
      internal.spawnEnemy('brute', 1);
      const brute = simulation.getSnapshot().enemies[0]!;
      brute.hp = brute.maxHp = 1_000_000;
      place(brute, projectPointToPath(kael).progress, 18);
      let elapsed = 0;
      while (kael.alive && elapsed < 30) { simulation.update(1 / 60); elapsed += 1 / 60; }
      expect(kael.alive).toBe(false);
      brute.alive = false;
      advance(simulation, kael.respawnMax + 0.1);
      expect(kael.alive).toBe(true);
      expect(kael.hp).toBe(kael.maxHp);
      return elapsed;
    };
    const levelOne = timeToDefeat(1);
    const levelFive = timeToDefeat(5);
    expect(levelOne).toBeGreaterThan(13);
    expect(levelOne).toBeLessThan(15.5);
    expect(levelFive).toBeGreaterThan(levelOne);
    expect(levelFive).toBeLessThan(18.5);
  });

  it('lets passing enemies hurt Lyra without reserving or stopping, and rejects map-wide ultimates', () => {
    const { simulation, internal } = setup();
    const kael = simulation.getSnapshot().heroes.find((hero) => hero.id === 'kael')!;
    const lyra = simulation.getSnapshot().heroes.find((hero) => hero.id === 'lyra')!;
    kael.alive = false;
    internal.spawnEnemy('skitter', 1);
    const passing = simulation.getSnapshot().enemies[0]!;
    place(passing, projectPointToPath(lyra).progress, 18);
    const hpBefore = lyra.hp;
    const progressBefore = passing.progress;
    advance(simulation, 0.25);
    expect(lyra.hp).toBeCloseTo(hpBefore - ENEMIES.skitter.attackDamage * (1 - lyra.armor), 7);
    expect(passing.engagedAllyUid).toBeNull();
    expect(lyra.engagedEnemyUid).toBeNull();
    expect(passing.progress).toBeGreaterThan(progressBefore);

    const rangeRun = setup();
    const rangeKael = rangeRun.simulation.getSnapshot().heroes.find((hero) => hero.id === 'kael')!;
    rangeRun.internal.spawnEnemy('skitter', 1);
    const far = rangeRun.simulation.getSnapshot().enemies[0]!;
    place(far, Math.max(0, projectPointToPath(rangeKael).progress - 500 / PATH_LENGTH), -18);
    far.hp = 1;
    expect(rangeRun.simulation.useAbility('kael', far)).toBe(false);
    expect(rangeKael.ultimateCooldown).toBe(0);
    expect(far.hp).toBe(1);
    expect(rangeKael.xp).toBe(0);
    expect(rangeRun.simulation.useAbility('kael', rangeKael)).toBe(true);
    expect(far.hp).toBe(1);
    expect(rangeKael.xp).toBe(0);

    rangeKael.ultimateCooldown = 0;
    for (let step = 1; step < 4; step += 1) rangeRun.internal.levelUpHero(rangeKael);
    const empowered = heroAbilitySpec('kael', rangeKael.level);
    expect(rangeRun.simulation.useAbility('kael', { x: rangeKael.x + empowered.castRange, y: rangeKael.y })).toBe(true);
    rangeKael.ultimateCooldown = 0;
    expect(rangeRun.simulation.useAbility('kael', { x: rangeKael.x + empowered.castRange + 0.01, y: rangeKael.y })).toBe(false);
  });
});
