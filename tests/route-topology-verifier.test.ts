import { describe, expect, it } from 'vitest';
import { COMBAT_BALANCE } from '../src/game/content/combatBalance';
import { ENEMIES } from '../src/game/content/enemies';
import { RUN_DEFINITIONS } from '../src/game/content/generated/stages';
import type { BattleMapDefinition, BattleRouteDefinition } from '../src/game/content/maps/types';
import type { RunDefinition } from '../src/game/content/stages/types';
import { GameSimulation } from '../src/game/simulation/GameSimulation';
import { PathGeometry } from '../src/game/simulation/geometry';
import type { EnemyState } from '../src/game/simulation/state';

const merge = { x: 300, y: 180 };
const gate = { x: 760, y: 180 };

function route(id: string, centerline: BattleRouteDefinition['centerline']): BattleRouteDefinition {
  const segmentLengths = centerline.slice(0, -1).map((point, index) => Math.hypot(
    centerline[index + 1]!.x - point.x,
    centerline[index + 1]!.y - point.y,
  ));
  const total = segmentLengths.reduce((sum, length) => sum + length, 0);
  const sharedLength = Math.hypot(gate.x - merge.x, gate.y - merge.y);
  return {
    id,
    halfWidth: 40,
    centerline,
    sections: [{ id: `${id}-shared`, from: (total - sharedLength) / total, to: 1, trafficGroup: 'verifier-merge' }],
  };
}

const north = route('north', [{ x: 0, y: 0 }, { x: 120, y: 0 }, merge, gate]);
const south = route('south', [{ x: 0, y: 420 }, { x: 80, y: 420 }, { x: 80, y: 300 }, merge, gate]);
const base = RUN_DEFINITIONS['sunken-way']!;
const map: BattleMapDefinition = {
  ...base.map,
  id: 'topology-verifier',
  world: { width: 800, height: 450 },
  primaryRouteId: 'north',
  routes: [north, south],
  route: north,
  buildPads: [],
  markers: {
    entrances: [
      { routeId: 'north', x: 0, y: 0, label: 'North' },
      { routeId: 'south', x: 0, y: 420, label: 'South' },
    ],
    entrance: { x: 0, y: 0, label: 'North' },
    gate: { ...gate, label: 'Gate' },
  },
};
const run: RunDefinition = {
  ...base,
  stageId: map.id,
  map,
  waves: [],
  tacticalPressure: {},
  heroSpawns: {
    kael: { routeId: 'north', progress: 0.95 },
    lyra: { routeId: 'north', progress: 0.98 },
  },
};

type Internals = {
  spawnEnemy(type: 'skitter' | 'brute', wave: number, routeId: string): void;
};

function place(simulation: GameSimulation, enemy: EnemyState, progress: number, laneOffset: number): void {
  enemy.progress = progress;
  enemy.laneOffset = laneOffset;
  enemy.laneTarget = laneOffset;
  Object.assign(enemy, simulation.geometry.lanePoint(progress, laneOffset, enemy.routeId));
}

describe('adversarial shared-route verification', () => {
  it('uses physical distance from the merge despite different approach lengths and section fractions', () => {
    const geometry = new PathGeometry(map);
    const northSection = north.sections![0]!;
    const southSection = south.sections![0]!;
    expect(northSection.from).not.toBeCloseTo(southSection.from, 3);

    const physicalDistance = 173;
    const northProgress = northSection.from + physicalDistance / geometry.length('north');
    const southProgress = southSection.from + physicalDistance / geometry.length('south');
    expect(geometry.trafficPosition(northProgress, 'north').key).toBe('shared:verifier-merge');
    expect(geometry.trafficPosition(northProgress, 'north').distance).toBeCloseTo(physicalDistance, 9);
    expect(geometry.trafficPosition(southProgress, 'south').key).toBe('shared:verifier-merge');
    expect(geometry.trafficPosition(southProgress, 'south').distance).toBeCloseTo(physicalDistance, 9);
  });

  it('does not let a private-approach enemy penetrate an occupied shared queue at the section boundary', () => {
    const simulation = new GameSimulation(run);
    simulation.begin();
    simulation.getSnapshot().heroes.forEach((hero) => { hero.alive = false; hero.respawnTime = 999; });
    const internal = simulation as unknown as Internals;
    internal.spawnEnemy('brute', 1, 'north');
    internal.spawnEnemy('skitter', 1, 'south');
    const [ahead, follower] = simulation.getSnapshot().enemies;
    const northFrom = north.sections![0]!.from;
    const southFrom = south.sections![0]!.from;
    const clearance = ENEMIES.brute.radius + ENEMIES.skitter.radius + COMBAT_BALANCE.lanes.footprintPadding + 1.25;
    place(simulation, ahead!, northFrom + (clearance + 0.1) / simulation.geometry.length('north'), -18);
    place(simulation, follower!, southFrom - 0.1 / simulation.geometry.length('south'), -18);

    simulation.update(1 / 60);

    const aheadTraffic = simulation.geometry.trafficPosition(ahead!.progress, ahead!.routeId);
    const followerTraffic = simulation.geometry.trafficPosition(follower!.progress, follower!.routeId);
    expect(followerTraffic.key).toBe(aheadTraffic.key);
    // Route-progress arithmetic may differ by a few thousandths of a pixel on
    // unequal total lengths; the pre-fix penetration was half a pixel/tick.
    expect(aheadTraffic.distance - followerTraffic.distance).toBeGreaterThanOrEqual(clearance - 0.02);
  });

  it('serializes enemies that enter an initially empty shared queue during the same fixed tick', () => {
    const simulation = new GameSimulation(run);
    simulation.begin();
    simulation.getSnapshot().heroes.forEach((hero) => { hero.alive = false; hero.respawnTime = 999; });
    const internal = simulation as unknown as Internals;
    internal.spawnEnemy('skitter', 1, 'north');
    internal.spawnEnemy('skitter', 1, 'south');
    const [northEnemy, southEnemy] = simulation.getSnapshot().enemies;
    const northFrom = north.sections![0]!.from;
    const southFrom = south.sections![0]!.from;
    place(simulation, northEnemy!, northFrom - 90 / simulation.geometry.length('north'), -18);
    place(simulation, southEnemy!, southFrom - 90 / simulation.geometry.length('south'), -18);

    let minimumPhysicalGap = Number.POSITIVE_INFINITY;
    for (let tick = 0; tick < 120; tick += 1) {
      simulation.update(1 / 60);
      minimumPhysicalGap = Math.min(minimumPhysicalGap, Math.hypot(
        northEnemy!.x - southEnemy!.x,
        northEnemy!.y - southEnemy!.y,
      ));
    }

    expect([northEnemy!, southEnemy!].some((enemy) => simulation.geometry.trafficPosition(enemy.progress, enemy.routeId).key === 'shared:verifier-merge')).toBe(true);
    expect(minimumPhysicalGap).toBeGreaterThanOrEqual(ENEMIES.skitter.radius * 2 + 1);
  });

  it('keeps fixed-time accounting current under a dense two-route 2x burst', () => {
    const simulation = new GameSimulation(run);
    simulation.begin();
    simulation.toggleSpeed();
    simulation.getSnapshot().heroes.forEach((hero) => { hero.alive = false; hero.respawnTime = 999; });
    const internal = simulation as unknown as Internals;
    for (let index = 0; index < 120; index += 1) {
      internal.spawnEnemy('skitter', 1, index % 2 === 0 ? 'north' : 'south');
    }

    for (let frame = 0; frame < 30; frame += 1) simulation.update(0.1);

    const timing = simulation.getTimingDiagnostics();
    expect(timing.simulationTime).toBeCloseTo(6, 8);
    expect(timing.accumulator).toBeLessThan(1 / 60);
    expect(simulation.getSnapshot().enemies.filter((enemy) => enemy.alive)).toHaveLength(120);
  });

  it('lets a ground hero acquire and block an enemy authored on the other route after the merge', () => {
    const simulation = new GameSimulation(run);
    simulation.begin();
    const [kael, lyra] = simulation.getSnapshot().heroes;
    lyra!.alive = false;
    lyra!.respawnTime = 999;
    const sharedDistance = 200;
    const heroProgress = north.sections![0]!.from + sharedDistance / simulation.geometry.length('north');
    const heroPoint = simulation.geometry.point(heroProgress, 'north');
    Object.assign(kael!, heroPoint);
    kael!.target = { ...heroPoint };
    kael!.commanded = true;
    const internal = simulation as unknown as Internals;
    internal.spawnEnemy('brute', 1, 'south');
    const enemy = simulation.getSnapshot().enemies[0]!;
    place(simulation, enemy, south.sections![0]!.from + (sharedDistance - 30) / simulation.geometry.length('south'), -18);

    for (let tick = 0; tick < 30 && kael!.engagedEnemyUid === null; tick += 1) simulation.update(1 / 60);

    expect(kael!.engagedEnemyUid).toBe(enemy.uid);
    expect(enemy.engagedAllyUid).toBe('hero:kael');
    expect(simulation.geometry.trafficPosition(enemy.progress, enemy.routeId).key).toBe('shared:verifier-merge');
  });
});
