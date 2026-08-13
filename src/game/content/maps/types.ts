import type { Vec2 } from '../../simulation/geometryTypes';

export interface BattleMapMarker extends Vec2 {
  label: string;
}

export interface BattleRouteDefinition {
  id: string;
  halfWidth: number;
  centerline: readonly Vec2[];
}

export interface BattleBuildPad extends Vec2 {
  id: string;
  radius: number;
}

export interface PaintedMapVisual {
  kind: 'painted';
  assetKey: string;
  assetPath: string;
}

export interface ProceduralMapVisual {
  kind: 'procedural';
  seed: number;
  palette: {
    ground: string;
    groundAlt: string;
    road: string;
    roadEdge: string;
    water: string;
    foliage: readonly string[];
    accent: string;
  };
  density: number;
  waterBands: readonly { x: number; y: number; width: number; height: number; rotation?: number }[];
  landmarks: readonly { kind: 'wardstone' | 'ruin' | 'crystal' | 'grove'; x: number; y: number; scale?: number; rotation?: number }[];
}

export interface BattleMapDefinition {
  id: string;
  title: string;
  world: { width: number; height: number };
  visual: PaintedMapVisual | ProceduralMapVisual;
  primaryRouteId: string;
  routes: readonly BattleRouteDefinition[];
  /** Compatibility alias for the primary route. New code uses routes. */
  route: BattleRouteDefinition;
  buildPads: readonly BattleBuildPad[];
  markers: {
    entrances: readonly (BattleMapMarker & { routeId: string })[];
    /** Compatibility alias for the primary entrance. */
    entrance: BattleMapMarker;
    gate: BattleMapMarker;
  };
}
