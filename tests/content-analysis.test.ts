import { describe, expect, it } from 'vitest';
// Compiler tooling intentionally runs directly in Node as ESM rather than in the game bundle.
// @ts-expect-error The dependency-free Node utility does not ship browser-facing declarations.
import { analyzeStrategicGeometry, compareSemanticMask, decodePng, encodePng, validateRouteTopology, validateStrategicRequirements } from '../scripts/lib/map-analysis.mjs';

describe('AI-native strategic map analysis', () => {
  it('detects disjoint hairpin exposure windows and multi-route coverage', () => {
    const map = {
      routes: [
        { id: 'hairpin', halfWidth: 30, centerline: [{ x: -100, y: 100 }, { x: 300, y: 100 }, { x: 300, y: 300 }, { x: -100, y: 300 }] },
        { id: 'crossing', halfWidth: 30, centerline: [{ x: -100, y: 200 }, { x: 500, y: 200 }] },
      ],
      buildPads: [{ id: 'hinge', x: 100, y: 200, radius: 30 }],
      strategicRequirements: { baseTowerRanges: [120], minDoublePassPads: 1, minMultiRoutePads: 1, minDistinctProfiles: 1, maxDominatedPads: 0 },
    };

    const report = analyzeStrategicGeometry(map);
    expect(report.summary.doublePassPads).toEqual(['hinge']);
    expect(report.summary.multiRoutePads).toEqual(['hinge']);
    expect(report.pads[0].ranges[0].routes.find((route: { routeId: string }) => route.routeId === 'hairpin').windows).toBe(2);
    expect(validateStrategicRequirements(map, report)).toEqual([]);
  });

  it('only calls a pad dominated when another pad covers every sample it covers', () => {
    const map = {
      routes: [{ id: 'main', halfWidth: 30, centerline: [{ x: 0, y: 0 }, { x: 400, y: 0 }] }],
      buildPads: [
        { id: 'strong', x: 200, y: 40, radius: 30 },
        { id: 'weak', x: 200, y: 100, radius: 30 },
        { id: 'different', x: 340, y: 70, radius: 30 },
      ],
    };
    const report = analyzeStrategicGeometry(map, { towerRanges: [126] });
    expect(report.pads.find((pad: { id: string }) => pad.id === 'weak').dominatedBy).toContain('strong');
    expect(report.pads.find((pad: { id: string }) => pad.id === 'different').dominatedBy).toEqual([]);
  });

  it('verifies shared traffic groups are the same directed physical corridor', () => {
    const shared = {
      routes: [
        { id: 'north', halfWidth: 30, centerline: [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 400, y: 100 }], sections: [{ id: 'north-shared', from: 0.5, to: 1, trafficGroup: 'shared-run' }] },
        { id: 'south', halfWidth: 30, centerline: [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 400, y: 100 }], sections: [{ id: 'south-shared', from: 0.5, to: 1, trafficGroup: 'shared-run' }] },
      ],
    };
    expect(validateRouteTopology(shared)).toEqual({ errors: [], warnings: [] });

    const divergent = structuredClone(shared);
    divergent.routes[1]!.centerline[2]!.y = 130;
    expect(validateRouteTopology(divergent).errors.some((error: string) => error.includes('shared-run'))).toBe(true);
  });

  it('includes authored slow-terrain dwell time in pad exposure', () => {
    const map = {
      routes: [{ id: 'main', halfWidth: 30, centerline: [{ x: 0, y: 0 }, { x: 400, y: 0 }], sections: [{ id: 'mud', from: 0.25, to: 0.75, speedMultiplier: 0.5 }] }],
      buildPads: [{ id: 'mud-watch', x: 200, y: 40, radius: 30 }],
    };
    const range = analyzeStrategicGeometry(map, { towerRanges: [126] }).pads[0].ranges[0];
    expect(range.exposureSeconds).toBeGreaterThan(range.totalCoveredLength / 100 * 1.8);
  });

  it('round-trips PNGs and verifies an explicit semantic mask against geometry', () => {
    const width = 80; const height = 60;
    const map = {
      world: { width, height },
      routes: [{ id: 'main', halfWidth: 4, centerline: [{ x: 0, y: 30 }, { x: 79, y: 30 }] }],
      buildPads: [{ id: 'pad', x: 40, y: 12, radius: 5 }],
    };
    const rgba = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      rgba[offset + 3] = 255;
      if (Math.abs(y - 30) <= 4) rgba[offset] = 255;
      if (Math.hypot(x - 40, y - 12) <= 5) { rgba[offset] = 0; rgba[offset + 1] = 255; }
    }
    const decoded = decodePng(encodePng({ width, height, rgba }));
    expect(decoded.rgba).toEqual(rgba);
    const result = compareSemanticMask(map, decoded, { tolerancePx: 0 });
    expect(result.road.recall).toBe(1);
    expect(result.road.precision).toBe(1);
    expect(result.pads.recall).toBe(1);
    expect(result.pads.precision).toBe(1);
  });
});
