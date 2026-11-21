import { StreetProfile } from "../model/network.ts";
import type { StreetSegmentId } from "../model/network.ts";
import type { AcceptedGeometry } from "./index.ts";
import { terrainBand } from "./site-ground.ts";
import { seedFraction } from "./terrain.ts";
import type { Terrain } from "./terrain.ts";
import { stationAtDistance, surveyCenterline } from "./walking.ts";
import type { RoadAddress, walkingDistances } from "./walking.ts";

export type Morphology = "transition" | "compact" | "garden" | "rural";
export type District = "historic" | "civic" | "terraced" | "garden" | "modern-infill" | "rural";

export interface DistrictSection {
  readonly id: string;
  readonly edgeId: StreetSegmentId;
  readonly start: number;
  readonly end: number;
  readonly band: number;
  readonly district: District;
  readonly historic: boolean;
  readonly profile: StreetProfile;
  readonly era: "historic" | "later" | "modern" | "vernacular";
}

/** The same lateral density field governs lot width, occupancy and wall contacts in every band. */
export function frontageDensity(terrain: Terrain, morphology: Morphology, x: number): number {
  const t = (x - terrain.domain.minX) / (terrain.domain.maxX - terrain.domain.minX);
  const v = Math.max(0, Math.min(1, (t - 0.25) / 0.65));
  const falloff = v * v * (3 - 2 * v);
  if (morphology === "transition") return 0.85 - 0.77 * falloff;
  if (morphology === "compact") return 0.94 - 0.10 * falloff;
  return morphology === "rural" ? 0.24 : 0.68 - 0.30 * falloff;
}

export function districtSections(world: AcceptedGeometry, morphology: Morphology, centers: readonly RoadAddress[],
  walk: ReturnType<typeof walkingDistances>): DistrictSection[] {
  const center = centers[0]!;
  const streets = world.roads.edges.flatMap((edge) => {
    const n = Math.ceil(edge.walkingDistance / 3.5);
    const { stations } = surveyCenterline(world.terrain, edge.centerline);
    return Array.from({ length: n }, (_, i) => {
      const start = edge.walkingDistance * i / n, end = edge.walkingDistance * (i + 1) / n;
      const address = { edgeId: edge.id, distance: (start + end) / 2 };
      const point = stationAtDistance(stations, address.distance);
      return { id: `district:${edge.id}:${i}`, edge, address, point, start, end,
        band: terrainBand(world.terrain, point), distance: walk(center, address) };
    });
  });
  type Section = typeof streets[number];
  const adjacent = (a: Section, b: Section) => {
    if (a.edge.id === b.edge.id) return a.start === b.end || a.end === b.start;
    const aEnds = [a.start === 0 && a.edge.from, a.end === a.edge.walkingDistance && a.edge.to];
    return (b.start === 0 && aEnds.includes(b.edge.from)) || (b.end === b.edge.walkingDistance && aEnds.includes(b.edge.to));
  };
  const foci = centers.map((c) => streets.find((s) => s.edge.id === c.edgeId && c.distance >= s.start && c.distance <= s.end)!);
  const focus = foci[0]!;
  const historic = new Set<Section>();
  const target = { city: 13, town: 7, village: 2, hamlet: 0, "farm-lane": 0, farmstead: 0 }[world.tier];
  if (target > 0) historic.add(focus);
  const byDistance = [...streets].sort((a, b) => a.distance - b.distance);
  while (historic.size < target) {
    const next = byDistance.find((s) => !historic.has(s) && [...historic].some((other) => adjacent(s, other)));
    if (!next) break;
    historic.add(next);
  }
  const profiles: Record<District, StreetProfile> = {
    historic: StreetProfile.OldTown, civic: StreetProfile.CivicSquare, terraced: StreetProfile.Terraced,
    garden: StreetProfile.Garden, "modern-infill": StreetProfile.Terraced, rural: StreetProfile.VillageEdge,
  };
  return streets.map((s) => {
    const density = frontageDensity(world.terrain, morphology, s.point.x);
    const infill = seedFraction(world.recipe.seed, "district:" + s.id) < 0.18;
    let district: District;
    if (morphology === "rural") district = "rural";
    else if (foci.includes(s)) district = "civic";
    else if (historic.has(s)) district = "historic";
    else if (density < 0.23) district = "rural";
    else if (density < 0.51) district = "garden";
    else district = infill ? "modern-infill" : "terraced";
    return { id: s.id, edgeId: s.edge.id, start: s.start, end: s.end, band: s.band, district,
      historic: historic.has(s), profile: profiles[district],
      era: historic.has(s) ? "historic" : district === "modern-infill" ? "modern" : district === "rural" ? "vernacular" : "later" };
  });
}
