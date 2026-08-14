import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../src/game/content/enemies';
import { RUN_DEFINITIONS } from '../src/game/content/generated/stages';
import type { BattleMapDefinition, BattleRouteDefinition } from '../src/game/content/maps/types';
import type { RunDefinition } from '../src/game/content/stages/types';
import { GameSimulation } from '../src/game/simulation/GameSimulation';
import type { EnemyState } from '../src/game/simulation/state';

const approachLength = Math.hypot(100, 100);
const sharedLength = 400;
const routeLength = approachLength + sharedLength;
const sharedFrom = approachLength / routeLength;
const slowFrom = (approachLength + 100) / routeLength;
const slowTo = (approachLength + 300) / routeLength;

function route(id: string, entranceY: number): BattleRouteDefinition {
  return {
    id,
    halfWidth: 36,
    centerline: [{ x: 0, y: entranceY }, { x: 100, y: 100 }, { x: 500, y: 100 }],
    sections: [
      { id: `${id}-shared`, from: sharedFrom, to: 1, trafficGroup: 'central-run' },
      { id: `${id}-mud`, from: slowFrom, to: slowTo, speedMultiplier: 0.5 },
    ],
  };
}

const north = route('north', 0);
const south = route('south', 200);
const base = RUN_DEFINITIONS['sunken-way']!;
const map: BattleMapDefinition = {
  ...base.map,
  id: 'route-topology-fixture',
  world: { width: 600, height: 300 },
  primaryRouteId: 'north',
  routes: [north, south],
  route: north,
  buildPads: [],
  markers: {
    entrances: [
      { routeId: 'north', x: 0, y: 0, label: 'North' },
      { routeId: 'south', x: 0, y: 200, label: 'South' },
    ],
    entrance: { x: 0, y: 0, label: 'North' },
    gate: { x: 500, y: 100, label: 'Gate' },
  },
};
const run: RunDefinition = {
  ...base,
  stageId: 'route-topology-fixture',
  map,
  waves: [],
  tacticalPressure: {},
  economy: {
    ...base.economy,
    difficulties: {
      wanderer: { startingGold: 0, startingLives: 20, enemyHp: 1, enemySpeed: 1 },
      warden: { startingGold: 0, startingLives: 20, enemyHp: 1, enemySpeed: 1 },
      mythic: { startingGold: 0, startingLives: 20, enemyHp: 1, enemySpeed: 1 },
    },
  },
  heroSpawns: {
    kael: { routeId: 'north', progress: 0.94 },
    lyra: { routeId: 'north', progress: 0.97 },
  },
};

type Internals = {
  spawnEnemy(type: 'skitter' | 'brute' | 'wisp', wave: number, routeId: string): void;
  laneProgressLimit(enemy: EnemyState, laneOffset: number, desiredProgress: number, groundOrder: readonly EnemyState[], orderIndex: number): number;
};

function place(simulation: GameSimulation, enemy: EnemyState, progress: number, laneOffset = -18): void {
  enemy.progress = progress;
  enemy.laneOffset = laneOffset;
  enemy.laneTarget = laneOffset;
  Object.assign(enemy, simulation.geometry.lanePoint(progress, laneOffset, enemy.routeId));
}

function disableHeroes(simulation: GameSimulation): void {
  simulation.getSnapshot().heroes.forEach((hero) => { hero.alive = false; hero.respawnTime = 999; });
}

describe('route topology and terrain runtime', () => {
  it('maps coincident downstream routes into one traffic coordinate while approaches stay isolated', () => {
    const simulation = new GameSimulation(run);
    const beforeNorth = simulation.geometry.trafficPosition(sharedFrom - 0.02, 'north');
    const beforeSouth = simulation.geometry.trafficPosition(sharedFrom - 0.02, 'south');
    expect(beforeNorth.key).not.toBe(beforeSouth.key);

    const downstreamNorth = simulation.geometry.trafficPosition(sharedFrom + 0.2, 'north');
    const downstreamSouth = simulation.geometry.trafficPosition(sharedFrom + 0.2, 'south');
    expect(downstreamNorth.key).toBe('shared:central-run');
    expect(downstreamSouth.key).toBe(downstreamNorth.key);
    expect(downstreamSouth.distance).toBeCloseTo(downstreamNorth.distance, 9);
  });

  it('applies lane clearance across route IDs after the declared merge', () => {
    const simulation = new GameSimulation(run);
    simulation.begin();
    disableHeroes(simulation);
    const internal = simulation as unknown as Internals;
    internal.spawnEnemy('brute', 1, 'north');
    internal.spawnEnemy('skitter', 1, 'south');
    const [ahead, follower] = simulation.getSnapshot().enemies;
    const aheadProgress = sharedFrom + 140 / routeLength;
    const followerProgress = sharedFrom + 95 / routeLength;
    place(simulation, ahead!, aheadProgress);
    place(simulation, follower!, followerProgress);

    const desired = followerProgress + 2 / routeLength;
    const limited = internal.laneProgressLimit(follower!, follower!.laneOffset, desired, [ahead!, follower!], 1);
    const clearance = ENEMIES.brute.radius + ENEMIES.skitter.radius + 11 + 1.25;
    const resultingGap = simulation.geometry.trafficPosition(ahead!.progress, ahead!.routeId).distance
      - simulation.geometry.trafficPosition(limited, follower!.routeId).distance;
    expect(limited).toBeLessThan(desired);
    expect(resultingGap).toBeCloseTo(clearance, 9);
  });

  it('slows ground movement deterministically while flying units ignore ground terrain', () => {
    const simulation = new GameSimulation(run);
    simulation.begin();
    disableHeroes(simulation);
    const internal = simulation as unknown as Internals;
    internal.spawnEnemy('brute', 1, 'north');
    internal.spawnEnemy('wisp', 1, 'south');
    const [brute, wisp] = simulation.getSnapshot().enemies;
    const start = slowFrom + 20 / routeLength;
    place(simulation, brute!, start, -18);
    place(simulation, wisp!, start, 18);
    const bruteStart = simulation.geometry.trafficPosition(brute!.progress, brute!.routeId).distance;
    const wispStart = simulation.geometry.trafficPosition(wisp!.progress, wisp!.routeId).distance;

    for (let tick = 0; tick < 60; tick += 1) simulation.update(1 / 60);

    const bruteTravel = simulation.geometry.trafficPosition(brute!.progress, brute!.routeId).distance - bruteStart;
    const wispTravel = simulation.geometry.trafficPosition(wisp!.progress, wisp!.routeId).distance - wispStart;
    expect(bruteTravel).toBeCloseTo(ENEMIES.brute.speed * 0.5, 7);
    expect(wispTravel).toBeCloseTo(ENEMIES.wisp.speed, 7);
  });
});
