import { ACTIVE_BATTLE_MAP } from '../content/maps';
import type { Vec2 } from './geometryTypes';

export type { Vec2 } from './geometryTypes';

export interface PathProjection {
  point: Vec2;
  /** Normalized arc-length position on the authored route. */
  progress: number;
  tangent: Vec2;
  normal: Vec2;
  distance: number;
}

export const distance = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

export const PATH_POINTS: readonly Vec2[] = ACTIVE_BATTLE_MAP.route.centerline;
export const BUILD_PADS: readonly Vec2[] = ACTIVE_BATTLE_MAP.buildPads;
export const PATH_HALF_WIDTH = ACTIVE_BATTLE_MAP.route.halfWidth;

const SEGMENT_LENGTHS = PATH_POINTS.slice(0, -1).map((point, index) => distance(point, PATH_POINTS[index + 1]!));
const SEGMENT_START_DISTANCES = SEGMENT_LENGTHS.map((_, index) => SEGMENT_LENGTHS.slice(0, index).reduce((sum, length) => sum + length, 0));
export const PATH_LENGTH = SEGMENT_LENGTHS.reduce((sum, length) => sum + length, 0);
const SEGMENT_NORMALS = PATH_POINTS.slice(0, -1).map((point, index) => {
  const next = PATH_POINTS[index + 1]!;
  const length = SEGMENT_LENGTHS[index]!;
  return length === 0 ? { x: 0, y: 1 } : { x: -(next.y - point.y) / length, y: (next.x - point.x) / length };
});
const normalize = (vector: Vec2): Vec2 => {
  const length = Math.hypot(vector.x, vector.y);
  return length < 1e-9 ? { x: 0, y: 1 } : { x: vector.x / length, y: vector.y / length };
};
const VERTEX_NORMALS = PATH_POINTS.map((_, index) => {
  if (index === 0) return SEGMENT_NORMALS[0]!;
  if (index === PATH_POINTS.length - 1) return SEGMENT_NORMALS.at(-1)!;
  return normalize({
    x: SEGMENT_NORMALS[index - 1]!.x + SEGMENT_NORMALS[index]!.x,
    y: SEGMENT_NORMALS[index - 1]!.y + SEGMENT_NORMALS[index]!.y,
  });
});

export interface PathFrame extends Vec2 {
  tangent: Vec2;
  normal: Vec2;
}

/**
 * Continuous path frame. Interpolated vertex normals prevent a lateral lane
 * actor from jumping when its authoritative progress crosses a polyline corner.
 */
export function frameOnPath(progress: number): PathFrame {
  let remaining = Math.max(0, Math.min(1, progress)) * PATH_LENGTH;
  for (let index = 0; index < SEGMENT_LENGTHS.length; index += 1) {
    const length = SEGMENT_LENGTHS[index]!;
    if (remaining <= length || index === SEGMENT_LENGTHS.length - 1) {
      const ratio = length === 0 ? 0 : Math.max(0, Math.min(1, remaining / length));
      const start = PATH_POINTS[index]!;
      const end = PATH_POINTS[index + 1]!;
      const normal = normalize({
        x: VERTEX_NORMALS[index]!.x + (VERTEX_NORMALS[index + 1]!.x - VERTEX_NORMALS[index]!.x) * ratio,
        y: VERTEX_NORMALS[index]!.y + (VERTEX_NORMALS[index + 1]!.y - VERTEX_NORMALS[index]!.y) * ratio,
      });
      return {
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio,
        normal,
        tangent: { x: normal.y, y: -normal.x },
      };
    }
    remaining -= length;
  }
  const point = PATH_POINTS.at(-1)!;
  const normal = VERTEX_NORMALS.at(-1)!;
  return { ...point, normal, tangent: { x: normal.y, y: -normal.x } };
}

/** World position inside the traversable road corridor. */
export function pointInPathLane(progress: number, laneOffset: number): Vec2 {
  const frame = frameOnPath(progress);
  return { x: frame.x + frame.normal.x * laneOffset, y: frame.y + frame.normal.y * laneOffset };
}

export function pointOnPath(progress: number): Vec2 {
  const frame = frameOnPath(progress);
  return { x: frame.x, y: frame.y };
}

export function nearestPathPoint(point: Vec2): Vec2 {
  return projectPointToPath(point).point;
}

/**
 * Projects a world position onto the route while preserving normalized
 * arc-length. Gameplay code uses progress—not mutable x/y—as the authoritative
 * enemy position, which prevents corner cutting and off-road combat warps.
 */
export function projectPointToPath(point: Vec2): PathProjection {
  let nearest = { ...PATH_POINTS[0]! };
  let nearestDistance = Number.POSITIVE_INFINITY;
  let nearestProgress = 0;
  let tangent = { x: 1, y: 0 };
  for (let index = 0; index < PATH_POINTS.length - 1; index += 1) {
    const start = PATH_POINTS[index]!;
    const end = PATH_POINTS[index + 1]!;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    const projection = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
    const candidate = { x: start.x + dx * projection, y: start.y + dy * projection };
    const candidateDistance = distance(point, candidate);
    if (candidateDistance < nearestDistance) {
      nearest = candidate;
      nearestDistance = candidateDistance;
      const segmentLength = SEGMENT_LENGTHS[index]!;
      nearestProgress = (SEGMENT_START_DISTANCES[index]! + segmentLength * projection) / PATH_LENGTH;
      tangent = segmentLength === 0 ? tangent : { x: dx / segmentLength, y: dy / segmentLength };
    }
  }
  return {
    point: nearest,
    progress: nearestProgress,
    tangent,
    normal: { x: -tangent.y, y: tangent.x },
    distance: nearestDistance,
  };
}

export const routeDistance = (a: Vec2, b: Vec2): number => (
  Math.abs(projectPointToPath(a).progress - projectPointToPath(b).progress) * PATH_LENGTH
);
