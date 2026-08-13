import { describe, expect, it } from 'vitest';
import { RUN_DEFINITIONS, STAGE_CATALOG } from '../src/game/content/generated/stages';
import { PathGeometry } from '../src/game/simulation/geometry';

describe('compiled content package contract', () => {
  it('compiles every playable campaign entry into an isolated run definition', () => {
    const playable = STAGE_CATALOG.filter((stage) => stage.playable);
    expect(playable).toHaveLength(2);
    for (const stage of playable) {
      const run = RUN_DEFINITIONS[stage.id];
      expect(run?.stageId).toBe(stage.id);
      expect(run?.waves).toHaveLength(stage.waves);
      expect(run?.map.world).toEqual({ width: 1600, height: 900 });
      expect(run?.map.buildPads.length).toBeGreaterThanOrEqual(4);
      expect(run?.assets.images.every((asset) => asset.path.startsWith('assets/'))).toBe(true);
    }
  });

  it('constructs route-aware geometry independently for every playable map', () => {
    for (const run of Object.values(RUN_DEFINITIONS)) {
      const geometry = new PathGeometry(run.map);
      expect(geometry.routeIds()).toEqual(run.map.routes.map((route) => route.id));
      expect(geometry.length()).toBeGreaterThan(800);
      run.map.buildPads.forEach((pad, index) => {
        const projection = geometry.project(pad);
        expect(
          projection.distance - geometry.halfWidth(projection.routeId),
          `${run.stageId} pad ${index} must clear the navigable lane edge`,
        ).toBeGreaterThanOrEqual(8);
      });
      run.waves.flatMap((wave) => wave.groups).forEach((group) => {
        expect(geometry.routeIds()).toContain(group.route ?? run.map.primaryRouteId);
      });
    }
  });

  it('proves multi-route and procedural authoring with the second playable stage', () => {
    const run = RUN_DEFINITIONS['rootbound-crossing']!;
    expect(run.map.visual.kind).toBe('procedural');
    expect(run.map.routes.map((route) => route.id)).toEqual(['north', 'south']);
    expect(new Set(run.waves.flatMap((wave) => wave.groups.map((group) => group.route)))).toEqual(new Set(['north', 'south']));
  });
});
