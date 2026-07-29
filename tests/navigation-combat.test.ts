import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../src/game/content/enemies';
import { COMBAT_BALANCE } from '../src/game/content/combatBalance';
import { GameSimulation } from '../src/game/simulation/GameSimulation';
import { distance, PATH_LENGTH, pointInPathLane, pointOnPath, projectPointToPath, type Vec2 } from '../src/game/simulation/geometry';
import type { EnemyState } from '../src/game/simulation/state';

type SimulationInternals = {
  gold: number;
  waveIndex: number;
  spawnEnemy(type: 'brute' | 'wisp', wave: number): void;
};

function placeEnemy(enemy: EnemyState, progress: number): void {
  enemy.progress = progress;
  const point = pointInPathLane(progress, enemy.laneOffset);
  enemy.x = point.x;
  enemy.y = point.y;
}

function expectOnRoute(point: Vec2): void {
  expect(projectPointToPath(point).distance).toBeLessThan(1e-6);
}

function expectInRoad(enemy: EnemyState): void {
  expect(Math.abs(enemy.laneOffset)).toBeLessThanOrEqual(COMBAT_BALANCE.lanes.halfWidth + 1e-9);
  expect(projectPointToPath(enemy).distance).toBeLessThanOrEqual(COMBAT_BALANCE.lanes.halfWidth + 0.25);
}

describe('route-authoritative navigation and combat domains', () => {
  it('keeps enemies and blockers on the authored route with bounded movement through engagement', () => {
    const simulation = new GameSimulation();
    simulation.begin();
    const internal = simulation as unknown as SimulationInternals;
    internal.gold = 1000;
    internal.waveIndex = 1;
    simulation.buildTower(0, 'aegis');
    simulation.getSnapshot().towers[0]!.disabledTime = 999;
    const defender = simulation.getSnapshot().defenders[0]!;
    const defenderProgress = projectPointToPath(defender).progress;
    internal.spawnEnemy('brute', 1);
    const enemy = simulation.getSnapshot().enemies[0]!;
    placeEnemy(enemy, defenderProgress - 105 / PATH_LENGTH);

    let enemyPrevious = { x: enemy.x, y: enemy.y };
    let defenderPrevious = { x: defender.x, y: defender.y };
    let sawContact = false;
    for (let tick = 0; tick < 240; tick += 1) {
      simulation.update(1 / 60);
      expectInRoad(enemy);
      expectOnRoute(defender);
      expect(distance(enemy, enemyPrevious)).toBeLessThanOrEqual(Math.hypot(ENEMIES.brute.speed, COMBAT_BALANCE.lanes.lateralSpeed) / 60 + 0.15);
      expect(distance(defender, defenderPrevious)).toBeLessThanOrEqual(108 / 60 + 1e-6);
      if (enemy.engagedAllyUid === defender.allyUid && enemy.hp < enemy.maxHp && defender.hp < defender.maxHp) sawContact = true;
      enemyPrevious = { x: enemy.x, y: enemy.y };
      defenderPrevious = { x: defender.x, y: defender.y };
    }
    expect(sawContact).toBe(true);
  });

  it('projects impossible hero commands onto traversable route geometry instead of cutting across the chasm', () => {
    const simulation = new GameSimulation();
    simulation.begin();
    const kael = simulation.getSnapshot().heroes.find((hero) => hero.id === 'kael')!;
    simulation.moveHero('kael', { x: 810, y: 455 });
    expectOnRoute(kael.target);

    let previous = { x: kael.x, y: kael.y };
    for (let tick = 0; tick < 1800; tick += 1) {
      simulation.update(1 / 60);
      expectOnRoute(kael);
      expect(distance(kael, previous)).toBeLessThanOrEqual(kael.speed / 60 + 1e-6);
      previous = { x: kael.x, y: kael.y };
    }
    expect(distance(kael, kael.target)).toBeLessThanOrEqual(3.5);
    simulation.getSnapshot().defenders.forEach(expectOnRoute);
  });

  it('separates melee blocking from ranged targeting: Kael and defenders ignore air while Lyra can shoot it', () => {
    const simulation = new GameSimulation();
    simulation.begin();
    const internal = simulation as unknown as SimulationInternals;
    internal.gold = 1000;
    internal.waveIndex = 1;
    simulation.buildTower(0, 'aegis');
    simulation.getSnapshot().towers[0]!.disabledTime = 999;
    const [kael, lyra] = simulation.getSnapshot().heroes;
    const defenders = simulation.getSnapshot().defenders;
    lyra!.alive = false;
    const contactProgress = projectPointToPath(kael!).progress;
    defenders.forEach((defender, index) => {
      const point = pointOnPath(contactProgress + index * 10 / PATH_LENGTH);
      defender.x = point.x;
      defender.y = point.y;
      defender.home = { ...point };
    });
    internal.spawnEnemy('wisp', 1);
    const ignoredWisp = simulation.getSnapshot().enemies[0]!;
    placeEnemy(ignoredWisp, contactProgress);
    const hpBefore = ignoredWisp.hp;
    simulation.drainEvents();
    simulation.update(0.2);
    const forbiddenAttackers = new Set([`hero:${kael!.id}`, ...defenders.map((defender) => defender.allyUid)]);
    expect(ignoredWisp.hp).toBe(hpBefore);
    expect(ignoredWisp.engagedAllyUid).toBeNull();
    expect(defenders.every((defender) => defender.engagedEnemyUid === null)).toBe(true);
    expect(simulation.drainEvents().some((event) => event.type === 'ally-attack' && forbiddenAttackers.has(event.allyUid))).toBe(false);

    const ranged = new GameSimulation();
    ranged.begin();
    const rangedInternal = ranged as unknown as SimulationInternals;
    rangedInternal.waveIndex = 1;
    const rangedKael = ranged.getSnapshot().heroes.find((hero) => hero.id === 'kael')!;
    const rangedLyra = ranged.getSnapshot().heroes.find((hero) => hero.id === 'lyra')!;
    rangedKael.alive = false;
    rangedInternal.spawnEnemy('wisp', 1);
    const target = ranged.getSnapshot().enemies[0]!;
    placeEnemy(target, projectPointToPath(rangedLyra).progress);
    const rangedHpBefore = target.hp;
    ranged.update(1 / 60);
    expect(target.engagedAllyUid).toBeNull();
    expect(rangedLyra.engagedEnemyUid).toBeNull();
    expect(target.hp).toBeLessThan(rangedHpBefore);
  });

  it('applies armored melee damage to hero HP at valid contact and emits the authoritative health result', () => {
    const simulation = new GameSimulation();
    simulation.begin();
    const internal = simulation as unknown as SimulationInternals;
    internal.waveIndex = 1;
    const kael = simulation.getSnapshot().heroes.find((hero) => hero.id === 'kael')!;
    internal.spawnEnemy('brute', 1);
    const brute = simulation.getSnapshot().enemies[0]!;
    placeEnemy(brute, projectPointToPath(kael).progress);
    const before = kael.hp;
    simulation.drainEvents();
    simulation.update(1 / 60);

    const expectedDamage = ENEMIES.brute.attackDamage * (1 - kael.armor);
    expect(kael.hp).toBeCloseTo(before - expectedDamage, 6);
    expect(kael.hp).toBeLessThan(kael.maxHp);
    expect(simulation.drainEvents()).toContainEqual({
      type: 'ally-hit', allyUid: 'hero:kael', enemyUid: brute.uid, amount: expectedDamage, hp: kael.hp,
    });
  });

  it('keeps ordinary ground traffic separated inside the bounded road corridor while allowing lane overtakes', () => {
    const simulation = new GameSimulation();
    simulation.begin();
    const internal = simulation as unknown as SimulationInternals;
    internal.waveIndex = 1;
    for (let index = 0; index < 4; index += 1) internal.spawnEnemy('brute', 1);
    for (let tick = 0; tick < 600; tick += 1) {
      simulation.update(1 / 60);
      simulation.getSnapshot().enemies.filter((enemy) => enemy.alive).forEach(expectInRoad);
    }
    const living = simulation.getSnapshot().enemies.filter((enemy) => enemy.alive).sort((a, b) => b.progress - a.progress);
    for (let index = 1; index < living.length; index += 1) {
      const ahead = living[index - 1]!;
      const behind = living[index]!;
      expect(distance(ahead, behind)).toBeGreaterThanOrEqual(ENEMIES[ahead.type].radius + ENEMIES[behind.type].radius - 0.25);
    }
  });
});
