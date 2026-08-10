import { describe, expect, it } from 'vitest';
import { ACTIVE_BATTLE_MAP } from '../src/game/content/maps';
import { BUILD_PADS, PATH_HALF_WIDTH, PATH_POINTS, projectPointToPath } from '../src/game/simulation/geometry';

describe('authored battle map contract', () => {
  it('keeps the generated route, pads, and world inside a coherent coordinate system', () => {
    expect(ACTIVE_BATTLE_MAP.world).toEqual({ width: 1600, height: 900 });
    expect(PATH_POINTS).toBe(ACTIVE_BATTLE_MAP.route.centerline);
    expect(BUILD_PADS).toBe(ACTIVE_BATTLE_MAP.buildPads);
    expect(PATH_HALF_WIDTH).toBe(36);
    expect(PATH_POINTS.length).toBeGreaterThanOrEqual(12);
    expect(BUILD_PADS).toHaveLength(11);
    for (const [index, pad] of BUILD_PADS.entries()) {
      expect(pad.x).toBeGreaterThanOrEqual(0);
      expect(pad.x).toBeLessThanOrEqual(ACTIVE_BATTLE_MAP.world.width);
      expect(pad.y).toBeGreaterThanOrEqual(0);
      expect(pad.y).toBeLessThanOrEqual(ACTIVE_BATTLE_MAP.world.height);
      expect(projectPointToPath(pad).distance, `pad ${index} must not sit on the navigable centerline`).toBeGreaterThan(12);
    }
  });

  it('keeps build pads separated enough for unambiguous selection', () => {
    BUILD_PADS.forEach((pad, index) => {
      BUILD_PADS.slice(index + 1).forEach((other) => {
        expect(Math.hypot(pad.x - other.x, pad.y - other.y)).toBeGreaterThan(80);
      });
    });
  });
});
