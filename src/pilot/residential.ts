import { AssetVariant } from "../model/assets.ts";
import { DepthLayer } from "../model/geometry.ts";
import type { Polygon, ScenePosition } from "../model/geometry.ts";
import { FrontageArrangement, FrontageSide, StreetProfile, StreetRole, StreetTraffic } from "../model/network.ts";
import type { Street } from "../model/network.ts";
import { SiteEdgeKind, SiteKind, UseKind } from "../model/places.ts";
import type { Building, BuildingSite, Lot, PublicSite } from "../model/places.ts";
import { EmitterMotionKind, EmitterPlacement, EmitterSourceKind, MixGroup, SoundCue } from "../model/sound.ts";
import type { SoundEmitter } from "../model/sound.ts";

export const gardenStreet = "street:garden-lane";
const frontage = "frontage:garden-lane";
const gardenY = 322;
const gardenStart = { x: 0, y: gardenY, depth: .62 };

export function createResidential(random: () => number, junction: ScenePosition) {
  const bend = { x: 869, y: gardenY, depth: .62 };
  const street: Street = {
    id: gardenStreet, role: StreetRole.Residential, traffic: StreetTraffic.Local,
    segments: [{
      id: "segment:garden-lane", from: "junction:garden", to: "junction:east",
      centerline: [gardenStart, bend, junction],
      walkingDistance: bend.x + Math.hypot(junction.x - bend.x, junction.y - bend.y),
      width: 26,
      roadOutline: [{ x: 0, y: 309 }, { x: 875, y: 309 }, { x: junction.x, y: junction.y - 18 },
        { x: junction.x, y: junction.y + 14 }, { x: 863, y: 335 }, { x: 0, y: 335 }],
      frontageSections: [{
        id: frontage, side: FrontageSide.Far, interval: { start: 0, end: bend.x },
        arrangement: FrontageArrangement.Detached, profile: StreetProfile.Garden,
      }],
    }],
  };

  const left = 40 + Math.floor(random() * 37);
  const right = left + 100 + Math.floor(random() * 36);
  const y = 302;
  const eave = 223 + Math.floor(random() * 18);
  const peak = eave - 29;
  const center = (left + right) / 2;
  const position = { x: center, y, depth: .66 };
  const footprint: Polygon<ScenePosition> = [
    { x: left, y, depth: .66 }, { x: left, y: y - 19, depth: .73 },
    { x: right, y: y - 19, depth: .73 }, { x: right, y, depth: .66 },
  ];
  const clearance = { kind: SiteEdgeKind.Clearance, minimum: 14 } as const;
  const site: BuildingSite = {
    id: "site:garden-house", kind: SiteKind.Building, lotIds: ["lot:garden-house"],
    setback: gardenY - y,
    entrance: { position: { ...position, x: right - 27 }, distanceAlongSegment: right - 27, distanceToStreet: gardenY - y },
    limits: { footprint, maxHeight: 135, startEdge: clearance, endEdge: clearance },
  };
  const house: Building = {
    id: "building:garden-house", siteId: site.id, designId: `buildings/detached-house/garden/${AssetVariant.V01}`,
    position, layer: DepthLayer.MiddleDistance, footprint, width: right - left, height: y - peak, floorCount: 1,
    silhouette: [{ x: left, y }, { x: left, y: eave }, { x: center, y: peak },
      { x: right, y: eave }, { x: right, y }],
    uses: [{ id: "use:garden-house", kind: UseKind.House, floors: [{ level: 0 }], dwellingCount: 1 }],
  };
  const parkLeft = 771 + Math.floor(random() * 12);
  const parkRight = 866;
  const parkCenter = (parkLeft + parkRight) / 2;
  const park: PublicSite = {
    id: "site:park", kind: SiteKind.PublicSpace, lotIds: ["lot:park"], setback: 11,
    entrance: {
      position: { x: parkCenter, y: gardenY - 11, depth: .65 },
      distanceAlongSegment: parkCenter, distanceToStreet: 11,
    },
    uses: [{
      id: "use:park", kind: UseKind.Park, serviceCapacity: 24,
      area: [{ x: parkLeft, y: 310, depth: .65 }, { x: parkLeft + 4, y: 245, depth: .76 },
        { x: parkRight - 15, y: 235, depth: .76 }, { x: parkRight, y: 310, depth: .65 }],
    }],
  };
  const lots: Lot[] = [
    { id: "lot:garden-house", frontageSectionId: frontage, interval: { start: left - 14, end: right + 14 } },
    { id: "lot:park", frontageSectionId: frontage, interval: { start: parkLeft, end: parkRight } },
  ];
  const emitter: SoundEmitter = {
    id: "emitter:park", group: MixGroup.Town, placement: EmitterPlacement.Outdoor,
    source: { kind: EmitterSourceKind.Use, useId: "use:park" },
    motion: { kind: EmitterMotionKind.Stationary, position: { x: parkCenter, y: 285, depth: .69 } },
    profile: { cues: [SoundCue.ChildrenLaughter], gapMs: { min: 7500, max: 16000 }, gain: .49 },
  };
  return { street, junction: { id: "junction:garden" as const, position: gardenStart }, lots, site, house, park, emitter };
}
