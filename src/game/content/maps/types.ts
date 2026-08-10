import type { Vec2 } from '../../simulation/geometryTypes';

export interface BattleMapMarker extends Vec2 {
  label: string;
}

export interface BattleMapDefinition {
  id: string;
  title: string;
  world: { width: number; height: number };
  backgroundAsset: string;
  route: {
    halfWidth: number;
    centerline: readonly Vec2[];
  };
  buildPads: readonly Vec2[];
  markers: {
    entrance: BattleMapMarker;
    gate: BattleMapMarker;
  };
}
