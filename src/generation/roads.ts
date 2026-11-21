import type { JunctionId, StreetSegmentId } from "../model/network.ts";
import { fixtureDepths, frontageSupport, MAX_LANE_GRADE_DEGREES, peakTerrainGrade, ROAD_WIDTH, roadSides } from "./routing.ts";
import type { RoadSide } from "./routing.ts";
import { capacityShortfalls, CIVIC_SPAN, residentialDepth, residentialPitch, TIERS } from "./settlement.ts";
import type { Capacity, SettlementTier, TerrainAnalysis } from "./settlement.ts";
import { benchDepthAt, seedFraction } from "./terrain.ts";
import type { Terrain, WorldPosition } from "./terrain.ts";
import { surveyCenterline } from "./walking.ts";

export interface RoadNode {
  readonly id: JunctionId;
  readonly position: WorldPosition;
  readonly approachId?: string;
}

export interface FrontageSpan {
  readonly side: RoadSide;
  /** Walking distance in F from the edge's from node. */
  readonly start: number;
  readonly end: number;
  readonly support: "residential" | "civic";
}

export interface RoadEdge {
  readonly id: StreetSegmentId;
  readonly from: JunctionId;
  readonly to: JunctionId;
  readonly centerline: readonly WorldPosition[];
  readonly gradesDegrees: readonly number[];
  readonly walkingDistance: number;
  readonly width: number;
  readonly apparentReveal: number;
  readonly surface: "gravel" | "paving";
  readonly route: "spine" | "branch" | "connector" | "stairs" | "bridge";
  readonly level: number;
  readonly frontage: readonly FrontageSpan[];
}

export interface RoadGraph {
  readonly nodes: readonly RoadNode[];
  readonly edges: readonly RoadEdge[];
}

type Bench = Terrain["benches"][number];
type Link = { from: number; to: number; route: "spine" | "branch" | "connector"; band: number };

function route(terrain: Terrain, analysis: TerrainAnalysis, start: number, targets: ReadonlySet<number>,
  bench?: Bench): number[] {
  const distances = new Map([[start, 0]]);
  const previous = new Map<number, number>();
  const pending = new Set([start]);
  while (pending.size > 0) {
    let current = start;
    let cost = Infinity;
    for (const id of pending) {
      const distance = distances.get(id)!;
      if (distance < cost || (distance === cost && id < current)) {
        current = id;
        cost = distance;
      }
    }
    if (targets.has(current)) {
      const path = [current];
      while (current !== start) {
        current = previous.get(current)!;
        path.push(current);
      }
      return path.reverse();
    }
    pending.delete(current);
    const a = terrain.samples[current]!;
    for (const next of analysis.neighbors[current]!) {
      const b = terrain.samples[next]!;
      const offBench = bench ? Math.abs(b.d - benchDepthAt(bench, b.x)) : 0;
      if (offBench > 1.5) continue;
      const grade = peakTerrainGrade(terrain, a, b) / MAX_LANE_GRADE_DEGREES;
      const earthwork = (a.slopeDegrees + b.slopeDegrees) / 28;
      const distance = cost + Math.hypot(a.x - b.x, a.d - b.d) * (1 + 2 * grade ** 2 + earthwork + 0.6 * offBench);
      if (distance >= (distances.get(next) ?? Infinity)) continue;
      distances.set(next, distance);
      previous.set(next, current);
      pending.add(next);
    }
  }
  return [];
}

const nodeId = (id: number): JunctionId => `junction:world-${id}`;

export function reachableRoadNodes(graph: RoadGraph, start: JunctionId): ReadonlySet<JunctionId> {
  const neighbors = new Map(graph.nodes.map(({ id }) => [id, [] as JunctionId[]]));
  if (!neighbors.has(start)) return new Set();
  for (const { from, to } of graph.edges) {
    neighbors.get(from)?.push(to);
    neighbors.get(to)?.push(from);
  }
  const reachable = new Set([start]);
  for (const id of reachable) {
    for (const next of neighbors.get(id)!) reachable.add(next);
  }
  return reachable;
}

export function buildRoadGraph(terrain: Terrain, analysis: TerrainAnalysis, tier: SettlementTier,
  seed: string): { graph: RoadGraph; capacity: Capacity } | { shortfalls: string[] } {
  const approaches = new Map(terrain.approaches.map(({ sampleId, id }) => [sampleId, id]));
  const first = terrain.approaches[0];
  const primary = terrain.benches[0];
  if (!first || !primary) return { shortfalls: ["No external approach to a route corridor."] };
  const start = first.sampleId;
  const opposite = terrain.approaches.find(({ sampleId }) => sampleId !== start && analysis.reachable.has(sampleId));
  const stubX = terrain.samples[start]!.x + (first.side === "west" ? 7 : -7);
  const targets = opposite && tier !== "farmstead" ? [opposite.sampleId]
    : terrain.samples.filter((sample) => sample.x === stubX && Math.abs(sample.d - benchDepthAt(primary, stubX)) <= 0.5
      && analysis.reachable.has(sample.id)).map(({ id }) => id);
  if (!targets.length) return { shortfalls: ["No reachable spine destination."] };
  const spine = route(terrain, analysis, start, new Set(targets), primary);
  if (spine.length < 2) return { shortfalls: ["Could not connect the spine to its destination."] };

  const links = new Map<string, Link>();
  const occupied = new Set<number>();
  const addPath = (path: readonly number[], kind: Link["route"], band: number) => {
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1]!;
      const b = path[i]!;
      const from = Math.min(a, b);
      const to = Math.max(a, b);
      const key = `${from}-${to}`;
      if (!links.has(key)) links.set(key, { from, to, route: kind, band });
      occupied.add(a);
      occupied.add(b);
    }
  };
  addPath(spine, "spine", 0);

  for (const [index, bench] of terrain.benches.slice(1, TIERS[tier].bands).entries()) {
    // Try the full bench first, then a shorter local route if an endpoint is unsupported.
    for (const inset of [0, 2, 4]) {
      const endpoints = [bench.minX + inset, bench.maxX - inset].map((x) => {
        const depth = benchDepthAt(bench, x);
        return terrain.samples.filter((sample) => sample.x === x && Math.abs(sample.d - depth) <= 0.5
          && analysis.reachable.has(sample.id))
          .sort((a, b) => Math.abs(a.d - depth) - Math.abs(b.d - depth) || a.id - b.id)[0];
      });
      const [west, east] = endpoints;
      if (!west || !east || west.x >= east.x) continue;
      const branch = route(terrain, analysis, west.id, new Set([east.id]), bench);
      if (branch.length < 2) continue;
      const fraction = 0.35 + 0.3 * seedFraction(seed, `roads:branch-${index}`);
      const landing = branch[Math.floor(branch.length * fraction)]!;
      const connector = route(terrain, analysis, landing, occupied);
      if (!connector.length) continue;
      const otherLanding = branch[Math.floor(branch.length * (fraction < 0.5 ? 0.84 : 0.16))]!;
      const second = tier === "city" ? route(terrain, analysis, otherLanding, occupied) : [];
      addPath(branch, "branch", index + 1);
      addPath(connector, "connector", index + 1);
      addPath(second, "connector", index + 1);
      break;
    }
  }

  const adjacency = new Map([...occupied].map((id) => [id, [] as Link[]]));
  for (const link of links.values()) {
    adjacency.get(link.from)!.push(link);
    adjacency.get(link.to)!.push(link);
  }
  const junctions = [...occupied].filter((id) => {
    const incident = adjacency.get(id)!;
    return incident.length !== 2 || approaches.has(id) || incident[0]!.route !== incident[1]!.route
      || incident[0]!.band !== incident[1]!.band;
  }).sort((a, b) => a - b);
  const junctionSet = new Set(junctions);
  const nodes: RoadNode[] = junctions.map((id) => ({
    id: nodeId(id), position: terrain.samples[id]!,
    ...(approaches.has(id) ? { approachId: approaches.get(id)! } : {}),
  }));
  const edges: RoadEdge[] = [];
  const walked = new Set<Link>();
  const bandFrontage = new Map<number, number>();
  let estimatedBuildings = 0;
  let publicSites = 0;
  for (const from of junctions) {
    for (const link of adjacency.get(from)!) {
      if (walked.has(link)) continue;
      const ids = [from];
      let current = from;
      let next = link;
      do {
        walked.add(next);
        current = next.from === current ? next.to : next.from;
        ids.push(current);
        if (junctionSet.has(current)) break;
        next = adjacency.get(current)!.find((candidate) => candidate !== next)!;
      } while (!walked.has(next));
      if (from === current || !junctionSet.has(current)) {
        return { shortfalls: ["Road centerline does not terminate at distinct junctions."] };
      }
      if (terrain.samples[from]!.x > terrain.samples[current]!.x) ids.reverse();
      const centerline = ids.map((id) => terrain.samples[id]!);
      const { distances } = surveyCenterline(terrain, centerline);
      const distance = distances.at(-1)!;
      const gradesDegrees = centerline.slice(1).map((point, i) => peakTerrainGrade(terrain, centerline[i]!, point));
      const frontage: FrontageSpan[] = [];
      if (link.route !== "connector") {
        for (const side of roadSides) {
          for (const support of ["residential", "civic"] as const) {
            let startIndex = 0;
            const depth = support === "civic" ? fixtureDepths.civic : residentialDepth(tier);
            for (let i = 0; i < centerline.length; i++) {
              const a = centerline[i]!;
              const b = centerline[i + 1];
              const bench = terrain.benches[link.band]!;
              if (b && b.x > a.x && Math.abs((a.d + b.d) / 2 - benchDepthAt(bench, (a.x + b.x) / 2)) <= 1
                && frontageSupport(terrain, a, b, side, depth)) continue;
              const startDistance = Math.max(0.4, distances[startIndex]!);
              const end = Math.min(distance - 0.4, distances[i]!);
              const length = end - startDistance;
              if (length > 0) {
                frontage.push({ side, start: startDistance, end, support });
                if (support === "civic") publicSites += Math.floor(length / CIVIC_SPAN);
                else {
                  bandFrontage.set(link.band, (bandFrontage.get(link.band) ?? 0) + length / 2);
                  estimatedBuildings += Math.floor(length / residentialPitch(tier));
                }
              }
              startIndex = i + 1;
            }
          }
        }
      }
      const a = ids[0]!;
      const b = ids.at(-1)!;
      edges.push({
        id: `segment:world-${a}-${ids[1]}-${b}`, from: nodeId(a), to: nodeId(b), centerline,
        gradesDegrees, walkingDistance: distance, frontage, route: link.route, level: 0,
        width: ROAD_WIDTH, apparentReveal: 0.08,
        surface: tier === "farm-lane" || tier === "farmstead" ? "gravel" : "paving",
      });
    }
  }
  const graph: RoadGraph = { nodes, edges: edges.sort((a, b) => a.id < b.id ? -1 : a.id === b.id ? 0 : 1) };
  const reachable = reachableRoadNodes(graph, nodeId(start));
  if (reachable.size !== nodes.length || walked.size !== links.size) {
    return { shortfalls: ["Road graph contains a disconnected component."] };
  }
  const capacity: Capacity = {
    connectedBuildableArea: analysis.connectedBuildableArea,
    connectedApproaches: nodes.filter(({ approachId }) => approachId !== undefined).length,
    corridorLength: [...bandFrontage.values()].reduce((sum, length) => sum + length, 0),
    bands: [...bandFrontage.values()].filter((length) => length >= 3).length,
    publicSites, estimatedBuildings,
  };
  const shortfalls = capacityShortfalls(capacity, tier);
  return shortfalls.length ? { shortfalls } : { graph, capacity };
}
