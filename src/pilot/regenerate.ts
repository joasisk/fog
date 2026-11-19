import type { Point2D, SceneBounds, ScenePosition } from "../model/geometry.ts";
import type { StreetId } from "../model/network.ts";
import { SiteEdgeKind, SiteKind, UseKind } from "../model/places.ts";
import { RegenerationScope } from "../model/regeneration.ts";
import type { RegenerationTarget } from "../model/regeneration.ts";
import type { Scene } from "../model/scene.ts";
import { EmitterSourceKind } from "../model/sound.ts";
import type { SoundEmitter } from "../model/sound.ts";
import { createPilot, replaceShop, shopSite, width } from "./scene.ts";

function contains(outline: readonly Point2D[], point: Point2D) {
  let inside = false;
  for (const [index, a] of outline.entries()) {
    const b = outline[(index + 1) % outline.length]!;
    if ((a.y > point.y) !== (b.y > point.y) && point.x < a.x + (b.x - a.x) * (point.y - a.y) / (b.y - a.y)) {
      inside = !inside;
    }
  }
  return inside;
}

export function hitTarget(scene: Scene, point: Point2D): RegenerationTarget | undefined {
  if (scene.town.vegetation.trees.some(({ silhouette }) => contains(silhouette, point))) return;
  const building = [...scene.town.buildings].reverse().find(({ silhouette }) => contains(silhouette, point));
  if (building) return { scope: RegenerationScope.Building, siteId: building.siteId };
  const street = scene.town.network.streets.find(({ segments }) =>
    segments.some(({ roadOutline }) => contains(roadOutline, point)));
  if (street) return { scope: RegenerationScope.Street, streetId: street.id };
  if (point.x >= 0 && point.x < width && point.y >= 0 && point.y < 309 &&
    !scene.town.terrain.hills.some(({ silhouette }) => contains(silhouette, point)) &&
    !scene.town.sites.some((site) => "uses" in site && site.uses.some(({ area }) => contains(area, point)))) {
    return { scope: RegenerationScope.Town };
  }
}

function samePosition(a: ScenePosition, b: ScenePosition) {
  return a.x === b.x && a.y === b.y && a.depth === b.depth;
}

function streetContents(scene: Scene, id: StreetId) {
  const street = scene.town.network.streets.find((street) => street.id === id);
  if (!street) return;
  const frontage = new Map(street.segments.flatMap(({ frontageSections }) =>
    frontageSections.map((section) => [section.id, section.interval] as const)));
  const lots = scene.town.lots.filter(({ frontageSectionId }) => frontage.has(frontageSectionId));
  const lotsById = new Map(lots.map((lot) => [lot.id, lot]));
  const lotIds = new Set(lotsById.keys());
  const sites = scene.town.sites.filter(({ lotIds: ids }) => ids.every((id) => lotIds.has(id)));
  const siteIds = new Set(sites.map(({ id }) => id));
  const buildings = scene.town.buildings.filter(({ siteId }) => siteIds.has(siteId));
  const buildingIds = new Set(buildings.map(({ id }) => id));
  const useIds = new Set([...buildings.flatMap(({ uses }) => uses), ...sites.flatMap((site) => "uses" in site ? site.uses : [])]
    .map(({ id }) => id));
  const ownsEmitter = ({ source }: SoundEmitter) => {
    switch (source.kind) {
      case EmitterSourceKind.Street: return source.streetId === id;
      case EmitterSourceKind.Use: return useIds.has(source.useId);
      case EmitterSourceKind.Building: return buildingIds.has(source.buildingId);
      default: return false;
    }
  };

  const valid = lots.every(({ frontageSectionId, interval }, index) => {
    const limit = frontage.get(frontageSectionId)!;
    return interval.start >= limit.start && interval.end <= limit.end && interval.end > interval.start &&
      lots.slice(index + 1).every((other) => other.frontageSectionId !== frontageSectionId ||
        interval.end <= other.interval.start || interval.start >= other.interval.end);
  }) && street.segments.every(({ from, to, centerline }) => {
    const matches = (id: string, position: typeof centerline[number]) => scene.town.network.junctions.some((junction) =>
      junction.id === id && samePosition(junction.position, position));
    return matches(from, centerline[0]) && matches(to, centerline[centerline.length - 1]!);
  });
  const validSites = sites.every((site) => {
    const spans = site.lotIds.map((id) => lotsById.get(id)!);
    const first = spans[0]!;
    const last = spans.at(-1)!;
    if (spans.some((lot, index) => lot.frontageSectionId !== first.frontageSectionId ||
      (index > 0 && lot.interval.start !== spans[index - 1]!.interval.end))) return false;
    const along = site.entrance.distanceAlongSegment;
    if (along < first.interval.start || along > last.interval.end || site.entrance.distanceToStreet < 0) return false;
    if (site.kind !== SiteKind.Building) return true;
    const building = buildings.find(({ siteId }) => siteId === site.id);
    if (!building || building.height > site.limits.maxHeight) return false;
    const footprint = boundsOf(building.footprint);
    const sharesEdge = (edge: "start" | "end") => {
      const limit = edge === "start" ? site.limits.startEdge : site.limits.endEdge;
      if (limit.kind !== SiteEdgeKind.SharedWall) return true;
      const boundary = edge === "start" ? first.interval.start : last.interval.end;
      if ((edge === "start" ? footprint.min.x : footprint.max.x) !== boundary) return false;
      return sites.some((neighbor) => {
        if (neighbor === site || neighbor.kind !== SiteKind.Building) return false;
        const facingEdge = edge === "start" ? neighbor.limits.endEdge : neighbor.limits.startEdge;
        if (facingEdge.kind !== SiteEdgeKind.SharedWall) return false;
        const facingLot = lotsById.get(neighbor.lotIds.at(edge === "start" ? -1 : 0)!)!;
        if (facingLot.frontageSectionId !== first.frontageSectionId) return false;
        const adjacent = boundsOf(neighbor.limits.footprint);
        return (edge === "start" ? adjacent.max.x : adjacent.min.x) === boundary &&
          adjacent.min.y === footprint.min.y && adjacent.max.y === footprint.max.y;
      });
    };
    const envelope = boundsOf(site.limits.footprint);
    return footprint.min.x >= envelope.min.x && footprint.max.x <= envelope.max.x &&
      footprint.min.y >= envelope.min.y && footprint.max.y <= envelope.max.y &&
      footprint.min.x >= first.interval.start && footprint.max.x <= last.interval.end &&
      sharesEdge("start") && sharesEdge("end");
  });
  return { street, lots, lotIds, sites, siteIds, buildings, ownsEmitter, valid: valid && validSites };
}

function rebuildStreet(scene: Scene, generated: Scene, id: StreetId): Scene | undefined {
  const old = streetContents(scene, id);
  const next = streetContents(generated, id);
  if (!old || !next?.valid) return;
  const routes = old.street.segments;
  if (routes.length !== next.street.segments.length || next.street.segments.some((segment, index) => {
    const prior = routes[index]!;
    return segment.from !== prior.from || segment.to !== prior.to ||
      [0, -1].some((end) => !samePosition(segment.centerline.at(end)!, prior.centerline.at(end)!));
  })) return;

  const town = scene.town;
  const [first, ...remaining] = town.network.streets;
  const replace = (street: typeof first) => street.id === id ? next.street : street;
  return {
    ...scene,
    town: {
      ...town,
      network: { ...town.network, streets: [replace(first), ...remaining.map(replace)] },
      lots: [...town.lots.filter(({ id }) => !old.lotIds.has(id)), ...next.lots],
      sites: [...town.sites.filter(({ id }) => !old.siteIds.has(id)), ...next.sites],
      buildings: [...town.buildings.filter(({ siteId }) => !old.siteIds.has(siteId)), ...next.buildings]
        .sort((a, b) => b.position.depth - a.position.depth),
    },
    soundscape: {
      ...scene.soundscape,
      emitters: [...scene.soundscape.emitters.filter((emitter) => !old.ownsEmitter(emitter)),
        ...generated.soundscape.emitters.filter(next.ownsEmitter)],
    },
  };
}

function boundsOf(points: readonly Point2D[]): SceneBounds {
  const xs = points.map(({ x }) => x);
  const ys = points.map(({ y }) => y);
  return { min: { x: Math.min(...xs), y: Math.min(...ys) }, max: { x: Math.max(...xs), y: Math.max(...ys) } };
}

export function regenerate(scene: Scene, target: RegenerationTarget, seed: number) {
  if (target.scope === RegenerationScope.Town) {
    return { scene: createPilot(seed), bounds: scene.town.bounds, label: "A new town emerges." };
  }

  if (target.scope === RegenerationScope.Street) {
    const current = scene.town.buildings.find(({ siteId }) => siteId === shopSite)?.uses[0].kind;
    const generated = createPilot(seed);
    const replacement = rebuildStreet(scene, current === UseKind.Bookshop ? replaceShop(generated, current) : generated, target.streetId);
    if (!replacement) return;
    const points = [scene, replacement].flatMap((item) => {
      const contents = streetContents(item, target.streetId)!;
      return [...contents.street.segments.flatMap(({ roadOutline }) => roadOutline),
        ...contents.buildings.flatMap(({ silhouette }) => silhouette),
        ...contents.sites.flatMap((site) => "uses" in site ? site.uses.flatMap(({ area }) => area) : [])];
    });
    return { scene: replacement, bounds: boundsOf(points), label: "The street has changed." };
  }

  const building = scene.town.buildings.find(({ siteId }) => siteId === target.siteId);
  if (!building) return;
  if (target.siteId === shopSite) {
    const kind = building.uses[0].kind === UseKind.Cafe ? UseKind.Bookshop : UseKind.Cafe;
    return { scene: replaceShop(scene, kind), bounds: boundsOf(building.silhouette),
      label: kind === UseKind.Cafe ? "The café is open." : "The bookshop is open." };
  }

  const peak = building.silhouette[2];
  const [tall, low] = building.position.depth > .5 ? [170, 203] as const : [153, 202] as const;
  const roofY = peak.y < (tall + low) / 2 ? low : tall;
  const [base, eave, , ...rest] = building.silhouette;
  const silhouette: typeof building.silhouette = [base, eave, { ...peak, y: roofY }, ...rest];
  const house = { ...building, height: building.position.y - roofY, silhouette };
  return {
    scene: { ...scene, town: { ...scene.town, buildings: scene.town.buildings.map((item) => item === building ? house : item) } },
    bounds: boundsOf([...building.silhouette, ...silhouette]), label: "The house has changed.",
  };
}
