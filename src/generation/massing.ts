import calibration from "../../assets/townscape/batch-01/calibration.v1.json" with { type: "json" };
import manifest from "../../assets/townscape/batch-01/manifest.v1.json" with { type: "json" };
import type { BuildingId, LotId, SiteId } from "../model/places.ts";
import { GEOMETRY_FIXTURES } from "./fixtures.ts";
import { parcelBox, ribbonPoint, roadDistanceAt, supportRange } from "./site-ground.ts";
import type { Outline, Ribbon } from "./site-ground.ts";
import { heightAt } from "./terrain.ts";
import type { Terrain, WorldPosition } from "./terrain.ts";
import type { RoadAddress } from "./walking.ts";

export const envelopes = calibration.reserved_envelopes;
export type EnvelopeKind = keyof typeof envelopes;
export type BuildingUse = "house" | "cafe" | "bookshop" | "school";
export interface Entrance extends RoadAddress {
  readonly threshold: WorldPosition;
  readonly roadPoint: WorldPosition;
  readonly distanceToRoad: number;
}

export interface WorldBuilding {
  readonly id: BuildingId;
  readonly siteId: SiteId;
  readonly lotId: LotId;
  readonly use: BuildingUse;
  readonly fixture: EnvelopeKind;
  readonly assetId?: string;
  readonly footprint: Outline;
  readonly root: WorldPosition;
  readonly height: number;
  readonly dwellingCount: number;
  readonly foundation: { readonly mode: "level_plinth" | "stepped_plinth"; readonly low: number; readonly high: number;
    readonly supports: readonly { readonly footprint: Outline; readonly baseHeight: number; readonly floorHeight: number }[] };
  readonly entrance: Entrance;
  readonly sharedWalls: BuildingId[];
}

export interface WorldEnvelope {
  readonly kind: EnvelopeKind;
  readonly footprint: Outline;
  readonly maxHeight: number;
  readonly setback: number;
  readonly wallContacts: readonly string[];
}

export function entranceAt(terrain: Terrain, ribbon: Ribbon, along: number, setback: number, floor?: number): Entrance {
  const front = ribbonPoint(ribbon, along, setback), road = ribbonPoint(ribbon, along, -ribbon.edge.width / 2);
  const roadPoint = { ...road, h: heightAt(terrain, road)! };
  const threshold = { ...front, h: floor ?? heightAt(terrain, front)! };
  return { edgeId: ribbon.edge.id, distance: roadDistanceAt(ribbon, along), threshold, roadPoint,
    distanceToRoad: Math.hypot(front.x - road.x, front.d - road.d, threshold.h - roadPoint.h) };
}

const shells = new Map(manifest.assets.filter((a) => a.family === "shell").map((a) => [a.asset_id, a]));
export function fitBuilding(terrain: Terrain, r: Ribbon, start: number, end: number, depth: number,
  kind: EnvelopeKind, use: BuildingUse, lotId: LotId, siteId: SiteId): { building: WorldBuilding; envelope: WorldEnvelope } | undefined {
  const limits = envelopes[kind];
  const setback = kind === "detached" ? 0.22 : 0.08;
  if (end - start < limits.width_f - 1e-8 || setback + limits.depth_f > depth + 1e-8) return;
  const mid = (start + end) / 2;
  const envelope = parcelBox(r, mid - limits.width_f / 2, mid + limits.width_f / 2, setback, limits.depth_f);
  const maxHeight = "max_height_f" in limits ? limits.max_height_f : GEOMETRY_FIXTURES.assets.civic.world_height_f;

  const assetId = use === "cafe" || use === "bookshop" ? "townscape.b01." + use
    : kind === "detached" ? "townscape.b01.cottage" : undefined;
  const shell = assetId ? shells.get(assetId)! : undefined;
  const width = shell?.world_width_f ?? limits.width_f;
  if (assetId && !shell?.footprint_f?.length) return;
  const rear = shell?.footprint_f ? Math.max(...shell.footprint_f.map((p) => p[1]!)) : limits.depth_f;
  const height = shell?.world_height_f ?? maxHeight;
  if (width > limits.width_f || rear > limits.depth_f || height > maxHeight) return;
  const footprint = parcelBox(r, mid - width / 2, mid + width / 2, setback, rear);
  const range = supportRange(terrain, footprint);
  let mode: "level_plinth" | "stepped_plinth" = "level_plinth";
  let fixture = kind;
  if (kind === "stepped" || (kind === "attached" && range.high - range.low > 0.08)) {
    mode = "stepped_plinth";
    fixture = "stepped";
  }
  if (range.high - range.low > (mode === "stepped_plinth" || kind === "civic" ? 0.38 : 0.21)) return;
  if (shell && !shell.foundation_modes?.includes(mode)) return;

  let rootAlong = mid, doorAlong = mid;
  if (shell?.footprint_f) {
    rootAlong = mid - width / 2 - Math.min(...shell.footprint_f.map((p) => p[0]!));
    const [left, right] = shell.ground_span_uv!;
    doorAlong = rootAlong + (shell.entrance!.threshold_uv[0]! - shell.pivot_uv[0]!) * width / (right![0]! - left![0]!);
  }
  // Each masonry pad extends from supporting ground to the common level floor.
  const pads = mode === "stepped_plinth" ? Math.ceil(width / 0.45) : 1;
  const supports = Array.from({ length: pads }, (_, i) => {
    const part = parcelBox(r, mid - width / 2 + width * i / pads, mid - width / 2 + width * (i + 1) / pads, setback, rear);
    return { footprint: part.outline, baseHeight: supportRange(terrain, part).low, floorHeight: range.high };
  });
  const root = { ...ribbonPoint(r, rootAlong, setback), h: range.high };
  const entrance = entranceAt(terrain, r, doorAlong, setback, range.high);
  return { envelope: { kind: fixture, footprint: envelope.outline, maxHeight, setback, wallContacts: limits.contacts },
    building: { id: `building:${lotId}`, siteId, lotId, use, fixture, ...(assetId ? { assetId } : {}),
      footprint: footprint.outline, root, height, entrance, dwellingCount: use === "house" ? 1 : 0, foundation: { mode, ...range, supports }, sharedWalls: [] } };
}
