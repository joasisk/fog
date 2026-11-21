import type { StreetSegmentId } from "../model/network.ts";
import type { RoadGraph } from "./roads.ts";
import { heightAt } from "./terrain.ts";
import type { Terrain, WorldPosition } from "./terrain.ts";

export interface RoadAddress {
  readonly edgeId: StreetSegmentId;
  readonly distance: number;
}

export interface Station extends WorldPosition { readonly distance: number }

/** The same terrain-following arc length is used for routing, frontage, and entrances. */
export function surveyCenterline(terrain: Terrain, line: readonly WorldPosition[]) {
  const stations: Station[] = [{ ...line[0]!, distance: 0 }];
  const distances = [0];
  let distance = 0;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    for (const t of [0.25, 0.5, 0.75, 1]) {
      const x = a.x + (b.x - a.x) * t;
      const d = a.d + (b.d - a.d) * t;
      const h = heightAt(terrain, { x, d })!;
      const prev = stations.at(-1)!;
      distance += Math.hypot(x - prev.x, d - prev.d, h - prev.h);
      stations.push({ x, d, h, distance });
    }
    distances.push(distance);
  }
  return { stations, distances };
}

export function stationAtDistance(stations: readonly Station[], distance: number): Station {
  const i = stations.findIndex((p) => p.distance >= distance);
  if (i <= 0) return i === 0 ? stations[0]! : stations.at(-1)!;
  const a = stations[i - 1]!, b = stations[i]!, t = (distance - a.distance) / (b.distance - a.distance);
  return { x: a.x + (b.x - a.x) * t, d: a.d + (b.d - a.d) * t, h: a.h + (b.h - a.h) * t, distance };
}

/** Shortest paths between arbitrary points along edges, including the direct route on a shared edge. */
export function walkingDistances(graph: RoadGraph) {
  const index = new Map(graph.nodes.map(({ id }, i) => [id, i]));
  const edges = new Map(graph.edges.map((edge) => [edge.id, edge]));
  const paths = graph.nodes.map((_, i) => graph.nodes.map((_, j): number => i === j ? 0 : Infinity));
  for (const edge of graph.edges) {
    const i = index.get(edge.from)!, j = index.get(edge.to)!;
    paths[i]![j] = paths[j]![i] = Math.min(paths[i]![j]!, edge.walkingDistance);
  }
  for (let k = 0; k < paths.length; k++) {
    for (let i = 0; i < paths.length; i++) {
      for (let j = 0; j < paths.length; j++) {
        paths[i]![j] = Math.min(paths[i]![j]!, paths[i]![k]! + paths[k]![j]!);
      }
    }
  }
  return (a: RoadAddress, b: RoadAddress): number => {
    const first = edges.get(a.edgeId)!, last = edges.get(b.edgeId)!;
    const from = paths[index.get(first.from)!]!, to = paths[index.get(first.to)!]!;
    const left = index.get(last.from)!, right = index.get(last.to)!;
    const aEnd = first.walkingDistance - a.distance, bEnd = last.walkingDistance - b.distance;
    return Math.min(a.edgeId === b.edgeId ? Math.abs(a.distance - b.distance) : Infinity,
      a.distance + from[left]! + b.distance, a.distance + from[right]! + bEnd,
      aEnd + to[left]! + b.distance, aEnd + to[right]! + bEnd);
  };
}
