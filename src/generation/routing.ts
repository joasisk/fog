import type { FrontageSide } from "../model/network.ts";
import { GEOMETRY_FIXTURES } from "./fixtures.ts";
import { gridNeighbors, heightAt, sampleAt } from "./terrain.ts";
import type { Terrain, WorldPosition } from "./terrain.ts";

export const MAX_LANE_GRADE_DEGREES = 8;
export const ROAD_WIDTH = 0.48;

export function gradeBetween(a: WorldPosition, b: WorldPosition): number {
  return Math.atan2(b.h - a.h, Math.hypot(b.x - a.x, b.d - a.d)) * 180 / Math.PI;
}

/** Steepest signed grade of a single grid link on the bilinear height surface. */
export function peakTerrainGrade(terrain: Terrain, a: WorldPosition, b: WorldPosition): number {
  if (a.x === b.x || a.d === b.d) return gradeBetween(a, b);
  // Along a diagonal, height is quadratic and its derivative is linear.
  const middle = heightAt(terrain, { x: (a.x + b.x) / 2, d: (a.d + b.d) / 2 })!;
  const curvature = 2 * (a.h + b.h - 2 * middle);
  const rise = b.h - a.h;
  const start = rise - curvature;
  const end = rise + curvature;
  return Math.atan2(Math.abs(start) > Math.abs(end) ? start : end,
    Math.hypot(b.x - a.x, b.d - a.d)) * 180 / Math.PI;
}

export function routingNeighbors(terrain: Terrain, id: number): number[] {
  const sample = terrain.samples[id]!;
  if (sample.exclusion || sample.slopeDegrees > 14) return [];
  const { columns, rows } = terrain;
  const column = id % columns;
  const row = Math.floor(id / columns);
  const neighbors = gridNeighbors(columns, rows, id);
  // Triangulate consistently so at-grade links cannot cross without sharing a sample.
  if (column > 0 && row > 0) neighbors.push(id - columns - 1);
  if (column < columns - 1 && row < rows - 1) neighbors.push(id + columns + 1);
  return neighbors.filter((next) => {
    const target = terrain.samples[next]!;
    if (target.exclusion || target.slopeDegrees > 14) return false;
    if (Math.abs(peakTerrainGrade(terrain, sample, target)) > MAX_LANE_GRADE_DEGREES) return false;
    const dx = target.x - sample.x;
    const dd = target.d - sample.d;
    const length = Math.hypot(dx, dd);
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const x = sample.x + dx * t;
      const d = sample.d + dd * t;
      for (const offset of [-ROAD_WIDTH / 2, 0, ROAD_WIDTH / 2]) {
        const support = sampleAt(terrain, { x: x - dd / length * offset, d: d + dx / length * offset });
        if (!support) {
          if (x === terrain.domain.minX || x === terrain.domain.maxX) continue;
          return false;
        }
        if (support.exclusion) return false;
      }
    }
    return true;
  });
}

export type RoadSide = `${FrontageSide}`;

/** Test a strip normal to the centerline, using the corresponding fixture's rear depth in F. */
export function frontageSupport(terrain: Terrain, a: WorldPosition, b: WorldPosition,
  side: RoadSide, rearDepth: number): boolean {
  const dx = b.x - a.x;
  const dd = b.d - a.d;
  const outward = (side === "near" ? -1 : 1) / Math.hypot(dx, dd);
  const depths = Math.ceil(rearDepth / (terrain.step / 2));
  for (const t of [0, 0.5, 1]) {
    for (let i = 0; i <= depths; i++) {
      const offset = (ROAD_WIDTH / 2 + i / depths * rearDepth) * outward;
      const x = a.x + dx * t - dd * offset;
      const d = a.d + dd * t + dx * offset;
      if (!sampleAt(terrain, { x, d })?.buildable) return false;
    }
  }
  return true;
}

export const fixtureDepths = {
  attached: GEOMETRY_FIXTURES.assets.attached.footprint_f[2][1]!,
  detached: GEOMETRY_FIXTURES.assets.detached.footprint_f[2][1]!,
  civic: GEOMETRY_FIXTURES.assets.civic.footprint_f[2][1]!,
};

export const roadSides = ["near", "far"] as const;
