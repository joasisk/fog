import type { ImageLayer, PixelPoint, PixelRect } from "../model/assets.ts";
import { BuildingType, WallSide } from "../model/building-designs.ts";
import type { BuildingAnchor, BuildingDesign, FloorUseDesign, WindowDesign } from "../model/building-designs.ts";
import type { NonEmpty, NumberRange } from "../model/geometry.ts";
import { StreetProfile } from "../model/network.ts";
import { UseKind } from "../model/places.ts";

interface CatalogWindow extends WindowDesign {
  readonly floorUseId: string;
  readonly maskRectPx?: PixelRect;
}

interface Mount {
  readonly decoration: string;
  readonly image: string;
  readonly rectPx: PixelRect;
  readonly default: boolean;
  readonly mirror: boolean;
  readonly placement: "ground" | "wall";
}

export interface CatalogDesign extends BuildingDesign {
  readonly approvedPilot?: boolean;
  readonly lotCountRange: NumberRange;
  readonly setbackRangeUnits: NumberRange;
  readonly sideClearanceUnits: number;
  readonly wallContactXPx: Partial<Record<WallSide, number>>;
  readonly floorUses: NonEmpty<FloorUseDesign & { readonly id: string; readonly dwellingCount?: number }>;
  readonly rooms: readonly { id: string; floorUseId: string; level: number; windowIds: readonly string[] }[];
  readonly windows: readonly CatalogWindow[];
  readonly entrances: NonEmpty<BuildingAnchor & { readonly floorUseId: string }>;
  readonly soundAnchors: readonly { floorUseId: string; positionPx: PixelPoint; placement: "indoor" | "outdoor" }[];
  readonly componentLayers: readonly ImageLayer[];
  readonly decorationMounts: readonly Mount[];
  readonly facadeValue: string;
  readonly facadeMidtone: number;
}

export type PilotCatalog = readonly CatalogDesign[];

interface CatalogEntry extends Pick<BuildingDesign, "id" | "type" | "profile" | "variant"> {
  readonly design: string;
}

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw Error(message);
}

export function validateDesign(entry: CatalogEntry, value: unknown): CatalogDesign {
  const d = value as CatalogDesign;
  const message = `Invalid building design: ${entry.id}`;
  check(d && d.id === entry.id && d.type === entry.type && d.profile === entry.profile &&
    d.variant === entry.variant && (!("schemaVersion" in d) || d.schemaVersion === 1), message);
  const [width, height] = d.framePx;
  const integers = (values: readonly number[], length: number) =>
    values.length === length && values.every(Number.isInteger);
  const point = (p: PixelPoint) => integers(p, 2) && p[0] >= 0 && p[0] <= width && p[1] >= 0 && p[1] <= height;
  const rect = (r: PixelRect) => integers(r, 4) && point([r[0], r[1]]) && r[2] > 0 && r[3] > 0 &&
    point([r[0] + r[2], r[1] + r[3]]);
  const range = ({ min, max }: NumberRange) => Number.isFinite(min) && Number.isFinite(max) && min >= 0 && max >= min;
  const layer = (l: ImageLayer) => typeof l.url === "string" && (!l.rectPx || rect(l.rectPx));
  check(integers(d.framePx, 2) && width > 0 && height > 0 && point(d.groundAnchorPx) &&
    integers(d.groundSpanXPx, 2) && d.groundSpanXPx[0] >= 0 && d.groundSpanXPx[1] <= width &&
    d.groundSpanXPx[1] > d.groundSpanXPx[0] &&
    d.referenceSizeUnits.length === 2 && d.referenceSizeUnits.every((n) => Number.isFinite(n) && n > 0) &&
    range(d.frontageRangeUnits) && range(d.lotCountRange) && range(d.setbackRangeUnits) &&
    Number.isFinite(d.sideClearanceUnits) && d.sideClearanceUnits >= 0 &&
    d.wallContacts.every((side) => Object.values(WallSide).includes(side) &&
      point([d.wallContactXPx[side]!, d.groundAnchorPx[1]])), message);
  const uses = new Map(d.floorUses.map((use) => [use.id, use]));
  const rooms = new Map(d.rooms.map((room) => [room.id, room]));
  const windows = new Map(d.windows.map((window) => [window.id, window]));
  check(uses.size > 0 && uses.size === d.floorUses.length && rooms.size === d.rooms.length &&
    windows.size === d.windows.length && d.floorUses.every(({ kind, floors }) =>
      Object.values(UseKind).includes(kind) && floors.length > 0 && floors.every(Number.isInteger)) &&
    d.rooms.every(({ id, floorUseId, level, windowIds }) => uses.get(floorUseId)?.floors.includes(level) &&
      windowIds.every((windowId) => windows.get(windowId)?.roomId === id)) &&
    d.windows.every((w) => {
      const room = rooms.get(w.roomId);
      return room?.floorUseId === w.floorUseId && room.windowIds.includes(w.id) &&
        uses.get(w.floorUseId)?.kind === w.use &&
        rect(w.rectPx) && (!w.maskRectPx || rect(w.maskRectPx)) &&
        [w.unlitInterior, w.litInterior, w.frame, ...(w.glass ? [w.glass] : []),
          ...Object.values(w.activityLayers ?? {})].every(layer);
    }), message);
  check(d.entrances.length > 0 && [...d.entrances, ...d.soundAnchors].every((anchor) =>
    uses.has(anchor.floorUseId) && point(anchor.positionPx)) &&
    [...d.componentLayers, ...Object.values(d.endWalls ?? {})].every(layer) &&
    d.decorationMounts.every((mount) => rect(mount.rectPx)), message);
  return d;
}

export function catalogUrls(base: string, documentUrl: string) {
  const root = new URL("assets/building-catalog/", new URL(base, documentUrl));
  return (path: string) => {
    const url = new URL(path, root);
    check(url.href.startsWith(root.href) && /\.(json|png)$/.test(url.pathname) && !url.search && !url.hash,
      `Invalid catalog path: ${path}`);
    return url;
  };
}

export async function loadPilotCatalog(assetUrl: (path: string) => URL): Promise<PilotCatalog> {
  async function json(path: string): Promise<unknown> {
    const response = await fetch(assetUrl(path), { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw Error(`Could not load ${path}: ${response.status}`);
    return response.json();
  }

  const index = await json("catalog.json") as { schemaVersion: number; buildings: CatalogEntry[] };
  check(index?.schemaVersion === 1 && Array.isArray(index.buildings), "Unsupported building catalog");
  const entries = index.buildings.filter(({ type, profile }) =>
    profile === StreetProfile.OldTown && [BuildingType.Cafe, BuildingType.Bookshop, BuildingType.TerracedHouse].includes(type) ||
    profile === StreetProfile.Garden && type === BuildingType.DetachedHouse);
  check(new Set(entries.map(({ id }) => id)).size === entries.length && entries.every((entry) =>
    entry.id === `buildings/${entry.type}/${entry.profile}/${entry.variant}` && /^v0[1-5]$/.test(entry.variant)),
  "Invalid pilot building index");
  return Promise.all(entries.map(async (entry) => validateDesign(entry, await json(entry.design))));
}
