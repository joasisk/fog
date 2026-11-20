import type { PixelPoint, PixelRect } from "../model/assets.ts";
import { BuildingType, WallSide } from "../model/building-designs.ts";
import type { NonEmpty, NumberRange } from "../model/geometry.ts";
import { StreetProfile } from "../model/network.ts";
import { SiteEdgeKind, SiteKind, UseKind } from "../model/places.ts";
import type { Building, BuildingSite, BuildingUse, SiteId } from "../model/places.ts";
import type { Scene } from "../model/scene.ts";
import { EmitterMotionKind, EmitterPlacement, EmitterSourceKind } from "../model/sound.ts";
import type { CatalogDesign, PilotCatalog } from "./building-catalog.ts";

// Garden Lane is projected farther away than Market Lane.
const unitScale = { [StreetProfile.OldTown]: 10, [StreetProfile.Garden]: 9 };

export function elevationTransform(design: CatalogDesign, building: Pick<Building, "position" | "width">) {
  const scale = building.width / (design.groundSpanXPx[1] - design.groundSpanXPx[0]);
  const origin = {
    x: building.position.x - design.groundAnchorPx[0] * scale,
    y: building.position.y - design.groundAnchorPx[1] * scale,
  };
  const point = ([x, y]: PixelPoint) => ({
    x: origin.x + x * scale, y: origin.y + y * scale, depth: building.position.depth,
  });
  return { scale, origin, point };
}

function elevationBounds(design: CatalogDesign, decorations?: readonly string[]): PixelRect {
  const rects = [...design.componentLayers.map(({ rectPx }) => rectPx),
    ...design.windows.map(({ rectPx }) => rectPx),
    ...Object.values(design.endWalls ?? {}).map(({ rectPx }) => rectPx),
    ...design.decorationMounts.filter((mount) => decorations ? decorations.includes(mount.decoration) : mount.default).map(({ rectPx }) => rectPx)];
  if (!design.componentLayers.length || rects.some((rect) => !rect)) return [0, 0, ...design.framePx];
  const crops = rects as PixelRect[];
  const left = Math.min(...crops.map(([x]) => x));
  const top = Math.min(...crops.map(([, y]) => y));
  const right = Math.max(...crops.map(([x, , w]) => x + w));
  const bottom = Math.max(...crops.map(([, y, , h]) => y + h));
  return [left, top, right - left, bottom - top];
}

const inRange = (value: number, range: NumberRange) => value >= range.min && value <= range.max;

export function placeCatalogBuilding(scene: Scene, catalog: PilotCatalog, siteId: SiteId,
  type: BuildingType, random: () => number, alternate = false): Scene | undefined {
  const previous = scene.town.buildings.find((building) => building.siteId === siteId);
  const site = scene.town.sites.find((item): item is BuildingSite => item.id === siteId && item.kind === SiteKind.Building);
  if (!previous || !site) return;
  const lots = site.lotIds.map((id) => scene.town.lots.find((lot) => lot.id === id));
  const first = lots[0];
  const last = lots.at(-1);
  if (!first || !last || !lots.every((lot, index) => lot?.frontageSectionId === first.frontageSectionId &&
    (index === 0 || lots[index - 1]?.interval.end === lot.interval.start))) return;
  const segment = scene.town.network.streets.flatMap(({ segments }) => segments)
    .find(({ frontageSections }) => frontageSections.some(({ id }) => id === first.frontageSectionId));
  if (!segment) return;
  const profile = segment.frontageSections.find(({ id }) => id === first.frontageSectionId)?.profile;
  if (profile !== StreetProfile.OldTown && profile !== StreetProfile.Garden) return;
  const scale = unitScale[profile];
  const left = Math.min(...site.limits.footprint.map(({ x }) => x));
  const right = Math.max(...site.limits.footprint.map(({ x }) => x));
  const w = right - left;
  const groundY = Math.max(...site.limits.footprint.map(({ y }) => y));
  const start = segment.centerline[0];
  const forward = segment.centerline.at(-1)!.x >= start.x;
  const frontageX = (station: number) => start.x + (forward ? station : -station);
  const fits = (design: CatalogDesign) => {
    if (design.type !== type || design.profile !== profile ||
      !inRange(w / scale, design.frontageRangeUnits) ||
      !inRange(lots.length, design.lotCountRange) || !inRange(site.setback / scale, design.setbackRangeUnits) ||
      w * design.referenceSizeUnits[1] / design.referenceSizeUnits[0] > site.limits.maxHeight) return false;
    const [lo, hi] = design.groundSpanXPx;
    const [ , top] = elevationBounds(design);
    if ((design.groundAnchorPx[1] - top) * w / (hi - lo) > site.limits.maxHeight) return false;
    return ([true, false] as const).every((isLeft) => {
      const edge = isLeft === forward ? site.limits.startEdge : site.limits.endEdge;
      const side = isLeft ? WallSide.Left : WallSide.Right;
      const edgeX = frontageX(isLeft === forward ? first.interval.start : last.interval.end);
      const gap = isLeft ? left - edgeX : edgeX - right;
      if (edge.kind === SiteEdgeKind.SharedWall) {
        return gap === 0 && design.wallContacts.includes(side) &&
          design.wallContactXPx[side] === (isLeft ? lo : hi);
      }
      return gap >= Math.max(edge.minimum, design.sideClearanceUnits * scale);
    });
  };
  const candidates = catalog.filter(fits).filter(({ id }) => !alternate || id !== previous.designId);
  candidates.sort((a, b) => Number(Boolean(b.approvedPilot)) - Number(Boolean(a.approvedPilot)) ||
    Math.abs(a.typicalLotCount - lots.length) - Math.abs(b.typicalLotCount - lots.length) || a.id.localeCompare(b.id));
  const preferred = candidates[0];
  if (!preferred) return;
  const shortlist = candidates.filter((d) => d.approvedPilot === preferred.approvedPilot &&
    Math.abs(d.typicalLotCount - lots.length) === Math.abs(preferred.typicalLotCount - lots.length));
  const design = shortlist[Math.floor(random() * shortlist.length)]!;
  const [lo, hi] = design.groundSpanXPx;
  const position = { x: left + (design.groundAnchorPx[0] - lo) * w / (hi - lo), y: groundY, depth: previous.position.depth };
  const { point } = elevationTransform(design, { position, width: w });
  const appearance = type === BuildingType.DetachedHouse ? {
    facadeColor: [174, 178, 153] as const,
    ...(alternate ? { decorations: ["window-box"] } : {}),
  } : undefined;
  const [x, y, sw, sh] = elevationBounds(design, appearance?.decorations);
  const toUse = (use: CatalogDesign["floorUses"][number]): BuildingUse => {
    const id = `use:${previous.id.slice("building:".length)}:${use.id}` as const;
    const [level, ...levels] = use.floors;
    const floors = [{ level }, ...levels.map((level) => ({ level }))] as const;
    if (use.kind === UseKind.House || use.kind === UseKind.Flats) {
      return { id, floors, kind: use.kind, dwellingCount: use.dwellingCount ?? 0 };
    }
    if (use.kind === UseKind.School) {
      throw Error(`Unsupported pilot use: ${use.kind}`);
    }
    return { id, floors, kind: use.kind };
  };
  const [firstUse, ...otherUses] = design.floorUses;
  const uses: NonEmpty<BuildingUse> = [toUse(firstUse), ...otherUses.map(toUse)];
  const usesById = new Map(design.floorUses.map(({ id }, index) => [id, uses[index]!]));
  const resolveEntrance = ({ id, positionPx, floorUseId }: CatalogDesign["entrances"][number]) =>
    ({ id, position: point(positionPx), useId: usesById.get(floorUseId)!.id });
  const [mainEntrance, ...sideEntrances] = design.entrances;
  const entrances = [resolveEntrance(mainEntrance), ...sideEntrances.map(resolveEntrance)];
  const entrance = entrances[0]!.position;
  const station = (entrance.x - start.x) * (forward ? 1 : -1);
  const streetConnection = Math.max(first.interval.start, Math.min(last.interval.end, station));
  const placedSite: BuildingSite = { ...site, entrance: {
    position: entrance, distanceAlongSegment: streetConnection,
    distanceToStreet: Math.hypot(entrance.x - frontageX(streetConnection), start.y - entrance.y),
  } };
  const building: Building = {
    ...previous, ...(appearance ? { appearance } : {}), designId: design.id, position, width: w, footprint: site.limits.footprint,
    height: w * design.referenceSizeUnits[1] / design.referenceSizeUnits[0],
    floorCount: new Set(design.floorUses.flatMap(({ floors }) => floors)).size,
    silhouette: [point([x, y]), point([x + sw, y]), point([x + sw, y + sh]), point([x, y + sh])],
    uses, entrances,
  };
  const priorUseIds = new Set(previous.uses.map(({ id }) => id));
  const emitters = scene.soundscape.emitters.map((emitter) => {
    const { source } = emitter;
    if (!(source.kind === EmitterSourceKind.Building && source.buildingId === building.id ||
      source.kind === EmitterSourceKind.Use && priorUseIds.has(source.useId))) return emitter;
    const anchor = design.soundAnchors.find(({ floorUseId, placement }) =>
      floorUseId === design.entrances[0].floorUseId && placement === emitter.placement) ??
      design.soundAnchors.find(({ floorUseId }) => floorUseId === design.entrances[0].floorUseId);
    const use = usesById.get(anchor?.floorUseId ?? design.entrances[0].floorUseId)!;
    return {
      ...emitter, buildingType: type,
      source: { kind: EmitterSourceKind.Use as const, useId: use.id },
      placement: anchor?.placement === "outdoor" ? EmitterPlacement.Outdoor : EmitterPlacement.Indoor,
      motion: { kind: EmitterMotionKind.Stationary as const, position: anchor ? point(anchor.positionPx) : entrance },
    };
  });
  return {
    ...scene,
    town: { ...scene.town, buildings: scene.town.buildings.map((item) => item === previous ? building : item),
      sites: scene.town.sites.map((item) => item === site ? placedSite : item) },
    soundscape: { ...scene.soundscape, emitters },
  };
}
