import type { FrontageSectionId, StreetSegmentId } from "../model/network.ts";
import type { Lot, LotId, SiteId } from "../model/places.ts";
import { districtSections, frontageDensity } from "./districts.ts";
import type { DistrictSection, Morphology } from "./districts.ts";
import type { AcceptedGeometry } from "./index.ts";
import { entranceAt, envelopes, fitBuilding } from "./massing.ts";
import type { BuildingUse, Entrance, EnvelopeKind, WorldBuilding, WorldEnvelope } from "./massing.ts";
import { reachableRoadNodes } from "./roads.ts";
import type { RoadSide } from "./routing.ts";
import { serviceAccess } from "./services.ts";
import type { Service, ServiceReservation } from "./services.ts";
import { TIERS } from "./settlement.ts";
import { buildable, overlaps, parcelBox, ribbonPoint, roadDistanceAt, surveyFrontage } from "./site-ground.ts";
import type { Outline, Rectangle, Ribbon } from "./site-ground.ts";
import { sampleAt, seedFraction } from "./terrain.ts";
import { walkingDistances } from "./walking.ts";

export type LotUse = BuildingUse | "plaza" | "park" | "playground" | "bus_stop" | "farmyard" | "garden" | "orchard" | "field";
export interface WorldLot extends Lot {
  readonly siteId: SiteId;
  readonly districtSectionId: string;
  readonly band: number;
  readonly use: LotUse;
  readonly density: number;
  readonly outline: Outline;
  readonly entrance: Entrance;
  readonly envelope?: WorldEnvelope;
}

export interface TownLayout {
  readonly morphology: Morphology;
  readonly center: { readonly siteId: SiteId; readonly entrance: Entrance };
  readonly secondaryCenters: readonly SiteId[];
  readonly districts: readonly DistrictSection[];
  readonly frontages: readonly { readonly id: FrontageSectionId; readonly edgeId: StreetSegmentId;
    readonly side: RoadSide; readonly start: number; readonly end: number }[];
  readonly lots: readonly WorldLot[];
  readonly sites: readonly { readonly id: SiteId; readonly lotIds: readonly LotId[]; readonly entrance: Entrance }[];
  readonly buildings: readonly WorldBuilding[];
  readonly services: readonly ServiceReservation[];
}

interface Plot {
  id: LotId;
  siteId: SiteId;
  ribbon: Ribbon;
  start: number;
  end: number;
  depth: number;
  box: Rectangle;
  use: LotUse;
  fit?: NonNullable<ReturnType<typeof fitBuilding>>;
}
const maximumBuildings = { farmstead: 4, "farm-lane": 10, hamlet: 18, village: 40, town: 85, city: 320 };
const defaultMorphology = { farmstead: "rural", "farm-lane": "rural", hamlet: "garden", village: "garden",
  town: "transition", city: "compact" } as const;

function plot(ribbon: Ribbon, start: number, end: number, depth: number, use: LotUse, groupedSite?: SiteId): Plot {
  const key = `${ribbon.id}:${start.toFixed(4)}`;
  return { id: `lot:${key}`, siteId: groupedSite ?? `site:${key}`, ribbon, start, end, depth, use,
    box: parcelBox(ribbon, start, end, 0, depth) };
}
function midpoint(p: Plot): number { return (p.start + p.end) / 2; }
function address(p: Plot) { return { edgeId: p.ribbon.edge.id, distance: roadDistanceAt(p.ribbon, midpoint(p)) }; }
function centerX(p: Plot) { return ribbonPoint(p.ribbon, midpoint(p), 0).x; }

export function layoutOnRoads(world: AcceptedGeometry, morphology: Morphology = world.recipe.morphology ?? defaultMorphology[world.tier]):
  { ok: true; layout: TownLayout } | { ok: false; shortfalls: string[] } {
  const { terrain, tier } = world;
  const exit = world.roads.nodes.find((node) => node.approachId);
  if (!exit || reachableRoadNodes(world.roads, exit.id).size !== world.roads.nodes.length) {
    return { ok: false, shortfalls: ["Every frontage must be reachable from an external approach."] };
  }
  const { ribbons, paving } = surveyFrontage(terrain, world.roads.edges);
  const walk = walkingDistances(world.roads);
  const plots: Plot[] = [];
  const legal = (p: Plot) => buildable(terrain, p.box) && !paving.some((road) => overlaps(p.box, road))
    && !plots.some((other) => overlaps(p.box, other.box));
  const rng = (id: string) => seedFraction(world.recipe.seed, id);
  const middle = (terrain.domain.minX + terrain.domain.maxX) / 2;
  const large = tier === "city" || tier === "town";
  const rural = tier === "farm-lane" || tier === "farmstead";
  const centralitySamples = world.roads.edges.filter((e) => e.frontage.length > 0).map((edge) =>
    ({ edgeId: edge.id, distance: edge.walkingDistance / 2, weight: edge.frontage.filter((f) => f.support === "residential")
      .reduce((sum, f) => sum + f.end - f.start, 0) }));
  const totalWeight = centralitySamples.reduce((sum, s) => sum + s.weight, 0);
  const preferredX = morphology === "transition" ? terrain.domain.minX + (terrain.domain.maxX - terrain.domain.minX) * 0.24 : middle;

  // Reserve complete, collision-free sites before subdividing the remaining housing frontage.
  function reserve(use: "plaza" | "farmyard" | Service, x: number, d: number, primary = false): Plot | undefined {
    const width = use === "school" ? envelopes.civic.width_f + 0.2 : use === "bus_stop" ? 0.8
      : use === "park" ? 2.2 : rural || tier === "hamlet" ? 1.2 : 1.8;
    const depth = use === "school" ? envelopes.civic.depth_f + 0.08 : use === "park" ? 1.3 : use === "bus_stop" ? 0.65 : 1.05;
    const yard = use === "school" ? 1.5 : 0;
    const candidates: { p: Plot; score: number }[] = [];
    for (const r of ribbons) {
      if (use === "bus_stop" && r.edge.route !== "spine") continue;
      for (let u = 0; u + width + yard <= r.length + 1e-8; u += 0.5) {
        const p = plot(r, u, u + width, depth, use);
        if (use === "school" && !r.edge.frontage.some((f) => f.side === r.side && f.support === "civic"
          && f.start <= roadDistanceAt(r, u) + 1e-8 && f.end >= roadDistanceAt(r, u + width) - 1e-8)) continue;
        const pos = ribbonPoint(r, midpoint(p), 0);
        const travel = primary ? centralitySamples.reduce((sum, s) => sum + s.weight * walk(address(p), s), 0) / totalWeight : 0;
        const score = (primary ? 2 : 1) * Math.abs(pos.x - x) + Math.abs(pos.d - d) + travel
          + (sampleAt(terrain, pos)?.slopeDegrees ?? 14) * 0.12 - Math.min(r.length, 8) * 0.08
          - (r.edge.route === "spine" ? 0.45 : 0) + rng("reserve:" + use + p.id) * 0.15;
        candidates.push({ p, score });
      }
    }
    for (const { p } of candidates.sort((a, b) => a.score - b.score)) {
      if (!legal(p)) continue;
      if (use === "school") {
        const play = plot(p.ribbon, p.end, p.end + yard, depth, "playground", p.siteId);
        if (!legal(play)) continue;
        const fit = fitBuilding(terrain, p.ribbon, p.start, p.end, p.depth, "civic", "school", p.id, p.siteId);
        if (!fit) continue;
        p.fit = fit;
        plots.push(p, play);
      } else plots.push(p);
      return p;
    }
    return undefined;
  }

  const center = reserve(rural ? "farmyard" : "plaza", preferredX,
    tier === "city" ? terrain.domain.maxDepth * 0.3 : terrain.benches[0]!.depth, true);
  if (!center) return { ok: false, shortfalls: ["No supported frontage for the settlement center."] };
  const secondaryCenters: SiteId[] = [];
  const centers = [center];
  if (tier === "city") {
    const second = reserve("plaza", middle + 4, terrain.domain.maxDepth * 0.82);
    if (!second) return { ok: false, shortfalls: ["No frontage for the secondary civic center."] };
    secondaryCenters.push(second.siteId);
    centers.push(second);
  }
  const sections = districtSections(world, morphology, centers.map(address), walk);
  const sectionAt = (r: Ribbon, u: number) => {
    const distance = roadDistanceAt(r, u);
    return sections.find((s) => s.edgeId === r.edge.id && distance >= s.start && distance <= s.end)!;
  };
  for (const c of centers) {
    const pos = ribbonPoint(c.ribbon, midpoint(c), 0);
    const uses: Service[] = large ? ["school", "park", "bus_stop"] : tier === "village" ? ["park", "bus_stop"] : [];
    for (const use of uses) {
      const site = reserve(use, pos.x + (use === "school" ? 3 : use === "park" ? -3 : 0),
        pos.d + (use === "bus_stop" ? 0 : 2.5));
      if (!site) return { ok: false, shortfalls: [`No supported reachable ${use} reservation.`] };
    }
  }

  const services = plots.flatMap((p): ServiceReservation[] => {
    if (p.use !== "park" && p.use !== "bus_stop" && p.use !== "school") return [];
    return [{ siteId: p.siteId, use: p.use, entrance: p.fit?.building.entrance ?? entranceAt(terrain, p.ribbon, midpoint(p), 0.05),
      capacity: tier === "city" ? 180 : maximumBuildings[tier], maximumDistance: tier === "city" ? 56 : 48, households: [] }];
  });
  const access = serviceAccess(services, walk);

  const envelopesToFill: { p: Plot; kind: EnvelopeKind; density: number }[] = [];
  for (const r of ribbons) {
    const reserved = plots.filter((p) => p.ribbon === r).sort((a, b) => a.start - b.start);
    let cursor = 0;
    const gaps: [number, number][] = [];
    for (const p of reserved) { gaps.push([cursor, p.start]); cursor = p.end; }
    gaps.push([cursor, r.length]);
    for (const [start, end] of gaps) {
      let ordinal = 0;
      for (let u = start; u + 0.95 <= end + 1e-8;) {
        const x = ribbonPoint(r, u + 0.5, 0).x;
        const density = frontageDensity(terrain, morphology, x);
        const district = sectionAt(r, u + 0.5).district;
        const row = district === "historic" || district === "civic" || district === "terraced";
        const attached = !rural && ((row && density >= 0.67) || (district !== "rural" && density >= 0.43 && ordinal % 3 !== 2));
        const kind: EnvelopeKind = attached ? "attached" : "detached";
        const width = attached ? envelopes.attached.width_f : rural ? (tier === "farmstead" ? 1.6 : 2.7)
          : 1.35 + (1 - density) * 1.25;
        if (u + width > end + 1e-8) break;
        const depth = attached ? 0.08 + envelopes.attached.depth_f : 0.22 + envelopes.detached.depth_f;
        const p = plot(r, u, u + width, depth, density > 0.5 ? "garden" : ordinal % 2 ? "orchard" : "field");
        if (!legal(p)) { u += 0.25; continue; }
        plots.push(p);
        envelopesToFill.push({ p, kind, density });
        u += width;
        ordinal++;
      }
    }
  }

  // All parcels now have boundaries. Fill the required storefront first, then fit optional dwellings.
  if (large) {
    const nearSquare = envelopesToFill.filter(({ p, kind }) => kind === "attached" && sectionAt(p.ribbon, midpoint(p)).era === "historic")
      .sort((a, b) => walk(address(a.p), address(center)) - walk(address(b.p), address(center)));
    const use = rng("shop:" + center.id) < 0.5 ? "cafe" : "bookshop";
    const installed = nearSquare.some(({ p }) => {
      const fit = fitBuilding(terrain, p.ribbon, p.start, p.end, p.depth, "attached", use, p.id, p.siteId);
      if (!fit) return false;
      p.use = use;
      p.fit = fit;
      return true;
    });
    if (!installed) return { ok: false, shortfalls: ["No compatible storefront near the primary square."] };
  }

  interface Candidate { p: Plot; fit: NonNullable<Plot["fit"]>; priority: number; density: number }
  const homes: Candidate[] = [];
  for (const { p, kind, density } of envelopesToFill) {
    if (p.fit) continue;
    let fit = fitBuilding(terrain, p.ribbon, p.start, p.end, p.depth, kind, "house", p.id, p.siteId);
    if (!fit && kind === "detached") fit = fitBuilding(terrain, p.ribbon, p.start, p.end, p.depth, "stepped", "house", p.id, p.siteId);
    if (fit && access.covered(fit.building.entrance)) {
      homes.push({ p, fit, density, priority: density + rng("occupancy:" + p.id) * 0.52 + (p.ribbon.edge.route === "spine" ? 0.06 : 0) });
    }
  }
  const civicCount = plots.filter((p) => p.fit).length;
  const minimum = TIERS[tier].buildings;
  if (homes.length + civicCount < minimum) {
    return { ok: false, shortfalls: [`Supported fixture capacity ${homes.length + civicCount} < ${minimum} buildings.`] };
  }
  const wanted = Math.min(maximumBuildings[tier] - civicCount, homes.length,
    Math.max(minimum - civicCount, Math.round(homes.reduce((sum, h) => sum + h.density, 0))));
  const ranked = homes.sort((a, b) => b.priority - a.priority);
  const selected = new Set<Candidate>();
  for (let band = 0; band < TIERS[tier].bands; band++) {
    const local = ranked.filter((h) => h.p.ribbon.band === band);
    if (!local[0]) return { ok: false, shortfalls: [`Band ${band + 1} has no supported housing frontage.`] };
    selected.add(local[0]);
    if (morphology === "transition" && large) {
      const lastHouse = local.find((h) => h.density < 0.25);
      if (lastHouse) selected.add(lastHouse);
    }
  }
  for (const h of ranked) {
    if (selected.size >= wanted) break;
    selected.add(h);
  }
  for (const h of selected) { h.p.fit = h.fit; h.p.use = "house"; }

  const buildings = plots.flatMap((p) => p.fit ? [p.fit.building] : []);
  const lots: WorldLot[] = plots.map((p) => ({
    id: p.id, siteId: p.siteId, use: p.use, districtSectionId: sectionAt(p.ribbon, midpoint(p)).id,
    band: p.ribbon.band, density: frontageDensity(terrain, morphology, centerX(p)), outline: p.box.outline,
    frontageSectionId: p.ribbon.id, interval: { start: roadDistanceAt(p.ribbon, p.start), end: roadDistanceAt(p.ribbon, p.end) },
    entrance: p.fit?.building.entrance ?? entranceAt(terrain, p.ribbon, midpoint(p), 0.05),
    ...(p.fit ? { envelope: p.fit.envelope } : {}),
  }));
  for (const r of ribbons) {
    const row = plots.filter((p) => p.ribbon === r).sort((a, b) => a.start - b.start);
    for (let i = 1; i < row.length; i++) {
      const a = row[i - 1]!, b = row[i]!;
      if (a.fit?.envelope.wallContacts.includes("right") && b.fit?.envelope.wallContacts.includes("left")) {
        const right = a.fit.building.footprint[1], left = b.fit.building.footprint[0];
        const rearA = a.fit.building.footprint[2], rearB = b.fit.building.footprint[3];
        if (Math.hypot(right.x - left.x, right.d - left.d) < 1e-7 && Math.hypot(rearA.x - rearB.x, rearA.d - rearB.d) < 1e-7) {
          a.fit.building.sharedWalls.push(b.fit.building.id);
          b.fit.building.sharedWalls.push(a.fit.building.id);
        }
      }
    }
  }

  const siteMap = new Map<SiteId, { id: SiteId; lotIds: LotId[]; entrance: Entrance }>();
  for (const lot of lots) {
    const site = siteMap.get(lot.siteId) ?? { id: lot.siteId, lotIds: [], entrance: lot.entrance };
    site.lotIds.push(lot.id); siteMap.set(lot.siteId, site);
  }
  const centerSite = siteMap.get(center.siteId)!;
  const issue = access.assign(lots.filter((lot) => lot.use === "house"));
  if (issue) return { ok: false, shortfalls: [issue] };

  return { ok: true, layout: { morphology, center: { siteId: centerSite.id, entrance: centerSite.entrance }, secondaryCenters,
    districts: sections, frontages: ribbons.map((r) => ({ id: r.id, edgeId: r.edge.id, side: r.side,
      start: r.stations[0]!.distance, end: r.stations.at(-1)!.distance })), lots, sites: [...siteMap.values()], buildings, services } };
}
