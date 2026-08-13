import { describe, expect, it } from 'vitest';
import { TOWERS } from '../src/game/content/towers';
import { COMBAT_BALANCE } from '../src/game/content/combatBalance';
import { ENEMIES } from '../src/game/content/enemies';
import { RUN_DEFINITIONS } from '../src/game/content/generated/stages';
import { GameSimulation } from '../src/game/simulation/GameSimulation';
import { distance, PATH_LENGTH, pointInPathLane, projectPointToPath } from '../src/game/simulation/geometry';
import type { GameEvent } from '../src/game/simulation/state';
import { starRating } from '../src/ui/GameUI';

function advance(simulation: GameSimulation, seconds: number): void {
  for (let elapsed = 0; elapsed < seconds; elapsed += 0.05) simulation.update(0.05);
}

describe('content integrity', () => {
  it('keeps every wave group bound to a valid enemy', () => {
    for (const run of Object.values(RUN_DEFINITIONS)) {
      expect(run.waves.length).toBeGreaterThan(0);
      for (const wave of run.waves) {
        expect(wave.groups.length).toBeGreaterThan(0);
        for (const group of wave.groups) {
          expect(ENEMIES[group.enemy]).toBeDefined();
          expect(run.map.routes.some((route) => route.id === (group.route ?? run.map.primaryRouteId))).toBe(true);
          expect(group.count).toBeGreaterThan(0);
          expect(group.interval).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('gives every tower three ranks and a real final tradeoff', () => {
    for (const tower of Object.values(TOWERS)) {
      expect(tower.upgrades).toHaveLength(2);
      expect(tower.branches.left.name).not.toBe(tower.branches.right.name);
      expect(tower.branches.left.description).not.toBe(tower.branches.right.description);
      expect(tower.branches.left.cost).toBeGreaterThan(0);
      expect(tower.branches.right.cost).toBeGreaterThan(0);
    }
  });
});

describe('deterministic battle simulation', () => {
  const fingerprint = (simulation: GameSimulation) => {
    const state = simulation.getSnapshot();
    return {
      phase: state.phase, gold: state.gold, lives: state.lives, wave: state.wave, score: state.score,
      enemies: state.enemies.filter((enemy) => enemy.alive).map((enemy) => [enemy.uid, enemy.type, enemy.hp.toFixed(5), enemy.progress.toFixed(6)]),
      towers: state.towers.map((tower) => [tower.uid, tower.cooldown.toFixed(6), tower.kills, tower.shots]),
      heroes: state.heroes.map((hero) => [hero.id, hero.hp.toFixed(5), hero.alive, hero.engagedEnemyUid, hero.attackCooldown.toFixed(6), hero.ultimateCooldown.toFixed(6)]),
      defenders: state.defenders.map((defender) => [defender.allyUid, defender.hp.toFixed(5), defender.alive, defender.engagedEnemyUid, defender.attackCooldown.toFixed(6)]),
    };
  };

  it('enforces build, upgrade, specialization, and resale economics', () => {
    const simulation = new GameSimulation();
    simulation.begin();
    expect(simulation.buildTower(0, 'thorn')).toBe(true);
    expect(simulation.buildTower(0, 'astral')).toBe(false);
    expect(simulation.getSnapshot().gold).toBe(225);
    expect(simulation.upgradeTower(1)).toBe(true);
    expect(simulation.upgradeTower(1)).toBe(true);
    expect(simulation.chooseBranch(1, 'left')).toBe(false);
    expect(simulation.sellTower(1)).toBe(true);
    expect(simulation.getSnapshot().towers).toHaveLength(0);
    expect(simulation.getSnapshot().gold).toBe(230);
  });

  it('commits a tactical panel transaction atomically and restores paused phase', () => {
    const simulation = new GameSimulation();
    simulation.begin();
    simulation.togglePause();
    expect(simulation.getSnapshot().phase).toBe('paused');
    const built = simulation.runTacticalTransaction(() => simulation.buildTower(0, 'thorn'));
    expect(built).toBe(true);
    expect(simulation.getSnapshot().phase).toBe('paused');
    expect(simulation.getSnapshot().towers).toHaveLength(1);
    expect(simulation.getSnapshot().gold).toBe(225);
  });

  it('spawns and resolves the first wave without frame-rate dependence', () => {
    const a = new GameSimulation();
    const b = new GameSimulation();
    a.begin(); b.begin();
    a.startWave(); b.startWave();
    for (let frame = 0; frame < 900; frame += 1) a.update(0.05);
    for (let frame = 0; frame < 1800; frame += 1) b.update(0.025);
    const stateA = a.getSnapshot();
    const stateB = b.getSnapshot();
    expect(stateA.wave).toBe(stateB.wave);
    expect(stateA.lives).toBeGreaterThan(0);
    expect(stateB.lives).toBe(stateA.lives);
    expect(stateB.waveActive).toBe(stateA.waveActive);
    expect(stateB.score).toBe(stateA.score);
    expect(stateB.gold).toBe(stateA.gold);
    expect(stateB.enemies.filter((enemy) => enemy.alive).map((enemy) => [enemy.type, enemy.hp.toFixed(4), enemy.progress.toFixed(5)]))
      .toEqual(stateA.enemies.filter((enemy) => enemy.alive).map((enemy) => [enemy.type, enemy.hp.toFixed(4), enemy.progress.toFixed(5)]));
  });

  it('makes hero ultimates consequential and cooldown-gated', () => {
    const simulation = new GameSimulation();
    simulation.begin();
    simulation.startWave();
    advance(simulation, 2);
    const enemy = simulation.getSnapshot().enemies.find((candidate) => candidate.alive);
    expect(enemy).toBeDefined();
    const target = enemy!;
    const lyra = simulation.getSnapshot().heroes.find((hero) => hero.id === 'lyra')!;
    target.progress = projectPointToPath(lyra).progress;
    target.laneOffset = 18;
    target.laneTarget = 18;
    Object.assign(target, pointInPathLane(target.progress, target.laneOffset));
    const hpBefore = target.hp;
    expect(simulation.useAbility('lyra', { x: target.x, y: target.y })).toBe(true);
    expect(target.hp).toBeLessThan(hpBefore);
    expect(simulation.useAbility('lyra', { x: target.x, y: target.y })).toBe(false);
    advance(simulation, 32);
    expect(simulation.getSnapshot().heroes.find((hero) => hero.id === 'lyra')?.ultimateCooldown).toBe(0);
  });

  it('produces the same exact combat fingerprint across common render rates', () => {
    const run = (fps: number) => {
      const simulation = new GameSimulation();
      simulation.begin();
      simulation.buildTower(0, 'thorn');
      simulation.buildTower(1, 'ember');
      simulation.startWave();
      for (let frame = 0; frame < fps * 30; frame += 1) simulation.update(1 / fps);
      return fingerprint(simulation);
    };
    const baseline = run(60);
    for (const fps of [30, 90, 120, 144]) expect(run(fps)).toEqual(baseline);
  });

  it('keeps 2x simulation current through sustained 100 ms frames instead of accumulating catch-up debt', () => {
    const simulation = new GameSimulation();
    simulation.begin();
    simulation.toggleSpeed();
    const internal = simulation as unknown as { time: number; accumulator: number };

    for (let frame = 0; frame < 50; frame += 1) simulation.update(0.1);

    expect(internal.time).toBeCloseTo(10, 8);
    expect(internal.accumulator).toBeLessThan(1 / 60);
  });

  it('retains foreground stalls through 250 ms at 2x, bounds catch-up to 30 ticks, and reports discarded excess', () => {
    const simulation = new GameSimulation();
    simulation.begin();
    simulation.toggleSpeed();

    simulation.update(0.25);
    const retained = simulation.getTimingDiagnostics();
    expect(retained.simulationTime).toBeCloseTo(0.5, 8);
    expect(retained.totalFixedTicks).toBe(30);
    expect(retained.accumulator).toBeLessThan(1 / 60);
    expect(retained.maxAccumulator).toBeCloseTo(0.5, 8);
    expect(retained.droppedRealTime).toBe(0);

    simulation.update(0.4);
    const bounded = simulation.getTimingDiagnostics();
    expect(bounded.simulationTime).toBeCloseTo(1, 8);
    expect(bounded.totalFixedTicks).toBe(60);
    expect(bounded.droppedRealTime).toBeCloseTo(0.15, 8);
    simulation.update(0.004);
    expect(simulation.getTimingDiagnostics().accumulator).toBeCloseTo(0.008, 8);
    simulation.togglePause();
    expect(simulation.getTimingDiagnostics().accumulator).toBe(0);
    expect(simulation.getTimingDiagnostics().timingDiscards).toBe(1);
  });

  it('survives three accelerated overlapping waves at 2x with bounded state and forward progress', () => {
    const simulation = new GameSimulation();
    simulation.begin();
    simulation.toggleSpeed();
    const internal = simulation as unknown as {
      time: number;
      accumulator: number;
      spawnQueue: Array<{ at: number }>;
      events: GameEvent[];
    };

    expect(simulation.startWave()).toBe(true);
    for (let requestedWaves = 1, frame = 0; frame < 180 && requestedWaves < 3; frame += 1) {
      simulation.update(0.1);
      simulation.drainEvents();
      if (simulation.getSnapshot().canCallWave) {
        expect(simulation.startWave()).toBe(true);
        requestedWaves += 1;
      }
    }

    const afterBurst = simulation.getSnapshot();
    expect(afterBurst.wave).toBe(3);
    expect(afterBurst.enemies.length).toBeLessThanOrEqual(38);
    const timeAtBurst = internal.time;
    for (let frame = 0; frame < 25; frame += 1) {
      simulation.update(0.1);
      simulation.drainEvents();
    }
    expect(internal.time - timeAtBurst).toBeCloseTo(5, 8);
    expect(internal.accumulator).toBeLessThan(1 / 60);
    expect(internal.events).toHaveLength(0);
    const engaged = afterBurst.enemies.filter((enemy) => enemy.alive && enemy.engagedAllyUid !== null);
    expect(new Set(engaged.map((enemy) => enemy.engagedAllyUid)).size).toBe(engaged.length);
  });

  it('emits defeat exactly once even when several enemies cross together', () => {
    const simulation = new GameSimulation();
    simulation.begin();
    const internal = simulation as unknown as {
      lives: number;
      waveIndex: number;
      spawnEnemy(type: 'skitter', wave: number): void;
    };
    internal.lives = 1;
    internal.waveIndex = 1;
    for (let index = 0; index < 3; index += 1) internal.spawnEnemy('skitter', 1);
    simulation.getSnapshot().enemies.forEach((enemy) => { enemy.progress = 0.999999; });
    simulation.drainEvents();
    simulation.update(0.05);
    const events = simulation.drainEvents();
    expect(events.filter((event) => event.type === 'enemy-leaked')).toHaveLength(1);
    expect(events.filter((event) => event.type === 'defeat')).toHaveLength(1);
  });

  it('credits overlapping waves independently', () => {
    const simulation = new GameSimulation();
    simulation.begin();
    const internal = simulation as unknown as {
      waveIndex: number;
      waveActive: boolean;
      spawnQueue: Array<{ at: number; enemy: 'skitter'; wave: number }>;
      spawnCompleteWaves: Set<number>;
      spawnEnemy(type: 'skitter', wave: number): void;
    };
    internal.waveIndex = 2;
    internal.waveActive = true;
    internal.spawnQueue = [{ at: 999, enemy: 'skitter', wave: 2 }];
    internal.spawnCompleteWaves.add(1);
    internal.spawnCompleteWaves.add(2);
    internal.spawnEnemy('skitter', 1);
    internal.spawnEnemy('skitter', 2);
    const [waveOne, waveTwo] = simulation.getSnapshot().enemies;
    waveOne!.alive = false;
    simulation.drainEvents();
    simulation.update(1 / 60);
    expect(simulation.drainEvents().filter((event) => event.type === 'wave-cleared')).toEqual([{ type: 'wave-cleared', wave: 1 }]);
    expect(simulation.getSnapshot().score).toBe(250);
    waveTwo!.alive = false;
    simulation.update(1 / 60);
    expect(simulation.drainEvents().filter((event) => event.type === 'wave-cleared')).toEqual([{ type: 'wave-cleared', wave: 2 }]);
    expect(simulation.getSnapshot().score).toBe(750);
  });

  it('requires pre-existing control for Mirror Bastion bonus damage', () => {
    const simulation = new GameSimulation();
    simulation.begin();
    const internal = simulation as unknown as { gold: number; waveIndex: number; spawnEnemy(type: 'skitter', wave: number): void; updateTowers(dt: number): void };
    internal.gold = 2000;
    internal.waveIndex = 1;
    expect(simulation.buildTower(0, 'aegis')).toBe(true);
    expect(simulation.upgradeTower(1)).toBe(true);
    expect(simulation.upgradeTower(1)).toBe(true);
    expect(simulation.chooseBranch(1, 'right')).toBe(true);
    internal.spawnEnemy('skitter', 1);
    const enemy = simulation.getSnapshot().enemies[0]!;
    enemy.x = 333; enemy.y = 147;
    const before = enemy.hp;
    simulation.drainEvents();
    internal.updateTowers(1 / 60);
    expect(before - enemy.hp).toBeCloseTo(27 * 1.42, 4);
    expect(enemy.slow).toBeGreaterThan(0);
  });

  it('fields rank- and branch-specific Aegis cohorts with stable formation identities', () => {
    const verdant = new GameSimulation();
    verdant.begin();
    const verdantInternal = verdant as unknown as { gold: number };
    verdantInternal.gold = 3000;
    expect(verdant.buildTower(0, 'aegis')).toBe(true);
    expect(verdant.getSnapshot().defenders).toHaveLength(2);
    expect(new Set(verdant.getSnapshot().defenders.map((defender) => defender.allyUid)).size).toBe(2);
    expect(verdant.upgradeTower(1)).toBe(true);
    expect(verdant.getSnapshot().defenders).toHaveLength(3);
    expect(verdant.upgradeTower(1)).toBe(true);
    expect(verdant.getSnapshot().defenders).toHaveLength(3);
    expect(verdant.chooseBranch(1, 'left')).toBe(true);
    expect(verdant.getSnapshot().defenders).toHaveLength(5);
    expect(verdant.getSnapshot().defenders.every((defender) => defender.maxHp === 205)).toBe(true);

    const mirror = new GameSimulation();
    mirror.begin();
    const mirrorInternal = mirror as unknown as { gold: number };
    mirrorInternal.gold = 3000;
    mirror.buildTower(0, 'aegis');
    mirror.upgradeTower(1);
    mirror.upgradeTower(1);
    expect(mirror.chooseBranch(1, 'right')).toBe(true);
    expect(mirror.getSnapshot().defenders).toHaveLength(2);
    expect(mirror.getSnapshot().defenders.every((defender) => defender.maxHp === 315)).toBe(true);
  });

  it('deploys Aegis cohorts in separated, deterministic lane formations', () => {
    const deploy = () => {
      const simulation = new GameSimulation();
      simulation.begin();
      const internal = simulation as unknown as { gold: number };
      internal.gold = 3000;
      simulation.buildTower(0, 'aegis');
      simulation.upgradeTower(1);
      simulation.upgradeTower(1);
      simulation.chooseBranch(1, 'left');
      return simulation.getSnapshot().defenders.map((defender) => ({
        slot: defender.slot,
        allyUid: defender.allyUid,
        home: { x: defender.home.x, y: defender.home.y },
      }));
    };

    const first = deploy();
    const second = deploy();
    expect(first).toEqual(second);
    expect(first.map(({ slot }) => slot)).toEqual([0, 1, 2, 3, 4]);
    expect(first.every(({ home }) => projectPointToPath(home).distance < 1e-6)).toBe(true);
    for (let left = 0; left < first.length; left += 1) {
      for (let right = left + 1; right < first.length; right += 1) {
        expect(distance(first[left]!.home, first[right]!.home)).toBeGreaterThanOrEqual(31);
      }
    }
  });

  it('resolves dense blocker contact on the road without relocating monsters into duel pockets', () => {
    const simulation = new GameSimulation();
    simulation.begin();
    const internal = simulation as unknown as { gold: number; waveIndex: number; spawnEnemy(type: 'brute', wave: number): void };
    internal.gold = 3000;
    internal.waveIndex = 1;
    simulation.buildTower(4, 'aegis');
    simulation.upgradeTower(1);
    simulation.upgradeTower(1);
    simulation.chooseBranch(1, 'left');
    simulation.getSnapshot().towers[0]!.disabledTime = 999;

    const defenders = simulation.getSnapshot().defenders;
    const centerProgress = projectPointToPath(defenders[2]!.home).progress;
    for (let index = 0; index < 5; index += 1) {
      internal.spawnEnemy('brute', 1);
      const enemy = simulation.getSnapshot().enemies[index]!;
      enemy.progress = centerProgress + (index - 2) * 42 / PATH_LENGTH;
    }
    simulation.update(1 / 60);

    const engagedEnemies = simulation.getSnapshot().enemies.filter((enemy) => enemy.engagedAllyUid !== null);
    expect(engagedEnemies.length).toBeGreaterThan(0);
    expect(new Set(engagedEnemies.map((enemy) => enemy.engagedAllyUid)).size).toBe(engagedEnemies.length);
    expect(simulation.getSnapshot().enemies.every((enemy) => Math.abs(enemy.laneOffset) <= COMBAT_BALANCE.lanes.halfWidth + 1e-9
      && projectPointToPath(enemy).distance <= COMBAT_BALANCE.lanes.halfWidth + 0.25)).toBe(true);
    expect(simulation.getSnapshot().defenders.every((defender) => projectPointToPath(defender).distance < 1e-6)).toBe(true);

    const positions = simulation.getSnapshot().enemies.map((enemy) => ({ x: enemy.x, y: enemy.y }));
    simulation.update(1 / 60);
    simulation.getSnapshot().enemies.forEach((enemy, index) => {
      expect(distance(enemy, positions[index]!)).toBeLessThanOrEqual(Math.hypot(28, COMBAT_BALANCE.lanes.lateralSpeed) / 60 + 0.15);
    });
  });

  it('stops blockable monsters for deterministic two-way defender combat', () => {
    const simulation = new GameSimulation();
    simulation.begin();
    const internal = simulation as unknown as { gold: number; waveIndex: number; spawnEnemy(type: 'brute', wave: number): void };
    internal.gold = 1000;
    internal.waveIndex = 1;
    simulation.buildTower(0, 'aegis');
    const tower = simulation.getSnapshot().towers[0]!;
    tower.disabledTime = 999;
    const defender = simulation.getSnapshot().defenders[0]!;
    internal.spawnEnemy('brute', 1);
    const enemy = simulation.getSnapshot().enemies[0]!;
    enemy.x = defender.x;
    enemy.y = defender.y;
    enemy.progress = projectPointToPath(defender).progress;
    simulation.drainEvents();
    simulation.update(1 / 60);
    expect(defender.engagedEnemyUid).toBe(enemy.uid);
    expect(enemy.engagedAllyUid).toBe(defender.allyUid);
    const heldProgress = enemy.progress;
    const defenderHp = defender.hp;
    const enemyHp = enemy.hp;
    advance(simulation, 2);
    expect(enemy.progress).toBe(heldProgress);
    expect(enemy.hp).toBeLessThan(enemyHp);
    expect(defender.hp).toBeLessThan(defenderHp);
    const liveLinks = simulation.getSnapshot().defenders.filter((candidate) => candidate.engagedEnemyUid !== null).map((candidate) => candidate.engagedEnemyUid);
    expect(new Set(liveLinks).size).toBe(liveLinks.length);
  });

  it('kills and respawns defenders through a visible snapshot lifecycle', () => {
    const simulation = new GameSimulation();
    simulation.begin();
    const internal = simulation as unknown as { gold: number; waveIndex: number; spawnEnemy(type: 'brute', wave: number): void };
    internal.gold = 1000;
    internal.waveIndex = 1;
    simulation.buildTower(0, 'aegis');
    simulation.getSnapshot().towers[0]!.disabledTime = 999;
    const [defender, reserve] = simulation.getSnapshot().defenders;
    defender!.hp = 1;
    reserve!.alive = false;
    reserve!.respawnTime = 999;
    internal.spawnEnemy('brute', 1);
    const enemy = simulation.getSnapshot().enemies[0]!;
    enemy.x = defender!.x;
    enemy.y = defender!.y;
    enemy.progress = projectPointToPath(defender!).progress;
    simulation.drainEvents();
    advance(simulation, 2);
    expect(defender!.alive).toBe(false);
    expect(defender!.respawnTime).toBeGreaterThan(0);
    expect(enemy.engagedAllyUid).toBeNull();
    advance(simulation, defender!.respawnMax + 0.1);
    expect(defender!.alive).toBe(true);
    expect(defender!.hp).toBe(defender!.maxHp);
  });

  it('lets heroes hold the road, take damage, fall, and rally again', () => {
    const simulation = new GameSimulation();
    simulation.begin();
    const internal = simulation as unknown as { waveIndex: number; spawnEnemy(type: 'brute', wave: number): void };
    internal.waveIndex = 1;
    const kael = simulation.getSnapshot().heroes.find((hero) => hero.id === 'kael')!;
    kael.hp = 1;
    internal.spawnEnemy('brute', 1);
    const enemy = simulation.getSnapshot().enemies[0]!;
    enemy.x = kael.x;
    enemy.y = kael.y;
    enemy.progress = projectPointToPath(kael).progress;
    simulation.drainEvents();
    simulation.update(1 / 60);
    expect(kael.alive).toBe(false);
    expect(kael.respawnTime).toBeGreaterThan(0);
    expect(enemy.engagedAllyUid).toBeNull();
    expect(simulation.useAbility('kael', enemy)).toBe(false);
    enemy.alive = false;
    advance(simulation, kael.respawnMax + 0.1);
    expect(kael.alive).toBe(true);
    expect(kael.hp).toBe(kael.maxHp);
    expect(distance(kael, kael.spawn)).toBeLessThan(1e-9);
  });

  it('keeps flying Wisps and the Hollow Bloom outside the blocker system', () => {
    const simulation = new GameSimulation();
    simulation.begin();
    const internal = simulation as unknown as { gold: number; waveIndex: number; spawnEnemy(type: 'wisp' | 'bloomlord', wave: number): void };
    internal.gold = 1000;
    internal.waveIndex = 12;
    simulation.buildTower(0, 'aegis');
    const defender = simulation.getSnapshot().defenders[0]!;
    internal.spawnEnemy('wisp', 12);
    internal.spawnEnemy('bloomlord', 12);
    simulation.getSnapshot().enemies.forEach((enemy) => { enemy.x = defender.x; enemy.y = defender.y; enemy.progress = 0.2; });
    simulation.update(1 / 60);
    expect(simulation.getSnapshot().enemies.every((enemy) => enemy.engagedAllyUid === null)).toBe(true);
    expect(simulation.getSnapshot().defenders.every((candidate) => candidate.engagedEnemyUid === null)).toBe(true);
  });

  it('processes both crossed boss thresholds in order with distinct targets', () => {
    const simulation = new GameSimulation();
    simulation.begin();
    const internal = simulation as unknown as { gold: number; waveIndex: number; spawnEnemy(type: 'bloomlord', wave: number): void };
    internal.gold = 2000;
    internal.waveIndex = 12;
    simulation.buildTower(2, 'thorn');
    simulation.buildTower(7, 'thorn');
    internal.spawnEnemy('bloomlord', 12);
    const boss = simulation.getSnapshot().enemies[0]!;
    boss.hp = boss.maxHp * 0.3;
    simulation.drainEvents();
    simulation.update(1 / 60);
    const warnings = simulation.drainEvents().filter((event) => event.type === 'boss-telegraph');
    expect(boss.bossPhase).toBe(2);
    expect(warnings).toHaveLength(2);
    if (warnings[0]?.type === 'boss-telegraph' && warnings[1]?.type === 'boss-telegraph') expect(warnings[0].point).not.toEqual(warnings[1].point);
  });
});

describe('result integrity', () => {
  it('rates every difficulty by proportional gate integrity and gives defeat no star', () => {
    expect(starRating(true, 25, 25)).toBe('★★★');
    expect(starRating(true, 15, 15)).toBe('★★★');
    expect(starRating(true, 12, 15)).toBe('★★☆');
    expect(starRating(false, 0, 20)).toBe('☆☆☆');
  });

  it('applies and freely respecs campaign Insight before battle', () => {
    const simulation = new GameSimulation();
    simulation.setInsightLoadout(['treasury', 'command', 'gate']);
    expect(simulation.getSnapshot().gold).toBe(335);
    expect(simulation.getSnapshot().lives).toBe(22);
    expect(simulation.getSnapshot().startingLives).toBe(22);
    expect(simulation.getSnapshot().heroes.find((hero) => hero.id === 'kael')?.ultimateMax).toBeCloseTo(23.4);
    simulation.setDifficulty('mythic');
    expect(simulation.getSnapshot().gold).toBe(295);
    expect(simulation.getSnapshot().lives).toBe(17);
    simulation.setInsightLoadout([]);
    expect(simulation.getSnapshot().gold).toBe(270);
    expect(simulation.getSnapshot().lives).toBe(15);
  });
});
