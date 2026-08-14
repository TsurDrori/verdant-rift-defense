import type { Vec2 } from '../../simulation/geometryTypes';

export interface BattleMapMarker extends Vec2 {
  label: string;
}

export interface BattleRouteDefinition {
  id: string;
  halfWidth: number;
  centerline: readonly Vec2[];
  /**
   * Optional gameplay metadata layered over normalized route progress. Sections
   * may overlap: one can define shared traffic while another defines terrain.
   * Routes without sections retain the original isolated, full-speed behavior.
   */
  sections?: readonly BattleRouteSection[];
}

export interface BattleRouteSection {
  id: string;
  /** Inclusive normalized route progress. */
  from: number;
  /** Exclusive normalized route progress, except that 1 includes the gate. */
  to: number;
  /**
   * Ground enemies on any route with the same traffic group share lane
   * occupancy. Their authored centerlines must describe the same corridor and
   * direction over this section.
   */
  trafficGroup?: string;
  /** Multiplier applied while an enemy is inside this terrain section. */
  speedMultiplier?: number;
  /** Terrain affects ground traffic only unless explicitly enabled for air. */
  affectsFlying?: boolean;
}

export interface BattleBuildPad extends Vec2 {
  id: string;
  radius: number;
}

export interface PaintedMapVisual {
  kind: 'painted';
  assetKey: string;
  assetPath: string;
  /** Explicit authoring-layer export; the beauty painting is never color-inferred. */
  semanticMaskPath?: string;
  semanticMask?: {
    roadColor?: string;
    padColor?: string;
    tolerancePx?: number;
    colorTolerance?: number;
    minRoadRecall?: number;
    minRoadPrecision?: number;
    minPadRecall?: number;
    minPadPrecision?: number;
  };
}

export interface PaintedLayerAsset {
  assetKey: string;
  assetPath: string;
}

/**
 * Content-scalable painted battlefield. Geometry remains authoritative while
 * every visible gameplay surface is assembled from reusable painted art.
 */
export interface LayeredPaintedMapVisual {
  kind: 'layered-painted';
  /** Scenery only: no route, bridge, foundation, or placement markings. */
  terrain: PaintedLayerAsset;
  /** A transparent horizontal brush stamped and rotated along route geometry. */
  road: PaintedLayerAsset & {
    stampLength: number;
    stampSpacing: number;
    shoulder: number;
  };
  /** A transparent circular decal centered directly on each build pad. */
  foundation: PaintedLayerAsset & {
    diameterScale?: number;
  };
  /** Optional transparent sprites rendered above actors for real occlusion. */
  foreground?: PaintedLayerAsset & {
    placements: readonly {
      x: number;
      y: number;
      scale?: number;
      rotation?: number;
      depth?: number;
      flipX?: boolean;
    }[];
  };
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
  visual: PaintedMapVisual | LayeredPaintedMapVisual | ProceduralMapVisual;
  primaryRouteId: string;
  routes: readonly BattleRouteDefinition[];
  /** Compatibility alias for the primary route. New code uses routes. */
  route: BattleRouteDefinition;
  buildPads: readonly BattleBuildPad[];
  /** Optional compile-time quality gates for production benchmark layouts. */
  strategicRequirements?: {
    baseTowerRanges?: readonly number[];
    minDoublePassPads?: number;
    minMultiRoutePads?: number;
    minDistinctProfiles?: number;
    maxDominatedPads?: number;
  };
  markers: {
    entrances: readonly (BattleMapMarker & { routeId: string })[];
    /** Compatibility alias for the primary entrance. */
    entrance: BattleMapMarker;
    gate: BattleMapMarker;
  };
}
