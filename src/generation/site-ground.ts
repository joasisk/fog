import type { FrontageSectionId } from "../model/network.ts";
import type { RoadEdge } from "./roads.ts";
import type { RoadSide } from "./routing.ts";
import { benchDepthAt, heightAt } from "./terrain.ts";
import type { Terrain, WorldPoint } from "./terrain.ts";
import { stationAtDistance, surveyCenterline } from "./walking.ts";
import type { Station } from "./walking.ts";

export type Outline = readonly [WorldPoint, WorldPoint, WorldPoint, WorldPoint];
export interface Bounds { minX: number; maxX: number; near: number; far: number }
export interface Rectangle { outline: Outline; bounds: Bounds }

function quad(outline: Outline): Rectangle {
  const xs = outline.map((p) => p.x), ds = outline.map((p) => p.d);
  return { outline, bounds: { minX: Math.min(...xs), maxX: Math.max(...xs), near: Math.min(...ds), far: Math.max(...ds) } };
}

function rectangle(origin: WorldPoint, axis: WorldPoint, start: number, end: number, front: number, rear: number) {
  const point = (along: number, offset: number) => ({
    x: origin.x + axis.x * along - axis.d * offset, d: origin.d + axis.d * along + axis.x * offset,
  });
  return quad([point(start, front), point(end, front), point(end, rear), point(start, rear)]);
}

/** Positive interior overlap. Two parcels may meet precisely at a wall. */
export function overlaps(a: Rectangle, b: Rectangle): boolean {
  const eps = 1e-8;
  if (a.bounds.maxX <= b.bounds.minX + eps || b.bounds.maxX <= a.bounds.minX + eps
    || a.bounds.far <= b.bounds.near + eps || b.bounds.far <= a.bounds.near + eps) return false;
  for (const { outline } of [a, b]) {
    for (let i = 0; i < 2; i++) {
      const p = outline[i]!, q = outline[i + 1]!;
      const project = (v: WorldPoint) => (q.d - p.d) * v.x - (q.x - p.x) * v.d;
      const aa = a.outline.map(project), bb = b.outline.map(project);
      if (Math.max(...aa) <= Math.min(...bb) + eps || Math.max(...bb) <= Math.min(...aa) + eps) return false;
    }
  }
  return true;
}

export function buildable(terrain: Terrain, rect: Rectangle): boolean {
  const { minX, maxX, near, far } = rect.bounds;
  const { domain, step } = terrain;
  if (minX < domain.minX || maxX > domain.maxX || near < 0 || far > domain.maxDepth) return false;
  const col = (x: number) => Math.round((x - domain.minX) / step);
  const row = (d: number) => Math.round(d / step);
  for (let j = row(near); j <= row(far); j++) {
    for (let i = col(minX); i <= col(maxX); i++) {
      const cell = terrain.samples[j * terrain.columns + i]!;
      if (!cell.buildable && overlaps(rect, rectangle(cell, { x: 1, d: 0 }, -step / 2, step / 2, -step / 2, step / 2))) return false;
    }
  }
  return true;
}

/** A bilinear patch reaches its extrema on the corners of its bounding rectangle.
 * Include each intersected grid line. Diagonal footprints get a conservative plinth. */
export function supportRange(terrain: Terrain, { bounds }: Rectangle) {
  const gridCuts = (min: number, max: number, origin: number) => {
    const cuts = [min, max];
    for (let i = Math.ceil((min - origin) / terrain.step); origin + i * terrain.step < max; i++) {
      cuts.push(origin + i * terrain.step);
    }
    return cuts;
  };
  const xs = gridCuts(bounds.minX, bounds.maxX, terrain.domain.minX);
  const ds = gridCuts(bounds.near, bounds.far, 0);
  const heights = xs.flatMap((x) => ds.map((d) => heightAt(terrain, { x, d })!));
  return { low: Math.min(...heights), high: Math.max(...heights) };
}

export interface Ribbon {
  readonly id: FrontageSectionId;
  readonly edge: RoadEdge;
  readonly side: RoadSide;
  readonly band: number;
  readonly axis: WorldPoint;
  readonly origin: WorldPoint;
  readonly stations: readonly Station[];
  readonly length: number;
}

export function ribbonPoint(r: Ribbon, along: number, setback: number): WorldPoint {
  const offset = (r.side === "near" ? -1 : 1) * (r.edge.width / 2 + setback);
  return { x: r.origin.x + r.axis.x * along - r.axis.d * offset, d: r.origin.d + r.axis.d * along + r.axis.x * offset };
}

export function parcelBox(r: Ribbon, start: number, end: number, setback: number, depth: number): Rectangle {
  const sign = r.side === "near" ? -1 : 1;
  const front = r.edge.width / 2 + setback;
  return rectangle(r.origin, r.axis, start, end, sign * front, sign * (front + depth));
}

export function roadDistanceAt(r: Ribbon, along: number): number {
  const x = r.origin.x + r.axis.x * along;
  const i = r.stations.findIndex((station) => station.x >= x);
  if (i === -1) return r.stations.at(-1)!.distance;
  if (i === 0) return r.stations[0]!.distance;
  const a = r.stations[i - 1]!, b = r.stations[i]!;
  return a.distance + (b.distance - a.distance) * (x - a.x) / (b.x - a.x);
}

export function terrainBand(terrain: Terrain, point: WorldPoint): number {
  let best = Infinity, band = 0;
  for (const [i, bench] of terrain.benches.entries()) {
    const delta = Math.abs(point.d - benchDepthAt(bench, point.x));
    if (delta < best) { best = delta; band = i; }
  }
  return band;
}

/** Split frontage at bends so a straight, vertical shell can fit the whole lot. */
export function surveyFrontage(terrain: Terrain, edges: readonly RoadEdge[]) {
  const ribbons: Ribbon[] = [], paving: Rectangle[] = [];
  for (const edge of edges) {
    const { stations, distances } = surveyCenterline(terrain, edge.centerline);
    for (let i = 0; i < edge.centerline.length - 1;) {
      const a = edge.centerline[i]!, b = edge.centerline[i + 1]!;
      const dx = b.x - a.x, dd = b.d - a.d, length = Math.hypot(dx, dd);
      const axis = { x: dx / length, d: dd / length };
      let j = i + 1;
      while (j + 1 < edge.centerline.length) {
        const p = edge.centerline[j]!, q = edge.centerline[j + 1]!;
        if (q.x - p.x !== dx || q.d - p.d !== dd) break;
        j++;
      }
      const end = edge.centerline[j]!;
      paving.push(rectangle(a, axis, 0, Math.hypot(end.x - a.x, end.d - a.d), -edge.width / 2, edge.width / 2));
      // Protect junctions and the outer corner where two paving strips meet.
      for (const corner of [a, end]) {
        paving.push(rectangle(corner, { x: 1, d: 0 }, -edge.width / 2, edge.width / 2, -edge.width / 2, edge.width / 2));
      }
      for (const [spanIndex, span] of edge.frontage.entries()) {
        if (span.support !== "residential" || dx <= 0) continue;
        const start = Math.max(span.start, distances[i]!), finish = Math.min(span.end, distances[j]!);
        if (finish - start < 0.5) continue;
        const origin = stationAtDistance(stations, start), last = stationAtDistance(stations, finish);
        ribbons.push({ id: `frontage:${edge.id}:${span.side}:${i}:${spanIndex}`, origin, axis, edge,
          side: span.side, length: Math.hypot(last.x - origin.x, last.d - origin.d), band: terrainBand(terrain, origin),
          stations: [origin, ...stations.filter((p) => p.distance > start && p.distance < finish), last] });
      }
      i = j;
    }
  }
  return { ribbons, paving };
}
