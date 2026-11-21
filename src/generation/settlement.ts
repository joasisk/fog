import type { GenerationSeed, SettlementKind } from "../model/scene.ts";
import { GEOMETRY_FIXTURES } from "./fixtures.ts";
import { fixtureDepths, frontageSupport, roadSides, routingNeighbors } from "./routing.ts";
import { sampleAt, seedFraction } from "./terrain.ts";
import type { Terrain } from "./terrain.ts";

export type SettlementTier = `${SettlementKind}`;

export const TIERS = {
  farmstead: { buildings: 1, bands: 1, area: 3, corridor: 3, publicSites: 0, approaches: 1 },
  "farm-lane": { buildings: 5, bands: 1, area: 12, corridor: 12, publicSites: 0, approaches: 2 },
  hamlet: { buildings: 7, bands: 2, area: 24, corridor: 20, publicSites: 0, approaches: 2 },
  village: { buildings: 18, bands: 2, area: 48, corridor: 28, publicSites: 1, approaches: 2 },
  town: { buildings: 35, bands: 3, area: 90, corridor: 45, publicSites: 1, approaches: 2 },
  city: { buildings: 160, bands: 6, area: 320, corridor: 120, publicSites: 2, approaches: 2 },
} as const satisfies Record<SettlementTier, Record<string, number>>;

export interface Capacity {
  readonly connectedBuildableArea: number;
  readonly corridorLength: number;
  readonly publicSites: number;
  readonly connectedApproaches: number;
  readonly bands: number;
  readonly estimatedBuildings: number;
}

export const residentialPitch = (tier: SettlementTier): number =>
  tier === "farm-lane" ? GEOMETRY_FIXTURES.assets.detached.world_width_f + 2.8
    : tier === "farmstead" ? GEOMETRY_FIXTURES.assets.detached.world_width_f + 0.8
      : GEOMETRY_FIXTURES.assets.attached.world_width_f + 0.55;

export const residentialDepth = (tier: SettlementTier): number =>
  tier === "farm-lane" || tier === "farmstead" ? fixtureDepths.detached : fixtureDepths.attached;

export const CIVIC_SPAN = GEOMETRY_FIXTURES.assets.civic.world_width_f + 0.5;

export function analyzeTerrain(terrain: Terrain) {
  const neighbors = terrain.samples.map(({ id }) => routingNeighbors(terrain, id));
  const entry = terrain.approaches[0]?.sampleId;
  const reachable = new Set<number>(entry === undefined ? [] : [entry]);
  for (const id of reachable) {
    for (const next of neighbors[id]!) reachable.add(next);
  }
  const connectedBuildableArea = Math.max(0, ...terrain.buildableRegions
    .filter((region) => region.sampleIds.some((id) => reachable.has(id))).map(({ area }) => area));
  const connectedApproaches = terrain.approaches.filter(({ sampleId }) => reachable.has(sampleId)).length;
  return { neighbors, reachable, connectedBuildableArea, connectedApproaches };
}

export type TerrainAnalysis = ReturnType<typeof analyzeTerrain>;

export function estimateCapacity(terrain: Terrain, analysis: TerrainAnalysis, tier: SettlementTier): Capacity {
  let corridorLength = 0;
  let estimatedBuildings = 0;
  let publicSites = 0;
  let bands = 0;
  for (const bench of terrain.benches.slice(0, TIERS[tier].bands)) {
    let usableLength = 0;
    for (const side of roadSides) {
      let residential = 0;
      let civic = 0;
      for (let x = bench.minX; x <= bench.maxX; x += terrain.step) {
        const a = sampleAt(terrain, { x, d: bench.depth });
        const b = x < bench.maxX ? sampleAt(terrain, { x: x + terrain.step, d: bench.depth }) : undefined;
        const usable = a && b && analysis.reachable.has(a.id) && analysis.neighbors[a.id]!.includes(b.id);
        if (usable && frontageSupport(terrain, a, b, side, residentialDepth(tier))) {
          residential += terrain.step;
          usableLength += terrain.step / 2;
        } else {
          estimatedBuildings += Math.floor(residential / residentialPitch(tier));
          residential = 0;
        }
        if (usable && frontageSupport(terrain, a, b, side, fixtureDepths.civic)) {
          civic += terrain.step;
        } else {
          publicSites += Math.floor(civic / CIVIC_SPAN);
          civic = 0;
        }
      }
    }
    corridorLength += usableLength;
    if (usableLength >= 3) bands++;
  }
  return { connectedBuildableArea: analysis.connectedBuildableArea, connectedApproaches: analysis.connectedApproaches,
    bands, corridorLength, publicSites, estimatedBuildings };
}

export function capacityShortfalls(capacity: Capacity, tier: SettlementTier): string[] {
  const requirements = TIERS[tier];
  const checks: readonly (readonly [string, number, number])[] = [
    ["connected buildable area", capacity.connectedBuildableArea, requirements.area],
    ["usable corridor length", capacity.corridorLength, requirements.corridor],
    ["contiguous public-site opportunities", capacity.publicSites, requirements.publicSites],
    ["connected external approaches", capacity.connectedApproaches, requirements.approaches],
    ["usable depth bands", capacity.bands, requirements.bands],
    ["estimated building capacity", capacity.estimatedBuildings, requirements.buildings],
  ];
  return checks.flatMap(([label, actual, minimum]) =>
    actual < minimum ? [`${label}: ${actual.toFixed(2)} < ${minimum}`] : []);
}

export function selectTiers(terrain: Terrain, analysis: TerrainAnalysis, seed: GenerationSeed,
  requestedTier?: SettlementTier, allowSmallerTier = false) {
  const tiers = Object.keys(TIERS) as SettlementTier[];
  const eligible = requestedTier === undefined ? tiers
    : tiers.slice(allowSmallerTier ? 0 : tiers.indexOf(requestedTier), tiers.indexOf(requestedTier) + 1);
  return eligible.map((tier) => {
    const capacity = estimateCapacity(terrain, analysis, tier);
    return { tier, capacity, shortfalls: capacityShortfalls(capacity, tier) };
  }).sort((a, b) => requestedTier === undefined
    ? seedFraction(seed, `tier:${b.tier}`) - seedFraction(seed, `tier:${a.tier}`)
    : tiers.indexOf(b.tier) - tiers.indexOf(a.tier));
}
