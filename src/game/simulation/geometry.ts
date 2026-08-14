import { RUN_DEFINITIONS } from '../content/generated/stages';
import type { BattleMapDefinition, BattleRouteDefinition } from '../content/maps/types';
import type { Vec2 } from './geometryTypes';

export type { Vec2 } from './geometryTypes';

export interface PathProjection {
  point: Vec2;
  progress: number;
  tangent: Vec2;
  normal: Vec2;
  distance: number;
}

export interface PathFrame extends Vec2 {
  tangent: Vec2;
  normal: Vec2;
}

export interface PathTrafficPosition {
  /** Occupants with the same key participate in one lane queue. */
  key: string;
  /** Arc-length position local to the shared section (world units). */
  distance: number;
}

interface RouteCache {
  route: BattleRouteDefinition;
  segmentLengths: readonly number[];
  segmentStarts: readonly number[];
  segmentNormals: readonly Vec2[];
  vertexNormals: readonly Vec2[];
  length: number;
}

export const distance = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

const normalize = (vector: Vec2): Vec2 => {
  const length = Math.hypot(vector.x, vector.y);
  return length < 1e-9 ? { x: 0, y: 1 } : { x: vector.x / length, y: vector.y / length };
};

function cacheRoute(route: BattleRouteDefinition): RouteCache {
  const points = route.centerline;
  const segmentLengths = points.slice(0, -1).map((point, index) => distance(point, points[index + 1]!));
  let accumulated = 0;
  const segmentStarts = segmentLengths.map((length) => { const start = accumulated; accumulated += length; return start; });
  const segmentNormals = points.slice(0, -1).map((point, index) => {
    const next = points[index + 1]!;
    const length = segmentLengths[index]!;
    return length === 0 ? { x: 0, y: 1 } : { x: -(next.y - point.y) / length, y: (next.x - point.x) / length };
  });
  const vertexNormals = points.map((_, index) => {
    if (index === 0) return segmentNormals[0]!;
    if (index === points.length - 1) return segmentNormals.at(-1)!;
    return normalize({ x: segmentNormals[index - 1]!.x + segmentNormals[index]!.x, y: segmentNormals[index - 1]!.y + segmentNormals[index]!.y });
  });
  return { route, segmentLengths, segmentStarts, segmentNormals, vertexNormals, length: accumulated };
}

/**
 * Immutable, run-owned navigation. No module cache changes when another stage
 * is selected; simulation and presentation receive the same instance.
 */
export class PathGeometry {
  readonly map: BattleMapDefinition;
  readonly buildPads: BattleMapDefinition['buildPads'];
  readonly primaryRouteId: string;
  private readonly routes: ReadonlyMap<string, RouteCache>;

  constructor(map: BattleMapDefinition) {
    this.map = map;
    this.buildPads = map.buildPads;
    this.primaryRouteId = map.primaryRouteId;
    this.routes = new Map(map.routes.map((route) => [route.id, cacheRoute(route)]));
    if (!this.routes.has(this.primaryRouteId)) throw new Error(`Map '${map.id}' has no primary route '${this.primaryRouteId}'.`);
  }

  routeIds(): readonly string[] { return [...this.routes.keys()]; }
  route(id = this.primaryRouteId): BattleRouteDefinition { return this.cache(id).route; }
  length(id = this.primaryRouteId): number { return this.cache(id).length; }
  halfWidth(id = this.primaryRouteId): number { return this.cache(id).route.halfWidth; }

  /**
   * Resolves route-local progress into an occupancy domain. By default every
   * route is isolated. Authored traffic groups deliberately join coincident
   * downstream sections from different entrances into one deterministic queue.
   */
  trafficPosition(progress: number, routeId = this.primaryRouteId): PathTrafficPosition {
    const cache = this.cache(routeId);
    const clamped = Math.max(0, Math.min(1, progress));
    const section = cache.route.sections?.find((candidate) => candidate.trafficGroup
      && clamped >= candidate.from
      && (clamped < candidate.to || (candidate.to === 1 && clamped === 1)));
    if (!section?.trafficGroup) return { key: `route:${routeId}`, distance: clamped * cache.length };
    return { key: `shared:${section.trafficGroup}`, distance: (clamped - section.from) * cache.length };
  }

  /**
   * Expresses a route position in a specific traffic domain, including just
   * outside a shared section. The signed distance is what lets the simulation
   * reserve clearance while an actor crosses a merge/split boundary instead
   * of discovering an overlap one fixed tick later.
   */
  trafficPositionForKey(progress: number, routeId: string, key: string): PathTrafficPosition | undefined {
    const cache = this.cache(routeId);
    const clamped = Math.max(0, Math.min(1, progress));
    if (key === `route:${routeId}`) return { key, distance: clamped * cache.length };
    if (!key.startsWith('shared:')) return undefined;
    const trafficGroup = key.slice('shared:'.length);
    const section = cache.route.sections?.find((candidate) => candidate.trafficGroup === trafficGroup);
    return section ? { key, distance: (clamped - section.from) * cache.length } : undefined;
  }

  /**
   * Returns the queue domain used near a junction. Approaching actors reserve
   * their place shortly before coincident centerlines meet; otherwise two
   * synchronized entrances can overlap at the exact tick they cross `from`.
   */
  trafficQueuePosition(progress: number, routeId = this.primaryRouteId, junctionMargin = 0): PathTrafficPosition {
    const current = this.trafficPosition(progress, routeId);
    if (current.key.startsWith('shared:') || junctionMargin <= 0) return current;
    const cache = this.cache(routeId);
    const clamped = Math.max(0, Math.min(1, progress));
    const arc = clamped * cache.length;
    const nearby = cache.route.sections
      ?.filter((section) => section.trafficGroup)
      .map((section) => {
        const fromArc = section.from * cache.length;
        const toArc = section.to * cache.length;
        const boundaryGap = arc < fromArc ? fromArc - arc : arc > toArc ? arc - toArc : 0;
        return { section, boundaryGap };
      })
      .filter(({ boundaryGap }) => boundaryGap <= junctionMargin)
      .sort((a, b) => a.boundaryGap - b.boundaryGap)[0];
    if (!nearby?.section.trafficGroup) return current;
    return {
      key: `shared:${nearby.section.trafficGroup}`,
      distance: (clamped - nearby.section.from) * cache.length,
    };
  }

  /**
   * Returns the strongest authored terrain modifier at this progress. Flying
   * units ignore terrain unless the section opts in with affectsFlying.
   */
  terrainSpeedMultiplier(progress: number, routeId = this.primaryRouteId, flying = false): number {
    const clamped = Math.max(0, Math.min(1, progress));
    const multipliers = this.cache(routeId).route.sections
      ?.filter((section) => section.speedMultiplier !== undefined
        && (!flying || section.affectsFlying === true)
        && clamped >= section.from
        && (clamped < section.to || (section.to === 1 && clamped === 1)))
      .map((section) => section.speedMultiplier!)
      ?? [];
    return multipliers.length === 0 ? 1 : Math.min(...multipliers);
  }

  frame(progress: number, routeId = this.primaryRouteId): PathFrame {
    const cache = this.cache(routeId);
    const points = cache.route.centerline;
    let remaining = Math.max(0, Math.min(1, progress)) * cache.length;
    for (let index = 0; index < cache.segmentLengths.length; index += 1) {
      const length = cache.segmentLengths[index]!;
      if (remaining <= length || index === cache.segmentLengths.length - 1) {
        const ratio = length === 0 ? 0 : Math.max(0, Math.min(1, remaining / length));
        const start = points[index]!;
        const end = points[index + 1]!;
        const normal = normalize({
          x: cache.vertexNormals[index]!.x + (cache.vertexNormals[index + 1]!.x - cache.vertexNormals[index]!.x) * ratio,
          y: cache.vertexNormals[index]!.y + (cache.vertexNormals[index + 1]!.y - cache.vertexNormals[index]!.y) * ratio,
        });
        return { x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio, normal, tangent: { x: normal.y, y: -normal.x } };
      }
      remaining -= length;
    }
    const point = points.at(-1)!;
    const normal = cache.vertexNormals.at(-1)!;
    return { ...point, normal, tangent: { x: normal.y, y: -normal.x } };
  }

  point(progress: number, routeId = this.primaryRouteId): Vec2 {
    const frame = this.frame(progress, routeId);
    return { x: frame.x, y: frame.y };
  }

  lanePoint(progress: number, laneOffset: number, routeId = this.primaryRouteId): Vec2 {
    const frame = this.frame(progress, routeId);
    return { x: frame.x + frame.normal.x * laneOffset, y: frame.y + frame.normal.y * laneOffset };
  }

  project(point: Vec2, routeId?: string): PathProjection & { routeId: string } {
    if (routeId) return { ...this.projectOnRoute(point, routeId), routeId };
    return this.routeIds().map((id) => ({ ...this.projectOnRoute(point, id), routeId: id })).sort((a, b) => a.distance - b.distance)[0]!;
  }

  routeDistance(a: Vec2, b: Vec2, routeId?: string): number {
    const route = routeId ?? this.project(a).routeId;
    return Math.abs(this.project(a, route).progress - this.project(b, route).progress) * this.length(route);
  }

  private projectOnRoute(point: Vec2, routeId: string): PathProjection {
    const cache = this.cache(routeId);
    const points = cache.route.centerline;
    let nearest = { ...points[0]! };
    let nearestDistance = Number.POSITIVE_INFINITY;
    let nearestProgress = 0;
    let tangent = { x: 1, y: 0 };
    for (let index = 0; index < points.length - 1; index += 1) {
      const start = points[index]!;
      const end = points[index + 1]!;
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const lengthSquared = dx * dx + dy * dy;
      const ratio = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
      const candidate = { x: start.x + dx * ratio, y: start.y + dy * ratio };
      const candidateDistance = distance(point, candidate);
      if (candidateDistance < nearestDistance) {
        nearest = candidate;
        nearestDistance = candidateDistance;
        const segmentLength = cache.segmentLengths[index]!;
        nearestProgress = cache.length === 0 ? 0 : (cache.segmentStarts[index]! + segmentLength * ratio) / cache.length;
        tangent = segmentLength === 0 ? tangent : { x: dx / segmentLength, y: dy / segmentLength };
      }
    }
    return { point: nearest, progress: nearestProgress, tangent, normal: { x: -tangent.y, y: tangent.x }, distance: nearestDistance };
  }

  private cache(id: string): RouteCache {
    const cache = this.routes.get(id);
    if (!cache) throw new Error(`Map '${this.map.id}' has no route '${id}'.`);
    return cache;
  }
}

// Compatibility functions keep focused unit tests concise. Runtime code owns
// its PathGeometry through RunDefinition and never mutates this default.
export const DEFAULT_PATH_GEOMETRY = new PathGeometry(RUN_DEFINITIONS['sunken-way']!.map);
export const PATH_POINTS = DEFAULT_PATH_GEOMETRY.route().centerline;
export const BUILD_PADS = DEFAULT_PATH_GEOMETRY.buildPads;
export const PATH_HALF_WIDTH = DEFAULT_PATH_GEOMETRY.halfWidth();
export const PATH_LENGTH = DEFAULT_PATH_GEOMETRY.length();
export const frameOnPath = (progress: number): PathFrame => DEFAULT_PATH_GEOMETRY.frame(progress);
export const pointInPathLane = (progress: number, laneOffset: number): Vec2 => DEFAULT_PATH_GEOMETRY.lanePoint(progress, laneOffset);
export const pointOnPath = (progress: number): Vec2 => DEFAULT_PATH_GEOMETRY.point(progress);
export const nearestPathPoint = (point: Vec2): Vec2 => DEFAULT_PATH_GEOMETRY.project(point).point;
export const projectPointToPath = (point: Vec2): PathProjection => DEFAULT_PATH_GEOMETRY.project(point);
export const routeDistance = (a: Vec2, b: Vec2): number => DEFAULT_PATH_GEOMETRY.routeDistance(a, b);
